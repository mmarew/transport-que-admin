import type { ShipperRequestDriverInfo } from "../queue/ShipperRequestsModal";
import { extractJourneyStatusId } from "../../utils/journeyStatus";
export type { ShipperRequestDriverInfo };

export interface OrderDisplayItem {
  id: string;
  shipperRequestId?: number | string | null;
  batchId?: string | null;
  requestIdDisplay?: string;
  batchIdDisplay?: string | null;
  fullRequestId?: string;
  fullBatchId?: string | null;
  displayId?: string;
  fullId?: string;
  shipper: string;
  type: "Individual" | "Group";
  vehicleType: string;
  vehicleTypeUniqueId?: string;
  item: string;
  origin: string;
  destination: string;
  originLatitude?: number | string | null;
  originLongitude?: number | string | null;
  destinationLatitude?: number | string | null;
  destinationLongitude?: number | string | null;
  quintal: number;
  cost: number;
  status: "ongoing" | "complete";
  journeyStatusId?: number;
  journeyStatus?: string;
  phone?: string;
  createdAt?: string;
  isBiddingApproved?: boolean;
  driverRequests?: ShipperRequestDriverInfo[];
  decisions?: any[];
  queueOrganizationUniqueId?: string;
  totalVehicles?: number;
  batchTotalCost?: number;
  batchTotalQuintal?: number;
  rawItem?: unknown;
}

export type SortColumn =
  | "id"
  | "shipper"
  | "type"
  | "vehicleType"
  | "item"
  | "location"
  | "quintal"
  | "cost";

export interface ShipperRequestPayloadItem {
  shipperRequest?: {
    shipperRequestUniqueId?: string;
    fullName?: string;
    requestMode?: string;
    vehicleTypeName?: string;
    vehicleTypeUniqueId?: string;
    shippableItemName?: string;
    originPlace?: string;
    destinationPlace?: string;
    originLatitude?: number | string | null;
    originLongitude?: number | string | null;
    destinationLatitude?: number | string | null;
    destinationLongitude?: number | string | null;
    shippableItemQtyInQuintal?: string | number;
    shippingCost?: string | number;
    journeyStatusId?: number;
    phoneNumber?: string;
    shipperRequestCreatedAt?: string;
    isCompleted?: boolean;
    status?: string;
    requestStatus?: string;
    isBiddingApproved?: boolean;
    queueOrganizationUniqueId?: string;
  };
  driverRequests?: Array<{
    driverRequestId?: number;
    driverRequestUniqueId?: string;
    userUniqueId: string;
    journeyStatusId?: number | null;
    fullName?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    vehicleOfDriver?: unknown;
    driverProfilePhoto?: string | null;
  }>;
  [key: string]: unknown;
}

export const PAGE_SIZE = 10;

export function formatShortName(fullName: string): string {
  if (!fullName) return "Valued Shipper";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  return `${parts[0]} ${parts[1][0]}. ${parts[parts.length - 1]}`;
}

export function formatRoute(origin: string, destination: string): string {
  const orig =
    (origin || "")
      .split(",")[0]
      .trim()
      .replace(/(Airport|Dry Port.*|Industrial.*)/i, "")
      .trim() || "Terminal";
  const dest =
    (destination || "")
      .split(",")[0]
      .trim()
      .replace(/(Airport|Dry Port.*|Industrial.*)/i, "")
      .trim() || "Destination";
  if (orig.toLowerCase() === dest.toLowerCase()) return dest;
  return `${orig} → ${dest}`;
}

export function trimAddress(addr?: string, maxLen = 18): string {
  if (!addr) return "";
  const cleaned = addr.trim();
  const firstSegment = cleaned.split(",")[0].trim();
  const base = firstSegment || cleaned;
  if (base.length <= maxLen) return base;
  return base.slice(0, maxLen).trim() + "…";
}

export function formatTrimmedRoute(origin?: string, destination?: string): string {
  const orig = trimAddress(origin) || "Terminal";
  const dest = trimAddress(destination) || "Destination";
  if (orig.toLowerCase() === dest.toLowerCase()) return orig;
  return `${orig} → ${dest}`;
}

export interface ConnectedJourneyInfo {
  isConnected: boolean;
  statusId?: number;
  label: string;
  type: "completed" | "journey-started" | "in-transit" | "loaded" | "loading" | "accepted" | "none";
}

