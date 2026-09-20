import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { extractCity } from "@/utils/formatters";

interface OrderMobileRouteProps {
  origin: string;
  destination: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function OrderMobileRoute({
  origin,
  destination,
  isExpanded,
  onToggle,
}: OrderMobileRouteProps) {
  const { t } = useTranslation();

  if (isExpanded) {
    return (
      <div
        className="orders-m-route orders-m-route--expanded"
        onClick={onToggle}
        title={t("orders.clickToCollapse", "Click to collapse")}
        role="button"
        tabIndex={0}
      >
        <div className="orders-m-loc-row">
          <span className="orders-loc-dot orders-loc-dot--origin" />
          <span className="orders-m-loc-text">
            <strong>{t("orders.from", "From")}:</strong> {origin}
          </span>
        </div>
        <div className="orders-m-loc-row">
          <span className="orders-loc-dot orders-loc-dot--dest" />
          <span className="orders-m-loc-text">
            <strong>{t("orders.to", "To")}:</strong> {destination}
          </span>
        </div>
        <span className="orders-loc-collapse-hint">
          <ChevronUp size={11} /> {t("orders.collapse", "Collapse")}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="orders-m-route orders-m-route--trimmed"
      onClick={onToggle}
      title={t("orders.clickForFullLocation", "Click to view full location")}
    >
      <span className="orders-m-city">{extractCity(origin)}</span>
      <ArrowRight size={12} className="orders-m-arrow" />
      <span className="orders-m-city">{extractCity(destination)}</span>
      <ChevronDown size={11} className="orders-m-loc-chevron" />
    </button>
  );
}
