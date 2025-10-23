import { Router } from "express";
import { body } from "express-validator";
import Order from "../models/Order.js";
import { verifyToken } from "../middleware/auth.js";
import validateRequest from "../middleware/validateRequest.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { sendTelegramMessage } from "../utils/telegramNotifier.js";
import yookassaProvider from "../payments/yookassa.js";
import { sendPaymentSuccess } from "../services/mailer.js";
import { buildReceipt } from "../services/pdf.js";

const router = Router();

function buildReturnUrl(orderId) {
  const base = process.env.APP_URL || "http://localhost:5173";

  try {
    const url = new URL(base);
    url.pathname = "/payment/success";
    url.searchParams.set("orderId", String(orderId));
    return url.toString();
  } catch {
    const sanitizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${sanitizedBase}/payment/success?orderId=${encodeURIComponent(orderId)}`;
  }
}

router.post(
  "/create",
  verifyToken,
  [
    body("orderId").isString().trim().notEmpty().withMessage("orderId is required"),
    body("provider").optional().isString().trim().toLowerCase(),
  ],
  validateRequest,
  async (request, response, next) => {
    try {
      const providerName = (request.body.provider || "yookassa").toLowerCase();

      if (providerName !== "yookassa") {
        return response.status(400).json({ message: "Unsupported payment provider" });
      }

      const order = await Order.findById(request.body.orderId);

      if (!order) {
        return response.status(404).json({ message: "Order not found" });
      }

      const isOwner = order.userId === request.user?.uid;
      const isAdmin = request.user?.roles?.includes("admin");

      if (!isOwner && !isAdmin) {
        return response.status(403).json({ message: "Insufficient permissions" });
      }

      if (order.payment?.status === "succeeded") {
        return response.status(409).json({ message: "Order already paid" });
      }

      const returnUrl = buildReturnUrl(order._id);
      const { confirmationUrl, paymentId } = await yookassaProvider.createPayment({
        order,
        returnUrl,
        requestId: request.id,
      });

      await recordAuditLog({
        actor: {
          uid: request.user?.uid,
          email: request.user?.email,
          roles: request.user?.roles,
        },
        action: "payment_created",
        entity: "order",
        entityId: String(order._id),
        metadata: { provider: "yookassa", paymentId },
        requestId: request.id,
      });

      return response.json({ confirmationUrl });
    } catch (error) {
      return next(error);
    }
  },
);

router.post("/yookassa/webhook", async (request, response) => {
  try {
    const result = await yookassaProvider.handleWebhook({ payload: request.body, requestId: request.id });

    if (!result?.handled) {
      response.status(200).send("OK");
      return;
    }

    const { order, event, verification } = result;
    const paymentId = verification?.payment?.id || request.body?.object?.id;

    if (!order) {
      response.status(200).send("OK");
      return;
    }

    if (event === "payment.succeeded") {
      await recordAuditLog({
        actor: { uid: "system" },
        action: "order_payment_succeeded",
        entity: "order",
        entityId: String(order._id),
        metadata: { provider: "yookassa", paymentId },
        requestId: request.id,
      });

      const message = [
        "💳 Оплата подтверждена",
        `Заказ № ${order.id || order._id}`,
        paymentId ? `Платёж: ${paymentId}` : null,
        order.total ? `Сумма: ${Number(order.total).toFixed(2)} ₽` : null,
      ]
        .filter(Boolean)
        .join("\n");

      sendTelegramMessage(message).catch(() => {});

      const email = order.customer?.email || order.shipping?.recipient?.email;
      if (email) {
        try {
          const pdf = await buildReceipt(order.toObject ? order.toObject() : order);
          await sendPaymentSuccess(email, order, pdf);
        } catch (error) {
          console.error("Failed to send payment success email", error);
        }
      }
    } else if (event === "payment.canceled") {
      await recordAuditLog({
        actor: { uid: "system" },
        action: "order_payment_canceled",
        entity: "order",
        entityId: String(order._id),
        metadata: { provider: "yookassa", paymentId },
        requestId: request.id,
      });

      const message = [
        "⚠️ Оплата отменена",
        `Заказ № ${order.id || order._id}`,
        paymentId ? `Платёж: ${paymentId}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      sendTelegramMessage(message).catch(() => {});
    }
  } catch (error) {
    console.error("Failed to process YooKassa webhook", error);
  }

  response.status(200).send("OK");
});

export default router;
