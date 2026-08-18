import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import heroImg from "../../assets/Frame.png";
import LanguageSelector from "../ui/LanguageSelector";
import OverlappingCircles from "../ui/OverlappingCircles";
import FieldError from "../ui/FieldError";
import { useAuth } from "../../context/AuthContext";
import { verifyOtp, requestLoginOtp } from "../../lib/api";
import { connectSocket, disconnectSocket } from "../../lib/socket";
import parseError from "../../utils/parseError";
import { formatPhoneDisplay, fromE164 } from "../../utils/phoneFormatter";
import type { LoginFormData } from "./Login";
import "../../styles/auth.css";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

interface VerifyOtpProps {
  formData: LoginFormData;
  onGoBack: () => void;
}

export const VerifyOtp: React.FC<VerifyOtpProps> = ({
  formData,
  onGoBack,
}) => {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const { setAuth } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_SECONDS);

  const boxRefs = useRef<Array<HTMLInputElement | null>>(
    Array<HTMLInputElement | null>(OTP_LENGTH).fill(null)
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    clearCountdown();
    setResendTimer(RESEND_COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCountdown]);

  useEffect(() => {
    const focusTimeout = setTimeout(() => {
      boxRefs.current[0]?.focus();
    }, 100);

    startCountdown();

    return () => {
      clearTimeout(focusTimeout);
      clearCountdown();
    };
  }, [startCountdown, clearCountdown]);

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    boxRefs.current[clamped]?.focus();
  };

  const resetDigits = useCallback(() => {
    setDigits(Array(OTP_LENGTH).fill(""));
    setTimeout(() => focusBox(0), 10);
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
      disconnectSocket();
      connectSocket({ phoneNumber: userData.phoneNumber });

      toast.success(`Welcome back, ${userData.fullName}`);
      const redirectPath = location.state?.from?.pathname || "/";
      navigate(redirectPath, { replace: true });
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
      startCountdown();
      focusBox(0);
      toast.success("A new OTP has been sent to your phone.");
    } catch (err: unknown) {
      const msg = parseError(err);
      toast.error(msg);
      setOtpError(msg);
    } finally {
      setIsResending(false);
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digit = raw.replace(/\D/g, "").slice(-1);
    setOtpError(null);

    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (digit && index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Backspace":
        if (!digits[index]) {
          focusBox(index - 1);
        } else {
          setDigits((prev) => {
            const next = [...prev];
            next[index] = "";
            return next;
          });
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusBox(index - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        focusBox(index + 1);
        break;
      case "Delete":
        setDigits((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
        break;
      default:
        break;
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    setOtpError(null);
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < OTP_LENGTH; i++) {
        next[i] = pasted[i] ?? "";
      }
      return next;
    });

    focusBox(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  return (
    <div className="login-container">
      {/* ── Left Hero Panel (Desktop) ── */}
      <div className="login-hero-panel">
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

      {/* ── Right / Mobile Content Panel ── */}
      <div className="login-form-panel">
        {/* Mobile Header with SVG background curve */}
        <OverlappingCircles
          title="Verification"
          subtitle="Enter verification code"
          onBack={onGoBack}
        />

        <div className="login-form-container login-form-container--otp">
          {/* Desktop header with back arrow */}
          <div className="otp-desktop-header">
            <button
              type="button"
              className="otp-back-btn"
              onClick={onGoBack}
              aria-label="Go back"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="otp-desktop-title">Verification</h1>
              <p className="otp-desktop-subtitle">
                Enter verification code sent to {formatPhoneDisplay(fromE164(formData.phoneNumber))}
              </p>
            </div>
          </div>

          <form onSubmit={(e) => void handleVerify(e)} noValidate>
            {/* 6-box OTP input */}
            <div className={`otp-boxes-row ${otpError ? "shake" : ""}`}>
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    boxRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={idx === 0 ? handlePaste : undefined}
                  className={`otp-box ${digit ? "filled" : ""}`}
                  aria-label={`Digit ${idx + 1}`}
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
                    {isResending && <span className="add-docs-spinner add-docs-spinner--sm" />}
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
