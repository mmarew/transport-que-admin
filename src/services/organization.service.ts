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

/** Robust parser to check if response contains any organizations */
export function hasOrganizationData(payload: unknown): boolean {
  if (!payload) return false;
  if (Array.isArray(payload)) return payload.length > 0;
  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data.length > 0;
    if (Array.isArray(obj.organizations)) return obj.organizations.length > 0;
    if (Array.isArray(obj.rows)) return obj.rows.length > 0;
    if (Array.isArray(obj.records)) return obj.records.length > 0;
    if (typeof obj.count === "number" && obj.count > 0) return true;
    if (typeof obj.total === "number" && obj.total > 0) return true;
    if (obj.meta && typeof obj.meta === "object") {
      const meta = obj.meta as Record<string, unknown>;
      if (typeof meta.total === "number" && meta.total > 0) return true;
    }
    if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
      const nested = obj.data as Record<string, unknown>;
      if (Array.isArray(nested.data)) return nested.data.length > 0;
      if (Array.isArray(nested.organizations)) return nested.organizations.length > 0;
      if (Array.isArray(nested.rows)) return nested.rows.length > 0;
      if (Array.isArray(nested.records)) return nested.records.length > 0;
      if (typeof nested.total === "number" && nested.total > 0) return true;
      if (nested.meta && typeof nested.meta === "object") {
        const meta = nested.meta as Record<string, unknown>;
        if (typeof meta.total === "number" && meta.total > 0) return true;
      }
    }
  }
  return false;
}
