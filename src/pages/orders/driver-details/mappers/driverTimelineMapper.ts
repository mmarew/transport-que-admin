import type { OrderDisplayItem } from "../../../../components/orders/OrdersTypes";
import { extractJourneyStatusId, JOURNEY_STATUS_LABELS } from "../../../../utils/journeyStatus";
import type { DriverDetailsModel } from "../driverDetailsMapper";

export interface ResolvedJourneyStatus {
  statusId: number;
  statusLabel: string;
  statusType: DriverDetailsModel["driverStatus"]["type"];
  dotColor: string;
}

export interface ResolvedTimestamps {
  departedTime: string;
  estimatedArrival: string;
  currentTimeString: string;
  assignedTime: string;
  pickupTime: string;
  loadingTime: string;
  isTripComplete: boolean;
}

/**
 * Resolves journey status ID, label, badge type, and indicator dot color.
 */
export function resolveJourneyStatus(
  order: OrderDisplayItem | null | undefined,
  assignedDriverReq: any,
  queueEntry: any,
  matchedQueueEntry: any,
  acceptedBid: any,
  isDriverAssigned: boolean,
): ResolvedJourneyStatus {
  const statusId =
    extractJourneyStatusId(order?.journeyStatusId) ??
    extractJourneyStatusId(assignedDriverReq?.journeyStatusId) ??
    extractJourneyStatusId(queueEntry.status) ??
    extractJourneyStatusId(matchedQueueEntry?.status) ??
    extractJourneyStatusId(acceptedBid?.journeyStatusId) ??
    (isDriverAssigned ? 8 : 1);

  let statusLabel = JOURNEY_STATUS_LABELS[statusId] || "In transit";
  let statusType: DriverDetailsModel["driverStatus"]["type"] = "in-transit";
  let dotColor = "#2563eb";

  switch (statusId) {
    case 1:
    case 2:
      statusLabel = isDriverAssigned ? "Requested" : "Awaiting Driver";
      statusType = "waiting";
      dotColor = "#f59e0b";
      break;
    case 3:
      statusLabel = "Accepted by driver";
      statusType = "accepted";
      dotColor = "#0284c7";
      break;
    case 4:
      statusLabel = "Assigned";
      statusType = "accepted";
      dotColor = "#0B4D6D";
      break;
    case 5:
      statusLabel = "Heading to load";
      statusType = "heading-to-load";
      dotColor = "#f59e0b";
      break;
    case 6:
      statusLabel = "Loading";
      statusType = "loading";
      dotColor = "#f59e0b";
      break;
    case 7:
      statusLabel = "Loaded";
      statusType = "loaded";
      dotColor = "#16a34a";
      break;
    case 8:
      statusLabel = "In transit";
      statusType = "in-transit";
      dotColor = "#2563eb";
      break;
    case 9:
    case 14:
      statusLabel = "Completed";
      statusType = "completed";
      dotColor = "#16a34a";
      break;
    default:
      if (statusId > 8) {
        statusLabel = "Completed";
        statusType = "completed";
        dotColor = "#16a34a";
      } else {
        statusLabel = "In transit";
        statusType = "in-transit";
        dotColor = "#2563eb";
      }
      break;
  }

  return { statusId, statusLabel, statusType, dotColor };
}

/**
 * Resolves dispatch payment status.
 */
export function resolvePaymentStatus(
  rawReq: any,
  rawItem: any,
  order: OrderDisplayItem | null | undefined,
  statusId: number,
  rawCompletedAt: string | null | undefined,
): DriverDetailsModel["dispatch"]["paymentStatus"] {
  const rawPaymentStatus =
    rawReq.paymentStatus ||
    rawReq.payment_status ||
    rawItem.paymentStatus ||
    rawItem.payment_status ||
    rawItem.payment ||
    null;

  if (rawPaymentStatus && typeof rawPaymentStatus === "string") {
    const pLow = rawPaymentStatus.toLowerCase();
    if (pLow.includes("paid") || pLow.includes("settled") || pLow.includes("complete")) {
      return "Paid";
    } else if (pLow.includes("process") || pLow.includes("transit") || pLow.includes("escrow")) {
      return "Processing";
    } else {
      return "Payment pending";
    }
  } else if (rawReq.isPaid === true || rawItem.isPaid === true) {
    return "Paid";
  } else if (
    statusId >= 9 ||
    order?.status === "complete" ||
    rawItem.assignmentStatus === "completed" ||
    Boolean(rawCompletedAt)
  ) {
    return "Paid";
  } else if (statusId >= 5) {
    return "Processing";
  } else {
    return "Payment pending";
  }
}

