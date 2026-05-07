import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Edit, Trash2, Truck, MoreVertical, ChevronLeft, ChevronRight, Package, MapPin, Edit2 } from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const ShipmentTable = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [formMode, setFormMode]   = useState('create');
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
      const res = await apiClient.get('/sales/shipments/');
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

  const handleCreateClick = () => { setFormMode('create'); setSelectedShipment(null); setShowForm(true); };
  const handleEditClick   = (s) => { setFormMode('edit');   setSelectedShipment(s);    setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    try {
      if (formMode === 'create') await apiClient.post('/sales/shipments/', formData);
      else await apiClient.put(`/sales/shipments/${selectedShipment.id}/`, formData);
      setShowForm(false);
      fetchShipments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/sales/shipments/${id}/`);
      setShowForm(false);
      fetchShipments();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = shipments.filter(s =>
    [s.tracking_id, s.carrier, s.order_id?.toString()].some(v => v?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const getStatusStyle = (label) => {
    const l = (label || '').toLowerCase();
    if (l.includes('delivered')) return { bg: '#ECFDF3', text: '#027A48', dot: '#12B76A', border: '#ABEFC6' };
    if (l.includes('transit'))   return { bg: '#EFF8FF', text: '#175CD3', dot: '#2E90FA', border: '#B2DDFF' };
    if (l.includes('fail'))    return { bg: '#FEF3F2', text: '#B42318', dot: '#D92D20', border: '#FEE4E2' };
    return { bg: '#FFFAEB', text: '#B54708', dot: '#F79009', border: '#FEDF89' };
  };

  const columns = [
    { label: 'Order ID', key: 'order_id', sortable: true },
    { label: 'Carrier & Method', key: 'carrier', sortable: true },
    { label: 'Tracking ID', key: 'tracking_id', sortable: true },
    { label: 'Location/Status', key: 'status', sortable: true },
    { label: 'Created', key: 'created', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  const renderRow = (s, idx, { isSelected, onToggle } = {}) => {
    const style = getStatusStyle(s.status_label);
    return (
      <tr key={s.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isSelected ? '#F9F5FF' : '#fff' }}>
        <td style={{ padding: '16px 24px' }}>
          <input type="checkbox" checked={!!isSelected} onChange={onToggle} style={{ cursor: 'pointer', borderRadius: '4px', accentColor: '#7F56D9' }} />
        </td>
        <td style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={14} color="#667085" />
            <span style={{ fontWeight: 600, color: '#344054' }}>#LO-{String(s.order_id).padStart(7, '0')}</span>
          </div>
        </td>
        <td style={{ padding: '16px 24px' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#101828', fontSize: '14px' }}>{s.carrier || 'Standard'}</div>
            <div style={{ fontSize: '12px', color: '#667085' }}>{s.method || 'Priority'}</div>
          </div>
        </td>
        <td style={{ padding: '16px 24px' }}>
          <code style={{ background: '#F9FAFB', border: '1px solid #EAECF0', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', color: '#344054', fontWeight: 600 }}>
            {s.tracking_id || 'AWAITING'}
          </code>
        </td>
        <td style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
             <span style={{
               backgroundColor: style.bg,
               color: style.text,
               padding: '4px 10px',
               borderRadius: '16px',
               fontSize: '12px',
               fontWeight: 600,
               display: 'inline-flex',
               alignItems: 'center',
               gap: 6,
               border: `1px solid ${style.border}`,
               width: 'fit-content'
             }}>
               <span style={{ width: 6, height: 6, borderRadius: '50%', background: style.dot }}></span>
               {s.status_label || 'In Transit'}
             </span>
             <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', color: '#667085', marginLeft: '4px' }}>
                <MapPin size={10} /> Local Logistics Hub
             </div>
          </div>
        </td>
        <td style={{ padding: '16px 24px' }}>
          <span style={{ fontSize: '13px', color: '#667085' }}>{new Date(s.created_at).toLocaleDateString()}</span>
        </td>
        <td style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <div
              onClick={() => handleEditClick(s)}
              style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
              title="Edit Shipment"
            >
              <Edit2 size={16} />
            </div>
            <div
              onClick={() => { setSelectedShipment(s); setFormMode('edit'); setShowForm(true); }}
              style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
              title="Delete Shipment"
            >
              <Trash2 size={16} />
            </div>
          </div>
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
        onAdd={handleCreateClick}
        addLabel="Create Shipment"
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
          <div style={{ display: 'flex', gap: '16px' }}>
             <div style={{ fontSize: '14px', color: '#667085' }}>Logistics filters coming soon.</div>
          </div>
        }
      />

      <FormModal
        isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Shipment"
        fields={[
          { name: 'order_id', label: 'Order ID', type: 'number', required: true },
          { name: 'carrier', label: 'Carrier', type: 'text', required: true },
          { name: 'method', label: 'Shipping Method', type: 'select', options: [
            { label: 'Ground', value: 'Ground' }, { label: 'Express', value: 'Express' }, { label: 'Overnight', value: 'Overnight' }
          ], required: true },
          { name: 'tracking_id', label: 'Tracking ID', type: 'text', required: true },
          { name: 'status', label: 'Status', type: 'select', options: [
            { label: 'Pending', value: 'Pending' }, { label: 'In Transit', value: 'In Transit' }, { label: 'Delivered', value: 'Delivered' }
          ], required: true }
        ]}
        initialData={selectedShipment || {}} />
    </>
  );
};

export default ShipmentTable;
