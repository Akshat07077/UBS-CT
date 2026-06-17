export type HandoverLocationValue = {
  address: string;
  lat: number | null;
  lng: number | null;
};

export const EMPTY_HANDOVER_LOCATION: HandoverLocationValue = {
  address: "",
  lat: null,
  lng: null,
};

/** Default map center (India). */
export const DEFAULT_MAP_CENTER = { lat: 20.5937, lng: 78.9629 };

export function handoverFromCar(car: {
  pickupLocation?: string | null;
  dropLocation?: string | null;
  handoverLat?: number | string | null;
  handoverLng?: number | string | null;
}): HandoverLocationValue {
  const address = (car.pickupLocation ?? car.dropLocation ?? "").trim();
  const lat = parseCoord(car.handoverLat);
  const lng = parseCoord(car.handoverLng);
  return { address, lat, lng };
}

function parseCoord(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normalizeHandoverForSave(input: {
  handoverLocation?: string | null;
  pickupLocation?: string | null;
  dropLocation?: string | null;
  handoverLat?: number | string | null;
  handoverLng?: number | string | null;
}) {
  const address =
    (input.handoverLocation ?? input.pickupLocation ?? input.dropLocation ?? "").trim() || null;
  const lat = parseCoord(input.handoverLat);
  const lng = parseCoord(input.handoverLng);
  return {
    pickupLocation: address,
    dropLocation: address,
    handoverLat: lat != null ? String(lat) : null,
    handoverLng: lng != null ? String(lng) : null,
  };
}

export function mapsLink(value: HandoverLocationValue): string | null {
  if (value.lat != null && value.lng != null) {
    return `https://www.openstreetmap.org/?mlat=${value.lat}&mlon=${value.lng}#map=16/${value.lat}/${value.lng}`;
  }
  if (value.address.trim()) {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(value.address.trim())}`;
  }
  return null;
}
