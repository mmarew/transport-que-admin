import React from "react";
import { useTranslation } from "react-i18next";
import { OTP_LENGTH } from "../../hooks/useOtpVerification";

interface OtpDigitInputsProps {
  digits: string[];
  boxRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  otpError: string | null;
  isLoading: boolean;
  onChange: (index: number, val: string) => void;
  onKeyDown: (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}

export const OtpDigitInputs: React.FC<OtpDigitInputsProps> = ({
  digits,
  boxRefs,
  otpError,
  isLoading,
  onChange,
  onKeyDown,
  onPaste,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="otp-input-group"
      role="group"
      aria-label={t("auth.otpGroupAria")}
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            boxRefs.current[i] = el;
          }}
          id={`otp-digit-${i}`}
          type="text"
          inputMode="numeric"
          autoFocus={i === 0}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={i === 0 ? onPaste : undefined}
          onFocus={(e) => e.target.select()}
          className={`otp-digit-input ${digit ? "filled" : ""}`}
          placeholder="-"
          aria-label={t("auth.otpDigitOf", { n: i + 1, total: OTP_LENGTH })}
          aria-invalid={!!otpError}
          disabled={isLoading}
        />
      ))}
    </div>
  );
};

export default OtpDigitInputs;
