"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/types";

export function ProtectedPage({
  children,
  role,
}: {
  children: React.ReactNode;
  role: UserRole;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== role) {
      router.replace(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
    }
  }, [loading, role, router, user]);

  if (loading || !user || user.role !== role) {
    return <div className="loading-page">Loading your workspace...</div>;
  }

  return <>{children}</>;
}
