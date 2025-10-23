import { Suspense, lazy, useEffect, useMemo, useState } from "react";
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
import { createPaymentSession } from "../services/paymentsApi";
import { createShipment, fetchShippingQuotes } from "../services/shippingApi";
import Seo from "../components/Seo";
const PickupPointModal = lazy(() => import("../components/PickupPointModal.jsx"));

const ESTIMATED_ITEM_WEIGHT = 500; // grams
const DEFAULT_PACKAGE = { lengthCm: 70, widthCm: 15, heightCm: 10 };
const ORIGIN_POSTAL_CODE = import.meta.env.VITE_SHIPPING_ORIGIN_POSTAL_CODE || "101000";

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

  if (normalized.includes("authentication")) {
    return "cartPage.errors.authRequired";
  }

  if (normalized.includes("permission")) {
    return "cartPage.errors.permission";
  }

  if (normalized.includes("userid")) {
    return "cartPage.errors.authRequired";
  }

  if (normalized.includes("at least one item") || normalized.includes("items is required")) {
    return "cartPage.errors.noItems";
  }

  if (normalized.includes("shipping quote")) {
    return "cartPage.errors.shippingQuote";
  }

  if (normalized.includes("shipping price")) {
    return "cartPage.errors.shippingQuote";
  }

  if (normalized.includes("shipping") && normalized.includes("required")) {
    return "cartPage.errors.shippingRequired";
  }

  if (normalized.includes("pickup") || normalized.includes("pvz")) {
    return "cartPage.errors.pickupPoint";
  }

  if (normalized.includes("payment")) {
    return "cartPage.errors.paymentInit";
  }

  return "cartPage.errors.submit";
};

