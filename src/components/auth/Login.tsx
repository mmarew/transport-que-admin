import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import heroImg from "../../assets/Frame.png";
import groupImg from "../../assets/Group.png";
import LanguageSelector from "../ui/LanguageSelector";
import PhoneNumberInput from "../ui/PhoneNumberInput";
import { requestLoginOtp } from "../../services/auth.service";
import parseError from "../../utils/parseError";
import { loginSchema, type LoginFormValues } from "../../schemas/queue";
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
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phoneNumber: initialPhoneNumber },
  });

  const phoneValue = watch("phoneNumber");

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await requestLoginOtp(data.phoneNumber);
      toast.success("OTP sent to your phone number");
      onOtpRequested({ phoneNumber: data.phoneNumber });
    } catch (err: unknown) {
      const msg = parseError(err);
      toast.error(msg);
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

          <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-group">
              <PhoneNumberInput
                id="login-phone"
                label="Phone Number"
                value={phoneValue}
                onChange={(e164) => setValue("phoneNumber", e164, { shouldValidate: true })}
                error={errors.phoneNumber?.message ?? null}
                required
                autoComplete="tel"
              />
            </div>

            <button type="submit" className="login-btn" disabled={isSubmitting}>
              {isSubmitting ? (
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
