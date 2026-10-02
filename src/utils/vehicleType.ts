export const KNOWN_DB_TYPES = [
  {
    vehicleTypeUniqueId: "e93aa27f-364f-4eff-bc26-582b773071d3",
    vehicleTypeName: "2×20ft or 40ft Low-Bed Truck (301–350 Quintal)",
  },
  {
    vehicleTypeUniqueId: "9b2e8446-e1b7-4659-89bd-3bbc4c0a6742",
    vehicleTypeName: "20ft Container Truck (251–300 Quintal)",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000002",
    vehicleTypeName: "ISUZU / Light Cargo (50–100 Quintal)",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000001",
    vehicleTypeName: "Heavy Duty Trailer (351–400+ Quintal)",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000003",
    vehicleTypeName: "Tanker / Bulk Liquid",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000004",
    vehicleTypeName: "Refrigerated Cargo Truck",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000006",
    vehicleTypeName: "Light Truck (up to 35 Quintal)",
    carryingCapacity: 35,
  },
];

export const DEFAULT_VEHICLE_TYPES = [
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000006",
    vehicleTypeName: "Light Truck (up to 35 Quintal)",
    carryingCapacity: 35,
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000002",
    vehicleTypeName: "ISUZU / Light Cargo (50–100 Quintal)",
  },
  {
    vehicleTypeUniqueId: "e93aa27f-364f-4eff-bc26-582b773071d3",
    vehicleTypeName: "Dry Cargo Truck (100–250 Quintal)",
  },
  {
    vehicleTypeUniqueId: "9b2e8446-e1b7-4659-89bd-3bbc4c0a6742",
    vehicleTypeName: "20ft Container Truck (251–300 Quintal)",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000005",
    vehicleTypeName: "2×20ft or 40ft Low-Bed Truck (301–350 Quintal)",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000001",
    vehicleTypeName: "Heavy Duty Trailer (351–400+ Quintal)",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000003",
    vehicleTypeName: "Tanker / Bulk Liquid",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000004",
    vehicleTypeName: "Refrigerated Cargo Truck",
  },
];

// In-memory cache of dynamically loaded vehicle types (e.g. from backend API)
const dynamicVehicleTypeMap = new Map<
  string,
  {
    vehicleTypeUniqueId: string;
    vehicleTypeName: string;
    carryingCapacity?: number;
  }
>();

export function registerDynamicVehicleTypes(
  types?: Array<{
    vehicleTypeUniqueId?: string;
    vehicleTypeName?: string;
    carryingCapacity?: number | string | null;
  }>,
) {
  if (!Array.isArray(types)) return;
  for (const vt of types) {
    if (vt?.vehicleTypeUniqueId) {
      const capNum =
        vt.carryingCapacity != null ? Number(vt.carryingCapacity) : undefined;
      dynamicVehicleTypeMap.set(vt.vehicleTypeUniqueId, {
        vehicleTypeUniqueId: vt.vehicleTypeUniqueId,
        vehicleTypeName: vt.vehicleTypeName || "",
        carryingCapacity: !isNaN(capNum as number) && (capNum as number) > 0 ? (capNum as number) : undefined,
      });
    }
  }
}

export interface VehicleCapacityInfo {
  vehicleTypeName: string;
  minQuintal?: number;
  maxQuintal?: number;
  hasPlus?: boolean;
}

/**
 * Extracts capacity limits (min, max, hasPlus) from vehicle type name or carryingCapacity.
 * E.g. "Light Truck (up to 35 Quintal)" -> { maxQuintal: 35, hasPlus: false }
 *      "20ft Container Truck (251–300 Quintal)" -> { minQuintal: 251, maxQuintal: 300, hasPlus: false }
 *      "Heavy Duty Trailer (351–400+ Quintal)" -> { minQuintal: 351, maxQuintal: undefined, hasPlus: true }
 */
export function parseVehicleCapacity(
  name?: string,
  carryingCapacity?: number,
): { minQuintal?: number; maxQuintal?: number; hasPlus?: boolean } {
  const explicitCapacity =
    carryingCapacity != null && Number(carryingCapacity) > 0
      ? Number(carryingCapacity)
      : undefined;

  if (!name) {
    if (explicitCapacity) {
      return { maxQuintal: explicitCapacity };
    }
    return {};
  }

  // Matches "(251–300 Quintal)", "(251-300 Quintal)", "(351–400+ Quintal)", "(50 - 100 Q)"
  const rangeMatch = name.match(/(\d+)\s*[-–—]\s*(\d+)(\+)?\s*(?:quintal|q|kuntal)?/i);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    const hasPlus = Boolean(rangeMatch[3]);
    return {
      minQuintal: !isNaN(min) ? min : undefined,
      maxQuintal: hasPlus ? undefined : (!isNaN(max) ? max : undefined),
      hasPlus,
    };
  }

  // Single capacity match like "(up to 35 Quintal)", "up to 40 Q", "300 Quintal", "(35 Quintal)"
  const singleMatch = name.match(/(?:up\s*to\s*|max\s*)?(\d+)\s*(?:quintal|q|kuntal)/i);
  if (singleMatch) {
    const val = Number(singleMatch[1]);
    if (!isNaN(val)) return { maxQuintal: val };
  }

  if (explicitCapacity) {
    return { maxQuintal: explicitCapacity };
  }

  return {};
}

