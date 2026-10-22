import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { CreateOrderFormValues } from "@/schemas/queue";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { toast } from "sonner";

export interface OrderDetailsFieldsProps {
  register: UseFormRegister<CreateOrderFormValues>;
  errors: FieldErrors<CreateOrderFormValues>;
  currentQty?: number;
  shippingDate?: string;
  deliveryDate?: string;
  todayStr: string;
  vehicleCapacity?: {
    minQuintal?: number;
    maxQuintal?: number;
    hasPlus?: boolean;
    vehicleTypeName?: string;
  } | null;
  onShippingDateChange: (val: string) => void;
  onDeliveryDateChange: (val: string) => void;
}

/**
 * OrderDetailsFields renders the cargo item, quantity, cost, vehicle count,
 * and pickup/delivery date pickers.
 */
export function OrderDetailsFields({
  register,
  errors,
  currentQty,
  shippingDate,
  deliveryDate,
  todayStr,
  vehicleCapacity,
  onShippingDateChange,
  onDeliveryDateChange,
}: OrderDetailsFieldsProps) {
  const { t } = useTranslation();
  const [localQty, setLocalQty] = useState<number | undefined>(currentQty);

  useEffect(() => {
    setLocalQty(currentQty);
  }, [currentQty]);

  const effectiveQty = localQty !== undefined ? localQty : currentQty;

  const capacityError = useMemo(() => {
    if (
      vehicleCapacity?.maxQuintal &&
      effectiveQty != null &&
      !isNaN(effectiveQty) &&
      effectiveQty > vehicleCapacity.maxQuintal
    ) {
      return t("orders.quantityExceedsCapacity", {
        max: vehicleCapacity.maxQuintal,
        vehicle: vehicleCapacity.vehicleTypeName,
        defaultValue: `Quantity per vehicle cannot exceed ${vehicleCapacity.maxQuintal} Quintals for ${vehicleCapacity.vehicleTypeName}`,
      });
    }
    return null;
  }, [vehicleCapacity, effectiveQty, t]);

  const qtyErrorMessage = errors.shippableItemQtyInQuintal?.message || capacityError;

  return (
    <div>
      <h3 className="com-section-title">
        {t("orders.orderDetails", "Order Details")}
      </h3>
      <div className="com-grid-2">
        <div className="com-field-group">
          <label className="com-label">
            {t("orders.cargoItem", "Item Name")}
          </label>
          <input
            {...register("shippableItemName")}
            placeholder={t("orders.cargoItemPlaceholder", "Cement")}
            className={`com-input ${errors.shippableItemName ? "com-input-error" : ""}`}
          />
          {errors.shippableItemName && (
            <p className="com-error-text">
              {errors.shippableItemName.message}
            </p>
          )}
        </div>

        <div className="com-field-group">
          <label className="com-label">
            {t("orders.quantityQuintal", "Quantity (Quintals) per vehicle")}
          </label>
          {(() => {
            const qtyRegister = register("shippableItemQtyInQuintal", {
              valueAsNumber: true,
            });
            return (
              <input
                type="number"
                step="any"
                min={1}
                placeholder={
                  vehicleCapacity?.maxQuintal
                    ? t("orders.enterQuantityWithMax", {
                        max: vehicleCapacity.maxQuintal,
                        defaultValue: `Max ${vehicleCapacity.maxQuintal} Q per vehicle`,
                      })
                    : t("orders.enterQuantity", "Enter quantity")
                }
                {...qtyRegister}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  const num = rawVal === "" ? undefined : parseFloat(rawVal);
                  setLocalQty(num);
                  qtyRegister.onChange(e);
                  if (
                    vehicleCapacity?.maxQuintal &&
                    num != null &&
                    !isNaN(num) &&
                    num > vehicleCapacity.maxQuintal
                  ) {
                    toast.error(
                      t("orders.quantityExceedsCapacity", {
                        max: vehicleCapacity.maxQuintal,
                        vehicle: vehicleCapacity.vehicleTypeName,
                        defaultValue: `Quantity per vehicle cannot exceed ${vehicleCapacity.maxQuintal} Quintals for ${vehicleCapacity.vehicleTypeName}`,
                      }),
                      { id: "quantity-exceeds-capacity" },
                    );
                  }
                }}
                className={`com-input ${qtyErrorMessage ? "com-input-error" : ""}`}
              />
            );
          })()}
          {qtyErrorMessage && (
            <p className="com-error-text">
              {qtyErrorMessage}
            </p>
          )}
        </div>
      </div>

      <div className="com-grid-2">
        <div className="com-field-group">
          <label className="com-label">
            {t("orders.shippingCost", "Shipping Cost (ETB)")}
          </label>
          <input
            type="number"
            step="any"
            placeholder={t("orders.enterShippingCost", "Enter shipping cost")}
            {...register("shippingCost", { valueAsNumber: true })}
            className={`com-input ${errors.shippingCost ? "com-input-error" : ""}`}
          />
          {errors.shippingCost && (
            <p className="com-error-text">
              {errors.shippingCost.message}
            </p>
          )}
        </div>

        <div className="com-field-group">
          <label className="com-label">
            {t("orders.numberOfVehicles", "Number of Vehicles")}
          </label>
          <input
            type="number"
            min={1}
            {...register("numberOfVehicles", { valueAsNumber: true })}
            className={`com-input ${errors.numberOfVehicles ? "com-input-error" : ""}`}
          />
          {errors.numberOfVehicles && (
            <p className="com-error-text">
              {errors.numberOfVehicles.message}
            </p>
          )}
        </div>
      </div>

      <div className="com-grid-2">
        <DatePickerField
          label={t("orders.shippingDate", "Shipping Date")}
          value={shippingDate}
          placeholder={t("orders.selectDate", "Select date")}
          minDate={todayStr}
          onChange={onShippingDateChange}
          error={errors.shippingDate?.message}
        />
        <DatePickerField
          label={t("orders.deliveryDate", "Delivery Date")}
          value={deliveryDate}
          placeholder={t("orders.selectDate", "Select date")}
          minDate={shippingDate || todayStr}
          onChange={onDeliveryDateChange}
          error={errors.deliveryDate?.message}
        />
      </div>
    </div>
  );
}

export default OrderDetailsFields;
