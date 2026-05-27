"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brand } from "@/lib/brand/config";
import { Car } from "lucide-react";

export default function RegisterPage() {
  const { register, user, isLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [user, isLoading, router]);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await register(name, email, password);
      router.push("/dashboard");
    } catch {
      // toast handled in useAuth
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || user) return null;

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-row-reverse">
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-xl mb-6">
              <Car className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-display font-extrabold tracking-tight">Create an account</h1>
            <p className="text-muted-foreground mt-2">Join {brand.name} to book premium vehicles.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-10">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name" type="text" required
                value={name} onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl" placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email" type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl" placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password" type="password" required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl" placeholder="Min. 8 characters"
              />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20" disabled={submitting}>
              {submitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">Log in</Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative bg-muted overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/20 to-background" />
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <h2 className="text-4xl font-display font-bold mb-4">Elevate your journey.</h2>
          <p className="text-lg text-muted-foreground">Experience hassle-free premium car rentals with exclusive member benefits.</p>
        </div>
      </div>
    </div>
  );
}
