import type { OrderDisplayItem } from "../../../../components/orders/OrdersTypes";
import type { DriverDetailsModel, ExtraDriverContext } from "../driverDetailsMapper";
import { extractDriverAttachedDocuments } from "./documentExtractor";

/**
 * Validates fleet vehicle IDs, ensuring no internal DB UUIDs or raw hashes are surfaced.
 */
export function isValidFleetId(val: unknown): val is string {
  if (!val || typeof val !== "string") return false;
  const s = val.trim();
  if (s.length < 2 || s.length > 20) return false;
  const lower = s.toLowerCase();
  if (
    lower.startsWith("uuid-") ||
    lower.startsWith("veh-") ||
    lower.startsWith("vd-") ||
    lower.startsWith("user-") ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ||
    /^[0-9a-f]{16,36}$/i.test(s) ||
    /^[0-9a-f]{4,8}$/i.test(s)
  ) {
    return false;
  }
  return true;
}

/**
 * Pools candidate vehicle objects from across all known backend payload structures.
 */
export function poolCandidateVehicles(
  order: OrderDisplayItem | null | undefined,
  rawDriverReq: any,
  rawItem: any,
  rawReq: any,
  matchedQueueEntry: any,
  queueEntry: any,
  acceptedBid: any,
  extraContext?: ExtraDriverContext,
): Array<Record<string, any>> {
  return [
    order?.plateNumber ? { licensePlate: order.plateNumber } : null,
    extraContext?.accountStatusData?.vehicle,
    extraContext?.driverAccountStatus?.vehicle,
    (extraContext?.accountStatusData as any)?.data?.vehicle,
    rawDriverReq?.accountStatus?.vehicle,
    rawDriverReq?.vehicleOfDriver,
    rawDriverReq?.vehicle_of_driver,
    rawDriverReq?.vehicle,
    rawDriverReq?.rawDriver?.vehicleOfDriver,
    rawDriverReq?.rawDriver?.vehicle_of_driver,
    rawDriverReq?.rawDriver?.vehicle,
    rawDriverReq?.journey?.vehicleOfDriver,
    rawDriverReq?.journey?.vehicle,
    rawDriverReq?.journey,
    rawItem?.journey?.vehicleOfDriver,
    rawItem?.journey?.vehicle,
    rawItem?.journey,
    rawReq?.journey?.vehicleOfDriver,
    rawReq?.journey?.vehicle,
    rawReq?.journey,
    rawItem?.decisions?.[0]?.vehicleOfDriver,
    rawItem?.decisions?.[0]?.vehicle,
    rawItem?.decisions?.[0],
    rawReq?.decisions?.[0]?.vehicleOfDriver,
    rawReq?.decisions?.[0]?.vehicle,
    matchedQueueEntry?.vehicleOfDriver,
    matchedQueueEntry?.vehicle_of_driver,
    matchedQueueEntry?.vehicle,
    queueEntry?.vehicleOfDriver,
    queueEntry?.vehicle_of_driver,
    queueEntry?.vehicle,
    rawItem?.vehicleOfDriver,
    rawItem?.vehicle_of_driver,
    rawItem?.vehicle,
    rawItem?.vehicleDriver,
    rawItem?.vehicle_driver,
    acceptedBid?.vehicleOfDriver,
    acceptedBid?.vehicle_of_driver,
    acceptedBid?.vehicle,
    rawReq?.vehicleOfDriver,
    rawReq?.vehicle_of_driver,
    rawReq?.vehicle,
    (rawDriverReq as any)?.vehicleDriver,
  ].filter((v): v is Record<string, any> => Boolean(v && typeof v === "object"));
}

/**
 * Pools candidate driver objects from across all known backend payload structures.
 */
