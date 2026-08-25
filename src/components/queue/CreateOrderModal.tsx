import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X, Globe, Building2, Search, ChevronDown } from "lucide-react";
import type { PhotonFeature, CreateOrderPayload } from "../../types/queue";
import { useCreateQueueOrderMutation, useListVehicleTypesQuery } from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { createOrderSchema, type CreateOrderFormValues } from "../../schemas/queue";
import { ConstantPhoneInput } from "../ui/ConstantPhoneInput";
import { DatePickerField } from "../ui/DatePickerField";
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

function toISOStringSafe(d: string): string {
  if (!d) return new Date().toISOString();
  try {
    const parsed = new Date(d.includes("T") ? d : `${d}T00:00:00.000Z`);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function newBatchId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
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
    formState: { errors, isSubmitting },
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
  const shippingDate = watch("shippingDate");
  const deliveryDate = watch("deliveryDate");

  const [destQuery, setDestQuery] = useState("");
  const [destResults, setDestResults] = useState<PhotonFeature[]>([]);
  const [destOpen, setDestOpen] = useState(false);
  const destWrapRef = useRef<HTMLDivElement>(null);

  const [originQuery, setOriginQuery] = useState(origin?.description ?? "");
  const [originResults, setOriginResults] = useState<PhotonFeature[]>([]);
  const [originOpen, setOriginOpen] = useState(false);
  const originWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (originWrapRef.current && !originWrapRef.current.contains(e.target as Node)) {
        setOriginOpen(false);
      }
      if (destWrapRef.current && !destWrapRef.current.contains(e.target as Node)) {
        setDestOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const q = destQuery.trim();
    if (q.length < 3) return setDestResults([]);
    const t = setTimeout(() => {
      fetch(`${PHOTON_ENDPOINT}?q=${encodeURIComponent(q)}&limit=5`)
        .then((res) => (res.ok ? res.json() : { features: [] }))
        .then((d) => setDestResults(d.features ?? []))
        .catch(() => setDestResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [destQuery]);

  useEffect(() => {
    const q = originQuery.trim();
    if (q.length < 3) return setOriginResults([]);
    const t = setTimeout(() => {
      fetch(`${PHOTON_ENDPOINT}?q=${encodeURIComponent(q)}&limit=5`)
        .then((res) => (res.ok ? res.json() : { features: [] }))
        .then((d) => setOriginResults(d.features ?? []))
        .catch(() => setOriginResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [originQuery]);

  const selectPlace = (feat: PhotonFeature, isOrigin: boolean) => {
    const [lng, lat] = feat.geometry.coordinates;
    const label = photonLabel(feat);
    if (isOrigin) {
      setValue("originDescription", label, { shouldValidate: true });
      setValue("originLatitude", String(lat), { shouldValidate: true });
      setValue("originLongitude", String(lng), { shouldValidate: true });
      setOriginQuery(label);
      setOriginResults([]);
      setOriginOpen(false);
    } else {
      setValue("destinationDescription", label, { shouldValidate: true });
      setValue("destinationLatitude", String(lat), { shouldValidate: true });
      setValue("destinationLongitude", String(lng), { shouldValidate: true });
      setDestQuery(label);
      setDestResults([]);
      setDestOpen(false);
    }
  };

  const { data: vehicleTypesData, isLoading: isLoadingVehicleTypes } = useListVehicleTypesQuery();
  const [createOrderMutation, { isLoading: isCreating }] = useCreateQueueOrderMutation();

  const vehicleTypesList = Array.isArray(vehicleTypesData?.data)
    ? vehicleTypesData.data
    : Array.isArray(vehicleTypesData)
    ? vehicleTypesData
    : [];

  const handleFormSubmit = async (values: CreateOrderFormValues) => {
    try {
      const payload: CreateOrderPayload = {
        queueOrganizationUniqueId,
        shipperPhoneNumber: values.shipperPhoneNumber,
        shipperRequestBatchUniqueId: newBatchId(),
        requestMode: values.requestMode,
        numberOfVehicles: Number(values.numberOfVehicles),
        deliveryDate: toISOStringSafe(values.deliveryDate),
        requestType: "shipper",
        destination: {
          latitude: Number(values.destinationLatitude),
          longitude: Number(values.destinationLongitude),
          description: values.destinationDescription,
        },
        vehicle: {
          vehicleTypeUniqueId: values.vehicleTypeUniqueId,
        },
        shippableItemName: values.shippableItemName,
        shippableItemQtyInQuintal: Number(values.shippableItemQtyInQuintal),
        shippingCost: Number(values.shippingCost),
        shippingDate: toISOStringSafe(values.shippingDate),
        originLocation: {
          latitude: Number(values.originLatitude),
          longitude: Number(values.originLongitude),
          description: values.originDescription,
        },
      };
      const res = await createOrderMutation(payload).unwrap();

      toast.success(res?.message || "Order created and offered to the queue");
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  const onInvalidSubmit = (formErrors: Record<string, { message?: string } | undefined>) => {
    const firstError = Object.values(formErrors).find(Boolean)?.message;
    if (firstError) {
      toast.error(String(firstError));
    }
  };

  return createPortal(
    <div className="com-overlay">
      <div className="com-modal">
        <div className="com-header">
          <div>
            <h2 className="com-title">New Order</h2>
            <p className="com-subtitle">
              Create a new shipment request and offer it to the appropriate queue.
            </p>
          </div>
          <button type="button" className="com-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit, onInvalidSubmit)} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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

          <div>
            <h3 className="com-section-title">Shipper</h3>
            <div className="com-grid-2">
              <ConstantPhoneInput
                label="Shipper Phone Number"
                value={watch("shipperPhoneNumber")}
                onChange={(val) => setValue("shipperPhoneNumber", val, { shouldValidate: true })}
                error={errors.shipperPhoneNumber?.message}
                placeholder="9-XX-XX-XX-XX"
              />

              <div className="com-field-group">
                <label className="com-label">Vehicle Type</label>
                <div className="com-select-wrap">
                  <select
                    {...register("vehicleTypeUniqueId")}
                    className={`com-select ${errors.vehicleTypeUniqueId ? "com-select-error" : ""}`}
                  >
                    <option value="">Select vehicle type</option>
                    {isLoadingVehicleTypes ? (
                      <option disabled value="">Loading vehicle types...</option>
                    ) : (
                      vehicleTypesList.map((vt) => (
                        <option key={vt.vehicleTypeUniqueId} value={vt.vehicleTypeUniqueId}>
                          {vt.vehicleTypeName}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={16} className="com-select-chevron" />
                </div>
                {errors.vehicleTypeUniqueId && (
                  <p className="com-error-text">{errors.vehicleTypeUniqueId.message}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="com-section-title">Order Details</h3>
            <div className="com-grid-2">
              <div className="com-field-group">
                <label className="com-label">Item Name</label>
                <input
                  {...register("shippableItemName")}
                  placeholder="e.g. Cement"
                  className={`com-input ${errors.shippableItemName ? "com-input-error" : ""}`}
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
                  placeholder="Enter quantity"
                  {...register("shippableItemQtyInQuintal", { valueAsNumber: true })}
                  className={`com-input ${errors.shippableItemQtyInQuintal ? "com-input-error" : ""}`}
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
                  placeholder="Enter shipping cost"
                  {...register("shippingCost", { valueAsNumber: true })}
                  className={`com-input ${errors.shippingCost ? "com-input-error" : ""}`}
                />
                {errors.shippingCost && (
                  <p className="com-error-text">{errors.shippingCost.message}</p>
                )}
              </div>

              <div className="com-field-group">
                <label className="com-label">Number of Vehicles</label>
                <input
                  type="number"
                  min={1}
                  {...register("numberOfVehicles", { valueAsNumber: true })}
                  className={`com-input ${errors.numberOfVehicles ? "com-input-error" : ""}`}
                />
                {errors.numberOfVehicles && (
                  <p className="com-error-text">{errors.numberOfVehicles.message}</p>
                )}
              </div>
            </div>

            <div className="com-grid-2">
              <DatePickerField
                label="Shipping Date"
                value={shippingDate}
                onChange={(val) => setValue("shippingDate", val, { shouldValidate: true })}
                error={errors.shippingDate?.message}
              />
              <DatePickerField
                label="Delivery Date"
                value={deliveryDate}
                onChange={(val) => setValue("deliveryDate", val, { shouldValidate: true })}
                error={errors.deliveryDate?.message}
              />
            </div>
          </div>

          <div className="com-grid-2">
            <div>
              <h3 className="com-section-title">Origin</h3>
              <div className="com-field-group">
                <label className="com-label">Origin Location</label>
                <div className="com-search-wrap" ref={originWrapRef}>
                  <Search size={16} className="com-search-icon" />
                  <input
                    value={originQuery}
                    placeholder="Search pickup location"
                    onChange={(e) => {
                      setOriginQuery(e.target.value);
                      setValue("originDescription", e.target.value, { shouldValidate: true });
                      setOriginOpen(true);
                    }}
                    onFocus={() => setOriginOpen(true)}
                    className={`com-input com-search-input ${errors.originDescription ? "com-input-error" : ""}`}
                  />
                  {originOpen && originResults.length > 0 && (
                    <div className="com-dropdown">
                      {originResults.map((feat, idx) => (
                        <button
                          type="button"
                          key={idx}
                          className="com-dropdown-item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectPlace(feat, true);
                          }}
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
                {!errors.originDescription && (errors.originLatitude || errors.originLongitude) && (
                  <p className="com-error-text">Please pick a location from the search dropdown to set coordinates</p>
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

            <div>
              <h3 className="com-section-title">Destination</h3>
              <div className="com-field-group">
                <label className="com-label">Destination Location</label>
                <div className="com-search-wrap" ref={destWrapRef}>
                  <Search size={16} className="com-search-icon" />
                  <input
                    value={destQuery}
                    placeholder="Search delivery location"
                    onChange={(e) => {
                      setDestQuery(e.target.value);
                      setValue("destinationDescription", e.target.value, { shouldValidate: true });
                      setDestOpen(true);
                    }}
                    onFocus={() => setDestOpen(true)}
                    className={`com-input com-search-input ${errors.destinationDescription ? "com-input-error" : ""}`}
                  />
                  {destOpen && destResults.length > 0 && (
                    <div className="com-dropdown">
                      {destResults.map((feat, idx) => (
                        <button
                          type="button"
                          key={idx}
                          className="com-dropdown-item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectPlace(feat, false);
                          }}
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
                {!errors.destinationDescription && (errors.destinationLatitude || errors.destinationLongitude) && (
                  <p className="com-error-text">Please pick a location from the search dropdown to set coordinates</p>
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

          <div className="com-footer">
            <button type="button" className="com-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="com-btn-submit" disabled={isSubmitting || isCreating}>
              {isSubmitting || isCreating ? "Creating..." : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default CreateOrderModal;
