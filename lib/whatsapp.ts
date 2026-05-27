import { formatINR } from "@/components/car-card";
import { formatBookingDateTime } from "@/lib/constants/booking-times";
import { brand } from "@/lib/brand/config";

const DEFAULT_NUMBER = "917974451501";

export function getWhatsAppNumber() {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_NUMBER;
  return raw.replace(/\D/g, "");
}

export function buildBookingWhatsAppUrl(opts: {
  carLabel: string;
  location: string;
  pickupDate: string;
  returnDate: string;
  pickupTime?: string;
  returnTime?: string;
  totalInr: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  withDriver?: boolean;
  bookingId?: number;
}) {
  const pickupLine = opts.pickupTime
    ? formatBookingDateTime(opts.pickupDate, opts.pickupTime)
    : opts.pickupDate;
  const returnLine = opts.returnTime
    ? formatBookingDateTime(opts.returnDate, opts.returnTime)
    : opts.returnDate;

  const lines = [
    `Hi ${brand.name}, I'd like to book:`,
    "",
    `Vehicle: ${opts.carLabel}`,
    `Location: ${opts.location}`,
    `Pickup: ${pickupLine}`,
    `Return: ${returnLine}`,
    `Estimated total: ${formatINR(opts.totalInr)}`,
    opts.withDriver ? "Chauffeur: Yes" : "Chauffeur: No (self-drive)",
    "",
    `Name: ${opts.guestName}`,
    `Phone: ${opts.guestPhone}`,
  ];
  if (opts.guestEmail) lines.push(`Email: ${opts.guestEmail}`);
  if (opts.bookingId) lines.push("", `Booking ref: #${opts.bookingId}`);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${getWhatsAppNumber()}?text=${text}`;
}
