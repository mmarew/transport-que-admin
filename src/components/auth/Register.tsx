import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import heroImg from "../../assets/Frame.png";
import groupImg from "../../assets/Group.png";
import LanguageSelector from "../ui/LanguageSelector";
import PhoneNumberInput from "../ui/PhoneNumberInput";
import { registerUser } from "../../services/auth.service";
import parseError from "../../utils/parseError";
import type { LoginFormData } from "./Login";
import { registerSchema, type RegisterFormValues } from "../../schemas/queue";
import "../../styles/auth.css";

interface RegisterProps {
  onOtpRequested: (data: LoginFormData) => void;
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({
  onOtpRequested,
  onSwitchToLogin,
}) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", phoneNumber: "", email: "" },
  });

  const phoneValue = watch("phoneNumber");

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await registerUser({
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        email: data.email || null,
      });
      toast.success(t("auth.sendingOtp"));
      onOtpRequested({
        phoneNumber: data.phoneNumber,
        fullName: data.fullName,
        email: data.email || undefined,
      });
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
        <div className="login-mobile-hero">
          <div className="login-mobile-title-row">
            <span className="login-app-title">{t("auth.loginTitle")}</span>
          </div>
          <div className="login-mobile-lang-row">
            <LanguageSelector />
          </div>
          <div className="login-mobile-hero-img-wrap">
            <img src={groupImg} alt="Transport App Preview" />
          </div>
          <div className="login-mobile-hero-text">
            <h1>{t("auth.createAccountTitle")}</h1>
            <p>{t("auth.createAccountSubtitle")}</p>
          </div>
        </div>

        <div className="login-card animate-scale-up">
          <div className="login-header login-header--desktop">
            <h1>{t("auth.createAccountTitle")}</h1>
            <p>{t("auth.createAccountSubtitle")}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Full Name */}
            <div className="form-group form-group-mb">
              <label htmlFor="reg-fullname">{t("auth.fullNameLabel")}</label>
              <div className={`input-wrapper${errors.fullName ? " input-wrapper--error" : ""}`}>
                <input
                  id="reg-fullname"
                  type="text"
                  placeholder={t("auth.fullNamePlaceholder")}
                  autoComplete="name"
                  {...register("fullName")}
                />
              </div>
              {errors.fullName && (
                <p className="setup-org-field-error">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="form-group form-group-mb">
              <label htmlFor="reg-email">
                {t("auth.emailLabel")}{" "}
                <span className="form-label-optional">{t("auth.optional")}</span>
              </label>
              <div className={`input-wrapper${errors.email ? " input-wrapper--error" : ""}`}>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="setup-org-field-error">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="form-group">
              <PhoneNumberInput
                id="register-phone"
                label={t("auth.phoneLabel")}
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
                  {t("auth.signingUp")}
                </span>
              ) : (
                t("auth.signUp")
              )}
            </button>

            <div className="login-footer form-group-mb login-footer-spaced">
              {t("auth.alreadyHaveAccount")}{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchToLogin();
                }}
              >
                {t("auth.signIn")}
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
