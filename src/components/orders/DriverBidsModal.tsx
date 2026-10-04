import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { extractJourneyStatusId } from "../../utils/journeyStatus";
import { asRecord, findUUIDIn } from "./bids/orderIdLookup";
import type { OrderDisplayItem, ShipperRequestDriverInfo } from "./OrdersTypes";
import { Modal } from "../ui/Modal";
import { OrderSummaryCard } from "./bids/OrderSummaryCard";
import { BidsToolbar, type BidsSortOption } from "./bids/BidsToolbar";
import { BidEmptyState } from "./bids/BidEmptyState";
import { BidRow } from "./bids/BidRow";
import { useDriverBidsFilter } from "./bids/useDriverBidsFilter";
import { useAcceptDriverBid } from "./bids/useAcceptDriverBid";
import { mapDriverBidsToRows } from "./bids/mapDriverBids";
import { useGetBidsForOrderQuery } from "@/lib/redux/api";
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

  // The authoritative list of who actually bid. Before this the modal was
  // handed `order.driverRequests` — the shipper-request payload — which is not
  // the board: it can include drivers who never placed a bid and omit bids the
  // board has recorded, so the console silently disagreed with the auction.
  const shipperRequestUniqueId = findUUIDIn(
    "shipperRequestUniqueId",
    order,
    order.rawItem,
    asRecord(order.rawItem).shipperRequest,
  );

  const { data: bidsData } = useGetBidsForOrderQuery(
    { shipperRequestUniqueId: shipperRequestUniqueId ?? "" },
    { skip: !shipperRequestUniqueId },
  );

  const realBids = useMemo(
    () => mapDriverBidsToRows(Array.isArray(bidsData?.data) ? bidsData.data : []),
    [bidsData],
  );

  const driverRequests: ShipperRequestDriverInfo[] =
    realBids.length > 0
      ? realBids
      : (initialRequests && initialRequests.length > 0
          ? initialRequests
          : order.driverRequests || []);

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
            {t("orders.driverRequests", "Driver Requests")}
          </h4>
          <span className="dbm-section-counter">
            {acceptedDriverIds.size}/{order.totalVehicles || 3}
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
    </Modal>
  );
}

export default DriverBidsModal;
