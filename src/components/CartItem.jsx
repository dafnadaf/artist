import PropTypes from "prop-types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

function CartItem({ item, onRemove, onUpdateQuantity }) {
  const { t, i18n } = useTranslation();

  const title = useMemo(() => {
    if (typeof item.work.title === "string") {
      return item.work.title;
    }

    return (
      item.work.title?.[i18n.language] ??
      item.work.title?.en ??
      item.work.title?.ru ??
      ""
    );
  }, [item.work.title, i18n.language]);

  const unitPrice = useMemo(() => {
    const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(item.work.price);
  }, [item.work.price, i18n.language]);

  const subtotal = useMemo(() => {
    const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(item.work.price * item.quantity);
  }, [item.work.price, item.quantity, i18n.language]);

  const image = item.work.image ?? item.work.imageUrl ?? "";

  const handleDecrease = () => {
    onUpdateQuantity(item.work.id, item.quantity - 1);
  };

  const handleIncrease = () => {
    onUpdateQuantity(item.work.id, item.quantity + 1);
  };

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-lg dark:border-slate-800/60 dark:bg-slate-900/70">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="h-28 w-full overflow-hidden rounded-xl sm:w-40">
          <img
            src={image}
            alt={t("cartPage.itemImageAlt", { title })}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold uppercase tracking-[0.3em] text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                {t("workDetails.year")}: {item.work.year}
              </span>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                {t("workDetails.dimensions")}: {item.work.dimensions}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.work.id)}
              className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-rose-400 dark:text-slate-500 dark:hover:text-rose-300"
            >
              {t("cartPage.remove")}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                {t("cartPage.quantity")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDecrease}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300/70 text-sm text-slate-700 transition hover:border-teal-400 hover:text-teal-500 dark:border-slate-700/70 dark:text-slate-200 dark:hover:border-teal-400 dark:hover:text-teal-300"
                  aria-label={t("cartPage.decreaseQuantity", { title })}
                >
                  −
                </button>
                <span className="min-w-[2.5rem] text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrease}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300/70 text-sm text-slate-700 transition hover:border-teal-400 hover:text-teal-500 dark:border-slate-700/70 dark:text-slate-200 dark:hover:border-teal-400 dark:hover:text-teal-300"
                  aria-label={t("cartPage.increaseQuantity", { title })}
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex flex-col text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
              <span>
                {t("cartPage.unitPrice")}: {unitPrice}
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t("cartPage.subtotal")}: {subtotal}
              </span>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

CartItem.propTypes = {
  item: PropTypes.shape({
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
    }).isRequired,
    quantity: PropTypes.number.isRequired,
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
  onUpdateQuantity: PropTypes.func.isRequired,
};

export default CartItem;
