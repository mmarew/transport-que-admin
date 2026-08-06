import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  approveQueueOrganization,
  getApiError,
  listQueueOrganizations,
  listQueueOrgMembers,
  updateQueueOrganization,
} from "../lib/api";
import { disconnectSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import { useQueueAdminStore } from "../store/queueAdminStore";
import {
  queueOrgProfileSchema,
  type QueueOrgProfileFormValues,
} from "../schemas/queue";
import {
  QUEUE_ORG_TYPES,
  type ApprovalStatus,
  type QueueOrganization,
  type QueueOrgMember,
} from "../types/queue";

const STATUS_STYLES: Record<ApprovalStatus, string> = {
  approved: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-slate-200 text-slate-700",
};

const ROLE_LABELS: Record<number, string> = {
  11: "Queue Org Admin",
  1: "Shipper",
};

function StatusBadge({ status, enabled }: { status: ApprovalStatus; enabled: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
        {status}
      </span>
      {enabled ? (
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          enabled
        </span>
      ) : (
        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          disabled
        </span>
      )}
    </span>
  );
}

export function QueueOrgManagePage() {
  const { queueOrganizationUniqueId: routeOrgId } = useParams();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const selectedOrgId = useQueueAdminStore((s) => s.selectedOrgId);
  const queryClient = useQueryClient();

  const orgId = routeOrgId ?? selectedOrgId;
  const isAdmin = auth?.userData.roleId === 3 || auth?.userData.roleId === 6;

  const {
    data: orgs,
    isLoading: orgsLoading,
    error: orgsError,
  } = useQuery({
    queryKey: ["queue-orgs"],
    queryFn: () => listQueueOrganizations({ limit: 100 }).then((res) => res.data.data),
  });

  const org: QueueOrganization | undefined = useMemo(
    () => orgs?.find((o) => o.queueOrganizationUniqueId === orgId),
    [orgs, orgId],
  );

  const {
    data: members,
    isLoading: membersLoading,
    error: membersError,
  } = useQuery({
    queryKey: ["queue-org-members", orgId],
    queryFn: () => (orgId ? listQueueOrgMembers(orgId).then((res) => res.data.data) : Promise.resolve([])),
    enabled: Boolean(orgId),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<QueueOrgProfileFormValues>({
    resolver: zodResolver(queueOrgProfileSchema),
    values: org
      ? {
          queueOrganizationName: org.queueOrganizationName,
          queueOrganizationType: org.queueOrganizationType,
          queueOrganizationPhone: org.queueOrganizationPhone ?? "",
          queueOrganizationAddress: org.queueOrganizationAddress ?? "",
          latitude: org.latitude ?? "",
          longitude: org.longitude ?? "",
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (values: QueueOrgProfileFormValues) =>
      updateQueueOrganization(orgId, {
        queueOrganizationName: values.queueOrganizationName,
        queueOrganizationType: values.queueOrganizationType,
        queueOrganizationPhone: values.queueOrganizationPhone || null,
        queueOrganizationAddress: values.queueOrganizationAddress || null,
        latitude: values.latitude ? Number(values.latitude) : null,
        longitude: values.longitude ? Number(values.longitude) : null,
      }),
    onSuccess: () => {
      toast.success("Organization updated");
      queryClient.invalidateQueries({ queryKey: ["queue-orgs"] });
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const approveMutation = useMutation({
    mutationFn: (body: { approvalStatus: Exclude<ApprovalStatus, "pending">; approvalReason?: string }) =>
      approveQueueOrganization(orgId, {
        ...body,
        queueEnabled: body.approvalStatus === "approved",
      }),
    onSuccess: () => {
      toast.success("Organization status updated");
      queryClient.invalidateQueries({ queryKey: ["queue-orgs"] });
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const approve = (approvalStatus: Exclude<ApprovalStatus, "pending">) => {
    if (approvalStatus === "approved" || window.confirm(`Mark this organization as "${approvalStatus}"?`)) {
      approveMutation.mutate({ approvalStatus });
    }
  };

  const signOut = () => {
    disconnectSocket();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-full bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              ← Dashboard
            </Link>
            <h1 className="text-lg font-bold text-slate-800">{org?.queueOrganizationName ?? "Organization"}</h1>
            {org && <StatusBadge status={org.approvalStatus} enabled={org.queueEnabled === 1} />}
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
        {!orgId && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              No organization selected.{" "}
              <Link to="/" className="font-medium text-blue-600 hover:text-blue-700">
                Go back to the dashboard
              </Link>
              .
            </p>
          </div>
        )}

        {orgId && orgsLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {orgId && orgsError && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{getApiError(orgsError)}</p>
        )}

        {orgId && !orgsLoading && !org && !orgsError && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">Organization not found.</p>
          </div>
        )}

        {org && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-800">Profile</h2>
              <form
                onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
                className="mt-4 space-y-3"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700">Name</label>
                  <input
                    {...register("queueOrganizationName")}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  {errors.queueOrganizationName && (
                    <p className="mt-1 text-xs text-red-600">{errors.queueOrganizationName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Type</label>
                  <select
                    {...register("queueOrganizationType")}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {QUEUE_ORG_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Phone</label>
                  <input
                    {...register("queueOrganizationPhone")}
                    placeholder="e.g. 08012345678"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  {errors.queueOrganizationPhone && (
                    <p className="mt-1 text-xs text-red-600">{errors.queueOrganizationPhone.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Address</label>
                  <input
                    {...register("queueOrganizationAddress")}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  {errors.queueOrganizationAddress && (
                    <p className="mt-1 text-xs text-red-600">{errors.queueOrganizationAddress.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Latitude</label>
                    <input
                      {...register("latitude")}
                      placeholder="e.g. 6.5244"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    {errors.latitude && (
                      <p className="mt-1 text-xs text-red-600">{errors.latitude.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Longitude</label>
                    <input
                      {...register("longitude")}
                      placeholder="e.g. 3.3792"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    {errors.longitude && (
                      <p className="mt-1 text-xs text-red-600">{errors.longitude.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending || !isDirty}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </section>

            <div className="space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="text-base font-semibold text-slate-800">Members</h2>
                {membersLoading && <p className="mt-3 text-sm text-slate-500">Loading members…</p>}
                {membersError && (
                  <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {getApiError(membersError)}
                  </p>
                )}
                {!membersLoading && !membersError && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                          <th className="pb-2 pr-3 font-medium">Name</th>
                          <th className="pb-2 pr-3 font-medium">Phone</th>
                          <th className="pb-2 pr-3 font-medium">Role</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(members ?? []).map((member: QueueOrgMember) => (
                          <tr key={member.queueOrganizationMembershipUniqueId} className="border-b border-slate-100">
                            <td className="py-2 pr-3 font-medium text-slate-800">{member.fullName}</td>
                            <td className="py-2 pr-3 text-slate-600">{member.phoneNumber}</td>
                            <td className="py-2 pr-3 text-slate-600">{ROLE_LABELS[member.roleId] ?? member.roleId}</td>
                            <td className="py-2">
                              {member.isActive === 1 ? (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                  active
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                                  inactive
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {members?.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-sm text-slate-400">
                              No members yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {isAdmin && (
                <section className="rounded-xl border border-slate-200 bg-white p-6">
                  <h2 className="text-base font-semibold text-slate-800">Admin actions</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Approve enables the queue and sets{" "}
                    <code className="rounded bg-slate-100 px-1">queueEnabled = 1</code>. Rejecting or
                    suspending disables it.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => approve("approved")}
                      disabled={approveMutation.isPending}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => approve("suspended")}
                      disabled={approveMutation.isPending}
                      className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      Suspend
                    </button>
                    <button
                      onClick={() => approve("rejected")}
                      disabled={approveMutation.isPending}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
