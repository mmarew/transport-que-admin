import type {
  QueueOrganization,
  QueueOrgListItem,
  DriverQueueEntry,
  QueueShipperRequest,
  QueueStatusPayload,
} from "../types/queue";
import {
  resolveJourneyStatus,
  mapJourneyStatusToQueueStatus,
  formatJourneyStatusLabel,
} from "./journeyStatus";

/** Extract city from a standard address string */
export function extractCity(address?: string | null): string {
  if (!address) return "Addis Ababa";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 0 && parts[0].toLowerCase() !== "ethiopia") {
    return parts[0];
  }
  return parts[0] || "Addis Ababa";
}

/** Formats a phone number cleanly */
export function formatPhone(phone?: string | null): string {
  if (!phone) return "—";
  return phone.replace(/^(\+251|0)/, "+251 ");
}

/** Normalize a single organization payload (flat or nested) */
export function normalizeOrg(item: unknown): QueueOrganization | null {
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;
  if (obj.organization && typeof obj.organization === "object") {
    return normalizeOrg(obj.organization);
  }
  if (typeof obj.queueOrganizationUniqueId === "string" || typeof obj.queueOrganizationId === "number") {
    return obj as unknown as QueueOrganization;
  }
  if (typeof obj.id === "string" || typeof obj.id === "number" || typeof obj.uuid === "string") {
    return {
      ...obj,
      queueOrganizationUniqueId: String(obj.queueOrganizationUniqueId || obj.id || obj.uuid || ""),
      queueOrganizationId: Number(obj.queueOrganizationId || (typeof obj.id === "number" ? obj.id : 0)),
      queueOrganizationName: String(obj.queueOrganizationName || obj.name || "Organization"),
      queueOrganizationType: (obj.queueOrganizationType || obj.type || "port") as any,
      queueOrganizationAddress: (obj.queueOrganizationAddress || obj.address || "") as any,
    } as unknown as QueueOrganization;
  }
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return normalizeOrg(obj.data);
  }
  return null;
}

/** Normalize an item to standard QueueOrgListItem shape */
export function normalizeOrgListItem(item: unknown): QueueOrgListItem | null {
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;
  if (obj.organization && typeof obj.organization === "object") {
    const org = normalizeOrg(obj.organization);
    if (org) {
      return {
        organization: org,
        creator: (obj.creator as any) || null,
      };
    }
  }
  const org = normalizeOrg(item);
  if (org) {
    return {
      organization: org,
      creator: (obj.creator as any) || null,
    };
  }
  return null;
}

/** Normalize API response array into robust QueueOrgListItem array */
export function normalizeOrgList(rawData: unknown): QueueOrgListItem[] {
  if (!rawData) return [];
  let rawList: unknown[] = [];
  if (Array.isArray(rawData)) {
    rawList = rawData;
  } else if (typeof rawData === "object" && rawData !== null) {
    const payload = rawData as Record<string, unknown>;
    if (Array.isArray(payload.data)) rawList = payload.data;
    else if (Array.isArray(payload.organizations)) rawList = payload.organizations;
    else if (Array.isArray(payload.rows)) rawList = payload.rows;
    else if (Array.isArray(payload.records)) rawList = payload.records;
    else if (payload.data && typeof payload.data === "object" && Array.isArray((payload.data as any).data)) {
      rawList = (payload.data as any).data;
    }
  }
  return rawList
    .map(normalizeOrgListItem)
    .filter((item): item is QueueOrgListItem => item !== null && item.organization != null);
}

