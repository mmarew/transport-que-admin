import { api } from "../lib/api";
import type {
  PaginatedResponse,
  QueueOrgListItem,
  QueueOrgMember,
  QueueOrgType,
} from "../types/queue";

export interface UpdateQueueOrgBody {
  queueOrganizationName?: string;
  queueOrganizationType?: QueueOrgType | string;
  queueOrganizationPhone?: string | null;
  queueOrganizationAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  checkinRadiusKm?: number | null;
}

export interface QueueOrgResponse {
  message: string;
  data: {
    queueOrganizationUniqueId: string;
    approvalStatus: string;
  };
}

/** List all queue organizations (paginated) */
export const listQueueOrganizations = (
  params?: Record<string, string | number | boolean>,
) => api.get<PaginatedResponse<QueueOrgListItem>>("/queueOrganization", { params });

/** Create a new queue organization */
export const createQueueOrganization = (body: UpdateQueueOrgBody) =>
  api.post<QueueOrgResponse>("/queueOrganization", body);

/** Update an existing queue organization */
export const updateQueueOrganization = (id: string, body: UpdateQueueOrgBody) =>
  api.patch(`/queueOrganization/${id}`, body);

/** Approve, reject, or suspend a queue organization */
export const approveQueueOrganization = (
  id: string,
  body: {
    approvalStatus: "approved" | "rejected" | "suspended";
    approvalReason?: string;
    queueEnabled?: boolean;
  },
) =>
  api.patch<QueueOrgResponse>(`/queueOrganization/${id}/approve`, body);

/** List members of a queue organization */
export const listQueueOrgMembers = (id: string) =>
  api.get<{ message: string; data: QueueOrgMember[] }>(
    `/queueOrganization/${id}/members`,
  );

/** Check if the queue-organization list response contains any organizations.
 * Real backend shape: { message; data: QueueOrgListItem[]; pagination: {...} }
 * so a single array-length check on `data` is sufficient. */
export function hasOrganizationData(payload: unknown): boolean {
  const list = (payload as { data?: unknown } | null)?.data;
  return Array.isArray(list) && list.length > 0;
}
