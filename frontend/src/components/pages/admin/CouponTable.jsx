import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Edit, Trash2, Plus, MoreVertical, Tag, Edit2 } from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const CouponTable = () => {
  const [coupons, setCoupons]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage]         = useState(1);
  const [perPage, setPerPage]   = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const couponFormFields = [
    { name: 'code',                label: 'Coupon Code',         type: 'text',     required: true, placeholder: 'e.g. SAVE20' },
    { name: 'discount_percentage', label: 'Discount %',          type: 'number',   required: true, min: 0, max: 100, step: 0.5 },
    { name: 'min_cart_value',      label: 'Min Cart Value (₹)',  type: 'number',   required: true, min: 0, step: 100 },
    { name: 'is_bogo',             label: 'Buy One Get One',     type: 'checkbox' },
    { name: 'is_active',           label: 'Active',              type: 'checkbox' },
    { name: 'valid_from',          label: 'Valid From',          type: 'date' },
    { name: 'valid_until',         label: 'Valid Until',         type: 'date' },
  ];

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    try {
      const res = await apiClient.get('/sales/coupons/');
      setCoupons(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} coupon(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.delete(`/sales/coupons/${id}/`).catch(() => {})));
    setSelectedIds(new Set());
    fetchCoupons();
  };

  const bulkDeactivate = async () => {
    if (!window.confirm(`Deactivate ${selectedIds.size} coupon(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.patch(`/sales/coupons/${id}/`, { is_active: false }).catch(() => {})));
    setSelectedIds(new Set());
    fetchCoupons();
  };

  const bulkActions = [
    { label: 'Deactivate Selected', variant: 'warning', icon: Tag, onClick: bulkDeactivate },
    { label: 'Delete Selected', variant: 'danger', icon: Trash2, onClick: bulkDelete },
  ];

  const handleCreateClick = () => { setFormMode('create'); setSelectedCoupon(null); setShowForm(true); };
  const handleEditClick   = (c) => { setFormMode('edit'); setSelectedCoupon(c); setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    try {
      if (formMode === 'create') await apiClient.post('/sales/coupons/', formData);
      else await apiClient.put(`/sales/coupons/${selectedCoupon.id}/`, formData);
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/sales/coupons/${id}/`);
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = coupons.filter(c =>
    c.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const isExpired = (c) => c.valid_until && new Date(c.valid_until) < new Date();

  const columns = [
    { label: 'Code', key: 'code', sortable: true },
    { label: 'Discount', key: 'discount', sortable: true },
    { label: 'Min Value', key: 'min_value', sortable: true },
    { label: 'Type', key: 'type', sortable: true },
    { label: 'Status', key: 'status', sortable: true },
    { label: 'Expires', key: 'expires', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  const renderRow = (c, idx, { isSelected, onToggle } = {}) => (
    <tr key={c.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isSelected ? '#F9F5FF' : '#fff' }}>
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" checked={!!isSelected} onChange={onToggle} style={{ cursor: 'pointer', borderRadius: '3px', accentColor: '#7F56D9' }} />
      </td>
      <td style={{ padding: '16px 24px' }}>
        <code style={{
          background: '#F9F5FF', color: '#6941C6',
          padding: '4px 10px', borderRadius: '5px',
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
          fontFamily: 'monospace', border: '1px solid #E9D7FE'
        }}>{c.code}</code>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ fontWeight: 600, color: '#101828', fontSize: '11px' }}>{c.discount_percentage}% OFF</div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ fontSize: '11px', color: '#667085' }}>₹{Number(c.min_cart_value || 0).toLocaleString('en-IN')}</div>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: c.is_bogo ? '#F9F5FF' : '#EFF8FF',
          color: c.is_bogo ? '#6941C6' : '#175CD3',
          padding: '4px 10px',
          borderRadius: '13px',
          fontSize: '10px',
          fontWeight: 600,
          border: `1px solid ${c.is_bogo ? '#E9D7FE' : '#B2DDFF'}`
        }}>
          {c.is_bogo ? 'BOGO' : 'Discount'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: isExpired(c) ? '#FEF3F2' : c.is_active ? '#ECFDF3' : '#F2F4F7',
          color: isExpired(c) ? '#B42318' : c.is_active ? '#027A48' : '#344054',
          padding: '4px 10px',
          borderRadius: '13px',
          fontSize: '10px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${isExpired(c) ? '#FEE4E2' : c.is_active ? '#ABEFC6' : '#D0D5DD'}`
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isExpired(c) ? '#D92D20' : c.is_active ? '#12B76A' : '#667085' }}></span>
          {isExpired(c) ? 'Expired' : c.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontSize: '11px', color: '#667085' }}>
          {c.valid_until ? new Date(c.valid_until).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : 'No limit'}
        </span>
      </td>
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => handleEditClick(c)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Edit Coupon"
          >
            <Edit2 size={16} />
          </div>
          <div
            onClick={() => { setSelectedCoupon(c); setFormMode('edit'); setShowForm(true); }}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Delete Coupon"
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
        title="Coupons & Promotions"
        count={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleCreateClick}
        addLabel="Add Coupon"
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
             <div style={{ fontSize: '11px', color: '#667085' }}>No active filters available for coupons.</div>
          </div>
        }
      />

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Coupon"
        fields={couponFormFields} initialData={selectedCoupon || {}} />
    </>
  );
};

export default CouponTable;
