import { useEffect, useRef } from "react";
import {
  connectSocket,
  getSocket,
  onQueueEvent,
  subscribeToQueue,
  unsubscribeFromQueue,
} from "../lib/socket";
import { useQueueAdminStore } from "../store/queueAdminStore";

export interface UseQueueSocketReturn {
  socketConnected: boolean;
  isLive: boolean;
}

/**
 * Manages socket connection lifecycle and subscriptions for a Queue Organization.
 */
export function useQueueSocket(
  queueOrganizationUniqueId: string,
  onRefetch?: () => void
): UseQueueSocketReturn {
  const socketConnected = useQueueAdminStore((s) => s.socketConnected);
  const setSocketConnected = useQueueAdminStore((s) => s.setSocketConnected);
  const onRefetchRef = useRef(onRefetch);

  useEffect(() => {
    onRefetchRef.current = onRefetch;
  }, [onRefetch]);

  useEffect(() => {
    if (!queueOrganizationUniqueId) return;

    const s = connectSocket();
    if (s?.connected) {
      setSocketConnected(true);
    }
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    s?.on("connect", handleConnect);
    s?.on("disconnect", handleDisconnect);

    subscribeToQueue(queueOrganizationUniqueId);
    const offEvent = onQueueEvent(() => {
      setSocketConnected(true);
      onRefetchRef.current?.();
    });

    return () => {
      s?.off("connect", handleConnect);
      s?.off("disconnect", handleDisconnect);
      unsubscribeFromQueue(queueOrganizationUniqueId);
      offEvent();
    };
  }, [queueOrganizationUniqueId, setSocketConnected]);

  const isLive = socketConnected || (getSocket()?.connected ?? false);

  return {
    socketConnected,
    isLive,
  };
}
