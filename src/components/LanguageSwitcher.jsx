import { useTranslation } from "react-i18next";

const languages = [
  { code: "ru", label: "Рус" },
  { code: "en", label: "En" },
];

function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleChange = (event) => {
    const newLang = event.target.value;
    void i18n.changeLanguage(newLang);
  };

  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">
      <span className="hidden sm:inline">{t("language")}</span>
      <select
        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-slate-800 transition hover:border-teal-400 focus:border-teal-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-500"
        value={i18n.resolvedLanguage}
        onChange={handleChange}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} className="text-slate-800 dark:text-slate-100">
            {lang.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSwitcher;
