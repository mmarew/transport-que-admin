import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X, Globe, Building2, Search, ChevronDown } from "lucide-react";
import type { CreateOrderPayload } from "../../types/queue";
import {
  useCreateQueueOrderMutation,
  useListVehicleTypesQuery,
} from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { createOrderSchema, type CreateOrderFormValues } from "../../schemas/queue";
import { ConstantPhoneInput } from "../ui/ConstantPhoneInput";
import { DatePickerField } from "../ui/DatePickerField";
import { useModalA11y } from "../../hooks/useModalA11y";
import MobileHeader from "../common/MobileHeader";
const PHOTON_URL = "https://photon.komoot.io/api/";

interface PhotonPlace {
  label: string;
  lat: number;
  lng: number;
}

function formatPhotonLabel(feature: any): string {
  const p = feature.properties || {};
  const parts = [
    p.name,
    p.street,
    p.district || p.county,
    p.city || p.town || p.village,
    p.state,
    p.country,
  ].filter(Boolean);
  return parts.length > 0 ? Array.from(new Set(parts)).join(", ") : p.name || p.street || "Location";
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
  if (!d) return d;
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toISOString();
  } catch {
    return d;
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
  const { t } = useTranslation();
  const modalRef = useModalA11y<HTMLDivElement>({ isOpen: true, onClose });
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
  const [destResults, setDestResults] = useState<PhotonPlace[]>([]);
  const [destOpen, setDestOpen] = useState(false);
  const destWrapRef = useRef<HTMLDivElement>(null);

  const [originQuery, setOriginQuery] = useState(origin?.description ?? "");
  const [originResults, setOriginResults] = useState<PhotonPlace[]>([]);
  const [originOpen, setOriginOpen] = useState(false);
  const originWrapRef = useRef<HTMLDivElement>(null);

  const isTypingDestRef = useRef(false);
  const isTypingOriginRef = useRef(false);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (originWrapRef.current && !originWrapRef.current.contains(e.target as Node)) {
        setOriginOpen(false);
        isTypingOriginRef.current = false;
      }
      if (destWrapRef.current && !destWrapRef.current.contains(e.target as Node)) {
        setDestOpen(false);
        isTypingDestRef.current = false;
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const destAbortRef = useRef<AbortController | null>(null);
  const originAbortRef = useRef<AbortController | null>(null);
  const placesCacheRef = useRef<Map<string, PhotonPlace[]>>(new Map());

  /** Normalize query for deduplication: lowercase, strip trailing punctuation/spaces */
  const normalizeQuery = (q: string): string =>
    q.trim().toLowerCase().replace(/[,.\s]+$/, "").trim();

  const fetchPhotonPlaces = async (query: string, signal?: AbortSignal): Promise<PhotonPlace[]> => {
    const q = normalizeQuery(query);
    if (q.length < 5) return [];

    // Return from in-memory cache if previously fetched
    if (placesCacheRef.current.has(q)) {
      return placesCacheRef.current.get(q)!;
    }

    try {
      const res = await fetch(
        `${PHOTON_URL}?q=${encodeURIComponent(q)}&lat=9.0320&lon=38.7469&lang=en&limit=6`,
        { signal }
      );
      if (res.ok) {
        const data = await res.json();
        const results: PhotonPlace[] = (data.features || []).map((feat: any) => ({
          label: formatPhotonLabel(feat),
          lat: feat.geometry?.coordinates[1] || 0,
          lng: feat.geometry?.coordinates[0] || 0,
        }));
        placesCacheRef.current.set(q, results);
        return results;
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // network error fallback
      }
    }
    return [];
  };

  useEffect(() => {
    if (!isTypingDestRef.current || !destOpen) return;
    const q = normalizeQuery(destQuery);
    if (q.length < 5) {
      setDestResults([]);
      return;
    }

    // If cache already has it, set results immediately without a new request
    if (placesCacheRef.current.has(q)) {
      setDestResults(placesCacheRef.current.get(q)!);
      return;
    }

    if (destAbortRef.current) {
      destAbortRef.current.abort();
    }
    destAbortRef.current = new AbortController();
    const signal = destAbortRef.current.signal;

    const t = setTimeout(async () => {
      const res = await fetchPhotonPlaces(q, signal);
      if (!signal.aborted) {
        setDestResults(res);
      }
    }, 550);

    return () => {
      clearTimeout(t);
      if (destAbortRef.current) {
        destAbortRef.current.abort();
      }
    };
  }, [destQuery, destOpen]);

  useEffect(() => {
    if (!isTypingOriginRef.current || !originOpen) return;
    const q = normalizeQuery(originQuery);
    if (q.length < 5) {
      setOriginResults([]);
      return;
    }

    // If cache already has it, set results immediately without a new request
    if (placesCacheRef.current.has(q)) {
      setOriginResults(placesCacheRef.current.get(q)!);
      return;
    }

    if (originAbortRef.current) {
      originAbortRef.current.abort();
    }
    originAbortRef.current = new AbortController();
    const signal = originAbortRef.current.signal;

    const t = setTimeout(async () => {
      const res = await fetchPhotonPlaces(q, signal);
      if (!signal.aborted) {
        setOriginResults(res);
      }
    }, 550);

    return () => {
      clearTimeout(t);
      if (originAbortRef.current) {
        originAbortRef.current.abort();
      }
    };
  }, [originQuery, originOpen]);

  const selectPlace = (place: PhotonPlace, isOrigin: boolean) => {
    if (isOrigin) {
      isTypingOriginRef.current = false;
      setValue("originDescription", place.label, { shouldValidate: true });
      setValue("originLatitude", String(place.lat), { shouldValidate: true });
      setValue("originLongitude", String(place.lng), { shouldValidate: true });
      setOriginQuery(place.label);
      setOriginResults([]);
      setOriginOpen(false);
    } else {
      isTypingDestRef.current = false;
      setValue("destinationDescription", place.label, { shouldValidate: true });
      setValue("destinationLatitude", String(place.lat), { shouldValidate: true });
      setValue("destinationLongitude", String(place.lng), { shouldValidate: true });
      setDestQuery(place.label);
      setDestResults([]);
      setDestOpen(false);
    }
  };

  const { data: apiVehicleTypes } = useListVehicleTypesQuery();
  const [createOrderMutation, { isLoading: isCreating }] = useCreateQueueOrderMutation();

  const vehicleTypesList = useMemo(() => {
    const list: Array<{ vehicleTypeUniqueId: string; vehicleTypeName: string }> = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    const add = (id?: string, name?: string) => {
      if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return;
      const cleanName = (name || id).trim();
      const normKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seenIds.has(id) && !seenNames.has(normKey)) {
        seenIds.add(id);
        seenNames.add(normKey);
        list.push({ vehicleTypeUniqueId: id, vehicleTypeName: cleanName });
      }
    };

    // 1. From real backend VehicleTypes API
    if (Array.isArray(apiVehicleTypes?.data)) {
      apiVehicleTypes.data.forEach((vt) => {
        add(vt.vehicleTypeUniqueId, vt.vehicleTypeName);
      });
    }

    // 2. Known production database UUIDs fallback
    const KNOWN_DB_TYPES = [
      { vehicleTypeUniqueId: "e93aa27f-364f-4eff-bc26-582b773071d3", vehicleTypeName: "2×20ft or 40ft Low-Bed Truck (301–350 Quintal)" },
      { vehicleTypeUniqueId: "9b2e8446-e1b7-4659-89bd-3bbc4c0a6742", vehicleTypeName: "20ft Container Truck (251–300 Quintal)" },
      { vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000002", vehicleTypeName: "ISUZU / Light Cargo (50–100 Quintal)" },
      { vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000001", vehicleTypeName: "Heavy Duty Trailer (351–400+ Quintal)" },
      { vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000003", vehicleTypeName: "Tanker / Bulk Liquid" },
      { vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000004", vehicleTypeName: "Refrigerated Cargo Truck" },
    ];

    KNOWN_DB_TYPES.forEach((vt) => add(vt.vehicleTypeUniqueId, vt.vehicleTypeName));

    return list;
  }, [apiVehicleTypes]);

  const handleFormSubmit = async (values: CreateOrderFormValues) => {
    try {
      const payload: CreateOrderPayload & Record<string, unknown> = {
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
      <div
        className="com-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-order-modal-title"
      >
        {/* Mobile Header */}
        <div className="com-mobile-header">
          <MobileHeader title="New Order" onBack={onClose} />
        </div>

        {/* Desktop Header */}
        <div className="com-header com-header--desktop">
          <div>
            <h2 id="create-order-modal-title" className="com-title">{t("orders.createOrderTitle")}</h2>
            <p className="com-subtitle">
              {t("orders.createOrderSubtitle")}
            </p>
          </div>
          <button type="button" className="com-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit, onInvalidSubmit)} className="com-form-body">
          {/* Request Type */}
          <div>
            <h3 className="com-section-title">Request Type</h3>
            <div className="com-type-grid">
              <button
                type="button"
                className={`com-type-card ${requestMode === "individual_target" ? "selected" : ""}`}
                onClick={() => setValue("requestMode", "individual_target")}
              >
                <Globe size={18} className="com-type-card-icon" />
                <span>Individual Target</span>
              </button>
              <button
                type="button"
                className={`com-type-card ${requestMode === "company_target" ? "selected" : ""}`}
                onClick={() => setValue("requestMode", "company_target")}
              >
                <Building2 size={18} className="com-type-card-icon" />
                <span>Company Target</span>
              </button>
            </div>
          </div>

          {/* Shipper */}
          <div>
            <h3 className="com-section-title">Shipper</h3>
            <div className="com-grid-2">
              <ConstantPhoneInput
                label="Phone Number"
                value={watch("shipperPhoneNumber")}
                onChange={(val) => setValue("shipperPhoneNumber", val, { shouldValidate: true })}
                error={errors.shipperPhoneNumber?.message}
                placeholder="9XX XXX XXX"
              />

              <div className="com-field-group">
                <label className="com-label">Vehicle Type</label>
                <div className="com-select-wrap">
                  <select
                    {...register("vehicleTypeUniqueId")}
                    className={`com-select ${errors.vehicleTypeUniqueId ? "com-select-error" : ""}`}
                  >
                    <option value="">Select vehicle type</option>
                    {vehicleTypesList.map((vt) => (
                      <option key={vt.vehicleTypeUniqueId} value={vt.vehicleTypeUniqueId}>
                        {vt.vehicleTypeName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="com-select-chevron" />
                </div>
                {errors.vehicleTypeUniqueId && (
                  <p className="com-error-text">{errors.vehicleTypeUniqueId.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div>
            <h3 className="com-section-title">Order Details</h3>
            <div className="com-grid-2">
              <div className="com-field-group">
                <label className="com-label">Item Name</label>
                <input
                  {...register("shippableItemName")}
                  placeholder="Cement"
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
                placeholder="Select date"
                onChange={(val) => setValue("shippingDate", val, { shouldValidate: true })}
                error={errors.shippingDate?.message}
              />
              <DatePickerField
                label="Delivery Date"
                value={deliveryDate}
                placeholder="Select date"
                onChange={(val) => setValue("deliveryDate", val, { shouldValidate: true })}
                error={errors.deliveryDate?.message}
              />
            </div>
          </div>

          {/* ── Origin & Destination Sections (Aligned Rows) ── */}
          <div className="com-grid-2" style={{ marginBottom: "-4px" }}>
            <h3 className="com-section-title">Origin</h3>
            <h3 className="com-section-title">Destination</h3>
          </div>

          <div className="com-grid-2">
            {/* Origin Location Search */}
            <div className="com-field-group">
              <div className="com-search-wrap" ref={originWrapRef}>
                <Search size={16} className="com-search-icon" />
                <input
                  value={originQuery}
                  placeholder="Search pickup"
                  onChange={(e) => {
                    isTypingOriginRef.current = true;
                    setOriginQuery(e.target.value);
                    setValue("originDescription", e.target.value, { shouldValidate: true });
                    setOriginOpen(true);
                  }}
                  onFocus={() => {
                    if (originQuery.trim().length >= 3 && originResults.length > 0) {
                      setOriginOpen(true);
                    }
                  }}
                  className={`com-input com-search-input ${errors.originDescription ? "com-input-error" : ""}`}
                />
                {originOpen && originResults.length > 0 && (
                  <div className="com-dropdown">
                    {originResults.map((place, idx) => (
                      <button
                        type="button"
                        key={idx}
                        className="com-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectPlace(place, true);
                        }}
                      >
                        {place.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ minHeight: "14px" }}>
                {errors.originDescription && (
                  <p className="com-error-text" style={{ margin: 0 }}>{errors.originDescription.message}</p>
                )}
                {!errors.originDescription && (errors.originLatitude || errors.originLongitude) && (
                  <p className="com-error-text" style={{ margin: 0 }}>Please pick a location from search</p>
                )}
              </div>
            </div>

            {/* Destination Location Search */}
            <div className="com-field-group">
              <div className="com-search-wrap" ref={destWrapRef}>
                <Search size={16} className="com-search-icon" />
                <input
                  value={destQuery}
                  placeholder="Search delivery"
                  onChange={(e) => {
                    isTypingDestRef.current = true;
                    setDestQuery(e.target.value);
                    setValue("destinationDescription", e.target.value, { shouldValidate: true });
                    setDestOpen(true);
                  }}
                  onFocus={() => {
                    if (destQuery.trim().length >= 3 && destResults.length > 0) {
                      setDestOpen(true);
                    }
                  }}
                  className={`com-input com-search-input ${errors.destinationDescription ? "com-input-error" : ""}`}
                />
                {destOpen && destResults.length > 0 && (
                  <div className="com-dropdown">
                    {destResults.map((place, idx) => (
                      <button
                        type="button"
                        key={idx}
                        className="com-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectPlace(place, false);
                        }}
                      >
                        {place.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ minHeight: "14px" }}>
                {errors.destinationDescription && (
                  <p className="com-error-text" style={{ margin: 0 }}>{errors.destinationDescription.message}</p>
                )}
                {!errors.destinationDescription && (errors.destinationLatitude || errors.destinationLongitude) && (
                  <p className="com-error-text" style={{ margin: 0 }}>Please pick a location from search</p>
                )}
              </div>
            </div>
          </div>

          {/* Coordinates Row (Desktop Only) */}
          <div className="com-coords-row com-grid-2">
            <div className="com-grid-2">
              <div className="com-field-group">
                <label className="com-label">{t("orders.latitude")}</label>
                <input
                  value={originLat ?? ""}
                  readOnly
                  placeholder={t("common.autoFilled")}
                  className="com-input com-input-readonly"
                />
              </div>
              <div className="com-field-group">
                <label className="com-label">{t("orders.longitude")}</label>
                <input
                  value={originLng ?? ""}
                  readOnly
                  placeholder={t("common.autoFilled")}
                  className="com-input com-input-readonly"
                />
              </div>
            </div>

            <div className="com-grid-2">
              <div className="com-field-group">
                <label className="com-label">{t("orders.latitude")}</label>
                <input
                  value={destLat ?? ""}
                  readOnly
                  placeholder={t("common.autoFilled")}
                  className="com-input com-input-readonly"
                />
              </div>
              <div className="com-field-group">
                <label className="com-label">{t("orders.longitude")}</label>
                <input
                  value={destLng ?? ""}
                  readOnly
                  placeholder={t("common.autoFilled")}
                  className="com-input com-input-readonly"
                />
              </div>
            </div>
          </div>

          <div className="com-footer">
            <button type="button" className="com-btn-cancel" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="com-btn-submit" disabled={isSubmitting || isCreating}>
              {isSubmitting || isCreating ? t("orders.creating") : t("orders.createOrderBtn")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default CreateOrderModal;
