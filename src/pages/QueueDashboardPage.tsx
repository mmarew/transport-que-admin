import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listQueueOrganizations, getApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { disconnectSocket } from "../lib/socket";
import { useQueueAdminStore } from "../store/queueAdminStore";
import type { QueueOrganization } from "../types/queue";
import { QueueBoard } from "../components/queue/QueueBoard";

export function QueueDashboardPage() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const selectedOrgId = useQueueAdminStore((s) => s.selectedOrgId);
  const setSelectedOrgId = useQueueAdminStore((s) => s.setSelectedOrgId);

  const {
    data: orgs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["queue-orgs"],
    queryFn: () => listQueueOrganizations().then((res) => res.data.data),
  });

  const signOut = () => {
    disconnectSocket();
    logout();
    navigate("/login", { replace: true });
  };

  const activeOrgs: QueueOrganization[] =
    orgs?.filter((o) => o.approvalStatus === "approved" && o.queueEnabled === 1) ?? [];

  return (
    <div className="min-h-full bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Queue Admin</h1>
            <p className="text-xs text-slate-500">
              {auth?.userData.fullName} · {auth?.userData.phoneNumber}
            </p>
          </div>
          <button
            onClick={signOut}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{getApiError(error)}</p>}

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-slate-700">Queue organization</label>
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select an organization…</option>
            {activeOrgs.map((org) => (
              <option key={org.queueOrganizationUniqueId} value={org.queueOrganizationUniqueId}>
                {org.queueOrganizationName}
              </option>
            ))}
          </select>
          {!isLoading && orgs && orgs.length > 0 && activeOrgs.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No approved + enabled orgs. Ask an admin to approve and enable one.
            </p>
          )}
        </div>

        {selectedOrgId && <QueueBoard queueOrganizationUniqueId={selectedOrgId} />}
      </main>
    </div>
  );
}
