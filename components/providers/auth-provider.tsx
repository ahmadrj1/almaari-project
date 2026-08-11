"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/auth.store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { setUser, setLoading, clearUser } = useAuthStore();

  useEffect(() => {
    setLoading(status === "loading");
    if (status === "authenticated" && session?.user) {
      const u = session.user as {
        id?: string;
        name?: string | null;
        email?: string | null;
        role?: string;
        provider?: string;
      };
      setUser({
        id: u.id ?? "",
        name: u.name,
        email: u.email,
        role: u.role,
        provider: u.provider,
      });
    } else if (status === "unauthenticated") {
      clearUser();
    }
  }, [session, status, setUser, setLoading, clearUser]);

  return <>{children}</>;
}
