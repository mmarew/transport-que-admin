import { useState, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useClickOutside } from "../../../hooks/useClickOutside";

export interface OrderSelectDropdownProps {
  availableOrders: Array<{ shipperRequest: any }>;
  selectedOrderUniqueId?: string;
  selectedOrderLabel: string;
  onSelectOrder: (uniqueId: string) => void;
}

export function OrderSelectDropdown({
  availableOrders,
  selectedOrderUniqueId,
  selectedOrderLabel,
  onSelectOrder,
}: OrderSelectDropdownProps) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownWrapRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownWrapRef, () => setDropdownOpen(false), dropdownOpen);

  return (
    <div style={{ marginTop: "14px" }}>
      <h3 className="dm-section-heading">{t("dispatchModal.selectOrder")}</h3>
      <div className="dm-field-group">
        <label className="dm-field-label">{t("dispatchModal.order")}</label>
        <div className="dm-select-wrap" ref={dropdownWrapRef}>
          <button
            type="button"
            className={`dm-dropdown-trigger ${dropdownOpen ? "open" : ""}`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="dm-dropdown-text">{selectedOrderLabel}</span>
            <ChevronDown
              size={18}
              className={`dm-select-chevron ${dropdownOpen ? "open" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div className="dm-dropdown-menu">
              <div
                className={`dm-dropdown-item ${!selectedOrderUniqueId ? "selected" : ""}`}
                onClick={() => {
                  onSelectOrder("");
                  setDropdownOpen(false);
                }}
              >
                <span className="dm-dropdown-item-text">
                  {t("dispatchModal.directDispatch")}
                </span>
              </div>
              {availableOrders.map(({ shipperRequest }) => {
                const isSel =
                  selectedOrderUniqueId ===
                  shipperRequest.shipperRequestUniqueId;
                return (
                  <div
                    key={shipperRequest.shipperRequestUniqueId}
                    className={`dm-dropdown-item ${isSel ? "selected" : ""}`}
                    onClick={() => {
                      onSelectOrder(shipperRequest.shipperRequestUniqueId);
                      setDropdownOpen(false);
                    }}
                  >
                    <span className="dm-dropdown-item-text">
                      <strong>{shipperRequest.shippableItemName}</strong> —{" "}
                      {shipperRequest.originPlace ||
                        t("orders.defaultTerminal")}{" "}
                      → {shipperRequest.destinationPlace}
                    </span>
                    <span className="dm-dropdown-item-badge">
                      {Number(shipperRequest.shippableItemQtyInQuintal)} Qtl
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderSelectDropdown;
