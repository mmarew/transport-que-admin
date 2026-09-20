import { useTranslation } from "react-i18next";
import { formatDate } from "../../../utils/formatters";

export interface DispatchOrderSummaryProps {
  order: any;
  typeDisplay: string;
}

export function DispatchOrderSummary({
  order,
  typeDisplay,
}: DispatchOrderSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="dm-summary-card">
      <h4 className="dm-summary-title">{t("dispatchModal.orderSummary")}</h4>
      <div className="dm-summary-grid">
        <div className="dm-summary-item">
          <span className="dm-summary-label">{t("orders.table.item")}</span>
          <span className="dm-summary-val">
            {order.shippableItemName || t("dispatchModal.generalCargo")}
          </span>
        </div>
        <div className="dm-summary-item">
          <span className="dm-summary-label">{t("orders.destination")}</span>
          <span className="dm-summary-val">
            {order.destinationPlace || "—"}
          </span>
        </div>

        <div className="dm-summary-item">
          <span className="dm-summary-label">
            {t("orders.quantityQuintal")}
          </span>
          <span className="dm-summary-val">
            {order.shippableItemQtyInQuintal
              ? `${Number(order.shippableItemQtyInQuintal)} quintal`
              : "—"}
          </span>
        </div>
        <div className="dm-summary-item">
          <span className="dm-summary-label">
            {t("orders.numberOfVehicles")}
          </span>
          <span className="dm-summary-val">1 {typeDisplay}</span>
        </div>

        <div className="dm-summary-item">
          <span className="dm-summary-label">{t("orders.shippingCost")}</span>
          <span className="dm-summary-val">
            {order.shippingCost
              ? `${Number(order.shippingCost).toLocaleString()} ETB`
              : "—"}
          </span>
        </div>
        <div className="dm-summary-item">
          <span className="dm-summary-label">{t("orders.shippingDate")}</span>
          <span className="dm-summary-val">
            {formatDate(order.shippingDate)}
          </span>
        </div>

        <div className="dm-summary-item">
          <span className="dm-summary-label">{t("orders.origin")}</span>
          <span className="dm-summary-val">
            {order.originPlace || t("reports.terminalLocation")}
          </span>
        </div>
        <div className="dm-summary-item">
          <span className="dm-summary-label">{t("orders.deliveryDate")}</span>
          <span className="dm-summary-val">
            {formatDate(order.deliveryDate)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default DispatchOrderSummary;
