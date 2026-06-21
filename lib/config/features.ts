/**
 * Feature flags for phased rollout.
 */

function envTrue(key: string): boolean {
  return process.env[key]?.trim().toLowerCase() === "true";
}

export const features = {
  publicRegistration: envTrue("ENABLE_PUBLIC_REGISTRATION"),
  customerDashboard: envTrue("ENABLE_CUSTOMER_DASHBOARD"),
} as const;
