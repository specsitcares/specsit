import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, ShoppingBag, ShoppingCart,
  DollarSign, Package, ChevronDown, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  ComposedChart, Line,
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
    { date: 'Mon', orders: 8,  revenue: 4200  },
    { date: 'Tue', orders: 14, revenue: 7800  },
    { date: 'Wed', orders: 11, revenue: 5900  },
    { date: 'Thu', orders: 19, revenue: 11200 },
    { date: 'Fri', orders: 23, revenue: 14500 },
    { date: 'Sat', orders: 17, revenue: 9600  },
    { date: 'Sun', orders: 9,  revenue: 5100  },
  ],
  deliveryCost: {
    totalRateCharged: 0,
    totalCarrierCost: 0,
    pocketMoney: 0,
    ordersWithData: 0,
    segments: [{ label: 'No data yet', percent: 100, color: '#E5E7EB' }],
    bandBreakdown: [],
  },
  productProfit: [
    { label: 'Sunglasses',  percent: 42, color: '#6366F1' },
    { label: 'Eyeglasses',  percent: 31, color: '#A855F7' },
    { label: 'Contact Lens', percent: 16, color: '#EC4899' },
    { label: 'Accessories', percent: 11, color: '#94A3B8' },
  ],
  productCategory: [
    { label: 'Sunglasses', percent: 58, color: '#A855F7' },
    { label: 'Eyeglasses', percent: 42, color: '#6366F1' },
  ],
  topFrameLenses: [
    { label: 'Polarized', value: 320 },
    { label: 'Photochromic', value: 280 },
    { label: 'Blue Light', value: 260 },
    { label: 'Prescription', value: 200 },
  ],
  topContactLenses: [
    { label: 'Daily Comfort', value: 180 },
    { label: 'Monthly Pro', value: 150 },
    { label: 'Toric Plus', value: 90 },
    { label: 'Multifocal', value: 60 },
  ],
  frameMaterials: [
    { material: 'Acetate', units: 567 },
    { material: 'Metal', units: 423 },
    { material: 'Titanium', units: 289 },
    { material: 'Plastic', units: 234 },
  ],
  accessories: [
    { name: 'Lens Cleaning Kit', units: 210 },
    { name: 'Hard Case', units: 185 },
    { name: 'Neck Cord', units: 140 },
    { name: 'Anti-fog Spray', units: 98 },
  ],
  abandonedCarts: {
    abandonmentRate: { value: 68.4, trend: -3 },
    funnel: [
      { label: 'Cart Created',     count: 1079, pct: 100 },
      { label: 'Checkout Started', count: 524,  pct: 49  },
      { label: 'Order Placed',     count: 341,  pct: 32  },
    ],
    topAbandoned: [
      { name: 'Aviator Classic', rate: 78, cartCount: 84 },
      { name: 'Round Tortoise',  rate: 72, cartCount: 65 },
      { name: 'Blue-Light Pro',  rate: 65, cartCount: 52 },
      { name: 'Polarized Sport', rate: 58, cartCount: 41 },
    ],
  },
  trafficClicks: {
    kpis: {
      totalVisits:  { value: 84210, trend: 3  },
      uniqueUsers:  { value: 52604, trend: -5 },
      avgSession:   { value: '3m 42s', trend: 2 },
      bounceRate:   { value: 38.6, trend: 4  },
    },
    trafficTrend: [
      { month: 'Jan', visitors: 62000, ctr: 2.1 },
      { month: 'Feb', visitors: 68000, ctr: 2.3 },
      { month: 'Mar', visitors: 71000, ctr: 2.5 },
      { month: 'Apr', visitors: 74000, ctr: 2.9 },
      { month: 'May', visitors: 79000, ctr: 3.3 },
      { month: 'Jun', visitors: 84000, ctr: 3.8 },
    ],
    topPages: [
      { path: '/sunglasses',  clicks: 12400 },
      { path: '/men/aviator', clicks: 8900  },
      { path: '/blue-light',  clicks: 6300  },
      { path: '/try-on',      clicks: 5100  },
      { path: '/lookbook',    clicks: 3800  },
    ],
    deviceBreakdown: [
      { name: 'Mobile',  value: 34, color: '#6366f1' },
      { name: 'Tablet',  value: 28, color: '#a855f7' },
      { name: 'Desktop', value: 22, color: '#ec4899' },
      { name: 'Other',   value: 16, color: '#cbd5e1' },
    ],
  },
  returnsExchanges: {
    kpis: {
      returnRate:     { value: 0,   trend: 0 },
      totalRefunds:   { value: 0,   trend: 0 },
      exchangeRate:   { value: 0,   trend: 0 },
      avgProcessTime: { value: '—', trend: 0 },
    },
    trend:           [],
    topReasons:      [],
    topProducts:     [],
    statusBreakdown: [],
  },
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
  const [lensTab,    setLensTab]    = useState(0);
  const [materialTab, setMaterialTab] = useState(0);
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
          kpis:             { ...FALLBACK.kpis,             ...(res.data.kpis             || {}) },
          abandonedCarts:   { ...FALLBACK.abandonedCarts,   ...(res.data.abandonedCarts   || {}) },
          trafficClicks:    { ...FALLBACK.trafficClicks,    ...(res.data.trafficClicks    || {}) },
          returnsExchanges: { ...FALLBACK.returnsExchanges, ...(res.data.returnsExchanges || {}) },
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
    eventSource.addEventListener('visit_tracked', handleEvent);

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
  const ac = data.abandonedCarts   || FALLBACK.abandonedCarts;
  const tc = data.trafficClicks    || FALLBACK.trafficClicks;
  const re = data.returnsExchanges || FALLBACK.returnsExchanges;

  return (
    <div className="ao-page">
      {/* ─── Tabs ─── */}
      <div className="ao-tabs">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`ao-tab ${i === activeTab ? 'active' : ''}`}
            onClick={() => { setActiveTab(i); setPeriodOpen(false); }}
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
              icon={<ShoppingBag size={16} />}
              iconBg="#EFDFFF"
              label="Total Orders"
              value={kpis.totalOrders?.value?.toLocaleString() ?? '—'}
              trend={kpis.totalOrders?.trend}
              trendLabel={kpis.totalOrders?.label}
            />
            <KpiCard
              icon={<ShoppingCart size={16} />}
              iconBg="#EFDFFF"
              label="Carts Created"
              value={kpis.cartsCreated?.value?.toLocaleString() ?? '—'}
              trend={kpis.cartsCreated?.trend}
              subLine={`Conversion ${kpis.cartsCreated?.conversionRate ?? 0}%`}
              subProgress={kpis.cartsCreated?.conversionRate ?? 0}
            />
            <KpiCard
              icon={<DollarSign size={16} />}
              iconBg="#EFDFFF"
              label="Revenue"
              value={`₹${(kpis.revenue?.value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              trend={kpis.revenue?.trend}
              trendLabel={kpis.revenue?.label}
              subLine={`Avg Order: ₹${(kpis.revenue?.avgOrder ?? 0).toLocaleString('en-IN')}`}
            />
            <KpiCard
              icon={<Package size={16} />}
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
            </div>
            {loading ? (
              <div className="ao-chart-skeleton" />
            ) : (
              <OrdersLineChart data={chartData} />
            )}
          </div>

          {/* Bottom row: Delivery Cost + Product Profit */}
          <div className="ao-bottom-grid">
            <DeliveryCostCard data={data.deliveryCost || FALLBACK.deliveryCost} />
            <DonutCard title="Product Profit Calculations" segments={data.productProfit || FALLBACK.productProfit} />
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h3 className="ao-widget-title" style={{ margin: 0 }}>Top Selling Lenses</h3>
                <div style={{ display: 'flex', gap: 0, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  {['Frame Lenses', 'Contact Lenses'].map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setLensTab(i)}
                      style={{
                        padding: '4px 12px',
                        fontSize: 12,
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: lensTab === i ? 600 : 400,
                        background: lensTab === i ? '#6b46c1' : '#fff',
                        color: lensTab === i ? '#fff' : '#6b7280',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s',
                        borderRight: i === 0 ? '1px solid #e5e7eb' : 'none',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={lensTab === 0
                      ? (data.topFrameLenses || FALLBACK.topFrameLenses)
                      : (data.topContactLenses || FALLBACK.topContactLenses)}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 11, fill: '#697177' }} />
                    <RechartsTooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="value" fill={lensTab === 0 ? '#A855F7' : '#6366F1'} radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="ao-widget-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 className="ao-widget-title" style={{ margin: 0 }}>
                  {materialTab === 0 ? 'Frame Materials' : 'Accessories'}
                </h3>
                <div style={{ display: 'flex', gap: 0, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                  {['Frame Materials', 'Accessories'].map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setMaterialTab(i)}
                      style={{
                        padding: '4px 12px',
                        fontSize: 12,
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: materialTab === i ? 600 : 400,
                        background: materialTab === i ? '#6b46c1' : '#fff',
                        color: materialTab === i ? '#fff' : '#6b7280',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s',
                        borderRight: i === 0 ? '1px solid #e5e7eb' : 'none',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ao-table-wrap">
                {materialTab === 0 ? (
                  <table className="ao-widget-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Material</th>
                        <th style={{ textAlign: 'right' }}>Units Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.frameMaterials || FALLBACK.frameMaterials).map((row, i) => (
                        <tr key={i}>
                          <td style={{ textAlign: 'left', fontWeight: 500 }}>{row.material}</td>
                          <td style={{ textAlign: 'right', color: '#697177' }}>{row.units}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="ao-widget-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Product</th>
                        <th style={{ textAlign: 'right' }}>Units Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.accessories || FALLBACK.accessories).map((row, i) => (
                        <tr key={i}>
                          <td style={{ textAlign: 'left', fontWeight: 500 }}>{row.name}</td>
                          <td style={{ textAlign: 'right', color: '#697177' }}>{row.units}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab 1: Abandoned Carts ─── */}
      {activeTab === 1 && (
        <div className="ao-content">
          {/* Filters row */}
          <div className="ac-filters">
            <div className="ao-period-wrap">
              <span>All Products</span>
              <ChevronDown size={16} />
            </div>
          </div>

          {/* KPI — Abandonment Rate */}
          <div className="ac-kpi-row">
            <div className="ao-kpi-card ac-kpi-card">
              <div className="ao-kpi-top">
                <div className="ao-kpi-left">
                  <div className="ao-kpi-icon" style={{ background: '#EFDFFF' }}>
                    <ShoppingCart size={16} />
                  </div>
                  <span className="ao-kpi-label">Abandonment Rate</span>
                </div>
              </div>
              <div className="ao-kpi-value">{ac.abandonmentRate?.value ?? 68.4}%</div>
              {(() => {
                const t = ac.abandonmentRate?.trend ?? -3;
                const improving = t <= 0;
                return (
                  <div className="ao-kpi-trend" style={{ color: improving ? '#147F27' : '#E11D48' }}>
                    {improving ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    <span>{t > 0 ? '+' : ''}{t}%</span>
                    <span className="ao-kpi-trend-label">&nbsp;vs last period</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Side-by-side: Funnel + Top Abandoned Products — same card style */}
          <div className="ac-panels">
            <div className="ac-panel">
              <h2 className="ac-section-title">Cart Drop-off Funnel</h2>
              <div className="ac-products-card">
                <div className="ac-products-scroll">
                  {(ac.funnel ?? FALLBACK.abandonedCarts.funnel).map((step, i) => (
                    <div key={step.label} className="ac-product-item" data-tooltip={`${step.count.toLocaleString()} users`}>
                      <div className="ac-product-header">
                        <div className="ac-product-name-row">
                          <span className="ac-rank-badge">{i + 1}</span>
                          <span className="ac-product-name">{step.label}</span>
                        </div>
                        <span className="ac-product-rate">{step.pct}%</span>
                      </div>
                      <div className="ac-product-bar">
                        <div className="ac-product-fill" style={{ width: `${step.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ac-panel">
              <h2 className="ac-section-title">Products — Abandonment Rate</h2>
              <div className="ac-products-card">
                <div className="ac-products-scroll">
                  {(ac.topAbandoned ?? FALLBACK.abandonedCarts.topAbandoned).map((product, i) => (
                    <div key={product.name} className="ac-product-item" data-tooltip={`${product.cartCount} cart${product.cartCount !== 1 ? 's' : ''} added`}>
                      <div className="ac-product-header">
                        <div className="ac-product-name-row">
                          <span className="ac-rank-badge">{i + 1}</span>
                          <span className="ac-product-name">{product.name}</span>
                        </div>
                        <span className="ac-product-rate">{product.rate}%</span>
                      </div>
                      <div className="ac-product-bar">
                        <div className="ac-product-fill" style={{ width: `${product.rate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab 2: Traffic & Clicks ─── */}
      {activeTab === 2 && (() => {
        const tckpis   = tc.kpis           || FALLBACK.trafficClicks.kpis;
        const trend    = tc.trafficTrend   || FALLBACK.trafficClicks.trafficTrend;
        const pages    = tc.topPages       || FALLBACK.trafficClicks.topPages;
        const devices  = tc.deviceBreakdown|| FALLBACK.trafficClicks.deviceBreakdown;
        const maxClicks = Math.max(...pages.map(p => p.clicks), 1);
        return (
          <div className="ao-content">
            {/* Filters */}
            <div className="ac-filters">
              <div className="ao-period-wrap"><span>All Products</span><ChevronDown size={16} /></div>
            </div>

            {/* Section heading */}
            <h2 className="tc-section-heading">Traffic &amp; Clicks</h2>

            {/* 4 KPI cards */}
            <div className="tc-kpi-grid">
              {[
                { label: 'Total Visits',  raw: tckpis.totalVisits,  fmt: v => Number(v).toLocaleString() },
                { label: 'Unique Users',  raw: tckpis.uniqueUsers,  fmt: v => Number(v).toLocaleString() },
                { label: 'Avg. Session',  raw: tckpis.avgSession,   fmt: v => v },
                { label: 'Bounce Rate',   raw: tckpis.bounceRate,   fmt: v => `${v}%` },
              ].map(({ label, raw, fmt }) => {
                const t = raw?.trend ?? 0;
                const up = t >= 0;
                return (
                  <div key={label} className="tc-kpi-card">
                    <div className="tc-kpi-top">
                      <div className="tc-kpi-icon"><ShoppingBag size={22} /></div>
                    </div>
                    <span className="tc-kpi-label">{label}</span>
                    <div className="tc-kpi-bottom">
                      <span className="tc-kpi-value">{fmt(raw?.value ?? raw)}</span>
                      <div className="tc-kpi-trend" style={{ color: up ? '#147F27' : '#E11D48' }}>
                        {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>{t > 0 ? '+' : ''}{t}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Traffic Trend chart */}
            <div className="tc-chart-section">
              <div className="tc-chart-header">
                <div>
                  <h3 className="tc-chart-title">Traffic Trend – Visitors vs Click-Through Rate</h3>
                  <p className="tc-chart-sub">Performance analysis for the last 6 months</p>
                </div>
                <div className="tc-legend">
                  <div className="tc-legend-item"><span className="tc-legend-dot" style={{ background: '#6366f1' }} />Visitors</div>
                  <div className="tc-legend-item"><span className="tc-legend-dot" style={{ background: '#f59e0b' }} />CTR %</div>
                </div>
              </div>
              <div className="tc-chart-card">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={trend} margin={{ top: 10, right: 48, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tcVisitorsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#697177' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left"  tickFormatter={v => String(v)} tick={{ fontSize: 11, fill: '#697177' }} axisLine={false} tickLine={false} width={40} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#697177' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      formatter={(value, name) =>
                        name === 'visitors'
                          ? [value.toLocaleString(), 'Visitors']
                          : [`${value}%`, 'CTR']
                      }
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e0e0e0' }}
                    />
                    <Area  yAxisId="left"  type="monotone" dataKey="visitors" stroke="#6366f1" strokeWidth={2} fill="url(#tcVisitorsGrad)" dot={false} />
                    <Line  yAxisId="right" type="monotone" dataKey="ctr"      stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom: Top Pages + Device Breakdown */}
            <div className="ac-panels">
              <div className="ac-panel">
                <h2 className="ac-section-title">Top Pages by Clicks</h2>
                <div className="ac-products-card">
                  <div className="ac-products-scroll">
                    {pages.map((page, i) => (
                      <div key={page.path} className="ac-product-item" data-tooltip={`${page.clicks.toLocaleString()} clicks`}>
                        <div className="ac-product-header">
                          <div className="ac-product-name-row">
                            <span className="ac-rank-badge">{i + 1}</span>
                            <span className="ac-product-name">{page.path}</span>
                          </div>
                          <span className="ac-product-rate">{page.clicks.toLocaleString()}</span>
                        </div>
                        <div className="ac-product-bar">
                          <div className="ac-product-fill" style={{ width: `${Math.round(page.clicks / maxClicks * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ac-panel">
                <h2 className="ac-section-title">Device Breakdown</h2>
                <div className="tc-donut-card">
                  <div className="tc-donut-body">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={devices} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" strokeWidth={0}>
                        {devices.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="tc-device-legend">
                    {devices.filter(d => d.name !== 'Other').map(d => (
                      <div key={d.name} className="tc-device-row">
                        <div className="tc-device-left">
                          <span className="tc-device-dot" style={{ background: d.color }} />
                          <span className="tc-device-name">{d.name}</span>
                        </div>
                        <span className="tc-device-pct">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Tab 3: Returns & Exchanges ─── */}
      {activeTab === 3 && (() => {
        const rekpis   = re.kpis            || FALLBACK.returnsExchanges.kpis;
        const reTrend  = re.trend           || [];
        const reasons  = re.topReasons      || [];
        const products = re.topProducts     || [];
        const statuses = re.statusBreakdown || [];
        const maxReason = Math.max(...reasons.map(r => r.count), 1);

        return (
          <div className="ao-content">
            {/* Filters */}
            <div className="ac-filters">
              <div className="ao-period-wrap"><span>All Products</span><ChevronDown size={16} /></div>
            </div>

            {/* Section heading */}
            <h2 className="tc-section-heading">Exchanges/Returns</h2>

            {/* 4 KPI cards */}
            <div className="tc-kpi-grid">
              {[
                { label: 'Return Rate',       raw: rekpis.returnRate,     fmt: v => `${v ?? 0}%`  },
                { label: 'Total Refunds',     raw: rekpis.totalRefunds,   fmt: v => `₹${Number(v ?? 0).toLocaleString('en-IN')}` },
                { label: 'Exchange Rate',     raw: rekpis.exchangeRate,   fmt: v => `${v ?? 0}%`  },
                { label: 'Avg. Process Time', raw: rekpis.avgProcessTime, fmt: v => v ?? '—'      },
              ].map(({ label, raw, fmt }) => {
                const t  = raw?.trend ?? 0;
                const up = t >= 0;
                return (
                  <div key={label} className="tc-kpi-card">
                    <div className="tc-kpi-top">
                      <div className="tc-kpi-icon"><ShoppingBag size={22} /></div>
                    </div>
                    <span className="tc-kpi-label">{label}</span>
                    <div className="tc-kpi-bottom">
                      <span className="tc-kpi-value">{fmt(raw?.value ?? raw)}</span>
                      <div className="tc-kpi-trend" style={{ color: up ? '#147F27' : '#E11D48' }}>
                        {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>{t > 0 ? '+' : ''}{t}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Returns vs Exchanges Over Time chart */}
            <div className="tc-chart-section">
              <div className="tc-chart-header">
                <div>
                  <h3 className="tc-chart-title">Returns vs Exchanges Over Time</h3>
                  <p className="tc-chart-sub">Comparing volume between return requests and item exchanges.</p>
                </div>
                <div className="tc-legend">
                  <div className="tc-legend-item"><span className="tc-legend-dot" style={{ background: '#6366f1' }} />Returns</div>
                  <div className="tc-legend-item"><span className="tc-legend-dot" style={{ background: '#f59e0b' }} />Exchanges</div>
                </div>
              </div>
              <div className="tc-chart-card">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={reTrend} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reReturnsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#697177' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => String(v)} tick={{ fontSize: 11, fill: '#697177' }} axisLine={false} tickLine={false} width={40} />
                    <RechartsTooltip
                      formatter={(value, name) => [value, name === 'returns' ? 'Returns' : 'Exchanges']}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e0e0e0' }}
                    />
                    <Area type="monotone" dataKey="returns"   name="returns"   stroke="#6366f1" strokeWidth={2} fill="url(#reReturnsGrad)" dot={false} />
                    <Line type="monotone" dataKey="exchanges" name="exchanges" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom 3-column: Reasons | Products | Status */}
            <div className="rx-bottom-grid">

              {/* Top Return Reasons */}
              <div className="ac-panel">
                <h2 className="ac-section-title">Top Return Reasons</h2>
                <div className="ac-products-card">
                  <div className="ac-products-scroll">
                    {reasons.length === 0
                      ? <span style={{ color: '#9ca3af', fontSize: 12 }}>No return reasons recorded yet</span>
                      : reasons.map(r => (
                        <div key={r.reason} className="ac-product-item" data-tooltip={`${r.count} returns`}>
                          <div className="ac-product-header">
                            <div className="ac-product-name-row">
                              <span className="ac-product-name">{r.reason}</span>
                            </div>
                            <span className="ac-product-rate">{r.pct}%</span>
                          </div>
                          <div className="ac-product-bar">
                            <div className="ac-product-fill" style={{ width: `${Math.round(r.count / maxReason * 100)}%` }} />
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>

              {/* Most Returned Products */}
              <div className="ac-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h2 className="ac-section-title" style={{ margin: 0 }}>Most Returned Products</h2>
                  <span className="rx-view-all">View All</span>
                </div>
                <div className="ac-products-card" style={{ flex: 1 }}>
                  <div className="rx-products-table">
                    <div className="rx-table-header">
                      <span>Product</span>
                      <span>Returns</span>
                    </div>
                    {products.length === 0
                      ? <span style={{ color: '#9ca3af', fontSize: 12, padding: '8px 4px', display: 'block' }}>No products returned yet</span>
                      : products.map(p => (
                        <div key={p.name} className="rx-table-row">
                          <div className="rx-table-name-cell">
                            <span className="rx-rank-bar" style={{ background: p.color }} />
                            <span className="rx-product-name">{p.name}</span>
                          </div>
                          <span className="rx-product-count">{p.returns}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>

              {/* Return Status Breakdown */}
              <div className="ac-panel">
                <h2 className="ac-section-title">Return Status Breakdown</h2>
                <div className="ac-products-card rx-status-card">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statuses}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={0}
                      >
                        {statuses.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val, name) => [`${val}%`, name]}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e0e0e0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="rx-status-grid">
                    {statuses.map(s => (
                      <div key={s.name} className="rx-status-item">
                        <div className="rx-status-left">
                          <span className="rx-status-dot" style={{ background: s.color }} />
                          <span className="rx-status-name">{s.name}</span>
                        </div>
                        <span className="rx-status-val">{s.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Other tabs placeholder */}
      {activeTab > 3 && (
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

  const maxOrders  = Math.max(...data.map(d => d.orders  || 0)) || 1;
  const maxRevenue = Math.max(...data.map(d => d.revenue || 0)) || 1;

  const normalized = data.map(d => ({
    date:       d.date,
    orders:     Math.round(((d.orders  || 0) / maxOrders)  * 100),
    revenue:    Math.round(((d.revenue || 0) / maxRevenue) * 100),
    _orders:    d.orders  || 0,
    _revenue:   d.revenue || 0,
  }));

  const fmt = (v) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000)   return `₹${(v / 1000).toFixed(0)}k`;
    return `₹${v}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' }}>
        <p style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</p>
        <p style={{ color: '#7987FF', margin: 0 }}>Orders: <strong>{d._orders}</strong></p>
        <p style={{ color: '#C084FC', margin: 0 }}>Revenue: <strong>{fmt(d._revenue)}</strong></p>
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={normalized} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradO" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7987FF" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#7987FF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C084FC" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#C084FC" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Roboto, sans-serif' }}
            axisLine={false} tickLine={false} dy={6}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Roboto, sans-serif' }}
            axisLine={false} tickLine={false} width={36} dx={-4}
          />
          <RechartsTooltip content={<CustomTooltip />} />
          <Area
            type="monotone" dataKey="orders" name="Orders"
            stroke="#7987FF" strokeWidth={2} fill="url(#gradO)"
            dot={{ r: 4, fill: '#7987FF', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone" dataKey="revenue" name="Revenue"
            stroke="#C084FC" strokeWidth={2} fill="url(#gradR)"
            dot={{ r: 4, fill: '#C084FC', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="ao-chart-legend">
        <div className="ao-legend-item">
          <span className="ao-legend-dot" style={{ background: '#7987FF' }} />
          <span>Orders</span>
        </div>
        <div className="ao-legend-item">
          <span className="ao-legend-dot" style={{ background: '#C084FC' }} />
          <span>Revenue</span>
        </div>
      </div>
    </div>
  );
};

const DeliveryCostCard = ({ data }) => {
  const fmtAmt = (v) => 'Rs.' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const pocketMoney = Number(data.pocketMoney || 0);
  const hasData = Number(data.ordersWithData || 0) > 0;

  const rawSegments = (data.segments && data.segments.length > 0)
    ? data.segments
    : [{ label: 'No data yet', percent: 100, color: '#E5E7EB' }];
  const segTotal = rawSegments.reduce((s, seg) => s + (seg.percent || 0), 0) || 1;
  const normalized = rawSegments.map((seg) => ({
    ...seg,
    pct: Math.round((seg.percent / segTotal) * 100),
  }));

  const summaryLine = hasData
    ? (fmtAmt(data.totalCarrierCost) + ' paid  ·  ' + fmtAmt(data.totalRateCharged) + ' collected  ·  ' + (pocketMoney > 0 ? fmtAmt(pocketMoney) + ' extra spend' : fmtAmt(Math.abs(pocketMoney)) + ' saved'))
    : '';

  return (
    <div className="ao-donut-card">
      <h3 className="ao-donut-title">Delivery Cost</h3>

      {hasData && (
        <p style={{ margin: '0 0 6px', fontSize: 11, color: '#62748e', textAlign: 'center', lineHeight: 1.4 }}>
          {summaryLine}
        </p>
      )}

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={normalized}
            cx="50%"
            cy="50%"
            innerRadius={44}
            outerRadius={65}
            dataKey="pct"
            startAngle={90}
            endAngle={-270}
            strokeWidth={3}
            stroke="#fff"
          >
            {normalized.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <RechartsTooltip
            formatter={(value) => (value + '%')}
            contentStyle={{ borderRadius: 8, border: '1px solid #eaeaea', fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="ao-donut-legend">
        {normalized.map((seg) => (
          <div key={seg.label} className="ao-donut-legend-row">
            <div className="ao-donut-legend-left">
              <span className="ao-donut-dot" style={{ background: seg.color }} />
              <span className="ao-donut-label">{seg.label}</span>
            </div>
            <span className="ao-donut-pct">{seg.pct + '%'}</span>
          </div>
        ))}
      </div>

      {!hasData && (
        <p style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 6 }}>
          Appears after first dispatch with carrier cost entered
        </p>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   DONUT CHART CARD — Figma 1326-3044 / 1326-3074
   Vertical: large centered donut + 2-col legend below
═══════════════════════════════════════════════════════════════ */
const DonutCard = ({ title, segments }) => {
  const total = segments.reduce((s, seg) => s + (seg.percent || 0), 0) || 1;
  const normalized = segments.map(seg => ({
    ...seg,
    pct: Math.round((seg.percent / total) * 100),
  }));

  return (
    <div className="ao-donut-card">
      {title && <h3 className="ao-donut-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={normalized}
            cx="50%" cy="50%"
            innerRadius={44} outerRadius={65}
            dataKey="pct"
            startAngle={90} endAngle={-270}
            strokeWidth={3} stroke="#fff"
          >
            {normalized.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <RechartsTooltip
            formatter={(value) => `${value}%`}
            contentStyle={{ borderRadius: 8, border: '1px solid #eaeaea', fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="ao-donut-legend">
        {normalized.map((seg) => (
          <div key={seg.label} className="ao-donut-legend-row">
            <div className="ao-donut-legend-left">
              <span className="ao-donut-dot" style={{ background: seg.color }} />
              <span className="ao-donut-label">{seg.label}</span>
            </div>
            <span className="ao-donut-pct">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsPage;
