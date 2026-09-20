import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueueSocket } from "../../hooks/useQueueSocket";
import { useListVehicleTypesQuery } from "../../lib/redux/api";
import type { DriverQueueEntry, QueueStatusPayload } from "../../types/queue";
import { resolveVehicleName } from "../../utils/vehicleType";
import { normalizeQueuesMap } from "../../utils/formatters";
import { QueueVehicleTypeCard } from "./QueueVehicleTypeCard";
import { QueueAllDriversCard } from "./QueueAllDriversCard";
import { QueueBoardHeader } from "./QueueBoardHeader";
import { QueueBoardModals } from "./QueueBoardModals";
import MobileHeader from "../common/MobileHeader";
import "./QueueBoard.css";

export interface QueueBoardProps {
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
  onRefetch,
  onBack,
}: QueueBoardProps) {
  const { t } = useTranslation();
  const { isLive } = useQueueSocket(queueOrganizationUniqueId, onRefetch);

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
    if (status) {
      console.log("[QueueBoard] status payload:", status);
      console.log(
        "[QueueBoard] available queues:",
        Object.keys(status.queues || {}),
      );
      Object.entries(status.queues || {}).forEach(([k, entries]) => {
        console.log(`[QueueBoard] queue "${k}":`, entries);
      });
    }
  }, [status]);

  const resolveVehicleType = (
    typeKey: string,
    entries: DriverQueueEntry[] = [],
  ) => {
    const safeEntries = Array.isArray(entries) ? entries : [];
    const entryWithTypeId = safeEntries.find((e) => e?.vehicleTypeUniqueId);
    const resolvedId = entryWithTypeId?.vehicleTypeUniqueId || typeKey;
    const resolvedName = resolveVehicleName(
      typeKey,
      entryWithTypeId?.vehicleTypeName,
      vehicleTypesList,
    );
    return { id: resolvedId, name: resolvedName };
  };

  const queuesMap = useMemo<Record<string, DriverQueueEntry[]>>(() => {
    return normalizeQueuesMap(status, t("queueBoard.defaultStandard"));
  }, [status, t]);

  const allEntries: DriverQueueEntry[] = useMemo(() => {
    return Object.values(queuesMap).flat().filter(Boolean);
  }, [queuesMap]);

  const formattedType = orgType
    ? orgType.charAt(0).toUpperCase() + orgType.slice(1)
    : "";
  const subtitle = formattedType
    ? `${orgName} (${formattedType}) — ${city}`
    : `${orgName} — ${city}`;

  const liveState = isLive || Boolean(status);

  return (
    <div className="qb-page-container">
      {/* ── Common Mobile Navigation Header ── */}
      <div className="qb-mobile-top-header">
        <MobileHeader title={t("queue.liveQueue")} onBack={onBack} />
      </div>

      {/* ── Top Back Button (Desktop) ── */}
      {onBack && (
        <button
          type="button"
          className="qb-back-link qb-back-link--desktop"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          {t("queue.backToOrgs")}
        </button>
      )}

      {/* ── Header Section ── */}
      <QueueBoardHeader
        subtitle={subtitle}
        isLive={liveState}
        onNewOrder={() => setShowCreateOrder(true)}
        onManualCheckin={() => setShowCheckin(true)}
      />

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
        <div
          style={{ display: "flex", justifyContent: "center", padding: "4rem" }}
        >
          <span
            className="add-docs-spinner"
            style={{ borderColor: "#e2e8f0", borderTopColor: "#0B4D6D" }}
          />
        </div>
      )}

      {/* ── View Mode: By Vehicle Type ── */}
      {!isLoading && viewMode === "byType" && status && (
        <>
          {Object.entries(queuesMap).length === 0 ? (
            <div
              className="qb-card"
              style={{ textAlign: "center", padding: "3.5rem 1rem" }}
            >
              <p style={{ color: "#64748b", margin: 0 }}>
                {t("queue.noQueues")}
              </p>
            </div>
          ) : (
            Object.entries(queuesMap).map(([typeKey, rawEntries]) => {
              const entries = (rawEntries || []) as DriverQueueEntry[];
              const { id: typeId, name: typeName } = resolveVehicleType(
                typeKey,
                entries,
              );

              return (
                <QueueVehicleTypeCard
                  key={typeKey}
                  typeId={typeId}
                  typeName={typeName}
                  entries={entries}
                  queueOrganizationUniqueId={queueOrganizationUniqueId}
                  onDispatch={setDispatchForType}
                  onOverride={setOverrideEntry}
                  onRemove={setCancelEntry}
                />
              );
            })
          )}
        </>
      )}

      {/* ── View Mode: All Drivers ── */}
      {!isLoading && viewMode === "all" && (
        <QueueAllDriversCard
          entries={allEntries}
          queueOrganizationUniqueId={queueOrganizationUniqueId}
          resolveVehicleType={resolveVehicleType}
          onDispatch={setDispatchForType}
          onOverride={setOverrideEntry}
          onRemove={setCancelEntry}
        />
      )}

      {/* ── Modals Orchestration ── */}
      <QueueBoardModals
        queueOrganizationUniqueId={queueOrganizationUniqueId}
        origin={origin}
        showCheckin={showCheckin}
        onCloseCheckin={() => setShowCheckin(false)}
        showCreateOrder={showCreateOrder}
        onCloseCreateOrder={() => setShowCreateOrder(false)}
        dispatchForType={dispatchForType}
        onCloseDispatch={() => setDispatchForType(null)}
        overrideEntry={overrideEntry}
        onCloseOverride={() => setOverrideEntry(null)}
        cancelEntry={cancelEntry}
        onCloseCancel={() => setCancelEntry(null)}
      />
    </div>
  );
}

export default QueueBoard;
