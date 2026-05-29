const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

const MAX_UPLOAD_BYTES = 1_400_000; // ~1.4 MB — safe for Vercel serverless body limit
const MAX_SIDE_PX = 1600;

/** iOS Safari often leaves `file.type` empty for camera / gallery picks. */
export function resolveImageMime(file: File): string {
  if (file.type && file.type.startsWith("image/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
  return "image/jpeg";
}

export function isAllowedImageFile(file: File): boolean {
  const mime = resolveImageMime(file);
  return mime.startsWith("image/");
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read photo"));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** Resize + JPEG compress so phone camera photos pass Vercel upload limits. */
async function compressWithCanvas(file: File): Promise<File> {
  const img = await loadImageElement(file);
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error("Invalid image dimensions");

  const scale = Math.min(1, MAX_SIDE_PX / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, 0, 0, w, h);

  for (const q of [0.85, 0.72, 0.58, 0.45]) {
    const blob = await canvasToJpegBlob(canvas, q);
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      return new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    }
    if (blob && q === 0.45) {
      return new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    }
  }

  throw new Error("Could not compress photo");
}

/** Re-wrap or compress before upload (mobile-friendly). */
export async function prepareImageForUpload(file: File): Promise<File> {
  const mime = resolveImageMime(file);

  if (mime === "image/gif") {
    const name = file.name?.trim() || `photo-${Date.now()}.gif`;
    return file.type ? file : new File([await file.arrayBuffer()], name, { type: mime });
  }

  // Already small JPEG from laptop — skip heavy work
  if (file.size <= MAX_UPLOAD_BYTES && mime === "image/jpeg" && file.type === "image/jpeg") {
    return file;
  }

  // Phone photos are often 3–15 MB — compress in browser first
  if (typeof document !== "undefined" && file.size > MAX_UPLOAD_BYTES) {
    try {
      return await compressWithCanvas(file);
    } catch {
      // fall through to re-wrap attempt
    }
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    try {
      return await compressWithCanvas(file);
    } catch {
      throw new Error(
        "Photo is too large. Pick a smaller image from gallery or take a new photo closer to the car."
      );
    }
  }

  const name = file.name?.trim() || `photo-${Date.now()}.jpg`;
  if (file.type === mime && file.name) return file;
  const buf = await file.arrayBuffer();
  return new File([buf], name.includes(".") ? name : `${name}.jpg`, { type: mime });
}

export function formatUploadError(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message;
    if (m.includes("did not match the expected pattern")) {
      return "Photo format not supported. Try again or pick a JPEG from gallery.";
    }
    return m;
  }
  if (err instanceof DOMException) {
    return "Could not read the photo. Try again or pick from gallery.";
  }
  return "Upload failed";
}
