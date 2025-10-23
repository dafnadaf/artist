import api from "./api";

export const createPaymentSession = async ({ orderId, provider = "yookassa" }) => {
  const response = await api.post("/payments/create", { orderId, provider });
  return response.data;
};

export default {
  createPaymentSession,
};