/**
 * Resolves vehicle capacity info given an ID or vehicle name string.
 */
export function getVehicleCapacity(
  idOrName?: string,
  vtList?: Array<{ vehicleTypeUniqueId: string; vehicleTypeName: string; carryingCapacity?: number }>,
): VehicleCapacityInfo | null {
  if (!idOrName) return null;
  const target = idOrName.trim();
  if (!target) return null;

  if (vtList && vtList.length > 0) {
    registerDynamicVehicleTypes(vtList);
  }

  // 1. Search in vtList
  let found: { vehicleTypeUniqueId: string; vehicleTypeName: string; carryingCapacity?: number } | undefined =
    vtList?.find(
      (v) =>
        v.vehicleTypeUniqueId === target ||
        v.vehicleTypeName.toLowerCase() === target.toLowerCase() ||
        v.vehicleTypeName.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(v.vehicleTypeName.toLowerCase()),
    );

  // 2. Search in dynamicVehicleTypeMap
  if (!found && dynamicVehicleTypeMap.has(target)) {
    found = dynamicVehicleTypeMap.get(target);
  }

  // 3. Search in KNOWN_DB_TYPES
  if (!found) {
    found = KNOWN_DB_TYPES.find(
      (v) =>
        v.vehicleTypeUniqueId === target ||
        v.vehicleTypeName.toLowerCase() === target.toLowerCase() ||
        v.vehicleTypeName.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(v.vehicleTypeName.toLowerCase()),
    );
  }

  // 4. Search in DEFAULT_VEHICLE_TYPES
  if (!found) {
    found = DEFAULT_VEHICLE_TYPES.find(
      (v) =>
        v.vehicleTypeUniqueId === target ||
        v.vehicleTypeName.toLowerCase() === target.toLowerCase() ||
        v.vehicleTypeName.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(v.vehicleTypeName.toLowerCase()),
    );
  }

  // 5. Search in dynamicVehicleTypeMap by name
  if (!found) {
    for (const v of dynamicVehicleTypeMap.values()) {
      if (
        v.vehicleTypeName.toLowerCase() === target.toLowerCase() ||
        v.vehicleTypeName.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(v.vehicleTypeName.toLowerCase())
      ) {
        found = v;
        break;
      }
    }
  }

  const name =
    found?.vehicleTypeName ||
    (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target)
      ? target
      : undefined);

  if (!name && !(found as any)?.carryingCapacity) return null;

  const capacity = parseVehicleCapacity(name, (found as any)?.carryingCapacity);
  return {
    vehicleTypeName: name || "Vehicle",
    ...capacity,
  };
}

export function resolveVehicleName(
  idOrName?: string,
  providedName?: string,
  vtList?: Array<{ vehicleTypeUniqueId: string; vehicleTypeName: string }>,
): string {
  // 1. If providedName is present and valid
  if (
    providedName &&
    providedName.trim() &&
    !providedName.toLowerCase().startsWith("vehicle")
  ) {
    return providedName.trim();
  }

  const target = (idOrName || "").trim();

  // 2. Search in DB / API vehicle types list
  if (vtList && vtList.length > 0) {
    const found = vtList.find(
      (v) =>
        v.vehicleTypeUniqueId === target ||
        v.vehicleTypeName.toLowerCase() === target.toLowerCase() ||
        v.vehicleTypeName.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(v.vehicleTypeName.toLowerCase()),
    );
    if (found?.vehicleTypeName) return found.vehicleTypeName;
  }

  // 3. Search in dynamicVehicleTypeMap
  if (dynamicVehicleTypeMap.has(target)) {
    const dynFound = dynamicVehicleTypeMap.get(target);
    if (dynFound?.vehicleTypeName) return dynFound.vehicleTypeName;
  }

  // 4. Search in KNOWN_DB_TYPES
  const dbFound = KNOWN_DB_TYPES.find(
    (v) =>
      v.vehicleTypeUniqueId === target ||
      v.vehicleTypeName.toLowerCase() === target.toLowerCase() ||
      v.vehicleTypeName.toLowerCase().includes(target.toLowerCase()) ||
      target.toLowerCase().includes(v.vehicleTypeName.toLowerCase()),
  );
  if (dbFound?.vehicleTypeName) return dbFound.vehicleTypeName;

  // 5. Search in DEFAULT_VEHICLE_TYPES baseline
  const baselineFound = DEFAULT_VEHICLE_TYPES.find(
    (v) =>
      v.vehicleTypeUniqueId === target ||
      v.vehicleTypeName.toLowerCase() === target.toLowerCase() ||
      v.vehicleTypeName.toLowerCase().includes(target.toLowerCase()) ||
      target.toLowerCase().includes(v.vehicleTypeName.toLowerCase()),
  );
  if (baselineFound?.vehicleTypeName) return baselineFound.vehicleTypeName;

  // 6. If target is not a raw UUID, use target itself
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      target,
    );
  if (!isUuid && target.length > 1) {
    return target;
  }

  // Fallback to real default vehicle type name
  return "20ft Container Truck (251–300 Quintal)";
}

export default resolveVehicleName;

