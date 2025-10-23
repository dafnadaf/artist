import axios from "axios";

const RP_HOST = process.env.RP_HOST || "https://otpravka.pochta.ru";
const RP_APP_TOKEN = process.env.RP_APP_TOKEN;
const RP_USER_LOGIN = process.env.RP_USER_LOGIN;
const RP_USER_PASSWORD = process.env.RP_USER_PASSWORD;

const isConfigured = () => Boolean(RP_APP_TOKEN && RP_USER_LOGIN && RP_USER_PASSWORD);

function rpHeaders() {
  if (!isConfigured()) {
    throw new Error("Russian Post credentials are not configured");
  }

  const basic = Buffer.from(`${RP_USER_LOGIN}:${RP_USER_PASSWORD}`).toString("base64");

  return {
    "Content-Type": "application/json;charset=UTF-8",
    Authorization: `AccessToken ${RP_APP_TOKEN}`,
    "X-User-Authorization": `Basic ${basic}`,
  };
}

async function getQuote({ from = {}, to = {}, weightGrams, price = 0 }) {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
    throw new Error("Russian Post quote requires a positive weight in grams");
  }

  const headers = rpHeaders();
  const payload = {
    "index-from": from.postalCode,
    "index-to": to.postalCode,
    mass: Math.round(weightGrams),
    "mail-type": "POSTAL_PARCEL",
    "mail-category": "ORDINARY",
    "declared-value": Number.isFinite(price) ? Math.round(price * 100) : 0,
  };

  const { data } = await axios.post(`${RP_HOST}/1.0/tariff`, payload, { headers });

  return [
    {
      provider: "russianpost",
      serviceName: "Почта России",
      price: Number(data?.total_rate) / 100 || 0,
      daysMin: data?.delivery_time_min,
      daysMax: data?.delivery_time_max,
      meta: data,
    },
  ];
}

const russianPostProvider = {
  name: "russianpost",
  isConfigured,
  getQuote,
};

export default russianPostProvider;
