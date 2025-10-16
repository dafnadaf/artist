import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ChatBox from "../components/ChatBox";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function Dashboard() {
  const { t, i18n } = useTranslation();
  const { profile, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);

  const locale = useMemo(() => (i18n.language === "ru" ? "ru-RU" : "en-US"), [i18n.language]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchOrders = async () => {
      if (!user?.uid) {
        setOrders([]);
        setOrdersLoading(false);
        return;
      }

      setOrdersLoading(true);
      setOrdersError(false);

      try {
        const response = await api.get(`/orders/${user.uid}`);
        if (!cancelled) {
          setOrders(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error("Failed to load dashboard orders", error);
        if (!cancelled) {
          setOrdersError(true);
        }
      } finally {
        if (!cancelled) {
          setOrdersLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const displayName = profile?.name || user?.displayName || "";
  const email = profile?.email || user?.email || "";
  const uid = user?.uid || "";

  const visibleOrders = orders.slice(0, 3);

  const statusBadgeClasses = {
    new: "border-sky-400/40 bg-sky-400/10 text-sky-300",
    in_progress: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    shipped: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  };

  return (
    <section className="space-y-10">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.45em] text-teal-400">{t("dashboardPage.tagline")}</p>
        <h1 className="text-3xl font-black uppercase tracking-[0.45em] text-slate-900 dark:text-white">{t("dashboard")}</h1>
        <p className="max-w-3xl text-sm uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">
          {displayName ? t("dashboardPage.welcomeNamed", { name: displayName }) : t("dashboardPage.welcomeAnonymous")}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4 rounded-3xl border border-slate-200/70 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/80">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">
            {t("dashboardPage.profile.heading")}
          </h2>
          <dl className="space-y-3 text-xs uppercase tracking-[0.3em] text-slate-700 dark:text-slate-200">
            <div className="flex justify-between gap-4">
              <dt>{t("dashboardPage.profile.name")}</dt>
              <dd className="text-right text-slate-900 dark:text-white">{displayName || t("dashboardPage.profile.missing")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{t("dashboardPage.profile.email")}</dt>
              <dd className="text-right text-slate-900 dark:text-white">{email || t("dashboardPage.profile.missing")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{t("dashboardPage.profile.uid")}</dt>
              <dd className="break-all text-right text-slate-900 dark:text-white">{uid || t("dashboardPage.profile.missing")}</dd>
            </div>
          </dl>
        </section>
        <section className="space-y-4 rounded-3xl border border-slate-200/70 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/80">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">
              {t("dashboardPage.orders.heading")}
            </h2>
            <Link
              to="/dashboard/orders"
              className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-teal-400 transition hover:text-teal-300"
            >
              {t("dashboardPage.orders.viewAll")}
            </Link>
          </div>
          {ordersLoading ? (
            <p className="text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
              {t("dashboardPage.orders.loading")}
            </p>
          ) : ordersError ? (
            <p className="text-xs uppercase tracking-[0.3em] text-rose-400">{t("dashboardPage.orders.error")}</p>
          ) : visibleOrders.length === 0 ? (
            <p className="text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
              {t("dashboardPage.orders.empty")}
            </p>
          ) : (
            <ul className="space-y-4">
              {visibleOrders.map((order) => {
                const itemsTotal = order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0;
                const shippingCost = order.delivery?.cost ?? 0;
                const totalCost = itemsTotal + shippingCost;
                const status = order.status || "new";

                return (
                  <li
                    key={order._id}
                    className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-inner transition hover:border-teal-400/60 hover:shadow-xl dark:border-slate-800/60 dark:bg-slate-900/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
                      <span>{t("orders.card.orderId", { id: order._id ? order._id.slice(-6).toUpperCase() : t("orders.summary.pendingId") })}</span>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 font-semibold ${statusBadgeClasses[status] || statusBadgeClasses.new}`}>
                        {t(`orders.status.${status}`, { defaultValue: status })}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      <span>
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString(locale, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : t("orders.summary.pendingDate")}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {currencyFormatter.format(totalCost)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="grid gap-6 rounded-3xl border border-slate-200/70 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/80 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">
            {t("dashboardPage.chat.heading")}
          </h2>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
            {t("dashboardPage.chat.description")}
          </p>
          <div className="rounded-2xl border border-dashed border-slate-300/60 p-4 text-[0.7rem] uppercase tracking-[0.35em] text-slate-500 dark:border-slate-700/80 dark:text-slate-400">
            {t("dashboardPage.chat.helper")}
          </div>
        </div>
        <div className="min-h-[320px]">
          <ChatBox chatId={uid} senderRole="user" />
        </div>
      </section>
    </section>
  );
}

export default Dashboard;