export function getConnectedJourneyStatus(order: OrderDisplayItem): ConnectedJourneyInfo {
  const sid = extractJourneyStatusId(order.journeyStatusId ?? order.journeyStatus);

  if (sid === 9 || sid === 14) {
    return { isConnected: true, statusId: sid, label: "Completed", type: "completed" };
  }
  if (sid === 8) {
    return { isConnected: true, statusId: 8, label: "Journey Started", type: "journey-started" };
  }
  if (sid === 7) {
    return { isConnected: true, statusId: 7, label: "Loaded", type: "loaded" };
  }
  if (sid === 6) {
    return { isConnected: true, statusId: 6, label: "Loading", type: "loading" };
  }
  if (sid === 5) {
    return { isConnected: true, statusId: 5, label: "Heading to Load", type: "loading" };
  }
  if (sid === 4) {
    return { isConnected: true, statusId: 4, label: "Accepted", type: "accepted" };
  }
  if (sid === 3) {
    return { isConnected: true, statusId: 3, label: "Driver Accepted", type: "accepted" };
  }

  if (order.status === "complete") {
    return {
      isConnected: true,
      statusId: 9,
      label: "Completed",
      type: "completed",
    };
  }

  const acceptedDriver = order.driverRequests?.find((d) => {
    const dsid = extractJourneyStatusId(d.journeyStatusId ?? d.journeyStatus ?? (d as any).status);
    return (typeof dsid === "number" && dsid >= 3 && dsid <= 9) || d.journeyStatus === "acceptedByShipper";
  });

  if (acceptedDriver) {
    const dsid = extractJourneyStatusId(acceptedDriver.journeyStatusId ?? acceptedDriver.journeyStatus ?? (acceptedDriver as any).status) ?? 4;
    if (dsid === 9 || dsid === 14) {
      return { isConnected: true, statusId: dsid, label: "Completed", type: "completed" };
    }
    if (dsid === 8) {
      return { isConnected: true, statusId: dsid, label: "Journey Started", type: "journey-started" };
    }
    if (dsid === 7) {
      return { isConnected: true, statusId: dsid, label: "Loaded", type: "loaded" };
    }
    if (dsid === 6) {
      return { isConnected: true, statusId: dsid, label: "Loading", type: "loading" };
    }
    if (dsid === 5) {
      return { isConnected: true, statusId: dsid, label: "Heading to Load", type: "loading" };
    }
    if (dsid === 4) {
      return { isConnected: true, statusId: dsid, label: "Accepted", type: "accepted" };
    }
    if (dsid === 3) {
      return { isConnected: true, statusId: dsid, label: "Driver Accepted", type: "accepted" };
    }
    return { isConnected: true, statusId: dsid, label: "Accepted", type: "accepted" };
  }

  return { isConnected: false, label: "", type: "none" };
}

export interface OrderBatchGroup {
  batchKey: string;
  batchId?: string | number | null;
  isMultiVehicle: boolean;
  totalVehicles: number;
  acceptedCount: number;
  completedCount: number;
  activeCount: number;
  waitingCount: number;
  statusStageLabel?: string;
  orders: OrderDisplayItem[];
  displayId: string;
  shipper: string;
  type: "Individual" | "Group";
  vehicleType: string;
  item: string;
  origin: string;
  destination: string;
  totalQuintal: number;
  totalCost: number;
  isBiddingApproved: boolean;
  statusSummary: ConnectedJourneyInfo;
}

