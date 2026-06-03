/** Booking search fields passed home → browse → car detail. */
export type BookingSearchParams = {
  location?: string;
  pickup?: string;
  return?: string;
  pickupTime?: string;
  returnTime?: string;
};

type ParamSource = Pick<URLSearchParams, "get">;

export function parseBookingSearchParams(sp: ParamSource): BookingSearchParams {
  return {
    location: sp.get("location")?.trim() || undefined,
    pickup: sp.get("pickup")?.trim() || undefined,
    return: sp.get("return")?.trim() || undefined,
    pickupTime: sp.get("pickupTime")?.trim() || undefined,
    returnTime: sp.get("returnTime")?.trim() || undefined,
  };
}

export function bookingSearchParamsToQueryString(params: BookingSearchParams): string {
  const q = new URLSearchParams();
  if (params.location) q.set("location", params.location);
  if (params.pickup) q.set("pickup", params.pickup);
  if (params.return) q.set("return", params.return);
  if (params.pickupTime) q.set("pickupTime", params.pickupTime);
  if (params.returnTime) q.set("returnTime", params.returnTime);
  return q.toString();
}

export function carDetailHref(carId: number, params: BookingSearchParams = {}): string {
  const qs = bookingSearchParamsToQueryString(params);
  return qs ? `/cars/${carId}?${qs}` : `/cars/${carId}`;
}

export function hasBookingSearch(params: BookingSearchParams): boolean {
  return !!(params.pickup || params.return || params.pickupTime || params.returnTime);
}
