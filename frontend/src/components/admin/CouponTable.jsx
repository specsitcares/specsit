import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Edit, Trash2, Plus, MoreHorizontal, Tag } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const CouponTable = () => {
  const [coupons, setCoupons]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleCreateClick = () => { setFormMode('create'); setSelectedCoupon(null); setShowForm(true); };
  const handleEditClick   = (c) => { setFormMode('edit'); setSelectedCoupon(c); setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    if (formMode === 'create') await apiClient.post('/sales/coupons/', formData);
    else await apiClient.put(`/sales/coupons/${selectedCoupon.id}/`, formData);
    fetchCoupons();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/sales/coupons/${id}/`);
    fetchCoupons();
  };

  const filtered = coupons.filter(c =>
    c.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if coupon is expired
  const isExpired = (c) => c.valid_until && new Date(c.valid_until) < new Date();

  if (loading) return <div className="db-loading-state">Loading coupons…</div>;

  return (
    <div className="admin-table-wrapper">
      <div className="table-toolbar">
        <div>
          <div className="table-title">Coupons & Promotions</div>
          <div className="table-subtitle">{filtered.length} coupons total</div>
        </div>
        <div className="table-actions">
          <div className="table-search-box">
            <Search size={14} />
            <input type="text" placeholder="Search coupon code…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <button className="btn btn-outline"><Filter size={14} /> Filter</button>
          <button className="btn btn-outline"><Download size={14} /> Export</button>
          <button className="btn btn-primary" onClick={handleCreateClick}><Plus size={14} /> Add Coupon</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Code</th>
              <th>Discount</th>
              <th>Min Value</th>
              <th>Type</th>
              <th>Status</th>
              <th>Expires</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <div className="empty-state-icon"><Tag size={22} /></div>
                  <div className="empty-state-title">No coupons found</div>
                  <div className="empty-state-desc">Create your first promotion coupon.</div>
                </div>
              </td></tr>
            ) : filtered.map(c => (
              <tr key={c.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <code style={{
                    background: 'var(--brand-50)', color: 'var(--brand-700)',
                    padding: '2px 8px', borderRadius: 4,
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
                    fontFamily: 'monospace'
                  }}>{c.code}</code>
                </td>
                <td><div className="cell-text-primary">{c.discount_percentage}% off</div></td>
                <td><div className="cell-text-secondary">₹{Number(c.min_cart_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div></td>
                <td>
                  <span className={`badge ${c.is_bogo ? 'badge-brand' : 'badge-info'}`}>
                    <span className="badge-dot" />{c.is_bogo ? 'BOGO' : 'Discount'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${isExpired(c) ? 'badge-error' : c.is_active ? 'badge-success' : 'badge-neutral'}`}>
                    <span className="badge-dot" />
                    {isExpired(c) ? 'Expired' : c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td><span className="cell-text-secondary">{c.valid_until ? new Date(c.valid_until).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : 'No limit'}</span></td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <button className="row-action-btn edit" onClick={() => handleEditClick(c)}><Edit size={14}/></button>
                    <button className="row-action-btn delete" onClick={() => { setSelectedCoupon(c); setFormMode('edit'); setShowForm(true); }}><Trash2 size={14}/></button>
                    <button className="row-action-btn"><MoreHorizontal size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">{filtered.length} coupons</div>
      </div>

      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Coupon"
        fields={couponFormFields} initialData={selectedCoupon || {}} />
    </div>
  );
};

export default CouponTable;
