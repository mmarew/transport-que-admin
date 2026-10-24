import { useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { extractJourneyStatusId } from "../../utils/journeyStatus";
import type { OrderDisplayItem, ShipperRequestDriverInfo } from "./OrdersTypes";
import { Modal } from "../ui/Modal";
import { OrderSummaryCard } from "./bids/OrderSummaryCard";
import { BidsToolbar, type BidsSortOption } from "./bids/BidsToolbar";
import { BidEmptyState } from "./bids/BidEmptyState";
import { BidRow } from "./bids/BidRow";
import { useDriverBidsFilter } from "./bids/useDriverBidsFilter";
import { useAcceptDriverBid } from "./bids/useAcceptDriverBid";
import { useDriverBidsData } from "./bids/useDriverBidsData";
import "./DriverBidsModal.css";

interface DriverBidsModalProps {
  order: OrderDisplayItem;
  queueOrganizationUniqueId: string;
  driverRequests?: ShipperRequestDriverInfo[];
  /** Required vehicles for this batch, from the backend (batch group count). */
  totalVehicles?: number;
  /** Trucks already committed to the batch, from the backend batch-group count. */
  acceptedVehicles?: number;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

export function DriverBidsModal({
  order,
  queueOrganizationUniqueId,
  driverRequests: initialRequests,
  totalVehicles,
  acceptedVehicles,
  onClose,
  onOrderUpdated,
}: DriverBidsModalProps) {
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<BidsSortOption>("nearest");
  const [displayLimit, setDisplayLimit] = useState<number>(25);

  const {
    isCompany,
    driverRequests,
    isLoadingProposals,
    isDriverAccepted,
    driverEntryKey,
  } = useDriverBidsData({ order, initialRequests });

  const requiredVehicles = totalVehicles ?? order.totalVehicles;

  const { acceptingDriverId, acceptedDriverIds, handleAcceptDriver } =
    useAcceptDriverBid(order, queueOrganizationUniqueId, onOrderUpdated);

  const isDriverAcceptedCheck = (driver: ShipperRequestDriverInfo, driverKey?: string) => {
    if (isDriverAccepted(driver)) return true;
    if (driverKey && acceptedDriverIds.has(driverKey)) return true;
    if (driver.companyBidRequestUniqueId && acceptedDriverIds.has(String(driver.companyBidRequestUniqueId))) return true;
    if (driver.driverBidUniqueId && acceptedDriverIds.has(String(driver.driverBidUniqueId))) return true;
    if (driver.driverRequestUniqueId && acceptedDriverIds.has(String(driver.driverRequestUniqueId))) return true;
    if (driver.userUniqueId && acceptedDriverIds.has(String(driver.userUniqueId))) return true;
    if (driver.phoneNumber && acceptedDriverIds.has(String(driver.phoneNumber))) return true;
    return false;
  };

  const acceptedKeys = new Set<string | number>(acceptedDriverIds);
  driverRequests.forEach((d, idx) => {
    const key = driverEntryKey(d, idx);
    if (isDriverAcceptedCheck(d, key)) acceptedKeys.add(key);
  });
  const orderSid = extractJourneyStatusId(
    order.journeyStatusId ?? order.journeyStatus ?? (order as any).status,
  );
  const isOrderShipperAccepted =
    typeof orderSid === "number" && ((orderSid >= 4 && orderSid <= 9) || orderSid === 14);

  const acceptedCount =
    acceptedVehicles != null && acceptedVehicles > 0
      ? Math.max(acceptedVehicles, acceptedKeys.size)
      : acceptedKeys.size > 0
        ? acceptedKeys.size
        : isOrderShipperAccepted
          ? requiredVehicles || 1
          : 0;

  const { filteredAndSortedDrivers, visibleDrivers, hasAnyAcceptedDriver } =
    useDriverBidsFilter({
      driverRequests,
      order,
      searchTerm,
      sortBy,
      displayLimit,
      acceptedDriverIds,
      totalVehicles: requiredVehicles,
      isCompany,
    });

  return (
    <Modal
      open={true}
      onClose={onClose}
      variant="orders"
      containerClassName="dbm-modal-content"
      hideCloseButton={true}
    >
      {/* Header */}
      <div className="dbm-header">
        <div className="dbm-title-area">
          <h3 id="dbm-title" className="dbm-title">
            {isCompany
              ? t("orders.companyBidsTitle", "Company Bids & Proposals")
              : t("orders.driverBidsTitle", "Driver Bids & Proposals")}
          </h3>
          <p className="dbm-subtitle">
            {isCompany
              ? t(
                "orders.companyBidsSubtitle",
                "Review proposals from transport companies and accept one for this order.",
              )
              : t(
                "orders.driverBidsSubtitle",
                "Review proposals from drivers and accept one for this order.",
              )}
          </p>
        </div>
        <button
          type="button"
          className="dbm-close-btn"
          onClick={onClose}
          aria-label={t("common.close", "Close")}
        >
          <X size={20} />
        </button>
      </div>

      {/* Bids List Section with Order Summary */}
      <div className="dbm-body">
        {/* Order Summary Banner */}
        <OrderSummaryCard order={order} />

        <div className="dbm-section-header">
          <h4 className="dbm-section-title">
            {isCompany
              ? t("orders.companyRequests", "Company Requests")
              : t("orders.driverRequests", "Driver Requests")}
          </h4>
          <span className="dbm-section-counter">
            {acceptedCount}
            {requiredVehicles ? `/${requiredVehicles}` : ""}
          </span>
        </div>

        {driverRequests.length > 0 && (
          <BidsToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
            displayLimit={displayLimit}
            onDisplayLimitChange={setDisplayLimit}
            shownCount={visibleDrivers.length}
            totalFiltered={filteredAndSortedDrivers.length}
            onShowAll={() => setDisplayLimit(0)}
            isCompany={isCompany}
          />
        )}

        {isLoadingProposals ? (
          <div className="dbm-loading-state">
            <div className="dbm-loading-spinner" />
            <p className="dbm-loading-text">
              {isCompany
                ? t("orders.loadingCompanyBids", "Loading company proposals...")
                : t("orders.loadingDriverBids", "Loading driver proposals...")}
            </p>
          </div>
        ) : driverRequests.length === 0 || visibleDrivers.length === 0 ? (
          <BidEmptyState
            hasAnyBids={driverRequests.length > 0}
            onClearSearch={() => setSearchTerm("")}
            isCompany={isCompany}
          />
        ) : (
          <div className="dbm-bids-list">
            {visibleDrivers.map((driver, idx) => {
              const driverKey = driverEntryKey(driver, idx);
              const isAccepted = isDriverAcceptedCheck(driver, driverKey);
              return (
                <BidRow
                  key={driverKey}
                  driver={driver}
                  order={order}
                  isAccepted={isAccepted}
                  hasAnyAcceptedDriver={hasAnyAcceptedDriver}
                  isAccepting={acceptingDriverId === driverKey}
                  isAnyAccepting={acceptingDriverId !== null}
                  isCompany={isCompany}
                  onAccept={handleAcceptDriver}
                />
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default DriverBidsModal;
