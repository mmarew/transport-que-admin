import type { QueueOrganization, QueueOrgListItem, DriverQueueEntry } from "../types/queue";

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
    return obj.organization as QueueOrganization;
  }
  if (typeof obj.queueOrganizationUniqueId === "string" || typeof obj.queueOrganizationId === "number") {
    return obj as unknown as QueueOrganization;
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
    return {
      organization: obj.organization as QueueOrganization,
      creator: (obj.creator as any) || null,
    };
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

  const status = (String(
    q.status || raw.status || driverObj.status || q.queueStatus || "waiting"
  ).toLowerCase()) as any;

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
    q.shipperRequestUniqueId || raw.shipperRequestUniqueId || null;

  return {
    queueUniqueId,
    queueNumber,
    joinedAt,
    status,
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
  };
}

