import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, LogOut } from "lucide-react";
import { toast } from "sonner";
import heroImg from "../../assets/Frame.png";
import LanguageSelector from "../ui/LanguageSelector";
import { ConstantPhoneInput } from "../ui/ConstantPhoneInput";
import { useAuth } from "../../context/AuthContext";
import { disconnectSocket } from "../../lib/socket";
import { hasOrganizationData } from "../../services/organization.service";
import { useCreateQueueOrganizationMutation, useListQueueOrganizationsQuery } from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { setupOrgSchema, type SetupOrgFormValues } from "../../schemas/queue";
import { QUEUE_ORG_TYPES, type QueueOrgType } from "../../types/queue";
import "../../styles/auth.css";
import "./SetupOrganization.css";

const PHOTON_API_URL = "https://photon.komoot.io/api/";

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

export const SetupOrganization: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: orgsData, isSuccess } = useListQueueOrganizationsQuery();

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate("/login", { replace: true });
  };

  // If user already has an organization, forward directly to dashboard
  useEffect(() => {
    if (isSuccess && hasOrganizationData(orgsData)) {
      navigate("/dashboard", { replace: true });
    }
  }, [isSuccess, orgsData, navigate]);

  const [createOrgMutation, { isLoading: isCreating }] = useCreateQueueOrganizationMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
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
  const [suggestions, setSuggestions] = useState<PhotonPlace[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const debounceTimerRef = useRef<number | null>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);

  const fetchAddressSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `${PHOTON_API_URL}?q=${encodeURIComponent(query.trim())}&lat=9.0320&lon=38.7469&lang=en&limit=10`
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

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("queueOrganizationAddress", val, { shouldValidate: true });
    setShowSuggestions(true);

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      void fetchAddressSuggestions(val);
    }, 120);
  };

  const handleSelectSuggestion = (place: PhotonPlace) => {
    setValue("queueOrganizationAddress", place.label, { shouldValidate: true });
    setValue("longitude", place.lng);
    setValue("latitude", place.lat);

    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        suggestionsBoxRef.current &&
        !suggestionsBoxRef.current.contains(e.target as Node) &&
        addressInputRef.current &&
        !addressInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const onSubmit = async (data: SetupOrgFormValues) => {
    try {
      await createOrgMutation({
        queueOrganizationName: data.queueOrganizationName,
        queueOrganizationType: data.queueOrganizationType,
        queueOrganizationPhone: data.queueOrganizationPhone || null,
        queueOrganizationAddress: data.queueOrganizationAddress,
        latitude: data.latitude != null ? Number(data.latitude) : null,
        longitude: data.longitude != null ? Number(data.longitude) : null,
      }).unwrap();
      toast.success("Organization created! Pending admin approval.");
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg = parseError(err);
      toast.error(msg);
    }
  };

  const { ref: formAddressRef, ...addressRest } = register("queueOrganizationAddress");

  return (
    <div className="login-container">
      {/* Left: hero image (desktop only) */}
      <div className="login-hero">
        <img src={heroImg} alt="Transport Hero" />
        <div className="desktop-lang-selector">
          <LanguageSelector />
        </div>
      </div>

      {/* Right: form panel */}
      <div className="login-form-panel">
        {/* Mobile hero */}
        <div className="login-mobile-hero">
          <div className="login-mobile-title-row" style={{ position: "relative" }}>
            <span className="login-app-title">{t("auth.loginTitle")}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="register-logout-btn"
              aria-label={t("common.logout")}
              title={t("common.logout")}
              style={{ position: "absolute", right: "1.5rem" }}
            >
              <LogOut size={22} />
            </button>
          </div>
          <div className="login-mobile-lang-row">
            <LanguageSelector />
          </div>
          <div className="login-mobile-hero-text" style={{ paddingBottom: "1.5rem" }}>
            <h1>{t("org.setupTitle")}</h1>
            <p>{t("org.setupSubtitle")}</p>
          </div>
        </div>

        <div className="login-card animate-scale-up">
          <div className="login-header login-header--desktop" style={{ position: "relative" }}>
            <h1>{t("org.setupTitle")}</h1>
            <p>{t("org.setupSubtitle")}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="register-logout-btn-desktop"
              aria-label={t("common.logout")}
              title={t("common.logout")}
            >
              <LogOut size={22} />
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Organization Name */}
            <div className="form-group form-group-mb">
              <label htmlFor="org-name">
                {t("org.nameLabel")} <span style={{ color: "#E80000" }}>*</span>
              </label>
              <div className={`input-wrapper${errors.queueOrganizationName ? " input-wrapper--error" : ""}`}>
                <input
                  id="org-name"
                  type="text"
                  placeholder="e.g. Addis Freight Terminal"
                  autoComplete="organization"
                  {...register("queueOrganizationName")}
                />
              </div>
              {errors.queueOrganizationName && (
                <p className="setup-org-field-error">{errors.queueOrganizationName.message}</p>
              )}
            </div>

            {/* Organization Type Dropdown */}
            <div className="form-group form-group-mb">
              <label htmlFor="org-type">
                {t("org.typeLabel")} <span style={{ color: "#E80000" }}>*</span>
              </label>
              <div className={`input-wrapper setup-org-select-wrapper${errors.queueOrganizationType ? " input-wrapper--error" : ""}`}>
                <select
                  id="org-type"
                  className="setup-org-select"
                  {...register("queueOrganizationType")}
                >
                  <option value="">{t("org.selectType")}...</option>
                  {QUEUE_ORG_TYPES.map((typeKey) => (
                    <option key={typeKey} value={typeKey}>
                      {t(`org.types.${typeKey}`, { defaultValue: ORG_TYPE_LABELS[typeKey] })}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="setup-org-select-icon" />
              </div>
              {errors.queueOrganizationType && (
                <p className="setup-org-field-error">{errors.queueOrganizationType.message}</p>
              )}
            </div>

            {/* Contact Phone */}
            <div className="form-group form-group-mb">
              <ConstantPhoneInput
                id="org-phone"
                label={t("org.phoneLabel")}
                value={watch("queueOrganizationPhone") || ""}
                onChange={(val) => setValue("queueOrganizationPhone", val, { shouldValidate: true })}
                placeholder="9-XX-XX-XX-XX"
                required={false}
                optional={true}
                error={errors.queueOrganizationPhone?.message}
              />
            </div>

            {/* Address */}
            <div className="form-group setup-org-address-group">
              <label htmlFor="org-address">
                {t("org.addressLabel")} <span style={{ color: "#E80000" }}>*</span>
              </label>
              <div className={`input-wrapper${errors.queueOrganizationAddress ? " input-wrapper--error" : ""}`}>
                <input
                  id="org-address"
                  type="text"
                  placeholder={t("org.searchAddressPlaceholder")}
                  autoComplete="off"
                  value={addressValue ?? ""}
                  {...addressRest}
                  ref={(el) => {
                    formAddressRef(el);
                    addressInputRef.current = el;
                  }}
                  onChange={handleAddressChange}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                />
                {isSearching && <span className="setup-org-address-spinner" />}
              </div>
              {errors.queueOrganizationAddress && (
                <p className="setup-org-field-error">{errors.queueOrganizationAddress.message}</p>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div ref={suggestionsBoxRef} className="setup-org-suggestions-dropdown">
                  {suggestions.map((place, index) => (
                    <button
                      type="button"
                      key={`${place.label}-${index}`}
                      className="setup-org-suggestion-item"
                      onClick={() => handleSelectSuggestion(place)}
                    >
                      <span className="setup-org-suggestion-name">{place.label}</span>
                      {place.city && <span className="setup-org-suggestion-details">{place.city}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="login-btn" disabled={isSubmitting || isCreating}>
              {isSubmitting || isCreating ? (
                <span className="btn-inner-flex">
                  <span className="add-docs-spinner" />
                  {t("org.creating")}
                </span>
              ) : (
                t("org.createOrg")
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default SetupOrganization;
