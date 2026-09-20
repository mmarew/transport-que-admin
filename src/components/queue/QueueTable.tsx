import { useState } from "react";
import type { DriverQueueEntry, QueueStatus } from "../../types/queue";
import { normalizeQueueEntry } from "../../utils/formatters";
import {
  ShipperRequestsModal,
  type ShipperRequestDetail,
} from "./ShipperRequestsModal";
import { buildShipperRequestDetail } from "./table/buildShipperRequestDetail";
import { QueueDesktopTable } from "./table/QueueDesktopTable";
import { QueueMobileTable } from "./table/QueueMobileTable";
import type { QueueRowItem } from "./table/types";
import "./QueueBoard.css";

interface QueueTableProps {
  typeId: string;
  entries: DriverQueueEntry[];
  queueOrganizationUniqueId?: string;
  onOverride: (entry: DriverQueueEntry) => void;
  onRemove: (entry: DriverQueueEntry) => void;
}

function formatJoinedTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

export function QueueTable({
  entries,
  queueOrganizationUniqueId,
  onOverride,
  onRemove,
}: QueueTableProps) {
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(
    new Set(),
  );
  const [shipperModal, setShipperModal] = useState<{
    phone: string;
    name: string | null;
    request: ShipperRequestDetail | null;
  } | null>(null);

  const openShipperModal = (
    phone: string,
    name: string | null,
    entry: DriverQueueEntry,
  ) => {
    const request = buildShipperRequestDetail(entry);
    setShipperModal({ phone, name, request });
  };

  const toggleAddress = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAddresses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const rows: QueueRowItem[] = (entries || []).map((rawEntry, index) => {
    const entry = normalizeQueueEntry(rawEntry);
    const statusKey = (entry.status || "waiting") as QueueStatus;
    const statusLabel =
      entry.statusLabel ||
      statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
    const num = entry.queueNumber || index + 1;
    const joinedTime = formatJoinedTime(entry.joinedAt);
    const key = entry.queueUniqueId || `${entry.queueNumber}-${index}`;
    const shipperName = entry.shipperRequest?.fullName ?? null;
    const shipperPhone = entry.shipperRequest?.phoneNumber ?? null;

    return {
      entry,
      statusKey,
      statusLabel,
      num,
      joinedTime,
      key,
      shipperName,
      shipperPhone,
    };
  });

  return (
    <>
      <QueueDesktopTable
        rows={rows}
        expandedAddresses={expandedAddresses}
        onToggleAddress={toggleAddress}
        onOpenShipper={openShipperModal}
        onOverride={onOverride}
        onRemove={onRemove}
      />
      <QueueMobileTable
        rows={rows}
        onOverride={onOverride}
        onRemove={onRemove}
      />
      {shipperModal && (
        <ShipperRequestsModal
          phone={shipperModal.phone}
          name={shipperModal.name}
          request={shipperModal.request}
          queueOrganizationUniqueId={queueOrganizationUniqueId || ""}
          onClose={() => setShipperModal(null)}
        />
      )}
    </>
  );
}

export default QueueTable;