const ETHIOPIAN_CITIES = [
  { name: "Kombolcha", lat: 11.083, lng: 39.743 },
  { name: "Dessie", lat: 11.133, lng: 39.633 },
  { name: "Addis Ababa", lat: 9.022, lng: 38.746 },
  { name: "Mojo", lat: 8.590, lng: 39.120 },
  { name: "Adama", lat: 8.540, lng: 39.270 },
  { name: "Bishoftu", lat: 8.750, lng: 38.980 },
  { name: "Hawassa", lat: 7.050, lng: 38.470 },
  { name: "Shashemene", lat: 7.200, lng: 38.600 },
  { name: "Bahir Dar", lat: 11.590, lng: 37.390 },
  { name: "Gondar", lat: 12.600, lng: 37.460 },
  { name: "Dire Dawa", lat: 9.600, lng: 41.860 },
  { name: "Harar", lat: 9.310, lng: 42.130 },
  { name: "Jigjiga", lat: 9.350, lng: 42.800 },
  { name: "Mekelle", lat: 13.500, lng: 39.470 },
  { name: "Semera", lat: 11.790, lng: 41.010 },
  { name: "Jimma", lat: 7.670, lng: 36.830 },
  { name: "Debre Birhan", lat: 9.680, lng: 39.530 },
  { name: "Debre Markos", lat: 10.330, lng: 37.730 },
  { name: "Woldiya", lat: 11.830, lng: 39.600 },
  { name: "Arba Minch", lat: 6.030, lng: 37.550 },
  { name: "Dilla", lat: 6.410, lng: 38.310 },
  { name: "Nekemte", lat: 9.080, lng: 36.550 },
  { name: "Assosa", lat: 10.060, lng: 34.530 },
  { name: "Gambela", lat: 8.250, lng: 34.580 },
  { name: "Wolaita Sodo", lat: 6.860, lng: 37.760 },
  { name: "Hosaena", lat: 7.550, lng: 37.850 },
  { name: "Bale Robe", lat: 7.120, lng: 40.000 },
];

/** Resolves latitude & longitude to a known city or formatted location */
export function lookupLocationFromCoordinates(
  lat?: number | string | null,
  lng?: number | string | null
): string | undefined {
  if (lat == null || lng == null) return undefined;
  const numLat = typeof lat === "number" ? lat : parseFloat(String(lat));
  const numLng = typeof lng === "number" ? lng : parseFloat(String(lng));
  if (isNaN(numLat) || isNaN(numLng) || (numLat === 0 && numLng === 0)) return undefined;

  let closestCity: string | null = null;
  let minDistance = Infinity;

  for (const city of ETHIOPIAN_CITIES) {
    const dLat = numLat - city.lat;
    const dLng = numLng - city.lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      closestCity = city.name;
    }
  }

  // Within approx ~45km (0.25 degrees squared)
  if (closestCity && minDistance < 0.25) {
    return `${closestCity}, Ethiopia`;
  }

  const latDir = numLat >= 0 ? "N" : "S";
  const lngDir = numLng >= 0 ? "E" : "W";
  return `${Math.abs(numLat).toFixed(2)}° ${latDir}, ${Math.abs(numLng).toFixed(2)}° ${lngDir}`;
}

