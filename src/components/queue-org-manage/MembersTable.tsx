import { useTranslation } from "react-i18next";
import type { QueueOrgMember } from "../../types/queue";
import parseError from "../../utils/parseError";

export interface MembersTableProps {
  members: QueueOrgMember[];
  isLoading: boolean;
  error?: unknown;
}

export function MembersTable({
  members,
  isLoading,
  error,
}: MembersTableProps) {
  const { t } = useTranslation();

  const roleLabels: Record<number, string> = {
    11: t("queueManage.roleQueueOrgAdmin"),
    1: t("queueManage.roleShipper"),
  };

  return (
    <section className="qom-card">
      <h2 className="qom-card-title">{t("queueManage.staffAndMembers")}</h2>
      {isLoading && (
        <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
          {t("queueManage.loadingMembers")}
        </p>
      )}
      {Boolean(error) && (
        <p className="qom-error-text">{parseError(error)}</p>
      )}
      {!isLoading && !error && (
        <div style={{ overflowX: "auto" }}>
          <table className="qom-table">
            <thead>
              <tr>
                <th>{t("queueManage.name")}</th>
                <th>{t("queue.phone")}</th>
                <th>{t("queueManage.role")}</th>
                <th>{t("queue.status")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member: QueueOrgMember) => (
                <tr key={member.queueOrganizationMembershipUniqueId}>
                  <td style={{ fontWeight: 600, color: "#0f172a" }}>
                    {member.fullName}
                  </td>
                  <td style={{ color: "#64748b", fontSize: "0.8rem" }}>
                    {member.phoneNumber}
                  </td>
                  <td style={{ color: "#475569", fontSize: "0.8rem" }}>
                    {roleLabels[member.roleId] ?? member.roleId}
                  </td>
                  <td>
                    {member.isActive === 1 ? (
                      <span className="qom-badge-active">
                        {t("queueManage.active")}
                      </span>
                    ) : (
                      <span className="qom-badge-disabled">
                        {t("queueManage.inactive")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "1.5rem",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    {t("queueManage.noMembers")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default MembersTable;
