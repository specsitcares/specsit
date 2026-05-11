import React, { useState, useEffect } from 'react';
import { Truck, Package, MapPin, User } from 'lucide-react';
import apiClient from '../../../services/api';
import BaseAdminTable from './BaseAdminTable';

const STATUS_TABS = [
  { key: 'all',              label: 'All' },
  { key: 'ready_to_dispatch', label: 'Ready to Dispatch' },
  { key: 'in_transit',        label: 'In Transit' },
  { key: 'delivered',         label: 'Delivered' },
];

const orderStatusStyle = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'delivered')         return { bg: '#ECFDF3', text: '#027A48', dot: '#12B76A', border: '#ABEFC6' };
  if (v === 'in_transit')        return { bg: '#EFF8FF', text: '#175CD3', dot: '#2E90FA', border: '#B2DDFF' };
  if (v === 'ready_to_dispatch') return { bg: '#FFFAEB', text: '#B54708', dot: '#F79009', border: '#FEDF89' };
  return { bg: '#F9FAFB', text: '#344054', dot: '#98A2B3', border: '#EAECF0' };
};

const paymentStyle = (s) => {
  const v = (s || '').toLowerCase();
  if (v === 'paid' || v === 'completed') return { bg: '#ECFDF3', text: '#027A48', border: '#ABEFC6' };
  if (v === 'partial_paid')              return { bg: '#EFF8FF', text: '#175CD3', border: '#B2DDFF' };
  if (v === 'pending')                   return { bg: '#FFFAEB', text: '#B54708', border: '#FEDF89' };
  if (v === 'failed')                    return { bg: '#FEF3F2', text: '#B42318', border: '#FEE4E2' };
  return { bg: '#F9FAFB', text: '#344054', border: '#EAECF0' };
};

const fmtDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ShipmentTable = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { fetchShipments(); }, []);

  const fetchShipments = async () => {
    try {
      const res = await apiClient.get('/sales/orders/shipment_view/', { params: { page_size: 500 } });
      setShipments(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch (err) {
      console.error('Failed to fetch shipments', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = shipments.filter(s => {
    const matchTab = activeTab === 'all' || s.order_status === activeTab;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || [
      s.order_id?.toString(),
      s.customer_name,
      s.tracking_id,
      s.product_names,
      s.shipping_city,
      s.shipping_pincode,
    ].some(v => v?.toLowerCase().includes(q));
    return matchTab && matchSearch;
  });

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const columns = [
    { label: 'Order ID',       key: 'order_id',      sortable: true },
    { label: 'Customer',       key: 'customer',       sortable: false },
    { label: 'Product',        key: 'product_names',  sortable: false },
    { label: 'Ship To',        key: 'ship_to',        sortable: false },
    { label: 'Delivery Date',  key: 'delivery_date',  sortable: true },
    { label: 'Tracking ID',    key: 'tracking_id',    sortable: false },
    { label: 'Order Status',   key: 'order_status',   sortable: true },
    { label: 'Payment',        key: 'payment_status', sortable: true },
  ];

  const renderRow = (s, idx, { isSelected, onToggle } = {}) => {
    const sStyle = orderStatusStyle(s.order_status);
    const pStyle = paymentStyle(s.payment_status);
    return (
      <tr key={s.order_id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isSelected ? '#F9F5FF' : '#fff' }}>
        <td style={{ padding: '14px 20px' }}>
          <input type="checkbox" checked={!!isSelected} onChange={onToggle} style={{ cursor: 'pointer', accentColor: '#7F56D9' }} />
        </td>

        {/* Order ID */}
        <td style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={13} color="#667085" />
            <span style={{ fontWeight: 600, color: '#344054', fontSize: 11 }}>
              #LO-{String(s.order_id).padStart(7, '0')}
            </span>
          </div>
          <div style={{ fontSize: 10, color: '#98A2B3', marginTop: 2 }}>{fmtDate(s.order_date)}</div>
        </td>

        {/* Customer */}
        <td style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F4EBFF', color: '#7F56D9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={13} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#101828' }}>{s.customer_name || 'Guest'}</span>
          </div>
        </td>

        {/* Product */}
        <td style={{ padding: '14px 20px', maxWidth: 160 }}>
          <span style={{ fontSize: 11, color: '#344054', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.product_names || '—'}
          </span>
        </td>

        {/* Ship To */}
        <td style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#344054' }}>
            <MapPin size={12} color="#667085" flexShrink={0} />
            <span>{s.shipping_city && s.shipping_city !== '—' ? `${s.shipping_city}, ` : ''}{s.shipping_pincode || '—'}</span>
          </div>
          {s.carrier && (
            <div style={{ fontSize: 10, color: '#98A2B3', marginTop: 2 }}>{s.carrier}</div>
          )}
        </td>

        {/* Delivery Date */}
        <td style={{ padding: '14px 20px' }}>
          <span style={{ fontSize: 11, color: '#344054' }}>{fmtDate(s.delivery_date)}</span>
        </td>

        {/* Tracking ID */}
        <td style={{ padding: '14px 20px' }}>
          {s.tracking_id ? (
            <code style={{ background: '#F9FAFB', border: '1px solid #EAECF0', padding: '3px 8px', borderRadius: 5, fontFamily: 'monospace', fontSize: 10, color: '#344054', fontWeight: 600 }}>
              {s.tracking_id}
            </code>
          ) : (
            <span style={{ fontSize: 10, color: '#98A2B3', fontStyle: 'italic' }}>Awaiting</span>
          )}
        </td>

        {/* Order Status */}
        <td style={{ padding: '14px 20px' }}>
          <span style={{
            backgroundColor: sStyle.bg, color: sStyle.text, border: `1px solid ${sStyle.border}`,
            padding: '3px 10px', borderRadius: 13, fontSize: 10, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sStyle.dot, flexShrink: 0 }} />
            {s.order_status_label || s.order_status}
          </span>
        </td>

        {/* Payment */}
        <td style={{ padding: '14px 20px' }}>
          <span style={{
            backgroundColor: pStyle.bg, color: pStyle.text, border: `1px solid ${pStyle.border}`,
            padding: '3px 10px', borderRadius: 13, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            {s.payment_status
              ? s.payment_status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
              : 'Pending'}
          </span>
        </td>
      </tr>
    );
  };

  // Tab counts
  const tabCounts = STATUS_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? shipments.length : shipments.filter(s => s.order_status === t.key).length;
    return acc;
  }, {});

  return (
    <div>
      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #EAECF0', paddingBottom: 0 }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            style={{
              padding: '8px 14px', fontSize: 12, fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#68408D' : '#667085',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.key ? '2px solid #68408D' : '2px solid transparent',
              marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span style={{
                background: activeTab === tab.key ? '#F4EBFF' : '#F2F4F7',
                color: activeTab === tab.key ? '#6941C6' : '#667085',
                fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                border: `1px solid ${activeTab === tab.key ? '#E9D7FE' : '#EAECF0'}`,
              }}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <BaseAdminTable
        title="Track Shipments"
        count={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setPage(1); }}
        columns={columns}
        data={paginated}
        loading={loading}
        renderRow={renderRow}
        selectedIds={selectedIds}
        onSelectIds={setSelectedIds}
        bulkActions={[]}
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
          <div style={{ fontSize: 11, color: '#667085' }}>
            Filter by status using the tabs above.
          </div>
        }
      />
    </div>
  );
};

export default ShipmentTable;
