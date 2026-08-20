import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { clearAuth, getStoredAuth, storeAuth, type StoredAuth } from "../lib/auth";
import { connectSocket, disconnectSocket } from "../lib/socket";

interface AuthContextValue {
  auth: StoredAuth | null;
  setAuth: (auth: StoredAuth) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<StoredAuth | null>(() => getStoredAuth());

  useEffect(() => {
    if (auth?.token && auth?.userData?.phoneNumber) {
      connectSocket({ phoneNumber: auth.userData.phoneNumber });
    } else {
      disconnectSocket();
    }
  }, [auth]);

  const setAuth = (value: StoredAuth) => {
    storeAuth(value);
    setAuthState(value);
  };

  const logout = () => {
    disconnectSocket();
    clearAuth();
    setAuthState(null);
  };

  return <AuthContext.Provider value={{ auth, setAuth, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
