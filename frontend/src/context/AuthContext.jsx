import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("gkt_access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then((response) => setUser(response.data))
      .catch(() => localStorage.removeItem("gkt_access_token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const response = await api.post("/auth/login", { email, password });
    localStorage.setItem("gkt_access_token", response.data.access_token);
    const profile = await api.get("/auth/me");
    setUser(profile.data);
  }

  function logout() {
    localStorage.removeItem("gkt_access_token");
    setUser(null);
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
