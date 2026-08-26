import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, UserPlus, Play, ArrowLeft } from "lucide-react";
import { connectSocket, onQueueEvent, subscribeToQueue, unsubscribeFromQueue } from "../../lib/socket";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import type { DriverQueueEntry, QueueStatusPayload } from "../../types/queue";
import { QueueTable } from "./QueueTable";
import { CheckinModal } from "./CheckinModal";
import { CreateOrderModal } from "./CreateOrderModal";
import { DispatchModal } from "./DispatchModal";
import { OverrideModal } from "./OverrideModal";
import { ConfirmCancel } from "./ConfirmCancel";
import "./QueueBoard.css";

const DEFAULT_TYPE_ID_MAP: Record<string, string> = {
  isuzu: "55060ed0-0000-0000-0000-000000000002",
  dry: "e93aa27f-364f-4eff-bc26-582b773071d3",
  "20ft": "9b2e8446-e1b7-4659-89bd-3bbc4c0a6742",
  "low-bed": "55060ed0-0000-0000-0000-000000000005",
  "heavy duty": "55060ed0-0000-0000-0000-000000000001",
  tanker: "55060ed0-0000-0000-0000-000000000003",
  refrigerated: "55060ed0-0000-0000-0000-000000000004",
};

interface QueueBoardProps {
  queueOrganizationUniqueId: string;
  orgName?: string;
  orgType?: string;
  city?: string;
  origin?: {
    latitude?: number | null;
    longitude?: number | null;
    description?: string | null;
  };
  status?: QueueStatusPayload;
  isLoading: boolean;
  error?: unknown;
  onRefetch: () => void;
  onBack?: () => void;
}

