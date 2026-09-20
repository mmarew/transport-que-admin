import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { usePhotonSearch, type PhotonPlace } from "@/hooks/usePhotonSearch";
import { useClickOutside } from "@/hooks/useClickOutside";

export interface LocationAutocompleteProps {
  id?: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectPlace: (place: PhotonPlace) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: "com" | "setup" | "orders";
  className?: string;
  inputClassName?: string;
}

export function LocationAutocomplete({
  id = "location-search",
  label,
  placeholder = "Search address...",
  value,
  onChange,
  onSelectPlace,
  error,
  required = false,
  disabled = false,
  variant = "com",
  className = "",
  inputClassName = "",
}: LocationAutocompleteProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { suggestions, isSearching, search, clearSuggestions } = usePhotonSearch(300);

  useClickOutside(containerRef, () => {
    setShowDropdown(false);
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    search(val);
    setShowDropdown(true);
  };

  const handleSelect = (place: PhotonPlace) => {
    onSelectPlace(place);
    setShowDropdown(false);
    clearSuggestions();
  };

  const isCom = variant === "com";
  const fieldGroupClass = isCom ? `com-field-group ${className}` : `input-group ${className}`;
  const labelClass = isCom ? "com-label" : "input-label";
  const inputWrapClass = isCom ? "com-input-wrap" : "input-wrapper";
  const inputBaseClass = isCom ? "com-input" : "input-field";
  const errorTextClass = isCom ? "com-error-text" : "error-message";
  const listClass = isCom ? "com-suggestions-list" : "suggestions-dropdown";
  const itemClass = isCom ? "com-suggestion-item" : "suggestion-item";

  return (
    <div className={fieldGroupClass} ref={containerRef} style={{ position: "relative" }}>
      {label && (
        <label className={labelClass} htmlFor={id}>
          {label} {required && <span style={{ color: "#E80000" }}>*</span>}
        </label>
      )}

      <div className={`${inputWrapClass} ${error ? (isCom ? "com-input-wrap--error" : "input-wrapper--error") : ""}`}>
        <input
          id={id}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`${inputBaseClass} ${inputClassName}`}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
        />
        {isSearching && (
          <span
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#888",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Loader2 size={16} className="animate-spin" />
          </span>
        )}
      </div>

      {error && <p className={errorTextClass}>{error}</p>}

      {showDropdown && suggestions.length > 0 && (
        <ul className={listClass} style={{ zIndex: 1000 }}>
          {suggestions.map((place, idx) => (
            <li
              key={`${place.lat}-${place.lng}-${idx}`}
              className={itemClass}
              onMouseDown={() => handleSelect(place)}
            >
              <span>{place.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LocationAutocomplete;
