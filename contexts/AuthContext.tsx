"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "@/lib/client/api";
import type { PublicUser, UserRole } from "@/lib/types";

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
  }) => Promise<PublicUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: { name: string; email: string }) => Promise<PublicUser>;
  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: PublicUser }>("/api/auth/me", {
        method: "GET",
      });
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await refreshUser();
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ user: PublicUser; token: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      role?: UserRole;
    }) => {
      const data = await apiFetch<{ user: PublicUser; token: string }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await apiFetch<Record<string, never>>("/api/auth/logout", {
      method: "POST",
      body: "{}",
    });
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (payload: { name: string; email: string }) => {
    const data = await apiFetch<{ user: PublicUser }>("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setUser(data.user);
    return data.user;
  }, []);

  const changePassword = useCallback(
    async (payload: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      await apiFetch<{ message: string }>("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    }),
    [changePassword, loading, login, logout, refreshUser, register, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return ctx;
}
