import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { QUEUE_DISPATCHER_ROLE, QUEUE_ORG_ADMIN_ROLE } from "../../types/queue";

/**
 * Allows role 11 (QueueOrgAdmin), role 12 (QueueDispatcher), plus Admin/SuperAdmin.
 * roleId 3 = admin, 6 = super admin.
 *
 * Dispatchers hold an active QueueOrganizationMembership just like admins do
 * (Middleware/VerifyToken.js verifyIfUserIsQueueOrgAdmin accepts 11 and 12), so
 * the guard must let them through. C2 keeps bidding approval on role 11 only —
 * that is enforced per-request by the backend, not here.
 */
const ALLOWED_ROLES = new Set([
  QUEUE_ORG_ADMIN_ROLE,
  QUEUE_DISPATCHER_ROLE,
  3,
  6,
]);

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();

  if (!auth || !ALLOWED_ROLES.has(auth.userData.roleId)) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
