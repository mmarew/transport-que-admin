import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Building2, ChevronRight } from "lucide-react";
import { useGetQueueStatusQuery } from "@/lib/redux/api";
import type { QueueOrganization } from "@/types/queue";
import { extractCity } from "@/utils/formatters";
import { isDriverWaiting } from "@/utils/journeyStatus";

export interface OrgReportRowProps {
  org: QueueOrganization;
  onViewDetails: (org: QueueOrganization) => void;
}

/**
 * OrgReportRow displays an individual organization row in the report table,
 * showing active driver counts and status.
 */
export function OrgReportRow({ org, onViewDetails }: OrgReportRowProps) {
  const { t } = useTranslation();
  const { data: queueData } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId: org.queueOrganizationUniqueId },
    { skip: !org.queueOrganizationUniqueId },
  );

  const allEntries = useMemo(() => {
    if (!queueData?.data?.queues) return [];
    return Object.values(queueData.data.queues).flat();
  }, [queueData]);

  const waitingCount = allEntries.filter((e) =>
    isDriverWaiting(e.status, (e as any).journeyStatusId),
  ).length;

  const totalDrivers = allEntries.length;

  const approvalStatusLower = (org.approvalStatus || "pending").toLowerCase();
  const isApproved = approvalStatusLower === "approved";
  const isPending = approvalStatusLower === "pending";

  const statusClass = isApproved
    ? "active"
    : isPending
      ? "pending"
      : "suspended";
  const displayStatus = isApproved
    ? t("dashboard.enabled", "Active")
    : isPending
      ? t("reports.pending", "Pending")
      : org.approvalStatus
        ? org.approvalStatus.charAt(0).toUpperCase() +
          org.approvalStatus.slice(1)
        : t("dashboard.enabled", "Active");

  const city = extractCity(org.queueOrganizationAddress);
  const displayLocation = city
    ? `${city}, Ethiopia`
    : org.queueOrganizationAddress || "Ethiopia";

  return (
    <div className="rep-org-row">
      <div className="rep-org-main">
        <div className="rep-org-icon">
          <Building2 size={22} />
        </div>
        <div className="rep-org-info">
          <span className="rep-org-name">{org.queueOrganizationName}</span>
          <span className="rep-org-city">{displayLocation}</span>
          <span className={`rep-org-status ${statusClass}`}>
            {displayStatus}
          </span>
        </div>
      </div>

      <div className="rep-org-stat">
        <span className="rep-org-stat-label">
          {t("reports.drivers", "Drivers")}
        </span>
        <span className="rep-org-stat-val">{totalDrivers}</span>
      </div>

      <div className="rep-org-stat">
        <span className="rep-org-stat-label">
          {t("reports.waiting", "Waiting")}
        </span>
        <span className="rep-org-stat-val">{waitingCount}</span>
      </div>

      <div className="rep-org-action">
        <button
          type="button"
          onClick={() => onViewDetails(org)}
          className="rep-org-action-btn"
        >
          <span>{t("reports.viewQueue", "View Queue")}</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default OrgReportRow;
