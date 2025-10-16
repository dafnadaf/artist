import { Router } from "express";
import Order from "../models/Order.js";

const router = Router();

const sanitizeItems = (items = []) =>
  items
    .filter((item) => item && item.workId && item.title)
    .map((item) => ({
      workId: String(item.workId),
      title: String(item.title),
      price: Number.isFinite(item.price) ? Number(item.price) : 0,
      quantity: Number.isFinite(item.quantity) && Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    }));

router.post("/", async (request, response, next) => {
  try {
    const { userId, items, delivery, customer, status } = request.body || {};

    if (!userId) {
      return response.status(400).json({ message: "userId is required" });
    }

    const normalizedItems = sanitizeItems(items);

    if (normalizedItems.length === 0) {
      return response.status(400).json({ message: "At least one item is required" });
    }

    const deliveryType = delivery?.type || "standard";
    const address = typeof delivery?.address === "string" ? delivery.address.trim() : "";
    const customerName = typeof customer?.name === "string" ? customer.name.trim() : undefined;
    const customerEmail = typeof customer?.email === "string" ? customer.email.trim() : undefined;

    const orderPayload = {
      userId,
      items: normalizedItems,
      delivery: {
        type: deliveryType,
        address,
        cost: Number.isFinite(delivery?.cost) ? Number(delivery.cost) : 0,
      },
      customer:
        customerName || customerEmail
          ? {
              name: customerName,
              email: customerEmail,
            }
          : undefined,
      status: status && ["new", "in_progress", "shipped"].includes(status) ? status : undefined,
    };

    if (!orderPayload.delivery.address) {
      return response.status(400).json({ message: "Delivery address is required" });
    }

    const order = await Order.create(orderPayload);
    return response.status(201).json(order);
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (request, response, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    return response.json(orders);
  } catch (error) {
    return next(error);
  }
});

router.get("/:userId", async (request, response, next) => {
  try {
    const orders = await Order.find({ userId: request.params.userId }).sort({ createdAt: -1 }).lean();
    return response.json(orders);
  } catch (error) {
    return next(error);
  }
});

export default router;
