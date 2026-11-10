import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  withCredentials: true,
});

// Access tokens stay in memory; the HttpOnly refresh cookie survives reloads.
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .get(`${api.defaults.baseURL}/auth/csrf`, { withCredentials: true })
      .then(({ data }) =>
        axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          null,
          {
            withCredentials: true,
            headers: { "X-CSRF-Token": data.csrf_token },
          }
        )
      )
      .then(({ data }) => {
        setAccessToken(data.access_token);
        return data.access_token;
      })
      .catch((error) => {
        clearAccessToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
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
      "/auth/csrf",
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
      clearAccessToken();
      window.dispatchEvent(new Event("gkt:session-expired"));
      return Promise.reject(refreshError);
    }
  }
);

export default api;
