import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  X,
  ExternalLink,
  MapPin,
  Check,
  CheckCircle2,
  Loader2,
  User,
  Phone,
  Tag,
} from "lucide-react";
import { useModalA11y } from "../../hooks/useModalA11y";
import { formatJourneyStatusLabel } from "../../utils/journeyStatus";
import { useAcceptDriverRequestMutation } from "../../lib/redux/api";
import "./DispatchModal.css";
import "./ShipperRequestsModal.css";

export interface ShipperRequestDriverInfo {
  driverRequestId?: number;
  driverRequestUniqueId?: string;
  userUniqueId?: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  journeyStatusId?: number | null;
  journeyStatus?: string | null;
  offerCost?: number | string | null;
  proposedCost?: number | string | null;
  bidAmount?: number | string | null;
  vehicleTypeName?: string | null;
  plateNumber?: string | null;
}

export interface ShipperRequestDetail {
  shipperRequestUniqueId?: string;
  fullName?: string | null;
  phoneNumber?: string;
  requestMode?: string | null;
  vehicleTypeName?: string | null;
  vehicleTypeUniqueId?: string | null;
  shippableItemName?: string | null;
  shippableItemQtyInQuintal?: string | number | null;
  shippingCost?: string | number | null;
  originPlace?: string | null;
  destinationPlace?: string | null;
  shippingDate?: string | null;
  deliveryDate?: string | null;
  shipperRequestCreatedAt?: string | null;
  journeyStatusId?: number | null;
  isBiddingApproved?: boolean | null;
  driverRequests?: ShipperRequestDriverInfo[];
}

interface ShipperRequestsModalProps {
  phone: string;
  name?: string | null;
  request: ShipperRequestDetail | null;
  queueOrganizationUniqueId: string;
  onClose: () => void;
}

