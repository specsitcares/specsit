import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Download, Edit, Trash2,
  Mail, Calendar, Plus, MoreVertical, ChevronLeft, ChevronRight,
  User, Edit2
} from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const CustomerTable = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

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

  useEffect(() => {
    fetchCustomers();
  }, []);

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} customer(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.delete(`/accounts/users/${id}/`).catch(() => {})));
    setSelectedIds(new Set());
    fetchCustomers();
  };

  const bulkActions = [
    { label: 'Delete Selected', variant: 'danger', icon: Trash2, onClick: bulkDelete },
  ];

  const handleCreateClick = () => { setFormMode('create'); setSelectedCustomer(null); setShowForm(true); };
  const handleEditClick   = (c)  => { setFormMode('edit');   setSelectedCustomer(c);    setShowForm(true); };
  const handleDeleteClick = (c)  => { setFormMode('edit');   setSelectedCustomer(c);    setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    try {
      if (formMode === 'create') await apiClient.post('/accounts/users/', formData);
      else await apiClient.patch(`/accounts/users/${selectedCustomer.id}/`, formData);
      setShowForm(false);
      fetchCustomers();
    } catch (err) {
      console.error('Form submission failed', err);
    }
  };

  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/accounts/users/${id}/`);
      setShowForm(false);
      fetchCustomers();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const filtered = customers.filter(u =>
    [u.username, u.email, u.first_name, u.last_name]
      .some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const initials = (u) => (u.first_name?.[0] || u.username?.[0] || '?').toUpperCase();
  const avatarColors = ['#F9F5FF','#EFF8FF','#ECFDF3','#FFFAEB','#FEF3F2'];
  const textColors   = ['#6941C6','#1570EF','#067647','#B54708','#B42318'];
  const colorIdx     = (id) => id % avatarColors.length;

  const columns = [
    { label: 'Customer', key: 'customer', sortable: true },
    { label: 'Email', key: 'email', sortable: true },
    { label: 'Role', key: 'role', sortable: true },
    { label: 'Joined', key: 'joined', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  const renderRow = (u, idx, { isSelected, onToggle } = {}) => (
    <tr key={u.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isSelected ? '#F9F5FF' : '#fff' }}>
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" checked={!!isSelected} onChange={onToggle} style={{ cursor: 'pointer', borderRadius: '3px', accentColor: '#7F56D9' }} />
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: avatarColors[colorIdx(u.id || 0)],
            color: textColors[colorIdx(u.id || 0)],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, flexShrink: 0,
            border: '1px solid #EAECF0'
          }}>
            {initials(u)}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#101828', fontSize: '11px' }}>
              {u.first_name || u.username} {u.last_name || ''}
            </div>
            <div style={{ fontSize: '10px', color: '#667085' }}>@{u.username}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475467', fontSize: '11px' }}>
          <Mail size={14} color="#667085" />
          {u.email || '—'}
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: u.is_staff ? '#F9F5FF' : '#F2F4F7',
          color: u.is_staff ? '#6941C6' : '#414651',
          padding: '4px 10px',
          borderRadius: '13px',
          fontSize: '10px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${u.is_staff ? '#E9D7FE' : '#D0D5DD'}`
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.is_staff ? '#7F56D9' : '#667085' }}></span>
          {u.is_staff ? 'Admin' : 'Customer'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475467', fontSize: '11px' }}>
          <Calendar size={14} color="#667085" />
          {u.date_joined ? new Date(u.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => handleEditClick(u)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Edit Customer"
          >
            <Edit2 size={16} />
          </div>
          <div
            onClick={() => handleEditClick(u)} // Assuming delete also opens edit modal with delete option as per original code handleEditClick and handleDeleteClick was same
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Delete Customer"
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
        title="Customer Profiles"
        count={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleCreateClick}
        addLabel="Add Customer"
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
             {/* Add customer specific filters here if needed */}
             <div style={{ fontSize: '11px', color: '#667085' }}>No active filters available for customers.</div>
          </div>
        }
      />

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
    </>
  );
};

export default CustomerTable;
