import cron from "node-cron";
import Order from "../models/Order.js";
import { trackShipment } from "../shipping/index.js";
import { sendTelegramMessage } from "../utils/telegramNotifier.js";
import { recordAuditLog } from "../utils/auditLogger.js";

const DEFAULT_SCHEDULE = "*/10 * * * *";
let taskInstance = null;

const normalizeText = (value) => String(value || "").toLowerCase();

const mapTrackingHistory = (history = []) =>
  history
    .map((entry) => {
      const rawDate = entry.date || entry.date_time || entry.datetime || entry.time;
      const parsedDate = rawDate ? new Date(rawDate) : undefined;
      const date = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;
      return {
        code: entry.code || entry.status_code || null,
        name: entry.name || entry.status_name || entry.state || null,
        description: entry.description || entry.status_description || entry.state_description || null,
        date,
        city: entry.city || entry.location || entry.location_city || null,
      };
    })
    .filter((entry) => entry.code || entry.name || entry.description);

const inferOrderStatus = (status) => {
  if (!status) {
    return null;
  }

  const code = normalizeText(status.code);
  const name = normalizeText(status.name);
  const description = normalizeText(status.description);
  const haystack = `${code} ${name} ${description}`;

  if (haystack.includes("cancel")) {
    return "canceled";
  }

  if (haystack.includes("deliver") || haystack.includes("deliv") || haystack.includes("вруч")) {
    return "delivered";
  }

  if (haystack.includes("transit") || haystack.includes("в пути") || haystack.includes("достав")) {
    return "shipped";
  }

  if (haystack.includes("accept") || haystack.includes("принят")) {
    return "in_progress";
  }

  return null;
};

async function refreshOrder(order) {
  if (!order.shipping?.trackingNumber) {
    return;
  }

  try {
    const tracking = await trackShipment(order.shipping.provider, order.shipping.trackingNumber);
    if (!tracking) {
      return;
    }

    const history = mapTrackingHistory(tracking.history);
    const rawStatusDate =
      tracking.status?.date || tracking.status?.date_time || tracking.status?.datetime || tracking.status?.time;
    const parsedStatusDate = rawStatusDate ? new Date(rawStatusDate) : undefined;
    const statusDate = parsedStatusDate && !Number.isNaN(parsedStatusDate.getTime()) ? parsedStatusDate : undefined;
    const latestStatus = tracking.status
      ? {
          code: tracking.status.code || null,
          name: tracking.status.name || tracking.status.description || null,
          description: tracking.status.description || tracking.status.name || null,
          date: statusDate,
          city: tracking.status.city,
        }
      : null;

    const nextOrderStatus = inferOrderStatus(latestStatus);
    const updates = {
      "shipping.status": latestStatus,
      "shipping.history": history,
    };

    const updatePayload = { $set: updates };
    let statusChanged = false;

    if (nextOrderStatus && nextOrderStatus !== order.status) {
      statusChanged = true;
      updatePayload.$set.status = nextOrderStatus;
      updatePayload.$push = {
        history: {
          at: new Date(),
          status: nextOrderStatus,
          note: latestStatus?.description || latestStatus?.name || "Статус обновлён",
        },
      };
    }

    await Order.updateOne({ _id: order._id }, updatePayload).exec();

    if (statusChanged) {
      const message = [
        "ℹ️ Обновление доставки",
        `Заказ № ${order.id || order._id}`,
        `Статус: ${nextOrderStatus}`,
        order.shipping?.trackingNumber ? `Трек: ${order.shipping.trackingNumber}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      sendTelegramMessage(message).catch(() => {});

      await recordAuditLog({
        actor: { uid: "system" },
        action: "order_status_changed",
        entity: "order",
        entityId: String(order._id),
        metadata: {
          status: nextOrderStatus,
          provider: order.shipping?.provider,
          trackingNumber: order.shipping?.trackingNumber,
        },
      });
    }
  } catch (error) {
    console.error(`Failed to refresh shipping for order ${order._id}`, error);
  }
}

async function runShippingRefresh() {
  const orders = await Order.find({
    status: { $in: ["in_progress", "shipped"] },
    "shipping.trackingNumber": { $exists: true, $ne: "" },
  })
    .select("_id id status shipping")
    .lean();

  await Promise.all(orders.map((order) => refreshOrder(order)));
}

export function startShippingRefreshJob() {
  if (process.env.SHIPPING_REFRESH_DISABLED === "true") {
    return null;
  }

  if (taskInstance) {
    return taskInstance;
  }

  const schedule = process.env.SHIPPING_REFRESH_CRON || DEFAULT_SCHEDULE;
  taskInstance = cron.schedule(schedule, () => {
    runShippingRefresh().catch((error) => {
      console.error("Shipping refresh job failed", error);
    });
  });

  runShippingRefresh().catch((error) => {
    console.error("Initial shipping refresh failed", error);
  });

  return taskInstance;
}

export function stopShippingRefreshJob() {
  if (taskInstance) {
    taskInstance.stop();
    taskInstance = null;
  }
}
