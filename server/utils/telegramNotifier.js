import axios from "axios";

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured");
}

const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

export async function sendTelegramMessage(text) {
  if (!text || typeof text !== "string") {
    return;
  }

  try {
    await axios.post(telegramApiUrl, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
    });
  } catch (error) {
    const responseData = error.response?.data;
    console.error("Failed to send Telegram notification:", responseData || error.message);
  }
}
