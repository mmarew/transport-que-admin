import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OrderDisplayItem } from "./OrdersTypes";

interface OrdersDeleteModalProps {
  order: OrderDisplayItem;
  onClose: () => void;
  onConfirm: () => void;
}

export function OrdersDeleteModal({ order, onClose, onConfirm }: OrdersDeleteModalProps) {
  const { t } = useTranslation();

  return (
    <div className="orders-modal-overlay" onClick={onClose}>
      <div
        className="orders-modal-content orders-modal-content--sm"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="orders-delete-body">
          <div className="orders-delete-icon-wrap">
            <AlertTriangle size={24} />
          </div>
          <h3 className="orders-modal-title">
            {t("orders.deleteOrderTitle", "Delete Order Request")}
          </h3>
          <p
            className="orders-modal-subtitle"
            style={{ textAlign: "center", marginTop: "0.5rem" }}
          >
            {t(
              "orders.deleteOrderDesc",
              "Are you sure you want to delete this order request? This action cannot be undone."
            )}
          </p>
          <div className="orders-delete-highlight">
            <strong>{order.shipper}</strong> — {order.item} ({order.origin} → {order.destination})
          </div>
        </div>

        <div className="orders-modal-footer" style={{ justifyContent: "center" }}>
          <button
            type="button"
            className="orders-modal-btn-cancel"
            onClick={onClose}
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            className="orders-modal-btn-delete"
            onClick={onConfirm}
          >
            {t("orders.deleteConfirm", "Yes, Delete Order")}
          </button>
        </div>
      </div>
    </div>
  );
}