/** Normalize a driver queue entry from any backend payload structure (flat or nested) */
export function normalizeQueueEntry(raw: any): DriverQueueEntry {
  if (!raw || typeof raw !== "object") return raw;
  const q = raw.queue && typeof raw.queue === "object" ? raw.queue : raw;
  const driverObj =
    raw.driver ||
    raw.driverUser ||
    raw.driverRequests ||
    raw.vehicleDriver ||
    raw.vehicleDriver?.driverUser ||
    raw.vehicleDriver?.driver ||
    raw.user ||
    q.driver ||
    q.driverUser ||
    q.vehicleDriver ||
    {};

  const vehicleObj =
    driverObj.vehicleOfDriver ||
    driverObj.vehicle ||
    raw.vehicleOfDriver ||
    raw.vehicle ||
    q.vehicle ||
    {};

  const queueUniqueId =
    q.queueUniqueId ||
    q.driverQueueUniqueId ||
    q.id ||
    q.queueId ||
    q.uniqueId ||
    raw.queueUniqueId ||
    raw.driverQueueUniqueId ||
    raw.id ||
    raw.queueId ||
    "";

  const queueNumber = Number(
    q.queueNumber ?? q.position ?? raw.queueNumber ?? raw.position ?? 1
  );

  const joinedAt =
    q.joinedAt ||
    q.createdAt ||
    q.queueCreatedAt ||
    q.date ||
    raw.joinedAt ||
    raw.createdAt ||
    raw.queueCreatedAt ||
    raw.date ||
    driverObj.createdAt ||
    new Date().toISOString();

  const rawStatusVal =
    q.journeyStatusId ??
    raw.journeyStatusId ??
    driverObj.journeyStatusId ??
    q.journeyStatusName ??
    raw.journeyStatusName ??
    driverObj.journeyStatusName ??
    q.status ??
    raw.status ??
    driverObj.status ??
    q.queueStatus ??
    "waiting";

  const resolvedJourneyStatus = resolveJourneyStatus(rawStatusVal);
  const status = mapJourneyStatusToQueueStatus(rawStatusVal);
  const statusLabel = formatJourneyStatusLabel(rawStatusVal);
  const journeyStatusId = resolvedJourneyStatus?.journeyStatusId;
  const journeyStatusName =
    resolvedJourneyStatus?.journeyStatusName ||
    (typeof rawStatusVal === "string" && rawStatusVal !== "[object Object]"
      ? rawStatusVal
      : undefined);

  const vehicleDriverUniqueId =
    q.vehicleDriverUniqueId ||
    raw.vehicleDriverUniqueId ||
    driverObj.vehicleDriverUniqueId ||
    driverObj.uniqueId ||
    "";

  const driverUserUniqueId =
    q.driverUserUniqueId ||
    raw.driverUserUniqueId ||
    driverObj.userUniqueId ||
    driverObj.driverUserUniqueId ||
    driverObj.id ||
    "";

  const driverName =
    driverObj.fullName ||
    driverObj.name ||
    driverObj.driverName ||
    driverObj.driverFullName ||
    driverObj.user?.fullName ||
    driverObj.driverUser?.fullName ||
    q.driverName ||
    q.driverFullName ||
    q.fullName ||
    raw.driverName ||
    raw.driverFullName ||
    raw.fullName ||
    raw.name ||
    "Driver";

  const driverPhoneNumber =
    driverObj.phoneNumber ||
    driverObj.phone ||
    driverObj.driverPhoneNumber ||
    driverObj.driverPhone ||
    driverObj.user?.phoneNumber ||
    driverObj.driverUser?.phoneNumber ||
    q.driverPhoneNumber ||
    q.driverPhone ||
    q.phoneNumber ||
    q.phone ||
    raw.driverPhoneNumber ||
    raw.driverPhone ||
    raw.phoneNumber ||
    raw.phone ||
    "—";

  const rawLat =
    driverObj.driverLatitude ??
    driverObj.latitude ??
    driverObj.lat ??
    q.driverLatitude ??
    q.latitude ??
    q.lat ??
    raw.driverLatitude ??
    raw.latitude ??
    raw.lat ??
    null;

  const rawLng =
    driverObj.driverLongitude ??
    driverObj.longitude ??
    driverObj.lng ??
    q.driverLongitude ??
    q.longitude ??
    q.lng ??
    raw.driverLongitude ??
    raw.longitude ??
    raw.lng ??
    null;

  const rawAddress =
    driverObj.address ||
    driverObj.city ||
    driverObj.location ||
    driverObj.driverAddress ||
    driverObj.user?.address ||
    driverObj.driverUser?.address ||
    q.driverAddress ||
    q.address ||
    raw.driverAddress ||
    raw.address ||
    "";

  let driverAddress: string | undefined = undefined;
  if (rawAddress && typeof rawAddress === "string") {
    const city = extractCity(rawAddress);
    driverAddress = city ? `${city}, Ethiopia` : rawAddress;
  } else if (rawLat != null && rawLng != null) {
    driverAddress = lookupLocationFromCoordinates(rawLat, rawLng);
  }

  const vehicleTypeUniqueId =
    vehicleObj.vehicleTypeUniqueId ||
    driverObj.vehicleTypeUniqueId ||
    q.vehicleTypeUniqueId ||
    raw.vehicleTypeUniqueId ||
    "";

  const vehicleTypeName =
    vehicleObj.vehicleTypeName ||
    driverObj.vehicleTypeName ||
    q.vehicleTypeName ||
    raw.vehicleTypeName ||
    undefined;

  const shipperRequestUniqueId =
    q.shipperRequestUniqueId ||
    raw.shipperRequestUniqueId ||
    (raw.shipperRequest && typeof raw.shipperRequest === "object"
      ? raw.shipperRequest.shipperRequestUniqueId
      : undefined) ||
    null;

  const shipperRequest =
    raw.shipperRequest && typeof raw.shipperRequest === "object"
      ? (raw.shipperRequest as QueueShipperRequest)
      : undefined;

  return {
    queueUniqueId,
    queueNumber,
    joinedAt,
    status,
    journeyStatusId,
    journeyStatusName,
    statusLabel,
    offeredAt: q.offeredAt || raw.offeredAt || null,
    loadedAt: q.loadedAt || raw.loadedAt || null,
    vehicleDriverUniqueId,
    driverUserUniqueId,
    driverName,
    driverPhoneNumber,
    driverAddress,
    driverLatitude: rawLat,
    driverLongitude: rawLng,
    vehicleTypeUniqueId,
    vehicleTypeName,
    shipperRequestUniqueId,
    targetedShipperUserUUID:
      q.targetedShipperUserUUID ?? raw.targetedShipperUserUUID ?? null,
    shipperRequest,
  };
}

