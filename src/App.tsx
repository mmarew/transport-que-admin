import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RoleGuard } from "./components/auth/RoleGuard";
import { LoginPage } from "./pages/LoginPage";
import { QueueDashboardPage } from "./pages/QueueDashboardPage";
import { QueueOrgManagePage } from "./pages/QueueOrgManagePage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleGuard>
                <QueueDashboardPage />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
