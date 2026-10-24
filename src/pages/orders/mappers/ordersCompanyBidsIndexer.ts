/**
 * Pre-indexes company bids from GET /api/company/bids by numeric batchId and UUID batchUniqueId.
 * Provides a fast lookup function `getBidsForBatch(batch)` to retrieve all bids associated with a batch.
 */
export function createBatchBidLookup(companyBidsData: unknown): (b: any) => any[] {
  const rawCompanyBids: any[] = Array.isArray(companyBidsData)
    ? companyBidsData
    : Array.isArray((companyBidsData as any)?.data)
    ? (companyBidsData as any).data
    : [];

  const bidsByBatchId = new Map<string, any[]>();
  const bidsByBatchUniqueId = new Map<string, any[]>();

  for (const bid of rawCompanyBids) {
    if (!bid) continue;
    const bId =
      bid.batchId != null
        ? String(bid.batchId).trim()
        : bid.shipperRequestBatchId != null && !String(bid.shipperRequestBatchId).includes("-")
        ? String(bid.shipperRequestBatchId).trim()
        : (bid as any).batch?.batchId != null
        ? String((bid as any).batch.batchId).trim()
        : (bid as any).shipperRequestBatch?.batchId != null
        ? String((bid as any).shipperRequestBatch.batchId).trim()
        : null;

    if (bId) {
      if (!bidsByBatchId.has(bId)) bidsByBatchId.set(bId, []);
      bidsByBatchId.get(bId)!.push(bid);
    }

    const bUid =
      bid.shipperRequestBatchUniqueId ||
      (bid.shipperRequestBatchId && String(bid.shipperRequestBatchId).includes("-") ? bid.shipperRequestBatchId : null) ||
      (bid as any).batch?.batchUniqueId ||
      (bid as any).shipperRequestBatch?.batchUniqueId ||
      null;

    if (bUid) {
      const cleanUid = String(bUid).trim();
      if (!bidsByBatchUniqueId.has(cleanUid)) bidsByBatchUniqueId.set(cleanUid, []);
      bidsByBatchUniqueId.get(cleanUid)!.push(bid);
    }
  }

  return (b: any): any[] => {
    if (!b) return [];
    const list: any[] = [];
    const seen = new Set<string>();
    const bId =
      b.batchId != null
        ? String(b.batchId).trim()
        : b.shipperRequestBatchId != null && !String(b.shipperRequestBatchId).includes("-")
        ? String(b.shipperRequestBatchId).trim()
        : null;
    const bUid =
      b.batchUniqueId ||
      b.shipperRequestBatchUniqueId ||
      (b.shipperRequestBatchId && String(b.shipperRequestBatchId).includes("-") ? b.shipperRequestBatchId : null) ||
      (b.uniqueId && String(b.uniqueId).includes("-") ? b.uniqueId : null);

    if (bId && bidsByBatchId.has(bId)) {
      for (const item of bidsByBatchId.get(bId)!) {
        const key = item.companyBidRequestUniqueId || item.id || JSON.stringify(item);
        if (!seen.has(key)) {
          seen.add(key);
          list.push(item);
        }
      }
    }
    if (bUid && bidsByBatchUniqueId.has(String(bUid).trim())) {
      for (const item of bidsByBatchUniqueId.get(String(bUid).trim())!) {
        const key = item.companyBidRequestUniqueId || item.id || JSON.stringify(item);
        if (!seen.has(key)) {
          seen.add(key);
          list.push(item);
        }
      }
    }
    return list;
  };
}
