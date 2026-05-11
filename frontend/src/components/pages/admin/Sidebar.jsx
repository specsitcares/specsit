import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid, ShoppingCart, Package, Box, CheckCircle,
  Truck, Users, BarChart2, Settings, ChevronDown, Columns, X,
} from 'lucide-react';

/* ── URL mapping for every sidebar sub-item ─────────────── */
const SUB_URLS = {
  // Dashboard
  'Dashboard':          '/admin',
  // Orders
  'All Orders':         '/admin/orders',
  'Return Window':      '/admin/orders/returns',
  'Warranty Window':    '/admin/orders/warranty',
  // Products
  'All Products':       '/admin/products',
  'All Categories':     '/admin/products/categories',
  'All Brands':         '/admin/products/brands',
  'Manage Lenses':      '/admin/products/lenses',
  'Coupons':            '/admin/settings/coupons',
  // Inventory
  'Current Stock':      '/admin/inventory',
  // Prescriptions
  'All Prescriptions':  '/admin/prescriptions',
  // Shipments
  'Track Shipments':    '/admin/shipments',
  // Customers
  'Customer Profiles':  '/admin/customers',
  'Reviews':            '/admin/customers/reviews',
  'Face Captures':      '/admin/customers/faces',
  'Inquiries':          '/admin/customers/inquiries',
  // Analytics
  'Sales Performance':  '/admin/analytics',
  // Settings
  'Store Settings':     '/admin/settings',
  'Payment Settings':   '/admin/settings/payment',
  'CMS Management':     '/admin/settings/cms',
  'Staff Roles':        '/admin/settings/staff',
};

/* Base URL prefix for each parent section — used to detect active parent */
const PARENT_PREFIX = {
  'Dashboard':     ['/admin'],
  'Orders':        ['/admin/orders'],
  'Products':      ['/admin/products'],
  'Inventory':     ['/admin/inventory'],
  'Prescriptions': ['/admin/prescriptions'],
  'Shipments':     ['/admin/shipments'],
  'Customers':     ['/admin/customers'],
  'Analytics':     ['/admin/analytics'],
  'Settings':      ['/admin/settings'],
};

const Badge = ({ count }) => {
  if (!count || count <= 0) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '1px 6px', borderRadius: 5,
      background: '#F9F5FF', border: '1px solid #68408D',
      color: '#040205', fontSize: 11, fontWeight: 500,
      lineHeight: '13px', letterSpacing: '-0.07px',
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
};

const menuItems = [
  { key: 'Dashboard',     label: 'Dashboard',         icon: LayoutGrid,   subs: ['Dashboard'] },
  { key: 'Orders',        label: 'Orders',            icon: ShoppingCart, subs: ['All Orders', 'Return Window', 'Warranty Window'] },
  { key: 'Products',      label: 'Products Catalog',  icon: Package,      subs: ['All Products', 'All Categories', 'All Brands', 'Manage Lenses', 'Coupons'] },
  { key: 'Inventory',     label: 'Inventory & Stock', icon: Box,          subs: ['Current Stock'] },
  { key: 'Prescriptions', label: 'Prescriptions',     icon: CheckCircle,  subs: ['All Prescriptions'] },
  { key: 'Shipments',     label: 'Shipments',         icon: Truck,        subs: ['Track Shipments'] },
  { key: 'Customers',     label: 'Customers',         icon: Users,        subs: ['Customer Profiles', 'Reviews', 'Face Captures', 'Inquiries'] },
  { key: 'Analytics',     label: 'Analytics',         icon: BarChart2,    subs: ['Sales Performance'] },
  { key: 'Settings',      label: 'Settings',          icon: Settings,     subs: ['Store Settings', 'Payment Settings', 'CMS Management', 'Staff Roles'] },
];

const Sidebar = ({ onClose, isMobile, badges = {} }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  /* Determine which parent is active based on the current URL */
  const getActiveParent = () => {
    if (path === '/admin' || path === '/admin/') return 'Dashboard';
    for (const item of menuItems) {
      const prefixes = PARENT_PREFIX[item.key] || [];
      for (const prefix of prefixes) {
        if (prefix !== '/admin' && (path.startsWith(prefix + '/') || path === prefix)) return item.key;
      }
    }
    return 'Orders';
  };

  const activeParent = getActiveParent();

  const [expanded, setExpanded] = useState(() => {
    const initial = {};
    for (const item of menuItems) initial[item.key] = item.key === activeParent;
    return initial;
  });

  useEffect(() => {
    setExpanded(prev => ({ ...prev, [activeParent]: true }));
  }, [activeParent]);

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const activeSub = (() => {
    let best = null;
    let bestLen = -1;
    for (const item of menuItems) {
      for (const sub of item.subs) {
        const url = SUB_URLS[sub];
        if (!url) continue;
        if (url === '/admin' || url === '/admin/') {
          if ((path === '/admin' || path === '/admin/') && url.length > bestLen) {
            best = sub; bestLen = url.length;
          }
        } else if ((path === url || path.startsWith(url + '/')) && url.length > bestLen) {
          best = sub; bestLen = url.length;
        }
      }
    }
    return best;
  })();

  const isSubActive = (sub) => sub === activeSub;

  return (
    <aside
      className={`admin-sidebar-v3 ${isMobile ? 'open' : ''}`}
      style={{ width: 248, height: '100vh', background: '#fff', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#697177', lineHeight: 1.5 }}>Items</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Columns className="desktop-only" size={16} color="#697177" style={{ transform: 'rotate(-90deg)', cursor: 'pointer' }} />
          <X
            className="mobile-only"
            size={16}
            color="#697177"
            style={{ cursor: 'pointer', display: 'none' }}
            onClick={onClose}
          />
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = activeParent === item.key;
            return (
              <div key={item.key}>
                {/* Parent row */}
                <div
                  onClick={() => toggle(item.key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 10px', borderRadius: 4,
                    borderLeft: active ? '3px solid #68408d' : '3px solid transparent',
                    cursor: 'pointer', background: 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                    <Icon size={18} color={active ? '#68408d' : '#697177'} style={{ flexShrink: 0 }} />
                    <span style={{
                      fontSize: 13, fontWeight: active ? 500 : 400,
                      color: '#040205', lineHeight: 1.5,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                    }}>
                      {item.label}
                    </span>
                    <Badge count={badges[item.key]} />
                  </div>
                  <ChevronDown
                    size={16} color="#697177"
                    style={{ flexShrink: 0, transform: expanded[item.key] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  />
                </div>

                {/* Sub-items */}
                {expanded[item.key] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}>
                    {item.subs.map(sub => {
                      const subActive = isSubActive(sub);
                      return (
                        <div
                          key={sub}
                          onClick={() => { navigate(SUB_URLS[sub] || '/admin'); if (isMobile) onClose(); }}
                          style={{
                            padding: '5px 10px 5px 36px', fontSize: 13,
                            fontWeight: subActive ? 500 : 400,
                            color: subActive ? '#68408d' : '#040205',
                            cursor: 'pointer',
                            background: subActive ? '#f5f0ff' : '#fff',
                            borderRadius: 4, lineHeight: 1.5,
                            transition: 'background 0.15s',
                          }}
                        >
                          {sub}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
