import { useTranslation } from "react-i18next";
import { Moon, Sun, Bell, Shield } from "lucide-react";

export interface MobilePreferencesSectionProps {
  pushNotif: boolean;
  emailNotif: boolean;
  twoFactor: boolean;
  darkMode: boolean;
  onTogglePush: (val: boolean) => void;
  onToggleEmail: (val: boolean) => void;
  onToggle2FA: (val: boolean) => void;
  onToggleDarkMode: (val: boolean) => void;
}

/**
 * MobilePreferencesSection renders preference toggles for the mobile view.
 */
export function MobilePreferencesSection({
  pushNotif,
  emailNotif,
  twoFactor,
  darkMode,
  onTogglePush,
  onToggleEmail,
  onToggle2FA,
  onToggleDarkMode,
}: MobilePreferencesSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="settings-section">
      <h2 className="settings-section__label">{t("settings.theme")}</h2>
      <div className="settings-group">
        <div className="settings-toggle-row">
          <span className="settings-toggle-row__icon">
            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
          </span>
          <span className="settings-toggle-row__label">
            {t("settings.darkMode")}
          </span>
          <label className="sdt-toggle">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => onToggleDarkMode(e.target.checked)}
            />
            <span className="sdt-toggle-slider" />
          </label>
        </div>

        <div className="settings-toggle-row">
          <span className="settings-toggle-row__icon">
            <Bell size={18} />
          </span>
          <span className="settings-toggle-row__label">
            {t("settings.pushNotif")}
          </span>
          <label className="sdt-toggle">
            <input
              type="checkbox"
              checked={pushNotif}
              onChange={(e) => onTogglePush(e.target.checked)}
            />
            <span className="sdt-toggle-slider" />
          </label>
        </div>

        <div className="settings-toggle-row">
          <span className="settings-toggle-row__icon">
            <Bell size={18} />
          </span>
          <span className="settings-toggle-row__label">
            {t("settings.emailNotif")}
          </span>
          <label className="sdt-toggle">
            <input
              type="checkbox"
              checked={emailNotif}
              onChange={(e) => onToggleEmail(e.target.checked)}
            />
            <span className="sdt-toggle-slider" />
          </label>
        </div>

        <div className="settings-toggle-row">
          <span className="settings-toggle-row__icon">
            <Shield size={18} />
          </span>
          <span className="settings-toggle-row__label">
            {t("settings.twoFactor")}
          </span>
          <label className="sdt-toggle">
            <input
              type="checkbox"
              checked={twoFactor}
              onChange={(e) => onToggle2FA(e.target.checked)}
            />
            <span className="sdt-toggle-slider" />
          </label>
        </div>
      </div>
    </section>
  );
}

export default MobilePreferencesSection;
