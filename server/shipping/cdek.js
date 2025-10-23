import axios from "axios";

const CDEK_HOST = process.env.CDEK_HOST || "https://api.edu.cdek.ru";
const CDEK_CLIENT_ID = process.env.CDEK_CLIENT_ID;
const CDEK_CLIENT_SECRET = process.env.CDEK_CLIENT_SECRET;

let tokenCache = { value: null, exp: 0 };

const isConfigured = () => Boolean(CDEK_CLIENT_ID && CDEK_CLIENT_SECRET);

const buildCdekError = (message, error) => {
  if (axios.isAxiosError?.(error)) {
    const normalized = new Error(
      message || error.response?.data?.message || error.response?.data?.errors?.[0]?.message || error.message,
    );
    normalized.status = 502;
    normalized.details = error.response?.data;
    return normalized;
  }

  if (message && (!error || !error.message)) {
    const normalized = new Error(message);
    normalized.status = error?.status || 502;
    if (error?.details) {
      normalized.details = error.details;
    }
    return normalized;
  }

  if (error) {
    if (!error.status) {
      error.status = 502;
    }
    return error;
  }

  const fallback = new Error(message || "CDEK API error");
  fallback.status = 502;
  return fallback;
};

async function getToken() {
  if (!isConfigured()) {
    const error = new Error("CDEK credentials are not configured");
    error.status = 502;
    throw error;
  }

  const now = Date.now();
  if (tokenCache.value && tokenCache.exp > now + 10_000) {
    return tokenCache.value;
  }

  const url = `${CDEK_HOST}/v2/oauth/token?parameters`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CDEK_CLIENT_ID,
    client_secret: CDEK_CLIENT_SECRET,
  });

  try {
    const { data } = await axios.post(url, body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    tokenCache = { value: data.access_token, exp: now + data.expires_in * 1000 };
    return tokenCache.value;
  } catch (error) {
    throw buildCdekError("Failed to obtain CDEK access token", error);
  }
}

