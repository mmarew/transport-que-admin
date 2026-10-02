import { useMemo, useState } from "react";
import { Gavel, Clock, Tag } from "lucide-react";
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
import { BiddingBoardToggle } from "./bids/BiddingBoardToggle";
import { useGetBidsForOrderQuery } from "@/lib/redux/api";
import parseError from "@/utils/parseError";
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

  const {
    data: bidsData,
    isLoading: isLoadingBids,
    error: bidsError,
    isFetching: isFetchingBids,
  } = useGetBidsForOrderQuery(
    { shipperRequestUniqueId: shipperRequestUniqueId ?? "" },
    { skip: !shipperRequestUniqueId },
  );

  const realBids = useMemo(
    () => mapDriverBidsToRows(Array.isArray(bidsData?.data) ? bidsData.data : []),
    [bidsData],
  );

  // Only fall back to the caller's rows if the board could not be reached, so a
  // transient failure shows a warning instead of a plausible-looking wrong list.
  const useRealBids = Boolean(shipperRequestUniqueId) && !bidsError;

  // Accepting is refused on the reconstructed list. Those rows come from the
  // order board, which can carry a driver request id without the matching
  // journey decision, and the backend requires that decision id — so an accept
  // here either 400s or, worse, matches a decision belonging to a different
  // driver. Showing the rows read-only is honest; offering a button that cannot
  // do the right thing is not.
  const acceptDisabledReason = useRealBids
    ? undefined
    : t("orders.bidsLoadFailed", {
        defaultValue:
          "Could not load the bidding board: {{error}}. Showing cached driver requests — acceptances may be wrong.",
        error: parseError(bidsError),
      });
  const driverRequests: ShipperRequestDriverInfo[] = useRealBids
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
            {isFetchingBids && !isLoadingBids && (
              <span className="dbm-badge dbm-badge--fifo">
                {t("orders.refreshingBids", "Refreshing…")}
              </span>
            )}
          </div>
        </div>
        <div className="dbm-header-actions">
          <BiddingBoardToggle
            shipperRequestUniqueId={shipperRequestUniqueId}
            isBiddingApproved={order.isBiddingApproved}
            onChanged={onOrderUpdated}
          />
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

      {/* Bids List Section with Order Summary */}
      <div className="dbm-body">
        {/* Order Summary Banner */}
        <OrderSummaryCard order={order} />

        <div className="dbm-section-header">
          <h4 className="dbm-section-title">
            {t("orders.driverRequests", "Driver Requests & Proposals")}
          </h4>
          <span className="dbm-section-counter">
            {driverRequests.length}{" "}
            {driverRequests.length === 1 ? "Bid" : "Bids"}
          </span>
        </div>

        {isLoadingBids && (
          <p className="dbm-loading-note">
            {t("orders.loadingBids", "Loading the bidding board…")}
          </p>
        )}

        {Boolean(bidsError) && (
          <p className="dbm-error-note">
            {t("orders.bidsLoadFailed", {
              defaultValue:
                "Could not load the bidding board: {{error}}. Showing cached driver requests — acceptances may be wrong.",
              error: parseError(bidsError),
            })}
          </p>
        )}

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
                  acceptDisabledReason={acceptDisabledReason}
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
