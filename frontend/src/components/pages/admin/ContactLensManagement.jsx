import React, { useState, useEffect } from 'react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import ContactLensPackageForm from './ContactLensPackageForm';
import {
  Plus, Search, AlertCircle, Edit2, Copy, X, Layers, ChevronDown, ArrowLeftRight, Trash2,
} from 'lucide-react';
import '../../../styles/lens_management.css';
import '../../../styles/contact_lens_management.css';

const CL_TYPE_FIELDS = [{ name: 'label', label: 'Type Name', required: true }];

const Toggle = ({ checked, onChange }) => (
  <div
    className={`lm-toggle ${checked ? 'on' : ''}`}
    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChange(e); }}
  >
    <div className="lm-toggle-knob" />
  </div>
);

const PackageToggle = ({ checked, onChange }) => (
  <div
    className={`lm-pkg-toggle ${checked ? 'on' : ''}`}
    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChange(e); }}
  >
    <div className="lm-pkg-toggle-knob" />
  </div>
);

const ContactLensManagement = () => {
  const [clTypes,        setClTypes]        = useState([]);
  const [selectedType,   setSelectedType]   = useState(null);
  const [packages,       setPackages]       = useState([]);
  const [selectedPkg,    setSelectedPkg]    = useState(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [brands,         setBrands]         = useState([]);
  const [showAddType,    setShowAddType]    = useState(false);
  const [brandCollapsed, setBrandCollapsed] = useState({});
  const [isCreatingPkg,  setIsCreatingPkg]  = useState(false);
  const [isEditingPkg,   setIsEditingPkg]   = useState(false);

  const EMPTY_PKG_FORM = {
    package_name: '', description: '', is_active: true,
    brand: '', selling_price: '',
    min_power: '-6.00', max_power: '+4.00',
    power_type: '', base_curve: [], replacement: '',
    material: '', water_content: '', dkt: '',
    colors: [], lenses_per_box: '',
  };
  const [editFormData, setEditFormData] = useState({ ...EMPTY_PKG_FORM });

  /* ── fetch ── */
  const fetchData = async () => {
    try {
      const [groupsRes, pkgsRes, brandsRes] = await Promise.all([
        apiClient.get('/core/metadata-groups/?name=Contact Lens Type'),
        apiClient.get('/catalog/lenses/?page_size=100'),
        apiClient.get('/catalog/brands/?brand_type=Lens'),
      ]);

      const items = groupsRes.data.results || groupsRes.data;
      const clGroup = Array.isArray(items)
        ? items.find(g => g.name === 'Contact Lens Type')
        : (items.name === 'Contact Lens Type' ? items : null);
      if (clGroup) {
        setClTypes(clGroup.items || []);
        if (!selectedType && clGroup.items?.length > 0) setSelectedType(clGroup.items[0]);
      }

      setPackages(pkgsRes.data.results || pkgsRes.data || []);
      setBrands(brandsRes.data.results || brandsRes.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Unable to load contact lens data.');
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!selectedPkg) return;
    setEditFormData({
      package_name:  selectedPkg.package_name || selectedPkg.name || '',
      description:   selectedPkg.description || '',
      is_active:     selectedPkg.is_active,
      brand:         selectedPkg.brand || '',
      selling_price: selectedPkg.package_selling_price || selectedPkg.price || '',
      min_power:     selectedPkg.min_power ?? '-6.00',
      max_power:     selectedPkg.max_power ?? '+4.00',
      power_type:    selectedPkg.power_type || '',
      base_curve:    selectedPkg.base_curve || [],
      replacement:   selectedPkg.replacement || '',
      material:      selectedPkg.material || '',
      water_content: selectedPkg.water_content || '',
      dkt:           selectedPkg.dkt || '',
      colors:        selectedPkg.colors || [],
      lenses_per_box: selectedPkg.lenses_per_box ?? '',
    });
  }, [selectedPkg]);

  /* ── handlers ── */
  const handleFieldChange = (name, value) =>
    setEditFormData(prev => ({ ...prev, [name]: value }));

  const handleClosePkgForm = () => {
    setIsCreatingPkg(false);
    setIsEditingPkg(false);
    setEditFormData({ ...EMPTY_PKG_FORM });
  };

  const openEditForm = (pkg) => {
    setSelectedPkg(pkg);
    setIsEditingPkg(true);
    setIsCreatingPkg(false);
    const t = clTypes.find(t => String(t.id) === String(pkg.type));
    if (t) setSelectedType(t);
    setEditFormData({
      package_name:  pkg.package_name || pkg.name || '',
      description:   pkg.description || '',
      is_active:     pkg.is_active,
      brand:         pkg.brand || '',
      selling_price: pkg.package_selling_price || pkg.price || '',
      min_power:     pkg.min_power ?? '-6.00',
      max_power:     pkg.max_power ?? '+4.00',
      power_type:    pkg.power_type || '',
      base_curve:    pkg.base_curve || [],
      replacement:   pkg.replacement || '',
      material:      pkg.material || '',
      water_content: pkg.water_content || '',
      dkt:           pkg.dkt || '',
      colors:        pkg.colors || [],
      lenses_per_box: pkg.lenses_per_box ?? '',
    });
  };

  const handleSave = async () => {
    if (!editFormData.package_name?.trim() || !editFormData.selling_price) {
      alert('Package Name and Selling Price are required');
      return;
    }
    const payload = {
      type:                  selectedType?.id,
      price:                 editFormData.selling_price,
      is_active:             editFormData.is_active,
      package_name:          editFormData.package_name,
      description:           editFormData.description || '',
      brand:                 editFormData.brand ? Number(editFormData.brand) : null,
      package_selling_price: editFormData.selling_price,
      min_power:             editFormData.min_power,
      max_power:             editFormData.max_power,
      power_type:            editFormData.power_type || null,
      base_curve:            editFormData.base_curve || [],
      replacement:           editFormData.replacement || null,
      material:              editFormData.material || null,
      water_content:         editFormData.water_content || null,
      dkt:                   editFormData.dkt || null,
      colors:                editFormData.colors || [],
      lenses_per_box:        editFormData.lenses_per_box ? Number(editFormData.lenses_per_box) : null,
    };
    try {
      if (isCreatingPkg) {
        await apiClient.post('/catalog/lenses/', payload);
        setIsCreatingPkg(false);
      } else {
        await apiClient.put(`/catalog/lenses/${selectedPkg.id}/`, { ...selectedPkg, ...payload });
      }
      setEditFormData({ ...EMPTY_PKG_FORM });
      await fetchData();
    } catch (err) {
      console.error(err);
      setError('Failed to save package.');
    }
  };

  const handleDuplicate = async (e, pkg) => {
    e.stopPropagation();
    try {
      await apiClient.post('/catalog/lenses/', {
        type:                    pkg.type,
        price:                   pkg.package_selling_price || pkg.price,
        index:                   pkg.index || '1.5',
        is_active:               false,
        package_name:            `${pkg.package_name || pkg.name} (Copy)`,
        features:                pkg.features || [],
        description:             pkg.description || '',
        brand:                   pkg.brand || null,
        package_cost_price:      pkg.package_cost_price || 0,
        package_selling_price:   pkg.package_selling_price || pkg.price || 0,
        package_warranty_months: pkg.package_warranty_months || 0,
        constraint_ids:          (pkg.constraints || []).map(c => c.id || c),
        min_power:               pkg.min_power ?? '-6.0',
        max_power:               pkg.max_power ?? '+6.0',
      });
      await fetchData();
    } catch (err) {
      alert('Failed to duplicate package.');
    }
  };

  const handleDeletePkg = async (e, pkg) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${pkg.package_name || pkg.name}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/catalog/lenses/${pkg.id}/`);
      if (selectedPkg?.id === pkg.id) setSelectedPkg(null);
      await fetchData();
    } catch (err) { setError('Failed to delete package.'); }
  };

  const handleDeleteType = async (e, type) => {
    e.stopPropagation();
    if (!window.confirm(`Delete type "${type.label}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/core/metadata-items/${type.id}/`);
      if (selectedType?.id === type.id) setSelectedType(null);
      await fetchData();
    } catch (err) { setError('Failed to delete type.'); }
  };

  const handleStatusToggle = async (e, target, id, currentStatus) => {
    e.stopPropagation();
    const newStatus = !currentStatus;
    if (target === 'type') {
      setClTypes(prev => prev.map(t => String(t.id) === String(id) ? { ...t, is_active: newStatus } : t));
    } else {
      setPackages(prev => prev.map(p => String(p.id) === String(id) ? { ...p, is_active: newStatus } : p));
    }
    try {
      const url = target === 'type'
        ? `/core/metadata-items/${id}/`
        : `/catalog/lenses/${id}/`;
      await apiClient.patch(url, { is_active: newStatus });
      fetchData();
    } catch (err) {
      if (target === 'type') {
        setClTypes(prev => prev.map(t => String(t.id) === String(id) ? { ...t, is_active: currentStatus } : t));
      } else {
        setPackages(prev => prev.map(p => String(p.id) === String(id) ? { ...p, is_active: currentStatus } : p));
      }
      setError('Failed to update status.');
    }
  };

  const handleAddType = async (formData) => {
    let groupsRes = await apiClient.get('/core/metadata-groups/?name=Contact Lens Type');
    let items = groupsRes.data.results || groupsRes.data;
    let clGroup = Array.isArray(items)
      ? items.find(g => g.name.toLowerCase() === 'contact lens type')
      : (items.name?.toLowerCase() === 'contact lens type' ? items : null);
    if (!clGroup) {
      const r = await apiClient.post('/core/metadata-groups/', { name: 'Contact Lens Type' });
      clGroup = r.data;
    }
    const res = await apiClient.post('/core/metadata-items/', {
      group: clGroup.id,
      label: formData.label,
      value: formData.label.toLowerCase().replace(/\s+/g, '_'),
      is_active: true,
    });
    await fetchData();
    setSelectedType(res.data);
  };

  /* ── derived ── */
  const filteredTypes = clTypes.filter(t =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentTypePkgs = packages.filter(p =>
    selectedType && String(p.type) === String(selectedType.id)
  );

  const groupedByBrand = currentTypePkgs.reduce((acc, pkg) => {
    const key = pkg.brand ? String(pkg.brand) : '__none__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(pkg);
    return acc;
  }, {});

  const orderedBrandKeys = [
    ...brands.filter(b => groupedByBrand[String(b.id)]).map(b => String(b.id)),
    ...(groupedByBrand['__none__'] ? ['__none__'] : []),
  ];

  if (loading && !clTypes.length) {
    return <div className="lm-loading"><div className="lm-spinner" /></div>;
  }

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className="lm-screen cl-screen">

      {/* Header */}
      <div className="lm-header">
        <div>
          <h1 className="lm-page-title">Contact Lens Catalog</h1>
          <p className="lm-page-sub">Manage contact lens types, brands &amp; prescriptions.</p>
        </div>
        <button className="cl-add-type-btn" onClick={() => setShowAddType(true)}>
          <Plus size={15} /> Add Contact Lens type
        </button>
      </div>

      {/* Two-column layout */}
      <div className="lm-grid">

        {/* ── Left: Flat type list ── */}
        <div className="lm-left-panel">
          <div className="lm-left-header">
            <span className="lm-left-title">Contact Lens Types ({filteredTypes.length})</span>
          </div>

          <div className="lm-search-wrap">
            <Search size={13} className="lm-search-icon" />
            <input
              className="lm-search-input"
              placeholder="Search Contact lens types..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="lm-types-scroll">
            <div className="cl-type-list">
              {filteredTypes.map(type => {
                const pkgCount = packages.filter(p => String(p.type) === String(type.id)).length;
                const isActive = selectedType?.id === type.id;
                return (
                  <div
                    key={type.id}
                    className={`lm-type-card ${isActive ? 'selected' : ''}`}
                    onClick={() => setSelectedType(type)}
                  >
                    <div>
                      <div className="lm-type-card-top">
                        <span className="lm-type-name">{type.label}</span>
                        <div className="lm-type-card-actions">
                          <button
                            type="button"
                            className="lm-type-delete-btn"
                            title="Delete"
                            onClick={(e) => handleDeleteType(e, type)}
                          >
                            <Trash2 size={13} />
                          </button>
                          <Toggle
                            checked={type.is_active}
                            onChange={(e) => handleStatusToggle(e, 'type', type.id, type.is_active)}
                          />
                        </div>
                      </div>
                      <span className="lm-type-desc">{type.description || type.label}</span>
                    </div>
                    <span className="lm-type-count">{pkgCount} Package{pkgCount !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}

              {filteredTypes.length === 0 && (
                <div className="lm-empty-state" style={{ padding: '24px 16px' }}>
                  No contact lens types found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Packages ── */}
        <div className="lm-right-panel">
          <div className="lm-right-header">
            <span className="lm-right-title">
              Package for &ldquo;{selectedType?.label || '—'}&rdquo;
            </span>
            <button
              className="lm-add-pkg-btn"
              disabled={!selectedType}
              onClick={() => {
                setIsEditingPkg(false);
                setIsCreatingPkg(true);
                setEditFormData({ ...EMPTY_PKG_FORM });
              }}
            >
              <Plus size={13} /> Add Package
            </button>
          </div>

          <div className="lm-pkg-list">
            {currentTypePkgs.length === 0 ? (
              <div className="lm-empty-state">
                <Layers size={40} style={{ color: '#D0D5DD', marginBottom: 12 }} />
                <p style={{ color: '#667085', margin: 0, fontSize: 13 }}>
                  No packages yet for this contact lens type.
                </p>
                <button
                  className="lm-add-pkg-btn"
                  style={{ marginTop: 16 }}
                  disabled={!selectedType}
                  onClick={() => {
                    setIsEditingPkg(false);
                    setIsCreatingPkg(true);
                    setEditFormData({ ...EMPTY_PKG_FORM });
                  }}
                >
                  <Plus size={13} /> Create First Package
                </button>
              </div>
            ) : (
              orderedBrandKeys.map(brandKey => {
                const brandPkgs  = groupedByBrand[brandKey];
                const brand      = brandKey !== '__none__' ? brands.find(b => String(b.id) === brandKey) : null;
                const count      = String(brandPkgs.length).padStart(2, '0');
                const collapsed  = !!brandCollapsed[brandKey];

                return (
                  <div key={brandKey} className="lm-brand-section">
                    <div
                      className="lm-brand-header"
                      onClick={() => setBrandCollapsed(prev => ({ ...prev, [brandKey]: !prev[brandKey] }))}
                    >
                      <div className="lm-brand-header-left">
                        <span className="lm-cat-badge">{count}</span>
                        <span className="lm-brand-hdr-name">{brand?.name || 'Other'}</span>
                      </div>
                      <ChevronDown size={20} className={`lm-cat-caret${collapsed ? ' collapsed' : ''}`} />
                    </div>

                    {!collapsed && (
                      <div className="lm-brand-pkgs">
                        {brandPkgs.map(pkg => {
                          const isSelected = selectedPkg?.id === pkg.id;
                          const minPow     = Number(pkg.min_power ?? -6).toFixed(2);
                          const maxPow     = Number(pkg.max_power  ??  6).toFixed(2);
                          const feats      = pkg.features || [];
                          return (
                            <div
                              key={pkg.id}
                              className={`lm-pkg-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedPkg(pkg)}
                            >
                              <div className="lm-pkg-top">
                                <span className="lm-pkg-name">{pkg.package_name || pkg.name}</span>
                                <div className="lm-pkg-actions">
                                  <button
                                    type="button"
                                    className="lm-pkg-icon-btn"
                                    title="Edit"
                                    onClick={(e) => { e.stopPropagation(); openEditForm(pkg); }}
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="lm-pkg-icon-btn"
                                    title="Duplicate"
                                    onClick={(e) => handleDuplicate(e, pkg)}
                                  >
                                    <Copy size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="lm-pkg-icon-btn lm-pkg-delete-btn"
                                    title="Delete"
                                    onClick={(e) => handleDeletePkg(e, pkg)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                  <PackageToggle
                                    checked={pkg.is_active}
                                    onChange={(e) => handleStatusToggle(e, 'pkg', pkg.id, pkg.is_active)}
                                  />
                                </div>
                              </div>

                              {feats.length > 0 && (
                                <div className="lm-pkg-tags">
                                  {feats.map((f, i) => (
                                    <span key={i} className="lm-pkg-tag">{f}</span>
                                  ))}
                                </div>
                              )}

                              <div className="lm-pkg-footer">
                                <div className="lm-pkg-range">
                                  <ArrowLeftRight size={20} className="lm-pkg-range-icon" />
                                  <span className="lm-pkg-range-text">
                                    Range: {minPow} to +{maxPow}
                                  </span>
                                </div>
                                <div className="lm-pkg-price-wrap">
                                  <span className="lm-pkg-price">
                                    ₹{Number(pkg.package_selling_price || pkg.price || 0).toLocaleString('en-IN')}
                                  </span>
                                  {pkg.description && (
                                    <span className="lm-pkg-price-sub">{pkg.description}</span>
                                  )}
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

      {/* Add Type modal */}
      <FormModal
        isOpen={showAddType}
        onClose={() => setShowAddType(false)}
        onSubmit={handleAddType}
        title="Contact Lens Type"
        fields={CL_TYPE_FIELDS}
      />

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
              brands={brands}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="lm-toast">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}
    </div>
  );
};

export default ContactLensManagement;
