import "@/lib/cloudinary-env";
import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import { isAllowedImageFile, resolveImageMime } from "@/lib/image-file";

const MAX_BYTES = 5 * 1024 * 1024;

export const CLOUDINARY_FOLDERS = {
  admin: "ubs-car-rental/admin",
  listing: "ubs-car-rental/listings",
  bookingDocs: "ubs-car-rental/booking-docs",
} as const;

const DOC_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

function configureCloudinary() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloud_name && !api_key && !api_secret) {
    return false;
  }

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Cloudinary is partially configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on Vercel."
    );
  }

  // Never use broken CLOUDINARY_URL from env templates
  delete process.env.CLOUDINARY_URL;
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return true;
}

function uploadBuffer(
  buffer: Buffer,
  folder: string,
  resourceType: "image" | "raw"
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error("Upload failed. No URL returned from Cloudinary"));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

async function uploadFile(file: File, folder: string, resourceType: "image" | "raw" = "image") {
  if (file.size > MAX_BYTES) {
    throw new Error("File must be 5 MB or smaller.");
  }

  if (!configureCloudinary()) {
    return {
      url: "https://placehold.co/800x600/1a1a1a/D4AF37?text=UB%27s+Car+Rental",
      publicId: "placeholder",
      placeholder: true as const,
    };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const result = await uploadBuffer(buffer, folder, resourceType);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    placeholder: false as const,
  };
}

export async function uploadImageFile(file: File, folder: string) {
  if (!isAllowedImageFile(file)) {
    throw new Error("Please upload a photo (JPEG, PNG, WebP, or HEIC).");
  }
  return uploadFile(file, folder, "image");
}

export async function uploadBookingDocument(file: File) {
  const mime = file.type || resolveImageMime(file);
  const allowed =
    DOC_TYPES.has(mime) ||
    mime.startsWith("image/") ||
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!allowed) {
    throw new Error("Please upload a JPEG, PNG, WebP, HEIC, or PDF file.");
  }
  const resourceType = mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "raw" : "image";
  return uploadFile(file, CLOUDINARY_FOLDERS.bookingDocs, resourceType);
}