function toNumber(value?: string | number | null): number {
  const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export function ShipperRequestsModal({
  phone,
  name,
  request,
  queueOrganizationUniqueId,
  onClose,
}: ShipperRequestsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const modalRef = useModalA11y<HTMLDivElement>({ isOpen: true, onClose });

  const [acceptDriverMutation] = useAcceptDriverRequestMutation();
  const [acceptingDriverId, setAcceptingDriverId] = useState<string | null>(null);
  const [acceptedDriverIds, setAcceptedDriverIds] = useState<Set<string>>(new Set());

  const handleAcceptDriver = async (driver: ShipperRequestDriverInfo) => {
    const driverKey =
      driver.userUniqueId ||
      driver.phoneNumber ||
      String(driver.driverRequestId || driver.driverRequestUniqueId || "");
    if (!driverKey) return;

    setAcceptingDriverId(driverKey);
    try {
      await acceptDriverMutation({
        queueOrganizationUniqueId,
        shipperRequestUniqueId: request?.shipperRequestUniqueId || "",
        driverPhoneNumber: driver.phoneNumber || undefined,
        driverUserUniqueId: driver.userUniqueId || undefined,
        driverRequestId: driver.driverRequestId,
        driverRequestUniqueId: driver.driverRequestUniqueId,
        vehicleTypeUniqueId: request?.vehicleTypeUniqueId || undefined,
      }).unwrap();

      setAcceptedDriverIds((prev) => new Set([...prev, driverKey]));
      toast.success(
        t("orders.driverRequestAccepted", "Driver request accepted successfully")
      );
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

  const openOrdersPage = () => {
    onClose();
    navigate(
      `/orders?orgId=${encodeURIComponent(queueOrganizationUniqueId)}&phone=${encodeURIComponent(phone)}`,
    );
  };

  return createPortal(
    <div
      className="dm-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dm-modal srm-modal" ref={modalRef}>
        <div className="dm-header">
          <div>
            <h3 className="dm-title">
              {t("queue.shipperRequests", "Shipper Requests")}
            </h3>
            <p className="dm-subtitle">
              {name ? `${name} — ` : ""}
              {phone}
            </p>
          </div>
          <button
            type="button"
            className="dm-close-btn"
            onClick={onClose}
            aria-label={t("common.closeModal", "Close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="srm-list">
          {!request ? (
            <p className="srm-empty">
              {t(
                "queue.noShipperRequests",
                "No requests found for this shipper.",
              )}
            </p>
          ) : (
            (() => {
              const cost = toNumber(request.shippingCost);
              const quintal = toNumber(request.shippableItemQtyInQuintal);
              const mode = (request.requestMode || "")
                .toLowerCase()
                .includes("group")
                ? t("orders.modeGroup", "Group")
                : t("orders.modeIndividual", "Individual");
              const statusLabel = formatJourneyStatusLabel(
                request.journeyStatusId,
              );
              return (
                <div className="srm-card">
                  <div className="srm-card-top">
                    <div className="srm-badges">
                      <span className="srm-mode">{mode}</span>
                      {request.isBiddingApproved ? (
                        <span className="srm-badge-bidding">
                          <Tag size={11} />
                          {t("orders.openBidding", "Open for Bidding")}
                        </span>
                      ) : null}
                      {request.journeyStatusId ? (
                        <span className="srm-status">{statusLabel}</span>
                      ) : null}
                    </div>
                    <div className="srm-cost">
                      {cost.toLocaleString()}
                      <span className="srm-cost-cur">ETB</span>
                    </div>
                  </div>

                  <div className="srm-grid">
                    <div className="srm-row">
                      <span className="srm-label">
                        {t("orders.table.item", "Item")}
                      </span>
                      <span className="srm-value">
                        {request.shippableItemName ||
                          t("orders.defaultGeneralCargo", "General Cargo")}
                      </span>
                    </div>
                    <div className="srm-row">
                      <span className="srm-label">
                        {t("orders.table.quintal", "Quintal")}
                      </span>
                      <span className="srm-value">{quintal}</span>
                    </div>
                    <div className="srm-row">
                      <span className="srm-label">
                        {t("orders.table.vehicleType", "Vehicle Type")}
                      </span>
                      <span className="srm-value">
                        {request.vehicleTypeName ||
                          t("orders.defaultHeavyTruck", "Heavy Truck")}
                      </span>
                    </div>
                    <div className="srm-row">
                      <span className="srm-label">
                        {t("orders.shippingDate", "Shipping Date")}
                      </span>
                      <span className="srm-value">
                        {formatDate(request.shippingDate)}
                      </span>
                    </div>
                    <div className="srm-row">
                      <span className="srm-label">
                        {t("orders.deliveryDate", "Delivery Date")}
                      </span>
                      <span className="srm-value">
                        {formatDate(request.deliveryDate)}
                      </span>
                    </div>
                    <div className="srm-row">
                      <span className="srm-label">Created</span>
                      <span className="srm-value">
                        {formatDate(request.shipperRequestCreatedAt)}
                      </span>
                    </div>
                    <div className="srm-row srm-route">
                      <span className="srm-label">
                        {t("orders.table.location", "Location")}
                      </span>
                      <span className="srm-value">
                        <MapPin size={12} />
                        {request.originPlace || ""}
                        <span className="srm-arrow">→</span>
                        {request.destinationPlace || ""}
                      </span>
                    </div>
                  </div>

                  {request.driverRequests &&
                    request.driverRequests.length > 0 && (
                      <div className="srm-drivers-section">
                        <div className="srm-drivers-header">
                          <span className="srm-drivers-title">
                            {request.isBiddingApproved
                              ? t("orders.driverRequests", "Driver Requests")
                              : t("orders.assignedDrivers", "Assigned Driver(s)")}
                          </span>
                          <span className="srm-drivers-count">
                            {request.driverRequests.length}
                          </span>
                        </div>
                        <div className="srm-drivers-list">
                          {request.driverRequests.map((d, dIdx) => {
                            const dKey =
                              d.userUniqueId ||
                              d.phoneNumber ||
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

                            return (
                              <div
                                key={dKey}
                                className={`srm-driver-item ${
                                  isAccepted ? "accepted" : ""
                                }`}
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
                                      {Boolean(d.offerCost || d.proposedCost || d.bidAmount) && (
                                        <span className="srm-driver-offer-badge">
                                          {t("orders.driverOfferCost", "Driver Offer")}:{" "}
                                          <strong>
                                            {Number(
                                              d.offerCost ?? d.proposedCost ?? d.bidAmount
                                            ).toLocaleString()}{" "}
                                            ETB
                                          </strong>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="srm-driver-actions">
                                  <span
                                    className={`srm-driver-badge ${
                                      isAccepted
                                        ? "status-accepted"
                                        : "status-pending"
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
                                      onClick={() => handleAcceptDriver(d)}
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
                    )}
                </div>
              );
            })()
          )}
        </div>

        <div className="srm-footer">
          <button
            type="button"
            className="srm-link-btn"
            onClick={openOrdersPage}
          >
            <ExternalLink size={14} />
            {t("queue.viewAllOrders", "View All Orders")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}