export function QueueBoard({
  queueOrganizationUniqueId,
  orgName = "Live Queue Terminal",
  orgType = "Factory",
  city = "Addis Ababa",
  origin,
  status,
  isLoading,
  onRefetch,
  onBack,
}: QueueBoardProps) {
  const socketConnected = useQueueAdminStore((s) => s.socketConnected);
  const setSocketConnected = useQueueAdminStore((s) => s.setSocketConnected);

  const [showCheckin, setShowCheckin] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [dispatchForType, setDispatchForType] = useState<{ id: string; name: string } | null>(null);
  const [overrideEntry, setOverrideEntry] = useState<DriverQueueEntry | null>(null);
  const [cancelEntry, setCancelEntry] = useState<DriverQueueEntry | null>(null);
  const [viewMode, setViewMode] = useState<"byType" | "all">("byType");

  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRefetchRef = useRef(onRefetch);

  useEffect(() => {
    onRefetchRef.current = onRefetch;
  }, [onRefetch]);

  const invalidate = useCallback(() => {
    if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
    invalidateTimer.current = setTimeout(() => {
      onRefetchRef.current();
    }, 250);
  }, []);

  useEffect(() => {
    const s = connectSocket();
    if (s?.connected) {
      setSocketConnected(true);
    }
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

  const resolveTypeId = (name: string, fallbackId?: string): string => {
    if (fallbackId && fallbackId.includes("-") && fallbackId.length > 20) return fallbackId;
    const lowerName = name.toLowerCase();
    for (const [key, id] of Object.entries(DEFAULT_TYPE_ID_MAP)) {
      if (lowerName.includes(key)) return id;
    }
    return fallbackId || name;
  };

  // Flatten all entries across types for "All Drivers" view
  const allEntries: DriverQueueEntry[] = status
    ? Object.values(status.queues).flat()
    : [];

  const allWaitingCount = allEntries.filter(
    (e) => !e.status || e.status === "waiting" || e.status === "offered"
  ).length;

  const formattedType = orgType ? orgType.charAt(0).toUpperCase() + orgType.slice(1) : "";
  const subtitle = formattedType ? `${orgName} (${formattedType}) — ${city}` : `${orgName} — ${city}`;

  return (
    <div className="qb-page-container">
      {/* ── Top Back Button ── */}
      {onBack && (
        <button type="button" className="qb-back-link" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to Organizations
        </button>
      )}

      {/* ── Header Section ── */}
      <div className="qb-header-section">
        <div className="qb-title-group">
          <div className="qb-title-row">
            <h1 className="qb-title-text">Live Queue</h1>
            <span className={`qb-live-badge ${socketConnected ? "live" : "connecting"}`}>
              <span className="qb-live-badge-dot" />
              {socketConnected ? "Live" : "Connecting..."}
            </span>
          </div>
          <p className="qb-subtitle-text">{subtitle}</p>
        </div>

        <div className="qb-header-actions">
          <button
            type="button"
            className="qb-btn-new-order"
            onClick={() => setShowCreateOrder(true)}
          >
            <Plus size={16} />
            New Order
          </button>
          <button
            type="button"
            className="qb-btn-manual-checkin"
            onClick={() => setShowCheckin(true)}
          >
            <UserPlus size={16} />
            Manual Check-In
          </button>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="qb-filter-tabs">
        <button
          type="button"
          className={`qb-tab-pill ${viewMode === "byType" ? "active" : "inactive"}`}
          onClick={() => setViewMode("byType")}
        >
          By Vehicle Type
        </button>
        <button
          type="button"
          className={`qb-tab-pill ${viewMode === "all" ? "active" : "inactive"}`}
          onClick={() => setViewMode("all")}
        >
          All Drivers
        </button>
      </div>

      {/* ── Loading Spinner ── */}
      {isLoading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <span className="add-docs-spinner" style={{ borderColor: "#e2e8f0", borderTopColor: "#0B4D6D" }} />
        </div>
      )}

      {/* ── View Mode: By Vehicle Type ── */}
      {!isLoading && viewMode === "byType" && status && (
        <>
          {Object.entries(status.queues).length === 0 ? (
            <div className="qb-card" style={{ textAlign: "center", padding: "3.5rem 1rem" }}>
              <p style={{ color: "#64748b", margin: 0 }}>No active queues found for this terminal.</p>
            </div>
          ) : (
            Object.entries(status.queues).map(([typeName, entries]) => {
              const matchingEntry = entries.find((e) => e.vehicleTypeUniqueId);
              const rawTypeId = matchingEntry?.vehicleTypeUniqueId || entries[0]?.vehicleTypeUniqueId;
              const typeId = resolveTypeId(typeName, rawTypeId);
              const waitingCount = entries.filter(
                (e) => !e.status || e.status === "waiting" || e.status === "offered"
              ).length;

              return (
                <div key={typeName} className="qb-card" style={{ marginBottom: "1.5rem" }}>
                  <div className="qb-card-header">
                    <div className="qb-card-title-row">
                      <h2 className="qb-card-title">{typeName}</h2>
                      <span className="qb-waiting-badge">{waitingCount} waiting</span>
                    </div>

                    <button
                      type="button"
                      className="qb-btn-dispatch-outline"
                      disabled={waitingCount === 0}
                      onClick={() => setDispatchForType({ id: typeId, name: typeName })}
                    >
                      <Play size={13} fill="currentColor" />
                      Dispatch
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
          )}
        </>
      )}

      {/* ── View Mode: All Drivers ── */}
      {!isLoading && viewMode === "all" && (
        <div className="qb-card">
          <div className="qb-card-header">
            <div className="qb-card-title-row">
              <h2 className="qb-card-title">All Vehicles & Drivers</h2>
              <span className="qb-waiting-badge">{allWaitingCount} waiting</span>
            </div>

            <button
              type="button"
              className="qb-btn-dispatch-outline"
              disabled={allWaitingCount === 0}
              onClick={() => {
                const firstWaiting =
                  allEntries.find(
                    (e) =>
                      e.vehicleTypeUniqueId &&
                      (!e.status || e.status === "waiting" || e.status === "offered")
                  ) || allEntries.find((e) => !e.status || e.status === "waiting" || e.status === "offered") || allEntries[0];

                if (firstWaiting) {
                  const resolved = resolveTypeId(firstWaiting.vehicleTypeName || "", firstWaiting.vehicleTypeUniqueId);
                  setDispatchForType({
                    id: resolved,
                    name: firstWaiting.vehicleTypeName || "Front Driver",
                  });
                }
              }}
            >
              <Play size={13} fill="currentColor" />
              Dispatch
            </button>
          </div>

          <QueueTable
            typeId="all"
            entries={allEntries}
            onOverride={setOverrideEntry}
            onRemove={setCancelEntry}
          />
        </div>
      )}

      {/* Modals */}
      {showCheckin && (
        <CheckinModal
          queueOrganizationUniqueId={queueOrganizationUniqueId}
          onCheckedIn={onRefetch}
          onClose={() => setShowCheckin(false)}
        />
      )}
      {showCreateOrder && (
        <CreateOrderModal
          queueOrganizationUniqueId={queueOrganizationUniqueId}
          origin={origin}
          onCreated={onRefetch}
          onClose={() => setShowCreateOrder(false)}
        />
      )}
      {dispatchForType && (
        <DispatchModal
          queueOrganizationUniqueId={queueOrganizationUniqueId}
          vehicleTypeId={dispatchForType.id}
          vehicleTypeName={dispatchForType.name}
          onDispatched={onRefetch}
          onClose={() => setDispatchForType(null)}
        />
      )}
      {overrideEntry && (
        <OverrideModal
          entry={overrideEntry}
          onOverridden={onRefetch}
          onClose={() => setOverrideEntry(null)}
        />
      )}
      {cancelEntry && (
        <ConfirmCancel
          entry={cancelEntry}
          onRemoved={onRefetch}
          onClose={() => setCancelEntry(null)}
        />
      )}
    </div>
  );
}

export default QueueBoard;
