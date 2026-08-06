export const QUEUE_ORG_TYPES = ["customs", "factory", "cement", "depot", "other"] as const;
export type QueueOrgType = (typeof QUEUE_ORG_TYPES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const QUEUE_STATUSES = ["waiting", "offered", "loaded", "removed"] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const ROLE_QUEUE_ORG_ADMIN = 11;

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
  isDeleted: number;
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
  vehicleTypeUniqueId: string;
  shipperRequestUniqueId: string | null;
}

export interface QueueStatusResponse {
  message: string;
  data: {
    queueOrganizationUniqueId: string;
    queueDate: string;
    totalWaiting: number;
    queues: Record<string, DriverQueueEntry[]>;
  };
}

export interface PaginatedResponse<T> {
  message: string;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
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
