import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueueStatus, getApiError } from "../../lib/api";
import { onQueueEvent, subscribeToQueue, unsubscribeFromQueue } from "../../lib/socket";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import type { DriverQueueEntry } from "../../types/queue";
import { QueueTable } from "./QueueTable";
import { CheckinModal } from "./CheckinModal";
import { DispatchModal } from "./DispatchModal";
import { OverrideModal } from "./OverrideModal";
import { ConfirmCancel } from "./ConfirmCancel";

interface QueueBoardProps {
  queueOrganizationUniqueId: string;
}

export function QueueBoard({ queueOrganizationUniqueId }: QueueBoardProps) {
  const queryClient = useQueryClient();
  const socketConnected = useQueueAdminStore((s) => s.socketConnected);
  const setSocketConnected = useQueueAdminStore((s) => s.setSocketConnected);

  const [showCheckin, setShowCheckin] = useState(false);
  const [dispatchForType, setDispatchForType] = useState<string | null>(null);
  const [overrideEntry, setOverrideEntry] = useState<DriverQueueEntry | null>(null);
  const [cancelEntry, setCancelEntry] = useState<DriverQueueEntry | null>(null);

  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: status,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["queue-status", queueOrganizationUniqueId],
    queryFn: () => getQueueStatus(queueOrganizationUniqueId).then((res) => res.data.data),
    enabled: !!queueOrganizationUniqueId,
  });

  const invalidate = useCallback(() => {
    if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
    invalidateTimer.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["queue-status", queueOrganizationUniqueId] });
    }, 250);
  }, [queryClient, queueOrganizationUniqueId]);

  useEffect(() => {
    subscribeToQueue(queueOrganizationUniqueId);
    const offEvent = onQueueEvent(() => {
      setSocketConnected(true);
      invalidate();
    });

    return () => {
      unsubscribeFromQueue(queueOrganizationUniqueId);
      offEvent();
      if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
    };
  }, [queueOrganizationUniqueId, invalidate, setSocketConnected]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Live queue</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              socketConnected ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {socketConnected ? "live" : "connecting…"}
          </span>
          {status && (
            <span className="text-sm text-slate-500">
              {status.queueDate} · {status.totalWaiting} waiting
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCheckin(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Manual check-in
        </button>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{getApiError(error)}</p>}
      {isLoading && <p className="text-sm text-slate-500">Loading queue…</p>}
      {!isLoading && status && Object.keys(status.queues).length === 0 && (
        <p className="text-sm text-slate-500">The queue is empty.</p>
      )}

      {status &&
        Object.entries(status.queues).map(([typeId, entries]) => (
          <div key={typeId} className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">{typeId}</span>
              <button
                onClick={() => setDispatchForType(typeId)}
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Dispatch →
              </button>
            </div>
            <QueueTable
              typeId={typeId}
              entries={entries}
              onOverride={setOverrideEntry}
              onRemove={setCancelEntry}
            />
          </div>
        ))}

      {showCheckin && (
        <CheckinModal
          queueOrganizationUniqueId={queueOrganizationUniqueId}
          onClose={() => setShowCheckin(false)}
        />
      )}
      {dispatchForType && (
        <DispatchModal
          queueOrganizationUniqueId={queueOrganizationUniqueId}
          vehicleTypeId={dispatchForType}
          onClose={() => setDispatchForType(null)}
        />
      )}
      {overrideEntry && (
        <OverrideModal entry={overrideEntry} onClose={() => setOverrideEntry(null)} />
      )}
      {cancelEntry && <ConfirmCancel entry={cancelEntry} onClose={() => setCancelEntry(null)} />}
    </div>
  );
}
