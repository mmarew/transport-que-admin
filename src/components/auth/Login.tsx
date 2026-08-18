import React, { useState } from "react";
import { toast } from "sonner";
import heroImg from "../../assets/Frame.png";
import groupImg from "../../assets/Group.png";
import LanguageSelector from "../ui/LanguageSelector";
import PhoneNumberInput from "../ui/PhoneNumberInput";
import { requestLoginOtp } from "../../lib/api";
import parseError from "../../utils/parseError";
import "../../styles/auth.css";

export interface LoginFormData {
  phoneNumber: string;
  fullName?: string;
  email?: string;
}

interface LoginProps {
  onOtpRequested: (data: LoginFormData) => void;
  onSwitchToRegister: () => void;
  initialPhoneNumber?: string;
}

export const Login: React.FC<LoginProps> = ({
  onOtpRequested,
  onSwitchToRegister,
  initialPhoneNumber = "",
}) => {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 12) {
      setError("Please enter a valid 9-digit phone number");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await requestLoginOtp(phoneNumber);
      toast.success("OTP sent to your phone number");
      onOtpRequested({ phoneNumber });
    } catch (err: unknown) {
      const msg = parseError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left: hero image (desktop only) */}
      <div className="login-hero">
        <img src={heroImg} alt="Transport Hero" />
        <div className="desktop-lang-selector">
          <LanguageSelector />
        </div>
      </div>

      {/* Right: form panel */}
      <div className="login-form-panel">
        {/* Mobile-only: hero section shown above form panel */}
        <div className="login-mobile-hero">
          <div className="login-mobile-title-row">
            <span className="login-app-title">Welcome To Queue Admin</span>
          </div>
          <div className="login-mobile-lang-row">
            <LanguageSelector />
          </div>
          <div className="login-mobile-hero-img-wrap">
            <img src={groupImg} alt="Transport App Preview" />
          </div>
          <div className="login-mobile-hero-text">
            <h1>Welcome Back!</h1>
            <p>Access your queue dashboard and manage your fleet</p>
          </div>
        </div>

        <div className="login-card animate-scale-up">
          <div className="login-header login-header--desktop">
            <h1>Welcome Back!</h1>
            <p>Access your queue dashboard and manage your fleet</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <PhoneNumberInput
                id="login-phone"
                label="Phone Number"
                value={phoneNumber}
                onChange={(e164) => {
                  setPhoneNumber(e164);
                  setError(null);
                }}
                error={error}
                required
                autoComplete="tel"
              />
            </div>

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? (
                <span className="btn-inner-flex">
                  <span className="add-docs-spinner" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>

            <div className="login-footer form-group-mb login-footer-spaced">
              Don&apos;t have an account?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchToRegister();
                }}
              >
                Sign Up
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
