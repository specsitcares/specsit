import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Layers, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const CollectionTable = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { fetchCollections(); }, []);

  const fetchCollections = async () => {
    try {
      const res = await apiClient.get('/catalog/collections/');
      const data = res.data;
      setCollections(Array.isArray(data) ? data : (data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleCreateClick = () => { setFormMode('create'); setSelectedCollection(null); setShowForm(true); };
  const handleEditClick   = (c) => { setFormMode('edit');   setSelectedCollection(c);    setShowForm(true); };
  const handleDeleteClick = (c) => { setFormMode('edit');   setSelectedCollection(c);    setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    const data = new FormData();
    Object.keys(formData).forEach(k => {
      if (formData[k] != null) {
        if (k === 'image' && typeof formData[k] === 'string') return;
        data.append(k, formData[k]);
      }
    });
    if (formMode === 'create') await apiClient.post('/catalog/collections/', data);
    else await apiClient.patch(`/catalog/collections/${selectedCollection.id}/`, data);
    fetchCollections();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/catalog/collections/${id}/`);
    fetchCollections();
  };

  const filtered = collections.filter(c =>
    [c.name, c.description].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <div className="db-loading-state">Loading collections…</div>;

  return (
    <div className="admin-table-wrapper">
      <div className="table-toolbar">
        <div>
          <div className="table-title">Product Collections</div>
          <div className="table-subtitle">{filtered.length} curated collections</div>
        </div>
        <div className="table-actions">
          <div className="table-search-box">
            <Search size={14} />
            <input type="text" placeholder="Search collections…" value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
          <button className="btn btn-primary" onClick={handleCreateClick}><Plus size={14} /> Add Collection</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Collection</th>
              <th>Description</th>
              <th>Products</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(c => (
              <tr key={c.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 48, height: 32, borderRadius: 4, background: 'var(--brand-50)', color: 'var(--brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {c.image ? <img src={c.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Layers size={16} />}
                    </div>
                    <div>
                      <div className="cell-text-primary">{c.name}</div>
                      <div className="cell-text-secondary">ID: {c.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ maxWidth: 280 }}><div className="cell-text-secondary" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || '—'}</div></td>
                <td>
                  <span className="badge badge-brand" style={{ background: 'var(--brand-100)', color: 'var(--brand-800)', border: 'none' }}>
                    {c.products?.length || 0} items
                  </span>
                </td>
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
        <div className="pagination-info">{filtered.length} total collections</div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={14}/></button>
          <button className="page-btn active">{page}</button>
          <button className="page-btn" disabled={page>=totalPages||totalPages===0} onClick={() => setPage(p=>p+1)}><ChevronRight size={14}/></button>
        </div>
      </div>

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Collection" 
        fields={[
          { name: 'name', label: 'Collection Name', type: 'text', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'image', label: 'Collection Thumbnail', type: 'file' },
          { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true }
        ]} 
        initialData={selectedCollection || {}} />
    </div>
  );
};

export default CollectionTable;
