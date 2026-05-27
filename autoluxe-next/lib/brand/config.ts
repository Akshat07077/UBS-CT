/**
 * UB's Car Rental — brand tokens (logo + luxury dark theme).
 * HSL values feed `app/globals.css` CSS variables.
 */

export const brand = {
  name: "UB's Car Rental Indore",
  legalName: "UB's Car Rental Indore",
  slogan: "Drive the Difference",
  /** Short wordmark for headings */
  shortName: "UB",
  tagline: "Premium car rental in Indore — drive the difference.",
  logo: {
    /** Public path (see `public/imagess/logo_ubs.jpg`) */
    src: "/imagess/logo_ubs.jpg",
    width: 220,
    height: 72,
  },
  /** Accent gold (classic metallic) — #D4AF37 */
  accentGoldHex: "#D4AF37",
  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "rindorecar@gmail.com",
    /** Primary line (WhatsApp / main helpline) — digits only, with country code */
    phone: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "917974451501",
    phones: ["917974451501", "917000781762"] as const,
    address: {
      line1: "Scheme Number 134, Near Star Square",
      line2: "Nipania, Indore 452010",
      full: "Scheme Number 134, Near Star Square, Nipania, Indore 452010",
    },
    hours: "Mon–Sat, 8am–9pm",
    supportNote: "Hindi & English support",
  },
  /** HSL triplets without `hsl()` — used by Tailwind / shadcn theme */
  colors: {
    background: "0 0% 0%",
    foreground: "240 5% 96%",
    card: "240 4% 9%",
    cardForeground: "240 5% 96%",
    primary: "46 65% 52%",
    primaryForeground: "0 0% 7%",
    secondary: "240 5% 64%",
    secondaryForeground: "0 0% 7%",
    muted: "240 4% 16%",
    mutedForeground: "240 4% 64%",
    accent: "240 4% 16%",
    accentForeground: "240 5% 96%",
    border: "240 4% 16%",
    input: "240 4% 16%",
    ring: "46 65% 52%",
    destructive: "0 72% 51%",
    destructiveForeground: "0 0% 98%",
  },
  radius: "0.75rem",
} as const;

export type BrandConfig = typeof brand;
