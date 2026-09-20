import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Modal } from "../ui/Modal";
import { useAcceptDriverRequestMutation } from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { ShipperRequestOverview } from "./shipper-requests/ShipperRequestOverview";
import { ShipperDriverRequestsList } from "./shipper-requests/ShipperDriverRequestsList";
import "./DispatchModal.css";
import "./ShipperRequestsModal.css";

export interface ShipperRequestDriverInfo {
  driverRequestId?: number;
  driverRequestUniqueId?: string;
  userUniqueId?: string;
  journeyDecisionUniqueId?: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  journeyStatusId?: number | null;
  journeyStatus?: string | null;
  offerCost?: number | string | null;
  proposedCost?: number | string | null;
  bidAmount?: number | string | null;
  vehicleTypeName?: string | null;
  plateNumber?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  driverLatitude?: number | string | null;
  driverLongitude?: number | string | null;
  currentPlace?: string | null;
  locationName?: string | null;
  distanceKm?: number | null;
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

export interface ShipperRequestsModalProps {
  phone: string;
  name?: string | null;
  request: ShipperRequestDetail | null;
  queueOrganizationUniqueId: string;
  onClose: () => void;
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

  const [acceptDriverMutation] = useAcceptDriverRequestMutation();
  const [acceptingDriverId, setAcceptingDriverId] = useState<string | null>(null);
  const [acceptedDriverIds, setAcceptedDriverIds] = useState<Set<string>>(new Set());

  const handleAcceptDriver = async (driver: ShipperRequestDriverInfo) => {
    const rawDriver = driver as any;
    const driverKey =
      driver.userUniqueId ||
      rawDriver.driverUserUniqueId ||
      driver.phoneNumber ||
      rawDriver.driverPhoneNumber ||
      String(driver.driverRequestId || driver.driverRequestUniqueId || "");
    if (!driverKey) return;

    setAcceptingDriverId(driverKey);
    try {
      await acceptDriverMutation({
        queueOrganizationUniqueId,
        shipperRequestUniqueId: request?.shipperRequestUniqueId || "",
        driverPhoneNumber: driver.phoneNumber || rawDriver.driverPhoneNumber || undefined,
        driverUserUniqueId: driver.userUniqueId || rawDriver.driverUserUniqueId || undefined,
        driverRequestId: driver.driverRequestId || rawDriver.driverRequestId || undefined,
        driverRequestUniqueId: driver.driverRequestUniqueId || rawDriver.driverRequestUniqueId || undefined,
        journeyDecisionUniqueId: driver.journeyDecisionUniqueId || rawDriver.journeyDecisionUniqueId || undefined,
        queueUniqueId: rawDriver.queueUniqueId || rawDriver.driverQueueUniqueId || undefined,
        vehicleTypeUniqueId: request?.vehicleTypeUniqueId || undefined,
      }).unwrap();

      setAcceptedDriverIds((prev) => new Set([...prev, driverKey]));
      toast.success(
        t("orders.driverRequestAccepted", "Driver request accepted successfully")
      );
    } catch (err: any) {
      console.error("Failed to accept driver request:", err);
      toast.error(parseError(err));
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

  const subtitle = name ? `${name} — ${phone}` : phone;

  return (
    <Modal
      open={true}
      onClose={onClose}
      variant="dm"
      containerClassName="srm-modal"
      title={t("queue.shipperRequests", "Shipper Requests")}
      subtitle={subtitle}
      footer={
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
      }
    >
      <div className="srm-list">
        {!request ? (
          <p className="srm-empty">
            {t("queue.noShipperRequests", "No requests found for this shipper.")}
          </p>
        ) : (
          <div className="srm-card">
            <ShipperRequestOverview request={request} />
            {request.driverRequests && request.driverRequests.length > 0 && (
              <ShipperDriverRequestsList
                driverRequests={request.driverRequests}
                isBiddingApproved={request.isBiddingApproved}
                acceptingDriverId={acceptingDriverId}
                acceptedDriverIds={acceptedDriverIds}
                onAcceptDriver={handleAcceptDriver}
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ShipperRequestsModal;