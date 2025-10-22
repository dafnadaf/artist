import { Router } from "express";
import rateLimit from "express-rate-limit";
import { body, param } from "express-validator";
import Order from "../models/Order.js";
import { checkRole, requireSelfOrRole, verifyToken } from "../middleware/auth.js";
import validateRequest from "../middleware/validateRequest.js";
import { sendTelegramMessage } from "../utils/telegramNotifier.js";
import {
  DEFAULT_DELIVERY_TYPE,
  getDeliveryPrice,
  isSupportedDeliveryType,
  normalizeDeliveryType,
} from "../utils/deliveryPricing.js";

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
  body("delivery")
    .custom((value) => {
      if (!isPlainObject(value) || hasUnsafeKeys(value)) {
        throw new Error("Delivery details are required");
      }

      return true;
    })
    .withMessage("Delivery details are required"),
  body("delivery.address").isString().trim().notEmpty().withMessage("Delivery address is required"),
  body("delivery.type")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Delivery type is required")
    .bail()
    .custom((value) => {
      if (!isSupportedDeliveryType(value)) {
        throw new Error("Invalid delivery type");
      }

      return true;
    }),
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
    .isIn(["new", "in_progress", "shipped"])
    .withMessage("Invalid status"),
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
      const { userId, items, delivery, customer, status } = request.body || {};

      const normalizedItems = sanitizeItems(items);
      const deliveryType = isSupportedDeliveryType(delivery?.type)
        ? normalizeDeliveryType(delivery?.type)
        : DEFAULT_DELIVERY_TYPE;
      const deliveryCost = getDeliveryPrice(deliveryType);
      const sanitizedDelivery = {
        type: deliveryType,
        address: delivery?.address?.trim?.() ?? "",
        cost: deliveryCost,
      };

      const orderPayload = {
        userId: userId.trim(),
        items: normalizedItems,
        delivery: sanitizedDelivery,
        customer:
          customer?.name || customer?.email
            ? {
                name: customer?.name?.trim?.() || undefined,
                email: customer?.email?.trim?.() || undefined,
              }
            : undefined,
        status: request.user.roles?.includes("admin") ? status : undefined,
      };

      const order = await Order.create(orderPayload);

      const subtotal = normalizedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const orderTotal = subtotal + sanitizedDelivery.cost;
      const customerName = orderPayload.customer?.name || "не указано";
      const customerEmail = orderPayload.customer?.email || "не указано";
      const messageLines = [
        "🆕 Новый заказ",
        `№ ${order.id}`,
        `Клиент: ${customerName}${customerEmail ? ` (${customerEmail})` : ""}`,
        `Позиций: ${order.items.length}`,
        `Сумма: ${orderTotal.toFixed(2)} (доставка ${sanitizedDelivery.cost.toFixed(2)} ${sanitizedDelivery.type})`,
      ];

      sendTelegramMessage(messageLines.join("\n")).catch(() => {});

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
