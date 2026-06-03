import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createLead } from "@/lib/leads";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(24),
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(5000),
});

/** Public: submit contact form enquiry. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email, phone, subject, message } = parsed.data;
    await createLead({
      type: "contact",
      name,
      email,
      phone,
      subject,
      message,
      metadata: { source: "contact_page" },
    });

    return NextResponse.json({ ok: true, message: "Thanks. We will get back to you shortly." });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
