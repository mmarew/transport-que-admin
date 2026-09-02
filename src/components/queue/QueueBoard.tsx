import { useEffect, useMemo, useState } from "react";
import { Plus, UserPlus, Play, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { connectSocket, onQueueEvent, subscribeToQueue, unsubscribeFromQueue } from "../../lib/socket";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import { useListVehicleTypesQuery } from "../../lib/redux/api";
import type { DriverQueueEntry, QueueStatusPayload } from "../../types/queue";
import { resolveVehicleName } from "../../utils/vehicleType";
import { normalizeQueueEntry } from "../../utils/formatters";
import { QueueTable } from "./QueueTable";
import { CheckinModal } from "./CheckinModal";
import { CreateOrderModal } from "./CreateOrderModal";
import { DispatchModal } from "./DispatchModal";
import { OverrideModal } from "./OverrideModal";
import { ConfirmCancel } from "./ConfirmCancel";
import MobileHeader from "../common/MobileHeader";
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
  onRefetch?: () => void;
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
  onBack,
}: QueueBoardProps) {
  const { t } = useTranslation();
  const socketConnected = useQueueAdminStore((s) => s.socketConnected);
  const setSocketConnected = useQueueAdminStore((s) => s.setSocketConnected);

  const { data: vehicleTypesData } = useListVehicleTypesQuery();
  const vehicleTypesList = vehicleTypesData?.data || [];

  const [showCheckin, setShowCheckin] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [dispatchForType, setDispatchForType] = useState<{
    id: string;
    name: string;
    driverName?: string;
    driverPhone?: string;
  } | null>(null);
  const [overrideEntry, setOverrideEntry] = useState<DriverQueueEntry | null>(null);
  const [cancelEntry, setCancelEntry] = useState<DriverQueueEntry | null>(null);
  const [viewMode, setViewMode] = useState<"byType" | "all">("byType");

  useEffect(() => {
    const s = connectSocket();
    if (s?.connected) {
      setSocketConnected(true);
    }
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    s?.on("connect", handleConnect);
    s?.on("disconnect", handleDisconnect);

    subscribeToQueue(queueOrganizationUniqueId);
    const offEvent = onQueueEvent(() => {
      setSocketConnected(true);
    });

    return () => {
      s?.off("connect", handleConnect);
      s?.off("disconnect", handleDisconnect);
      unsubscribeFromQueue(queueOrganizationUniqueId);
      offEvent();
    };
  }, [queueOrganizationUniqueId, setSocketConnected]);

  useEffect(() => {
    if (status) {
      console.log("[QueueBoard] status payload:", status);
      console.log("[QueueBoard] available queues:", Object.keys(status.queues || {}));
      Object.entries(status.queues || {}).forEach(([k, entries]) => {
        console.log(`[QueueBoard] queue "${k}":`, entries);
      });
    }
  }, [status]);

  const resolveVehicleType = (typeKey: string, entries: DriverQueueEntry[] = []) => {
    const safeEntries = Array.isArray(entries) ? entries : [];
    const entryWithTypeId = safeEntries.find((e) => e?.vehicleTypeUniqueId);
    const resolvedId = entryWithTypeId?.vehicleTypeUniqueId || typeKey;
    const resolvedName = resolveVehicleName(typeKey, entryWithTypeId?.vehicleTypeName, vehicleTypesList);
    return { id: resolvedId, name: resolvedName };
  };

  const extractDriverName = (e?: any): string => {
    if (!e) return "";
    return e.driverName || e.fullName || e.driverFullName || e.name || e.driverUser?.fullName || "";
  };

  const extractDriverPhone = (e?: any): string => {
    if (!e) return "";
    return e.driverPhoneNumber || e.phoneNumber || e.driverPhone || e.phone || e.driverUser?.phoneNumber || "";
  };

  const queuesMap = useMemo<Record<string, DriverQueueEntry[]>>(() => {
    if (!status) return {};
    const rawQueues = status.queues || (status as any).data?.queues || (status as any).data;
    if (!rawQueues) return {};
    if (Array.isArray(rawQueues)) {
      const map: Record<string, DriverQueueEntry[]> = {};
      for (const item of rawQueues) {
        if (!item) continue;
        const entry = normalizeQueueEntry(item);
        const key = entry.vehicleTypeName || entry.vehicleTypeUniqueId || "Standard";
        if (!map[key]) map[key] = [];
        map[key].push(entry);
      }
      return map;
    }
    if (typeof rawQueues === "object" && rawQueues !== null) {
      const map: Record<string, DriverQueueEntry[]> = {};
      for (const [k, v] of Object.entries(rawQueues)) {
        if (Array.isArray(v)) {
          map[k] = v.map(normalizeQueueEntry);
        } else if (v && typeof v === "object") {
          map[k] = [normalizeQueueEntry(v)];
        }
      }
      return map;
    }
    return {};
  }, [status]);

  const allEntries: DriverQueueEntry[] = useMemo(() => {
    return Object.values(queuesMap).flat().filter(Boolean);
  }, [queuesMap]);

  const allWaitingCount = allEntries.filter((e) => {
    const s = String(e?.status || "").toLowerCase();
    return !s || s === "waiting" || s === "offered";
  }).length;

  const formattedType = orgType ? orgType.charAt(0).toUpperCase() + orgType.slice(1) : "";
  const subtitle = formattedType ? `${orgName} (${formattedType}) — ${city}` : `${orgName} — ${city}`;

  return (
    <div className="qb-page-container">
      {/* ── Common Mobile Navigation Header ── */}
      <div className="qb-mobile-top-header">
        <MobileHeader title="Live Queue" onBack={onBack} />
      </div>

      {/* ── Top Back Button (Desktop) ── */}
      {onBack && (
        <button type="button" className="qb-back-link qb-back-link--desktop" onClick={onBack}>
          <ArrowLeft size={16} />
          {t("queue.backToOrgs")}
        </button>
      )}

      {/* ── Header Section ── */}
      <div className="qb-header-section">
        <div className="qb-title-group">
          <div className="qb-title-row">
            <span className="qb-live-dot-indicator" title={socketConnected ? "Live" : "Connecting"} />
            <h1 className="qb-title-text">{t("queue.liveQueue")}</h1>
            <span className={`qb-live-badge ${socketConnected ? "live" : "connecting"}`}>
              <span className="qb-live-badge-dot" />
              {socketConnected ? t("queue.live") : t("queue.connecting")}
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
            <span>{t("queue.newOrder")}</span>
          </button>
          <button
            type="button"
            className="qb-btn-manual-checkin"
            onClick={() => setShowCheckin(true)}
            title={t("queue.manualCheckin")}
            aria-label={t("queue.manualCheckin")}
          >
            <UserPlus size={18} />
            <span className="qb-btn-text--desktop">{t("queue.manualCheckin")}</span>
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
          {t("queue.byVehicleType")}
        </button>
        <button
          type="button"
          className={`qb-tab-pill ${viewMode === "all" ? "active" : "inactive"}`}
          onClick={() => setViewMode("all")}
        >
          {t("queue.allDrivers")}
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
          {Object.entries(queuesMap).length === 0 ? (
            <div className="qb-card" style={{ textAlign: "center", padding: "3.5rem 1rem" }}>
              <p style={{ color: "#64748b", margin: 0 }}>{t("queue.noQueues")}</p>
            </div>
          ) : (
            Object.entries(queuesMap).map(([typeKey, rawEntries]) => {
              const entries = (rawEntries || []) as DriverQueueEntry[];
              const { id: typeId, name: typeName } = resolveVehicleType(typeKey, entries);
              const waitingCount = entries.filter((e: DriverQueueEntry) => {
                const s = String(e?.status || "").toLowerCase();
                return !s || s === "waiting" || s === "offered";
              }).length;
              const firstWaiting =
                entries.find((e: DriverQueueEntry) => {
                  const s = String(e?.status || "").toLowerCase();
                  return !s || s === "waiting" || s === "offered";
                }) || entries[0];

              return (
                <div key={typeKey} className="qb-card" style={{ marginBottom: "1.5rem" }}>
                  <div className="qb-card-header">
                    <div className="qb-card-title-row">
                      <div className="qb-card-title-name">
                        <h2 className="qb-card-title">{typeName}</h2>
                      </div>
                      <span className="qb-waiting-badge">{waitingCount} {t("queue.waiting")}</span>
                    </div>

                    <button
                      type="button"
                      className="qb-btn-dispatch-outline"
                      disabled={waitingCount === 0}
                      onClick={() =>
                        setDispatchForType({
                          id: typeId,
                          name: typeName,
                          driverName: extractDriverName(firstWaiting),
                          driverPhone: extractDriverPhone(firstWaiting),
                        })
                      }
                    >
                      <Play size={13} fill="currentColor" />
                      {t("queue.dispatch")}
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
              <div className="qb-card-title-name">
                <h2 className="qb-card-title">{t("queue.allDrivers")}</h2>
              </div>
              <span className="qb-waiting-badge">{allWaitingCount} {t("queue.waiting")}</span>
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
                  const { id, name } = resolveVehicleType(
                    firstWaiting.vehicleTypeName || firstWaiting.vehicleTypeUniqueId || "",
                    [firstWaiting]
                  );
                  setDispatchForType({
                    id,
                    name,
                    driverName: extractDriverName(firstWaiting),
                    driverPhone: extractDriverPhone(firstWaiting),
                  });
                }
              }}
            >
              <Play size={13} fill="currentColor" />
              {t("queue.dispatch")}
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
          onClose={() => setShowCreateOrder(false)}
        />
      )}
      {dispatchForType && (
        <DispatchModal
          queueOrganizationUniqueId={queueOrganizationUniqueId}
          vehicleTypeId={dispatchForType.id}
          vehicleTypeName={dispatchForType.name}
          driverName={dispatchForType.driverName}
          driverPhone={dispatchForType.driverPhone}
          onClose={() => setDispatchForType(null)}
        />
      )}
      {overrideEntry && (
        <OverrideModal
          entry={overrideEntry}
          onClose={() => setOverrideEntry(null)}
        />
      )}
      {cancelEntry && (
        <ConfirmCancel
          entry={cancelEntry}
          onClose={() => setCancelEntry(null)}
        />
      )}
    </div>
  );
}

export default QueueBoard;
