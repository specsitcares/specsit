import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Trash2, MoreVertical, Star, ChevronLeft, ChevronRight, User, Edit2 } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const ReviewTable = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

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
    try {
      if (formMode === 'create') await apiClient.post('/catalog/reviews/', formData);
      else await apiClient.patch(`/catalog/reviews/${selectedReview.id}/`, formData);
      setShowForm(false);
      fetchReviews();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/catalog/reviews/${id}/`);
      setShowForm(false);
      fetchReviews();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = reviews.filter(r =>
    [r.user_name, r.product_name, r.comment].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const columns = [
    { label: 'Customer', key: 'customer', sortable: true },
    { label: 'Product', key: 'product', sortable: true },
    { label: 'Rating', key: 'rating', sortable: true },
    { label: 'Comment', key: 'comment' },
    { label: 'Status', key: 'status', sortable: true },
    { label: 'Created', key: 'created', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  const renderRow = (r, idx) => (
    <tr key={r.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: '#fff' }}>
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" style={{ cursor: 'pointer', borderRadius: '4px', accentColor: '#7F56D9' }} />
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F4EBFF', color: '#7F56D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} />
          </div>
          <div style={{ fontWeight: 600, color: '#101828', fontSize: '14px' }}>{r.user_name || 'Anonymous'}</div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ fontSize: '13px', color: '#344054', fontWeight: 500 }}>{r.product_name || '—'}</div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={14} fill={i < r.rating ? '#F79009' : 'none'} color={i < r.rating ? '#F79009' : '#D0D5DD'} />
          ))}
        </div>
      </td>
      <td style={{ padding: '16px 24px', maxWidth: 280 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5, fontSize: '13px', color: '#667085' }}>
          {r.comment || '—'}
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: r.is_approved ? '#ECFDF3' : '#FFFAEB',
          color: r.is_approved ? '#027A48' : '#B54708',
          padding: '4px 10px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${r.is_approved ? '#ABEFC6' : '#FEDF89'}`
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.is_approved ? '#12B76A' : '#F79009' }}></span>
          {r.is_approved ? 'Approved' : 'Pending'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontSize: '13px', color: '#667085' }}>{new Date(r.created_at).toLocaleDateString()}</span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => handleEditClick(r)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Edit Review"
          >
            <Edit2 size={16} />
          </div>
          <div
            onClick={() => { setSelectedReview(r); setFormMode('edit'); setShowForm(true); }}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Delete Review"
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
        title="Product Reviews"
        count={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleCreateClick}
        addLabel="Add Review"
        columns={columns}
        data={paginated}
        loading={loading}
        renderRow={renderRow}
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
          <div style={{ display: 'flex', gap: '16px' }}>
             <div style={{ fontSize: '14px', color: '#667085' }}>No active filters available for reviews.</div>
          </div>
        }
      />

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
    </>
  );
};

export default ReviewTable;