/** Calculate haversine distance in kilometers between two lat/lng coordinates */
export function calculateDistanceKm(
  lat1?: number | string | null,
  lon1?: number | string | null,
  lat2?: number | string | null,
  lon2?: number | string | null
): number | null {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = typeof lat1 === "number" ? lat1 : parseFloat(String(lat1));
  const nLon1 = typeof lon1 === "number" ? lon1 : parseFloat(String(lon1));
  const nLat2 = typeof lat2 === "number" ? lat2 : parseFloat(String(lat2));
  const nLon2 = typeof lon2 === "number" ? lon2 : parseFloat(String(lon2));

  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;
  if (nLat1 === 0 && nLon1 === 0) return null;
  if (nLat2 === 0 && nLon2 === 0) return null;

  const R = 6371; // Earth radius in km
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.round(dist * 10) / 10;
}

/**
 * Robustly extracts the driver's proposed/bid/counter offer cost across
 * all possible backend property naming conventions and nested structures.
 */
export function extractOfferCost(d: any, parentItem?: any): number | null {
  if (!d && !parentItem) return null;

  const parseNum = (val: unknown): number | null => {
    if (val === undefined || val === null || val === "") return null;
    if (typeof val === "number") return !isNaN(val) && val > 0 ? val : null;
    if (typeof val === "string") {
      const clean = parseFloat(val.replace(/[^0-9.]/g, ""));
      return !isNaN(clean) && clean > 0 ? clean : null;
    }
    return null;
  };

  const scanDirect = (target: any): number | null => {
    if (!target || typeof target !== "object") return null;

    // 1. High-priority explicit proposed / counter / bid / offer fields
    const directFields = [
      target.proposedCostPerVehicle,
      target.proposed_cost_per_vehicle,
      target.proposedCost,
      target.proposed_cost,
      target.proposedTotalCost,
      target.proposed_total_cost,
      target.costPerVehicle,
      target.cost_per_vehicle,
      target.counterCost,
      target.counter_cost,
      target.counterOffer,
      target.counter_offer,
      target.counterPrice,
      target.counter_price,
      target.counterAmount,
      target.offerCost,
      target.offer_cost,
      target.offeredCost,
      target.offered_cost,
      target.driverOfferCost,
      target.driver_offer_cost,
      target.driverProposedCost,
      target.driver_proposed_cost,
      target.driverCost,
      target.driver_cost,
      target.driverPrice,
      target.driver_price,
      target.driverShippingCost,
      target.driver_shipping_cost,
      target.shippingCost,
      target.shipping_cost,
      target.bidAmount,
      target.bid_amount,
      target.bidCost,
      target.bid_cost,
      target.biddingCost,
      target.bidding_cost,
      target.driverBidAmount,
      target.bidPrice,
      target.bid_price,
      target.bid,
      target.offer,
      target.negotiatedCost,
      target.negotiated_cost,
      target.negotiatedPrice,
      target.agreedCost,
      target.agreed_cost,
      target.agreedPrice,
      target.acceptedCost,
      target.accepted_cost,
      target.acceptedPrice,
      target.newCost,
      target.new_cost,
      target.updatedCost,
      target.updated_cost,
      target.tripCost,
      target.trip_cost,
      target.totalCost,
      target.total_cost,
      target.fare,
      target.driverFare,
      target.charge,
      target.amount,
      target.price,
      target.cost,
    ];

    for (const f of directFields) {
      const num = parseNum(f);
      if (num != null) return num;
    }

    // 2. Dynamic key check for any key containing cost/bid/offer/counter/price/proposed
    for (const key of Object.keys(target)) {
      if (
        /cost|bid|offer|counter|proposed|negotiat|agreed|price|fare|charge/i.test(key) &&
        !/status|id|date|name|type|time|mode|photo|email|phone|plate/i.test(key)
      ) {
        const val = target[key];
        if (typeof val === "number" || typeof val === "string") {
          const num = parseNum(val);
          if (num != null) return num;
        }
      }
    }

    return null;
  };

  // 1. Direct and nested scan on d
  if (d && typeof d === "object") {
    const directResult = scanDirect(d);
    if (directResult != null) return directResult;

    // Check nested sub-objects on d
    const subObjects = [
      d.bid,
      d.offer,
      d.driverRequest,
      d.companyBid,
      d.companyBidRequest,
      d.decision,
      d.proposal,
      d.carrierProposal,
      d.vehicleOfDriver,
      d.vehicle,
      d.driver,
      d.driverUser,
      d.user,
      d.details,
      d.data,
      d.pivot,
      d.meta,
      d.rawDriver,
    ];

    for (const sub of subObjects) {
      if (sub && typeof sub === "object") {
        const num = extractOfferCost(sub);
        if (num != null) return num;
      }
    }
  }

  // 2. Search related collections or objects on parentItem
  if (parentItem && typeof parentItem === "object") {
    // Extract any matching identifiers from d
    const identifiers = new Set<string>();
    if (d && typeof d === "object") {
      [
        d.userUniqueId,
        d.driverUserUniqueId,
        d.userId,
        d.driverId,
        d.phoneNumber,
        d.driverPhoneNumber,
        d.driverRequestId,
        d.driverRequestUniqueId,
        d.vehicleDriverUniqueId,
        d.vehicleId,
        d.fullName,
        d.driverName,
      ].forEach((id) => {
        if (id != null && String(id).trim() !== "") {
          identifiers.add(String(id).trim().toLowerCase());
        }
      });
    }

    const candidateLists = [
      parentItem.decisions,
      parentItem.journey,
      parentItem.bids,
      parentItem.companyBids,
      parentItem.driverBids,
      parentItem.offers,
      parentItem.proposals,
      parentItem.carrierProposals,
      parentItem.counterOffers,
      parentItem.driverRequests,
    ];

    for (const list of candidateLists) {
      if (Array.isArray(list)) {
        for (const entry of list) {
          if (!entry || typeof entry !== "object") continue;

          let isMatch = identifiers.size === 0 || list.length === 1;
          if (!isMatch) {
            const entryIds = [
              entry.userUniqueId,
              entry.driverUserUniqueId,
              entry.userId,
              entry.driverId,
              entry.phoneNumber,
              entry.driverPhoneNumber,
              entry.driverRequestId,
              entry.driverRequestUniqueId,
              entry.vehicleDriverUniqueId,
              entry.companyUniqueId,
              entry.fullName,
              entry.driverName,
            ];
            isMatch = entryIds.some(
              (id) => id != null && identifiers.has(String(id).trim().toLowerCase())
            );
          }

          if (isMatch) {
            const num = extractOfferCost(entry);
            if (num != null) return num;
          }
        }
      } else if (list && typeof list === "object") {
        // e.g. parentItem.journey as a single object
        const num = extractOfferCost(list);
        if (num != null) return num;
      }
    }

    // Check parentItem.shipperRequest for any updated driver proposed cost
    if (parentItem.shipperRequest && typeof parentItem.shipperRequest === "object") {
      const sr = parentItem.shipperRequest;
      const proposedFields = [
        sr.proposedCostPerVehicle,
        sr.proposedCost,
        sr.driverProposedCost,
        sr.counterCost,
        sr.driverCost,
        sr.agreedCost,
        sr.negotiatedCost,
        sr.driverOfferCost,
      ];
      for (const pf of proposedFields) {
        const num = parseNum(pf);
        if (num != null) return num;
      }
    }
  }

  return null;
}

