import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useDispatch } from "react-redux";
import { clearAuth, getStoredAuth, storeAuth, type StoredAuth } from "../lib/auth";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { setAuth as setReduxAuth, logout as logoutRedux, hydrateAuth } from "../lib/redux/slices/authSlice";

export interface AuthContextValue {
  auth: StoredAuth | null;
  setAuth: (auth: StoredAuth) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const [auth, setAuthState] = useState<StoredAuth | null>(() => getStoredAuth());

  useEffect(() => {
    dispatch(hydrateAuth());
  }, [dispatch]);

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
    dispatch(setReduxAuth(value));
  };

  const logout = () => {
    disconnectSocket();
    clearAuth();
    setAuthState(null);
    dispatch(logoutRedux());
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
