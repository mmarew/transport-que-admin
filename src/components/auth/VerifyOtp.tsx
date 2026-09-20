import React from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import heroImg from "../../assets/Frame.png";
import LanguageSelector from "../ui/LanguageSelector";
import OverlappingCircles from "../ui/OverlappingCircles";
import FieldError from "../ui/FieldError";
import type { LoginFormData } from "./Login";
import { useOtpVerification } from "../../hooks/useOtpVerification";
import { OtpDigitInputs } from "./OtpDigitInputs";
import "../../styles/auth.css";
import "./VerifyOtp.css";

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
  const { t } = useTranslation();
  const {
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
  } = useOtpVerification({
    phoneNumber: formData.phoneNumber,
    from,
    onOtpVerified,
  });

  return (
    <div className="login-container">
      {/* ── Left: hero image (desktop only) ── */}
      <div className="login-hero">
        <div className="login-hero-img-wrap">
          <img
            src={heroImg}
            alt={t("auth.transportBackground")}
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
            title={t("auth.verifyOtpMobileHeading", "Verify OTP")}
            subtitle={t(
              "auth.verifyOtpMobileSub",
              "Check your phone to verify your OTP",
            )}
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
              aria-label={t("common.goBack")}
            >
              <ArrowLeft size={22} strokeWidth={2} />
            </button>
            <h1 className="otp-desktop-title">{t("auth.otpTitle")}</h1>
          </div>

          <p className="otp-desktop-subtitle">
            {t("auth.otpSubtitle", { phone: maskedPhone })}
          </p>

          <p className="otp-code-sent">
            {t("auth.codeSent", { phone: maskedPhone })}
          </p>

          <form
            onSubmit={(e) => void handleVerify(e)}
            className="otp-fullscreen-form"
            noValidate
          >
            <OtpDigitInputs
              digits={digits}
              boxRefs={boxRefs}
              otpError={otpError}
              isLoading={isLoading}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />

            <FieldError message={otpError} align="center" />

            {/* Resend section */}
            <div className="login-footer form-group-mb resend-section">
              <p className="resend-text">
                {t("auth.didntReceiveCode")}{" "}
                {resendTimer > 0 ? (
                  <span className="resend-timer-text">
                    {t("auth.resendIn", { seconds: resendTimer })}
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
                    {isResending ? t("common.loading") : t("auth.resendOtp")}
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
                  {t("auth.verifying")}
                </span>
              ) : (
                t("auth.verifyBtn")
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
