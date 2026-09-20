import type { UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { CheckinFormValues } from "../../../schemas/queue";

interface CheckinPositionSectionProps {
  register: UseFormRegister<CheckinFormValues>;
  inputQueueNumber?: number;
  estimatedPosition: number;
  targetVehicleTypeName: string;
}

export function CheckinPositionSection({
  register,
  inputQueueNumber,
  estimatedPosition,
  targetVehicleTypeName,
}: CheckinPositionSectionProps) {
  const { t } = useTranslation();

  return (
    <div style={{ marginTop: "14px" }}>
      <h3 className="qm-section-title">{t("checkinModal.queuePosition")}</h3>
      <div className="qm-field-group">
        <label className="qm-field-label">
          {t("checkinModal.queuePositionOptional")}
        </label>
        <input
          type="number"
          min={1}
          {...register("queueNumber", { valueAsNumber: true })}
          placeholder={t("checkinModal.leaveBlankAuto")}
          className="qm-input"
        />
      </div>

      {/* Position Preview Card */}
      <div className="qm-card" style={{ marginTop: "6px" }}>
        <div
          className="qm-icon-circle"
          style={{ background: "#e0f2fe", color: "#034b6e" }}
        >
          {estimatedPosition}
        </div>
        <div className="qm-card-info">
          <span className="qm-card-title">
            {inputQueueNumber && Number(inputQueueNumber) > 0
              ? t("checkinModal.positionDisplay", { number: inputQueueNumber })
              : t("checkinModal.autoAssigned")}
          </span>
          <span className="qm-card-sub">
            {t("checkinModal.willBePlaced", {
              position: estimatedPosition,
              vehicleType: targetVehicleTypeName,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
