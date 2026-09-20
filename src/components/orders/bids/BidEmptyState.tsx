import { useTranslation } from "react-i18next";
import { Inbox } from "lucide-react";

export interface BidEmptyStateProps {
  hasAnyBids: boolean;
  onClearSearch: () => void;
}

/**
 * BidEmptyState renders empty states when an order has no driver proposals yet,
 * or when search criteria match 0 drivers.
 */
export function BidEmptyState({
  hasAnyBids,
  onClearSearch,
}: BidEmptyStateProps) {
  const { t } = useTranslation();

  if (!hasAnyBids) {
    return (
      <div className="dbm-empty-state">
        <div className="dbm-empty-icon">
          <Inbox size={36} />
        </div>
        <h5 className="dbm-empty-title">
          {t("orders.noBidsYet", "No driver bids yet for this order")}
        </h5>
        <p className="dbm-empty-desc">
          {t(
            "orders.noBidsDescription",
            "Drivers can view open orders in the mobile carrier app and submit bids. When bids arrive, they will appear here with an Accept button.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="dbm-empty-state">
      <h5 className="dbm-empty-title">
        {t("orders.noBidsYet", "No matching drivers found")}
      </h5>
      <p className="dbm-empty-desc">
        {t("orders.noMatchingDrivers", "Try adjusting your search query.")}
      </p>
      <button
        type="button"
        className="dbm-btn-clear-search"
        onClick={onClearSearch}
      >
        {t("common.clear", "Clear Search")}
      </button>
    </div>
  );
}

export default BidEmptyState;
