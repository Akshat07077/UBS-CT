import { NextResponse } from "next/server";
import { isCloudinaryConfigured } from "@/lib/upload-cloudinary";

/** GET — whether Cloudinary env vars are set (for dev UI hints). */
export async function GET() {
  return NextResponse.json({ configured: isCloudinaryConfigured() });
}
