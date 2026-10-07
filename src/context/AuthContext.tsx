import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api from "../lib/api";
import { clearToken, getToken, setToken } from "../lib/authStorage";
import type { AuthUser } from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string, persist: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      if (getToken()) {
        await api.post("/auth/logout");
      }
    } catch {
      // Token may already be invalid; still clear local session.
    } finally {
      clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    api
      .get<{ user: AuthUser }>("/auth/me")
      .then((response) => {
        setUser(response.data.user);
      })
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string, persist: boolean) => {
      const response = await api.post<{ token: string; user: AuthUser }>(
        "/auth/login",
        { email, password }
      );
      setToken(response.data.token, persist);
      setUser(response.data.user);
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
