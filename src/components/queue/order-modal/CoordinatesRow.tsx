import { useTranslation } from "react-i18next";

export interface CoordinatesRowProps {
  originLat?: string;
  originLng?: string;
  destLat?: string;
  destLng?: string;
}

/**
 * CoordinatesRow displays auto-filled latitude and longitude for origin and destination (desktop).
 */
export function CoordinatesRow({
  originLat,
  originLng,
  destLat,
  destLng,
}: CoordinatesRowProps) {
  const { t } = useTranslation();

  return (
    <div className="com-coords-row com-grid-2">
      <div className="com-grid-2">
        <div className="com-field-group">
          <label className="com-label">{t("orders.latitude")}</label>
          <input
            value={originLat ?? ""}
            readOnly
            placeholder={t("common.autoFilled")}
            className="com-input com-input-readonly"
          />
        </div>
        <div className="com-field-group">
          <label className="com-label">{t("orders.longitude")}</label>
          <input
            value={originLng ?? ""}
            readOnly
            placeholder={t("common.autoFilled")}
            className="com-input com-input-readonly"
          />
        </div>
      </div>

      <div className="com-grid-2">
        <div className="com-field-group">
          <label className="com-label">{t("orders.latitude")}</label>
          <input
            value={destLat ?? ""}
            readOnly
            placeholder={t("common.autoFilled")}
            className="com-input com-input-readonly"
          />
        </div>
        <div className="com-field-group">
          <label className="com-label">{t("orders.longitude")}</label>
          <input
            value={destLng ?? ""}
            readOnly
            placeholder={t("common.autoFilled")}
            className="com-input com-input-readonly"
          />
        </div>
      </div>
    </div>
  );
}

export default CoordinatesRow;
