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
const activeSubscriptions = new Map<
  string,
  { queueOrganizationUniqueId: string; queueDate?: string; refCount: number }
>();

// A 401 on the WS handshake means the session cookie is gone. Dispatch the
// redux logout so every authed page unmounts instead of the app continuing
// to fire doomed requests. Imported dynamically to avoid module cycles.
async function clearSessionOnUnauthorizedSocket() {
  try {
    const [{ store }, { logout }] = await Promise.all([
      import("./redux/store"),
      import("./redux/slices/authSlice"),
    ]);
    store.dispatch(logout());
  } catch (err) {
    console.error("[WebSocket] Failed to clear session:", err);
  }
}

let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedInvalidate = (isOrgEvent = false) => {
  if (invalidateTimer) clearTimeout(invalidateTimer);
  invalidateTimer = setTimeout(
    async () => {
      try {
        const [{ store }, { api }] = await Promise.all([
          import("./redux/store"),
          import("./redux/api"),
        ]);
        const tagsToInvalidate = isOrgEvent
          ? [
              { type: "QueueOrganizations" as const },
              "QueueOrganizations" as const,
            ]
          : [
              { type: "QueueStatus" as const },
              { type: "DriverQueue" as const },
              { type: "ShipperRequests" as const },
              "QueueStatus" as const,
              "DriverQueue" as const,
              "ShipperRequests" as const,
            ];
        store.dispatch(api.util.invalidateTags(tagsToInvalidate));
      } catch (err) {
        console.error("[WebSocket] Failed to invalidate RTK Query tags:", err);
      }
    },
    isOrgEvent ? 100 : 250,
  );
};

function extractCredentials(user?: Pick<AuthUser, "phoneNumber">) {
  const storedAuth = getStoredAuth();

  const userData = (storedAuth?.userData || {}) as Record<string, unknown>;

  const phoneNumber =
    user?.phoneNumber ||
    (userData?.phoneNumber as string) ||
    (userData?.phone as string) ||
    (userData?.driverPhoneNumber as string) ||
    "";

  const roleId = userData?.roleId as number | undefined;

  // DO NOT map role 12 to its own socket identity.
  //
  // Sockets are keyed `${userType}:${phone}` (Utils/WSPusher.js), and every
  // queue fan-out looks members up under the "queueOrgAdmin" key while selecting
  // `roleId IN (11, 12)` (Utils/QueueSocket.js — emitBidEventToQueueOrg,
  // notifyQueueOrgAdmins). A dispatcher that announced "queueDispatcher" would
  // register under a key nobody reads from and would silently receive no queue
  // events. Queue staff of both roles share one socket identity by design.
  const userType = roleId === 3 || roleId === 6 ? "admin" : "queueOrgAdmin";

  return { phoneNumber, userType };
}

function emitSubscribe(
  sock: Socket,
  sub: { queueOrganizationUniqueId: string; queueDate?: string },
) {
  const payload = {
    queueOrganizationUniqueId: sub.queueOrganizationUniqueId,
    queueDate: sub.queueDate,
  };
  sock.emit("queue:subscribe", payload);
}

function emitUnsubscribe(
  sock: Socket,
  sub: { queueOrganizationUniqueId: string; queueDate?: string },
) {
  const payload = {
    queueOrganizationUniqueId: sub.queueOrganizationUniqueId,
    queueDate: sub.queueDate,
  };
  sock.emit("queue:unsubscribe", payload);
}

