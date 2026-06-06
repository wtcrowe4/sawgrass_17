import { NextResponse } from "next/server";

// Satellite imagery proxy -- keeps API key server-side.
// Fetches a Google Maps Static satellite image centered on TPC Sawgrass hole 17.
//
// Coordinate: 30.194823, -81.390804 (verified via Google Maps pin on hole 17 green)
// Previous coord (30.1989, -81.3953) was landing at the clubhouse -- ~450m NW.
// zoom=18 gives ~331m coverage at this latitude (full hole + surroundings)
// scale=2 doubles pixel density without changing coverage area

const CENTER = "30.194823320989965,-81.3908035333445";
const ZOOM   = 18;
const SIZE   = "640x640";
const SCALE  = 2;

export async function GET() {
  const key =
    process.env.GOOGLE_MAPS_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (!key) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_KEY not configured in .env.local" },
      { status: 500 }
    );
  }

  const url = [
    "https://maps.googleapis.com/maps/api/staticmap",
    `?center=${CENTER}`,
    `&zoom=${ZOOM}`,
    `&size=${SIZE}`,
    `&maptype=satellite`,
    `&scale=${SCALE}`,
    `&key=${key}`,
  ].join("");

  const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 24h

  if (!res.ok) {
    return NextResponse.json(
      { error: `Maps API returned ${res.status}` },
      { status: res.status }
    );
  }

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
