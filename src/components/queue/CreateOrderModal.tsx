import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Globe, Building2, Search, Calendar, ChevronDown } from "lucide-react";
import type { PhotonFeature } from "../../types/queue";
import { createShipperRequest } from "../../services/order.service";
import { getApiError } from "../../lib/api";
import { useListVehicleTypesQuery } from "../../lib/redux/api";
import { createOrderSchema, type CreateOrderFormValues } from "../../schemas/queue";
import { PhoneNumberInput } from "../ui/PhoneNumberInput";
import "./CreateOrderModal.css";

const PHOTON_ENDPOINT = "https://photon.komoot.io/api/";

function photonLabel(feature: PhotonFeature): string {
  const p = feature.properties;
  return (
    [p.name, p.city, p.state, p.country].filter(Boolean).join(", ") ||
    [p.housenumber, p.street].filter(Boolean).join(" ") ||
    p.street ||
    "Unknown place"
  );
}

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

function newBatchUniqueId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function CreateOrderModal({
  queueOrganizationUniqueId,
  origin,
  onCreated,
  onClose,
}: CreateOrderModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
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
  const originLat = watch("originLatitude");
  const originLng = watch("originLongitude");
  const destLat = watch("destinationLatitude");
  const destLng = watch("destinationLongitude");

  // Autocomplete for Destination
  const [destQuery, setDestQuery] = useState("");
  const [destResults, setDestResults] = useState<PhotonFeature[]>([]);
  const [destOpen, setDestOpen] = useState(false);

  // Autocomplete for Origin
  const [originQuery, setOriginQuery] = useState(origin?.description ?? "");
  const [originResults, setOriginResults] = useState<PhotonFeature[]>([]);
  const [originOpen, setOriginOpen] = useState(false);

  useEffect(() => {
    const q = destQuery.trim();
    if (q.length < 3) {
      setDestResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`${PHOTON_ENDPOINT}?q=${encodeURIComponent(q)}&limit=5`)
        .then((res) => (res.ok ? res.json() : { features: [] }))
        .then((data: { features?: PhotonFeature[] }) => setDestResults(data.features ?? []))
        .catch(() => setDestResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [destQuery]);

  useEffect(() => {
    const q = originQuery.trim();
    if (q.length < 3) {
      setOriginResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`${PHOTON_ENDPOINT}?q=${encodeURIComponent(q)}&limit=5`)
        .then((res) => (res.ok ? res.json() : { features: [] }))
        .then((data: { features?: PhotonFeature[] }) => setOriginResults(data.features ?? []))
        .catch(() => setOriginResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [originQuery]);

  const pickDestination = (feature: PhotonFeature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const label = photonLabel(feature);
    setValue("destinationDescription", label, { shouldValidate: true });
    setValue("destinationLatitude", String(lat));
    setValue("destinationLongitude", String(lng));
    setDestQuery(label);
    setDestResults([]);
    setDestOpen(false);
  };

  const pickOrigin = (feature: PhotonFeature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const label = photonLabel(feature);
    setValue("originDescription", label, { shouldValidate: true });
    setValue("originLatitude", String(lat));
    setValue("originLongitude", String(lng));
    setOriginQuery(label);
    setOriginResults([]);
    setOriginOpen(false);
  };

  const { data: vehicleTypesData, isLoading: isLoadingVehicleTypes } = useListVehicleTypesQuery();

  const mutation = useMutation({
    mutationFn: (values: CreateOrderFormValues) =>
      createShipperRequest({
        shipperRequestBatchUniqueId: newBatchUniqueId(),
        numberOfVehicles: values.numberOfVehicles,
        shippingDate: new Date(`${values.shippingDate}T00:00:00.000Z`).toISOString(),
        deliveryDate: new Date(`${values.deliveryDate}T00:00:00.000Z`).toISOString(),
        shippingCost: values.shippingCost,
        shippableItemQtyInQuintal: values.shippableItemQtyInQuintal,
        shippableItemName: values.shippableItemName,
        shipperPhoneNumber: values.shipperPhoneNumber,
        requestMode: values.requestMode,
        requestType: "shipper",
        queueOrganizationUniqueId,
        originLocation: {
          latitude: Number(values.originLatitude),
          longitude: Number(values.originLongitude),
          description: values.originDescription,
        },
        destination: {
          latitude: Number(values.destinationLatitude),
          longitude: Number(values.destinationLongitude),
          description: values.destinationDescription,
        },
        vehicle: {
          vehicleTypeUniqueId: values.vehicleTypeUniqueId,
        },
      }),
    onSuccess: () => {
      toast.success("Order created and offered to the queue");
      onCreated?.();
      onClose();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  return (
    <div className="com-overlay">
      <div className="com-modal">
        {/* Header */}
        <div className="com-header">
          <div>
            <h2 className="com-title">New Order</h2>
            <p className="com-subtitle">
              Create a new shipment request and offer it to the appropriate queue.
            </p>
          </div>
          <button type="button" className="com-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Section 1: Request Type */}
          <div>
            <h3 className="com-section-title">Request Type</h3>
            <div className="com-type-grid">
              <button
                type="button"
                className={`com-type-card ${requestMode === "individual_target" ? "selected" : ""}`}
                onClick={() => setValue("requestMode", "individual_target")}
              >
                <Globe size={18} color="#0B4D6D" />
                Individual Target
              </button>

              <button
                type="button"
                className={`com-type-card ${requestMode === "company_target" ? "selected" : ""}`}
                onClick={() => setValue("requestMode", "company_target")}
              >
                <Building2 size={18} color="#0B4D6D" />
                Company Target
              </button>
            </div>
          </div>

          {/* Section 2: Shipper */}
          <div>
            <h3 className="com-section-title">Shipper</h3>
            <div className="com-grid-2">
              <div className="com-field-group">
                <PhoneNumberInput
                  id="shipper-phone"
                  label="Shipper Phone Number"
                  value={watch("shipperPhoneNumber") || ""}
                  onChange={(val) => setValue("shipperPhoneNumber", val, { shouldValidate: true })}
                  placeholder="9XX XXX XXX"
                  required={true}
                  error={errors.shipperPhoneNumber?.message}
                />
              </div>

              <div className="com-field-group">
                <label className="com-label">Vehicle Type</label>
                <div className="com-input-wrap">
                  <select
                    {...register("vehicleTypeUniqueId")}
                    disabled={isLoadingVehicleTypes}
                    className="com-input com-select has-icon-right"
                  >
                    <option value="">Select vehicle type</option>
                    {(vehicleTypesData?.data ?? []).map((vt) => (
                      <option key={vt.vehicleTypeUniqueId} value={vt.vehicleTypeUniqueId}>
                        {vt.vehicleTypeName} {vt.carryingCapacity ? `(${vt.carryingCapacity} Quintal)` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="com-input-icon-right" />
                </div>
                {errors.vehicleTypeUniqueId && (
                  <p className="com-error-text">{errors.vehicleTypeUniqueId.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Order Details */}
          <div>
            <h3 className="com-section-title">Order Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div className="com-grid-2">
                <div className="com-field-group">
                  <label className="com-label">Item Name</label>
                  <input
                    {...register("shippableItemName")}
                    placeholder="Cement"
                    className="com-input"
                  />
                  {errors.shippableItemName && (
                    <p className="com-error-text">{errors.shippableItemName.message}</p>
                  )}
                </div>

                <div className="com-field-group">
                  <label className="com-label">Quantity (Quintal)</label>
                  <input
                    type="number"
                    step="any"
                    {...register("shippableItemQtyInQuintal", { valueAsNumber: true })}
                    placeholder="Enter quantity"
                    className="com-input"
                  />
                  {errors.shippableItemQtyInQuintal && (
                    <p className="com-error-text">{errors.shippableItemQtyInQuintal.message}</p>
                  )}
                </div>
              </div>

              <div className="com-grid-2">
                <div className="com-field-group">
                  <label className="com-label">Shipping Cost (ETB)</label>
                  <input
                    type="number"
                    step="any"
                    {...register("shippingCost", { valueAsNumber: true })}
                    placeholder="Enter shipping cost"
                    className="com-input"
                  />
                  {errors.shippingCost && (
                    <p className="com-error-text">{errors.shippingCost.message}</p>
                  )}
                </div>

                <div className="com-field-group">
                  <label className="com-label">Number of Vehicles</label>
                  <input
                    type="number"
                    {...register("numberOfVehicles", { valueAsNumber: true })}
                    placeholder="1"
                    className="com-input"
                  />
                  {errors.numberOfVehicles && (
                    <p className="com-error-text">{errors.numberOfVehicles.message}</p>
                  )}
                </div>
              </div>

              <div className="com-grid-2">
                <div className="com-field-group">
                  <label className="com-label">Shipping Date</label>
                  <div className="com-input-wrap">
                    <input
                      type="date"
                      {...register("shippingDate")}
                      className="com-input has-icon-right"
                    />
                    <Calendar size={16} className="com-input-icon-right" />
                  </div>
                  {errors.shippingDate && (
                    <p className="com-error-text">{errors.shippingDate.message}</p>
                  )}
                </div>

                <div className="com-field-group">
                  <label className="com-label">Delivery Date</label>
                  <div className="com-input-wrap">
                    <input
                      type="date"
                      {...register("deliveryDate")}
                      className="com-input has-icon-right"
                    />
                    <Calendar size={16} className="com-input-icon-right" />
                  </div>
                  {errors.deliveryDate && (
                    <p className="com-error-text">{errors.deliveryDate.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Origin & Destination */}
          <div className="com-grid-2">
            {/* Left: Origin */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <h3 className="com-section-title">Origin</h3>
              <div className="com-field-group">
                <label className="com-label">Origin</label>
                <div className="com-input-wrap">
                  <Search size={15} className="com-input-icon-left" />
                  <input
                    value={originQuery}
                    onChange={(e) => {
                      setOriginQuery(e.target.value);
                      setValue("originDescription", e.target.value, { shouldValidate: true });
                      setOriginOpen(true);
                    }}
                    placeholder="Search pickup location"
                    className="com-input has-icon-left"
                  />
                  {originOpen && originResults.length > 0 && (
                    <div className="com-suggestions-list">
                      {originResults.map((feat, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="com-suggestion-item"
                          onClick={() => pickOrigin(feat)}
                        >
                          {photonLabel(feat)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.originDescription && (
                  <p className="com-error-text">{errors.originDescription.message}</p>
                )}
              </div>

              <div className="com-grid-2">
                <div className="com-field-group">
                  <label className="com-label">Latitude</label>
                  <input
                    value={originLat ?? ""}
                    readOnly
                    placeholder="Auto-filled"
                    className="com-input com-input-readonly"
                  />
                </div>
                <div className="com-field-group">
                  <label className="com-label">Longitude</label>
                  <input
                    value={originLng ?? ""}
                    readOnly
                    placeholder="Auto-filled"
                    className="com-input com-input-readonly"
                  />
                </div>
              </div>
            </div>

            {/* Right: Destination */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <h3 className="com-section-title">Destination</h3>
              <div className="com-field-group">
                <label className="com-label">Destination</label>
                <div className="com-input-wrap">
                  <Search size={15} className="com-input-icon-left" />
                  <input
                    value={destQuery}
                    onChange={(e) => {
                      setDestQuery(e.target.value);
                      setValue("destinationDescription", e.target.value, { shouldValidate: true });
                      setDestOpen(true);
                    }}
                    placeholder="Search delivery location"
                    className="com-input has-icon-left"
                  />
                  {destOpen && destResults.length > 0 && (
                    <div className="com-suggestions-list">
                      {destResults.map((feat, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="com-suggestion-item"
                          onClick={() => pickDestination(feat)}
                        >
                          {photonLabel(feat)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.destinationDescription && (
                  <p className="com-error-text">{errors.destinationDescription.message}</p>
                )}
              </div>

              <div className="com-grid-2">
                <div className="com-field-group">
                  <label className="com-label">Latitude</label>
                  <input
                    value={destLat ?? ""}
                    readOnly
                    placeholder="Auto-filled"
                    className="com-input com-input-readonly"
                  />
                </div>
                <div className="com-field-group">
                  <label className="com-label">Longitude</label>
                  <input
                    value={destLng ?? ""}
                    readOnly
                    placeholder="Auto-filled"
                    className="com-input com-input-readonly"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="com-footer">
            <button type="button" className="com-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="com-btn-submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateOrderModal;