async function cdekCities(query) {
  const token = await getToken();
  try {
    const { data } = await axios.get(
      `${CDEK_HOST}/v2/location/cities?country_codes=RU&city=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return data;
  } catch (error) {
    throw buildCdekError("Failed to fetch CDEK cities", error);
  }
}

function buildLocationPayload(location = {}) {
  if (Number.isFinite(location.cityCode)) {
    return { code: Number(location.cityCode) };
  }

  if (location.postalCode) {
    return { postal_code: String(location.postalCode) };
  }

  return {};
}

async function getQuote({ from = {}, to = {}, weightGrams, lengthCm = 10, widthCm = 10, heightCm = 2 }) {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
    throw new Error("CDEK quote requires a positive weight in grams");
  }

  const token = await getToken();
  const payload = {
    type: 1,
    currency: 1,
    lang: "rus",
    from_location: buildLocationPayload(from),
    to_location: buildLocationPayload(to),
    packages: [
      {
        weight: Math.round(weightGrams),
        length: Math.max(1, Math.round(lengthCm)),
        width: Math.max(1, Math.round(widthCm)),
        height: Math.max(1, Math.round(heightCm)),
      },
    ],
  };

  try {
    const { data } = await axios.post(`${CDEK_HOST}/v2/calculator/tarifflist`, payload, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    const tariffs = Array.isArray(data.tariff_codes) ? data.tariff_codes : [];

    return tariffs.map((tariff) => {
      const deliveryMode = Number(tariff.delivery_mode ?? tariff.meta?.delivery_mode);
      const type = deliveryMode === 1 || deliveryMode === 3 ? "pickup" : "courier";

      return {
        provider: "cdek",
        serviceName: tariff.tariff_name,
        tariffCode: tariff.tariff_code,
        price: Number(tariff.delivery_sum) || 0,
        daysMin: tariff.period_min,
        daysMax: tariff.period_max,
        type,
        requiresPickupPoint: type === "pickup",
        meta: tariff,
      };
    });
  } catch (error) {
    throw buildCdekError("Failed to calculate CDEK tariffs", error);
  }
}

function calculatePackageWeight(items = []) {
  const baseWeightPerItem = 500; // grams

  const weight = items.reduce((total, item) => {
    const quantity = Number.isFinite(item?.qty) && item.qty > 0 ? item.qty : 1;
    return total + baseWeightPerItem * quantity;
  }, 0);

  return Math.max(weight, baseWeightPerItem);
}

async function createShipment({ quote, recipient, items, pickupPoint }) {
  if (!quote?.tariffCode) {
    throw new Error("CDEK shipment requires a tariff code");
  }

  if (!recipient?.name || !recipient?.phone) {
    throw new Error("Recipient name and phone are required for CDEK shipment");
  }

  const token = await getToken();
  const toLocation = { ...(recipient.address || {}) };

  if (pickupPoint?.postalCode && !toLocation.postal_code) {
    toLocation.postal_code = pickupPoint.postalCode;
  }

  if (pickupPoint?.meta?.cityCode && !toLocation.code) {
    const cityCodeNumber = Number(pickupPoint.meta.cityCode);
    if (Number.isFinite(cityCodeNumber)) {
      toLocation.code = cityCodeNumber;
    }
  }

  const payload = {
    tariff_code: quote.tariffCode,
    comment: "Art order",
    recipient: {
      name: recipient.name,
      phones: [{ number: recipient.phone }],
      email: recipient.email,
    },
    to_location: toLocation,
    packages: [
      {
        number: "1",
        weight: calculatePackageWeight(items),
        items: (items || []).map((item, index) => ({
          name: item?.name || `Item ${index + 1}`,
          cost: Number(item?.price) || 0,
          payment: 0,
          weight: 500,
          amount: Number.isFinite(item?.qty) && item.qty > 0 ? item.qty : 1,
          ware_key: `ART-${index + 1}`,
        })),
      },
    ],
  };

  if (pickupPoint?.code) {
    payload.delivery_point = pickupPoint.code;
  }

  try {
    const { data } = await axios.post(`${CDEK_HOST}/v2/orders`, payload, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    const relatedEntities = Array.isArray(data.related_entities) ? data.related_entities : [];
    const waybill = relatedEntities.find((entity) => entity.type === "waybill");

    return {
      trackingNumber: data.cdek_number || "",
      orderId: data.uuid || "",
      labelUrl: waybill?.url,
      raw: data,
    };
  } catch (error) {
    throw buildCdekError("Failed to create CDEK shipment", error);
  }
}

const normalizeStatusDate = (value) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
};

function normalizeStatuses(statuses = []) {
  const normalized = statuses
    .map((status) => {
      const code = status.code || status.status_code || status.state_code || null;
      const description = status.description || status.status_description || status.state_description;
      const name = status.name || status.status_name || status.state;
      const timestamp =
        status.date_time || status.datetime || status.dateTime || status.time || status.moment || status.date;

      return {
        code,
        name: name || description || code,
        description: description || name || code,
        date: normalizeStatusDate(timestamp),
        city: status.city || status.location || status.location_city || status.location_name,
      };
    })
    .filter((status) => status.code || status.name || status.description);

  normalized.sort((a, b) => {
    if (!a.date) return -1;
    if (!b.date) return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return normalized;
}

async function trackShipment(trackingNumber) {
  const token = await getToken();
  try {
    const { data } = await axios.get(
      `${CDEK_HOST}/v2/tracking?cdek_number=${encodeURIComponent(trackingNumber)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const entity = data?.entity || data;
    const statuses = normalizeStatuses(entity?.statuses || entity?.state_history || []);
    const latest = statuses[statuses.length - 1];

    return {
      status: latest
        ? {
            code: latest.code || null,
            name: latest.name || null,
            description: latest.description || null,
            date: latest.date,
            city: latest.city,
          }
        : null,
      history: statuses,
      meta: data,
    };
  } catch (error) {
    throw buildCdekError(`Failed to fetch CDEK tracking for ${trackingNumber}`, error);
  }
}

const cdekProvider = {
  name: "cdek",
  isConfigured,
  getQuote,
  createShipment,
  track: trackShipment,
  cdekCities,
};

export default cdekProvider;
export { cdekCities, trackShipment };
