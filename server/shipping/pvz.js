import axios from "axios";
import LRUCache from "lru-cache";
import { Cdek } from "cdek";
import { listPoints as listBoxberryPoints } from "./boxberry.js";

const CDEK_ACCOUNT = process.env.CDEK_CLIENT_ID;
const CDEK_PASSWORD = process.env.CDEK_CLIENT_SECRET;
const CDEK_BASE = `${(process.env.CDEK_HOST || "https://api.edu.cdek.ru").replace(/\/$/, "")}/v2`;

let cdekClient = null;

const detailCache = new LRUCache({ max: 1000, ttl: 24 * 60 * 60 * 1000 });

const cacheKey = (provider, code) => `${provider}:${code}`;

const rememberPoints = (provider, points = []) => {
  points.forEach((point) => {
    if (point?.code) {
      detailCache.set(cacheKey(provider, point.code), point);
    }
  });
};

const getCachedPoint = (provider, code) => {
  if (!provider || !code) {
    return null;
  }

  return detailCache.get(cacheKey(provider, code)) || null;
};

const getCdekClient = () => {
  if (!CDEK_ACCOUNT || !CDEK_PASSWORD) {
    return null;
  }

  if (!cdekClient) {
    cdekClient = new Cdek({
      account: CDEK_ACCOUNT,
      password: CDEK_PASSWORD,
      url_base: CDEK_BASE,
    });
  }

  return cdekClient;
};

const normalizeCoordinate = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeFeatures = (features = {}) => ({
  cash: Boolean(features.cash),
  cashless: Boolean(features.cashless ?? features.have_cashless ?? features.Acquiring),
  fitting: Boolean(features.fitting ?? features.is_dressing_room ?? features.Examples),
});

export async function getCdekPvz({ city, postalCode, cityCode, code } = {}) {
  const client = getCdekClient();
  if (!client) {
    return [];
  }

  if (code) {
    try {
      const points = await client.getDeliveryPoints({
        type: "PVZ",
        code,
        is_handout: true,
      });

      const normalized = (Array.isArray(points) ? points : []).map((point) => ({
        provider: "cdek",
        code: point.code,
        name: point.name,
        address: point.location?.address_full || point.location?.address || point.address,
        postalCode: point.location?.postal_code || point.postal_code,
        city: point.location?.city || point.city,
        location: {
          lat: normalizeCoordinate(point.location?.latitude ?? point.latitude),
          lon: normalizeCoordinate(point.location?.longitude ?? point.longitude),
        },
        schedule: point.work_time,
        features: normalizeFeatures({
          cash: point.have_cash,
          cashless: point.have_cashless,
          fitting: point.is_dressing_room,
        }),
        meta: {
          cityCode: point.location?.code || point.code_city || point.city_code,
        },
      }));

      rememberPoints("cdek", normalized);
      return normalized.filter((point) => point.code === code);
    } catch (error) {
      console.error("Failed to fetch CDEK PVZ by code", error?.response?.data || error.message);
    }
  }

  let token;
  try {
    token = await client.getAccessToken();
  } catch (error) {
    console.error("Failed to obtain CDEK token for PVZ", error);
    return [];
  }

  let resolvedCityCode = null;
  if (Number.isFinite(cityCode)) {
    resolvedCityCode = Number(cityCode);
  }

  if (!resolvedCityCode) {
    const params = { country_codes: "RU", size: 20 };
    if (postalCode) {
      params.postal_code = postalCode.trim();
    } else if (city) {
      params.city = city.trim();
    }

    try {
      const { data: cities } = await axios.get(`${CDEK_BASE}/location/cities`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(cities) && cities.length > 0) {
        resolvedCityCode = cities[0]?.code;
      }
    } catch (error) {
      console.error("Failed to resolve CDEK city for PVZ", error?.response?.data || error.message);
      return [];
    }
  }

  if (!resolvedCityCode) {
    return [];
  }

  try {
    const points = await client.getDeliveryPoints({
      type: "PVZ",
      city_code: resolvedCityCode,
      is_handout: true,
    });

    const normalized = (Array.isArray(points) ? points : []).map((point) => ({
      provider: "cdek",
      code: point.code,
      name: point.name,
      address: point.location?.address_full || point.location?.address || point.address,
      postalCode: point.location?.postal_code || point.postal_code,
      city: point.location?.city || point.city,
      location: {
        lat: normalizeCoordinate(point.location?.latitude ?? point.latitude),
        lon: normalizeCoordinate(point.location?.longitude ?? point.longitude),
      },
      schedule: point.work_time,
      features: normalizeFeatures({
        cash: point.have_cash,
        cashless: point.have_cashless,
        fitting: point.is_dressing_room,
      }),
      meta: {
        cityCode: resolvedCityCode,
      },
    }));

    rememberPoints("cdek", normalized);
    return normalized;
  } catch (error) {
    console.error("Failed to fetch CDEK PVZ", error?.response?.data || error.message);
    return [];
  }
}

