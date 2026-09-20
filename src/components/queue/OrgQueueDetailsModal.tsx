import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, ExternalLink } from "lucide-react";
import { useGetQueueStatusQuery } from "../../lib/redux/api";
import type { QueueOrganization, DriverQueueEntry } from "../../types/queue";
import { extractCity, normalizeQueueEntry } from "../../utils/formatters";
import { isDriverWaiting } from "../../utils/journeyStatus";
import { Modal } from "../ui/Modal";
import { OrgQueueMetricsGrid } from "./org-details/OrgQueueMetricsGrid";
import { OrgQueueDriversList } from "./org-details/OrgQueueDriversList";
import "./QueueModals.css";

export interface OrgQueueDetailsModalProps {
  org: QueueOrganization | null;
  onClose: () => void;
}

export const OrgQueueDetailsModal: React.FC<OrgQueueDetailsModalProps> = ({
  org,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const orgId = org?.queueOrganizationUniqueId || "";

  const { data: queueData, isLoading } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId: orgId },
    { skip: !orgId }
  );

  const allEntries: DriverQueueEntry[] = useMemo(() => {
    if (!queueData?.data?.queues) return [];
    return Object.values(queueData.data.queues)
      .flat()
      .map(normalizeQueueEntry);
  }, [queueData]);

  const waitingCount = allEntries.filter(
    (e) => isDriverWaiting(e.status, e.journeyStatusId)
  ).length;

  const offeredCount = allEntries.filter((e) => e.status === "offered").length;

  const loadedCount = allEntries.filter(
    (e) =>
      (e.status as string) === "loaded" ||
      (e.status as string) === "assigned" ||
      (e.status as string) === "completed"
  ).length;

  const totalDrivers = allEntries.length;

  if (!org) return null;

  const approvalStatusLower = (org.approvalStatus || "").toLowerCase();
  const isApproved = approvalStatusLower === "approved";
  const displayStatus = isApproved
    ? t("reports.approved", "Approved")
    : approvalStatusLower === "pending"
    ? t("reports.pending", "Pending")
    : org.approvalStatus
    ? org.approvalStatus.charAt(0).toUpperCase() + org.approvalStatus.slice(1)
    : t("reports.approved", "Approved");

  const handleOpenFullBoard = () => {
    onClose();
    navigate(`/dashboard?orgId=${org.queueOrganizationUniqueId}`);
  };

  const headerTitle = (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "10px",
          background: "rgba(11, 77, 109, 0.1)",
          color: "#0B4D6D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Building2 size={22} />
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h3 className="qm-title" style={{ fontSize: "1.15rem", margin: 0 }}>
            {org.queueOrganizationName}
          </h3>
          <span
            style={{
              fontSize: "0.725rem",
              padding: "0.15rem 0.5rem",
              borderRadius: "9999px",
              fontWeight: 600,
              background: isApproved
                ? "rgba(22, 163, 74, 0.12)"
                : "rgba(234, 88, 12, 0.12)",
              color: isApproved ? "#16a34a" : "#ea580c",
            }}
          >
            {displayStatus}
          </span>
        </div>
        <p
          className="qm-subtitle"
          style={{
            margin: "0.2rem 0 0",
            fontSize: "0.825rem",
            color: "#64748b",
          }}
        >
          {org.queueOrganizationAddress ||
            extractCity(org.queueOrganizationAddress) ||
            t("reports.terminalLocation", "Terminal Location")}
        </p>
      </div>
    </div>
  );

  return (
    <Modal
      open={true}
      onClose={onClose}
      variant="qm"
      containerClassName="qm-modal--org-details"
      title={headerTitle}
      mobileHeaderTitle={org.queueOrganizationName}
      footer={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "1.25rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid #f1f5f9",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.55rem 1.15rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#475569",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("common.close", "Close")}
          </button>

          <button
            type="button"
            onClick={handleOpenFullBoard}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 1.15rem",
              borderRadius: "8px",
              border: "none",
              background: "#0B4D6D",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span>{t("reports.openFullBoard", "Manage Full Queue")}</span>
            <ExternalLink size={14} />
          </button>
        </div>
      }
    >
      {/* Metric Cards Summary */}
      <OrgQueueMetricsGrid
        totalDrivers={totalDrivers}
        waitingCount={waitingCount}
        offeredCount={offeredCount}
        loadedCount={loadedCount}
      />

      {/* Drivers Queue Table / Content */}
      <OrgQueueDriversList entries={allEntries} isLoading={isLoading} />
    </Modal>
  );
};

export default OrgQueueDetailsModal;
