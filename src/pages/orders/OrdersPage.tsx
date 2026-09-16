import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { CreateOrderModal } from "../../components/queue/CreateOrderModal";
import {
  useListQueueOrganizationsQuery,
  useGetShipperRequestsQuery,
  useGetShipperRequestBatchesQuery,
} from "../../lib/redux/api";
import {
  connectSocket,
  subscribeToQueue,
  unsubscribeFromQueue,
} from "../../lib/socket";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import {
  normalizeOrgList,
  calculateDistanceKm,
  lookupLocationFromCoordinates,
  extractOfferCost,
} from "../../utils/formatters";
import { extractJourneyStatusId, getJourneyStatusName } from "../../utils/journeyStatus";
import { OrdersTable } from "../../components/orders/OrdersTable";
import { OrdersMobileCards } from "../../components/orders/OrdersMobileCards";
import { OrdersPagination } from "../../components/orders/OrdersPagination";
import { OrdersEditModal } from "../../components/orders/OrdersEditModal";
import { OrdersDeleteModal } from "../../components/orders/OrdersDeleteModal";
import { DriverBidsModal } from "../../components/orders/DriverBidsModal";
import { groupOrdersByBatch, getConnectedJourneyStatus } from "../../components/orders/OrdersTypes";
import type {
  OrderDisplayItem,
  OrderBatchGroup,
  ShipperRequestPayloadItem,
  SortColumn,
} from "../../components/orders/OrdersTypes";
import { PAGE_SIZE } from "../../components/orders/OrdersTypes";
import { extractCity } from "../../utils/formatters";
import "./OrdersPage.css";

