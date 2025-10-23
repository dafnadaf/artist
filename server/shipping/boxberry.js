import axios from "axios";

const BOXBERRY_API = process.env.BOXBERRY_API || "https://api.boxberry.ru/json.php";
const BOXBERRY_TOKEN = process.env.BOXBERRY_TOKEN;

const isConfigured = () => Boolean(BOXBERRY_TOKEN);

async function call(method, params = {}) {
  if (!isConfigured()) {
    throw new Error("Boxberry token is not configured");
  }

  const url = new URL(BOXBERRY_API);
  url.searchParams.set("token", BOXBERRY_TOKEN);
  url.searchParams.set("method", method);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const { data } = await axios.get(url.toString());

  if (data?.err) {
    throw new Error(`Boxberry API error: ${data.err}`);
  }

  return data;
}

async function listPoints({ countryCode = 643, cityCode } = {}) {
  const params = { prepaid: 1, CountryCode: countryCode };
  if (cityCode) {
    params.CityCode = cityCode;
  }

  return call("ListPoints", params);
}

async function getQuote({ to = {}, weightGrams, price = 0 }) {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
    throw new Error("Boxberry quote requires a positive weight in grams");
  }

  const response = await call("DeliveryCosts", {
    weight: Math.round(weightGrams),
    target: to.postalCode || to.cityCode,
    ordersum: Number.isFinite(price) ? price : 0,
    type: 1,
  });

  const deliveryPrice = Number(response?.price) || 0;

  return [
    {
      provider: "boxberry",
      serviceName: response?.service_name || "Boxberry",
      price: deliveryPrice,
      daysMin: response?.delivery_period_min,
      daysMax: response?.delivery_period_max,
      type: "pickup",
      requiresPickupPoint: true,
      meta: response,
    },
  ];
}

async function createShipment() {
  throw new Error("Boxberry shipment creation is not implemented yet");
}

const boxberryProvider = {
  name: "boxberry",
  isConfigured,
  getQuote,
  createShipment,
  listPoints,
};

export default boxberryProvider;
export { listPoints };
