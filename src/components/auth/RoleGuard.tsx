import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { QUEUE_ORG_ADMIN_ROLE } from "../../types/queue";

/**
 * Allows role 11 (QueueOrgAdmin) plus Admin/SuperAdmin.
 * roleId 3 = admin, 6 = super admin.
 */
const ALLOWED_ROLES = new Set([QUEUE_ORG_ADMIN_ROLE, 3, 6]);

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();

  if (!auth || !ALLOWED_ROLES.has(auth.userData.roleId)) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
