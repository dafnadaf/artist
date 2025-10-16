import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import works from "../data/works.json";
import { useCart } from "../context/CartContext";
import normalizeWork from "../utils/normalizeWork";
import { fetchWorkById } from "../services/worksApi";

const fallbackWorks = works.map((item) => normalizeWork(item));

function WorkDetails() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) {
        if (active) {
          setWork(null);
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setNotFound(false);

      try {
        const result = await fetchWorkById(id);
        if (!active) {
          return;
        }
        setWork(result);
        setNotFound(false);
      } catch (error) {
        console.error("Failed to load work", error);
        if (!active) {
          return;
        }
        const fallback = fallbackWorks.find((item) => item.id === String(id));
        if (fallback) {
          setWork(fallback);
          setNotFound(false);
        } else {
          setWork(null);
          setNotFound(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [id]);

  const title = useMemo(() => {
    if (!work) {
      return "";
    }

    if (typeof work.title === "string") {
      return work.title;
    }

    return work.title?.[i18n.language] ?? work.title?.en ?? work.title?.ru ?? "";
  }, [work, i18n.language]);

  const description = useMemo(() => {
    if (!work) {
      return "";
    }

    if (typeof work.description === "string") {
      return work.description;
    }

    return work.description?.[i18n.language] ?? work.description?.en ?? work.description?.ru ?? "";
  }, [work, i18n.language]);

  const price = useMemo(() => {
    if (!work) {
      return "";
    }

    const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(work.price);
  }, [work, i18n.language]);

  useEffect(() => {
    if (!added) {
      return undefined;
    }

    const timeout = setTimeout(() => setAdded(false), 2400);

    return () => clearTimeout(timeout);
  }, [added]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-600 dark:text-slate-400">
          {t("auth.common.loading")}
        </p>
      </div>
    );
  }

  if (notFound || !work) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 text-center text-slate-700 dark:text-slate-200">
        <span className="text-xs font-semibold uppercase tracking-[0.4em] text-teal-400">
          {t("workDetails.notFoundTagline")}
        </span>
        <h1 className="text-4xl font-black uppercase tracking-[0.25em] text-slate-900 dark:text-slate-100">
          {t("workDetails.notFoundTitle")}
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
          {t("workDetails.notFoundDescription")}
        </p>
        <Link
          to="/catalog"
          className="mx-auto inline-flex items-center gap-3 rounded-full border border-teal-400/40 bg-white/70 px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-900 transition hover:border-teal-400 hover:bg-teal-400/20 dark:border-teal-400/40 dark:bg-slate-900/80 dark:text-slate-100"
        >
          {t("workDetails.backToCatalog")}
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(work, 1);
    setAdded(true);
  };

  const image = work.image ?? work.imageUrl ?? "";

  return (
    <div className="grid gap-12 lg:grid-cols-[7fr_5fr]">
      <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white/50 shadow-2xl dark:border-slate-800/60 dark:bg-slate-900/60">
        <img
          src={image}
          alt={t("workDetails.imageAlt", { title })}
          className="h-full w-full max-h-[720px] object-cover"
        />
      </div>
      <aside className="flex flex-col gap-8">
        <Link
          to="/catalog"
          className="inline-flex w-max items-center gap-3 rounded-full border border-slate-300/60 bg-white/70 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-slate-600 transition hover:border-teal-400 hover:text-teal-500 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-teal-400 dark:hover:text-teal-300"
        >
          <span aria-hidden="true">←</span>
          {t("workDetails.back")}
        </Link>
        <header className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.4em] text-teal-400">
            {t("workDetails.tagline")}
          </span>
          <h1 className="text-4xl font-black uppercase tracking-[0.25em] text-slate-900 dark:text-slate-100">
            {title}
          </h1>
        </header>
        <ul className="grid gap-4 rounded-2xl border border-slate-200/60 bg-white/70 p-6 text-sm text-slate-600 shadow-lg dark:border-slate-800/60 dark:bg-slate-900/70 dark:text-slate-300">
          <li className="flex items-center justify-between">
            <span className="uppercase tracking-[0.3em] text-xs text-slate-400 dark:text-slate-500">
              {t("workDetails.year")}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{work.year}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="uppercase tracking-[0.3em] text-xs text-slate-400 dark:text-slate-500">
              {t("workDetails.dimensions")}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{work.dimensions}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="uppercase tracking-[0.3em] text-xs text-slate-400 dark:text-slate-500">
              {t("workDetails.category")}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {t(`catalogPage.categories.${work.category}`)}
            </span>
          </li>
          <li className="flex items-center justify-between border-t border-dashed border-slate-200/70 pt-4 dark:border-slate-700/70">
            <span className="uppercase tracking-[0.3em] text-xs text-slate-400 dark:text-slate-500">
              {t("workDetails.price")}
            </span>
            <span className="text-xl font-black tracking-[0.2em] text-teal-400">{price}</span>
          </li>
        </ul>
        <button
          type="button"
          onClick={handleAddToCart}
          className="inline-flex items-center justify-center gap-3 rounded-full border border-teal-400/60 bg-teal-400/10 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-teal-400 transition hover:bg-teal-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:bg-teal-400/20 dark:text-teal-200 dark:hover:bg-teal-400/30 dark:focus-visible:ring-offset-slate-900"
        >
          {t("workDetails.addToCart")}
        </button>
        {added ? (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-400">
            {t("workDetails.addedConfirmation")}
          </p>
        ) : null}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            {t("workDetails.descriptionHeading")}
          </h2>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
        </section>
      </aside>
    </div>
  );
}

export default WorkDetails;
