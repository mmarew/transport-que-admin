import { useTranslation } from "react-i18next";
import { Truck, Building2 } from "lucide-react";

export interface BidEmptyStateProps {
  hasAnyBids: boolean;
  onClearSearch: () => void;
  isCompany?: boolean;
}

/**
 * BidEmptyState renders empty states when an order has no proposals yet,
 * or when search criteria match 0 items.
 */
export function BidEmptyState({
  hasAnyBids,
  onClearSearch,
  isCompany,
}: BidEmptyStateProps) {
  const { t } = useTranslation();

  if (!hasAnyBids) {
    return (
      <div className="dbm-empty-state">
        <div className="dbm-empty-icon">
          {isCompany ? <Building2 size={24} /> : <Truck size={24} />}
        </div>
        <h5 className="dbm-empty-title">
          {isCompany
            ? t("orders.noCompanyBidsYet", "No company bids yet for this order")
            : t("orders.noBidsYet", "No driver bids yet for this order")}
        </h5>
        <p className="dbm-empty-desc">
          {isCompany
            ? t(
                "orders.noCompanyBidsDescription",
                "Transport companies can view open batch orders and submit bids. When bids arrive, they will appear here with an Accept button.",
              )
            : t(
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
        {isCompany
          ? t("orders.noMatchingCompanies", "No matching companies found")
          : t("orders.noMatchingDrivers", "No matching drivers found")}
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
