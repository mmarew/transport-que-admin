import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Laptop,
  Loader2,
  LogOut,
  Monitor,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
  listSessions,
  revokeOtherSessions,
  revokeSession,
  type UserSession,
} from "@/services/session.service";

type PendingAction = { kind: "one"; session: UserSession } | { kind: "others" };

const platformIcon = (platform: string | null) => {
  if (platform === "ios" || platform === "android") {
    return Smartphone;
  }
  if (platform === "web") {
    return Monitor;
  }
  return Laptop;
};

const formatWhen = (value: string | null) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
};

/**
 * ActiveDevicesSection lists every server-side session for the signed-in user
 * and lets them revoke one device or all other devices.
 *
 * Revoking the current session clears the httpOnly cookie server-side; the
 * page is then sent to /login so the browser cannot keep using a dead cookie.
 */
export function ActiveDevicesSection() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [working, setWorking] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await listSessions();
      setSessions(response.data?.data?.sessions ?? []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    await fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    // No synchronous setState here: `fetchSessions` only updates state after
    // the request settles, which keeps the initial render stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch on mount
    fetchSessions();
  }, [fetchSessions]);

  const handleConfirm = async () => {
    if (!pending) {
      return;
    }
    setWorking(true);
    try {
      if (pending.kind === "others") {
        const response = await revokeOtherSessions(true);
        const count = response.data?.data?.revokedCount ?? 0;
        toast.success(
          t("settings.activeDevices.revokedOthers", { count }),
        );
        setPending(null);
        await load();
        return;
      }

      const { session } = pending;
      await revokeSession(session.sessionUniqueId);
      setPending(null);

      if (session.current) {
        toast.success(t("settings.activeDevices.revokedCurrent"));
        window.location.assign("/login");
        return;
      }

      toast.success(t("settings.activeDevices.revokedOne"));
      await load();
    } catch {
      toast.error(t("settings.activeDevices.actionError"));
    } finally {
      setWorking(false);
    }
  };

  const otherDevices = sessions.filter((session) => !session.current);

  return (
    <section className="sdt-section" aria-labelledby="active-devices-title">
      <div className="ad-section-header">
        <div>
          <h3 className="sdt-section__title" id="active-devices-title">
            {t("settings.activeDevices.title")}
          </h3>
          <p className="ad-section-desc">
            {t("settings.activeDevices.description")}
          </p>
        </div>
        <button
          type="button"
          className="ad-refresh"
          onClick={load}
          disabled={loading}
          aria-label={t("settings.activeDevices.refresh")}
          title={t("settings.activeDevices.refresh")}
        >
          <RefreshCw size={16} className={loading ? "ad-spin" : undefined} />
        </button>
      </div>

      {loading ? (
        <div className="ad-state" role="status">
          <Loader2 size={20} className="ad-spin" />
          <span>{t("settings.activeDevices.loading")}</span>
        </div>
      ) : loadError ? (
        <div className="ad-state ad-state--error" role="alert">
          <span>{t("settings.activeDevices.loadError")}</span>
          <button type="button" className="ad-retry" onClick={load}>
            {t("settings.activeDevices.retry")}
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="ad-state">{t("settings.activeDevices.empty")}</div>
      ) : (
        <>
          <ul className="ad-list">
            {sessions.map((session) => {
              const Icon = platformIcon(session.platform);
              const platformLabel = t(
                `settings.activeDevices.platform.${session.platform ?? "unknown"}`,
                { defaultValue: t("settings.activeDevices.platform.unknown") },
              );
              const deviceLabel =
                session.deviceName ||
                session.deviceModel ||
                platformLabel;
              const lastSeen = formatWhen(session.lastSeenAt);

              return (
                <li className="ad-item" key={session.sessionUniqueId}>
                  <span className="ad-item-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>

                  <div className="ad-item-body">
                    <div className="ad-item-title-row">
                      <span className="ad-item-name">{deviceLabel}</span>
                      {session.current && (
                        <span className="ad-badge">
                          {t("settings.activeDevices.thisDevice")}
                        </span>
                      )}
                    </div>
                    <div className="ad-item-meta">
                      {[platformLabel, session.appVersion ? `v${session.appVersion}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    {lastSeen && (
                      <div className="ad-item-meta">
                        {t("settings.activeDevices.lastSeen", { when: lastSeen })}
                      </div>
                    )}
                    {session.ipAddress && (
                      <div className="ad-item-meta">{session.ipAddress}</div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="ad-revoke"
                    onClick={() => setPending({ kind: "one", session })}
                    title={t("settings.activeDevices.revokeDevice")}
                    aria-label={t("settings.activeDevices.revokeDevice")}
                  >
                    <LogOut size={16} />
                  </button>
                </li>
              );
            })}
          </ul>

          {otherDevices.length > 0 && (
            <button
              type="button"
              className="ad-revoke-all"
              onClick={() => setPending({ kind: "others" })}
            >
              <LogOut size={16} />
              {t("settings.activeDevices.revokeOthers")}
            </button>
          )}
        </>
      )}

      <Modal
        open={Boolean(pending)}
        onClose={() => (working ? undefined : setPending(null))}
        variant="qm"
        role="alertdialog"
        containerClassName="qm-modal--sm"
      >
        <div className="qm-header">
          <div>
            <h2 className="qm-title">
              {pending?.kind === "others"
                ? t("settings.activeDevices.confirmOthersTitle")
                : t("settings.activeDevices.confirmTitle")}
            </h2>
            <p className="qm-subtitle">
              {pending?.kind === "others"
                ? t("settings.activeDevices.confirmOthersDesc")
                : t("settings.activeDevices.confirmDesc")}
            </p>
          </div>
        </div>

        <div className="qm-footer" style={{ marginTop: "20px" }}>
          <button
            type="button"
            onClick={() => setPending(null)}
            className="qm-btn-cancel"
            disabled={working}
          >
            {t("settings.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="qm-btn-danger"
            disabled={working}
          >
            {working ? (
              <Loader2 size={16} className="ad-spin" />
            ) : (
              t("settings.activeDevices.confirmButton")
            )}
          </button>
        </div>
      </Modal>
    </section>
  );
}

export default ActiveDevicesSection;
