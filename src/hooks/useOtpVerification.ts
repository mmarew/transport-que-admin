import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { verifyOtp, requestLoginOtp } from "../services/auth.service";
import parseError from "../utils/parseError";

export const OTP_LENGTH = 6;
export const RESEND_COOLDOWN_SECONDS = 60;

export interface UseOtpVerificationOptions {
  phoneNumber: string;
  from?: "login" | "register";
  onOtpVerified?: (from: "login" | "register") => void;
}

export function useOtpVerification({
  phoneNumber,
  from = "login",
  onOtpVerified,
}: UseOtpVerificationOptions) {
  const { t } = useTranslation();
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

  const focusBox = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    boxRefs.current[clamped]?.focus();
  }, []);

  const resetDigits = useCallback(() => {
    setDigits(Array(OTP_LENGTH).fill(""));
    setTimeout(() => focusBox(0), 0);
  }, [focusBox]);

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

  const otpValue = digits.join("");
  const isComplete = otpValue.length === OTP_LENGTH && !digits.includes("");

  const handleVerify = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!isComplete || isLoading) return;

      setIsLoading(true);
      setOtpError(null);

      try {
        const response = await verifyOtp(phoneNumber, otpValue);
        const { token, userData } = response.data;

        setAuth({ token, userData });

        toast.success(t("common.success"));

        if (onOtpVerified) {
          onOtpVerified(from);
        } else {
          const fromPath = location.state?.from?.pathname || "/dashboard";
          navigate(fromPath, { replace: true });
        }
      } catch (err: unknown) {
        const msg = parseError(err);
        toast.error(msg);
        setOtpError(msg);
        resetDigits();
      } finally {
        setIsLoading(false);
      }
    },
    [
      isComplete,
      isLoading,
      phoneNumber,
      otpValue,
      setAuth,
      location.state,
      navigate,
      resetDigits,
      from,
      onOtpVerified,
      t,
    ],
  );

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
      await requestLoginOtp(phoneNumber);
      toast.success(t("auth.resendOtp"));
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
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const copy = [...digits];
      copy[index] = "";
      setDigits(copy);
      return;
    }
    const copy = [...digits];
    copy[index] = clean[clean.length - 1];
    setDigits(copy);
    if (index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      focusBox(index - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;

    const copy = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      copy[i] = pasted[i];
    }
    setDigits(copy);
    focusBox(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const maskedPhone = phoneNumber
    ? phoneNumber.substring(0, 5) + "********"
    : "";

  return {
    digits,
    boxRefs,
    otpError,
    isLoading,
    resendTimer,
    isResending,
    isComplete,
    maskedPhone,
    handleVerify,
    handleResend,
    handleChange,
    handleKeyDown,
    handlePaste,
  };
}
