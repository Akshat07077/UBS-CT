/** Safe JSON parse for upload API responses (avoids vague Safari errors on HTML error pages). */
export async function uploadImageToApi(
  endpoint: "/api/upload/image" | "/api/upload/listing-photo",
  file: File
): Promise<{ url: string; placeholder?: boolean }> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(endpoint, {
    method: "POST",
    body: fd,
    credentials: "include",
  });

  const text = await res.text();
  let data: { url?: string; error?: string; placeholder?: boolean };
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (res.status === 401) {
      throw new Error("Session expired — please log in again and retry.");
    }
    throw new Error(
      "Upload server error. On Vercel, set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (remove placeholder CLOUDINARY_URL)."
    );
  }

  if (!res.ok || !data.url) {
    throw new Error(data.error || "Upload failed");
  }

  return { url: data.url, placeholder: data.placeholder };
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
