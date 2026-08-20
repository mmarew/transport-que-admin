import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, UserPlus, Play, ArrowLeft } from "lucide-react";
import { onQueueEvent, subscribeToQueue, unsubscribeFromQueue } from "../../lib/socket";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import type { DriverQueueEntry, QueueStatusPayload } from "../../types/queue";
import { QueueTable } from "./QueueTable";
import { CheckinModal } from "./CheckinModal";
import { CreateOrderModal } from "./CreateOrderModal";
import { DispatchModal } from "./DispatchModal";
import { OverrideModal } from "./OverrideModal";
import { ConfirmCancel } from "./ConfirmCancel";
import "./QueueBoard.css";

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
  const [dispatchForType, setDispatchForType] = useState<string | null>(null);
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

  const subtitle = `${orgName} — ${city}`;

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

      {/* ── Filter Tabs: By Vehicle Type / All Drivers ── */}
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
              const typeId = entries[0]?.vehicleTypeUniqueId || typeName;
              return (
                <div key={typeName} className="qb-card" style={{ marginBottom: "1.5rem" }}>
                  <div className="qb-card-header">
                    <div className="qb-card-title-row">
                      <h2 className="qb-card-title">{typeName}</h2>
                      <span className="qb-waiting-badge">{entries.length} waiting</span>
                    </div>

                    <button
                      type="button"
                      className="qb-btn-dispatch-outline"
                      disabled={entries.length === 0}
                      onClick={() => setDispatchForType(typeId)}
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
              <span className="qb-waiting-badge">{allEntries.length} waiting</span>
            </div>

            <button
              type="button"
              className="qb-btn-dispatch-outline"
              disabled={allEntries.length === 0}
              onClick={() => {
                const first = allEntries[0];
                if (first?.vehicleTypeUniqueId) {
                  setDispatchForType(first.vehicleTypeUniqueId);
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

export default QueueBoard;
