import { io, Socket } from "socket.io-client";
import { getToken } from "./auth";
import type { AuthUser } from "../types/queue";

type QueueEventHandler = (payload: {
  message: string;
  messageTypes: string;
  data?: Record<string, unknown>;
}) => void;

let socket: Socket | null = null;

export function connectSocket(user: Pick<AuthUser, "phoneNumber">): Socket {
  if (socket?.connected) return socket;

  socket = io(import.meta.env.VITE_SOCKET_URL || "/", {
    auth: {
      user: "queueOrgAdmin",
      phoneNumber: user.phoneNumber,
      token: `Bearer ${getToken()}`,
    },
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function subscribeToQueue(queueOrganizationUniqueId: string, queueDate?: string): void {
  socket?.emit("queue:subscribe", { queueOrganizationUniqueId, queueDate });
}

export function unsubscribeFromQueue(queueOrganizationUniqueId: string, queueDate?: string): void {
  socket?.emit("queue:unsubscribe", { queueOrganizationUniqueId, queueDate });
}

type QueueEventServerPayload = {
  message: string;
  messageTypes: string;
  data?: Record<string, unknown>;
};

export function onQueueEvent(handler: QueueEventHandler): () => void {
  socket?.on("queue", (msg: string) => {
    /* eslint-disable no-empty */
    try {
      handler(JSON.parse(msg) as QueueEventServerPayload);
    } catch {
    }
    /* eslint-enable no-empty */
  });
  return () => socket?.off("queue");
}
