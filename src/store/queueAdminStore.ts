import { create } from "zustand";
import { persist } from "zustand/middleware";

interface QueueAdminStore {
  selectedOrgId: string;
  socketConnected: boolean;
  setSelectedOrgId: (id: string) => void;
  setSocketConnected: (connected: boolean) => void;
}

// Ensure stale userCreatedOrgs from prior testing is cleaned from localStorage
try {
  const rawStore = localStorage.getItem("queueadmin:store");
  if (rawStore) {
    const parsed = JSON.parse(rawStore);
    if (parsed?.state?.userCreatedOrgs) {
      delete parsed.state.userCreatedOrgs;
      localStorage.setItem("queueadmin:store", JSON.stringify(parsed));
    }
  }
} catch {
  // ignore
}

export const useQueueAdminStore = create<QueueAdminStore>()(
  persist(
    (set) => ({
      selectedOrgId: "",
      socketConnected: false,
      setSelectedOrgId: (selectedOrgId) => set({ selectedOrgId }),
      setSocketConnected: (socketConnected) => set({ socketConnected }),
    }),
    {
      name: "queueadmin:store",
      partialize: (state) => ({
        selectedOrgId: state.selectedOrgId,
      }),
    },
  ),
);

