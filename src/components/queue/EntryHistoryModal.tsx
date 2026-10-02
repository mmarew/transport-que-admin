import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { History, X } from "lucide-react";
import { useGetEntryHistoryQuery } from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import type { DriverQueueEntry, QueueEntryHistoryItem } from "../../types/queue";
import { useModalA11y } from "../../hooks/useModalA11y";
import MobileHeader from "../common/MobileHeader";
import "./QueueModals.css";

interface EntryHistoryModalProps {
  entry: DriverQueueEntry;
  onClose: () => void;
}

/**
 * The history endpoint is keyed on the queue entry's own id. Queue cards reach
 * this modal from several surfaces, so the field can arrive as any of the
 * names below depending on which query produced the row.
 */
const QUEUE_ID_FIELDS = [
  "queueUniqueId",
  "driverQueueUniqueId",
  "id",
  "queueId",
] as const;

const resolveQueueUniqueId = (entry: DriverQueueEntry): string | undefined => {
  const record: Record<string, unknown> = { ...entry };
  for (const field of QUEUE_ID_FIELDS) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const formatTimestamp = (value: string, locale: string): string => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export function EntryHistoryModal({ entry, onClose }: EntryHistoryModalProps) {
  const { t, i18n } = useTranslation();
  const modalRef = useModalA11y<HTMLDivElement>({ isOpen: true, onClose });
  const queueUniqueId = resolveQueueUniqueId(entry);

  const { data, isLoading, error } = useGetEntryHistoryQuery(queueUniqueId ?? "", {
    skip: !queueUniqueId,
  });

  const history: QueueEntryHistoryItem[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? (data as unknown as QueueEntryHistoryItem[])
      : [];

  const driverName = entry.driverName || t("queue.driver");

  return createPortal(
    <div className="qm-overlay">
      <div
        className="qm-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
      >
        <div className="qm-mobile-header">
          <MobileHeader title={t("historyModal.title")} onBack={onClose} />
        </div>

        <div className="qm-header qm-header--desktop">
          <div>
            <h2 id="history-modal-title" className="qm-title">
              {t("historyModal.title")}
            </h2>
            <p className="qm-subtitle">{t("historyModal.subtitle")}</p>
          </div>
          <button
            type="button"
            className="qm-close-btn"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="qm-card">
          <div className="qm-icon-circle">
            <History size={20} />
          </div>
          <div className="qm-card-info">
            <span className="qm-card-title">{driverName}</span>
            <span className="qm-card-sub">
              {t("historyModal.position")}: {entry.queueNumber}
            </span>
          </div>
        </div>

        <div className="qm-field-group" style={{ marginTop: "10px" }}>
          {isLoading && <p className="qm-hint-text">{t("historyModal.loading")}</p>}

          {!isLoading && Boolean(error) && (
            <p className="qm-error-text">{parseError(error)}</p>
          )}

          {!isLoading && !error && history.length === 0 && (
            <p className="qm-hint-text">{t("historyModal.empty")}</p>
          )}

          {!isLoading && !error && history.length > 0 && (
            <ol className="qm-history-list">
              {history.map((item) => (
                <li key={item.historyUniqueId} className="qm-history-item">
                  <div className="qm-history-head">
                    <strong>{item.columnName}</strong>
                    <time dateTime={item.performedAt}>
                      {formatTimestamp(item.performedAt, i18n.language)}
                    </time>
                  </div>
                  <div className="qm-history-body">
                    {t("historyModal.changedBy")}: {item.performedBy}
                  </div>
                  <div className="qm-history-old">
                    {t("historyModal.previousValue")}: {item.oldValue}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="qm-footer">
          <button type="button" onClick={onClose} className="qm-btn-cancel">
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default EntryHistoryModal;
