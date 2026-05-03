import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../../services/api';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import DashboardHome from './DashboardHome';
import OrderTable from './OrderTable';
import CustomerTable from './CustomerTable';
import PrescriptionTable from './PrescriptionTable';
import UserFaceTable from './UserFaceTable';
import ProductTable from './ProductTable';
import ProductsPage from './ProductsPage';
import LensForm from './LensForm';
import FrameForm from './FrameForm';
import ProductDetailsForm from './ProductDetailsForm';
import InventoryTable from './InventoryTable';
import ShipmentTable from './ShipmentTable';
import ReviewTable from './ReviewTable';
import EmployeeTable from './EmployeeTable';
import CouponTable from './CouponTable';
import CategoryTable from './CategoryTable';
import BrandTable from './BrandTable';
import CollectionTable from './CollectionTable';
import VariantTable from './VariantTable';
import LensManagement from './LensManagement';
import CmsManagement from './CmsManagement';
import StoreSettings from './StoreSettings';
import { useAuth } from '../../../context/AuthContext';
import OrderDetail from './OrderDetail';
import '../../../styles/admin.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeApp, setActiveApp] = useState('Dashboards');
  const [subView, setSubView] = useState('Defaults');
  const [primaryView, setPrimaryView] = useState('Dashboard');
  const [statsData, setStatsData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewingOrderId, setViewingOrderId] = useState(null);
  const [inventoryFilter, setInventoryFilter] = useState('all');
  // Product form navigation state
  const [productFormType, setProductFormType] = useState(null); // 'lens' | 'frame'
  const [productFormId, setProductFormId] = useState(null); // null = create, id = edit

  // Browser back-button intercept
  const navHistoryRef = useRef([]);
  const isGoingBackRef = useRef(false);
  const isInitializedRef = useRef(false);
  const prevNavRef = useRef(null);
  const settleTimerRef = useRef(null);

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
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setProductFormType(null);
    setProductFormId(null);
    if (activeApp === 'Orders') setPrimaryView('Order');
    else if (activeApp === 'Customers') setPrimaryView('Customers');
    else if (activeApp === 'Dashboards') setPrimaryView('Dashboard');
    else if (activeApp === 'Analytics') setPrimaryView('Analytics');
    else setPrimaryView(activeApp);
  }, [activeApp]);

  // Track navigation — debounced with setTimeout(0) so cascading React effects
  // (e.g. [activeApp] effect → setPrimaryView) all settle before we snapshot.
  // Watches every nav variable so sub-view changes are also captured.
  useEffect(() => {
    const current = { primaryView, activeApp, subView, viewingOrderId, productFormType, productFormId, inventoryFilter };

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      prevNavRef.current = current;
      window.history.pushState({ adminPanel: true }, '');
      return;
    }

    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);

    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;

      if (isGoingBackRef.current) {
        isGoingBackRef.current = false;
        prevNavRef.current = current;
        return;
      }

      const prev = prevNavRef.current;
      const changed = prev && (
        prev.primaryView !== current.primaryView ||
        prev.subView !== current.subView ||
        prev.viewingOrderId !== current.viewingOrderId ||
        prev.productFormType !== current.productFormType
      );

      if (changed) {
        navHistoryRef.current.push({ ...prev });
        window.history.pushState({ adminPanel: true }, '');
      }

      prevNavRef.current = current;
    }, 0);
  }, [primaryView, activeApp, subView, viewingOrderId, productFormType, productFormId, inventoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intercept browser back button — restore internal nav state instead of leaving
  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState({ adminPanel: true }, ''); // keep admin reachable
      const prev = navHistoryRef.current.pop();
      if (prev) {
        isGoingBackRef.current = true;
        setPrimaryView(prev.primaryView);
        setActiveApp(prev.activeApp);
        setSubView(prev.subView);
        setViewingOrderId(prev.viewingOrderId);
        setProductFormType(prev.productFormType);
        setProductFormId(prev.productFormId);
        setInventoryFilter(prev.inventoryFilter);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      'Current Stock': 'Inventory',
      'Low Stock': 'Inventory',
      'Restock Records': 'Inventory',
      'Track Shipments': 'Shipments',
      'Reviews': 'Reviews',
      'Pending Reviews': 'Reviews',
      'Employees': 'Staff',
      'Active Coupons': 'Coupons',
      'CMS Management': 'CMS',
      'Store Settings': 'StoreSettings',
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
      case 'Analytics':
        return <DashboardHome recentOrders={recentOrders} onOrderClick={id => setViewingOrderId(id)} onNavigate={({ view, filter }) => { setInventoryFilter(filter || 'all'); setPrimaryView(view); }} />;
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
        if (productFormType === 'lens') {
          return <LensForm productId={productFormId} onBack={() => { setProductFormType(null); setProductFormId(null); }} onSaved={() => { setProductFormType(null); setProductFormId(null); }} />;
        }
        if (productFormType === 'frame') {
          return <ProductDetailsForm onBack={() => { setProductFormType(null); setProductFormId(null); }} editProduct={productFormId ? { id: productFormId } : null} />;
        }
        return <ProductsPage
          onAddNew={(type) => { setProductFormType(type); setProductFormId(null); }}
          onEdit={(type, id) => { setProductFormType(type); setProductFormId(id); }}
        />;
      case 'Categories':
        return <CategoryTable />;
      case 'Brands':
        return <BrandTable />;
      case 'Collections':
        return <CollectionTable />;
      case 'Variants':
        return <VariantTable />;
      case 'Inventory':
        return <InventoryTable initialFilter={inventoryFilter} />;
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
      case 'CMS':
        return <CmsManagement />;
      case 'StoreSettings':
        return <StoreSettings />;
      default:
        return <DashboardHome recentOrders={recentOrders} />;
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
