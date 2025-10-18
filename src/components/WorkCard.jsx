import PropTypes from "prop-types";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion as Motion } from "framer-motion";

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

function WorkCard({ work }) {
  const { t, i18n } = useTranslation();

  const title = useMemo(() => {
    if (typeof work.title === "string") {
      return work.title;
    }

    return work.title?.[i18n.language] ?? work.title?.en ?? work.title?.ru ?? "";
  }, [work.title, i18n.language]);

  const price = useMemo(() => {
    const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(work.price);
  }, [work.price, i18n.language]);

  const image = work.image ?? work.imageUrl ?? "";

  return (
    <Motion.article
      className="overflow-hidden rounded-2xl border border-slate-200/40 bg-white/70 shadow-xl transition-transform duration-300 hover:-translate-y-1 hover:border-teal-400/60 hover:shadow-2xl dark:border-slate-800/40 dark:bg-slate-900/60"
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Link to={`/catalog/${work.id}`} className="group flex h-full flex-col">
        <div className="relative h-64 overflow-hidden">
          <img
            src={image}
            alt={t("catalogPage.card.imageAlt", { title })}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/0 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-60" />
          <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
            <h3 className="text-lg font-semibold uppercase tracking-[0.3em] text-white drop-shadow-lg">
              {title}
            </h3>
            <span className="text-sm font-medium text-teal-300">{price}</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-[0.3em] text-xs text-slate-400 dark:text-slate-500">
              {t("catalogPage.card.year")}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{work.year}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-[0.3em] text-xs text-slate-400 dark:text-slate-500">
              {t("catalogPage.card.dimensions")}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{work.dimensions}</span>
          </div>
          <div className="mt-auto flex items-center justify-between">
            <span className="uppercase tracking-[0.3em] text-xs text-slate-400 dark:text-slate-500">
              {t("catalogPage.card.category")}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {t(`catalogPage.categories.${work.category}`)}
            </span>
          </div>
        </div>
      </Link>
    </Motion.article>
  );
}

WorkCard.propTypes = {
  work: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        en: PropTypes.string,
        ru: PropTypes.string,
      }),
    ]).isRequired,
    image: PropTypes.string,
    imageUrl: PropTypes.string,
    year: PropTypes.number.isRequired,
    dimensions: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    category: PropTypes.string.isRequired,
    description: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        en: PropTypes.string,
        ru: PropTypes.string,
      }),
    ]),
  }).isRequired,
};

export default WorkCard;
