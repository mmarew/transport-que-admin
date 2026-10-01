import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { QueueOrgMember } from "../../types/queue";
import {
  QUEUE_DISPATCHER_ROLE,
  QUEUE_ORG_ADMIN_ROLE,
} from "../../types/queue";
import parseError from "../../utils/parseError";

export interface MembersTableProps {
  members: QueueOrgMember[];
  isLoading: boolean;
  error?: unknown;
  /** Only a Queue Org Admin (role 11) may mutate membership — the backend
   *  rejects dispatcher calls in verifyIfUserIsQueueOrgAdmin. */
  canManage: boolean;
  isMutating: boolean;
  onAdd: (values: {
    userUniqueId: string;
    roleId: number;
  }) => Promise<void>;
  onDeactivate: (membershipId: string) => Promise<void>;
  onReactivate: (membershipId: string) => Promise<void>;
  onRemove: (membershipId: string) => Promise<void>;
}

const EMPTY_FORM = { userUniqueId: "", roleId: QUEUE_DISPATCHER_ROLE };

export function MembersTable({
  members,
  isLoading,
  error,
  canManage,
  isMutating,
  onAdd,
  onDeactivate,
  onReactivate,
  onRemove,
}: MembersTableProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const roleLabels: Record<number, string> = {
    [QUEUE_ORG_ADMIN_ROLE]: t("queueManage.roleQueueOrgAdmin"),
    [QUEUE_DISPATCHER_ROLE]: t("queueManage.roleQueueDispatcher"),
    1: t("queueManage.roleShipper"),
  };

  const submitAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const userUniqueId = form.userUniqueId.trim();
    if (!userUniqueId) {
      setFormError(t("queueManage.memberUserUniqueId"));
      return;
    }
    setFormError(null);
    try {
      await onAdd({ userUniqueId, roleId: form.roleId });
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      setFormError(parseError(err));
    }
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
                {canManage && <th>{t("common.actions")}</th>}
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
                  {canManage && (
                    <td>
                      {member.isActive === 1 ? (
                        <div className="qom-row-actions">
                          <button
                            type="button"
                            className="qom-btn qom-btn-ghost"
                            disabled={isMutating}
                            onClick={() =>
                              onDeactivate(
                                member.queueOrganizationMembershipUniqueId
                              )
                            }
                          >
                            {t("queueManage.deactivate")}
                          </button>
                          <button
                            type="button"
                            className="qom-btn qom-btn-danger"
                            disabled={isMutating}
                            onClick={() =>
                              onRemove(
                                member.queueOrganizationMembershipUniqueId
                              )
                            }
                          >
                            {t("queueManage.remove")}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="qom-btn"
                          disabled={isMutating}
                          onClick={() =>
                            onReactivate(
                              member.queueOrganizationMembershipUniqueId
                            )
                          }
                        >
                          {t("queueManage.reactivate")}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={canManage ? 5 : 4}
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

      {canManage && (
        <form className="qom-member-form" onSubmit={submitAdd}>
          <h3 className="qom-subcard-title">{t("queueManage.addMember")}</h3>
          <p className="qom-hint">{t("queueManage.addMemberHelper")}</p>
          <div className="qom-row-actions">
            <input
              className="qom-input"
              name="userUniqueId"
              value={form.userUniqueId}
              onChange={(event) =>
                setForm({ ...form, userUniqueId: event.target.value })
              }
              placeholder={t("queueManage.memberUserUniqueId")}
              aria-label={t("queueManage.memberUserUniqueId")}
            />
            <select
              className="qom-input"
              name="roleId"
              value={form.roleId}
              onChange={(event) =>
                setForm({ ...form, roleId: Number(event.target.value) })
              }
              aria-label={t("queueManage.memberRole")}
            >
              <option value={QUEUE_DISPATCHER_ROLE}>
                {t("queueManage.roleQueueDispatcher")}
              </option>
              <option value={QUEUE_ORG_ADMIN_ROLE}>
                {t("queueManage.roleQueueOrgAdmin")}
              </option>
            </select>
            <button type="submit" className="qom-btn" disabled={isMutating}>
              {t("queueManage.add")}
            </button>
          </div>
          {formError && <p className="qom-error-text">{formError}</p>}
        </form>
      )}
    </section>
  );
}

export default MembersTable;
