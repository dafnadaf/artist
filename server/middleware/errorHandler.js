import { sendTelegramMessage } from "../utils/telegramNotifier.js";

export default function errorHandler(error, request, response) {
  console.error("Unhandled error:", error);

  const status = error.status || 500;
  const message = error.message || "Internal server error";
  const route = `${request.method} ${request.originalUrl}`;

  const now = new Date();
  const date = now.toLocaleDateString("ru-RU");
  const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const timestamp = `${date} ${time}`;

  const notification = `❗️Ошибка API: ${route} — ${status} ${message}, ${timestamp}`;

  sendTelegramMessage(notification).catch(() => {});

  response.status(status).json({ message });
}
