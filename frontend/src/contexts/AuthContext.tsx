import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { apiUrl } from "../utils/api";

interface UserInfo {
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  login: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);

  const checkAuth = async () => {
    try {
      const response = await fetch(apiUrl("/api/auth/google/status"), {
        credentials: "include",
      });
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
      setUser(data.user);
    } catch {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Listen for deep link callbacks on native platforms
    if (Capacitor.isNativePlatform()) {
      App.addListener("appUrlOpen", (event) => {
        // Handle gymerr://auth/callback?success=true
        if (event.url.includes("auth/callback")) {
          const url = new URL(event.url);
          if (url.searchParams.get("success") === "true") {
            checkAuth();
          }
        }
      });
    }
  }, []);

  const login = () => {
    const isNative = Capacitor.isNativePlatform();
    const authUrl = apiUrl(`/auth/google${isNative ? "?native=true" : ""}`);
    window.location.href = authUrl;
  };

  const logout = async () => {
    await fetch(apiUrl("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
    });
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
