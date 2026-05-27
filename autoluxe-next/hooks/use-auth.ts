"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { brand } from "@/lib/brand/config";
import { toast } from "@/hooks/use-toast";

export interface AuthUser {
  id: number;
  name: string | null;
  email: string;
  role: "user" | "admin";
  createdAt: string;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["me"],
    queryFn: () => apiFetch<AuthUser | null>("/api/auth/me"),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  async function login(email: string, password: string) {
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      queryClient.setQueryData(["me"], data.user);
      toast({ title: "Welcome back!" });
      return data.user;
    } catch (e: any) {
      toast({ title: "Login failed", description: e.message, variant: "destructive" });
      throw e;
    }
  }

  async function register(name: string, email: string, password: string) {
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      queryClient.setQueryData(["me"], data.user);
      toast({ title: "Account created", description: `Welcome to ${brand.name}!` });
      return data.user;
    } catch (e: any) {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
      throw e;
    }
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    queryClient.setQueryData(["me"], null);
    toast({ title: "Logged out" });
  }

  return {
    user: error ? null : user ?? null,
    isLoading,
    login,
    register,
    logout,
  };
}
