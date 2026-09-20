import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import parseError from "../../utils/parseError";
import { useAuth } from "../../context/AuthContext";
import { subscribeToQueue, unsubscribeFromQueue } from "../../lib/socket";
import type { QueueOrgProfileFormValues } from "../../schemas/queue";
import type {
  ApprovalStatus,
  QueueOrganization,
  QueueOrgMember,
} from "../../types/queue";
import { QueueBoard } from "../../components/queue/QueueBoard";
import {
  useGetQueueOrganizationQuery,
  useGetQueueStatusQuery,
  useListQueueOrgMembersQuery,
  useUpdateQueueOrganizationMutation,
  useApproveQueueOrganizationMutation,
} from "../../lib/redux/api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { normalizeOrg } from "../../utils/formatters";
import { StatusBadge } from "../../components/queue-org-manage/StatusBadge";
import { OrgProfileForm } from "../../components/queue-org-manage/OrgProfileForm";
import { MembersTable } from "../../components/queue-org-manage/MembersTable";
import { AdminApprovalActions } from "../../components/queue-org-manage/AdminApprovalActions";
import "./QueueOrgManagePage.css";

export function QueueOrgManagePage() {
  const { queueOrganizationUniqueId } = useParams<{
    queueOrganizationUniqueId: string;
  }>();
  const orgId = queueOrganizationUniqueId || "";

  useEffect(() => {
    if (!orgId) return;
    subscribeToQueue(orgId);
    return () => {
      unsubscribeFromQueue(orgId);
    };
  }, [orgId]);

  const { t } = useTranslation();
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

  const [updateOrgMutation, { isLoading: isUpdating }] =
    useUpdateQueueOrganizationMutation();
  const [approveOrgMutation, { isLoading: isApproving }] =
    useApproveQueueOrganizationMutation();

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
      toast.success(t("queueManage.orgUpdated"));
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
        toast.success(t("queueManage.orgStatusUpdated"));
      } catch (err: unknown) {
        toast.error(parseError(err));
      }
    }
  };

  return (
    <DashboardLayout
      title={
        org?.queueOrganizationName ??
        t("queueManage.manageOrg", "Manage Organization")
      }
      subtitle={
        org
          ? t("queueManage.terminalManagement", {
              type: org.queueOrganizationType.toUpperCase(),
            })
          : t("queueManage.orgDetailsFallback", "Organization details")
      }
      activeTab="organizations"
      actions={
        <div className="qom-header-actions">
          <Link to="/dashboard" className="qom-back-btn">
            <ArrowLeft size={14} />{" "}
            {t("queue.backToOrgs", "Back to Organizations")}
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
        <div
          className="qom-card"
          style={{ textAlign: "center", padding: "3rem" }}
        >
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            {t("queueManage.noOrgSelected")}{" "}
            <Link
              to="/dashboard"
              style={{ color: "#0B4D6D", fontWeight: 600 }}
            >
              {t("queueManage.goBackToOrgs")}
            </Link>
            .
          </p>
        </div>
      )}

      {orgId && orgLoading && (
        <div
          className="qom-card"
          style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}
        >
          <div
            className="add-docs-spinner"
            style={{ width: 28, height: 28, margin: "0 auto 0.75rem" }}
          />
          <p style={{ margin: 0, fontSize: "0.875rem" }}>
            {t("queueManage.loadingOrgDetails")}
          </p>
        </div>
      )}

      {orgId && orgError && (
        <div
          className="qom-card"
          style={{
            border: "1px solid #fecdd3",
            background: "#fff1f2",
            color: "#e11d48",
            padding: "1rem",
          }}
        >
          {parseError(orgError)}
        </div>
      )}

      {org && (
        <div className="qom-container">
          <div className="qom-grid">
            {/* Organization Profile */}
            <OrgProfileForm
              org={org}
              onSubmit={onUpdateProfile}
              isUpdating={isUpdating}
            />

            {/* Members & Admin Controls */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <MembersTable
                members={members}
                isLoading={membersLoading}
                error={membersError}
              />

              {isAdmin && (
                <AdminApprovalActions
                  onApprove={approve}
                  isApproving={isApproving}
                />
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
