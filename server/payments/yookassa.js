import { v4 as uuid } from "uuid";
import YooKassa from "yookassa";
import PaymentProvider from "./provider.js";
import Order from "../models/Order.js";
import { calculateOrderTotal } from "../utils/orderTotals.js";
import verifyPaymentNotification from "./yookassaVerifier.js";

const SHOP_ID = process.env.YK_SHOP_ID || process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YK_SECRET || process.env.YOOKASSA_SECRET_KEY;

function createClient() {
  if (!SHOP_ID || !SECRET_KEY) {
    throw new Error("YooKassa credentials are not configured");
  }

  return new YooKassa({ shopId: SHOP_ID, secretKey: SECRET_KEY });
}

const ADVANCED_STATUSES = new Set(["in_progress", "shipped", "delivered"]);

function appendHistory(order, status, note) {
  if (!order.history) {
    order.history = [];
  }

  order.history.push({
    at: new Date(),
    status,
    note,
  });
}

class YooKassaProvider extends PaymentProvider {
  constructor({ client, verifier } = {}) {
    super();
    this.client = client || null;
    this.verifier = verifier || verifyPaymentNotification;
  }

  getClient() {
    if (this.client) {
      return this.client;
    }

    this.client = createClient();
    return this.client;
  }

  async createPayment({ order, returnUrl, requestId }) {
    if (!order) {
      throw new Error("order is required to create a payment");
    }

    const total = calculateOrderTotal(order);

    if (!Number.isFinite(total) || total <= 0) {
      throw new Error("Order total must be greater than zero");
    }

    const client = this.getClient();
    const idempotenceKey = uuid();
    const payment = await client.createPayment(
      {
        amount: { value: total.toFixed(2), currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: returnUrl },
        description: `Order ${order._id}`,
        metadata: { orderId: String(order._id) },
      },
      idempotenceKey,
    );

    const confirmationUrl = payment?.confirmation?.confirmation_url;

    if (!confirmationUrl) {
      throw new Error("Failed to obtain confirmation URL from YooKassa");
    }

    const paymentAmount = Number.parseFloat(payment?.amount?.value ?? total);
    const paymentCurrency = payment?.amount?.currency || "RUB";

    order.payment = {
      ...(order.payment || {}),
      provider: "yookassa",
      status: "awaiting",
      externalId: payment.id,
      amount: Number.isFinite(paymentAmount) ? paymentAmount : total,
      currency: paymentCurrency,
    };

    const previousStatus = order.status;
    if (previousStatus !== "awaiting_payment") {
      order.status = "awaiting_payment";
      appendHistory(order, "awaiting_payment", `Оплата инициирована через YooKassa (${payment.id})`);
    }

    await order.save();

    return {
      confirmationUrl,
      paymentId: payment.id,
      order,
      requestId,
    };
  }

  async handleWebhook({ payload, requestId }) {
    if (!payload) {
      return { handled: false };
    }

    const verification = await this.verifier(payload).catch((error) => {
      console.error("Failed to verify YooKassa notification", error);
      return { isValid: false };
    });

    if (!verification?.isValid) {
      return { handled: false };
    }

    const orderId =
      verification.orderId || payload?.object?.metadata?.orderId || payload?.object?.metadata?.order_id;

    if (!orderId) {
      return { handled: false, reason: "order_missing" };
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return { handled: false, reason: "order_not_found" };
    }

    const paymentId = verification.payment?.id || payload?.object?.id;
    const paymentStatus = verification.status || payload?.object?.status;
    const event = payload?.event || null;

    order.payment = {
      ...(order.payment || {}),
      provider: "yookassa",
      externalId: paymentId || order.payment?.externalId,
      amount: Number.isFinite(verification.amount) ? verification.amount : order.payment?.amount,
      currency: verification.currency || order.payment?.currency || "RUB",
      status: order.payment?.status || "awaiting",
    };

    let statusChanged = false;
    let paymentStatusChanged = false;
    let historyNote = "";

    if (event === "payment.succeeded" || paymentStatus === "succeeded") {
      if (order.payment.status !== "succeeded") {
        paymentStatusChanged = true;
      }

      order.payment.status = "succeeded";
      const paidAtSource =
        verification.payment?.captured_at || verification.payment?.created_at || payload?.object?.captured_at;
      order.payment.paidAt = paidAtSource ? new Date(paidAtSource) : new Date();

      if (!ADVANCED_STATUSES.has(order.status) && order.status !== "paid") {
        statusChanged = true;
        order.status = "paid";
      }

      historyNote = `Оплата подтверждена провайдером YooKassa (${paymentId})`;
    } else if (event === "payment.canceled" || paymentStatus === "canceled") {
      if (order.payment.status !== "canceled") {
        paymentStatusChanged = true;
      }

      order.payment.status = "canceled";
      delete order.payment.paidAt;

      if (!ADVANCED_STATUSES.has(order.status) && order.status !== "canceled") {
        statusChanged = true;
        order.status = "canceled";
      }

      historyNote = `Оплата отменена провайдером YooKassa (${paymentId || "неизвестно"})`;
    } else {
      return { handled: false, reason: "unsupported_event" };
    }

    if (historyNote && (statusChanged || paymentStatusChanged)) {
      appendHistory(order, order.status, historyNote);
    }

    await order.save();

    return {
      handled: true,
      event,
      order,
      requestId,
      statusChanged,
      paymentStatusChanged,
      verification,
    };
  }
}

const defaultProvider = new YooKassaProvider();

export { YooKassaProvider, calculateOrderTotal };
export default defaultProvider;
