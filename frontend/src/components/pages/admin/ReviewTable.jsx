import React, { useState, useEffect, useCallback } from 'react';
import { Search, Star, User, CheckCircle, XCircle, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import apiClient from '../../../services/api';

const TABS = [
  { key: 'all', label: 'All Reviews' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
];

const StarRating = ({ value }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={13} fill={i <= value ? '#F79009' : 'none'} color={i <= value ? '#F79009' : '#D0D5DD'} />
    ))}
  </div>
);

const StatusBadge = ({ approved }) => (
  <span style={{
    background: approved ? '#ECFDF3' : '#FFFAEB',
    color: approved ? '#027A48' : '#B54708',
    border: `1px solid ${approved ? '#ABEFC6' : '#FEDF89'}`,
    padding: '3px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 5,
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: approved ? '#12B76A' : '#F79009' }} />
    {approved ? 'Approved' : 'Pending'}
  </span>
);

const PAGE_SIZE = 10;

const ReviewTable = () => {
  const [tab, setTab] = useState('all');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (tab === 'pending') params.is_approved = 'false';
      if (tab === 'approved') params.is_approved = 'true';
      if (ratingFilter) params.rating = ratingFilter;
      const res = await apiClient.get('/catalog/reviews/', { params });
      setReviews(Array.isArray(res.data) ? res.data : (res.data.results || []));
      setPage(1);
    } catch {
      showToast('Failed to load reviews', false);
    } finally {
      setLoading(false);
    }
  }, [tab, ratingFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleAction = async (id, action) => {
    setActionLoading(p => ({ ...p, [id]: action }));
    try {
      await apiClient.post(`/catalog/reviews/${id}/${action}/`);
      setReviews(prev => prev.map(r =>
        r.id === id ? { ...r, is_approved: action === 'approve' } : r
      ));
      showToast(`Review ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
    } catch {
      showToast('Action failed', false);
    } finally {
      setActionLoading(p => ({ ...p, [id]: null }));
    }
  };

  const toggleSelectReview = (id) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} review(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.delete(`/catalog/reviews/${id}/`).catch(() => {})));
    setSelectedIds(new Set());
    fetchReviews();
    showToast('Selected reviews deleted');
  };

  const bulkApprove = async () => {
    if (!window.confirm(`Approve ${selectedIds.size} review(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.post(`/catalog/reviews/${id}/approve/`).catch(() => {})));
    setSelectedIds(new Set());
    fetchReviews();
    showToast('Selected reviews approved');
  };

  const bulkReject = async () => {
    if (!window.confirm(`Reject ${selectedIds.size} review(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.post(`/catalog/reviews/${id}/reject/`).catch(() => {})));
    setSelectedIds(new Set());
    fetchReviews();
    showToast('Selected reviews rejected');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review? This cannot be undone.')) return;
    setActionLoading(p => ({ ...p, [id]: 'delete' }));
    try {
      await apiClient.delete(`/catalog/reviews/${id}/`);
      setReviews(prev => prev.filter(r => r.id !== id));
      showToast('Review deleted');
    } catch {
      showToast('Delete failed', false);
    } finally {
      setActionLoading(p => ({ ...p, [id]: null }));
    }
  };

  const filtered = reviews.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.username || r.reviewer_display_name || '').toLowerCase().includes(s) ||
      (r.product_name || '').toLowerCase().includes(s) ||
      (r.review_title || r.comment || '').toLowerCase().includes(s)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendingCount = reviews.filter(r => !r.is_approved).length;

  return (
    <div style={{ background: '#F9FAFB', minHeight: '100vh', padding: '24px 28px', fontFamily: 'Inter, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: toast.ok ? '#ECFDF3' : '#FEF3F2',
          border: `1px solid ${toast.ok ? '#ABEFC6' : '#FECACA'}`,
          color: toast.ok ? '#027A48' : '#991B1B',
          borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#101828' }}>Review Moderation</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#667085' }}>
            Approve or reject customer reviews before they appear publicly.
            {pendingCount > 0 && <span style={{ background: '#FEF3C7', color: '#B45309', borderRadius: 12, padding: '1px 8px', marginLeft: 8, fontWeight: 700 }}>{pendingCount} pending</span>}
          </p>
        </div>
        <button onClick={fetchReviews}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #D0D5DD', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: '#344054', fontWeight: 600 }}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', border: '1px solid #EAECF0', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
            style={{
              background: tab === t.key ? '#7F56D9' : 'transparent',
              color: tab === t.key ? '#fff' : '#667085',
              border: 'none', borderRadius: 7, padding: '6px 18px',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 500, cursor: 'pointer',
            }}>
            {t.label}
            {t.key === 'pending' && pendingCount > 0 && (
              <span style={{ marginLeft: 6, background: tab === 'pending' ? 'rgba(255,255,255,0.25)' : '#FEF3C7', color: tab === 'pending' ? '#fff' : '#B45309', borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 700 }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by customer, product, or review text..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, height: 38, border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13, color: '#344054', background: '#fff', boxSizing: 'border-box', outline: 'none' }} />
        </div>
        <select value={ratingFilter} onChange={e => { setRatingFilter(e.target.value); setPage(1); }}
          style={{ height: 38, border: '1px solid #D0D5DD', borderRadius: 8, padding: '0 12px', fontSize: 13, color: '#344054', background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Star{r !== 1 ? 's' : ''}</option>)}
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 16px', background: '#7F56D9', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{selectedIds.size} selected</span>
          <button onClick={bulkApprove} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#12B76A', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle size={13} /> Approve
          </button>
          <button onClick={bulkReject} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#FFFAEB', color: '#B54708', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <XCircle size={13} /> Reject
          </button>
          <button onClick={bulkDelete} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#FEF3F2', color: '#B42318', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Trash2 size={13} /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF' }}>Loading reviews...</div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF' }}>
            No reviews {tab !== 'all' ? `with status "${tab}"` : ''}{search ? ` matching "${search}"` : ''}.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #EAECF0' }}>
                <th style={{ padding: '12px 16px', width: 40 }}>
                  <input type="checkbox"
                    checked={paginated.length > 0 && paginated.every(r => selectedIds.has(r.id))}
                    ref={el => { if (el) el.indeterminate = paginated.some(r => selectedIds.has(r.id)) && !paginated.every(r => selectedIds.has(r.id)); }}
                    onChange={e => e.target.checked ? setSelectedIds(new Set(paginated.map(r => r.id))) : setSelectedIds(new Set())}
                    style={{ cursor: 'pointer', accentColor: '#7F56D9' }}
                  />
                </th>
                {['Customer', 'Product', 'Rating', 'Review', 'Status', 'Date', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(r => {
                const busy = actionLoading[r.id];
                const isExpanded = expandedId === r.id;
                const reviewText = r.review_text || r.comment || '';
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #F2F4F7', background: selectedIds.has(r.id) ? '#F9F5FF' : isExpanded ? '#FAFAF9' : '#fff', transition: 'background 0.1s' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelectReview(r.id)} style={{ cursor: 'pointer', accentColor: '#7F56D9' }} />
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '14px 16px', minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F4EBFF', color: '#7F56D9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={14} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#101828' }}>{r.username || r.reviewer_display_name || 'Anonymous'}</div>
                          {r.is_verified_purchase && (
                            <div style={{ fontSize: 10, color: '#027A48', fontWeight: 700 }}>✓ Verified</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Product */}
                    <td style={{ padding: '14px 16px', maxWidth: 180 }}>
                      <div style={{ fontSize: 13, color: '#344054', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.product_name || `Product #${r.product}`}
                      </div>
                      {r.order && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Order #{r.order}</div>}
                    </td>

                    {/* Rating */}
                    <td style={{ padding: '14px 16px' }}>
                      <StarRating value={r.rating} />
                    </td>

                    {/* Review text */}
                    <td style={{ padding: '14px 16px', maxWidth: 300 }}>
                      {r.review_title && (
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#101828', marginBottom: 2 }}>{r.review_title}</div>
                      )}
                      <div style={{
                        fontSize: 12, color: '#667085', lineHeight: 1.5,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: isExpanded ? 999 : 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {reviewText || '—'}
                      </div>
                      {reviewText.length > 100 && (
                        <button onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: '#7F56D9', cursor: 'pointer', marginTop: 2, fontWeight: 600 }}>
                          {isExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                      {Array.isArray(r.review_images) && r.review_images.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                          {r.review_images.map((src, i) => (
                            <img key={i} src={src} alt={`Review image ${i + 1}`}
                              style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', border: '1px solid #E5E7EB', cursor: 'pointer' }}
                              onClick={() => window.open(src, '_blank')}
                            />
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge approved={r.is_approved} />
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', fontSize: 12, color: '#667085' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {!r.is_approved ? (
                          <button onClick={() => handleAction(r.id, 'approve')} disabled={!!busy}
                            title="Approve"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, background: busy === 'approve' ? '#D1FAE5' : '#ECFDF3', border: '1px solid #ABEFC6', borderRadius: 7, padding: '5px 10px', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, color: '#027A48' }}>
                            <CheckCircle size={13} />
                            {busy === 'approve' ? '…' : 'Approve'}
                          </button>
                        ) : (
                          <button onClick={() => handleAction(r.id, 'reject')} disabled={!!busy}
                            title="Reject"
                            style={{ display: 'flex', alignItems: 'center', gap: 5, background: busy === 'reject' ? '#FEF3C7' : '#FFFAEB', border: '1px solid #FEDF89', borderRadius: 7, padding: '5px 10px', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, color: '#B54708' }}>
                            <XCircle size={13} />
                            {busy === 'reject' ? '…' : 'Reject'}
                          </button>
                        )}
                        <button onClick={() => handleDelete(r.id)} disabled={!!busy}
                          title="Delete"
                          style={{ width: 30, height: 30, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy ? 'not-allowed' : 'pointer', color: '#DC2626', flexShrink: 0 }}>
                          {busy === 'delete' ? <span style={{ fontSize: 11 }}>…</span> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '0 4px' }}>
          <span style={{ fontSize: 13, color: '#667085' }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} reviews
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ width: 34, height: 34, border: '1px solid #D0D5DD', borderRadius: 8, background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? 0.4 : 1 }}>
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages).map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ lineHeight: '34px', color: '#9CA3AF', fontSize: 13 }}>…</span>}
                <button onClick={() => setPage(p)}
                  style={{ width: 34, height: 34, border: `1px solid ${p === page ? '#7F56D9' : '#D0D5DD'}`, borderRadius: 8, background: p === page ? '#7F56D9' : '#fff', color: p === page ? '#fff' : '#344054', cursor: 'pointer', fontSize: 13, fontWeight: p === page ? 700 : 400 }}>
                  {p}
                </button>
              </React.Fragment>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ width: 34, height: 34, border: '1px solid #D0D5DD', borderRadius: 8, background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages ? 0.4 : 1 }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewTable;
