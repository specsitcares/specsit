import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, CheckCircle, Clock, User, Mail, MoreHorizontal, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import apiClient from '../../services/api';

const QueryTable = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage]           = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { fetchQueries(); }, []);

  const fetchQueries = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/accounts/queries/');
      setQueries(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const toggleResolved = async (query) => {
    await apiClient.patch(`/accounts/queries/${query.id}/`, { is_resolved: !query.is_resolved });
    fetchQueries();
  };

  const filtered = queries.filter(q =>
    [q.subject, q.email, q.message, q.name].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <div className="db-loading-state">Opening customer support tickets…</div>;

  return (
    <div className="admin-table-wrapper">
      <div className="table-toolbar">
        <div>
          <div className="table-title">Customer Support Inquiries</div>
          <div className="table-subtitle">{filtered.length} active tickets</div>
        </div>
        <div className="table-actions">
           <div className="table-search-box">
             <Search size={14} />
             <input type="text" placeholder="Search sender or subject…" value={searchQuery}
               onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
           </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Inquiry / Message</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Logged Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state">No inquiries found.</div></td></tr>
            ) : paginated.map(q => (
              <tr key={q.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: q.is_resolved ? 'var(--success-50)' : 'var(--warning-50)', color: q.is_resolved ? 'var(--success-700)' : 'var(--warning-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                       <MessageSquare size={16} />
                    </div>
                    <div style={{ maxWidth: 320 }}>
                       <div className="cell-text-primary" style={{ fontSize: '13.5px', marginBottom: 2 }}>{q.subject}</div>
                       <div className="cell-text-secondary" style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontSize: '12px' }}>
                          {q.message}
                       </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div>
                    <div className="cell-text-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                       <User size={12} color="var(--gray-400)" /> {q.name || 'Anonymous'}
                    </div>
                    <div className="cell-text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px' }}>
                       <Mail size={12} color="var(--gray-300)" /> {q.email}
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${q.is_resolved ? 'badge-success' : 'badge-warning'}`}>
                    {q.is_resolved ? <CheckCircle size={10} style={{ marginRight: 4 }} /> : <Clock size={10} style={{ marginRight: 4 }} />}
                    {q.is_resolved ? 'Resolved' : 'Pending'}
                  </span>
                </td>
                <td><span className="cell-text-secondary">{new Date(q.created_at).toLocaleDateString()}</span></td>
                <td>
                   <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      <button className={`row-action-btn ${q.is_resolved ? '' : 'edit'}`} onClick={() => toggleResolved(q)} title={q.is_resolved ? "Re-open" : "Resolve"}>
                         {q.is_resolved ? <Clock size={14} /> : <CheckCircle size={14} />}
                      </button>
                      <button className="row-action-btn"><MoreHorizontal size={14}/></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">Showing {paginated.length} of {filtered.length} tickets</div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={14}/></button>
          <button className="page-btn active">{page}</button>
          <button className="page-btn" disabled={page>=totalPages||totalPages===0} onClick={() => setPage(p=>p+1)}><ChevronRight size={14}/></button>
        </div>
      </div>
    </div>
  );
};

export default QueryTable;
