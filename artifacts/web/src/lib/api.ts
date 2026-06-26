import axios from "axios";

export const apiClient = axios.create({
  baseURL: `${import.meta.env.BASE_URL}api`,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("[API Error]", err?.response?.data ?? err.message);
    return Promise.reject(err);
  }
);
