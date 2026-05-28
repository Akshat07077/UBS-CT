import { NextRequest, NextResponse } from "next/server";
import { uploadBookingDocument } from "@/lib/upload-cloudinary";

/** Public upload for guest booking — Aadhar / driving licence. */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const result = await uploadBookingDocument(file);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
