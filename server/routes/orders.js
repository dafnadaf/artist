import { Router } from "express";
import rateLimit from "express-rate-limit";
import { body, param } from "express-validator";
import Order from "../models/Order.js";
import { checkRole, requireSelfOrRole, verifyToken } from "../middleware/auth.js";
import validateRequest from "../middleware/validateRequest.js";
import { sendTelegramMessage } from "../utils/telegramNotifier.js";
import { SUPPORTED_PROVIDERS } from "../shipping/index.js";
import { sendOrderCreated } from "../services/mailer.js";
import { calculateOrderTotal } from "../utils/orderTotals.js";

const router = Router();

const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request) => request.user?.uid || request.ip,
  handler: (_request, response) => {
    response.status(429).json({ message: "Too many orders in a short period" });
  },
});

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const hasUnsafeKeys = (value) => Object.keys(value || {}).some((key) => key.startsWith("$") || key.includes("."));

const sanitizeItems = (items = []) =>
  items
    .filter((item) => item && item.workId && item.title)
    .map((item) => {
      const price = Number.parseFloat(item.price);
      const quantity = Number.parseInt(item.quantity, 10);

      return {
        workId: String(item.workId),
        title: String(item.title),
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      };
    });

const createOrderValidations = [
  body("userId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("userId is required")
    .bail()
    .custom((value) => {
      if (value.includes("$") || value.includes(".")) {
        throw new Error("userId contains invalid characters");
      }

      return true;
    }),
  body("items").isArray({ min: 1 }).withMessage("At least one item is required"),
  body("items.*.workId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("workId is required")
    .bail()
    .custom((value) => {
      if (value.includes("$") || value.includes(".")) {
        throw new Error("workId contains invalid characters");
      }

      return true;
    }),
  body("items.*.title").isString().trim().notEmpty().withMessage("Item title is required"),
  body("items.*.price").isFloat({ min: 0 }).withMessage("Item price must be a number"),
  body("items.*.quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("shipping")
    .custom((value) => {
      if (!isPlainObject(value) || hasUnsafeKeys(value)) {
        throw new Error("Shipping details are required");
      }

      return true;
    })
    .withMessage("Shipping details are required"),
  body("shipping.provider")
    .isString()
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage("Shipping provider is required")
    .bail()
    .custom((value) => SUPPORTED_PROVIDERS.includes(value))
    .withMessage("Invalid shipping provider"),
  body("shipping.type")
    .optional()
    .isIn(["pickup", "courier"])
    .withMessage("Invalid shipping type"),
  body("shipping.price")
    .isFloat({ min: 0 })
    .withMessage("Shipping price must be a non-negative number")
    .toFloat(),
  body("shipping.serviceName").optional().isString().trim(),
  body("shipping.tariffCode").optional().customSanitizer((value) => value),
  body("shipping.recipient")
    .custom((value) => {
      if (!isPlainObject(value) || hasUnsafeKeys(value)) {
        throw new Error("Shipping recipient is required");
      }

      return true;
    })
    .withMessage("Shipping recipient is required"),
  body("shipping.recipient.name").isString().trim().notEmpty().withMessage("Recipient name is required"),
  body("shipping.recipient.phone").isString().trim().notEmpty().withMessage("Recipient phone is required"),
  body("shipping.recipient.email")
    .optional()
    .isEmail()
    .withMessage("Recipient email must be valid")
    .normalizeEmail(),
  body("shipping.recipient.address")
    .custom((value) => {
      if (!isPlainObject(value) || hasUnsafeKeys(value)) {
        throw new Error("Recipient address is required");
      }

      return true;
    })
    .withMessage("Recipient address is required"),
  body("shipping.recipient.address.postal_code")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Recipient postal code is required"),
  body("shipping.recipient.address.address")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Recipient address line is required"),
  body("shipping.recipient.address.city").optional().isString().trim(),
  body("shipping.recipient.address.country_code").optional().isString().trim(),
  body("shipping.pvz")
    .optional()
    .custom((value, { req }) => {
      if (req.body?.shipping?.type === "pickup" && !value) {
        throw new Error("PVZ details are required for pickup shipments");
      }

      if (!value) {
        return true;
      }

      if (!isPlainObject(value) || hasUnsafeKeys(value)) {
        throw new Error("PVZ must be a plain object");
      }

      if (!value.code) {
        throw new Error("PVZ code is required");
      }

      return true;
    }),
  body("shipping.eta.daysMin").optional().isInt({ min: 0 }).toInt(),
  body("shipping.eta.daysMax").optional().isInt({ min: 0 }).toInt(),
  body("shipping.trackingNumber").optional().isString().trim(),
  body("shipping.labelUrl").optional().isString().trim(),
  body("customer")
    .optional()
    .custom((value) => {
      if (!isPlainObject(value) || hasUnsafeKeys(value)) {
        throw new Error("Customer must be a plain object");
      }

      return true;
    }),
  body("customer.email").optional().isEmail().withMessage("Customer email must be valid"),
  body("customer.name").optional().isString().trim().isLength({ min: 1 }).withMessage("Customer name must be a string"),
  body("status")
    .optional()
    .isIn(["new", "in_progress", "shipped", "delivered", "canceled"])
    .withMessage("Invalid status"),
  body("total")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Total must be a non-negative number")
    .toFloat(),
];

const userIdParamValidation = [
  param("userId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("userId parameter is required")
    .bail()
    .custom((value) => {
      if (value.includes("$") || value.includes(".")) {
        throw new Error("userId parameter contains invalid characters");
      }

      return true;
    }),
];

router.post(
  "/",
  verifyToken,
  createOrderLimiter,
  createOrderValidations,
  validateRequest,
  requireSelfOrRole((request) => request.body.userId, "admin"),
  async (request, response, next) => {
    try {
      const { userId, items, shipping: shippingInput, customer, status } = request.body || {};

      const normalizedItems = sanitizeItems(items);
      const sanitizedRecipient = {
        name: shippingInput?.recipient?.name?.trim?.() ?? "",
        phone: shippingInput?.recipient?.phone?.trim?.() ?? "",
        email: shippingInput?.recipient?.email?.trim?.() || undefined,
        address: {
          postal_code: shippingInput?.recipient?.address?.postal_code?.trim?.() ?? "",
          address: shippingInput?.recipient?.address?.address?.trim?.() ?? "",
          country_code: shippingInput?.recipient?.address?.country_code?.trim?.() || "RU",
          city: shippingInput?.recipient?.address?.city?.trim?.() || undefined,
        },
      };
      const parsedShippingPrice = Number(shippingInput?.price);
      const shippingPrice = Number.isFinite(parsedShippingPrice) && parsedShippingPrice >= 0 ? parsedShippingPrice : 0;
      const provider = shippingInput?.provider?.trim?.().toLowerCase?.() || shippingInput?.provider;
      const sanitizedPvz =
        shippingInput?.pvz && isPlainObject(shippingInput.pvz)
          ? {
              code: shippingInput.pvz.code?.toString().trim?.() || String(shippingInput.pvz.code || ""),
              name: shippingInput.pvz.name?.toString().trim?.(),
              address: shippingInput.pvz.address?.toString().trim?.(),
              postalCode: shippingInput.pvz.postalCode?.toString().trim?.(),
              city: shippingInput.pvz.city?.toString().trim?.(),
              schedule: shippingInput.pvz.schedule?.toString().trim?.(),
              location: shippingInput.pvz.location
                ? {
                    lat: Number.isFinite(Number(shippingInput.pvz.location.lat))
                      ? Number(shippingInput.pvz.location.lat)
                      : undefined,
                    lon: Number.isFinite(Number(shippingInput.pvz.location.lon))
                      ? Number(shippingInput.pvz.location.lon)
                      : undefined,
                  }
                : undefined,
              features: shippingInput.pvz.features
                ? {
                    cash: Boolean(shippingInput.pvz.features.cash),
                    cashless: Boolean(shippingInput.pvz.features.cashless),
                    fitting: Boolean(shippingInput.pvz.features.fitting),
                  }
                : undefined,
            }
          : undefined;
      const sanitizedShipping = {
        provider,
        type: shippingInput?.type === "pickup" ? "pickup" : "courier",
        serviceName: shippingInput?.serviceName?.trim?.() || undefined,
        tariffCode: shippingInput?.tariffCode,
        price: shippingPrice,
        eta:
          shippingInput?.eta?.daysMin || shippingInput?.eta?.daysMax
            ? {
                daysMin: shippingInput?.eta?.daysMin ?? undefined,
                daysMax: shippingInput?.eta?.daysMax ?? undefined,
              }
            : undefined,
        recipient: sanitizedRecipient,
        trackingNumber: shippingInput?.trackingNumber?.trim?.() || undefined,
        labelUrl: shippingInput?.labelUrl?.trim?.() || undefined,
        pvz: sanitizedPvz,
      };

      const normalizedStatus =
        request.user.roles?.includes("admin") && status ? status : "new";

      const orderPayload = {
        userId: userId.trim(),
        items: normalizedItems,
        shipping: sanitizedShipping,
        customer:
          customer?.name || customer?.email
            ? {
                name: customer?.name?.trim?.() || undefined,
                email: customer?.email?.trim?.() || undefined,
              }
            : sanitizedRecipient.name || sanitizedRecipient.email
              ? {
                  name: sanitizedRecipient.name,
                  email: sanitizedRecipient.email,
                }
              : undefined,
        status: normalizedStatus,
      };

      orderPayload.total = calculateOrderTotal(orderPayload);
      orderPayload.history = [
        {
          at: new Date(),
          status: normalizedStatus,
          note: `Создан заказ со службой ${sanitizedShipping.provider}${sanitizedShipping.type === "pickup" ? " (самовывоз)" : ""}`,
        },
      ];

      const order = await Order.create(orderPayload);

      const orderTotal = orderPayload.total;
      const customerName = orderPayload.customer?.name || "не указано";
      const customerEmail = orderPayload.customer?.email || "не указано";
      const shippingName = sanitizedShipping.serviceName || sanitizedShipping.provider;
      const trackingNumber = sanitizedShipping.trackingNumber || "без трека";
      const pvzSummary = sanitizedShipping.type === "pickup" && sanitizedShipping.pvz?.code
        ? `ПВЗ: ${sanitizedShipping.pvz.code} ${sanitizedShipping.pvz.address || ""}`.trim()
        : null;

      const messageLines = [
        "🆕 Новый заказ",
        `№ ${order.id}`,
        `Клиент: ${customerName}${customerEmail ? ` (${customerEmail})` : ""}`,
        `Позиций: ${order.items.length}`,
        `Сумма: ${orderTotal.toFixed(2)} ₽ (доставка ${shippingPrice.toFixed(2)} ₽ ${shippingName})`,
        `Трек: ${trackingNumber}`,
        ...(pvzSummary ? [pvzSummary] : []),
      ];

      sendTelegramMessage(messageLines.join("\n")).catch(() => {});

      const notificationEmail = order.customer?.email || order.shipping?.recipient?.email;
      if (notificationEmail) {
        sendOrderCreated(notificationEmail, order).catch(() => {});
      }

      return response.status(201).json(order);
    } catch (error) {
      return next(error);
    }
  },
);

router.get("/", verifyToken, checkRole("admin"), async (request, response, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    return response.json(orders);
  } catch (error) {
    return next(error);
  }
});

router.get(
  "/detail/:orderId",
  verifyToken,
  [
    param("orderId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("orderId parameter is required"),
  ],
  validateRequest,
  async (request, response, next) => {
    try {
      const order = await Order.findById(request.params.orderId).lean();

      if (!order) {
        return response.status(404).json({ message: "Order not found" });
      }

      const isOwner = order.userId === request.user?.uid;
      const isAdmin = request.user?.roles?.includes("admin");

      if (!isOwner && !isAdmin) {
        return response.status(403).json({ message: "Insufficient permissions" });
      }

      return response.json(order);
    } catch (error) {
      return next(error);
    }
  },
);

router.get(
  "/:userId",
  verifyToken,
  userIdParamValidation,
  validateRequest,
  requireSelfOrRole((request) => request.params.userId, "admin"),
  async (request, response, next) => {
    try {
      const orders = await Order.find({ userId: request.params.userId }).sort({ createdAt: -1 }).lean();
      return response.json(orders);
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
