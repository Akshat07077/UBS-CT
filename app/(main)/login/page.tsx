"use client";
import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand } from "@/lib/brand/config";
import { Car } from "lucide-react";

function LoginForm({ login }: { login: ReturnType<typeof useAuth>["login"] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const u = await login(email, password);
      router.push(u.role === "admin" ? "/admin/cars" : redirectUrl);
    } catch {
      // toast handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-10">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" placeholder="name@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" placeholder="••••••••" />
      </div>
      <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20" disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) router.replace(user.role === "admin" ? "/admin" : "/dashboard");
  }, [user, isLoading, router]);

  if (isLoading || user) return null;

  return (
    <div className="min-h-[calc(100vh-5rem)] flex">
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-xl mb-6">
              <Car className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-display font-extrabold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground mt-2">Log in to your account to continue</p>
          </div>
          <Suspense>
            <LoginForm login={login} />
          </Suspense>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 relative bg-muted overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background" />
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <h2 className="text-4xl font-display font-bold mb-4">The road is yours.</h2>
          <p className="text-lg text-muted-foreground">Manage your bookings and unlock premium fleet options with a {brand.name} account.</p>
        </div>
      </div>
    </div>
  );
}
