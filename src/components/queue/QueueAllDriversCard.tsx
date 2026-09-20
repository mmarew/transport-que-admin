import { useTranslation } from "react-i18next";
import type { DriverQueueEntry } from "../../types/queue";
import { QueueCard } from "./QueueCard";
import { QueueTable } from "./QueueTable";
import { extractDriverName, extractDriverPhone } from "../../utils/formatters";
import { isDriverWaiting } from "../../utils/journeyStatus";

export interface QueueAllDriversCardProps {
  entries: DriverQueueEntry[];
  queueOrganizationUniqueId: string;
  resolveVehicleType: (
    typeKey: string,
    entries?: DriverQueueEntry[],
  ) => { id: string; name: string };
  onDispatch: (target: {
    id: string;
    name: string;
    driverName?: string;
    driverPhone?: string;
  }) => void;
  onOverride: (entry: DriverQueueEntry) => void;
  onRemove: (entry: DriverQueueEntry) => void;
}

export function QueueAllDriversCard({
  entries,
  queueOrganizationUniqueId,
  resolveVehicleType,
  onDispatch,
  onOverride,
  onRemove,
}: QueueAllDriversCardProps) {
  const { t } = useTranslation();

  const allWaitingCount = entries.filter((e) =>
    isDriverWaiting(e?.status, e?.journeyStatusId),
  ).length;

  const handleDispatch = () => {
    const firstWaiting =
      entries.find(
        (e) =>
          e.vehicleTypeUniqueId &&
          isDriverWaiting(e?.status, e?.journeyStatusId),
      ) ||
      entries.find((e) => isDriverWaiting(e?.status, e?.journeyStatusId)) ||
      entries[0];

    if (firstWaiting) {
      const { id, name } = resolveVehicleType(
        firstWaiting.vehicleTypeName ||
          firstWaiting.vehicleTypeUniqueId ||
          "",
        [firstWaiting],
      );
      onDispatch({
        id,
        name,
        driverName: extractDriverName(firstWaiting),
        driverPhone: extractDriverPhone(firstWaiting),
      });
    }
  };

  return (
    <QueueCard
      title={t("queue.allDrivers")}
      waitingCount={allWaitingCount}
      dispatchDisabled={allWaitingCount === 0}
      onDispatch={handleDispatch}
    >
      <QueueTable
        typeId="all"
        entries={entries}
        queueOrganizationUniqueId={queueOrganizationUniqueId}
        onOverride={onOverride}
        onRemove={onRemove}
      />
    </QueueCard>
  );
}

export default QueueAllDriversCard;
