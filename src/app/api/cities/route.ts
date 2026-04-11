import { NextResponse } from "next/server";

type GeocodingItem = {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
};

type CitySuggestion = {
  name: string;
  country: string;
  state?: string;
  label: string;
  query: string;
};

const OPEN_WEATHER_GEOCODE_URL =
  "https://api.openweathermap.org/geo/1.0/direct";

export async function GET(request: Request) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENWEATHER_API_KEY in environment." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] as CitySuggestion[] });
  }

  const geocodeUrl = new URL(OPEN_WEATHER_GEOCODE_URL);
  geocodeUrl.searchParams.set("q", query);
  geocodeUrl.searchParams.set("limit", "6");
  geocodeUrl.searchParams.set("appid", apiKey);

  const geocodeRes = await fetch(geocodeUrl, { cache: "no-store" });

  if (!geocodeRes.ok) {
    return NextResponse.json(
      { error: "Unable to fetch city suggestions." },
      { status: 502 },
    );
  }

  const geocodeData = (await geocodeRes.json()) as GeocodingItem[];
  const unique = new Set<string>();

  const suggestions = geocodeData
    .map((item) => {
      const label = item.state
        ? `${item.name}, ${item.state}, ${item.country}`
        : `${item.name}, ${item.country}`;

      return {
        name: item.name,
        country: item.country,
        state: item.state,
        label,
        query: label,
      } satisfies CitySuggestion;
    })
    .filter((item) => {
      const key = item.label.toLowerCase();
      if (unique.has(key)) {
        return false;
      }
      unique.add(key);
      return true;
    })
    .slice(0, 5);

  return NextResponse.json({ suggestions });
}
