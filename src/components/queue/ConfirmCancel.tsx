import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X, User } from "lucide-react";
import { useRemoveEntryMutation, useListVehicleTypesQuery } from "../../lib/redux/api";
import { getSocket } from "../../lib/socket";
import parseError from "../../utils/parseError";
import type { DriverQueueEntry } from "../../types/queue";
import { resolveVehicleName } from "../../utils/vehicleType";
import MobileHeader from "../common/MobileHeader";
import "./QueueModals.css";

interface ConfirmCancelProps {
  entry: DriverQueueEntry;
  onRemoved?: () => void;
  onClose: () => void;
}

export function ConfirmCancel({ entry, onRemoved, onClose }: ConfirmCancelProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [removeMutation, { isLoading }] = useRemoveEntryMutation();
  const { data: vtData } = useListVehicleTypesQuery();

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
            reason: reason.trim() || undefined,
          },
        };
        s.emit("queue", payload);
        s.emit("queue:cancel", payload);
        s.emit("queue_removed", payload);
      }

      toast.success(res?.message || `${entry.driverName || "Driver"} removed from queue`);
      onRemoved?.();
      onClose();
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  const vtList = vtData?.data || [];
  const driverName = entry.driverName || "Driver";
  const driverPhone = entry.driverPhoneNumber || "";
  const vehicleName = resolveVehicleName(entry.vehicleTypeUniqueId, entry.vehicleTypeName, vtList);
  const statusDisplay = entry.status ? entry.status.charAt(0).toUpperCase() + entry.status.slice(1) : "Waiting";

  return createPortal(
    <div className="qm-overlay">
      <div className="qm-modal">
        {/* Mobile Header */}
        <div className="qm-mobile-header">
          <MobileHeader title="Cancel Driver from Queue" onBack={onClose} />
        </div>

        {/* Desktop Header */}
        <div className="qm-header qm-header--desktop">
          <div>
            <h2 className="qm-title">Cancel Driver from Queue</h2>
            <p className="qm-subtitle">Are you sure you want to remove this driver from the queue?</p>
          </div>
          <button type="button" className="qm-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div>
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
                Current Status: <span className="qm-status-dot" /> <strong>{statusDisplay}</strong>
              </div>
            </div>
          </div>

          {/* Reason for Cancellation */}
          <div className="qm-field-group" style={{ marginTop: "10px" }}>
            <label className="qm-section-title" style={{ margin: "0 0 4px 0" }}>
              Reason for Cancellation
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Driver left the loading area."
              rows={3}
              className="qm-textarea"
            />
            <p className="qm-hint-text">Provide a clear reason for removing this driver.</p>
          </div>

          {/* Footer Actions */}
          <div className="qm-footer">
            <button type="button" onClick={onClose} className="qm-btn-cancel">
              Keep Driver
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isLoading}
              className="qm-btn-danger"
            >
              {isLoading ? (
                <>
                  <span className="add-docs-spinner" style={{ width: 14, height: 14 }} />
                  {t("cancelModal.cancelling")}
                </>
              ) : (
                "Cancel Driver"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmCancel;
