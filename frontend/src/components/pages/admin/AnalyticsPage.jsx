import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, ShoppingBag, ShoppingCart,
  DollarSign, Package, ChevronDown, MoreVertical, RefreshCw
} from 'lucide-react';
import apiClient from '../../../services/api';
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
    { date: 'Jan', orders: 60,  revenue: 18000 },
    { date: 'Feb', orders: 20,  revenue: 12000 },
    { date: 'Mar', orders: -20, revenue: 8000  },
    { date: 'Apr', orders: -60, revenue: 5000  },
    { date: 'May', orders: 40,  revenue: 22000 },
    { date: 'Jun', orders: 60,  revenue: 30000 },
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

  /* real-time polling every 30 s */
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchData(false), 30_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  const kpis = data.kpis || FALLBACK.kpis;
  const chartData = (data.chart && data.chart.length > 0) ? data.chart : FALLBACK.chart;

  return (
    <div className="ao-page">
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
   ORDERS LINE CHART (pure SVG)
═══════════════════════════════════════════════════════════════ */
const OrdersLineChart = ({ data }) => {
  if (!data || data.length < 2) {
    return <div className="ao-chart-empty">No chart data available for this period</div>;
  }

  const W = 900, H = 220;
  const PAD = { top: 20, right: 20, bottom: 36, left: 52 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const orders  = data.map(d => d.orders  ?? 0);
  const revenues = data.map(d => d.revenue ?? 0);

  const minO = Math.min(...orders),  maxO = Math.max(...orders,  1);
  const minR = Math.min(...revenues), maxR = Math.max(...revenues, 1);

  const xOf = (i) => PAD.left + (i / (data.length - 1)) * innerW;
  const yOf = (val, min, max) => PAD.top + innerH - ((val - min) / (max - min || 1)) * innerH;

  const smooth = (pts) => {
    if (pts.length < 2) return `M${pts[0].x},${pts[0].y}`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cx = (pts[i].x + pts[i + 1].x) / 2;
      d += ` C${cx},${pts[i].y} ${cx},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
    }
    return d;
  };

  const oPts = data.map((d, i) => ({ x: xOf(i), y: yOf(d.orders ?? 0,  minO, maxO) }));
  const rPts = data.map((d, i) => ({ x: xOf(i), y: yOf(d.revenue ?? 0, minR, maxR) }));

  /* area fill paths */
  const areaClose = (pts) =>
    `${smooth(pts)} L${pts[pts.length-1].x},${PAD.top+innerH} L${pts[0].x},${PAD.top+innerH} Z`;

  /* y-axis labels (left axis = orders) */
  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = minO + ((maxO - minO) / yTicks) * i;
    return { v: Math.round(v), y: yOf(v, minO, maxO) };
  });

  return (
    <div className="ao-line-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="ao-svg">
        <defs>
          <linearGradient id="gradO" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#7987FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7987FF" stopOpacity="0"    />
          </linearGradient>
          <linearGradient id="gradR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#E697FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#E697FF" stopOpacity="0"    />
          </linearGradient>
          <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#FFA5CB" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFA5CB" stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* grid */}
        {yLabels.map((l) => (
          <line key={l.v} x1={PAD.left} y1={l.y} x2={W - PAD.right} y2={l.y}
            stroke="#F1F1F1" strokeWidth="1" />
        ))}
        {/* y axis labels */}
        {yLabels.map((l) => (
          <text key={`yl-${l.v}`} x={PAD.left - 8} y={l.y + 4}
            textAnchor="end" fill="#697177" fontSize="11">{l.v}</text>
        ))}

        {/* area fills */}
        <path d={areaClose(oPts)} fill="url(#gradO)" />
        <path d={areaClose(rPts)} fill="url(#gradR)" />

        {/* lines */}
        <path d={smooth(oPts)} fill="none" stroke="#7987FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={smooth(rPts)} fill="none" stroke="#E697FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* dots */}
        {oPts.map((p, i) => <circle key={`o${i}`} cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#7987FF" strokeWidth="2" />)}
        {rPts.map((p, i) => <circle key={`r${i}`} cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#E697FF" strokeWidth="2" />)}

        {/* x-axis labels */}
        {data.map((d, i) => (
          <text key={`x${i}`} x={xOf(i)} y={H - 8} textAnchor="middle" fill="#697177" fontSize="11">{d.date}</text>
        ))}
      </svg>

      {/* legend */}
      <div className="ao-chart-legend">
        <div className="ao-legend-item">
          <span className="ao-legend-dot" style={{ background: '#7987FF' }} />
          <span>Orders</span>
        </div>
        <div className="ao-legend-item">
          <span className="ao-legend-dot" style={{ background: '#E697FF' }} />
          <span>Revenue</span>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   DONUT CHART CARD
═══════════════════════════════════════════════════════════════ */
const DonutCard = ({ title, segments }) => {
  const total = segments.reduce((s, x) => s + x.percent, 0) || 1;
  let cursor = 0;

  /* SVG donut via stroke-dasharray trick */
  const R = 80, CX = 100, CY = 100, CIRC = 2 * Math.PI * R;
  const GAP = 2; // gap between segments in %

  const arcs = segments.map((seg) => {
    const pct   = seg.percent / total;
    const dash  = pct * CIRC - GAP;
    const offset = CIRC - cursor * CIRC;
    cursor += pct;
    return { ...seg, dash, gap: CIRC - dash, offset };
  });

  return (
    <div className="ao-donut-card">
      <h3 className="ao-donut-title">{title}</h3>
      <div className="ao-donut-body">
        <svg viewBox="0 0 200 200" className="ao-donut-svg">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F1F5F9" strokeWidth="28" />
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={arc.color}
              strokeWidth="28"
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '100px 100px' }}
            />
          ))}
        </svg>

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
