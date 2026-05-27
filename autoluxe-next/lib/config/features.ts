/**
 * Feature flags for phased rollout.
 * Phase 1 MVP: payments and customer dashboard disabled.
 */

export const features = {
  /** Stripe checkout + payment webhooks */
  payments: process.env.ENABLE_PAYMENTS === "true",
  /** Public user registration */
  publicRegistration: process.env.ENABLE_PUBLIC_REGISTRATION === "true",
  /** Customer /dashboard route */
  customerDashboard: process.env.ENABLE_CUSTOMER_DASHBOARD === "true",
} as const;
