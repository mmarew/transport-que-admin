import axios, { AxiosError } from "axios";
import { clearAuth, getToken } from "./auth";
import type {
  LoginResponse,
  VerifyOtpResponse,
  PaginatedResponse,
  QueueStatusResponse,
  QueueOrgMember,
  DriverQueueEntry,
  QueueOrgType,
  QueueOrgListItem,
  CreateOrderPayload,
  CreateOrderResponse,
} from "../types/queue";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearAuth();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export interface ApiErrorShape {
  status: string;
  message: string;
  statusCode: number;
}

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Partial<ApiErrorShape> | undefined;
    return data?.message || error.message;
  }
  return error instanceof Error ? error.message : "Unknown error";
}

// --- Auth ---
export const requestLoginOtp = (phoneNumber: string) =>
  api.post<LoginResponse>("/user/loginUser", { phoneNumber, roleId: 11 });

export const verifyOtp = (phoneNumber: string, OTP: string) =>
  api.post<VerifyOtpResponse>("/user/verifyUserByOTP", { phoneNumber, roleId: 11, OTP });

export const registerUser = (body: { fullName: string; phoneNumber: string; email?: string | null }) =>
  api.post<LoginResponse>("/user/createUser", {
    fullName: body.fullName,
    phoneNumber: body.phoneNumber,
    email: body.email || undefined,
    roleId: 11,
    statusId: 1,
  });

// --- Queue organizations ---
export const listQueueOrganizations = (params?: Record<string, string | number | boolean>) =>
  api.get<PaginatedResponse<QueueOrgListItem>>("/queueOrganization", { params });

export interface UpdateQueueOrgBody {
  queueOrganizationName?: string;
  queueOrganizationType?: QueueOrgType;
  queueOrganizationPhone?: string | null;
  queueOrganizationAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export const createQueueOrganization = (body: UpdateQueueOrgBody) =>
  api.post<{ message: string; data: { queueOrganizationUniqueId: string; approvalStatus: string } }>(
    "/queueOrganization",
    body,
  );

export const updateQueueOrganization = (id: string, body: UpdateQueueOrgBody) =>
  api.patch(`/queueOrganization/${id}`, body);

export const approveQueueOrganization = (
  id: string,
  body: {
    approvalStatus: "approved" | "rejected" | "suspended";
    approvalReason?: string;
    queueEnabled?: boolean;
  },
) =>
  api.patch<{ message: string; data: { queueOrganizationUniqueId: string; approvalStatus: string } }>(
    `/queueOrganization/${id}/approve`,
    body,
  );

export const listQueueOrgMembers = (id: string) =>
  api.get<{ message: string; data: QueueOrgMember[] }>(`/queueOrganization/${id}/members`);

// --- Driver queue ---
export const getQueueStatus = (queueOrganizationUniqueId: string, queueDate?: string) =>
  api.get<QueueStatusResponse>("/queue/status", {
    params: { queueOrganizationUniqueId, queueDate },
  });

export const manualCheckin = (body: { queueOrganizationUniqueId: string; vehicleDriverUniqueId: string; queueNumber?: number }) =>
  api.post<{ message: string; data: Pick<DriverQueueEntry, "queueUniqueId" | "queueNumber" | "status"> }>(
    "/queue/manualCheckin",
    body,
  );

export const overrideEntry = (queueUniqueId: string, body: { queueNumber: number; reason?: string }) =>
  api.patch(`/queue/entry/${queueUniqueId}/override`, body);

export const removeEntry = (queueUniqueId: string) =>
  api.delete(`/queue/entry/${queueUniqueId}`);

export const dispatch = (body: { queueOrganizationUniqueId: string; vehicleTypeUniqueId: string; shipperRequestUniqueId?: string }) =>
  api.post<{ message: string; data: { queueUniqueId: string; queueNumber: number; driverUserUniqueId: string; status: string } }>(
    "/queue/dispatch",
    body,
  );

// --- Shipper request (queue order) ---
export const createShipperRequest = (body: CreateOrderPayload) =>
  api.post<CreateOrderResponse>("/shipperRequest/createRequest", body);
