import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2 } from "lucide-react";

export interface PhotonPlace {
  label: string;
  lat: number;
  lng: number;
}

export interface LocationSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSelectPlace: (place: PhotonPlace) => void;
  placeholder: string;
  error?: string;
  coordError?: boolean;
}

const PHOTON_URL = "https://photon.komoot.io/api/";

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
  return parts.length > 0
    ? Array.from(new Set(parts)).join(", ")
    : p.name || p.street || "Location";
}

const normalizeQuery = (q: string): string =>
  q
    .trim()
    .toLowerCase()
    .replace(/[,.\s]+$/, "")
    .trim();

const placesCache = new Map<string, PhotonPlace[]>();

/**
 * LocationSearchField provides address autocomplete via Photon API
 * with debouncing, caching, in-flight cancellation, and dropdown styling.
 */
export function LocationSearchField({
  value,
  onChange,
  onSelectPlace,
  placeholder,
  error,
  coordError,
}: LocationSearchFieldProps) {
  const { t } = useTranslation();
  const [results, setResults] = useState<PhotonPlace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        isTypingRef.current = false;
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isTypingRef.current || !isOpen) {
      setIsLoading(false);
      return;
    }
    const q = normalizeQuery(value);
    if (q.length < 3) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (placesCache.has(q)) {
      setResults(placesCache.get(q)!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${PHOTON_URL}?q=${encodeURIComponent(q)}&lat=9.0320&lon=38.7469&lang=en&limit=6`,
          { signal },
        );
        if (res.ok) {
          const data = await res.json();
          const mapped: PhotonPlace[] = (data.features || []).map((feat: any) => ({
            label: formatPhotonLabel(feat),
            lat: feat.geometry?.coordinates[1] || 0,
            lng: feat.geometry?.coordinates[0] || 0,
          }));
          placesCache.set(q, mapped);
          if (!signal.aborted) {
            setResults(mapped);
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          // silent fallback
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [value, isOpen]);

  const handleSelect = (place: PhotonPlace) => {
    isTypingRef.current = false;
    setIsLoading(false);
    setResults([]);
    setIsOpen(false);
    onSelectPlace(place);
  };

  return (
    <div className="com-field-group">
      <div className="com-search-wrap" ref={wrapRef}>
        <Search size={16} className="com-search-icon" />
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            isTypingRef.current = true;
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (value.trim().length >= 3) {
              setIsOpen(true);
            }
          }}
          className={`com-input com-search-input ${isLoading ? "is-loading" : ""} ${error ? "com-input-error" : ""}`}
        />
        {isLoading && (
          <Loader2 size={16} className="com-search-loading-icon com-spinner" />
        )}
        {isOpen &&
          (isLoading ||
            results.length > 0 ||
            (!isLoading && value.trim().length >= 3)) && (
            <div className="com-dropdown">
              {isLoading && (
                <div className="com-dropdown-status">
                  <Loader2 size={14} className="com-spinner" />
                  <span>
                    {t("orders.searchingLocations", "Searching locations...")}
                  </span>
                </div>
              )}
              {!isLoading &&
                results.map((place, idx) => (
                  <button
                    type="button"
                    key={idx}
                    className="com-dropdown-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(place);
                    }}
                  >
                    {place.label}
                  </button>
                ))}
              {!isLoading &&
                results.length === 0 &&
                value.trim().length >= 3 && (
                  <div className="com-dropdown-empty">
                    <span>
                      {t("orders.noLocationsFound", "No locations found")}
                    </span>
                  </div>
                )}
            </div>
          )}
      </div>
      <div style={{ minHeight: "14px" }}>
        {error && (
          <p className="com-error-text" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        {!error && coordError && (
          <p className="com-error-text" style={{ margin: 0 }}>
            {t(
              "orders.pickLocationFromSearch",
              "Please pick a location from search",
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export default LocationSearchField;
