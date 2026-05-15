import React, { useState, useEffect } from 'react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';

import {
  Plus, Search, Check, Info, AlertCircle,
  ExternalLink, MessageSquare, Copy,
  ChevronDown, Layers, Settings, Trash2, Trash
} from 'lucide-react';
import '../../../styles/lens_management.css';




const LENS_TYPE_FIELDS = [{ name: 'label', label: 'Type Name', required: true }];



/**
 * LensManagement — High-Fidelity implementation based on Figma (node 273:15080)
 */
const LensManagement = () => {
  const [lensTypes, setLensTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [lenses, setLenses] = useState([]);
  const [selectedLens, setSelectedLens] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lensBrands, setLensBrands] = useState([]);
  const [lensCategories, setLensCategories] = useState([]);


  const [showAddType, setShowAddType] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState(new Set());
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectAllTypesChecked, setSelectAllTypesChecked] = useState(false);

  // Form states for the Right Column
  const [editFormData, setEditFormData] = useState({
    name: '',
    price: '',
    description: '',
    index: '',
    is_active: true,
    features: [],
    compatibility: [],
    pricing_mode: 'package',
    brand: '',
    categories: [],
    is_for_sunglasses: false,
    is_for_eyeglasses: true
  });

  const fetchData = async () => {
    try {
      const [groupsRes, lensesRes, brandsRes, catsRes, pkgsRes] = await Promise.all([
        apiClient.get('/core/metadata-groups/?name=Lens Type'),
        apiClient.get('/catalog/lenses/?admin=true&page_size=200'),
        apiClient.get('/catalog/brands/?brand_type=Lens'),
        apiClient.get('/catalog/categories/?category_type=Frame'),
        apiClient.get('/catalog/lens-packages/?admin=true')
      ]);

      const items = groupsRes.data.results || groupsRes.data;
      const lensGroup = Array.isArray(items) ? items.find(g => g.name === 'Lens Type') : (items.name === 'Lens Type' ? items : null);
      if (lensGroup) {
        setLensTypes(lensGroup.items || []);
        if (!selectedType && lensGroup.items?.length > 0) {
          setSelectedType(lensGroup.items[0]);
        }
      }

      setLenses(lensesRes.data.results || lensesRes.data);
      setLensBrands(brandsRes.data.results || brandsRes.data || []);
      setLensCategories(catsRes.data.results || catsRes.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch lens data', err);
      setError('Unable to load lens data.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!selectedLens) return;
    try {
      await apiClient.put(`/catalog/lenses/${selectedLens.id}/`, {
        ...selectedLens,
        price: editFormData.price,
        index: editFormData.index,
        is_active: editFormData.is_active,
        package_name: editFormData.name,
        description: editFormData.description,
        features: editFormData.features,
        brand: editFormData.brand ? Number(editFormData.brand) : null,
        category_ids: editFormData.categories,
        is_for_sunglasses: editFormData.is_for_sunglasses,
        is_for_eyeglasses: editFormData.is_for_eyeglasses,
      });
      await fetchData();
      alert('Package updated successfully');
    } catch (err) {
      console.error('Save failed', err);
      setError('Failed to save changes.');
    }
  };

  const handleStatusToggle = async (e, target, id, currentStatus) => {
    e.stopPropagation();
    try {
      if (target === 'type') {
        await apiClient.patch(`/core/metadata-items/${id}/`, { is_active: !currentStatus });
      } else {
        await apiClient.patch(`/catalog/lenses/${id}/`, { is_active: !currentStatus });
      }
      await fetchData();
    } catch (err) {
      console.error('Toggle failed', err);
    }
  };

  const handleAddType = async (formData) => {
    try {
      // 1. Find the group precisely
      let groupsRes = await apiClient.get('/core/metadata-groups/?name=Lens Type');
      let items = groupsRes.data.results || groupsRes.data;
      let lensGroup = Array.isArray(items) ? items.find(g => g.name.toLowerCase() === 'lens type') : (items.name?.toLowerCase() === 'lens type' ? items : null);

      // 2. Self-Healing: If group doesn't exist, create it
      if (!lensGroup) {
        const createGroupRes = await apiClient.post('/core/metadata-groups/', { name: 'Lens Type' });
        lensGroup = createGroupRes.data;
      }

      // 3. Add the Lens Type (MetadataItem)
      await apiClient.post('/core/metadata-items/', {
        group: lensGroup.id,
        label: formData.label,
        value: formData.label.toLowerCase().replace(/\s+/g, '_'),
        is_active: true
      });
      setShowAddType(false);
      await fetchData();
    } catch (err) {
      console.error('Add type failed', err);
      alert('Error creating Lens Type. Please try again.');
    }
  };

  const enterCreateMode = () => {
    setSelectedLens(null);
    setIsCreating(true);
    setEditFormData({
      name: '', price: '', description: '', index: '1.5', is_active: true,
      features: [], compatibility: ['Full Rim'], pricing_mode: 'package',
      brand: '', categories: []
    });
  };

  const handleCreate = async () => {
    if (!editFormData.name?.trim() || !editFormData.price) {
      alert('Package Name and Price are required');
      return;
    }
    try {
      await apiClient.post('/catalog/lenses/', {
        type: selectedType?.id,
        price: editFormData.price,
        index: editFormData.index || '1.5',
        is_active: editFormData.is_active,
        package_name: editFormData.name,
        features: editFormData.features || [],
        description: editFormData.description || '',
        brand: editFormData.brand ? Number(editFormData.brand) : null,
        category_ids: editFormData.categories,
        is_for_sunglasses: editFormData.is_for_sunglasses,
        is_for_eyeglasses: editFormData.is_for_eyeglasses,
      });
      setIsCreating(false);
      setEditFormData({
        name: '', price: '', description: '', index: '1.5', is_active: true,
        features: [], compatibility: ['Full Rim'], pricing_mode: 'package',
        brand: '', categories: [], is_for_sunglasses: false, is_for_eyeglasses: true
      });
      await fetchData();
      alert('Package created successfully');
    } catch (err) {
      console.error('Create package failed', err);
      setError('Failed to create package.');
    }
  };

  // Bulk Selection Handlers
  const togglePackageSelection = (lensId) => {
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(lensId)) {
      newSelected.delete(lensId);
    } else {
      newSelected.add(lensId);
    }
    setSelectedPackages(newSelected);
    setSelectAllChecked(false);
  };

  const toggleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedPackages(new Set());
      setSelectAllChecked(false);
    } else {
      const allIds = new Set(currentTypeLenses.map(l => l.id));
      setSelectedPackages(allIds);
      setSelectAllChecked(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPackages.size === 0) return;
    if (!window.confirm(`Delete ${selectedPackages.size} package(s)? This cannot be undone.`)) return;
    
    try {
      const deletePromises = Array.from(selectedPackages).map(id =>
        apiClient.delete(`/catalog/lenses/${id}/`)
      );
      await Promise.all(deletePromises);
      setSelectedPackages(new Set());
      setSelectAllChecked(false);
      await fetchData();
      alert(`${selectedPackages.size} package(s) deleted successfully`);
    } catch (err) {
      console.error('Bulk delete failed', err);
      alert('Error deleting packages. Please try again.');
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedPackages.size === 0) return;
    
    try {
      const updatePromises = Array.from(selectedPackages).map(id =>
        apiClient.patch(`/catalog/lenses/${id}/`, { is_active: newStatus })
      );
      await Promise.all(updatePromises);
      setSelectedPackages(new Set());
      setSelectAllChecked(false);
      await fetchData();
      alert(`${selectedPackages.size} package(s) ${newStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      console.error('Bulk status change failed', err);
      alert('Error updating packages. Please try again.');
    }
  };

  const handleBulkAssignCategory = async () => {
    if (selectedPackages.size === 0) return;
    
    const categoryId = window.prompt('Enter category ID to assign (or leave blank to skip)');
    if (!categoryId) return;
    
    try {
      const updatePromises = Array.from(selectedPackages).map(id => {
        const lens = lenses.find(l => l.id === id);
        const currentCategories = lens?.categories?.map(c => c.id) || [];
        const newCategories = [...currentCategories, parseInt(categoryId)];
        return apiClient.patch(`/catalog/lenses/${id}/`, {
          category_ids: [...new Set(newCategories)]
        });
      });
      await Promise.all(updatePromises);
      setSelectedPackages(new Set());
      setSelectAllChecked(false);
      await fetchData();
      alert(`${selectedPackages.size} package(s) updated with category`);
    } catch (err) {
      console.error('Bulk assign category failed', err);
      alert('Error assigning category. Please try again.');
    }
  };

  // Lens Type Bulk Selection Handlers
  const toggleTypeSelection = (typeId) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(typeId)) {
      newSelected.delete(typeId);
    } else {
      newSelected.add(typeId);
    }
    setSelectedTypes(newSelected);
    setSelectAllTypesChecked(false);
  };

  const toggleSelectAllTypes = () => {
    if (selectAllTypesChecked) {
      setSelectedTypes(new Set());
      setSelectAllTypesChecked(false);
    } else {
      const allIds = new Set(filteredTypes.map(t => t.id));
      setSelectedTypes(allIds);
      setSelectAllTypesChecked(true);
    }
  };

  const handleBulkDeleteTypes = async () => {
    if (selectedTypes.size === 0) return;
    if (!window.confirm(`Delete ${selectedTypes.size} lens type(s)? This cannot be undone.`)) return;
    
    try {
      const deletePromises = Array.from(selectedTypes).map(id =>
        apiClient.delete(`/core/metadata-items/${id}/`)
      );
      await Promise.all(deletePromises);
      setSelectedTypes(new Set());
      setSelectAllTypesChecked(false);
      await fetchData();
      alert(`${selectedTypes.size} lens type(s) deleted successfully`);
    } catch (err) {
      console.error('Bulk delete types failed', err);
      alert('Error deleting lens types. Please try again.');
    }
  };

  useEffect(() => {
    if (selectedLens) {
      setEditFormData({
        name: selectedLens.package_name || selectedLens.name,
        price: selectedLens.price,
        description: selectedLens.description || '',
        index: selectedLens.index || '1.5',
        is_active: selectedLens.is_active,
        features: selectedLens.features || [],
        compatibility: selectedLens.compatibility || ['Full Rim'],
        pricing_mode: selectedLens.pricing_mode || 'package',
        brand: selectedLens.brand || '',
        categories: (selectedLens.categories || []).map(c => c.id),
        is_for_sunglasses: selectedLens.is_for_sunglasses || false,
        is_for_eyeglasses: selectedLens.is_for_eyeglasses !== false, // default to true
      });
    }
  }, [selectedLens]);

  const filteredTypes = lensTypes.filter(t =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentTypeLenses = lenses.filter(l =>
    selectedType && String(l.type) === String(selectedType.id)
  );

  if (loading && !lensTypes.length) {
    return (
      <div className="lm-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="lm-screen">
      {/* ──── Header Area (273:15175) ──── */}
      <div className="lm-header">
        <div className="lm-header-left">
          <h1>Admin Dashboard</h1>
          <p>Add a new eyewear product to your catalog with precise specifications.</p>
        </div>
        <div className="lm-header-right">
          <button className="lm-btn-solid" onClick={() => setShowAddType(true)}>+ Lens Type <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>(e.g. Single Vision)</span></button>
          <button className="lm-btn-solid" onClick={enterCreateMode}>+ Package <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>(price, brand, category)</span></button>
        </div>
      </div>

      <div className="lm-main-grid">
        {/* ──── Left Column: Lens Types (273:15180) ──── */}
        <div className="lm-col-left">
          <div className="lm-col-header">
            <h3>Lens Types ({lensTypes.length})</h3>
          </div>
          <div className="lm-search-container">
            <div className="lm-search-input-box">
              <Search size={16} className="lm-search-icon" />
              <input
                placeholder="Search lens types..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {selectedTypes.size > 0 && (
            <div style={{
              display: 'flex', gap: 8, padding: '12px 16px', background: '#FAFBFC',
              borderBottom: '1px solid #EAECF0', flexWrap: 'wrap'
            }}>
              <button
                onClick={handleBulkDeleteTypes}
                style={{
                  display: 'flex', gap: 6, alignItems: 'center',
                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: '#FEE4E2', color: '#D92D20', border: 'none', cursor: 'pointer'
                }}
              >
                <Trash size={14} /> Delete ({selectedTypes.size})
              </button>
              <button
                onClick={() => { setSelectedTypes(new Set()); setSelectAllTypesChecked(false); }}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: 'white', color: '#667085', border: '1px solid #EAECF0', cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          )}

          <div className="lm-item-list">
            {filteredTypes.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                background: '#FAFBFC', borderBottom: '1px solid #EAECF0',
                fontSize: 12, fontWeight: 600
              }}>
                <input
                  type="checkbox"
                  checked={selectAllTypesChecked}
                  onChange={toggleSelectAllTypes}
                  style={{ cursor: 'pointer' }}
                />
                <span>Select All ({filteredTypes.length})</span>
              </div>
            )}
            {filteredTypes.map(type => (
              <div
                key={type.id}
                className={`lm-type-card ${selectedType?.id === type.id ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.has(type.id)}
                  onChange={(e) => { e.stopPropagation(); toggleTypeSelection(type.id); }}
                  style={{ cursor: 'pointer', marginTop: 8, flexShrink: 0 }}
                />
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedType(type)}>
                  <div className="type-card-top">
                    <span className="type-card-name">{type.label}</span>
                    <div
                      className={`lm-toggle-mini ${type.is_active ? 'active' : ''}`}
                      onClick={(e) => handleStatusToggle(e, 'type', type.id, type.is_active)}
                    >
                      <div className="toggle-circle" />
                    </div>
                  </div>
                    <span className="type-card-desc">
                    {type.label === 'Single Vision' ? 'Standard single vision' :
                      type.label === 'Zero Power' ? 'Non-prescription lenses' :
                      type.label === 'Photochromic' ? 'Light adaptive lenses' : 'Standard lenses'}
                  </span>
                  <span className="type-card-meta">
                    {lenses.filter(l => String(l.type) === String(type.id)).length} Packages
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ──── Middle Column: Packages (273:15231) ──── */}
        <div className="lm-col-mid">
          <div className="lm-mid-header">
            <div className="lm-mid-title">
              <h2>Packages for "{selectedType?.label || 'Select Type'}"</h2>
              <ChevronDown size={18} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {selectedPackages.size > 0 && (
                <div style={{
                  display: 'flex', gap: 6, alignItems: 'center',
                  padding: '6px 12px', background: '#F3E8FF', borderRadius: 6,
                  fontSize: 11, fontWeight: 600, color: '#6B46C1'
                }}>
                  {selectedPackages.size} selected
                </div>
              )}
              <button className="lm-add-link" onClick={enterCreateMode} disabled={!selectedType}>
                <Plus size={16} /> Add Package
              </button>
            </div>
          </div>
          
          {selectedPackages.size > 0 && (
            <div style={{
              display: 'flex', gap: 8, padding: '12px 16px', background: '#FAFBFC',
              borderBottom: '1px solid #EAECF0', flexWrap: 'wrap'
            }}>
              <button
                onClick={handleBulkDelete}
                style={{
                  display: 'flex', gap: 6, alignItems: 'center',
                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: '#FEE4E2', color: '#D92D20', border: 'none', cursor: 'pointer'
                }}
              >
                <Trash size={14} /> Delete ({selectedPackages.size})
              </button>
              <button
                onClick={() => { setSelectedPackages(new Set()); setSelectAllChecked(false); }}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: 'white', color: '#667085', border: '1px solid #EAECF0', cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          )}

          <div className="lm-package-list">
            {currentTypeLenses.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                background: '#FAFBFC', borderBottom: '1px solid #EAECF0',
                fontSize: 12, fontWeight: 600
              }}>
                <input
                  type="checkbox"
                  checked={selectAllChecked}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
                <span>Select All ({currentTypeLenses.length})</span>
              </div>
            )}
            {currentTypeLenses.length === 0 ? (
              <div className="lm-empty-mid">
                <Layers size={48} className="empty-icon" />
                <p>No packages found for this lens type.</p>
                <button className="lm-btn-outline-full" onClick={enterCreateMode}>Create First Package</button>
              </div>
            ) : (
              currentTypeLenses.map(lens => (
                <div
                  key={lens.id}
                  className={`lm-pkg-row-card ${selectedLens?.id === lens.id ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                >
                  <input
                    type="checkbox"
                    checked={selectedPackages.has(lens.id)}
                    onChange={(e) => { e.stopPropagation(); togglePackageSelection(lens.id); }}
                    style={{ cursor: 'pointer', marginTop: 8, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setSelectedLens(lens); setIsCreating(false); }}>
                    <div className="pkg-row-header">
                      <span className="pkg-row-name">{lens.package_name || lens.name}</span>
                      <div className="pkg-row-actions">
                        <div className="pkg-action-icons">
                          <ExternalLink size={14} />
                          <MessageSquare size={14} />
                          <Copy size={14} />
                          <Info size={14} />
                        </div>
                        <div
                          className={`lm-toggle-mini ${lens.is_active ? 'active' : ''}`}
                          onClick={(e) => handleStatusToggle(e, 'package', lens.id, lens.is_active)}
                        >
                          <div className="toggle-circle" />
                        </div>
                      </div>
                    </div>
                    <div className="pkg-row-tags">
                      {(lens.features || []).slice(0, 3).map(f => (
                        <span key={f} className="pkg-chip">{f}</span>
                      ))}
                    </div>
                    <div className="pkg-row-footer">
                      <span>- 6.00 to +4.00 | Index: {lens.index || '1.5'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ──── Right Column: Edit Form (273:15347) ──── */}
        <div className="lm-col-right">
          <div className="lm-col-header border-b">
            <h3>{selectedLens ? `Edit Package: ${editFormData.name}` : isCreating ? 'Create New Package' : 'Select a Package'}</h3>
          </div>

          {(selectedLens || isCreating) ? (
            <div className="lm-form-content">
              {/* Basic Info */}
              <div className="lm-form-section">
                <h4 className="lm-section-label">Basic Info</h4>
                <div className="lm-form-row">
                  <label>Package Name</label>
                  <input
                    className="lm-input-field"
                    value={editFormData.name || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditFormData(prev => ({ ...prev, name: val }));
                    }}
                  />
                </div>
                <div className="lm-form-row">
                  <label>Price (₹)</label>
                  <input
                    className="lm-input-field"
                    value={editFormData.price || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditFormData(prev => ({ ...prev, price: val }));
                    }}
                  />
                </div>
                <div className="lm-form-row align-top">
                  <label>Description</label>
                  <textarea
                    className="lm-textarea-field"
                    value={editFormData.description || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditFormData(prev => ({ ...prev, description: val }));
                    }}
                  />
                </div>
              </div>

              {/* Applicable Categories — above optical specs so it's prominent */}
              <div className="lm-form-section">
                <h4 className="lm-section-label">Applicable Frame Categories <span style={{ fontSize: 10, color: '#98A2B3', fontWeight: 400 }}>click to toggle</span></h4>
                {lensCategories.length === 0 ? (
                  <p style={{ fontSize: 11, color: '#98A2B3', margin: 0 }}>No categories available. Add them in Category Management → Frames tab.</p>
                ) : (
                  <div className="lm-chip-group">
                    {lensCategories.map(c => {
                      const selected = editFormData.categories.includes(c.id);
                      return (
                        <span
                          key={c.id}
                          onClick={() => {
                            const next = selected
                              ? editFormData.categories.filter(id => id !== c.id)
                              : [...editFormData.categories, c.id];
                            setEditFormData(prev => ({ ...prev, categories: next }));
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '6px 14px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                            background: selected ? '#7F56D9' : '#fff',
                            color: selected ? '#fff' : '#667085',
                            border: `1.5px solid ${selected ? '#7F56D9' : '#D0D5DD'}`,
                            transition: 'all 0.15s',
                            userSelect: 'none',
                          }}
                        >
                          {selected && <Check size={12} strokeWidth={3} />}
                          {c.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Brand */}
              <div className="lm-form-section">
                <h4 className="lm-section-label">Brand</h4>
                {lensBrands.length === 0 ? (
                  <p style={{ fontSize: 11, color: '#98A2B3', margin: 0 }}>
                    No lens brands yet. Go to <strong>Brand Management → Lenses for Frames</strong> tab to add one.
                  </p>
                ) : (
                  <div className="lm-select-box">
                    <select
                      value={String(editFormData.brand || '')}
                      onChange={e => setEditFormData(prev => ({ ...prev, brand: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      <option value="">— None —</option>
                      {lensBrands.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                )}
              </div>

              {/* Optical Specs */}
              <div className="lm-form-section">
                <h4 className="lm-section-label">Optical Specs</h4>
                <div className="lm-form-row">
                  <label>Lens Index</label>
                  <div className="lm-select-box">
                    <select
                      value={editFormData.index}
                      onChange={e => setEditFormData(prev => ({ ...prev, index: e.target.value }))}
                    >
                      <option value="1.5">1.5</option>
                      <option value="1.6">1.6</option>
                      <option value="1.67">1.67</option>
                      <option value="1.74">1.74</option>
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>
                <div className="lm-form-row">
                  <label>Min Power</label>
                  <div className="lm-input-group-row">
                    <input type="text" className="lm-power-input" value="-6.00" readOnly />
                    <input type="text" className="lm-power-input" value="+4.00" readOnly />
                  </div>
                </div>
                <div className="lm-form-row">
                  <label>Max Power</label>
                  <div className="lm-input-group-row">
                    <input type="text" className="lm-power-input" value="+4.00" readOnly />
                    <input type="text" className="lm-power-input" value="+6.00" readOnly />
                  </div>
                </div>
              </div>

              {/* Visibility / Type */}
              <div className="lm-form-section">
                <h4 className="lm-section-label">Lens Compatibility <span style={{ fontSize: 10, color: '#98A2B3', fontWeight: 400 }}>which frames can use this?</span></h4>
                <div className="lm-chip-group">
                  <span
                    className={`lm-form-chip ${editFormData.is_for_eyeglasses ? 'active' : ''}`}
                    onClick={() => setEditFormData(prev => ({ ...prev, is_for_eyeglasses: !prev.is_for_eyeglasses }))}
                  >
                    {editFormData.is_for_eyeglasses && <Check size={12} strokeWidth={3} />}
                    For Eyeglasses
                  </span>
                  <span
                    className={`lm-form-chip ${editFormData.is_for_sunglasses ? 'active' : ''}`}
                    onClick={() => setEditFormData(prev => ({ ...prev, is_for_sunglasses: !prev.is_for_sunglasses }))}
                  >
                    {editFormData.is_for_sunglasses && <Check size={12} strokeWidth={3} />}
                    For Sunglasses
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="lm-form-section">
                <h4 className="lm-section-label">Features</h4>
                <div className="lm-chip-group">
                  {['Blue Cut', 'Anti-Glare', 'UV Protection'].map(f => (
                    <span
                      key={f}
                      className={`lm-form-chip ${editFormData.features.includes(f) ? 'active' : ''}`}
                      onClick={() => {
                        const newFeatures = editFormData.features.includes(f)
                          ? editFormData.features.filter(feat => feat !== f)
                          : [...editFormData.features, f];
                        setEditFormData(prev => ({ ...prev, features: newFeatures }));
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Compatibility */}
              <div className="lm-form-section">
                <h4 className="lm-section-label">Compatibility</h4>
                <div className="lm-chip-group">
                  {['Full Rim', 'Half Rim', 'Rimless'].map(c => (
                    <span
                      key={c}
                      className={`lm-form-chip ${editFormData.compatibility.includes(c) ? 'active' : ''}`}
                      onClick={() => {
                        const newCompat = editFormData.compatibility.includes(c)
                          ? editFormData.compatibility.filter(item => item !== c)
                          : [...editFormData.compatibility, c];
                        setEditFormData(prev => ({ ...prev, compatibility: newCompat }));
                      }}
                    >
                      {c === 'Full Rim' && <Check size={12} strokeWidth={3} />}
                      {c === 'Rimless' && <Info size={12} className="alert-icon" />}
                      {c}
                    </span>
                  ))}
                </div>
                {editFormData.compatibility.includes('Rimless') && (
                  <div className="lm-chip-note">
                    <Info size={14} className="alert-icon" />
                    <span>For Rimless frames, we recommend 1.6 or higher index for durability.</span>
                  </div>
                )}
              </div>

              {/* Pricing Mode */}
              <div className="lm-pricing-mode">
                <div
                  className={`lm-radio-group ${editFormData.pricing_mode !== 'base' ? 'active' : ''}`}
                  onClick={() => setEditFormData(prev => ({ ...prev, pricing_mode: 'package' }))}
                >
                  <div className="lm-radio-circle">
                    {editFormData.pricing_mode !== 'base' && <div className="lm-radio-dot" />}
                  </div>
                  <span>Pricing Mode</span>
                </div>
                <div
                  className={`lm-radio-group ${editFormData.pricing_mode === 'base' ? 'active' : ''}`}
                  onClick={() => setEditFormData(prev => ({ ...prev, pricing_mode: 'base' }))}
                >
                  <div className="lm-radio-circle">
                    {editFormData.pricing_mode === 'base' && <div className="lm-radio-dot" />}
                  </div>
                  <span>Base + Add-ons</span>
                </div>
              </div>

              <div className="lm-status-footer">
                <div className="status-row">
                  <span>Status</span>
                  <div
                    className={`lm-toggle-mini ${editFormData.is_active ? 'active' : ''}`}
                    onClick={() => setEditFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                  >
                    <div className="toggle-circle" />
                  </div>
                </div>
                <div className="lm-form-footer-btns">
                  <button className="lm-btn-text" onClick={() => { setSelectedLens(null); setIsCreating(false); }}>Cancel</button>
                  <button className="lm-btn-solid" onClick={selectedLens ? handleSave : handleCreate}>
                    {selectedLens ? 'Save Changes' : 'Create Package'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="lm-empty-right">
              <Settings size={64} className="empty-gear" />
              <p>Select a package from the middle column to edit its specifications.</p>
            </div>
          )}
        </div>
      </div>

      <FormModal
        isOpen={showAddType}
        onClose={() => setShowAddType(false)}
        onSubmit={handleAddType}
        title="Lens Type"
        fields={LENS_TYPE_FIELDS}
      />



      {error && (
        <div className="lm-toast-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>X</button>
        </div>
      )}
    </div>
  );
};

export default LensManagement;
