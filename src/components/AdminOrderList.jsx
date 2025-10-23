import PropTypes from "prop-types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const statusVisuals = {
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

function AdminOrderList({ orders, currencyFormatter, onRefresh }) {
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

  if (!orders.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300/60 bg-white/70 p-10 text-center text-xs uppercase tracking-[0.35em] text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-400">
        {t("orders.admin.empty")}
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="ml-4 inline-flex items-center rounded-full border border-slate-300/60 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-700 transition hover:border-teal-400 hover:text-teal-400 dark:border-slate-700 dark:text-slate-200"
          >
            {t("orders.admin.refresh")}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200/60 bg-white/80 shadow-2xl dark:border-slate-800/60 dark:bg-slate-950/80">
      <table className="min-w-full divide-y divide-slate-200/60 text-left text-[0.65rem] uppercase tracking-[0.3em] text-slate-500 dark:divide-slate-800/60 dark:text-slate-300">
        <thead className="bg-slate-100/60 dark:bg-slate-900/40">
          <tr>
            <th className="px-6 py-4 font-semibold">{t("orders.admin.table.order")}</th>
            <th className="px-6 py-4 font-semibold">{t("orders.admin.table.customer")}</th>
            <th className="px-6 py-4 font-semibold">{t("orders.admin.table.items")}</th>
            <th className="px-6 py-4 font-semibold">{t("orders.admin.table.delivery")}</th>
            <th className="px-6 py-4 font-semibold">{t("orders.admin.table.status")}</th>
            <th className="px-6 py-4 font-semibold text-right">{t("orders.admin.table.total")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40">
          {orders.map((order) => {
            const itemsTotal = order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0;
            const shipping = order.shipping || {};
            const shippingCost = shipping.price ?? order.delivery?.cost ?? 0;
            const grandTotal = order.total ?? itemsTotal + shippingCost;
            const status = order.status || "new";
            const statusStyle = statusVisuals[status] || statusVisuals.new;
            const paymentStatus = order.payment?.status;
            const paymentStatusLabel = paymentStatus
              ? t(`orders.paymentStatus.${paymentStatus}`, { defaultValue: paymentStatus })
              : null;
            const etaText = shipping.eta
              ? shipping.eta.daysMin && shipping.eta.daysMax && shipping.eta.daysMin !== shipping.eta.daysMax
                ? t("orders.summary.etaRange", { min: shipping.eta.daysMin, max: shipping.eta.daysMax })
                : t("orders.summary.etaSingle", { days: shipping.eta.daysMin || shipping.eta.daysMax })
              : null;
            const shippingTypeLabel = shipping.type
              ? t(`cartPage.shippingTypes.${shipping.type}`, { defaultValue: shipping.type })
              : null;

            return (
              <tr key={order._id} className="transition hover:bg-teal-400/5 dark:hover:bg-teal-400/10">
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-2 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {t("orders.card.orderId", {
                        id: order._id ? order._id.slice(-6).toUpperCase() : t("orders.summary.pendingId"),
                      })}
                    </span>
                    <span>{order.createdAt ? dateFormatter.format(new Date(order.createdAt)) : t("orders.summary.pendingDate")}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-2 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{order.customer?.name || "—"}</span>
                    <span className="lowercase text-slate-500 dark:text-slate-400">{order.customer?.email || ""}</span>
                    <span className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">{order.userId}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    {order.items?.map((item) => (
                      <li key={`${order._id}-${item.workId}`} className="flex items-center justify-between gap-3">
                        <span className="text-[0.6rem] font-medium uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                          {item.title}
                        </span>
                        <span className="text-[0.6rem] text-slate-400 dark:text-slate-500">× {item.quantity}</span>
                        <span className="text-[0.6rem] font-semibold text-slate-900 dark:text-slate-100">
                          {formatter.format(item.price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-2 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {shipping.serviceName || t(`shipping.providers.${shipping.provider || "cdek"}`)}
                    </span>
                    {shippingTypeLabel ? (
                      <span className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
                        {t("orders.summary.shippingType", { type: shippingTypeLabel })}
                      </span>
                    ) : null}
                    {shipping.trackingNumber ? (
                      <span className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">
                        {shipping.trackingNumber}
                      </span>
                    ) : null}
                    {etaText ? (
                      <span className="text-[0.6rem] text-slate-400 dark:text-slate-500">{etaText}</span>
                    ) : null}
                    {shipping.pvz ? (
                      <div className="space-y-1 text-[0.6rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-400 dark:text-slate-300">
                          {t("orders.summary.pickupPoint")}
                        </span>
                        <span className="text-slate-500 dark:text-slate-300">{shipping.pvz.name}</span>
                        <span className="text-[0.55rem] text-slate-500 dark:text-slate-400">{shipping.pvz.address}</span>
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${statusStyle.badge}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${statusStyle.dot}`} aria-hidden="true" />
                    {t(`orders.status.${status}`, { defaultValue: status })}
                  </span>
                  {paymentStatusLabel ? (
                    <span className="mt-2 block text-[0.55rem] uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">
                      {t("orders.summary.paymentStatusShort", { status: paymentStatusLabel })}
                    </span>
                  ) : null}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                  {formatter.format(grandTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

AdminOrderList.propTypes = {
  orders: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      userId: PropTypes.string,
      status: PropTypes.string,
      createdAt: PropTypes.string,
      shipping: PropTypes.shape({
        provider: PropTypes.string,
        serviceName: PropTypes.string,
        tariffCode: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
    }),
  ).isRequired,
  currencyFormatter: PropTypes.instanceOf(Intl.NumberFormat),
  onRefresh: PropTypes.func,
};

AdminOrderList.defaultProps = {
  currencyFormatter: undefined,
  onRefresh: undefined,
};

export default AdminOrderList;
