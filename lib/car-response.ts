import type { Car, User } from "@/lib/db";
import { peerHostListingJson, defaultHourlyFromDaily, type CarListingJson } from "@/lib/rental-listing";

/** DB-only approval often leaves old promo/note in `listing` JSON; normalize for clients when row is approved. */
function resolveListingForClient(car: Car): CarListingJson | null {
  const raw = car.listing;
  if (!raw) return null;
  if (car.listingApprovalStatus !== "approved") return raw;

  const stale =
    raw.promoTag === "Awaiting approval" ||
    (typeof raw.availabilityNote === "string" && raw.availabilityNote.includes("Not visible in search")) ||
    (typeof raw.availabilityNote === "string" && raw.availabilityNote.toLowerCase().includes("admin approves"));

  if (!stale) return raw;

  const fromSupplier = typeof raw.supplierName === "string" ? raw.supplierName.split("·")[0]?.trim() : "";
  const display = car.ownerName?.trim() || fromSupplier || "Host";
  const fresh = peerHostListingJson(display, Number(car.pricePerDay));
  return {
    ...raw,
    supplierName: raw.supplierName || fresh.supplierName,
    pricePerDayMax: raw.pricePerDayMax ?? fresh.pricePerDayMax,
    promoTag: fresh.promoTag,
    availabilityNote: fresh.availabilityNote,
  };
}

function buildImageList(car: Car, galleryUrls?: string[] | null): string[] {
  if (galleryUrls && galleryUrls.length > 0) return galleryUrls;
  if (car.imageUrl) return [car.imageUrl];
  return [];
}

function baseFields(car: Car, galleryUrls?: string[] | null) {
  const images = buildImageList(car, galleryUrls);
  return {
    id: car.id,
    brand: car.brand,
    model: car.model,
    year: car.year,
    pricePerDay: Number(car.pricePerDay),
    pricePerHour:
      car.pricePerHour != null && car.pricePerHour !== ""
        ? Number(car.pricePerHour)
        : defaultHourlyFromDaily(Number(car.pricePerDay)),
    transmission: car.transmission,
    fuelType: car.fuelType,
    seats: car.seats,
    location: car.location,
    pickupLocation: car.pickupLocation ?? null,
    dropLocation: car.dropLocation ?? null,
    description: car.description,
    imageUrl: images[0] ?? car.imageUrl ?? null,
    images,
    available: car.available,
    listing: resolveListingForClient(car),
    hostUserId: car.hostUserId ?? null,
    isCommunityListing: car.hostUserId != null || (!!car.ownerEmail && car.ownerEmail.length > 0),
  };
}

export type PublicCarJson = ReturnType<typeof baseFields> & { isViewerOwner?: boolean };

export function formatPublicCar(car: Car, viewer?: User | null, galleryUrls?: string[] | null): PublicCarJson {
  const out = baseFields(car, galleryUrls) as PublicCarJson;
  if (viewer) {
    const ownHost = car.hostUserId != null && car.hostUserId === viewer.id;
    const ownGuest =
      car.ownerEmail != null && car.ownerEmail.length > 0 && viewer.email.toLowerCase() === car.ownerEmail.toLowerCase();
    out.isViewerOwner = ownHost || ownGuest;
  }
  return out;
}

export function formatAdminCar(car: Car, viewer?: User | null, galleryUrls?: string[] | null) {
  const out: Record<string, unknown> = {
    ...baseFields(car, galleryUrls),
    listingApprovalStatus: car.listingApprovalStatus,
    ownerName: car.ownerName,
    ownerEmail: car.ownerEmail,
    ownerPhone: car.ownerPhone,
  };
  if (viewer && viewer.role !== "admin") {
    out.isViewerOwner = viewerOwnsCar(car, viewer);
  }
  return out;
}

export function viewerOwnsCar(car: Car, viewer: User): boolean {
  if (car.hostUserId != null && car.hostUserId === viewer.id) return true;
  if (car.ownerEmail && viewer.email.toLowerCase() === car.ownerEmail.toLowerCase()) return true;
  return false;
}
