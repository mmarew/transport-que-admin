import type { QueueOrganization, QueueStatusResponse } from "../../types/queue";
import { extractCity } from "../../utils/formatters";
import { QueueBoard } from "../queue/QueueBoard";
import { OrgApprovalBanner, type OrgApprovalStatus } from "./OrgApprovalBanner";

interface ActiveOrgViewProps {
  activeOrg: QueueOrganization;
  queueStatus?: QueueStatusResponse;
  statusLoading: boolean;
  onRefetch: () => void;
  onBack: () => void;
}

const APPROVAL_BANNER_STATUSES: OrgApprovalStatus[] = ["pending", "rejected", "suspended"];

export function ActiveOrgView({
  activeOrg,
  queueStatus,
  statusLoading,
  onRefetch,
  onBack,
}: ActiveOrgViewProps) {
  const statusStr = String(activeOrg.approvalStatus || "").toLowerCase();
  const isApproved =
    statusStr === "approved" ||
    statusStr === "active" ||
    activeOrg.queueEnabled === 1;

  return (
    <div className="active-org-view">
      {APPROVAL_BANNER_STATUSES.includes(statusStr as OrgApprovalStatus) && (
        <OrgApprovalBanner status={statusStr as OrgApprovalStatus} onBack={onBack} />
      )}

      {isApproved && (
        <QueueBoard
          queueOrganizationUniqueId={activeOrg.queueOrganizationUniqueId}
          orgName={activeOrg.queueOrganizationName}
          orgType={activeOrg.queueOrganizationType}
          city={extractCity(activeOrg.queueOrganizationAddress)}
          origin={{
            latitude:
              activeOrg.latitude != null ? Number(activeOrg.latitude) : null,
            longitude:
              activeOrg.longitude != null ? Number(activeOrg.longitude) : null,
            description: activeOrg.queueOrganizationAddress,
          }}
          status={queueStatus?.data}
          isLoading={statusLoading}
          onRefetch={onRefetch}
          onBack={onBack}
        />
      )}
    </div>
  );
}