import { Truck, User } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface DispatchTopCardsProps {
  typeDisplay: string;
  frontDriver: {
    name: string;
    phone?: string;
  };
}

export function DispatchTopCards({
  typeDisplay,
  frontDriver,
}: DispatchTopCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="dm-top-grid">
      <div className="dm-top-group">
        <span className="dm-top-label">{t("dispatchModal.vehicleType")}</span>
        <div className="dm-top-card">
          <div className="dm-icon-circle">
            <Truck size={20} />
          </div>
          <div className="dm-top-card-info">
            <span className="dm-top-card-title">{typeDisplay}</span>
          </div>
        </div>
      </div>

      <div className="dm-top-group">
        <span className="dm-top-label">
          {t("dispatchModal.frontWaitingDriver")}
        </span>
        <div className="dm-top-card">
          <div className="dm-icon-circle">
            <User size={20} />
          </div>
          <div className="dm-top-card-info">
            <span className="dm-top-card-title">{frontDriver.name}</span>
            {frontDriver.phone ? (
              <span className="dm-top-card-sub">{frontDriver.phone}</span>
            ) : (
              <span
                className="dm-top-card-sub"
                style={{ color: "#166534", fontWeight: 500 }}
              >
                {t("dispatchModal.frontPosition")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DispatchTopCards;
