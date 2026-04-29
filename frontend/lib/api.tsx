import axios from "axios";

const resolvedApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "/api";

const api = axios.create({
  baseURL: resolvedApiBaseUrl,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined") {
      const status = error?.response?.status;
      const message = String(error?.response?.data?.message || "").toLowerCase();

      const isAuthExpired =
        status === 401 &&
        (message.includes("jwt expired") ||
          message.includes("token expired") ||
          message.includes("invalid token") ||
          message.includes("unauthorized"));

      if (isAuthExpired) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;