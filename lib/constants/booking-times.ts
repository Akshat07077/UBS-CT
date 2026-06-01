/** Half-hour slots from 06:00 to 23:30 for pickup / return. */
export const BOOKING_TIME_SLOTS = Array.from({ length: 36 }, (_, i) => {
  const totalMinutes = 6 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

export const DEFAULT_PICKUP_TIME = "10:00";
export const DEFAULT_RETURN_TIME = "10:00";

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
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) && BOOKING_TIME_SLOTS.includes(t);
}
