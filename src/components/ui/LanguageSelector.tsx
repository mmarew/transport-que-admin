import React from "react";
import { useTranslation } from "react-i18next";
import { setAppLanguage } from "../../lib/i18n";
import "../../styles/auth.css";

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = "",
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language as "en" | "am") || "en";

  const toggleLanguage = () => {
    const nextLang = currentLang === "en" ? "am" : "en";
    setAppLanguage(nextLang);
  };

  return (
    <button
      type="button"
      className={`language-pill ${className}`}
      onClick={toggleLanguage}
      title="Switch Language / ቋንቋ ቀይር"
    >
      <span className="lang-arrow">▾</span>
      <span className="lang-pill-btn">
        {currentLang === "en" ? "English" : "አማርኛ"}
      </span>
    </button>
  );
};

export default LanguageSelector;
