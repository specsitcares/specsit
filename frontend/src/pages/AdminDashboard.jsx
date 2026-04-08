import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import Sidebar from '../components/admin/Sidebar';
import TopBar from '../components/admin/TopBar';
import DashboardHome from '../components/admin/DashboardHome';
import OrderTable from '../components/admin/OrderTable';
import CustomerTable from '../components/admin/CustomerTable';
import PrescriptionTable from '../components/admin/PrescriptionTable';
import UserFaceTable from '../components/admin/UserFaceTable';
import ProductTable from '../components/admin/ProductTable';
import ShipmentTable from '../components/admin/ShipmentTable';
import ReviewTable from '../components/admin/ReviewTable';
import EmployeeTable from '../components/admin/EmployeeTable';
import CouponTable from '../components/admin/CouponTable';
import CategoryTable from '../components/admin/CategoryTable';
import BrandTable from '../components/admin/BrandTable';
import CollectionTable from '../components/admin/CollectionTable';
import VariantTable from '../components/admin/VariantTable';
import LensManagement from '../components/admin/LensManagement';
import { useAuth } from '../context/AuthContext';
import OrderDetail from '../components/admin/OrderDetail';
import '../styles/admin.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeApp, setActiveApp] = useState('Dashboards');
  const [subView, setSubView] = useState('Defaults');
  const [primaryView, setPrimaryView] = useState('Dashboard');
  const [statsData, setStatsData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewingOrderId, setViewingOrderId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await apiClient.get('/sales/admin/stats/');
        setStatsData(statsRes.data);

        const ordersRes = await apiClient.get('/sales/admin/recent-orders/');
        setRecentOrders(ordersRes.data);
      } catch (err) {
        console.error('Failed to fetch admin dashboard data', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000); // 5s for real-time feel
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeApp === 'Orders') setPrimaryView('Order');
    else if (activeApp === 'Customers') setPrimaryView('Customers');
    else if (activeApp === 'Dashboards') setPrimaryView('Dashboard');
    else if (activeApp === 'Analytics') setPrimaryView('Analytics');
    else setPrimaryView(activeApp);
  }, [activeApp]);

  useEffect(() => {
    const map = {
      'All Orders': 'Order',
      'Return Window': 'Order',
      'Warranty Window': 'Order',
      'Profiles': 'Customers',
      'Customer Profiles': 'Customers',
      'Customer Queries': 'Queries',
      'All Prescriptions': 'Prescriptions',
      'Face Captures': 'UserFace',
      'All Products': 'Products',
      'All Categories': 'Categories',
      'All Brands': 'Brands',
      'All Collections': 'Collections',
      'All Variants': 'Variants',
      'Manage Lenses': 'Lenses',
      'Track Shipments': 'Shipments',
      'Pending Reviews': 'Reviews',
      'Employees': 'Staff',
      'Active Coupons': 'Coupons',
    };
    if (map[subView]) setPrimaryView(map[subView]);
  }, [subView]);

  const renderContent = () => {
    if (viewingOrderId) {
      return <OrderDetail orderId={viewingOrderId} onBack={() => setViewingOrderId(null)} />;
    }
    
    switch (primaryView) {
      case 'Dashboard':
      case 'Dashboards':
        return <DashboardHome statsData={statsData} recentOrders={recentOrders} onOrderClick={id => setViewingOrderId(id)} />;
      case 'Order':
      case 'Orders': {
        const cat = subView === 'Return Window' ? 'returns' : subView === 'Warranty Window' ? 'warranty' : null;
        return <OrderTable category={cat} onViewDetails={id => setViewingOrderId(id)} />;
      }
      case 'Customers':
        return <CustomerTable />;
      case 'Prescriptions':
        return <PrescriptionTable />;
      case 'UserFace':
        return <UserFaceTable />;
      case 'Products':
        return <ProductTable />;
      case 'Categories':
        return <CategoryTable />;
      case 'Brands':
        return <BrandTable />;
      case 'Collections':
        return <CollectionTable />;
      case 'Variants':
        return <VariantTable />;
      case 'Lenses':
        return <LensManagement />;
      case 'Shipments':
        return <ShipmentTable />;
      case 'Reviews':
        return <ReviewTable />;
      case 'Staff':
        return <EmployeeTable />;
      case 'Coupons':
        return <CouponTable />;
      default:
        return <DashboardHome statsData={statsData} recentOrders={recentOrders} />;
    }
  };

  return (
    <div className="admin-viewport-wrapper">
      <TopBar
        activeView={activeApp}
        setActiveView={setActiveApp}
        userName={user?.username || 'Olivia Rhye'}
        userRole="Admin"
        onLogout={logout}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="admin-layout-new">
        <Sidebar
          activeApp={activeApp}
          setActiveApp={setActiveApp}
          subView={subView}
          setSubView={setSubView}
          onClose={() => setSidebarOpen(false)}
          isMobile={sidebarOpen}
        />

        <div className="admin-main-container">
          {sidebarOpen && (
            <div 
              className="sidebar-backdrop mobile-only" 
              onClick={() => setSidebarOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 998 }}
            ></div>
          )}
          <main className="admin-content-scroller">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
