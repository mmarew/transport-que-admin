import type { OrderDisplayItem } from "../../../../components/orders/OrdersTypes";
import type { ExtraDriverContext } from "../driverDetailsMapper";

export interface ResolvedDriverIdentity {
  assignedDriverReq: any;
  rawDriverReq: any;
  acceptedBid: any;
  matchedQueueEntry: any;
  matchedDirectoryRow: any;
  resolvedDriverName: string | null;
  isDriverAssigned: boolean;
  driverName: string;
  driverInitials: string;
  driverPhone: string;
  driverId: string;
}

/**
 * Resolves driver identity, matching against bids, live queues, and directory rows.
 */
export function resolveDriverIdentity(
  order?: OrderDisplayItem | null,
  activeOrg?: any,
  bidsData?: any,
  extraContext?: ExtraDriverContext,
  queueEntry: any = {},
  rawItem: any = {},
  rawReq: any = {},
): ResolvedDriverIdentity {
  const candidateDrivers = Array.isArray(order?.driverRequests) ? order!.driverRequests : [];
  const assignedDriverReq =
    candidateDrivers.find(
      (d: any) =>
        d.journeyStatusId >= 3 ||
        d.bidStatus === "selected" ||
        d.bidStatus === "accepted" ||
        d.bidStatus === "accepted_by_shipper"
    ) || candidateDrivers[0];

  const rawDriverReq = (assignedDriverReq || {}) as any;

  // Check bids if any
  const bidList = Array.isArray(bidsData?.data) ? bidsData.data : Array.isArray(bidsData) ? bidsData : [];
  const acceptedBid = bidList.find(
    (b: any) =>
      b.bidStatus === "selected" ||
      b.bidStatus === "accepted" ||
      b.bidStatus === "accepted_by_shipper" ||
      b.journeyStatusId >= 4
  ) || bidList[0];

  // Match live queue entries from extraContext if provided
  let matchedQueueEntry: any = null;
  if (extraContext?.queueStatusData?.data?.queues) {
    const allQueueEntries = Object.values(extraContext.queueStatusData.data.queues).flat() as any[];
    const driverPhoneClean = (rawDriverReq.phoneNumber || order?.phone || "").replace(/[^0-9]/g, "");
    const driverUid = rawDriverReq.userUniqueId || rawDriverReq.driverUserUniqueId;
    const vehicleDriverUid = rawDriverReq.vehicleDriverUniqueId;
    const targetReqUid = order?.shipperRequestUniqueId;

    matchedQueueEntry = allQueueEntries.find((e: any) => {
      if (vehicleDriverUid && (e.vehicleDriverUniqueId === vehicleDriverUid || e.queue?.vehicleDriverUniqueId === vehicleDriverUid)) return true;
      if (driverUid && (e.driverUserUniqueId === driverUid || e.userUniqueId === driverUid)) return true;
      if (targetReqUid && e.shipperRequestUniqueId === targetReqUid) return true;
      if (order?.queueNumber && Number(e.queueNumber) === Number(order.queueNumber)) return true;
      if (driverPhoneClean && e.driverPhoneNumber) {
        const ePhoneClean = String(e.driverPhoneNumber).replace(/[^0-9]/g, "");
        if (ePhoneClean && (ePhoneClean.endsWith(driverPhoneClean.slice(-9)) || driverPhoneClean.endsWith(ePhoneClean.slice(-9)))) {
          return true;
        }
      }
      return false;
    });
  }

  // Match live directory row if provided
  let matchedDirectoryRow: any = null;
  if (extraContext?.directoryData) {
    const dirRows = Array.isArray(extraContext.directoryData?.data)
      ? extraContext.directoryData.data
      : Array.isArray(extraContext.directoryData)
      ? extraContext.directoryData
      : [];

    const driverPhoneClean = (rawDriverReq.phoneNumber || order?.phone || "").replace(/[^0-9]/g, "");
    const driverNameClean = (rawDriverReq.fullName || "").toLowerCase().trim();

    matchedDirectoryRow = dirRows.find((row: any) => {
      if (rawDriverReq.vehicleDriverUniqueId && row.vehicleDriverUniqueId === rawDriverReq.vehicleDriverUniqueId) return true;
      if (rawDriverReq.userUniqueId && row.driverUserUniqueId === rawDriverReq.userUniqueId) return true;
      if (driverPhoneClean && row.phoneNumber) {
        const rPhone = String(row.phoneNumber).replace(/[^0-9]/g, "");
        if (rPhone && (rPhone.endsWith(driverPhoneClean.slice(-9)) || driverPhoneClean.endsWith(rPhone.slice(-9)))) return true;
      }
      if (driverNameClean && row.fullName && row.fullName.toLowerCase().trim() === driverNameClean) return true;
      return false;
    }) || (dirRows.length === 1 ? dirRows[0] : null);
  }

  const resolvedDriverName =
    assignedDriverReq?.fullName ||
    queueEntry.fullName ||
    queueEntry.driverName ||
    matchedQueueEntry?.driverName ||
    matchedQueueEntry?.fullName ||
    matchedDirectoryRow?.fullName ||
    rawItem.driverName ||
    rawReq.driverName ||
    acceptedBid?.companyName ||
    acceptedBid?.driverName ||
    acceptedBid?.fullName ||
    null;

  const isDriverAssigned = Boolean(resolvedDriverName);
  const driverName = resolvedDriverName || "Awaiting Driver Assignment";

  const nameParts = driverName.trim().split(/\s+/);
  const driverInitials =
    nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : driverName.slice(0, 2).toUpperCase() || "AD";

  const driverPhone =
    assignedDriverReq?.phoneNumber ||
    queueEntry.phoneNumber ||
    queueEntry.driverPhoneNumber ||
    matchedQueueEntry?.driverPhoneNumber ||
    matchedDirectoryRow?.phoneNumber ||
    rawItem.driverPhoneNumber ||
    rawReq.driverPhoneNumber ||
    acceptedBid?.companyPhone ||
    acceptedBid?.phoneNumber ||
    order?.phone ||
    activeOrg?.queueOrganizationPhone ||
    "—";

  // Real Driver ID (never fabricate synthetic "DR-####" from request row IDs or UUID suffixes)
  let driverId = "";
  const rawExplicitDriverId =
    (assignedDriverReq as any)?.driverId ??
    (rawItem as any)?.driverId ??
    null;

  if (typeof rawExplicitDriverId === "number" && !isNaN(rawExplicitDriverId) && rawExplicitDriverId > 0) {
    driverId = `DR-${String(rawExplicitDriverId).padStart(3, "0")}`;
  } else if (typeof rawExplicitDriverId === "string" && rawExplicitDriverId.trim().length > 0) {
    const trimmed = rawExplicitDriverId.trim();
    if (/^\d+$/.test(trimmed)) {
      driverId = `DR-${trimmed.padStart(3, "0")}`;
    } else if (trimmed.startsWith("DR-")) {
      driverId = trimmed;
    }
  }

  return {
    assignedDriverReq,
    rawDriverReq,
    acceptedBid,
    matchedQueueEntry,
    matchedDirectoryRow,
    resolvedDriverName,
    isDriverAssigned,
    driverName,
    driverInitials,
    driverPhone,
    driverId,
  };
}
