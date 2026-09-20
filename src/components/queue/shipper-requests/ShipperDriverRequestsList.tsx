import { useTranslation } from "react-i18next";
import { User, Phone, Check, CheckCircle2, Loader2 } from "lucide-react";
import { formatJourneyStatusLabel } from "../../../utils/journeyStatus";
import type { ShipperRequestDriverInfo } from "../ShipperRequestsModal";

export interface ShipperDriverRequestsListProps {
  driverRequests: ShipperRequestDriverInfo[];
  isBiddingApproved?: boolean | null;
  acceptingDriverId: string | null;
  acceptedDriverIds: Set<string>;
  onAcceptDriver: (driver: ShipperRequestDriverInfo) => void;
}

export function ShipperDriverRequestsList({
  driverRequests,
  isBiddingApproved,
  acceptingDriverId,
  acceptedDriverIds,
  onAcceptDriver,
}: ShipperDriverRequestsListProps) {
  const { t } = useTranslation();

  return (
    <div className="srm-drivers-section">
      <div className="srm-drivers-header">
        <span className="srm-drivers-title">
          {isBiddingApproved
            ? t("orders.driverRequests", "Driver Requests")
            : t("orders.assignedDrivers", "Assigned Driver(s)")}
        </span>
        <span className="srm-drivers-count">
          {driverRequests.length}
        </span>
      </div>
      <div className="srm-drivers-list">
        {driverRequests.map((d, dIdx) => {
          const rawDriver = d as any;
          const dKey =
            d.userUniqueId ||
            rawDriver.driverUserUniqueId ||
            d.phoneNumber ||
            rawDriver.driverPhoneNumber ||
            String(d.driverRequestId || d.driverRequestUniqueId || dIdx);
          const isThisAccepting = acceptingDriverId === dKey;
          const isAccepted =
            acceptedDriverIds.has(dKey) ||
            d.journeyStatusId === 4 ||
            d.journeyStatusId === 3 ||
            d.journeyStatusId === 5 ||
            d.journeyStatusId === 6 ||
            d.journeyStatusId === 7 ||
            d.journeyStatusId === 8 ||
            d.journeyStatusId === 9;

          const driverStatusLabel = isAccepted
            ? t("orders.accepted", "Accepted")
            : d.journeyStatusId
            ? formatJourneyStatusLabel(d.journeyStatusId)
            : t("orders.status", "Requested");

          const offerCostValue = d.offerCost ?? d.proposedCost ?? d.bidAmount;

          return (
            <div
              key={dKey}
              className={`srm-driver-item ${isAccepted ? "accepted" : ""}`}
            >
              <div className="srm-driver-info">
                <div className="srm-driver-avatar">
                  <User size={15} />
                </div>
                <div className="srm-driver-details">
                  <span className="srm-driver-name">
                    {d.fullName ||
                      t("dispatchModal.waitingDriver", "Driver")}
                  </span>
                  <div className="srm-driver-submeta">
                    {d.phoneNumber && (
                      <span className="srm-driver-phone">
                        <Phone size={11} /> {d.phoneNumber}
                      </span>
                    )}
                    {(d.vehicleTypeName || d.plateNumber) && (
                      <span className="srm-driver-veh-tag">
                        {d.vehicleTypeName || ""}
                        {d.plateNumber ? ` (${d.plateNumber})` : ""}
                      </span>
                    )}
                    {Boolean(offerCostValue) && (
                      <span className="srm-driver-offer-badge">
                        {t("orders.driverOfferCost", "Driver Offer")}:{" "}
                        <strong>
                          {Number(offerCostValue).toLocaleString()} ETB
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="srm-driver-actions">
                <span
                  className={`srm-driver-badge ${
                    isAccepted ? "status-accepted" : "status-pending"
                  }`}
                >
                  {driverStatusLabel}
                </span>

                {isAccepted ? (
                  <button
                    type="button"
                    className="srm-btn-driver-accepted"
                    disabled
                    aria-label={t("orders.accepted", "Accepted")}
                  >
                    <CheckCircle2 size={13} />
                    <span>{t("orders.accepted", "Accepted")}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="srm-btn-accept-driver"
                    onClick={() => onAcceptDriver(d)}
                    disabled={Boolean(acceptingDriverId)}
                    title={t("orders.acceptDriverRequest", "Accept Request")}
                  >
                    {isThisAccepting ? (
                      <>
                        <Loader2
                          size={13}
                          className="srm-spinner"
                        />
                        <span>
                          {t("orders.accepting", "Accepting...")}
                        </span>
                      </>
                    ) : (
                      <>
                        <Check size={13} strokeWidth={2.5} />
                        <span>
                          {t(
                            "orders.acceptDriverRequest",
                            "Accept Request"
                          )}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ShipperDriverRequestsList;
