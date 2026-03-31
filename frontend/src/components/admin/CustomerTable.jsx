import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Download, Edit, Trash2,
  Mail, Calendar, Plus, MoreHorizontal, ChevronLeft, ChevronRight
} from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const CustomerTable = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const customerFormFields = [
    { name: 'username',   label: 'Username',     type: 'text',     required: true, placeholder: 'username' },
    { name: 'email',      label: 'Email',        type: 'email',    required: true, placeholder: 'user@example.com' },
    { name: 'first_name', label: 'First Name',   type: 'text',     placeholder: 'First name' },
    { name: 'last_name',  label: 'Last Name',    type: 'text',     placeholder: 'Last name' },
    { name: 'password',   label: 'Password',     type: 'password', placeholder: 'Leave empty to keep current' },
    { name: 'is_staff',   label: 'Admin Status', type: 'checkbox', defaultValue: false },
  ];

  const fetchCustomers = async () => {
    try {
      const res = await apiClient.get('/accounts/users/');
      const data = res.data;
      setCustomers(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleCreateClick = () => { setFormMode('create'); setSelectedCustomer(null); setShowForm(true); };
  const handleEditClick   = (c)  => { setFormMode('edit');   setSelectedCustomer(c);    setShowForm(true); };
  const handleDeleteClick = (c)  => { setFormMode('edit');   setSelectedCustomer(c);    setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    if (formMode === 'create') await apiClient.post('/accounts/users/', formData);
    else await apiClient.patch(`/accounts/users/${selectedCustomer.id}/`, formData);
    fetchCustomers();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/accounts/users/${id}/`);
    fetchCustomers();
  };

  const filtered = customers.filter(u =>
    [u.username, u.email, u.first_name, u.last_name]
      .some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const initials = (u) => (u.first_name?.[0] || u.username?.[0] || '?').toUpperCase();

  const avatarColors = ['#F9F5FF','#EFF8FF','#ECFDF3','#FFFAEB','#FEF3F2'];
  const textColors   = ['#6941C6','#1570EF','#067647','#B54708','#B42318'];
  const colorIdx     = (id) => id % avatarColors.length;

  if (loading) return (
    <div className="db-loading-state">Loading customer profiles…</div>
  );

  return (
    <div className="admin-table-wrapper">
      {/* Toolbar */}
      <div className="table-toolbar">
        <div>
          <div className="table-title">Customer Profiles</div>
          <div className="table-subtitle">{filtered.length} users total</div>
        </div>
        <div className="table-actions">
          <div className="table-search-box">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search customers…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <button className="btn btn-outline"><Filter size={14} /> Filter</button>
          <button className="btn btn-outline"><Download size={14} /> Export</button>
          <button className="btn btn-primary" onClick={handleCreateClick}>
            <Plus size={14} /> Add Customer
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Customer</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Search size={20} /></div>
                    <div className="empty-state-title">No customers found</div>
                    <div className="empty-state-desc">Try adjusting your search.</div>
                  </div>
                </td>
              </tr>
            ) : paginated.map((u) => (
              <tr key={u.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: avatarColors[colorIdx(u.id)],
                      color: textColors[colorIdx(u.id)],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, flexShrink: 0
                    }}>
                      {initials(u)}
                    </div>
                    <div>
                      <div className="cell-text-primary">
                        {u.first_name || u.username} {u.last_name || ''}
                      </div>
                      <div className="cell-text-secondary">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: 13 }}>
                    <Mail size={13} />
                    {u.email || '—'}
                  </div>
                </td>
                <td>
                  <span className={`badge ${u.is_staff ? 'badge-brand' : 'badge-neutral'}`}>
                    <span className="badge-dot" />
                    {u.is_staff ? 'Admin' : 'Customer'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: 13 }}>
                    <Calendar size={13} />
                    {u.date_joined ? new Date(u.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <button className="row-action-btn edit" title="Edit" onClick={() => handleEditClick(u)}><Edit size={14} /></button>
                    <button className="row-action-btn delete" title="Delete" onClick={() => handleDeleteClick(u)}><Trash2 size={14} /></button>
                    <button className="row-action-btn" title="More"><MoreHorizontal size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="table-pagination">
        <div className="pagination-info">
          Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} customers
        </div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
            <button key={n} className={`page-btn ${page === n ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
          ))}
          <button className="page-btn" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        mode={formMode}
        fields={customerFormFields}
        initialData={selectedCustomer}
        title="Customer"
        onSubmit={handleFormSubmit}
        onDelete={handleFormDelete}
      />
    </div>
  );
};

export default CustomerTable;