export function poolCandidateDriverObjs(
  rawDriverReq: any,
  matchedQueueEntry: any,
  queueEntry: any,
  rawItem: any,
  rawReq: any,
  acceptedBid: any,
  extraContext?: ExtraDriverContext,
): Array<Record<string, any>> {
  return [
    extraContext?.accountStatusData?.userData,
    extraContext?.accountStatusData?.vehicle,
    extraContext?.accountStatusData,
    extraContext?.driverAccountStatus?.userData,
    extraContext?.driverAccountStatus,
    rawDriverReq?.userData,
    rawDriverReq?.accountStatus?.userData,
    rawDriverReq?.accountStatus,
    rawDriverReq?.rawDriver,
    rawDriverReq?.driver,
    rawDriverReq?.driverUser,
    rawDriverReq,
    matchedQueueEntry?.driver,
    matchedQueueEntry?.driverUser,
    matchedQueueEntry,
    queueEntry?.driver,
    queueEntry?.driverUser,
    queueEntry,
    rawItem?.driver,
    rawItem?.driverUser,
    rawItem?.vehicleDriver?.driver,
    rawItem?.vehicleDriver,
    rawItem?.journey?.driver,
    rawItem?.journey,
    rawReq?.journey?.driver,
    rawReq?.journey,
    rawItem,
    acceptedBid?.rawDriver,
    acceptedBid?.driver,
    acceptedBid,
  ].filter((d): d is Record<string, any> => Boolean(d && typeof d === "object"));
}

/**
 * Resolves vehicle specifications and status.
 */
