import type { StoredAuth } from "@/lib/auth";
import type {
  DriverQueueEntry,
  QueueOrgMember,
  QueueOrgType,
  QueueOrganization,
  QueueOrgListItem,
  VehicleType,
} from "@/types/queue";

export interface ApiData<T> {
  message: string;
  data: T;
}

export interface AuthUserRecord {
  userId: number;
  userUniqueId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  roleId: number;
}

export interface RequestOtpArgs {
  phoneNumber: string;
  roleId: number;
}

export type RequestOtpResponse = ApiData<AuthUserRecord>;

export interface VerifyOtpArgs {
  phoneNumber: string;
  roleId: number;
  OTP: string;
}

export interface VerifyOtpResponse {
  message: string;
  token: string;
  userData: StoredAuth["userData"];
}

export interface RegisterUserArgs {
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  roleId: number;
  statusId: number;
}

export type RegisterUserResponse = ApiData<AuthUserRecord>;

export type QueueOrgListArgs = Record<string, string | number | boolean> | void;

export type QueueOrgUniqueIdResponse = ApiData<{ queueOrganizationUniqueId: string }>;

export type UpdateQueueOrgArgs = { id: string; body: Partial<QueueOrganization> };

export type ApproveQueueOrgArgs = {
  id: string;
  body: {
    approvalStatus: "approved" | "rejected" | "suspended";
    approvalReason?: string;
    queueEnabled?: boolean;
  };
};

export type ApproveQueueOrgResponse = ApiData<{
  queueOrganizationUniqueId: string;
  approvalStatus: string;
}>;

export type DeleteQueueOrgResponse = {
  message: string;
  data?: { queueOrganizationUniqueId: string };
};

export interface CreateQueueOrgArgs {
  queueOrganizationName: string;
  queueOrganizationType: QueueOrgType;
  queueOrganizationPhone?: string | null;
  queueOrganizationAddress: string;
  latitude?: number | null;
  longitude?: number | null;
}

export type CreateQueueOrgResponse = ApiData<{
  queueOrganizationUniqueId: string;
  approvalStatus: string;
  alreadyExisted?: boolean;
}>;

export type QueueOrgListResponse = ApiData<QueueOrgListItem>;

export type QueueOrgMemberListResponse = ApiData<QueueOrgMember[]>;

export type AddQueueOrgMemberArgs = {
  id: string;
  userUniqueId: string;
  roleId: number;
  isActive?: boolean;
};

export type AddQueueOrgMemberResponse = ApiData<QueueOrgMember>;

export type GetQueueStatusArgs = {
  queueOrganizationUniqueId: string;
  queueDate?: string;
};

export type QueueStatusTagKey =
  `${string}|${string | "today"}`;

export interface ManualCheckinArgs {
  queueOrganizationUniqueId: string;
  vehicleDriverUniqueId: string;
  queueNumber?: number;
}

export type ManualCheckinResponse = ApiData<
  Pick<DriverQueueEntry, "queueUniqueId" | "queueNumber" | "status">
>;

export interface DispatchQueueArgs {
  queueOrganizationUniqueId: string;
  vehicleTypeUniqueId: string;
  shipperRequestUniqueId?: string;
}

export type DispatchQueueResponse = ApiData<{
  queueUniqueId: string;
  queueNumber: number;
  driverUserUniqueId: string;
  status: string;
}>;

export interface AcceptDriverRequestArgs {
  queueOrganizationUniqueId: string;
  shipperRequestUniqueId: string;
  driverPhoneNumber?: string;
  driverUserUniqueId?: string;
  driverRequestId?: number | string;
  driverRequestUniqueId?: string;
  journeyDecisionUniqueId?: string;
  vehicleTypeUniqueId?: string;
  queueUniqueId?: string;
}

export interface AcceptDriverRequestResponse {
  message: string;
  data?: unknown;
}

export type OverrideEntryArgs = {
  queueUniqueId: string;
  body: { queueNumber: number; reason?: string };
};

export type OverrideEntryResponse = ApiData<DriverQueueEntry>;

export interface RemoveEntryResponse {
  message: string;
  data: { queueUniqueId: string };
}

export type CreateOrderResponse = ApiData<{ totalRecords: Record<string, number> }>;