export function connectSocket(
  user?: Pick<AuthUser, "phoneNumber">,
): Socket | null {
  const { phoneNumber, userType } = extractCredentials(user);

  if (socket) {
    socket.auth = {
      user: userType,
      phoneNumber: phoneNumber || "",
    };
    if (socket.connected) {
      useQueueAdminStore.getState().setSocketConnected(true);
      return socket;
    }
    if (!socket.active && !socket.connected) {
      socket.connect();
    }
    return socket;
  }

  const socketUrl =
    import.meta.env.VITE_WEBSOCKET_URL ||
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  socket = io(socketUrl, {
    transports: ["polling", "websocket"],
    tryAllTransports: true,
    autoConnect: true,
    withCredentials: true,
    auth: {
      user: userType,
      phoneNumber: phoneNumber || "",
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    useQueueAdminStore.getState().setSocketConnected(true);
    activeSubscriptions.forEach((sub) => {
      if (socket) emitSubscribe(socket, sub);
    });
  });

  socket.on("disconnect", (reason) => {
    console.warn("[WebSocket] Disconnected:", reason);
    useQueueAdminStore.getState().setSocketConnected(false);
  });

  socket.on("connect_error", (err) => {
    console.warn("[WebSocket] Connection error:", err.message, err);
    useQueueAdminStore.getState().setSocketConnected(false);
    // Session cookie invalid/expired: stop retrying and end the session.
    // An endless reconnect loop just hammers the backend and risks rate limits.
    const msg = `${err?.message || ""}`.toLowerCase();
    if (msg.includes("unauthorized") || msg.includes("token")) {
      disconnectSocket();
      void clearSessionOnUnauthorizedSocket();
    }
  });

  socket.on("queue:subscribed", (_ack) => {
    useQueueAdminStore.getState().setSocketConnected(true);
  });

  const handleQueuePayload = (msg: unknown, eventName?: string) => {
    try {
      if (!msg && !eventName) return;
      const parsed = typeof msg === "string" ? JSON.parse(msg) : msg;

      // Extract message type (supports both string and { message, details } object from backend)
      const rawType = (parsed as any)?.messageTypes;
      const typeStr =
        typeof rawType === "string"
          ? rawType
          : typeof rawType === "object" && rawType !== null
            ? (rawType.type || rawType.message || "")
            : "";
      const messageType = typeStr || (parsed as any)?.message || eventName;

      // Ignore acknowledgment messages and heartbeats from triggering cache invalidation
      const lowerType = String(messageType || "").toLowerCase();
      if (
        lowerType.includes("subscribed") ||
        lowerType.includes("unsubscribed") ||
        lowerType === "ping" ||
        lowerType === "pong"
      ) {
        return;
      }

      const isOrgEvent =
        messageType === "queue_org_approved" ||
        messageType === "queue_org_updated" ||
        messageType === "queue_org_deleted" ||
        messageType === "queue_member_added" ||
        messageType === "org_approved" ||
        messageType === "Queue organization approved" ||
        Boolean(
          (parsed as any)?.data?.queueOrganizationUniqueId &&
          (parsed as any)?.data?.approvalStatus,
        );

      if (parsed && typeof parsed === "object") {
        queueEventHandlers.forEach((handler) => {
          try {
            handler(parsed as any);
          } catch (err) {
            console.error("Error in queue event listener:", err);
          }
        });
      }

      // Synchronize live WebSocket updates directly into RTK Query cache
      debouncedInvalidate(isOrgEvent);
    } catch {
      // Even if parse fails, invalidate to ensure cache stays in sync
      debouncedInvalidate(false);
    }
  };

  socket.on("queue", (msg: unknown) => {
    handleQueuePayload(msg, "queue");
  });

  // Catch-all event listener for live events (deduplicated)
  socket.onAny((eventName: string, ...args: unknown[]) => {
    if (
      eventName === "connect" ||
      eventName === "disconnect" ||
      eventName === "connect_error" ||
      eventName === "reconnect" ||
      eventName === "reconnect_attempt" ||
      eventName === "reconnecting" ||
      eventName === "reconnect_error" ||
      eventName === "reconnect_failed" ||
      eventName === "queue:subscribed" ||
      eventName === "queue:unsubscribed" ||
      eventName === "queue:subscribe" ||
      eventName === "queue:unsubscribe" ||
      eventName === "ping" ||
      eventName === "pong" ||
      eventName === "queue"
    ) {
      return;
    }
    handleQueuePayload(args[0], eventName);
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
    activeSubscriptions.clear();
    useQueueAdminStore.getState().setSocketConnected(false);
  }
}

export function subscribeToQueue(
  queueOrganizationUniqueId: string,
  queueDate?: string,
): void {
  if (!queueOrganizationUniqueId) return;
  const key = `${queueOrganizationUniqueId}_${queueDate || ""}`;
  const existing = activeSubscriptions.get(key);
  if (existing) {
    existing.refCount += 1;
  } else {
    activeSubscriptions.set(key, {
      queueOrganizationUniqueId,
      queueDate,
      refCount: 1,
    });
  }

  if (!socket) {
    connectSocket();
    return;
  }
  if (socket.connected) {
    emitSubscribe(socket, { queueOrganizationUniqueId, queueDate });
  } else {
    socket.connect();
  }
}

export function unsubscribeFromQueue(
  queueOrganizationUniqueId: string,
  queueDate?: string,
): void {
  if (!queueOrganizationUniqueId) return;
  const key = `${queueOrganizationUniqueId}_${queueDate || ""}`;
  const existing = activeSubscriptions.get(key);
  if (existing) {
    existing.refCount -= 1;
    if (existing.refCount <= 0) {
      activeSubscriptions.delete(key);
      if (socket?.connected) {
        emitUnsubscribe(socket, { queueOrganizationUniqueId, queueDate });
      }
    }
  }
}

export function onQueueEvent(handler: QueueEventHandler): () => void {
  queueEventHandlers.add(handler);
  return () => {
    queueEventHandlers.delete(handler);
  };
}
