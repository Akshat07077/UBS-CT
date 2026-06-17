import { NextRequest, NextResponse } from "next/server";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const USER_AGENT = "UBsCarRental/1.0 (car rental; contact@ubscars.com)";

export type GeocodeResult = {
  displayName: string;
  lat: number;
  lng: number;
};

function nominatimHeaders() {
  return { "User-Agent": USER_AGENT, Accept: "application/json" };
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 3) {
      return NextResponse.json([]);
    }

    const url = new URL(`${NOMINATIM}/search`);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("addressdetails", "0");

    const res = await fetch(url.toString(), {
      headers: nominatimHeaders(),
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Search unavailable" }, { status: 502 });
    }

    const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    const results: GeocodeResult[] = data.map((row) => ({
      displayName: row.display_name,
      lat: Number(row.lat),
      lng: Number(row.lon),
    }));

    return NextResponse.json(results);
  } catch (e) {
    console.error("GET /api/geocode/search", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