export function groupOrdersByBatch(orders: OrderDisplayItem[]): OrderBatchGroup[] {
  const groups: OrderBatchGroup[] = [];
  const map = new Map<string, OrderDisplayItem[]>();
  const orderOfBatches: string[] = [];

  for (const order of orders) {
    const key =
      order.batchId != null && String(order.batchId).trim() !== ""
        ? `batch-${order.batchId}`
        : `order-${order.id}`;

    if (!map.has(key)) {
      map.set(key, []);
      orderOfBatches.push(key);
    }
    map.get(key)!.push(order);
  }

  for (const key of orderOfBatches) {
    const batchOrders = map.get(key)!;
    const first = batchOrders[0];
    const isMultiVehicle =
      batchOrders.length > 1 ||
      Boolean(first.batchId != null && String(first.batchId).trim() !== "" && (first.totalVehicles || 1) > 1);
    const batchId = first.batchId;

    const totalVehicles = batchOrders.length;
    const totalQuintal =
      batchOrders.length === (first.totalVehicles || batchOrders.length) && first.batchTotalQuintal != null
        ? first.batchTotalQuintal
        : batchOrders.reduce((sum, o) => sum + (o.quintal || 0), 0);
    const totalCost =
      batchOrders.length === (first.totalVehicles || batchOrders.length) && first.batchTotalCost != null
        ? first.batchTotalCost
        : batchOrders.reduce((sum, o) => sum + (o.cost || 0), 0);

    const completedOrders = batchOrders.filter(
      (o) => getConnectedJourneyStatus(o).type === "completed"
    );
    const completedCount = completedOrders.length;

    const activeOrders = batchOrders.filter(
      (o) =>
        getConnectedJourneyStatus(o).isConnected &&
        getConnectedJourneyStatus(o).type !== "completed"
    );
    const activeCount = activeOrders.length;

    const waitingOrders = batchOrders.filter(
      (o) => !getConnectedJourneyStatus(o).isConnected
    );
    const waitingCount = waitingOrders.length;
    const acceptedCount = activeCount + completedCount;

    const displayId =
      isMultiVehicle && batchId
        ? `#${batchId}`
        : first.displayId || `#${first.id}`;

    const allCompleted = totalVehicles > 0 && completedCount === totalVehicles;

    let statusSummary: ConnectedJourneyInfo;
    let statusStageLabel: string | undefined;

    if (allCompleted) {
      statusSummary = {
        isConnected: true,
        statusId: 9,
        label: "Completed",
        type: "completed",
      };
      statusStageLabel = "Completed";
    } else if (isMultiVehicle) {
      if (completedCount > 0 && activeCount > 0) {
        // Mixed in same view: group active orders by stage
        const stageMap = new Map<number, { label: string; count: number; type: string; statusId: number }>();

        for (const order of activeOrders) {
          const journey = getConnectedJourneyStatus(order);
          const sid = journey.statusId ?? 4;
          const label = journey.label || "Accepted";
          const type = journey.type || "accepted";

          if (!stageMap.has(sid)) {
            stageMap.set(sid, { label, count: 0, type, statusId: sid });
          }
          stageMap.get(sid)!.count++;
        }

        const sortedStages = Array.from(stageMap.values()).sort(
          (a, b) => b.statusId - a.statusId
        );
        const primaryStage = sortedStages[0];
        statusStageLabel = primaryStage.label;

        const parts = sortedStages.map((s) => `${s.count} ${s.label}`);
        if (waitingCount > 0) {
          parts.push(`${waitingCount} Waiting`);
        }

        statusSummary = {
          isConnected: true,
          statusId: primaryStage.statusId,
          label: parts.join(" · "),
          type: primaryStage.type,
        };
      } else if (completedCount > 0 && activeCount === 0) {
        // Completed only
        statusStageLabel = "Completed";
        statusSummary = {
          isConnected: true,
          statusId: 9,
          label: "Completed",
          type: "completed",
        };
      } else if (activeCount > 0) {
        // Active ongoing only: group active orders by journey stage
        const stageMap = new Map<number, { label: string; count: number; type: string; statusId: number }>();

        for (const order of activeOrders) {
          const journey = getConnectedJourneyStatus(order);
          const sid = journey.statusId ?? 4;
          const label = journey.label || "Accepted";
          const type = journey.type || "accepted";

          if (!stageMap.has(sid)) {
            stageMap.set(sid, { label, count: 0, type, statusId: sid });
          }
          stageMap.get(sid)!.count++;
        }

        const sortedStages = Array.from(stageMap.values()).sort(
          (a, b) => b.statusId - a.statusId
        );

        const primaryStage = sortedStages[0];
        statusStageLabel = primaryStage.label;

        let fullLabel = "";
        if (sortedStages.length === 1) {
          // All active trucks are at the exact same stage
          const single = sortedStages[0];
          if (waitingCount > 0) {
            fullLabel = `${single.count}/${totalVehicles} ${single.label} · ${waitingCount} Waiting`;
          } else {
            fullLabel = `${single.count} ${single.label}`;
          }
        } else {
          // Active trucks are at multiple stages! (e.g. 1 Heading to Load · 13 Accepted)
          const parts = sortedStages.map((s) => `${s.count} ${s.label}`);
          if (waitingCount > 0) {
            parts.push(`${waitingCount} Waiting`);
          }
          fullLabel = parts.join(" · ");
        }

        statusSummary = {
          isConnected: true,
          statusId: primaryStage.statusId,
          label: fullLabel,
          type: primaryStage.type,
        };
      } else {
        // All waiting, no driver accepted
        statusSummary = { isConnected: false, label: "", type: "none" };
      }
    } else {
      // Single-truck order
      const active = batchOrders.find((o) => getConnectedJourneyStatus(o).isConnected);
      if (active) {
        statusSummary = getConnectedJourneyStatus(active);
        statusStageLabel = statusSummary.label;
      } else {
        statusSummary = { isConnected: false, label: "", type: "none" };
      }
    }

    groups.push({
      batchKey: key,
      batchId,
      isMultiVehicle,
      totalVehicles,
      acceptedCount,
      completedCount,
      activeCount,
      waitingCount,
      statusStageLabel,
      orders: batchOrders,
      displayId,
      shipper: first.shipper,
      type: first.type,
      vehicleType: first.vehicleType,
      item: first.item,
      origin: first.origin,
      destination: first.destination,
      totalQuintal,
      totalCost,
      isBiddingApproved: batchOrders.some((o) => o.isBiddingApproved),
      statusSummary,
    });
  }

  return groups;
}


