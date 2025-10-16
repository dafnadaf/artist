import PropTypes from "prop-types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const statusStyles = {
  new: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  in_progress: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  shipped: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
};

function OrderSummary({ order, currencyFormatter, customer }) {
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

  if (!order) {
    return null;
  }

  const itemsTotal = order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0;
  const shippingCost = order.delivery?.cost ?? 0;
  const grandTotal = itemsTotal + shippingCost;
  const status = order.status || "new";
  const statusClassName = statusStyles[status] || statusStyles.new;

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200/70 bg-white/80 p-8 shadow-2xl backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/80">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-teal-400">
          {t("orders.summary.title")}
        </p>
        <h2 className="text-2xl font-black uppercase tracking-[0.35em] text-slate-900 dark:text-slate-100">
          {t("orders.summary.subtitle")}
        </h2>
        <p className="max-w-2xl text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          {t("orders.summary.description")}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            <span>
              {t("orders.summary.orderId", {
                id: order._id ? order._id.slice(-6).toUpperCase() : t("orders.summary.pendingId"),
              })}
            </span>
            <span className={`rounded-full border px-3 py-1 font-semibold ${statusClassName}`}>
              {t(`orders.status.${status}`, { defaultValue: status })}
            </span>
          </div>
          <div className="grid gap-4 rounded-2xl border border-slate-200/60 bg-white/80 p-5 text-xs uppercase tracking-[0.3em] text-slate-600 shadow-inner dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-300">
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 dark:text-slate-500">{t("orders.summary.createdAt")}</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {order.createdAt ? dateFormatter.format(new Date(order.createdAt)) : t("orders.summary.pendingDate")}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 dark:text-slate-500">{t("orders.summary.shippingLabel")}</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t(`cartPage.shippingOptions.${order.delivery?.type || "standard"}`)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 dark:text-slate-500">{t("orders.summary.customer")}</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {customer?.name || order.customer?.name || "—"}
              </span>
              <span className="text-xs font-medium lowercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                {customer?.email || order.customer?.email || ""}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 dark:text-slate-500">{t("orders.summary.address")}</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {order.delivery?.address}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-inner dark:border-slate-800/60 dark:bg-slate-900/60">
          <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">
            {t("orders.summary.itemsHeading")}
          </h3>
          <ul className="space-y-3 text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300">
            {order.items?.map((item) => (
              <li key={`${item.workId}-${item.title}`} className="flex items-center justify-between gap-3">
                <span className="flex-1 text-[0.7rem] font-medium leading-snug text-slate-500 dark:text-slate-400">
                  {item.title}
                </span>
                <span className="text-[0.65rem] text-slate-500 dark:text-slate-400">
                  × {item.quantity}
                </span>
                <span className="min-w-[5rem] text-right font-semibold text-slate-900 dark:text-slate-100">
                  {formatter.format(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-dashed border-slate-200/60 pt-4 text-xs uppercase tracking-[0.3em] text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span>{t("orders.summary.totals.items")}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatter.format(itemsTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
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
    </section>
  );
}

OrderSummary.propTypes = {
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
  }),
  currencyFormatter: PropTypes.instanceOf(Intl.NumberFormat),
  customer: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
};

OrderSummary.defaultProps = {
  order: null,
  currencyFormatter: undefined,
  customer: null,
};

export default OrderSummary;
