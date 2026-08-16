import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach the real JWT (issued by POST /auth/login) to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lumng_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401 — token missing, expired, or rejected by the backend.
// A small debounce avoids clearing storage / redirecting N times when the
// admin panel fires several requests in parallel and they all fail 401.
//
// We also explicitly skip /auth/login 401s (they're expected "wrong password"
// responses — the login page shows the error itself, so we must NOT wipe a
// still-valid pre-existing token on a failed re-auth attempt).
let logoutInFlight = false;
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url ?? "";
    const status = err.response?.status;

    if (status === 401 && !logoutInFlight && !url.endsWith("/auth/login")) {
      logoutInFlight = true;
      localStorage.removeItem("lumng_admin_token");
      localStorage.removeItem("lumng_admin_username");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

// ===== API METHODS =====
export const authApi = {
  login: (credentials) => api.post("/auth/login", credentials),
  updateCredentials: (data) => api.put("/auth/credentials", data),
};

export const productsApi = {
  getAll: (params) => api.get("/products", { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  uploadImage: (id, file) => {
    const form = new FormData();
    form.append("image", file);
    return api.post(`/products/${id}/image`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export const ordersApi = {
  getAll: (params) => api.get("/orders", { params }),
  getOne: (ref) => api.get(`/orders/${ref}`),
  updateStatus: (ref, status) => api.patch(`/orders/${ref}/status`, { status }),
  clearAll: () => api.delete("/orders"),
  stats: () => api.get("/orders/stats"),
};

export const settingsApi = {
  get: () => api.get("/settings"),
  update: (data) => api.put("/settings", data),
};
