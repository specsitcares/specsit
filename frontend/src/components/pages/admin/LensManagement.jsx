import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BrandTable from './BrandTable';
import {
  Plus, Search, AlertCircle, Edit2, Copy, X, Layers, ChevronDown, Trash2, Zap, Ruler, SkipForward,
} from 'lucide-react';
import '../../../styles/lens_management.css';

/* Extract numeric category IDs from a lens package's categories array */
const getPackageCatIds = (lens) =>
  (lens.categories || []).map(c => typeof c === 'object' ? c.id : c);

const LENS_TYPE_FIELDS = [
  { name: 'label', label: 'Type Name' },
  { name: 'image', label: 'Type Image', type: 'file' },
  {
    name: 'direct_checkout', label: 'Direct Checkout', type: 'checkbox',
    placeholder: 'Skip lens selection — send the customer straight to checkout (e.g. Frame Only, no lenses)',
  },
  {
    name: 'enable_pd', label: 'PD Calculation', type: 'checkbox', defaultValue: true,
    placeholder: 'Show the PD (Pupillary Distance) calculation in the customer prescription step',
  },
  {
    name: 'skip_power', label: 'Skip Power Details', type: 'checkbox',
    placeholder: 'Skip the power/prescription step — no power details are collected from the customer',
  },
];

/* Purple toggle — for lens type cards */
const Toggle = ({ checked, onChange }) => (
  <div
    className={`lm-toggle ${checked ? 'on' : ''}`}
    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChange(e); }}
  >
    <div className="lm-toggle-knob" />
  </div>
);

/* Green toggle — for package cards */
const PackageToggle = ({ checked, onChange }) => (
  <div
    className={`lm-pkg-toggle ${checked ? 'on' : ''}`}
    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onChange(e); }}
  >
    <div className="lm-pkg-toggle-knob" />
  </div>
);

