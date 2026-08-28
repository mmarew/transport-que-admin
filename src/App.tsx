import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RoleGuard } from "./components/auth/RoleGuard";

// ── Lazy-loaded route components ─────────────────────────────────────────────
const Auth               = lazy(() => import("./components/auth/Auth").then(m => ({ default: m.Auth })));
const SetupOrganization  = lazy(() => import("./components/organization/SetupOrganization").then(m => ({ default: m.SetupOrganization })));
const QueueDashboardPage = lazy(() => import("./pages/QueueDashboardPage").then(m => ({ default: m.QueueDashboardPage })));
const QueueOrgManagePage = lazy(() => import("./pages/QueueOrgManagePage").then(m => ({ default: m.QueueOrgManagePage })));
const ReportsPage        = lazy(() => import("./pages/ReportsPage").then(m => ({ default: m.ReportsPage })));
const SettingsPage       = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));

// ── Minimal full-page loading fallback ───────────────────────────────────────
function PageLoader() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "3px solid #e2e8f0",
          borderTopColor: "var(--primary, #0F4C81)",
          display: "inline-block",
          animation: "spin 0.75s linear infinite",
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth routes */}
          <Route path="/login"    element={<Auth initialStep="login" />} />
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
          <Route path="/organizations" element={<Navigate to="/dashboard" replace />} />

          {/* Manage specific organization */}
          <Route
            path="/orgs/:queueOrganizationUniqueId"
            element={
              <ProtectedRoute>
                <RoleGuard>
                  <QueueOrgManagePage />
                </RoleGuard>
              </ProtectedRoute>
            }
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
    </AuthProvider>
  );
}

export default App;
