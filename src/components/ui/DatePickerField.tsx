import { useState, useRef } from "react";
import { Calendar } from "lucide-react";

interface DatePickerFieldProps {
  label: string;
  value?: string;
  onChange: (val: string) => void;
  error?: string;
}

export function DatePickerField({
  label,
  value,
  onChange,
  error,
}: DatePickerFieldProps) {
  const [type, setType] = useState<"text" | "date">(value ? "date" : "text");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    setType("date");
    setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      try {
        if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === "function") {
          (el as HTMLInputElement & { showPicker: () => void }).showPicker();
        } else {
          el.focus();
        }
      } catch {
        el.focus();
      }
    }, 10);
  };

  return (
    <div className="com-field-group">
      <label className="com-label">{label}</label>
      <div className="com-input-wrap" onClick={handleClick}>
        <input
          ref={inputRef}
          type={type}
          value={value || ""}
          placeholder="mm/dd/yyyy"
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (!value) setType("text");
          }}
          className={`com-input ${error ? "com-input-error" : ""}`}
        />
        <Calendar size={16} className="com-input-icon" />
      </div>
      {error && <p className="com-error-text">{error}</p>}
    </div>
  );
}

export default DatePickerField;
