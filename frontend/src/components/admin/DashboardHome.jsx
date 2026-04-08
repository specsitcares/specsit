import React, { useMemo, useState, useEffect } from 'react';
import {
   DollarSign, ShoppingCart, Users, Package, Microscope, Truck,
   TrendingUp, TrendingDown, MoreVertical, Search, Filter, RefreshCw,
   FileText, Globe, Activity, AlertTriangle, AlertCircle, ChevronDown, ChevronRight, ChevronLeft,
   Edit2, Trash2, FileDown, ArrowUpDown, ArrowUpRight, Glasses
} from 'lucide-react';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
   ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import apiClient from '../../services/api';
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
      return statsData.stats;
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

         // Create blob with BOM for Windows/Excel compatibility
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

   // Fetch orders with server-side pagination
   const isFiltering = !!(searchQuery || statusFilter || dateFilter.from || dateFilter.to);
   useEffect(() => {
      const fetchOrders = async () => {
         try {
            const res = await apiClient.get('/sales/orders/', {
               params: {
                  page,
                  page_size: perPage,
                  limit: perPage,
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
            // Fall back to recentOrdersProp if API fails
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

   // Reset page to 1 when filters change
   useEffect(() => {
      setPage(1);
   }, [searchQuery, statusFilter, dateFilter.from, dateFilter.to, perPage]);

   // Sync go-to input with current page
   useEffect(() => {
      setGoToInputVal(String(page));
   }, [page]);

   const allOrders = fetchedOrders;
   const totalOrders = serverTotal;
   const totalPages = Math.ceil(totalOrders / perPage) || 1;
   const orders = allOrders;

   return (
      <>
         <h1 className="dash-title" style={{ fontSize: '20px', fontWeight: 700, margin: '24px 0', color: '#040205', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Admin Dashboard
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#12B76A', background: '#ECFDF3', padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
               <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#12B76A', animation: 'pulse 1.5s infinite' }}></span>
               Live Activity
            </span>
         </h1>
         <style>{`
            @keyframes pulse {
               0% { opacity: 1; transform: scale(1); }
               50% { opacity: 0.4; transform: scale(1.3); }
               100% { opacity: 1; transform: scale(1); }
            }
         `}</style>

         {/* Stats Cards (Row 1) - Final Visual Parity */}
         <div className="db-stats-row-v2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {statsList.map((s, idx) => {
               const IconComponent = s.title.includes('Revenue') ? DollarSign :
                  s.title.includes('Orders') ? ShoppingCart :
                     s.title.includes('Prescription') ? Microscope :
                        s.title.includes('Stock') ? Package :
                           s.title.includes('Shipment') ? Truck : FileText;

               return (
                  <div key={idx} className="mini-stat-card" style={{ border: '1px solid #E0E0E0', borderRadius: '12px', background: '#fff', padding: '24px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ background: '#F4EBFF', color: '#7F56D9', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <IconComponent size={20} />
                        </div>
                        <MoreVertical size={18} color="#98A2B3" cursor="pointer" />
                     </div>
                     <div style={{ fontSize: '14px', color: '#667085', fontWeight: 500, marginBottom: '8px' }}>{s.title}</div>
                     <div style={{ fontSize: '28px', fontWeight: 700, color: '#040205', marginBottom: '8px', display: 'flex', alignItems: 'baseline' }}>
                        {s.value}
                     </div>
                     <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: s.trend === 'up' ? '#027A48' : '#B42318' }}>
                        {s.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {s.trendValue}% last period
                     </div>
                  </div>
               );
            })}
         </div>

         <h2 className="section-label-new" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Attention Required</h2>
         <div className="attention-cards-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {attentionList.map((a, idx) => {
               const AttIcon = a.label.includes('Prescription') ? FileText :
                  a.label.includes('low') || a.label.includes('stock') ? AlertTriangle :
                     a.label.includes('out') ? AlertCircle : Truck;
               const AttColor = a.label.includes('Prescription') ? '#1570EF' :
                  a.label.includes('low') || a.label.includes('stock') ? '#F79009' :
                     a.label.includes('out') ? '#F04438' : '#12B76A';
               return (
                  <div key={idx} className="attention-info-card" style={{ border: '1px solid #E0E0E0', borderRadius: '12px', background: '#fff', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                     <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ color: AttColor }}>
                              <AttIcon size={24} />
                           </div>
                           <div style={{ fontSize: '28px', fontWeight: 700, color: '#040205' }}>{a.count}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                           <div style={{ fontSize: '15px', color: '#475467', fontWeight: 600, lineHeight: 1.4 }}>{a.label}</div>
                           <button style={{ fontSize: '14px', fontWeight: 700, color: '#7F56D9', border: 'none', background: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', alignSelf: 'flex-start' }}>View Details</button>
                        </div>
                     </div>
                  </div>
               );
            })}
         </div>

         {/* Dual Charts (Row 3 - Responsive Grid) */}
         <div className="charts-grid-v3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <div className="chart-box-v3" style={{ border: '1px solid #E0E0E0', borderRadius: '16px', background: '#fff', overflow: 'hidden' }}>
               <div className="chart-header-v3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E0E0E0', background: '#fff' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#040205', margin: 0 }}>Attention Required</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                     <RefreshCw
                        size={16}
                        color={isRefreshingDonut ? '#7F56D9' : '#98A2B3'}
                        className={isRefreshingDonut ? 'animate-spin' : ''}
                        style={{
                           cursor: 'pointer',
                           transition: 'all 0.4s ease'
                        }}
                        onClick={handleRefreshDonut}
                     />
                     <div style={{ fontSize: '14px', fontWeight: 600, color: '#7F56D9', cursor: 'pointer' }}>View All</div>
                  </div>
               </div>

               <div style={{ display: 'flex', alignItems: 'center', padding: '32px 24px', position: 'relative' }}>
                  {/* Left: Donut Chart */}
                  <div style={{ width: '45%', height: 320, position: 'relative', minWidth: 0 }}>
                     {isMounted && (
                        <ResponsiveContainer width="100%" height={320} minWidth={0}>
                           <PieChart>
                              <Pie
                                 data={displayDonut}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius="82%"
                                 outerRadius="95%"
                                 paddingAngle={4}
                                 dataKey="value"
                                 stroke="none"
                                 animationBegin={200}
                                 animationDuration={1500}
                              >
                                 {displayDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                              </Pie>
                              <Tooltip
                                 content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                       const item = payload[0].payload;
                                       return (
                                          <div style={{ background: '#040205', color: '#fff', padding: '10px 14px', borderRadius: '10px', border: 'none', fontSize: '11px' }}>
                                             <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color }}></div>
                                                {item.name}: {item.value}
                                             </div>
                                          </div>
                                       );
                                    }
                                    return null;
                                 }}
                              />
                           </PieChart>
                        </ResponsiveContainer>
                     )}


                     <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        pointerEvents: 'none'
                     }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#040205', lineHeight: 1.2 }}>
                           Attention<br />Required
                        </div>
                     </div>
                  </div>

                  <div style={{ width: '55%', paddingLeft: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                     {displayDonut.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{
                              width: 24,
                              height: 24,
                              borderRadius: '6px',
                              background: d.color,
                              flexShrink: 0
                           }}></div>
                           <div style={{ fontSize: '13px', color: '#475467', fontWeight: 600 }}>
                              {(d.name || 'Unknown Page').replace('Page', '').trim()}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Area Chart: Revenue Monthly Trends */}
            <div className="chart-box-v3" style={{ border: '1px solid #E0E0E0', borderRadius: '16px', background: '#fff', overflow: 'hidden' }}>
               <div className="chart-header-v3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #E0E0E0' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#040205', margin: 0 }}>Revenue Growth Trends</h3>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#7F56D9', cursor: 'pointer' }}>View All</div>
               </div>
               <div style={{ padding: '24px', height: 350, minWidth: 0 }}>
                  {isMounted && (
                     <ResponsiveContainer width="100%" height={350} minWidth={0}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <defs>
                              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#7F56D9" stopOpacity={0.15} />
                                 <stop offset="95%" stopColor="#7F56D9" stopOpacity={0.01} />
                              </linearGradient>
                           </defs>
                           <CartesianGrid stroke="#F2F4F7" />
                           <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#667085', fontSize: 12, fontWeight: 500 }}
                              dy={15}
                           />
                           <YAxis
                              axisLine={false}
                              tickLine={false}
                              domain={[0, 'auto']}
                              tick={{ fill: '#667085', fontSize: 12, fontWeight: 500 }}
                              tickFormatter={(val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                           />
                           <Tooltip
                              cursor={{ stroke: '#7F56D9', strokeWidth: 1, strokeDasharray: '4 4' }}
                              content={({ active, payload }) => {
                                 if (active && payload && payload.length) {
                                    return (
                                       <div style={{ background: '#040205', color: '#fff', padding: '12px 16px', borderRadius: '16px', border: 'none' }}>
                                          <div style={{ fontSize: '11px', color: '#98A2B3', marginBottom: '4px', fontWeight: 600 }}>{payload[0].payload.name} 2026</div>
                                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>₹{payload[0].value.toLocaleString('en-IN')}</div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: '4px', fontSize: '11px', color: '#12B76A', fontWeight: 700 }}>
                                             <ArrowUpRight size={12} /> Trend Indicator
                                          </div>
                                       </div>
                                    );
                                 }
                                 return null;
                              }}
                           />
                           <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#7F56D9"
                              strokeWidth={2}
                              strokeDasharray="3 3"
                              fillOpacity={1}
                              fill="url(#areaGrad)"
                              activeDot={{ r: 4, stroke: '#fefefe', strokeWidth: 2, fill: '#7F56D9' }}
                              animationDuration={2000}
                              animationEasing="ease-in-out"
                           />
                        </AreaChart>
                     </ResponsiveContainer>
                  )}
               </div>
            </div>
         </div>

         {/* THE ORDERS TABLE (Strict Alignment & Real-time Connectivity) */}
         <BaseAdminTable
            title="Recent Orders"
            count={totalOrders}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchEnter={() => { /* automatic via setPage(1) or useEffect */ }}
            columns={[
               { label: 'Order ID', key: 'id', sortable: true },
               { label: 'Customer Name', key: 'customer', sortable: true },
               { label: 'Items', key: 'items' },
               { label: 'Prescription Status', key: 'rx', sortable: true },
               { label: 'Total (₹)', key: 'total', sortable: true },
               { label: 'Action', key: 'action', align: 'right' }
            ]}
            data={orders}
            loading={false}
            renderRow={(o, idx) => (
               <React.Fragment key={o.id || idx}>
                  <tr
                     onClick={() => toggleRow(o.id)}
                     style={{ cursor: 'pointer', borderBottom: '1px solid #EAECF0', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : '#fff', transition: 'background 0.2s' }}
                  >
                     <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                           <div onClick={(e) => { e.stopPropagation(); toggleRow(o.id); }} style={{ color: '#98A2B3', cursor: 'pointer' }}>
                              {expandedRows.includes(o.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                           </div>
                           <input type="checkbox" onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer', borderRadius: '4px' }} />
                        </div>
                     </td>
                     <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           <span style={{ fontWeight: 600, color: '#344054' }}>{o.id.toString().startsWith('ORD-') ? o.id : `ORD-${o.id}`}</span>
                           {o.item_count > 1 && <span style={{ backgroundColor: '#F4EBFF', color: '#7F56D9', fontSize: '11px', padding: '1px 6px', borderRadius: '16px', fontWeight: 700 }}>{o.item_count}</span>}
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
                     <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                        {(() => {
                           const statuses = o.items?.map(i => (i.prescription_status || 'N/A').toLowerCase()) || [];
                           const allApproved = statuses.length > 0 && statuses.every(s => s === 'approved');
                           const anyPending = statuses.some(s => s.includes('pending'));
                           const label = allApproved ? 'All Approved' : anyPending ? 'Action Required' : o.items?.[0]?.prescription_status || 'N/A';
                           const color = allApproved ? '#027A48' : anyPending ? '#B54708' : '#B42318';
                           const bg = allApproved ? '#ECFDF3' : anyPending ? '#FFFAEB' : '#FEF3F2';
                           return (
                              <span style={{ backgroundColor: bg, color: color, padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize', border: `1px solid ${allApproved ? '#D1FADF' : '#FEF0C7'}` }}>
                                 {label}
                              </span>
                           );
                        })()}
                     </td>
                     <td style={{ padding: '16px 24px', fontWeight: 700, color: '#101828', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                        ₹{Number(o.total_amount || 0).toLocaleString('en-IN')}
                        <div style={{ display: 'inline-flex', marginLeft: 8, padding: '3px', backgroundColor: '#F04438', color: '#fff', borderRadius: '4px', verticalAlign: 'middle', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleDownloadPDF(o); }}>
                           <FileDown size={12} />
                        </div>
                     </td>
                     <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : 'inherit' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                           <div onClick={(e) => { e.stopPropagation(); handleEdit(o); }} style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}>
                              <Edit2 size={16} />
                           </div>
                           <div onClick={(e) => { e.stopPropagation(); handleDelete(o); }} style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}>
                              <Trash2 size={16} />
                           </div>
                           <div className="relative">
                              <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === o.id ? null : o.id); }} style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: openDropdown === o.id ? '#F9FAFB' : '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}>
                                 <MoreVertical size={16} />
                              </div>
                              {openDropdown === o.id && (
                                 <>
                                    <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }}></div>
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-[101] overflow-hidden" style={{ filter: 'drop-shadow(0px 4px 6px -2px rgba(16, 24, 40, 0.03))' }}>
                                       <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); onOrderClick(o.id); }} style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: '1px solid #F2F4F7' }}>
                                          <FileText size={16} color="#667085" /> View Details
                                       </div>
                                       <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); handleEdit(o); }} style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: '1px solid #F2F4F7' }}>
                                          <Edit2 size={16} color="#667085" /> Edit Order
                                       </div>
                                       <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); handleDownloadPDF(o); }} style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: '1px solid #F2F4F7' }}>
                                          <FileDown size={16} color="#667085" /> Download PDF
                                       </div>
                                       <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); handleDelete(o); }} style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#D92D20', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                          <Trash2 size={16} color="#D92D20" /> Delete Order
                                       </div>
                                    </div>
                                 </>
                              )}
                           </div>
                        </div>
                     </td>
                  </tr>
                  {expandedRows.includes(o.id) && (
                     <tr style={{ background: '#F9FAFB' }}>
                        <td colSpan={7} style={{ padding: '12px 24px' }}>
                           <div style={{ backgroundColor: '#ffffff', border: '1px solid #EAECF0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                              {o.items?.map((item, si) => (
                                 <div
                                    key={item.id || si}
                                    style={{
                                       display: 'grid',
                                       gridTemplateColumns: '144px 1.25fr 2fr 180px 160px 140px',
                                       alignItems: 'center',
                                       borderBottom: si === o.items.length - 1 ? 'none' : '1px solid #F2F4F7',
                                       background: '#ffffff',
                                       padding: '0'
                                    }}
                                 >
                                    <div style={{ height: '40px' }}></div>
                                    <div style={{ padding: '20px 24px', fontWeight: 600, color: '#101828', fontSize: '15px' }}>
                                       {item.patient_name || item.customer_name || o.customer_name}
                                    </div>
                                    <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                       <div style={{ width: '40px', height: '40px', border: '1px solid #F2F4F7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', flexShrink: 0 }}>
                                          {item.variant_image ? (
                                             <img src={item.variant_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                                          ) : (
                                             <Glasses size={20} color="#D0D5DD" />
                                          )}
                                       </div>
                                       <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#344054', lineHeight: 1.2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.variant_name || item.product_name || item.variant_sku || 'Glasses Frame'}</div>
                                          <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px', fontStyle: 'italic' }}>{item.lens_desc || 'Standard Edition'}</div>
                                       </div>
                                    </div>
                                    <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center' }}>
                                       <span style={{
                                          backgroundColor: (item.prescription_status || 'N/A').toLowerCase() === 'approved' ? '#ECFDF3' : (item.prescription_status || '').toLowerCase().includes('pending') ? '#FFFAEB' : '#FEF3F2',
                                          color: (item.prescription_status || 'N/A').toLowerCase() === 'approved' ? '#027A48' : (item.prescription_status || '').toLowerCase().includes('pending') ? '#B54708' : '#B42318',
                                          padding: '4px 12px',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                          fontWeight: 600,
                                          border: `1px solid ${(item.prescription_status || item.status || '').toLowerCase() === 'approved' ? '#D1FADF' : '#FEF0C7'}`,
                                          textAlign: 'center'
                                       }}>
                                          {item.prescription_status || item.status || 'N/A'}
                                       </span>
                                    </div>
                                    <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', fontWeight: 700, color: '#101828', fontSize: '15px' }}>
                                       ₹{Number(item.price || item.unit_price || item.price_at_purchase || 0).toLocaleString('en-IN')}
                                       <div
                                          onClick={(e) => { e.stopPropagation(); console.log('Download PDF for item', item.id); }}
                                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F04438', color: '#ffffff', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}
                                          title="Download PDF"
                                       >
                                          <FileDown size={11} strokeWidth={3} />
                                       </div>
                                    </div>
                                    <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                       <button onClick={(e) => { e.stopPropagation(); handleEdit(o); }} style={{ width: '34px', height: '34px', border: '1px solid #E0E0E0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085' }}><Edit2 size={16} /></button>
                                       <button onClick={(e) => { e.stopPropagation(); handleDelete(o); }} style={{ width: '34px', height: '34px', border: '1px solid #E0E0E0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085' }}><Trash2 size={16} /></button>
                                    </div>
                                 </div>
                              ))}
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
               <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                     <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '10px', fontWeight: 800, color: '#667085', marginBottom: '6px', letterSpacing: '0.05em' }}>Filter by Status</label>
                     <div style={{ position: 'relative' }}>
                        <select
                           value={statusFilter}
                           onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                           style={{ width: '100%', padding: '10px 32px 10px 12px', border: '1px solid #D0D5DD', borderRadius: '8px', fontSize: '14px', fontWeight: 600, appearance: 'none', background: 'white', outline: 'none', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
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
