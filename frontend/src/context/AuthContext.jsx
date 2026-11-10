import { createContext, useContext, useEffect, useState } from "react";
import api, { refreshAccessToken } from "../services/api";

const AuthContext = createContext(null);

function readCookie(name) {
  const prefix = `${name}=`;
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        await refreshAccessToken();
        const profile = await api.get("/auth/me");
        if (active) setUser(profile.data);
      } catch {
        localStorage.removeItem("gkt_access_token");
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    restoreSession();

    function handleSessionExpired() {
      setUser(null);
    }
    window.addEventListener("gkt:session-expired", handleSessionExpired);

    return () => {
      active = false;
      window.removeEventListener("gkt:session-expired", handleSessionExpired);
    };
  }, []);

  async function login(email, password) {
    const response = await api.post("/auth/login", { email, password });
    localStorage.setItem("gkt_access_token", response.data.access_token);
    const profile = await api.get("/auth/me");
    setUser(profile.data);
  }

  async function logout() {
    try {
      const csrfToken = readCookie("gkt_csrf_token");
      await api.post(
        "/auth/logout",
        null,
        { headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {} }
      );
    } finally {
      localStorage.removeItem("gkt_access_token");
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
