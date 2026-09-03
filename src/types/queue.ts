export const QUEUE_ORG_TYPES = [
  "customs",
  "factory",
  "cement",
  "depot",
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
] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const QUEUE_ORG_ADMIN_ROLE = 11;

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

export interface DriverQueueEntry {
  queueUniqueId: string;
  queueNumber: number;
  joinedAt: string;
  status: QueueStatus;
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
  meta: { page: number; limit: number; total: number; totalPages: number };
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
  | "queue_order_assigned"
  | "queue_removed"
  | "queue_org_approved"
  | "queue_org_updated";

export interface QueueEventPayload {
  message: string;
  messageTypes: QueueEventMessageType;
  data?: Record<string, unknown>;
}
