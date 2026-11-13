const ACCEPTED_COMPANY_BID_STATUSES = new Set([
  "selected",
  "accepted",
  "accepted_by_shipper",
]);

export function isAcceptedCompanyBidStatus(...statuses: unknown[]): boolean {
  return statuses.some(
    (status) =>
      typeof status === "string" &&
      ACCEPTED_COMPANY_BID_STATUSES.has(status.trim().toLowerCase()),
  );
}
