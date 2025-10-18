import PropTypes from "prop-types";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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

  const workSchema = useMemo(
    () =>
      z.object({
        title: z.object({
          en: z.string({ required_error: t("adminWorksPage.form.errors.title") }).min(
            1,
            t("adminWorksPage.form.errors.title"),
          ),
          ru: z.string({ required_error: t("adminWorksPage.form.errors.title") }).min(
            1,
            t("adminWorksPage.form.errors.title"),
          ),
        }),
        description: z.object({
          en: z.string({ required_error: t("adminWorksPage.form.errors.description") }).min(
            1,
            t("adminWorksPage.form.errors.description"),
          ),
          ru: z.string({ required_error: t("adminWorksPage.form.errors.description") }).min(
            1,
            t("adminWorksPage.form.errors.description"),
          ),
        }),
        imageUrl: z
          .string({ required_error: t("adminWorksPage.form.errors.imageUrl") })
          .url(t("adminWorksPage.form.errors.imageUrl")),
        year: z.coerce
          .number({ invalid_type_error: t("adminWorksPage.form.errors.year") })
          .int(t("adminWorksPage.form.errors.year"))
          .min(0, t("adminWorksPage.form.errors.year")),
        dimensions: z
          .string({ required_error: t("adminWorksPage.form.errors.dimensions") })
          .min(1, t("adminWorksPage.form.errors.dimensions")),
        price: z.coerce
          .number({ invalid_type_error: t("adminWorksPage.form.errors.price") })
          .min(0, t("adminWorksPage.form.errors.price")),
        category: z
          .string({ required_error: t("adminWorksPage.form.errors.category") })
          .min(1, t("adminWorksPage.form.errors.category")),
      }),
    [t],
  );

  const {
    register: registerField,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(workSchema),
    defaultValues: DEFAULT_STATE,
    mode: "onBlur",
  });

  const toFormValues = (data) => ({
    title: {
      en: data?.title?.en ?? "",
      ru: data?.title?.ru ?? "",
    },
    description: {
      en: data?.description?.en ?? "",
      ru: data?.description?.ru ?? "",
    },
    imageUrl: data?.imageUrl ?? data?.image ?? "",
    year: String(data?.year ?? new Date().getFullYear()),
    dimensions: data?.dimensions ?? "",
    price: data?.price != null ? String(data.price) : "",
    category: data?.category ?? "",
  });

  useEffect(() => {
    reset(toFormValues(initialData));
  }, [initialData, reset]);

  const watchedCategory = watch("category");

  const options = useMemo(
    () => Array.from(new Set(categoryOptions.concat(watchedCategory ? [watchedCategory] : []))),
    [categoryOptions, watchedCategory],
  );

  const submitLabel = initialData
    ? t("adminWorksPage.form.submitEdit")
    : t("adminWorksPage.form.submitCreate");
  const isBusy = submitting || isSubmitting;

  const handleFormSubmit = (values) => {
    const payload = {
      title: {
        en: values.title.en.trim(),
        ru: values.title.ru.trim(),
      },
      description: {
        en: values.description.en.trim(),
        ru: values.description.ru.trim(),
      },
      imageUrl: values.imageUrl.trim(),
      year: values.year,
      dimensions: values.dimensions.trim(),
      price: values.price,
      category: values.category.trim(),
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.titleEn")}
          </span>
          <input
            type="text"
            {...registerField("title.en")}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.title?.en ? <span className="text-xs text-rose-400">{errors.title.en.message}</span> : null}
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.titleRu")}
          </span>
          <input
            type="text"
            {...registerField("title.ru")}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.title?.ru ? <span className="text-xs text-rose-400">{errors.title.ru.message}</span> : null}
        </label>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.descriptionEn")}
          </span>
          <textarea
            {...registerField("description.en")}
            rows={4}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.description?.en ? <span className="text-xs text-rose-400">{errors.description.en.message}</span> : null}
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.descriptionRu")}
          </span>
          <textarea
            {...registerField("description.ru")}
            rows={4}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.description?.ru ? <span className="text-xs text-rose-400">{errors.description.ru.message}</span> : null}
        </label>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
          {t("adminWorksPage.form.fields.imageUrl")}
        </span>
        <input
          type="url"
          {...registerField("imageUrl")}
          className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
        />
        {errors.imageUrl ? <span className="text-xs text-rose-400">{errors.imageUrl.message}</span> : null}
      </label>
      <div className="grid gap-6 md:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.year")}
          </span>
          <input
            type="number"
            {...registerField("year")}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.year ? <span className="text-xs text-rose-400">{errors.year.message}</span> : null}
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.dimensions")}
          </span>
          <input
            type="text"
            {...registerField("dimensions")}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.dimensions ? <span className="text-xs text-rose-400">{errors.dimensions.message}</span> : null}
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            {t("adminWorksPage.form.fields.price")}
          </span>
          <input
            type="number"
            {...registerField("price")}
            className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
          />
          {errors.price ? <span className="text-xs text-rose-400">{errors.price.message}</span> : null}
        </label>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
          {t("adminWorksPage.form.fields.category")}
        </span>
        <input
          type="text"
          {...registerField("category")}
          list="admin-work-categories"
          className="rounded-lg border border-slate-300/60 bg-white/80 px-4 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
        />
        <datalist id="admin-work-categories">
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        {errors.category ? <span className="text-xs text-rose-400">{errors.category.message}</span> : null}
      </label>
      <div className="flex flex-wrap gap-4">
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-400/60 bg-teal-400/10 px-6 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-teal-400 transition hover:bg-teal-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-400/20 dark:text-teal-200 dark:hover:bg-teal-400/30"
        >
          {isBusy ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-300 border-t-transparent" aria-hidden="true" />
              {submitLabel}
            </span>
          ) : (
            submitLabel
          )}
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
