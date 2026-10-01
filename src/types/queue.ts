// Mirrors the MySQL ENUM on QueueOrganization.queueOrganizationType and
// DOMAIN.QUEUE_ORGANIZATION_TYPES in the backend. mine/farm/port were added so
// those sites stop collapsing into "other", where nothing type-specific can
// attach to them.
export const QUEUE_ORG_TYPES = [
  "customs",
  "factory",
  "cement",
  "depot",
  "mine",
  "farm",
  "port",
  "other",
] as const;
export type QueueOrgType = (typeof QUEUE_ORG_TYPES)[number];

export const APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const QUEUE_STATUSES = [
  "waiting",
  "offered",
  "loaded",
  "removed",
  "completed",
] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const QUEUE_ORG_ADMIN_ROLE = 11;
export const QUEUE_DISPATCHER_ROLE = 12;

export interface AuthUser {
  userId: number;
  userUniqueId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  isPhoneVerified: number;
  isEmailVerified: number;
  userCreatedAt: string;
  roleId: number;
}

export interface LoginResponse {
  message: string;
  data: AuthUser;
}

export interface VerifyOtpResponse {
  message: string;
  token: string;
  userData: AuthUser;
}

export interface QueueOrganization {
  queueOrganizationId: number;
  queueOrganizationUniqueId: string;
  queueOrganizationName: string;
  queueOrganizationType: QueueOrgType;
  queueOrganizationPhone: string | null;
  queueOrganizationAddress: string | null;
  latitude: string | null;
  longitude: string | null;
  checkinRadiusKm?: number | null;
  approvalStatus: ApprovalStatus;
  approvalReason: string | null;
  queueEnabled: number;
  approvedBy: string | null;
  approvedAt: string | null;
  queueOrganizationCreatedAt: string;
  queueOrganizationCreatedBy: string;
  queueOrganizationUpdatedAt?: string;
  queueOrganizationUpdatedBy?: string;
  queueOrganizationDeletedAt?: string | null;
  queueOrganizationDeletedBy?: string | null;
  isDeleted: number;
}

export interface QueueOrgCreator {
  userUniqueId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
}

export interface QueueOrgListItem {
  organization: QueueOrganization;
  creator: QueueOrgCreator | null;
}

export interface QueueOrgMember {
  queueOrganizationMembershipUniqueId: string;
  userUniqueId: string;
  roleId: number;
  isActive: number;
  membershipStartDate: string;
  fullName: string;
  phoneNumber: string;
}

export interface QueueShipperRequest {
  shipperRequestId?: number;
  shipperRequestUniqueId?: string;
  shipperRequestBatchUniqueId?: string | null;
  userUniqueId?: string;
  vehicleTypeUniqueId?: string | null;
  vehicleTypeName?: string | null;
  journeyStatusId?: number | null;
  requestMode?: string | null;
  targetCompanyUniqueId?: string | null;
  originPlace?: string | null;
  destinationPlace?: string | null;
  shipperRequestCreatedAt?: string | null;
  shippableItemName?: string | null;
  shippableItemQtyInQuintal?: string | number | null;
  shippingDate?: string | null;
  deliveryDate?: string | null;
  shippingCost?: string | number | null;
  isPodRequired?: number | null;
  isCompletionSeen?: number | null;
  fullName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  queueOrganizationUniqueId?: string | null;
}

export interface DriverQueueEntry {
  queueUniqueId: string;
  queueNumber: number;
  joinedAt: string;
  status: QueueStatus | string;
  journeyStatusId?: number;
  journeyStatusName?: string;
  statusLabel?: string;
  offeredAt: string | null;
  loadedAt: string | null;
  vehicleDriverUniqueId: string;
  driverUserUniqueId: string;
  driverName: string;
  driverPhoneNumber: string;
  driverAddress?: string;
  driverLatitude?: string | number | null;
  driverLongitude?: string | number | null;
  vehicleTypeUniqueId: string;
  vehicleTypeName?: string;
  shipperRequestUniqueId: string | null;
  targetedShipperUserUUID?: string | null;
  shipperRequest?: QueueShipperRequest;
}

export interface QueueStatusPayload {
  queueOrganization: QueueOrganization;
  queueDate: string;
  totalWaiting: number;
  queues: Record<string, DriverQueueEntry[]>;
}

export interface QueueStatusResponse {
  message: string;
  data: QueueStatusPayload;
}

export interface PaginatedResponse<T> {
  message: string;
  data: T[];
  pagination: {
    currentPage: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export type RequestMode = "individual_target" | "company_target";

export interface VehicleType {
  vehicleTypeUniqueId: string;
  vehicleTypeName: string;
  vehicleTypeDescription: string | null;
  carryingCapacity: number;
  vehicleTypeIconName: string | null;
}

export interface PhotonFeature {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export interface CreateOrderPayload {
  queueOrganizationUniqueId: string;
  shipperPhoneNumber: string;
  shipperRequestBatchUniqueId: string;
  requestMode: RequestMode;
  numberOfVehicles: number;
  deliveryDate: string;
  requestType: "shipper";
  destination: {
    latitude: number;
    longitude: number;
    description: string;
  };
  vehicle: {
    vehicleTypeUniqueId: string;
  };
  shippableItemName: string;
  shippableItemQtyInQuintal: number;
  shippingCost: number;
  shippingDate: string;
  originLocation: {
    latitude: number;
    longitude: number;
    description: string;
  };
  isBiddingApproved?: boolean;
}

export interface CreateOrderResponse {
  message: string;
  data: {
    totalRecords: Record<string, number>;
  };
}

export type QueueEventMessageType =
  | "queue_checkin_confirmed"
  | "queue_position_changed"
  | "queue_order_offered"
  | "queue_order_rejected"
  | "queue_refusal_moved_to_back"
  | "queue_order_assigned"
  | "queue_order_cancelled"
  | "queue_position_reserved"
  | "queue_removed"
  | "queue_org_approved"
  | "queue_org_updated"
  | "queue_org_deleted"
  | "queue_member_added";

export interface QueueEventPayload {
  message: string;
  messageTypes: QueueEventMessageType;
  data?: Record<string, unknown>;
}

export interface QueueEntryHistoryItem {
  historyUniqueId: string;
  columnName: string;
  oldValue: string;
  performedBy: string;
  performedAt: string;
}

/**
 * A real DriverBid row — GET /api/queue/bidding/order/:shipperRequestUniqueId/bids
 *
 * This is the authoritative list of who actually bid on an order, ordered
 * cheapest-first by the backend. The console previously rebuilt an equivalent
 * list from the shipper-request payload instead, which silently disagreed with
 * the board whenever the two drifted.
 */
export interface DriverBid {
  driverBidUniqueId: string;
  driverBidId: number;
  shipperRequestUniqueId: string;
  shipperRequestBatchUniqueId?: string | null;
  driverUserUniqueId: string;
  driverRequestUniqueId?: string | null;
  bidAmount: number | string;
  bidNotes?: string | null;
  /** pending | selected | not_selected | withdrawn | expired */
  bidStatus: string;
  driverBidCreatedAt: string;
  fullName?: string | null;
  phoneNumber?: string | null;
}

export interface DriverBidPagination {
  currentPage: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}
