import React, { useMemo, useState } from 'react';
import {
   DollarSign, ShoppingCart, Users, Package, Microscope, Truck,
   TrendingUp, TrendingDown, MoreVertical, Search, Filter, RefreshCw,
   FileText, Globe, Activity, AlertTriangle, AlertCircle, ChevronDown, ChevronRight, ChevronLeft,
   Edit2, Trash2, FileDown, ArrowUpDown, Glasses
} from 'lucide-react';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
   ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import apiClient from '../../services/api';
import FormModal from './FormModal';

const DashboardHome = ({ statsData, recentOrders }) => {
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

   const statsList = useMemo(() => statsData?.stats || [
      { title: "Total Orders", value: "240", trend: "down", trendValue: "23" },
      { title: "Total Revenue", value: "₹48,560", trend: "up", trendValue: "23" },
      { title: "Pending Prescriptions", value: "12", trend: "up", trendValue: "23" },
      { title: "Low Stock Products", value: "7", trend: "up", trendValue: "23" },
      { title: "Today's Orders", value: "18", trend: "up", trendValue: "23" },
      { title: "Active Shipments", value: "9", trend: "up", trendValue: "23" },
   ], [statsData]);

   const attentionList = useMemo(() => statsData?.attention || [
      { label: "Prescriptions need review", count: 12, icon: "FileText", link: "Review All Now" },
      { label: "Products running low", count: 7, icon: "AlertTriangle", link: "Update Stock Now" },
      { label: "Products out of stock", count: 4, icon: "AlertCircle", link: "Restock Immediately" },
      { label: "Shipments in transit", count: 0, icon: "Truck", link: "View All Shipments" },
   ], [statsData]);

   const chartData = useMemo(() => statsData?.charts?.line || [
      { name: "Jan", value: 12000 }, { name: "Feb", value: 19000 }, { name: "Mar", value: 15000 },
      { name: "Apr", value: 22000 }, { name: "May", value: 30000 }, { name: "Jun", value: 25000 },
      { name: "Jul", value: 35000 }, { name: "Aug", value: 42000 }, { name: "Sep", value: 38000 },
      { name: "Oct", value: 48000 }, { name: "Nov", value: 45000 }, { name: "Dec", value: 52000 },
   ], [statsData]);

   const donutData = useMemo(() => statsData?.charts?.donut || [
      { name: "Home Page", value: 42, color: "#7F56D9" },
      { name: "Product Detail", value: 28, color: "#F79009" },
      { name: "Shop", value: 18, color: "#2FCA9A" },
      { name: "Cart / Checkout", value: 12, color: "#F04438" },
   ], [statsData]);
   const displayDonut = localDonut || donutData;

   const allOrders = useMemo(() => {
      const baseOrders = recentOrders?.length > 0 ? recentOrders : [
         {
            id: 'ORD-24031',
            customer_name: 'Priya Sharma',
            status_label: 'Approved',
            total_amount: '4,850',
            item_count: 2,
            items: [
               { customer_name: 'Rohan Kapoor', variant_name: 'John Jacobs Frame', lens_desc: 'Photochromic + -1.75', status: 'Approved', price: '3,450' },
               { customer_name: 'Sneha Rao', variant_name: 'Ray-Ban Aviator', lens_desc: 'Photochromic + -1.75', status: 'Pending', price: '5,650' }
            ]
         },
         {
            id: 'ORD-24030',
            customer_name: 'Arjun Reddy',
            status_label: 'Approved',
            total_amount: '7,299',
            item_count: 1,
            items: [
               { variant_name: 'Oakley Holbrook', lens_desc: 'Photochromic + -1.75', status: 'Approved', price: '7,299' }
            ]
         }
      ];

      if (!searchQuery && !statusFilter && !dateFilter.from && !dateFilter.to) return baseOrders;
      const q = searchQuery.toLowerCase();

      return baseOrders.filter(o => {
         const searchMatch = !q || (
            (o.id || '').toString().toLowerCase().includes(q) ||
            (o.customer_name || '').toLowerCase().includes(q) ||
            (o.items || []).some(item => (item.variant_name || '').toLowerCase().includes(q))
         );

         const currentStatusLabel = o.status_label || (statusOptions.find(opt => opt.value === o.status)?.label) || '';
         const filterLabel = statusOptions.find(opt => opt.value === Number(statusFilter))?.label || '';
         const statusMatch = !statusFilter || currentStatusLabel === filterLabel;

         const orderDate = o.created_at ? new Date(o.created_at) : new Date();
         const fromMatch = !dateFilter.from || orderDate >= new Date(dateFilter.from);
         const toMatch = !dateFilter.to || orderDate <= new Date(dateFilter.to);

         return searchMatch && statusMatch && fromMatch && toMatch;
      });
   }, [recentOrders, searchQuery, statusFilter, dateFilter, statusOptions]);

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

   const totalOrders = allOrders.length;
   const totalPages = Math.ceil(totalOrders / perPage) || 1;
   const orders = useMemo(() => {
      const start = (page - 1) * perPage;
      return allOrders.slice(start, start + perPage);
   }, [allOrders, page, perPage]);

   return (
      <div className="dashboard-strict-wrapper">
         <h1 className="dash-title" style={{ fontSize: '20px', fontWeight: 700, margin: '24px 0', color: '#101828' }}>Admin Dashboard</h1>

         {/* Stats Cards (Row 1) - Final Visual Parity */}
         <div className="db-stats-row-v2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {statsList.map((s, idx) => (
               <div key={idx} className="mini-stat-card" style={{ border: '1px solid #EAECF0', borderRadius: '12px', background: '#fff', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                     <div style={{ background: '#F4EBFF', color: '#7F56D9', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {idx === 0 ? <ShoppingCart size={20} /> : idx === 1 ? <DollarSign size={20} /> : idx === 2 ? <Microscope size={20} /> : idx === 3 ? <Package size={20} /> : idx === 4 ? <FileText size={20} /> : <Truck size={20} />}
                     </div>
                     <MoreVertical size={18} color="#98A2B3" cursor="pointer" />
                  </div>
                  <div style={{ fontSize: '14px', color: '#667085', fontWeight: 500, marginBottom: '8px' }}>{s.title}</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#101828', marginBottom: '8px', display: 'flex', alignItems: 'baseline' }}>
                     {s.value}
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: s.trend === 'up' ? '#027A48' : '#B42318' }}>
                     {s.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {s.trendValue}% last period
                  </div>
               </div>
            ))}
         </div>

         <h2 className="section-label-new" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Attention Required</h2>
         <div className="attention-cards-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            {attentionList.map((a, idx) => (
               <div key={idx} className="attention-info-card" style={{ border: '1px solid #EAECF0', borderRadius: '12px', background: '#fff', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <div style={{ color: idx % 4 === 0 ? '#1570EF' : idx % 4 === 1 ? '#F79009' : idx % 4 === 2 ? '#F04438' : '#12B76A' }}>
                        {idx === 0 ? <FileText size={24} /> : idx === 1 ? <AlertTriangle size={24} /> : idx === 2 ? <AlertCircle size={24} /> : <Truck size={24} />}
                     </div>
                     <div style={{ fontSize: '28px', fontWeight: 700, color: '#101828' }}>{a.count}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                     <div style={{ fontSize: '15px', color: '#475467', fontWeight: 600, lineHeight: 1.4 }}>{a.label}</div>
                     <button style={{ fontSize: '14px', fontWeight: 700, color: '#7F56D9', border: 'none', background: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', alignSelf: 'flex-start' }}>{a.link}</button>
                  </div>
               </div>
            ))}
         </div>

         {/* Dual Charts (Row 3 - Responsive Grid) */}
         <div className="charts-grid-v3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <div className="chart-box-v3" style={{ border: '1px solid #EAECF0', borderRadius: '16px', background: '#fff' }}>
               <div className="chart-header-v3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #EAECF0' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#101828', margin: 0 }}>Attention Required</h3>
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
                  <div style={{ width: '45%', height: 320, position: 'relative' }}>
                     <ResponsiveContainer width="100%" height="100%">
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
                                       <div style={{ background: '#101828', color: '#fff', padding: '10px 14px', borderRadius: '10px', border: 'none', fontSize: '11px' }}>
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
                     <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        pointerEvents: 'none'
                     }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#101828', lineHeight: 1.2 }}>
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
                              {d.name.replace('Page', '').trim()}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Area Chart: Revenue Monthly Trends */}
            <div className="chart-box-v3" style={{ border: '1px solid #EAECF0', borderRadius: '16px', background: '#fff', overflow: 'hidden' }}>
               <div className="chart-header-v3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #EAECF0' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#101828', margin: 0 }}>Revenue Growth Trends</h3>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#7F56D9', cursor: 'pointer' }}>View All</div>
               </div>
               <div style={{ padding: '24px', height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
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
                           tick={{ fill: '#667085', fontSize: 12, fontWeight: 500 }}
                           tickFormatter={(val) => val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                        />
                        <Tooltip
                           cursor={{ stroke: '#7F56D9', strokeWidth: 1, strokeDasharray: '4 4' }}
                           content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                 return (
                                    <div style={{ background: '#101828', color: '#fff', padding: '12px 16px', borderRadius: '16px', border: 'none' }}>
                                       <div style={{ fontSize: '11px', color: '#98A2B3', marginBottom: '4px', fontWeight: 600 }}>{payload[0].payload.name} 2026</div>
                                       <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>₹{payload[0].value.toLocaleString('en-IN')}</div>
                                       <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: '4px', fontSize: '11px', color: '#12B76A', fontWeight: 700 }}>
                                          <ArrowUpRight size={12} /> +12.5% vs last month
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
                           activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: '#7F56D9' }}
                           animationDuration={2000}
                           animationEasing="ease-in-out"
                        />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         {/* THE ORDERS TABLE (Strict Alignment & Real-time Connectivity) */}
         <div className="orders-table-card overflow-x-auto scrollbar-hide" style={{ border: '1px solid #EAECF0', borderRadius: '16px', backgroundColor: '#fff', marginTop: '32px' }}>
            <div className="table-card-header" style={{ padding: '20px 24px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAECF0' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#101828', margin: 0 }}>Recent Orders</h3>
                  <span style={{ backgroundColor: '#F4EBFF', color: '#7F56D9', fontSize: '12px', padding: '2px 12px', borderRadius: '16px', fontWeight: 700 }}>
                     {orders.length} Orders
                  </span>
               </div>
               <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div className="table-search-box" style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1', minWidth: '200px', maxWidth: '320px' }}>
                     <Search size={16} style={{ position: 'absolute', left: 12, color: '#667085', pointerEvents: 'none' }} />
                     <input
                        type="text"
                        placeholder="Search here..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                  <button
                     onClick={() => setShowFilters(!showFilters)}
                     style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #D0D5DD', borderRadius: '8px', backgroundColor: showFilters ? '#F9FAFB' : '#fff', fontSize: '14px', fontWeight: 600, color: '#344054' }}
                  >
                     <Filter size={16} color="#667085" /> <span className="desktop-only">Filter</span> {statusFilter && <span style={{ width: '6px', height: '6px', borderRadius: 'full', backgroundColor: '#7F56D9' }}></span>}
                  </button>
                  <button
                     onClick={handleExport}
                     style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: '1px solid #D0D5DD', borderRadius: '8px', backgroundColor: '#fff', fontSize: '14px', fontWeight: 600, color: '#344054' }}
                  >
                     <FileDown size={16} color="#667085" /> <span className="desktop-only">Export Data</span>
                  </button>
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

            <div className="table-scroll-wrap" style={{ overflowX: 'auto' }}>
               <table className="figma-table">
                  <thead>
                     <tr style={{ background: '#fff' }}>
                        <th style={{ padding: '12px 24px', width: 40 }}><input type="checkbox" /></th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 500 }}>Order ID <ArrowUpDown size={10} style={{ marginLeft: 4 }} /></th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 500 }}>Customer Name</th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 500 }}>Items</th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 500 }}>Prescription Status <ArrowUpDown size={10} style={{ marginLeft: 4 }} /></th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 500 }}>total (₹)</th>
                        <th style={{ padding: '12px 24px', fontSize: '12px', color: '#667085', fontWeight: 500, textAlign: 'right' }}>action</th>
                     </tr>
                  </thead>
                  <tbody>
                     {orders.map((o, idx) => (
                        <React.Fragment key={idx}>
                           <tr style={{ cursor: 'pointer', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : '#fff' }}>
                              <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : '#fff' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div onClick={() => toggleRow(o.id)} style={{ color: '#98A2B3' }}>
                                       {expandedRows.includes(o.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </div>
                                    <input type="checkbox" />
                                 </div>
                              </td>
                              <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : '#fff' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 600, color: '#344054' }}>{o.id}</span>
                                    {o.item_count > 1 && <span style={{ backgroundColor: '#F4EBFF', color: '#7F56D9', fontSize: '11px', padding: '1px 6px', borderRadius: '16px', fontWeight: 700 }}>{o.item_count}</span>}
                                 </div>
                              </td>
                              <td style={{ padding: '16px 24px', fontWeight: 600, color: '#101828', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : '#fff' }}>{o.customer_name}</td>
                              <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : '#fff' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, border: '1px solid #EAECF0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
                                       <Glasses size={20} color="#D0D5DD" />
                                    </div>
                                    <div>
                                       <div style={{ fontWeight: 500, color: '#344054', fontSize: '14px' }}>{o.items?.[0]?.variant_name}</div>
                                       <div style={{ fontSize: '12px', color: '#667085' }}>{o.items?.[0]?.lens_desc}</div>
                                    </div>
                                 </div>
                              </td>
                              <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : '#fff' }}>
                                 <span style={{ backgroundColor: '#ECFDF3', color: '#027A48', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>{o.status_label}</span>
                              </td>
                              <td style={{ padding: '16px 24px', fontWeight: 700, color: '#101828', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : '#fff' }}>
                                 {o.total_amount} <div style={{ display: 'inline-flex', marginLeft: 8, padding: '3px', backgroundColor: '#F04438', color: '#fff', borderRadius: '4px', verticalAlign: 'middle' }}><FileDown size={12} /></div>
                              </td>
                              <td style={{ padding: '16px 24px', backgroundColor: expandedRows.includes(o.id) ? '#F9F5FF' : '#fff' }}>
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
                                          <MoreVertical size={16} />
                                       </div>
                                       {openDropdown === o.id && (
                                          <>
                                             <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)}></div>
                                             <div style={{ position: 'absolute', right: 0, marginTop: '4px', width: '180px', backgroundColor: '#ffffff', border: '1px solid #EAECF0', borderRadius: '8px', zIndex: 20, overflow: 'hidden' }}>
                                                <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); toggleRow(o.id); }} style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: '#344054', cursor: 'pointer', borderBottom: '1px solid #F2F4F7' }}>View Details</div>
                                                <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); handleEdit(o); }} style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: '#344054', cursor: 'pointer', borderBottom: '1px solid #F2F4F7' }}>Edit Order</div>
                                                <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); handleDownloadPDF(o); }} style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: '#344054', cursor: 'pointer', borderBottom: '1px solid #F2F4F7' }}>Download PDF</div>
                                                <div onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); handleDelete(o); }} style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: '#D92D20', cursor: 'pointer' }}>Delete Order</div>
                                             </div>
                                          </>
                                       )}
                                    </div>
                                 </div>
                              </td>
                           </tr>
                           {/* Sub-row detail (Real Grid Synchronization for Pixel-Perfect Alignment) */}
                           {expandedRows.includes(o.id) && (
                              <tr style={{ background: '#F9F5FF' }}>
                                 <td colSpan={7} style={{ padding: '16px 24px', backgroundColor: '#F9F5FF' }}>
                                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #EAECF0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                       {o.items?.map((item, si) => (
                                          <div
                                             key={item.id || si}
                                             style={{
                                                display: 'grid',
                                                gridTemplateColumns: '144px 1.25fr 2fr 180px 160px 140px',
                                                alignItems: 'center',
                                                borderBottom: si === o.items.length - 1 ? 'none' : '1px solid #F2F4F7',
                                                background: '#ffffff',
                                                padding: '0' // Remove outer padding to align with table cells
                                             }}
                                          >
                                             {/* Spacer for Checkbox + ID column (144px exactly offsets the left table content) */}
                                             <div style={{ height: '40px' }}></div>

                                             {/* Aligned Col 1: Customer Name (Under 'Customer Name' Header) */}
                                             <div style={{ padding: '20px 24px', fontWeight: 600, color: '#101828', fontSize: '15px' }}>
                                                {item.patient_name || item.customer_name || o.customer_name}
                                             </div>

                                             {/* Aligned Col 2: Item Details (Under 'Items' Header) */}
                                             <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ width: '40px', height: '40px', border: '1px solid #F2F4F7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', flexShrink: 0 }}>
                                                   {item.variant_image ? (
                                                      <img src={item.variant_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                                                   ) : (
                                                      <Glasses size={20} color="#D0D5DD" />
                                                   )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                   <div style={{ fontSize: '14px', fontWeight: 700, color: '#344054', lineHeight: 1.2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.variant_name}</div>
                                                   <div style={{ fontSize: '11px', color: '#667085', marginTop: '2px', fontStyle: 'italic' }}>{item.lens_desc || 'Standard Edition'}</div>
                                                </div>
                                             </div>

                                             {/* Aligned Col 3: Prescription Status (Under 'Prescription Status' Header) */}
                                             <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ fontSize: '9px', fontWeight: 800, color: '#667085', letterSpacing: '0.05em' }}>PRESCRIPTION</div>
                                                <span style={{
                                                   backgroundColor: (item.prescription_status || item.status || '').toLowerCase() === 'approved' ? '#ECFDF3' : '#FFFAEB',
                                                   color: (item.prescription_status || item.status || '').toLowerCase() === 'approved' ? '#027A48' : '#B54708',
                                                   padding: '4px 12px',
                                                   borderRadius: '6px',
                                                   fontSize: '11px',
                                                   fontWeight: 800,
                                                   border: `1px solid ${(item.prescription_status || item.status || '').toLowerCase() === 'approved' ? '#D1FADF' : '#FEF0C7'}`,
                                                   textAlign: 'center',
                                                   minWidth: '94px'
                                                }}>
                                                   {item.prescription_status || item.status || 'N/A'}
                                                </span>
                                             </div>

                                             {/* Aligned Col 4: Price & Unified PDF Icon (Under 'Total' Header) */}
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

                                             {/* Aligned Col 5: Actions (Under 'Action' Header) */}
                                             <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                   onClick={(e) => { e.stopPropagation(); handleEdit(o); }}
                                                   style={{ width: '34px', height: '34px', border: '1px solid #EAECF0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085' }}
                                                >
                                                   <Edit2 size={16} />
                                                </button>
                                                <button
                                                   onClick={(e) => { e.stopPropagation(); handleDelete(o); }}
                                                   style={{ width: '34px', height: '34px', border: '1px solid #EAECF0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085' }}
                                                >
                                                   <Trash2 size={16} />
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

            {/* Final Pagination Strip (Pixel Perfect) */}
            <div style={{ padding: '16px 24px', whiteSpace: 'nowrap', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EAECF0', background: '#fff' }}>
               <div style={{ fontSize: '14px', color: '#344054', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Rows per Page
                  <div style={{ position: 'relative' }}>
                     <select
                        value={perPage}
                        onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                        style={{ padding: '6px 32px 6px 12px', border: '1px solid #D0D5DD', borderRadius: '8px', fontWeight: 600, appearance: 'none', background: 'white', cursor: 'pointer', outline: 'none' }}
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
                     style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '14px', color: page === 1 ? '#D0D5DD' : '#344054', fontWeight: 600, cursor: page === 1 ? 'default' : 'pointer', background: 'none', border: 'none', outline: 'none' }}
                  >
                     <ChevronLeft size={16} /> Prev
                  </button>

                  <div style={{ display: 'flex', gap: 4 }}>
                     {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                        <button
                           key={n}
                           onClick={() => setPage(n)}
                           style={{
                              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px',
                              background: page === n ? '#F4EBFF' : 'transparent',
                              color: page === n ? '#7F56D9' : '#475467',
                              fontWeight: page === n ? 700 : 500,
                              border: 'none', cursor: 'pointer', outline: 'none'
                           }}
                        >
                           {n}
                        </button>
                     ))}
                  </div>

                  <button
                     disabled={page >= totalPages}
                     onClick={() => setPage(page + 1)}
                     style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '14px', color: page >= totalPages ? '#D0D5DD' : '#344054', fontWeight: 600, cursor: page >= totalPages ? 'default' : 'pointer', background: 'none', border: 'none', outline: 'none' }}
                  >
                     Next <ChevronRight size={16} />
                  </button>
               </div>

               <div style={{ fontSize: '14px', color: '#475467', fontWeight: 500 }}>
                  Showing {(page - 1) * perPage + 1} - {Math.min(page * perPage, totalOrders)} of {totalOrders}
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
               initialData={selectedOrder ? {
                  ...selectedOrder,
                  status: statusOptions.find(opt => opt.label === selectedOrder.status_label)?.value || selectedOrder.status
               } : {}}
            />
         </div>
      </div>
   );
};

export default DashboardHome;

