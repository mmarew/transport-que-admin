import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, ExternalLink, MapPin } from "lucide-react";
import { useModalA11y } from "../../hooks/useModalA11y";
import { formatJourneyStatusLabel } from "../../utils/journeyStatus";
import "./DispatchModal.css";
import "./ShipperRequestsModal.css";

export interface ShipperRequestDriverInfo {
  userUniqueId?: string;
  fullName?: string | null;
  phoneNumber?: string | null;
}

export interface ShipperRequestDetail {
  shipperRequestUniqueId?: string;
  fullName?: string | null;
  phoneNumber?: string;
  requestMode?: string | null;
  vehicleTypeName?: string | null;
  shippableItemName?: string | null;
  shippableItemQtyInQuintal?: string | number | null;
  shippingCost?: string | number | null;
  originPlace?: string | null;
  destinationPlace?: string | null;
  shippingDate?: string | null;
  deliveryDate?: string | null;
  shipperRequestCreatedAt?: string | null;
  journeyStatusId?: number | null;
  driverRequests?: ShipperRequestDriverInfo[];
}

interface ShipperRequestsModalProps {
  phone: string;
  name?: string | null;
  requests: ShipperRequestDetail[];
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
  requests,
  queueOrganizationUniqueId,
  onClose,
}: ShipperRequestsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const modalRef = useModalA11y<HTMLDivElement>({ isOpen: true, onClose });

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
          {requests.length === 0 ? (
            <p className="srm-empty">
              {t("queue.noShipperRequests", "No requests found for this shipper.")}
            </p>
          ) : (
            requests.map((r, i) => {
              const cost = toNumber(r.shippingCost);
              const quintal = toNumber(r.shippableItemQtyInQuintal);
              const mode = (r.requestMode || "")
                .toLowerCase()
                .includes("group")
                ? t("orders.modeGroup", "Group")
                : t("orders.modeIndividual", "Individual");
              const statusLabel = formatJourneyStatusLabel(r.journeyStatusId);
              return (
                <div key={r.shipperRequestUniqueId || i} className="srm-card">
                  <div className="srm-card-top">
                    <div className="srm-badges">
                      <span className="srm-mode">{mode}</span>
                      {r.journeyStatusId ? (
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
                        {r.shippableItemName || t("orders.defaultGeneralCargo", "General Cargo")}
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
                        {r.vehicleTypeName || t("orders.defaultHeavyTruck", "Heavy Truck")}
                      </span>
                    </div>
                    <div className="srm-row">
                      <span className="srm-label">
                        {t("orders.shippingDate", "Shipping Date")}
                      </span>
                      <span className="srm-value">{formatDate(r.shippingDate)}</span>
                    </div>
                    <div className="srm-row">
                      <span className="srm-label">
                        {t("orders.deliveryDate", "Delivery Date")}
                      </span>
                      <span className="srm-value">{formatDate(r.deliveryDate)}</span>
                    </div>
                    <div className="srm-row">
                      <span className="srm-label">Created</span>
                      <span className="srm-value">
                        {formatDate(r.shipperRequestCreatedAt)}
                      </span>
                    </div>
                    <div className="srm-row srm-route">
                      <span className="srm-label">
                        {t("orders.table.location", "Location")}
                      </span>
                      <span className="srm-value">
                        <MapPin size={12} />
                        {r.originPlace || ""}
                        <span className="srm-arrow">→</span>
                        {r.destinationPlace || ""}
                      </span>
                    </div>
                  </div>

                  {r.driverRequests && r.driverRequests.length > 0 && (
                    <div className="srm-drivers">
                      <strong>
                        {t("orders.assignedDrivers", "Assigned Driver(s)")}:
                      </strong>{" "}
                      {r.driverRequests
                        .map(
                          (d) =>
                            `${d.fullName || d.phoneNumber || d.userUniqueId || ""}`,
                        )
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </div>
              );
            })
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