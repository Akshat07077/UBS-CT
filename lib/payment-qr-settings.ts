export type PaymentQrSettings = {
  /** Show QR checkout on the booking form when a QR image is uploaded. */
  enabled: boolean;
  qrCodeUrl: string;
  label: string;
  helpText: string;
};

export const DEFAULT_PAYMENT_QR_SETTINGS: PaymentQrSettings = {
  enabled: false,
  qrCodeUrl: "",
  label: "Scan to pay",
  helpText: "Pay the amount shown using UPI or your bank app, then upload a screenshot of the successful payment.",
};

export function normalizePaymentQrSettings(raw: unknown): PaymentQrSettings {
  const d = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    enabled: d.enabled === true,
    qrCodeUrl: typeof d.qrCodeUrl === "string" ? d.qrCodeUrl.trim() : "",
    label: typeof d.label === "string" && d.label.trim() ? d.label.trim() : DEFAULT_PAYMENT_QR_SETTINGS.label,
    helpText:
      typeof d.helpText === "string" && d.helpText.trim()
        ? d.helpText.trim()
        : DEFAULT_PAYMENT_QR_SETTINGS.helpText,
  };
}

export function isQrPaymentConfigured(settings: PaymentQrSettings): boolean {
  return settings.enabled && !!settings.qrCodeUrl.trim();
}
