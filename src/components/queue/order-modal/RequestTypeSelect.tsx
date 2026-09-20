import { useTranslation } from "react-i18next";
import { Globe, Building2 } from "lucide-react";

export interface RequestTypeSelectProps {
  value: "individual_target" | "company_target";
  onChange: (value: "individual_target" | "company_target") => void;
}

/**
 * RequestTypeSelect renders the mode selector toggle (Individual vs Company target).
 */
export function RequestTypeSelect({ value, onChange }: RequestTypeSelectProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="com-section-title">
        {t("orders.requestType", "Request Type")}
      </h3>
      <div className="com-type-grid">
        <button
          type="button"
          className={`com-type-card ${value === "individual_target" ? "selected" : ""}`}
          onClick={() => onChange("individual_target")}
        >
          <Globe size={18} className="com-type-card-icon" />
          <span>{t("orders.individualTarget", "Individual Target")}</span>
        </button>
        <button
          type="button"
          className={`com-type-card ${value === "company_target" ? "selected" : ""}`}
          onClick={() => onChange("company_target")}
        >
          <Building2 size={18} className="com-type-card-icon" />
          <span>{t("orders.companyTarget", "Company Target")}</span>
        </button>
      </div>
    </div>
  );
}

export default RequestTypeSelect;
