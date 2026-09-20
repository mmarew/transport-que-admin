import { Plus, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface QueueBoardHeaderProps {
  subtitle: string;
  isLive: boolean;
  onNewOrder: () => void;
  onManualCheckin: () => void;
}

export function QueueBoardHeader({
  subtitle,
  isLive,
  onNewOrder,
  onManualCheckin,
}: QueueBoardHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="qb-header-section">
      <div className="qb-title-group">
        <div className="qb-title-row">
          <span
            className="qb-live-dot-indicator"
            title={isLive ? t("queue.live") : t("queue.connecting")}
          />
          <h1 className="qb-title-text">{t("queue.liveQueue")}</h1>
          <span className={`qb-live-badge ${isLive ? "live" : "connecting"}`}>
            <span className="qb-live-badge-dot" />
            {isLive ? t("queue.live") : t("queue.connecting")}
          </span>
        </div>
        <p className="qb-subtitle-text">{subtitle}</p>
      </div>

      <div className="qb-header-actions">
        <button
          type="button"
          className="qb-btn-new-order"
          onClick={onNewOrder}
        >
          <Plus size={16} />
          <span>{t("queue.newOrder")}</span>
        </button>
        <button
          type="button"
          className="qb-btn-manual-checkin"
          onClick={onManualCheckin}
          title={t("queue.manualCheckin")}
          aria-label={t("queue.manualCheckin")}
        >
          <UserPlus size={18} />
          <span className="qb-btn-text--desktop">
            {t("queue.manualCheckin")}
          </span>
        </button>
      </div>
    </div>
  );
}

export default QueueBoardHeader;
