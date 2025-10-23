import cdekProvider from "./cdek.js";
import boxberryProvider from "./boxberry.js";
import russianPostProvider from "./russianPost.js";

const providers = [cdekProvider, boxberryProvider, russianPostProvider];
const providerMap = new Map(providers.map((provider) => [provider.name, provider]));

const QUOTE_CACHE_TTL_MS = Number(process.env.SHIPPING_QUOTE_CACHE_TTL_MS) || 15 * 60 * 1000;
const quoteCache = new Map();

const getConfiguredProviders = () =>
  providers.filter((provider) => (provider.isConfigured ? provider.isConfigured() : true));

const toCacheKeyPart = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return Object.keys(value)
      .sort()
      .map((key) => `${key}:${toCacheKeyPart(value[key])}`)
      .join("|");
  }

  if (typeof value === "number") {
    return String(Math.round(value));
  }

  return String(value).trim().toLowerCase();
};

const buildQuoteCacheKey = (input = {}) =>
  [
    toCacheKeyPart(input.from),
    toCacheKeyPart(input.to),
    toCacheKeyPart(input.weightGrams),
    toCacheKeyPart(input.lengthCm),
    toCacheKeyPart(input.widthCm),
    toCacheKeyPart(input.heightCm),
  ].join("::");

const getCachedQuotes = (key) => {
  const cached = quoteCache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    quoteCache.delete(key);
    return null;
  }

  return cached.value;
};

const setCachedQuotes = (key, value) => {
  quoteCache.set(key, { value, expiresAt: Date.now() + QUOTE_CACHE_TTL_MS });
};

const normalizeProviderError = (providerName, error) => {
  if (error?.provider === providerName && error?.status) {
    return error;
  }

  const normalized = new Error(
    error?.message || `Failed to communicate with shipping provider ${providerName}`,
  );
  normalized.status = Number.isInteger(error?.status) ? error.status : 502;
  normalized.provider = providerName;
  if (error?.response?.data) {
    normalized.details = error.response.data;
  } else if (error?.details) {
    normalized.details = error.details;
  }

  return normalized;
};

export const SUPPORTED_PROVIDERS = providers.map((provider) => provider.name);

export async function getQuotesAll(input) {
  const cacheKey = buildQuoteCacheKey(input);
  const cached = getCachedQuotes(cacheKey);
  if (cached) {
    return cached;
  }

  const configuredProviders = getConfiguredProviders();
  const quotes = [];
  let lastError = null;

  for (const provider of configuredProviders) {
    try {
      const providerQuotes = await provider.getQuote(input);
      providerQuotes.forEach((quote) => {
        quotes.push({ ...quote, provider: provider.name });
      });
    } catch (error) {
      lastError = normalizeProviderError(provider.name, error);
      console.error(`Shipping provider ${provider.name} quote failed:`, lastError);
    }
  }

  if (quotes.length) {
    setCachedQuotes(cacheKey, quotes);
    return quotes;
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

export function getProvider(providerName) {
  return providerMap.get(providerName);
}

export function ensureProviderConfigured(providerName) {
  const provider = getProvider(providerName);
  if (!provider) {
    const error = new Error(`Unknown provider: ${providerName}`);
    error.status = 400;
    throw error;
  }

  if (provider.isConfigured && !provider.isConfigured()) {
    const error = new Error(`${providerName} provider is not configured`);
    error.status = 502;
    throw error;
  }

  return provider;
}

export async function createShipment(input) {
  const provider = ensureProviderConfigured(input?.quote?.provider);
  const normalizedInput = {
    ...input,
    quote: {
      ...input.quote,
      provider: provider.name,
      type: input.quote?.type || (input.pickupPoint ? "pickup" : undefined),
    },
  };

  if (!provider.createShipment) {
    const error = new Error(`Provider ${provider.name} does not support shipment creation`);
    error.status = 400;
    throw error;
  }

  try {
    return await provider.createShipment(normalizedInput);
  } catch (error) {
    throw normalizeProviderError(provider.name, error);
  }
}

export async function trackShipment(providerName, trackingNumber) {
  const provider = ensureProviderConfigured(providerName);

  if (!trackingNumber) {
    const error = new Error("Tracking number is required");
    error.status = 400;
    throw error;
  }

  if (!provider.track) {
    const error = new Error(`Provider ${provider.name} does not support tracking`);
    error.status = 400;
    throw error;
  }

  try {
    const tracking = await provider.track(trackingNumber);
    return { provider: provider.name, trackingNumber, ...tracking };
  } catch (error) {
    throw normalizeProviderError(provider.name, error);
  }
}

export default providers;
