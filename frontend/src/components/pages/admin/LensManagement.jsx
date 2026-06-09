import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import {
  Plus, Search, Check, Info, AlertCircle,
  ExternalLink, MessageSquare, Copy,
  ChevronDown, Layers, Settings, Trash2, Trash, Edit2, X
} from 'lucide-react';
import '../../../styles/lens_management.css';

const LENS_TYPE_FIELDS = [{ name: 'label', label: 'Type Name', required: true }];

/**
 * LensManagement — High-Fidelity implementation based on Figma (node 273:15080)
 */
const LensManagement = ({ editLensId = null }) => {
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
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState(new Set());
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectAllTypesChecked, setSelectAllTypesChecked] = useState(false);
  const [lensConstraints, setLensConstraints] = useState([]);
  const [lensIndices, setLensIndices] = useState([]);
  const [lensFeatures, setLensFeatures] = useState([]);
  const [showAddConstraint, setShowAddConstraint] = useState(false);
  const [newConstraintForm, setNewConstraintForm] = useState({ name: '', description: '' });
  const [newConstraintText, setNewConstraintText] = useState('');
  const [showAddIndex, setShowAddIndex] = useState(false);
  const [newIndexForm, setNewIndexForm] = useState({ value: '' });
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [newFeatureForm, setNewFeatureForm] = useState({ name: '' });
  const [expandedBrands, setExpandedBrands] = useState(new Set()); // Added for accordions

  const EMPTY_PACKAGE_FORM = {
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
    min_power: '-6.0',
    max_power: '+4.0',
  };

  const [editFormData, setEditFormData] = useState({ ...EMPTY_PACKAGE_FORM });
  const [newFeatureText, setNewFeatureText] = useState('');

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

  const navigate = useNavigate();

  const handleSelectLens = (lens) => {
    setSelectedLens(lens);
    setIsCreatingNewPackage(false);
    setIsEditingPackage(false);
    try { navigate(`/admin/products/edit/lens/${lens.id}`); } catch (e) { /* ignore */ }
  };

  // If opened via edit route with an ID, auto-select that lens after data loads
  useEffect(() => {
    if (loading) return;
    if (!editLensId) return;
    if (selectedLens) return; // already selected
    const byId = lenses.find(l => String(l.id) === String(editLensId));
    if (byId) {
      setSelectedLens(byId);
      // also set the type selection
      const typeObj = lensTypes.find(t => String(t.id) === String(byId.type));
      if (typeObj) setSelectedType(typeObj);
    }
  }, [loading, editLensId, lenses, lensTypes, selectedLens]);

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
          min_power: editFormData.min_power,
          max_power: editFormData.max_power,
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
          min_power: '-6.0',
          max_power: '+4.0',
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
          min_power: editFormData.min_power,
          max_power: editFormData.max_power,
        });
        alert('Package updated successfully');
      }
      await fetchData();
    } catch (err) {
      console.error('Save failed', err);
      setError('Failed to save changes.');
    }
  };


  const handleClosePackageForm = () => {
    setIsCreatingNewPackage(false);
    setEditFormData({ ...EMPTY_PACKAGE_FORM });
    setNewFeatureText('');
    setNewConstraintText('');
    setNewConstraintForm({ name: '', description: '' });
  };

  const handlePackageFieldChange = (name, value) => {
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleConstraintSelection = (constraintId) => {
    setEditFormData(prev => {
      const current = Array.isArray(prev.constraints)
        ? prev.constraints.map(c => (typeof c === 'object' ? c.id : c))
        : [];
      const next = current.includes(constraintId)
        ? current.filter(id => id !== constraintId)
        : [...current, constraintId];
      return { ...prev, constraints: next };
    });
  };

  const addFeatureToForm = () => {
    const trimmed = newFeatureText.trim();
    if (!trimmed) return;
    setEditFormData(prev => ({ ...prev, features: [...prev.features, trimmed] }));
    setNewFeatureText('');
  };

  const addConstraintToForm = async () => {
    const trimmed = newConstraintText.trim();
    if (!trimmed) return;

    const existing = lensConstraints.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setEditFormData(prev => {
        const current = Array.isArray(prev.constraints)
          ? prev.constraints.map(c => (typeof c === 'object' ? c.id : c))
          : [];
        if (current.includes(existing.id)) return prev;
        return { ...prev, constraints: [...prev.constraints, existing.id] };
      });
      setNewConstraintText('');
      return;
    }

    try {
      const response = await apiClient.post('/catalog/lens-constraints/', {
        name: trimmed,
        description: '',
      });
      const newConstraint = response.data;
      setLensConstraints(prev => [...prev, newConstraint]);
      setEditFormData(prev => ({ ...prev, constraints: [...prev.constraints, newConstraint.id] }));
      setNewConstraintText('');
    } catch (err) {
      console.error('Add constraint failed', err);
      alert('Failed to add constraint. Please try again.');
    }
  };

  const removeFeatureFromForm = (index) => {
    setEditFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
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
        min_power: selectedLens.min_power !== undefined && selectedLens.min_power !== null ? selectedLens.min_power : '-6.0',
        max_power: selectedLens.max_power !== undefined && selectedLens.max_power !== null ? selectedLens.max_power : '+4.0',
      });
    }
  }, [selectedLens]);

  const filteredTypes = lensTypes.filter(t =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentTypeLenses = lenses.filter(l =>
    selectedType && String(l.type) === String(selectedType.id)
  );

  const lensesByBrand = React.useMemo(() => {
    const groups = {};
    currentTypeLenses.forEach(lens => {
      const brandId = lens.brand || 'unbranded';
      if (!groups[brandId]) {
        let brandObj = lensBrands.find(b => String(b.id) === String(brandId));
        if (!brandObj) {
            brandObj = { id: 'unbranded', name: 'Other Lenses', logo: null };
            if (lens.brand_name) {
                brandObj.name = lens.brand_name;
                brandObj.logo = lens.brand_logo;
            }
        }
        groups[brandId] = { brand: brandObj, lenses: [] };
      }
      groups[brandId].lenses.push(lens);
    });
    return Object.values(groups).sort((a, b) => {
        if (a.brand.id === 'unbranded') return 1;
        if (b.brand.id === 'unbranded') return -1;
        return a.brand.name.localeCompare(b.brand.name);
    });
  }, [currentTypeLenses, lensBrands]);

  const toggleBrandExpand = (brandId) => {
    setExpandedBrands(prev => {
      const next = new Set(prev);
      if (next.has(brandId)) next.delete(brandId);
      else next.add(brandId);
      return next;
    });
  };

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
            setEditFormData({ ...EMPTY_PACKAGE_FORM });
            try { navigate('/admin/products/new/lens'); } catch (e) { }
          }}>+ Package</button>
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
          <div className="lm-mid-header-row">
            <div className="lm-mid-header-left">
              <span className="lm-mid-header-label">Packages for</span>
              <button className="lm-type-dropdown-btn">
                {selectedType?.label || 'Select Type'}
                <ChevronDown size={18} color="#64748B" />
              </button>
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
              <button className="lm-add-pkg-btn" onClick={() => {
                setIsCreatingNewPackage(true);
                setEditFormData({ ...EMPTY_PACKAGE_FORM });
              }} disabled={!selectedType}>
                <Plus size={16} /> Add Package
              </button>
            </div>
          </div>
          
          {selectedPackages.size > 0 && (
            <div style={{
              display: 'flex', gap: 8, padding: '0 20px 16px', flexWrap: 'wrap'
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
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 12, fontWeight: 600, paddingBottom: 8
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
              lensesByBrand.map(group => {
                const isExpanded = expandedBrands.has(group.brand.id);
                return (
                  <div key={group.brand.id} className="lm-brand-section">
                    <div className="lm-brand-header" onClick={() => toggleBrandExpand(group.brand.id)}>
                      <div className="lm-brand-info">
                        <div className="lm-brand-badge">{group.lenses.length}</div>
                        <div className="lm-brand-logo-wrap">
                          {group.brand.logo ? (
                            <img src={group.brand.logo} alt={group.brand.name} className="lm-brand-logo" />
                          ) : (
                            <div className="lm-brand-initials">{group.brand.name.substring(0, 2).toUpperCase()}</div>
                          )}
                          <span className="lm-brand-name">{group.brand.name}</span>
                        </div>
                      </div>
                      <ChevronDown size={20} className={`lm-brand-caret ${isExpanded ? '' : 'collapsed'}`} />
                    </div>
                    {isExpanded && (
                      <div className="lm-brand-packages">
                        {group.lenses.map((lens, i) => (
                          <React.Fragment key={lens.id}>
                            <div
                              className={`lm-pkg-card ${selectedLens?.id === lens.id ? 'active' : ''}`}
                              onClick={() => handleSelectLens(lens)}
                            >
                              <div className="lm-pkg-card-header">
                                <span className="lm-pkg-card-name">{lens.package_name || lens.name}</span>
                              </div>
                              <div className="lm-pkg-card-features">
                                {(lens.features || []).slice(0, 3).map((feat, idx) => (
                                  <span key={idx} className="lm-pkg-feature-tag">{feat}</span>
                                ))}
                                {(lens.features || []).length > 3 && (
                                  <span className="lm-pkg-feature-tag">+{lens.features.length - 3}</span>
                                )}
                              </div>
                              <div className="lm-pkg-card-footer">
                                <span className="lm-pkg-power-text">
                                  {Number(lens.min_power || -6.0).toFixed(2)} to +{Number(lens.max_power || 4.0).toFixed(2)} • Index: {lens.index || '1.5'}
                                </span>
                                <div className="lm-pkg-brand-mark">
                                  {group.brand.logo && (
                                    <img src={group.brand.logo} alt="brand" className="lm-pkg-brand-mark-logo" />
                                  )}
                                  <span className="lm-pkg-brand-mark-name">{group.brand.name}</span>
                                </div>
                              </div>
                            </div>
                            {i < group.lenses.length - 1 && <hr className="lm-brand-separator" />}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      <FormModal
        isOpen={showAddType}
        onClose={() => setShowAddType(false)}
        onSubmit={handleAddType}
        title="Lens Type"
        fields={LENS_TYPE_FIELDS}
      />

      {isCreatingNewPackage && (
        <div className="lm-offcanvas-backdrop" onClick={handleClosePackageForm}>
          <div className="lm-offcanvas-panel" onClick={e => e.stopPropagation()}>
            <div className="lm-offcanvas-header">
              <div>
                <h2 className="lm-offcanvas-title">Create Package</h2>
                <p className="lm-offcanvas-subtitle">Use the existing package fields to add a new lens package.</p>
              </div>
              <button className="lm-offcanvas-close" onClick={handleClosePackageForm}><X size={20} /></button>
            </div>

            <div className="lm-offcanvas-body">
              <section className="lm-offcanvas-section">
                <div className="lm-offcanvas-section-title">Package details</div>
                <div className="lm-form-group">
                  <label className="lm-form-label">Package Name</label>
                  <input
                    className="lm-form-input"
                    value={editFormData.name}
                    onChange={e => handlePackageFieldChange('name', e.target.value)}
                    placeholder="Enter package name"
                  />
                </div>
                <div className="lm-form-group">
                  <label className="lm-form-label">Description</label>
                  <textarea
                    className="lm-form-input"
                    rows={4}
                    value={editFormData.description}
                    onChange={e => handlePackageFieldChange('description', e.target.value)}
                    placeholder="Add a short description"
                  />
                </div>
              </section>

              <section className="lm-offcanvas-section">
                <div className="lm-offcanvas-section-title">Pricing & power</div>
                <div className="lm-form-row">
                  <div className="lm-form-group">
                    <label className="lm-form-label">Selling Price</label>
                    <input
                      type="number"
                      className="lm-form-input"
                      value={editFormData.selling_price}
                      onChange={e => handlePackageFieldChange('selling_price', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="lm-form-group">
                    <label className="lm-form-label">Cost Price</label>
                    <input
                      type="number"
                      className="lm-form-input"
                      value={editFormData.cost_price}
                      onChange={e => handlePackageFieldChange('cost_price', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="lm-form-row">
                  <div className="lm-form-group">
                    <label className="lm-form-label">Lens Index</label>
                    <select
                      className="lm-form-input"
                      value={editFormData.index}
                      onChange={e => handlePackageFieldChange('index', e.target.value)}
                    >
                      {lensIndices.map(value => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="lm-form-group">
                    <label className="lm-form-label">Warranty (months)</label>
                    <input
                      type="number"
                      className="lm-form-input"
                      value={editFormData.warranty_months}
                      onChange={e => handlePackageFieldChange('warranty_months', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="lm-form-row">
                  <div className="lm-form-group">
                    <label className="lm-form-label">Min Power</label>
                    <input
                      className="lm-form-input"
                      value={editFormData.min_power}
                      onChange={e => handlePackageFieldChange('min_power', e.target.value)}
                      placeholder="-6.00"
                    />
                  </div>
                  <div className="lm-form-group">
                    <label className="lm-form-label">Max Power</label>
                    <input
                      className="lm-form-input"
                      value={editFormData.max_power}
                      onChange={e => handlePackageFieldChange('max_power', e.target.value)}
                      placeholder="+4.00"
                    />
                  </div>
                </div>
              </section>

              <section className="lm-offcanvas-section">
                <div className="lm-offcanvas-section-title">Brand & categories</div>
                <div className="lm-form-group">
                  <label className="lm-form-label">Brand</label>
                  <select
                    className="lm-form-input"
                    value={editFormData.brand}
                    onChange={e => handlePackageFieldChange('brand', e.target.value)}
                  >
                    <option value="">Select brand</option>
                    {lensBrands.map(brand => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                </div>
                <div className="lm-form-group">
                  <label className="lm-form-label">Categories</label>
                  <div className="lm-chip-list">
                    {lensCategories.map(category => {
                      const selected = editFormData.categories.includes(category.id);
                      return (
                        <button
                          type="button"
                          key={category.id}
                          className={`lm-chip ${selected ? 'selected' : ''}`}
                          onClick={() => {
                            const next = editFormData.categories.includes(category.id)
                              ? editFormData.categories.filter(id => id !== category.id)
                              : [...editFormData.categories, category.id];
                            handlePackageFieldChange('categories', next);
                          }}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="lm-offcanvas-section">
                <div className="lm-offcanvas-section-title">Features</div>
                <div className="lm-chip-list">
                  {editFormData.features.map((feature, index) => (
                    <span key={index} className="lm-chip">
                      {feature}
                      <button type="button" onClick={() => removeFeatureFromForm(index)}>×</button>
                    </span>
                  ))}
                </div>
                <div className="lm-form-row">
                  <input
                    className="lm-form-input"
                    value={newFeatureText}
                    onChange={e => setNewFeatureText(e.target.value)}
                    placeholder="Enter a feature"
                  />
                  <button type="button" className="lm-add-more-btn" onClick={addFeatureToForm}>
                    + Add feature
                  </button>
                </div>
              </section>

              <section className="lm-offcanvas-section">
                <div className="lm-offcanvas-section-title">Constraints</div>
                <div className="lm-chip-list">
                  {lensConstraints.map(constraint => {
                    const selected = editFormData.constraints.map(c => (typeof c === 'object' ? c.id : c)).includes(constraint.id);
                    return (
                      <button
                        type="button"
                        key={constraint.id}
                        className={`lm-chip ${selected ? 'selected' : ''}`}
                        onClick={() => toggleConstraintSelection(constraint.id)}
                      >
                        {constraint.name}
                      </button>
                    );
                  })}
                </div>
                <div className="lm-form-row">
                  <input
                    className="lm-form-input"
                    value={newConstraintText}
                    onChange={e => setNewConstraintText(e.target.value)}
                    placeholder="Add new constraint"
                  />
                  <button type="button" className="lm-add-more-btn" onClick={addConstraintToForm}>
                    + Add constraint
                  </button>
                </div>
              </section>
            </div>

            <div className="lm-offcanvas-footer">
              <button type="button" className="lm-offcanvas-cancel" onClick={handleClosePackageForm}>Cancel</button>
              <button type="button" className="lm-offcanvas-submit" onClick={handleSave}>Create package</button>
            </div>
          </div>
        </div>
      )}

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

