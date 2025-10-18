import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";

function ServerError() {
  const { t } = useTranslation();
  const location = useLocation();
  const previousPath = location.state?.from ?? "/";

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center text-slate-700 dark:text-slate-200">
      <Seo
        titleKey="seo.serverError.title"
        descriptionKey="seo.serverError.description"
        keywordsKey="seo.serverError.keywords"
      />
      <span className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-400">
        {t("serverErrorPage.tagline")}
      </span>
      <h1 className="text-4xl font-black uppercase tracking-[0.25em] text-slate-900 dark:text-slate-100">
        {t("serverErrorPage.title")}
      </h1>
      <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
        {t("serverErrorPage.description")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          to={previousPath}
          className="inline-flex items-center gap-3 rounded-full border border-slate-300/60 bg-white/70 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-700 transition hover:border-teal-400 hover:text-teal-400 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200"
        >
          {t("serverErrorPage.actions.retry")}
        </Link>
        <Link
          to="/contact"
          className="inline-flex items-center gap-3 rounded-full border border-teal-400/50 bg-teal-400/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-teal-400 transition hover:bg-teal-400/20 dark:border-teal-300/50 dark:text-teal-200"
        >
          {t("serverErrorPage.actions.contact")}
        </Link>
      </div>
    </section>
  );
}

export default ServerError;