const LensManagement = ({ editLensId = null }) => {
  const navigate = useNavigate();

  const [lensTypes,      setLensTypes]      = useState([]);
  const [selectedType,   setSelectedType]   = useState(null);
  const [lenses,         setLenses]         = useState([]);
  const [selectedLens,   setSelectedLens]   = useState(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [lensBrands,     setLensBrands]     = useState([]);
  const [lensCategories, setLensCategories] = useState([]);
  const [lensConstraints,setLensConstraints]= useState([]);
  const [lensIndices,    setLensIndices]    = useState([]);
  const [lensFeatures,   setLensFeatures]   = useState([]);

  const [selectedCategoryId,   setSelectedCategoryId]   = useState(null);
  const [showAddType,          setShowAddType]          = useState(null); // null = closed, number = category ID
  const [showEditType,         setShowEditType]         = useState(null); // null = closed, type object = editing
  const [typeHomeCat,          setTypeHomeCat]          = useState({});   // typeId → catId for 0-package types
  const [groupCollapsed,       setGroupCollapsed]       = useState({});
  const [brandCollapsed,       setBrandCollapsed]       = useState({});
  const [isCreatingNewPackage, setIsCreatingNewPackage] = useState(false);
  const [isEditingPackage,     setIsEditingPackage]     = useState(false);
  const [newFeatureText,       setNewFeatureText]       = useState('');
  const [newConstraintText,    setNewConstraintText]    = useState('');
  const [addingIndex,          setAddingIndex]          = useState(false);
  const [newIndexText,         setNewIndexText]         = useState('');
  const [activeView,           setActiveView]           = useState('catalog'); // 'catalog' | 'brands'

  const EMPTY_PACKAGE_FORM = {
    name: '', description: '', index: '1.5', is_active: true,
    features: [], constraints: [], pricing_mode: 'package',
    brand: '', categories: selectedCategoryId ? [selectedCategoryId] : [], cost_price: 0, selling_price: '',
    warranty_months: 0, min_power: '-6.0', max_power: '+4.0', cyl_min: '-6.0', cyl_max: '0.0',
    image: null,        // newly picked File
    image_url: '',      // existing image URL (edit mode preview)
  };
  const [editFormData, setEditFormData] = useState({ ...EMPTY_PACKAGE_FORM });

  /* ── data fetch ── */
  const fetchData = async () => {
    try {
      const [groupsRes, lensesRes, brandsRes, catsRes, constraintsRes, indicesRes, featuresRes] = await Promise.all([
        apiClient.get('/core/metadata-groups/?name=Lens Type'),
        apiClient.get('/catalog/lenses/?page_size=100&admin=true&type_group=Lens Type'),
        apiClient.get('/catalog/brands/?brand_type=Lens'),
        apiClient.get('/catalog/categories/?group=frame'),
        apiClient.get('/catalog/lens-constraints/'),
        apiClient.get('/core/metadata-groups/?name=Lens Index'),
        apiClient.get('/core/metadata-groups/?name=Lens Features'),
      ]);

      const items = groupsRes.data.results || groupsRes.data;
      const lensGroup = Array.isArray(items)
        ? items.find(g => g.name === 'Lens Type')
        : (items.name === 'Lens Type' ? items : null);
      if (lensGroup) {
        setLensTypes(lensGroup.items || []);
        if (!selectedType && lensGroup.items?.length > 0) setSelectedType(lensGroup.items[0]);
      }

      setLenses(lensesRes.data.results || lensesRes.data);
      setLensBrands(brandsRes.data.results || brandsRes.data || []);
      const cats = catsRes.data.results || catsRes.data || [];
      setLensCategories(cats);
      /* Auto-select first category if none chosen yet */
      if (cats.length > 0) setSelectedCategoryId(prev => prev ?? cats[0].id);

      const constraintsList = constraintsRes.data.results || constraintsRes.data || [];
      // Use existing frame-type constraints for lens package selection.
      setLensConstraints(constraintsList);

      const indicesGroup = indicesRes.data.results || indicesRes.data;
      if (Array.isArray(indicesGroup) && indicesGroup[0]?.items) {
        setLensIndices(indicesGroup[0].items.map(i => i.value));
      } else if (indicesGroup?.items) {
        setLensIndices(indicesGroup.items.map(i => i.value));
      } else {
        setLensIndices(['1.5', '1.6', '1.67', '1.74']);
      }

      const featuresGroup = featuresRes.data.results || featuresRes.data;
      if (Array.isArray(featuresGroup) && featuresGroup[0]?.items) {
        setLensFeatures(featuresGroup[0].items.map(f => f.label));
      } else if (featuresGroup?.items) {
        setLensFeatures(featuresGroup.items.map(f => f.label));
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch lens data', err);
      setError('Unable to load lens data.');
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (loading || !editLensId || selectedLens) return;
    const byId = lenses.find(l => String(l.id) === String(editLensId));
    if (byId) {
      setSelectedLens(byId);
      const typeObj = lensTypes.find(t => String(t.id) === String(byId.type));
      if (typeObj) setSelectedType(typeObj);
    }
  }, [loading, editLensId, lenses, lensTypes, selectedLens]);

  useEffect(() => {
    if (!selectedLens) return;
    setEditFormData({
      name:            selectedLens.package_name || selectedLens.name,
      description:     selectedLens.description || '',
      index:           selectedLens.index || '1.5',
      is_active:       selectedLens.is_active,
      features:        selectedLens.features || [],
      constraints:     selectedLens.constraints || [],
      pricing_mode:    selectedLens.pricing_mode || 'package',
      brand:           selectedLens.brand || '',
      categories:      (selectedLens.categories || []).map(c => typeof c === 'object' ? c.id : c),
      cost_price:      selectedLens.package_cost_price || 0,
      selling_price:   selectedLens.package_selling_price || selectedLens.price || '',
      warranty_months: selectedLens.package_warranty_months || 0,
      min_power:       selectedLens.min_power ?? '-6.0',
      max_power:       selectedLens.max_power ?? '+4.0',
      cyl_min:         selectedLens.cyl_min ?? '-6.0',
      cyl_max:         selectedLens.cyl_max ?? '0.0',
      image:           null,
      image_url:       selectedLens.image || '',
    });
  }, [selectedLens]);

  /* ── handlers ── */
  const handlePackageFieldChange = (name, value) =>
    setEditFormData(prev => ({ ...prev, [name]: value }));

  const handleClosePackageForm = () => {
    setIsCreatingNewPackage(false);
    setIsEditingPackage(false);
    setEditFormData({ ...EMPTY_PACKAGE_FORM });
    setNewFeatureText('');
    setNewConstraintText('');
  };

  const openPackageFormForEdit = (lens) => {
    setSelectedLens(lens);
    setIsEditingPackage(true);
    setIsCreatingNewPackage(false);
    const typeObj = lensTypes.find(t => String(t.id) === String(lens.type));
    if (typeObj) setSelectedType(typeObj);
    setEditFormData({
      name:            lens.package_name || lens.name,
      description:     lens.description || '',
      index:           lens.index || '1.5',
      is_active:       lens.is_active,
      features:        lens.features || [],
      constraints:     lens.constraints || [],
      pricing_mode:    lens.pricing_mode || 'package',
      brand:           lens.brand || '',
      categories:      (lens.categories || []).map(c => typeof c === 'object' ? c.id : c),
      cost_price:      lens.package_cost_price || 0,
      selling_price:   lens.package_selling_price || lens.price || '',
      warranty_months: lens.package_warranty_months || 0,
      min_power:       lens.min_power ?? '-6.0',
      max_power:       lens.max_power ?? '+4.0',
      cyl_min:         lens.cyl_min ?? '-6.0',
      cyl_max:         lens.cyl_max ?? '0.0',
      image:           null,
      image_url:       lens.image || '',
    });
  };

  const handleSave = async () => {
    // Derive frame-type applicability from the selected category names — a package
    // in a "Sunglasses" category applies to sunglasses, otherwise eyeglasses.
    const _catNames = (editFormData.categories || [])
      .map(id => (lensCategories.find(c => c.id === id)?.name || '').toLowerCase());
    const appliesSunglasses = _catNames.some(n => n.includes('sunglass'));
    const appliesEyeglasses = _catNames.some(n => n && !n.includes('sunglass')) || !appliesSunglasses;

    const payload = {
      type:                    selectedType?.id,
      price:                   editFormData.selling_price,
      index:                   editFormData.index || '1.5',
      is_active:               editFormData.is_active,
      package_name:            editFormData.name,
      features:                editFormData.features || [],
      description:             editFormData.description || '',
      brand:                   editFormData.brand ? Number(editFormData.brand) : null,
      category_ids:            editFormData.categories,
      package_cost_price:      editFormData.cost_price,
      package_selling_price:   editFormData.selling_price,
      package_warranty_months: editFormData.warranty_months,
      constraint_ids:          editFormData.constraints.map(c => c.id || c),
      min_power:               editFormData.min_power,
      max_power:               editFormData.max_power,
      cyl_min:                 editFormData.cyl_min,
      cyl_max:                 editFormData.cyl_max,
      // Frame-type applicability is derived from the selected category — single
      // source of truth, so the admin only chooses the category, never a separate toggle.
      is_for_eyeglasses:       appliesEyeglasses,
      is_for_sunglasses:       appliesSunglasses,
    };
    try {
      let lensId;
      if (isCreatingNewPackage) {
        const res = await apiClient.post('/catalog/lenses/', payload);
        lensId = res.data?.id;
      } else {
        lensId = selectedLens.id;
        // Drop the read-only image URL string — it's an ImageField and is uploaded separately below
        const { image: _img, ...selectedLensRest } = selectedLens;
        await apiClient.put(`/catalog/lenses/${selectedLens.id}/`, { ...selectedLensRest, ...payload });
      }

      // Upload the lens image (multipart) only when a new file was picked
      if (lensId && editFormData.image instanceof File) {
        const fd = new FormData();
        fd.append('image', editFormData.image);
        await apiClient.patch(`/catalog/lenses/${lensId}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      if (isCreatingNewPackage) {
        setIsCreatingNewPackage(false);
        setEditFormData({ ...EMPTY_PACKAGE_FORM });
        alert('Package created successfully');
      } else {
        alert('Package updated successfully');
      }
      await fetchData();
    } catch (err) {
      console.error('Save failed', err);
      setError('Failed to save changes.');
    }
  };

  const handleDuplicatePackage = async (lens) => {
    try {
      await apiClient.post('/catalog/lenses/', {
        type:                    lens.type,
        price:                   lens.package_selling_price || lens.price,
        index:                   lens.index || '1.5',
        is_active:               false,
        package_name:            `${lens.package_name || lens.name} (Copy)`,
        features:                lens.features || [],
        description:             lens.description || '',
        brand:                   lens.brand || null,
        category_ids:            (lens.categories || []).map(c => typeof c === 'object' ? c.id : c),
        package_cost_price:      lens.package_cost_price || 0,
        package_selling_price:   lens.package_selling_price || lens.price || 0,
        package_warranty_months: lens.package_warranty_months || 0,
        constraint_ids:          (lens.constraints || []).map(c => c.id || c),
        min_power:               lens.min_power ?? '-6.0',
        max_power:               lens.max_power ?? '+4.0',
        cyl_min:                 lens.cyl_min ?? '-6.0',
        cyl_max:                 lens.cyl_max ?? '0.0',
        is_for_eyeglasses:       lens.is_for_eyeglasses ?? true,
        is_for_sunglasses:       lens.is_for_sunglasses ?? false,
      });
      await fetchData();
    } catch (err) {
      console.error('Duplicate failed', err);
      alert('Failed to duplicate package.');
    }
  };

  const handleDeletePackage = async (e, lens) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${lens.package_name || lens.name}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/catalog/lenses/${lens.id}/`);
      if (selectedLens?.id === lens.id) setSelectedLens(null);
      await fetchData();
    } catch (err) {
      setError('Failed to delete package.');
    }
  };

  const handleDeleteType = async (e, type) => {
    e.stopPropagation();
    if (!window.confirm(`Delete lens type "${type.label}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/core/metadata-items/${type.id}/`);
      if (selectedType?.id === type.id) setSelectedType(null);
      await fetchData();
    } catch (err) {
      setError('Failed to delete lens type.');
    }
  };

  const handleStatusToggle = async (e, target, id, currentStatus) => {
    e.stopPropagation();
    const newStatus = !currentStatus;

    /* Optimistic update — flip immediately so the toggle responds at once */
    if (target === 'type') {
      setLensTypes(prev => prev.map(t => String(t.id) === String(id) ? { ...t, is_active: newStatus } : t));
    } else {
      setLenses(prev => prev.map(l => String(l.id) === String(id) ? { ...l, is_active: newStatus } : l));
    }

    try {
      const url = target === 'type'
        ? `/core/metadata-items/${id}/`
        : `/catalog/lenses/${id}/`;
      await apiClient.patch(url, { is_active: newStatus });
      fetchData(); /* background sync — no await so UI stays snappy */
    } catch (err) {
      console.error('Toggle failed', err);
      /* Revert on failure */
      if (target === 'type') {
        setLensTypes(prev => prev.map(t => String(t.id) === String(id) ? { ...t, is_active: currentStatus } : t));
      } else {
        setLenses(prev => prev.map(l => String(l.id) === String(id) ? { ...l, is_active: currentStatus } : l));
      }
      setError('Failed to update status. Please try again.');
    }
  };

  /* Flip the "direct checkout" flag on an existing lens type */
  const handleDirectCheckoutToggle = async (e, type) => {
    e.stopPropagation();
    const newVal = !type.direct_checkout;
    setLensTypes(prev => prev.map(t => String(t.id) === String(type.id) ? { ...t, direct_checkout: newVal } : t));
    try {
      await apiClient.patch(`/core/metadata-items/${type.id}/`, { direct_checkout: newVal });
      fetchData();
    } catch (err) {
      setLensTypes(prev => prev.map(t => String(t.id) === String(type.id) ? { ...t, direct_checkout: !newVal } : t));
      setError('Failed to update direct checkout.');
    }
  };

  /* Flip the "PD calculation" flag on an existing lens type */
  const handlePdToggle = async (e, type) => {
    e.stopPropagation();
    const newVal = !(type.enable_pd !== false);
    setLensTypes(prev => prev.map(t => String(t.id) === String(type.id) ? { ...t, enable_pd: newVal } : t));
    try {
      await apiClient.patch(`/core/metadata-items/${type.id}/`, { enable_pd: newVal });
      fetchData();
    } catch (err) {
      setLensTypes(prev => prev.map(t => String(t.id) === String(type.id) ? { ...t, enable_pd: !newVal } : t));
      setError('Failed to update PD calculation.');
    }
  };

  /* Flip the "skip power details" flag on an existing lens type */
  const handleSkipPowerToggle = async (e, type) => {
    e.stopPropagation();
    const newVal = !type.skip_power;
    setLensTypes(prev => prev.map(t => String(t.id) === String(type.id) ? { ...t, skip_power: newVal } : t));
    try {
      await apiClient.patch(`/core/metadata-items/${type.id}/`, { skip_power: newVal });
      fetchData();
    } catch (err) {
      setLensTypes(prev => prev.map(t => String(t.id) === String(type.id) ? { ...t, skip_power: !newVal } : t));
      setError('Failed to update skip power details.');
    }
  };

  /* Update an existing lens type (label, image, and the behaviour toggles) */
  const handleEditType = async (formData) => {
    const type = showEditType;
    if (!type) return;
    let updated = (await apiClient.patch(`/core/metadata-items/${type.id}/`, {
      label: formData.label,
      value: formData.label.toLowerCase().replace(/\s+/g, '_'),
      direct_checkout: !!formData.direct_checkout,
      enable_pd: formData.enable_pd !== false,
      skip_power: !!formData.skip_power,
    })).data;

    // Upload a new lens-type image (multipart) only when a fresh file was picked
    if (formData.image instanceof File) {
      const fd = new FormData();
      fd.append('image', formData.image);
      const imgRes = await apiClient.patch(`/core/metadata-items/${type.id}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updated = imgRes.data || updated;
    }

    await fetchData();
    if (selectedType?.id === type.id) setSelectedType(updated);
  };

  const handleAddType = async (formData) => {
    const catId = showAddType; // the category this type is being created in
    let groupsRes = await apiClient.get('/core/metadata-groups/?name=Lens Type');
    let items = groupsRes.data.results || groupsRes.data;
    let lensGroup = Array.isArray(items)
      ? items.find(g => g.name.toLowerCase() === 'lens type')
      : (items.name?.toLowerCase() === 'lens type' ? items : null);
    if (!lensGroup) {
      const r = await apiClient.post('/core/metadata-groups/', { name: 'Lens Type' });
      lensGroup = r.data;
    }
    const res = await apiClient.post('/core/metadata-items/', {
      group: lensGroup.id,
      label: formData.label,
      value: formData.label.toLowerCase().replace(/\s+/g, '_'),
      is_active: true,
      home_category: catId || null,
      direct_checkout: !!formData.direct_checkout,
      enable_pd: formData.enable_pd !== false,
      skip_power: !!formData.skip_power,
    });
    let newType = res.data;

    // Upload the lens-type image (multipart) when one was picked
    if (newType?.id && formData.image instanceof File) {
      const fd = new FormData();
      fd.append('image', formData.image);
      const imgRes = await apiClient.patch(`/core/metadata-items/${newType.id}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      newType = imgRes.data || newType;
    }
    if (catId) {
      setTypeHomeCat(prev => ({ ...prev, [newType.id]: catId }));
    }
    await fetchData();
    setSelectedType(newType);
    setSelectedCategoryId(catId);
  };

  const addFeatureToForm = () => {
    const t = newFeatureText.trim();
    if (!t) return;
    setEditFormData(prev => ({ ...prev, features: [...prev.features, t] }));
    setNewFeatureText('');
  };

  const removeFeatureFromForm = (idx) =>
    setEditFormData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));

  const toggleConstraintSelection = (cId) => {
    setEditFormData(prev => {
      const current = (prev.constraints || []).map(c => typeof c === 'object' ? c.id : c);
      const next = current.includes(cId) ? current.filter(id => id !== cId) : [...current, cId];
      return { ...prev, constraints: next };
    });
  };

  const deleteConstraint = async (c) => {
    if (!window.confirm(`Delete constraint "${c.name}"? It will be removed from all lens packages.`)) return;
    try {
      await apiClient.delete(`/catalog/lens-constraints/${c.id}/`);
      setLensConstraints(prev => prev.filter(x => x.id !== c.id));
      setEditFormData(prev => ({
        ...prev,
        constraints: (prev.constraints || []).filter(x => (typeof x === 'object' ? x.id : x) !== c.id),
      }));
    } catch (err) { alert('Failed to delete constraint.'); }
  };

  const addConstraintToForm = async () => {
    const t = newConstraintText.trim();
    if (!t) return;
    const existing = lensConstraints.find(c => c.name.toLowerCase() === t.toLowerCase());
    if (existing) {
      toggleConstraintSelection(existing.id);
      setNewConstraintText('');
      return;
    }
    try {
      const res = await apiClient.post('/catalog/lens-constraints/', { name: t, description: '' });
      setLensConstraints(prev => [...prev, res.data]);
      setEditFormData(prev => ({ ...prev, constraints: [...prev.constraints, res.data.id] }));
      setNewConstraintText('');
    } catch (err) { alert('Failed to add constraint.'); }
  };

  const addIndexValue = async () => {
    const val = newIndexText.trim();
    if (!val) { setAddingIndex(false); return; }
    if (lensIndices.includes(val)) {
      handlePackageFieldChange('index', val);
      setAddingIndex(false);
      setNewIndexText('');
      return;
    }
    try {
      let indicesRes = await apiClient.get('/core/metadata-groups/?name=Lens Index');
      let items = indicesRes.data.results || indicesRes.data;
      let indexGroup = Array.isArray(items)
        ? items.find(g => g.name === 'Lens Index')
        : (items?.name === 'Lens Index' ? items : null);
      if (!indexGroup) {
        const r = await apiClient.post('/core/metadata-groups/', { name: 'Lens Index' });
        indexGroup = r.data;
      }
      await apiClient.post('/core/metadata-items/', {
        group: indexGroup.id,
        label: val,
        value: val,
        is_active: true,
      });
      setLensIndices(prev => [...prev, val]);
      handlePackageFieldChange('index', val);
      setAddingIndex(false);
      setNewIndexText('');
    } catch (err) { alert('Failed to add index value.'); }
  };

  /* ── derived ── */
  const filteredTypes     = lensTypes.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()));
  /* Packages: match selected lens type AND selected frame category */
  const currentTypeLenses = lenses.filter(l =>
    selectedType &&
    String(l.type) === String(selectedType.id) &&
    selectedCategoryId != null &&
    getPackageCatIds(l).includes(selectedCategoryId)
  );

  const getBrand = (lens) =>
    lensBrands.find(b => String(b.id) === String(lens.brand)) || null;

  /* Group current packages by brand for the right-panel accordion */
  const groupedByBrand = currentTypeLenses.reduce((acc, lens) => {
    const key = lens.brand ? String(lens.brand) : '__none__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(lens);
    return acc;
  }, {});

  const orderedBrandKeys = [
    ...lensBrands.filter(b => groupedByBrand[String(b.id)]).map(b => String(b.id)),
    ...(groupedByBrand['__none__'] ? ['__none__'] : []),
  ];

  if (loading && !lensTypes.length) {
    return <div className="lm-loading"><div className="lm-spinner" /></div>;
  }

  /* ══════════════════════════════════════════════ RENDER ══════════════════════════════════════════════ */
  return (
    <div className="lm-screen">

      {/* Page header */}
      <div className="lm-header">
        <div>
          <h1 className="lm-page-title">Admin Dashboard</h1>
          <p className="lm-page-sub">Add a new eyewear product to your catalog with precise specifications.</p>
        </div>
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
        <BrandTable fixedType="Lens" title="Frame Lens Brands" />
      ) : (
      /* Two-column layout */
      <div className="lm-grid">

        {/* ── Left: Lens Types (accordion by category) ── */}
        <div className="lm-left-panel">
          <div className="lm-left-header">
            <span className="lm-left-title">Lens Types ({lensTypes.length})</span>
          </div>

          {/* Search */}
          <div className="lm-search-wrap">
            <Search size={13} className="lm-search-icon" />
            <input
              className="lm-search-input"
              placeholder="Search lens types..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Scrollable accordion area — categories from API */}
          <div className="lm-types-scroll">
            {lensCategories.map(cat => {
              const visibleTypes = filteredTypes.filter(type => {
                // Every lens type — including direct-checkout ones — stays dedicated to its
                // own category. It shows here only if it has a package in this category, or
                // (when it has no packages) this is its home category. No spilling into
                // other categories such as Sunglasses.
                const hasPackagesHere = lenses.some(l =>
                  String(l.type) === String(type.id) &&
                  getPackageCatIds(l).includes(cat.id)
                );
                if (hasPackagesHere) return true;
                // No packages in this category — only show if this is the type's home
                // category. Prefer the value persisted on the type (survives refresh),
                // falling back to the in-memory map for the just-created optimistic case.
                const hasPackagesAnywhere = lenses.some(l => String(l.type) === String(type.id));
                if (!hasPackagesAnywhere) {
                  const homeCat = type.home_category ?? typeHomeCat[type.id];
                  return String(homeCat) === String(cat.id);
                }
                return false;
              });
              const collapsed = !!groupCollapsed[cat.id];
              const count     = String(visibleTypes.length).padStart(2, '0');

              return (
                <div key={cat.id} className="lm-cat-section">
                  {/* Category header row */}
                  <div
                    className="lm-cat-header"
                    onClick={() => setGroupCollapsed(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                  >
                    <div className="lm-cat-header-left">
                      <span className="lm-cat-badge">{count}</span>
                      <span className="lm-cat-name">{cat.name}</span>
                    </div>
                    <ChevronDown size={18} className={`lm-cat-caret${collapsed ? ' collapsed' : ''}`} />
                  </div>

                  {/* Types + Add card */}
                  {!collapsed && (
                    <div className="lm-cat-types">
                      {visibleTypes.map(type => {
                        const pkgCount = lenses.filter(l =>
                          String(l.type) === String(type.id) &&
                          getPackageCatIds(l).includes(cat.id)
                        ).length;
                        const isActive = selectedType?.id === type.id && selectedCategoryId === cat.id;

                        return (
                          <div
                            key={type.id}
                            className={`lm-type-card ${isActive ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedType(type);
                              setSelectedCategoryId(cat.id);
                            }}
                          >
                            <div>
                              <div className="lm-type-card-top">
                                <span className="lm-type-name">{type.label}</span>
                                <div className="lm-type-card-actions">
                                  <button
                                    type="button"
                                    className="lm-type-edit-btn"
                                    title="Edit"
                                    onClick={(e) => { e.stopPropagation(); setShowEditType(type); }}
                                  >
                                    <Edit2 size={13} />
                                  </button>
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
                              <span className="lm-type-desc">
                                {type.label === 'With Power'           ? 'Positive, Negative or Cylindrical' :
                                 type.label === 'Zero Power'           ? 'Blue light block for screen protection' :
                                 type.label === 'Progressive/Bifocals' ? 'Two powers in one eye' :
                                 type.label === 'Photochromic'         ? 'Light adaptive lenses' :
                                 type.description || 'Standard lenses'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDirectCheckoutToggle(e, type)}
                                title="Direct checkout — skip lens selection and send the customer straight to checkout"
                                style={{
                                  marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
                                  border: '1px solid', borderColor: type.direct_checkout ? '#68408D' : '#e5e7eb',
                                  background: type.direct_checkout ? '#f4ebff' : '#fff',
                                  color: type.direct_checkout ? '#68408D' : '#6b7280',
                                  borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                }}
                              >
                                <Zap size={11} /> Direct checkout: {type.direct_checkout ? 'On' : 'Off'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handlePdToggle(e, type)}
                                title="PD calculation — show the Pupillary Distance step in the customer prescription flow"
                                style={{
                                  marginTop: 8, marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 5,
                                  border: '1px solid', borderColor: type.enable_pd !== false ? '#68408D' : '#e5e7eb',
                                  background: type.enable_pd !== false ? '#f4ebff' : '#fff',
                                  color: type.enable_pd !== false ? '#68408D' : '#6b7280',
                                  borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                }}
                              >
                                <Ruler size={11} /> PD calc: {type.enable_pd !== false ? 'On' : 'Off'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleSkipPowerToggle(e, type)}
                                title="Skip power details — skip the prescription/power step in the customer flow"
                                style={{
                                  marginTop: 8, marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 5,
                                  border: '1px solid', borderColor: type.skip_power ? '#68408D' : '#e5e7eb',
                                  background: type.skip_power ? '#f4ebff' : '#fff',
                                  color: type.skip_power ? '#68408D' : '#6b7280',
                                  borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                }}
                              >
                                <SkipForward size={11} /> Skip power: {type.skip_power ? 'On' : 'Off'}
                              </button>
                            </div>
                            <span className="lm-type-count">
                              {pkgCount} Package{pkgCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        );
                      })}

                      {/* Dashed "Add lens type" card */}
                      <button
                        type="button"
                        className="lm-cat-add"
                        onClick={() => setShowAddType(cat.id)}
                      >
                        <Plus size={18} />
                        <span className="lm-cat-add-text">Add {cat.name} Lens type</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {lensCategories.length === 0 && (
              <div className="lm-empty-state" style={{ padding: '24px 16px' }}>
                No frame categories found.
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Packages ── */}
        <div className="lm-right-panel">
          <div className="lm-right-header">
            <span className="lm-right-title">
              Lens Package for &ldquo;{selectedType?.label || '—'}&rdquo;
              {selectedType && selectedCategoryId && (
                <span style={{ fontWeight: 400, color: '#6b46c1', marginLeft: 6, fontSize: 12 }}>
                  • {lensCategories.find(c => c.id === selectedCategoryId)?.name || ''}
                </span>
              )}
            </span>
            <button
              className="lm-add-pkg-btn"
              disabled={!selectedType}
              onClick={() => {
                setIsEditingPackage(false);
                setIsCreatingNewPackage(true);
                setEditFormData({
                  ...EMPTY_PACKAGE_FORM,
                  categories: selectedCategoryId ? [selectedCategoryId] : [],
                });
              }}
            >
              <Plus size={13} /> Add Package
            </button>
          </div>

          <div className="lm-pkg-list">
            {currentTypeLenses.length === 0 ? (
              <div className="lm-empty-state">
                <Layers size={40} style={{ color: '#D0D5DD', marginBottom: 12 }} />
                <p style={{ color: '#667085', margin: 0, fontSize: 13 }}>
                  No packages yet for this lens type
                  {selectedCategoryId ? ` in ${lensCategories.find(c => c.id === selectedCategoryId)?.name || ''}` : ''}.
                </p>
                <button
                  className="lm-add-pkg-btn"
                  style={{ marginTop: 16, color: '#6b46c1' }}
                  disabled={!selectedType}
                  onClick={() => {
                    setIsEditingPackage(false);
                    setIsCreatingNewPackage(true);
                    setEditFormData({
                      ...EMPTY_PACKAGE_FORM,
                      categories: selectedCategoryId ? [selectedCategoryId] : [],
                    });
                  }}
                >
                  <Plus size={13} /> Create First Package
                </button>
              </div>
            ) : (
              orderedBrandKeys.map(brandKey => {
                const brandLenses  = groupedByBrand[brandKey];
                const brand        = brandKey !== '__none__' ? lensBrands.find(b => String(b.id) === brandKey) : null;
                const count        = String(brandLenses.length).padStart(2, '0');
                const isCollapsed  = !!brandCollapsed[brandKey];

                return (
                  <div key={brandKey} className="lm-brand-section">
                    {/* Brand accordion header */}
                    <div
                      className="lm-brand-header"
                      onClick={() => setBrandCollapsed(prev => ({ ...prev, [brandKey]: !prev[brandKey] }))}
                    >
                      <div className="lm-brand-header-left">
                        <span className="lm-cat-badge">{count}</span>
                        <span className="lm-brand-hdr-name">{brand?.name || 'Other'}</span>
                      </div>
                      <ChevronDown size={20} className={`lm-cat-caret${isCollapsed ? ' collapsed' : ''}`} />
                    </div>

                    {/* Packages inside this brand */}
                    {!isCollapsed && (
                      <div className="lm-brand-pkgs">
                        {brandLenses.map(lens => {
                          const isSelected = selectedLens?.id === lens.id;
                          const fmtPow     = (v) => { const n = Number(v); return Number.isFinite(n) ? `${n > 0 ? '+' : ''}${n.toFixed(2)}` : '—'; };
                          const sphMin     = fmtPow(lens.min_power ?? -6);
                          const sphMax     = fmtPow(lens.max_power ??  4);
                          const cylMin     = fmtPow(lens.cyl_min  ?? -6);
                          const cylMax     = fmtPow(lens.cyl_max  ??  0);
                          const features   = lens.features || [];
                          return (
                            <div
                              key={lens.id}
                              className={`lm-pkg-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedLens(lens)}
                            >
                              {/* Top row: name + actions */}
                              <div className="lm-pkg-top">
                                <span className="lm-pkg-name">
                                  {lens.package_name || lens.name}
                                  {lens.index && <span className="lm-pkg-index">Index {lens.index}</span>}
                                </span>
                                <div className="lm-pkg-actions">
                                  <button
                                    type="button"
                                    className="lm-pkg-icon-btn"
                                    title="Edit"
                                    onClick={(e) => { e.stopPropagation(); openPackageFormForEdit(lens); }}
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="lm-pkg-icon-btn"
                                    title="Duplicate"
                                    onClick={(e) => { e.stopPropagation(); handleDuplicatePackage(lens); }}
                                  >
                                    <Copy size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="lm-pkg-icon-btn lm-pkg-delete-btn"
                                    title="Delete"
                                    onClick={(e) => handleDeletePackage(e, lens)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                  <PackageToggle
                                    checked={lens.is_active}
                                    onChange={(e) => handleStatusToggle(e, 'lens', lens.id, lens.is_active)}
                                  />
                                </div>
                              </div>

                              {/* Feature tags */}
                              {features.length > 0 && (
                                <div className="lm-pkg-tags">
                                  {features.map((f, i) => (
                                    <span key={i} className="lm-pkg-tag">{f}</span>
                                  ))}
                                </div>
                              )}

                              {/* Footer: SPH/CYL power range table + price */}
                              <div className="lm-pkg-footer">
                                <table className="lm-pkg-range-table">
                                  <thead>
                                    <tr><th /><th>Min</th><th>Max</th></tr>
                                  </thead>
                                  <tbody>
                                    <tr><td className="lm-pkg-range-rl">SPH</td><td>{sphMin}</td><td>{sphMax}</td></tr>
                                    <tr><td className="lm-pkg-range-rl">CYL</td><td>{cylMin}</td><td>{cylMax}</td></tr>
                                  </tbody>
                                </table>
                                <div className="lm-pkg-price-wrap">
                                  <span className="lm-pkg-price">
                                    ₹{Number(lens.package_selling_price || lens.price || 0).toLocaleString('en-IN')}
                                  </span>
                                  {lens.description && (
                                    <span className="lm-pkg-price-sub">{lens.description}</span>
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
      )}

      {/* ── Add Lens Type modal ── */}
      <FormModal
        isOpen={showAddType !== null}
        onClose={() => setShowAddType(null)}
        onSubmit={handleAddType}
        title="Lens Type"
        fields={LENS_TYPE_FIELDS}
      />

      {/* ── Edit Lens Type modal ── */}
      <FormModal
        isOpen={showEditType !== null}
        mode="edit"
        onClose={() => setShowEditType(null)}
        onSubmit={handleEditType}
        title="Lens Type"
        fields={LENS_TYPE_FIELDS}
        initialData={showEditType ? {
          id: showEditType.id,
          label: showEditType.label || '',
          image: showEditType.image || '',
          direct_checkout: !!showEditType.direct_checkout,
          enable_pd: showEditType.enable_pd !== false,
          skip_power: !!showEditType.skip_power,
        } : {}}
      />

      {/* ── Create / Edit Package offcanvas ── */}
      {(isCreatingNewPackage || isEditingPackage) && (
        // Clicking the backdrop no longer closes the form — it was too easy to lose
        // unsaved edits by clicking just outside the panel. Use the X or Cancel instead.
        <div className="lm-backdrop">
          <div className="lm-offcanvas" onClick={e => e.stopPropagation()}>

            <div className="lm-oc-header">
              <div>
                <h2 className="lm-oc-title">{isEditingPackage ? 'Edit Package' : 'Create Package'}</h2>
                <p className="lm-oc-sub">
                  {isEditingPackage ? 'Update package details and save your changes.' : 'Fill in the details to add a new lens package.'}
                </p>
              </div>
              <button className="lm-oc-close" onClick={handleClosePackageForm}><X size={18} /></button>
            </div>

            <div className="lm-oc-body">

              {/* Package details */}
              <div className="lm-oc-section">
                <div className="lm-oc-section-title">Package details</div>
                <div className="lm-form-group">
                  <label className="lm-form-label">Package Name</label>
                  <input className="lm-form-input" value={editFormData.name}
                    onChange={e => handlePackageFieldChange('name', e.target.value)}
                    placeholder="Enter package name" />
                </div>
                <div className="lm-form-group">
                  <label className="lm-form-label">Lens Image</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {(editFormData.image || editFormData.image_url) && (
                      <img
                        src={editFormData.image ? URL.createObjectURL(editFormData.image) : editFormData.image_url}
                        alt="Lens preview"
                        style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb', flexShrink: 0 }}
                      />
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={e => handlePackageFieldChange('image', e.target.files[0] || null)}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Shown on the lens selection drawer. JPG, PNG or WebP.</p>
                </div>
              </div>

              {/* Pricing & power */}
              <div className="lm-oc-section">
                <div className="lm-oc-section-title">Pricing & power</div>
                <div className="lm-form-row-2">
                  <div className="lm-form-group">
                    <label className="lm-form-label">Selling Price</label>
                    <input type="number" className="lm-form-input" value={editFormData.selling_price}
                      onChange={e => handlePackageFieldChange('selling_price', e.target.value)}
                      placeholder="0.00" />
                  </div>
                  <div className="lm-form-group">
                    <label className="lm-form-label">Cost Price</label>
                    <input type="number" className="lm-form-input" value={editFormData.cost_price}
                      onChange={e => handlePackageFieldChange('cost_price', e.target.value)}
                      placeholder="0.00" />
                  </div>
                </div>
                {(() => {
                  const rimlessId = lensConstraints.find(c => c.name?.toLowerCase() === 'rimless')?.id;
                  const selectedIds = (editFormData.constraints || []).map(c => typeof c === 'object' ? c.id : c);
                  const hasRimless = rimlessId != null && selectedIds.includes(rimlessId);
                  return (
                <div className="lm-form-row-2">
                  <div className="lm-form-group">
                    <label className="lm-form-label">Lens Index</label>
                    <div style={{ display: 'flex', gap: 6, position: 'relative', alignItems: 'center' }}>
                      <div className="lm-input-with-clear" style={{ flex: 1 }}>
                        <select className="lm-form-input" value={editFormData.index}
                          onChange={e => handlePackageFieldChange('index', e.target.value)}
                          style={{ width: '100%' }}>
                          {lensIndices.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        {editFormData.index && (
                          <span className="lm-clear-icon" onClick={() => handlePackageFieldChange('index', '')}>
                            ×
                          </span>
                        )}
                      </div>
                      <button type="button" className="lm-add-more-btn"
                        onClick={() => setAddingIndex(v => !v)}
                        title="Add new index value"
                        style={{ whiteSpace: 'nowrap' }}>
                        + Add
                      </button>
                    </div>
                    {addingIndex && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <input
                          autoFocus
                          className="lm-form-input"
                          value={newIndexText}
                          onChange={e => setNewIndexText(e.target.value)}
                          placeholder="e.g. 1.59"
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIndexValue(); } if (e.key === 'Escape') { setAddingIndex(false); setNewIndexText(''); } }}
                          style={{ flex: 1 }}
                        />
                        <button type="button" className="lm-add-more-btn" onClick={addIndexValue}>
                          Save
                        </button>
                      </div>
                    )}
                    {hasRimless && editFormData.index !== '1.59' && (
                      <p style={{ margin: '5px 0 0', fontSize: 11, color: '#b45309' }}>
                        ⚠ This lens serves Rimless frames — 1.59 is the recommended index for rimless customers.
                      </p>
                    )}
                  </div>
                  <div className="lm-form-group">
                    <label className="lm-form-label">Warranty (months)</label>
                    <input type="number" className="lm-form-input" value={editFormData.warranty_months}
                      onChange={e => handlePackageFieldChange('warranty_months', e.target.value)}
                      placeholder="0" />
                  </div>
                </div>
                  );
                })()}
                <div className="lm-form-group">
                  <label className="lm-form-label">Power Range (Dioptres)</label>
                  <table className="lm-power-table">
                    <thead>
                      <tr>
                        <th />
                        <th>Min</th>
                        <th>Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="lm-power-table__label">Spherical (SPH)</td>
                        <td>
                          <input className="lm-form-input" value={editFormData.min_power}
                            onChange={e => handlePackageFieldChange('min_power', e.target.value)} placeholder="-6.00" />
                        </td>
                        <td>
                          <input className="lm-form-input" value={editFormData.max_power}
                            onChange={e => handlePackageFieldChange('max_power', e.target.value)} placeholder="+4.00" />
                        </td>
                      </tr>
                      <tr>
                        <td className="lm-power-table__label">Cylindrical (CYL)</td>
                        <td>
                          <input className="lm-form-input" value={editFormData.cyl_min}
                            onChange={e => handlePackageFieldChange('cyl_min', e.target.value)} placeholder="-6.00" />
                        </td>
                        <td>
                          <input className="lm-form-input" value={editFormData.cyl_max}
                            onChange={e => handlePackageFieldChange('cyl_max', e.target.value)} placeholder="0.00" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Brand */}
              <div className="lm-oc-section">
                <div className="lm-oc-section-title">Brand & categories</div>
                <div className="lm-form-group">
                  <label className="lm-form-label">Brand</label>
                  <div className="lm-input-with-clear">
                    <select className="lm-form-input" value={editFormData.brand}
                      onChange={e => handlePackageFieldChange('brand', e.target.value)}>
                      <option value="">Select brand</option>
                      {lensBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {editFormData.brand && (
                      <span className="lm-clear-icon" onClick={() => handlePackageFieldChange('brand', '')}>
                        ×
                      </span>
                    )}
                  </div>
                </div>
                <div className="lm-form-group">
                  <label className="lm-form-label">Categories</label>
                  <div className="lm-chip-list">
                    {lensCategories.map(cat => {
                      const sel = editFormData.categories.includes(cat.id);
                      const next = sel
                        ? editFormData.categories.filter(id => id !== cat.id)
                        : [...editFormData.categories, cat.id];
                      return (
                        <button
                          key={cat.id} type="button"
                          className={`lm-chip ${sel ? 'active' : ''}`}
                          onClick={() => handlePackageFieldChange('categories', next)}
                        >
                          <span>{cat.name}</span>
                          {sel && (
                            <span className="lm-chip-close" onClick={(e) => { e.stopPropagation(); handlePackageFieldChange('categories', next); }}>
                              ×
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="lm-oc-section">
                <div className="lm-oc-section-title">Features</div>
                <div className="lm-chip-list">
                  {editFormData.features.map((f, i) => (
                    <span key={i} className="lm-chip active">
                      {f}
                      <button type="button" onClick={() => removeFeatureFromForm(i)}>×</button>
                    </span>
                  ))}
                </div>
                <div className="lm-form-row-2">
                  <input className="lm-form-input" value={newFeatureText}
                    onChange={e => setNewFeatureText(e.target.value)}
                    placeholder="e.g. Anti-Glare"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeatureToForm(); } }}
                  />
                  <button type="button" className="lm-add-more-btn" onClick={addFeatureToForm}>
                    + Add
                  </button>
                </div>
              </div>

              {/* Constraints */}
              <div className="lm-oc-section">
                <div className="lm-oc-section-title">Constraints</div>
                <div className="lm-form-text" style={{ marginBottom: 10, color: '#475569', fontSize: 13 }}>
                  Select one or more existing frame-type constraints for this package.
                </div>
                <div className="lm-chip-list">
                  {lensConstraints.map(c => {
                    const sel = editFormData.constraints.map(x => typeof x === 'object' ? x.id : x).includes(c.id);
                    return (
                      <button key={c.id} type="button"
                        className={`lm-chip ${sel ? 'active' : ''}`}
                        onClick={() => toggleConstraintSelection(c.id)}
                      >
                        <span>{c.name}</span>
                        {sel && (
                          <span className="lm-chip-close" onClick={(e) => { e.stopPropagation(); toggleConstraintSelection(c.id); }}>
                            ×
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="lm-form-row-2">
                  <input className="lm-form-input" value={newConstraintText}
                    onChange={e => setNewConstraintText(e.target.value)}
                    placeholder="Add new constraint"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addConstraintToForm(); } }}
                  />
                  <button type="button" className="lm-add-more-btn" onClick={addConstraintToForm}>
                    + Add
                  </button>
                </div>
              </div>
            </div>

            <div className="lm-oc-footer">
              <button type="button" className="lm-oc-cancel" onClick={handleClosePackageForm}>Cancel</button>
              <button type="button" className="lm-oc-submit" onClick={handleSave}>
                {isEditingPackage ? 'Save changes' : 'Create package'}
              </button>
            </div>
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

export default LensManagement;
