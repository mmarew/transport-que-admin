import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";
import {
  approveQueueOrganization,
  getApiError,
  listQueueOrgMembers,
  updateQueueOrganization,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useQueueAdminStore } from "@/store/queueAdminStore";
import { useAppDispatch } from "@/lib/redux/hooks";
import { api } from "@/lib/redux/api";
import {
  queueOrgProfileSchema,
  type QueueOrgProfileFormValues,
} from "@/schemas/queue";
import {
  QUEUE_ORG_TYPES,
  type ApprovalStatus,
  type QueueOrganization,
  type QueueOrgMember,
} from "@/types/queue";
import { QueueBoard } from "@/components/queue/QueueBoard";
import {
  useGetQueueOrganizationQuery,
  useGetQueueStatusQuery,
} from "@/lib/redux/api";
import DashboardLayout from "@/components/layout/DashboardLayout";

const STATUS_STYLES: Record<ApprovalStatus, string> = {
  approved: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-rose-100 text-rose-800",
  suspended: "bg-slate-200 text-slate-700",
};

const ROLE_LABELS: Record<number, string> = {
  11: "Queue Org Admin",
  1: "Shipper",
};

function StatusBadge({
  status,
  enabled,
}: {
  status: ApprovalStatus;
  enabled: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
      >
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
  const { auth } = useAuth();
  const selectedOrgId = useQueueAdminStore((s) => s.selectedOrgId);
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const orgId = routeOrgId ?? selectedOrgId;
  const isAdmin = auth?.userData.roleId === 3 || auth?.userData.roleId === 6;

  const invalidateQueueStatus = () => {
    if (orgId) {
      dispatch(api.util.invalidateTags([{ type: "QueueStatus", id: `${orgId}|today` }]));
    }
  };

  const {
    data: orgData,
    isLoading: orgLoading,
    error: orgError,
  } = useGetQueueOrganizationQuery(orgId, {
    skip: !orgId,
  });

  const org: QueueOrganization | undefined = orgData?.data?.organization;

  const {
    data: queueStatus,
    isLoading: queueStatusLoading,
    error: queueStatusError,
    refetch: refetchQueueStatus,
  } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId: orgId },
    { skip: !orgId },
  );

  const {
    data: members,
    isLoading: membersLoading,
    error: membersError,
  } = useQuery({
    queryKey: ["queue-org-members", orgId],
    queryFn: () =>
      orgId
        ? listQueueOrgMembers(orgId).then((res) => res.data.data)
        : Promise.resolve([]),
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
      invalidateQueueStatus();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const approveMutation = useMutation({
    mutationFn: (body: {
      approvalStatus: Exclude<ApprovalStatus, "pending">;
      approvalReason?: string;
    }) =>
      approveQueueOrganization(orgId, {
        ...body,
        queueEnabled: body.approvalStatus === "approved",
      }),
    onSuccess: () => {
      toast.success("Organization status updated");
      queryClient.invalidateQueries({ queryKey: ["queue-orgs"] });
      invalidateQueueStatus();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const approve = (approvalStatus: Exclude<ApprovalStatus, "pending">) => {
    if (
      approvalStatus === "approved" ||
      window.confirm(`Mark this organization as "${approvalStatus}"?`)
    ) {
      approveMutation.mutate({ approvalStatus });
    }
  };

  return (
    <DashboardLayout
      title={org?.queueOrganizationName ?? "Manage Organization"}
      subtitle={org ? `${org.queueOrganizationType.toUpperCase()} Terminal Management` : "Organization details"}
      activeTab="organizations"
      actions={
        <div className="flex items-center gap-3">
          <Link
            to="/organizations"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <ArrowLeft size={14} /> Back to Organizations
          </Link>
          {org && (
            <StatusBadge
              status={org.approvalStatus}
              enabled={org.queueEnabled === 1}
            />
          )}
        </div>
      }
    >
      {!orgId && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            No organization selected.{" "}
            <Link
              to="/organizations"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Go back to organizations
            </Link>
            .
          </p>
        </div>
      )}

      {orgId && orgLoading && (
        <div className="p-8 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
          Loading organization details...
        </div>
      )}

      {orgId && orgError && (
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {getApiError(orgError)}
        </div>
      )}

      {org && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Organization Profile */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                Organization Details
              </h2>
              <form
                onSubmit={handleSubmit((values) =>
                  updateMutation.mutate(values),
                )}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Organization Name
                  </label>
                  <input
                    {...register("queueOrganizationName")}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                  />
                  {errors.queueOrganizationName && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.queueOrganizationName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Organization Type
                  </label>
                  <select
                    {...register("queueOrganizationType")}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                  >
                    {QUEUE_ORG_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    {...register("queueOrganizationPhone")}
                    placeholder="+251 9 00 00 00 00"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                  />
                  {errors.queueOrganizationPhone && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.queueOrganizationPhone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Address
                  </label>
                  <input
                    {...register("queueOrganizationAddress")}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                  />
                  {errors.queueOrganizationAddress && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.queueOrganizationAddress.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Latitude
                    </label>
                    <input
                      {...register("latitude")}
                      placeholder="e.g. 8.9806"
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Longitude
                    </label>
                    <input
                      {...register("longitude")}
                      placeholder="e.g. 38.7578"
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={updateMutation.isPending || !isDirty}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>

            {/* Members & Admin Controls */}
            <div className="space-y-6">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-bold text-slate-800">
                  Staff & Members
                </h2>
                {membersLoading && (
                  <p className="mt-3 text-sm text-slate-500">
                    Loading members...
                  </p>
                )}
                {membersError && (
                  <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {getApiError(membersError)}
                  </p>
                )}
                {!membersLoading && !membersError && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                          <th className="pb-2 pr-3">Name</th>
                          <th className="pb-2 pr-3">Phone</th>
                          <th className="pb-2 pr-3">Role</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(members ?? []).map((member: QueueOrgMember) => (
                          <tr
                            key={member.queueOrganizationMembershipUniqueId}
                            className="hover:bg-slate-50"
                          >
                            <td className="py-2.5 pr-3 font-semibold text-slate-800">
                              {member.fullName}
                            </td>
                            <td className="py-2.5 pr-3 text-slate-600 text-xs">
                              {member.phoneNumber}
                            </td>
                            <td className="py-2.5 pr-3 text-slate-600 text-xs">
                              {ROLE_LABELS[member.roleId] ?? member.roleId}
                            </td>
                            <td className="py-2.5">
                              {member.isActive === 1 ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                  active
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                  inactive
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {members?.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-6 text-center text-sm text-slate-400"
                            >
                              No members registered yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {isAdmin && (
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-indigo-600" />
                    Admin Approvals
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Approve enables the queue and activates driver check-in.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => approve("approved")}
                      disabled={approveMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => approve("suspended")}
                      disabled={approveMutation.isPending}
                      className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition"
                    >
                      Suspend
                    </button>
                    <button
                      onClick={() => approve("rejected")}
                      disabled={approveMutation.isPending}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                    >
                      Reject
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Live Queue Board */}
          <div className="mt-8">
            <QueueBoard
              queueOrganizationUniqueId={org.queueOrganizationUniqueId}
              origin={{
                latitude: org.latitude ? Number(org.latitude) : null,
                longitude: org.longitude ? Number(org.longitude) : null,
                description: org.queueOrganizationAddress ?? "",
              }}
              status={queueStatus?.data}
              isLoading={queueStatusLoading}
              error={queueStatusError}
              onRefetch={refetchQueueStatus}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default QueueOrgManagePage;
