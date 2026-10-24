import type { TFunction } from "i18next";
import type {
  OrderDisplayItem,
  ShipperRequestPayloadItem,
} from "../../components/orders/OrdersTypes";
import { synthesizeCompanyTargetBatches } from "./mappers/ordersBatchSynthesizer";
import { createBatchBidLookup } from "./mappers/ordersCompanyBidsIndexer";
import { mapSingleShipperRequestItem } from "./mappers/ordersItemMapper";

export { parseBatchBids } from "./mappers/ordersBidParser";

export interface MapBackendOrdersParams {
  ordersData: unknown;
  batchesData: unknown;
  companyBidsData?: unknown;
  deletedIds: Set<string>;
  editedOrders: Record<string, OrderDisplayItem>;
  activeOrg: any;
  targetOrgId?: string;
  t: TFunction;
}

/**
 * Normalizes and maps raw backend shipper requests and company target batches
 * into unified UI OrderDisplayItem objects.
 */
export function mapBackendOrdersToDisplayItems({
  ordersData,
  batchesData,
  companyBidsData,
  deletedIds,
  editedOrders,
  activeOrg,
  targetOrgId,
  t,
}: MapBackendOrdersParams): OrderDisplayItem[] {
  const rawList = (ordersData as any)?.data as unknown as ShipperRequestPayloadItem[] | undefined;
  let baseList: OrderDisplayItem[] = [];

  // Index company bids from companyBidsData (GET /api/company/bids) by batch
  const getBidsForBatch = createBatchBidLookup(companyBidsData);

  // Pre-index batches from batchesData so step 1 rows can inherit numeric batchId,
  // batch totals, and bids/proposals
  const rawBatchList = (batchesData as any)?.data;
  const batchUniqueIdToBatch = new Map<string, any>();
  const batchIdToBatch = new Map<string, any>();
  if (Array.isArray(rawBatchList)) {
    for (const b of rawBatchList) {
      if (!b) continue;
      const matchedCompBids = getBidsForBatch(b);
      const batchObj =
        matchedCompBids.length > 0
          ? {
              ...b,
              companyBids: [
                ...(Array.isArray(b.companyBids) ? b.companyBids : []),
                ...matchedCompBids,
              ],
            }
          : b;
      const uid = String(
        batchObj.shipperRequestBatchUniqueId ||
        batchObj.batchUniqueId ||
        (batchObj as any).batch_unique_id ||
        (batchObj as any).uniqueId ||
        ""
      ).trim();
      if (uid) {
        batchUniqueIdToBatch.set(uid, batchObj);
      }
      if (batchObj.batchId != null) {
        batchIdToBatch.set(String(batchObj.batchId), batchObj);
      }
    }
  }

  // 1. Process standard individual and group shipper requests
  if (Array.isArray(rawList)) {
    baseList = rawList.map((item, idx) =>
      mapSingleShipperRequestItem({
        item,
        idx,
        batchUniqueIdToBatch,
        batchIdToBatch,
        getBidsForBatch,
        activeOrg,
        targetOrgId,
        t,
      })
    );
  }

  // 2. Process company target batches from /shipperRequestBatch
  if (Array.isArray(rawBatchList)) {
    const existingBatchIds = new Set(
      baseList.map((o) => (o.batchId != null ? String(o.batchId) : "")).filter(Boolean)
    );
    const existingBatchUniqueIds = new Set(
      baseList
        .map((o) => ((o as any).batchUniqueId ? String((o as any).batchUniqueId) : ""))
        .filter(Boolean)
    );

    const syntheticBatchOrders = synthesizeCompanyTargetBatches({
      rawBatchList,
      existingBatchIds,
      existingBatchUniqueIds,
      activeOrg,
      getBidsForBatch,
      t,
    });

    baseList.push(...syntheticBatchOrders);
  }

  return baseList
    .filter((o) => !deletedIds.has(o.id))
    .map((o) => editedOrders[o.id] || o);
}
