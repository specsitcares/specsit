import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Download,
  ChevronDown, ChevronRight, ChevronLeft,
  Edit, Trash2, FileText,
  Clock, Package, ArrowUpDown, FileDown, Glasses, Edit2, Briefcase, Check,
  RefreshCw, CircleDollarSign, Truck, ShieldCheck
} from 'lucide-react';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import AdminLoadingState from './AdminLoadingState';

const STATUS_CLASS = {
  pending:               'badge-warning',
  confirmed:             'badge-warning',
  preparing:             'badge-info',
  processing:            'badge-info',
  'ready for dispatch':  'badge-info',
  'in transit':          'badge-info',
  shipped:               'badge-info',
  delivering:            'badge-info',
  delivered:             'badge-success',
  completed:             'badge-success',
  cancelled:             'badge-error',
};

const STATUS_BADGE_STYLE = {
  'badge-success': { bg: '#ECFDF3', color: '#039855' },
  'badge-warning': { bg: '#FFFAEB', color: '#B54708' },
  'badge-error':   { bg: '#FEF3F2', color: '#D1242F' },
  'badge-info':    { bg: '#EFF8FF', color: '#175CD3' },
  'badge-neutral': { bg: '#F2F4F7', color: '#344054' },
};

const getStatusClass = (label) =>
  STATUS_CLASS[(label || '').toLowerCase()] || 'badge-neutral';

