import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

// Always-loaded shell components (tiny — sidebar, topbar)
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import '../../../styles/admin.css';

// Lazy-loaded page components — only parsed when the route is visited
const DashboardHome          = lazy(() => import('./DashboardHome'));
const OrderTable             = lazy(() => import('./OrderTable'));
const OrderDetail            = lazy(() => import('./OrderDetail'));
const ReturnRequestDetail    = lazy(() => import('./ReturnRequestDetail'));
const ReplacementRequestDetail = lazy(() => import('./ReplacementRequestDetail'));
const WarrantyClaimDetail    = lazy(() => import('./WarrantyClaimDetail'));
const CustomerTable          = lazy(() => import('./CustomerTable'));
const PrescriptionTable      = lazy(() => import('./PrescriptionTable'));
const UserFaceTable          = lazy(() => import('./UserFaceTable'));
const ProductsPage           = lazy(() => import('./ProductsPage'));
const LensForm               = lazy(() => import('./LensForm'));
const ProductDetailsForm     = lazy(() => import('./ProductDetailsForm'));
const InventoryTable         = lazy(() => import('./InventoryTable'));
const ShipmentTable          = lazy(() => import('./ShipmentTable'));
const ReviewTable            = lazy(() => import('./ReviewTable'));
const EmployeeTable          = lazy(() => import('./EmployeeTable'));
const CouponTable            = lazy(() => import('./CouponTable'));
const CategoryTable          = lazy(() => import('./CategoryTable'));
const BrandTable             = lazy(() => import('./BrandTable'));
const CollectionTable        = lazy(() => import('./CollectionTable'));
const VariantTable           = lazy(() => import('./VariantTable'));
const LensManagement         = lazy(() => import('./LensManagement'));
const CmsManagement          = lazy(() => import('./CmsManagement'));
const HeroBannerEditor       = lazy(() => import('./HeroBannerEditor'));
const BrandLogosManager      = lazy(() => import('./BrandLogosManager'));
const FrameRangeEditor       = lazy(() => import('./FrameRangeEditor'));
const ExploreFrameStylesEditor = lazy(() => import('./ExploreFrameStylesEditor'));
const PremiumIntentEditor    = lazy(() => import('./PremiumIntentEditor'));
const PromoBannerEditor      = lazy(() => import('./PromoBannerEditor'));
const BlogsManager           = lazy(() => import('./BlogsManager'));
const FaqManager             = lazy(() => import('./FaqManager'));
const NewsletterEditor       = lazy(() => import('./NewsletterEditor'));
const BlogPostEditor         = lazy(() => import('./BlogPostEditor'));
const BlogPreview            = lazy(() => import('./BlogPreview'));
const AccessoryForm          = lazy(() => import('./AccessoryForm'));
const StoreSettings          = lazy(() => import('./StoreSettings'));
const PaymentSettings        = lazy(() => import('./PaymentSettings'));
const QueryTable             = lazy(() => import('./QueryTable'));
const AnalyticsPage          = lazy(() => import('./AnalyticsPage'));

// Thin skeleton shown while a lazy admin page chunk downloads
const AdminPageSkeleton = () => (
  <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    {[1,2,3,4,5].map(i => (
      <div key={i} style={{
        height: i === 1 ? 48 : 36,
        borderRadius: 8,
        background: 'linear-gradient(90deg, var(--bg-secondary,#1e1e2e) 25%, var(--bg-tertiary,#2a2a3e) 50%, var(--bg-secondary,#1e1e2e) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        opacity: 1 - i * 0.12,
      }} />
    ))}
    <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
  </div>
);

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
            <Suspense fallback={<AdminPageSkeleton />}>
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
              <Route path="orders/returns"  element={<OrderTable category="returns"    onViewDetails={id => navigate(`/admin/orders/${id}`)} onViewReturn={rid => navigate(`/admin/returns/${rid}`)} onViewReplacement={rid => navigate(`/admin/replacements/${rid}`)} />} />
              <Route path="orders/warranty" element={<OrderTable category="warranty"   onViewDetails={id => navigate(`/admin/orders/${id}`)} onViewWarranty={cid => navigate(`/admin/warranty/${cid}`)} />} />
              <Route path="returns/:returnId" element={<ReturnRequestDetail />} />
              <Route path="replacements/:returnId" element={<ReplacementRequestDetail />} />
              <Route path="warranty/:claimId" element={<WarrantyClaimDetail />} />
              <Route path="orders/:orderId" element={<OrderDetailRoute />} />

              {/* Products */}
              <Route path="products"                  element={<ProductsRoute />} />
              <Route path="products/new/lens"              element={<LensManagement />} />
              <Route path="products/new/frame"             element={<FrameFormRoute />} />
              <Route path="products/new/eyeglasses"        element={<EyeglassesFormRoute />} />
              <Route path="products/new/sunglasses"        element={<SunglassesFormRoute />} />
              <Route path="products/new/accessory"         element={<AccessoryForm />} />
              <Route path="products/edit/accessory/:id"    element={<AccessoryForm />} />
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
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
