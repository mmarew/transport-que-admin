import { useState, useMemo } from "react";
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
  Search,
  ArrowUpDown,
  UserCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAcceptDriverRequestMutation } from "../../lib/redux/api";
import { useModalA11y } from "../../hooks/useModalA11y";
import { formatJourneyStatusLabel, extractJourneyStatusId } from "../../utils/journeyStatus";
import {
  calculateDistanceKm,
  lookupLocationFromCoordinates,
  extractOfferCost,
} from "../../utils/formatters";
import parseError from "../../utils/parseError";
import type { OrderDisplayItem, ShipperRequestDriverInfo } from "./OrdersTypes";
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
  const modalRef = useModalA11y<HTMLDivElement>({ isOpen: true, onClose });

  const [acceptDriverMutation] = useAcceptDriverRequestMutation();
  const [acceptingDriverId, setAcceptingDriverId] = useState<string | null>(null);
  const [acceptedDriverIds, setAcceptedDriverIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "nearest" | "lowest-price" | "highest-price" | "name" | "default"
  >("nearest");
  const [displayLimit, setDisplayLimit] = useState<number>(25);

  const driverRequests: ShipperRequestDriverInfo[] =
    initialRequests && initialRequests.length > 0
      ? initialRequests
      : order.driverRequests || [];

  const filteredAndSortedDrivers = useMemo(() => {
    let list = [...driverRequests];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((d) => {
        const name = (d.fullName || "").toLowerCase();
        const phone = (d.phoneNumber || "").toLowerCase();
        const veh = (d.vehicleTypeName || "").toLowerCase();
        const plate = (d.plateNumber || "").toLowerCase();
        const place = (d.currentPlace || "").toLowerCase();
        return (
          name.includes(q) ||
          phone.includes(q) ||
          veh.includes(q) ||
          plate.includes(q) ||
          place.includes(q)
        );
      });
    }

    if (sortBy === "nearest") {
      list.sort((a, b) => {
        const distA =
          a.distanceKm ??
          calculateDistanceKm(
            order.originLatitude,
            order.originLongitude,
            a.latitude,
            a.longitude
          ) ??
          999999;
        const distB =
          b.distanceKm ??
          calculateDistanceKm(
            order.originLatitude,
            order.originLongitude,
            b.latitude,
            b.longitude
          ) ??
          999999;
        return distA - distB;
      });
    } else if (sortBy === "lowest-price") {
      list.sort((a, b) => {
        const costA = Number(a.offerCost ?? a.proposedCost ?? a.bidAmount ?? extractOfferCost(a) ?? order.cost);
        const costB = Number(b.offerCost ?? b.proposedCost ?? b.bidAmount ?? extractOfferCost(b) ?? order.cost);
        return costA - costB;
      });
    } else if (sortBy === "highest-price") {
      list.sort((a, b) => {
        const costA = Number(a.offerCost ?? a.proposedCost ?? a.bidAmount ?? extractOfferCost(a) ?? order.cost);
        const costB = Number(b.offerCost ?? b.proposedCost ?? b.bidAmount ?? extractOfferCost(b) ?? order.cost);
        return costB - costA;
      });
    } else if (sortBy === "name") {
      list.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
    }

    return list;
  }, [driverRequests, searchTerm, sortBy, order.cost, order.originLatitude, order.originLongitude]);

  const visibleDrivers = useMemo(() => {
    if (displayLimit <= 0) return filteredAndSortedDrivers;
    return filteredAndSortedDrivers.slice(0, displayLimit);
  }, [filteredAndSortedDrivers, displayLimit]);

  const hasAnyAcceptedDriver = useMemo(() => {
    return (
      acceptedDriverIds.size > 0 ||
      driverRequests.some((d) => {
        const sid = extractJourneyStatusId(
          d.journeyStatusId ?? d.journeyStatus ?? (d as any).status
        );
        return (
          (typeof sid === "number" && sid >= 4 && sid <= 9) ||
          d.journeyStatus === "acceptedByShipper"
        );
      })
    );
  }, [acceptedDriverIds, driverRequests]);

  const handleAcceptDriver = async (driver: ShipperRequestDriverInfo) => {
    const rawDriver = driver as any;
    const driverKey =
      driver.userUniqueId ||
      rawDriver.driverUserUniqueId ||
      driver.phoneNumber ||
      rawDriver.driverPhoneNumber ||
      String(driver.driverRequestId || driver.driverRequestUniqueId || "");
    if (!driverKey) return;

    const isUUID = (val?: unknown): val is string =>
      typeof val === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

    // Defensively resolve actual valid UUID for the order/shipperRequest
    const candidateReqIds = [
      order.id,
      (order as any).shipperRequestUniqueId,
      (order.rawItem as any)?.shipperRequestUniqueId,
      (order.rawItem as any)?.shipperRequest?.shipperRequestUniqueId,
      (order.rawItem as any)?.shipper_request_unique_id,
      rawDriver.shipperRequestUniqueId,
      rawDriver.shipper_request_unique_id,
      driver.driverRequestUniqueId,
    ];
    const resolvedShipperRequestUniqueId = candidateReqIds.find(isUUID) || order.id;

    // Defensively resolve actual valid UUID for the queue organization
    const candidateOrgIds = [
      order.queueOrganizationUniqueId,
      queueOrganizationUniqueId,
      (order.rawItem as any)?.queueOrganizationUniqueId,
      (order.rawItem as any)?.shipperRequest?.queueOrganizationUniqueId,
      (order.rawItem as any)?.queue_organization_unique_id,
      rawDriver.queueOrganizationUniqueId,
    ];
    const resolvedQueueOrgId = candidateOrgIds.find(isUUID) || order.queueOrganizationUniqueId || queueOrganizationUniqueId || "";

    // Defensively resolve vehicleTypeUniqueId
    const candidateVehicleTypeIds = [
      order.vehicleTypeUniqueId,
      (order.rawItem as any)?.vehicleTypeUniqueId,
      (order.rawItem as any)?.shipperRequest?.vehicleTypeUniqueId,
      (order.rawItem as any)?.vehicle_type_unique_id,
      rawDriver.vehicleTypeUniqueId,
    ];
    const resolvedVehicleTypeId = candidateVehicleTypeIds.find(isUUID) || order.vehicleTypeUniqueId || undefined;

    // Resolve journeyDecisionUniqueId from driver or order decisions
    const orderDecisions: any[] =
      order.decisions ||
      (order.rawItem as any)?.decisions ||
      [];
    const matchingDecision =
      orderDecisions.find(
        (dec: any) =>
          (dec.driverRequestId != null && dec.driverRequestId === driver.driverRequestId) ||
          (dec.driverRequestUniqueId && dec.driverRequestUniqueId === driver.driverRequestUniqueId) ||
          (dec.driverUserUniqueId && dec.driverUserUniqueId === driver.userUniqueId)
      ) || (orderDecisions.length === 1 ? orderDecisions[0] : null);

    const resolvedJourneyDecisionUniqueId =
      driver.journeyDecisionUniqueId ||
      rawDriver.journeyDecisionUniqueId ||
      matchingDecision?.journeyDecisionUniqueId ||
      undefined;

    setAcceptingDriverId(driverKey);
    try {
      console.log("[DriverBidsModal] Accepting driver:", {
        resolvedQueueOrgId,
        resolvedShipperRequestUniqueId,
        driverPhoneNumber: driver.phoneNumber || rawDriver.driverPhoneNumber,
        driverUserUniqueId: driver.userUniqueId || rawDriver.driverUserUniqueId,
        driverRequestId: driver.driverRequestId || rawDriver.driverRequestId,
        driverRequestUniqueId: driver.driverRequestUniqueId || rawDriver.driverRequestUniqueId,
        journeyDecisionUniqueId: resolvedJourneyDecisionUniqueId,
        queueUniqueId: rawDriver.queueUniqueId || rawDriver.driverQueueUniqueId,
        vehicleTypeUniqueId: resolvedVehicleTypeId,
      });

      await acceptDriverMutation({
        queueOrganizationUniqueId: resolvedQueueOrgId,
        shipperRequestUniqueId: resolvedShipperRequestUniqueId,
        driverPhoneNumber: driver.phoneNumber || rawDriver.driverPhoneNumber || undefined,
        driverUserUniqueId: driver.userUniqueId || rawDriver.driverUserUniqueId || undefined,
        driverRequestId: driver.driverRequestId || rawDriver.driverRequestId || undefined,
        driverRequestUniqueId: driver.driverRequestUniqueId || rawDriver.driverRequestUniqueId || undefined,
        journeyDecisionUniqueId: resolvedJourneyDecisionUniqueId,
        queueUniqueId: rawDriver.queueUniqueId || rawDriver.driverQueueUniqueId || undefined,
        vehicleTypeUniqueId: resolvedVehicleTypeId,
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
      console.error("Backend error response payload:", err?.data);
      toast.error(parseError(err));
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
          <div className="dbm-header-actions">
            <button
              type="button"
              className="orders-modal-close"
              onClick={onClose}
              aria-label={t("common.close", "Close")}
            >
              <X size={18} />
            </button>
          </div>
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

          {driverRequests.length > 0 && (
            <div className="dbm-toolbar">
              <div className="dbm-search-wrap">
                <Search size={14} className="dbm-search-icon" />
                <input
                  type="text"
                  className="dbm-search-input"
                  placeholder={t(
                    "orders.searchDriversPlaceholder",
                    "Search by driver name, phone, or plate..."
                  )}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="dbm-search-clear"
                    onClick={() => setSearchTerm("")}
                    aria-label={t("common.clear", "Clear")}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="dbm-filters-wrap">
                <div className="dbm-filter-group">
                  <ArrowUpDown size={13} className="dbm-filter-icon" />
                  <select
                    className="dbm-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    aria-label={t("orders.sortBy", "Sort by")}
                  >
                    <option value="nearest">
                      {t("orders.nearestFirst", "Nearest Distance First")}
                    </option>
                    <option value="lowest-price">
                      {t("orders.lowestPriceFirst", "Lowest Offer First")}
                    </option>
                    <option value="highest-price">
                      {t("orders.highestPriceFirst", "Highest Offer First")}
                    </option>
                    <option value="name">
                      {t("orders.nameAZ", "Driver Name (A-Z)")}
                    </option>
                    <option value="default">
                      {t("orders.defaultOrder", "Default Order")}
                    </option>
                  </select>
                </div>

                <div className="dbm-filter-group">
                  <select
                    className="dbm-select dbm-select--limit"
                    value={displayLimit}
                    onChange={(e) => setDisplayLimit(Number(e.target.value))}
                    aria-label="Display Limit"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={0}>{t("orders.showAll", "All")}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {driverRequests.length > 0 && (
            <div className="dbm-showing-bar">
              <span className="dbm-showing-text">
                {t("orders.showingDrivers", {
                  shown: visibleDrivers.length,
                  total: filteredAndSortedDrivers.length,
                  defaultValue: `Showing ${visibleDrivers.length} of ${filteredAndSortedDrivers.length} drivers`,
                })}
              </span>
              {filteredAndSortedDrivers.length > visibleDrivers.length && (
                <button
                  type="button"
                  className="dbm-btn-show-more"
                  onClick={() => setDisplayLimit(0)}
                >
                  {t("orders.showAll", "Show All")} ({filteredAndSortedDrivers.length})
                </button>
              )}
            </div>
          )}

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
          ) : visibleDrivers.length === 0 ? (
            <div className="dbm-empty-state">
              <h5 className="dbm-empty-title">
                {t("orders.noBidsYet", "No matching drivers found")}
              </h5>
              <p className="dbm-empty-desc">
                {t("orders.noMatchingDrivers", "Try adjusting your search query.")}
              </p>
              <button
                type="button"
                className="dbm-btn-clear-search"
                onClick={() => setSearchTerm("")}
              >
                {t("common.clear", "Clear Search")}
              </button>
            </div>
          ) : (
            <div className="dbm-bids-list">
              {visibleDrivers.map((driver, idx) => {
                const driverKey =
                  driver.userUniqueId ||
                  driver.phoneNumber ||
                  String(driver.driverRequestId || driver.driverRequestUniqueId || idx);
                const isAccepting = acceptingDriverId === driverKey;

                const statusId = extractJourneyStatusId(
                  driver.journeyStatusId ?? driver.journeyStatus ?? (driver as any).status
                );
                const isDriverAccepted = statusId === 3;
                const isShipperAccepted =
                  typeof statusId === "number" && statusId >= 4 && statusId <= 9;
                const isDriverRequested = statusId === 2;

                const isAccepted =
                  acceptedDriverIds.has(driverKey) ||
                  isShipperAccepted ||
                  driver.journeyStatus === "acceptedByShipper";

                const directCost = extractOfferCost(driver, (order as any).rawItem || order);
                const driverOfferVal =
                  driver.offerCost != null && Number(driver.offerCost) > 0
                    ? Number(driver.offerCost)
                    : driver.proposedCost != null && Number(driver.proposedCost) > 0
                    ? Number(driver.proposedCost)
                    : driver.bidAmount != null && Number(driver.bidAmount) > 0
                    ? Number(driver.bidAmount)
                    : directCost;

                const hasDriverOffer = Boolean(
                  (driverOfferVal != null && driverOfferVal > 0) ||
                  isDriverAccepted ||
                  isShipperAccepted
                );

                const offerVal = Number(
                  driverOfferVal != null && driverOfferVal > 0
                    ? driverOfferVal
                    : order.cost
                );

                const driverDist =
                  driver.distanceKm ??
                  calculateDistanceKm(
                    order.originLatitude,
                    order.originLongitude,
                    driver.latitude,
                    driver.longitude
                  );

                const driverLoc =
                  driver.currentPlace ||
                  (driver.latitude && driver.longitude
                    ? lookupLocationFromCoordinates(driver.latitude, driver.longitude)
                    : null);

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
                        {statusId != null && (
                          <span className={`dbm-status-badge status-${statusId}`}>
                            {formatJourneyStatusLabel(statusId)}
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
                          {driver.vehicleTypeName || order.vehicleType}
                          {driver.plateNumber && ` • ${driver.plateNumber}`}
                        </span>

                        {/* Driver Proximity & Location Tag */}
                        {(driverLoc || driverDist != null) && (
                          <span
                            className="dbm-driver-location-tag"
                            title={
                              driverDist != null
                                ? `${driverLoc ? driverLoc + " • " : ""}${driverDist} km from pickup`
                                : driverLoc || ""
                            }
                          >
                            <MapPin size={12} className="dbm-loc-pin" />
                            {driverLoc && <span className="dbm-loc-name">{driverLoc}</span>}
                            {driverDist != null && (
                              <span className="dbm-dist-badge">
                                {driverDist} km {t("orders.fromPickup", "from pickup")}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Driver Offer Cost */}
                    <div className="dbm-driver-offer-col">
                      <span className="dbm-offer-tag-label">
                        {hasDriverOffer
                          ? t("orders.driverOfferCost", "Driver Offer Cost")
                          : t("orders.targetCostLabel", "Shipper Target Cost")}
                      </span>
                      <span className="dbm-offer-amount">
                        {offerVal.toLocaleString()}{" "}
                        <small className="dbm-offer-currency">ETB</small>
                      </span>
                      {!hasDriverOffer ? (
                        <span className="dbm-offer-target-diff dbm-offer-target-diff--pending">
                          {t("orders.noBidYet", "No driver bid yet")}
                        </span>
                      ) : (
                        order.cost > 0 && (() => {
                          if (offerVal === order.cost) {
                            return (
                              <span className="dbm-offer-target-diff dbm-offer-target-diff--match">
                                {t("orders.matchesShipperTarget", "Matches Shipper Target")}
                              </span>
                            );
                          } else if (offerVal < order.cost) {
                            const diff = order.cost - offerVal;
                            return (
                              <span className="dbm-offer-target-diff dbm-offer-target-diff--below">
                                -{diff.toLocaleString()} ETB {t("orders.belowTarget", "below target")}
                              </span>
                            );
                          } else {
                            const diff = offerVal - order.cost;
                            return (
                              <span className="dbm-offer-target-diff dbm-offer-target-diff--above">
                                +{diff.toLocaleString()} ETB {t("orders.aboveTarget", "above target")}
                              </span>
                            );
                          }
                        })()
                      )}
                    </div>

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
                            "Another driver has already been accepted for this order"
                          )}
                        >
                          {t("orders.notSelected", "Not Selected")}
                        </span>
                      ) : isDriverRequested && !isDriverAccepted ? (
                        <span
                          className="dbm-btn-awaiting-driver"
                          title={t(
                            "orders.driverRequestedTooltip",
                            "Driver has been requested but has not accepted yet"
                          )}
                        >
                          <Clock size={13} />
                          <span>{t("orders.awaitingDriverResponse", "Awaiting Driver")}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="dbm-btn-accept"
                          disabled={isAccepting || acceptingDriverId !== null}
                          onClick={() => handleAcceptDriver(driver)}
                          title={t("orders.acceptOffer", "Accept Offer")}
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