/**
 * Resolves dispatch journey timestamps and formatted time strings.
 */
export function resolveTimestamps(
  rawItem: any,
  rawReq: any,
  order: OrderDisplayItem | null | undefined,
  queueEntry: any,
  rawStartedAt: string | null | undefined,
  rawCompletedAt: string | null | undefined,
  statusId: number,
  totalMinutes: number,
): ResolvedTimestamps {
  let departedTime = "—";
  let estimatedArrival = "—";
  let currentTimeString = "—";

  const rawDecisionTime = rawItem.decisions?.[0]?.decisionTime || rawReq.decisions?.[0]?.decisionTime;
  const rawDateStr = rawStartedAt || rawDecisionTime || order?.createdAt || rawReq.createdAt || rawReq.shipperRequestCreatedAt;

  if (rawDateStr) {
    try {
      const d = new Date(rawDateStr);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        departedTime = `${hh}:${mm} EAT`;

        if (statusId >= 9 && rawCompletedAt) {
          const compD = new Date(rawCompletedAt);
          if (!isNaN(compD.getTime())) {
            const cHh = String(compD.getHours()).padStart(2, "0");
            const cMm = String(compD.getMinutes()).padStart(2, "0");
            estimatedArrival = `${cHh}:${cMm} EAT`;
          } else {
            estimatedArrival = `${hh}:${mm} EAT`;
          }
        } else if (totalMinutes > 0) {
          const etaDate = new Date(d.getTime() + totalMinutes * 60000);
          const etaHh = String(etaDate.getHours()).padStart(2, "0");
          const etaMm = String(etaDate.getMinutes()).padStart(2, "0");
          estimatedArrival = `${etaHh}:${etaMm} EAT`;
        }

        currentTimeString = `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, ${hh}:${mm} EAT`;
      }
    } catch {
      // safe fallback
    }
  }

  const formatQueueTime = (rawDate?: string | null) => {
    if (!rawDate) return "—";
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
    } catch {
      // safe fallback
    }
    return "—";
  };

  const assignedTime = formatQueueTime(queueEntry.joinedAt || rawDecisionTime || rawDateStr);
  const pickupTime = formatQueueTime(queueEntry.offeredAt || queueEntry.joinedAt || rawStartedAt || rawDateStr);
  const loadingTime = formatQueueTime(queueEntry.loadedAt || rawStartedAt || rawDateStr);
  const isTripComplete = statusId >= 9;

  return {
    departedTime,
    estimatedArrival,
    currentTimeString,
    assignedTime,
    pickupTime,
    loadingTime,
    isTripComplete,
  };
}

/**
 * Builds dynamic 5-step trip timeline based on order data, route, and journey status.
 */
export function buildTripTimeline(
  orderNumber: string,
  originClean: string,
  destinationClean: string,
  originYard: string,
  destinationDepot: string,
  corridor: string,
  commodity: string,
  statusId: number,
  timestamps: ResolvedTimestamps,
  completedDistanceKm: number,
  remainingDistanceKm: number,
): DriverDetailsModel["timeline"] {
  const { assignedTime, pickupTime, loadingTime, departedTime, estimatedArrival, isTripComplete } = timestamps;

  return [
    {
      time: assignedTime,
      title: `Assigned to order #${orderNumber}`,
      description: `Dispatched on route ${originClean} → ${destinationClean}`,
      status: statusId >= 4 ? "completed" : "current",
    },
    {
      time: pickupTime,
      title: "Checked in at pickup",
      description: `Driver and vehicle verified at ${originYard}`,
      status: statusId >= 6 ? "completed" : statusId === 5 ? "current" : "upcoming",
    },
    {
      time: loadingTime,
      title: "Loading complete · Departed",
      description: `${commodity} shipment released for delivery`,
      status: statusId >= 7 ? "completed" : statusId === 6 ? "current" : "upcoming",
    },
    {
      time: departedTime !== "—" ? departedTime.replace(" EAT", "") : "—",
      title: `In transit on ${corridor}`,
      description: isTripComplete
        ? `Delivery completed to ${destinationClean}`
        : `${completedDistanceKm} km travelled · ${remainingDistanceKm} km remaining to ${destinationClean}`,
      status: isTripComplete ? "completed" : statusId === 8 ? "current" : "upcoming",
    },
    {
      time: estimatedArrival !== "—" ? estimatedArrival.replace(" EAT", "") : "—",
      title: isTripComplete ? "Delivery confirmed" : "Expected delivery",
      description: isTripComplete
        ? `Cargo delivered successfully at ${destinationDepot}`
        : "Arrival and proof of delivery pending",
      status: isTripComplete ? "completed" : "upcoming",
    },
  ];
}
