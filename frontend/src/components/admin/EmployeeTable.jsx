import React, { useState, useEffect } from 'react';
import { Edit, Trash2, MoreVertical, ChevronDown, Search, Filter, Download, Command, Plus } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const EmployeeTable = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formMode, setFormMode] = useState('create');

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
      fetchEmployees();
    } catch (err) {
      throw err;
    }
  };

  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/accounts/employees/${id}/`);
      fetchEmployees();
    } catch (err) {
      throw err;
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading employees...</div>;

  return (
    <div className="admin-table-container">
      <div className="table-header-toolbar">
        <div className="table-title">Staff & Employees <span className="order-count">{employees.length} Total</span></div>
        <div className="toolbar-actions">
          <div className="search-box">
            <Search size={16} /><input type="text" placeholder="Search here..." />
            <span className="shortcut"><Command size={10} /> K</span>
          </div>
          <button className="toolbar-btn"><Filter size={16} /> <span>Filter</span></button>
          <button className="toolbar-btn"><Download size={16} /> <span>Export</span></button>
          <button className="toolbar-btn primary" onClick={handleCreateClick}><Plus size={16} /> <span>Create</span></button>
        </div>
      </div>
      <table className="orders-data-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}><input type="checkbox" disabled /></th>
            <th>Name <ChevronDown size={14} /></th>
            <th>Email</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Created</th>
            <th className="action-col">action</th>
          </tr>
        </thead>
        <tbody>
          {employees.length > 0 ? employees.map((emp) => (
            <tr key={emp.id}>
              <td><input type="checkbox" disabled /></td>
              <td><strong>{emp.name || '-'}</strong></td>
              <td>{emp.email || '-'}</td>
              <td><div className="status-badge" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>{emp.role || 'Agent'}</div></td>
              <td>{emp.phone_number || 'N/A'}</td>
              <td>{new Date(emp.created_at).toLocaleDateString()}</td>
              <td className="action-col"><div className="action-btns"><button onClick={() => handleEditClick(emp)} title="Edit"><Edit size={16} /></button><button onClick={() => handleFormDelete(emp.id)} title="Delete"><Trash2 size={16} /></button><button title="More"><MoreVertical size={16} /></button></div></td>
            </tr>
          )) : (
            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No employees found</td></tr>
          )}
        </tbody>
      </table>

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
    </div>
  );
};

export default EmployeeTable;
