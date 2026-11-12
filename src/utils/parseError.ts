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

const isGenericMessageString = (s?: unknown): boolean => {
  if (typeof s !== "string") return false;
  const l = s.trim().toLowerCase();
  return (
    l === "error" ||
    l === "validation error" ||
    l === "bad request" ||
    l === "bad request." ||
    l === "internal server error" ||
    l === "failed" ||
    l === "success"
  );
};

const resolveServerMsg = (data?: unknown): string | null => {
  if (!data) return null;
  if (typeof data === "string" && data.trim()) {
    return isGenericMessageString(data) ? null : data.trim();
  }

  if (Array.isArray(data)) {
    const list: string[] = [];
    for (const item of data) {
      const msg = resolveServerMsg(item);
      if (msg && !isGenericMessageString(msg)) {
        list.push(msg);
      }
    }
    return list.length > 0 ? list.join("; ") : null;
  }

  if (typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  // 1. Check array message (NestJS / class-validator style: { message: ["..."] })
  if (Array.isArray(d.message)) {
    const list = d.message
      .map((m) => (typeof m === "string" ? m : resolveServerMsg(m)))
      .filter((m): m is string => Boolean(m && !isGenericMessageString(m)));
    if (list.length > 0) return list.join("; ");
  }

  // 2. Specific field error collections (Express validator, Joi, etc.)
  for (const key of ["errors", "details"]) {
    const col = d[key];
    if (col && typeof col === "object") {
      const items = Array.isArray(col) ? col : Object.values(col);
      const list: string[] = [];
      for (const item of items) {
        if (typeof item === "string" && item.trim() && !isGenericMessageString(item)) {
          list.push(item.trim());
        } else if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          const msg =
            (typeof obj.message === "string" && obj.message) ||
            (typeof obj.msg === "string" && obj.msg) ||
            (typeof obj.error === "string" && obj.error) ||
            (typeof obj.detail === "string" && obj.detail) ||
            resolveServerMsg(obj);
          if (msg && !isGenericMessageString(msg)) {
            const prefix = typeof obj.field === "string" ? `${obj.field}: ` : typeof obj.path === "string" ? `${obj.path}: ` : "";
            list.push(`${prefix}${msg}`);
          }
        }
      }
      if (list.length > 0) return list.join("; ");
    }
  }

  // 3. Validation object
  if (d.validation && typeof d.validation === "object") {
    const v = d.validation as Record<string, unknown>;
    if (typeof v.message === "string" && !isGenericMessageString(v.message)) {
      return v.message;
    }
    if (Array.isArray(v.keys) && v.keys.length > 0) {
      return `Validation failed for: ${v.keys.join(", ")}`;
    }
  }

  // 4. Specific string message
  if (typeof d.message === "string" && d.message.trim() && !isGenericMessageString(d.message)) {
    return d.message.trim();
  }

  // 5. Check msg / detail / description
  for (const key of ["msg", "detail", "description"]) {
    const val = d[key];
    if (typeof val === "string" && val.trim() && !isGenericMessageString(val)) {
      return val.trim();
    }
  }

  if (typeof d.error === "string" && d.error.trim() && !isGenericMessageString(d.error)) {
    return d.error.trim();
  }

  if (typeof d.error === "object" && d.error !== null) {
    const nested = resolveServerMsg(d.error);
    if (nested) return nested;
  }

  // 6. Check data inner object
  if (typeof d.data === "string" && d.data.trim() && !isGenericMessageString(d.data)) {
    return d.data.trim();
  }
  if (typeof d.data === "object" && d.data !== null) {
    const inner = resolveServerMsg(d.data);
    if (inner) return inner;
  }

  // Fallback: if message was generic string but nothing better found
  if (typeof d.message === "string" && d.message.trim()) {
    return d.message.trim();
  }

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
