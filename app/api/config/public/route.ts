import { NextResponse } from "next/server";
import { isBookingSandbox, isPaymentsEnabled } from "@/lib/config/features";

export async function GET() {
  return NextResponse.json({
    bookingSandbox: isBookingSandbox(),
    paymentsEnabled: isPaymentsEnabled(),
  });
}
