import { Router } from "express";
import { body, param } from "express-validator";
import LRUCache from "lru-cache";
import validateRequest from "../middleware/validateRequest.js";
import {
  SUPPORTED_PROVIDERS,
  createShipment,
  getQuotesAll,
  trackShipment,
  ensureProviderConfigured,
} from "../shipping/index.js";
import { ensurePickupPointBelongs, getBoxberryPvz, getCdekPvz } from "../shipping/pvz.js";

const router = Router();

const pickupProviders = new Set(["cdek", "boxberry"]);
const pvzCache = new LRUCache({ max: 500, ttl: 24 * 60 * 60 * 1000 });

const sanitizePostalCode = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value).trim();
};

const sanitizeCityCode = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const sanitizeDimension = (value, fallback) => {
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) {
    return Math.round(num);
  }

  return fallback;
};

const normalizeLocation = (location = {}) => {
  const normalized = {};
  const cityCode = sanitizeCityCode(location.cityCode);
  const postalCode = sanitizePostalCode(location.postalCode);

  if (cityCode !== undefined) {
    normalized.cityCode = cityCode;
  }

  if (postalCode) {
    normalized.postalCode = postalCode;
  }

  return normalized;
};

const normalizeQuoteRequest = (body) => {
  const from = normalizeLocation(body.from);
  const to = normalizeLocation(body.to);

  return {
    from,
    to,
    weightGrams: sanitizeDimension(body.weightGrams, 1),
    lengthCm: sanitizeDimension(body.lengthCm, 10),
    widthCm: sanitizeDimension(body.widthCm, 10),
    heightCm: sanitizeDimension(body.heightCm, 2),
  };
};

const normalizeItems = (items = []) =>
  items.map((item) => {
    const rawPrice = Number(item.price);
    const rawQty = Number(item.qty);

    return {
      name: String(item.name || "").trim(),
      price: Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0,
      qty: Number.isFinite(rawQty) && rawQty > 0 ? Math.round(rawQty) : 1,
    };
  });

const normalizeShipmentRequest = (body) => {
  const quote = {
    ...body.quote,
    provider: String(body.quote?.provider || "").trim().toLowerCase(),
    type: body.quote?.type ? String(body.quote.type).trim().toLowerCase() : undefined,
  };

  if (quote.tariffCode !== undefined && quote.tariffCode !== null) {
    if (typeof quote.tariffCode === "number") {
      quote.tariffCode = Math.round(quote.tariffCode);
    } else {
      quote.tariffCode = String(quote.tariffCode).trim();
    }
  }

  if (quote.serviceName) {
    quote.serviceName = String(quote.serviceName).trim();
  }

  const recipient = {
    ...body.recipient,
    name: String(body.recipient?.name || "").trim(),
    phone: String(body.recipient?.phone || "").trim(),
    email: body.recipient?.email ? String(body.recipient.email).trim() : undefined,
    address: body.recipient?.address
      ? Object.fromEntries(
          Object.entries(body.recipient.address).map(([key, value]) => [
            key,
            typeof value === "string" ? value.trim() : value,
          ]),
        )
      : undefined,
  };

  const pickupPoint =
    body.pickupPoint && typeof body.pickupPoint === "object" && !Array.isArray(body.pickupPoint)
      ? {
          code: body.pickupPoint.code ? String(body.pickupPoint.code).trim() : undefined,
          name: body.pickupPoint.name ? String(body.pickupPoint.name).trim() : undefined,
          address: body.pickupPoint.address ? String(body.pickupPoint.address).trim() : undefined,
          postalCode: body.pickupPoint.postalCode
            ? String(body.pickupPoint.postalCode).trim()
            : undefined,
          city: body.pickupPoint.city ? String(body.pickupPoint.city).trim() : undefined,
          schedule: body.pickupPoint.schedule ? String(body.pickupPoint.schedule).trim() : undefined,
          location:
            body.pickupPoint.location && typeof body.pickupPoint.location === "object"
              ? {
                  lat: Number.isFinite(Number(body.pickupPoint.location.lat))
                    ? Number(body.pickupPoint.location.lat)
                    : undefined,
                  lon: Number.isFinite(Number(body.pickupPoint.location.lon))
                    ? Number(body.pickupPoint.location.lon)
                    : undefined,
                }
              : undefined,
          features:
            body.pickupPoint.features && typeof body.pickupPoint.features === "object"
              ? {
                  cash: Boolean(body.pickupPoint.features.cash),
                  cashless: Boolean(body.pickupPoint.features.cashless),
                  fitting: Boolean(body.pickupPoint.features.fitting),
                }
              : undefined,
          meta:
            body.pickupPoint.meta && typeof body.pickupPoint.meta === "object"
              ? body.pickupPoint.meta
              : undefined,
        }
      : undefined;

  return {
    quote,
    recipient,
    items: normalizeItems(body.items),
    pickupPoint,
  };
};

const locationValidation = (field, { required = false } = {}) =>
  body(field).custom((value) => {
    if (!value) {
      if (required) {
        throw new Error(`${field} is required`);
      }

      return true;
    }

    const isObject = typeof value === "object" && !Array.isArray(value);
    const hasSafeKeys = Object.keys(value).every((key) => !key.startsWith("$") && !key.includes("."));

    if (!isObject || !hasSafeKeys) {
      throw new Error("Location must be a plain object");
    }

    if (!value.cityCode && !value.postalCode) {
      throw new Error("Location must include cityCode or postalCode");
    }

    return true;
  });

