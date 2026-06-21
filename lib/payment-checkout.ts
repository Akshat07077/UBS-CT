import type { NextRequest } from "next/server";

/** Public site origin for Stripe redirect URLs. */
export function resolveAppBaseUrl(req?: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host.split(",")[0]!.trim()}`;
  }

  throw new Error("Site URL is not configured. Set NEXT_PUBLIC_URL to https://www.ubscars.com");
}

export function stripeErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
    return e.message;
  }
  return "Payment gateway error";
}
