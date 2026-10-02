import { useTranslation } from "react-i18next";
import { Check, Clock, UserCheck } from "lucide-react";
import type { ShipperRequestDriverInfo } from "../OrdersTypes";

interface BidActionButtonsProps {
  driver: ShipperRequestDriverInfo;
  isAccepted: boolean;
  hasAnyAcceptedDriver: boolean;
  isDriverRequested: boolean;
  isDriverAccepted: boolean;
  isAccepting: boolean;
  isAnyAccepting: boolean;
  onAccept: (driver: ShipperRequestDriverInfo) => void;
  /**
   * When set, the Accept button is disabled and explains why. Used when the
   * rows on screen are a reconstruction rather than the real bidding board —
   * accepting from those could attach the decision to the wrong driver.
   */
  acceptDisabledReason?: string;
}

export function BidActionButtons({
  driver,
  isAccepted,
  hasAnyAcceptedDriver,
  isDriverRequested,
  isDriverAccepted,
  isAccepting,
  isAnyAccepting,
  onAccept,
  acceptDisabledReason,
}: BidActionButtonsProps) {
  const { t } = useTranslation();

  return (
    <div className="dbm-bid-actions">
      {isAccepted ? (
        <span className="dbm-btn-accepted">
          <Check size={14} strokeWidth={2.5} />
          {t("orders.accepted", "Accepted")}
        </span>
      ) : hasAnyAcceptedDriver ? (
        <span
          className="dbm-btn-not-selected"
          title={t(
            "orders.anotherDriverAccepted",
            "Another driver has already been accepted for this order",
          )}
        >
          {t("orders.notSelected", "Not Selected")}
        </span>
      ) : isDriverRequested && !isDriverAccepted ? (
        <span
          className="dbm-btn-awaiting-driver"
          title={t(
            "orders.driverRequestedTooltip",
            "Driver has been requested but has not accepted yet",
          )}
        >
          <Clock size={13} />
          <span>{t("orders.awaitingDriverResponse", "Awaiting Driver")}</span>
        </span>
      ) : (
        <button
          type="button"
          className="dbm-btn-accept"
          disabled={isAccepting || isAnyAccepting || !!acceptDisabledReason}
          onClick={() => onAccept(driver)}
          title={
            acceptDisabledReason ||
            t("orders.acceptOffer", "Accept Offer")
          }
        >
          {isAccepting ? (
            <>
              <span className="dbm-spinner" />
              <span>{t("orders.accepting", "Accepting...")}</span>
            </>
          ) : (
            <>
              <UserCheck size={14} />
              <span>{t("orders.acceptOffer", "Accept Offer")}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
