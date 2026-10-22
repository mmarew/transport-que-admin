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

const resolveServerMsg = (data?: unknown): string | null => {
  if (!data) return null;
  if (typeof data === "string" && data.trim()) return data;

  if (Array.isArray(data)) {
    for (const item of data) {
      const msg = resolveServerMsg(item);
      if (msg) return msg;
    }
    return null;
  }

  if (typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const isGenericMessage =
    typeof d.message === "string" &&
    (d.message.toLowerCase() === "error" ||
      d.message.toLowerCase() === "validation error" ||
      d.message.toLowerCase() === "bad request" ||
      d.message.toLowerCase() === "success");

  if (!isGenericMessage && typeof d.message === "string" && d.message.trim()) {
    return d.message;
  }
  if (typeof d.error === "string" && d.error.trim() && d.error.toLowerCase() !== "error") {
    return d.error;
  }
  if (typeof d.msg === "string" && d.msg.trim()) {
    return d.msg;
  }
  if (typeof d.detail === "string" && d.detail.trim()) {
    return d.detail;
  }
  if (d.details && typeof d.details === "object") {
    if (Array.isArray(d.details) && d.details.length > 0) {
      for (const item of d.details) {
        const m = resolveServerMsg(item);
        if (m) return m;
      }
    } else {
      for (const val of Object.values(d.details as Record<string, unknown>)) {
        const m = resolveServerMsg(val);
        if (m) return m;
      }
    }
  }
  if (d.validation && typeof d.validation === "object") {
    const v = d.validation as Record<string, unknown>;
    if (Array.isArray(v.keys) && v.keys.length > 0) {
      return `Validation failed for: ${v.keys.join(", ")}`;
    }
    if (typeof v.message === "string") return v.message;
  }
  if (d.errors && typeof d.errors === "object") {
    if (Array.isArray(d.errors) && d.errors.length > 0) {
      for (const item of d.errors) {
        const m = resolveServerMsg(item);
        if (m) return m;
      }
    } else {
      for (const val of Object.values(d.errors as Record<string, unknown>)) {
        const m = resolveServerMsg(val);
        if (m) return m;
      }
    }
  }
  if (typeof d.error === "object" && d.error !== null) {
    const m = resolveServerMsg(d.error);
    if (m) return m;
  }
  if (typeof d.data === "string" && d.data.trim()) return d.data;
  if (typeof d.data === "object" && d.data !== null) {
    const innerMsg = resolveServerMsg(d.data);
    if (innerMsg) return innerMsg;
  }
  if (typeof d.message === "string" && d.message.trim()) return d.message;
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

  // Axios error: { response: { status, data } }
  if (axios.isAxiosError(error) || (typeof error === "object" && error !== null && "response" in error)) {
    const err = error as ApiError;
    const { status: httpStatus, data } = err.response ?? {};
    const serverMsg = resolveServerMsg(data as BackendErrorBody | undefined);
    return getHttpMessage(httpStatus, serverMsg, (data as BackendErrorBody)?.code);
  }

  // RTK Query error: { status, data }
  if (typeof error === "object" && error !== null && "status" in error) {
    const rtkErr = error as { status?: number | string; data?: BackendErrorBody | Record<string, unknown> };
    const httpStatus = typeof rtkErr.status === "number" ? rtkErr.status : undefined;
    const serverMsg = resolveServerMsg(rtkErr.data as BackendErrorBody | undefined);
    return getHttpMessage(httpStatus, serverMsg, (rtkErr.data as BackendErrorBody)?.code);
  }

  // RTK Query serialized error: { message }
  if (typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
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
