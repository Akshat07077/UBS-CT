import "@/lib/cloudinary-env";
import { v2 as cloudinary } from "cloudinary";

const MAX_BYTES = 5 * 1024 * 1024;

/** Folder prefix in your Cloudinary Media Library */
export const CLOUDINARY_FOLDERS = {
  admin: "ubs-car-rental/admin",
  listing: "ubs-car-rental/listings",
  bookingDocs: "ubs-car-rental/booking-docs",
} as const;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DOC_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);

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
      "Cloudinary is partially configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env (see docs/CLOUDINARY.md)."
    );
  }

  cloudinary.config({ cloud_name, api_key, api_secret });
  return true;
}

export async function uploadImageFile(file: File, folder: string) {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("Please upload a JPEG, PNG, WebP, or GIF image.");
  }
  return uploadFile(file, folder, "image");
}

/** ID proofs for bookings — photo or PDF, max 5 MB */
export async function uploadBookingDocument(file: File) {
  if (!DOC_TYPES.has(file.type)) {
    throw new Error("Please upload a JPEG, PNG, WebP, or PDF file.");
  }
  const resourceType = file.type === "application/pdf" ? "raw" : "image";
  return uploadFile(file, CLOUDINARY_FOLDERS.bookingDocs, resourceType);
}

async function uploadFile(file: File, folder: string, resourceType: "image" | "raw" = "image") {
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
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
  const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(base64, {
    folder,
    resource_type: resourceType,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    placeholder: false as const,
  };
}
