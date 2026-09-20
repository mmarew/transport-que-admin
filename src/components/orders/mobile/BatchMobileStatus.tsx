import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Gavel, Clock } from "lucide-react";
import type { OrderBatchGroup, OrderDisplayItem } from "../OrdersTypes";
import { getConnectedJourneyStatus } from "../OrdersTypes";

interface BatchMobileStatusProps {
  group: OrderBatchGroup;
  onViewRequests?: (order: OrderDisplayItem) => void;
}

export function BatchMobileStatus({
  group,
  onViewRequests,
}: BatchMobileStatusProps) {
  const { t } = useTranslation();

  if (group.statusSummary.isConnected) {
    return (
      <span
        className={`orders-m-btn-status orders-m-btn-status--${group.statusSummary.type} ${
          group.statusSummary.label.includes(" · ")
            ? "orders-m-btn-status--partial"
            : ""
        }`}
        title={group.statusSummary.label}
      >
        {group.statusSummary.label.includes(" · ") ? (
          <>
            {group.statusSummary.label.split(" · ").map((part, idx) => (
              <Fragment key={idx}>
                {idx > 0 && <span className="orders-status-divider">·</span>}
                <span
                  className={
                    part.includes("Waiting")
                      ? "orders-status-waiting-part"
                      : "orders-status-active-part"
                  }
                >
                  {part}
                </span>
              </Fragment>
            ))}
          </>
        ) : (
          <span>{group.statusSummary.label}</span>
        )}
      </span>
    );
  }

  const firstBiddable = group.orders.find(
    (o) => o.isBiddingApproved && !getConnectedJourneyStatus(o).isConnected,
  );
  const totalBids = group.orders.reduce(
    (acc, o) => acc + (o.driverRequests?.length || 0),
    0,
  );

  if (firstBiddable && totalBids > 0) {
    return (
      <button
        type="button"
        className="orders-m-badge-bids orders-badge-bids"
        onClick={() => onViewRequests?.(firstBiddable)}
        title={t("orders.viewDriverProposals", "View driver proposals")}
      >
        <Gavel size={11} />
        <span>
          {t("orders.bids", "Bids")} ({totalBids})
        </span>
      </button>
    );
  }

  return (
    <span className="orders-m-badge-waiting orders-badge-waiting">
      <Clock size={11} />
      <span>
        {group.totalVehicles > 1
          ? t("orders.batchWaitingPart", "{{waiting}} Waiting", {
              waiting: group.totalVehicles,
            })
          : t("orders.waiting", "Waiting")}
      </span>
    </span>
  );
}
