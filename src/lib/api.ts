import axios, { AxiosError } from "axios";
import { clearAuth } from "./auth";
import { getBaseUrl } from "@/utils/baseUrl";

export const API_BASE_URL = getBaseUrl();

/** Shared axios instance — all services import this.
 * Auth is carried by the httpOnly session cookie; `withCredentials` sends it. */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Handle 401 globally — clear auth and redirect to login
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
