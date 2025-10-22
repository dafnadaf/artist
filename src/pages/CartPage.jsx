import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import CartItem from "../components/CartItem";
import OrderSummary from "../components/OrderSummary";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { createOrder } from "../services/ordersApi";
import Seo from "../components/Seo";

const SHIPPING_OPTIONS = [
  { value: "standard", price: 0 },
  { value: "courier", price: 25 },
  { value: "express", price: 45 },
  { value: "international", price: 95 },
];

const mapOrderErrorToKey = (message) => {
  if (!message) {
    return "cartPage.errors.submit";
  }

  const normalized = message.toLowerCase();

  if (message === "userId is required") {
    return "cartPage.errors.authRequired";
  }

  if (message === "At least one item is required") {
    return "cartPage.errors.noItems";
  }

  if (message === "Delivery address is required") {
    return "cartPage.errors.addressRequired";
  }

  if (normalized.includes("authentication")) {
    return "cartPage.errors.authRequired";
  }

  if (normalized.includes("permission")) {
    return "cartPage.errors.permission";
  }

  if (normalized.includes("userid")) {
    return "cartPage.errors.authRequired";
  }

  if (normalized.includes("address") && normalized.includes("required")) {
    return "cartPage.errors.addressRequired";
  }

  if (normalized.includes("at least one item") || normalized.includes("items is required")) {
    return "cartPage.errors.noItems";
  }

  return "cartPage.errors.submit";
};

