import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Tag, MoreVertical, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const BrandTable = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleCreateClick = () => { setFormMode('create'); setSelectedBrand(null); setShowForm(true); };
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
    try {
      if (formMode === 'create') await apiClient.post('/catalog/brands/', data);
      else await apiClient.patch(`/catalog/brands/${selectedBrand.id}/`, data);
      setShowForm(false);
      fetchBrands();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/catalog/brands/${id}/`);
      setShowForm(false);
      fetchBrands();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = brands.filter(b =>
    [b.name, b.slug, b.description].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const columns = [
    { label: 'Brand', key: 'brand', sortable: true },
    { label: 'Slug', key: 'slug', sortable: true },
    { label: 'Description', key: 'description' },
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
            {b.logo ? <img src={b.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Tag size={20} color="#D0D5DD" />}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#101828', fontSize: '11px' }}>{b.name}</div>
            <div style={{ fontSize: '10px', color: '#667085' }}>#ID: {b.id}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#475467' }}>{b.slug}</span>
      </td>
      <td style={{ padding: '16px 24px', maxWidth: 220 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px', color: '#667085' }}>
          {b.description || '—'}
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: b.is_active ? '#ECFDF3' : '#F2F4F7',
          color: b.is_active ? '#027A48' : '#344054',
          padding: '4px 10px',
          borderRadius: '13px',
          fontSize: '10px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${b.is_active ? '#ABEFC6' : '#D0D5DD'}`
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.is_active ? '#12B76A' : '#667085' }}></span>
          {b.is_active ? 'Active' : 'Inactive'}
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

  return (
    <>
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
          { name: 'name', label: 'Brand Name', type: 'text', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'logo', label: 'Brand Logo', type: 'file' },
          { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true }
        ]} 
        initialData={selectedBrand || {}} />
    </>
  );
};

export default BrandTable;
