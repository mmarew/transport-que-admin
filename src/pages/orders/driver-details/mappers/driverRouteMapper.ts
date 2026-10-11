import type { OrderDisplayItem } from "../../../../components/orders/OrdersTypes";
import {
  calculateDistanceKm,
  ETHIOPIAN_CITIES,
} from "../../../../utils/formatters";

export interface ResolvedRouteAndDistance {
  originClean: string;
  destinationClean: string;
  originYard: string;
  destinationDepot: string;
  corridor: string;
  region: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  totalDistanceKm: number;
  completedDistanceKm: number;
  remainingDistanceKm: number;
  progressPercentage: number;
  durationMinutes: number;
  remainingMinutes: number;
  speedKmh: number;
  totalMinutes: number;
}

/**
 * Finds known Ethiopian coordinates for a location string
 */
export function findCityCoordinates(cityName?: string): { lat: number; lng: number; region?: string } | null {
  if (!cityName) return null;
  const clean = cityName.trim().toLowerCase();

  for (const city of ETHIOPIAN_CITIES) {
    if (clean.includes(city.name.toLowerCase()) || city.name.toLowerCase().includes(clean)) {
      const regionMatch = city.region ? city.region.split(",")[1]?.trim() || city.region.split(",")[0]?.trim() : undefined;
      return { lat: city.lat, lng: city.lng, region: regionMatch };
    }
  }
  return null;
}

/**
 * Resolves Ethiopian Highway corridor between two cities
 */
export function resolveHighwayCorridor(origin: string, destination: string): string {
  const o = origin.toLowerCase();
  const d = destination.toLowerCase();

  if (
    (o.includes("dessie") || o.includes("kombolcha") || o.includes("mekelle") || o.includes("woldiya")) &&
    (d.includes("dessie") || d.includes("kombolcha") || d.includes("mekelle") || d.includes("woldiya") || d.includes("addis"))
  ) {
    return "A2 corridor";
  }

  if (
    (o.includes("modjo") || o.includes("mojo") || o.includes("adama") || o.includes("hawassa") || o.includes("shashemene")) &&
    (d.includes("modjo") || d.includes("mojo") || d.includes("adama") || d.includes("hawassa") || d.includes("shashemene"))
  ) {
    return "A7 Expressway corridor";
  }

  if (
    (o.includes("djibouti") || o.includes("dire dawa") || o.includes("semera")) ||
    (d.includes("djibouti") || d.includes("dire dawa") || d.includes("semera"))
  ) {
    return "A1 Djibouti Trade corridor";
  }

  if (
    (o.includes("bahir dar") || o.includes("gondar") || o.includes("debre markos")) ||
    (d.includes("bahir dar") || d.includes("gondar") || d.includes("debre markos"))
  ) {
    return "A3 corridor";
  }

  return "National Freight corridor";
}

/**
 * Resolves geographic locations, coordinates, corridor, distances, and travel times.
 */
export function resolveRouteAndDistance(
  order: OrderDisplayItem | null | undefined,
  rawReq: any,
  rawItem: any,
  assignedDriverReq: any,
  statusId: number,
): ResolvedRouteAndDistance {
  const rawOrigin = order?.origin || rawReq.originPlace || rawItem.originPlace || "Terminal";
  const rawDestination = order?.destination || rawReq.destinationPlace || rawItem.destinationPlace || "Destination";

  const originClean = rawOrigin.split(",")[0].trim() || "Terminal";
  const destinationClean = rawDestination.split(",")[0].trim() || "Destination";

  const originYard =
    rawOrigin.toLowerCase().includes("yard") ||
    rawOrigin.toLowerCase().includes("port") ||
    rawOrigin.toLowerCase().includes("terminal")
      ? rawOrigin
      : `${originClean} loading yard`;

  const destinationDepot =
    rawDestination.toLowerCase().includes("depot") ||
    rawDestination.toLowerCase().includes("terminal") ||
    rawDestination.toLowerCase().includes("warehouse")
      ? rawDestination
      : `${destinationClean} receiving depot`;

  const corridor = resolveHighwayCorridor(originClean, destinationClean);

  // Look up geographic coordinates
  const originCityGeo = findCityCoordinates(originClean);
  const destCityGeo = findCityCoordinates(destinationClean);

  const parseCoord = (val: unknown): number | null => {
    if (val == null) return null;
    const n = typeof val === "number" ? val : parseFloat(String(val));
    return !isNaN(n) && n !== 0 ? n : null;
  };

  const originLat =
    parseCoord(order?.originLatitude) ??
    parseCoord(rawReq.originLatitude) ??
    parseCoord(rawItem.shipperRequest?.originLatitude) ??
    parseCoord((assignedDriverReq as any)?.originLatitude) ??
    originCityGeo?.lat ??
    9.02;

  const originLng =
    parseCoord(order?.originLongitude) ??
    parseCoord(rawReq.originLongitude) ??
    parseCoord(rawItem.shipperRequest?.originLongitude) ??
    parseCoord((assignedDriverReq as any)?.originLongitude) ??
    originCityGeo?.lng ??
    38.74;

  const destLat =
    parseCoord(order?.destinationLatitude) ??
    parseCoord(rawReq.destinationLatitude) ??
    parseCoord(rawItem.shipperRequest?.destinationLatitude) ??
    destCityGeo?.lat ??
    8.54;

  const destLng =
    parseCoord(order?.destinationLongitude) ??
    parseCoord(rawReq.destinationLongitude) ??
    parseCoord(rawItem.shipperRequest?.destinationLongitude) ??
    destCityGeo?.lng ??
    39.27;

  const region = originCityGeo?.region || destCityGeo?.region || "ETHIOPIA";

  let calcDist = calculateDistanceKm(originLat, originLng, destLat, destLng);
  if (!calcDist || calcDist <= 0) {
    calcDist = 25;
  }
  const totalDistanceKm = Math.round(calcDist);

  // Dynamic progress percentage from status
  let progressPercentage = 60;
  if (statusId === 1 || statusId === 2 || statusId === 3 || statusId === 4) {
    progressPercentage = 0;
  } else if (statusId === 5) {
    progressPercentage = 15;
  } else if (statusId === 6) {
    progressPercentage = 25;
  } else if (statusId === 7) {
    progressPercentage = 35;
  } else if (statusId === 8) {
    progressPercentage = 60;
  } else if (statusId >= 9) {
    progressPercentage = 100;
  }

  const completedDistanceKm = Math.round((totalDistanceKm * progressPercentage) / 100);
  const remainingDistanceKm = Math.max(0, totalDistanceKm - completedDistanceKm);

  // Duration in minutes based on real distance (average commercial speed 45 km/h)
  const totalMinutes = Math.max(25, Math.round((totalDistanceKm / 45) * 60));
  const durationMinutes = Math.round((totalMinutes * progressPercentage) / 100);
  const remainingMinutes = Math.max(0, totalMinutes - durationMinutes);

  const speedKmh = statusId === 8 ? 33 : 0;

  return {
    originClean,
    destinationClean,
    originYard,
    destinationDepot,
    corridor,
    region,
    originLat,
    originLng,
    destLat,
    destLng,
    totalDistanceKm,
    completedDistanceKm,
    remainingDistanceKm,
    progressPercentage,
    durationMinutes,
    remainingMinutes,
    speedKmh,
    totalMinutes,
  };
}
