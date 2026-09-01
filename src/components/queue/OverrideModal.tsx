import { useForm } from "react-hook-form";
import { createPortal } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X, User } from "lucide-react";
import { useOverrideEntryMutation, useListVehicleTypesQuery } from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { overrideSchema, type OverrideFormValues } from "../../schemas/queue";
import type { DriverQueueEntry } from "../../types/queue";
import { resolveVehicleName } from "../../utils/vehicleType";
import { useModalA11y } from "../../hooks/useModalA11y";
import MobileHeader from "../common/MobileHeader";
import "./QueueModals.css";

interface OverrideModalProps {
  entry: DriverQueueEntry;
  onOverridden?: () => void;
  onClose: () => void;
}

export function OverrideModal({ entry, onOverridden, onClose }: OverrideModalProps) {
  const { t } = useTranslation();
  const modalRef = useModalA11y<HTMLDivElement>({ isOpen: true, onClose });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { queueNumber: entry.queueNumber, reason: "" },
  });

  const [overrideMutation, { isLoading }] = useOverrideEntryMutation();
  const { data: vtData } = useListVehicleTypesQuery();

  const handleFormSubmit = async (values: OverrideFormValues) => {
    try {
      const queueUniqueId =
        entry?.queueUniqueId ||
        (entry as any)?.driverQueueUniqueId ||
        (entry as any)?.id ||
        (entry as any)?.queueId;

      if (!queueUniqueId) {
        toast.error("Invalid queue entry identifier");
        return;
      }

      const res = await overrideMutation({
        queueUniqueId,
        body: {
          queueNumber: values.queueNumber,
          reason: values.reason?.trim() || undefined,
        },
      }).unwrap();

      toast.success(res?.message || `Driver position updated to #${values.queueNumber}`);
      onOverridden?.();
      onClose();
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  const vtList = vtData?.data || [];
  const driverName = entry.driverName || "Driver";
  const driverPhone = entry.driverPhoneNumber || "";
  const vehicleName = resolveVehicleName(entry.vehicleTypeUniqueId, entry.vehicleTypeName, vtList);

  return createPortal(
    <div className="qm-overlay">
      <div
        className="qm-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="override-modal-title"
      >
        {/* Mobile Header */}
        <div className="qm-mobile-header">
          <MobileHeader title="Override Queue Position" onBack={onClose} />
        </div>

        {/* Desktop Header */}
        <div className="qm-header qm-header--desktop">
          <div>
            <h2 id="override-modal-title" className="qm-title">Override Queue Position</h2>
            <p className="qm-subtitle">Change the position of a driver in the queue.</p>
          </div>
          <button type="button" className="qm-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {/* Top 2 Cards */}
          <div className="qm-top-grid">
            <div className="qm-card">
              <div className="qm-icon-circle">
                <User size={20} />
              </div>
              <div className="qm-card-info">
                <span className="qm-card-title">{driverName}</span>
                {driverPhone && <span className="qm-card-sub">{driverPhone}</span>}
              </div>
            </div>

            <div className="qm-card-col">
              <div className="qm-card-line">
                Vehicle: <strong>{vehicleName}</strong>
              </div>
              <div className="qm-card-line">
                Current Position: <strong>#{entry.queueNumber}</strong>
              </div>
            </div>
          </div>

          {/* New Queue Position */}
          <div className="qm-field-group" style={{ marginTop: "10px" }}>
            <label className="qm-section-title" style={{ margin: "0 0 4px 0" }}>
              New Queue Position
            </label>
            <input
              type="number"
              min={1}
              {...register("queueNumber", { valueAsNumber: true })}
              className="qm-input"
            />
            <p className="qm-hint-text">Enter the new position for this driver.</p>
            {errors.queueNumber && <p className="qm-error-text">{errors.queueNumber.message}</p>}
          </div>

          {/* Reason for Override */}
          <div className="qm-field-group" style={{ marginTop: "10px" }}>
            <label className="qm-section-title" style={{ margin: "0 0 4px 0" }}>
              Reason for Override
            </label>
            <textarea
              {...register("reason")}
              placeholder="Priority loading approved by terminal supervisor."
              rows={3}
              className="qm-textarea"
            />
            <p className="qm-hint-text">Provide a clear reason for this position change.</p>
            {errors.reason && <p className="qm-error-text">{errors.reason.message}</p>}
          </div>

          {/* Footer Actions */}
          <div className="qm-footer">
            <button type="button" onClick={onClose} className="qm-btn-cancel">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={isLoading} className="qm-btn-primary">
              {isLoading ? (
                <>
                  <span className="add-docs-spinner" style={{ width: 14, height: 14 }} />
                  {t("overrideModal.saving")}
                </>
              ) : (
                "Override Position"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default OverrideModal;
