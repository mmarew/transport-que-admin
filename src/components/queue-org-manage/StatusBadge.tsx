import { useTranslation } from "react-i18next";
import type { ApprovalStatus } from "../../types/queue";

export interface StatusBadgeProps {
  status: ApprovalStatus;
  enabled: boolean;
}

export function StatusBadge({ status, enabled }: StatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <span className="qom-status-badge">
      <span className={`qom-badge-status ${status}`}>{status}</span>
      {enabled ? (
        <span className="qom-badge-active">{t("queueManage.queueActive")}</span>
      ) : (
        <span className="qom-badge-disabled">{t("queueManage.queueDisabled")}</span>
      )}
    </span>
  );
}

export default StatusBadge;
