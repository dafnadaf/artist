import PropTypes from "prop-types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const statusStyles = {
  new: {
    badge: "bg-sky-400/10 text-sky-300 border-sky-400/40",
    dot: "bg-sky-300",
  },
  awaiting_payment: {
    badge: "bg-violet-400/10 text-violet-300 border-violet-400/40",
    dot: "bg-violet-300",
  },
  paid: {
    badge: "bg-teal-400/10 text-teal-300 border-teal-400/40",
    dot: "bg-teal-300",
  },
  in_progress: {
    badge: "bg-amber-400/10 text-amber-300 border-amber-400/40",
    dot: "bg-amber-300",
  },
  shipped: {
    badge: "bg-emerald-400/10 text-emerald-300 border-emerald-400/40",
    dot: "bg-emerald-300",
  },
  delivered: {
    badge: "bg-lime-400/10 text-lime-300 border-lime-400/40",
    dot: "bg-lime-300",
  },
  canceled: {
    badge: "bg-rose-400/10 text-rose-300 border-rose-400/40",
    dot: "bg-rose-300",
  },
};

function OrderCard({ order, currencyFormatter }) {
  const { t, i18n } = useTranslation();

  const formatter = useMemo(() => {
    if (currencyFormatter) {
      return currencyFormatter;
    }

    return new Intl.NumberFormat(i18n.language === "ru" ? "ru-RU" : "en-US", {
      style: "currency",
      currency: "RUB",
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
  const shipping = order.shipping || {};
  const shippingCost = shipping.price ?? order.delivery?.cost ?? 0;
  const grandTotal = order.total ?? itemsTotal + shippingCost;
  const status = order.status || "new";
  const statusStyle = statusStyles[status] || statusStyles.new;
  const etaText = shipping.eta
    ? shipping.eta.daysMin && shipping.eta.daysMax && shipping.eta.daysMin !== shipping.eta.daysMax
      ? t("orders.summary.etaRange", { min: shipping.eta.daysMin, max: shipping.eta.daysMax })
      : t("orders.summary.etaSingle", { days: shipping.eta.daysMin || shipping.eta.daysMax })
    : null;
  const shippingTypeLabel = shipping.type ? t(`cartPage.shippingTypes.${shipping.type}`, { defaultValue: shipping.type }) : null;
  const paymentStatus = order.payment?.status;
  const paymentStatusLabel = paymentStatus
    ? t(`orders.paymentStatus.${paymentStatus}`, { defaultValue: paymentStatus })
    : null;
  const paymentDate = order.payment?.paidAt ? new Date(order.payment.paidAt) : null;
  const paymentAmount = Number.isFinite(Number(order.payment?.amount)) ? Number(order.payment.amount) : null;
  const paymentCurrency = order.payment?.currency || "RUB";

  return (
    <article className="space-y-4 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-xl backdrop-blur-sm transition hover:shadow-2xl dark:border-slate-800/80 dark:bg-slate-950/80">
      <header className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {t("orders.card.orderId", {
              id: order._id ? order._id.slice(-6).toUpperCase() : t("orders.summary.pendingId"),
            })}
          </span>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${statusStyle.badge}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${statusStyle.dot}`} aria-hidden="true" />
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
            <span className="text-slate-400 dark:text-slate-500">{t("orders.summary.shippingProvider")}</span>
            <span className="block font-semibold text-slate-900 dark:text-slate-100">
              {shipping.serviceName || t(`shipping.providers.${shipping.provider || "cdek"}`)}
            </span>
            {shippingTypeLabel ? (
              <span className="block text-[0.6rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                {t("orders.summary.shippingType", { type: shippingTypeLabel })}
              </span>
            ) : null}
            {shipping.trackingNumber ? (
              <span className="block text-[0.65rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                {shipping.trackingNumber}
              </span>
            ) : null}
            {etaText ? (
              <span className="block text-[0.65rem] text-slate-500 dark:text-slate-400">{etaText}</span>
            ) : null}
            {shipping.pvz ? (
              <div className="mt-2 space-y-1 text-[0.6rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-400 dark:text-slate-300">
                  {t("orders.summary.pickupPoint")}
                </span>
                <span className="text-slate-500 dark:text-slate-300">{shipping.pvz.name}</span>
                <span className="text-[0.55rem] text-slate-500 dark:text-slate-400">{shipping.pvz.address}</span>
              </div>
            ) : null}
            {paymentStatusLabel ? (
              <div className="space-y-1 border-t border-dashed border-slate-200/60 pt-2 text-[0.6rem] uppercase tracking-[0.3em] text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
                <span className="font-semibold text-slate-400 dark:text-slate-300">
                  {t("orders.summary.paymentStatusLabel")}
                </span>
                <span className="text-slate-500 dark:text-slate-300">{paymentStatusLabel}</span>
                {paymentDate ? (
                  <span className="text-[0.55rem] text-slate-500 dark:text-slate-400">
                    {paymentDate.toLocaleString(i18n.language === "ru" ? "ru-RU" : "en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                ) : null}
              </div>
            ) : null}
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
            {paymentAmount !== null ? (
              <div className="flex items-center justify-between text-[0.65rem]">
                <span>{t("orders.summary.totals.paid")}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {paymentCurrency === "RUB"
                    ? formatter.format(paymentAmount)
                    : `${paymentAmount.toFixed(2)} ${paymentCurrency}`}
                </span>
              </div>
            ) : null}
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
    shipping: PropTypes.shape({
      provider: PropTypes.string,
      serviceName: PropTypes.string,
      price: PropTypes.number,
      eta: PropTypes.shape({
        daysMin: PropTypes.number,
        daysMax: PropTypes.number,
      }),
      trackingNumber: PropTypes.string,
      type: PropTypes.string,
      pvz: PropTypes.shape({
        code: PropTypes.string,
        name: PropTypes.string,
        address: PropTypes.string,
        postalCode: PropTypes.string,
        city: PropTypes.string,
      }),
    }),
    total: PropTypes.number,
    customer: PropTypes.shape({
      name: PropTypes.string,
      email: PropTypes.string,
    }),
    payment: PropTypes.shape({
      status: PropTypes.string,
      paidAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      amount: PropTypes.number,
      currency: PropTypes.string,
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
