import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User, BarChart2, Building2, ChevronRight } from "lucide-react";

export interface MobileAccountSectionProps {
  onOpenProfile: () => void;
}

/**
 * MobileAccountSection renders the Account category links in mobile settings.
 */
export function MobileAccountSection({
  onOpenProfile,
}: MobileAccountSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="settings-section">
      <h2 className="settings-section__label">{t("settings.account")}</h2>
      <div className="settings-group">
        <button
          type="button"
          className="settings-item"
          onClick={onOpenProfile}
        >
          <span className="settings-item__icon">
            <User size={18} />
          </span>
          <span className="settings-item__label">
            {t("settings.myProfile")}
          </span>
          <ChevronRight size={16} className="settings-item__chevron" />
        </button>

        <button
          type="button"
          className="settings-item"
          onClick={() => navigate("/reports")}
        >
          <span className="settings-item__icon">
            <BarChart2 size={18} />
          </span>
          <span className="settings-item__label">
            {t("settings.analytics")}
          </span>
          <ChevronRight size={16} className="settings-item__chevron" />
        </button>

        <button
          type="button"
          className="settings-item"
          onClick={() => navigate("/organizations")}
        >
          <span className="settings-item__icon">
            <Building2 size={18} />
          </span>
          <span className="settings-item__label">
            {t("nav.organizations")}
          </span>
          <ChevronRight size={16} className="settings-item__chevron" />
        </button>
      </div>
    </section>
  );
}

export default MobileAccountSection;
