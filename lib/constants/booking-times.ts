/** Half-hour slots from 06:00 to 23:30 for pickup / return. */
export const BOOKING_TIME_SLOTS = Array.from({ length: 36 }, (_, i) => {
  const totalMinutes = 6 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

export const DEFAULT_PICKUP_TIME = "10:00";
export const DEFAULT_RETURN_TIME = "10:00";

/** Minimum lead time before pickup (same-day bookings). */
export const MIN_BOOKING_LEAD_MINUTES = 30;

/** Local calendar date YYYY-MM-DD (avoids UTC off-by-one). */
export function localDateYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function compareTime24(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Parse HH:mm or HH:mm:ss from native time inputs. */
export function parseTime24(t: string): { h: number; m: number } | null {
  const match = t.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

/** Snap any time to nearest 30-minute booking slot (06:00–23:30). */
export function snapToBookingSlot(t: string, fallback = DEFAULT_PICKUP_TIME): string {
  const parsed = parseTime24(t);
  if (!parsed) return fallback;
  let total = parsed.h * 60 + parsed.m;
  total = Math.round(total / 30) * 30;
  total = Math.max(6 * 60, Math.min(23 * 60 + 30, total));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Slots on or after optional minimum time. */
export function bookingSlotsFrom(minTime?: string): string[] {
  if (!minTime) return BOOKING_TIME_SLOTS;
  return BOOKING_TIME_SLOTS.filter((s) => compareTime24(s, minTime) >= 0);
}

export function clampPickupTime(dateYmd: string, time: string): string {
  let t = snapToBookingSlot(time);
  const min = earliestPickupTimeOnDate(dateYmd);
  if (min && compareTime24(t, min) < 0) return min;
  return t;
}

export function clampReturnTime(
  pickupYmd: string,
  pickupT: string,
  returnYmd: string,
  returnT: string
): string {
  let t = snapToBookingSlot(returnT, DEFAULT_RETURN_TIME);
  if (returnYmd === pickupYmd) {
    const min = earliestReturnTimeSameDay(pickupT);
    if (compareTime24(t, min) < 0) return min;
  }
  return t;
}

/** Pick a value that exists in `slots`, keeping current if valid else first slot. */
export function ensureTimeInSlots(value: string, slots: string[], fallback: string): string {
  if (slots.includes(value)) return value;
  if (slots.length > 0) return slots[0];
  return fallback;
}

/** Parse date + time in local timezone. */
export function parseBookingDateTime(dateYmd: string, time24: string): Date | null {
  const [y, mo, d] = dateYmd.split("-").map(Number);
  const [h, mi] = time24.split(":").map(Number);
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) return null;
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

/** Round up to the next 30-minute booking slot. */
export function ceilToBookingSlot(d: Date): string {
  let total = d.getHours() * 60 + d.getMinutes();
  total = Math.ceil(total / 30) * 30;
  if (total > 23 * 60 + 30) return "23:30";
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Earliest pickup time (HH:mm) allowed on `pickupDate`; undefined if any slot is OK. */
export function earliestPickupTimeOnDate(pickupDate: string, now = new Date()): string | undefined {
  if (pickupDate !== localDateYmd(now)) return undefined;
  const earliest = new Date(now.getTime() + MIN_BOOKING_LEAD_MINUTES * 60_000);
  const slot = ceilToBookingSlot(earliest);
  if (!BOOKING_TIME_SLOTS.includes(slot)) {
    return BOOKING_TIME_SLOTS[BOOKING_TIME_SLOTS.length - 1];
  }
  return slot;
}

/** Earliest return time when return is the same day as pickup. */
export function earliestReturnTimeSameDay(pickupTime: string): string {
  const [h, m] = pickupTime.split(":").map(Number);
  const dt = new Date(2000, 0, 1, h, m + MIN_BOOKING_LEAD_MINUTES, 0, 0);
  return ceilToBookingSlot(dt);
}

export function defaultPickupTimeForDate(pickupDate: string, now = new Date()): string {
  const min = earliestPickupTimeOnDate(pickupDate, now);
  if (!min) return DEFAULT_PICKUP_TIME;
  return compareTime24(DEFAULT_PICKUP_TIME, min) >= 0 ? DEFAULT_PICKUP_TIME : min;
}

export function validateBookingSchedule(
  pickupDate: string,
  pickupTime: string,
  returnDate: string,
  returnTime: string,
  now = new Date()
): string | null {
  if (!isValidBookingTime(pickupTime) || !isValidBookingTime(returnTime)) {
    return "Please choose valid pickup and return times (6:00 AM – 11:30 PM, every 30 min).";
  }

  const todayYmd = localDateYmd(now);
  if (pickupDate < todayYmd) {
    return "Pickup date cannot be in the past.";
  }

  const pickupDt = parseBookingDateTime(pickupDate, pickupTime);
  const returnDt = parseBookingDateTime(returnDate, returnTime);
  if (!pickupDt || !returnDt) {
    return "Invalid pickup or return schedule.";
  }

  const minPickupMs = now.getTime() + MIN_BOOKING_LEAD_MINUTES * 60_000;
  if (pickupDt.getTime() < minPickupMs) {
    return `Pickup must be at least ${MIN_BOOKING_LEAD_MINUTES} minutes from now.`;
  }

  if (returnDt.getTime() <= pickupDt.getTime()) {
    return "Return must be after pickup (date and time).";
  }

  return null;
}

/** "10:00" → "10:00 AM" */
export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  if (Number.isNaN(h)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

/** "2026-06-01" → "01/06/2026" for compact mobile display */
export function formatDateDdMmYyyy(dateYmd: string): string {
  const [y, mo, d] = dateYmd.split("-").map(Number);
  if (!y || !mo || !d) return "";
  return `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}/${y}`;
}

export function formatBookingDateTime(dateYmd: string, time24: string): string {
  const [y, mo, d] = dateYmd.split("-").map(Number);
  if (!y || !mo || !d) return `${dateYmd} ${formatTime12h(time24)}`;
  const date = new Date(y, mo - 1, d);
  const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${day} · ${formatTime12h(time24)}`;
}

export function isValidBookingTime(t: string): boolean {
  if (!parseTime24(t)) return false;
  return BOOKING_TIME_SLOTS.includes(snapToBookingSlot(t));
}