const OrderTable = ({ category = null, onViewDetails }) => {
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
  const [goToInputVal, setGoToInputVal] = useState('1');
  const [orderAnalytics, setOrderAnalytics] = useState(null);
  const [activeReturnTab, setActiveReturnTab] = useState('window'); // 'window', 'requests', 'refund', 'replacement'
  const [activeWarrantyTab, setActiveWarrantyTab] = useState('window'); // 'window', 'claimed', 'not_claimed'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [qcLightbox, setQcLightbox] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const res = await apiClient.get('/sales/orders/analytics/', {
        params: {
          view_preset: category,
          search: searchQuery,
          status: statusFilter,
          date_from: dateFilter.from,
          date_to: dateFilter.to
        }
      });
      setOrderAnalytics(res.data);
    } catch { /* silent */ }
  };

  // Sync category resets
  useEffect(() => {
    setPage(1);
    setSearchQuery('');
    setStatusFilter('');
    setDateFilter({ from: '', to: '' });
  }, [category]);

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

  useEffect(() => {
    fetchOrders(); fetchMetadata(); fetchAnalytics();
  }, [page, perPage, searchQuery, statusFilter, dateFilter.from, dateFilter.to, category, activeWarrantyTab, activeReturnTab]);

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
          page_size: perPage,
          limit: perPage,
          view_preset: category,
          ordering: '-created_at',
          search: searchQuery,
          status: statusFilter,
          date_from: dateFilter.from,
          date_to: dateFilter.to
        }
      });
      const data = res.data;
      const results = data.results || data.data || data;
      if (Array.isArray(results)) {
        setOrders(results);
        setTotalOrders(data.count !== undefined ? data.count : results.length);
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
    if (category === 'returns') {
      alert(`Opening Return Management for Order #LO-${String(o.id).padStart(7, '0')}`);
      // Place for return specialized logic
      return;
    }
    if (category === 'warranty') {
      alert(`Opening Warranty Verification for Order #LO-${String(o.id).padStart(7, '0')}`);
      // Place for warranty specialized logic
      return;
    }
    setSelectedOrder(o);
    setFormMode('edit');
    setShowForm(true);
  };

  const handleDelete = (o) => {
    console.log('Delete clicked for order:', o.id);
    if (window.confirm(`Are you sure you want to delete Order #LO-${String(o.id).padStart(7, '0')}?`)) {
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

  const refreshData = () => { fetchOrders(); fetchAnalytics(); };

  const deleteOrder = async (id) => {
    try {
      await apiClient.delete(`/sales/orders/${id}/`);
      alert('Order deleted successfully');
      refreshData();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete order. Please check permissions.');
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} order(s)?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.delete(`/sales/orders/${id}/`).catch(() => {})));
    setSelectedIds(new Set());
    refreshData();
  };

  const bulkMarkDelivered = async () => {
    if (!window.confirm(`Mark ${selectedIds.size} order(s) as Delivered?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.post(`/sales/orders/${id}/mark_delivered/`).catch(() => {})));
    setSelectedIds(new Set());
    refreshData();
  };

  const toggleSelectOrder = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleFormSubmit = async (formData) => {
    try {
      await apiClient.patch(`/sales/orders/${selectedOrder.id}/`, formData);
      setShowForm(false);
      alert('Order updated successfully');
      refreshData();
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

  const totalPages = Math.ceil(totalOrders / perPage) || 1;

  // Sync go-to input with current page
  useEffect(() => { setGoToInputVal(String(page)); }, [page]);

  if (loading) return (
    <div style={{ padding: '24px' }}>
      <AdminLoadingState loading={true} label="orders" colWidths={['30%', '15%', '12%', '12%', '12%', '10%', '9%']} />
    </div>
  );

  return (
    <div className="orders-page-container-v3" style={{ padding: '0px' }}>

      {/* Analytics Cards Row (Visual Parity) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {(category === 'returns' ? [
          { title: 'Items in Return Window', value: orderAnalytics?.total ?? 0, trendValue: Math.abs(orderAnalytics?.trends?.total || 0), trend: (orderAnalytics?.trends?.total >= 0) ? 'up' : 'down', icon: <Package size={20} /> },
          { title: 'Total Return Requests', value: orderAnalytics?.pending ?? 0, trendValue: Math.abs(orderAnalytics?.trends?.pending || 0), trend: (orderAnalytics?.trends?.pending >= 0) ? 'up' : 'down', icon: <Clock size={20} /> },
          { title: 'Returns for Refund', value: orderAnalytics?.processing ?? 0, trendValue: Math.abs(orderAnalytics?.trends?.processing || 0), trend: (orderAnalytics?.trends?.processing >= 0) ? 'up' : 'down', icon: <CircleDollarSign size={20} /> },
          { title: 'Returns for Replacement', value: 0, trendValue: 0, trend: 'up', icon: <RefreshCw size={20} /> },
          { title: 'Total Refund Amount', value: `₹${((orderAnalytics?.processing || 0) * 1250).toLocaleString()}`, trendValue: 0, trend: 'up', icon: <Briefcase size={20} /> }
        ] : category === 'warranty' ? [
          { title: 'Total Warranty Window', value: orderAnalytics?.total ?? 0, trendValue: Math.abs(orderAnalytics?.trends?.total || 0), trend: (orderAnalytics?.trends?.total >= 0) ? 'up' : 'down', icon: <ShieldCheck size={20} /> },
          { title: 'Warranty Claimed', value: 0, trendValue: 0, trend: 'up', icon: <Briefcase size={20} /> },
          { title: 'Unclaimed Warranty', value: orderAnalytics?.total ?? 0, trendValue: Math.abs(orderAnalytics?.trends?.pending || 0), trend: 'down', icon: <Package size={20} /> },
          { title: 'Service Pending', value: orderAnalytics?.processing ?? 0, trendValue: 5, trend: 'up', icon: <RefreshCw size={20} /> }
        ] : [
          { title: 'Total Orders', value: orderAnalytics?.total ?? 0, trendValue: Math.abs(orderAnalytics?.trends?.total || 0), trend: (orderAnalytics?.trends?.total >= 0) ? 'up' : 'down', icon: <Briefcase size={20} /> },
          { title: 'Pending', value: orderAnalytics?.pending ?? 0, trendValue: Math.abs(orderAnalytics?.trends?.pending || 0), trend: (orderAnalytics?.trends?.pending >= 0) ? 'up' : 'down', icon: <Clock size={20} /> },
          { title: 'Processing', value: orderAnalytics?.processing ?? 0, trendValue: Math.abs(orderAnalytics?.trends?.processing || 0), trend: (orderAnalytics?.trends?.processing >= 0) ? 'up' : 'down', icon: <RefreshCw size={20} /> },
          { title: 'Shipped', value: orderAnalytics?.shipped ?? 0, trendValue: Math.abs(orderAnalytics?.trends?.shipped || 0), trend: (orderAnalytics?.trends?.shipped >= 0) ? 'up' : 'down', icon: <Truck size={20} /> }
        ]).map((c, i) => (
          <div key={i} style={{ backgroundColor: '#fff', border: '1px solid #EAECF0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#F9F5FF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7F56D9' }}>
                {c.icon || <Briefcase size={20} />}
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ color: '#667085', fontSize: '14px', fontWeight: 600 }}>{c.title}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#101828' }}>{c.value}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: c.trend === 'up' ? '#12B76A' : '#F04438', display: 'flex', alignItems: 'center', gap: 2, fontWeight: 700 }}>
                  {c.trend === 'up' ? '↗' : '↘'} {c.trendValue}%
                </span>
                <span style={{ fontSize: '11px', color: '#667085', fontWeight: 500 }}>{orderAnalytics?.trendPeriod || 'last period'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="orders-table-card-v2" style={{ backgroundColor: '#fff', border: '1px solid #EAECF0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16, 24, 40, 0.1), 0 1px 2px rgba(16, 24, 40, 0.06)' }}>
        {/* Table Header Section (Inline-Styled for Guaranteed Alignment) */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #EAECF0', backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#101828', margin: 0 }}>
                {category === 'returns' ? 'Returns & Replacements' : category === 'warranty' ? 'Orders (Warranty Window)' : 'Recent Orders'}
              </h3>
              {category === 'returns' && (
                <div style={{ display: 'flex', background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: '8px', padding: '2px', marginLeft: '12px' }}>
                  <button
                    onClick={() => setActiveReturnTab('window')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', background: activeReturnTab === 'window' ? '#fff' : 'transparent', color: activeReturnTab === 'window' ? '#7F56D9' : '#667085', boxShadow: activeReturnTab === 'window' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
                  >In Window</button>
                  <button
                    onClick={() => setActiveReturnTab('requests')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', background: activeReturnTab === 'requests' ? '#fff' : 'transparent', color: activeReturnTab === 'requests' ? '#7F56D9' : '#667085', boxShadow: activeReturnTab === 'requests' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
                  >Requests</button>
                  <button
                    onClick={() => setActiveReturnTab('refund')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', background: activeReturnTab === 'refund' ? '#fff' : 'transparent', color: activeReturnTab === 'refund' ? '#7F56D9' : '#667085', boxShadow: activeReturnTab === 'refund' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
                  >Refund</button>
                  <button
                    onClick={() => setActiveReturnTab('replacement')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', background: activeReturnTab === 'replacement' ? '#fff' : 'transparent', color: activeReturnTab === 'replacement' ? '#7F56D9' : '#667085', boxShadow: activeReturnTab === 'replacement' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
                  >Replacement</button>
                </div>
              )}
              {category === 'warranty' && (
                <div style={{ display: 'flex', background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: '8px', padding: '2px', marginLeft: '12px' }}>
                  <button
                    onClick={() => setActiveWarrantyTab('window')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', background: activeWarrantyTab === 'window' ? '#fff' : 'transparent', color: activeWarrantyTab === 'window' ? '#7F56D9' : '#667085', boxShadow: activeWarrantyTab === 'window' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
                  >In Window</button>
                  <button
                    onClick={() => setActiveWarrantyTab('requests_received')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', background: activeWarrantyTab === 'requests_received' ? '#fff' : 'transparent', color: activeWarrantyTab === 'requests_received' ? '#7F56D9' : '#667085', boxShadow: activeWarrantyTab === 'requests_received' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
                  >Requests Received</button>
                  <button
                    onClick={() => setActiveWarrantyTab('not_claimed')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', background: activeWarrantyTab === 'not_claimed' ? '#fff' : 'transparent', color: activeWarrantyTab === 'not_claimed' ? '#7F56D9' : '#667085', boxShadow: activeWarrantyTab === 'not_claimed' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
                  >Not Claimed</button>
                  <button
                    onClick={() => setActiveWarrantyTab('claimed')}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', background: activeWarrantyTab === 'claimed' ? '#fff' : 'transparent', color: activeWarrantyTab === 'claimed' ? '#7F56D9' : '#667085', boxShadow: activeWarrantyTab === 'claimed' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer' }}
                  >Claimed</button>
                </div>
              )}
              <span style={{ backgroundColor: '#F9F5FF', color: '#7F56D9', fontSize: '12px', padding: '2px 10px', borderRadius: '16px', fontWeight: 600, border: '1px solid #F4EBFF' }}>
                {totalOrders} Orders
              </span>
            </div>

            <div className="table-actions-container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
              {/* Search Box */}
              <div className="table-search-box" style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1', minWidth: '40px', maxWidth: '320px' }}>
                <Search size={18} style={{ position: 'absolute', left: 14, color: '#667085', pointerEvents: 'none' }} />
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
                    padding: '10px 48px 10px 42px',
                    border: '1px solid #D0D5DD',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: '#fff',
                    outline: 'none',
                    fontWeight: 500,
                    color: '#101828',
                    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)'
                  }}
                />
                <div className="desktop-only" style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', border: '1px solid #D0D5DD', borderRadius: '6px', backgroundColor: '#fff', fontSize: '12px', color: '#667085', fontWeight: 600 }}>
                  <span style={{ fontSize: '10px' }}>⌘</span> L
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-collapse-on-search"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #D0D5DD', borderRadius: '8px', backgroundColor: showFilters ? '#F9FAFB' : '#fff', fontSize: '14px', fontWeight: 600, color: '#344054', cursor: 'pointer', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
              >
                <Filter size={18} color="#667085" />
                <span className="desktop-only">Filter</span> {statusFilter && <span style={{ width: '6px', height: '6px', borderRadius: 'full', backgroundColor: '#7F56D9' }}></span>}
              </button>

              <button
                className="btn-collapse-on-search"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #D0D5DD', borderRadius: '8px', backgroundColor: '#fff', fontSize: '14px', fontWeight: 600, color: '#344054', cursor: 'pointer', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
                onClick={handleExport}
              >
                <Download size={18} color="#667085" />
                <span className="desktop-only">Export Data</span>
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
                  onChange={(e) => { setDateFilter({ ...dateFilter, from: e.target.value }); setPage(1); }}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: '8px', fontSize: '14px', fontWeight: 500, outline: 'none' }}
                />
              </div>
              <div style={{ flex: '1' }}>
                <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '10px', fontWeight: 800, color: '#667085', marginBottom: '6px', letterSpacing: '0.05em' }}>Date To</label>
                <input
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) => { setDateFilter({ ...dateFilter, to: e.target.value }); setPage(1); }}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #D0D5DD', borderRadius: '8px', fontSize: '14px', fontWeight: 500, outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setStatusFilter(''); setDateFilter({ from: '', to: '' }); }}
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

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div style={{ padding: '12px 24px', background: '#7F56D9', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{selectedIds.size} selected</span>
            <button onClick={bulkMarkDelivered} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#12B76A', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Truck size={14} /> Mark Delivered
            </button>
            <button onClick={bulkDelete} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#FEF3F2', color: '#B42318', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} /> Delete
            </button>
            <button onClick={() => setSelectedIds(new Set())} style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Clear selection
            </button>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto scrollbar-hide">
          <table className="figma-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fff', borderBottom: '1px solid #EAECF0' }}>
                <th style={{ padding: '12px 24px', width: 40, textAlign: 'left' }}>
                  <input type="checkbox"
                    checked={orders.length > 0 && orders.every(o => selectedIds.has(o.id))}
                    ref={el => { if (el) el.indeterminate = orders.some(o => selectedIds.has(o.id)) && !orders.every(o => selectedIds.has(o.id)); }}
                    onChange={e => e.target.checked ? setSelectedIds(new Set(orders.map(o => o.id))) : setSelectedIds(new Set())}
                    style={{ cursor: 'pointer', borderRadius: '4px', accentColor: '#7F56D9' }}
                  />
                </th>
                <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left', textTransform: 'capitalize' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Order <ArrowUpDown size={12} /></div>
                </th>
                <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left', textTransform: 'capitalize' }}>Customer Name</th>
                <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left', textTransform: 'capitalize' }}>Items</th>

                {/* Granular Return Sub-tab Headers */}
                {category === 'returns' ? (
                  <>
                    {activeReturnTab === 'window' && (
                      <>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Refund Status</th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Refund Amount</th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Return Reason</th>
                      </>
                    )}
                    {activeReturnTab === 'requests' && (
                      <>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Date Raised</th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Request For</th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Wait Time</th>
                      </>
                    )}
                    {activeReturnTab === 'refund' && (
                      <>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Refunded Date</th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Amount Refunded</th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Refund Status</th>
                      </>
                    )}
                    {activeReturnTab === 'replacement' && (
                      <>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Repl. Date</th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Replaced SKU</th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Tracking ID</th>
                      </>
                    )}
                  </>
                ) : category === 'warranty' ? (
                  <>
                    <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Warranty Status</th>
                    <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Purchase Amount</th>
                    <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Protection Plan</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Prescription</th>
                    <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>Total</th>
                    <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left' }}>QC</th>
                  </>
                )}

                <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'left', textTransform: 'capitalize' }}>Status</th>
                <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 600, textAlign: 'right' }}>action</th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: '#fff' }}>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 24px', textAlign: 'center' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div onClick={(e) => { e.stopPropagation(); toggleRow(o.id); }} style={{ color: '#667085', cursor: 'pointer' }}>
                          {expandedRows.includes(o.id) ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
                        </div>
                        <input type="checkbox"
                          checked={selectedIds.has(o.id)}
                          onChange={(e) => toggleSelectOrder(o.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer', borderRadius: '4px', accentColor: '#7F56D9' }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#344054', fontSize: '14px' }}>
                            #LO-{String(o.id).padStart(7, '0')}
                            {o.items?.length > 1 && <span style={{ marginLeft: 6, backgroundColor: '#F4EBFF', color: '#7F56D9', fontSize: '11px', padding: '1px 6px', borderRadius: '16px', fontWeight: 700 }}>{o.items.length}</span>}
                          </div>
                        </div>
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
                          <div style={{ fontWeight: 500, color: '#344054', fontSize: '14px' }}>{o.items?.[0]?.variant_name || o.items?.[0]?.variant_sku || 'Standard Glasses'}</div>
                          <div style={{ fontSize: '12px', color: '#667085' }}>{o.items?.[0]?.lens_desc || 'No Description'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Logic-Driven Granular Return Sub-tab Cells */}
                    {category === 'returns' ? (
                      <>
                        {activeReturnTab === 'window' && (
                          <>
                            <td style={{ padding: '16px 24px' }}>
                              <span style={{ backgroundColor: '#ECFDF3', color: '#027A48', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>Active</span>
                            </td>
                            <td style={{ padding: '16px 24px', fontWeight: 700 }}>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                            <td style={{ padding: '16px 24px', color: '#667085' }}>{idx % 2 === 0 ? 'Defective' : 'Size Issue'}</td>
                          </>
                        )}
                        {activeReturnTab === 'requests' && (
                          <>
                            <td style={{ padding: '16px 24px', color: '#667085' }}>{new Date(o.created_at).toLocaleDateString('en-GB')}</td>
                            <td style={{ padding: '16px 24px', fontWeight: 600 }}>{idx % 2 === 0 ? 'Refund' : 'Replacement'}</td>
                            <td style={{ padding: '16px 24px', color: '#667085' }}>4h 12m</td>
                          </>
                        )}
                        {activeReturnTab === 'refund' && (
                          <>
                            <td style={{ padding: '16px 24px', color: '#667085' }}>{new Date(new Date(o.created_at).getTime() + 86400000).toLocaleDateString('en-GB')}</td>
                            <td style={{ padding: '16px 24px', fontWeight: 700, color: '#12B76A' }}>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                            <td style={{ padding: '16px 24px' }}>
                              <span style={{ backgroundColor: o.status_label === 'Refunded' ? '#ECFDF3' : '#FFFAEB', color: o.status_label === 'Refunded' ? '#027A48' : '#B54708', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                {o.status_label === 'Refunded' ? 'Refunded' : 'Processing'}
                              </span>
                            </td>
                          </>
                        )}
                        {activeReturnTab === 'replacement' && (
                          <>
                            <td style={{ padding: '16px 24px', color: '#667085' }}>{new Date(new Date(o.created_at).getTime() + 172800000).toLocaleDateString('en-GB')}</td>
                            <td style={{ padding: '16px 24px', fontWeight: 600, color: '#7F56D9' }}>{o.items?.[0]?.variant_sku || 'SKU'}-REPL</td>
                            <td style={{ padding: '16px 24px', color: '#667085', fontSize: '12px' }}>{o.id}REPL-TRACKING</td>
                          </>
                        )}
                      </>
                    ) : category === 'warranty' ? (
                      <>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ backgroundColor: '#ECFDF3', color: '#027A48', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>In Window</span>
                        </td>
                        <td style={{ padding: '16px 24px', fontWeight: 700 }}>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '16px 24px', color: '#667085' }}>Standard 1-Year</td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '16px 24px', color: '#667085' }}>{new Date(o.created_at).toLocaleDateString('en-GB')}</td>
                        <td style={{ padding: '16px 24px' }}>
                          {(() => {
                            const ps = (o.items?.[0]?.prescription_status || 'Frame Only');
                            const psl = ps.toLowerCase();
                            const bg = psl === 'approved' ? '#ECFDF3' : psl === 'frame only' ? '#F2F4F7' : '#FFFAEB';
                            const color = psl === 'approved' ? '#027A48' : psl === 'frame only' ? '#344054' : '#B54708';
                            return (
                              <span style={{ backgroundColor: bg, color, padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                {ps}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '16px 24px', fontWeight: 700 }}>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '16px 24px' }}>
                          {o.tracking?.qc_image_url ? (
                            <img
                              src={o.tracking.qc_image_url}
                              alt="QC"
                              onClick={(e) => { e.stopPropagation(); setQcLightbox(o.tracking.qc_image_url); }}
                              style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid #D0D5DD', cursor: 'pointer' }}
                              title="View QC image"
                            />
                          ) : (
                            <span style={{ backgroundColor: '#FFFAEB', color: '#B54708', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>Pending</span>
                          )}
                        </td>
                      </>
                    )}
                    <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                      <span style={{
                        backgroundColor: STATUS_BADGE_STYLE[getStatusClass(o.status_label)].bg,
                        color: STATUS_BADGE_STYLE[getStatusClass(o.status_label)].color,
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        {o.status_label || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px' }}>
                        <div
                          onClick={(e) => { e.stopPropagation(); onViewDetails(o.id); }}
                          style={{ width: '40px', height: '40px', backgroundColor: '#32D583', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ffffff', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
                          title="View Details"
                        >
                          <Check size={20} strokeWidth={3} />
                        </div>
                        <div
                          onClick={(e) => { e.stopPropagation(); handleDelete(o); }}
                          style={{ width: '40px', height: '40px', backgroundColor: '#ffffff', border: '1px solid #EAECF0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#F04438', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
                          title="Delete Order"
                        >
                          <Trash2 size={20} />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Sub-row Expanded detail (Pixel-Perfect Alignment & Grid Refactor) */}
                  {expandedRows.includes(o.id) && (
                    <tr style={{ background: '#F9FAFB' }}>
                      <td colSpan={10} style={{ padding: '12px 24px' }}>
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #EAECF0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                          {(o.items || []).length > 0 ? (o.items?.map((item, si) => (
                            <div
                              key={item.id || si}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '80px 1.2fr 1.8fr 180px 160px 100px',
                                alignItems: 'center',
                                padding: '2px 0',
                                borderBottom: si === o.items.length - 1 ? 'none' : '1px solid #F2F4F7',
                                background: '#ffffff'
                              }}
                            >
                              <div style={{ width: 80 }}></div>

                              <div style={{ padding: '16px 0', fontWeight: 600, color: '#101828', fontSize: '14px' }}>
                                {item.patient_name || item.customer_name || o.customer_name}
                              </div>

                              <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', border: '1px solid #EAECF0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', flexShrink: 0, overflow: 'hidden' }}>
                                  {item.variant_image ? (
                                    <img src={item.variant_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <Glasses size={20} color="#D0D5DD" />
                                  )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#344054', lineHeight: 1.2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.variant_name || item.variant_sku || 'Glasses Frame'}</div>
                                  <div style={{ fontSize: '12px', color: '#667085', marginTop: '2px' }}>{item.lens_desc || 'Standard Edition'}</div>
                                </div>
                              </div>

                              <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'flex-start' }}>
                                {(() => {
                                  const ps = item.prescription_status || item.status || 'Frame Only';
                                  const psl = ps.toLowerCase();
                                  const bg = psl === 'approved' ? '#ECFDF3' : psl === 'frame only' ? '#F2F4F7' : '#FFFAEB';
                                  const color = psl === 'approved' ? '#027A48' : psl === 'frame only' ? '#344054' : '#B54708';
                                  const border = psl === 'approved' ? '#D1FADF' : psl === 'frame only' ? '#EAECF0' : '#FEDF89';
                                  return (
                                    <span style={{ backgroundColor: bg, color, padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 700, border: `1px solid ${border}` }}>
                                      {ps}
                                    </span>
                                  );
                                })()}
                              </div>

                              <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#101828', fontSize: '15px' }}>
                                ₹{Number(item.price || item.unit_price || item.price_at_purchase || 0).toLocaleString('en-IN')}
                                <div
                                  onClick={(e) => { e.stopPropagation(); handleDownloadPDF(o); }}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F04438', color: '#ffffff', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}
                                  title="Download Item PDF"
                                >
                                  <FileDown size={12} strokeWidth={2.5} />
                                </div>
                              </div>

                              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEdit(o); }}
                                  style={{ width: '36px', height: '36px', border: '1px solid #EAECF0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085' }}
                                >
                                  <Edit2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))) : (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#667085', fontSize: '14px' }}>
                              No item details found for this order.
                            </div>
                          )}
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
            <span>Rows per Page</span>
            <div style={{ position: 'relative' }}>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                style={{ padding: '8px 32px 8px 12px', border: '1px solid #D0D5DD', borderRadius: '8px', fontSize: '14px', fontWeight: 600, backgroundColor: '#fff', appearance: 'none', cursor: 'pointer', outline: 'none', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#667085' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '14px', color: page === 1 ? '#D0D5DD' : '#344054', fontWeight: 600, cursor: page === 1 ? 'default' : 'pointer', background: 'none', border: '1px solid #D0D5DD', borderRadius: '8px', padding: '6px 12px', outline: 'none' }}
            >
              <ChevronLeft size={16} /> Prev
            </button>

            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, '...', Math.max(50, totalPages)].map((n, i) => (
                <button
                  key={i}
                  onClick={() => typeof n === 'number' && setPage(n)}
                  style={{
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px',
                    background: page === n ? '#F4EBFF' : 'transparent',
                    color: page === n ? '#7F56D9' : '#475467',
                    fontWeight: page === n ? 700 : 500,
                    border: 'none', cursor: typeof n === 'number' ? 'pointer' : 'default', outline: 'none'
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              disabled={page >= totalPages || totalPages === 0}
              onClick={() => setPage(p => p + 1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '14px', color: (page >= totalPages || totalPages === 0) ? '#D0D5DD' : '#344054', fontWeight: 600, cursor: (page >= totalPages || totalPages === 0) ? 'default' : 'pointer', background: 'none', border: '1px solid #D0D5DD', borderRadius: '8px', padding: '6px 12px', outline: 'none' }}
            >
              Next <ChevronRight size={16} />
            </button>

            <span style={{ color: '#D0D5DD', margin: '0 8px' }}>/</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '14px', color: '#344054', fontWeight: 600 }}>Go to Page</span>
              <input
                type="text"
                value={goToInputVal}
                onChange={(e) => setGoToInputVal(e.target.value)}
                style={{ width: '40px', padding: '6px', border: '1px solid #D0D5DD', borderRadius: '8px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const p = parseInt(goToInputVal);
                    if (p >= 1 && p <= Math.max(50, totalPages)) setPage(p);
                  }
                }}
              />
              <button
                onClick={() => {
                  const p = parseInt(goToInputVal);
                  if (p >= 1 && p <= Math.max(50, totalPages)) setPage(p);
                }}
                style={{ color: '#344054', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
              >
                Go <ChevronRight size={14} /></button>
            </div>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 500, color: '#475467' }}>
            {totalOrders === 0 ? 'Showing 0 of 0' : `Showing ${(page - 1) * perPage + 1} - ${Math.min(page * perPage, totalOrders)} of ${totalOrders}`}
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

      {/* QC Image Lightbox */}
      {qcLightbox && (
        <div
          onClick={() => setQcLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <img
            src={qcLightbox}
            alt="QC"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
          />
          <button
            onClick={() => setQcLightbox(null)}
            style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>
      )}
    </div>
  );
};

export default OrderTable;
