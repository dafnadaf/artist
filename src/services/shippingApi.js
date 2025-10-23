import api from "./api";

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export const fetchShippingQuotes = async (payload) => {
  const response = await api.post("/shipping/quote", payload);
  return ensureArray(response.data?.quotes);
};

export const createShipment = async (payload) => {
  const response = await api.post("/shipping/create", payload);
  return response.data;
};

export const trackShipment = async (provider, trackingNumber) => {
  const response = await api.get(`/shipping/track/${provider}/${encodeURIComponent(trackingNumber)}`);
  return response.data;
};

export const fetchPickupPoints = async ({ provider, city, postalCode }) => {
  const response = await api.get("/shipping/pvz", {
    params: {
      provider,
      city: city || undefined,
      postalCode: postalCode || undefined,
    },
  });

  return ensureArray(response.data);
};

export default {
  fetchShippingQuotes,
  createShipment,
  trackShipment,
  fetchPickupPoints,
};
