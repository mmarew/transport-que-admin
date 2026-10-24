import { createContext, useContext, useEffect, useCallback, useMemo, type ReactNode } from "react";
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
  /** Revokes the server session (bounded), then clears local auth state. */
  logout: () => Promise<void>;
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

  const setAuth = useCallback((value: StoredAuth) => {
    storeAuth(value);
    dispatch(setReduxAuth(value));
  }, [dispatch]);

  const logout = useCallback(async () => {
    disconnectSocket();
    // Give the server a short window to revoke the session and clear the
    // httpOnly cookie before local state is torn down. A dead network must not
    // trap the user, hence the bound.
    try {
      await Promise.race([
        api.post(appAPIs.logoutAPI),
        new Promise<void>((resolve) => {
          setTimeout(resolve, 2000);
        }),
      ]);
    } catch {
      // Logout is idempotent; clearing local state below is the fallback.
    }
    clearAuth();
    dispatch(logoutRedux());
  }, [dispatch]);

  const contextValue = useMemo(
    () => ({ auth, setAuth, logout }),
    [auth, setAuth, logout]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    const stored = getStoredAuth();
    return {
      auth: stored,
      setAuth: () => {},
      logout: () => Promise.resolve(),
    };
  }
  return ctx;
}
