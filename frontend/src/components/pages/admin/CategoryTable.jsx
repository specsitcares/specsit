import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, FolderOpen, MoreVertical, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const CAT_TABS = [
  { key: 'frame', label: 'Frames' },
  { key: 'lens', label: 'Contact Lenses' },
  { key: 'accessory', label: 'Accessories' },
];

const CAT_TYPE_OPTIONS = [
  { value: 'frame', label: 'Frames' },
  { value: 'lens', label: 'Contact Lenses' },
  { value: 'accessory', label: 'Accessories' },
];

const CategoryTable = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('frame');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/catalog/categories/');
      const data = res.data;
      setCategories(Array.isArray(data) ? data : (data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} categor${selectedIds.size === 1 ? 'y' : 'ies'}?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.delete(`/catalog/categories/${id}/`).catch(() => { })));
    setSelectedIds(new Set());
    fetchCategories();
  };

  const bulkActions = [
    { label: 'Delete Selected', variant: 'danger', icon: Trash2, onClick: bulkDelete },
  ];

  const handleCreateClick = () => { setFormMode('create'); setSelectedCategory({ category_type: activeTab }); setShowForm(true); };
  const handleEditClick = (c) => { setFormMode('edit'); setSelectedCategory(c); setShowForm(true); };
  const handleDeleteClick = (c) => { setFormMode('edit'); setSelectedCategory(c); setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    const data = new FormData();
    Object.keys(formData).forEach(k => {
      if (formData[k] != null) {
        if (k === 'parent' && formData[k] === '') return;
        if (k === 'image' && typeof formData[k] === 'string') return;
        data.append(k, formData[k]);
      }
    });
    try {
      if (formMode === 'create') await apiClient.post('/catalog/categories/', data);
      else await apiClient.patch(`/catalog/categories/${selectedCategory.id}/`, data);
      setShowForm(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/catalog/categories/${id}/`);
      setShowForm(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = categories
    .filter(c => ((c.group || c.category_type || 'frame').toString().toLowerCase()) === activeTab)
    .filter(c => [c.name, c.slug, c.description].some(v => (v || '').toLowerCase().includes(searchQuery.toLowerCase())));

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const columns = [
    { label: 'Category', key: 'category', sortable: true },
    { label: 'Parent', key: 'parent', sortable: true },
    { label: 'Description', key: 'description' },
    { label: 'Status', key: 'status', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  const renderRow = (c, idx, { isSelected, onToggle } = {}) => (
    <tr key={c.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isSelected ? '#F9F5FF' : '#fff' }}>
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" checked={!!isSelected} onChange={onToggle} style={{ cursor: 'pointer', borderRadius: '3px', accentColor: '#7F56D9' }} />
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 8, background: '#F4EBFF', color: '#7F56D9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {c.image ? <img src={c.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FolderOpen size={20} />}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#101828', fontSize: '11px' }}>{c.name}</div>
            <div style={{ fontSize: '10px', color: '#667085' }}>{c.slug}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontSize: '11px', color: '#475467' }}>{c.parent_name || '—'}</span>
      </td>
      <td style={{ padding: '16px 24px', maxWidth: 220 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px', color: '#667085' }}>
          {c.description || '—'}
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: c.is_active ? '#ECFDF3' : '#F2F4F7',
          color: c.is_active ? '#027A48' : '#344054',
          padding: '4px 10px',
          borderRadius: '13px',
          fontSize: '10px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${c.is_active ? '#ABEFC6' : '#D0D5DD'}`
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.is_active ? '#12B76A' : '#667085' }}></span>
          {c.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => handleEditClick(c)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Edit Category"
          >
            <Edit2 size={16} />
          </div>
          <div
            onClick={() => handleDeleteClick(c)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Delete Category"
          >
            <Trash2 size={16} />
          </div>
        </div>
      </td>
    </tr>
  );

  const tabCounts = Object.fromEntries(CAT_TABS.map(t => [t.key, categories.filter(c => ((c.group || c.category_type || 'frame').toString().toLowerCase()) === t.key).length]));

  return (
    <>
      {/* Tab strip */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {CAT_TABS.map(tab => (
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
        title="Product Categories"
        count={filtered.length}
        countLabel="Categories"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleCreateClick}
        addLabel="Add Category"
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
            <div style={{ fontSize: '11px', color: '#667085' }}>No active filters available for categories.</div>
          </div>
        }
      />

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Category"
        fields={[
          { name: 'name', label: 'Category Name', type: 'text', required: true },
          { name: 'group', label: 'Group', type: 'select', required: true, options: CAT_TYPE_OPTIONS },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'parent', label: 'Parent Category', type: 'select', options: categories.filter(cat => cat.id !== selectedCategory?.id && ((cat.group || cat.category_type || 'frame').toString().toLowerCase()) === activeTab).map(cat => ({ value: cat.id, label: cat.name })) },
          { name: 'image', label: 'Category Image', type: 'file' },
          { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
        ]}
        initialData={selectedCategory || {}} />
    </>
  );
};

export default CategoryTable;
