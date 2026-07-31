import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import ContactLensPackageForm from './ContactLensPackageForm';
import BrandTable from './BrandTable';
import {
  Plus, Search, AlertCircle, Edit2, Copy, X, Layers, ChevronDown, ArrowLeftRight, Trash2,
} from 'lucide-react';
import '../../../styles/lens_management.css';
import '../../../styles/contact_lens_management.css';

const POWER_GROUP = 'Contact Lens Power Type';
const LENS_GROUP = 'Contact Lens Type';
const DEFAULT_POWER_TYPES = ['Spherical', 'Toric', 'Multifocal'];
const TYPE_FIELDS = [{ name: 'label', label: 'Name' }];

const Toggle = ({ checked, onChange }) => (
  <div className={`lm-toggle ${checked ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChange(e); }}>
    <div className="lm-toggle-knob" />
  </div>
);
const PackageToggle = ({ checked, onChange }) => (
  <div className={`lm-pkg-toggle ${checked ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChange(e); }}>
    <div className="lm-pkg-toggle-knob" />
  </div>
);

const ContactLensManagement = () => {
  const [powerTypes, setPowerTypes] = useState([]);
  const [lensTypes, setLensTypes] = useState([]);   // each has .parent = power type id
  const [packages, setPackages] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPowerType, setSelectedPowerType] = useState(null);
  const [selectedLensType, setSelectedLensType] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);

  const [collapsed, setCollapsed] = useState({});       // powerTypeId -> collapsed
  const [brandCollapsed, setBrandCollapsed] = useState({});
  const [showAddPower, setShowAddPower] = useState(false);
  const [addLensFor, setAddLensFor] = useState(null);   // power type object when adding a lens type
  const [isCreatingPkg, setIsCreatingPkg] = useState(false);
  const [isEditingPkg, setIsEditingPkg] = useState(false);
  const [activeView, setActiveView] = useState('catalog'); // 'catalog' | 'brands'
  const seededRef = useRef(false);

  const EMPTY_PKG_FORM = {
    package_name: '', description: '', is_active: true, brand: '', selling_price: '',
    min_power: '-6.00', max_power: '+4.00', power_type: '', base_curve: [], replacement: '',
    material: '', water_content: '', dkt: '', colors: [], lenses_per_box: '',
    power_type_id: '', lens_type_id: '', new_lens_type: '',
  };
  const [editFormData, setEditFormData] = useState({ ...EMPTY_PKG_FORM });

  /* ── group helpers ── */
  const findGroup = (res, name) => {
    const items = res.data.results || res.data;
    return Array.isArray(items) ? items.find(g => g.name === name) : (items?.name === name ? items : null);
  };
  const ensureGroup = async (name) => {
    const r = await apiClient.get(`/core/metadata-groups/?name=${encodeURIComponent(name)}`);
    let g = findGroup(r, name);
    if (!g) g = (await apiClient.post('/core/metadata-groups/', { name })).data;
    return g;
  };

  /* ── fetch ── */
  const fetchData = async () => {
    try {
      const [ptRes, ltRes, pkgsRes, brandsRes] = await Promise.all([
        apiClient.get(`/core/metadata-groups/?name=${encodeURIComponent(POWER_GROUP)}`),
        apiClient.get(`/core/metadata-groups/?name=${encodeURIComponent(LENS_GROUP)}`),
        apiClient.get('/catalog/contact-lenses/?page_size=100&admin=true'),
        apiClient.get('/catalog/brands/'), // all brands: legacy packages may reference non-Contact brands
      ]);

      const ptGroup = findGroup(ptRes, POWER_GROUP);
      let pts = ptGroup?.items || [];

      // Seed the default power types once if none exist yet.
      if (pts.length === 0 && !seededRef.current) {
        seededRef.current = true;
        const g = ptGroup || await ensureGroup(POWER_GROUP);
        for (const label of DEFAULT_POWER_TYPES) {
          await apiClient.post('/core/metadata-items/', { group: g.id, label, value: label.toLowerCase(), is_active: true });
        }
        return fetchData();
      }

      const lts = findGroup(ltRes, LENS_GROUP)?.items || [];
      setPowerTypes(pts);
      setLensTypes(lts);
      setPackages(pkgsRes.data.results || pkgsRes.data || []);
      setBrands(brandsRes.data.results || brandsRes.data || []);

      if (!selectedPowerType && pts.length) setSelectedPowerType(pts[0]);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Unable to load contact lens data.');
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  /* ── derived ── */
  const lensTypesFor = (pt) => lensTypes.filter(lt => String(lt.parent) === String(pt.id));
  const pkgCountForLens = (lt) => packages.filter(p => String(p.type) === String(lt.id)).length;

  const currentPkgs = packages.filter(p => selectedLensType && String(p.type) === String(selectedLensType.id));
  const groupedByBrand = currentPkgs.reduce((acc, pkg) => {
    const key = pkg.brand ? String(pkg.brand) : '__none__';
    (acc[key] = acc[key] || []).push(pkg);
    return acc;
  }, {});
  const orderedBrandKeys = [
    ...brands.filter(b => groupedByBrand[String(b.id)]).map(b => String(b.id)),
    // Packages whose brand isn't in the list anymore still need to render
    ...Object.keys(groupedByBrand).filter(k => k !== '__none__' && !brands.some(b => String(b.id) === k)),
    ...(groupedByBrand['__none__'] ? ['__none__'] : []),
  ];

  const visiblePowerTypes = powerTypes.filter(pt =>
    !searchQuery ||
    pt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lensTypesFor(pt).some(lt => lt.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  /* ── package form ── */
  const handleFieldChange = (name, value) => setEditFormData(prev => ({ ...prev, [name]: value }));
  const handleClosePkgForm = () => { setIsCreatingPkg(false); setIsEditingPkg(false); setEditFormData({ ...EMPTY_PKG_FORM }); };

  const startCreatePkg = () => {
    setIsEditingPkg(false);
    setIsCreatingPkg(true);
    setEditFormData({
      ...EMPTY_PKG_FORM,
      power_type_id: selectedPowerType ? String(selectedPowerType.id) : '',
      lens_type_id: selectedLensType ? String(selectedLensType.id) : '',
    });
  };

  const fillForm = (pkg) => {
    const lt = lensTypes.find(t => String(t.id) === String(pkg.type));
    return {
      package_name: pkg.package_name || pkg.name || '',
      description: pkg.description || '',
      is_active: pkg.is_active,
      brand: pkg.brand || '',
      selling_price: pkg.package_selling_price || pkg.price || '',
      min_power: pkg.min_power ?? '-6.00',
      max_power: pkg.max_power ?? '+4.00',
      power_type: pkg.power_type || '',
      base_curve: pkg.base_curve || [],
      replacement: pkg.replacement || '',
      material: pkg.material || '',
      water_content: pkg.water_content || '',
      dkt: pkg.dkt || '',
      colors: pkg.colors || [],
      lenses_per_box: pkg.lenses_per_box ?? '',
      power_type_id: lt ? String(lt.parent) : '',
      lens_type_id: lt ? String(lt.id) : '',
      new_lens_type: '',
    };
  };

  const openEditForm = (pkg) => {
    setSelectedPkg(pkg);
    setIsEditingPkg(true); setIsCreatingPkg(false);
    // Lock the editor onto THIS package's own node so a save can't drift to a
    // different power type / lens type.
    const lt = lensTypes.find(t => String(t.id) === String(pkg.type));
    if (lt) {
      setSelectedLensType(lt);
      const pt = powerTypes.find(p => String(p.id) === String(lt.parent));
      if (pt) setSelectedPowerType(pt);
    }
    setEditFormData(fillForm(pkg));
  };

  const handleSave = async () => {
    // Placement is driven by the form's Category (power type) + Timeline (lens type),
    // so changing them re-files the package to that node in the left tree.
    const pt = powerTypes.find(p => String(p.id) === String(editFormData.power_type_id));
    if (!pt) { setError('Select a category (power type).'); return; }

    let lensType;
    try {
      if (editFormData.lens_type_id === '__new__') {
        const name = (editFormData.new_lens_type || '').trim();
        if (!name) { setError('Enter a timeline name.'); return; }
        // Reuse an existing timeline of the same name under this power type if present.
        lensType = lensTypes.find(t => String(t.parent) === String(pt.id) && t.label.toLowerCase() === name.toLowerCase());
        if (!lensType) {
          const g = await ensureGroup(LENS_GROUP);
          lensType = (await apiClient.post('/core/metadata-items/', {
            group: g.id, parent: pt.id, label: name,
            value: `${pt.value}_${name.toLowerCase().replace(/\s+/g, '_')}`, is_active: true,
          })).data;
        }
      } else {
        lensType = lensTypes.find(t => String(t.id) === String(editFormData.lens_type_id));
        if (!lensType) { setError('Select a timeline.'); return; }
      }
    } catch (err) { console.error(err); setError('Failed to create the timeline.'); return; }

    const payload = {
      type: lensType.id,
      price: editFormData.selling_price,
      is_active: editFormData.is_active,
      package_name: editFormData.package_name,
      description: editFormData.description || '',
      brand: editFormData.brand ? Number(editFormData.brand) : null,
      package_selling_price: editFormData.selling_price,
      min_power: editFormData.min_power,
      max_power: editFormData.max_power,
      power_type: pt.label,
      base_curve: editFormData.base_curve || [],
      // Timeline IS the replacement schedule — keep them in sync so the storefront
      // "usage" filter matches the admin grouping.
      replacement: (lensType.label || '').toLowerCase() || null,
      material: editFormData.material || null,
      water_content: editFormData.water_content || null,
      dkt: editFormData.dkt || null,
      colors: editFormData.colors || [],
      lenses_per_box: editFormData.lenses_per_box ? Number(editFormData.lenses_per_box) : null,
    };
    try {
      if (isCreatingPkg) await apiClient.post('/catalog/contact-lenses/', payload);
      else await apiClient.put(`/catalog/contact-lenses/${selectedPkg.id}/`, { ...selectedPkg, ...payload });
      handleClosePkgForm();
      await fetchData();
      // Jump the tree to where the package now lives.
      setSelectedPowerType(pt);
      setSelectedLensType(lensType);
    } catch (err) { console.error(err); setError('Failed to save package.'); }
  };

  const handleDuplicate = async (e, pkg) => {
    e.stopPropagation();
    try {
      await apiClient.post('/catalog/contact-lenses/', {
        ...fillForm(pkg), type: pkg.type, is_active: false,
        package_name: `${pkg.package_name || pkg.name} (Copy)`,
        package_selling_price: pkg.package_selling_price || pkg.price || 0,
        power_type: pkg.power_type || null,
      });
      await fetchData();
    } catch { setError('Failed to duplicate package.'); }
  };

  const handleDeletePkg = async (e, pkg) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${pkg.package_name || pkg.name}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/catalog/contact-lenses/${pkg.id}/`);
      if (selectedPkg?.id === pkg.id) setSelectedPkg(null);
      await fetchData();
    } catch { setError('Failed to delete package.'); }
  };

  /* ── power type / lens type CRUD ── */
  const handleAddPower = async (formData) => {
    const g = await ensureGroup(POWER_GROUP);
    const res = await apiClient.post('/core/metadata-items/', {
      group: g.id, label: formData.label, value: formData.label.toLowerCase().replace(/\s+/g, '_'), is_active: true,
    });
    await fetchData();
    setSelectedPowerType(res.data);
  };

  const handleAddLens = async (formData) => {
    const pt = addLensFor;
    const g = await ensureGroup(LENS_GROUP);
    const res = await apiClient.post('/core/metadata-items/', {
      group: g.id, label: formData.label, value: formData.label.toLowerCase().replace(/\s+/g, '_'),
      is_active: true, parent: pt.id,
    });
    await fetchData();
    setSelectedPowerType(pt);
    setSelectedLensType(res.data);
  };

  const handleDeletePower = async (e, pt) => {
    e.stopPropagation();
    if (!window.confirm(`Delete power type "${pt.label}" and all its lens types? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/core/metadata-items/${pt.id}/`);
      if (selectedPowerType?.id === pt.id) { setSelectedPowerType(null); setSelectedLensType(null); }
      await fetchData();
    } catch { setError('Failed to delete power type.'); }
  };

  const handleDeleteLens = async (e, lt) => {
    e.stopPropagation();
    if (!window.confirm(`Delete lens type "${lt.label}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/core/metadata-items/${lt.id}/`);
      if (selectedLensType?.id === lt.id) setSelectedLensType(null);
      await fetchData();
    } catch { setError('Failed to delete lens type.'); }
  };

  const handleStatusToggle = async (e, kind, id, current) => {
    e.stopPropagation();
    const newVal = !current;
    const url = kind === 'pkg' ? `/catalog/contact-lenses/${id}/` : `/core/metadata-items/${id}/`;
    try { await apiClient.patch(url, { is_active: newVal }); await fetchData(); }
    catch { setError('Failed to update status.'); }
  };

  if (loading && !powerTypes.length) {
    return <div className="lm-loading"><div className="lm-spinner" /></div>;
  }

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className="lm-screen cl-screen">
      <div className="lm-header">
        <div>
          <h1 className="lm-page-title">Contact Lens Catalog</h1>
          <p className="lm-page-sub">Power types &rarr; lens types &rarr; packages, grouped by brand.</p>
        </div>
        {activeView === 'catalog' && (
          <button className="cl-add-type-btn" onClick={() => setShowAddPower(true)}>
            <Plus size={15} /> Add Power Type
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {[{ key: 'catalog', label: 'Catalog' }, { key: 'brands', label: 'Brand Logos' }].map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveView(tab.key);
              if (tab.key === 'catalog') fetchData(); // brand edits made in the other tab should show up here
            }}
            style={{
              padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeView === tab.key ? '#fff' : 'transparent',
              color: activeView === tab.key ? '#7F56D9' : '#667085',
              boxShadow: activeView === tab.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === 'brands' ? (
        <BrandTable fixedType="Contact" title="Contact Lens Brands" />
      ) : (
      <div className="lm-grid">
        {/* ── Left: Power types → Lens types ── */}
        <div className="lm-left-panel">
          <div className="lm-left-header">
            <span className="lm-left-title">Lens Types</span>
          </div>
          <div className="lm-search-wrap">
            <Search size={13} className="lm-search-icon" />
            <input className="lm-search-input" placeholder="Search power / lens types..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          <div className="lm-types-scroll">
            {visiblePowerTypes.map(pt => {
              const types = lensTypesFor(pt);
              const isCollapsed = !!collapsed[pt.id];
              const count = String(types.length).padStart(2, '0');
              return (
                <div key={pt.id} className="lm-cat-section">
                  <div className="lm-cat-header" onClick={() => setCollapsed(prev => ({ ...prev, [pt.id]: !prev[pt.id] }))}>
                    <div className="lm-cat-header-left">
                      <span className="lm-cat-badge">{count}</span>
                      <span className="lm-cat-name">{pt.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" className="lm-type-delete-btn" title="Delete power type" onClick={(e) => handleDeletePower(e, pt)}>
                        <Trash2 size={13} />
                      </button>
                      <Toggle checked={pt.is_active} onChange={(e) => handleStatusToggle(e, 'power', pt.id, pt.is_active)} />
                      <ChevronDown size={18} className={`lm-cat-caret${isCollapsed ? ' collapsed' : ''}`} />
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="lm-cat-types">
                      {types.map(lt => {
                        const isActive = selectedLensType?.id === lt.id && selectedPowerType?.id === pt.id;
                        return (
                          <div key={lt.id} className={`lm-type-card ${isActive ? 'selected' : ''}`}
                            onClick={() => { setSelectedPowerType(pt); setSelectedLensType(lt); }}>
                            <div>
                              <div className="lm-type-card-top">
                                <span className="lm-type-name">{lt.label}</span>
                                <div className="lm-type-card-actions">
                                  <button type="button" className="lm-type-delete-btn" title="Delete" onClick={(e) => handleDeleteLens(e, lt)}>
                                    <Trash2 size={13} />
                                  </button>
                                  <Toggle checked={lt.is_active} onChange={(e) => handleStatusToggle(e, 'lens', lt.id, lt.is_active)} />
                                </div>
                              </div>
                              <span className="lm-type-desc">{lt.description || `${pt.label} contact lenses`}</span>
                            </div>
                            <span className="lm-type-count">{pkgCountForLens(lt)} Package{pkgCountForLens(lt) !== 1 ? 's' : ''}</span>
                          </div>
                        );
                      })}
                      <button type="button" className="lm-cat-add" onClick={() => setAddLensFor(pt)}>
                        <Plus size={18} />
                        <span className="lm-cat-add-text">Add {pt.label} lens type</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {visiblePowerTypes.length === 0 && (
              <div className="lm-empty-state" style={{ padding: '24px 16px' }}>No power types found.</div>
            )}
          </div>
        </div>

        {/* ── Right: Packages grouped by brand ── */}
        <div className="lm-right-panel">
          <div className="lm-right-header">
            <span className="lm-right-title">
              {selectedLensType ? `${selectedPowerType?.label || ''} · ${selectedLensType.label} packages` : 'Select a lens type'}
            </span>
            <button className="lm-add-pkg-btn" disabled={!selectedLensType}
              onClick={startCreatePkg}>
              <Plus size={13} /> Add Package
            </button>
          </div>

          <div className="lm-pkg-list">
            {!selectedLensType ? (
              <div className="lm-empty-state">
                <Layers size={40} style={{ color: '#D0D5DD', marginBottom: 12 }} />
                <p style={{ color: '#667085', margin: 0, fontSize: 13 }}>Pick a power type and lens type on the left to manage its packages.</p>
              </div>
            ) : currentPkgs.length === 0 ? (
              <div className="lm-empty-state">
                <Layers size={40} style={{ color: '#D0D5DD', marginBottom: 12 }} />
                <p style={{ color: '#667085', margin: 0, fontSize: 13 }}>No packages yet for this lens type.</p>
                <button className="lm-add-pkg-btn" style={{ marginTop: 16 }}
                  onClick={startCreatePkg}>
                  <Plus size={13} /> Create First Package
                </button>
              </div>
            ) : (
              orderedBrandKeys.map(brandKey => {
                const brandPkgs = groupedByBrand[brandKey];
                const brand = brandKey !== '__none__' ? brands.find(b => String(b.id) === brandKey) : null;
                const count = String(brandPkgs.length).padStart(2, '0');
                const bCollapsed = !!brandCollapsed[brandKey];
                return (
                  <div key={brandKey} className="lm-brand-section">
                    <div className="lm-brand-header" onClick={() => setBrandCollapsed(prev => ({ ...prev, [brandKey]: !prev[brandKey] }))}>
                      <div className="lm-brand-header-left">
                        <span className="lm-cat-badge">{count}</span>
                        <span className="lm-brand-hdr-name">{brand?.name || 'Other'}</span>
                      </div>
                      <ChevronDown size={20} className={`lm-cat-caret${bCollapsed ? ' collapsed' : ''}`} />
                    </div>
                    {!bCollapsed && (
                      <div className="lm-brand-pkgs">
                        {brandPkgs.map(pkg => {
                          const isSelected = selectedPkg?.id === pkg.id;
                          const minPow = Number(pkg.min_power ?? -6).toFixed(2);
                          const maxPow = Number(pkg.max_power ?? 6).toFixed(2);
                          return (
                            <div key={pkg.id} className={`lm-pkg-card ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedPkg(pkg)}>
                              <div className="lm-pkg-top">
                                <span className="lm-pkg-name">{pkg.package_name || pkg.name}</span>
                                <div className="lm-pkg-actions">
                                  <button type="button" className="lm-pkg-icon-btn" title="Edit" onClick={(e) => { e.stopPropagation(); openEditForm(pkg); }}><Edit2 size={16} /></button>
                                  <button type="button" className="lm-pkg-icon-btn" title="Duplicate" onClick={(e) => handleDuplicate(e, pkg)}><Copy size={16} /></button>
                                  <button type="button" className="lm-pkg-icon-btn lm-pkg-delete-btn" title="Delete" onClick={(e) => handleDeletePkg(e, pkg)}><Trash2 size={16} /></button>
                                  <PackageToggle checked={pkg.is_active} onChange={(e) => handleStatusToggle(e, 'pkg', pkg.id, pkg.is_active)} />
                                </div>
                              </div>
                              <div className="lm-pkg-footer">
                                <div className="lm-pkg-range">
                                  <ArrowLeftRight size={20} className="lm-pkg-range-icon" />
                                  <span className="lm-pkg-range-text">Range: {minPow} to +{maxPow}</span>
                                </div>
                                <div className="lm-pkg-price-wrap">
                                  <span className="lm-pkg-price">₹{Number(pkg.package_selling_price || pkg.price || 0).toLocaleString('en-IN')}</span>
                                  {pkg.description && <span className="lm-pkg-price-sub">{pkg.description}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}

      {/* Add Power Type modal */}
      <FormModal isOpen={showAddPower} onClose={() => setShowAddPower(false)} onSubmit={handleAddPower}
        title="Power Type" fields={TYPE_FIELDS} />

      {/* Add Lens Type modal */}
      <FormModal isOpen={!!addLensFor} onClose={() => setAddLensFor(null)} onSubmit={handleAddLens}
        title={addLensFor ? `${addLensFor.label} Lens Type` : 'Lens Type'} fields={TYPE_FIELDS} />

      {/* Create / Edit Package offcanvas */}
      {(isCreatingPkg || isEditingPkg) && (
        <div className="lm-backdrop" onClick={handleClosePkgForm}>
          <div className="lm-offcanvas" onClick={e => e.stopPropagation()}>
            <ContactLensPackageForm
              formData={editFormData}
              onChange={handleFieldChange}
              onSubmit={handleSave}
              onClose={handleClosePkgForm}
              isEditing={isEditingPkg}
              brands={brands.filter(b => b.brand_type === 'Contact')}
              powerTypes={powerTypes}
              lensTypes={lensTypes}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="lm-toast">
          <AlertCircle size={16} /><span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}
    </div>
  );
};

export default ContactLensManagement;
