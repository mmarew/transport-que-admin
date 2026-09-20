import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import type { QueueOrgListItem, QueueOrganization } from "../../types/queue";
import { extractCity } from "../../utils/formatters";
import type { OrgSortField } from "./OrgListToolbar";

interface OrgStatusTableProps {
  orgs: QueueOrgListItem[];
  onSort: (_field: OrgSortField) => void;
  onManage: (_org: QueueOrganization) => void;
}

export function OrgStatusTable({
  orgs,
  onSort,
  onManage,
}: OrgStatusTableProps) {
  const { t } = useTranslation();

  return (
    <div className="org-table-wrapper">
      <table className="org-table">
        <thead>
          <tr>
            <th onClick={() => onSort("name")} style={{ cursor: "pointer" }}>
              <span className="org-th-sortable">
                {t("dashboard.orgName")} <ChevronDown size={13} />
              </span>
            </th>
            <th onClick={() => onSort("type")} style={{ cursor: "pointer" }}>
              <span className="org-th-sortable">
                {t("dashboard.type")} <ChevronDown size={13} />
              </span>
            </th>
            <th onClick={() => onSort("city")} style={{ cursor: "pointer" }}>
              <span className="org-th-sortable">
                {t("dashboard.city")} <ChevronDown size={13} />
              </span>
            </th>
            <th>{t("dashboard.status")}</th>
            <th onClick={() => onSort("enabled")} style={{ cursor: "pointer" }}>
              <span className="org-th-sortable">
                {t("dashboard.enabled")} <ChevronDown size={13} />
              </span>
            </th>
            <th className="org-th-action">{t("queue.action")}</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map(({ organization: org }) => {
            const city = extractCity(org.queueOrganizationAddress);
            const status = String(org.approvalStatus || "pending").toLowerCase();
            const isOrgApproved = status === "approved";
            const isEnabled = org.queueEnabled === 1
              ? t("dashboard.yes", "Yes")
              : t("dashboard.no", "No");
            const statusLabel = isOrgApproved
              ? t("dashboard.approved", "Approved")
              : status === "pending"
                ? t("dashboard.pending", "Pending")
                : status.charAt(0).toUpperCase() + status.slice(1);

            return (
              <tr key={org.queueOrganizationUniqueId}>
                <td className="org-cell-name">{org.queueOrganizationName}</td>
                <td className="org-cell-type">{org.queueOrganizationType}</td>
                <td className="org-cell-city">{city}</td>
                <td>
                  <span className={`org-status-text ${status}`}>{statusLabel}</span>
                </td>
                <td>{isEnabled}</td>
                <td className="org-td-action">
                  <button
                    type="button"
                    className={`org-manage-link ${!isOrgApproved ? "disabled" : ""}`}
                    onClick={() => onManage(org)}
                    disabled={!isOrgApproved}
                    title={
                      !isOrgApproved
                        ? t("dashboard.cannotOpenQueue", {
                            status: org.approvalStatus,
                          })
                        : t("dashboard.manageLiveQueue")
                    }
                  >
                    {t("dashboard.manage", "Manage")}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}