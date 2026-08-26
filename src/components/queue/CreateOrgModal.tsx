import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X, ChevronDown } from "lucide-react";
import { getApiError } from "@/lib/api";
import { setupOrgSchema, type SetupOrgFormValues } from "@/schemas/queue";
import { QUEUE_ORG_TYPES, type QueueOrgType } from "@/types/queue";
import { ConstantPhoneInput } from "../ui/ConstantPhoneInput";
import "./CreateOrderModal.css";

interface CreateOrgModalProps {
  onClose: () => void;
  onCreated?: () => void;
  onCreate: (data: {
    queueOrganizationName: string;
    queueOrganizationType: QueueOrgType;
    queueOrganizationAddress: string;
    latitude: number;
    longitude: number;
    queueOrganizationPhone?: string | null;
  }) => Promise<void>;
}

const PHOTON_URL = "https://photon.komoot.io/api/";

const ORG_TYPE_LABELS: Record<QueueOrgType, string> = {
  customs: "Customs",
  factory: "Factory",
  cement: "Cement",
  depot: "Depot",
  other: "Other",
};

interface PhotonPlace {
  label: string;
  lat: number;
  lng: number;
  city?: string;
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

export function CreateOrgModal({ onClose, onCreated, onCreate }: CreateOrgModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<SetupOrgFormValues>({
    resolver: zodResolver(setupOrgSchema),
    defaultValues: {
      queueOrganizationName: "",
      queueOrganizationType: undefined,
      queueOrganizationPhone: "",
      queueOrganizationAddress: "",
      latitude: null,
      longitude: null,
    },
  });

  const addressValue = watch("queueOrganizationAddress");
  const [isPending, setIsPending] = useState(false);
  const [suggestions, setSuggestions] = useState<PhotonPlace[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const debounceTimerRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `${PHOTON_URL}?q=${encodeURIComponent(query.trim())}&lat=9.0320&lon=38.7469&lang=en&limit=10`
      );
      if (res.ok) {
        const data = await res.json();
        const results = (data.features || []).map((feat: any) => ({
          label: formatPhotonLabel(feat),
          lat: feat.geometry?.coordinates[1] || 0,
          lng: feat.geometry?.coordinates[0] || 0,
          city: feat.properties?.state || feat.properties?.city,
        }));
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("queueOrganizationAddress", val, { shouldValidate: true });
    setShowSuggestions(true);

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      void fetchSuggestions(val);
    }, 120);
  };

  const handleSelectFeature = (place: PhotonPlace) => {
    setValue("queueOrganizationAddress", place.label, { shouldValidate: true });
    setValue("latitude", place.lat, { shouldValidate: true });
    setValue("longitude", place.lng, { shouldValidate: true });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onSubmit = async (values: SetupOrgFormValues) => {
    setIsPending(true);
    try {
      await onCreate({
        queueOrganizationName: values.queueOrganizationName,
        queueOrganizationType: values.queueOrganizationType,
        queueOrganizationAddress: values.queueOrganizationAddress,
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
        queueOrganizationPhone: values.queueOrganizationPhone || null,
      });
      toast.success("Organization created! Pending admin approval.");
      onCreated?.();
      reset();
      onClose();
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setIsPending(false);
    }
  };

  return createPortal(
    <div className="com-overlay">
      <div className="com-modal" style={{ maxWidth: "520px" }}>
        {/* Header */}
        <div className="com-header">
          <div>
            <h2 className="com-title">Setup Your Organization</h2>
            <p className="com-subtitle">Register your queue organization to manage drivers and dispatches</p>
          </div>
          <button type="button" className="com-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* Organization Name */}
          <div className="com-field-group">
            <label className="com-label">
              Organization Name <span style={{ color: "#E80000" }}>*</span>
            </label>
            <input
              {...register("queueOrganizationName")}
              placeholder="e.g. Addis Freight Terminal"
              className="com-input"
            />
            {errors.queueOrganizationName && (
              <p className="com-error-text">{errors.queueOrganizationName.message}</p>
            )}
          </div>

          {/* Organization Type */}
          <div className="com-field-group">
            <label className="com-label">
              Organization Type <span style={{ color: "#E80000" }}>*</span>
            </label>
            <div className="com-input-wrap">
              <select {...register("queueOrganizationType")} className="com-input com-select has-icon-right">
                <option value="">Select type...</option>
                {QUEUE_ORG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ORG_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="com-input-icon-right" />
            </div>
            {errors.queueOrganizationType && (
              <p className="com-error-text">{errors.queueOrganizationType.message}</p>
            )}
          </div>

          {/* Contact Phone (Optional with constant +251) */}
          <ConstantPhoneInput
            id="modal-org-phone"
            label="Contact Phone"
            value={watch("queueOrganizationPhone") || ""}
            onChange={(val) => setValue("queueOrganizationPhone", val, { shouldValidate: true })}
            placeholder="9-XX-XX-XX-XX"
            required={false}
            optional={true}
            error={errors.queueOrganizationPhone?.message}
          />

          {/* Address with Photon Autocomplete */}
          <div className="com-field-group" ref={dropdownRef}>
            <label className="com-label">
              Address <span style={{ color: "#E80000" }}>*</span>
            </label>
            <div className="com-input-wrap">
              <input
                value={addressValue ?? ""}
                onChange={handleAddressInput}
                placeholder="Search address (e.g. Dessie, Bole, Addis Ababa)..."
                className="com-input"
                autoComplete="off"
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
              />
              {isSearching && (
                <span
                  className="add-docs-spinner"
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    width: "14px",
                    height: "14px",
                    borderColor: "#e2e8f0",
                    borderTopColor: "#0B4D6D",
                  }}
                />
              )}
            </div>
            {errors.queueOrganizationAddress && (
              <p className="com-error-text">{errors.queueOrganizationAddress.message}</p>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="com-suggestions-list">
                {suggestions.map((place, index) => (
                  <button
                    type="button"
                    key={`${place.label}-${index}`}
                    className="com-suggestion-item"
                    onClick={() => handleSelectFeature(place)}
                  >
                    <div style={{ fontWeight: 600, color: "#1e293b" }}>{place.label}</div>
                    {place.city && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{place.city}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="com-footer">
            <button type="button" className="com-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="com-btn-submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Organization"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default CreateOrgModal;