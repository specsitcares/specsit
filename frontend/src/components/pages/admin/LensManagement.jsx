import React, { useState, useEffect } from 'react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import {
  Plus, Search, Check, Info, AlertCircle,
  ExternalLink, MessageSquare, Copy,
  ChevronDown, Layers, Settings, Trash2
} from 'lucide-react';
import '../../../styles/lens_management.css';

const LENS_PACKAGE_PRESETS = [
  { package_name: 'Basic', price: 999, index: '1.5', features: ['Anti-Glare'], description: 'Standard protection' },
  { package_name: 'Premium', price: 1999, index: '1.6', features: ['Blue Cut', 'Anti-Glare'], description: 'Blue light protection' },
  { package_name: 'Ultra Thin', price: 2999, index: '1.67', features: ['Blue Cut', 'UV Protection'], description: 'High index clarity' },
];

const LENS_TYPE_FIELDS = [{ name: 'label', label: 'Type Name', required: true }];

const LENS_PACKAGE_FIELDS = [
  { name: 'package_name', label: 'Package Name', required: true, helpText: 'e.g. Silver, Gold, Platinum' },
  { name: 'price', label: 'Price (₹)', type: 'number', required: true },
  {
    name: 'index', label: 'Lens Index', type: 'select', options: [
      { label: '1.5 Standard', value: '1.5' },
      { label: '1.6 Mid Index', value: '1.6' },
      { label: '1.67 High Index', value: '1.67' }
    ]
  },
  { name: 'description', label: 'Description', type: 'textarea' }
];

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

  const [showAddType, setShowAddType] = useState(false);
  const [showAddPackage, setShowAddPackage] = useState(false);

  // Form states for the Right Column
  const [editFormData, setEditFormData] = useState({
    name: '',
    price: '',
    description: '',
    index: '',
    is_active: true,
    features: [],
    compatibility: [],
    pricing_mode: 'package'
  });

  const fetchData = async () => {
    try {
      // Fetch with filter to ensure we get the right group regardless of pagination
      const groupsRes = await apiClient.get('/core/metadata-groups/?name=Lens Type');
      const items = groupsRes.data.results || groupsRes.data;
      const lensGroup = Array.isArray(items) ? items.find(g => g.name === 'Lens Type') : (items.name === 'Lens Type' ? items : null);

      if (lensGroup) {
        setLensTypes(lensGroup.items || []);
        if (!selectedType && lensGroup.items?.length > 0) {
          setSelectedType(lensGroup.items[0]);
        }
      }

      // Fetch more lenses to account for pagination (e.g. page_size=100)
      const lensesRes = await apiClient.get('/catalog/lenses/?page_size=100');
      setLenses(lensesRes.data.results || lensesRes.data);
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
        // Flat fields for the enhanced Serializer
        package_name: editFormData.name,
        description: editFormData.description,
        features: editFormData.features
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

  const handlePresetSelect = (preset) => {
    // This will be called from inside the Modal UI
    // But since FormModal is generic, I'll pass a custom footer or handle it in the Submit
  };

  const handleAddPackage = async (formData) => {
    try {
      await apiClient.post('/catalog/lenses/', {
        type: selectedType?.id,
        price: formData.price,
        index: formData.index || '1.5',
        is_active: true,
        package_name: formData.package_name || formData.name,
        features: formData.features || [],
        description: formData.description || ''
      });
      setShowAddPackage(false);
      await fetchData();
    } catch (err) {
      console.error('Add package failed', err);
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
        pricing_mode: selectedLens.pricing_mode || 'package'
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
          <button className="lm-btn-solid" onClick={() => setShowAddType(true)}>Lens type</button>
          <button className="lm-btn-solid" onClick={() => setShowAddPackage(true)}>Package</button>        </div>
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
          <div className="lm-item-list">
            {filteredTypes.map(type => (
              <div
                key={type.id}
                className={`lm-type-card ${selectedType?.id === type.id ? 'active' : ''}`}
                onClick={() => setSelectedType(type)}
              >
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
            <button className="lm-add-link" onClick={() => setShowAddPackage(true)} disabled={!selectedType}>
              <Plus size={16} /> Add Package
            </button>
          </div>

          <div className="lm-package-list">
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
                  onClick={() => setSelectedLens(lens)}
                >
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
              ))
            )}
          </div>
        </div>

        {/* ──── Right Column: Edit Form (273:15347) ──── */}
        <div className="lm-col-right">
          <div className="lm-col-header border-b">
            <h3>{selectedLens ? `Edit Package: ${editFormData.name}` : 'Select a Package'}</h3>
          </div>

          {selectedLens ? (
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
                  <button className="lm-btn-text" onClick={() => setSelectedLens(null)}>Cancel</button>
                  <button className="lm-btn-solid" onClick={handleSave}>Save Changes</button>
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

      <FormModal
        isOpen={showAddPackage}
        onClose={() => setShowAddPackage(false)}
        onSubmit={handleAddPackage}
        title="Lens Package"
        fields={LENS_PACKAGE_FIELDS}
      >
        <div className="lm-preset-strip">
          <p>Quick Add Presets:</p>
          <div className="preset-buttons">
            {LENS_PACKAGE_PRESETS.map(p => (
              <button
                key={p.package_name}
                type="button"
                className="lm-preset-btn"
                onClick={() => handleAddPackage(p)}
              >
                {p.package_name} (₹{p.price})
              </button>
            ))}
          </div>
        </div>
      </FormModal>

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
