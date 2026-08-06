import axios, { AxiosError } from "axios";
import { clearAuth, getToken } from "./auth";
import type {
  LoginResponse,
  VerifyOtpResponse,
  QueueOrganization,
  PaginatedResponse,
  QueueStatusResponse,
  QueueOrgMember,
  DriverQueueEntry,
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

// --- Queue organizations ---
export const listQueueOrganizations = (params?: Record<string, string | number | boolean>) =>
  api.get<PaginatedResponse<QueueOrganization>>("/queueOrganization", { params });

export const updateQueueOrganization = (
  id: string,
  body: Partial<Pick<QueueOrganization, "queueOrganizationName" | "queueOrganizationType" | "queueOrganizationPhone" | "queueOrganizationAddress" | "latitude" | "longitude">>,
) => api.patch(`/queueOrganization/${id}`, body);

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
