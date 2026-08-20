import React, { useRef, useCallback } from "react";
import FieldError from "./FieldError";
import {
  formatPhoneDisplay,
  fromE164,
  toE164,
  isValidPhoneDigits,
  PHONE_MAX_DIGITS,
  stripNonDigits,
} from "../../utils/phoneFormatter";
import "../../styles/auth.css";
import "./PhoneNumberInput.css";

export interface PhoneNumberInputProps {
  id: string;
  label?: string;
  value: string;
  onChange: (e164Value: string) => void;
  onDigitsChange?: (digits: string) => void;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  tabIndex?: number;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  autoComplete?: string;
  name?: string;
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  id,
  label,
  value,
  onChange,
  onDigitsChange,
  error,
  disabled = false,
  required = false,
  className = "",
  placeholder = "9-XX-XX-XX-XX",
  tabIndex,
  onBlur,
  autoComplete = "tel",
  name,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const rawDigits = fromE164(
    value.startsWith("+251") ? value : `+251${stripNonDigits(value)}`
  );
  const displayValue = formatPhoneDisplay(rawDigits);

  const maskedCaretPosition = useCallback((digitPos: number): number => {
    const hyphenAfter = new Set([1, 3, 5, 7]);
    let caretInMasked = digitPos;
    for (let i = 0; i < digitPos && i < PHONE_MAX_DIGITS; i++) {
      if (hyphenAfter.has(i + 1)) caretInMasked++;
    }
    return caretInMasked;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const rawInput = e.target.value;
      const selectionStart = e.target.selectionStart ?? rawInput.length;
      const beforeCursor = rawInput.slice(0, selectionStart);
      const digitCountBeforeCursor = stripNonDigits(beforeCursor).length;
      const newDigits = stripNonDigits(rawInput).slice(0, PHONE_MAX_DIGITS);

      onChange(toE164(newDigits));
      onDigitsChange?.(newDigits);

      requestAnimationFrame(() => {
        if (inputRef.current) {
          const newCaret = maskedCaretPosition(
            Math.min(digitCountBeforeCursor, newDigits.length)
          );
          inputRef.current.setSelectionRange(newCaret, newCaret);
        }
      });
    },
    [disabled, onChange, onDigitsChange, maskedCaretPosition]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      const input = inputRef.current;
      if (!input) return;

      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;

      if (e.key === "Backspace" && start === end && start > 0) {
        const prevChar = displayValue[start - 1];
        if (prevChar === "-") {
          e.preventDefault();
          const beforeHyphen = displayValue.slice(0, start - 2);
          const afterHyphen = displayValue.slice(start);
          const merged = beforeHyphen + afterHyphen;
          const newDigits = stripNonDigits(merged).slice(0, PHONE_MAX_DIGITS);

          onChange(toE164(newDigits));
          onDigitsChange?.(newDigits);

          requestAnimationFrame(() => {
            if (inputRef.current) {
              const caretPos = maskedCaretPosition(
                Math.max(0, stripNonDigits(beforeHyphen).length)
              );
              inputRef.current.setSelectionRange(caretPos, caretPos);
            }
          });
        }
      }
    },
    [disabled, displayValue, onChange, onDigitsChange, maskedCaretPosition]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (disabled) return;

      const pasted = e.clipboardData.getData("text");
      const pastedDigits = stripNonDigits(pasted.replace(/^\+?251/, "")).slice(
        0,
        PHONE_MAX_DIGITS
      );

      onChange(toE164(pastedDigits));
      onDigitsChange?.(pastedDigits);

      requestAnimationFrame(() => {
        if (inputRef.current) {
          const endPos = maskedCaretPosition(pastedDigits.length);
          inputRef.current.setSelectionRange(endPos, endPos);
        }
      });
    },
    [disabled, onChange, onDigitsChange, maskedCaretPosition]
  );

  const isComplete = isValidPhoneDigits(rawDigits);

  const rowClassName = [
    "phone-input-row",
    isFocused && !error ? "focused" : "",
    error ? "error" : "",
    disabled ? "disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const inputClassName = [
    "phone-input-field",
    isComplete ? "complete" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`phone-input-wrapper ${className}`}>
      {label && (
        <label htmlFor={id} className="phone-input-label">
          {label}
          {required && (
            <span className="phone-input-required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className={rowClassName}>
        <span className="phone-input-prefix" aria-hidden="true">
          +251
        </span>

        <input
          ref={inputRef}
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          disabled={disabled}
          tabIndex={tabIndex}
          aria-label={label ?? "Phone number"}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          maxLength={PHONE_MAX_DIGITS + 4}
          className={inputClassName}
        />
      </div>

      <FieldError message={error} />
    </div>
  );
};

export default PhoneNumberInput;
