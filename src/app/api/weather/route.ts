import { NextResponse } from "next/server";

type NormalizedCondition =
  | "rain"
  | "clear"
  | "clouds"
  | "thunderstorm"
  | "snow";

type GeocodingItem = {
  lat: number;
  lon: number;
  name: string;
  country: string;
  state?: string;
};

type OpenWeatherCurrentResponse = {
  weather: Array<{
    main: string;
  }>;
  main: {
    temp: number;
    humidity: number;
  };
  timezone: number;
  dt: number;
  name: string;
};

type WeatherApiResponse = {
  city: string;
  temperature: number;
  condition: NormalizedCondition;
  humidity: number;
  localTime: string;
};

const OPEN_WEATHER_GEOCODE_URL =
  "https://api.openweathermap.org/geo/1.0/direct";
const OPEN_WEATHER_CURRENT_URL =
  "https://api.openweathermap.org/data/2.5/weather";

function normalizeCondition(rawMain: string): NormalizedCondition {
  const value = rawMain.toLowerCase();

  if (value === "thunderstorm") {
    return "thunderstorm";
  }

  if (value === "snow") {
    return "snow";
  }

  if (value === "rain" || value === "drizzle") {
    return "rain";
  }

  if (value === "clear") {
    return "clear";
  }

  return "clouds";
}

function formatLocalTime(
  unixSeconds: number,
  timezoneOffsetSeconds: number,
): string {
  const date = new Date((unixSeconds + timezoneOffsetSeconds) * 1000);
  return date.toISOString().slice(11, 16);
}

export async function GET(request: Request) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENWEATHER_API_KEY in environment." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();

  if (!city) {
    return NextResponse.json(
      { error: "Query parameter 'city' is required." },
      { status: 400 },
    );
  }

  const geocodeUrl = new URL(OPEN_WEATHER_GEOCODE_URL);
  geocodeUrl.searchParams.set("q", city);
  geocodeUrl.searchParams.set("limit", "1");
  geocodeUrl.searchParams.set("appid", apiKey);

  const geocodeRes = await fetch(geocodeUrl, { cache: "no-store" });

  if (!geocodeRes.ok) {
    return NextResponse.json(
      { error: "Unable to resolve city coordinates." },
      { status: 502 },
    );
  }

  const geocodeData = (await geocodeRes.json()) as GeocodingItem[];
  const location = geocodeData.at(0);

  if (!location) {
    return NextResponse.json(
      { error: `City '${city}' not found.` },
      { status: 404 },
    );
  }

  const weatherUrl = new URL(OPEN_WEATHER_CURRENT_URL);
  weatherUrl.searchParams.set("lat", String(location.lat));
  weatherUrl.searchParams.set("lon", String(location.lon));
  weatherUrl.searchParams.set("units", "metric");
  weatherUrl.searchParams.set("appid", apiKey);

  const weatherRes = await fetch(weatherUrl, { cache: "no-store" });

  if (!weatherRes.ok) {
    return NextResponse.json(
      { error: "Unable to fetch current weather." },
      { status: 502 },
    );
  }

  const weatherData = (await weatherRes.json()) as OpenWeatherCurrentResponse;

  const payload: WeatherApiResponse = {
    city: weatherData.name,
    temperature: Math.round(weatherData.main.temp),
    condition: normalizeCondition(weatherData.weather[0]?.main ?? "Clouds"),
    humidity: weatherData.main.humidity,
    localTime: formatLocalTime(weatherData.dt, weatherData.timezone),
  };

  return NextResponse.json(payload);
}
