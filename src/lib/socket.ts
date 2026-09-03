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

let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedInvalidate = (isOrgEvent = false) => {
  if (invalidateTimer) clearTimeout(invalidateTimer);
  invalidateTimer = setTimeout(async () => {
    try {
      const [{ store }, { api }] = await Promise.all([
        import("./redux/store"),
        import("./redux/api"),
      ]);
      store.dispatch(
        api.util.invalidateTags([
          { type: "QueueStatus" },
          { type: "DriverQueue" },
          { type: "ShipperRequests" },
          { type: "QueueOrganizations" },
          "QueueStatus",
          "DriverQueue",
          "ShipperRequests",
          "QueueOrganizations",
        ])
      );
    } catch (err) {
      console.error("[WebSocket] Failed to invalidate RTK Query tags:", err);
    }
  }, isOrgEvent ? 30 : 150);
};

function extractCredentials(user?: Pick<AuthUser, "phoneNumber">) {
  const storedAuth = getStoredAuth();
  const token = storedAuth?.token;
  const userData = storedAuth?.userData as Record<string, unknown> | undefined;

  let phoneNumber =
    user?.phoneNumber ||
    (userData?.phoneNumber as string) ||
    (userData?.phone as string) ||
    (userData?.driverPhoneNumber as string);

  let roleId = userData?.roleId as number | undefined;

  if (token && (!phoneNumber || !roleId)) {
    try {
      const parts = token.replace(/^Bearer\s+/i, "").split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (!phoneNumber) phoneNumber = payload.phoneNumber || payload.phone;
        if (!roleId) roleId = payload.roleId;
      }
    } catch {
      // ignore
    }
  }

  const userType = roleId === 3 || roleId === 6 ? "admin" : "queueOrgAdmin";
  const formattedToken = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : undefined;
  const rawToken = token ? token.replace(/^Bearer\s+/i, "") : undefined;

  return { token: formattedToken, rawToken, phoneNumber, userType };
}

function emitSubscribe(sock: Socket, sub: { queueOrganizationUniqueId: string; queueDate?: string }) {
  const payload = {
    queueOrganizationUniqueId: sub.queueOrganizationUniqueId,
    queueDate: sub.queueDate,
  };
  sock.emit("queue:subscribe", payload);
  sock.emit("subscribe", payload);
  sock.emit("join", payload);
  sock.emit("joinQueue", payload);
}

function emitUnsubscribe(sock: Socket, sub: { queueOrganizationUniqueId: string; queueDate?: string }) {
  const payload = {
    queueOrganizationUniqueId: sub.queueOrganizationUniqueId,
    queueDate: sub.queueDate,
  };
  sock.emit("queue:unsubscribe", payload);
  sock.emit("unsubscribe", payload);
  sock.emit("leave", payload);
}

export function connectSocket(user?: Pick<AuthUser, "phoneNumber">): Socket | null {
  const { token, rawToken, phoneNumber, userType } = extractCredentials(user);

  if (!token) {
    console.warn("[WebSocket] No token found — skipping WebSocket connection until logged in");
    return socket;
  }

  if (socket) {
    socket.io.opts.transports = ["websocket"];
    socket.auth = {
      user: userType,
      phoneNumber: phoneNumber || "",
      token: rawToken || token,
      authorization: token,
    };
    if (socket.connected) {
      useQueueAdminStore.getState().setSocketConnected(true);
      return socket;
    }
    socket.connect();
    return socket;
  }

  const socketUrl =
    import.meta.env.VITE_WEBSOCKET_URL ||
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  socket = io(socketUrl, {
    transports: ["websocket"],
    upgrade: false,
    autoConnect: true,
    auth: {
      user: userType,
      phoneNumber: phoneNumber || "",
      token: rawToken || token,
      authorization: token,
      Authorization: token,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    console.info("[WebSocket] Connected successfully (ID:", socket?.id, ")");
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
  });

  socket.on("queue:subscribed", (ack) => {
    console.info("[WebSocket] Room subscribed ack:", ack);
    useQueueAdminStore.getState().setSocketConnected(true);
  });

  const handleQueuePayload = (msg: unknown) => {
    try {
      if (!msg) return;
      const parsed = typeof msg === "string" ? JSON.parse(msg) : msg;
      console.info("[WebSocket] Queue event received:", parsed);

      const messageType = (parsed as any)?.messageTypes || (parsed as any)?.message;
      const isOrgEvent =
        messageType === "queue_org_approved" ||
        messageType === "queue_org_updated" ||
        messageType === "org_approved" ||
        Boolean((parsed as any)?.data?.queueOrganizationUniqueId && (parsed as any)?.data?.approvalStatus);

      queueEventHandlers.forEach((handler) => {
        try {
          handler(parsed as any);
        } catch (err) {
          console.error("Error in queue event listener:", err);
        }
      });

      // Synchronize live WebSocket updates directly into RTK Query cache
      debouncedInvalidate(isOrgEvent);
    } catch {
      // ignore parse errors
    }
  };

  // Catch-all event listener for live events (deduplicated)
  socket.onAny((eventName: string, ...args: unknown[]) => {
    if (
      eventName === "connect" ||
      eventName === "disconnect" ||
      eventName === "connect_error" ||
      eventName === "queue:subscribed" ||
      eventName === "ping" ||
      eventName === "pong"
    ) {
      return;
    }
    console.info(`[WebSocket] Event "${eventName}":`, args[0]);
    handleQueuePayload(args[0]);
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

export function subscribeToQueue(queueOrganizationUniqueId: string, queueDate?: string): void {
  if (!queueOrganizationUniqueId) return;
  const key = `${queueOrganizationUniqueId}_${queueDate || ""}`;
  const existing = activeSubscriptions.get(key);
  if (existing) {
    existing.refCount += 1;
  } else {
    activeSubscriptions.set(key, { queueOrganizationUniqueId, queueDate, refCount: 1 });
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

export function unsubscribeFromQueue(queueOrganizationUniqueId: string, queueDate?: string): void {
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
