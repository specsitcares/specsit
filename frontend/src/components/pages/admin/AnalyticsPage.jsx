import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Download, ShoppingCart, Package, DollarSign, Percent, Search, Bell } from 'lucide-react';
import apiClient from '../../../services/api';
import '../../../styles/analytics.css';

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState('30');
  const [category, setCategory] = useState('all');
  const [data, setData] = useState({
    totalOrders: { value: 1936, trend: 12.5 },
    cartsCreated: { value: 3412, trend: 8.2 },
    avgOrderValue: { value: 156.78, trend: -2.3 },
    conversionRate: { value: 7.2, trend: 1.4 },
    ordersOverTime: [
      { date: 'Jan', orders: 250, revenue: 10000 },
      { date: 'Feb', orders: 290, revenue: 14000 },
      { date: 'Mar', orders: 310, revenue: 17000 },
      { date: 'Apr', orders: 280, revenue: 12000 },
      { date: 'May', orders: 400, revenue: 20000 },
      { date: 'Jun', orders: 420, revenue: 24000 }
    ],
    categoryBreakdown: [
      { category: 'Sunglasses', count: 58 },
      { category: 'Eyeglasses', count: 42 },
    ],
    topLenses: [
      { name: 'Polarized', sales: 340 },
      { name: 'Photochromic', sales: 290 },
      { name: 'Blue Light', sales: 260 },
      { name: 'Prescription', sales: 200 },
    ],
    frameMaterials: [
      { material: 'Acetate', unitsSold: 567, revenue: 28350 },
      { material: 'Metal', unitsSold: 423, revenue: 21150 },
      { material: 'Titanium', unitsSold: 289, revenue: 17340 },
      { material: 'Plastic', unitsSold: 234, revenue: 11700 },
    ],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, category]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/catalog/analytics/', {
        params: {
          days: timeRange,
          category: category !== 'all' ? category : undefined,
        },
      });
      // Merge fetched data with our fallback visual data if needed
      // but for now, we'll just use the fetched data if it exists and has items
      if (response.data && response.data.ordersOverTime && response.data.ordersOverTime.length > 0) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get('/catalog/analytics/export/', {
        params: {
          days: timeRange,
          category: category !== 'all' ? category : undefined,
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics-page-wrapper">
      {/* Top Header */}
      <header className="analytics-top-header">
        <div className="analytics-top-header-left">
          <h1>Eyewear Analytics</h1>
          <div className="analytics-search">
            <Search size={16} color="#9CA3AF" />
            <input type="text" placeholder="Search..." />
          </div>
        </div>
        <div className="analytics-top-header-right">
          <button className="icon-btn"><Bell size={20} /></button>
          <div className="avatar-placeholder">
            <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Profile" />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="analytics-tabs">
        <div className="tab active">Orders Overview</div>
        <div className="tab">Abandoned Carts</div>
        <div className="tab">Traffic & Clicks</div>
        <div className="tab">Exchanges/Returns</div>
        <div className="tab">Order Sources</div>
      </div>

      <div className="analytics-container">
        <div className="analytics-filters-bar">
          <div className="analytics-filters-left">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="analytics-select"
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="analytics-select"
            >
              <option value="all">All Products</option>
              <option value="sunglasses">Sunglasses</option>
              <option value="eyeglasses">Eyeglasses</option>
            </select>
            <select className="analytics-select">
              <option>Sunglasses</option>
            </select>
            <select className="analytics-select">
              <option>Eyeglasses</option>
            </select>
          </div>

          <button onClick={handleExport} className="analytics-export-btn">
            <Download size={16} /> Export Data
          </button>
        </div>

        <div className="analytics-kpi-grid">
          <KPICard
            title="Total Orders"
            value={data.totalOrders.value.toLocaleString()}
            trend={data.totalOrders.trend}
            icon={<ShoppingCart size={20} />}
          />
          <KPICard
            title="Carts Created"
            value={data.cartsCreated.value.toLocaleString()}
            trend={data.cartsCreated.trend}
            icon={<Package size={20} />}
          />
          <KPICard
            title="Average Order Value"
            value={`$${data.avgOrderValue.value.toFixed(2)}`}
            trend={data.avgOrderValue.trend}
            icon={<DollarSign size={20} />}
          />
          <KPICard
            title="Conversion Rate"
            value={`${data.conversionRate.value.toFixed(1)}%`}
            trend={data.conversionRate.trend}
            icon={<Percent size={20} />}
          />
        </div>

        <div className="analytics-full-width-chart">
          <h2>Orders Over Time</h2>
          <OrdersTrendLineChart data={data.ordersOverTime} />
        </div>

        <div className="analytics-bottom-grid">
          <div className="analytics-chart-container">
            <h2>Product Category Breakdown</h2>
            <CategoryPieChart data={data.categoryBreakdown} />
          </div>

          <div className="analytics-chart-container">
            <h2>Top Selling Lenses</h2>
            <TopLensesChart data={data.topLenses} />
          </div>

          <div className="analytics-chart-container">
            <h2>Frame Materials</h2>
            <FrameMaterialsTable data={data.frameMaterials} />
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, trend, icon }) => {
  const isPositive = trend >= 0;
  return (
    <div className="kpi-card">
      <div className="kpi-content">
        <div className="kpi-icon-container">
          {icon}
        </div>
        <div className="kpi-info">
          <span className="kpi-title">{title}</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{value}</span>
          </div>
        </div>
        <div className={`kpi-trend ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isPositive ? '+' : ''}{trend}%</span>
        </div>
      </div>
    </div>
  );
};

const OrdersTrendLineChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No data available</div>;
  }

  const width = 1000;
  const height = 300;
  const padding = { top: 20, right: 60, bottom: 30, left: 60 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxOrders = Math.max(...data.map(d => d.orders || 0), 600);
  const maxRevenue = Math.max(...data.map(d => d.revenue || 0), 24000);

  const getX = (index) => padding.left + (index / (data.length - 1)) * innerWidth;
  const getYOrders = (val) => padding.top + innerHeight - (val / maxOrders) * innerHeight;
  const getYRevenue = (val) => padding.top + innerHeight - (val / maxRevenue) * innerHeight;

  const createPath = (points) => {
    if (points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const orderPoints = data.map((d, i) => ({ x: getX(i), y: getYOrders(d.orders) }));
  const revenuePoints = data.map((d, i) => ({ x: getX(i), y: getYRevenue(d.revenue) }));

  // Generate grid lines
  const gridLines = [];
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (i / 4) * innerHeight;
    gridLines.push(<line key={`grid-${i}`} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />);
  }

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg" preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        {gridLines}
        
        {/* X Axis */}
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#d1d5db" />
        {data.map((d, i) => (
          <text key={`x-${i}`} x={getX(i)} y={height - 10} textAnchor="middle" fill="#6b7280" fontSize="12">
            {d.date}
          </text>
        ))}

        {/* Y Axis Left (Orders) */}
        {[0, 1, 2, 3, 4].map(i => {
          const val = (maxOrders / 4) * i;
          const y = getYOrders(val);
          return (
            <text key={`yl-${i}`} x={padding.left - 10} y={y + 4} textAnchor="end" fill="#6b7280" fontSize="12">
              {val}
            </text>
          );
        })}

        {/* Y Axis Right (Revenue) */}
        {[0, 1, 2, 3, 4].map(i => {
          const val = (maxRevenue / 4) * i;
          const y = getYRevenue(val);
          return (
            <text key={`yr-${i}`} x={width - padding.right + 10} y={y + 4} textAnchor="start" fill="#6b7280" fontSize="12">
              {val}
            </text>
          );
        })}

        {/* Lines */}
        <path d={createPath(orderPoints)} fill="none" stroke="#1f2937" strokeWidth="2" />
        <path d={createPath(revenuePoints)} fill="none" stroke="#F07D5B" strokeWidth="2" />

        {/* Points */}
        {orderPoints.map((p, i) => (
          <circle key={`op-${i}`} cx={p.x} cy={p.y} r="4" fill="white" stroke="#1f2937" strokeWidth="2" />
        ))}
        {revenuePoints.map((p, i) => (
          <circle key={`rp-${i}`} cx={p.x} cy={p.y} r="4" fill="white" stroke="#F07D5B" strokeWidth="2" />
        ))}
      </svg>
      <div className="trend-legend">
        <div className="legend-item">
          <span className="legend-line" style={{borderColor: '#1f2937'}}><span className="legend-dot" style={{borderColor: '#1f2937'}}></span></span>
          <span>orders</span>
        </div>
        <div className="legend-item">
          <span className="legend-line" style={{borderColor: '#F07D5B'}}><span className="legend-dot" style={{borderColor: '#F07D5B'}}></span></span>
          <span style={{color: '#F07D5B'}}>revenue</span>
        </div>
      </div>
    </div>
  );
};

const CategoryPieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No data available</div>;
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  // Match Figma colors
  const colors = ['#F07D5B', '#34A590']; 

  let cumulativePercent = 0;
  const segments = data.map((item, idx) => {
    const percent = (item.count / total) * 100;
    const startAngle = (cumulativePercent / 100) * 360;
    const endAngle = ((cumulativePercent + percent) / 100) * 360;
    cumulativePercent += percent;

    return {
      ...item,
      percent: percent.toFixed(0),
      startAngle,
      endAngle,
      color: colors[idx % colors.length],
    };
  });

  return (
    <div className="pie-chart-wrapper">
      <div className="pie-chart">
        {/* Floating labels to match design */}
        <div className="pie-label pie-label-top" style={{ color: colors[0] }}>
          {segments[0] && `${segments[0].category}: ${segments[0].percent}%`}
        </div>
        <svg viewBox="0 0 100 100" className="pie-svg">
          {segments.map((segment, idx) => (
            <PieSegment key={idx} segment={segment} />
          ))}
        </svg>
        <div className="pie-label pie-label-bottom" style={{ color: colors[1] }}>
          {segments[1] && `${segments[1].category}: ${segments[1].percent}%`}
        </div>
      </div>
    </div>
  );
};

const PieSegment = ({ segment }) => {
  const radius = 48;
  const centerX = 50;
  const centerY = 50;

  // Offset by -90 deg to start from top
  const startRad = ((segment.startAngle - 90) * Math.PI) / 180;
  const endRad = ((segment.endAngle - 90) * Math.PI) / 180;

  const x1 = centerX + radius * Math.cos(startRad);
  const y1 = centerY + radius * Math.sin(startRad);
  const x2 = centerX + radius * Math.cos(endRad);
  const y2 = centerY + radius * Math.sin(endRad);

  const largeArc = segment.endAngle - segment.startAngle > 180 ? 1 : 0;

  const pathData = [
    `M ${centerX} ${centerY}`,
    `L ${x1} ${y1}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
    'Z',
  ].join(' ');

  return (
    <path d={pathData} fill={segment.color} stroke="white" strokeWidth="1" />
  );
};

const TopLensesChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No data available</div>;
  }

  const maxSales = 360; // Fixed max scale to match image 0-90-180-270-360

  return (
    <div className="horizontal-bar-chart">
      <div className="bar-grid">
        <div className="bar-grid-line" style={{left: '0%'}}></div>
        <div className="bar-grid-line" style={{left: '25%'}}></div>
        <div className="bar-grid-line" style={{left: '50%'}}></div>
        <div className="bar-grid-line" style={{left: '75%'}}></div>
        <div className="bar-grid-line" style={{left: '100%'}}></div>
      </div>
      <div className="bar-items-container">
        {data.map((item, idx) => (
          <div key={idx} className="bar-item-row">
            <div className="bar-label-side">{item.name}</div>
            <div className="bar-track">
              <div
                className="bar-fill-teal"
                style={{ width: `${(item.sales / maxSales) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="bar-x-axis">
        <span>0</span>
        <span>90</span>
        <span>180</span>
        <span>270</span>
        <span>360</span>
      </div>
    </div>
  );
};

const FrameMaterialsTable = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No data available</div>;
  }

  return (
    <table className="materials-table">
      <thead>
        <tr>
          <th>Material</th>
          <th className="right-align">Units Sold</th>
          <th className="right-align">Revenue</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, idx) => (
          <tr key={idx}>
            <td>{item.material}</td>
            <td className="right-align">{item.unitsSold}</td>
            <td className="right-align bold-number">${item.revenue.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default AnalyticsPage;