function CartPage() {
  const { items, removeItem, updateQuantity, total, clear } = useCart();
  const { user, profile } = useAuth();
  const { t, i18n } = useTranslation();
  const [orderResult, setOrderResult] = useState(null);
  const [customerSnapshot, setCustomerSnapshot] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const orderSchema = useMemo(
    () =>
      z.object({
        name: z.string({ required_error: t("cartPage.errors.required") }).min(1, t("cartPage.errors.required")),
        email: z
          .string({ required_error: t("cartPage.errors.required") })
          .min(1, t("cartPage.errors.required"))
          .email(t("cartPage.errors.email")),
        address: z.string({ required_error: t("cartPage.errors.required") }).min(1, t("cartPage.errors.required")),
        shipping: z.enum(SHIPPING_OPTIONS.map((option) => option.value), {
          errorMap: () => ({ message: t("cartPage.errors.required") }),
        }),
      }),
    [t],
  );

  const defaultValues = useMemo(
    () => ({
      name: profile?.name ?? "",
      email: profile?.email ?? user?.email ?? "",
      address: "",
      shipping: SHIPPING_OPTIONS[0].value,
    }),
    [profile?.name, profile?.email, user?.email],
  );

  const {
    register: registerField,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues,
    mode: "onBlur",
  });

  useEffect(() => {
    reset((current) => ({
      ...current,
      name: current.name || defaultValues.name,
      email: current.email || defaultValues.email,
      shipping: current.shipping || defaultValues.shipping,
    }));
  }, [defaultValues.name, defaultValues.email, defaultValues.shipping, reset]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language === "ru" ? "ru-RU" : "en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [i18n.language],
  );

  const selectedShipping = watch("shipping");

  const shippingCost = useMemo(() => {
    const option = SHIPPING_OPTIONS.find((item) => item.value === selectedShipping);
    return option ? option.price : 0;
  }, [selectedShipping]);

  const grandTotal = useMemo(() => total + shippingCost, [total, shippingCost]);

  const onSubmit = async (values) => {
    if (!user) {
      setSubmitError(t("cartPage.errors.authRequired"));
      return;
    }

    setSubmitError("");
    const name = values.name.trim();
    const email = values.email.trim();
    const address = values.address.trim();

    const payload = {
      userId: user.uid,
      items: items.map((item) => ({
        workId: item.work.id,
        title: item.work.title,
        price: item.work.price,
        quantity: item.quantity,
      })),
      delivery: {
        type: values.shipping,
        address,
      },
      customer: {
        name: name || profile?.name || "",
        email: email || profile?.email || "",
      },
    };

    try {
      const order = await createOrder(payload);
      setOrderResult(order);
      setCustomerSnapshot(payload.customer);
      clear();
      reset({
        name: payload.customer.name,
        email: payload.customer.email,
        address: "",
        shipping: SHIPPING_OPTIONS[0].value,
      });
    } catch (error) {
      console.error("Failed to submit order", error);
      const apiMessage = error.response?.data?.message;
      setSubmitError(t(mapOrderErrorToKey(apiMessage)));
    }
  };

  return (
    <div className="flex flex-col gap-12">
      <Seo
        titleKey="seo.cart.title"
        descriptionKey="seo.cart.description"
        keywordsKey="seo.cart.keywords"
      />
      <header className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.4em] text-teal-400">
          {t("cartPage.tagline")}
        </span>
        <h1 className="text-4xl font-black uppercase tracking-[0.25em] text-slate-900 dark:text-slate-100">
          {t("cartPage.title")}
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          {t("cartPage.description")}
        </p>
      </header>

      {orderResult ? (
        <OrderSummary order={orderResult} currencyFormatter={currencyFormatter} customer={customerSnapshot} />
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-dashed border-slate-300/60 bg-white/70 px-12 py-16 text-center shadow-inner dark:border-slate-700/60 dark:bg-slate-900/60">
          <span className="text-lg font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            {t("cartPage.empty")}
          </span>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-3 rounded-full border border-teal-400/40 bg-white/70 px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-900 transition hover:border-teal-400 hover:bg-teal-400/20 dark:border-teal-400/40 dark:bg-slate-900/80 dark:text-slate-100"
          >
            {t("cartPage.returnToCatalog")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-12 lg:grid-cols-[7fr_5fr]">
          <section className="flex flex-col gap-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
              {t("cartPage.itemsHeading")}
            </h2>
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <CartItem
                  key={item.work.id}
                  item={item}
                  onRemove={removeItem}
                  onUpdateQuantity={updateQuantity}
                />
              ))}
            </ul>
          </section>
          <aside className="flex flex-col gap-8 rounded-3xl border border-slate-200/60 bg-white/70 p-8 shadow-2xl dark:border-slate-800/60 dark:bg-slate-900/70">
            <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
              {t("cartPage.checkoutHeading")}
            </h2>
            <form className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  {t("cartPage.form.name")}
                </label>
                <input
                  id="name"
                  type="text"
                  {...registerField("name", {
                    onChange: () => setSubmitError(""),
                  })}
                  className="rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-inner transition focus:border-teal-400 focus:outline-none dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-100"
                />
                {errors.name ? (
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-rose-400">{errors.name.message}</span>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  {t("cartPage.form.email")}
                </label>
                <input
                  id="email"
                  type="email"
                  {...registerField("email", {
                    onChange: () => setSubmitError(""),
                  })}
                  className="rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-inner transition focus:border-teal-400 focus:outline-none dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-100"
                />
                {errors.email ? (
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-rose-400">{errors.email.message}</span>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="address" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  {t("cartPage.form.address")}
                </label>
                <textarea
                  id="address"
                  rows={3}
                  {...registerField("address", {
                    onChange: () => setSubmitError(""),
                  })}
                  className="rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-inner transition focus:border-teal-400 focus:outline-none dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-100"
                />
                {errors.address ? (
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-rose-400">{errors.address.message}</span>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="shipping" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  {t("cartPage.form.shipping")}
                </label>
                <select
                  id="shipping"
                  {...registerField("shipping", {
                    onChange: () => setSubmitError(""),
                  })}
                  className="rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-inner transition focus:border-teal-400 focus:outline-none dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-100"
                >
                  {SHIPPING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(`cartPage.shippingOptions.${option.value}`)} ({currencyFormatter.format(option.price)})
                    </option>
                  ))}
                </select>
                {errors.shipping ? (
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-rose-400">{errors.shipping.message}</span>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-sm text-slate-600 shadow-inner dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.3em] text-xs text-slate-400 dark:text-slate-500">
                    {t("cartPage.summary.items")}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{currencyFormatter.format(total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.3em] text-xs text-slate-400 dark:text-slate-500">
                    {t("cartPage.summary.shipping")}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{currencyFormatter.format(shippingCost)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-slate-200/70 pt-3 dark:border-slate-700/70">
                  <span className="uppercase tracking-[0.3em] text-xs text-slate-400 dark:text-slate-500">
                    {t("cartPage.summary.total")}
                  </span>
                  <span className="text-lg font-black tracking-[0.2em] text-teal-400">
                    {currencyFormatter.format(grandTotal)}
                  </span>
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-3 rounded-full border border-teal-400/60 bg-teal-400/10 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-teal-400 transition hover:bg-teal-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-400/20 dark:text-teal-200 dark:hover:bg-teal-400/30 dark:focus-visible:ring-offset-slate-900"
                disabled={items.length === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-300 border-t-transparent" aria-hidden="true" />
                    {t("cartPage.loading")}
                  </span>
                ) : (
                  t("cartPage.submit")
                )}
              </button>
              {submitError ? (
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">{submitError}</p>
              ) : null}
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

export default CartPage;
