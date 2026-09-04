import React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrderDisplayItem } from "./OrdersTypes";

interface OrdersEditModalProps {
  order: OrderDisplayItem;
  onClose: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function OrdersEditModal({ order, onClose, onSave }: OrdersEditModalProps) {
  const { t } = useTranslation();

  return (
    <div className="orders-modal-overlay" onClick={onClose}>
      <div
        className="orders-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="orders-modal-header">
          <div>
            <h3 className="orders-modal-title">
              {t("orders.editOrderTitle", "Edit Shipper Order")}
            </h3>
            <p className="orders-modal-subtitle">
              {t("orders.editOrderSubtitle", "Update freight and delivery details.")}
            </p>
          </div>
          <button
            type="button"
            className="orders-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSave} className="orders-modal-form">
          <div className="orders-form-grid">
            <div className="orders-form-group">
              <label className="orders-form-label">
                {t("orders.table.shipper", "Shipper Name")}
              </label>
              <input
                name="shipper"
                defaultValue={order.shipper}
                required
                className="orders-form-input"
              />
            </div>

            <div className="orders-form-group">
              <label className="orders-form-label">
                {t("orders.table.type", "Request Type")}
              </label>
              <select
                name="type"
                defaultValue={order.type}
                className="orders-form-select"
              >
                <option value="Individual">{t("orders.modeIndividual", "Individual")}</option>
                <option value="Group">{t("orders.modeGroup", "Group")}</option>
              </select>
            </div>

            <div className="orders-form-group">
              <label className="orders-form-label">
                {t("orders.table.vehicleType", "Vehicle Type")}
              </label>
              <input
                name="vehicleType"
                defaultValue={order.vehicleType}
                required
                className="orders-form-input"
              />
            </div>

            <div className="orders-form-group">
              <label className="orders-form-label">
                {t("orders.table.item", "Item")}
              </label>
              <input
                name="item"
                defaultValue={order.item}
                required
                className="orders-form-input"
              />
            </div>

            <div className="orders-form-group">
              <label className="orders-form-label">
                {t("orders.origin", "Origin Location")}
              </label>
              <input
                name="origin"
                defaultValue={order.origin}
                required
                className="orders-form-input"
              />
            </div>

            <div className="orders-form-group">
              <label className="orders-form-label">
                {t("orders.destination", "Destination Location")}
              </label>
              <input
                name="destination"
                defaultValue={order.destination}
                required
                className="orders-form-input"
              />
            </div>

            <div className="orders-form-group">
              <label className="orders-form-label">
                {t("orders.table.quintal", "Quintal")}
              </label>
              <input
                name="quintal"
                type="number"
                min={1}
                defaultValue={order.quintal}
                required
                className="orders-form-input"
              />
            </div>

            <div className="orders-form-group">
              <label className="orders-form-label">
                {t("orders.table.cost", "Cost (ETB)")}
              </label>
              <input
                name="cost"
                type="number"
                min={0}
                defaultValue={order.cost}
                required
                className="orders-form-input"
              />
            </div>

            <div className="orders-form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="orders-form-label">Status</label>
              <select
                name="status"
                defaultValue={order.status}
                className="orders-form-select"
              >
                <option value="ongoing">{t("orders.ongoingTab", "Ongoing")}</option>
                <option value="complete">{t("orders.completeTab", "Complete")}</option>
              </select>
            </div>
          </div>

          <div className="orders-modal-footer">
            <button
              type="button"
              className="orders-modal-btn-cancel"
              onClick={onClose}
            >
              {t("common.cancel", "Cancel")}
            </button>
            <button type="submit" className="orders-modal-btn-submit">
              {t("orders.saveChanges", "Save Changes")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
