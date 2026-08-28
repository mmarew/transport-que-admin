import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import am from "../locales/am.json";

const savedLanguage = (localStorage.getItem("app_language") as "en" | "am") || "en";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am },
    },
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already escapes values safely
    },
  });

export function setAppLanguage(lang: "en" | "am"): void {
  localStorage.setItem("app_language", lang);
  i18n.changeLanguage(lang);
}

export function getAppLanguage(): "en" | "am" {
  return (i18n.language as "en" | "am") || "en";
}

export default i18n;