export function resolveVehicleSpecs(
  order: OrderDisplayItem | null | undefined,
  rawDriverReq: any,
  rawItem: any,
  rawReq: any,
  queueEntry: any,
  matchedQueueEntry: any,
  matchedDirectoryRow: any,
  isDriverAssigned: boolean,
  candidateVehicles: Array<Record<string, any>>,
  candidateDriverObjs: Array<Record<string, any>>,
  extraContext?: ExtraDriverContext,
): DriverDetailsModel["vehicle"] {
  // Extract attached documents from account status, driver requests, etc.
  const allDocSources = [
    extraContext?.accountStatusData,
    extraContext?.driverAccountStatus,
    (extraContext?.accountStatusData as any)?.data,
    rawDriverReq,
    rawDriverReq?.rawDriver,
    rawDriverReq?.accountStatus,
    rawItem,
    rawItem?.accountStatus,
    matchedQueueEntry,
    queueEntry,
  ];
  const attachedDocs = extractDriverAttachedDocuments(allDocSources);

  const vehicleTypeName =
    order?.vehicleType ||
    rawDriverReq?.vehicleTypeName ||
    rawDriverReq?.vehicleType ||
    candidateVehicles.find((v) => v.vehicleTypeName || v.vehicleType)?.vehicleTypeName ||
    candidateVehicles.find((v) => v.vehicleTypeName || v.vehicleType)?.vehicleType ||
    rawReq?.vehicleTypeName ||
    queueEntry?.vehicleTypeName ||
    matchedQueueEntry?.vehicleTypeName ||
    rawItem?.vehicleTypeName ||
    (isDriverAssigned ? "Not recorded" : "Not specified");

  // Make / Model
  let rawModel: string | null = null;
  for (const v of candidateVehicles) {
    const val = v.makeModel || v.vehicleModel || v.model || v.make || v.brand || v.manufacturer;
    if (val && typeof val === "string" && val.trim()) {
      const yr = v.year || v.modelYear || v.manufacturingYear;
      rawModel = yr ? `${val.trim()} · ${yr}` : val.trim();
      break;
    }
  }
  if (!rawModel) {
    const directModel =
      rawDriverReq?.vehicleModel ||
      rawDriverReq?.makeModel ||
      rawItem?.vehicleModel ||
      rawItem?.makeModel ||
      queueEntry?.vehicleModel;
    if (directModel && typeof directModel === "string" && directModel.trim()) {
      rawModel = directModel.trim();
    }
  }
  if (!rawModel) {
    const vColor = candidateVehicles.find((v) => v.color && typeof v.color === "string" && v.color.trim())?.color;
    if (vColor) {
      rawModel = `${vColor.trim()} Commercial Vehicle`;
    }
  }
  if (!rawModel && matchedDirectoryRow?.color) {
    rawModel = `${matchedDirectoryRow.color} Commercial Vehicle`;
  }
  const makeModel = rawModel || (isDriverAssigned ? "Not recorded" : "Not specified");

  // Plate Number
  let resolvedPlate: string | null = null;
  if (order?.plateNumber) {
    resolvedPlate = order.plateNumber;
  }
  if (!resolvedPlate) {
    const p =
      rawDriverReq?.plateNumber ||
      rawDriverReq?.licensePlate ||
      rawDriverReq?.license_plate ||
      rawDriverReq?.plate_number ||
      rawDriverReq?.vehiclePlateNumber ||
      rawDriverReq?.vehicle_plate_number ||
      rawDriverReq?.vehiclePlate ||
      rawDriverReq?.vehicle_plate ||
      rawDriverReq?.plate ||
      rawDriverReq?.plate_no;
    if (p && typeof p === "string" && p.trim()) {
      resolvedPlate = p.trim();
    }
  }
  if (!resolvedPlate) {
    for (const v of candidateVehicles) {
      const p =
        v.licensePlate ||
        v.license_plate ||
        v.plateNumber ||
        v.plate_number ||
        v.vehiclePlateNumber ||
        v.vehicle_plate_number ||
        v.vehiclePlate ||
        v.vehicle_plate ||
        v.plate ||
        v.plate_no;
      if (p && typeof p === "string" && p.trim()) {
        resolvedPlate = p.trim();
        break;
      }
    }
  }
  if (!resolvedPlate && matchedDirectoryRow) {
    const p =
      matchedDirectoryRow.licensePlate ||
      matchedDirectoryRow.license_plate ||
      matchedDirectoryRow.plateNumber ||
      matchedDirectoryRow.plate_number;
    if (p && typeof p === "string" && p.trim()) {
      resolvedPlate = p.trim();
    }
  }
  if (!resolvedPlate && matchedQueueEntry) {
    const p =
      matchedQueueEntry.licensePlate ||
      matchedQueueEntry.license_plate ||
      matchedQueueEntry.plateNumber ||
      matchedQueueEntry.plate_number;
    if (p && typeof p === "string" && p.trim()) {
      resolvedPlate = p.trim();
    }
  }
  if (!resolvedPlate) {
    const p =
      queueEntry?.licensePlate ||
      queueEntry?.license_plate ||
      queueEntry?.plateNumber ||
      queueEntry?.plate_number ||
      rawItem?.journey?.licensePlate ||
      rawItem?.journey?.license_plate ||
      rawItem?.journey?.plateNumber ||
      rawItem?.journey?.plate_number ||
      rawItem?.journey?.vehicle?.licensePlate ||
      rawItem?.journey?.vehicle?.license_plate ||
      rawItem?.journey?.vehicle?.plateNumber ||
      rawItem?.journey?.vehicleOfDriver?.licensePlate ||
      rawItem?.journey?.vehicleOfDriver?.license_plate ||
      rawItem?.plateNumber ||
      rawItem?.plate_number ||
      rawItem?.licensePlate ||
      rawItem?.license_plate ||
      rawItem?.vehiclePlateNumber ||
      rawItem?.vehicle_plate_number ||
      rawItem?.vehiclePlate ||
      rawItem?.vehicle_plate ||
      rawReq?.journey?.licensePlate ||
      rawReq?.journey?.license_plate ||
      rawReq?.journey?.plateNumber ||
      rawReq?.journey?.plate_number ||
      rawReq?.plateNumber ||
      rawReq?.plate_number ||
      rawReq?.licensePlate ||
      rawReq?.license_plate ||
      null;
    if (p && typeof p === "string" && p.trim()) {
      resolvedPlate = p.trim();
    }
  }
  if (!resolvedPlate) {
    for (const d of candidateDriverObjs) {
      const p =
        d.licensePlate ||
        d.license_plate ||
        d.plateNumber ||
        d.plate_number ||
        d.vehiclePlateNumber ||
        d.vehicle_plate_number ||
        d.vehiclePlate ||
        d.vehicle_plate ||
        d.vehicleOfDriver?.licensePlate ||
        d.vehicleOfDriver?.license_plate ||
        d.vehicle?.licensePlate ||
        d.vehicle?.license_plate;
      if (p && typeof p === "string" && p.trim()) {
        resolvedPlate = p.trim();
        break;
      }
    }
  }
  // Check registration / librea document for plate number
  if (!resolvedPlate) {
    const regDoc = attachedDocs.find((d: any) => {
      const name = String(d.documentTypeName || d.uploadedDocumentName || d.documentTypeDescription || "").toLowerCase();
      return name.includes("registration") || name.includes("librea");
    });
    if (regDoc && regDoc.attachedDocumentFileNumber && typeof regDoc.attachedDocumentFileNumber === "string" && regDoc.attachedDocumentFileNumber.trim()) {
      resolvedPlate = regDoc.attachedDocumentFileNumber.trim();
    }
  }

  const plateNumber = resolvedPlate
    ? String(resolvedPlate).trim()
    : isDriverAssigned
    ? "Not recorded"
    : "Pending assignment";

  // Fleet ID
  let resolvedFleetId: string | null = null;
  for (const v of candidateVehicles) {
    const f = v.fleetVehicleId || v.fleetId;
    if (isValidFleetId(f)) {
      resolvedFleetId = f.trim();
      break;
    }
  }
  if (!resolvedFleetId) {
    const f = rawDriverReq?.fleetVehicleId || rawDriverReq?.fleetId || queueEntry?.fleetVehicleId || rawItem?.fleetVehicleId;
    if (isValidFleetId(f)) {
      resolvedFleetId = f.trim();
    }
  }
  const fleetId = resolvedFleetId || (isDriverAssigned ? "Not recorded" : "—");

  // Insurance Expiry: check attached documents first (e.g. Insurance Document with documentExpirationDate)
  let resolvedInsurance: string | null = null;
  const insuranceDoc = attachedDocs.find((d: any) => {
    const name = String(d.documentTypeName || d.uploadedDocumentName || d.documentTypeDescription || "").toLowerCase();
    return name.includes("insurance");
  });
  if (insuranceDoc) {
    const insExp = insuranceDoc.documentExpirationDate || insuranceDoc.uploadedDocumentExpirationDate || insuranceDoc.expirationDate;
    if (insExp && typeof insExp === "string" && insExp.trim()) {
      resolvedInsurance = insExp.trim();
    }
  }

  if (!resolvedInsurance) {
    for (const v of candidateVehicles) {
      const ins = v.insuranceValidUntil || v.insuranceExpiryDate || v.insuranceExpiry || v.insuranceDate;
      if (ins && typeof ins === "string" && ins.trim()) {
        resolvedInsurance = ins.trim();
        break;
      }
    }
  }
  if (!resolvedInsurance) {
    resolvedInsurance =
      rawDriverReq?.insuranceValidUntil ||
      rawDriverReq?.insuranceExpiryDate ||
      rawItem?.insuranceValidUntil ||
      rawItem?.insuranceExpiryDate ||
      null;
  }

  let insuranceExpiry = isDriverAssigned ? "Not recorded" : "—";
  if (resolvedInsurance) {
    try {
      const d = new Date(resolvedInsurance);
      if (!isNaN(d.getTime())) {
        insuranceExpiry = d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Africa/Addis_Ababa",
        });
      } else {
        insuranceExpiry = resolvedInsurance;
      }
    } catch {
      insuranceExpiry = resolvedInsurance;
    }
  }

  // Last Inspection
  let resolvedInspection: string | null = null;
  for (const v of candidateVehicles) {
    const insp = v.lastInspection || v.lastInspectionDate || v.inspectionDate || v.inspectionStatus;
    if (insp && typeof insp === "string" && insp.trim()) {
      resolvedInspection = insp.trim();
      break;
    }
  }
  if (!resolvedInspection) {
    resolvedInspection =
      rawDriverReq?.lastInspection ||
      rawDriverReq?.lastInspectionDate ||
      rawItem?.lastInspection ||
      rawItem?.lastInspectionDate ||
      rawItem?.inspectionStatus ||
      null;
  }

  let lastInspection = isDriverAssigned ? "Not recorded" : "—";
  if (resolvedInspection) {
    try {
      const d = new Date(resolvedInspection);
      if (!isNaN(d.getTime())) {
        lastInspection = `${d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })} · Passed`;
      } else {
        lastInspection = resolvedInspection;
      }
    } catch {
      lastInspection = resolvedInspection;
    }
  }

  // Vehicle Status
  let vehicleStatus: "Active" | "Maintenance" | "Inactive" | "Pending" = "Active";
  const rawVStatus = candidateVehicles[0]?.status || candidateVehicles[0]?.vehicleStatus || candidateVehicles[0]?.assignmentStatus;
  if (rawVStatus) {
    const s = String(rawVStatus).toLowerCase();
    if (s.includes("maint")) vehicleStatus = "Maintenance";
    else if (s.includes("inact") || s.includes("suspend")) vehicleStatus = "Inactive";
    else vehicleStatus = "Active";
  } else if (!isDriverAssigned) {
    vehicleStatus = "Pending";
  } else if (plateNumber === "Not recorded") {
    vehicleStatus = "Active";
  }

  return {
    type: vehicleTypeName,
    makeModel,
    plateNumber,
    fleetId,
    insuranceExpiry,
    lastInspection,
    status: vehicleStatus,
  };
}
