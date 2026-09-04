import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X, ChevronDown } from "lucide-react";
import parseError from "@/utils/parseError";
import { setupOrgSchema, type SetupOrgFormValues } from "@/schemas/queue";
import { QUEUE_ORG_TYPES, type QueueOrgType } from "@/types/queue";
import { ConstantPhoneInput } from "../ui/ConstantPhoneInput";
import { useModalA11y } from "@/hooks/useModalA11y";
import MobileHeader from "../common/MobileHeader";
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
  const { t } = useTranslation();
  const modalRef = useModalA11y<HTMLDivElement>({ isOpen: true, onClose });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SetupOrgFormValues>({
    resolver: zodResolver(setupOrgSchema),
    defaultValues: {
      queueOrganizationName: "",
      queueOrganizationType: "customs",
      queueOrganizationPhone: "",
      queueOrganizationAddress: "",
      latitude: undefined,
      longitude: undefined,
    },
  });

  const [isPending, setIsPending] = useState(false);
  const [suggestions, setSuggestions] = useState<PhotonPlace[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addressValue = watch("queueOrganizationAddress");

  const searchAddress = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSearching(true);
    try {
      const url = `${PHOTON_URL}?q=${encodeURIComponent(query.trim())}&limit=5&bbox=33.0,3.4,48.0,15.0`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      const features = json.features || [];
      const places: PhotonPlace[] = features.map((f: any) => ({
        label: formatPhotonLabel(f),
        lat: f.geometry?.coordinates?.[1] || 0,
        lng: f.geometry?.coordinates?.[0] || 0,
        city: f.properties?.city || f.properties?.name,
      }));
      setSuggestions(places);
      setShowSuggestions(places.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("queueOrganizationAddress", val, { shouldValidate: true });
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => searchAddress(val), 350);
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
        queueOrganizationType: values.queueOrganizationType as QueueOrgType,
        queueOrganizationAddress: values.queueOrganizationAddress,
        latitude: values.latitude || 9.0227,
        longitude: values.longitude || 38.7469,
        queueOrganizationPhone: values.queueOrganizationPhone || null,
      });
      toast.success(t("org.createdSuccess"));
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      toast.error(parseError(err));
    } finally {
      setIsPending(false);
    }
  };

  return createPortal(
    <div className="com-overlay">
      <div
        className="com-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-org-modal-title"
        style={{ maxWidth: "520px" }}
      >
        {/* Mobile Header */}
        <div className="com-mobile-header">
          <MobileHeader title="Create Company" onBack={onClose} />
        </div>

        {/* Desktop Header */}
        <div className="com-header com-header--desktop">
          <div>
            <h2 id="create-org-modal-title" className="com-title">{t("org.setupTitle")}</h2>
            <p className="com-subtitle">{t("org.setupSubtitle")}</p>
          </div>
          <button type="button" className="com-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* Organization Name */}
          <div className="com-field-group">
            <label className="com-label" htmlFor="create-org-name">
              {t("org.nameLabel")} <span style={{ color: "#E80000" }}>*</span>
            </label>
            <input
              id="create-org-name"
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
            <label className="com-label" htmlFor="create-org-type">
              {t("org.typeLabel")} <span style={{ color: "#E80000" }}>*</span>
            </label>
            <div className="com-input-wrap">
              <select
                id="create-org-type"
                {...register("queueOrganizationType")}
                className="com-input com-select has-icon-right"
              >
                <option value="">{t("org.selectType")}...</option>
                {QUEUE_ORG_TYPES.map((typeKey) => (
                  <option key={typeKey} value={typeKey}>
                    {t(`org.types.${typeKey}`, { defaultValue: ORG_TYPE_LABELS[typeKey] })}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="com-input-icon-right" />
            </div>
            {errors.queueOrganizationType && (
              <p className="com-error-text">{errors.queueOrganizationType.message}</p>
            )}
          </div>

          {/* Contact Phone */}
          <ConstantPhoneInput
            id="modal-org-phone"
            label={t("org.phoneLabel")}
            value={watch("queueOrganizationPhone") || ""}
            onChange={(val) => setValue("queueOrganizationPhone", val, { shouldValidate: true })}
            placeholder="9-XX-XX-XX-XX"
            required={false}
            optional={true}
            error={errors.queueOrganizationPhone?.message}
          />

          {/* Address */}
          <div className="com-field-group" ref={dropdownRef}>
            <label className="com-label" htmlFor="create-org-address-search">
              {t("org.addressLabel")} <span style={{ color: "#E80000" }}>*</span>
            </label>
            <div className="com-input-wrap">
              <input
                id="create-org-address-search"
                name="orgAddressSearch"
                value={addressValue ?? ""}
                onChange={handleAddressInput}
                placeholder={t("org.searchAddressPlaceholder")}
                aria-label={t("org.searchAddressPlaceholder")}
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

            {/* Address Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="com-dropdown"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  zIndex: 50,
                  maxHeight: "200px",
                  overflowY: "auto",
                  marginTop: "4px",
                }}
              >
                {suggestions.map((place, index) => (
                  <button
                    type="button"
                    key={`${place.label}-${index}`}
                    className="com-dropdown-item"
                    onClick={() => handleSelectFeature(place)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: "0.85rem",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 500, color: "#1e293b" }}>{place.label}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              className="com-btn-cancel"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="com-btn-submit"
            >
              {isPending ? t("org.creating") : t("org.createOrg")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default CreateOrgModal;