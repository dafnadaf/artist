import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion as Motion } from "framer-motion";
import Filters from "../components/Filters";
import WorkCard from "../components/WorkCard";
import Seo from "../components/Seo";
import { fetchWorks } from "../services/worksApi";
import PageLoader from "../components/PageLoader";

const gridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

function CatalogPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [works, setWorks] = useState([]);
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchWorks();
        if (!active) {
          return;
        }
        setWorks(data);
      } catch (loadError) {
        console.error("Failed to load works", loadError);
        if (!active) {
          return;
        }

        if (axios.isAxiosError(loadError) && loadError.response?.status >= 500) {
          navigate("/500", { state: { from: location.pathname } });
          return;
        }

        setWorks([]);
        setError(t("catalogPage.loadError"));
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
  }, [t, navigate, location.pathname]);

  const categories = useMemo(() => Array.from(new Set(works.map((work) => work.category).filter(Boolean))), [works]);
  const sizes = useMemo(() => Array.from(new Set(works.map((work) => work.dimensions).filter(Boolean))), [works]);
  const yearRange = useMemo(() => {
    if (works.length === 0) {
      return [0, 0];
    }

    return works.reduce(
      (range, work) => [Math.min(range[0], work.year), Math.max(range[1], work.year)],
      [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
    );
  }, [works]);

  const priceRange = useMemo(() => {
    if (works.length === 0) {
      return [0, 0];
    }

    return works.reduce(
      (range, work) => [Math.min(range[0], work.price), Math.max(range[1], work.price)],
      [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
    );
  }, [works]);

  useEffect(() => {
    if (works.length === 0) {
      setFilters({
        category: "all",
        size: "all",
        yearRange: [0, 0],
        priceRange: [0, 0],
      });
      return;
    }

    setFilters((previous) => {
      const next =
        previous ?? {
          category: "all",
          size: "all",
          yearRange,
          priceRange,
        };

      const normalizedCategory = categories.includes(next.category) ? next.category : "all";
      const normalizedSize = sizes.includes(next.size) ? next.size : "all";

      return {
        category: normalizedCategory,
        size: normalizedSize,
        yearRange: [
          Math.max(yearRange[0], next.yearRange?.[0] ?? yearRange[0]),
          Math.min(yearRange[1], next.yearRange?.[1] ?? yearRange[1]),
        ],
        priceRange: [
          Math.max(priceRange[0], next.priceRange?.[0] ?? priceRange[0]),
          Math.min(priceRange[1], next.priceRange?.[1] ?? priceRange[1]),
        ],
      };
    });
  }, [works, categories, sizes, yearRange, priceRange]);

  const handleFilterChange = (changes) => {
    setFilters((previous) => ({
      ...previous,
      ...changes,
    }));
  };

  const filteredWorks = useMemo(
    () => {
      if (!filters) {
        return [];
      }

      return works.filter((work) => {
        const matchesCategory = filters.category === "all" || work.category === filters.category;
        const matchesSize = filters.size === "all" || work.dimensions === filters.size;
        const [minSelectedYear, maxSelectedYear] = filters.yearRange;
        const [minSelectedPrice, maxSelectedPrice] = filters.priceRange;
        const matchesYear = work.year >= minSelectedYear && work.year <= maxSelectedYear;
        const matchesPrice = work.price >= minSelectedPrice && work.price <= maxSelectedPrice;

        return matchesCategory && matchesSize && matchesYear && matchesPrice;
      });
    },
    [filters, works],
  );

  return (
    <div className="flex flex-col gap-12">
      <Seo
        titleKey="seo.catalog.title"
        descriptionKey="seo.catalog.description"
        keywordsKey="seo.catalog.keywords"
      />
      <Motion.header
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.4em] text-teal-400">
          {t("catalogPage.tagline")}
        </span>
        <h1 className="text-4xl font-black uppercase tracking-[0.25em] text-slate-900 dark:text-slate-100">
          {t("catalogPage.title")}
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          {t("catalogPage.description")}
        </p>
      </Motion.header>

      {error ? (
        <div className="rounded-2xl border border-amber-400/60 bg-amber-400/10 p-4 text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
          {error}
        </div>
      ) : null}

      {!loading && works.length === 0 ? (
        <p className="text-center text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          {t("catalogPage.noResults")}
        </p>
      ) : null}

      {filters ? (
        <Filters
          filters={filters}
          onChange={handleFilterChange}
          categories={categories}
          sizes={sizes}
          minYear={yearRange[0]}
          maxYear={yearRange[1]}
          minPrice={priceRange[0]}
          maxPrice={priceRange[1]}
        />
      ) : null}

      {loading ? <PageLoader /> : null}

      {!loading && filteredWorks.length > 0 ? (
        <Motion.section
          className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3"
          variants={gridVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredWorks.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </Motion.section>
      ) : null}

      {!loading && works.length > 0 && filteredWorks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/50 p-12 text-center shadow-inner dark:border-slate-700/60 dark:bg-slate-900/40">
          <p className="text-lg font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            {t("catalogPage.noMatches")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default CatalogPage;
