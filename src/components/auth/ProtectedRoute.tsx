import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasOrganizationData } from "../../services/organization.service";
import { useListQueueOrganizationsQuery } from "../../lib/redux/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * When true (default), the route also requires the user to have at least
   * one queue organization — otherwise they are redirected to /setup-org.
   * Set to false for the /setup-org route itself.
   */
  requireOrg?: boolean;
}

export function ProtectedRoute({ children, requireOrg = true }: ProtectedRouteProps) {
  const { auth } = useAuth();
  const location = useLocation();

  const {
    data: orgsData,
    isLoading: orgsLoading,
    isSuccess: orgsSuccess,
    isError: orgsError,
  } = useListQueueOrganizationsQuery(undefined, {
    skip: !auth?.token || !requireOrg,
  });

  // Not logged in → go to login
  if (!auth?.token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Already on /setup-org or requireOrg=false → no need to check
  if (!requireOrg) {
    return <>{children}</>;
  }

  // Still checking org status → show nothing (brief flash prevention)
  if (orgsLoading) {
    return null;
  }

  const hasOrg = orgsSuccess
    ? hasOrganizationData(orgsData)
    : orgsError
    ? true // On error, allow through — don't block user indefinitely
    : false;

  // No org found → must set one up first
  if (!hasOrg) {
    return <Navigate to="/setup-org" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