/**
 * Normalizes a queue status payload into a Record of vehicleTypeName -> DriverQueueEntry[]
 */
export function normalizeQueuesMap(
  status: QueueStatusPayload | unknown,
  defaultKey: string = "Standard"
): Record<string, DriverQueueEntry[]> {
  if (!status) return {};
  const rawPayload: any =
    (status as any)?.data !== undefined ? (status as any).data : status;
  const rawQueues =
    rawPayload?.queues || rawPayload?.data || rawPayload?.list || rawPayload;
  if (!rawQueues) return {};

  if (Array.isArray(rawQueues)) {
    const map: Record<string, DriverQueueEntry[]> = {};
    for (const item of rawQueues) {
      if (!item) continue;
      const entry = normalizeQueueEntry(item);
      const key =
        entry.vehicleTypeName ||
        entry.vehicleTypeUniqueId ||
        defaultKey;
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    }
    return map;
  }

  if (typeof rawQueues === "object" && rawQueues !== null) {
    const map: Record<string, DriverQueueEntry[]> = {};
    for (const [k, v] of Object.entries(rawQueues)) {
      if (
        k === "message" ||
        k === "status" ||
        k === "success" ||
        k === "pagination"
      )
        continue;
      if (Array.isArray(v)) {
        map[k] = v.map(normalizeQueueEntry);
      } else if (v && typeof v === "object") {
        map[k] = [normalizeQueueEntry(v)];
      }
    }
    return map;
  }
  return {};
}

/** Safely extracts driver name from arbitrary entry shapes */
export function extractDriverName(e?: any): string {
  if (!e) return "";
  return (
    e.driverName ||
    e.fullName ||
    e.driverFullName ||
    e.name ||
    e.driverUser?.fullName ||
    ""
  );
}

/** Safely extracts driver phone from arbitrary entry shapes */
export function extractDriverPhone(e?: any): string {
  if (!e) return "";
  return (
    e.driverPhoneNumber ||
    e.phoneNumber ||
    e.driverPhone ||
    e.phone ||
    e.driverUser?.phoneNumber ||
    ""
  );
}

/** Safely parse a numeric string or number */
export function toNumber(value?: string | number | null): number {
  const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Formats a date string into MMM D, YYYY */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}
