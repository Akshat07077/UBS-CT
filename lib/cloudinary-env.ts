/**
 * Cloudinary SDK auto-reads CLOUDINARY_URL on import.
 * Placeholder values like cloudinary://<your_api_key>:... break URL parsing
 * with "The string did not match the expected pattern" (especially on mobile Safari).
 */
function sanitizeCloudinaryUrlEnv() {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (!url) return;

  const looksLikePlaceholder =
    url.includes("<") ||
    url.includes(">") ||
    url.includes("your_api") ||
    url.includes("YOUR_");

  if (looksLikePlaceholder) {
    delete process.env.CLOUDINARY_URL;
    return;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "cloudinary:") {
      delete process.env.CLOUDINARY_URL;
    }
  } catch {
    delete process.env.CLOUDINARY_URL;
  }
}

sanitizeCloudinaryUrlEnv();
