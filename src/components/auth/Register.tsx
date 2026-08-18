import React, { useState } from "react";
import { toast } from "sonner";
import heroImg from "../../assets/Frame.png";
import groupImg from "../../assets/Group.png";
import LanguageSelector from "../ui/LanguageSelector";
import PhoneNumberInput from "../ui/PhoneNumberInput";
import { registerUser } from "../../lib/api";
import parseError from "../../utils/parseError";
import type { LoginFormData } from "./Login";
import "../../styles/auth.css";

interface RegisterProps {
  onOtpRequested: (data: LoginFormData) => void;
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({
  onOtpRequested,
  onSwitchToLogin,
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!phoneNumber || phoneNumber.length < 12) {
      setPhoneError("Please enter a valid 9-digit phone number");
      return;
    }

    setIsLoading(true);
    setPhoneError(null);
    try {
      await registerUser({
        fullName: fullName.trim(),
        phoneNumber,
        email: email.trim() || null,
      });
      toast.success("Account created! OTP sent to your phone");
      onOtpRequested({
        phoneNumber,
        fullName: fullName.trim(),
        email: email.trim() || undefined,
      });
    } catch (err: unknown) {
      const msg = parseError(err);
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
            <div className="form-group form-group-mb">
              <label>Full Name</label>
              <div className="phone-input-wrapper">
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="form-input-pl"
                />
              </div>
            </div>

            <div className="form-group form-group-mb">
              <label>
                Email{" "}
                <span className="form-label-optional">(Optional)</span>
              </label>
              <div className="phone-input-wrapper">
                <input
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input-pl"
                />
              </div>
            </div>

            <div className="form-group">
              <PhoneNumberInput
                id="register-phone"
                label="Phone Number"
                value={phoneNumber}
                onChange={(e164) => {
                  setPhoneNumber(e164);
                  setPhoneError(null);
                }}
                error={phoneError}
                required
                autoComplete="tel"
              />
            </div>

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? (
                <span className="btn-inner-flex">
                  <span className="add-docs-spinner" />
                  Signing up...
                </span>
              ) : (
                "Sign Up"
              )}
            </button>

            <div className="login-footer form-group-mb login-footer-spaced">
              Already have an account?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchToLogin();
                }}
              >
                Sign In
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
