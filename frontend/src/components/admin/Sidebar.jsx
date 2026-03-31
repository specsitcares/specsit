import React, { useState } from 'react';
import {
  LayoutGrid, User, CheckCircle, CircleDollarSign, Briefcase, 
  ChevronDown, Search, Columns, LogOut, X
} from 'lucide-react';

const Sidebar = ({
  activeApp, setActiveApp,
  subView, setSubView,
  onClose, isMobile
}) => {
  const [expanded, setExpanded] = useState({
    Dashboards: true,
    Orders: false,
    Products: false,
    Inventory: false,
    Prescriptions: false,
    Shipments: false,
    Customers: false,
    Analytics: false,
    Settings: false
  });

  const toggleExpand = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    setActiveApp(key);
  };

  const menuItems = [
    {
      key: 'Dashboards', label: 'Dashboards', icon: <LayoutGrid size={20} />,
      subs: ['Defaults', 'eCommerce', 'Projects', 'Marketing']
    },
    {
      key: 'Orders', label: 'Orders', icon: <User size={20} />,
      subs: ['All Orders', 'Pending Orders']
    },
    {
      key: 'Products', label: 'Products Catalog', icon: <User size={20} />,
      subs: ['All Products', 'All Categories', 'All Brands', 'All Collections', 'All Variants']
    },
    {
      key: 'Inventory', label: 'Inventory & Stock', icon: <User size={20} />,
      subs: ['Current Stock', 'Low Stock', 'Restock Records']
    },
    {
      key: 'Prescriptions', label: 'Prescriptions', icon: <CheckCircle size={20} />,
      subs: ['All Prescriptions', 'Review Needed']
    },
    {
      key: 'Shipments', label: 'Shipments', icon: <CheckCircle size={20} />,
      subs: ['Track Shipments', 'Shipment Logs']
    },
    {
      key: 'Customers', label: 'Customers', icon: <CheckCircle size={20} />,
      subs: ['Customer Profiles', 'Reviews', 'Face Captures', 'Inquiries']
    },
    {
      key: 'Analytics', label: 'Analytics', icon: <CircleDollarSign size={20} />,
      subs: ['Sales Performance', 'Category Trends']
    },
    {
      key: 'Settings', label: 'Settings', icon: <Briefcase size={20} />,
      subs: ['System Settings', 'Staff Roles', 'Profile']
    }
  ];

  return (
    <aside className={`admin-sidebar-v3 ${isMobile ? 'open' : ''}`} style={{ width: '280px', height: '100vh', background: '#fff', borderRight: '1px solid #EAECF0', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
      
      <div className="sidebar-header-new" style={{ padding: '0 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <span style={{ fontSize: '14px', color: '#667085', fontWeight: 600 }}>Items</span>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Columns className="desktop-only" size={18} color="#667085" style={{ transform: 'rotate(-90deg)', cursor: 'pointer' }} />
            <X 
              className="mobile-only" 
              size={18} 
              color="#667085" 
              style={{ cursor: 'pointer', display: 'none' }} 
              onClick={onClose} 
            />
         </div>
      </div>

      <div className="sidebar-scrollable-area" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="sidebar-nav-stack" style={{ display: 'flex', flexDirection: 'column' }}>
          {menuItems.map(item => (
            <div key={item.key} className="nav-group-v3">
              <div 
                className={`nav-parent-btn ${activeApp === item.key ? 'active' : ''}`}
                onClick={() => toggleExpand(item.key)}
                style={{ 
                   padding: '12px 24px', 
                   display: 'flex', 
                   alignItems: 'center', 
                   justifyContent: 'space-between', 
                   cursor: 'pointer',
                   borderLeft: activeApp === item.key ? '4px solid #7F56D9' : '4px solid transparent',
                   color: activeApp === item.key ? '#101828' : '#667085',
                   fontWeight: activeApp === item.key ? 700 : 500,
                   transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: activeApp === item.key ? '#7F56D9' : '#667085' }}>{item.icon}</div>
                  <span style={{ fontSize: '15px' }}>{item.label}</span>
                </div>
                <ChevronDown size={16} style={{ opacity: 0.5 }} />
              </div>

              {expanded[item.key] && (
                <div className="nav-sub-items-area" style={{ marginTop: '4px' }}>
                  {item.subs.map(sub => (
                    <div 
                      key={sub} 
                      className={`nav-sub-choice ${subView === sub ? 'active' : ''}`}
                      onClick={() => setSubView(sub)}
                      style={{ 
                         padding: '10px 24px 10px 56px', 
                         fontSize: '14px', 
                         color: subView === sub ? '#101828' : '#475467', 
                         fontWeight: subView === sub ? 700 : 500,
                         cursor: 'pointer',
                         background: subView === sub ? '#F9FAFB' : 'transparent',
                         borderRadius: '6px',
                         margin: '2px 12px 2px 20px',
                         transition: 'background 0.2s ease'
                      }}
                    >
                      {sub}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
