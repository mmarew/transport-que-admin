import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Globe, HelpCircle, Shield, Share2, ChevronDown, ChevronRight } from "lucide-react";

export interface MobileMoreSectionProps {
  currentLang: "en" | "am";
  onLanguageChange: (lang: "en" | "am") => void;
}

/**
 * MobileMoreSection renders the language dropdown and support links for mobile settings.
 */
export function MobileMoreSection({
  currentLang,
  onLanguageChange,
}: MobileMoreSectionProps) {
  const { t } = useTranslation();
  const [mobileLangOpen, setMobileLangOpen] = useState(false);
  const mobileLangRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        mobileLangRef.current &&
        !mobileLangRef.current.contains(e.target as Node)
      ) {
        setMobileLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <section className="settings-section">
      <h2 className="settings-section__label">{t("settings.more")}</h2>
      <div className="settings-group">
        <div className="settings-item-dropdown" ref={mobileLangRef}>
          <button
            type="button"
            className="settings-item"
            onClick={() => setMobileLangOpen((v) => !v)}
          >
            <span className="settings-item__icon">
              <Globe size={18} />
            </span>
            <span className="settings-item__label">{t("settings.language")}</span>
            <span className="settings-item__value">
              {currentLang === "en" ? "English" : "አማርኛ"}
            </span>
            <ChevronDown
              size={15}
              className={`settings-item__chevron ${mobileLangOpen ? "open" : ""}`}
            />
          </button>

          {mobileLangOpen && (
            <div className="settings-dropdown-menu">
              <button
                type="button"
                className={`settings-dropdown-option ${currentLang === "en" ? "active" : ""}`}
                onClick={() => {
                  onLanguageChange("en");
                  setMobileLangOpen(false);
                }}
              >
                English
              </button>
              <button
                type="button"
                className={`settings-dropdown-option ${currentLang === "am" ? "active" : ""}`}
                onClick={() => {
                  onLanguageChange("am");
                  setMobileLangOpen(false);
                }}
              >
                አማርኛ
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="settings-item"
          onClick={() => toast.info(t("settings.comingSoon"))}
        >
          <span className="settings-item__icon">
            <HelpCircle size={18} />
          </span>
          <span className="settings-item__label">{t("settings.helpCenter")}</span>
          <ChevronRight size={16} className="settings-item__chevron" />
        </button>

        <button
          type="button"
          className="settings-item"
          onClick={() => toast.info(t("settings.comingSoon"))}
        >
          <span className="settings-item__icon">
            <Shield size={18} />
          </span>
          <span className="settings-item__label">
            {t("settings.privacyPolicy")}
          </span>
          <ChevronRight size={16} className="settings-item__chevron" />
        </button>

        <button
          type="button"
          className="settings-item"
          onClick={() => toast.info(t("settings.comingSoon"))}
        >
          <span className="settings-item__icon">
            <Share2 size={18} />
          </span>
          <span className="settings-item__label">
            {t("settings.inviteFriends")}
          </span>
          <ChevronRight size={16} className="settings-item__chevron" />
        </button>
      </div>
    </section>
  );
}

export default MobileMoreSection;
