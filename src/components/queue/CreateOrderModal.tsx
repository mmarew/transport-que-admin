import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { CreateOrderPayload } from "../../types/queue";
import { useCreateQueueOrderMutation } from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import {
  createOrderSchema,
  type CreateOrderFormValues,
} from "../../schemas/queue";
import { ConstantPhoneInput } from "../ui/ConstantPhoneInput";
import { CustomSelect } from "../ui/CustomSelect";
import { Modal } from "../ui/Modal";
import { RequestTypeSelect } from "./order-modal/RequestTypeSelect";
import { VehicleTypeSelect } from "./order-modal/VehicleTypeSelect";
import { OrderDetailsFields } from "./order-modal/OrderDetailsFields";
import {
  LocationSearchField,
  type PhotonPlace,
} from "./order-modal/LocationSearchField";
import { CoordinatesRow } from "./order-modal/CoordinatesRow";
import "./CreateOrderModal.css";

interface CreateOrderModalProps {
  queueOrganizationUniqueId: string;
  origin?: {
    latitude?: number | null;
    longitude?: number | null;
    description?: string | null;
  };
  onCreated?: () => void;
  onClose: () => void;
}

function toISOStringSafe(d?: string): string {
  if (!d) return d || "";
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toISOString();
  } catch {
    return d;
  }
}

function newBatchId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function buildOrderPayload(
  values: CreateOrderFormValues,
  queueOrganizationUniqueId: string,
): CreateOrderPayload & Record<string, unknown> {
  return {
    isBiddingApproved: Boolean(values.isBiddingApproved),
    queueOrganizationUniqueId,
    shipperPhoneNumber: values.shipperPhoneNumber,
    shipperRequestBatchUniqueId: newBatchId(),
    requestMode: values.requestMode,
    numberOfVehicles: Number(values.numberOfVehicles),
    deliveryDate: toISOStringSafe(values.deliveryDate),
    requestType: "shipper",
    vehicleTypeUniqueId: values.vehicleTypeUniqueId,
    originPlace: values.originDescription,
    originLatitude: Number(values.originLatitude),
    originLongitude: Number(values.originLongitude),
    destinationPlace: values.destinationDescription,
    destinationLatitude: Number(values.destinationLatitude),
    destinationLongitude: Number(values.destinationLongitude),
    shippableItemName: values.shippableItemName,
    shippableItemQtyInQuintal: Number(values.shippableItemQtyInQuintal),
    shippingCost: Number(values.shippingCost),
    shippingDate: toISOStringSafe(values.shippingDate),
    destination: {
      latitude: Number(values.destinationLatitude),
      longitude: Number(values.destinationLongitude),
      description: values.destinationDescription,
    },
    vehicle: {
      vehicleTypeUniqueId: values.vehicleTypeUniqueId,
    },
    originLocation: {
      latitude: Number(values.originLatitude),
      longitude: Number(values.originLongitude),
      description: values.originDescription,
    },
  };
}

