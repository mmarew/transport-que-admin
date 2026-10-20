import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { RoleGuard } from "../components/auth/RoleGuard";

// ── Lazy-loaded route components ─────────────────────────────────────────────
const Auth = lazy(() =>
  import("../components/auth/Auth").then((m) => ({ default: m.Auth })),
);
const SetupOrganization = lazy(() =>
  import("../components/organization/SetupOrganization").then((m) => ({
    default: m.SetupOrganization,
  })),
);
const QueueDashboardPage = lazy(() =>
  import("../pages/dashboard/QueueDashboardPage").then((m) => ({
    default: m.QueueDashboardPage,
  })),
);
const ReportsPage = lazy(() =>
  import("../pages/reports/ReportsPage").then((m) => ({
    default: m.ReportsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../pages/settings/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
const OrdersPage = lazy(() =>
  import("../pages/orders/OrdersPage").then((m) => ({ default: m.OrdersPage })),
);
const DriverDetailsPage = lazy(() =>
  import("../pages/orders/driver-details/DriverDetailsPage").then((m) => ({
    default: m.DriverDetailsPage,
  })),
);
const SecurityPage = lazy(() =>
  import("../pages/security/SecurityPage").then((m) => ({
    default: m.SecurityPage,
  })),
);

// ── Minimal full-page loading fallback ───────────────────────────────────────
function PageLoader() {
  return (
    <div className="app-page-loader">
      <span className="app-page-loader-spinner" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Auth initialStep="login" />} />
        <Route path="/register" element={<Auth initialStep="register" />} />

        {/* Organization setup — protected but no org required */}
        <Route
          path="/setup-org"
          element={
            <ProtectedRoute requireOrg={false}>
              <SetupOrganization />
            </ProtectedRoute>
          }
        />

        {/* Primary Route: redirect /organizations to /dashboard */}
        <Route
          path="/organizations"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* Live Queue Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleGuard>
                <QueueDashboardPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Primary Landing Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Reports & Analytics */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <RoleGuard>
                <ReportsPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Orders / Shipper Requests Display */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <RoleGuard>
                <OrdersPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orgs/:queueOrganizationUniqueId/orders"
          element={
            <ProtectedRoute>
              <RoleGuard>
                <OrdersPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Driver Details */}
        <Route
          path="/orders/driver/:orderId"
          element={
            <ProtectedRoute>
              <RoleGuard>
                <DriverDetailsPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orgs/:queueOrganizationUniqueId/orders/driver/:orderId"
          element={
            <ProtectedRoute>
              <RoleGuard>
                <DriverDetailsPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver-details/:orderId"
          element={
            <ProtectedRoute>
              <RoleGuard>
                <DriverDetailsPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Security Compliance (INSA Standard) */}
        <Route
          path="/security"
          element={
            <ProtectedRoute>
              <RoleGuard>
                <SecurityPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <RoleGuard>
                <SettingsPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/organizations" replace />} />
      </Routes>
    </Suspense>
  );
}
