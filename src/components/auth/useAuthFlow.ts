import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  requestLoginOtp,
  verifyOtp,
  registerUser,
} from "../../services/auth.service";
import { getApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
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

  const sendOtp = useMutation({
    mutationFn: async () => {
      const field = fieldByKind("login", "phone");
      const phone = field ? normalizePhone(values[field.name] ?? "") : "";
      return requestLoginOtp(phone);
    },
    onSuccess: () => {
      toast.success("OTP sent via SMS");
      const field = fieldByKind("login", "phone");
      setPendingPhone(field ? normalizePhone(values[field.name] ?? "") : "");
      setOrigin("login");
      setMode("otp");
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const register = useMutation({
    mutationFn: async () => {
      const nameField = fieldByKind("register", "fullName");
      const phoneField = fieldByKind("register", "phone");
      const emailField = fieldByKind("register", "email");
      return registerUser({
        fullName: nameField ? (values[nameField.name] ?? "").trim() : "",
        phoneNumber: phoneField ? normalizePhone(values[phoneField.name] ?? "") : "",
        email: emailField && values[emailField.name] ? values[emailField.name] : null,
      });
    },
    onSuccess: () => {
      toast.success("Account created — OTP sent via SMS");
      const phoneField = fieldByKind("register", "phone");
      setPendingPhone(phoneField ? normalizePhone(values[phoneField.name] ?? "") : "");
      setOrigin("register");
      setMode("otp");
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const submitOtp = useMutation({
    mutationFn: async () => {
      const phoneField = fieldByKind(origin, "phone");
      const otpField = fieldByKind("otp", "otp");
      const phone = phoneField ? normalizePhone(values[phoneField.name] ?? "") : "";
      const code = otpField ? (values[otpField.name] ?? "").replace(/\D/g, "") : "";
      return verifyOtp(phone, code);
    },
    onSuccess: (res) => {
      const { token, userData } = res.data;
      setAuth({ token, userData });
      toast.success(`Welcome, ${userData.fullName}`);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const submit = () => {
    const screen = mode === "otp" ? "otp" : mode;
    if (!validateScreen(screen)) return;
    if (mode === "login") sendOtp.mutate();
    else if (mode === "register") register.mutate();
    else submitOtp.mutate();
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
    isPending: sendOtp.isPending || register.isPending || submitOtp.isPending,
  };
}
