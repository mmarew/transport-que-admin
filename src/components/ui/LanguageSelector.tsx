import React, { useState } from "react";
import "../../styles/auth.css";

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = "",
}) => {
  const [lang, setLang] = useState<"en" | "am">("en");

  return (
    <button
      type="button"
      className={`language-pill ${className}`}
      onClick={() => setLang(lang === "en" ? "am" : "en")}
    >
      <span className="lang-arrow">▾</span>
      <span className="lang-pill-btn">
        {lang === "en" ? "English" : "አማርኛ"}
      </span>
    </button>
  );
};

export default LanguageSelector;
