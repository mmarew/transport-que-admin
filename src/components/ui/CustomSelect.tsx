import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./CustomSelect.css";

export interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  error = false,
  disabled = false,
  className = "",
}: CustomSelectProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const enabledOptions = options.filter((o) => !o.disabled);
        const currentIndex = enabledOptions.findIndex((opt) => opt.value === value);
        const nextOpt = enabledOptions[currentIndex + 1];
        if (nextOpt) {
          onChange(nextOpt.value);
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const enabledOptions = options.filter((o) => !o.disabled);
        const currentIndex = enabledOptions.findIndex((opt) => opt.value === value);
        const prevOpt = enabledOptions[currentIndex - 1];
        if (prevOpt) {
          onChange(prevOpt.value);
        }
      }
    }
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const hasValue = selectedOption && selectedOption.value !== "";

  return (
    <div
      ref={containerRef}
      className={`custom-select-wrap ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`custom-select-trigger ${isOpen ? "open" : ""} ${error ? "error" : ""}`}
      >
        <span
          className={`custom-select-value ${!hasValue ? "custom-select-placeholder" : ""}`}
        >
          {hasValue ? selectedOption.label : placeholder || t("ui.selectOption")}
        </span>
        <ChevronDown
          size={16}
          className={`custom-select-chevron ${isOpen ? "open" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="custom-select-menu" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value || "__empty__"}
                role="option"
                aria-selected={isSelected}
                className={`custom-select-item ${isSelected ? "selected" : ""} ${opt.disabled ? "disabled" : ""}`}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <span className="custom-select-item-text">{opt.label}</span>
                {isSelected && (
                  <Check size={16} className="custom-select-item-check" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
