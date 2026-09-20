import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowLeft, Clock } from "lucide-react";

export type OrgApprovalStatus = "pending" | "rejected" | "suspended";

interface OrgApprovalBannerProps {
  status: OrgApprovalStatus;
  onBack: () => void;
}

const BANNER_CONFIG: Record<
  OrgApprovalStatus,
  { icon: ReactNode; titleKey: string; descKey: string; className: string }
> = {
  pending: {
    icon: <Clock size={20} />,
    titleKey: "dashboard.approvalPending",
    descKey: "dashboard.approvalPendingDesc",
    className: "pending",
  },
  rejected: {
    icon: <AlertCircle size={20} />,
    titleKey: "dashboard.orgRejected",
    descKey: "dashboard.orgRejectedDesc",
    className: "rejected",
  },
  suspended: {
    icon: <AlertCircle size={20} />,
    titleKey: "dashboard.orgSuspended",
    descKey: "dashboard.orgSuspendedDesc",
    className: "suspended",
  },
};

export function OrgApprovalBanner({ status, onBack }: OrgApprovalBannerProps) {
  const { t } = useTranslation();
  const config = BANNER_CONFIG[status];

  return (
    <div className={`org-approval-banner ${config.className}`}>
      <div className="org-approval-banner-icon">{config.icon}</div>
      <div className="org-approval-banner-content">
        <h3>{t(config.titleKey)}</h3>
        <p>{t(config.descKey)}</p>
      </div>
      <button type="button" className="org-approval-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> {t("queue.backToOrgs")}
      </button>
    </div>
  );
}