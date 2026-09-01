import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import parseError from "../utils/parseError";
import { useAuth } from "../context/AuthContext";
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
import { QueueBoard } from "../components/queue/QueueBoard";
import {
  useGetQueueOrganizationQuery,
  useGetQueueStatusQuery,
  useListQueueOrgMembersQuery,
  useUpdateQueueOrganizationMutation,
  useApproveQueueOrganizationMutation,
} from "../lib/redux/api";
import DashboardLayout from "../components/layout/DashboardLayout";
import { normalizeOrg } from "../utils/formatters";
import "./QueueOrgManagePage.css";

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
    <span className="qom-status-badge">
      <span className={`qom-badge-status ${status}`}>
        {status}
      </span>
      {enabled ? (
        <span className="qom-badge-active">
          Queue Active
        </span>
      ) : (
        <span className="qom-badge-disabled">
          Queue Disabled
        </span>
      )}
    </span>
  );
}

export function QueueOrgManagePage() {
  const { queueOrganizationUniqueId } = useParams<{
    queueOrganizationUniqueId: string;
  }>();
  const orgId = queueOrganizationUniqueId || "";

  const { auth } = useAuth();
  const isAdmin = auth?.userData?.roleId === 11;

  const {
    data: orgData,
    isLoading: orgLoading,
    error: orgError,
  } = useGetQueueOrganizationQuery(orgId, {
    skip: !orgId,
  });

  const org: QueueOrganization | undefined =
    normalizeOrg(orgData?.data) ||
    normalizeOrg(orgData) ||
    undefined;

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
    data: membersData,
    isLoading: membersLoading,
    error: membersError,
  } = useListQueueOrgMembersQuery(orgId, {
    skip: !orgId,
  });

  const members: QueueOrgMember[] = Array.isArray(membersData?.data)
    ? membersData.data
    : Array.isArray(membersData)
    ? (membersData as unknown as QueueOrgMember[])
    : Array.isArray((membersData as any)?.members)
    ? ((membersData as any).members as QueueOrgMember[])
    : [];

  const [updateOrgMutation, { isLoading: isUpdating }] = useUpdateQueueOrganizationMutation();
  const [approveOrgMutation, { isLoading: isApproving }] = useApproveQueueOrganizationMutation();

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

  const onUpdateProfile = async (values: QueueOrgProfileFormValues) => {
    try {
      await updateOrgMutation({
        id: orgId,
        body: {
          queueOrganizationName: values.queueOrganizationName,
          queueOrganizationType: values.queueOrganizationType,
          queueOrganizationPhone: values.queueOrganizationPhone || null,
          queueOrganizationAddress: values.queueOrganizationAddress || null,
          latitude: values.latitude || null,
          longitude: values.longitude || null,
        },
      }).unwrap();
      toast.success("Organization updated");
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  const approve = async (approvalStatus: Exclude<ApprovalStatus, "pending">) => {
    if (
      approvalStatus === "approved" ||
      window.confirm(`Mark this organization as "${approvalStatus}"?`)
    ) {
      try {
        await approveOrgMutation({
          id: orgId,
          body: {
            approvalStatus,
            queueEnabled: approvalStatus === "approved",
          },
        }).unwrap();
        toast.success("Organization status updated");
      } catch (err: unknown) {
        toast.error(parseError(err));
      }
    }
  };

  const { t } = useTranslation();

  return (
    <DashboardLayout
      title={org?.queueOrganizationName ?? t("dashboard.manageOrg", "Manage Organization")}
      subtitle={org ? `${org.queueOrganizationType.toUpperCase()} Terminal Management` : t("dashboard.orgDetails", "Organization details")}
      activeTab="organizations"
      actions={
        <div className="qom-header-actions">
          <Link
            to="/dashboard"
            className="qom-back-btn"
          >
            <ArrowLeft size={14} /> {t("queue.backToOrgs", "Back to Organizations")}
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
        <div className="qom-card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            No organization selected.{" "}
            <Link
              to="/dashboard"
              style={{ color: "#0B4D6D", fontWeight: 600 }}
            >
              Go back to organizations
            </Link>
            .
          </p>
        </div>
      )}

      {orgId && orgLoading && (
        <div className="qom-card" style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
          <div className="add-docs-spinner" style={{ width: 28, height: 28, margin: "0 auto 0.75rem" }} />
          <p style={{ margin: 0, fontSize: "0.875rem" }}>{t("common.loading", "Loading organization details...")}</p>
        </div>
      )}

      {orgId && orgError && (
        <div className="qom-card" style={{ border: "1px solid #fecdd3", background: "#fff1f2", color: "#e11d48", padding: "1rem" }}>
          {parseError(orgError)}
        </div>
      )}

      {org && (
        <div className="qom-container">
          <div className="qom-grid">
            {/* Organization Profile */}
            <section className="qom-card">
              <h2 className="qom-card-title">
                <Building2 size={18} color="#0B4D6D" />
                <span>Organization Details</span>
              </h2>
              <form
                onSubmit={handleSubmit(onUpdateProfile)}
                className="qom-form"
              >
                <div className="qom-field">
                  <label className="qom-label">
                    Organization Name
                  </label>
                  <input
                    {...register("queueOrganizationName")}
                    className="qom-input"
                  />
                  {errors.queueOrganizationName && (
                    <p className="qom-error-text">
                      {errors.queueOrganizationName.message}
                    </p>
                  )}
                </div>

                <div className="qom-field">
                  <label className="qom-label">
                    Organization Type
                  </label>
                  <select
                    {...register("queueOrganizationType")}
                    className="qom-select"
                  >
                    {QUEUE_ORG_TYPES.map((typeVal) => (
                      <option key={typeVal} value={typeVal}>
                        {typeVal}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="qom-field">
                  <label className="qom-label">
                    Phone Number
                  </label>
                  <input
                    {...register("queueOrganizationPhone")}
                    placeholder="+251 9 00 00 00 00"
                    className="qom-input"
                  />
                  {errors.queueOrganizationPhone && (
                    <p className="qom-error-text">
                      {errors.queueOrganizationPhone.message}
                    </p>
                  )}
                </div>

                <div className="qom-field">
                  <label className="qom-label">
                    Address
                  </label>
                  <input
                    {...register("queueOrganizationAddress")}
                    className="qom-input"
                  />
                  {errors.queueOrganizationAddress && (
                    <p className="qom-error-text">
                      {errors.queueOrganizationAddress.message}
                    </p>
                  )}
                </div>

                <div className="qom-row-2">
                  <div className="qom-field">
                    <label className="qom-label">
                      Latitude
                    </label>
                    <input
                      {...register("latitude")}
                      placeholder="e.g. 8.9806"
                      className="qom-input"
                    />
                  </div>
                  <div className="qom-field">
                    <label className="qom-label">
                      Longitude
                    </label>
                    <input
                      {...register("longitude")}
                      placeholder="e.g. 38.7578"
                      className="qom-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdating || !isDirty}
                  className="qom-submit-btn"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </section>

            {/* Members & Admin Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <section className="qom-card">
                <h2 className="qom-card-title">
                  Staff & Members
                </h2>
                {membersLoading && (
                  <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Loading members...
                  </p>
                )}
                {membersError && (
                  <p className="qom-error-text">
                    {parseError(membersError)}
                  </p>
                )}
                {!membersLoading && !membersError && (
                  <div style={{ overflowX: "auto" }}>
                    <table className="qom-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Role</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(members ?? []).map((member: QueueOrgMember) => (
                          <tr key={member.queueOrganizationMembershipUniqueId}>
                            <td style={{ fontWeight: 600, color: "#0f172a" }}>
                              {member.fullName}
                            </td>
                            <td style={{ color: "#64748b", fontSize: "0.8rem" }}>
                              {member.phoneNumber}
                            </td>
                            <td style={{ color: "#475569", fontSize: "0.8rem" }}>
                              {ROLE_LABELS[member.roleId] ?? member.roleId}
                            </td>
                            <td>
                              {member.isActive === 1 ? (
                                <span className="qom-badge-active">
                                  active
                                </span>
                              ) : (
                                <span className="qom-badge-disabled">
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
                              style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}
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
                <section className="qom-card">
                  <h2 className="qom-card-title">
                    <ShieldCheck size={18} color="#0B4D6D" />
                    <span>Admin Approvals</span>
                  </h2>
                  <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 1rem" }}>
                    Approve enables the queue and activates driver check-in.
                  </p>
                  <div className="qom-approval-actions">
                    <button
                      onClick={() => approve("approved")}
                      disabled={isApproving}
                      className="qom-btn-approve"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => approve("suspended")}
                      disabled={isApproving}
                      className="qom-btn-suspend"
                    >
                      Suspend
                    </button>
                    <button
                      onClick={() => approve("rejected")}
                      disabled={isApproving}
                      className="qom-btn-reject"
                    >
                      Reject
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Live Queue Board */}
          <div>
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
