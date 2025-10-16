import PropTypes from "prop-types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const statusBadge = {
  new: "bg-sky-400/10 text-sky-300 border-sky-400/40",
  in_progress: "bg-amber-400/10 text-amber-300 border-amber-400/40",
  shipped: "bg-emerald-400/10 text-emerald-300 border-emerald-400/40",
};

function AdminOrderList({ orders, currencyFormatter, onRefresh }) {
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
            const shippingCost = order.delivery?.cost ?? 0;
            const grandTotal = itemsTotal + shippingCost;
            const status = order.status || "new";

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
                    <span>{t(`cartPage.shippingOptions.${order.delivery?.type || "standard"}`)}</span>
                    <span className="text-[0.6rem] text-slate-400 dark:text-slate-500">{order.delivery?.address}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 font-semibold ${statusBadge[status] || statusBadge.new}`}>
                    {t(`orders.status.${status}`, { defaultValue: status })}
                  </span>
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
  ).isRequired,
  currencyFormatter: PropTypes.instanceOf(Intl.NumberFormat),
  onRefresh: PropTypes.func,
};

AdminOrderList.defaultProps = {
  currencyFormatter: undefined,
  onRefresh: undefined,
};

export default AdminOrderList;
