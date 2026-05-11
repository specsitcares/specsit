import React, { useState, useEffect } from 'react';
import { Trash2, Truck, Package, MapPin } from 'lucide-react';
import apiClient from '../../../services/api';
import BaseAdminTable from './BaseAdminTable';

const ShipmentTable = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      const res = await apiClient.get('/sales/shipments/', { params: { page_size: 500 } });
      setShipments(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} shipment(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.delete(`/sales/shipments/${id}/`).catch(() => {})));
    setSelectedIds(new Set());
    fetchShipments();
  };

  const bulkMarkDelivered = async () => {
    if (!window.confirm(`Mark ${selectedIds.size} shipment(s) as Delivered?`)) return;
    const shipmentMap = new Map(shipments.map(s => [s.id, s.order_id]));
    await Promise.all([...selectedIds].map(id => {
      const orderId = shipmentMap.get(id);
      return orderId
        ? apiClient.post(`/sales/orders/${orderId}/mark_delivered/`).catch(() => {})
        : apiClient.patch(`/sales/shipments/${id}/`, { status: 'Delivered' }).catch(() => {});
    }));
    setSelectedIds(new Set());
    fetchShipments();
  };

  const bulkActions = [
    { label: 'Mark Delivered', variant: 'success', icon: Truck, onClick: bulkMarkDelivered },
    { label: 'Delete Selected', variant: 'danger', icon: Trash2, onClick: bulkDelete },
  ];

  const filtered = shipments.filter(s =>
    [s.tracking_id, s.carrier, s.order_id?.toString()].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const getStatusStyle = (label) => {
    const l = (label || '').toLowerCase();
    if (l.includes('delivered') || l.includes('completed')) return { bg: '#ECFDF3', text: '#027A48', dot: '#12B76A', border: '#ABEFC6' };
    if (l.includes('transit') || l.includes('delivering') || l.includes('shipped')) return { bg: '#EFF8FF', text: '#175CD3', dot: '#2E90FA', border: '#B2DDFF' };
    if (l.includes('fail'))    return { bg: '#FEF3F2', text: '#B42318', dot: '#D92D20', border: '#FEE4E2' };
    return { bg: '#F9FAFB', text: '#344054', dot: '#98A2B3', border: '#EAECF0' };
  };

  const paymentStatusStyle = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'paid') return { bg: '#ECFDF3', text: '#027A48', border: '#ABEFC6' };
    if (s === 'pending')  return { bg: '#FFFAEB', text: '#B54708', border: '#FEDF89' };
    if (s === 'failed')   return { bg: '#FEF3F2', text: '#B42318', border: '#FEE4E2' };
    return { bg: '#F9FAFB', text: '#344054', border: '#EAECF0' };
  };

  const columns = [
    { label: 'Order ID',      key: 'order_id',      sortable: true },
    { label: 'Product',       key: 'product_names', sortable: false },
    { label: 'Address (Pin)', key: 'pincode',        sortable: false },
    { label: 'Delivery Date', key: 'delivery_date',  sortable: true },
    { label: 'Tracking ID',   key: 'tracking_id',    sortable: true },
    { label: 'Payment',       key: 'payment_status', sortable: true },
  ];

  const renderRow = (s, idx, { isSelected, onToggle } = {}) => {
    const statusStyle = getStatusStyle(s.status_label);
    const pmStyle     = paymentStatusStyle(s.order_payment_status);
    const deliveryDate = s.estimated_delivery_date
      ? new Date(s.estimated_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
    return (
      <tr key={s.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isSelected ? '#F9F5FF' : '#fff' }}>
        <td style={{ padding: '16px 24px' }}>
          <input type="checkbox" checked={!!isSelected} onChange={onToggle} style={{ cursor: 'pointer', borderRadius: '3px', accentColor: '#7F56D9' }} />
        </td>
        {/* Order ID */}
        <td style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={14} color="#667085" />
            <span style={{ fontWeight: 600, color: '#344054', fontSize: 12 }}>#LO-{String(s.order_id).padStart(7, '0')}</span>
          </div>
        </td>
        {/* Product name */}
        <td style={{ padding: '16px 24px', maxWidth: 180 }}>
          <span style={{ fontSize: 12, color: '#101828', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.product_names || '—'}
          </span>
        </td>
        {/* Address / pincode */}
        <td style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#344054' }}>
            <MapPin size={12} color="#667085" />
            <span>{s.shipping_pincode || '—'}</span>
          </div>
        </td>
        {/* Delivery date */}
        <td style={{ padding: '16px 24px' }}>
          <span style={{ fontSize: 12, color: '#344054' }}>{deliveryDate}</span>
        </td>
        {/* Tracking ID */}
        <td style={{ padding: '16px 24px' }}>
          <code style={{ background: '#F9FAFB', border: '1px solid #EAECF0', padding: '4px 8px', borderRadius: '5px', fontFamily: 'monospace', fontSize: '10px', color: '#344054', fontWeight: 600 }}>
            {s.tracking_id || 'AWAITING'}
          </code>
        </td>
        {/* Payment status */}
        <td style={{ padding: '16px 24px' }}>
          <span style={{
            backgroundColor: pmStyle.bg, color: pmStyle.text,
            border: `1px solid ${pmStyle.border}`,
            padding: '3px 10px', borderRadius: 13,
            fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            {s.order_payment_status ? s.order_payment_status.charAt(0).toUpperCase() + s.order_payment_status.slice(1) : 'Pending'}
          </span>
        </td>
      </tr>
    );
  };

  return (
    <>
      <BaseAdminTable
        title="Track Shipments"
        count={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
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
             <div style={{ fontSize: '11px', color: '#667085' }}>Logistics filters coming soon.</div>
          </div>
        }
      />
    </>
  );
};

export default ShipmentTable;
