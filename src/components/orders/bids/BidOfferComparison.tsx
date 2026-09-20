import { useTranslation } from "react-i18next";

export interface BidOfferComparisonProps {
  offerVal: number;
  orderCost: number;
  hasDriverOffer: boolean;
}

/**
 * BidOfferComparison renders the offer price badge and target diff indicator.
 */
export function BidOfferComparison({
  offerVal,
  orderCost,
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
      {!hasDriverOffer ? (
        <span className="dbm-offer-target-diff dbm-offer-target-diff--pending">
          {t("orders.noBidYet", "No driver bid yet")}
        </span>
      ) : (
        orderCost > 0 &&
        (() => {
          if (offerVal === orderCost) {
            return (
              <span className="dbm-offer-target-diff dbm-offer-target-diff--match">
                {t("orders.matchesShipperTarget", "Matches Shipper Target")}
              </span>
            );
          } else if (offerVal < orderCost) {
            const diff = orderCost - offerVal;
            return (
              <span className="dbm-offer-target-diff dbm-offer-target-diff--below">
                -{diff.toLocaleString()} ETB{" "}
                {t("orders.belowTarget", "below target")}
              </span>
            );
          } else {
            const diff = offerVal - orderCost;
            return (
              <span className="dbm-offer-target-diff dbm-offer-target-diff--above">
                +{diff.toLocaleString()} ETB{" "}
                {t("orders.aboveTarget", "above target")}
              </span>
            );
          }
        })()
      )}
    </div>
  );
}

export default BidOfferComparison;
