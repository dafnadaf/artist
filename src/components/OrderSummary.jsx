import PropTypes from "prop-types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const statusStyles = {
  new: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  awaiting_payment: "border-violet-400/40 bg-violet-400/10 text-violet-300",
  paid: "border-teal-400/40 bg-teal-400/10 text-teal-300",
  in_progress: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  shipped: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  delivered: "border-lime-400/40 bg-lime-400/10 text-lime-300",
  canceled: "border-rose-400/40 bg-rose-400/10 text-rose-300",
};

function OrderSummary({ order, currencyFormatter, customer }) {
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

  if (!order) {
    return null;
  }

  const itemsTotal = order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0;
  const shipping = order.shipping || {};
  const shippingCost = shipping.price ?? order.delivery?.cost ?? 0;
  const grandTotal = order.total ?? itemsTotal + shippingCost;
  const status = order.status || "new";
  const statusClassName = statusStyles[status] || statusStyles.new;
  const shippingStatus = shipping.status;
  const shippingTypeLabel = shipping.type ? t(`cartPage.shippingTypes.${shipping.type}`, { defaultValue: shipping.type }) : null;
  const paymentStatus = order.payment?.status;
  const paymentStatusLabel = paymentStatus
    ? t(`orders.paymentStatus.${paymentStatus}`, { defaultValue: paymentStatus })
    : null;
  const paymentDate = order.payment?.paidAt ? new Date(order.payment.paidAt) : null;
  const paymentAmount = Number.isFinite(Number(order.payment?.amount)) ? Number(order.payment.amount) : null;
  const paymentCurrency = order.payment?.currency || "RUB";

  const formatEta = () => {
    if (!shipping?.eta) {
      return null;
    }

    const { daysMin, daysMax } = shipping.eta;
    if (!daysMin && !daysMax) {
      return null;
    }

    if (daysMin && daysMax && daysMin !== daysMax) {
      return t("orders.summary.etaRange", { min: daysMin, max: daysMax });
    }

    return t("orders.summary.etaSingle", { days: daysMin || daysMax });
  };

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
              <span className="text-slate-400 dark:text-slate-500">{t("orders.summary.shippingProvider")}</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {shipping.serviceName || t(`shipping.providers.${shipping.provider || "cdek"}`)}
              </span>
              {shippingTypeLabel ? (
                <span className="text-[0.6rem] font-medium uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  {t("orders.summary.shippingType", { type: shippingTypeLabel })}
                </span>
              ) : null}
              <span className="text-[0.6rem] font-medium uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                {formatEta() || t("orders.summary.etaUnknown")}
              </span>
              {shipping.pvz ? (
                <div className="mt-1 space-y-1 text-[0.6rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-400 dark:text-slate-300">
                    {t("orders.summary.pickupPoint")}
                  </span>
                  <span className="text-slate-500 dark:text-slate-300">{shipping.pvz.name}</span>
                  <span className="text-[0.55rem] text-slate-500 dark:text-slate-400">{shipping.pvz.address}</span>
                </div>
              ) : null}
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
                {shipping.recipient?.address?.address || shipping.recipient?.address || order.delivery?.address}
              </span>
              {shipping.recipient?.address?.postal_code ? (
                <span className="text-[0.6rem] font-medium uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  {shipping.recipient.address.postal_code}
                </span>
              ) : null}
            </div>
            {shipping.trackingNumber ? (
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 dark:text-slate-500">{t("orders.summary.tracking")}</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{shipping.trackingNumber}</span>
                {shipping.labelUrl ? (
                  <a
                    href={shipping.labelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-teal-500 hover:text-teal-300"
                  >
                    {t("orders.summary.downloadLabel")}
                  </a>
                ) : null}
              </div>
            ) : null}
            {shippingStatus ? (
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 dark:text-slate-500">{t("orders.summary.currentStatus")}</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {shippingStatus.name || shippingStatus.description}
                </span>
                <span className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  {shippingStatus.date ? dateFormatter.format(new Date(shippingStatus.date)) : ""}
                </span>
              </div>
            ) : null}
            {paymentStatusLabel ? (
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 dark:text-slate-500">{t("orders.summary.paymentStatusLabel")}</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{paymentStatusLabel}</span>
                {paymentDate ? (
                  <span className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    {dateFormatter.format(paymentDate)}
                  </span>
                ) : null}
              </div>
            ) : null}
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
            {paymentAmount !== null ? (
              <div className="flex items-center justify-between">
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
    </section>
  );
}

OrderSummary.propTypes = {
  order: PropTypes.shape({
    _id: PropTypes.string,
    status: PropTypes.string,
    createdAt: PropTypes.string,
    shipping: PropTypes.shape({
      provider: PropTypes.string,
      type: PropTypes.string,
      serviceName: PropTypes.string,
      tariffCode: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      price: PropTypes.number,
      eta: PropTypes.shape({
        daysMin: PropTypes.number,
        daysMax: PropTypes.number,
      }),
      recipient: PropTypes.shape({
        name: PropTypes.string,
        phone: PropTypes.string,
        email: PropTypes.string,
        address: PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.shape({
            postal_code: PropTypes.string,
            address: PropTypes.string,
            city: PropTypes.string,
            country_code: PropTypes.string,
          }),
        ]),
      }),
      trackingNumber: PropTypes.string,
      labelUrl: PropTypes.string,
      status: PropTypes.shape({
        code: PropTypes.string,
        name: PropTypes.string,
        description: PropTypes.string,
        date: PropTypes.string,
      }),
      pvz: PropTypes.shape({
        code: PropTypes.string,
        name: PropTypes.string,
        address: PropTypes.string,
        postalCode: PropTypes.string,
        city: PropTypes.string,
        schedule: PropTypes.string,
        location: PropTypes.shape({
          lat: PropTypes.number,
          lon: PropTypes.number,
        }),
        features: PropTypes.shape({
          cash: PropTypes.bool,
          cashless: PropTypes.bool,
          fitting: PropTypes.bool,
        }),
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