export function CreateOrderModal({
  queueOrganizationUniqueId,
  origin,
  onCreated,
  onClose,
}: CreateOrderModalProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      isBiddingApproved: false,
      numberOfVehicles: 1,
      requestMode: "individual_target",
      originDescription: origin?.description ?? "",
      originLatitude: origin?.latitude != null ? String(origin.latitude) : "",
      originLongitude: origin?.longitude != null ? String(origin.longitude) : "",
      destinationDescription: "",
      destinationLatitude: "",
      destinationLongitude: "",
    },
  });

  const requestMode = watch("requestMode");
  const originDesc = watch("originDescription");
  const originLat = watch("originLatitude");
  const originLng = watch("originLongitude");
  const destDesc = watch("destinationDescription");
  const destLat = watch("destinationLatitude");
  const destLng = watch("destinationLongitude");
  const shippingDate = watch("shippingDate");
  const deliveryDate = watch("deliveryDate");

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const [createOrderMutation, { isLoading: isCreating }] =
    useCreateQueueOrderMutation();

  const handleSelectPlace = (place: PhotonPlace, isOrigin: boolean) => {
    if (isOrigin) {
      setValue("originDescription", place.label, { shouldValidate: true });
      setValue("originLatitude", String(place.lat), { shouldValidate: true });
      setValue("originLongitude", String(place.lng), { shouldValidate: true });
    } else {
      setValue("destinationDescription", place.label, { shouldValidate: true });
      setValue("destinationLatitude", String(place.lat), {
        shouldValidate: true,
      });
      setValue("destinationLongitude", String(place.lng), {
        shouldValidate: true,
      });
    }
  };

  const handleFormSubmit = async (values: CreateOrderFormValues) => {
    try {
      if (values.shippingDate) {
        const cleanDate = values.shippingDate.slice(0, 10);
        if (cleanDate < todayStr) {
          toast.error(
            t("orders.shippingDatePastError", "Shipping date cannot be in the past"),
          );
          return;
        }
      }

      const payload = buildOrderPayload(values, queueOrganizationUniqueId);
      const res = await createOrderMutation(payload).unwrap();

      toast.success(res?.message || "Order created and offered to the queue");
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  const onInvalidSubmit = (
    formErrors: Record<string, { message?: string } | undefined>,
  ) => {
    const firstError = Object.values(formErrors).find(Boolean)?.message;
    if (firstError) {
      toast.error(String(firstError));
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t("orders.createOrderTitle")}
      subtitle={t("orders.createOrderSubtitle")}
      mobileHeaderTitle={t("orders.newOrderBtn", "New Order")}
      variant="com"
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit, onInvalidSubmit)}
        className="com-form-body"
      >
        {/* Request Type Toggle */}
        <RequestTypeSelect
          value={requestMode}
          onChange={(mode) => setValue("requestMode", mode)}
        />

        {/* Dispatch Mode Dropdown */}
        <div className="com-field-group">
          <label className="com-label">
            {t("orders.dispatchMode", "Dispatch Mode")}
          </label>
          <CustomSelect
            value={watch("isBiddingApproved") ? "true" : "false"}
            onChange={(val) => setValue("isBiddingApproved", val === "true")}
            options={[
              {
                value: "false",
                label: t(
                  "orders.fifoQueueOption",
                  "FIFO Queue (Auto-offer to front waiting driver)",
                ),
              },
              {
                value: "true",
                label: t(
                  "orders.openBiddingOption",
                  "Open for Bidding (Biddable job for carriers)",
                ),
              },
            ]}
          />
        </div>

        {/* Shipper Section */}
        <div>
          <h3 className="com-section-title">
            {t("orders.shipperSection", "Shipper")}
          </h3>
          <div className="com-grid-2">
            <ConstantPhoneInput
              label={t("orders.shipperPhone", "Phone Number")}
              value={watch("shipperPhoneNumber")}
              onChange={(val) =>
                setValue("shipperPhoneNumber", val, { shouldValidate: true })
              }
              error={errors.shipperPhoneNumber?.message}
              placeholder="9XX XXX XXX"
            />

            <VehicleTypeSelect
              value={watch("vehicleTypeUniqueId") || ""}
              onChange={(val) =>
                setValue("vehicleTypeUniqueId", val, { shouldValidate: true })
              }
              error={errors.vehicleTypeUniqueId?.message}
            />
          </div>
        </div>

        {/* Order Details (Cargo, Qty, Cost, Vehicle Count, Dates) */}
        <OrderDetailsFields
          register={register}
          errors={errors}
          shippingDate={shippingDate}
          deliveryDate={deliveryDate}
          todayStr={todayStr}
          onShippingDateChange={(val) => {
            setValue("shippingDate", val, { shouldValidate: true });
            if (deliveryDate && val && deliveryDate < val) {
              setValue("deliveryDate", val, { shouldValidate: true });
            }
          }}
          onDeliveryDateChange={(val) =>
            setValue("deliveryDate", val, { shouldValidate: true })
          }
        />

        {/* Origin & Destination Titles */}
        <div className="com-grid-2" style={{ marginBottom: "-4px" }}>
          <h3 className="com-section-title">
            {t("orders.origin", "Origin")}
          </h3>
          <h3 className="com-section-title">
            {t("orders.destination", "Destination")}
          </h3>
        </div>

        {/* Origin & Destination Autocomplete Inputs */}
        <div className="com-grid-2">
          <LocationSearchField
            value={originDesc}
            placeholder={t("orders.originPlaceholder", "Search pickup location")}
            onChange={(val) =>
              setValue("originDescription", val, { shouldValidate: true })
            }
            onSelectPlace={(place) => handleSelectPlace(place, true)}
            error={errors.originDescription?.message}
            coordError={Boolean(
              !errors.originDescription &&
                (errors.originLatitude || errors.originLongitude),
            )}
          />

          <LocationSearchField
            value={destDesc}
            placeholder={t("orders.destPlaceholder", "Search delivery location")}
            onChange={(val) =>
              setValue("destinationDescription", val, { shouldValidate: true })
            }
            onSelectPlace={(place) => handleSelectPlace(place, false)}
            error={errors.destinationDescription?.message}
            coordError={Boolean(
              !errors.destinationDescription &&
                (errors.destinationLatitude || errors.destinationLongitude),
            )}
          />
        </div>

        {/* Coordinates Row (Desktop Only) */}
        <CoordinatesRow
          originLat={originLat}
          originLng={originLng}
          destLat={destLat}
          destLng={destLng}
        />

        <div className="com-footer">
          <button type="button" className="com-btn-cancel" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className="com-btn-submit"
            disabled={isSubmitting || isCreating}
          >
            {isSubmitting || isCreating
              ? t("orders.creating")
              : t("orders.createOrderBtn")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateOrderModal;
