import { formatUploadError, prepareImageForUpload } from "@/lib/image-file";

function apiUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

async function parseUploadResponse(res: Response): Promise<{
  url?: string;
  error?: string;
  placeholder?: boolean;
}> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (res.status === 401) {
      throw new Error("Session expired — open the site in your phone browser, log in again, then retry.");
    }
    if (res.status === 413) {
      throw new Error("Photo too large for server. We tried to compress it — pick a smaller image or use Wi‑Fi and retry.");
    }
    if (res.status === 403) {
      throw new Error("Upload not allowed. Please log in as admin on this device.");
    }
    if (res.status >= 500) {
      throw new Error(
        "Server error — add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET on Vercel (remove placeholder CLOUDINARY_URL), then redeploy."
      );
    }
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error(
        `Upload blocked (${res.status}). On Vercel: set Cloudinary env vars and redeploy. On phone: use Wi‑Fi and a smaller photo.`
      );
    }
    throw new Error(`Upload failed (HTTP ${res.status}). Try again on Wi‑Fi.`);
  }
}

/** Car listing / admin gallery photo upload. Uses public listing route (no cookie issues on mobile). */
export async function uploadImageToApi(
  endpoint: "/api/upload/image" | "/api/upload/listing-photo" = "/api/upload/listing-photo",
  file: File
): Promise<{ url: string; placeholder?: boolean }> {
  try {
    const prepared = await prepareImageForUpload(file);
    const fd = new FormData();
    fd.append("file", prepared, prepared.name);

    const res = await fetch(apiUrl(endpoint), {
      method: "POST",
      body: fd,
      credentials: "include",
      cache: "no-store",
    });

    const data = await parseUploadResponse(res);

    if (!res.ok || !data.url) {
      throw new Error(data.error || "Upload failed");
    }

    return { url: data.url, placeholder: data.placeholder };
  } catch (err) {
    throw new Error(formatUploadError(err));
  }
}

/** Booking Aadhar / licence upload. */
export async function uploadBookingDocToApi(file: File): Promise<string> {
  try {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const prepared = isPdf ? file : await prepareImageForUpload(file);
    const fd = new FormData();
    fd.append("file", prepared, prepared.name);

    const res = await fetch(apiUrl("/api/upload/booking-document"), {
      method: "POST",
      body: fd,
      credentials: "include",
      cache: "no-store",
    });

    const data = await parseUploadResponse(res);
    if (!res.ok || !data.url) {
      throw new Error(data.error || "Upload failed");
    }
    return data.url;
  } catch (err) {
    throw new Error(formatUploadError(err));
  }
}

export function canPreviewImageUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith("/")) return true;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
