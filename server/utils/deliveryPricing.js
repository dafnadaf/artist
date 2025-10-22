export const DELIVERY_OPTIONS = {
  standard: { price: 0 },
  courier: { price: 25 },
  express: { price: 45 },
  international: { price: 95 },
};

export const DEFAULT_DELIVERY_TYPE = "standard";

export const normalizeDeliveryType = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const isSupportedDeliveryType = (value) =>
  Object.hasOwn(DELIVERY_OPTIONS, normalizeDeliveryType(value));

export const getDeliveryPrice = (type) => {
  const normalizedType = normalizeDeliveryType(type);

  if (Object.hasOwn(DELIVERY_OPTIONS, normalizedType)) {
    return DELIVERY_OPTIONS[normalizedType].price;
  }

  return DELIVERY_OPTIONS[DEFAULT_DELIVERY_TYPE].price;
};

export const listDeliveryTypes = () => Object.keys(DELIVERY_OPTIONS);
