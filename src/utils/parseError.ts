import axios from "axios";

const GENERIC_ERROR = "An unexpected error occurred. Please try again.";

interface BackendErrorBody {
  status?: "success" | "error";
  message?: string;
  error?: string;
  code?: string;
  data?: unknown;
}

interface ApiError {
  response?: { status?: number; data?: Record<string, unknown> };
  message?: string;
  code?: string;
  name?: string;
  customMessage?: string;
  endpointUrl?: string;
}

interface ErrorHandlerOptions {
  silent?: boolean;
}

const resolveServerMsg = (data?: BackendErrorBody): string | null => {
  const e = data?.error;
  const m = data?.message;
  if (typeof e === "string" && e.trim() && e.toLowerCase() !== "error") return e;
  if (typeof m === "string" && m.trim() && m.toLowerCase() !== "error" && m.toLowerCase() !== "success") return m;
  if (typeof e === "string" && e.trim()) return e;
  if (typeof m === "string" && m.trim()) return m;
  return null;
};

const getHttpMessage = (httpStatus: number | undefined, serverMsg: string | null, code?: string): string => {
  if (serverMsg) return serverMsg;
  switch (httpStatus) {
    case 400:
      return code === "VALIDATION_ERROR"
        ? "Validation error. Please check your input."
        : "Bad request. Please check your input.";
    case 401: return "Session expired. Please log in again.";
    case 403: return "You do not have permission to perform this action.";
    case 404: return "The requested resource was not found.";
    case 409: return "This record already exists.";
    case 429: return "Too many requests. Please wait and try again.";
    case 500:
    case 502:
    case 503: return "Server error. Please try again later.";
    default: return GENERIC_ERROR;
  }
};

export const parseError = (error: unknown, options: ErrorHandlerOptions = {}): string => {
  if (!options.silent) {
    console.error("[parseError]", error);
  }

  if (axios.isAxiosError(error) || (typeof error === "object" && error !== null && "response" in error)) {
    const err = error as ApiError;
    const { status: httpStatus, data } = err.response ?? {};
    const serverMsg = resolveServerMsg(data as BackendErrorBody | undefined);
    return getHttpMessage(httpStatus, serverMsg, (data as BackendErrorBody)?.code);
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return GENERIC_ERROR;
};

export default parseError;
