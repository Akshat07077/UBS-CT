import { NextRequest, NextResponse } from "next/server";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const USER_AGENT = "UBsCarRental/1.0 (car rental; contact@ubscars.com)";

function nominatimHeaders() {
  return { "User-Agent": USER_AGENT, Accept: "application/json" };
}

export async function GET(req: NextRequest) {
  try {
    const lat = Number(req.nextUrl.searchParams.get("lat"));
    const lng = Number(req.nextUrl.searchParams.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    const url = new URL(`${NOMINATIM}/reverse`);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "0");

    const res = await fetch(url.toString(), {
      headers: nominatimHeaders(),
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Reverse geocode unavailable" }, { status: 502 });
    }

    const data = (await res.json()) as { display_name?: string };
    return NextResponse.json({
      displayName: data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat,
      lng,
    });
  } catch (e) {
    console.error("GET /api/geocode/reverse", e);
    return NextResponse.json({ error: "Reverse geocode failed" }, { status: 500 });
  }
}
