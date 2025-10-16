import { useContext } from "react";
import { useTranslation } from "react-i18next";
import ThemeContext from "../context/ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { t } = useTranslation();

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-700 shadow-sm transition hover:border-teal-400 hover:text-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-500"
    >
      <span
        aria-hidden
        className={`inline-flex h-2.5 w-2.5 rounded-full transition-all duration-500 ${
          isDark
            ? "bg-fuchsia-500 shadow-[0_0_12px_rgba(244,114,182,0.6)]"
            : "bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.6)]"
        }`}
      />
      <span>{isDark ? t("lightMode") : t("darkMode")}</span>
    </button>
  );
}

export default ThemeToggle;
