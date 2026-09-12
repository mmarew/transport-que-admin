import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Gavel,
  Check,
  Phone,
  Truck,
  Package,
  MapPin,
  Clock,
  Inbox,
  Tag,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAcceptDriverRequestMutation } from "../../lib/redux/api";
import { useModalA11y } from "../../hooks/useModalA11y";
import { formatJourneyStatusLabel } from "../../utils/journeyStatus";
import type { OrderDisplayItem, ShipperRequestDriverInfo } from "./OrdersTypes";
import "./DriverBidsModal.css";

interface DriverBidsModalProps {
  order: OrderDisplayItem;
  queueOrganizationUniqueId: string;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

export function DriverBidsModal({
  order,
  queueOrganizationUniqueId,
  onClose,
  onOrderUpdated,
}: DriverBidsModalProps) {
  const { t } = useTranslation();
  const modalRef = useModalA11y<HTMLDivElement>({ isOpen: true, onClose });

  const [acceptDriverMutation] = useAcceptDriverRequestMutation();
  const [acceptingDriverId, setAcceptingDriverId] = useState<string | null>(null);
  const [acceptedDriverIds, setAcceptedDriverIds] = useState<Set<string>>(new Set());

  const driverRequests: ShipperRequestDriverInfo[] = order.driverRequests || [];

  const handleAcceptDriver = async (driver: ShipperRequestDriverInfo) => {
    const driverKey =
      driver.userUniqueId ||
      driver.phoneNumber ||
      String(driver.driverRequestId || driver.driverRequestUniqueId || "");
    if (!driverKey) return;

    setAcceptingDriverId(driverKey);
    try {
      await acceptDriverMutation({
        queueOrganizationUniqueId:
          order.queueOrganizationUniqueId || queueOrganizationUniqueId,
        shipperRequestUniqueId: order.id,
        driverPhoneNumber: driver.phoneNumber || undefined,
        driverUserUniqueId: driver.userUniqueId || undefined,
        driverRequestId: driver.driverRequestId,
        driverRequestUniqueId: driver.driverRequestUniqueId,
        vehicleTypeUniqueId: order.vehicleTypeUniqueId || undefined,
      }).unwrap();

      setAcceptedDriverIds((prev) => new Set([...prev, driverKey]));
      toast.success(
        t("orders.driverRequestAccepted", "Driver request accepted successfully")
      );
      if (onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err: any) {
      console.error("Failed to accept driver request:", err);
      const errMsg =
        err?.data?.message ||
        err?.error ||
        err?.message ||
        t("orders.failedToAcceptDriver", "Failed to accept driver request");
      toast.error(errMsg);
    } finally {
      setAcceptingDriverId(null);
    }
  };

  const getDriverInitials = (name?: string | null) => {
    if (!name) return "DR";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return createPortal(
    <div className="orders-modal-overlay" onClick={onClose}>
      <div
        className="dbm-modal-content"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dbm-title"
      >
        {/* Header */}
        <div className="dbm-header">
          <div className="dbm-title-area">
            <div className="dbm-title-row">
              <div className="dbm-icon-pill">
                <Gavel size={18} />
              </div>
              <div>
                <h3 id="dbm-title" className="dbm-title">
                  {t("orders.driverBidsTitle", "Driver Bids & Proposals")}
                </h3>
                <p className="dbm-subtitle">
                  {t(
                    "orders.driverBidsSubtitle",
                    "Review proposals from drivers and accept one for this order."
                  )}
                </p>
              </div>
            </div>
            <div className="dbm-badges-row">
              {order.isBiddingApproved ? (
                <span className="dbm-badge dbm-badge--bidding">
                  <Tag size={12} />
                  {t("orders.openBidding", "Open for Bidding")}
                </span>
              ) : (
                <span className="dbm-badge dbm-badge--fifo">
                  <Clock size={12} />
                  {t("orders.modeIndividual", "Individual")}
                </span>
              )}
              <span className="dbm-badge dbm-badge--count">
                {t("orders.driverRequestsCount", {
                  count: driverRequests.length,
                  defaultValue: `Driver Requests (${driverRequests.length})`,
                })}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="orders-modal-close"
            onClick={onClose}
            aria-label={t("common.close", "Close")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Order Summary Banner */}
        <div className="dbm-order-card">
          <div className="dbm-order-row">
            <div className="dbm-order-col">
              <span className="dbm-order-label">
                {t("orders.table.shipper", "Shipper")}
              </span>
              <span className="dbm-order-val dbm-order-shipper">
                {order.shipper}
                {order.phone && (
                  <span className="dbm-order-phone"> ({order.phone})</span>
                )}
              </span>
            </div>
            <div className="dbm-order-col">
              <span className="dbm-order-label">
                {t("orders.targetCost", "Target Cost")}
              </span>
              <span className="dbm-order-val dbm-order-cost">
                {order.cost.toLocaleString()}{" "}
                <small className="dbm-order-cur">ETB</small>
              </span>
            </div>
          </div>

          <div className="dbm-order-row dbm-order-row--sub">
            <div className="dbm-order-col">
              <span className="dbm-order-label">
                <Package size={12} /> {t("orders.table.item", "Item")}
              </span>
              <span className="dbm-order-val">
                {order.item} • {order.quintal} Qtl
              </span>
            </div>
            <div className="dbm-order-col">
              <span className="dbm-order-label">
                <Truck size={12} /> {t("orders.table.vehicleType", "Vehicle Type")}
              </span>
              <span className="dbm-order-val">{order.vehicleType}</span>
            </div>
          </div>

          <div className="dbm-route-box">
            <div className="dbm-route-point">
              <MapPin size={13} className="dbm-pin-origin" />
              <span>
                <strong>{t("orders.from", "From")}:</strong> {order.origin}
              </span>
            </div>
            <div className="dbm-route-point">
              <MapPin size={13} className="dbm-pin-dest" />
              <span>
                <strong>{t("orders.to", "To")}:</strong> {order.destination}
              </span>
            </div>
          </div>
        </div>

        {/* Bids List Section */}
        <div className="dbm-body">
          <div className="dbm-section-header">
            <h4 className="dbm-section-title">
              {t("orders.driverRequests", "Driver Requests & Proposals")}
            </h4>
            <span className="dbm-section-counter">
              {driverRequests.length} {driverRequests.length === 1 ? "Bid" : "Bids"}
            </span>
          </div>

          {driverRequests.length === 0 ? (
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
                  "Drivers can view open orders in the mobile carrier app and submit bids. When bids arrive, they will appear here with an Accept button."
                )}
              </p>
            </div>
          ) : (
            <div className="dbm-bids-list">
              {driverRequests.map((driver, idx) => {
                const driverKey =
                  driver.userUniqueId ||
                  driver.phoneNumber ||
                  String(driver.driverRequestId || driver.driverRequestUniqueId || idx);
                const isAccepting = acceptingDriverId === driverKey;
                const isAccepted =
                  acceptedDriverIds.has(driverKey) ||
                  driver.journeyStatusId === 4 ||
                  driver.journeyStatus === "acceptedByShipper";

                return (
                  <div
                    key={driverKey}
                    className={`dbm-bid-item ${isAccepted ? "dbm-bid-item--accepted" : ""}`}
                  >
                    <div className="dbm-driver-avatar">
                      {getDriverInitials(driver.fullName)}
                    </div>

                    <div className="dbm-driver-details">
                      <div className="dbm-driver-header">
                        <span className="dbm-driver-name">
                          {driver.fullName || t("orders.waitingDriver", "Driver")}
                        </span>
                        {typeof driver.journeyStatusId === "number" && (
                          <span
                            className={`dbm-status-badge status-${driver.journeyStatusId}`}
                          >
                            {formatJourneyStatusLabel(driver.journeyStatusId)}
                          </span>
                        )}
                      </div>

                      <div className="dbm-driver-meta">
                        {driver.phoneNumber && (
                          <a
                            href={`tel:${driver.phoneNumber}`}
                            className="dbm-driver-phone"
                            title={driver.phoneNumber}
                          >
                            <Phone size={12} />
                            {driver.phoneNumber}
                          </a>
                        )}
                        <span className="dbm-driver-veh">
                          <Truck size={12} />
                          {order.vehicleType}
                        </span>
                      </div>
                    </div>

                    <div className="dbm-bid-actions">
                      {isAccepted ? (
                        <span className="dbm-btn-accepted">
                          <Check size={14} strokeWidth={2.5} />
                          {t("orders.accepted", "Accepted")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="dbm-btn-accept"
                          disabled={isAccepting || acceptingDriverId !== null}
                          onClick={() => handleAcceptDriver(driver)}
                          title={t("orders.acceptDriverRequest", "Accept Driver Request")}
                        >
                          {isAccepting ? (
                            <>
                              <span className="dbm-spinner" />
                              <span>{t("orders.accepting", "Accepting...")}</span>
                            </>
                          ) : (
                            <>
                              <Check size={14} strokeWidth={2.5} />
                              <span>{t("orders.acceptBid", "Accept")}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="dbm-footer">
          <button type="button" className="dbm-btn-close" onClick={onClose}>
            {t("common.close", "Close")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