function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    total,
    clear,
    shippingQuote,
    setShippingQuote,
    pickupPoint,
    setPickupPoint,
  } = useCart();
  const { user, profile } = useAuth();
  const { t, i18n } = useTranslation();
  const [orderResult, setOrderResult] = useState(null);
  const [customerSnapshot, setCustomerSnapshot] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [quotes, setQuotes] = useState([]);
  const [quoteError, setQuoteError] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [pickupModalProvider, setPickupModalProvider] = useState("cdek");

  const openPickupModal = (provider) => {
    setPickupModalProvider(provider);
    setPickupModalOpen(true);
  };

  const closePickupModal = () => setPickupModalOpen(false);

  const handlePickupButtonClick = (event, provider) => {
    event.preventDefault();
    event.stopPropagation();
    openPickupModal(provider);
  };

  const orderSchema = useMemo(
    () =>
      z.object({
        name: z.string({ required_error: t("cartPage.errors.required") }).min(1, t("cartPage.errors.required")),
        phone: z
          .string({ required_error: t("cartPage.errors.required") })
          .min(5, t("cartPage.errors.required")),
        email: z
          .string()
          .trim()
          .optional()
          .transform((value) => value || undefined)
          .refine((value) => !value || z.string().email().safeParse(value).success, {
            message: t("cartPage.errors.email"),
          }),
        postalCode: z
          .string({ required_error: t("cartPage.errors.required") })
          .trim()
          .min(4, t("cartPage.errors.required")),
        city: z.string({ required_error: t("cartPage.errors.required") }).min(1, t("cartPage.errors.required")),
        address: z.string({ required_error: t("cartPage.errors.required") }).min(1, t("cartPage.errors.required")),
      }),
    [t],
  );

  const defaultValues = useMemo(
    () => ({
      name: profile?.name ?? "",
      phone: profile?.phone ?? "",
      email: profile?.email ?? user?.email ?? "",
      postalCode: "",
      city: "",
      address: "",
    }),
    [profile?.name, profile?.email, profile?.phone, user?.email],
  );

  const {
    register: registerField,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
    trigger,
  } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues,
    mode: "onBlur",
  });

  useEffect(() => {
    reset((current) => ({
      ...current,
      name: current.name || defaultValues.name,
      phone: current.phone || defaultValues.phone,
      email: current.email || defaultValues.email,
      postalCode: current.postalCode || defaultValues.postalCode,
      city: current.city || defaultValues.city,
      address: current.address || defaultValues.address,
    }));
  }, [
    defaultValues.name,
    defaultValues.email,
    defaultValues.phone,
    defaultValues.postalCode,
    defaultValues.city,
    defaultValues.address,
    reset,
  ]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language === "ru" ? "ru-RU" : "en-US", {
        style: "currency",
        currency: "RUB",
        maximumFractionDigits: 0,
      }),
    [i18n.language],
  );

  const rubFormatter = currencyFormatter;

  const recipientValues = watch();

  const estimatedWeight = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * ESTIMATED_ITEM_WEIGHT, 0),
    [items],
  );

  const shippingCost = shippingQuote?.price ?? 0;
  const requiresPickupPoint = shippingQuote?.type === "pickup";
  const pickupSelectionMissing =
    requiresPickupPoint && (!pickupPoint || pickupPoint.provider !== shippingQuote.provider);

  const grandTotal = useMemo(() => total + shippingCost, [total, shippingCost]);

  const handleSelectQuote = (quoteKey) => {
    const quote = quotes.find((item) => item.__key === quoteKey);
    if (quote) {
      setShippingQuote(quote);
      setSubmitError("");
    }
  };

  const buildQuotePayload = (values) => ({
    from: { postalCode: ORIGIN_POSTAL_CODE },
    to: { postalCode: values.postalCode },
    weightGrams: Math.max(estimatedWeight || ESTIMATED_ITEM_WEIGHT, ESTIMATED_ITEM_WEIGHT),
    lengthCm: DEFAULT_PACKAGE.lengthCm,
    widthCm: DEFAULT_PACKAGE.widthCm,
    heightCm: DEFAULT_PACKAGE.heightCm,
  });

  const calculateShipping = async () => {
    const isValid = await trigger(["postalCode"]);
    if (!isValid) {
      return;
    }

    setQuoteLoading(true);
    setQuoteError("");

    try {
      const values = watch();
      const quotePayload = buildQuotePayload(values);
      const normalizeNumber = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };

      const receivedQuotes = await fetchShippingQuotes(quotePayload);
      const quotesWithKeys = receivedQuotes.map((quote, index) => {
        const type = quote.type || (quote.requiresPickupPoint ? "pickup" : "courier");
        return {
          ...quote,
          type,
          requiresPickupPoint: quote.requiresPickupPoint ?? type === "pickup",
          price: normalizeNumber(quote.price) ?? 0,
          daysMin: normalizeNumber(quote.daysMin ?? quote.meta?.daysMin ?? quote.meta?.period_min),
          daysMax: normalizeNumber(quote.daysMax ?? quote.meta?.daysMax ?? quote.meta?.period_max),
          __key: `${quote.provider}:${quote.tariffCode ?? quote.serviceName ?? index}`,
        };
      });
      setQuotes(quotesWithKeys);

      if (quotesWithKeys.length === 0) {
        setShippingQuote(null);
        setPickupPoint(null);
        setQuoteError(t("cartPage.errors.noQuotes"));
        return;
      }

      if (!quotesWithKeys.some((quote) => quote.__key === shippingQuote?.__key)) {
        setShippingQuote(quotesWithKeys[0]);
      }
    } catch (error) {
      console.error("Failed to fetch shipping quotes", error);
      setQuoteError(t("cartPage.errors.quoteFailed"));
      setShippingQuote(null);
      setPickupPoint(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  const onSubmit = async (values) => {
    if (!user) {
      setSubmitError(t("cartPage.errors.authRequired"));
      return;
    }

    if (!shippingQuote) {
      setSubmitError(t("cartPage.errors.shippingRequired"));
      return;
    }

    if (shippingQuote.type === "pickup") {
      if (!pickupPoint || pickupPoint.provider !== shippingQuote.provider) {
        setSubmitError(t("cartPage.errors.pickupPoint"));
        return;
      }
    }

    if (!items.length) {
      setSubmitError(t("cartPage.errors.noItems"));
      return;
    }

    setSubmitError("");

    const trimmedName = values.name.trim();
    const trimmedPhone = values.phone.trim();
    const trimmedEmail = values.email?.trim?.() || "";
    const trimmedAddress = values.address.trim();
    const trimmedCity = values.city.trim();
    const trimmedPostal = values.postalCode.trim();

    const recipient = {
      name: trimmedName || profile?.name || "",
      phone: trimmedPhone,
      email: trimmedEmail || profile?.email || undefined,
      address: {
        postal_code: trimmedPostal,
        city: trimmedCity,
        address: trimmedAddress,
        country_code: "RU",
      },
    };

    try {
      const { __key: _quoteKey, ...quoteForRequest } = shippingQuote;
      const shipmentItems = items.map((item) => ({
        name: item.work.title?.[i18n.language] || item.work.title || "Artwork",
        price: item.work.price,
        qty: item.quantity,
      }));

      const pickupPayload =
        shippingQuote.type === "pickup"
          ? {
              ...pickupPoint,
              provider: shippingQuote.provider,
            }
          : undefined;

      const shipment = await createShipment({
        quote: quoteForRequest,
        recipient,
        items: shipmentItems,
        pickupPoint: pickupPayload
          ? {
              code: pickupPayload.code,
              name: pickupPayload.name,
              address: pickupPayload.address,
              postalCode: pickupPayload.postalCode,
              city: pickupPayload.city,
              schedule: pickupPayload.schedule,
              location: pickupPayload.location,
              features: pickupPayload.features,
              meta: pickupPayload.meta,
            }
          : undefined,
      });

      const orderPayload = {
        userId: user.uid,
        items: items.map((item) => ({
          workId: String(item.work.id),
          title: item.work.title,
          price: item.work.price,
          quantity: item.quantity,
        })),
        shipping: {
          provider: quoteForRequest.provider,
          type: quoteForRequest.type || (shippingQuote.type === "pickup" ? "pickup" : "courier"),
          serviceName: quoteForRequest.serviceName,
          tariffCode: quoteForRequest.tariffCode,
          price: quoteForRequest.price,
          eta: {
            daysMin: quoteForRequest.daysMin,
            daysMax: quoteForRequest.daysMax,
          },
          pvz: pickupPayload
            ? {
                code: pickupPayload.code,
                name: pickupPayload.name,
                address: pickupPayload.address,
                postalCode: pickupPayload.postalCode,
                city: pickupPayload.city,
                schedule: pickupPayload.schedule,
                location: pickupPayload.location,
                features: pickupPayload.features,
              }
            : undefined,
          recipient,
          trackingNumber: shipment?.trackingNumber || "",
          labelUrl: shipment?.labelUrl,
        },
        total: grandTotal,
      };

      try {
        const order = await createOrder(orderPayload);
        setOrderResult(order);
        setCustomerSnapshot({ name: recipient.name, email: recipient.email });

        try {
          const { confirmationUrl } = await createPaymentSession({
            orderId: order._id,
            provider: "yookassa",
          });

          if (confirmationUrl) {
            clear();
            setShippingQuote(null);
            setPickupPoint(null);
            setQuotes([]);
            reset({
              name: recipient.name,
              phone: trimmedPhone,
              email: recipient.email || "",
              postalCode: "",
              city: "",
              address: "",
            });
            window.location.href = confirmationUrl;
            return;
          }

          setSubmitError(t("cartPage.errors.paymentInit"));
        } catch (paymentError) {
          console.error("Failed to initiate payment", paymentError);
          const apiMessage = paymentError.response?.data?.message || paymentError.message;
          setSubmitError(apiMessage ? t(mapOrderErrorToKey(apiMessage)) : t("cartPage.errors.paymentInit"));
        }
      } catch (error) {
        console.error("Failed to submit order", error);
        const apiMessage = error.response?.data?.message;
        setSubmitError(t(mapOrderErrorToKey(apiMessage)));
      }
    } catch (error) {
      console.error("Failed to create shipment", error);
      const apiMessage = error.response?.data?.message || error.message;
      setSubmitError(apiMessage ? t(mapOrderErrorToKey(apiMessage)) : t("cartPage.errors.shippingQuote"));
    }
  };

  return (
    <>
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
                <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  {t("cartPage.form.phone")}
                </label>
                <input
                  id="phone"
                  type="tel"
                  {...registerField("phone", {
                    onChange: () => setSubmitError(""),
                  })}
                  className="rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-inner transition focus:border-teal-400 focus:outline-none dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-100"
                />
                {errors.phone ? (
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-rose-400">{errors.phone.message}</span>
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
                <label htmlFor="postalCode" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  {t("cartPage.form.postalCode")}
                </label>
                <input
                  id="postalCode"
                  type="text"
                  inputMode="numeric"
                  {...registerField("postalCode", {
                    onChange: () => setSubmitError(""),
                  })}
                  className="rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-inner transition focus:border-teal-400 focus:outline-none dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-100"
                />
                {errors.postalCode ? (
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-rose-400">{errors.postalCode.message}</span>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="city" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  {t("cartPage.form.city")}
                </label>
                <input
                  id="city"
                  type="text"
                  {...registerField("city", {
                    onChange: () => setSubmitError(""),
                  })}
                  className="rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-inner transition focus:border-teal-400 focus:outline-none dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-100"
                />
                {errors.city ? (
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-rose-400">{errors.city.message}</span>
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
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-inner dark:border-slate-700/70 dark:bg-slate-900/60">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      {t("cartPage.form.shippingQuote")}
                    </span>
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                      {t("cartPage.form.shippingHint")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={calculateShipping}
                    disabled={quoteLoading || !recipientValues.postalCode || items.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-400/60 bg-teal-400/10 px-5 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-teal-400 transition hover:bg-teal-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-400/20 dark:text-teal-200 dark:hover:bg-teal-400/30 dark:focus-visible:ring-offset-slate-900"
                  >
                    {quoteLoading ? t("cartPage.form.loadingQuote") : t("cartPage.form.calculate")}
                  </button>
                </div>
                {quoteError ? (
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-rose-400">{quoteError}</p>
                ) : null}
                {quotes.length ? (
                  <div className="flex flex-col gap-3">
                    {quotes.map((quote) => {
                      const isSelected = shippingQuote?.__key === quote.__key;
                      const isPickup = quote.type === "pickup";
                      const hasPickupPoint =
                        isPickup && pickupPoint && pickupPoint.provider === quote.provider;
                      return (
                        <div
                          key={quote.__key}
                          className={`flex flex-col gap-3 rounded-xl border px-4 py-3 text-[0.65rem] uppercase tracking-[0.3em] transition ${
                            isSelected
                              ? "border-teal-400/80 bg-teal-400/10 text-teal-500 dark:border-teal-300/60 dark:bg-teal-300/10 dark:text-teal-200"
                              : "border-slate-200/70 bg-white/70 text-slate-500 hover:border-teal-300/60 hover:text-teal-400 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-300"
                          }`}
                        >
                          <label className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-3 text-[0.65rem] font-semibold uppercase tracking-[0.35em]">
                              <input
                                type="radio"
                                name="shippingQuote"
                                value={quote.__key}
                                checked={isSelected}
                                onChange={() => handleSelectQuote(quote.__key)}
                                className="h-4 w-4 accent-teal-400"
                              />
                              {quote.serviceName || t(`shipping.providers.${quote.provider}`)}
                            </span>
                            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.3em]">
                              {rubFormatter.format(quote.price)}
                            </span>
                          </label>
                          <div className="flex flex-wrap items-center gap-3 text-[0.55rem] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                            {quote.daysMin || quote.daysMax ? (
                              <span>
                                {quote.daysMax
                                  ? t("cartPage.form.eta", { min: quote.daysMin ?? quote.daysMax, max: quote.daysMax })
                                  : t("cartPage.form.etaSingle", { days: quote.daysMin })}
                              </span>
                            ) : null}
                            <span className="font-medium uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
                              {t(`cartPage.shippingTypes.${quote.type || "courier"}`)}
                            </span>
                          </div>
                          {isPickup ? (
                            <div className="rounded-lg border border-dashed border-teal-400/40 bg-teal-400/5 p-3 text-[0.55rem] uppercase tracking-[0.3em] text-teal-400 dark:border-teal-300/40 dark:bg-teal-300/10 dark:text-teal-200">
                              {hasPickupPoint ? (
                                <div className="flex flex-col gap-1 text-left">
                                  <span className="font-semibold tracking-[0.35em] text-teal-300 dark:text-teal-200">
                                    {t("cartPage.pickup.selected")}
                                  </span>
                                  <span>{pickupPoint.name}</span>
                                  <span className="text-[0.5rem] uppercase tracking-[0.3em] text-teal-200/80">
                                    {pickupPoint.address}
                                  </span>
                                  {pickupPoint.schedule ? (
                                    <span className="text-[0.5rem] uppercase tracking-[0.3em] text-teal-200/60">
                                      {pickupPoint.schedule}
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={(event) => handlePickupButtonClick(event, quote.provider)}
                                    className="mt-2 inline-flex w-max items-center gap-2 rounded-full border border-teal-300/60 px-3 py-1 text-[0.5rem] font-semibold uppercase tracking-[0.35em] text-teal-200 transition hover:border-white/60 hover:text-white"
                                  >
                                    {t("cartPage.pickup.change")}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center justify-between gap-3 text-left">
                                  <span className="text-[0.5rem] uppercase tracking-[0.3em] text-teal-200/80">
                                    {t("cartPage.pickup.prompt")}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(event) => handlePickupButtonClick(event, quote.provider)}
                                    className="inline-flex items-center gap-2 rounded-full border border-teal-300/60 px-3 py-1 text-[0.5rem] font-semibold uppercase tracking-[0.35em] text-teal-200 transition hover:border-white/60 hover:text-white"
                                  >
                                    {t("cartPage.pickup.select")}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
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
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {shippingQuote ? currencyFormatter.format(shippingCost) : t("cartPage.summary.tbd")}
                  </span>
                </div>
                {shippingQuote?.type === "pickup" && pickupPoint && pickupPoint.provider === shippingQuote.provider ? (
                  <div className="rounded-xl border border-dashed border-teal-400/40 bg-teal-400/10 p-3 text-[0.6rem] uppercase tracking-[0.3em] text-teal-400 dark:border-teal-300/40 dark:bg-teal-300/10 dark:text-teal-200">
                    <span className="block font-semibold tracking-[0.35em] text-teal-300 dark:text-teal-100">
                      {t("cartPage.pickup.summary")}
                    </span>
                    <span className="block text-[0.55rem] tracking-[0.3em] text-teal-200/90">{pickupPoint.name}</span>
                    <span className="block text-[0.5rem] tracking-[0.3em] text-teal-200/70">{pickupPoint.address}</span>
                  </div>
                ) : null}
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
                disabled={
                  items.length === 0 ||
                  isSubmitting ||
                  !shippingQuote ||
                  pickupSelectionMissing
                }
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
      <Suspense fallback={null}>
        <PickupPointModal
          provider={pickupModalProvider}
          isOpen={pickupModalOpen}
          onClose={closePickupModal}
          onSelect={(point) => {
            if (point) {
              setPickupPoint({ ...point, provider: pickupModalProvider });
              setSubmitError("");
            }
          }}
        />
      </Suspense>
    </>
  );
}

export default CartPage;
