import type { DriverQueueEntry } from "../../types/queue";
import { CheckinModal } from "./CheckinModal";
import { CreateOrderModal } from "./CreateOrderModal";
import { DispatchModal } from "./DispatchModal";
import { OverrideModal } from "./OverrideModal";
import { ConfirmCancel } from "./ConfirmCancel";

export interface QueueBoardModalsProps {
  queueOrganizationUniqueId: string;
  origin?: {
    latitude?: number | null;
    longitude?: number | null;
    description?: string | null;
  };
  showCheckin: boolean;
  onCloseCheckin: () => void;
  showCreateOrder: boolean;
  onCloseCreateOrder: () => void;
  dispatchForType: {
    id: string;
    name: string;
    driverName?: string;
    driverPhone?: string;
  } | null;
  onCloseDispatch: () => void;
  overrideEntry: DriverQueueEntry | null;
  onCloseOverride: () => void;
  cancelEntry: DriverQueueEntry | null;
  onCloseCancel: () => void;
}

export function QueueBoardModals({
  queueOrganizationUniqueId,
  origin,
  showCheckin,
  onCloseCheckin,
  showCreateOrder,
  onCloseCreateOrder,
  dispatchForType,
  onCloseDispatch,
  overrideEntry,
  onCloseOverride,
  cancelEntry,
  onCloseCancel,
}: QueueBoardModalsProps) {
  return (
    <>
      {showCheckin && (
        <CheckinModal
          queueOrganizationUniqueId={queueOrganizationUniqueId}
          onClose={onCloseCheckin}
        />
      )}
      {showCreateOrder && (
        <CreateOrderModal
          queueOrganizationUniqueId={queueOrganizationUniqueId}
          origin={origin}
          onClose={onCloseCreateOrder}
        />
      )}
      {dispatchForType && (
        <DispatchModal
          queueOrganizationUniqueId={queueOrganizationUniqueId}
          vehicleTypeId={dispatchForType.id}
          vehicleTypeName={dispatchForType.name}
          driverName={dispatchForType.driverName}
          driverPhone={dispatchForType.driverPhone}
          onClose={onCloseDispatch}
        />
      )}
      {overrideEntry && (
        <OverrideModal
          entry={overrideEntry}
          onClose={onCloseOverride}
        />
      )}
      {cancelEntry && (
        <ConfirmCancel
          entry={cancelEntry}
          onClose={onCloseCancel}
        />
      )}
    </>
  );
}

export default QueueBoardModals;
