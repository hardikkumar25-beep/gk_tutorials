import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  withCredentials: true,
});

let refreshPromise = null;

function readCookie(name) {
  const prefix = `${name}=`;
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

export function refreshAccessToken() {
  if (!refreshPromise) {
    const csrfToken = readCookie("gkt_csrf_token");
    refreshPromise = axios
      .post(
        `${api.defaults.baseURL}/auth/refresh`,
        null,
        {
          withCredentials: true,
          headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
        }
      )
      .then(({ data }) => {
        localStorage.setItem("gkt_access_token", data.access_token);
        return data.access_token;
      })
      .catch((error) => {
        localStorage.removeItem("gkt_access_token");
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("gkt_access_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";
    const isAuthRequest = [
      "/auth/login",
      "/auth/refresh",
      "/auth/logout",
    ].some((path) => requestUrl.includes(path));

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthRequest
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem("gkt_access_token");
      window.dispatchEvent(new Event("gkt:session-expired"));
      return Promise.reject(refreshError);
    }
  }
);

export default api;
