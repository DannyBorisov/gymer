import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { authApi } from "../api/auth";


interface UserInfo {
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  sessionToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem("sessionToken");
  });

  const checkAuth = async () => {
    try {
      const data = await authApi.status();
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
      App.addListener("appUrlOpen", async (event) => {
        // Handle gymerr://auth/callback?code=xxx
        if (event.url.includes("auth/callback")) {
          // Close the in-app browser
          await Browser.close();

          const url = new URL(event.url);
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");

          if (error) {
            console.error("Auth failed:", error);
            return;
          }

          if (code) {
            try {
              // Exchange code for session token
              const data = await authApi.native(code);

              if (data.success && data.sessionToken) {
                localStorage.setItem("sessionToken", data.sessionToken);
                setSessionToken(data.sessionToken);
                setIsAuthenticated(true);
                setUser(data.user);
              } else {
                console.error("Token exchange failed:", data.error);
              }
            } catch (err) {
              console.error("Failed to exchange auth code:", err);
            }
          }
        }
      });
    }
  }, []);

  const login = async () => {
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      // Open in Safari for OAuth
      await authApi.login();
    } else {
      await authApi.login();
    }
  };

  const logout = async () => {
    // Clear local state first
    localStorage.removeItem("sessionToken");
    setSessionToken(null);
    setIsAuthenticated(false);
    setUser(null);

    // Notify server (best effort)
    try {
      await authApi.logout();
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        sessionToken,
        login,
        logout,
        checkAuth,
      }}
    >
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