export async function getBoxberryPvz({ city, postalCode, cityCode, code } = {}) {
  try {
    const points = await listBoxberryPoints({ countryCode: 643, cityCode });
    if (!Array.isArray(points)) {
      return [];
    }

    const normalizedCity = city?.toLowerCase().trim();
    const normalizedPostal = postalCode?.trim();
    const normalizedCode = code ? String(code).trim() : undefined;

    const filtered = points.filter((point) => {
      if (normalizedCode) {
        return String(point.Code).trim() === normalizedCode;
      }

      if (!normalizedCity && !normalizedPostal) {
        return false;
      }

      const matchesCity = normalizedCity
        ? point.CityName?.toLowerCase().includes(normalizedCity)
        : false;
      const matchesPostal = normalizedPostal
        ? String(point.PostCode || point.PostalCode || "").trim() === normalizedPostal
        : false;

      return matchesCity || matchesPostal;
    });

    const normalized = filtered.map((point) => ({
      provider: "boxberry",
      code: point.Code,
      name: point.Name,
      address: `${point.CityName}, ${point.Address}`.trim(),
      postalCode: point.PostCode || point.PostalCode,
      city: point.CityName,
      location: {
        lat: normalizeCoordinate(point.Latitude),
        lon: normalizeCoordinate(point.Longitude),
      },
      schedule: point.WorkShedule || point.WorkSchedule,
      features: normalizeFeatures({
        cash: point.Cash,
        cashless: point.Acquiring,
        fitting: point.Examples,
      }),
      meta: {
        cityCode: point.CityCode,
      },
    }));

    rememberPoints("boxberry", normalized);
    return normalized;
  } catch (error) {
    console.error("Failed to fetch Boxberry PVZ", error?.response?.data || error.message);
    return [];
  }
}

async function lookupPickupPoint(provider, query = {}) {
  const normalizedProvider = String(provider || "").toLowerCase();
  const normalizedCode = query.code ? String(query.code).trim() : null;

  if (!normalizedProvider || !normalizedCode) {
    return null;
  }

  const cached = getCachedPoint(normalizedProvider, normalizedCode);
  if (cached) {
    return cached;
  }

  const attempts = [];

  if (normalizedProvider === "cdek") {
    if (Number.isFinite(query.meta?.cityCode)) {
      attempts.push({ cityCode: Number(query.meta.cityCode) });
    }
    if (query.postalCode) {
      attempts.push({ postalCode: query.postalCode });
    }
    if (query.city) {
      attempts.push({ city: query.city });
    }
    attempts.push({ code: normalizedCode });
  } else if (normalizedProvider === "boxberry") {
    if (Number.isFinite(query.meta?.cityCode)) {
      attempts.push({ cityCode: Number(query.meta.cityCode) });
    }
    if (query.postalCode) {
      attempts.push({ postalCode: query.postalCode });
    }
    if (query.city) {
      attempts.push({ city: query.city });
    }
    attempts.push({ code: normalizedCode });
  }

  for (const attempt of attempts) {
    try {
      const points =
        normalizedProvider === "cdek"
          ? await getCdekPvz({ ...attempt })
          : await getBoxberryPvz({ ...attempt });

      const match = points.find((point) => String(point.code) === normalizedCode);
      if (match) {
        return match;
      }
    } catch (error) {
      console.error(`Failed to lookup pickup point for ${normalizedProvider}`, error?.message || error);
    }
  }

  return null;
}

export async function ensurePickupPointBelongs(provider, pickupPoint, hints = {}) {
  const normalizedProvider = String(provider || "").toLowerCase();
  if (!normalizedProvider || !["cdek", "boxberry"].includes(normalizedProvider)) {
    const error = new Error("Unsupported pickup point provider");
    error.status = 400;
    throw error;
  }

  const code = pickupPoint?.code ? String(pickupPoint.code).trim() : null;
  if (!code) {
    const error = new Error("pickupPoint.code is required");
    error.status = 422;
    throw error;
  }

  const cached = getCachedPoint(normalizedProvider, code);
  if (cached) {
    return cached;
  }

  const match = await lookupPickupPoint(normalizedProvider, {
    code,
    city: pickupPoint?.city || hints.city,
    postalCode: pickupPoint?.postalCode || hints.postalCode,
    meta: pickupPoint?.meta || hints.meta,
  });

  if (match) {
    rememberPoints(normalizedProvider, [match]);
    return match;
  }

  const error = new Error("Unknown pickup point for provider");
  error.status = 422;
  throw error;
}

export default {
  getCdekPvz,
  getBoxberryPvz,
};
