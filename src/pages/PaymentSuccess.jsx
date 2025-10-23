import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import PageLoader from "../components/PageLoader";
import OrderSummary from "../components/OrderSummary";
import { fetchOrderById } from "../services/ordersApi";

function PaymentSuccess() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      if (!orderId) {
        setLoading(false);
        setError(true);
        return;
      }

      setLoading(true);
      setError(false);

      try {
        const fetched = await fetchOrderById(orderId);
        if (!cancelled) {
          setOrder(fetched);
        }
      } catch (loadError) {
        console.error("Failed to load order for payment success", loadError);
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const isPaid = useMemo(() => {
    if (!order) {
      return false;
    }

    const orderStatus = order.status;
    const paymentStatus = order.payment?.status;
    return orderStatus === "paid" || paymentStatus === "succeeded";
  }, [order]);

  if (loading) {
    return <PageLoader labelKey="paymentSuccess.loading" />;
  }

  return (
    <section className="space-y-8">
      <Seo
        titleKey="seo.paymentSuccess.title"
        descriptionKey="seo.paymentSuccess.description"
        keywordsKey="seo.paymentSuccess.keywords"
      />
      <header className="space-y-4 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-teal-400">{t("paymentSuccess.tagline")}</p>
        <h1 className="text-3xl font-black uppercase tracking-[0.35em] text-slate-900 dark:text-slate-100">
          {isPaid ? t("paymentSuccess.title") : t("paymentSuccess.pendingTitle")}
        </h1>
        <p className="mx-auto max-w-2xl text-sm uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300">
          {isPaid ? t("paymentSuccess.description") : t("paymentSuccess.pendingDescription")}
        </p>
      </header>

      {error ? (
        <div className="rounded-3xl border border-rose-400/40 bg-rose-400/10 p-8 text-center text-xs font-semibold uppercase tracking-[0.35em] text-rose-400 dark:border-rose-500/40 dark:bg-rose-500/10">
          {t("paymentSuccess.error")}
        </div>
      ) : order ? (
        <OrderSummary order={order} customer={{ name: order.customer?.name, email: order.customer?.email }} />
      ) : (
        <div className="rounded-3xl border border-amber-400/40 bg-amber-400/10 p-8 text-center text-xs font-semibold uppercase tracking-[0.35em] text-amber-400 dark:border-amber-500/40 dark:bg-amber-500/10">
          {t("paymentSuccess.notFound")}
        </div>
      )}

      <div className="flex justify-center">
        <Link
          to="/dashboard/orders"
          className="inline-flex items-center gap-3 rounded-full border border-teal-400/60 bg-teal-400/10 px-6 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-teal-400 transition hover:bg-teal-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 dark:bg-teal-400/20 dark:text-teal-200 dark:hover:bg-teal-400/30 dark:focus-visible:ring-offset-slate-900"
        >
          {t("paymentSuccess.viewOrders")}
        </Link>
      </div>
    </section>
  );
}

export default PaymentSuccess;
