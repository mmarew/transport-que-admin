const AUTH_STORAGE_KEY = "queueadmin:auth";

export interface StoredAuth {
  token: string;
  userData: {
    userId: number;
    userUniqueId: string;
    fullName: string;
    phoneNumber: string;
    email: string;
    roleId: number;
  };
}

export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token) return parsed as StoredAuth;
    }
    return null;
  } catch {
    return null;
  }
}

export function storeAuth(auth: StoredAuth): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getToken(): string | null {
  return getStoredAuth()?.token ?? null;
}
