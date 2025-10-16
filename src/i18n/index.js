import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ru from "./ru.json";

const LANGUAGE_STORAGE_KEY = "artist-language";

const storedLanguage =
  typeof window !== "undefined" ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
    },
    lng: storedLanguage ?? "ru",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on("languageChanged", (language) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
});

export default i18n;
