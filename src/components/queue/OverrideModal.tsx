import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useOverrideEntryMutation } from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { overrideSchema, type OverrideFormValues } from "../../schemas/queue";
import type { DriverQueueEntry } from "../../types/queue";

interface OverrideModalProps {
  entry: DriverQueueEntry;
  onOverridden?: () => void;
  onClose: () => void;
}

export function OverrideModal({ entry, onOverridden, onClose }: OverrideModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { queueNumber: entry.queueNumber, reason: "" },
  });

  const [overrideMutation, { isLoading }] = useOverrideEntryMutation();

  const handleFormSubmit = async (values: OverrideFormValues) => {
    try {
      const res = await overrideMutation({
        queueUniqueId: entry.queueUniqueId,
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

  return (
    <div className="com-overlay">
      <div className="com-modal" style={{ maxWidth: "420px" }}>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <h2 className="com-title">Override Position</h2>
          <p className="com-subtitle" style={{ marginBottom: "1.25rem" }}>
            {entry.driverName} ({entry.driverPhoneNumber}) — currently <strong style={{ color: "#0B4D6D" }}>#{entry.queueNumber}</strong>
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="com-field-group">
              <label className="com-label">
                New Queue Number <span style={{ color: "#0B4D6D" }}>*</span>
              </label>
              <input
                type="number"
                min={1}
                {...register("queueNumber", { valueAsNumber: true })}
                className={`com-input ${errors.queueNumber ? "com-input-error" : ""}`}
              />
              {errors.queueNumber && (
                <p className="com-error-text">{errors.queueNumber.message}</p>
              )}
            </div>

            <div className="com-field-group">
              <label className="com-label">
                Reason <span style={{ color: "#94a3b8", fontWeight: "normal" }}>(audit logged)</span>
              </label>
              <textarea
                {...register("reason")}
                placeholder="e.g. physically first, app login failed"
                rows={3}
                className="com-input"
                style={{ resize: "vertical", minHeight: "75px" }}
              />
              {errors.reason && (
                <p className="com-error-text">{errors.reason.message}</p>
              )}
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              className="com-btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="com-btn-submit"
            >
              {isLoading ? "Saving…" : "Override"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OverrideModal;
