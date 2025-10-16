import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import OrderCard from "../components/OrderCard";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function OrderHistory() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language === "ru" ? "ru-RU" : "en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [i18n.language],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchOrders = async () => {
      if (!user?.uid) {
        setLoading(false);
        setOrders([]);
        return;
      }

      setLoading(true);
      setError(false);

      try {
        const response = await api.get(`/orders/${user.uid}`);
        if (!cancelled) {
          setOrders(Array.isArray(response.data) ? response.data : []);
        }
      } catch (fetchError) {
        console.error("Failed to load orders", fetchError);
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return (
    <section className="space-y-10">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-teal-400">{t("orders.history.tagline")}</p>
        <h1 className="text-3xl font-black uppercase tracking-[0.35em] text-slate-900 dark:text-slate-100">
          {t("orders.history.title")}
        </h1>
        <p className="max-w-3xl text-sm uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300">
          {t("orders.history.description")}
        </p>
      </header>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            {t("orders.history.loading")}
          </p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-400/40 bg-rose-400/10 p-8 text-center text-xs font-semibold uppercase tracking-[0.35em] text-rose-400 dark:border-rose-500/30 dark:bg-rose-500/10">
          {t("orders.history.error")}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300/60 bg-white/80 p-10 text-center text-xs uppercase tracking-[0.35em] text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-400">
          {t("orders.history.empty")}
        </div>
      ) : (
        <div className="grid gap-8">
          {orders.map((order) => (
            <OrderCard key={order._id} order={order} currencyFormatter={currencyFormatter} />
          ))}
        </div>
      )}
    </section>
  );
}

export default OrderHistory;
