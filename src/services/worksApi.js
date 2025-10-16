import api from "./api";
import normalizeWork from "../utils/normalizeWork";

export const fetchWorks = async () => {
  const response = await api.get("/works");
  return response.data.map((item) => normalizeWork(item));
};

export const fetchWorkById = async (id) => {
  const response = await api.get(`/works/${id}`);
  return normalizeWork(response.data);
};

export const createWork = async (payload) => {
  const response = await api.post("/works", payload);
  return normalizeWork(response.data);
};

export const updateWork = async (id, payload) => {
  const response = await api.put(`/works/${id}`, payload);
  return normalizeWork(response.data);
};

export const deleteWork = async (id) => {
  await api.delete(`/works/${id}`);
};

export default {
  fetchWorks,
  fetchWorkById,
  createWork,
  updateWork,
  deleteWork,
};
