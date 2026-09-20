import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useCreateQueueOrganizationMutation } from "../../lib/redux/api";
import CreateOrgModal from "../../components/queue/CreateOrgModal";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import { subscribeToQueue, unsubscribeFromQueue } from "../../lib/socket";
import type { QueueOrganization, QueueOrgType } from "../../types/queue";
import { useOrgList } from "../../hooks/useOrgList";
import { OrgListToolbar } from "../../components/dashboard/OrgListToolbar";
import { OrgListState } from "../../components/dashboard/OrgListState";
import { OrgStatusTable } from "../../components/dashboard/OrgStatusTable";
import { OrgListPagination } from "../../components/dashboard/OrgListPagination";
import "./OrganizationsPage.css";

export function OrganizationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSelectedOrgId = useQueueAdminStore((s) => s.setSelectedOrgId);
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const {
    orgList,
    processedOrgs,
    paginatedOrgs,
    totalPages,
    isLoading,
    error,
    refetchOrgs,
    searchQuery,
    handleSearchChange,
    sortField,
    handleSort,
    currentPage,
    setCurrentPage,
  } = useOrgList();

  useEffect(() => {
    const orgIds = orgList
      .map((item) => item.organization?.queueOrganizationUniqueId)
      .filter((id): id is string => Boolean(id));

    orgIds.forEach((id) => subscribeToQueue(id));
    return () => {
      orgIds.forEach((id) => unsubscribeFromQueue(id));
    };
  }, [orgList]);

  const [createQueueOrgMutation] = useCreateQueueOrganizationMutation();

  const handleManage = (org: QueueOrganization) => {
    setSelectedOrgId(org.queueOrganizationUniqueId);
    navigate(`/dashboard?orgId=${org.queueOrganizationUniqueId}`);
  };

  const handleCreateOrg = async (formData: {
    queueOrganizationName: string;
    queueOrganizationType: QueueOrgType;
    queueOrganizationAddress: string;
    latitude: number;
    longitude: number;
    queueOrganizationPhone?: string | null;
  }) => {
    try {
      await createQueueOrgMutation(formData).unwrap();
    } catch (err: unknown) {
      const errorObj = err as {
        status?: number;
        originalStatus?: number;
        response?: { status?: number };
      };
      const status =
        errorObj?.status ?? errorObj?.originalStatus ?? errorObj?.response?.status;
      if (status === 409 || Number(status) === 409) {
        throw Object.assign(
          new Error(
            `An organization named "${formData.queueOrganizationName}" already exists. Please use a different name.`,
          ),
          { status: 409 },
        );
      }
      throw err;
    }
  };

  return (
    <DashboardLayout
      title={t("dashboard.title")}
      subtitle={t("dashboard.subtitle")}
      activeTab="organizations"
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowCreateOrg(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: "#0B4D6D",
            color: "#ffffff",
            border: "none",
            borderRadius: "0.625rem",
            padding: "0.65rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(11, 77, 109, 0.2)",
          }}
        >
          <Plus size={18} />
          <span>{t("dashboard.newOrg")}</span>
        </button>
      }
    >
      <div className="org-page-card">
        <OrgListToolbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          sortField={sortField}
          onSort={handleSort}
          onAdd={() => setShowCreateOrg(true)}
        />

        {(isLoading || error || processedOrgs.length === 0) && (
          <OrgListState
            state={isLoading ? "loading" : error ? "error" : "empty"}
            searchQuery={searchQuery}
            onRetry={refetchOrgs}
          />
        )}

        {!isLoading && !error && paginatedOrgs.length > 0 && (
          <OrgStatusTable
            orgs={paginatedOrgs}
            onSort={handleSort}
            onManage={handleManage}
          />
        )}

        {!isLoading && !error && processedOrgs.length > 0 && (
          <OrgListPagination
            page={currentPage}
            totalPages={totalPages}
            pageCount={paginatedOrgs.length}
            totalCount={processedOrgs.length}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {showCreateOrg && (
        <CreateOrgModal
          onClose={() => setShowCreateOrg(false)}
          onCreated={() => {
            setShowCreateOrg(false);
            refetchOrgs();
          }}
          onCreate={handleCreateOrg}
        />
      )}
    </DashboardLayout>
  );
}

export default OrganizationsPage;
