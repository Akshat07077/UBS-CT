/** Last 10 digits for Indian mobile matching. */
export function phoneDigits(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length >= 10) return d.slice(-10);
  return d;
}

export function phonesMatch(
  stored: string | null | undefined,
  lookup: string
): boolean {
  if (!stored?.trim() || !lookup.trim()) return false;
  const a = phoneDigits(stored);
  const b = phoneDigits(lookup);
  return a.length >= 10 && b.length >= 10 && a === b;
}

export function isValidLookupPhone(raw: string): boolean {
  return phoneDigits(raw).length === 10;
}
