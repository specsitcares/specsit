import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Edit, Trash2, Truck, MoreHorizontal, ChevronLeft, ChevronRight, Package, MapPin } from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const ShipmentTable = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [formMode, setFormMode]   = useState('create');
  const [page, setPage]           = useState(1);
  const PER_PAGE = 10;

  useEffect(() => { fetchShipments(); }, []);

  const fetchShipments = async () => {
    try {
      const res = await apiClient.get('/sales/shipments/');
      setShipments(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const handleCreateClick = () => { setFormMode('create'); setSelectedShipment(null); setShowForm(true); };
  const handleEditClick   = (s) => { setFormMode('edit');   setSelectedShipment(s);    setShowForm(true); };

  const handleFormSubmit = async (formData) => {
    if (formMode === 'create') await apiClient.post('/sales/shipments/', formData);
    else await apiClient.put(`/sales/shipments/${selectedShipment.id}/`, formData);
    fetchShipments();
  };

  const handleFormDelete = async (id) => {
    await apiClient.delete(`/sales/shipments/${id}/`);
    fetchShipments();
  };

  const totalPages = Math.ceil(shipments.length / PER_PAGE);
  const paginated  = shipments.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const getStatusBadge = (label) => {
    const l = (label || '').toLowerCase();
    if (l.includes('delivered')) return 'badge-success';
    if (l.includes('transit'))   return 'badge-info';
    if (l.includes('fail'))    return 'badge-error';
    return 'badge-warning';
  };

  if (loading) return <div className="db-loading-state">Loading shipment data…</div>;

  return (
    <div className="admin-table-wrapper">
      <div className="table-toolbar">
        <div>
          <div className="table-title">Track Shipments</div>
          <div className="table-subtitle">{shipments.length} active logistics records</div>
        </div>
        <div className="table-actions">
           <button className="btn btn-outline"><Download size={14} /> Export</button>
           <button className="btn btn-primary" onClick={handleCreateClick}><Truck size={14} /> Create Shipment</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Order ID</th>
              <th>Carrier & Method</th>
              <th>Tracking ID</th>
              <th>Location/Status</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state">No shipments yet.</div></td></tr>
            ) : paginated.map(s => (
              <tr key={s.id}>
                <td><input type="checkbox" /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Package size={14} color="var(--gray-400)" />
                    <span className="cell-text-primary">ORD-{s.order_id}</span>
                  </div>
                </td>
                <td>
                  <div>
                    <div className="cell-text-primary" style={{ fontSize: '13px' }}>{s.carrier || 'Standard'}</div>
                    <div className="cell-text-secondary">{s.method || 'Priority'}</div>
                  </div>
                </td>
                <td>
                  <code style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--gray-700)' }}>
                    {s.tracking_id || 'AWAITING'}
                  </code>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                     <span className={`badge ${getStatusBadge(s.status_label)}`}>
                       <span className="badge-dot" />{s.status_label || 'In Transit'}
                     </span>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '10px', color: 'var(--gray-400)', marginLeft: '4px' }}>
                        <MapPin size={10} /> Local Hub
                     </div>
                  </div>
                </td>
                <td><span className="cell-text-secondary">{new Date(s.created_at).toLocaleDateString()}</span></td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <button className="row-action-btn edit" onClick={() => handleEditClick(s)}><Edit size={14}/></button>
                    <button className="row-action-btn delete" onClick={() => { setSelectedShipment(s); setFormMode('edit'); setShowForm(true); }}><Trash2 size={14}/></button>
                    <button className="row-action-btn"><MoreHorizontal size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <div className="pagination-info">Page {page} of {totalPages || 1}</div>
        <div className="pagination-controls">
          <button className="page-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}><ChevronLeft size={14}/></button>
          <button className="page-btn active">{page}</button>
          <button className="page-btn" disabled={page>=totalPages||totalPages===0} onClick={() => setPage(p=>p+1)}><ChevronRight size={14}/></button>
        </div>
      </div>

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
    </div>
  );
};

export default ShipmentTable;