export function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedOrgId = useQueueAdminStore((s) => s.selectedOrgId);
  const setSelectedOrgId = useQueueAdminStore((s) => s.setSelectedOrgId);

  // Active organization
  const targetOrgId = searchParams.get("orgId") || selectedOrgId || "";
  const { data: orgListData } = useListQueueOrganizationsQuery();
  const orgList = useMemo(() => normalizeOrgList(orgListData), [orgListData]);

  const activeOrg = useMemo(() => {
    if (!targetOrgId) return orgList[0]?.organization || null;
    return (
      orgList.find(
        (item) => item.organization?.queueOrganizationUniqueId === targetOrgId
      )?.organization ||
      orgList[0]?.organization ||
      null
    );
  }, [orgList, targetOrgId]);

  // Backend data
  const {
    data: backendOrdersData,
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useGetShipperRequestsQuery(
    { queueOrganizationUniqueId: activeOrg?.queueOrganizationUniqueId || "", target: "all", limit: 100 },
    {
      skip: !activeOrg?.queueOrganizationUniqueId,
      refetchOnReconnect: true,
      refetchOnFocus: true,
      pollingInterval: 5000,
    }
  );

  const {
    data: backendBatchesData,
    isLoading: isLoadingBatches,
    refetch: refetchBatches,
  } = useGetShipperRequestBatchesQuery(
    {
      queueOrganizationUniqueId: activeOrg?.queueOrganizationUniqueId || "",
      requestMode: "company_target",
      includeBids: true,
      limit: 100,
    },
    {
      skip: !activeOrg?.queueOrganizationUniqueId,
      refetchOnReconnect: true,
      refetchOnFocus: true,
      pollingInterval: 5000,
    }
  );

  const socketConnected = useQueueAdminStore((s) => s.socketConnected);

  // State
  const [activeTab, setActiveTab] = useState<"ongoing" | "complete">("ongoing");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortCol, setSortCol] = useState<SortColumn>("shipper");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderDisplayItem | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<OrderDisplayItem | null>(null);
  const [viewingRequestsOrder, setViewingRequestsOrder] = useState<OrderDisplayItem | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [editedOrders, setEditedOrders] = useState<Record<string, OrderDisplayItem>>({});

  // Live WebSocket subscription for orders (real-time updates via RTK Query tag invalidation)
  useEffect(() => {
    const orgId = activeOrg?.queueOrganizationUniqueId;
    if (!orgId) return;

    connectSocket();
    subscribeToQueue(orgId);

    return () => {
      unsubscribeFromQueue(orgId);
    };
  }, [activeOrg?.queueOrganizationUniqueId]);

  // Derive orders from backend data
  const orders = useMemo<OrderDisplayItem[]>(() => {
    const rawList = backendOrdersData?.data as unknown as ShipperRequestPayloadItem[] | undefined;
    let baseList: OrderDisplayItem[] = [];

    if (Array.isArray(rawList)) {
      baseList = rawList.map((item, idx) => {
        const rawReq = (item.shipperRequest && typeof item.shipperRequest === "object" ? item.shipperRequest : null) as any;
        const req = rawReq || (item as any) || {};

        const resolvedShipperRequestUniqueId =
          req.shipperRequestUniqueId ||
          (item as any).shipperRequestUniqueId ||
          (req as any).shipper_request_unique_id ||
          (item as any).shipper_request_unique_id ||
          (req as any).uniqueId ||
          (item as any).uniqueId ||
          `real-${idx}`;

        const resolvedShipperRequestId =
          req.shipperRequestId ??
          (item as any).shipperRequestId ??
          (req as any).shipper_request_id ??
          (item as any).shipper_request_id ??
          null;

        const resolvedBatchId =
          req.batchId ??
          (item as any).batchId ??
          (req as any).batch_id ??
          (item as any).batch_id ??
          (req as any).shipperRequestBatchId ??
          (item as any).shipperRequestBatchId ??
          null;

        const resolvedVehicleTypeUniqueId =
          req.vehicleTypeUniqueId ||
          (item as any).vehicleTypeUniqueId ||
          (req as any).vehicle_type_unique_id ||
          (item as any).vehicle_type_unique_id ||
          undefined;

        const resolvedQueueOrgId =
          req.queueOrganizationUniqueId ||
          (item as any).queueOrganizationUniqueId ||
          (req as any).queue_organization_unique_id ||
          (item as any).queue_organization_unique_id ||
          activeOrg?.queueOrganizationUniqueId ||
          targetOrgId ||
          "";

        const rawCost =
          extractOfferCost(req, item) ??
          req.shippingCost ??
          (item as any).shippingCost ??
          req.cost ??
          (item as any).cost ??
          25000;
        const costNum = Number(String(rawCost).replace(/[^0-9.]/g, "")) || 25000;

        const rawQuintal =
          req.shippableItemQtyInQuintal ??
          (item as any).shippableItemQtyInQuintal ??
          req.quintal ??
          (item as any).quintal ??
          5;
        const quintalNum = Number(String(rawQuintal).replace(/[^0-9.]/g, "")) || 5;

        const rawMode = req.requestMode || (item as any).requestMode || "";
        const mode =
          String(rawMode).toLowerCase().includes("group") ||
          String(rawMode).toLowerCase().includes("company")
            ? "Group"
            : "Individual";

        const hasReqId =
          resolvedShipperRequestId != null &&
          String(resolvedShipperRequestId).trim() !== "" &&
          !isNaN(Number(resolvedShipperRequestId));

        const hasBatchId =
          resolvedBatchId != null &&
          String(resolvedBatchId).trim() !== "" &&
          !isNaN(Number(resolvedBatchId));

        let displayId = "";
        if (hasBatchId && hasReqId) {
          displayId = `#${resolvedBatchId}/${resolvedShipperRequestId}`;
        } else if (hasBatchId) {
          displayId = `#${resolvedBatchId}`;
        } else if (hasReqId) {
          displayId = `#${resolvedShipperRequestId}`;
        } else {
          displayId = `#${idx + 1}`;
        }

        const fullId = displayId;
        const requestIdDisplay = hasReqId ? String(resolvedShipperRequestId) : String(idx + 1);
        const batchIdDisplay = hasBatchId ? String(resolvedBatchId) : null;
        const fullRequestId = String(resolvedShipperRequestId ?? (idx + 1));
        const fullBatchId = hasBatchId ? String(resolvedBatchId) : null;

        const rawDecisions: any[] =
          (Array.isArray((item as any).decisions) ? (item as any).decisions : []) ||
          (Array.isArray((req as any).decisions) ? (req as any).decisions : []) ||
          [];

        const rawDriverRequests =
          (Array.isArray(item.driverRequests) && item.driverRequests.length > 0
            ? item.driverRequests
            : null) ||
          (Array.isArray((req as any).driverRequests) &&
          (req as any).driverRequests.length > 0
            ? (req as any).driverRequests
            : null) ||
          rawDecisions ||
          [];

        const isBiddingApproved = Boolean(
          req.isBiddingApproved ||
          (req as any).is_bidding_approved ||
          (req as any).biddingApproved ||
          (item as any).isBiddingApproved ||
          (item as any).is_bidding_approved ||
          (item as any).biddingApproved
        );

        const originLat =
          req.originLatitude ??
          (item as any).originLatitude ??
          (activeOrg?.latitude != null ? activeOrg.latitude : null);
        const originLng =
          req.originLongitude ??
          (item as any).originLongitude ??
          (activeOrg?.longitude != null ? activeOrg.longitude : null);

        const rawStatusCandidate =
          req.journeyStatusId ??
          (item as any).journeyStatusId ??
          (req as any).journey_status_id ??
          (item as any).journey_status_id ??
          (req as any).statusId ??
          (item as any).statusId;

        const acceptedDriverInRequests = rawDriverRequests.find((d: any) => {
          const sid = extractJourneyStatusId(d.journeyStatusId ?? d.journeyStatus ?? (d as any).status);
          return (typeof sid === "number" && sid >= 3 && sid <= 9) || d.journeyStatus === "acceptedByShipper";
        });

        const acceptedDecision = rawDecisions.find((dec: any) => {
          const sid = extractJourneyStatusId(dec.journeyStatusId ?? dec.journeyDecisionStatus);
          return (typeof sid === "number" && sid >= 3 && sid <= 9) || dec.journeyDecisionStatus === "accepted";
        });

        const explicitSid =
          extractJourneyStatusId(rawStatusCandidate) ??
          extractJourneyStatusId(acceptedDecision?.journeyStatusId ?? acceptedDecision?.journeyDecisionStatus) ??
          extractJourneyStatusId(acceptedDriverInRequests?.journeyStatusId ?? acceptedDriverInRequests?.journeyStatus);

        const isComplete = Boolean(
          req.isCompleted ||
          (item as any).isCompleted ||
          explicitSid === 9 ||
          explicitSid === 14 ||
          String(req.status || (item as any).status || "").toLowerCase() === "completed" ||
          String(req.status || (item as any).status || "").toLowerCase() === "delivered" ||
          String(req.requestStatus || (item as any).requestStatus || "").toLowerCase() === "completed"
        );

        const resolvedJourneyStatusId = explicitSid ?? (isComplete ? 9 : 2);

        const driverRequests = rawDriverRequests.map((d: any) => {
          const dLat = d.latitude ?? d.driverLatitude ?? d.currentLatitude ?? d.lat ?? null;
          const dLng = d.longitude ?? d.driverLongitude ?? d.currentLongitude ?? d.lng ?? null;
          const resolvedLoc =
            d.currentPlace ??
            d.location ??
            d.locationName ??
            d.currentLocation ??
            d.city ??
            d.terminalName ??
            (dLat && dLng ? lookupLocationFromCoordinates(dLat, dLng) : null);
          const dist = calculateDistanceKm(originLat, originLng, dLat, dLng);

          const driverCost = extractOfferCost(d, item);

          const matchingDecision =
            rawDecisions.find(
              (dec: any) =>
                (dec.driverRequestId != null && dec.driverRequestId === d.driverRequestId) ||
                (dec.driverRequestUniqueId && dec.driverRequestUniqueId === d.driverRequestUniqueId) ||
                (dec.driverUserUniqueId && dec.driverUserUniqueId === d.userUniqueId)
            ) || (rawDecisions.length === 1 ? rawDecisions[0] : null);

          const resolvedJourneyDecisionUniqueId =
            d.journeyDecisionUniqueId ||
            matchingDecision?.journeyDecisionUniqueId ||
            null;

          return {
            ...d,
            driverRequestId: d.driverRequestId,
            driverRequestUniqueId: d.driverRequestUniqueId || d.bidUniqueId || d.userUniqueId,
            userUniqueId: d.userUniqueId || d.driverUserUniqueId,
            journeyDecisionUniqueId: resolvedJourneyDecisionUniqueId,
            fullName: d.fullName ?? d.driverName ?? d.name ?? null,
            phoneNumber: d.phoneNumber ?? d.driverPhoneNumber ?? null,
            journeyStatusId: d.journeyStatusId ?? d.statusId ?? null,
            journeyStatus: d.journeyStatus ?? null,
            shipperRequestUniqueId:
              d.shipperRequestUniqueId ||
              d.shipper_request_unique_id ||
              resolvedShipperRequestUniqueId,
            offerCost:
              driverCost ??
              d.offerCost ??
              d.proposedCost ??
              d.bidAmount ??
              d.proposedCostPerVehicle ??
              d.bidCost ??
              d.biddingCost ??
              d.cost ??
              d.price ??
              null,
            proposedCost:
              driverCost ??
              d.proposedCost ??
              d.proposedCostPerVehicle ??
              d.offerCost ??
              d.bidAmount ??
              null,
            bidAmount:
              driverCost ??
              d.bidAmount ??
              d.proposedCost ??
              d.proposedCostPerVehicle ??
              d.offerCost ??
              null,
            vehicleTypeName: d.vehicleTypeName ?? d.vehicleType ?? null,
            plateNumber: d.plateNumber ?? d.vehiclePlateNumber ?? null,
            latitude: dLat,
            longitude: dLng,
            currentPlace: resolvedLoc,
            distanceKm: dist,
            rawDriver: d,
            rawItem: item,
          };
        });

        const shipperName =
          req.fullName ||
          (item as any).fullName ||
          (req as any).shipperUser?.fullName ||
          (item as any).shipperUser?.fullName ||
          t("orders.defaultValuedShipper");

        const vehicleTypeName =
          req.vehicleTypeName ||
          (item as any).vehicleTypeName ||
          req.vehicleTypeOption ||
          (item as any).vehicleTypeOption ||
          t("orders.defaultHeavyTruck");

        const itemName =
          req.shippableItemName ||
          (item as any).shippableItemName ||
          req.item ||
          (item as any).item ||
          t("orders.defaultGeneralCargo");

        const originPlace =
          req.originPlace ||
          (item as any).originPlace ||
          req.pickupLocationName ||
          (item as any).pickupLocationName ||
          t("orders.defaultTerminal");

        const destPlace =
          req.destinationPlace ||
          (item as any).destinationPlace ||
          req.dropoffLocationName ||
          (item as any).dropoffLocationName ||
          t("orders.defaultDestination");

        return {
          id: resolvedShipperRequestUniqueId,
          shipperRequestId: resolvedShipperRequestId,
          batchId: resolvedBatchId,
          requestIdDisplay,
          batchIdDisplay,
          fullRequestId,
          fullBatchId,
          displayId,
          fullId,
          shipper: shipperName,
          type: mode,
          vehicleType: vehicleTypeName,
          vehicleTypeUniqueId: resolvedVehicleTypeUniqueId,
          item: itemName,
          origin: originPlace,
          destination: destPlace,
          originLatitude: originLat,
          originLongitude: originLng,
          destinationLatitude: req.destinationLatitude ?? (item as any).destinationLatitude ?? null,
          destinationLongitude: req.destinationLongitude ?? (item as any).destinationLongitude ?? null,
          quintal: quintalNum,
          cost: costNum,
          status: isComplete ? "complete" : "ongoing",
          journeyStatusId: resolvedJourneyStatusId,
          journeyStatus: getJourneyStatusName(resolvedJourneyStatusId),
          phone: req.phoneNumber || (item as any).phoneNumber || (req as any).shipperUser?.phoneNumber || "",
          createdAt: req.shipperRequestCreatedAt || (item as any).shipperRequestCreatedAt || "",
          isBiddingApproved,
          driverRequests,
          decisions: rawDecisions,
          queueOrganizationUniqueId: resolvedQueueOrgId,
          rawItem: item,
        };
      });
    }

    // 2. Process company target batches from /shipperRequestBatch
    const rawBatchList = backendBatchesData?.data;
    if (Array.isArray(rawBatchList)) {
      const existingBatchIds = new Set(
        baseList.map((o) => (o.batchId != null ? String(o.batchId) : "")).filter(Boolean)
      );

      for (const batch of rawBatchList) {
        if (!batch) continue;
        const bIdStr = batch.batchId != null ? String(batch.batchId) : "";
        if (bIdStr && existingBatchIds.has(bIdStr)) continue;

        const totalVehicles = Math.max(1, Number(batch.totalVehicles) || 1);
        const batchTotalCost = Number(String(batch.shippingCost ?? 0).replace(/[^0-9.]/g, "")) || 0;
        const batchTotalQuintal = Number(String(batch.shippableItemQtyInQuintal ?? 0).replace(/[^0-9.]/g, "")) || 0;

        const shipperName =
          batch.shipperName ||
          (batch as any).fullName ||
          batch.shipperPhone ||
          t("orders.defaultValuedShipper");

        const vehicleTypeName =
          batch.vehicleTypeName ||
          t("orders.defaultHeavyTruck");

        const itemName =
          batch.shippableItemName ||
          t("orders.defaultGeneralCargo");

        const originPlace =
          batch.originPlace ||
          t("orders.defaultTerminal");

        const destPlace =
          batch.destinationPlace ||
          t("orders.defaultDestination");

        const originLat =
          batch.originLatitude != null
            ? batch.originLatitude
            : (activeOrg?.latitude != null ? activeOrg.latitude : null);
        const originLng =
          batch.originLongitude != null
            ? batch.originLongitude
            : (activeOrg?.longitude != null ? activeOrg.longitude : null);

        const sid = Number(batch.journeyStatusId) || 1;
        const isComplete =
          sid === 9 ||
          sid === 14 ||
          String(batch.journeyStatusName || "").toLowerCase() === "completed" ||
          String(batch.journeyStatusName || "").toLowerCase() === "delivered";

        // Parse bids / driverRequests from batch
        const rawBids: any[] =
          (Array.isArray((batch as any).bids) ? (batch as any).bids : []) ||
          (Array.isArray((batch as any).companyBids) ? (batch as any).companyBids : []) ||
          (Array.isArray((batch as any).offers) ? (batch as any).offers : []) ||
          (Array.isArray((batch as any).driverRequests) ? (batch as any).driverRequests : []) ||
          [];

        let driverRequests: any[] = rawBids.map((b: any, bIdx: number) => ({
          driverRequestId: b.driverRequestId ?? b.bidId ?? bIdx + 1,
          driverRequestUniqueId: b.driverRequestUniqueId ?? b.bidUniqueId ?? b.uniqueId ?? `bid-${batch.batchId}-${bIdx + 1}`,
          userUniqueId: b.userUniqueId ?? b.driverUserUniqueId ?? b.companyUniqueId ?? `company-${bIdx + 1}`,
          journeyDecisionUniqueId: b.journeyDecisionUniqueId ?? null,
          fullName: b.fullName ?? b.companyName ?? b.driverName ?? b.name ?? (batch.targetCompanyName || `Company Bidder #${bIdx + 1}`),
          phoneNumber: b.phoneNumber ?? b.phone ?? null,
          journeyStatusId: b.journeyStatusId ?? (b.status === "accepted" ? 3 : 1),
          journeyStatus: b.journeyStatus ?? b.status ?? "submitted",
          shipperRequestUniqueId: b.shipperRequestUniqueId ?? batch.batchUniqueId,
          offerCost: Number(b.offerCost ?? b.bidAmount ?? b.proposedCost ?? b.cost ?? batch.shippingCost) || null,
          proposedCost: Number(b.proposedCost ?? b.bidAmount ?? b.offerCost ?? b.cost ?? batch.shippingCost) || null,
          bidAmount: Number(b.bidAmount ?? b.proposedCost ?? b.offerCost ?? b.cost ?? batch.shippingCost) || null,
          vehicleTypeName: b.vehicleTypeName ?? batch.vehicleTypeName ?? null,
          plateNumber: b.plateNumber ?? null,
          latitude: b.latitude ?? null,
          longitude: b.longitude ?? null,
          currentPlace: b.currentPlace ?? null,
          distanceKm: null,
          rawDriver: b,
          rawItem: batch,
        }));

        if (
          driverRequests.length === 0 &&
          ((batch.bidSummary?.total || 0) > 0 || (batch.bidSummary?.submitted || 0) > 0)
        ) {
          const count = batch.bidSummary?.submitted || batch.bidSummary?.total || 1;
          driverRequests = Array.from({ length: count }, (_, idx) => ({
            driverRequestId: idx + 1,
            driverRequestUniqueId: `bid-${batch.batchUniqueId}-${idx + 1}`,
            userUniqueId: `bidder-${idx + 1}`,
            journeyDecisionUniqueId: null,
            fullName: batch.targetCompanyName || `Company Bidder ${idx + 1}`,
            phoneNumber: null,
            journeyStatusId: 1,
            journeyStatus: "submitted",
            shipperRequestUniqueId: batch.batchUniqueId,
            offerCost: batchTotalCost || null,
            proposedCost: batchTotalCost || null,
            bidAmount: batchTotalCost || null,
            vehicleTypeName,
            plateNumber: null,
            latitude: null,
            longitude: null,
            currentPlace: null,
            distanceKm: null,
            rawDriver: batch.bidSummary,
            rawItem: batch,
          }));
        }

        const isBiddingApproved = true;

        if (totalVehicles > 1) {
          const childCost = Math.round((batchTotalCost / totalVehicles) * 100) / 100;
          const childQuintal = Math.round((batchTotalQuintal / totalVehicles) * 100) / 100;

          for (let truckIdx = 1; truckIdx <= totalVehicles; truckIdx++) {
            const childId = `${batch.batchUniqueId || `batch-${batch.batchId}`}-truck-${truckIdx}`;
            // If the whole batch is complete, all are 9; otherwise slot 1 carries the current journey status,
            // while remaining slots 2..N wait for driver assignments (sid 1)
            const childSid = isComplete ? 9 : (truckIdx === 1 ? sid : 1);
            const childStatus = childSid === 9 || childSid === 14 ? "complete" : "ongoing";

            baseList.push({
              id: childId,
              shipperRequestId: truckIdx,
              batchId: bIdStr,
              requestIdDisplay: String(truckIdx),
              batchIdDisplay: bIdStr,
              fullRequestId: String(truckIdx),
              fullBatchId: bIdStr,
              displayId: `#${batch.batchId}/${truckIdx}`,
              fullId: `#${batch.batchId}/${truckIdx}`,
              shipper: shipperName,
              type: "Group",
              vehicleType: vehicleTypeName,
              vehicleTypeUniqueId: batch.vehicleTypeUniqueId,
              item: itemName,
              origin: originPlace,
              destination: destPlace,
              originLatitude: originLat,
              originLongitude: originLng,
              destinationLatitude: batch.destinationLatitude ?? null,
              destinationLongitude: batch.destinationLongitude ?? null,
              quintal: childQuintal,
              cost: childCost,
              status: childStatus,
              journeyStatusId: childSid,
              journeyStatus: getJourneyStatusName(childSid),
              phone: batch.shipperPhone || "",
              createdAt: batch.batchCreatedAt || "",
              isBiddingApproved,
              driverRequests: truckIdx === 1 ? driverRequests : [],
              decisions: [],
              queueOrganizationUniqueId: batch.queueOrganizationUniqueId,
              totalVehicles,
              batchTotalCost,
              batchTotalQuintal,
              rawItem: batch,
            });
          }
        } else {
          const batchUniqueId = batch.batchUniqueId || `batch-${batch.batchId}`;
          baseList.push({
            id: batchUniqueId,
            shipperRequestId: null,
            batchId: bIdStr,
            requestIdDisplay: "",
            batchIdDisplay: bIdStr,
            fullRequestId: "",
            fullBatchId: bIdStr,
            displayId: `#${batch.batchId}`,
            fullId: `#${batch.batchId}`,
            shipper: shipperName,
            type: "Group",
            vehicleType: vehicleTypeName,
            vehicleTypeUniqueId: batch.vehicleTypeUniqueId,
            item: itemName,
            origin: originPlace,
            destination: destPlace,
            originLatitude: originLat,
            originLongitude: originLng,
            destinationLatitude: batch.destinationLatitude ?? null,
            destinationLongitude: batch.destinationLongitude ?? null,
            quintal: batchTotalQuintal,
            cost: batchTotalCost,
            status: isComplete ? "complete" : "ongoing",
            journeyStatusId: sid,
            journeyStatus: batch.journeyStatusName || getJourneyStatusName(sid),
            phone: batch.shipperPhone || "",
            createdAt: batch.batchCreatedAt || "",
            isBiddingApproved,
            driverRequests,
            decisions: [],
            queueOrganizationUniqueId: batch.queueOrganizationUniqueId,
            totalVehicles: 1,
            batchTotalCost,
            batchTotalQuintal,
            rawItem: batch,
          });
        }
      }
    }

    return baseList
      .filter((o) => !deletedIds.has(o.id))
      .map((o) => editedOrders[o.id] || o);
  }, [backendOrdersData, backendBatchesData, deletedIds, editedOrders, t, activeOrg]);

  // 1. Filter orders strictly by activeTab:
  // - "ongoing": only orders where journey is NOT completed
  // - "complete": only orders where journey IS completed
  const tabOrders = useMemo(() => {
    if (activeTab === "complete") {
      return orders.filter((o) => getConnectedJourneyStatus(o).type === "completed");
    } else {
      return orders.filter((o) => getConnectedJourneyStatus(o).type !== "completed");
    }
  }, [orders, activeTab]);

  // 2. Group tab-specific orders by batch so multi-truck batches appear as unified groups in their respective tab
  const allBatchGroups = useMemo(() => groupOrdersByBatch(tabOrders), [tabOrders]);

  // 3. Filter batch groups by search parameters (e.g. phone)
  const allBatches = useMemo(() => {
    const phoneFilter = searchParams.get("phone") || "";

    const filtered = allBatchGroups.filter((group) => {
      if (phoneFilter && !group.orders.some((o) => o.phone === phoneFilter)) {
        return false;
      }
      return true;
    });

    // Sort batch groups
    return [...filtered].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      switch (sortCol) {
        case "id": valA = (a.displayId || "").toLowerCase(); valB = (b.displayId || "").toLowerCase(); break;
        case "shipper": valA = a.shipper.toLowerCase(); valB = b.shipper.toLowerCase(); break;
        case "type": valA = a.type; valB = b.type; break;
        case "vehicleType": valA = a.vehicleType.toLowerCase(); valB = b.vehicleType.toLowerCase(); break;
        case "item": valA = a.item.toLowerCase(); valB = b.item.toLowerCase(); break;
        case "location": valA = `${a.origin} ${a.destination}`.toLowerCase(); valB = `${b.origin} ${b.destination}`.toLowerCase(); break;
        case "quintal": valA = a.totalQuintal; valB = b.totalQuintal; break;
        case "cost": valA = a.totalCost; valB = b.totalCost; break;
      }
      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [allBatchGroups, activeTab, sortCol, sortAsc, searchParams]);

  const totalPages = Math.max(1, Math.ceil(allBatches.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const currentBatches = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return allBatches.slice(start, start + PAGE_SIZE);
  }, [allBatches, safeCurrentPage]);
  const paginatedOrders = useMemo(() => {
    return currentBatches.flatMap((b) => b.orders);
  }, [currentBatches]);

  // Handlers
  const handleSort = (col: SortColumn) => {
    setCurrentPage(1);
    if (sortCol === col) setSortAsc((prev) => !prev);
    else { setSortCol(col); setSortAsc(true); }
  };

  const confirmDelete = () => {
    if (!deletingOrder) return;
    if ((deletingOrder as any)._isBatchMaster && deletingOrder.batchId) {
      const batchIds = orders
        .filter((o) => o.batchId === deletingOrder.batchId)
        .map((o) => o.id);
      setDeletedIds((prev) => new Set([...prev, ...batchIds, deletingOrder.id]));
    } else {
      setDeletedIds((prev) => new Set([...prev, deletingOrder.id]));
    }
    toast.success(t("orders.orderDeletedSuccess", "Order deleted successfully"));
    setDeletingOrder(null);
  };

  const handleSaveEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOrder) return;
    const formData = new FormData(e.currentTarget);
    const updatedOrder: OrderDisplayItem = {
      ...editingOrder,
      shipper: String(formData.get("shipper") || editingOrder.shipper),
      type: (formData.get("type") as "Individual" | "Group") || editingOrder.type,
      vehicleType: String(formData.get("vehicleType") || editingOrder.vehicleType),
      item: String(formData.get("item") || editingOrder.item),
      origin: String(formData.get("origin") || editingOrder.origin),
      destination: String(formData.get("destination") || editingOrder.destination),
      quintal: Number(formData.get("quintal")) || editingOrder.quintal,
      cost: Number(formData.get("cost")) || editingOrder.cost,
      status: (formData.get("status") as "ongoing" | "complete") || editingOrder.status,
    };
    setEditedOrders((prev) => ({ ...prev, [editingOrder.id]: updatedOrder }));
    toast.success(t("orders.orderUpdatedSuccess", "Order updated successfully"));
    setEditingOrder(null);
  };

  const handleBackToOrganizations = () => {
    setSelectedOrgId("");
    navigate("/dashboard");
  };

  const orgName = activeOrg?.queueOrganizationName || t("orders.defaultOrgName");
  const orgCity = extractCity(activeOrg?.queueOrganizationAddress) || "Addis Ababa";

  const currentViewingOrder = useMemo(() => {
    if (!viewingRequestsOrder) return null;
    return orders.find((o) => o.id === viewingRequestsOrder.id) || viewingRequestsOrder;
  }, [orders, viewingRequestsOrder]);

  return (
    <DashboardLayout activeTab="orders">
      <div className="orders-page-container">
        {/* ── Back link ── */}
        <button
          type="button"
          className="orders-back-link"
          onClick={handleBackToOrganizations}
        >
          <ArrowLeft size={16} />
          <span>{t("orders.backToOrganizations", "Back to Organizations")}</span>
        </button>

        {/* ── Header ── */}
        <div className="orders-header-row">
          <div className="orders-header-left">
            <div className="orders-title-wrap">
              <h1 className="orders-title">{t("orders.pageTitle", "Orders")}</h1>
              <span
                className={`orders-live-badge ${socketConnected ? "orders-live-badge--connected" : "orders-live-badge--syncing"}`}
                title={
                  socketConnected
                    ? t("orders.socketLiveTooltip", "Real-time WebSocket connected")
                    : t("orders.socketSyncingTooltip", "Syncing live updates (auto-refreshing)")
                }
              >
                <span className={`orders-live-dot ${socketConnected ? "" : "orders-live-dot--syncing"}`} />
                {socketConnected ? t("orders.liveBadge", "Live") : t("orders.syncingBadge", "Syncing")}
              </span>
            </div>
            <p className="orders-subtitle">{`${orgName} — ${orgCity}`}</p>
          </div>
          <div className="orders-header-actions">
            <button
              type="button"
              className="orders-btn-new"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>{t("orders.newOrderBtn", "New Order")}</span>
            </button>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="orders-tabs">
          <button
            type="button"
            className={`orders-tab-pill ${activeTab === "ongoing" ? "active" : ""}`}
            onClick={() => { setActiveTab("ongoing"); setCurrentPage(1); }}
          >
            {t("orders.ongoingTab", "Ongoing")}
          </button>
          <button
            type="button"
            className={`orders-tab-pill ${activeTab === "complete" ? "active" : ""}`}
            onClick={() => { setActiveTab("complete"); setCurrentPage(1); }}
          >
            {t("orders.completeTab", "Complete")}
          </button>
        </div>

        {/* ── Desktop Table ── */}
        <OrdersTable
          batchGroups={currentBatches}
          orders={paginatedOrders}
          sortCol={sortCol}
          activeTab={activeTab}
          currentPage={safeCurrentPage}
          onSort={handleSort}
          onEdit={setEditingOrder}
          onDelete={setDeletingOrder}
          onViewRequests={setViewingRequestsOrder}
        />

        {/* ── Mobile Cards ── */}
        <OrdersMobileCards
          batchGroups={currentBatches}
          orders={paginatedOrders}
          activeTab={activeTab}
          onEdit={setEditingOrder}
          onDelete={setDeletingOrder}
          onViewRequests={setViewingRequestsOrder}
        />

        {/* ── Pagination ── */}
        <OrdersPagination
          isLoading={isLoadingOrders || isLoadingBatches}
          totalFiltered={allBatches.length}
          totalShown={paginatedOrders.length}
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* ── Driver Bids & Requests Modal ── */}
        {currentViewingOrder && (
          <DriverBidsModal
            order={currentViewingOrder}
            driverRequests={currentViewingOrder.driverRequests || []}
            queueOrganizationUniqueId={
              activeOrg?.queueOrganizationUniqueId ||
              currentViewingOrder.queueOrganizationUniqueId ||
              ""
            }
            onClose={() => {
              setViewingRequestsOrder(null);
              refetchOrders();
              refetchBatches();
            }}
            onOrderUpdated={() => {
              refetchOrders();
              refetchBatches();
            }}
          />
        )}

        {/* ── Create Modal ── */}
        {showCreateModal && (
          <CreateOrderModal
            queueOrganizationUniqueId={activeOrg?.queueOrganizationUniqueId || ""}
            origin={{
              latitude: activeOrg?.latitude != null ? Number(activeOrg.latitude) : null,
              longitude: activeOrg?.longitude != null ? Number(activeOrg.longitude) : null,
              description: activeOrg?.queueOrganizationAddress || "Cement Factory, Addis Ababa",
            }}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              refetchOrders();
              refetchBatches();
            }}
          />
        )}

        {/* ── Edit Modal ── */}
        {editingOrder && (
          <OrdersEditModal
            order={editingOrder}
            onClose={() => setEditingOrder(null)}
            onSave={handleSaveEdit}
          />
        )}

        {/* ── Delete Modal ── */}
        {deletingOrder && (
          <OrdersDeleteModal
            order={deletingOrder}
            onClose={() => setDeletingOrder(null)}
            onConfirm={confirmDelete}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
