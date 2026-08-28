import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  useRequestLoginOtpMutation,
  useVerifyOtpMutation,
  useRegisterUserMutation,
} from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { useAuth } from "../../context/AuthContext";
import { QUEUE_ORG_ADMIN_ROLE } from "../../types/queue";
import {
  normalizeFieldValue,
  normalizePhone,
  type AuthConfig,
  type AuthFieldConfig,
  type AuthFieldKind,
} from "../../lib/authConfig";

export type AuthMode = "login" | "register" | "otp";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(field: AuthFieldConfig, value: string): string | undefined {
  const normalized = normalizeFieldValue(field, value);
  const digits = normalized.replace(/\D/g, "");
  if (field.required && (!value || value.trim() === "")) {
    return `${field.label} is required`;
  }
  if (field.type === "otp" && digits.length !== 6) {
    return "Enter the full 6-digit code";
  }
  if (field.kind === "phone" && digits.length < 10) {
    return "Enter a valid phone number";
  }
  if (field.kind === "email" && value && !EMAIL_RE.test(value)) {
    return "Enter a valid email address";
  }
  if (field.minLength && normalized.length > 0 && normalized.length < field.minLength) {
    return `${field.label} is too short`;
  }
  if (field.maxLength && normalized.length > field.maxLength) {
    return `${field.label} is too long`;
  }
  return undefined;
}

export function useAuthFlow(config: AuthConfig, initialMode: AuthMode) {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [origin, setOrigin] = useState<"login" | "register">(initialMode === "register" ? "register" : "login");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingPhone, setPendingPhone] = useState("");

  const [requestOtpMutation, { isLoading: isSendingOtp }] = useRequestLoginOtpMutation();
  const [verifyOtpMutation, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
  const [registerUserMutation, { isLoading: isRegistering }] = useRegisterUserMutation();

  const fieldByKind = (screen: "login" | "register" | "otp", kind: AuthFieldKind) =>
    config[screen]?.fields.find((f) => f.kind === kind);

  const setFieldValue = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateScreen = (screen: "login" | "register" | "otp"): boolean => {
    const nextErrors: Record<string, string> = {};
    for (const field of config[screen]?.fields ?? []) {
      const err = validateField(field, values[field.name] ?? "");
      if (err) nextErrors[field.name] = err;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSendOtp = async () => {
    try {
      const field = fieldByKind("login", "phone");
      const phone = field ? normalizePhone(values[field.name] ?? "") : "";
      await requestOtpMutation({ phoneNumber: phone, roleId: QUEUE_ORG_ADMIN_ROLE }).unwrap();
      toast.success("OTP sent via SMS");
      setPendingPhone(phone);
      setOrigin("login");
      setMode("otp");
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  const handleRegister = async () => {
    try {
      const nameField = fieldByKind("register", "fullName");
      const phoneField = fieldByKind("register", "phone");
      const emailField = fieldByKind("register", "email");
      const phone = phoneField ? normalizePhone(values[phoneField.name] ?? "") : "";

      await registerUserMutation({
        fullName: nameField ? (values[nameField.name] ?? "").trim() : "",
        phoneNumber: phone,
        email: emailField && values[emailField.name] ? values[emailField.name] : null,
        roleId: QUEUE_ORG_ADMIN_ROLE,
        statusId: 1,
      }).unwrap();

      toast.success("Account created — OTP sent via SMS");
      setPendingPhone(phone);
      setOrigin("register");
      setMode("otp");
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  const handleSubmitOtp = async () => {
    try {
      const phoneField = fieldByKind(origin, "phone");
      const otpField = fieldByKind("otp", "otp");
      const phone = phoneField ? normalizePhone(values[phoneField.name] ?? "") : "";
      const code = otpField ? (values[otpField.name] ?? "").replace(/\D/g, "") : "";

      const res = await verifyOtpMutation({
        phoneNumber: phone,
        roleId: QUEUE_ORG_ADMIN_ROLE,
        OTP: code,
      }).unwrap();

      const { token, userData } = res;
      setAuth({ token, userData });
      toast.success(`Welcome, ${userData.fullName}`);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  const submit = () => {
    const screen = mode === "otp" ? "otp" : mode;
    if (!validateScreen(screen)) return;
    if (mode === "login") handleSendOtp();
    else if (mode === "register") handleRegister();
    else handleSubmitOtp();
  };

  const goTo = (next: "login" | "register") => {
    setValues({});
    setErrors({});
    setMode(next);
  };

  const screen: "login" | "register" | "otp" = mode === "otp" ? "otp" : mode;
  const screenConfig = config[screen];

  return {
    mode,
    origin,
    screenConfig,
    values,
    errors,
    setFieldValue,
    submit,
    goTo,
    pendingPhone,
    isPending: isSendingOtp || isRegistering || isVerifyingOtp,
  };
}

