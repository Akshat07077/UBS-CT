/**
 * WhatsApp integration layer — Phase 1: deep links only.
 * Phase 2+: implement WhatsAppService with Meta Cloud API.
 */

import { format } from "date-fns";
import { brand } from "@/lib/brand/config";

export function getWhatsAppNumber(): string {
  const raw = brand.contact.phone;
  return raw.replace(/\D/g, "");
}

export function buildWhatsAppUrl(message: string): string {
  const text = encodeURIComponent(message);
  return `https://wa.me/${getWhatsAppNumber()}?text=${text}`;
}

export function buildBookingInquiryMessage(opts: {
  referenceCode?: string;
  carLabel: string;
  location?: string;
  pickupDate: string;
  returnDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupLocation?: string;
  message?: string;
}): string {
  const lines = [
    `Hi ${brand.name}, I'd like to inquire about a booking:`,
    "",
    opts.referenceCode ? `Reference: ${opts.referenceCode}` : null,
    `Vehicle: ${opts.carLabel}`,
    opts.location ? `Location: ${opts.location}` : null,
    opts.pickupLocation ? `Pickup at: ${opts.pickupLocation}` : null,
    `Pickup: ${format(new Date(opts.pickupDate), "dd MMM yyyy")}`,
    `Return: ${format(new Date(opts.returnDate), "dd MMM yyyy")}`,
    "",
    `Name: ${opts.customerName}`,
    `Phone: ${opts.customerPhone}`,
    opts.customerEmail ? `Email: ${opts.customerEmail}` : null,
    opts.message ? `\nMessage: ${opts.message}` : null,
  ].filter(Boolean) as string[];

  return lines.join("\n");
}

export function buildLeadInquiryMessage(opts: {
  name: string;
  phone: string;
  email?: string;
  message?: string;
}): string {
  return [
    `Hi ${brand.name},`,
    "",
    `Name: ${opts.name}`,
    `Phone: ${opts.phone}`,
    opts.email ? `Email: ${opts.email}` : null,
    opts.message ? `\n${opts.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Future: send template message via Business API */
export interface WhatsAppService {
  sendTemplate(to: string, templateName: string, variables: Record<string, string>): Promise<void>;
}
