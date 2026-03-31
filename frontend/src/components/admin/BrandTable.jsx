import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Tag, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const BrandTable = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { fetchBrands(); }, []);

  const fetchBrands = async () => {
    try {
      const res = await apiClient.get('/catalog/brands/');
      const data = res.data;
      setBrands(Array.isArray(data) ? data : (data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

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
    if (formMode === 'create') await apiClient.post('/catalog/brands/', data);
    else await apiClient.patch(`/catalog/brands/${selectedBrand.id}/`, data);
    fetchBrands();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/catalog/brands/${id}/`);
    fetchBrands();
  };

  const filtered = brands.filter(b =>
    [b.name, b.slug, b.description].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <div className="db-loading-state">Loading brands…</div>;

  return (
    <div className="admin-table-wrapper">
      <div className="table-toolbar">
        <div>
          <div className="table-title">Brand Management</div>
          <div className="table-subtitle">{filtered.length} brands in catalog</div>
        </div>
        <div className="table-actions">
          <div className="table-search-box">
            <Search size={14} />
            <input type="text" placeholder="Search brands…" value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
          <button className="btn btn-primary" onClick={handleCreateClick}><Plus size={14} /> Add Brand</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Brand</th>
              <th>Slug</th>
              <th>Description</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(b => (
              <tr key={b.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 6, background: 'var(--white)', border: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 4 }}>
                      {b.logo ? <img src={b.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Tag size={16} color="var(--gray-300)" />}
                    </div>
                    <div>
                      <div className="cell-text-primary">{b.name}</div>
                      <div className="cell-text-secondary">#ID: {b.id}</div>
                    </div>
                  </div>
                </td>
                <td><span className="cell-text-secondary" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{b.slug}</span></td>
                <td style={{ maxWidth: 220 }}><div className="cell-text-secondary" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.description || '—'}</div></td>
                <td>
                  <span className={`badge ${b.is_active ? 'badge-success' : 'badge-neutral'}`}>
                    <span className="badge-dot" />{b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <button className="row-action-btn edit" onClick={() => handleEditClick(b)}><Edit size={14}/></button>
                    <button className="row-action-btn delete" onClick={() => handleDeleteClick(b)}><Trash2 size={14}/></button>
                    <button className="row-action-btn"><MoreHorizontal size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">Page {page} of {totalPages || 1}</div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={14}/></button>
          <button className="page-btn" disabled={page>=totalPages||totalPages===0} onClick={() => setPage(p=>p+1)}><ChevronRight size={14}/></button>
        </div>
      </div>

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Brand" 
        fields={[
          { name: 'name', label: 'Brand Name', type: 'text', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'logo', label: 'Brand Logo', type: 'file' },
          { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true }
        ]} 
        initialData={selectedBrand || {}} />
    </div>
  );
};

export default BrandTable;
