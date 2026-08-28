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
const debouncedInvalidate = () => {
  if (invalidateTimer) clearTimeout(invalidateTimer);
  invalidateTimer = setTimeout(() => {
    import("./redux/store").then(({ store }) => {
      import("./redux/api").then(({ api }) => {
        store.dispatch(api.util.invalidateTags(["QueueStatus", "DriverQueue", "ShipperRequests"]));
      });
    });
  }, 250);
};

export function connectSocket(user?: Pick<AuthUser, "phoneNumber">): Socket | null {
  const storedAuth = getStoredAuth();
  const token = storedAuth?.token;
  const phoneNumber = user?.phoneNumber || storedAuth?.userData?.phoneNumber;
  const formattedToken = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : undefined;

  // Don't connect without credentials — server will reject with 400
  if (!formattedToken || !phoneNumber) {
    console.warn("[Socket] Skipping connect — missing token or phoneNumber", {
      hasToken: !!token,
      hasPhone: !!phoneNumber,
    });
    return socket;
  }

  console.info("[Socket] Connecting →", {
    phoneNumber,
    hasToken: !!formattedToken,
    alreadyExists: !!socket,
  });

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

  socket = io(socketUrl, {
    // Use websocket-only — Nginx on the backend only proxies WebSocket upgrades,
    // not HTTP long-polling, which causes 400 errors on polling requests.
    transports: ["websocket"],
    autoConnect: false,
    auth: {
      user: "queueOrgAdmin",
      phoneNumber,
      token: formattedToken,
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  socket.connect();

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

      // Synchronize live WebSocket updates directly into RTK Query cache with debounce
      debouncedInvalidate();
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
