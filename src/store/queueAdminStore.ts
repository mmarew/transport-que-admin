import { create } from "zustand";
import { persist } from "zustand/middleware";

interface QueueAdminStore {
  selectedOrgId: string;
  socketConnected: boolean;
  setSelectedOrgId: (id: string) => void;
  setSocketConnected: (connected: boolean) => void;
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
      partialize: (state) => ({ selectedOrgId: state.selectedOrgId }),
    },
  ),
);
