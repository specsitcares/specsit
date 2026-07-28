import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, ChevronDown, Menu
} from 'lucide-react';

const TOP_NAV_TABS = [
  { label: 'Dashboard', path: '/admin' },
  { label: 'Order',     path: '/admin/orders' },
  { label: 'Analytics', path: '/admin/analytics' },
];

const TopBar = ({
  userName = "Olivia Rhye",
  userRole = "Admin",
  onLogout,
  toggleSidebar
}) => {
  // These used to be driven by an `activeView`/`setActiveView` pair that was
  // never actually passed in from AdminDashboard (it renders real routes via
  // react-router, not a view-switch state) — so both were always undefined and
  // every tab click called `setActiveView(...)` as a function, which silently
  // threw and did nothing. Routes with react-router instead, same as Sidebar.jsx.
  const navigate = useNavigate();
  const location = useLocation();
  const isTabActive = (path) => path === '/admin'
    ? (location.pathname === '/admin' || location.pathname === '/admin/')
    : location.pathname.startsWith(path);
  const SpecsitLogo = (
    <svg width="60" height="30" viewBox="0 0 62 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M53.3456 28.5941C53.3456 30.0701 52.9065 31.2534 52.0281 32.1439C51.162 33.0223 49.9665 33.2662 48.5027 33.4736C45.5384 33.864 42.3179 32.5709 41.4029 30.8387C40.4758 29.1064 40.0123 26.8375 40.0123 24.0317V23.1534C40.0123 20.4087 40.4758 18.1641 41.4029 16.4074C42.3179 14.6386 45.7701 13.065 48.4417 13.7969C49.9299 14.1995 51.1864 14.3336 52.0525 15.4193C52.9187 16.4928 53.3456 17.8591 53.3456 19.4937H61.1163L61.1651 19.3108C61.2505 15.6877 60.1038 12.7722 57.7494 10.552C55.6268 8.55139 52.8821 7.45349 49.5396 7.27051L29.3871 0L27.5085 5.2333L39.7439 9.78347C38.9876 10.3324 38.2922 10.9912 37.6579 11.7353C35.5109 14.2848 34.2666 17.4199 33.9495 21.1284H31.7903C31.4365 17.3955 30.18 14.2482 28.033 11.7231C25.947 9.28332 23.2389 7.83166 19.8842 7.3803H19.8598L1.98849 0.927112L8.01086e-05 6.47758L9.00282 9.83227C8.52707 10.2226 8.08791 10.6496 7.67315 11.1253C5.40416 13.7237 4.26967 17.2248 4.26967 21.6163V26.0201H23.1047L23.1901 26.2031C23.0559 28.3623 22.3972 30.1067 21.2139 31.4486C20.0428 32.8027 18.2983 33.4736 15.9806 33.4736C14.0653 33.4736 12.4551 33.2784 11.1132 32.8881C9.78355 32.4977 8.40508 31.9 6.99002 31.107L4.68444 36.3525C5.95311 37.3894 7.66095 38.2556 9.82015 38.9509C11.9793 39.6584 14.3337 40 16.8833 40C21.592 40 25.2639 38.5605 27.911 35.6694C30.0824 33.3028 31.3633 30.3751 31.7659 26.874H34.0226C34.4374 30.2775 35.6573 33.1564 37.6701 35.523C40.2197 38.5117 43.8305 40 48.5027 40C52.1257 40 55.151 38.9265 57.603 36.7795C60.055 34.6325 61.2505 31.961 61.1651 28.7649L61.1163 28.5941H53.3456ZM23.0071 20.3965H12.6259V19.7499C12.6259 17.9079 13.004 16.444 13.7604 15.3827C14.5167 14.3214 15.7488 13.7969 17.4322 13.7969C19.1157 13.7969 20.4697 14.3824 21.3968 15.5657C22.3118 16.7368 22.8729 18.2983 23.0681 20.2501L23.0071 20.3965Z" fill="white" />
      <path d="M52.2726 24.0077C52.2726 26.6305 50.1378 28.7653 47.515 28.7653C44.8923 28.7653 42.7575 26.6305 42.7575 24.0077C42.7575 21.385 44.8801 19.2502 47.515 19.2502C50.15 19.2502 52.2726 21.3728 52.2726 24.0077Z" fill="white" />
    </svg>
  );

  return (
    <nav className="top-nav-main-purple" style={{ height: '45px', background: '#68408D', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#FEFCFF' }}>

      {/* BRANDING and NAV TABS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
        <button
          className="mobile-sidebar-trigger"
          onClick={toggleSidebar}
          style={{ display: 'none', background: 'transparent', border: 'none', color: '#FEFCFF', cursor: 'pointer', outline: 'none' }}
        >
          <Menu size={20} />
        </button>
        <div className="brand">{SpecsitLogo}</div>
         <div className="nav-pill-container" style={{ display: 'flex', alignItems: 'center', background: '#2D1B3D', padding: '3px', borderRadius: '6px', gap: '2px' }}>
          {TOP_NAV_TABS.map(({ label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: isTabActive(path) ? '#68408D' : 'transparent',
                color: '#FEFCFF',
                fontWeight: 500,
                fontSize: '11px',
                lineHeight: 1.5,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ACTIONS and USER PROFILE */}
      <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
        <div className="profile-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '13px' }}>
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#FEFCFF' }}>{userName}</span>
              <span style={{ fontSize: '10px', fontWeight: 400, color: '#FEFCFF' }}>{userRole}</span>
            </div>
          </div>
          <LogOut size={20} onClick={onLogout} style={{ cursor: 'pointer', color: '#FEFCFF' }} />
        </div>
      </div>
    </nav>
  );
};

export default TopBar;
