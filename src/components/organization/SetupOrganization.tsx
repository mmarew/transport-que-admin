import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import heroImg from "../../assets/Frame.png";
import LanguageSelector from "../ui/LanguageSelector";
import { PhoneNumberInput } from "../ui/PhoneNumberInput";
import {
  createQueueOrganization,
  listQueueOrganizations,
  hasOrganizationData,
} from "../../services/organization.service";
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

interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  geometry: {
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export const SetupOrganization: React.FC = () => {
  const navigate = useNavigate();

  // If user already has an organization, forward directly to dashboard
  useEffect(() => {
    let active = true;
    listQueueOrganizations()
      .then((res) => {
        if (active && hasOrganizationData(res.data)) {
          navigate("/dashboard", { replace: true });
        }
      })
      .catch(() => {
        // ignore
      });
    return () => {
      active = false;
    };
  }, [navigate]);

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
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
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
      const url = `${PHOTON_API_URL}?q=${encodeURIComponent(query.trim())}&lang=en&limit=5`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.features ?? []);
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
    }, 250);
  };

  const handleSelectSuggestion = (feature: PhotonFeature) => {
    const { properties, geometry } = feature;
    const parts = [
      properties.name,
      properties.street,
      properties.housenumber,
      properties.city,
      properties.state,
      properties.country,
    ].filter(Boolean);

    const formattedAddress = parts.join(", ");
    setValue("queueOrganizationAddress", formattedAddress, { shouldValidate: true });

    if (geometry?.coordinates && geometry.coordinates.length >= 2) {
      setValue("longitude", geometry.coordinates[0]);
      setValue("latitude", geometry.coordinates[1]);
    }

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
      await createQueueOrganization({
        queueOrganizationName: data.queueOrganizationName,
        queueOrganizationType: data.queueOrganizationType,
        queueOrganizationPhone: data.queueOrganizationPhone || null,
        queueOrganizationAddress: data.queueOrganizationAddress,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      });
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
          <div className="login-mobile-title-row">
            <span className="login-app-title">Queue Admin</span>
          </div>
          <div className="login-mobile-lang-row">
            <LanguageSelector />
          </div>
          <div className="login-mobile-hero-text" style={{ paddingBottom: "1.5rem" }}>
            <h1>Setup Organization</h1>
            <p>Register your queue organization to get started</p>
          </div>
        </div>

        <div className="login-card animate-scale-up">
          <div className="login-header login-header--desktop">
            <h1>Setup Your Organization</h1>
            <p>Register your queue organization to manage drivers and dispatches</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Organization Name */}
            <div className="form-group form-group-mb">
              <label htmlFor="org-name">
                Organization Name <span style={{ color: "#E80000" }}>*</span>
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
                Organization Type <span style={{ color: "#E80000" }}>*</span>
              </label>
              <div className={`input-wrapper setup-org-select-wrapper${errors.queueOrganizationType ? " input-wrapper--error" : ""}`}>
                <select
                  id="org-type"
                  className="setup-org-select"
                  {...register("queueOrganizationType")}
                >
                  <option value="">Select type...</option>
                  {QUEUE_ORG_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ORG_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="setup-org-select-icon" />
              </div>
              {errors.queueOrganizationType && (
                <p className="setup-org-field-error">{errors.queueOrganizationType.message}</p>
              )}
            </div>

            {/* Phone (optional with +251 prefix) */}
            <div className="form-group form-group-mb">
              <PhoneNumberInput
                id="org-phone"
                label="Contact Phone"
                value={watch("queueOrganizationPhone") || ""}
                onChange={(val) => setValue("queueOrganizationPhone", val, { shouldValidate: true })}
                placeholder="9XX XXX XXX"
                required={false}
                error={errors.queueOrganizationPhone?.message}
              />
            </div>

            {/* Address (Required with Photon Autocomplete) */}
            <div className="form-group setup-org-address-group">
              <label htmlFor="org-address">
                Address <span style={{ color: "#E80000" }}>*</span>
              </label>
              <div className={`input-wrapper${errors.queueOrganizationAddress ? " input-wrapper--error" : ""}`}>
                <input
                  id="org-address"
                  type="text"
                  placeholder="Search address (e.g. Dessie, Bole, Addis Ababa)…"
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
                  {suggestions.map((feat, index) => {
                    const name = feat.properties.name ?? "Location";
                    const details = [
                      feat.properties.street,
                      feat.properties.housenumber,
                      feat.properties.city,
                      feat.properties.state,
                      feat.properties.country,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <button
                        type="button"
                        key={`${feat.properties.name}-${index}`}
                        className="setup-org-suggestion-item"
                        onClick={() => handleSelectSuggestion(feat)}
                      >
                        <span className="setup-org-suggestion-name">{name}</span>
                        {details && <span className="setup-org-suggestion-details">{details}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button type="submit" className="login-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="btn-inner-flex">
                  <span className="add-docs-spinner" />
                  Creating...
                </span>
              ) : (
                "Create Organization"
              )}
            </button>

            <div className="login-footer form-group-mb login-footer-spaced">
              <p style={{ color: "#64748b", fontSize: "0.8rem", textAlign: "center", margin: 0 }}>
                Your organization will be reviewed and approved by an admin.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetupOrganization;
