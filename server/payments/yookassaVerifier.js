import axios from "axios";

const API_BASE = process.env.YOOKASSA_API_BASE || "https://api.yookassa.ru/v3";
const SHOP_ID = process.env.YK_SHOP_ID || process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YK_SECRET || process.env.YOOKASSA_SECRET_KEY;

function getAuthHeader() {
  if (!SHOP_ID || !SECRET_KEY) {
    throw new Error("YooKassa credentials are not configured");
  }

  const token = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString("base64");
  return `Basic ${token}`;
}

export async function fetchPayment(paymentId) {
  if (!paymentId) {
    throw new Error("paymentId is required");
  }

  const url = `${API_BASE}/payments/${paymentId}`;
  const { data } = await axios.get(url, {
    headers: {
      Authorization: getAuthHeader(),
      "Idempotence-Key": `verify-${paymentId}`,
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });

  return data;
}

export async function verifyPaymentNotification(payload) {
  if (!payload?.object?.id) {
    return { isValid: false };
  }

  const payment = await fetchPayment(payload.object.id);

  if (!payment) {
    return { isValid: false };
  }

  return {
    isValid: true,
    payment,
    orderId: payment.metadata?.orderId || payment.metadata?.order_id || null,
    status: payment.status,
    amount: payment.amount?.value ? Number.parseFloat(payment.amount.value) : null,
    currency: payment.amount?.currency || null,
  };
}

export default verifyPaymentNotification;
