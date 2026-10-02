import type { DriverBid } from "@/types/queue";
import type { ShipperRequestDriverInfo } from "../../queue/ShipperRequestsModal";

/**
 * Convert a real DriverBid row into the shape the bids table already renders.
 *
 * The table, filter and sort all predate the bidding board and consume
 * ShipperRequestDriverInfo, so mapping here keeps every one of them working
 * unchanged while switching the data source from the reconstructed shipper
 * payload to the authoritative DriverBid rows.
 */
export function mapDriverBidToRow(bid: DriverBid): ShipperRequestDriverInfo {
  return {
    driverBidUniqueId: bid.driverBidUniqueId,
    driverBidId: bid.driverBidId,
    bidStatus: bid.bidStatus,
    userUniqueId: bid.driverUserUniqueId,
    driverRequestUniqueId: bid.driverRequestUniqueId ?? undefined,
    shipperRequestUniqueId: bid.shipperRequestUniqueId,
    fullName: bid.fullName,
    phoneNumber: bid.phoneNumber,
    // The board's money column is bidAmount; the table reads bidAmount first and
    // falls back to offerCost / proposedCost, so keep them in sync.
    bidAmount: bid.bidAmount,
    offerCost: bid.bidAmount,
    proposedCost: bid.bidAmount,
    // Bid notes are the driver's own words and have no equivalent column, so
    // surface them where the row can show provenance.
    currentPlace: bid.bidNotes ?? null,
  };
}

export function mapDriverBidsToRows(bids: DriverBid[]): ShipperRequestDriverInfo[] {
  return (bids || []).map(mapDriverBidToRow);
}

/**
 * A bid can only be acted on while it is still live and not already resolved.
 * `withdrawn` means the driver pulled it; `expired` means the window closed.
 */
export function isBidActionable(bidStatus?: string | null): boolean {
  if (!bidStatus) return false;
  const status = bidStatus.toLowerCase();
  return status === "pending" || status === "selected";
}