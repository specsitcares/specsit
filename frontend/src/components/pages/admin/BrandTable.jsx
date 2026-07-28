import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Tag, MoreVertical, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const BRAND_TABS = [
  { key: 'Frame',    label: 'Frames' },
  { key: 'Lens',     label: 'Lenses for Frames' },
  { key: 'Contact',  label: 'Contact Lenses' },
  { key: 'Cases',    label: 'Cases' },
  { key: 'Cloths',   label: 'Cloths' },
  { key: 'Solutions', label: 'Cleaning Solutions' },
];

const BRAND_TYPE_OPTIONS = [
  { value: 'Frame',    label: 'Frame' },
  { value: 'Lens',     label: 'Lenses for Frames' },
  { value: 'Contact',  label: 'Contact Lenses' },
  { value: 'Cases',    label: 'Cases' },
  { value: 'Cloths',   label: 'Cloths' },
  { value: 'Solutions', label: 'Cleaning Solutions' },
];

const BrandTable = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Frame');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { fetchBrands(); }, []);

  const fetchBrands = async () => {
    try {
      const res = await apiClient.get('/catalog/brands/');
      const data = res.data;
      setBrands(Array.isArray(data) ? data : (data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} brand(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.delete(`/catalog/brands/${id}/`).catch(() => {})));
    setSelectedIds(new Set());
    fetchBrands();
  };

  const bulkActions = [
    { label: 'Delete Selected', variant: 'danger', icon: Trash2, onClick: bulkDelete },
  ];

  const handleCreateClick = () => { setFormMode('create'); setSelectedBrand({ brand_type: activeTab }); setShowForm(true); };
  const handleEditClick   = (b) => { setFormMode('edit');   setSelectedBrand(b);    setShowForm(true); };
  const handleDeleteClick = (b) => { setFormMode('edit');   setSelectedBrand(b);    setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    const data = new FormData();
    Object.keys(formData).forEach(k => {
      if (formData[k] != null) {
        if (k === 'logo' && typeof formData[k] === 'string') return;
        data.append(k, formData[k]);
      }
    });
    // Let errors propagate to FormModal (which shows them) and let the modal
    // close itself only on a real success — keeps the table in sync with the DB.
    if (formMode === 'create') await apiClient.post('/catalog/brands/', data);
    else await apiClient.patch(`/catalog/brands/${selectedBrand.id}/`, data);
    await fetchBrands();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/catalog/brands/${id}/`);
    await fetchBrands();
  };

  const filtered = brands
    .filter(b => (b.brand_type || 'Frame') === activeTab)
    .filter(b => (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const columns = [
    { label: 'Brand', key: 'brand', sortable: true },
    { label: 'Status', key: 'status', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  const renderRow = (b, idx, { isSelected, onToggle } = {}) => (
    <tr key={b.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isSelected ? '#F9F5FF' : '#fff' }}>
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" checked={!!isSelected} onChange={onToggle} style={{ cursor: 'pointer', borderRadius: '3px', accentColor: '#7F56D9' }} />
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, background: '#fff', border: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 4 }}>
            {b.logo ? <img src={b.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} /> : <Tag size={20} color="#D0D5DD" />}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#101828', fontSize: '11px' }}>{b.name}</div>
            <div style={{ fontSize: '10px', color: '#667085' }}>#ID: {b.id}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: b.is_published ? '#ECFDF3' : '#F2F4F7',
          color: b.is_published ? '#027A48' : '#344054',
          padding: '4px 10px',
          borderRadius: '13px',
          fontSize: '10px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${b.is_published ? '#ABEFC6' : '#D0D5DD'}`
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.is_published ? '#12B76A' : '#667085' }}></span>
          {b.is_published ? 'Published' : 'Unpublished'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => handleEditClick(b)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Edit Brand"
          >
            <Edit2 size={16} />
          </div>
          <div
            onClick={() => handleDeleteClick(b)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Delete Brand"
          >
            <Trash2 size={16} />
          </div>
        </div>
      </td>
    </tr>
  );

  const tabCounts = Object.fromEntries(BRAND_TABS.map(t => [t.key, brands.filter(b => (b.brand_type || 'Frame') === t.key).length]));

  return (
    <>
      {/* Tab strip */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {BRAND_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); setSearchQuery(''); }}
            style={{
              padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeTab === tab.key ? '#fff' : 'transparent',
              color: activeTab === tab.key ? '#7F56D9' : '#667085',
              boxShadow: activeTab === tab.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.label}
            <span style={{ background: activeTab === tab.key ? '#F4EBFF' : '#F2F4F7', color: activeTab === tab.key ? '#7F56D9' : '#667085', borderRadius: 10, padding: '1px 7px', fontSize: 10 }}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      <BaseAdminTable
        title="Brand Management"
        count={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleCreateClick}
        addLabel="Add Brand"
        columns={columns}
        data={paginated}
        loading={loading}
        renderRow={renderRow}
        selectedIds={selectedIds}
        onSelectIds={setSelectedIds}
        bulkActions={bulkActions}
        pagination={{
          page,
          perPage,
          totalCount: filtered.length,
          onPageChange: setPage,
          onPerPageChange: setPerPage
        }}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filterContent={
          <div style={{ display: 'flex', gap: '13px' }}>
             <div style={{ fontSize: '11px', color: '#667085' }}>No active filters available for brands.</div>
          </div>
        }
      />

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Brand"
        fields={[
          { name: 'name',         label: 'Brand Name',  type: 'text' },
          { name: 'brand_type',   label: 'Brand Type',  type: 'select',   options: BRAND_TYPE_OPTIONS },
          { name: 'logo',         label: 'Brand Logo',  type: 'file' },
          { name: 'is_published', label: 'Published',   type: 'checkbox', defaultValue: true },
        ]}
        initialData={selectedBrand || {}} />
    </>
  );
};

export default BrandTable;
