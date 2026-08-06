import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { groupPhoneDigits, type AuthFieldConfig } from "../../lib/authConfig";
import type { AuthTheme } from "./themes";export function FieldRenderer({
  field,
  value,
  onChange,
  error,
  theme,
}: {
  field: AuthFieldConfig;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  theme: AuthTheme;
}) {
  return (
    <div>
      <label htmlFor={field.name} className={theme.label}>
        {field.label}
        {!field.required && <span className="font-normal opacity-60"> (optional)</span>}
      </label>
      {field.type === "otp" ? (
        <OtpInputs
          id={field.name}
          value={value}
          onChange={onChange}
          boxClass={theme.otpBox}
        />
      ) : field.type === "tel" ? (
        <GroupedPhoneInput
          id={field.name}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          className={theme.input}
        />
      ) : (
        <input
          id={field.name}
          type={field.type}
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={theme.input}
        />
      )}
      {error && <p className={theme.error}>{error}</p>}
    </div>
  );
}

function GroupedPhoneInput({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  value: string;
  onChange: (normalized: string) => void;
  placeholder?: string;
  className: string;
}) {
  const display = `+251 ${groupPhoneDigits(value.replace(/\D/g, ""))}`.trim();
  const handleChange = (raw: string) => {
    let digits = raw.replace(/\D/g, "");
    if (!digits.startsWith("251")) digits = `251${digits}`;
    digits = digits.slice(0, 12);
    onChange(`+${digits}`);
  };
  return (
    <input
      id={id}
      type="tel"
      required
      inputMode="numeric"
      value={display}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={placeholder}
      className={`${className} tracking-widest`}
    />
  );
}

export function OtpInputs({
  id,
  value,
  onChange,
  boxClass,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  boxClass: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setDigitAt = (index: number, digit: string) => {
    const arr = value.padEnd(6, " ").split("");
    arr[index] = digit;
    onChange(arr.join("").trim());
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    setDigitAt(index, digit);
    if (index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace") return;
    const hasValue = Boolean(value[index]);
    if (hasValue) {
      e.preventDefault();
      setDigitAt(index, " ");
    } else if (index > 0) {
      e.preventDefault();
      setDigitAt(index - 1, " ");
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    const arr = value.padEnd(6, " ").split("");
    digits.split("").forEach((d, j) => {
      arr[index + j] = d;
    });
    onChange(arr.join("").trim());
    refs.current[Math.min(index + digits.length, 5)]?.focus();
  };

  return (
    <div className="mt-1 flex gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          id={i === 0 ? id : undefined}
          type="text"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          aria-label={`OTP digit ${i + 1}`}
          className={boxClass}
        />
      ))}
    </div>
  );
}
