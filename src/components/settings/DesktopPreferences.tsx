import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, ChevronDown } from "lucide-react";

export interface DesktopPreferencesProps {
  pushNotif: boolean;
  emailNotif: boolean;
  twoFactor: boolean;
  darkMode: boolean;
  currentLang: "en" | "am";
  onTogglePush: (val: boolean) => void;
  onToggleEmail: (val: boolean) => void;
  onToggle2FA: (val: boolean) => void;
  onToggleDarkMode: (val: boolean) => void;
  onLanguageChange: (lang: "en" | "am") => void;
}

/**
 * DesktopPreferences renders preference toggles (Push, Email, 2FA, Dark Mode)
 * and language selection for the desktop layout.
 */
export function DesktopPreferences({
  pushNotif,
  emailNotif,
  twoFactor,
  darkMode,
  currentLang,
  onTogglePush,
  onToggleEmail,
  onToggle2FA,
  onToggleDarkMode,
  onLanguageChange,
}: DesktopPreferencesProps) {
  const { t } = useTranslation();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="sdt-section">
      <h3 className="sdt-section__title">{t("settings.preferences")}</h3>
      <div className="sdt-pref-list">
        {/* Push Notifications */}
        <div className="sdt-pref-row">
          <div>
            <div className="sdt-pref-label">{t("settings.pushNotif")}</div>
            <div className="sdt-pref-desc">{t("settings.pushNotifDesc")}</div>
          </div>
          <label className="sdt-toggle">
            <input
              type="checkbox"
              checked={pushNotif}
              onChange={(e) => onTogglePush(e.target.checked)}
            />
            <span className="sdt-toggle-slider" />
          </label>
        </div>

        {/* Email Notifications */}
        <div className="sdt-pref-row">
          <div>
            <div className="sdt-pref-label">{t("settings.emailNotif")}</div>
            <div className="sdt-pref-desc">{t("settings.emailNotifDesc")}</div>
          </div>
          <label className="sdt-toggle">
            <input
              type="checkbox"
              checked={emailNotif}
              onChange={(e) => onToggleEmail(e.target.checked)}
            />
            <span className="sdt-toggle-slider" />
          </label>
        </div>

        {/* Two-Factor Auth */}
        <div className="sdt-pref-row">
          <div>
            <div className="sdt-pref-label">{t("settings.twoFactor")}</div>
            <div className="sdt-pref-desc">{t("settings.twoFactorDesc")}</div>
          </div>
          <label className="sdt-toggle">
            <input
              type="checkbox"
              checked={twoFactor}
              onChange={(e) => onToggle2FA(e.target.checked)}
            />
            <span className="sdt-toggle-slider" />
          </label>
        </div>

        {/* Dark Mode */}
        <div className="sdt-pref-row">
          <div>
            <div className="sdt-pref-label">{t("settings.darkMode")}</div>
            <div className="sdt-pref-desc">{t("settings.darkModeDesc")}</div>
          </div>
          <label className="sdt-toggle">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => onToggleDarkMode(e.target.checked)}
            />
            <span className="sdt-toggle-slider" />
          </label>
        </div>

        {/* Preferred Language */}
        <div className="sdt-pref-row">
          <div>
            <div className="sdt-pref-label">{t("settings.preferredLang")}</div>
            <div className="sdt-pref-desc">{t("settings.langDesc")}</div>
          </div>

          <div className="settings-lang-wrap" ref={langRef}>
            <button
              type="button"
              className="settings-lang-btn"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            >
              <Globe size={15} />
              <span>{currentLang === "am" ? "አማርኛ" : "English"}</span>
              <ChevronDown size={14} />
            </button>

            {langDropdownOpen && (
              <div className="settings-lang-dropdown">
                <button
                  type="button"
                  className={`settings-lang-option ${currentLang === "en" ? "settings-lang-option--active" : ""}`}
                  onClick={() => {
                    onLanguageChange("en");
                    setLangDropdownOpen(false);
                  }}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`settings-lang-option ${currentLang === "am" ? "settings-lang-option--active" : ""}`}
                  onClick={() => {
                    onLanguageChange("am");
                    setLangDropdownOpen(false);
                  }}
                >
                  አማርኛ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DesktopPreferences;
