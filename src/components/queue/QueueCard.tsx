import React from "react";
import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface QueueCardProps {
  title: string;
  waitingCount: number;
  onDispatch: () => void;
  dispatchDisabled?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function QueueCard({
  title,
  waitingCount,
  onDispatch,
  dispatchDisabled = false,
  children,
  className = "",
  style,
}: QueueCardProps) {
  const { t } = useTranslation();

  return (
    <div className={`qb-card ${className}`.trim()} style={style}>
      <div className="qb-card-header">
        <div className="qb-card-title-row">
          <div className="qb-card-title-name">
            <h2 className="qb-card-title">{title}</h2>
          </div>
          <span className="qb-waiting-badge">
            {waitingCount} {t("queue.waiting")}
          </span>
        </div>

        <button
          type="button"
          className="qb-btn-dispatch-outline"
          disabled={dispatchDisabled}
          onClick={onDispatch}
        >
          <Play size={13} fill="currentColor" />
          {t("queue.dispatch")}
        </button>
      </div>

      {children}
    </div>
  );
}

export default QueueCard;
