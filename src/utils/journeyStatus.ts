/**
 * Journey Status Definitions
 * Maps journeyStatusId directly to its canonical status name and human-readable label.
 */

export type NormalizedQueueStatus = "waiting" | "offered" | "loaded" | "removed" | "completed";

export interface JourneyStatusDef {
  journeyStatusId: number;
  journeyStatusName: string;
}

export const JOURNEY_STATUS_NAMES: Record<number, string> = {
  1: "waiting",
  2: "requested",
  3: "acceptedByDriver",
  4: "acceptedByShipper",
  5: "goToLoadingPlace",
  6: "loading",
  7: "loaded",
  8: "journeyStarted",
  9: "journeyCompleted",
  10: "cancelledByShipper",
  11: "rejectedByShipper",
  12: "cancelledByDriver",
  13: "cancelledByAdmin",
  14: "completedByAdmin",
  15: "cancelledBySystem",
  16: "noAnswerFromDriver",
  17: "notSelectedInBid",
  18: "rejectedByDriver",
  19: "replacedByCompanyAssignment",
  20: "partiallyCancelled",
};

export const JOURNEY_STATUS_LABELS: Record<number, string> = {
  1: "Waiting",
  2: "Requested",
  3: "Accepted by Driver",
  4: "Accepted by Shipper",
  5: "Heading to Loading",
  6: "Loading",
  7: "Loaded",
  8: "Journey Started",
  9: "Journey Completed",
  10: "Cancelled by Shipper",
  11: "Rejected by Shipper",
  12: "Cancelled by Driver",
  13: "Cancelled by Admin",
  14: "Completed by Admin",
  15: "Cancelled by System",
  16: "No Answer from Driver",
  17: "Not Selected in Bid",
  18: "Rejected by Driver",
  19: "Replaced by Company",
  20: "Partially Cancelled",
};

// Normalized name to ID lookup
const NAME_TO_ID: Record<string, number> = Object.entries(JOURNEY_STATUS_NAMES).reduce(
  (acc, [id, name]) => {
    acc[name.toLowerCase().replace(/[^a-z0-9]/g, "")] = Number(id);
    return acc;
  },
  {} as Record<string, number>
);

export const JOURNEY_STATUSES: JourneyStatusDef[] = Object.entries(JOURNEY_STATUS_NAMES).map(
  ([id, name]) => ({
    journeyStatusId: Number(id),
    journeyStatusName: name,
  })
);

export const JOURNEY_STATUS_BY_ID: Record<number, JourneyStatusDef> = JOURNEY_STATUSES.reduce(
  (acc, item) => {
    acc[item.journeyStatusId] = item;
    return acc;
  },
  {} as Record<number, JourneyStatusDef>
);

/**
 * Safely extracts a numeric journeyStatusId from any value:
 * number, string ID ("1"), status name ("waiting"), or object ({ journeyStatusId: 1 }).
 * Never crashes and never returns NaN or an object.
 */
export function extractJourneyStatusId(val: unknown): number | undefined {
  if (val === undefined || val === null || val === "") return undefined;

  if (typeof val === "number" && !isNaN(val)) {
    return val;
  }

  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const directId =
      obj.journeyStatusId ??
      obj.statusId ??
      obj.id ??
      obj.journey_status_id ??
      obj.journeyStatus;
    if (directId !== undefined && directId !== null) {
      const num = Number(directId);
      if (!isNaN(num)) return num;
    }
    const name = obj.journeyStatusName ?? obj.statusName ?? obj.name ?? obj.status;
    if (typeof name === "string") {
      const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (NAME_TO_ID[normalized]) return NAME_TO_ID[normalized];
    }
    return undefined;
  }

  const str = String(val).trim();
  if (!str || str === "[object Object]") return undefined;

  const num = parseInt(str, 10);
  if (!isNaN(num) && String(num) === str && JOURNEY_STATUS_NAMES[num]) {
    return num;
  }

  const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return NAME_TO_ID[normalized];
}

/**
 * Converts journeyStatusId or any status value to its name string.
 * Example: 3 -> "acceptedByDriver", 1 -> "waiting"
 */
export function getJourneyStatusName(val: unknown): string {
  const id = extractJourneyStatusId(val);
  if (id !== undefined && JOURNEY_STATUS_NAMES[id]) {
    return JOURNEY_STATUS_NAMES[id];
  }
  if (typeof val === "string" && val && val !== "[object Object]") {
    return val;
  }
  return "waiting";
}

/**
 * Resolves any status value to a simple { journeyStatusId, journeyStatusName } pair.
 */
export function resolveJourneyStatus(val: unknown): JourneyStatusDef | undefined {
  const id = extractJourneyStatusId(val);
  if (id !== undefined && JOURNEY_STATUS_NAMES[id]) {
    return {
      journeyStatusId: id,
      journeyStatusName: JOURNEY_STATUS_NAMES[id],
    };
  }
  return undefined;
}

/**
 * Maps any journey status representation to the simplified queue operational status:
 * waiting | offered | loaded | removed | completed
 */
export function mapJourneyStatusToQueueStatus(val: unknown): NormalizedQueueStatus {
  const id = extractJourneyStatusId(val);

  if (id !== undefined) {
    if (id === 1 || id === 11 || id === 16 || id === 17 || id === 18) {
      return "waiting";
    }
    if (id === 2 || id === 3) {
      return "offered";
    }
    if (id === 4 || id === 5 || id === 6 || id === 7 || id === 8) {
      return "loaded";
    }
    if (id === 9 || id === 14) {
      return "completed";
    }
    if (id === 10 || id === 12 || id === 13 || id === 15 || id === 19 || id === 20) {
      return "removed";
    }
  }

  if (typeof val === "string") {
    const s = val.toLowerCase().trim();
    if (!s || s === "waiting") return "waiting";
    if (s === "offered" || s === "requested") return "offered";
    if (s === "loaded" || s === "assigned" || s === "loading" || s === "in-transit") return "loaded";
    if (s === "completed" || s === "delivered") return "completed";
    if (s === "removed" || s === "cancelled") return "removed";
  }

  return "waiting";
}

/**
 * Returns a human-friendly display label for any status value.
 * Guaranteed to never return "[object Object]".
 */
export function formatJourneyStatusLabel(val: unknown): string {
  const id = extractJourneyStatusId(val);
  if (id !== undefined && JOURNEY_STATUS_LABELS[id]) {
    return JOURNEY_STATUS_LABELS[id];
  }

  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const str = obj.journeyStatusName ?? obj.statusName ?? obj.name ?? obj.status ?? obj.statusLabel;
    if (typeof str === "string" && str && str !== "[object Object]") {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
    return "Waiting";
  }

  const s = String(val || "").trim();
  if (!s || s === "[object Object]") return "Waiting";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Determines whether a queue entry should be considered as actively waiting or offered (available for dispatch)
 */
export function isDriverWaiting(status: unknown, journeyStatusId?: unknown): boolean {
  const id = extractJourneyStatusId(journeyStatusId) ?? extractJourneyStatusId(status);
  if (id !== undefined) {
    return id === 1 || id === 2 || id === 11 || id === 16 || id === 17 || id === 18;
  }

  if (typeof status === "string") {
    const s = status.toLowerCase().trim();
    return !s || s === "waiting" || s === "offered" || s === "requested" || s === "1" || s === "2";
  }

  return true;
}
