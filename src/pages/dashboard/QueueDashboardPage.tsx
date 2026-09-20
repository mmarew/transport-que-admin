import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useCreateQueueOrganizationMutation } from "../../lib/redux/api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import type { QueueOrganization, QueueOrgType } from "../../types/queue";
import { useOrgList } from "../../hooks/useOrgList";
import { useActiveOrg } from "../../hooks/useActiveOrg";
import { ActiveOrgView } from "../../components/dashboard/ActiveOrgView";
import { OrgListToolbar } from "../../components/dashboard/OrgListToolbar";
import { OrgListState } from "../../components/dashboard/OrgListState";
import { OrgStatusTable } from "../../components/dashboard/OrgStatusTable";
import { OrgListPagination } from "../../components/dashboard/OrgListPagination";
import { CreateOrgModal } from "../../components/queue/CreateOrgModal";
import "../organizations/OrganizationsPage.css";

export function QueueDashboardPage() {
  const { t } = useTranslation();
  const {
    orgList,
    processedOrgs,
    paginatedOrgs,
    totalPages,
    isLoading: orgsLoading,
    error: orgsError,
    refetchOrgs,
    searchQuery,
    handleSearchChange,
    sortField,
    handleSort,
    currentPage,
    setCurrentPage,
  } = useOrgList();

  const {
    activeOrgId,
    activeOrg,
    queueStatusData,
    statusLoading,
    refetchStatus,
    selectOrg,
    clearActiveOrg,
  } = useActiveOrg(orgList);

  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);

  const handleManage = (org: QueueOrganization) => {
    const status = String(org.approvalStatus || "").toLowerCase();
    if (status !== "approved") {
      toast.warning(
        t("dashboard.orgNotApproved", {
          name: org.queueOrganizationName,
          status: org.approvalStatus,
        }),
      );
      return;
    }
    selectOrg(org.queueOrganizationUniqueId);
  };

  const [createQueueOrgMutation] = useCreateQueueOrganizationMutation();

  const handleCreateOrg = async (data: {
    queueOrganizationName: string;
    queueOrganizationType: QueueOrgType;
    queueOrganizationAddress: string;
    latitude: number;
    longitude: number;
    queueOrganizationPhone?: string | null;
  }) => {
    try {
      await createQueueOrgMutation({
        queueOrganizationName: data.queueOrganizationName,
        queueOrganizationType: data.queueOrganizationType,
        queueOrganizationPhone: data.queueOrganizationPhone || null,
        queueOrganizationAddress: data.queueOrganizationAddress,
        latitude: data.latitude != null ? Number(data.latitude) : null,
        longitude: data.longitude != null ? Number(data.longitude) : null,
      }).unwrap();
    } catch (err) {
      const error = err as {
        status?: number;
        originalStatus?: number;
        response?: { status?: number };
      };
      const status = error.status ?? error.originalStatus ?? error.response?.status;
      if (status === 409) {
        throw Object.assign(
          new Error(
            `An organization named "${data.queueOrganizationName}" already exists. Please use a different name.`,
          ),
          { status: 409 },
        );
      }
      throw err;
    }
    // The mutation's invalidatesTags: ["QueueOrganizations"] auto-refetches the list.
    // No need for manual invalidateTags or refetch here.
  };

  return (
    <DashboardLayout
      title={activeOrg ? undefined : t("dashboard.title")}
      subtitle={activeOrg ? undefined : t("dashboard.subtitle")}
      activeTab={activeOrg ? "liveQueue" : "dashboard"}
      actions={
        !activeOrgId ? (
          <button
            type="button"
            className="qb-btn-new-order"
            onClick={() => setShowCreateOrgModal(true)}
          >
            <Plus size={16} />
            <span>{t("dashboard.newOrg")}</span>
          </button>
        ) : undefined
      }
    >
      {activeOrg ? (
        <ActiveOrgView
          activeOrg={activeOrg}
          queueStatus={queueStatusData}
          statusLoading={statusLoading}
          onRefetch={refetchStatus}
          onBack={clearActiveOrg}
        />
      ) : (
        <div className="org-page-card">
          <OrgListToolbar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            sortField={sortField}
            onSort={handleSort}
            onAdd={() => setShowCreateOrgModal(true)}
          />

          {(orgsLoading || orgsError || processedOrgs.length === 0) && (
            <OrgListState
              state={orgsLoading ? "loading" : orgsError ? "error" : "empty"}
              searchQuery={searchQuery}
              onRetry={refetchOrgs}
            />
          )}

          {!orgsLoading && !orgsError && paginatedOrgs.length > 0 && (
            <OrgStatusTable
              orgs={paginatedOrgs}
              onSort={handleSort}
              onManage={handleManage}
            />
          )}

          {!orgsLoading && !orgsError && processedOrgs.length > 0 && (
            <OrgListPagination
              page={currentPage}
              totalPages={totalPages}
              pageCount={paginatedOrgs.length}
              totalCount={processedOrgs.length}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {showCreateOrgModal && (
        <CreateOrgModal
          onClose={() => setShowCreateOrgModal(false)}
          onCreated={() => {
            setShowCreateOrgModal(false);
            refetchOrgs();
          }}
          onCreate={handleCreateOrg}
        />
      )}
    </DashboardLayout>
  );
}

export default QueueDashboardPage;