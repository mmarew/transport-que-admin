export const DEFAULT_VEHICLE_TYPES = [
  { vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000002", vehicleTypeName: "ISUZU / Light Cargo (50–100 Quintal)" },
  { vehicleTypeUniqueId: "e93aa27f-364f-4eff-bc26-582b773071d3", vehicleTypeName: "Dry Cargo Truck (100–250 Quintal)" },
  { vehicleTypeUniqueId: "9b2e8446-e1b7-4659-89bd-3bbc4c0a6742", vehicleTypeName: "20ft Container Truck (251–300 Quintal)" },
  { vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000005", vehicleTypeName: "2×20ft or 40ft Low-Bed Truck (301–350 Quintal)" },
  { vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000001", vehicleTypeName: "Heavy Duty Trailer (351–400+ Quintal)" },
  { vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000003", vehicleTypeName: "Tanker / Bulk Liquid" },
  { vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000004", vehicleTypeName: "Refrigerated Cargo Truck" },
];

export function resolveVehicleName(
  idOrName?: string,
  providedName?: string,
  vtList?: Array<{ vehicleTypeUniqueId: string; vehicleTypeName: string }>
): string {
  // 1. If providedName is present and valid
  if (providedName && providedName.trim() && !providedName.toLowerCase().startsWith("vehicle")) {
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
        target.toLowerCase().includes(v.vehicleTypeName.toLowerCase())
    );
    if (found?.vehicleTypeName) return found.vehicleTypeName;
  }

  // 3. Search in DEFAULT_VEHICLE_TYPES baseline
  const baselineFound = DEFAULT_VEHICLE_TYPES.find(
    (v) =>
      v.vehicleTypeUniqueId === target ||
      v.vehicleTypeName.toLowerCase() === target.toLowerCase() ||
      v.vehicleTypeName.toLowerCase().includes(target.toLowerCase()) ||
      target.toLowerCase().includes(v.vehicleTypeName.toLowerCase())
  );
  if (baselineFound?.vehicleTypeName) return baselineFound.vehicleTypeName;

  // 4. If target is not a raw UUID, use target itself
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);
  if (!isUuid && target.length > 1) {
    return target;
  }

  // Fallback to real default vehicle type name
  return "20ft Container Truck (251–300 Quintal)";
}

export default resolveVehicleName;
