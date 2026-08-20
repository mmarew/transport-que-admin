import { io, Socket } from "socket.io-client";
import { getStoredAuth } from "./auth";
import { useQueueAdminStore } from "../store/queueAdminStore";
import type { AuthUser } from "../types/queue";

export type QueueEventHandler = (payload: {
  message: string;
  messageTypes: string;
  data?: Record<string, unknown>;
}) => void;

let socket: Socket | null = null;
const queueEventHandlers = new Set<QueueEventHandler>();
let currentSubscription: { queueOrganizationUniqueId: string; queueDate?: string } | null = null;

export function connectSocket(user?: Pick<AuthUser, "phoneNumber">): Socket {
  if (socket) {
    if (socket.connected) return socket;
    if (socket.active) return socket;
  }

  const socketUrl =
    import.meta.env.VITE_WEBSOCKET_URL ||
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://dynamicsroute.tech";

  const storedAuth = getStoredAuth();
  const token = storedAuth?.token;
  const phoneNumber = user?.phoneNumber || storedAuth?.userData?.phoneNumber;

  socket = io(socketUrl, {
    transports: ["websocket", "polling"],
    auth: {
      user: "queueOrgAdmin",
      phoneNumber: phoneNumber,
      token: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : undefined,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    useQueueAdminStore.getState().setSocketConnected(true);
    if (currentSubscription) {
      socket?.emit("queue:subscribe", currentSubscription);
    }
  });

  socket.on("disconnect", () => {
    useQueueAdminStore.getState().setSocketConnected(false);
  });

  socket.on("connect_error", (err) => {
    console.warn("[WebSocket] Connection error:", err.message);
    useQueueAdminStore.getState().setSocketConnected(false);
  });

  socket.on("queue:subscribed", () => {
    useQueueAdminStore.getState().setSocketConnected(true);
  });

  socket.on("queue", (msg: unknown) => {
    try {
      const parsed = typeof msg === "string" ? JSON.parse(msg) : msg;
      queueEventHandlers.forEach((handler) => {
        try {
          handler(parsed);
        } catch (err) {
          console.error("Error in queue event listener:", err);
        }
      });
    } catch {
      // ignore parse errors
    }
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    useQueueAdminStore.getState().setSocketConnected(false);
  }
}

export function subscribeToQueue(queueOrganizationUniqueId: string, queueDate?: string): void {
  currentSubscription = { queueOrganizationUniqueId, queueDate };
  if (socket?.connected) {
    socket.emit("queue:subscribe", currentSubscription);
  }
}

export function unsubscribeFromQueue(queueOrganizationUniqueId: string, queueDate?: string): void {
  if (currentSubscription?.queueOrganizationUniqueId === queueOrganizationUniqueId) {
    currentSubscription = null;
  }
  if (socket?.connected) {
    socket.emit("queue:unsubscribe", { queueOrganizationUniqueId, queueDate });
  }
}

export function onQueueEvent(handler: QueueEventHandler): () => void {
  queueEventHandlers.add(handler);
  return () => {
    queueEventHandlers.delete(handler);
  };
}
