import React, { useState, useEffect } from 'react';
import { Edit, Trash2, MoreVertical, ChevronDown, Search, Filter, Download, Command, Plus, User, Edit2 } from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const EmployeeTable = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const employeeFormFields = [
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone_number', label: 'Phone Number', type: 'tel', required: true },
    {
      name: 'role', label: 'Role', type: 'select', options: [
        { label: 'Manager', value: 'Manager' },
        { label: 'Agent', value: 'Agent' },
        { label: 'Supervisor', value: 'Supervisor' },
        { label: 'Admin', value: 'Admin' }
      ], required: true
    }
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/accounts/employees/');
      setEmployees(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    } finally {
      setLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} employee(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.delete(`/accounts/employees/${id}/`).catch(() => {})));
    setSelectedIds(new Set());
    fetchEmployees();
  };

  const bulkActions = [
    { label: 'Delete Selected', variant: 'danger', icon: Trash2, onClick: bulkDelete },
  ];

  const handleCreateClick = () => {
    setFormMode('create');
    setSelectedEmployee(null);
    setShowForm(true);
  };

  const handleEditClick = (emp) => {
    setFormMode('edit');
    setSelectedEmployee(emp);
    setShowForm(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (formMode === 'create') {
        await apiClient.post('/accounts/employees/', formData);
      } else {
        await apiClient.put(`/accounts/employees/${selectedEmployee.id}/`, formData);
      }
      setShowForm(false);
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/accounts/employees/${id}/`);
      setShowForm(false);
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = employees.filter(e =>
    [e.name, e.email, e.role].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const columns = [
    { label: 'Name', key: 'name', sortable: true },
    { label: 'Email', key: 'email', sortable: true },
    { label: 'Role', key: 'role', sortable: true },
    { label: 'Phone', key: 'phone', sortable: true },
    { label: 'Created', key: 'created', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  const renderRow = (emp, idx, { isSelected, onToggle } = {}) => (
    <tr key={emp.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isSelected ? '#F9F5FF' : '#fff' }}>
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" checked={!!isSelected} onChange={onToggle} style={{ cursor: 'pointer', borderRadius: '3px', accentColor: '#7F56D9' }} />
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F4EBFF', color: '#7F56D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} />
          </div>
          <div style={{ fontWeight: 600, color: '#101828', fontSize: '11px' }}>{emp.name || '-'}</div>
        </div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ fontSize: '11px', color: '#475467' }}>{emp.email || '-'}</div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: '#F9F5FF',
          color: '#6941C6',
          padding: '4px 10px',
          borderRadius: '13px',
          fontSize: '10px',
          fontWeight: 600,
          border: '1px solid #E9D7FE'
        }}>
          {emp.role || 'Agent'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ fontSize: '11px', color: '#475467' }}>{emp.phone_number || 'N/A'}</div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ fontSize: '10px', color: '#667085' }}>{new Date(emp.created_at).toLocaleDateString()}</div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => handleEditClick(emp)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Edit Employee"
          >
            <Edit2 size={16} />
          </div>
          <div
            onClick={() => handleFormDelete(emp.id)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Delete Employee"
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
        title="Staff & Employees"
        count={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleCreateClick}
        addLabel="Create"
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
             <div style={{ fontSize: '11px', color: '#667085' }}>No active filters available for employees.</div>
          </div>
        }
      />

      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
        onDelete={() => handleFormDelete(selectedEmployee?.id)}
        mode={formMode}
        title="Employee"
        fields={employeeFormFields}
        initialData={selectedEmployee || {}}
      />
    </>
  );
};

export default EmployeeTable;
