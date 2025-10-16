import PropTypes from "prop-types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const statusClasses = {
  new: "bg-sky-400/10 text-sky-300 border-sky-400/40",
  in_progress: "bg-amber-400/10 text-amber-300 border-amber-400/40",
  shipped: "bg-emerald-400/10 text-emerald-300 border-emerald-400/40",
};

function OrderCard({ order, currencyFormatter }) {
  const { t, i18n } = useTranslation();

  const formatter = useMemo(() => {
    if (currencyFormatter) {
      return currencyFormatter;
    }

    return new Intl.NumberFormat(i18n.language === "ru" ? "ru-RU" : "en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }, [currencyFormatter, i18n.language]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language === "ru" ? "ru-RU" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [i18n.language],
  );

  const itemsTotal = order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0;
  const shippingCost = order.delivery?.cost ?? 0;
  const grandTotal = itemsTotal + shippingCost;
  const status = order.status || "new";
  const badgeClassName = statusClasses[status] || statusClasses.new;

  return (
    <article className="space-y-4 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-xl backdrop-blur-sm transition hover:shadow-2xl dark:border-slate-800/80 dark:bg-slate-950/80">
      <header className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {t("orders.card.orderId", {
              id: order._id ? order._id.slice(-6).toUpperCase() : t("orders.summary.pendingId"),
            })}
          </span>
          <span className={`rounded-full border px-3 py-1 font-semibold ${badgeClassName}`}>
            {t(`orders.status.${status}`, { defaultValue: status })}
          </span>
        </div>
        <span className="font-semibold text-slate-900 dark:text-slate-200">
          {order.createdAt ? dateFormatter.format(new Date(order.createdAt)) : t("orders.summary.pendingDate")}
        </span>
      </header>

      <div className="grid gap-4 text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ul className="space-y-3">
          {order.items?.map((item) => (
            <li key={`${item.workId}-${item.title}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/50 bg-white/70 p-3 shadow-inner dark:border-slate-800/60 dark:bg-slate-900/50">
              <span className="flex-1 text-[0.68rem] font-medium uppercase tracking-[0.28em] text-slate-600 dark:text-slate-400">
                {item.title}
              </span>
              <span className="text-[0.65rem] text-slate-500 dark:text-slate-400">× {item.quantity}</span>
              <span className="text-right font-semibold text-slate-900 dark:text-slate-100">
                {formatter.format(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="space-y-3 rounded-2xl border border-dashed border-slate-200/60 p-4 text-[0.68rem] uppercase tracking-[0.28em] text-slate-500 shadow-inner dark:border-slate-700/60 dark:text-slate-400">
          <div className="space-y-1">
            <span className="text-slate-400 dark:text-slate-500">{t("orders.summary.shippingLabel")}</span>
            <span className="block font-semibold text-slate-900 dark:text-slate-100">
              {t(`cartPage.shippingOptions.${order.delivery?.type || "standard"}`)}
            </span>
            <span className="block text-[0.65rem] text-slate-500 dark:text-slate-400">
              {order.delivery?.address}
            </span>
          </div>
          {order.customer?.name || order.customer?.email ? (
            <div className="space-y-1">
              <span className="text-slate-400 dark:text-slate-500">{t("orders.summary.customer")}</span>
              <span className="block font-semibold text-slate-900 dark:text-slate-100">{order.customer?.name}</span>
              <span className="block text-[0.65rem] lowercase text-slate-500 dark:text-slate-400">{order.customer?.email}</span>
            </div>
          ) : null}
          <div className="space-y-1 border-t border-dashed border-slate-200/60 pt-3 text-slate-500 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-[0.65rem]">
              <span>{t("orders.summary.totals.items")}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatter.format(itemsTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[0.65rem]">
              <span>{t("orders.summary.totals.shipping")}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatter.format(shippingCost)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-black tracking-[0.25em] text-teal-400">
              <span>{t("orders.summary.totals.grand")}</span>
              <span>{formatter.format(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

OrderCard.propTypes = {
  order: PropTypes.shape({
    _id: PropTypes.string,
    status: PropTypes.string,
    createdAt: PropTypes.string,
    delivery: PropTypes.shape({
      type: PropTypes.string,
      address: PropTypes.string,
      cost: PropTypes.number,
    }),
    customer: PropTypes.shape({
      name: PropTypes.string,
      email: PropTypes.string,
    }),
    items: PropTypes.arrayOf(
      PropTypes.shape({
        workId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        title: PropTypes.string,
        price: PropTypes.number,
        quantity: PropTypes.number,
      }),
    ),
  }).isRequired,
  currencyFormatter: PropTypes.instanceOf(Intl.NumberFormat),
};

OrderCard.defaultProps = {
  currencyFormatter: undefined,
};

export default OrderCard;
