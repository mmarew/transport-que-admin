const AUTH_STORAGE_KEY = "queueadmin:user";
const LEGACY_AUTH_STORAGE_KEY = "queueadmin:auth";

export interface StoredUser {
  userId: number;
  userUniqueId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  roleId: number;
}

export interface StoredAuth {
  userData: StoredUser;
}

// Sessions are tracked by an httpOnly cookie (JWT never touches JS-accessible
// storage). We only persist the non-secret user profile so the UI can render
// the user's name/role across reloads. A one-time migration drops any legacy
// queueadmin:auth record that still held a JWT token.
const readStorage = (key: string): string | null => {
  const localValue = localStorage.getItem(key);
  if (localValue != null) return localValue;
  const legacy = sessionStorage.getItem(key);
  if (legacy) {
    localStorage.setItem(key, legacy);
    sessionStorage.removeItem(key);
    return legacy;
  }
  return null;
};

const purgeLegacyAuth = (): void => {
  const legacy = readStorage(LEGACY_AUTH_STORAGE_KEY);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy);
      if (parsed?.userData) {
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({ userData: parsed.userData }),
        );
      }
    } catch {
      // corrupt legacy record — just drop it
    }
    localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  }
};

export function getStoredAuth(): StoredAuth | null {
  try {
    purgeLegacyAuth();
    const raw = readStorage(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.userData) return parsed as StoredAuth;
    }
    return null;
  } catch {
    return null;
  }
}

export function storeAuth(auth: StoredAuth): void {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ userData: auth.userData }),
  );
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
}

/** JWT is delivered via httpOnly cookie; there is no token to read. */
export function getToken(): string | null {
  return null;
}