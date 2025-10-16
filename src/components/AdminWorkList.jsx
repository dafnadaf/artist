import PropTypes from "prop-types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

function AdminWorkList({ works, onEdit, onDelete }) {
  const { t, i18n } = useTranslation();

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language === "ru" ? "ru-RU" : "en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [i18n.language],
  );

  if (works.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/60 p-12 text-center shadow-inner dark:border-slate-700/60 dark:bg-slate-900/60">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
          {t("adminWorksPage.list.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/60 shadow-xl dark:border-slate-800/60 dark:bg-slate-900/60">
      <div className="hidden bg-slate-900/90 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200 md:grid md:grid-cols-[3fr_1fr_1fr_1fr_1fr]">
        <span>{t("adminWorksPage.list.columns.title")}</span>
        <span>{t("adminWorksPage.list.columns.year")}</span>
        <span>{t("adminWorksPage.list.columns.category")}</span>
        <span>{t("adminWorksPage.list.columns.price")}</span>
        <span>{t("adminWorksPage.list.columns.actions")}</span>
      </div>
      <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
        {works.map((work) => {
          const title =
            work.title?.[i18n.language] ?? work.title?.en ?? work.title?.ru ?? (typeof work.title === "string" ? work.title : "");

          return (
            <li key={work.id} className="grid gap-6 px-6 py-6 md:grid-cols-[3fr_1fr_1fr_1fr_1fr] md:items-center">
              <div className="flex items-center gap-4">
                <div className="hidden h-16 w-16 overflow-hidden rounded-xl border border-slate-200/60 shadow-inner md:block dark:border-slate-800/60">
                  {work.image ? (
                    <img src={work.image} alt={title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs uppercase tracking-[0.3em] text-slate-500">
                      {t("adminWorksPage.list.noImage")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-800 dark:text-slate-100">
                    {title}
                  </span>
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                    {work.dimensions}
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                {work.year}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                {t(`catalogPage.categories.${work.category}`)}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-500">
                {formatter.format(work.price)}
              </span>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onEdit(work)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300/60 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-600 transition hover:border-teal-400 hover:text-teal-400 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-teal-400"
                >
                  {t("adminWorksPage.list.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(work)}
                  className="inline-flex items-center justify-center rounded-full border border-rose-400/60 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-rose-400 transition hover:bg-rose-400/10"
                >
                  {t("adminWorksPage.list.delete")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

AdminWorkList.propTypes = {
  works: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({ en: PropTypes.string, ru: PropTypes.string }),
      ]).isRequired,
      image: PropTypes.string,
      year: PropTypes.number.isRequired,
      dimensions: PropTypes.string,
      price: PropTypes.number.isRequired,
      category: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default AdminWorkList;
