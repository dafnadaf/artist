import { Router } from "express";
import { body, param } from "express-validator";
import Order from "../models/Order.js";
import { checkRole, requireSelfOrRole, verifyToken } from "../middleware/auth.js";
import validateRequest from "../middleware/validateRequest.js";

const router = Router();

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
    }),
  body("delivery.address").isString().trim().notEmpty().withMessage("Delivery address is required"),
  body("delivery.type")
    .optional()
    .isIn(["standard", "express", "international", "pickup", "courier", "mail"])
    .withMessage("Invalid delivery type"),
  body("delivery.cost").optional().isFloat({ min: 0 }).withMessage("Delivery cost must be positive"),
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
  createOrderValidations,
  validateRequest,
  requireSelfOrRole((request) => request.body.userId, "admin"),
  async (request, response, next) => {
    try {
      const { userId, items, delivery, customer, status } = request.body || {};

      const normalizedItems = sanitizeItems(items);
      const sanitizedDelivery = {
        type: delivery?.type || "standard",
        address: delivery?.address?.trim?.() ?? "",
        cost: Number.isFinite(Number(delivery?.cost)) ? Number(delivery.cost) : 0,
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
