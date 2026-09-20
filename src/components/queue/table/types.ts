import type { DriverQueueEntry, QueueStatus } from "../../../types/queue";

export interface QueueRowItem {
  entry: DriverQueueEntry;
  statusKey: QueueStatus;
  statusLabel: string;
  num: number;
  joinedTime: string;
  key: string;
  shipperName: string | null;
  shipperPhone: string | null;
}
