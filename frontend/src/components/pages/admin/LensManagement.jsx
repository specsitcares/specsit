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
  const [isCreatingNewPackage, setIsCreatingNewPackage] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState(new Set());
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectAllTypesChecked, setSelectAllTypesChecked] = useState(false);
  const [lensConstraints, setLensConstraints] = useState([]);
  const [lensIndices, setLensIndices] = useState([]);
  const [lensFeatures, setLensFeatures] = useState([]);
  const [showAddConstraint, setShowAddConstraint] = useState(false);
  const [newConstraintForm, setNewConstraintForm] = useState({ name: '', description: '' });
  const [showAddIndex, setShowAddIndex] = useState(false);
  const [newIndexForm, setNewIndexForm] = useState({ value: '' });
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [newFeatureForm, setNewFeatureForm] = useState({ name: '' });

  // Form states for the Right Column
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    index: '1.5',
    is_active: true,
    features: [],
    constraints: [],  // Changed from single constraint to array of constraints
    pricing_mode: 'package',
    brand: '',
    categories: [],
    cost_price: 0,
    selling_price: '',
    warranty_months: 0,
  });

  const fetchData = async () => {
    try {
      const [groupsRes, lensesRes, brandsRes, catsRes, constraintsRes, indicesRes, featuresRes] = await Promise.all([
        apiClient.get('/core/metadata-groups/?name=Lens Type'),
        apiClient.get('/catalog/lenses/?page_size=100'),
        apiClient.get('/catalog/brands/?brand_type=Lens'),
        apiClient.get('/catalog/categories/?category_type=Frame'),
        apiClient.get('/catalog/lens-constraints/'),
        apiClient.get('/core/metadata-groups/?name=Lens Index'),
        apiClient.get('/core/metadata-groups/?name=Lens Features'),
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
      
      // Fetch constraints and indices
      const constraintsList = constraintsRes.data.results || constraintsRes.data || [];
      setLensConstraints(constraintsList);
      
      const indicesGroup = indicesRes.data.results || indicesRes.data;
      if (indicesGroup && indicesGroup.length > 0 && indicesGroup[0].items) {
        setLensIndices(indicesGroup[0].items.map(i => i.value));
      } else if (indicesGroup && indicesGroup.items) {
        setLensIndices(indicesGroup.items.map(i => i.value));
      } else {
        setLensIndices(['1.5', '1.6', '1.67', '1.74']);
      }

      // Fetch features
      const featuresGroup = featuresRes.data.results || featuresRes.data;
      if (featuresGroup && featuresGroup.length > 0 && featuresGroup[0].items) {
        setLensFeatures(featuresGroup[0].items.map(f => f.label));
      } else if (featuresGroup && featuresGroup.items) {
        setLensFeatures(featuresGroup.items.map(f => f.label));
      } else {
        setLensFeatures([]);
      }
      
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
    if (!editFormData.name.trim() || !editFormData.selling_price) {
      alert('Package Name and Selling Price are required');
      return;
    }
    if (editFormData.constraints.length === 0) {
      alert('Please select at least one Lens Constraint');
      return;
    }

    try {
      if (isCreatingNewPackage) {
        // Create new package
        await apiClient.post('/catalog/lenses/', {
          type: selectedType?.id,
          price: editFormData.selling_price,
          index: editFormData.index || '1.5',
          is_active: true,
          package_name: editFormData.name,
          features: editFormData.features || [],
          description: editFormData.description || '',
          brand: editFormData.brand ? Number(editFormData.brand) : null,
          category_ids: editFormData.categories,
          package_cost_price: editFormData.cost_price,
          package_selling_price: editFormData.selling_price,
          package_warranty_months: editFormData.warranty_months,
          constraint_ids: editFormData.constraints.map(c => c.id || c),  // Extract IDs from constraint objects
        });
        setIsCreatingNewPackage(false);
        setEditFormData({
          name: '',
          description: '',
          index: '1.5',
          is_active: true,
          features: [],
          constraints: [],
          pricing_mode: 'package',
          brand: '',
          categories: [],
          cost_price: 0,
          selling_price: '',
          warranty_months: 0,
        });
        alert('Package created successfully');
      } else {
        // Edit existing package
        await apiClient.put(`/catalog/lenses/${selectedLens.id}/`, {
          ...selectedLens,
          price: editFormData.selling_price,
          index: editFormData.index,
          is_active: editFormData.is_active,
          package_name: editFormData.name,
          description: editFormData.description,
          features: editFormData.features,
          brand: editFormData.brand ? Number(editFormData.brand) : null,
          category_ids: editFormData.categories,
          package_cost_price: editFormData.cost_price,
          package_selling_price: editFormData.selling_price,
          package_warranty_months: editFormData.warranty_months,
          constraint_ids: editFormData.constraints.map(c => c.id || c),  // Extract IDs from constraint objects
        });
        alert('Package updated successfully');
      }
      await fetchData();
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

  const handleCreateConstraint = async () => {
    if (!newConstraintForm.name.trim()) {
      alert('Please enter a constraint name (e.g., Rimless, Full Rim)');
      return;
    }
    try {
      await apiClient.post('/catalog/lens-constraints/', {
        name: newConstraintForm.name,
        description: newConstraintForm.description,
      });
      setShowAddConstraint(false);
      setNewConstraintForm({ name: '', description: '' });
      await fetchData();
      alert('Constraint created successfully');
    } catch (err) {
      console.error('Create constraint failed', err);
      alert('Error creating constraint. Please try again.');
    }
  };

  const handleCreateIndex = async () => {
    if (!newIndexForm.value.trim()) {
      alert('Please enter a lens index value');
      return;
    }
    try {
      // 1. Find the Lens Index group
      let groupsRes = await apiClient.get('/core/metadata-groups/?name=Lens Index');
      let items = groupsRes.data.results || groupsRes.data;
      let indexGroup = Array.isArray(items) ? items.find(g => g.name?.toLowerCase() === 'lens index') : (items.name?.toLowerCase() === 'lens index' ? items : null);

      // 2. Self-Healing: If group doesn't exist, create it
      if (!indexGroup) {
        const createGroupRes = await apiClient.post('/core/metadata-groups/', { name: 'Lens Index' });
        indexGroup = createGroupRes.data;
      }

      // 3. Add the Lens Index (MetadataItem)
      await apiClient.post('/core/metadata-items/', {
        group: indexGroup.id,
        label: newIndexForm.value,
        value: newIndexForm.value,
        is_active: true
      });
      setShowAddIndex(false);
      setNewIndexForm({ value: '' });
      await fetchData();
      alert(`Lens Index ${newIndexForm.value} created successfully`);
    } catch (err) {
      console.error('Create index failed', err);
      alert('Error creating lens index. Please try again.');
    }
  };

  const handleCreateFeature = async () => {
    if (!newFeatureForm.name.trim()) {
      alert('Please enter a feature name (e.g., Blue Cut, Anti-Glare)');
      return;
    }
    try {
      // 1. Find the Lens Features group
      let groupsRes = await apiClient.get('/core/metadata-groups/?name=Lens Features');
      let items = groupsRes.data.results || groupsRes.data;
      let featureGroup = Array.isArray(items) ? items.find(g => g.name?.toLowerCase() === 'lens features') : (items.name?.toLowerCase() === 'lens features' ? items : null);

      // 2. Self-Healing: If group doesn't exist, create it
      if (!featureGroup) {
        const createGroupRes = await apiClient.post('/core/metadata-groups/', { name: 'Lens Features' });
        featureGroup = createGroupRes.data;
      }

      // 3. Add the Feature (MetadataItem)
      await apiClient.post('/core/metadata-items/', {
        group: featureGroup.id,
        label: newFeatureForm.name,
        value: newFeatureForm.name.toLowerCase().replace(/\s+/g, '_'),
        is_active: true
      });
      setShowAddFeature(false);
      setNewFeatureForm({ name: '' });
      await fetchData();
      alert(`Feature ${newFeatureForm.name} created successfully`);
    } catch (err) {
      console.error('Create feature failed', err);
      alert('Error creating feature. Please try again.');
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
        description: selectedLens.description || '',
        index: selectedLens.index || '1.5',
        is_active: selectedLens.is_active,
        features: selectedLens.features || [],
        constraints: selectedLens.constraints || [],  // Changed from constraint to constraints (array)
        pricing_mode: selectedLens.pricing_mode || 'package',
        brand: selectedLens.brand || '',
        categories: (selectedLens.categories || []).map(c => typeof c === 'object' ? c.id : c),
        cost_price: selectedLens.package_cost_price || 0,
        selling_price: selectedLens.package_selling_price || selectedLens.price || '',
        warranty_months: selectedLens.package_warranty_months || 0,
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
          <button className="lm-btn-solid" onClick={() => setShowAddIndex(true)}>+ Lens Index <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>({lensIndices.length})</span></button>
          <button className="lm-btn-solid" onClick={() => {
            if (!selectedType) {
              alert('Please select a lens type first');
              return;
            }
            setIsCreatingNewPackage(true);
            setEditFormData({
              name: '',
              description: '',
              index: '1.5',
              is_active: true,
              features: [],
              constraints: [],
              pricing_mode: 'package',
              brand: '',
              categories: [],
              cost_price: 0,
              selling_price: '',
              warranty_months: 0,
            });
          }}>+ Package <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>(on right panel)</span></button>
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
              <button className="lm-add-link" onClick={() => {
                setIsCreatingNewPackage(true);
                setEditFormData({
                  name: '',
                  price: '',
                  description: '',
                  index: '1.5',
                  is_active: true,
                  features: [],
                  constraints: [],
                  pricing_mode: 'package',
                  brand: '',
                  categories: [],
                  cost_price: 0,
                  selling_price: '',
                  warranty_months: 0,
                  is_for_eyeglasses: true,
                  is_for_sunglasses: false,
                });
              }} disabled={!selectedType}>
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
                <button className="lm-btn-outline-full">Create First Package</button>
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
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedLens(lens)}>
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
                    <div className="pkg-row-footer">
                      <span style={{ display: 'block' }}>
                        Cost: ₹{lens.package_cost_price ? Number(lens.package_cost_price).toLocaleString('en-IN') : '0'}
                        &nbsp;•&nbsp;Sell: ₹{(lens.package_selling_price || lens.price) ? Number(lens.package_selling_price || lens.price).toLocaleString('en-IN') : '0'}
                      </span>
                      <span style={{ display: 'block', marginTop: 6 }}>
                        Categories: {
                          lens.categories && lens.categories.length > 0
                            ? lens.categories.map(cat => {
                              if (typeof cat === 'object' && cat.id) {
                                return cat.name;
                              } else {
                                const found = lensCategories.find(c => c.id === cat);
                                return found ? found.name : cat;
                              }
                            }).join(', ')
                            : 'No categories'
                        }
                      </span>
                      <span style={{ display: 'block', marginTop: 6 }}>
                        Features: {
                          lens.features && lens.features.length > 0
                            ? lens.features.join(', ')
                            : 'No features'
                        }
                      </span>
                      <span style={{ display: 'block', marginTop: 6 }}>
                        Index: {lens.index || '1.5'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ──── Right Column: Edit/Create Form (273:15347) ──── */}
        <div className="lm-col-right">
          <div className="lm-col-header border-b">
            <h3>{isCreatingNewPackage ? 'Create New Package' : selectedLens ? `Edit Package: ${editFormData.name}` : 'Select a Package'}</h3>
          </div>

          {isCreatingNewPackage || selectedLens ? (
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
                  <label>Cost Price (₹)</label>
                  <input
                    className="lm-input-field"
                    type="number"
                    value={editFormData.cost_price || 0}
                    onChange={e => {
                      const val = e.target.value;
                      setEditFormData(prev => ({ ...prev, cost_price: val }));
                    }}
                    placeholder="e.g. 800"
                  />
                </div>
                <div className="lm-form-row">
                  <label>Selling Price (₹)</label>
                  <input
                    className="lm-input-field"
                    type="number"
                    value={editFormData.selling_price || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditFormData(prev => ({ ...prev, selling_price: val }));
                    }}
                    placeholder="e.g. 1299"
                  />
                </div>
                <div className="lm-form-row">
                  <label>Warranty (months)</label>
                  <input
                    className="lm-input-field"
                    type="number"
                    value={editFormData.warranty_months || 0}
                    onChange={e => {
                      const val = e.target.value;
                      setEditFormData(prev => ({ ...prev, warranty_months: val }));
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
                      value={editFormData.index || '1.5'}
                      onChange={e => setEditFormData(prev => ({ ...prev, index: e.target.value }))}
                    >
                      <option value="1.5">1.5</option>
                      <option value="1.56">1.56</option>
                      <option value="1.59">1.59</option>
                      <option value="1.6">1.6</option>
                      <option value="1.67">1.67</option>
                      <option value="1.74">1.74</option>
                      <option value="1.8">1.8</option>
                      <option value="1.9">1.9</option>
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

              {/* Features */}
              <div className="lm-form-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 className="lm-section-label" style={{ margin: 0 }}>Features</h4>
                  <button
                    className="lm-btn-text"
                    onClick={() => setShowAddFeature(!showAddFeature)}
                    style={{ fontSize: 12 }}
                  >
                    <Plus size={14} /> New
                  </button>
                </div>
                <div className="lm-chip-group">
                  {lensFeatures.length > 0 ? (
                    lensFeatures.map(f => (
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
                    ))
                  ) : (
                    <p style={{ fontSize: 11, color: '#98A2B3', margin: 0 }}>No features available. Create one using the "+ New" button.</p>
                  )}
                </div>

                {showAddFeature && (
                  <div style={{ background: '#FFFBEB', padding: 12, borderRadius: 6, marginTop: 12 }}>
                    <div className="lm-form-row">
                      <label>Feature Name</label>
                      <input
                        className="lm-input-field"
                        placeholder="e.g. Blue Cut, Anti-Glare, UV Protection"
                        value={newFeatureForm.name}
                        onChange={e => setNewFeatureForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="lm-btn-solid" onClick={handleCreateFeature} style={{ fontSize: 12 }}>
                        Create Feature
                      </button>
                      <button className="lm-btn-text" onClick={() => setShowAddFeature(false)} style={{ fontSize: 12 }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lens Constraint (Multiple Selection) */}
              <div className="lm-form-section">
                <div className="lm-form-row">
                  <label>Lens Constraints (Select one or more)</label>
                  <button
                    className="lm-btn-text"
                    onClick={() => setShowAddConstraint(!showAddConstraint)}
                    style={{ whiteSpace: 'nowrap', fontSize: 12, marginLeft: 'auto' }}
                  >
                    <Plus size={14} /> New Constraint
                  </button>
                </div>

                {/* Multi-select Checkboxes */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '10px 12px',
                  background: '#F9FAFB',
                  borderRadius: 6,
                  border: '1px solid #E5E7EB'
                }}>
                  {lensConstraints.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>No constraints available. Create one below.</div>
                  ) : (
                    lensConstraints.map(constraint => (
                      <label key={constraint.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                        <input
                          type="checkbox"
                          checked={(editFormData.constraints || []).some(c => c.id === constraint.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              // Add constraint
                              setEditFormData(prev => ({
                                ...prev,
                                constraints: [...(prev.constraints || []), constraint]
                              }));
                            } else {
                              // Remove constraint
                              setEditFormData(prev => ({
                                ...prev,
                                constraints: (prev.constraints || []).filter(c => c.id !== constraint.id)
                              }));
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{constraint.name}</span>
                        {constraint.description && (
                          <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 'auto' }}>
                            {constraint.description}
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>

                {/* Selected Constraints Summary */}
                {(editFormData.constraints || []).length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginTop: 8
                  }}>
                    {(editFormData.constraints || []).map(c => (
                      <div
                        key={c.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 8px',
                          background: '#EDE9FE',
                          border: '1px solid #DDD6FE',
                          borderRadius: 4,
                          fontSize: 12
                        }}
                      >
                        <span>{c.name}</span>
                        <button
                          onClick={() => {
                            setEditFormData(prev => ({
                              ...prev,
                              constraints: (prev.constraints || []).filter(x => x.id !== c.id)
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            color: '#7C3AED'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create New Constraint Form (Inline) */}
              {showAddConstraint && (
                <div className="lm-form-section" style={{ background: '#FFFBEB', padding: 12, borderRadius: 6 }}>
                  <h4 className="lm-section-label">Create New Constraint</h4>
                  <div className="lm-form-row">
                    <label>Constraint Name</label>
                    <input
                      className="lm-input-field"
                      placeholder="e.g. Rimless, Full Rim, Half Rim"
                      value={newConstraintForm.name}
                      onChange={e => setNewConstraintForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="lm-form-row">
                    <label>Description (Optional)</label>
                    <textarea
                      className="lm-textarea-field"
                      placeholder="e.g. For rimless frames"
                      value={newConstraintForm.description}
                      onChange={e => setNewConstraintForm(prev => ({ ...prev, description: e.target.value }))}
                      style={{ minHeight: 60 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="lm-btn-solid" onClick={handleCreateConstraint} style={{ fontSize: 12 }}>
                      Create Constraint
                    </button>
                    <button className="lm-btn-text" onClick={() => setShowAddConstraint(false)} style={{ fontSize: 12 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

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
                  <button className="lm-btn-text" onClick={() => {
                    if (isCreatingNewPackage) {
                      setIsCreatingNewPackage(false);
                      setEditFormData({
                        name: '',
                        price: '',
                        description: '',
                        index: '1.5',
                        is_active: true,
                        features: [],
                        constraints: [],
                        pricing_mode: 'package',
                        brand: '',
                        categories: [],
                        cost_price: 0,
                        selling_price: '',
                        warranty_months: 0,
                        is_for_eyeglasses: true,
                        is_for_sunglasses: false,
                      });
                    } else {
                      setSelectedLens(null);
                    }
                  }}>Cancel</button>
                  <button className="lm-btn-solid" onClick={handleSave}>
                    {isCreatingNewPackage ? 'Create Package' : 'Save Changes'}
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
