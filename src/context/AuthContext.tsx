import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useDispatch } from "react-redux";
import { clearAuth, getStoredAuth, storeAuth, type StoredAuth } from "../lib/auth";
import { api } from "../lib/api";
import appAPIs from "../utils/constant";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { setAuth as setReduxAuth, logout as logoutRedux } from "../lib/redux/slices/authSlice";
import { useAppSelector } from "../lib/redux/hooks";

export interface AuthContextValue {
  auth: StoredAuth | null;
  setAuth: (auth: StoredAuth) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  // Single source of truth: the redux auth slice. A 401 anywhere in the app
  // dispatches logout() (see lib/redux/api/base.ts), which flips this to null
  // too — so authed pages unmount instead of re-firing doomed requests.
  const auth = useAppSelector((state) => state.auth.auth);

  useEffect(() => {
    if (auth?.userData) {
      connectSocket(auth.userData?.phoneNumber ? { phoneNumber: auth.userData.phoneNumber } : undefined);
    } else {
      disconnectSocket();
    }
  }, [auth]);

  const setAuth = (value: StoredAuth) => {
    storeAuth(value);
    dispatch(setReduxAuth(value));
  };

  const logout = () => {
    disconnectSocket();
    // Best-effort server-side logout to clear the httpOnly cookie.
    void api.post(appAPIs.logoutAPI).catch(() => {});
    clearAuth();
    dispatch(logoutRedux());
  };

  return <AuthContext.Provider value={{ auth, setAuth, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    const stored = getStoredAuth();
    return {
      auth: stored,
      setAuth: () => {},
      logout: () => {},
    };
  }
  return ctx;
}
