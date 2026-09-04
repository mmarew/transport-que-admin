// ── Shared types & helpers for the Orders feature ────────────────────────────

export interface OrderDisplayItem {
  id: string;
  shipper: string;
  type: "Individual" | "Group";
  vehicleType: string;
  item: string;
  origin: string;
  destination: string;
  quintal: number;
  cost: number;
  status: "ongoing" | "complete";
  phone?: string;
  createdAt?: string;
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
  };
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
