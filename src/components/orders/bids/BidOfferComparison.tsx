import { useTranslation } from "react-i18next";

export interface BidOfferComparisonProps {
  offerVal: number;
  hasDriverOffer: boolean;
}

/**
 * BidOfferComparison renders the offer price badge.
 */
export function BidOfferComparison({
  offerVal,
  hasDriverOffer,
}: BidOfferComparisonProps) {
  const { t } = useTranslation();

  return (
    <div className="dbm-driver-offer-col">
      <span className="dbm-offer-tag-label">
        {hasDriverOffer
          ? t("orders.driverOfferCost", "Driver Offer Cost")
          : t("orders.targetCostLabel", "Shipper Target Cost")}
      </span>
      <span className="dbm-offer-amount">
        {offerVal.toLocaleString()}{" "}
        <small className="dbm-offer-currency">ETB</small>
      </span>
    </div>
  );
}

export default BidOfferComparison;
