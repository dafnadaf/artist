import api from "./api";

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export const fetchOrders = async () => {
  const response = await api.get("/orders");
  return ensureArray(response.data);
};

export const fetchOrdersByUser = async (userId) => {
  if (!userId) {
    return [];
  }

  const response = await api.get(`/orders/${userId}`);
  return ensureArray(response.data);
};

export const createOrder = async (payload) => {
  const response = await api.post("/orders", payload);
  return response.data;
};

export const fetchOrderById = async (orderId) => {
  if (!orderId) {
    return null;
  }

  const response = await api.get(`/orders/detail/${orderId}`);
  return response.data;
};

export default {
  fetchOrders,
  fetchOrdersByUser,
  createOrder,
  fetchOrderById,
};
