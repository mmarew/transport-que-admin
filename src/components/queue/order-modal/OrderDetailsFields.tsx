import { useTranslation } from "react-i18next";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import type { CreateOrderFormValues } from "@/schemas/queue";
import { DatePickerField } from "@/components/ui/DatePickerField";

export interface OrderDetailsFieldsProps {
  register: UseFormRegister<CreateOrderFormValues>;
  errors: FieldErrors<CreateOrderFormValues>;
  shippingDate?: string;
  deliveryDate?: string;
  todayStr: string;
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
  shippingDate,
  deliveryDate,
  todayStr,
  onShippingDateChange,
  onDeliveryDateChange,
}: OrderDetailsFieldsProps) {
  const { t } = useTranslation();

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
            {t("orders.quantityQuintal", "Quantity (Quintal)")}
          </label>
          <input
            type="number"
            step="any"
            placeholder={t("orders.enterQuantity", "Enter quantity")}
            {...register("shippableItemQtyInQuintal", {
              valueAsNumber: true,
            })}
            className={`com-input ${errors.shippableItemQtyInQuintal ? "com-input-error" : ""}`}
          />
          {errors.shippableItemQtyInQuintal && (
            <p className="com-error-text">
              {errors.shippableItemQtyInQuintal.message}
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
