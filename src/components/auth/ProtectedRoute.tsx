import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  listQueueOrganizations,
  hasOrganizationData,
} from "../../services/organization.service";

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

  const [orgChecked, setOrgChecked] = useState(false);
  const [hasOrg, setHasOrg] = useState(false);

  useEffect(() => {
    if (!auth?.token || !requireOrg) {
      setOrgChecked(true);
      return;
    }

    listQueueOrganizations()
      .then((res) => {
        const found = hasOrganizationData(res.data);
        setHasOrg(found);
      })
      .catch(() => {
        // On error, allow through — don't block the user indefinitely
        setHasOrg(true);
      })
      .finally(() => setOrgChecked(true));
  }, [auth?.token, requireOrg]);

  // Not logged in → go to login
  if (!auth?.token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Already on /setup-org or requireOrg=false → no need to check
  if (!requireOrg) {
    return <>{children}</>;
  }

  // Still checking org status → show nothing (brief flash prevention)
  if (!orgChecked) {
    return null;
  }

  // No org found → must set one up first
  if (!hasOrg) {
    return <Navigate to="/setup-org" replace />;
  }

  return <>{children}</>;
}
