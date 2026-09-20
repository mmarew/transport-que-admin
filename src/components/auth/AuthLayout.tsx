import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import defaultHeroImg from "@/assets/Frame.png";
import LanguageSelector from "../ui/LanguageSelector";

export interface AuthLayoutProps {
  children: ReactNode;
  heroImage?: string;
  appTitle?: string;
  title?: string;
  subtitle?: string;
  mobileHeaderAction?: ReactNode;
  cardClassName?: string;
}

export function AuthLayout({
  children,
  heroImage = defaultHeroImg,
  appTitle,
  title,
  subtitle,
  mobileHeaderAction,
  cardClassName = "",
}: AuthLayoutProps) {
  const { t } = useTranslation();
  const effectiveAppTitle = appTitle || t("auth.loginTitle");

  return (
    <div className="login-container">
      {/* Left: hero image (desktop only) */}
      <div className="login-hero">
        <img src={heroImage} alt="Transport Hero" />
        <div className="desktop-lang-selector">
          <LanguageSelector />
        </div>
      </div>

      {/* Right: form panel */}
      <div className="login-form-panel">
        {/* Mobile hero */}
        <div className="login-mobile-hero">
          <div className="login-mobile-title-row" style={{ position: "relative" }}>
            <span className="login-app-title">{effectiveAppTitle}</span>
            {mobileHeaderAction && (
              <div style={{ position: "absolute", right: "1.5rem", top: "50%", transform: "translateY(-50%)" }}>
                {mobileHeaderAction}
              </div>
            )}
          </div>
          <div className="login-mobile-lang-row">
            <LanguageSelector />
          </div>
          {(title || subtitle) && (
            <div className="login-mobile-hero-text" style={{ paddingBottom: "1.5rem" }}>
              {title && <h1>{title}</h1>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          )}
        </div>

        {/* Card content */}
        <div className={`login-card ${cardClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
