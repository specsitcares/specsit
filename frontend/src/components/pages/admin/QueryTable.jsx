import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, CheckCircle, Clock, User, Mail, MoreVertical, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import apiClient from '../../../services/api';
import BaseAdminTable from './BaseAdminTable';

const QueryTable = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchQueries(); }, []);

  const fetchQueries = async () => {
    try {
      const res = await apiClient.get('/accounts/queries/');
      setQueries(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const toggleResolved = async (query) => {
    try {
      await apiClient.patch(`/accounts/queries/${query.id}/`, { is_resolved: !query.is_resolved });
      fetchQueries();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = queries.filter(q =>
    [q.subject, q.email, q.message, q.name].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const columns = [
    { label: 'Inquiry / Message', key: 'message', sortable: true },
    { label: 'Customer', key: 'customer', sortable: true },
    { label: 'Status', key: 'status', sortable: true },
    { label: 'Logged Date', key: 'date', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  const renderRow = (q, idx) => (
    <tr key={q.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: '#fff' }}>
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" style={{ cursor: 'pointer', borderRadius: '3px', accentColor: '#7F56D9' }} />
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: q.is_resolved ? '#ECFDF3' : '#FFFAEB', color: q.is_resolved ? '#027A48' : '#B54708', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <MessageSquare size={16} />
          </div>
          <div style={{ maxWidth: 360 }}>
            <div style={{ fontWeight: 600, color: '#101828', fontSize: '11px', marginBottom: 2 }}>{q.subject}</div>
            <div style={{ fontSize: '10px', color: '#667085', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5 }}>
              {q.message}
            </div>
          </div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={12} color="#667085" /> {q.name || 'Anonymous'}
          </div>
          <div style={{ fontSize: '10px', color: '#667085', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Mail size={12} color="#D0D5DD" /> {q.email}
          </div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: q.is_resolved ? '#ECFDF3' : '#FFFAEB',
          color: q.is_resolved ? '#027A48' : '#B54708',
          padding: '4px 10px',
          borderRadius: '13px',
          fontSize: '10px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${q.is_resolved ? '#ABEFC6' : '#FEDF89'}`
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: q.is_resolved ? '#12B76A' : '#F79009' }}></span>
          {q.is_resolved ? 'Resolved' : 'Pending'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontSize: '10px', color: '#667085' }}>{new Date(q.created_at).toLocaleDateString()}</span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => toggleResolved(q)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title={q.is_resolved ? "Re-open" : "Resolve"}
          >
            {q.is_resolved ? <Clock size={16} /> : <CheckCircle size={16} />}
          </div>
          <div
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
          >
            <MoreVertical size={16} />
          </div>
        </div>
      </td>
    </tr>
  );

  return (
    <BaseAdminTable
      title="Customer Support Inquiries"
      count={filtered.length}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
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
        <div style={{ display: 'flex', gap: '13px' }}>
           <div style={{ fontSize: '11px', color: '#667085' }}>Customer support filters coming soon.</div>
        </div>
      }
    />
  );
};

export default QueryTable;
