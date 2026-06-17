import React, { useState, useEffect } from 'react';
import { Tag, Trash2, Edit2 } from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const CouponTable = () => {
  const [coupons, setCoupons]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [formMode, setFormMode]       = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage]               = useState(1);
  const [perPage, setPerPage]         = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [categories, setCategories]   = useState([]);
  const [brands, setBrands]           = useState([]);

  useEffect(() => {
    fetchCoupons();
    fetchCategories();
    fetchBrands();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/catalog/categories/');
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setCategories(list.filter(c => c.is_active !== false));
    } catch { /* silent */ }
  };

  const fetchBrands = async () => {
    try {
      const res = await apiClient.get('/catalog/brands/');
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setBrands(list.filter(b => b.is_active !== false));
    } catch { /* silent */ }
  };

  const fetchCoupons = async () => {
    try {
      const res = await apiClient.get('/sales/coupons/');
      setCoupons(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  // Build form fields dynamically so category options are populated after fetch
  const couponFormFields = [
    { name: 'code',                label: 'Coupon Code',        type: 'text',   required: true, placeholder: 'e.g. SAVE20' },
    { name: 'discount_percentage', label: 'Discount %',         type: 'number', required: true, min: 0, max: 100, step: 0.5 },
    { name: 'min_cart_value',      label: 'Min Cart Value (₹)', type: 'number', required: true, min: 0, step: 100 },
    {
      name: 'brand',
      label: 'Applicable Brands',
      type: 'checkbox-group',
           options: brands.map(b => ({value: String(b.id), label: b.name}))
    },
    {
      name: 'categories',
      label: 'Applicable Categories',
      type: 'checkbox-group',
           options: categories.map(c => ({ value: String(c.id), label: c.name })),
    },
    { name: 'is_active',  label: 'Active',          type: 'checkbox' },
    { name: 'valid_from', label: 'Valid From',       type: 'date' },
    { name: 'valid_until',label: 'Valid Until',      type: 'date' },
  ];

  /* ── Bulk actions ─────────────────────────────────────────── */
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
    { label: 'Deactivate Selected', variant: 'warning', icon: Tag,    onClick: bulkDeactivate },
    { label: 'Delete Selected',     variant: 'danger',  icon: Trash2, onClick: bulkDelete },
  ];

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleCreateClick = () => {
    setFormMode('create');
    setSelectedCoupon(null);
    setShowForm(true);
  };

  const handleEditClick = (c) => {
    // Ensure categories is an array of numbers for the checkbox-group pre-population
    const normalized = {
      ...c,
      categories: Array.isArray(c.categories)
        ? c.categories.map(Number)
        : [],
    };
    setFormMode('edit');
    setSelectedCoupon(normalized);
    setShowForm(true);
  };

  const handleFormSubmit = async (formData) => {
    // categories must be sent as an array of integer IDs
    const categoriesArr = Array.isArray(formData.categories)
      ? formData.categories.map(Number).filter(n => !isNaN(n))
      : [];

    if (categoriesArr.length === 0) {
      throw { response: { data: { categories: ['At least one category must be selected.'] } } };
    }

    const payload = {
      code: formData.code,
      discount_percentage: formData.discount_percentage,
      min_cart_value: formData.min_cart_value || 0,
      is_active: !!formData.is_active,
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null,
      categories: categoriesArr,
    };

    try {
      if (formMode === 'create') await apiClient.post('/sales/coupons/', payload);
      else await apiClient.put(`/sales/coupons/${selectedCoupon.id}/`, payload);
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      console.error(err);
      throw err; // let FormModal surface the error
    }
  };

  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/sales/coupons/${id}/`);
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  /* ── Table data ───────────────────────────────────────────── */
  const filtered  = coupons.filter(c => c.code?.toLowerCase().includes(searchQuery.toLowerCase()));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const isExpired = (c) => c.valid_until && new Date(c.valid_until) < new Date();

  const columns = [
    { label: 'Code',     key: 'code',      sortable: true  },
    { label: 'Discount', key: 'discount',  sortable: true  },
    { label: 'Min Value',key: 'min_value', sortable: true  },
    { label: 'Categories', key: 'categories', sortable: false },
    { label: 'Status',   key: 'status',    sortable: true  },
    { label: 'Expires',  key: 'expires',   sortable: true  },
    { label: 'Action',   key: 'action',    align: 'right'  },
  ];

  const renderRow = (c, idx, { isSelected, onToggle } = {}) => (
    <tr key={c.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isSelected ? '#F9F5FF' : '#fff' }}>
      {/* Checkbox */}
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" checked={!!isSelected} onChange={onToggle}
          style={{ cursor: 'pointer', borderRadius: '3px', accentColor: '#7F56D9' }} />
      </td>

      {/* Code */}
      <td style={{ padding: '16px 24px' }}>
        <code style={{
          background: '#F9F5FF', color: '#6941C6',
          padding: '4px 10px', borderRadius: '5px',
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
          fontFamily: 'monospace', border: '1px solid #E9D7FE',
        }}>{c.code}</code>
      </td>

      {/* Discount % */}
      <td style={{ padding: '16px 24px' }}>
        <div style={{ fontWeight: 600, color: '#101828', fontSize: '11px' }}>{c.discount_percentage}% OFF</div>
      </td>

      {/* Min cart value */}
      <td style={{ padding: '16px 24px' }}>
        <div style={{ fontSize: '11px', color: '#667085' }}>₹{Number(c.min_cart_value || 0).toLocaleString('en-IN')}</div>
      </td>

      {/* Categories */}
      <td style={{ padding: '16px 24px' }}>
        {c.category_names && c.category_names.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {c.category_names.map((name, i) => (
              <span key={i} style={{
                backgroundColor: '#F0FDF4', color: '#15803D',
                padding: '3px 8px', borderRadius: '12px',
                fontSize: '10px', fontWeight: 600,
                border: '1px solid #BBF7D0', whiteSpace: 'nowrap',
              }}>
                {name}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: '10px', color: '#9CA3AF', fontStyle: 'italic' }}>All Categories</span>
        )}
      </td>

      {/* Status */}
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: isExpired(c) ? '#FEF3F2' : c.is_active ? '#ECFDF3' : '#F2F4F7',
          color: isExpired(c) ? '#B42318' : c.is_active ? '#027A48' : '#344054',
          padding: '4px 10px', borderRadius: '13px',
          fontSize: '10px', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          border: `1px solid ${isExpired(c) ? '#FEE4E2' : c.is_active ? '#ABEFC6' : '#D0D5DD'}`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isExpired(c) ? '#D92D20' : c.is_active ? '#12B76A' : '#667085' }} />
          {isExpired(c) ? 'Expired' : c.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>

      {/* Expiry */}
      <td style={{ padding: '16px 24px' }}>
        <span style={{ fontSize: '11px', color: '#667085' }}>
          {c.valid_until
            ? new Date(c.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'No limit'}
        </span>
      </td>

      {/* Actions */}
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <div
            onClick={() => handleEditClick(c)}
            title="Edit Coupon"
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fff', color: '#667085', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' }}
          >
            <Edit2 size={16} />
          </div>
          <div
            onClick={() => handleEditClick(c)}
            title="Delete Coupon"
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fff', color: '#667085', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' }}
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
          onPerPageChange: setPerPage,
        }}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filterContent={
          <div style={{ display: 'flex', gap: '13px' }}>
            <div style={{ fontSize: '11px', color: '#667085' }}>No active filters available for coupons.</div>
          </div>
        }
      />

      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
        onDelete={handleFormDelete}
        mode={formMode}
        title="Coupon"
        fields={couponFormFields}
        initialData={selectedCoupon || {}}
      />
    </>
  );
};

export default CouponTable;
