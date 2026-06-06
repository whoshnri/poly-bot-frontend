import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError } from "../api/client";
import {
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
  type AuthUser,
} from "../api/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (input: { userId: string; password: string }) => Promise<{ success: true; userId: string }>;
  register: (input: { userId: string; password: string }) => Promise<{ success: true; userId: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const nextUser = await getCurrentUserRequest();
      setUser({ userId: nextUser.userId, createdAt: nextUser.createdAt });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        return;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (input: { userId: string; password: string }) => {
    const result = await loginRequest(input);
    setUser({ userId: result.userId, createdAt: result.createdAt });
    return { success: true as const, userId: result.userId };
  }, []);

  const register = useCallback(async (input: { userId: string; password: string }) => {
    const result = await registerRequest(input);
    setUser({ userId: result.userId, createdAt: result.createdAt });
    return { success: true as const, userId: result.userId };
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
