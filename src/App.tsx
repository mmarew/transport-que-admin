import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RoleGuard } from "./components/auth/RoleGuard";
import { Auth } from "./components/auth/Auth";
import { QueueDashboardPage } from "./pages/QueueDashboardPage";
import { OrganizationsPage } from "./pages/OrganizationsPage";
import { QueueOrgManagePage } from "./pages/QueueOrgManagePage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Auth initialStep="login" />} />
        <Route path="/register" element={<Auth initialStep="register" />} />

        {/* Dashboard — Primary Route is /dashboard */}
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Organizations */}
        <Route
          path="/organizations"
          element={
            <ProtectedRoute>
              <RoleGuard>
                <OrganizationsPage />
              </RoleGuard>
            </ProtectedRoute>
          }
        />
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
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
