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

let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
let lastInvalidateTime = 0;
const debouncedInvalidate = () => {
  const now = Date.now();
  if (now - lastInvalidateTime < 1200) {
    return; // Throttle if invalidated very recently by local mutation
  }
  if (invalidateTimer) clearTimeout(invalidateTimer);
  invalidateTimer = setTimeout(() => {
    lastInvalidateTime = Date.now();
    import("./redux/store").then(({ store }) => {
      import("./redux/api").then(({ api }) => {
        store.dispatch(api.util.invalidateTags(["QueueStatus", "DriverQueue", "ShipperRequests"]));
      });
    });
  }, 400);
};

export function connectSocket(user?: Pick<AuthUser, "phoneNumber">): Socket | null {
  const storedAuth = getStoredAuth();
  const token = storedAuth?.token;
  const phoneNumber = user?.phoneNumber || storedAuth?.userData?.phoneNumber;
  const formattedToken = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : undefined;

  // Don't connect without credentials — server will reject with 400
  if (!formattedToken || !phoneNumber) {
    return socket;
  }

  if (socket) {
    // Refresh auth credentials in case token changed
    socket.auth = {
      user: "queueOrgAdmin",
      phoneNumber,
      token: formattedToken,
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
    "https://dynamicsroute.tech";

  const rawToken = token ? token.replace(/^Bearer\s+/i, "") : undefined;

  socket = io(socketUrl, {
    transports: ["websocket", "polling"],
    autoConnect: false,
    auth: {
      user: "queueOrgAdmin",
      phoneNumber,
      token: rawToken || formattedToken,
      authorization: formattedToken,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 15000,
    timeout: 20000,
  });

  socket.connect();

  socket.on("connect", () => {
    console.info("[WebSocket] Connected successfully (ID:", socket?.id, ")");
    useQueueAdminStore.getState().setSocketConnected(true);
    if (currentSubscription) {
      socket?.emit("queue:subscribe", currentSubscription);
    }
  });

  socket.on("disconnect", (reason) => {
    console.warn("[WebSocket] Disconnected:", reason);
    useQueueAdminStore.getState().setSocketConnected(false);
  });

  socket.on("connect_error", (err) => {
    console.warn("[WebSocket] Connection error:", err.message);
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
      queueEventHandlers.forEach((handler) => {
        try {
          handler(parsed);
        } catch (err) {
          console.error("Error in queue event listener:", err);
        }
      });

      // Synchronize live WebSocket updates directly into RTK Query cache with debounce
      debouncedInvalidate();
    } catch {
      // ignore parse errors
    }
  };

  // Primary event from backend
  socket.on("queue", handleQueuePayload);

  // Additional fallback queue event names
  socket.on("queue_event", handleQueuePayload);
  socket.on("queueEvent", handleQueuePayload);
  socket.on("queue:update", handleQueuePayload);
  socket.on("queue_updated", handleQueuePayload);

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
  if (!socket) {
    // Only connect if we have credentials; if not, the AuthContext will connect when auth is set
    connectSocket();
    return;
  }
  if (socket.connected) {
    socket.emit("queue:subscribe", currentSubscription);
  } else {
    // Socket exists but not connected — wait for the "connect" event which will re-emit subscribe
    socket.connect();
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
