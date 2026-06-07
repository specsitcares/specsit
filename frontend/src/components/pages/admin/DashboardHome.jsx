import React, { useMemo, useState, useEffect } from 'react';
import {
   DollarSign, ShoppingCart, ShoppingBag, Package, Microscope, Truck,
   TrendingUp, TrendingDown, FileText, AlertTriangle, AlertCircle, ChevronDown,
} from 'lucide-react';
import {
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
   ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import apiClient from '../../../services/api';
import OrderTable from './OrderTable';

const DashboardHome = ({ onOrderClick, onNavigate }) => {
   const [statsData, setStatsData] = useState(null);
   const [localDonut, setLocalDonut] = useState(null);

   const fetchStats = () => {
      apiClient.get('/sales/admin/stats/')
         .then(res => setStatsData(res.data))
         .catch(() => { });
   };

   useEffect(() => {
      fetchStats();
   }, []);

   useEffect(() => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const sseUrl = `/api/sales/analytics/live-stream/?token=${encodeURIComponent(token)}`;
      const eventSource = new EventSource(sseUrl);

      const handleEvent = () => {
         fetchStats();
      };

      eventSource.addEventListener('order_created', handleEvent);
      eventSource.addEventListener('order_updated', handleEvent);
      eventSource.addEventListener('live_activity', handleEvent);
      eventSource.addEventListener('cart_created', handleEvent);
      eventSource.addEventListener('cart_updated', handleEvent);
      eventSource.addEventListener('cart_deleted', handleEvent);
      eventSource.addEventListener('return_created', handleEvent);
      eventSource.addEventListener('return_updated', handleEvent);

      eventSource.onerror = (err) => {
         console.error('Dashboard SSE connection error:', err);
         eventSource.close();
      };

      return () => {
         eventSource.close();
      };
   }, []);

   useEffect(() => {
      if (statsData?.charts?.donut) setLocalDonut(statsData.charts.donut);
   }, [statsData?.charts?.donut]);

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

   const getAttentionTarget = (label) => {
      const l = label.toLowerCase();
      if (l.includes('prescription')) return { view: 'Prescriptions', filter: null };
      if (l.includes('running low') || l.includes('replenished')) return { view: 'Inventory', filter: 'low' };
      if (l.includes('out of stock') || l.includes('blocking')) return { view: 'Inventory', filter: 'out' };
      return { view: 'Shipments', filter: null };
   };

   return (
      <>
         <div className="dh-page-title-row">
            <h1 className="dh-page-title">Admin Dashboard</h1>
            <span className="dh-live-badge">
               <span className="dh-live-dot" />
               Live Activity
            </span>
         </div>
         {/* ── Top KPI Stat Cards ── */}
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '26px' }}>
            {statsList.map((stat, i) => {
               const Icon = getStatIcon(stat.title);
               const isUp = stat.trend === 'up';
               return (
                  <div key={i} style={{ background: '#fff', border: '1px solid #EAECF0', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#667085' }}>{stat.title}</span>
                        <div style={{ width: 30, height: 30, background: '#F9F5FF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7F56D9' }}>
                           <Icon size={15} />
                        </div>
                     </div>
                     <div style={{ fontSize: 22, fontWeight: 800, color: '#101828', marginBottom: 6 }}>{stat.value}</div>
                     {stat.trendValue !== undefined && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                           {isUp ? <TrendingUp size={12} color="#12B76A" /> : <TrendingDown size={12} color="#F04438" />}
                           <span style={{ fontSize: 10, fontWeight: 700, color: isUp ? '#12B76A' : '#F04438' }}>{stat.trendValue}</span>
                           <span style={{ fontSize: 10, color: '#667085' }}>vs last period</span>
                        </div>
                     )}
                  </div>
               );
            })}
         </div>


         {attentionList.length > 0 && (
            <div style={{ marginBottom: '26px' }}>
               <h2 className="dh-section-heading">Attention Required</h2>
               <div className="dh-attention-grid">
                  {attentionList.map((item, idx) => {
                     const Icon = getAttentionIcon(item.label);
                     const iconColor = getAttentionColor(item.label);
                     const ctaText = getAttentionCTA(item.label);
                     const target = getAttentionTarget(item.label);
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
                              <button
                                 className="dh-attention-card__cta"
                                 onClick={() => onNavigate?.(target)}
                              >
                                 {ctaText}
                              </button>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
         )}

         <div className="dh-charts-row" style={{ marginBottom: '26px' }}>
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
                     <ResponsiveContainer width="100%" height={206}>
                        <PieChart>
                           <Pie
                              data={displayDonut.length ? displayDonut : [
                                 { name: 'Pending Prescriptions', value: 40 },
                                 { name: 'Low Stock Products', value: 35 },
                                 { name: 'Active Shipments', value: 25 },
                              ]}
                              cx="50%" cy="50%"
                              innerRadius={62} outerRadius={94}
                              dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}
                           >
                              {(displayDonut.length ? displayDonut : [
                                 { name: 'Pending Prescriptions', value: 40 },
                                 { name: 'Low Stock Products', value: 35 },
                                 { name: 'Active Shipments', value: 25 },
                              ]).map((_, i) => (
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
                  <div className="dh-donut-legend" style={{ width: 172 }}>
                     {(displayDonut.length ? displayDonut : [
                        { name: 'Pending Prescriptions', value: 40 },
                        { name: 'Low Stock Products', value: 35 },
                        { name: 'Active Shipments', value: 25 },
                     ]).map((entry, i) => (
                        <div key={i} className="dh-donut-legend__item">
                           <div
                              className="dh-donut-legend__swatch"
                              style={{
                                 background: ['#6633e9', '#ff985b', '#34d1a6'][i % 3],
                                 border: `1px solid ${['#27008b', '#893504', '#07946d'][i % 3]}`
                              }}
                           />
                           <span className="dh-donut-legend__label">{entry.name}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

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
                  <ResponsiveContainer width="100%" height={204}>
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
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7d7d7d', fontWeight: 500 }} axisLine={false} tickLine={false} dy={6} />
                        <YAxis
                           tick={{ fontSize: 11, fill: '#7d7d7d', fontWeight: 500 }}
                           axisLine={false} tickLine={false}
                           tickFormatter={v => v >= 1000 ? `${v / 1000}k` : String(v)}
                           ticks={[0, 10000, 20000, 50000, 100000]} domain={[0, 100000]}
                           width={35} dx={-3}
                        />
                        <Tooltip
                           content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              return (
                                 <div className="dh-chart-tooltip dh-chart-tooltip--area">
                                    <span className="dh-chart-tooltip__month">{label}</span>
                                    <span className="dh-chart-tooltip__value">&#8377;{Number(payload[0].value).toLocaleString('en-IN')}</span>
                                 </div>
                              );
                           }}
                        />
                        <Area
                           type="monotone" dataKey="value"
                           stroke="#7f56d9" strokeWidth={1.5} strokeDasharray="3 3"
                           fill="url(#areaGradient)" dot={false}
                           activeDot={{ r: 4, fill: '#7f56d9', strokeWidth: 0 }}
                        />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         <OrderTable category={null} onViewDetails={onOrderClick} hideKPIs={true} />
      </>
   );
};

export default DashboardHome;
