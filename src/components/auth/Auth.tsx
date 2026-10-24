import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Login, { type LoginFormData } from "./Login";
import Register from "./Register";
import VerifyOtp from "./VerifyOtp";

export type AuthStep = "login" | "register" | "otp";

interface AuthProps {
  initialStep?: AuthStep;
}

export const Auth: React.FC<AuthProps> = ({ initialStep = "login" }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [previousStep, setPreviousStep] = useState<"login" | "register">("login");
  const [submittedData, setSubmittedData] = useState<LoginFormData | null>(null);

  const handleOtpRequested = useCallback(
    (data: LoginFormData, from: "login" | "register" = "login") => {
      setPreviousStep(from);
      setSubmittedData(data);
      setStep("otp");
    },
    [],
  );

  const switchToRegister = useCallback(() => {
    setStep("register");
    navigate("/register", { replace: true });
  }, [navigate]);

  const switchToLogin = useCallback(() => {
    setStep("login");
    navigate("/login", { replace: true });
  }, [navigate]);

  /** Called by VerifyOtp after a successful OTP verification */
  const handleOtpVerified = useCallback(
    (from: "login" | "register") => {
      if (from === "register") {
        // After registration: go to /setup-org (ProtectedRoute will enforce it)
        navigate("/setup-org", { replace: true });
      } else {
        // After login: go to dashboard
        navigate("/dashboard", { replace: true });
      }
    },
    [navigate],
  );

  // ── OTP verification ─────────────────────────────────────────────────────
  if (step === "otp" && submittedData) {
    return (
      <VerifyOtp
        formData={submittedData}
        from={previousStep}
        onOtpVerified={handleOtpVerified}
        onGoBack={() => {
          setStep(previousStep);
          navigate(previousStep === "register" ? "/register" : "/login", { replace: true });
        }}
      />
    );
  }

  // ── Register ─────────────────────────────────────────────────────────────
  if (step === "register") {
    return (
      <Register
        onOtpRequested={(data) => handleOtpRequested(data, "register")}
        onSwitchToLogin={switchToLogin}
      />
    );
  }

  // ── Login (default) ──────────────────────────────────────────────────────
  return (
    <Login
      initialPhoneNumber={submittedData?.phoneNumber}
      onOtpRequested={(data) => handleOtpRequested(data, "login")}
      onSwitchToRegister={switchToRegister}
    />
  );
};

export default Auth;
