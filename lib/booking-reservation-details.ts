import { brand } from "@/lib/brand/config";
import type { Car, User } from "@/lib/db/schema";

export type ReservationHandoverContact = {
  pickupLocation: string | null;
  dropLocation: string | null;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  /** owner = peer/host listing; rental = UBS fleet */
  contactRole: "owner" | "rental";
};

function isCommunityCar(car: Car): boolean {
  return car.hostUserId != null || Boolean(car.ownerEmail?.trim());
}

/** Pickup/drop addresses + who the renter should contact after booking. */
export function formatReservationHandoverContact(
  car: Car,
  hostUser?: Pick<User, "name" | "email"> | null
): ReservationHandoverContact {
  const pickup = car.pickupLocation?.trim() || car.location?.trim() || null;
  const drop = car.dropLocation?.trim() || pickup;
  const community = isCommunityCar(car);

  if (!community) {
    return {
      pickupLocation: pickup,
      dropLocation: drop,
      contactName: brand.name,
      contactPhone: brand.contact.phone,
      contactEmail: brand.contact.email,
      contactRole: "rental",
    };
  }

  const contactName =
    car.ownerName?.trim() || hostUser?.name?.trim() || "Car owner";
  const contactPhone = car.ownerPhone?.trim() || brand.contact.phone;
  const contactEmail =
    car.ownerEmail?.trim() || hostUser?.email?.trim() || brand.contact.email;

  return {
    pickupLocation: pickup,
    dropLocation: drop,
    contactName,
    contactPhone,
    contactEmail,
    contactRole: "owner",
  };
}

export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

export function phoneTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `tel:+91${digits}`;
  if (digits.length >= 11) return `tel:+${digits}`;
  return `tel:${digits}`;
}

export function phoneWhatsAppHref(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}
