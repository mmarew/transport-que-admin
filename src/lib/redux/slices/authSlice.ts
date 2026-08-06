import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getStoredAuth, storeAuth, clearAuth, type StoredAuth } from "@/lib/auth";

interface AuthState {
  auth: StoredAuth | null;
  hydrated: boolean;
}

const initialState: AuthState = {
  auth: null,
  hydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateAuth(state) {
      state.auth = getStoredAuth();
      state.hydrated = true;
    },
    setAuth(state, action: PayloadAction<StoredAuth>) {
      state.auth = action.payload;
      storeAuth(action.payload);
    },
    logout(state) {
      state.auth = null;
      clearAuth();
    },
  },
});

export const { hydrateAuth, setAuth, logout } = authSlice.actions;
export default authSlice.reducer;