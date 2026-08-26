import { toast } from "sonner";
import { useRemoveEntryMutation } from "../../lib/redux/api";
import { getSocket } from "../../lib/socket";
import parseError from "../../utils/parseError";
import type { DriverQueueEntry } from "../../types/queue";

interface ConfirmCancelProps {
  entry: DriverQueueEntry;
  onRemoved?: () => void;
  onClose: () => void;
}

export function ConfirmCancel({ entry, onRemoved, onClose }: ConfirmCancelProps) {
  const [removeMutation, { isLoading }] = useRemoveEntryMutation();

  const handleRemove = async () => {
    try {
      const res = await removeMutation(entry.queueUniqueId).unwrap();

      // Broadcast socket events so driver mobile clients can dismiss active offer immediately
      const s = getSocket();
      if (s?.connected) {
        const payload = {
          message: "success",
          messageTypes: "queue_removed",
          data: {
            queueUniqueId: entry.queueUniqueId,
            driverUserUniqueId: entry.driverUserUniqueId,
            vehicleDriverUniqueId: entry.vehicleDriverUniqueId,
            shipperRequestUniqueId: entry.shipperRequestUniqueId,
          },
        };
        s.emit("queue", payload);
        s.emit("queue:cancel", payload);
        s.emit("queue_removed", payload);
      }

      toast.success(res?.message || `${entry.driverName} removed from queue`);
      onRemoved?.();
      onClose();
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  return (
    <div className="com-overlay">
      <div className="com-modal" style={{ maxWidth: "400px" }}>
        <h2 className="com-title">Cancel Driver from Queue</h2>
        <p className="com-subtitle" style={{ marginBottom: "1.25rem" }}>
          Are you sure you want to remove <strong style={{ color: "#0B4D6D" }}>{entry.driverName}</strong> (#{entry.queueNumber}) from the line? This action is audit-logged.
        </p>

        <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="button"
            onClick={onClose}
            className="com-btn-cancel"
          >
            Keep in Queue
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isLoading}
            style={{
              backgroundColor: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? "Removing…" : "Cancel Driver"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmCancel;
