import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, MoreHorizontal, Star, ChevronLeft, ChevronRight, User } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const ReviewTable = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    try {
      const res = await apiClient.get('/catalog/reviews/');
      setReviews(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleCreateClick = () => { setFormMode('create'); setSelectedReview(null); setShowForm(true); };
  const handleEditClick   = (r) => { setFormMode('edit');   setSelectedReview(r);    setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    if (formMode === 'create') await apiClient.post('/catalog/reviews/', formData);
    else await apiClient.patch(`/catalog/reviews/${selectedReview.id}/`, formData);
    fetchReviews();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/catalog/reviews/${id}/`);
    fetchReviews();
  };

  const filtered = reviews.filter(r =>
    [r.user_name, r.product_name, r.comment].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <div className="db-loading-state">Loading product reviews…</div>;

  return (
    <div className="admin-table-wrapper">
      <div className="table-toolbar">
        <div>
          <div className="table-title">Product Reviews</div>
          <div className="table-subtitle">{filtered.length} customer feedbacks</div>
        </div>
        <div className="table-actions">
          <div className="table-search-box">
            <Search size={14} />
            <input type="text" placeholder="Search customer or content…" value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
          <button className="btn btn-outline"><Filter size={14} /> Filter</button>
          <button className="btn btn-primary" onClick={handleCreateClick}><Plus size={14} /> Add Mock Review</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Customer</th>
              <th>Product</th>
              <th>Rating</th>
              <th style={{ width: '30%' }}>Comment</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(r => (
              <tr key={r.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-50)', color: 'var(--brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={14} />
                    </div>
                    <div className="cell-text-primary">{r.user_name || 'Anonymous'}</div>
                  </div>
                </td>
                <td><div className="cell-text-primary" style={{ fontSize: '13px' }}>{r.product_name || '—'}</div></td>
                <td>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={13} fill={i < r.rating ? 'var(--warning-500)' : 'none'} color={i < r.rating ? 'var(--warning-500)' : 'var(--gray-300)'} />
                    ))}
                  </div>
                </td>
                <td><div className="cell-text-secondary" style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>{r.comment || '—'}</div></td>
                <td>
                  <span className={`badge ${r.is_approved ? 'badge-success' : 'badge-warning'}`}>
                    <span className="badge-dot" />{r.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td><span className="cell-text-secondary">{new Date(r.created_at).toLocaleDateString()}</span></td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <button className="row-action-btn edit" onClick={() => handleEditClick(r)}><Edit size={14}/></button>
                    <button className="row-action-btn delete" onClick={() => { setSelectedReview(r); setFormMode('edit'); setShowForm(true); }}><Trash2 size={14}/></button>
                    <button className="row-action-btn"><MoreHorizontal size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">Showing {paginated.length} of {filtered.length}</div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={14}/></button>
          {Array.from({length: Math.min(totalPages, 5)}, (_,i)=>i+1).map(n => (
            <button key={n} className={`page-btn ${page===n?'active':''}`} onClick={()=>setPage(n)}>{n}</button>
          ))}
          <button className="page-btn" disabled={page>=totalPages||totalPages===0} onClick={() => setPage(p=>p+1)}><ChevronRight size={14}/></button>
        </div>
      </div>

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Review"
        fields={[
          { name: 'product', label: 'Product ID', type: 'number', required: true },
          { name: 'rating', label: 'Star Rating', type: 'select', options: [
            { label: '5 Stars', value: 5 }, { label: '4 Stars', value: 4 }, { label: '3 Stars', value: 3 }, { label: '2 Stars', value: 2 }, { label: '1 Star', value: 1 }
          ], required: true },
          { name: 'comment', label: 'Review Comment', type: 'textarea', required: true },
          { name: 'is_approved', label: 'Approve Publicly', type: 'checkbox' }
        ]}
        initialData={selectedReview || {}} />
    </div>
  );
};

export default ReviewTable;
