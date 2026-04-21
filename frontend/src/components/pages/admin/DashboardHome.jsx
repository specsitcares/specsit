import React, { useMemo, useState, useEffect } from 'react';
import {
   DollarSign, ShoppingCart, ShoppingBag, Users, Package, Microscope, Truck,
   TrendingUp, TrendingDown, MoreVertical, Search, Filter,
   FileText, AlertTriangle, AlertCircle, ChevronDown, ChevronRight, ChevronLeft,
   Edit2, Trash2, FileDown, ArrowUpDown, Glasses
} from 'lucide-react';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
   ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import apiClient from '../../../services/api';
import FormModal from './FormModal';
import BaseAdminTable from './BaseAdminTable';

const DashboardHome = ({ statsData, recentOrders: recentOrdersProp, onOrderClick }) => {
   const [isMounted, setIsMounted] = useState(false);
   const [fetchedOrders, setFetchedOrders] = useState([]);
   const [serverTotal, setServerTotal] = useState(0);
   const [goToInputVal, setGoToInputVal] = useState('1');
   useEffect(() => {
      setIsMounted(true);
   }, []);

   const [localDonut, setLocalDonut] = useState(null);
   const [isRefreshingDonut, setIsRefreshingDonut] = useState(false);
   const [expandedRows, setExpandedRows] = useState([]);

   React.useEffect(() => {
      if (statsData?.charts?.donut) {
         setLocalDonut(statsData.charts.donut);
      }
   }, [statsData?.charts?.donut]);

   const handleRefreshDonut = async () => {
      setIsRefreshingDonut(true);
      try {
         const res = await apiClient.get('/sales/admin/stats/');
         if (res.data?.charts?.donut) {
            setLocalDonut(res.data.charts.donut);
         }
      } catch (err) {
         console.error('Failed to sync donut stats:', err);
      } finally {
         setTimeout(() => setIsRefreshingDonut(false), 800);
      }
   };
   const [searchQuery, setSearchQuery] = useState('');
   const [showForm, setShowForm] = useState(false);
   const [selectedOrder, setSelectedOrder] = useState(null);
   const [formMode, setFormMode] = useState('edit');
   const [statusOptions, setStatusOptions] = useState([]);
   const [openDropdown, setOpenDropdown] = useState(null);
   const [perPage, setPerPage] = useState(10);
   const [page, setPage] = useState(1);
   const [statusFilter, setStatusFilter] = useState('');
   const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
   const [showFilters, setShowFilters] = useState(false);
   const searchInputRef = React.useRef(null);

   React.useEffect(() => {
      const handleGlobalKey = (e) => {
         if (e.ctrlKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            searchInputRef.current?.focus();
         }
      };
      window.addEventListener('keydown', handleGlobalKey);
      return () => window.removeEventListener('keydown', handleGlobalKey);
   }, []);

   React.useEffect(() => {
      const fetchMeta = async () => {
         try {
            const resp = await apiClient.get('/core/metadata-items/', { params: { group: 'order_status' } });
            const items = resp.data.results || resp.data;
            if (Array.isArray(items)) setStatusOptions(items.map(i => ({ label: i.label, value: i.id })));
         } catch { /* silent */ }
      };
      fetchMeta();
   }, []);

   const toggleRow = (id) => {
      setExpandedRows(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
   };

   const handleEdit = (o) => {
      setSelectedOrder(o);
      setFormMode('edit');
      setShowForm(true);
   };

   const handleDelete = (o) => {
      if (window.confirm(`Delete Order #${o.id}?`)) {
         deleteOrder(o.id);
      }
   };

   const deleteOrder = async (id) => {
      try { await apiClient.delete(`/sales/orders/${id}/`); alert('Order deleted successfully'); } catch { /* silent */ }
   };

   const handleFormSubmit = async (formData) => {
      try {
         await apiClient.patch(`/sales/orders/${selectedOrder.id}/`, formData);
         setShowForm(false);
         alert('Order updated successfully');
      } catch { alert('Update failed'); }
   };

   const handleDownloadPDF = (o) => {
      alert(`Downloading Invoice PDF for Order #${o.id}...`);
      console.log('Generating PDF for order:', o.id);
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

   const statsList = useMemo(() => {
      const allowed = [
         'Total Orders', 'Total Revenue', 'Pending Prescriptions', 
         'Low Stock Products', "Today's Orders", 'Active Shipments'
      ];
      if (!statsData?.stats) {
         return [
            { title: 'Total Orders', value: '–', trend: 'down', trendValue: '' },
            { title: 'Total Revenue', value: '–', trend: 'down', trendValue: '' },
            { title: 'Pending Prescriptions', value: '–', trend: 'down', trendValue: '' },
            { title: 'Low Stock Products', value: '–', trend: 'down', trendValue: '' },
            { title: "Today's Orders", value: '–', trend: 'down', trendValue: '' },
            { title: 'Active Shipments', value: '–', trend: 'down', trendValue: '' },
         ];
      }
      return statsData.stats.filter(s => allowed.includes(s.title));
   }, [statsData]);

   const attentionList = useMemo(() => statsData?.attention || [], [statsData]);

   const chartData = useMemo(() => statsData?.charts?.line || [], [statsData]);

   const donutData = useMemo(() => statsData?.charts?.donut || [], [statsData]);
   const displayDonut = localDonut || donutData;

   const handleExport = async () => {
      console.log('Initiating dashboard export...');
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
         link.setAttribute('download', `dashboard_orders_${new Date().toISOString().split('T')[0]}.csv`);
         document.body.appendChild(link);
         link.click();

         setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
         }, 100);
      } catch (err) {
         console.error('Export failed:', err);
         alert(`Failed to export data: ${err.message}`);
      }
   };

   const isFiltering = !!(searchQuery || statusFilter || dateFilter.from || dateFilter.to);
   useEffect(() => {
      const fetchOrders = async () => {
         const todayISO = new Date().toISOString().slice(0, 10);
         try {
            const res = await apiClient.get('/sales/orders/', {
               params: {
                  page,
                  page_size: perPage,
                  limit: perPage,
                  ordering: '-created_at',
                  search: searchQuery,
                  status: statusFilter,
                  date_from: dateFilter.from || todayISO,
                  date_to: dateFilter.to || todayISO
               }
            });
            const data = res.data;
            const results = data.results || data.data || data;
            if (Array.isArray(results)) {
               if (data.count !== undefined) {
                  setFetchedOrders(results);
                  setServerTotal(data.count);
               } else {
                  setFetchedOrders(results);
                  setServerTotal(results.length);
               }
            } else {
               setFetchedOrders([]);
               setServerTotal(0);
            }
         } catch (err) {
            console.error('DashboardHome: fetch orders failed', err);
            if (recentOrdersProp?.length) {
               setFetchedOrders(recentOrdersProp);
               setServerTotal(recentOrdersProp.length);
            }
         }
      };
      fetchOrders();
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
   }, [page, perPage, searchQuery, statusFilter, dateFilter]);

   useEffect(() => {
      setPage(1);
   }, [searchQuery, statusFilter, dateFilter.from, dateFilter.to, perPage]);

   useEffect(() => {
      setGoToInputVal(String(page));
   }, [page]);

   const allOrders = fetchedOrders;
   const totalOrders = serverTotal;
   const totalPages = Math.ceil(totalOrders / perPage) || 1;
   const orders = allOrders;

   /* ─── icon + color helpers (data-driven, not hardcoded) ─── */
   const getStatIcon = (title) => {
      if (title.includes('Revenue')) return DollarSign;
      if (title.includes('Order')) return ShoppingCart;
      if (title.includes('Prescription')) return Microscope;
      if (title.includes('Stock')) return Package;
      if (title.includes('Shipment')) return Truck;
      return FileText;
   };

   const getAttentionIcon = (label) => {
      const l = label.toLowerCase();
      if (l.includes('prescription')) return FileText;
      if (l.includes('running low') || l.includes('replenished')) return AlertTriangle;
      if (l.includes('out of stock') || l.includes('blocking')) return AlertCircle;
      return Truck;
   };

   const getAttentionColor = (label) => {
      const l = label.toLowerCase();
      if (l.includes('prescription')) return '#1570EF';
      if (l.includes('running low') || l.includes('replenished')) return '#F79009';
      if (l.includes('out of stock') || l.includes('blocking')) return '#F04438';
      return '#12B76A';
   };

   const getAttentionCTA = (label) => {
      const l = label.toLowerCase();
      if (l.includes('prescription')) return 'Review All Now';
      if (l.includes('running low') || l.includes('replenished')) return 'Update Stock Now';
      if (l.includes('out of stock') || l.includes('blocking')) return 'Restock immediately';
      return 'View All Shipments';
   };

   const getPrescriptionBadgeStyle = (statuses) => {
      const all = statuses.map(s => (s || 'n/a').toLowerCase());
      const allApproved = all.length > 0 && all.every(s => s === 'approved');
      const anyPending = all.some(s => s.includes('pending'));
      const anyRejected = all.some(s => s.includes('reject') || s.includes('cancel'));
      return {
         label: allApproved ? 'Approved' : anyPending ? 'Pending' : anyRejected ? 'Rejected' : (all[0] || 'N/A'),
         color: allApproved ? '#053e26' : anyPending ? '#9e5b00' : anyRejected ? '#B42318' : '#697177',
         bg: allApproved ? '#e7fdf5' : anyPending ? '#fff4e5' : anyRejected ? '#FEF3F2' : '#F9FAFB',
         border: 'transparent',
      };
   };

   /* ═══════════════════════════════ RENDER ════════════════════ */
   return (
      <>
         {/* ── Page Title ────────────────────────────────────── */}
         <div className="dh-page-title-row">
            <h1 className="dh-page-title">Admin Dashboard</h1>
            <span className="dh-live-badge">
               <span className="dh-live-dot" />
               Live Activity
            </span>
         </div>

         {/* ── KPI Stats Row ─────────────────────────────────── */}
         <div className="dh-stats-grid">
            {statsList.map((s, idx) => {
               const Icon = getStatIcon(s.title);
               const isUp = s.trend === 'up';
               return (
                  <div key={idx} className="dh-stat-card">
                     <div className="dh-stat-card__top">
                        <div className="dh-stat-card__top-left">
                           <div className="dh-stat-card__icon-wrap">
                              <ShoppingBag size={20} />
                           </div>
                           <p className="dh-stat-card__label">{s.title}</p>
                        </div>
                        <button className="dh-stat-card__dots">
                           <MoreVertical size={16} />
                        </button>
                     </div>
                     <div className="dh-stat-card__bottom">
                        <p className="dh-stat-card__value">{s.value}</p>
                        <div className={`dh-stat-card__trend ${isUp ? 'dh-stat-card__trend--up' : 'dh-stat-card__trend--down'}`}>
                           <span className="dh-stat-card__trend-arrow">
                              {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                           </span>
                           <span>{s.trendValue ? `${s.trendValue}%` : '–'}</span>
                           <span className="dh-stat-card__trend-period">last period</span>
                        </div>
                     </div>
                  </div>
               );
            })}
         </div>



         {/* ── Attention Required ───────────────────────────── */}
         {attentionList.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
               <h2 className="dh-section-heading">Attention Required</h2>
               <div className="dh-attention-grid">
                  {attentionList.map((item, idx) => {
                     const Icon = getAttentionIcon(item.label);
                     const iconColor = getAttentionColor(item.label);
                     const ctaText = getAttentionCTA(item.label);
                     return (
                        <div key={idx} className="dh-attention-card">
                           <div className="dh-attention-card__top">
                              <span className="dh-attention-card__icon">
                                 <Icon size={24} color={iconColor} />
                              </span>
                              <span className="dh-attention-card__count">{item.count}</span>
                           </div>
                           <div className="dh-attention-card__body">
                              <p className="dh-attention-card__message">{item.label}</p>
                              <button className="dh-attention-card__cta">{ctaText}</button>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
         )}

         {/* ── Charts Row (Figma 402:7321) ──────────────────── */}
         <div className="dh-charts-row" style={{ marginBottom: '32px' }}>

            {/* Donut card — Figma 402:7324 */}
            <div className="dh-chart-card">
               <div className="dh-chart-card__header">
                  <h3 className="dh-chart-card__title">Sales Overview</h3>
                  <div className="dh-period-select-wrap">
                     <select className="dh-chart-period-select">
                        <option>Last Week</option>
                        <option>Last Month</option>
                        <option>Last Year</option>
                     </select>
                     <span className="dh-period-chevron"><ChevronDown size={16} /></span>
                  </div>
               </div>
               <div className="dh-chart-card__body dh-chart-card__body--donut">
                  <div className="dh-donut-wrap">
                     <ResponsiveContainer width="100%" height={258}>
                        <PieChart>
                           <Pie
                              data={displayDonut.length ? displayDonut : [
                                 { name: 'Pending Prescriptions', value: 40 },
                                 { name: 'Low Stock Products', value: 35 },
                                 { name: 'Active Shipments', value: 25 },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={78}
                              outerRadius={118}
                              dataKey="value"
                              startAngle={90}
                              endAngle={-270}
                              strokeWidth={0}
                           >
                              {(displayDonut.length ? displayDonut : [
                                 { name: 'Pending Prescriptions', value: 40 },
                                 { name: 'Low Stock Products', value: 35 },
                                 { name: 'Active Shipments', value: 25 },
                              ]).map((entry, i) => (
                                 <Cell key={i} fill={['#6633e9', '#ff985b', '#34d1a6'][i % 3]} />
                              ))}
                           </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                     <div className="dh-donut-center">
                        <span>Sales</span>
                        <span>Overview</span>
                     </div>
                  </div>
                  <div className="dh-donut-legend" style={{ width: 215 }}>
                     {(displayDonut.length ? displayDonut : [
                        { name: 'Pending Prescriptions', value: 40 },
                        { name: 'Low Stock Products', value: 35 },
                        { name: 'Active Shipments', value: 25 },
                     ]).map((entry, i) => (
                        <div key={i} className="dh-donut-legend__item">
                           <div
                              className="dh-donut-legend__swatch"
                              style={{ background: ['#6633e9', '#ff985b', '#34d1a6'][i % 3], border: `1px solid ${['#27008b', '#893504', '#07946d'][i % 3]}` }}
                           />
                           <span className="dh-donut-legend__label">{entry.name}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Area chart card — Figma 402:7355 */}
            <div className="dh-chart-card dh-chart-card--area">
               <div className="dh-chart-card__header">
                  <h3 className="dh-chart-card__title">Revenue Trend</h3>
                  <div className="dh-period-select-wrap">
                     <select className="dh-chart-period-select">
                        <option>Last Week</option>
                        <option>Last Month</option>
                        <option>Last Year</option>
                     </select>
                     <span className="dh-period-chevron"><ChevronDown size={16} /></span>
                  </div>
               </div>
               <div className="dh-chart-card__body dh-chart-card__body--area">
                  <ResponsiveContainer width="100%" height={255}>
                     <AreaChart
                        data={chartData.length ? chartData : [
                           { name: 'Jan', value: 6000 },
                           { name: 'Feb', value: 10000 },
                           { name: 'Mar', value: 30000 },
                           { name: 'Apr', value: 52000 },
                           { name: 'May', value: 8000 },
                           { name: 'Jun', value: 14000 },
                           { name: 'Jul', value: 58000 },
                           { name: 'Aug', value: 96000 },
                        ]}
                        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                     >
                        <defs>
                           <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#7f56d9" stopOpacity={0.25} />
                              <stop offset="100%" stopColor="#7f56d9" stopOpacity={0.02} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#e0e0e0" />
                        <XAxis
                           dataKey="name"
                           tick={{ fontSize: 14, fill: '#7d7d7d', fontWeight: 500 }}
                           axisLine={false}
                           tickLine={false}
                           dy={8}
                        />
                        <YAxis
                           tick={{ fontSize: 14, fill: '#7d7d7d', fontWeight: 500 }}
                           axisLine={false}
                           tickLine={false}
                           tickFormatter={v => v >= 1000 ? `${v / 1000}k` : String(v)}
                           ticks={[0, 10000, 20000, 50000, 100000]}
                           domain={[0, 100000]}
                           width={44}
                           dx={-4}
                        />
                        <Tooltip
                           content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              return (
                                 <div className="dh-chart-tooltip dh-chart-tooltip--area">
                                    <span className="dh-chart-tooltip__month">{label}</span>
                                    <span className="dh-chart-tooltip__value">₹{Number(payload[0].value).toLocaleString('en-IN')}</span>
                                 </div>
                              );
                           }}
                        />
                        <Area
                           type="monotone"
                           dataKey="value"
                           stroke="#7f56d9"
                           strokeWidth={1.5}
                           strokeDasharray="3 3"
                           fill="url(#areaGradient)"
                           dot={false}
                           activeDot={{ r: 4, fill: '#7f56d9', strokeWidth: 0 }}
                        />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

         </div>

         {/* ── Orders Table ─────────────────────────────────── */}
         <BaseAdminTable
            title="Today's Orders"
            count={totalOrders}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchEnter={() => {}}
            columns={[
               { label: 'Order ID', key: 'id', sortable: true },
               { label: 'Customer Name', key: 'customer' },
               { label: 'Items', key: 'items' },
               { label: 'Prescription Status', key: 'rx', sortable: true },
               { label: 'total (₹)', key: 'total' },
               { label: 'action', key: 'action', align: 'right' }
            ]}
            data={orders}
            loading={false}
            renderRow={(o, idx) => (
               <React.Fragment key={o.id || idx}>
                  <tr
                     onClick={() => toggleRow(o.id)}
                     className={`dh-table-row ${expandedRows.includes(o.id) ? 'dh-table-row--expanded' : ''}`}
                  >
                     {/* BaseAdminTable leading checkbox col — hidden, checkbox lives in Order ID cell */}
                     <td style={{ padding: 0, width: 0 }} />

                     {/* expand + checkbox + Order ID — unified cell per Figma 402:7491 */}
                     <td className="dh-table-cell" style={{ padding: '17px 12px' }}>
                        <div className="dh-order-id-cell">
                           <span onClick={(e) => { e.stopPropagation(); toggleRow(o.id); }} className="dh-row-expand-icon">
                              {expandedRows.includes(o.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                           </span>
                           <input type="checkbox" onClick={(e) => e.stopPropagation()} className="dh-table-checkbox" />
                           <span className="dh-order-id">{o.id.toString().startsWith('ORD-') ? o.id : `ORD-${o.id}`}</span>
                           {o.item_count > 1 && <span className="dh-order-badge">{o.item_count}</span>}
                        </div>
                     </td>

                     {/* Customer */}
                     <td className="dh-table-cell dh-table-cell--bold">
                        {o.customer_name || 'Walking Customer'}
                     </td>

                     {/* Items */}
                     <td className="dh-table-cell">
                        <div className="dh-items-cell">
                           <div className="dh-items-thumb">
                              {o.items?.[0]?.variant_image
                                 ? <img src={o.items[0].variant_image} alt="" />
                                 : <Glasses size={18} color="#D0D5DD" />}
                           </div>
                           <div>
                              <div className="dh-items-name">{o.items?.[0]?.variant_name || o.items?.[0]?.variant_sku || 'Standard Glasses'}</div>
                              <div className="dh-items-sub">{o.items?.[0]?.lens_desc || 'No Description'}</div>
                           </div>
                        </div>
                     </td>

                     {/* Prescription Status */}
                     <td className="dh-table-cell">
                        {(() => {
                           const statuses = o.items?.map(i => i.prescription_status || 'N/A') || [];
                           const b = getPrescriptionBadgeStyle(statuses);
                           return (
                              <span className="dh-rx-badge" style={{ color: b.color, background: b.bg, borderColor: b.border }}>
                                 {b.label}
                              </span>
                           );
                        })()}
                     </td>

                     {/* Total */}
                     <td className="dh-table-cell dh-table-cell--total">
                        ₹{Number(o.total_amount || 0).toLocaleString('en-IN')}
                        <span
                           className="dh-pdf-btn"
                           onClick={(e) => { e.stopPropagation(); handleDownloadPDF(o); }}
                           title="Download PDF"
                        >
                           PDF
                        </span>
                     </td>

                     {/* Action */}
                     <td className="dh-table-cell dh-table-cell--actions">
                        <div className="dh-action-btns">
                           <button className="dh-action-btn" onClick={(e) => { e.stopPropagation(); handleEdit(o); }} title="Edit">
                              <Edit2 size={15} />
                           </button>
                           <button className="dh-action-btn" onClick={(e) => { e.stopPropagation(); handleDelete(o); }} title="Delete">
                              <Trash2 size={15} />
                           </button>
                           <div style={{ position: 'relative' }}>
                              <button
                                 className={`dh-action-btn ${openDropdown === o.id ? 'dh-action-btn--active' : ''}`}
                                 onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === o.id ? null : o.id); }}
                              >
                                 <MoreVertical size={15} />
                              </button>
                              {openDropdown === o.id && (
                                 <>
                                    <div className="dh-dropdown-overlay" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }} />
                                    <div className="dh-dropdown-menu">
                                       <button className="dh-dropdown-item" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); onOrderClick(o.id); }}>
                                          <FileText size={15} /> View Details
                                       </button>
                                       <button className="dh-dropdown-item" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); handleEdit(o); }}>
                                          <Edit2 size={15} /> Edit Order
                                       </button>
                                       <button className="dh-dropdown-item" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); handleDownloadPDF(o); }}>
                                          <FileDown size={15} /> Download PDF
                                       </button>
                                       <button className="dh-dropdown-item dh-dropdown-item--danger" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); handleDelete(o); }}>
                                          <Trash2 size={15} /> Delete Order
                                       </button>
                                    </div>
                                 </>
                              )}
                           </div>
                        </div>
                     </td>
                  </tr>

                  {/* Expanded sub-rows (Figma 402:7489) */}
                  {expandedRows.includes(o.id) && (
                     <tr className="dh-sub-row-wrapper">
                        <td colSpan={7} className="dh-sub-row-td">
                           <div className="dh-sub-row-container">
                              <div className="dh-sub-row-inner-table">
                                 {o.items?.map((item, si) => {
                                    const rxBadge = getPrescriptionBadgeStyle([item.prescription_status || 'N/A']);
                                    return (
                                       <div key={item.id || si} className="dh-sub-row">
                                          {/* 400px customer name column */}
                                          <div className="dh-sub-row__customer">
                                             {item.patient_name || item.customer_name || o.customer_name}
                                          </div>
                                          {/* Flex inner columns */}
                                          <div className="dh-sub-row__inner">
                                             <div className="dh-sub-row__items">
                                                <div className="dh-items-thumb dh-items-thumb--sm">
                                                   {item.variant_image
                                                      ? <img src={item.variant_image} alt="" />
                                                      : <Glasses size={16} color="#D0D5DD" />}
                                                </div>
                                                <div>
                                                   <div className="dh-items-name">{item.variant_name || item.product_name || item.variant_sku || 'Glasses Frame'}</div>
                                                   <div className="dh-items-sub">{item.lens_desc || 'Standard Edition'}</div>
                                                </div>
                                             </div>
                                             <div className="dh-sub-row__rx">
                                                <span className="dh-rx-badge" style={{ color: rxBadge.color, background: rxBadge.bg }}>
                                                   {rxBadge.label}
                                                </span>
                                             </div>
                                             <div className="dh-sub-row__total">
                                                ₹{Number(item.price || item.unit_price || item.price_at_purchase || 0).toLocaleString('en-IN')}
                                                <span className="dh-pdf-btn dh-pdf-btn--sm" onClick={(e) => { e.stopPropagation(); }}>PDF</span>
                                             </div>
                                             <div className="dh-sub-row__actions">
                                                <button className="dh-action-btn" onClick={(e) => { e.stopPropagation(); handleEdit(o); }} title="Edit">
                                                   <Edit2 size={16} />
                                                </button>
                                             </div>
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        </td>
                     </tr>
                  )}
               </React.Fragment>
            )}
            pagination={{
               page,
               perPage,
               totalCount: totalOrders,
               onPageChange: setPage,
               onPerPageChange: setPerPage
            }}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            onExport={handleExport}
            filterContent={
               <div className="dh-filter-row">
                  <div className="dh-filter-group">
                     <label className="dh-filter-label">Filter by Status</label>
                     <div style={{ position: 'relative' }}>
                        <select
                           value={statusFilter}
                           onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                           className="dh-filter-select"
                        >
                           <option value="">All Statuses</option>
                           {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        <ChevronDown size={14} className="dh-filter-select-icon" />
                     </div>
                  </div>
                  <div className="dh-filter-dates">
                     <div className="dh-filter-group">
                        <label className="dh-filter-label">Date From</label>
                        <input
                           type="date"
                           value={dateFilter.from}
                           onChange={(e) => { setDateFilter({ ...dateFilter, from: e.target.value }); setPage(1); }}
                           className="dh-filter-input"
                        />
                     </div>
                     <div className="dh-filter-group">
                        <label className="dh-filter-label">Date To</label>
                        <input
                           type="date"
                           value={dateFilter.to}
                           onChange={(e) => { setDateFilter({ ...dateFilter, to: e.target.value }); setPage(1); }}
                           className="dh-filter-input"
                        />
                     </div>
                  </div>
                  <div className="dh-filter-actions">
                     <button className="dh-filter-btn dh-filter-btn--reset" onClick={() => { setStatusFilter(''); setDateFilter({ from: '', to: '' }); }}>
                        Reset
                     </button>
                     <button className="dh-filter-btn dh-filter-btn--apply" onClick={() => setShowFilters(false)}>
                        Apply Filters
                     </button>
                  </div>
               </div>
            }
         />

         <FormModal
            isOpen={showForm}
            onClose={() => setShowForm(false)}
            onSubmit={handleFormSubmit}
            onDelete={() => deleteOrder(selectedOrder?.id)}
            mode={formMode}
            title="Order"
            fields={orderFormFields}
            initialData={selectedOrder ? {
               ...selectedOrder,
               status: statusOptions.find(opt => opt.label === selectedOrder.status_label)?.value || selectedOrder.status
            } : {}}
         />
      </>
   );
};

export default DashboardHome;
