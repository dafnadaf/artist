import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

function PageLoader({ labelKey }) {
  const { t } = useTranslation();
  const label = labelKey ? t(labelKey) : t("auth.common.loading");

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <span
        className="inline-flex h-12 w-12 animate-spin rounded-full border-2 border-slate-300 border-t-teal-400 dark:border-slate-600 dark:border-t-teal-300"
        aria-hidden="true"
      />
      <p className="text-xs uppercase tracking-[0.35em] text-slate-600 dark:text-slate-400">{label}</p>
    </div>
  );
}

PageLoader.propTypes = {
  labelKey: PropTypes.string,
};

PageLoader.defaultProps = {
  labelKey: "",
};

export default PageLoader;
