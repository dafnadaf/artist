import PropTypes from "prop-types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

function Filters({
  filters,
  onChange,
  categories,
  sizes,
  minYear,
  maxYear,
  minPrice,
  maxPrice,
}) {
  const { t, i18n } = useTranslation();

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language === "ru" ? "ru-RU" : "en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [i18n.language],
  );

  const handleSelectChange = (field) => (event) => {
    onChange({ [field]: event.target.value });
  };

  const handleYearChange = (index) => (event) => {
    const value = Number(event.target.value || 0);
    const nextRange = [...filters.yearRange];
    nextRange[index] = value;
    if (nextRange[0] > nextRange[1]) {
      if (index === 0) {
        nextRange[1] = value;
      } else {
        nextRange[0] = value;
      }
    }
    onChange({ yearRange: [Math.max(minYear, nextRange[0]), Math.min(maxYear, nextRange[1])] });
  };

  const handlePriceChange = (index) => (event) => {
    const value = Number(event.target.value || 0);
    const nextRange = [...filters.priceRange];
    nextRange[index] = value;
    if (nextRange[0] > nextRange[1]) {
      if (index === 0) {
        nextRange[1] = value;
      } else {
        nextRange[0] = value;
      }
    }
    onChange({
      priceRange: [
        Math.max(minPrice, Math.min(nextRange[0], nextRange[1])),
        Math.min(maxPrice, Math.max(nextRange[0], nextRange[1])),
      ],
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200/40 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-900/70">
      <h2 className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-600 dark:text-slate-300">
        {t("catalogPage.filters.heading")}
      </h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            {t("catalogPage.filters.category")}
          </span>
          <select
            value={filters.category}
            onChange={handleSelectChange("category")}
            className="w-full rounded-lg border border-slate-200/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition focus:border-teal-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
          >
            <option value="all">{t("catalogPage.filters.all")}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {t(`catalogPage.categories.${category}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            {t("catalogPage.filters.year")}
          </span>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={minYear}
              max={maxYear}
              value={filters.yearRange[0]}
              onChange={handleYearChange(0)}
              className="w-24 rounded-lg border border-slate-200/60 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-teal-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">—</span>
            <input
              type="number"
              min={minYear}
              max={maxYear}
              value={filters.yearRange[1]}
              onChange={handleYearChange(1)}
              className="w-24 rounded-lg border border-slate-200/60 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-teal-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
            />
          </div>
        </label>
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            {t("catalogPage.filters.price")}
          </span>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
              <span>{priceFormatter.format(filters.priceRange[0])}</span>
              <span>{priceFormatter.format(filters.priceRange[1])}</span>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={filters.priceRange[0]}
                onChange={handlePriceChange(0)}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-teal-400 via-fuchsia-500 to-amber-400"
              />
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={filters.priceRange[1]}
                onChange={handlePriceChange(1)}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-teal-400 via-fuchsia-500 to-amber-400"
              />
            </div>
          </div>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            {t("catalogPage.filters.size")}
          </span>
          <select
            value={filters.size}
            onChange={handleSelectChange("size")}
            className="w-full rounded-lg border border-slate-200/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition focus:border-teal-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
          >
            <option value="all">{t("catalogPage.filters.all")}</option>
            {sizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

Filters.propTypes = {
  filters: PropTypes.shape({
    category: PropTypes.string.isRequired,
    size: PropTypes.string.isRequired,
    yearRange: PropTypes.arrayOf(PropTypes.number).isRequired,
    priceRange: PropTypes.arrayOf(PropTypes.number).isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  sizes: PropTypes.arrayOf(PropTypes.string).isRequired,
  minYear: PropTypes.number.isRequired,
  maxYear: PropTypes.number.isRequired,
  minPrice: PropTypes.number.isRequired,
  maxPrice: PropTypes.number.isRequired,
};

export default Filters;
