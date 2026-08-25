import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import heroImg from "../../assets/Frame.png";
import LanguageSelector from "../ui/LanguageSelector";
import OverlappingCircles from "../ui/OverlappingCircles";
import FieldError from "../ui/FieldError";
import { useAuth } from "../../context/AuthContext";
import { verifyOtp, requestLoginOtp } from "../../services/auth.service";
import parseError from "../../utils/parseError";
import type { LoginFormData } from "./Login";
import "../../styles/auth.css";
import "./VerifyOtp.css";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

interface VerifyOtpProps {
  formData: LoginFormData;
  onGoBack: () => void;
  /** Called when OTP is verified, before navigation. If provided, caller handles navigation. */
  onOtpVerified?: (from: "login" | "register") => void;
  /** Which step triggered OTP — determines post-verify action */
  from?: "login" | "register";
}

export const VerifyOtp: React.FC<VerifyOtpProps> = ({
  formData,
  onGoBack,
  onOtpVerified,
  from = "login",
}) => {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const { setAuth } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);

  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const focusId = setTimeout(() => {
      boxRefs.current[0]?.focus();
    }, 80);

    setResendTimer(RESEND_COOLDOWN_SECONDS);
    clearCountdown();
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(focusId);
      clearCountdown();
    };
  }, [clearCountdown]);

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    boxRefs.current[clamped]?.focus();
  };

  const resetDigits = useCallback(() => {
    setDigits(Array(OTP_LENGTH).fill(""));
    setTimeout(() => focusBox(0), 0);
  }, []);

  const otpValue = digits.join("");
  const isComplete = otpValue.length === OTP_LENGTH && !digits.includes("");

  const handleVerify = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isComplete || isLoading) return;

    setIsLoading(true);
    setOtpError(null);

    try {
      const response = await verifyOtp(formData.phoneNumber, otpValue);
      const { token, userData } = response.data;

      setAuth({ token, userData });

      toast.success(`Welcome, ${userData.fullName}`);

      if (onOtpVerified) {
        // Let the parent (Auth.tsx) decide navigation (e.g. org setup for register)
        onOtpVerified(from);
      } else {
        const redirectPath = location.state?.from?.pathname || "/dashboard";
        navigate(redirectPath, { replace: true });
      }
    } catch (err: unknown) {
      const msg = parseError(err);
      toast.error(msg);
      setOtpError(msg);
      resetDigits();
    } finally {
      setIsLoading(false);
    }
  }, [isComplete, isLoading, formData.phoneNumber, otpValue, setAuth, location.state, navigate, resetDigits]);

  useEffect(() => {
    if (isComplete) {
      void handleVerify();
    }
  }, [isComplete, handleVerify]);

  const handleResend = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    setOtpError(null);
    resetDigits();

    try {
      await requestLoginOtp(formData.phoneNumber);
      toast.success("New code sent to your phone");
      setResendTimer(RESEND_COOLDOWN_SECONDS);
      clearCountdown();
      timerRef.current = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearCountdown();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      toast.error(parseError(err));
    } finally {
      setIsResending(false);
    }
  };

  const handleChange = (index: number, val: string) => {
    setOtpError(null);
    const char = val.replace(/\D/g, "").slice(-1);
    const updated = [...digits];
    updated[index] = char;
    setDigits(updated);

    if (char && index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        const updated = [...digits];
        updated[index - 1] = "";
        setDigits(updated);
        focusBox(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < OTP_LENGTH; i++) {
        next[i] = pasted[i] ?? "";
      }
      return next;
    });

    focusBox(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  // ── Masked phone display with asterisks ──────────────────────────────────
  const maskedPhone = formData.phoneNumber
    ? formData.phoneNumber.substring(0, 5) + "********"
    : "";

  return (
    <div className="login-container">
      {/* ── Left: hero image (desktop only) ── */}
      <div className="login-hero">
        <div className="login-hero-img-wrap">
          <img
            src={heroImg}
            alt="Transport background"
            className="login-hero-img"
          />
        </div>
        <div className="desktop-lang-selector">
          <LanguageSelector />
        </div>
      </div>

      {/* ── Right: OTP form panel ── */}
      <div className="login-form-panel otp-form-panel">
        {/* Mobile-only: dark header with overlapping circles */}
        <div className="mobile-otp-header">
          <OverlappingCircles
            title="Verification"
            subtitle="Check your phone to verify your OTP"
            onBack={onGoBack}
          />
        </div>

        {/* Form card (desktop + mobile) */}
        <div className="login-card otp-desktop-card animate-scale-up">
          {/* Desktop back + title */}
          <div className="otp-desktop-header">
            <button
              type="button"
              className="otp-back-btn-desktop"
              onClick={onGoBack}
              aria-label="Go back"
            >
              <ArrowLeft size={22} strokeWidth={2} />
            </button>
            <h1 className="otp-desktop-title">Verification</h1>
          </div>

          <p className="otp-desktop-subtitle">
            Enter verification code sent to {maskedPhone}
          </p>

          <p className="otp-code-sent">
            Code has been sent to <strong>{maskedPhone}</strong>
          </p>

          <form
            onSubmit={(e) => void handleVerify(e)}
            className="otp-fullscreen-form"
            noValidate
          >
            {/* OTP digit inputs */}
            <div
              className="otp-input-group"
              role="group"
              aria-label="One-time password input"
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
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  onFocus={(e) => e.target.select()}
                  className={`otp-digit-input ${digit ? "filled" : ""}`}
                  placeholder="-"
                  aria-label={`OTP digit ${i + 1} of ${OTP_LENGTH}`}
                  aria-invalid={!!otpError}
                  disabled={isLoading}
                />
              ))}
            </div>

            <FieldError message={otpError} align="center" />

            {/* Resend section */}
            <div className="login-footer form-group-mb resend-section">
              <p className="resend-text">
                Didn&apos;t receive code?{" "}
                {resendTimer > 0 ? (
                  <span className="resend-timer-text">
                    Resend in {resendTimer}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleResend()}
                    disabled={isResending}
                    className="resend-btn"
                  >
                    {isResending && (
                      <span className="add-docs-spinner add-docs-spinner--sm" />
                    )}
                    {isResending ? "Sending..." : "Resend code"}
                  </button>
                )}
              </p>
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={isLoading || !isComplete}
            >
              {isLoading ? (
                <span className="btn-inner-flex">
                  <span className="add-docs-spinner" />
                  Verifying...
                </span>
              ) : (
                <>
                  <span className="btn-text-desktop">Verify</span>
                  <span className="btn-text-mobile">Login</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
