import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useManualCheckinMutation, useListVehicleDriversQuery } from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { checkinSchema, type CheckinFormValues } from "../../schemas/queue";

interface CheckinModalProps {
  queueOrganizationUniqueId: string;
  onCheckedIn?: () => void;
  onClose: () => void;
}

export function CheckinModal({ queueOrganizationUniqueId, onCheckedIn, onClose }: CheckinModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinSchema),
  });

  const [checkinMutation, { isLoading: isCheckingIn }] = useManualCheckinMutation();
  const { data: driversData, isLoading: isLoadingDrivers } = useListVehicleDriversQuery({
    queueOrganizationUniqueId,
  });

  const driverList = Array.isArray(driversData?.data) ? driversData.data : [];

  const handleFormSubmit = async (values: CheckinFormValues) => {
    try {
      const res = await checkinMutation({
        queueOrganizationUniqueId,
        vehicleDriverUniqueId: values.vehicleDriverUniqueId,
        queueNumber: values.queueNumber,
      }).unwrap();

      toast.success(res?.message || `Driver checked in at #${res?.data?.queueNumber ?? 1}`);
      onCheckedIn?.();
      onClose();
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  return (
    <div className="com-overlay">
      <div className="com-modal" style={{ maxWidth: "440px" }}>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <h2 className="com-title">Manual Check-In</h2>
          <p className="com-subtitle" style={{ marginBottom: "1.25rem" }}>
            Check a driver into the live waiting queue for this terminal.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="com-field-group">
              <label className="com-label">Select Driver / Vehicle</label>
              {driverList.length > 0 ? (
                <div className="com-select-wrap">
                  <select
                    {...register("vehicleDriverUniqueId")}
                    className={`com-select ${errors.vehicleDriverUniqueId ? "com-select-error" : ""}`}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {isLoadingDrivers ? "Loading drivers..." : "-- Select registered driver --"}
                    </option>
                    {driverList.map((d) => (
                      <option key={d.vehicleDriverUniqueId} value={d.vehicleDriverUniqueId}>
                        {d.driverName} ({d.driverPhoneNumber}) - {d.vehicleTypeName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  {...register("vehicleDriverUniqueId")}
                  placeholder="Enter vehicleDriverUniqueId"
                  className={`com-input ${errors.vehicleDriverUniqueId ? "com-input-error" : ""}`}
                />
              )}
              {errors.vehicleDriverUniqueId && (
                <p className="com-error-text">{errors.vehicleDriverUniqueId.message}</p>
              )}
            </div>

            <div className="com-field-group">
              <label className="com-label">
                Queue number <span style={{ color: "#94a3b8", fontWeight: "normal" }}>(optional, auto-assigned)</span>
              </label>
              <input
                type="number"
                min={1}
                {...register("queueNumber", { valueAsNumber: true })}
                placeholder="Auto-assigned next in line"
                className={`com-input ${errors.queueNumber ? "com-input-error" : ""}`}
              />
              {errors.queueNumber && <p className="com-error-text">{errors.queueNumber.message}</p>}
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
              disabled={isCheckingIn}
              className="com-btn-submit"
            >
              {isCheckingIn ? "Checking in…" : "Check In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CheckinModal;
