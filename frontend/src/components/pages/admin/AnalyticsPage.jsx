import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, ShoppingBag, ShoppingCart,
  DollarSign, Package, ChevronDown, MoreVertical, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import apiClient from '../../../services/api';
import { getAuthToken } from '../../../utils/auth';
import '../../../styles/analytics.css';

/* ─── period options (matches backend) ─── */
const PERIOD_OPTIONS = [
  { label: 'This Week',    value: 'this_week' },
  { label: 'Last 7 Days',  value: 'last_7'   },
  { label: 'Last 30 Days', value: 'last_30'  },
  { label: 'Last 90 Days', value: 'last_90'  },
];

/* ─── tabs ─── */
const TABS = ['Orders Overview', 'Abandoned Carts', 'Traffic & Clicks', 'Returns/Exchanges'];

/* ─── fallback data so the page always looks populated ─── */
const FALLBACK = {
  kpis: {
    totalOrders:  { value: 1204, trend: 12.5, label: 'vs last week' },
    cartsCreated: { value: 2847, trend: 8.2,  conversionRate: 42.3  },
    revenue:      { value: 90500, trend: 18.2, avgOrder: 75.17, label: 'growth' },
    productsSold: {
      value: 2889, trend: 23,  label: 'last period',
      categoryBreakdown: [
        { category: 'Sunglasses', percent: 62 },
        { category: 'Eyeglasses', percent: 38 },
      ],
    },
  },
  chart: [
    { date: 'Jan', val1: 20,  val2: -20 },
    { date: 'Feb', val1: 40,  val2: 10  },
    { date: 'Mar', val1: -10, val2: 50  },
    { date: 'Apr', val1: -40, val2: -10 },
    { date: 'May', val1: 10,  val2: -50 },
    { date: 'Jun', val1: 50,  val2: 20  },
  ],
  deliveryCost: [
    { label: 'Shipping cost',    percent: 34, color: '#6366F1' },
    { label: 'Price hesitation', percent: 28, color: '#A855F7' },
    { label: 'Frame fit unsure', percent: 22, color: '#EC4899' },
    { label: 'Other',            percent: 16, color: '#94A3B8' },
  ],
  productProfit: [
    { label: 'Shipping cost',    percent: 34, color: '#6366F1' },
    { label: 'Price hesitation', percent: 28, color: '#A855F7' },
    { label: 'Frame fit unsure', percent: 22, color: '#EC4899' },
    { label: 'Other',            percent: 16, color: '#94A3B8' },
  ],
  productCategory: [
    { label: 'Sunglasses', percent: 58, color: '#A855F7' },
    { label: 'Eyeglasses', percent: 42, color: '#6366F1' },
  ],
  topLenses: [
    { label: 'Polarized', value: 320 },
    { label: 'Photochromic', value: 280 },
    { label: 'Blue Light', value: 260 },
    { label: 'Prescription', value: 200 },
  ],
  frameMaterials: [
    { material: 'Acetate', units: 567, revenue: 28350 },
    { material: 'Metal', units: 423, revenue: 21150 },
    { material: 'Titanium', units: 289, revenue: 17340 },
    { material: 'Plastic', units: 234, revenue: 11700 },
  ],
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
const AnalyticsPage = () => {
  const [activeTab,  setActiveTab]  = useState(0);
  const [period,     setPeriod]     = useState('last_30');
  const [data,       setData]       = useState(FALLBACK);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const intervalRef  = useRef(null);
  const periodLabel  = PERIOD_OPTIONS.find(o => o.value === period)?.label ?? 'Last 30 Days';

  /* ── fetch from backend ── */
  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await apiClient.get('/sales/analytics/orders-overview/', { params: { period } });
      if (res.data) {
        setData(prev => ({
          ...FALLBACK,
          ...res.data,
          kpis: { ...FALLBACK.kpis, ...res.data.kpis },
        }));
        setLastUpdate(new Date());
      }
    } catch {
      /* keep fallback data */
    } finally {
      setLoading(false);
    }
  }, [period]);

  /* initial load + period change */
  useEffect(() => { fetchData(true); }, [fetchData]);

  /* Real-time Server-Sent Events (SSE) */
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const sseUrl = `/api/sales/analytics/live-stream/?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(sseUrl);

    const handleEvent = () => {
      // Trigger a silent refresh when any analytics event occurs
      fetchData(false);
    };

    eventSource.addEventListener('order_created', handleEvent);
    eventSource.addEventListener('order_updated', handleEvent);
    eventSource.addEventListener('cart_created', handleEvent);
    eventSource.addEventListener('cart_updated', handleEvent);
    eventSource.addEventListener('cart_deleted', handleEvent);
    eventSource.addEventListener('return_created', handleEvent);
    eventSource.addEventListener('return_updated', handleEvent);
    eventSource.addEventListener('live_activity', handleEvent);

    eventSource.onerror = (err) => {
      console.error('Analytics SSE connection error:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [fetchData]);

  /* real-time polling every 30 s (backup if SSE fails) */
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchData(false), 30_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  const kpis = data.kpis || FALLBACK.kpis;
  const chartData = (data.chart && data.chart.length > 0) ? data.chart : FALLBACK.chart;

  return (
    <div className="ao-page">
      {/* ─── Tabs ─── */}
      <div className="ao-tabs">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`ao-tab ${i === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── Top row: title + period selector ─── */}
      <div className="ao-top-bar">
        <div className="ao-top-left">
          <h1 className="ao-title">Orders Overview</h1>
          <div className="ao-period-wrap" onClick={() => setPeriodOpen(o => !o)}>
            <span>{periodLabel}</span>
            <ChevronDown size={16} />
            {periodOpen && (
              <div className="ao-dropdown">
                {PERIOD_OPTIONS.map(opt => (
                  <div
                    key={opt.value}
                    className={`ao-dropdown-item ${opt.value === period ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setPeriod(opt.value); setPeriodOpen(false); }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="ao-top-right">
          <button className="ao-refresh-btn" onClick={() => fetchData(true)} title="Refresh data">
            <RefreshCw size={15} className={loading ? 'spinning' : ''} />
          </button>
          {lastUpdate && (
            <span className="ao-last-update">
              Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* ─── Tab 0: Orders Overview ─── */}
      {activeTab === 0 && (
        <div className="ao-content">
          {/* KPI Cards row */}
          <div className="ao-kpi-grid">
            <KpiCard
              icon={<ShoppingBag size={20} />}
              iconBg="#EFDFFF"
              label="Total Orders"
              value={kpis.totalOrders?.value?.toLocaleString() ?? '—'}
              trend={kpis.totalOrders?.trend}
              trendLabel={kpis.totalOrders?.label}
            />
            <KpiCard
              icon={<ShoppingCart size={20} />}
              iconBg="#EFDFFF"
              label="Carts Created"
              value={kpis.cartsCreated?.value?.toLocaleString() ?? '—'}
              trend={kpis.cartsCreated?.trend}
              subLine={`Conversion ${kpis.cartsCreated?.conversionRate ?? 0}%`}
              subProgress={kpis.cartsCreated?.conversionRate ?? 0}
            />
            <KpiCard
              icon={<DollarSign size={20} />}
              iconBg="#EFDFFF"
              label="Revenue"
              value={`₹${(kpis.revenue?.value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              trend={kpis.revenue?.trend}
              trendLabel={kpis.revenue?.label}
              subLine={`Avg Order: ₹${(kpis.revenue?.avgOrder ?? 0).toLocaleString('en-IN')}`}
            />
            <KpiCard
              icon={<Package size={20} />}
              iconBg="#EFDFFF"
              label="Products Sold"
              value={(kpis.productsSold?.value ?? 0).toLocaleString()}
              trend={kpis.productsSold?.trend}
              trendLabel={kpis.productsSold?.label}
              categoryBreakdown={kpis.productsSold?.categoryBreakdown}
            />
          </div>

          {/* Orders Over Time chart */}
          <div className="ao-chart-card">
            <div className="ao-chart-header">
              <span className="ao-chart-title">Orders Overview Time</span>
              <div className="ao-chart-controls">
                <div className="ao-period-wrap small" onClick={() => setPeriodOpen(o => !o)}>
                  <span>{periodLabel}</span>
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
            {loading ? (
              <div className="ao-chart-skeleton" />
            ) : (
              <OrdersLineChart data={chartData} />
            )}
          </div>

          {/* Bottom row: Delivery Cost + Product Profit */}
          <div className="ao-bottom-grid">
            <DonutCard
              title="Delivery Cost"
              segments={data.deliveryCost || FALLBACK.deliveryCost}
            />
            <DonutCard
              title="Product Profit Calculations"
              segments={data.productProfit || FALLBACK.productProfit}
            />
          </div>

          {/* Bottom row 2: Extra Details (3 columns) */}
          <div className="ao-bottom-widgets">
            <div className="ao-widget-card">
              <h3 className="ao-widget-title">Product Category Breakdown</h3>
              <div style={{ flex: 1, minHeight: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.productCategory || FALLBACK.productCategory}
                      cx="50%" cy="50%"
                      outerRadius={65}
                      dataKey="percent"
                      nameKey="label"
                      strokeWidth={2}
                      stroke="#fff"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {(data.productCategory || FALLBACK.productCategory).map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="ao-widget-card">
              <h3 className="ao-widget-title">Top Selling Lenses</h3>
              <div style={{ flex: 1, minHeight: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topLenses || FALLBACK.topLenses} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 11, fill: '#697177' }} />
                    <RechartsTooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="value" fill="#A855F7" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="ao-widget-card" style={{ padding: '16px 20px' }}>
              <h3 className="ao-widget-title">Frame Materials</h3>
              <div className="ao-table-wrap">
                <table className="ao-widget-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Material</th>
                      <th style={{ textAlign: 'right' }}>Units Sold</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.frameMaterials || FALLBACK.frameMaterials).map((row, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'left', fontWeight: 500 }}>{row.material}</td>
                        <td style={{ textAlign: 'right', color: '#697177' }}>{row.units}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${row.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs placeholder */}
      {activeTab !== 0 && (
        <div className="ao-coming-soon">
          <p>📊 {TABS[activeTab]} — coming soon</p>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   KPI CARD
═══════════════════════════════════════════════════════════════ */
const KpiCard = ({ icon, iconBg, label, value, trend, trendLabel, subLine, subProgress, categoryBreakdown }) => {
  const isPositive = (trend ?? 0) >= 0;
  const trendColor = isPositive ? '#147F27' : '#E11D48';

  return (
    <div className="ao-kpi-card">
      <div className="ao-kpi-top">
        <div className="ao-kpi-left">
          <div className="ao-kpi-icon" style={{ background: iconBg }}>{icon}</div>
          <span className="ao-kpi-label">{label}</span>
        </div>
        <button className="ao-kpi-menu"><MoreVertical size={18} /></button>
      </div>

      <div className="ao-kpi-value">{value}</div>

      {/* trend badge */}
      {trend !== undefined && (
        <div className="ao-kpi-trend" style={{ color: trendColor }}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isPositive ? '+' : ''}{trend}%</span>
          {trendLabel && <span className="ao-kpi-trend-label">&nbsp;{trendLabel}</span>}
        </div>
      )}

      {/* progress bar sub-line (Carts conversion) */}
      {subProgress !== undefined && (
        <div className="ao-kpi-sub">
          <div className="ao-kpi-progress-bar">
            <div className="ao-kpi-progress-fill" style={{ width: `${Math.min(subProgress, 100)}%` }} />
          </div>
          <span className="ao-kpi-sub-text">{subLine}</span>
        </div>
      )}

      {/* avg order sub-line (Revenue) */}
      {subLine && subProgress === undefined && !categoryBreakdown && (
        <div className="ao-kpi-sub-text plain">{subLine}</div>
      )}

      {/* category breakdown (Products Sold) */}
      {categoryBreakdown && categoryBreakdown.length > 0 && (
        <div className="ao-kpi-cats">
          {categoryBreakdown.map((cat) => (
            <div key={cat.category} className="ao-kpi-cat-row">
              <span className="ao-kpi-cat-name">{cat.category}</span>
              <span className="ao-kpi-cat-pct">{cat.percent}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   ORDERS LINE CHART (Recharts)
═══════════════════════════════════════════════════════════════ */
const OrdersLineChart = ({ data }) => {
  if (!data || data.length < 2) {
    return <div className="ao-chart-empty">No chart data available for this period</div>;
  }

  return (
    <div style={{ width: '100%', height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradO" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7987FF" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#7987FF" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E697FF" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#E697FF" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11, fill: '#697177', fontWeight: 500 }} 
            axisLine={false} tickLine={false} dy={8} 
          />
          <YAxis 
            ticks={[-60, -20, 20, 60]}
            domain={[-60, 60]}
            tick={{ fontSize: 16, fill: '#000000', fontWeight: 400 }}
            axisLine={false} tickLine={false} dx={-10}
          />
          <RechartsTooltip 
            contentStyle={{ borderRadius: 8, border: '1px solid #eaeaea', fontSize: 12 }}
          />
          <Area 
            type="monotone" dataKey="val1" 
            stroke="#7987FF" strokeWidth={3} fill="url(#gradO)" 
            activeDot={{ r: 5 }} name="Metric 1"
          />
          <Area 
            type="monotone" dataKey="val2" 
            stroke="#E697FF" strokeWidth={3} fill="url(#gradR)" 
            activeDot={{ r: 5 }} name="Metric 2"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   DONUT CHART CARD (Recharts)
═══════════════════════════════════════════════════════════════ */
const DonutCard = ({ title, segments }) => {
  return (
    <div className="ao-donut-card">
      <h3 className="ao-donut-title">{title}</h3>
      <div className="ao-donut-body">
        <div className="ao-donut-svg-wrap">
          <ResponsiveContainer width="100%" height={110}>
            <PieChart>
              <Pie
                data={segments}
                cx="50%" cy="50%"
                innerRadius={35} outerRadius={50}
                dataKey="percent" startAngle={90} endAngle={-270} strokeWidth={0}
              >
                {segments.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value) => `${value}%`}
                contentStyle={{ borderRadius: 8, border: '1px solid #eaeaea', fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="ao-donut-legend">
          {segments.map((seg) => (
            <div key={seg.label} className="ao-donut-legend-row">
              <div className="ao-donut-legend-left">
                <span className="ao-donut-dot" style={{ background: seg.color }} />
                <span className="ao-donut-label">{seg.label}</span>
              </div>
              <span className="ao-donut-pct">{seg.percent}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
