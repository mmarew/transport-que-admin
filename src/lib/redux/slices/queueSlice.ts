import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { QueueOrganization } from "@/types/queue";

interface QueueState {
  selectedOrgId: string | null;
  orgsCache: QueueOrganization[] | null;
}

const initialState: QueueState = {
  selectedOrgId: null,
  orgsCache: null,
};

const queueSlice = createSlice({
  name: "queue",
  initialState,
  reducers: {
    setSelectedOrgId(state, action: PayloadAction<string | null>) {
      state.selectedOrgId = action.payload;
    },
    setOrgsCache(state, action: PayloadAction<QueueOrganization[] | null>) {
      state.orgsCache = action.payload;
    },
    clearQueueState(state) {
      state.selectedOrgId = null;
      state.orgsCache = null;
    },
  },
});

export const { setSelectedOrgId, setOrgsCache, clearQueueState } = queueSlice.actions;
export default queueSlice.reducer;