router.post(
  "/quote",
  [
    locationValidation("from", { required: true }),
    locationValidation("to", { required: true }),
    body("weightGrams")
      .isFloat({ min: 1 })
      .withMessage("weightGrams must be a positive number")
      .toFloat(),
    body("lengthCm").optional().isFloat({ min: 1 }).withMessage("lengthCm must be positive").toFloat(),
    body("widthCm").optional().isFloat({ min: 1 }).withMessage("widthCm must be positive").toFloat(),
    body("heightCm").optional().isFloat({ min: 1 }).withMessage("heightCm must be positive").toFloat(),
  ],
  validateRequest,
  async (request, response, next) => {
    try {
      const normalizedInput = normalizeQuoteRequest(request.body);
      const quotes = await getQuotesAll(normalizedInput);
      response.json({ quotes });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/create",
  [
    body("quote").isObject().withMessage("quote is required"),
    body("quote.provider")
      .isString()
      .trim()
      .toLowerCase()
      .custom((value) => {
        if (!SUPPORTED_PROVIDERS.includes(value)) {
          throw new Error("Unsupported provider");
        }

        return true;
      }),
    body("quote.type")
      .optional()
      .isIn(["pickup", "courier"])
      .withMessage("quote.type must be pickup or courier"),
    body("recipient").isObject().withMessage("recipient is required"),
    body("recipient.name").isString().trim().notEmpty().withMessage("Recipient name is required"),
    body("recipient.phone").isString().trim().notEmpty().withMessage("Recipient phone is required"),
    body("recipient.email").optional().isEmail().withMessage("Recipient email must be valid").normalizeEmail(),
    body("recipient.address")
      .isObject()
      .withMessage("Recipient address is required")
      .custom((value) => {
        const hasSafeKeys = Object.keys(value).every((key) => !key.startsWith("$") && !key.includes("."));
        if (!hasSafeKeys) {
          throw new Error("Recipient address contains invalid keys");
        }

        return true;
      }),
    body("items")
      .isArray({ min: 1 })
      .withMessage("At least one item is required")
      .custom((items) => {
        const invalid = items.some((item) => !item || typeof item.name !== "string" || item.name.trim().length === 0);
        if (invalid) {
          throw new Error("Items must include a name");
        }

        return true;
      }),
    body("items.*.price")
      .isFloat({ min: 0 })
      .withMessage("Item price must be a non-negative number")
      .toFloat(),
    body("items.*.qty")
      .isInt({ min: 1 })
      .withMessage("Item quantity must be at least 1")
      .toInt(),
    body("pickupPoint")
      .optional()
      .custom((value, { req }) => {
        if (req.body?.quote?.type === "pickup" && !value) {
          throw new Error("pickupPoint is required for pickup shipments");
        }

        if (!value) {
          return true;
        }

        if (typeof value !== "object" || Array.isArray(value)) {
          throw new Error("pickupPoint must be an object");
        }

        if (!value.code) {
          throw new Error("pickupPoint.code is required");
        }

        return true;
      }),
  ],
  validateRequest,
  async (request, response, next) => {
    try {
      const normalized = normalizeShipmentRequest(request.body);

      if (normalized.quote.type === "pickup" && !normalized.pickupPoint?.code) {
        const error = new Error("pickupPoint is required for pickup shipments");
        error.status = 422;
        throw error;
      }

      if (normalized.quote.type === "pickup") {
        ensureProviderConfigured(normalized.quote.provider);
        const verifiedPickup = await ensurePickupPointBelongs(
          normalized.quote.provider,
          normalized.pickupPoint,
          {
            city: normalized.pickupPoint?.city || normalized.recipient?.address?.city,
            postalCode:
              normalized.pickupPoint?.postalCode || normalized.recipient?.address?.postal_code,
            meta: normalized.pickupPoint?.meta,
          },
        );

        normalized.pickupPoint = {
          ...verifiedPickup,
          provider: normalized.quote.provider,
        };
      }

      const shipment = await createShipment(normalized);
      response.json(shipment);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/track/:provider/:trackingNumber",
  [
    param("provider")
      .isString()
      .trim()
      .toLowerCase()
      .isIn(SUPPORTED_PROVIDERS)
      .withMessage("Unsupported provider"),
    param("trackingNumber").isString().trim().notEmpty().withMessage("Tracking number is required"),
  ],
  validateRequest,
  async (request, response, next) => {
    try {
      const provider = request.params.provider;
      const trackingNumber = request.params.trackingNumber.trim();
      const tracking = await trackShipment(provider, trackingNumber);
      response.json(tracking);
    } catch (error) {
      next(error);
    }
  },
);

router.get("/pvz", async (request, response, next) => {
  try {
    const provider = String(request.query.provider || "").trim().toLowerCase();
    const city = request.query.city ? String(request.query.city).trim() : undefined;
    const postalCode = request.query.postalCode
      ? String(request.query.postalCode).trim()
      : undefined;

    if (!provider || !pickupProviders.has(provider)) {
      return response.status(400).json({ error: "Unsupported provider" });
    }

    if (!city && !postalCode) {
      return response
        .status(400)
        .json({ error: "Provide city or postalCode to lookup pickup points" });
    }

    const cacheKey = `${provider}:${city || ""}:${postalCode || ""}`;
    const cached = pvzCache.get(cacheKey);
    if (cached) {
      return response.json(cached);
    }

    try {
      ensureProviderConfigured(provider);
    } catch (error) {
      return next(error);
    }

    let points = [];
    if (provider === "cdek") {
      points = await getCdekPvz({ city, postalCode });
    } else if (provider === "boxberry") {
      points = await getBoxberryPvz({ city, postalCode });
    }

    pvzCache.set(cacheKey, points);

    return response.json(points);
  } catch (error) {
    return next(error);
  }
});

export default router;
