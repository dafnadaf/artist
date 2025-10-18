import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";

function NotFound() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center text-slate-700 dark:text-slate-200">
      <Seo titleKey="seo.notFound.title" descriptionKey="seo.notFound.description" keywordsKey="seo.notFound.keywords" />
      <span className="text-xs font-semibold uppercase tracking-[0.4em] text-fuchsia-400">
        {t("notFoundPage.tagline")}
      </span>
      <h1 className="text-4xl font-black uppercase tracking-[0.25em] text-slate-900 dark:text-slate-100">
        {t("notFoundPage.title")}
      </h1>
      <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
        {t("notFoundPage.description")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-3 rounded-full border border-teal-400/50 bg-teal-400/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-teal-400 transition hover:bg-teal-400/20 dark:border-teal-300/50 dark:text-teal-200"
        >
          {t("notFoundPage.actions.home")}
        </Link>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-3 rounded-full border border-slate-300/60 bg-white/70 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-700 transition hover:border-teal-400 hover:text-teal-400 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200"
        >
          {t("notFoundPage.actions.catalog")}
        </Link>
      </div>
    </section>
  );
}

export default NotFound;
