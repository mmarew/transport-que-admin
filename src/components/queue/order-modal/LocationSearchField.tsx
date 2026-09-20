import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2 } from "lucide-react";
import { usePhotonSearch, type PhotonPlace } from "@/hooks/usePhotonSearch";
import { useClickOutside } from "@/hooks/useClickOutside";

export type { PhotonPlace };

export interface LocationSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSelectPlace: (place: PhotonPlace) => void;
  placeholder: string;
  error?: string;
  coordError?: boolean;
}

/**
 * LocationSearchField provides address autocomplete via shared usePhotonSearch hook
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
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { suggestions, isSearching, search, clearSuggestions } =
    usePhotonSearch();

  useClickOutside(wrapRef, () => setIsOpen(false), isOpen);

  const handleSelect = (place: PhotonPlace) => {
    clearSuggestions();
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
            const val = e.target.value;
            onChange(val);
            search(val);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (value.trim().length >= 2) {
              search(value);
              setIsOpen(true);
            }
          }}
          className={`com-input com-search-input ${isSearching ? "is-loading" : ""} ${error ? "com-input-error" : ""}`}
        />
        {isSearching && (
          <Loader2 size={16} className="com-search-loading-icon com-spinner" />
        )}
        {isOpen &&
          (isSearching ||
            suggestions.length > 0 ||
            (!isSearching && value.trim().length >= 2)) && (
            <div className="com-dropdown">
              {isSearching && (
                <div className="com-dropdown-status">
                  <Loader2 size={14} className="com-spinner" />
                  <span>
                    {t("orders.searchingLocations", "Searching locations...")}
                  </span>
                </div>
              )}
              {!isSearching &&
                suggestions.map((place, idx) => (
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
              {!isSearching &&
                suggestions.length === 0 &&
                value.trim().length >= 2 && (
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
