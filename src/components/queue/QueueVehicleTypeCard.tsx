import type { DriverQueueEntry } from "../../types/queue";
import { QueueCard } from "./QueueCard";
import { QueueTable } from "./QueueTable";
import { extractDriverName, extractDriverPhone } from "../../utils/formatters";
import { isDriverWaiting } from "../../utils/journeyStatus";

export interface QueueVehicleTypeCardProps {
  typeId: string;
  typeName: string;
  entries: DriverQueueEntry[];
  queueOrganizationUniqueId: string;
  onDispatch: (target: {
    id: string;
    name: string;
    driverName?: string;
    driverPhone?: string;
  }) => void;
  onOverride: (entry: DriverQueueEntry) => void;
  onRemove: (entry: DriverQueueEntry) => void;
}

export function QueueVehicleTypeCard({
  typeId,
  typeName,
  entries,
  queueOrganizationUniqueId,
  onDispatch,
  onOverride,
  onRemove,
}: QueueVehicleTypeCardProps) {
  const waitingCount = entries.filter((e) =>
    isDriverWaiting(e?.status, e?.journeyStatusId),
  ).length;

  const firstWaiting =
    entries.find((e) => isDriverWaiting(e?.status, e?.journeyStatusId)) ||
    entries[0];

  return (
    <QueueCard
      title={typeName}
      waitingCount={waitingCount}
      dispatchDisabled={waitingCount === 0}
      onDispatch={() =>
        onDispatch({
          id: typeId,
          name: typeName,
          driverName: extractDriverName(firstWaiting),
          driverPhone: extractDriverPhone(firstWaiting),
        })
      }
      style={{ marginBottom: "1.5rem" }}
    >
      <QueueTable
        typeId={typeId}
        entries={entries}
        queueOrganizationUniqueId={queueOrganizationUniqueId}
        onOverride={onOverride}
        onRemove={onRemove}
      />
    </QueueCard>
  );
}

export default QueueVehicleTypeCard;
