import React, { useState } from "react";
import Login, { type LoginFormData } from "./Login";
import Register from "./Register";
import VerifyOtp from "./VerifyOtp";

export type AuthStep = "login" | "register" | "otp";

interface AuthProps {
  initialStep?: AuthStep;
}

export const Auth: React.FC<AuthProps> = ({ initialStep = "login" }) => {
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [previousStep, setPreviousStep] = useState<"login" | "register">("login");
  const [submittedData, setSubmittedData] = useState<LoginFormData | null>(null);

  const handleOtpRequested = (
    data: LoginFormData,
    from: "login" | "register" = "login"
  ) => {
    setPreviousStep(from);
    setSubmittedData(data);
    setStep("otp");
  };

  if (step === "otp" && submittedData) {
    return (
      <VerifyOtp
        formData={submittedData}
        onGoBack={() => setStep(previousStep)}
      />
    );
  }

  if (step === "register") {
    return (
      <Register
        onOtpRequested={(data) => handleOtpRequested(data, "register")}
        onSwitchToLogin={() => setStep("login")}
      />
    );
  }

  return (
    <Login
      initialPhoneNumber={submittedData?.phoneNumber}
      onOtpRequested={(data) => handleOtpRequested(data, "login")}
      onSwitchToRegister={() => setStep("register")}
    />
  );
};

export default Auth;
