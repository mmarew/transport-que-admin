/**
 * Field extraction and fallback resolution helpers for normalizing raw backend order responses.
 */

export function extractLocationString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      return c.trim();
    }
    if (c && typeof c === "object") {
      const obj = c as Record<string, unknown>;
      if (typeof obj.description === "string" && obj.description.trim()) {
        return obj.description.trim();
      }
      if (typeof obj.place === "string" && obj.place.trim()) {
        return obj.place.trim();
      }
      if (typeof obj.locationName === "string" && obj.locationName.trim()) {
        return obj.locationName.trim();
      }
    }
  }
  return null;
}

export function resolvePlateNumber(
  item: any,
  req: any,
  matchedBatch?: any,
  rawDecisions?: any[],
): string | null {
  return (
    (item as any).journey?.licensePlate ??
    (item as any).journey?.license_plate ??
    (item as any).journey?.plateNumber ??
    (item as any).journey?.plate_number ??
    (item as any).journey?.vehicle?.licensePlate ??
    (item as any).journey?.vehicle?.license_plate ??
    (item as any).journey?.vehicle?.plateNumber ??
    (item as any).journey?.vehicleOfDriver?.licensePlate ??
    (item as any).journey?.vehicleOfDriver?.license_plate ??
    (item as any).journey?.vehicleOfDriver?.plateNumber ??
    (req as any).journey?.licensePlate ??
    (req as any).journey?.license_plate ??
    (req as any).journey?.plateNumber ??
    (req as any).journey?.plate_number ??
    (req as any).journey?.vehicle?.licensePlate ??
    (req as any).journey?.vehicleOfDriver?.licensePlate ??
    (item as any).licensePlate ??
    (item as any).license_plate ??
    (item as any).plateNumber ??
    (item as any).plate_number ??
    (item as any).vehiclePlateNumber ??
    (item as any).vehicle_plate_number ??
    (item as any).vehiclePlate ??
    (item as any).vehicle_plate ??
    (req as any).licensePlate ??
    (req as any).license_plate ??
    (req as any).plateNumber ??
    (req as any).plate_number ??
    (req as any).vehiclePlateNumber ??
    (req as any).vehicle_plate_number ??
    (req as any).vehiclePlate ??
    (req as any).vehicle_plate ??
    matchedBatch?.licensePlate ??
    matchedBatch?.license_plate ??
    matchedBatch?.plateNumber ??
    matchedBatch?.plate_number ??
    (Array.isArray(rawDecisions) && rawDecisions[0]?.licensePlate) ??
    (Array.isArray(rawDecisions) && rawDecisions[0]?.plateNumber) ??
    null
  );
}

export function resolveQueueNumber(
  entryObj: any,
  item: any,
  req: any,
  rawDriverQn?: any,
): number | string | null {
  return (
    entryObj?.queueNumber ??
    entryObj?.queue_number ??
    entryObj?.queueNo ??
    (item as any).queue?.entry?.queueNumber ??
    (req as any).queue?.entry?.queueNumber ??
    (item as any).queue?.queueNumber ??
    (req as any).queue?.queueNumber ??
    req.queueNumber ??
    (item as any).queueNumber ??
    req.queue_number ??
    (item as any).queue_number ??
    req.queueNo ??
    (item as any).queueNo ??
    (item as any).queuePosition ??
    (req as any).queuePosition ??
    (req as any).driverQueue?.queueNumber ??
    (item as any).driverQueue?.queueNumber ??
    rawDriverQn ??
    null
  );
}

export function resolveLoadingOrderNumber(
  entryObj: any,
  item: any,
  req: any,
  rawDriverLo?: any,
): number | string | null {
  return (
    entryObj?.loadingOrderNumber ??
    entryObj?.loading_order_number ??
    entryObj?.loadingOrderNo ??
    entryObj?.loadingOrderId ??
    entryObj?.loadingNumber ??
    (item as any).queue?.entry?.loadingOrderNumber ??
    (req as any).queue?.entry?.loadingOrderNumber ??
    (item as any).queue?.loadingOrderNumber ??
    (req as any).queue?.loadingOrderNumber ??
    req.loadingOrderNumber ??
    (item as any).loadingOrderNumber ??
    req.loading_order_number ??
    (item as any).loading_order_number ??
    req.loadingOrderNo ??
    (item as any).loadingOrderNo ??
    req.loadingOrderId ??
    (item as any).loadingOrderId ??
    req.loadingNumber ??
    (item as any).loadingNumber ??
    req.loading_number ??
    (item as any).loading_number ??
    req.loadingOrder ??
    (item as any).loadingOrder ??
    req.loading_order ??
    (item as any).loading_order ??
    (req as any).driverQueue?.loadingOrderNumber ??
    (item as any).driverQueue?.loadingOrderNumber ??
    rawDriverLo ??
    null
  );
}

export function resolveEntryObject(
  item: any,
  req: any,
  rawDriverRequests?: any[],
  rawDecisions?: any[],
): any {
  return (
    (item as any).queue?.entry ||
    (req as any).queue?.entry ||
    (item as any).entry ||
    (req as any).entry ||
    (item as any).driverQueue?.entry ||
    (req as any).driverQueue?.entry ||
    (item as any).driverQueue ||
    (req as any).driverQueue ||
    (item as any).queue ||
    (req as any).queue ||
    (item as any).queueEntry ||
    (req as any).queueEntry ||
    (item as any).journey?.entry ||
    (req as any).journey?.entry ||
    (item as any).journey?.driverQueue?.entry ||
    (req as any).journey?.driverQueue?.entry ||
    (Array.isArray((item as any).decisions) && (item as any).decisions.find((d: any) => d?.entry)?.entry) ||
    (Array.isArray((req as any).decisions) && (req as any).decisions.find((d: any) => d?.entry)?.entry) ||
    (Array.isArray(item.driverRequests) && (item as any).driverRequests.find((d: any) => d?.entry)?.entry) ||
    (Array.isArray((req as any).driverRequests) && (req as any).driverRequests.find((d: any) => d?.entry)?.entry) ||
    (Array.isArray(rawDriverRequests) && rawDriverRequests.find((d: any) => d?.entry)?.entry) ||
    (Array.isArray(rawDecisions) && rawDecisions.find((d: any) => d?.entry)?.entry) ||
    null
  );
}