export interface ShipperRequestDriverRequest {
  driverRequestId?: number;
  driverRequestUniqueId?: string;
  userUniqueId: string;
  journeyStatusId?: number | null;
  fullName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  vehicleOfDriver?: unknown;
  driverProfilePhoto?: string | null;
}

export interface ShipperRequestDecision {
  driverRequestId?: number | string;
  driverRequestUniqueId?: string;
  driverUserUniqueId?: string;
  journeyDecisionUniqueId?: string;
  userUniqueId?: string;
  phoneNumber?: string;
  [key: string]: unknown;
}

export interface ShipperRequestListItem {
  shipperRequestUniqueId?: string;
  shipperRequest: {
    shipperRequestUniqueId: string;
    shipperRequestBatchUniqueId: string;
    userUniqueId: string;
    vehicleTypeUniqueId: string;
    requestMode: string;
    originPlace: string;
    originLatitude: string;
    originLongitude: string;
    destinationPlace: string;
    destinationLatitude: string;
    destinationLongitude: string;
    shippableItemName: string;
    shippableItemQtyInQuintal: string;
    shippingDate: string;
    deliveryDate: string;
    shippingCost: string;
    shipperRequestCreatedAt: string;
    journeyStatusId: number;
    fullName: string;
    phoneNumber: string;
    vehicleTypeName: string;
    queueOrganizationUniqueId: string;
  };
  driverRequests: ShipperRequestDriverRequest[];
  decisions: ShipperRequestDecision[];
  journey: Record<string, unknown>;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

export interface GetShipperRequestsArgs {
  queueOrganizationUniqueId: string;
  target?: "all" | "single";
  page?: number;
  limit?: number;
  journeyStatusId?: string;
}

export interface GetShipperRequestsResponse {
  message: string;
  data: ShipperRequestListItem[];
  pagination: PaginationMeta;
}

export interface ShipperRequestBatchBid {
  bidUniqueId?: string;
  bidderUserUniqueId?: string;
  companyUniqueId?: string;
  companyName?: string | null;
  offerCost?: number | string | null;
  journeyStatusId?: number | null;
  [key: string]: unknown;
}

export interface ShipperRequestBatch {
  batchId: number;
  batchUniqueId: string;
  shipperUserUniqueId?: string;
  vehicleTypeUniqueId?: string;
  totalVehicles: number;
  requestMode: string;
  targetCompanyUniqueId?: string | null;
  queueOrganizationUniqueId: string;
  originLatitude?: string | number | null;
  originLongitude?: string | number | null;
  originPlace?: string | null;
  destinationLatitude?: string | number | null;
  destinationLongitude?: string | number | null;
  destinationPlace?: string | null;
  shippableItemName?: string | null;
  shippableItemQtyInQuintal?: string | number | null;
  shippingDate?: string | null;
  deliveryDate?: string | null;
  shippingCost?: string | number | null;
  isPodRequired?: number | boolean;
  journeyStatusId?: number;
  batchCreatedAt?: string | null;
  batchUpdatedAt?: string | null;
  batchDeletedAt?: string | null;
  batchCreatedBy?: string | null;
  batchCreatedByRoleId?: number | null;
  shipperName?: string | null;
  shipperPhone?: string | null;
  vehicleTypeName?: string | null;
  journeyStatusName?: string | null;
  targetCompanyName?: string | null;
  bidSummary?: {
    total?: number;
    submitted?: number;
    accepted?: number;
    rejected?: number;
    cancelledByCompany?: number;
    expired?: number;
    joinedCompanyCount?: number;
  } | null;
  bids?: ShipperRequestBatchBid[];
  acceptedOffer?: Record<string, unknown> | null;
}

export interface GetShipperRequestBatchesArgs {
  queueOrganizationUniqueId: string;
  requestMode?: string;
  includeBids?: boolean;
  page?: number;
  limit?: number;
}

export interface GetShipperRequestBatchesResponse {
  message: string;
  data: ShipperRequestBatch[];
  pagination?: PaginationMeta;
}

export type VehicleTypeListResponse = ApiData<VehicleType[]>;

export interface VehicleDriverListItem {
  vehicleDriverUniqueId: string;
  vehicleTypeUniqueId: string;
  driverName: string;
  driverPhoneNumber: string;
  vehicleTypeName: string;
}

export type VehicleDriverListResponse = ApiData<VehicleDriverListItem[]>;

export type VehicleDriverListArgs = { queueOrganizationUniqueId: string } | void;