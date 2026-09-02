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
let lastInvalidateTime = 0;
const debouncedInvalidate = (isOrgEvent = false) => {
  const now = Date.now();
  if (!isOrgEvent && now - lastInvalidateTime < 1200) {
    return; // Throttle if invalidated very recently by local mutation
  }
  if (invalidateTimer) clearTimeout(invalidateTimer);
  invalidateTimer = setTimeout(() => {
    lastInvalidateTime = Date.now();
    import("./redux/store").then(({ store }) => {
      import("./redux/api").then(({ api }) => {
        store.dispatch(
          api.util.invalidateTags([
            "QueueStatus",
            "DriverQueue",
            "ShipperRequests",
            "QueueOrganizations",
          ])
        );
      });
    });
  }, isOrgEvent ? 50 : 400);
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
    autoConnect: true,
    auth: (cb) => {
      const creds = extractCredentials(user);
      cb({
        user: creds.userType,
        phoneNumber: creds.phoneNumber || "",
        token: creds.rawToken || creds.token,
        authorization: creds.token,
      });
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
      socket?.emit("queue:subscribe", {
        queueOrganizationUniqueId: sub.queueOrganizationUniqueId,
        queueDate: sub.queueDate,
      });
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
      const parsed = typeof msg === "string" ? JSON.parse(msg) : msg;
      console.info("[WebSocket] Queue event received:", parsed);

      const messageType = parsed?.messageTypes || parsed?.message;
      const isOrgEvent =
        messageType === "queue_org_approved" ||
        messageType === "queue_org_updated" ||
        messageType === "org_approved" ||
        Boolean(parsed?.data?.queueOrganizationUniqueId && parsed?.data?.approvalStatus);

      queueEventHandlers.forEach((handler) => {
        try {
          handler(parsed);
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

  // Primary event from backend
  socket.on("queue", handleQueuePayload);

  // Additional fallback and organization event names
  socket.on("queue_event", handleQueuePayload);
  socket.on("queueEvent", handleQueuePayload);
  socket.on("queue:update", handleQueuePayload);
  socket.on("queue_updated", handleQueuePayload);
  socket.on("queue_org_approved", handleQueuePayload);
  socket.on("queue_org_updated", handleQueuePayload);
  socket.on("org_approved", handleQueuePayload);

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
    // Only connect if we have credentials; if not, the AuthContext will connect when auth is set
    connectSocket();
    return;
  }
  if (socket.connected) {
    socket.emit("queue:subscribe", { queueOrganizationUniqueId, queueDate });
  } else {
    // Socket exists but not connected — wait for the "connect" event which will re-emit subscribe
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
        socket.emit("queue:unsubscribe", { queueOrganizationUniqueId, queueDate });
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
