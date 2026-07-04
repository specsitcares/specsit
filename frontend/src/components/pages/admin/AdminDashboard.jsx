import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../../services/api';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import DashboardHome from './DashboardHome';
import OrderTable from './OrderTable';
import CustomerTable from './CustomerTable';
import PrescriptionTable from './PrescriptionTable';
import UserFaceTable from './UserFaceTable';
import ProductsPage from './ProductsPage';
import LensForm from './LensForm';
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
import HeroBannerEditor from './HeroBannerEditor';
import BrandLogosManager from './BrandLogosManager';
import FrameRangeEditor from './FrameRangeEditor';
import ExploreFrameStylesEditor from './ExploreFrameStylesEditor';
import PremiumIntentEditor from './PremiumIntentEditor';
import PromoBannerEditor from './PromoBannerEditor';
import BlogsManager from './BlogsManager';
import FaqManager from './FaqManager';
import NewsletterEditor from './NewsletterEditor';
import BlogPostEditor from './BlogPostEditor';
import BlogPreview from './BlogPreview';
import StoreSettings from './StoreSettings';
import PaymentSettings from './PaymentSettings';
import QueryTable from './QueryTable';
import AnalyticsPage from './AnalyticsPage';
import { useAuth } from '../../../context/AuthContext';
import OrderDetail from './OrderDetail';
import ReturnRequestDetail from './ReturnRequestDetail';
import WarrantyClaimDetail from './WarrantyClaimDetail';
import '../../../styles/admin.css';

/* ── Route wrappers that pull params from the URL ─────────── */

const OrderDetailRoute = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  return <OrderDetail orderId={parseInt(orderId)} onBack={() => navigate(-1)} />;
};

const ProductsRoute = () => {
  const navigate = useNavigate();
  return (
    <ProductsPage
      onAddNew={(type) => navigate(`/admin/products/new/${type}`)}
      onEdit={(type, id) => navigate(`/admin/products/edit/${type}/${id}`)}
    />
  );
};

const LensFormRoute = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <LensForm
      productId={id ? parseInt(id) : null}
      onBack={() => navigate('/admin/products')}
      onSaved={() => navigate('/admin/products')}
    />
  );
};

const LensManagementRoute = () => {
  const { id } = useParams();
  // id here may be a lens id for editing; pass it down to LensManagement
  return <LensManagement editLensId={id ? parseInt(id) : null} />;
};

const FrameFormRoute = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <ProductDetailsForm
      onBack={() => navigate('/admin/products')}
      editProduct={id ? { id: parseInt(id) } : null}
    />
  );
};

const EyeglassesFormRoute = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <ProductDetailsForm
      onBack={() => navigate('/admin/products')}
      editProduct={id ? { id: parseInt(id) } : null}
      productType="eyeglasses"
    />
  );
};

const SunglassesFormRoute = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <ProductDetailsForm
      onBack={() => navigate('/admin/products')}
      editProduct={id ? { id: parseInt(id) } : null}
      productType="sunglasses"
    />
  );
};

