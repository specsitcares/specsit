import React, { useState } from 'react';
import {
  LayoutGrid, ShoppingCart, Package, Box, CheckCircle,
  Truck, Users, BarChart2, Settings, ChevronDown, Columns, X,
} from 'lucide-react';

const Sidebar = ({ activeApp, setActiveApp, subView, setSubView, onClose, isMobile }) => {
  const [expanded, setExpanded] = useState({
    Dashboards: true,
    Orders: false,
    Products: false,
    Inventory: false,
    Prescriptions: false,
    Shipments: false,
    Customers: false,
    Analytics: false,
    Settings: false,
  });

  const toggleExpand = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    setActiveApp(key);
  };

  const menuItems = [
    { key: 'Dashboards',  label: 'Dashboards',       icon: LayoutGrid,   subs: ['Defaults', 'eCommerce', 'Projects', 'Marketing'] },
    { key: 'Orders',      label: 'Orders',            icon: ShoppingCart, subs: ['All Orders', 'Return Window', 'Warranty Window'] },
    { key: 'Products',    label: 'Products Catalog',  icon: Package,      subs: ['All Products', 'All Categories', 'All Brands', 'All Collections', 'All Variants', 'Manage Lenses'] },
    { key: 'Inventory',   label: 'Inventory & Stock', icon: Box,          subs: ['Current Stock', 'Low Stock', 'Restock Records'] },
    { key: 'Prescriptions', label: 'Prescriptions',  icon: CheckCircle,  subs: ['All Prescriptions', 'Review Needed'] },
    { key: 'Shipments',   label: 'Shipments',         icon: Truck,        subs: ['Track Shipments', 'Shipment Logs'] },
    { key: 'Customers',   label: 'Customers',         icon: Users,        subs: ['Customer Profiles', 'Reviews', 'Face Captures', 'Inquiries'] },
    { key: 'Analytics',   label: 'Analytics',         icon: BarChart2,    subs: ['Sales Performance', 'Category Trends'] },
    { key: 'Settings',    label: 'Settings',          icon: Settings,     subs: ['Store Settings', 'Payment Settings', 'CMS Management', 'Staff Roles', 'Profile'] },
  ];

  const isActive = (key) => activeApp === key;

  return (
    <aside
      className={`admin-sidebar-v3 ${isMobile ? 'open' : ''}`}
      style={{ width: 220, height: '100vh', background: '#fff', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}
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
            const active = isActive(item.key);
            return (
              <div key={item.key}>
                {/* Parent item */}
                <div
                  onClick={() => toggleExpand(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 4,
                    borderLeft: active ? '3px solid #68408d' : '3px solid transparent',
                    cursor: 'pointer',
                    background: 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                    <Icon size={18} color={active ? '#68408d' : '#697177'} style={{ flexShrink: 0 }} />
                    <span style={{
                      fontSize: 13,
                      fontWeight: active ? 500 : 400,
                      color: '#040205',
                      lineHeight: 1.5,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {item.label}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    color="#697177"
                    style={{ flexShrink: 0, transform: expanded[item.key] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  />
                </div>

                {/* Sub-items */}
                {expanded[item.key] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}>
                    {item.subs.map(sub => {
                      const subActive = subView === sub;
                      return (
                        <div
                          key={sub}
                          onClick={() => setSubView(sub)}
                          style={{
                            padding: '5px 10px 5px 36px',
                            fontSize: 13,
                            fontWeight: subActive ? 500 : 400,
                            color: '#040205',
                            cursor: 'pointer',
                            background: subActive ? '#f5f5f5' : '#fff',
                            borderRadius: 4,
                            lineHeight: 1.5,
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
