import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminOrderList from "../components/AdminOrderList";
import { fetchOrders } from "../services/ordersApi";
import Seo from "../components/Seo";
import PageLoader from "../components/PageLoader";

function AdminOrders() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language === "ru" ? "ru-RU" : "en-US", {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0,
      }),
    [i18n.language],
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const allOrders = await fetchOrders();
      setOrders(allOrders);
    } catch (loadError) {
      console.error("Failed to fetch admin orders", loadError);
      if (axios.isAxiosError(loadError) && loadError.response?.status >= 500) {
        navigate("/500", { state: { from: location.pathname } });
        return;
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <section className="space-y-10">
      <Seo
        titleKey="seo.adminOrders.title"
        descriptionKey="seo.adminOrders.description"
        keywordsKey="seo.adminOrders.keywords"
      />
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-fuchsia-400">{t("orders.admin.tagline")}</p>
        <h1 className="text-3xl font-black uppercase tracking-[0.35em] text-slate-900 dark:text-slate-100">
          {t("orders.admin.title")}
        </h1>
        <p className="max-w-4xl text-sm uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300">
          {t("orders.admin.description")}
        </p>
      </header>

      {loading ? (
        <PageLoader labelKey="orders.admin.loading" />
      ) : error ? (
        <div className="rounded-3xl border border-rose-400/40 bg-rose-400/10 p-8 text-center text-xs font-semibold uppercase tracking-[0.35em] text-rose-400 dark:border-rose-500/30 dark:bg-rose-500/10">
          {t("orders.admin.error")}
        </div>
      ) : (
        <AdminOrderList orders={orders} currencyFormatter={currencyFormatter} onRefresh={loadOrders} />
      )}
    </section>
  );
}

export default AdminOrders;
