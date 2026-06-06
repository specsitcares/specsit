import React, { useState, useEffect, useCallback } from 'react';
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
  const [listModal, setListModal]     = useState({ isOpen: false, title: '', items: [] });

  // Dropdown data
  const [brands, setBrands]                     = useState([]);
  const [categories, setCategories]             = useState([]);

  // Current selections
  const [selectedBrandId, setSelectedBrandId]       = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  useEffect(() => {
    fetchCoupons();
    fetchBrands();
  }, []);

  /* ── Data fetchers ───────────────────────────────────────── */

  const fetchCoupons = async () => {
    try {
      const res = await apiClient.get('/sales/coupons/');
      setCoupons(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const fetchBrands = async () => {
    try {
      const res = await apiClient.get('/catalog/brands/');
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setBrands(list.filter(b => b.is_active !== false));
    } catch { /* silent */ }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/catalog/categories/');
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setCategories(list.filter(c => c.is_active !== false));
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchCoupons();
    fetchBrands();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCoupons();
    fetchBrands();
    fetchCategories();
  }, []);

  /* ── Form fields (rebuilt on every render so options stay in sync) ── */

  const couponFormFields = [
    { name: 'code',                label: 'Coupon Code',        type: 'text',   required: true, placeholder: 'e.g. SAVE20' },
    { name: 'discount_percentage', label: 'Discount %',         type: 'number', required: true, min: 0, max: 100, step: 0.5 },
    { name: 'min_cart_value',      label: 'Min Cart Value (₹)', type: 'number', required: true, min: 0, step: 100 },
    {
      name: 'brand_select',
      label: 'Brands',
      type: 'checkbox-group',
      required: false,
      options: brands.map(b => ({ value: String(b.id), label: b.name })),
      helpText: 'Select brands. Leave empty to apply to all brands.',
    },
    {
      name: 'category_select',
      label: 'Categories',
      type: 'checkbox-group',
      required: false,
      options: categories.map(c => ({ value: String(c.id), label: c.name })),
      helpText: 'Select categories (e.g. Eyeglasses, Sunglasses). Leave empty for all.',
    },
    { name: 'is_active',  label: 'Active',     type: 'checkbox' },
    { name: 'valid_from', label: 'Valid From',  type: 'date' },
    { name: 'valid_until',label: 'Valid Until', type: 'date' },
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
    setSelectedBrandId('');
    setSelectedCategoryId('');
    setShowForm(true);
  };

  const handleEditClick = async (c) => {
    setFormMode('edit');

    const normalized = {
      ...c,
      brand_select: c.brand_details ? c.brand_details.map(b => Number(b.id)) : [],
      category_select: c.category_details ? c.category_details.map(cat => Number(cat.id)) : [],
    };

    setSelectedCoupon(normalized);
    setShowForm(true);
  };

  const handleFormSubmit = async (formData) => {
    const payload = {
      code: formData.code,
      discount_percentage: formData.discount_percentage,
      min_cart_value: formData.min_cart_value || 0,
      is_active: !!formData.is_active,
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null,
      brands: Array.isArray(formData.brand_select) ? formData.brand_select : [],
      categories: Array.isArray(formData.category_select) ? formData.category_select : [],
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
    { label: 'Brand',    key: 'brand',     sortable: false },
    { label: 'Category', key: 'category',  sortable: false },
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

      {/* Brand */}
      <td style={{ padding: '16px 24px' }}>
        {c.brand_names && c.brand_names.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              backgroundColor: '#FEF3C7', color: '#92400E',
              padding: '3px 8px', borderRadius: '12px',
              fontSize: '10px', fontWeight: 600,
              border: '1px solid #FCD34D', whiteSpace: 'nowrap',
            }}>
              {c.brand_names[0]}
            </span>
            {c.brand_names.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setListModal({ isOpen: true, title: 'Selected Brands', items: c.brand_names });
                }}
                style={{
                  background: 'none', border: '1px solid #E5E7EB', borderRadius: '12px',
                  padding: '2px 8px', fontSize: '10px', fontWeight: 600, color: '#6B7280',
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap'
                }}
              >
                +{c.brand_names.length - 1} more
              </button>
            )}
          </div>
        ) : (
          <span style={{ fontSize: '10px', color: '#9CA3AF', fontStyle: 'italic' }}>All Brands</span>
        )}
      </td>

      {/* Category */}
      <td style={{ padding: '16px 24px' }}>
        {c.category_details && c.category_details.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              backgroundColor: '#EFF6FF', color: '#1D4ED8',
              padding: '3px 8px', borderRadius: '12px',
              fontSize: '10px', fontWeight: 600,
              border: '1px solid #BFDBFE', whiteSpace: 'nowrap',
            }}>
              {c.category_details[0].name}
            </span>
            {c.category_details.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setListModal({ isOpen: true, title: 'Selected Categories', items: c.category_details.map(cat => cat.name) });
                }}
                style={{
                  background: 'none', border: '1px solid #E5E7EB', borderRadius: '12px',
                  padding: '2px 8px', fontSize: '10px', fontWeight: 600, color: '#6B7280',
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap'
                }}
              >
                +{c.category_details.length - 1} more
              </button>
            )}
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

      {/* ── List Modal ── */}
      {listModal.isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(16, 24, 40, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }} onClick={() => setListModal({ isOpen: false, title: '', items: [] })}>
          <div style={{
            background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '320px',
            boxShadow: '0 20px 48px rgba(16,24,40,0.18)', overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #EAECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#101828' }}>{listModal.title}</h3>
              <button onClick={() => setListModal({ isOpen: false, title: '', items: [] })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div style={{ padding: '12px 20px', maxHeight: '300px', overflowY: 'auto' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {listModal.items.map((item, idx) => (
                  <li key={idx} style={{ padding: '8px 0', borderBottom: idx < listModal.items.length - 1 ? '1px solid #F2F4F7' : 'none', fontSize: '13px', color: '#344054', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#68408D' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CouponTable;
