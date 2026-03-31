import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, FolderOpen, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const CategoryTable = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/catalog/categories/');
      const data = res.data;
      setCategories(Array.isArray(data) ? data : (data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleCreateClick = () => { setFormMode('create'); setSelectedCategory(null); setShowForm(true); };
  const handleEditClick   = (c) => { setFormMode('edit');   setSelectedCategory(c);    setShowForm(true); };
  const handleDeleteClick = (c) => { setFormMode('edit');   setSelectedCategory(c);    setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    const data = new FormData();
    Object.keys(formData).forEach(k => {
      if (formData[k] != null) {
        if (k === 'image' && typeof formData[k] === 'string') return;
        data.append(k, formData[k]);
      }
    });
    if (formMode === 'create') await apiClient.post('/catalog/categories/', data);
    else await apiClient.patch(`/catalog/categories/${selectedCategory.id}/`, data);
    fetchCategories();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/catalog/categories/${id}/`);
    fetchCategories();
  };

  const filtered = categories.filter(c =>
    [c.name, c.slug, c.description].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <div className="db-loading-state">Loading categories…</div>;

  return (
    <div className="admin-table-wrapper">
      <div className="table-toolbar">
        <div>
          <div className="table-title">Product Categories</div>
          <div className="table-subtitle">{filtered.length} categories</div>
        </div>
        <div className="table-actions">
          <div className="table-search-box">
            <Search size={14} />
            <input type="text" placeholder="Search categories…" value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
          <button className="btn btn-outline"><Filter size={14} /> Filter</button>
          <button className="btn btn-primary" onClick={handleCreateClick}><Plus size={14} /> Add Category</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Category</th>
              <th>Parent</th>
              <th>Description</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state">No categories found.</div></td></tr>
            ) : paginated.map(c => (
              <tr key={c.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 6, background: 'var(--brand-50)', color: 'var(--brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {c.image ? <img src={c.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FolderOpen size={16} />}
                    </div>
                    <div>
                      <div className="cell-text-primary">{c.name}</div>
                      <div className="cell-text-secondary">{c.slug}</div>
                    </div>
                  </div>
                </td>
                <td><span className="cell-text-secondary">{c.parent_name || '—'}</span></td>
                <td style={{ maxWidth: 200 }}><div className="cell-text-secondary" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || '—'}</div></td>
                <td>
                  <span className={`badge ${c.is_active ? 'badge-success' : 'badge-neutral'}`}>
                    <span className="badge-dot" />{c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <button className="row-action-btn edit" onClick={() => handleEditClick(c)}><Edit size={14}/></button>
                    <button className="row-action-btn delete" onClick={() => handleDeleteClick(c)}><Trash2 size={14}/></button>
                    <button className="row-action-btn"><MoreHorizontal size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">Showing {paginated.length ? (page-1)*PER_PAGE+1 : 0}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={14}/></button>
          <button className="page-btn active">{page}</button>
          <button className="page-btn" disabled={page>=totalPages||totalPages===0} onClick={() => setPage(p=>p+1)}><ChevronRight size={14}/></button>
        </div>
      </div>

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Category" 
        fields={[
          { name: 'name', label: 'Category Name', type: 'text', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'parent', label: 'Parent Category', type: 'select', options: categories.filter(cat => cat.id !== selectedCategory?.id).map(cat => ({ value: cat.id, label: cat.name })) },
          { name: 'image', label: 'Category Image', type: 'file' },
          { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true }
        ]} 
        initialData={selectedCategory || {}} />
    </div>
  );
};

export default CategoryTable;
