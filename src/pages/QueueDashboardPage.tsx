import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { disconnectSocket } from "@/lib/socket";
import { useQueueAdminStore } from "@/store/queueAdminStore";
import { createQueueOrganization } from "@/lib/api";
import type { QueueOrganization, QueueOrgListItem } from "@/types/queue";
import { CreateOrgModal } from "@/components/queue/CreateOrgModal";
import {
  useListQueueOrganizationsQuery,
} from "@/lib/redux/api";

export function QueueDashboardPage() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const setSelectedOrgId = useQueueAdminStore((state: ReturnType<typeof useQueueAdminStore.getState>) => state.setSelectedOrgId);

  const {
    data: orgs,
    isLoading,
    error,
    refetch,
  } = useListQueueOrganizationsQuery();

  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const allOrgs: QueueOrgListItem[] = orgs?.data ?? [];
  const activeOrgs: QueueOrganization[] =
    allOrgs.filter((item) => item.organization.approvalStatus === "approved" && item.organization.queueEnabled === 1)
      .map(item => item.organization) ?? [];

  const handleCreateOrg = async (data: {
    queueOrganizationName: string;
    queueOrganizationType: "customs" | "factory" | "cement" | "depot" | "other";
    queueOrganizationAddress: string;
    latitude: number;
    longitude: number;
    queueOrganizationPhone?: string | null;
  }) => {
    try {
      await createQueueOrganization(data);
      refetch();
      setShowCreateOrg(false);
    } catch {
      // error toast handled by modal
    }
  };

  const getStatusBadge = (org: QueueOrganization) => {
    const status = org.approvalStatus;
    const enabled = org.queueEnabled === 1;
    if (!enabled) return <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">Disabled</span>;
    switch (status) {
      case "approved":
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Approved</span>;
      case "pending":
        return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">Pending</span>;
      case "rejected":
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Rejected</span>;
      case "suspended":
        return <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">Suspended</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-500">{status}</span>;
    }
  };

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
            onClick={() => {
              disconnectSocket();
              logout();
              navigate("/login", { replace: true });
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {"message" in error ? error.message : JSON.stringify(error)}
          </p>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-md font-semibold text-slate-800">Your Queue Organizations</h2>
            <button
              onClick={() => setShowCreateOrg(true)}
              disabled={isLoading}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Loading…" : "Create organization"}
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading organizations…</p>
          ) : allOrgs.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
              <p className="text-slate-500">You don&apos;t have a queue organization yet.</p>
              <p className="mt-1 text-xs text-slate-400">Create one below — an admin will approve it.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Enabled</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allOrgs.map((item) => {
                      const org = item.organization;
                      return (
                        <tr
                          key={org.queueOrganizationUniqueId}
                          className="hover:bg-slate-50 cursor-pointer"
                          onClick={() => setSelectedOrgId(org.queueOrganizationUniqueId)}
                        >
                          <td className="px-4 py-3 font-medium text-slate-800">{org.queueOrganizationName}</td>
                          <td className="px-4 py-3 text-slate-600 capitalize">{org.queueOrganizationType}</td>
                          <td className="px-4 py-3">{getStatusBadge(org)}</td>
                          <td className="px-4 py-3">
                            {org.queueEnabled === 1 ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Yes</span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">No</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              to={`/orgs/${org.queueOrganizationUniqueId}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setSelectedOrgId(org.queueOrganizationUniqueId);
                                navigate(`/orgs/${org.queueOrganizationUniqueId}`);
                              }}
                              className="font-medium text-blue-600 hover:text-blue-700"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && allOrgs.length > 0 && activeOrgs.length === 0 && (
            <p className="mt-3 text-xs text-amber-600">
              No approved + enabled orgs. Ask an admin to approve and enable one.
            </p>
          )}
        </div>

        {showCreateOrg && (
          <CreateOrgModal
            onClose={() => setShowCreateOrg(false)}
            onCreated={() => refetch()}
            onCreate={handleCreateOrg}
          />
        )}
      </main>
    </div>
  );
}