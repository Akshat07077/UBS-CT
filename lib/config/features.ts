/**
 * Feature flags for phased rollout.
 */

function envTrue(key: string): boolean {
  return process.env[key]?.trim().toLowerCase() === "true";
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Live Stripe checkout — requires keys + ENABLE_PAYMENTS=true */
export function isPaymentsEnabled(): boolean {
  return envTrue("ENABLE_PAYMENTS") && isStripeConfigured();
}

/** @deprecated use isPaymentsEnabled() */
export const features = {
  payments: isPaymentsEnabled(),
  publicRegistration: envTrue("ENABLE_PUBLIC_REGISTRATION"),
  customerDashboard: envTrue("ENABLE_CUSTOMER_DASHBOARD"),
} as const;
