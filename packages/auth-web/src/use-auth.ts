import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (params?: { email?: string; password?: string; role?: string; firstName?: string; lastName?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(() => {
    // Se o usuário não estava previamente autenticado de acordo com o localStorage,
    // não precisamos exibir a animação de loading inicial e podemos renderizar a tela de login direto.
    return localStorage.getItem("isAuthenticated") === "true";
  });

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
        if (!data.user) {
          localStorage.removeItem("isAuthenticated");
        }
      } else {
        setUser(null);
        localStorage.removeItem("isAuthenticated");
      }
    } catch {
      setUser(null);
      localStorage.removeItem("isAuthenticated");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("isAuthenticated") === "true") {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = useCallback(async (params?: { email?: string; password?: string; role?: string; firstName?: string; lastName?: string }) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params || {}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to login");
      }
      const data = await res.json();
      setUser(data.user);
      localStorage.setItem("isAuthenticated", "true");
    } catch (err) {
      setUser(null);
      localStorage.removeItem("isAuthenticated");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch("/api/logout", {
        method: "POST",
      });
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      localStorage.removeItem("isAuthenticated");
      setIsLoading(false);
    }
  }, []);

  return React.createElement(
    AuthContext.Provider,
    { value: { user, isLoading, isAuthenticated: !!user, login, logout } },
    children
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
