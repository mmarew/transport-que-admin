import type { ShipperRequestDriverInfo } from "../queue/ShipperRequestsModal";
export type { ShipperRequestDriverInfo };

export interface OrderDisplayItem {
  id: string;
  shipper: string;
  type: "Individual" | "Group";
  vehicleType: string;
  vehicleTypeUniqueId?: string;
  item: string;
  origin: string;
  destination: string;
  quintal: number;
  cost: number;
  status: "ongoing" | "complete";
  phone?: string;
  createdAt?: string;
  isBiddingApproved?: boolean;
  driverRequests?: ShipperRequestDriverInfo[];
  queueOrganizationUniqueId?: string;
}

export type SortColumn =
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

