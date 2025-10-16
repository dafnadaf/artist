import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const DEFAULT_STATE = {
  title: { en: "", ru: "" },
  description: { en: "", ru: "" },
  imageUrl: "",
  year: String(new Date().getFullYear()),
  dimensions: "",
  price: "",
  category: "",
};

function WorkForm({ initialData, onSubmit, onCancel, submitting, categoryOptions }) {
  const { t } = useTranslation();
  const [formState, setFormState] = useState(DEFAULT_STATE);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!initialData) {
      setFormState({
        title: { ...DEFAULT_STATE.title },
        description: { ...DEFAULT_STATE.description },
        imageUrl: DEFAULT_STATE.imageUrl,
        year: DEFAULT_STATE.year,
        dimensions: DEFAULT_STATE.dimensions,
        price: DEFAULT_STATE.price,
        category: DEFAULT_STATE.category,
      });
      return;
    }

    setFormState({
      title: {
        en: initialData.title?.en ?? "",
        ru: initialData.title?.ru ?? "",
      },
      description: {
        en: initialData.description?.en ?? "",
        ru: initialData.description?.ru ?? "",
      },
      imageUrl: initialData.imageUrl ?? initialData.image ?? "",
      year: String(initialData.year ?? new Date().getFullYear()),
      dimensions: initialData.dimensions ?? "",
      price: initialData.price != null ? String(initialData.price) : "",
      category: initialData.category ?? "",
    });
  }, [initialData]);

  const options = useMemo(() => Array.from(new Set(categoryOptions.concat(formState.category ? [formState.category] : []))), [
    categoryOptions,
    formState.category,
  ]);

  const handleChange = (field, language) => (event) => {
    const value = event.target.value;

    if (language) {
      setFormState((previous) => ({
        ...previous,
        [field]: {
          ...previous[field],
          [language]: value,
        },
      }));
      return;
    }

    setFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const validate = () => {
    const validationErrors = {};
    const parsedYear = Number.parseInt(String(formState.year).trim(), 10);
    const parsedPrice = Number.parseFloat(String(formState.price).trim());

    if (!formState.title.en.trim() || !formState.title.ru.trim()) {
      validationErrors.title = t("adminWorksPage.form.errors.title");
    }

    if (!formState.description.en.trim() || !formState.description.ru.trim()) {
      validationErrors.description = t("adminWorksPage.form.errors.description");
    }

    if (!formState.imageUrl.trim()) {
      validationErrors.imageUrl = t("adminWorksPage.form.errors.imageUrl");
    }

    if (!formState.year.toString().trim() || !Number.isFinite(parsedYear)) {
      validationErrors.year = t("adminWorksPage.form.errors.year");
    }

    if (!formState.dimensions.trim()) {
      validationErrors.dimensions = t("adminWorksPage.form.errors.dimensions");
    }

    if (!formState.price.toString().trim() || !Number.isFinite(parsedPrice)) {
      validationErrors.price = t("adminWorksPage.form.errors.price");
    }

    if (!formState.category.trim()) {
      validationErrors.category = t("adminWorksPage.form.errors.category");
    }

    return validationErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    const payload = {
      title: {
        en: formState.title.en.trim(),
        ru: formState.title.ru.trim(),
      },
      description: {
        en: formState.description.en.trim(),
        ru: formState.description.ru.trim(),
      },
      imageUrl: formState.imageUrl.trim(),
      year: Number.parseInt(String(formState.year).trim(), 10),
      dimensions: formState.dimensions.trim(),
      price: Number.parseFloat(String(formState.price).trim()),
      category: formState.category.trim(),
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.titleEn")}
          </span>
          <input
            type="text"
            value={formState.title.en}
            onChange={handleChange("title", "en")}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.title ? <span className="text-xs text-rose-400">{errors.title}</span> : null}
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.titleRu")}
          </span>
          <input
            type="text"
            value={formState.title.ru}
            onChange={handleChange("title", "ru")}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.title ? <span className="text-xs text-rose-400">{errors.title}</span> : null}
        </label>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.descriptionEn")}
          </span>
          <textarea
            value={formState.description.en}
            onChange={handleChange("description", "en")}
            rows={4}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.description ? <span className="text-xs text-rose-400">{errors.description}</span> : null}
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.descriptionRu")}
          </span>
          <textarea
            value={formState.description.ru}
            onChange={handleChange("description", "ru")}
            rows={4}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.description ? <span className="text-xs text-rose-400">{errors.description}</span> : null}
        </label>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
          {t("adminWorksPage.form.fields.imageUrl")}
        </span>
        <input
          type="url"
          value={formState.imageUrl}
          onChange={handleChange("imageUrl")}
          className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
        />
        {errors.imageUrl ? <span className="text-xs text-rose-400">{errors.imageUrl}</span> : null}
      </label>
      <div className="grid gap-6 md:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.year")}
          </span>
          <input
            type="number"
            value={formState.year}
            onChange={handleChange("year")}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.year ? <span className="text-xs text-rose-400">{errors.year}</span> : null}
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.dimensions")}
          </span>
          <input
            type="text"
            value={formState.dimensions}
            onChange={handleChange("dimensions")}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.dimensions ? <span className="text-xs text-rose-400">{errors.dimensions}</span> : null}
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.price")}
          </span>
          <input
            type="number"
            value={formState.price}
            onChange={handleChange("price")}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.price ? <span className="text-xs text-rose-400">{errors.price}</span> : null}
        </label>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
          {t("adminWorksPage.form.fields.category")}
        </span>
        <input
          type="text"
          value={formState.category}
          onChange={handleChange("category")}
          list="admin-work-categories"
          className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
        />
        <datalist id="admin-work-categories">
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        {errors.category ? <span className="text-xs text-rose-400">{errors.category}</span> : null}
      </label>
      <div className="flex flex-wrap gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-400/60 bg-teal-400/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-teal-400 transition hover:bg-teal-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-400/20 dark:text-teal-200 dark:hover:bg-teal-400/30"
        >
          {initialData ? t("adminWorksPage.form.submitEdit") : t("adminWorksPage.form.submitCreate")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300/60 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
        >
          {t("adminWorksPage.form.cancel")}
        </button>
      </div>
    </form>
  );
}

WorkForm.propTypes = {
  initialData: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.shape({ en: PropTypes.string, ru: PropTypes.string }),
    description: PropTypes.shape({ en: PropTypes.string, ru: PropTypes.string }),
    imageUrl: PropTypes.string,
    image: PropTypes.string,
    year: PropTypes.number,
    dimensions: PropTypes.string,
    price: PropTypes.number,
    category: PropTypes.string,
  }),
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  categoryOptions: PropTypes.arrayOf(PropTypes.string),
};

WorkForm.defaultProps = {
  initialData: null,
  submitting: false,
  categoryOptions: [],
};

export default WorkForm;
