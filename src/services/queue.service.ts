import { api } from "../lib/api";
import type { QueueStatusResponse, DriverQueueEntry } from "../types/queue";

/** Get current queue status for an organization */
export const getQueueStatus = (
  queueOrganizationUniqueId: string,
  queueDate?: string,
) =>
  api.get<QueueStatusResponse>("/queue/status", {
    params: { queueOrganizationUniqueId, queueDate },
  });

/** Manually check a driver into the queue */
export const manualCheckin = (body: {
  queueOrganizationUniqueId: string;
  vehicleDriverUniqueId: string;
  queueNumber?: number;
}) =>
  api.post<{
    message: string;
    data: Pick<DriverQueueEntry, "queueUniqueId" | "queueNumber" | "status">;
  }>("/queue/manualCheckin", body);

/** Override a queue entry's position */
export const overrideEntry = (
  queueUniqueId: string,
  body: { queueNumber: number; reason?: string },
) => api.patch(`/queue/entry/${queueUniqueId}/override`, body);

/** Remove a driver from the queue */
export const removeEntry = (queueUniqueId: string) =>
  api.delete(`/queue/entry/${queueUniqueId}`);

/** Dispatch a driver from the queue */
export const dispatch = (body: {
  queueOrganizationUniqueId: string;
  vehicleTypeUniqueId: string;
  shipperRequestUniqueId?: string;
}) =>
  api.post<{
    message: string;
    data: {
      queueUniqueId: string;
      queueNumber: number;
      driverUserUniqueId: string;
      status: string;
    };
  }>("/queue/dispatch", body);
