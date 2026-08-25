import React from "react";
import "./ConstantPhoneInput.css";

interface ConstantPhoneInputProps {
  id?: string;
  label?: string;
  value?: string | null;
  onChange: (e164Value: string) => void;
  placeholder?: string;
  error?: string | null;
  required?: boolean;
  optional?: boolean;
}

function formatWithDashes(rawDigits: string): string {
  const d = rawDigits.slice(0, 9);
  if (!d) return "";
  if (d.length <= 1) return d;
  if (d.length <= 3) return `${d[0]}-${d.slice(1)}`;
  if (d.length <= 5) return `${d[0]}-${d.slice(1, 3)}-${d.slice(3)}`;
  if (d.length <= 7) return `${d[0]}-${d.slice(1, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  return `${d[0]}-${d.slice(1, 3)}-${d.slice(3, 5)}-${d.slice(5, 7)}-${d.slice(7)}`;
}

export function ConstantPhoneInput({
  id,
  label,
  value,
  onChange,
  placeholder = "9-XX-XX-XX-XX",
  error,
  required = false,
  optional = false,
}: ConstantPhoneInputProps) {
  // Extract local 9 digits from value
  let localDigits = (value || "").replace(/\D/g, "");
  if (localDigits.startsWith("251")) localDigits = localDigits.slice(3);
  if (localDigits.startsWith("0")) localDigits = localDigits.slice(1);
  if (localDigits.length > 9) localDigits = localDigits.slice(0, 9);

  const displayValue = formatWithDashes(localDigits);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, "");
    if (digits.startsWith("251")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length > 9) digits = digits.slice(0, 9);

    const fullE164 = digits ? `+251${digits}` : "";
    onChange(fullE164);
  };

  return (
    <div className="cpi-group">
      {label && (
        <label htmlFor={id} className="cpi-label">
          {label}
          {required && <span style={{ color: "#E80000", marginLeft: "2px" }}>*</span>}
          {optional && <span className="cpi-optional">(Optional)</span>}
        </label>
      )}
      <div className={`cpi-box ${error ? "error" : ""}`}>
        <span className="cpi-prefix">+251</span>
        <input
          id={id}
          type="tel"
          value={displayValue}
          onChange={handleInput}
          placeholder={placeholder}
          className="cpi-input"
          autoComplete="tel"
        />
      </div>
      {error && <p className="cpi-error">{error}</p>}
    </div>
  );
}

export default ConstantPhoneInput;
