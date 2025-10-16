import axios from "axios";

const baseUrl = (() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (envUrl) {
    return envUrl.endsWith("/") ? `${envUrl.slice(0, -1)}/api` : `${envUrl}/api`;
  }

  return "http://localhost:4000/api";
})();

const api = axios.create({
  baseURL: baseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export default api;