/* ── Main dashboard shell ─────────────────────────────────── */

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  }, []);

  const badges = statsData ? {
    Orders:        parseInt(statsData.stats?.find(s => s.title === 'Pending Orders')?.value        || 0),
    Prescriptions: parseInt(statsData.stats?.find(s => s.title === 'Pending Prescriptions')?.value || 0),
    Inventory:    (parseInt(statsData.attention?.find(a => a.icon === 'AlertTriangle')?.count      || 0) +
                   parseInt(statsData.attention?.find(a => a.icon === 'AlertCircle')?.count        || 0)),
    Shipments:     parseInt(statsData.stats?.find(s => s.title === 'Active Shipments')?.value      || 0),
  } : {};

  const handleDashboardNavigate = ({ view, filter }) => {
    if (view === 'Inventory') {
      navigate(filter === 'low' ? '/admin/inventory/low' : filter === 'out' ? '/admin/inventory/out' : '/admin/inventory');
    } else if (view === 'Prescriptions') {
      navigate('/admin/prescriptions');
    } else if (view === 'Shipments') {
      navigate('/admin/shipments');
    }
  };

  return (
    <div className="admin-viewport-wrapper">
      <TopBar
        userName={user?.username || 'Admin'}
        userRole="Admin"
        onLogout={logout}
        toggleSidebar={() => setSidebarOpen(prev => !prev)}
      />

      <div className="admin-layout-new">
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          isMobile={sidebarOpen}
          badges={badges}
        />

        <div className="admin-main-container">
          {sidebarOpen && (
            <div
              className="sidebar-backdrop mobile-only"
              onClick={() => setSidebarOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 998 }}
            />
          )}
          <main className="admin-content-scroller">
            <Routes>
              {/* Dashboard */}
              <Route index element={
                <DashboardHome
                  recentOrders={recentOrders}
                  onOrderClick={id => navigate(`/admin/orders/${id}`)}
                  onNavigate={handleDashboardNavigate}
                />
              } />

              {/* Orders */}
              <Route path="orders"          element={<OrderTable category={null}       onViewDetails={id => navigate(`/admin/orders/${id}`)} />} />
              <Route path="orders/returns"  element={<OrderTable category="returns"    onViewDetails={id => navigate(`/admin/orders/${id}`)} onViewReturn={rid => navigate(`/admin/returns/${rid}`)} />} />
              <Route path="orders/warranty" element={<OrderTable category="warranty"   onViewDetails={id => navigate(`/admin/orders/${id}`)} onViewWarranty={cid => navigate(`/admin/warranty/${cid}`)} />} />
              <Route path="returns/:returnId" element={<ReturnRequestDetail />} />
              <Route path="warranty/:claimId" element={<WarrantyClaimDetail />} />
              <Route path="orders/:orderId" element={<OrderDetailRoute />} />

              {/* Products */}
              <Route path="products"                  element={<ProductsRoute />} />
              <Route path="products/new/lens"              element={<LensManagement />} />
              <Route path="products/new/frame"             element={<FrameFormRoute />} />
              <Route path="products/new/eyeglasses"        element={<EyeglassesFormRoute />} />
              <Route path="products/new/sunglasses"        element={<SunglassesFormRoute />} />
              <Route path="products/edit/lens/:id"         element={<LensManagementRoute />} />
              <Route path="products/edit/frame/:id"        element={<FrameFormRoute />} />
              <Route path="products/edit/eyeglasses/:id"   element={<EyeglassesFormRoute />} />
              <Route path="products/edit/sunglasses/:id"   element={<SunglassesFormRoute />} />
              <Route path="products/categories"       element={<CategoryTable />} />
              <Route path="products/brands"           element={<BrandTable />} />
              <Route path="products/collections"      element={<CollectionTable />} />
              <Route path="products/variants"         element={<VariantTable />} />
              <Route path="products/lenses"           element={<LensManagement />} />

              {/* Inventory */}
              <Route path="inventory"     element={<InventoryTable initialFilter="all" />} />
              <Route path="inventory/low" element={<InventoryTable initialFilter="low" />} />
              <Route path="inventory/out" element={<InventoryTable initialFilter="out" />} />

              {/* Prescriptions */}
              <Route path="prescriptions" element={<PrescriptionTable />} />

              {/* Shipments */}
              <Route path="shipments" element={<ShipmentTable />} />

              {/* Customers */}
              <Route path="customers"          element={<CustomerTable />} />
              <Route path="customers/reviews"  element={<ReviewTable />} />
              <Route path="customers/faces"    element={<UserFaceTable />} />
              <Route path="customers/inquiries" element={<QueryTable />} />

              {/* Analytics */}
              <Route path="analytics" element={<AnalyticsPage />} />

              {/* Settings */}
              <Route path="settings"         element={<StoreSettings />} />
              <Route path="settings/payment" element={<PaymentSettings />} />
              <Route path="settings/cms"     element={<CmsManagement />} />
              <Route path="settings/cms/hero-banner" element={<HeroBannerEditor />} />
              <Route path="settings/cms/brand-logos" element={<BrandLogosManager />} />
              <Route path="settings/cms/frame-range" element={<FrameRangeEditor />} />
              <Route path="settings/cms/explore-frame-styles" element={<ExploreFrameStylesEditor />} />
              <Route path="settings/cms/premium-intent" element={<PremiumIntentEditor />} />
              <Route path="settings/cms/promo-banner-1" element={<PromoBannerEditor sectionKey="promo_banner_1" breadcrumb="Promotional Banner Management" pageTitle="Promo Banner 1" />} />
              <Route path="settings/cms/promo-banner-2" element={<PromoBannerEditor sectionKey="promo_banner_2" breadcrumb="Promotional Banner Management" pageTitle="Promo Banner 2" />} />
              <Route path="settings/cms/blogs" element={<BlogsManager />} />
              <Route path="settings/cms/blogs/new" element={<BlogPostEditor />} />
              <Route path="settings/cms/blogs/:id/edit" element={<BlogPostEditor />} />
              <Route path="settings/cms/blogs/:id/preview" element={<BlogPreview />} />
              <Route path="settings/cms/faqs" element={<FaqManager />} />
              <Route path="settings/cms/newsletter" element={<NewsletterEditor />} />
              <Route path="settings/staff"   element={<EmployeeTable />} />
              <Route path="settings/coupons" element={<CouponTable />} />

              {/* Fallback */}
              <Route path="*" element={
                <DashboardHome
                  recentOrders={recentOrders}
                  onOrderClick={id => navigate(`/admin/orders/${id}`)}
                  onNavigate={handleDashboardNavigate}
                />
              } />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
