import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { GuestOnly, RequireAdmin, RequireAuth } from './components/layout/RouteGuards.jsx';
import { PageLoader } from './components/ui/Feedback.jsx';
import { useSocketEvent } from './hooks/useSocket.js';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';
import VerifyEmailPage from './pages/auth/VerifyEmailPage.jsx';
import CreateOrderPage from './pages/CreateOrderPage.jsx';
import KycPage from './pages/KycPage.jsx';
import MarketPage from './pages/MarketPage.jsx';
import MyOrdersPage from './pages/MyOrdersPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PublicProfilePage from './pages/PublicProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import TradeRoomPage from './pages/TradeRoomPage.jsx';
import TradesPage from './pages/TradesPage.jsx';
import WalletPage from './pages/WalletPage.jsx';
import { useAuthStore } from './store/authStore.js';
import { toast } from './store/toastStore.js';

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage.jsx'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage.jsx'));
const AdminUserDetailPage = lazy(() => import('./pages/admin/AdminUserDetailPage.jsx'));
const AdminTradesPage = lazy(() => import('./pages/admin/AdminTradesPage.jsx'));
const AdminTradeDetailPage = lazy(() => import('./pages/admin/AdminTradeDetailPage.jsx'));

function RealtimeNotifications() {
  const location = useLocation();
  useSocketEvent('trade:created', ({ tradeId }) => {
    if (!location.pathname.startsWith(`/trades/${tradeId}`)) {
      toast.info('A new trade was opened on one of your orders. Open My Trades to respond.');
    }
  });
  return null;
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  // Sync verification/KYC flags that may have changed since the last visit.
  useEffect(() => {
    if (token) refreshUser().catch(() => {});
  }, [token, refreshUser]);

  return (
    <Suspense fallback={<PageLoader />}>
      {token && <RealtimeNotifications />}
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route element={<AppLayout />}>
          <Route index element={<MarketPage />} />
          <Route path="/u/:displayName" element={<PublicProfilePage />} />

          <Route element={<RequireAuth />}>
            <Route path="/orders" element={<MyOrdersPage />} />
            <Route path="/orders/new" element={<CreateOrderPage />} />
            <Route path="/trades" element={<TradesPage />} />
            <Route path="/trades/:id" element={<TradeRoomPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/kyc" element={<KycPage />} />

            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="users/:id" element={<AdminUserDetailPage />} />
                <Route path="trades" element={<AdminTradesPage />} />
                <Route path="trades/:id" element={<AdminTradeDetailPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
