import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Download,
  ChevronDown, ChevronRight, ChevronLeft,
  Edit, Trash2, FileText, MoreVertical,
  Clock, Package, ArrowUpDown, FileDown, Glasses, Edit2
} from 'lucide-react';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const STATUS_CLASS = {
  approved: 'badge-success',
  completed: 'badge-success',
  pending: 'badge-warning',
  cancelled: 'badge-error',
  shipped: 'badge-info',
};

const getStatusClass = (label) =>
  STATUS_CLASS[(label || '').toLowerCase()] || 'badge-neutral';

const OrderTable = () => {
  const [orders, setOrders] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusOptions, setStatusOptions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formMode, setFormMode] = useState('edit');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [perPage, setPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const searchInputRef = React.useRef(null);

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  useEffect(() => { fetchOrders(); fetchMetadata(); }, [page, searchQuery, statusFilter, dateFilter]);

  const fetchMetadata = async () => {
    try {
      const resp = await apiClient.get('/core/metadata-items/', { params: { group: 'order_status' } });
      const items = resp.data.results || resp.data;
      if (Array.isArray(items)) setStatusOptions(items.map(i => ({ label: i.label, value: i.id })));
    } catch { /* silent */ }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get('/sales/orders/', {
        params: { 
          page, 
          limit: perPage, 
          ordering: '-created_at', 
          search: searchQuery,
          status: statusFilter,
          date_from: dateFilter.from,
          date_to: dateFilter.to
        }
      });
      const data = res.data;
      if (data.results) { 
        setOrders(data.results); 
        setTotalOrders(data.count || 0); 
      } else if (Array.isArray(data)) { 
        setOrders(data); 
        setTotalOrders(data.length); 
      } else { 
        setOrders([]); 
        setTotalOrders(0); 
      }
    } catch (err) { 
      console.error('Fetch orders failed:', err);
      setOrders([]); 
    } finally { 
      setLoading(false); 
    }
  };

  const toggleRow = (id) =>
    setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

  const handleEdit = (o) => { 
    console.log('Edit clicked for order:', o.id);
    setSelectedOrder(o); 
    setFormMode('edit'); 
    setShowForm(true); 
  };
  
  const handleDelete = (o) => { 
    console.log('Delete clicked for order:', o.id);
    if (window.confirm(`Are you sure you want to delete Order #${o.id}?`)) {
      deleteOrder(o.id); 
    }
  };

  const handleDownloadPDF = (o) => {
    console.log('PDF Download clicked for order:', o.id);
    alert(`Initiating PDF Download for Order #${o.id}`);
  };

  const handleExport = async () => {
    console.log('Initiating master table export...');
    try {
      const res = await apiClient.get('/sales/orders/export/', {
        params: {
          search: searchQuery,
          status: statusFilter,
          date_from: dateFilter.from,
          date_to: dateFilter.to
        },
        responseType: 'blob'
      });
      
      if (!res.data || res.data.size < 10) throw new Error('Received empty file from server.');
      
      console.log('Export successful, size:', res.data.size);
      
      const blob = new Blob(['\uFEFF', res.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err.message}`);
    }
  };

  const deleteOrder = async (id) => {
    try { 
      await apiClient.delete(`/sales/orders/${id}/`); 
      alert('Order deleted successfully');
      fetchOrders(); 
    } catch (err) { 
      console.error('Delete failed:', err);
      alert('Failed to delete order. Please check permissions.');
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      await apiClient.patch(`/sales/orders/${selectedOrder.id}/`, formData);
      setShowForm(false);
      alert('Order updated successfully');
      fetchOrders();
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to update order. Please try again.');
    }
  };

  const orderFormFields = [
    { name: 'customer_name', label: 'Customer Name', type: 'text', readOnly: true },
    { name: 'total_amount', label: 'Total Amount (₹)', type: 'number', required: true, step: 0.01, min: 0 },
    {
      name: 'status', label: 'Order Status', type: 'select',
      options: statusOptions.length ? statusOptions : [
        { label: 'Pending', value: 1 }, { label: 'Approved', value: 2 }, { label: 'Cancelled', value: 3 }
      ], required: true
    },
    { name: 'payment_method', label: 'Payment Method', type: 'text', required: true },
  ];

  const totalPages = Math.ceil(totalOrders / perPage);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden transition-all duration-300">
      {/* Table Header Section (Inline-Styled for Guaranteed Alignment) */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #EAECF0', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#101828', margin: 0 }}>Recent Orders</h3>
            <span style={{ backgroundColor: '#F4EBFF', color: '#7F56D9', fontSize: '12px', padding: '2px 12px', borderRadius: '16px', fontWeight: 700 }}>
              {totalOrders} Orders
            </span>
          </div>

          <div className="table-actions-container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            {/* Search Box */}
            <div className="table-search-box" style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1', minWidth: '40px', maxWidth: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, color: '#667085', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search here..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                onKeyDown={e => e.key === 'Enter' && fetchOrders()}
                ref={searchInputRef}
                className="responsive-search-input"
                style={{
                  width: '100%',
                  padding: '10px 48px 10px 38px',
                  border: '1px solid #D0D5DD',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#F9FAFB',
                  outline: 'none',
                  fontWeight: 500,
                  color: '#101828'
                }}
              />
              <div className="desktop-only" style={{ position: 'absolute', right: 10, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', border: '1px solid #D0D5DD', borderRadius: '6px', backgroundColor: '#fff', fontSize: '11px', color: '#667085', fontWeight: 700 }}>
                Ctrl L
              </div>
            </div>

            {/* Action Buttons */}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="btn-collapse-on-search"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #D0D5DD', borderRadius: '8px', backgroundColor: showFilters ? '#F9FAFB' : '#fff', fontSize: '14px', fontWeight: 600, color: '#344054', cursor: 'pointer' }}
              >
                <Filter size={16} color="#667085" />
                <span className="desktop-only" style={{ marginLeft: '4px' }}>Filter</span> {statusFilter && <span style={{ width: '6px', height: '6px', borderRadius: 'full', backgroundColor: '#7F56D9' }}></span>}
              </button>

            <button
              className="btn-collapse-on-search"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #D0D5DD', borderRadius: '8px', backgroundColor: '#fff', fontSize: '14px', fontWeight: 600, color: '#344054', cursor: 'pointer' }}
              onClick={handleExport}
            >
              <Download size={16} color="#667085" />
              <span className="desktop-only" style={{ marginLeft: '4px' }}>Export Data</span>
            </button>
          </div>
        </div>
        </div>

      {/* Integrated Horizontal Filter Bar (Inline) */}
      {showFilters && (
        <div style={{ 
          padding: '16px 24px', 
          backgroundColor: '#F9FAFB', 
          borderBottom: '1px solid #EAECF0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: '16px',
          animation: 'slideDown 0.2s ease-out'
        }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '10px', fontWeight: 800, color: '#667085', marginBottom: '6px', letterSpacing: '0.05em' }}>Filter by Status</label>
            <div className="relative group" style={{ position: 'relative' }}>
              <select 
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '10px 32px 10px 12px', border: '1px solid #D0D5DD', borderRadius: '8px', fontSize: '14px', fontWeight: 600, appearance: 'none', background: 'white', outline: 'none' }}
              >
                <option value="">All Statuses</option>
                {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#667085' }} />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flex: '2', minWidth: '320px' }}>
            <div style={{ flex: '1' }}>
              <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '10px', fontWeight: 800, color: '#667085', marginBottom: '6px', letterSpacing: '0.05em' }}>Date From</label>
              <input 
                type="date" 
                value={dateFilter.from}
                onChange={(e) => { setDateFilter({...dateFilter, from: e.target.value}); setPage(1); }}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: '8px', fontSize: '14px', fontWeight: 500, outline: 'none' }}
              />
            </div>
            <div style={{ flex: '1' }}>
              <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '10px', fontWeight: 800, color: '#667085', marginBottom: '6px', letterSpacing: '0.05em' }}>Date To</label>
              <input 
                type="date" 
                value={dateFilter.to}
                onChange={(e) => { setDateFilter({...dateFilter, to: e.target.value}); setPage(1); }}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: '8px', fontSize: '14px', fontWeight: 500, outline: 'none' }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => { setStatusFilter(''); setDateFilter({from:'', to:''}); }}
              style={{ padding: '10px 16px', background: '#fff', border: '1px solid #D0D5DD', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#344054', cursor: 'pointer' }}
            >
              Reset
            </button>
            <button 
              onClick={() => setShowFilters(false)}
              style={{ padding: '10px 16px', background: '#7F56D9', border: '1px solid #7F56D9', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto scrollbar-hide">
        <table className="figma-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fff', borderBottom: '1px solid #EAECF0' }}>
              <th style={{ padding: '12px 24px', width: 40, textAlign: 'left' }}><input type="checkbox" /></th>
              <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 500, textAlign: 'left' }}>Order ID <ArrowUpDown size={10} style={{ marginLeft: 4 }} /></th>
              <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 500, textAlign: 'left' }}>Customer Name</th>
              <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 500, textAlign: 'left' }}>Items</th>
              <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 500, textAlign: 'left' }}>Prescription Status <ArrowUpDown size={10} style={{ marginLeft: 4 }} /></th>
              <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 500, textAlign: 'left' }}>total (₹)</th>
              <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 500, textAlign: 'right' }}>action</th>
            </tr>
          </thead>
          <tbody style={{ backgroundColor: '#fff' }}>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667085' }}>
                      <Package size={24} />
                    </div>
                    <div style={{ fontWeight: 600, color: '#101828' }}>No orders yet</div>
                    <div style={{ fontSize: '14px', color: '#667085' }}>Orders will appear here once they are added.</div>
                  </div>
                </td>
              </tr>
            ) : orders.map((o, idx) => (
              <React.Fragment key={o.id || idx}>
                {/* Main Order Row */}
                <tr 
                  onClick={() => toggleRow(o.id)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #EAECF0', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : '#fff', transition: 'background 0.2s' }}
                >
                  <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div onClick={(e) => { e.stopPropagation(); toggleRow(o.id); }} style={{ color: '#98A2B3' }}>
                        {expandedRows.includes(o.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                      <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <span style={{ fontWeight: 600, color: '#344054' }}>#{o.id}</span>
                       {o.items?.length > 1 && <span style={{ backgroundColor: '#F4EBFF', color: '#7F56D9', fontSize: '11px', padding: '1px 6px', borderRadius: '16px', fontWeight: 700 }}>{o.items.length}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: 600, color: '#101828', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                    {o.customer_name || 'Walking Customer'}
                  </td>
                  <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                       <div style={{ width: 40, height: 40, border: '1px solid #EAECF0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', overflow: 'hidden' }}>
                          {o.items?.[0]?.variant_image ? (
                             <img src={o.items[0].variant_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                             <Glasses size={20} color="#D0D5DD" />
                          )}
                       </div>
                       <div>
                          <div style={{ fontWeight: 500, color: '#344054', fontSize: '14px' }}>{o.items?.[0]?.variant_name || 'Generic Product'}</div>
                          <div style={{ fontSize: '12px', color: '#667085' }}>{o.items?.[0]?.lens_desc || 'No Description'}</div>
                       </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                     <span style={{ 
                        backgroundColor: (o.status_label || '').toLowerCase() === 'approved' ? '#ECFDF3' : '#FFFAEB', 
                        color: (o.status_label || '').toLowerCase() === 'approved' ? '#027A48' : '#B54708', 
                        padding: '4px 12px', 
                        borderRadius: '16px', 
                        fontSize: '12px', 
                        fontWeight: 600 
                     }}>
                        {o.status_label || 'Pending'}
                     </span>
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: 700, color: '#101828', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                     ₹{Number(o.total_amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                     <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <div 
                           onClick={(e) => { e.stopPropagation(); handleEdit(o); }}
                           style={{ width: 34, height: 34, border: '1px solid #EAECF0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085' }}
                           title="Edit Order"
                        >
                           <Edit2 size={16} />
                        </div>
                        <div 
                           onClick={(e) => { e.stopPropagation(); handleDelete(o); }}
                           style={{ width: 34, height: 34, border: '1px solid #EAECF0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085' }}
                           title="Delete Order"
                        >
                           <Trash2 size={16} />
                        </div>
                        <div className="relative">
                           <div 
                              onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === o.id ? null : o.id); }}
                              style={{ width: 34, height: 34, border: '1px solid #EAECF0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: openDropdown === o.id ? '#F9FAFB' : '#ffffff', color: '#667085' }}
                           >
                              <MoreVertical size={14} />
                           </div>
                           
                           {openDropdown === o.id && (
                              <>
                                 <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }}></div>
                                 <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-lg shadow-xl z-[101] overflow-hidden">
                                 <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); toggleRow(o.id); }} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 700, color: '#344054', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderBottom: '1px solid #F2F4F7' }}>
                                    <FileText size={14} /> View Details
                                 </div>
                                 <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); handleEdit(o); }} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 700, color: '#344054', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderBottom: '1px solid #F2F4F7' }}>
                                    <Edit2 size={14} /> Edit Order
                                 </div>
                                 <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); handleDownloadPDF(o); }} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 700, color: '#344054', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderBottom: '1px solid #F2F4F7' }}>
                                    <FileDown size={14} /> Download PDF
                                 </div>
                                 <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); handleDelete(o); }} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 700, color: '#F04438', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <Trash2 size={14} /> Delete Order
                                 </div>
                                 </div>
                              </>
                           )}
                        </div>
                     </div>
                  </td>
                </tr>

                {/* Sub-row Expanded detail (Pixel-Perfect Alignment & Grid Refactor) */}
                {expandedRows.includes(o.id) && (
                  <tr style={{ background: '#F9F5FF' }}>
                    <td colSpan={7} style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                      <div style={{ backgroundColor: '#ffffff', border: '1px solid #EAECF0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        {o.items?.map((item, si) => (
                          <div 
                            key={item.id || si} 
                            style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '144px 1.25fr 2fr 180px 160px 140px', 
                              alignItems: 'center', 
                              padding: '0', 
                              borderBottom: si === o.items.length - 1 ? 'none' : '1px solid #F2F4F7',
                              background: '#ffffff'
                            }}
                          >
                            <div style={{ height: '40px' }}></div> {/* Matches Checkbox + ID column width */}
                            
                            <div style={{ padding: '20px 24px', fontWeight: 600, color: '#101828', fontSize: '15px' }}>
                              {item.patient_name || item.customer_name || o.customer_name}
                            </div>

                            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ width: '40px', height: '40px', border: '1px solid #F2F4F7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', flexShrink: 0 }}>
                                <Glasses size={20} color="#D0D5DD" />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#344054', lineHeight: 1.2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.variant_name}</div>
                                <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px' }}>{item.lens_desc || 'Standard Edition'}</div>
                              </div>
                            </div>

                            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              <div style={{ fontSize: '9px', fontWeight: 800, color: '#667085', letterSpacing: '0.05em' }}>PRESCRIPTION</div>
                              <span style={{ 
                                backgroundColor: (item.prescription_status || item.status || '').toLowerCase() === 'approved' ? '#ECFDF3' : '#FFFAEB', 
                                color: (item.prescription_status || item.status || '').toLowerCase() === 'approved' ? '#027A48' : '#B54708', 
                                padding: '4px 12px', 
                                borderRadius: '16px', 
                                fontSize: '11px', 
                                fontWeight: 800,
                                border: `1px solid ${(item.prescription_status || item.status || '').toLowerCase() === 'approved' ? '#D1FADF' : '#FEF0C7'}`
                              }}>
                                {item.prescription_status || item.status || 'Pending'}
                              </span>
                            </div>

                            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', fontWeight: 700, color: '#101828', fontSize: '15px' }}>
                              ₹{Number(item.price || item.unit_price || item.price_at_purchase || 0).toLocaleString('en-IN')}
                              <div 
                                onClick={(e) => { e.stopPropagation(); handleDownloadPDF(o); }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F04438', color: '#ffffff', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}
                                title="Download PDF"
                              >
                                <FileDown size={11} strokeWidth={3} />
                              </div>
                            </div>

                            <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEdit(o); }}
                                style={{ width: '34px', height: '34px', border: '1px solid #EAECF0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085' }}
                              >
                                <Edit size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Premium Pagination Strip */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #EAECF0', backgroundColor: '#fff', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600, color: '#344054' }}>
          <span>Rows per page</span>
          <div style={{ position: 'relative' }}>
            <select 
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              style={{ padding: '8px 32px 8px 12px', border: '1px solid #D0D5DD', borderRadius: '8px', fontSize: '14px', fontWeight: 700, backgroundColor: '#fff', appearance: 'none', cursor: 'pointer', outline: 'none' }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#667085' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', border: '1px solid #D0D5DD', borderRadius: '8px', background: '#fff', fontSize: '14px', fontWeight: 600, color: '#344054', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  style={{ 
                    width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                    backgroundColor: page === n ? '#F9F5FF' : 'transparent',
                    color: page === n ? '#7F56D9' : '#667085',
                    border: page === n ? '1px solid #D6BBFB' : 'none'
                  }}
                >
                  {n}
                </button>
              ))}
              {totalPages > 3 && <span style={{ padding: '0 8px', color: '#D0D5DD' }}>...</span>}
              {totalPages > 3 && (
                <button
                  onClick={() => setPage(totalPages)}
                  style={{ 
                    width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                    backgroundColor: page === totalPages ? '#F9F5FF' : 'transparent',
                    color: page === totalPages ? '#7F56D9' : '#667085',
                    border: page === totalPages ? '1px solid #D6BBFB' : 'none'
                  }}
                >
                  {totalPages}
                </button>
              )}
            </div>

            <button
              disabled={page >= totalPages || totalPages === 0}
              onClick={() => setPage(p => p + 1)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', border: '1px solid #D0D5DD', borderRadius: '8px', background: '#fff', fontSize: '14px', fontWeight: 600, color: '#344054', cursor: (page >= totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', opacity: (page >= totalPages || totalPages === 0) ? 0.5 : 1 }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ fontSize: '14px', fontWeight: 600, color: '#667085' }}>
          Showing {orders.length ? (page - 1) * perPage + 1 : 0} - {Math.min(page * perPage, totalOrders)} of {totalOrders}
        </div>
      </div>

      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
        onDelete={() => deleteOrder(selectedOrder?.id)}
        mode={formMode}
        title="Order"
        fields={orderFormFields}
        initialData={selectedOrder ? { ...selectedOrder, status: selectedOrder.status } : {}}
      />
    </div>
  );
};

export default OrderTable;
