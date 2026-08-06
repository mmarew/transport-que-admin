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
import { STATUS_STYLES } from "./QueueTable";

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
  const [viewMode, setViewMode] = useState<"byType" | "all">("byType");

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

  // Flatten all entries across types for "All Drivers" view
  const allEntries: DriverQueueEntry[] = status
    ? Object.values(status.queues).flat()
    : [];

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
        <div className="flex items-center gap-2">
          <div className="flex rounded-md bg-slate-100 p-1" role="tablist">
            <button
              role="tab"
              aria-selected={viewMode === "byType"}
              onClick={() => setViewMode("byType")}
              className={`rounded px-3 py-1 text-sm font-medium ${
                viewMode === "byType"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              By Vehicle Type
            </button>
            <button
              role="tab"
              aria-selected={viewMode === "all"}
              onClick={() => setViewMode("all")}
              className={`rounded px-3 py-1 text-sm font-medium ${
                viewMode === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Drivers ({allEntries.length})
            </button>
          </div>
          <button
            onClick={() => setShowCheckin(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Manual check-in
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{getApiError(error)}</p>}
      {isLoading && <p className="text-sm text-slate-500">Loading queue…</p>}
      {!isLoading && allEntries.length === 0 && (
        <p className="text-sm text-slate-500">The queue is empty.</p>
      )}

      {/* By Vehicle Type (grouped) */}
      {viewMode === "byType" && status ? (
        Object.entries(status.queues).map(([typeName, entries]) => {
          const typeId = entries[0]?.vehicleTypeUniqueId || typeName;
          return (
            <div key={typeName} className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">{typeName}</span>
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
          );
        })
      ) : null}

      {/* All Drivers (flat table with vehicle type column) */}
      {viewMode === "all" && !isLoading && allEntries.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Driver</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Vehicle Type</th>
                <th className="px-4 py-2">Joined</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {allEntries.map((entry) => {
                const typeDisplay = entry.vehicleTypeName || entry.vehicleTypeUniqueId || "Unknown";
                return (
                  <tr key={entry.queueUniqueId} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-slate-700">{entry.queueNumber}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">{entry.driverName}</td>
                    <td className="px-4 py-2 text-slate-600">{entry.driverPhoneNumber}</td>
                    <td className="px-4 py-2 text-slate-600 font-mono">{typeDisplay}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(entry.joinedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[entry.status]}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {entry.status === "waiting" && (
                        <>
                          <button
                            onClick={() => setOverrideEntry(entry)}
                            className="mr-2 text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            Override
                          </button>
                          <button
                            onClick={() => setCancelEntry(entry)}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
