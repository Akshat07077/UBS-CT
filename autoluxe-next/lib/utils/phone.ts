/** Format E.164-ish digits as +91 XXXXX XXXXX for Indian mobile numbers. */
export function formatPhoneDisplay(raw: string) {
  const d = raw.replace(/\D/g, "");
  const national = d.startsWith("91") && d.length >= 12 ? d.slice(2) : d;
  if (national.length === 10) return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  return d ? `+${d}` : raw;
}

export function formatPhonesDisplay(phones: string[]) {
  return phones.map(formatPhoneDisplay).join(" · ");
}
