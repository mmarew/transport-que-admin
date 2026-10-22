import { getStoredAuth } from "../lib/auth";

function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
      const v = localStorage.getItem(key);
      if (v != null) return v;
    }
  } catch {
    // ignore
  }
  try {
    if (typeof sessionStorage !== "undefined" && typeof sessionStorage.getItem === "function") {
      const v = sessionStorage.getItem(key);
      if (v != null) return v;
    }
  } catch {
    // ignore
  }
  try {
    const g = globalThis as { localStorage?: Storage; sessionStorage?: Storage };
    if (g?.localStorage && typeof g.localStorage.getItem === "function") {
      const v = g.localStorage.getItem(key);
      if (v != null) return v;
    }
    if (g?.sessionStorage && typeof g.sessionStorage.getItem === "function") {
      const v = g.sessionStorage.getItem(key);
      if (v != null) return v;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Resolves the target company unique ID from explicit user input,
 * active user session data, or browser local/session storage.
 *
 * This ensures that when a transport company creates a shipper request (or when an
 * order targets a company), `targetCompanyUniqueId` is accurately provided to satisfy
 * the backend requirement: "targetCompanyUniqueId is required when a transport company creates a request".
 */
export function resolveTargetCompanyUniqueId(explicitId?: string | null): string | undefined {
  if (explicitId && typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }

  // 1. Check getStoredAuth().userData
  try {
    const auth = getStoredAuth();
    const user = (auth?.userData || {}) as Record<string, unknown>;
    const candidates = [
      user.targetCompanyUniqueId,
      user.companyUniqueId,
      (user.company as Record<string, unknown> | undefined)?.companyUniqueId,
      (user.company as Record<string, unknown> | undefined)?.uniqueId,
      (user.transportCompany as Record<string, unknown> | undefined)?.companyUniqueId,
      (user.transportCompany as Record<string, unknown> | undefined)?.uniqueId,
      (user.companyData as Record<string, unknown> | undefined)?.companyUniqueId,
      (user.companyData as Record<string, unknown> | undefined)?.uniqueId,
      user.companyId,
      user.targetCompanyId,
    ];
    for (const c of candidates) {
      if (c && typeof c === "string" && c.trim()) {
        return c.trim();
      }
    }
  } catch {
    // ignore
  }

  // 2. Direct browser storage keys
  const storageKeys = [
    "activeCompanyId",
    "companyUniqueId",
    "targetCompanyUniqueId",
    "selectedCompanyId",
  ];

  for (const key of storageKeys) {
    const val = getStorageItem(key);
    if (val && typeof val === "string" && val.trim()) {
      return val.trim();
    }
  }

  // 3. Check cachedCompanies
  try {
    const rawCached = getStorageItem("cachedCompanies");
    if (rawCached) {
      const parsed = JSON.parse(rawCached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const id =
          parsed[0]?.companyUniqueId ||
          parsed[0]?.uniqueId ||
          parsed[0]?.id;
        if (id && typeof id === "string" && id.trim()) {
          return id.trim();
        }
      }
    }
  } catch {
    // ignore
  }

  // 4. Check drRoute_auth
  try {
    const rawDr = getStorageItem("drRoute_auth");
    if (rawDr) {
      const parsed = JSON.parse(rawDr);
      const id =
        parsed?.activeCompanyId ||
        parsed?.userData?.companyUniqueId ||
        parsed?.userData?.targetCompanyUniqueId ||
        parsed?.userData?.company?.companyUniqueId;
      if (id && typeof id === "string" && id.trim()) {
        return id.trim();
      }
    }
  } catch {
    // ignore
  }

  // 5. Fallback: userUniqueId if user session exists
  try {
    const auth = getStoredAuth();
    const user = auth?.userData;
    if (user?.userUniqueId && typeof user.userUniqueId === "string" && user.userUniqueId.trim()) {
      return user.userUniqueId.trim();
    }
  } catch {
    // ignore
  }

  return undefined;
}
