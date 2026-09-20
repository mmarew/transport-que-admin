import { useState } from "react";
import { Gavel, Clock, Tag } from "lucide-react";
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
import "./DriverBidsModal.css";

interface DriverBidsModalProps {
  order: OrderDisplayItem;
  queueOrganizationUniqueId: string;
  driverRequests?: ShipperRequestDriverInfo[];
  onClose: () => void;
  onOrderUpdated?: () => void;
}

export function DriverBidsModal({
  order,
  queueOrganizationUniqueId,
  driverRequests: initialRequests,
  onClose,
  onOrderUpdated,
}: DriverBidsModalProps) {
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<BidsSortOption>("nearest");
  const [displayLimit, setDisplayLimit] = useState<number>(25);

  const driverRequests: ShipperRequestDriverInfo[] =
    initialRequests && initialRequests.length > 0
      ? initialRequests
      : order.driverRequests || [];

  const { acceptingDriverId, acceptedDriverIds, handleAcceptDriver } =
    useAcceptDriverBid(order, queueOrganizationUniqueId, onOrderUpdated);

  const { filteredAndSortedDrivers, visibleDrivers, hasAnyAcceptedDriver } =
    useDriverBidsFilter({
      driverRequests,
      order,
      searchTerm,
      sortBy,
      displayLimit,
      acceptedDriverIds,
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
                  "Review proposals from drivers and accept one for this order.",
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
        <div className="dbm-header-actions">
          <button
            type="button"
            className="orders-modal-close"
            onClick={onClose}
            aria-label={t("common.close", "Close")}
          >
            ×
          </button>
        </div>
      </div>

      {/* Order Summary Banner */}
      <OrderSummaryCard order={order} />

      {/* Bids List Section */}
      <div className="dbm-body">
        <div className="dbm-section-header">
          <h4 className="dbm-section-title">
            {t("orders.driverRequests", "Driver Requests & Proposals")}
          </h4>
          <span className="dbm-section-counter">
            {driverRequests.length}{" "}
            {driverRequests.length === 1 ? "Bid" : "Bids"}
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
          />
        )}

        {driverRequests.length === 0 || visibleDrivers.length === 0 ? (
          <BidEmptyState
            hasAnyBids={driverRequests.length > 0}
            onClearSearch={() => setSearchTerm("")}
          />
        ) : (
          <div className="dbm-bids-list">
            {visibleDrivers.map((driver, idx) => {
              const driverKey =
                driver.userUniqueId ||
                driver.phoneNumber ||
                String(
                  driver.driverRequestId || driver.driverRequestUniqueId || idx,
                );
              return (
                <BidRow
                  key={driverKey}
                  driver={driver}
                  order={order}
                  isAccepted={
                    acceptedDriverIds.has(driverKey) ||
                    driver.journeyStatus === "acceptedByShipper" ||
                    (typeof extractJourneyStatusId(
                      driver.journeyStatusId ??
                        driver.journeyStatus ??
                        (driver as any).status,
                    ) === "number" &&
                      (extractJourneyStatusId(
                        driver.journeyStatusId ??
                          driver.journeyStatus ??
                          (driver as any).status,
                      ) as number) >= 4 &&
                      (extractJourneyStatusId(
                        driver.journeyStatusId ??
                          driver.journeyStatus ??
                          (driver as any).status,
                      ) as number) <= 9)
                  }
                  hasAnyAcceptedDriver={hasAnyAcceptedDriver}
                  isAccepting={acceptingDriverId === driverKey}
                  isAnyAccepting={acceptingDriverId !== null}
                  onAccept={handleAcceptDriver}
                />
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
    </Modal>
  );
}

export default DriverBidsModal;
