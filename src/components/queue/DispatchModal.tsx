import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  useDispatchQueueMutation,
  useGetShipperRequestsQuery,
} from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { dispatchSchema, type DispatchFormValues } from "../../schemas/queue";

interface DispatchModalProps {
  queueOrganizationUniqueId: string;
  vehicleTypeId: string;
  vehicleTypeName?: string;
  onDispatched?: () => void;
  onClose: () => void;
}

export function DispatchModal({
  queueOrganizationUniqueId,
  vehicleTypeId,
  vehicleTypeName,
  onDispatched,
  onClose,
}: DispatchModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DispatchFormValues>({
    resolver: zodResolver(dispatchSchema),
  });

  const [dispatchMutation, { isLoading: isDispatching }] = useDispatchQueueMutation();
  const { data: ordersData } = useGetShipperRequestsQuery(
    { queueOrganizationUniqueId, target: "all", page: 1, limit: 50 },
    { skip: !queueOrganizationUniqueId }
  );

  const typeDisplay = vehicleTypeName || vehicleTypeId;

  // Filter pending orders matching this vehicle type
  const availableOrders = Array.isArray(ordersData?.data)
    ? ordersData.data.filter(
        (o) =>
          o.shipperRequest?.vehicleTypeUniqueId === vehicleTypeId &&
          o.shipperRequest?.journeyStatusId === 1
      )
    : [];

  const handleFormSubmit = async (values: DispatchFormValues) => {
    try {
      const payload: {
        queueOrganizationUniqueId: string;
        vehicleTypeUniqueId: string;
        shipperRequestUniqueId?: string;
      } = {
        queueOrganizationUniqueId,
        vehicleTypeUniqueId: vehicleTypeId,
      };

      const cleanShipperReqId = values.shipperRequestUniqueId?.trim();
      if (cleanShipperReqId) {
        payload.shipperRequestUniqueId = cleanShipperReqId;
      }

      const res = await dispatchMutation(payload).unwrap();

      const queueNum = res?.data?.queueNumber;
      toast.success(res?.message || (queueNum ? `Offered to front driver #${queueNum}` : "Dispatch offer sent successfully"));
      onDispatched?.();
      onClose();
    } catch (err: unknown) {
      const errObj = typeof err === "object" && err !== null ? (err as Record<string, unknown>) : null;
      const is404 = errObj?.status === 404 || errObj?.originalStatus === 404;
      if (is404) {
        toast.error("Dispatch failed: No drivers are currently waiting in the queue for this vehicle type.");
      } else {
        toast.error(parseError(err));
      }
    }
  };

  return (
    <div className="com-overlay">
      <div className="com-modal" style={{ maxWidth: "440px" }}>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <h2 className="com-title">Dispatch to Front Driver</h2>
          <p className="com-subtitle" style={{ marginBottom: "1.25rem" }}>
            Vehicle Type: <strong style={{ color: "#0B4D6D" }}>{typeDisplay}</strong>
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="com-field-group">
              <label className="com-label">
                Select Shipper Order <span style={{ color: "#0B4D6D", fontWeight: "600" }}>*</span>
              </label>
              {availableOrders.length > 0 ? (
                <div className="com-select-wrap">
                  <select
                    {...register("shipperRequestUniqueId", {
                      required: "Please select an order to dispatch to the driver",
                    })}
                    className={`com-select ${errors.shipperRequestUniqueId ? "com-select-error" : ""}`}
                    defaultValue={availableOrders[0]?.shipperRequest?.shipperRequestUniqueId || ""}
                  >
                    <option value="">-- Select an Order --</option>
                    {availableOrders.map(({ shipperRequest }) => (
                      <option
                        key={shipperRequest.shipperRequestUniqueId}
                        value={shipperRequest.shipperRequestUniqueId}
                      >
                        {shipperRequest.shippableItemName} ({Number(shipperRequest.shippableItemQtyInQuintal)} Qtl) → {shipperRequest.destinationPlace}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <input
                    {...register("shipperRequestUniqueId", {
                      required: "Shipper Request ID is required for dispatch",
                    })}
                    placeholder="Enter accepted shipperRequestUniqueId"
                    className={`com-input ${errors.shipperRequestUniqueId ? "com-input-error" : ""}`}
                  />
                  <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "4px 0 0 0" }}>
                    No pending orders found for this vehicle type. Create an order using the <strong>+ Create Order</strong> button on the dashboard first, or paste an active order ID above.
                  </p>
                </>
              )}
              {errors.shipperRequestUniqueId && (
                <p className="com-error-text">{errors.shipperRequestUniqueId.message}</p>
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
              disabled={isDispatching}
              className="com-btn-submit"
            >
              {isDispatching ? "Dispatching…" : "Dispatch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DispatchModal;
