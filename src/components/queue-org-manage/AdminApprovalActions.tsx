import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ApprovalStatus } from "../../types/queue";

export interface AdminApprovalActionsProps {
  onApprove: (status: Exclude<ApprovalStatus, "pending">) => void;
  isApproving: boolean;
}

export function AdminApprovalActions({
  onApprove,
  isApproving,
}: AdminApprovalActionsProps) {
  const { t } = useTranslation();

  return (
    <section className="qom-card">
      <h2 className="qom-card-title">
        <ShieldCheck size={18} color="#0B4D6D" />
        <span>{t("queueManage.adminApprovals")}</span>
      </h2>
      <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 1rem" }}>
        {t("queueManage.approveHelper")}
      </p>
      <div className="qom-approval-actions">
        <button
          onClick={() => onApprove("approved")}
          disabled={isApproving}
          className="qom-btn-approve"
        >
          {t("queueManage.approve")}
        </button>
        <button
          onClick={() => onApprove("suspended")}
          disabled={isApproving}
          className="qom-btn-suspend"
        >
          {t("queueManage.suspend")}
        </button>
        <button
          onClick={() => onApprove("rejected")}
          disabled={isApproving}
          className="qom-btn-reject"
        >
          {t("queueManage.reject")}
        </button>
      </div>
    </section>
  );
}

export default AdminApprovalActions;
