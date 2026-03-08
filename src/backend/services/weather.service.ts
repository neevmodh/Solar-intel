/**
 * Small weather service using Open-Meteo (no API key required).
 * Provides current weather + short forecast for an inverter.
 * Caches results in-memory for a short TTL to avoid rate limits.
 */

import { env } from "@/backend/config";
import { connectDB } from "@/backend/config";
import { Inverter } from "@/backend/models";
import logger from "@/backend/utils/logger";

type CurrentWeather = {
  temperature: number;
  windspeed: number;
  winddirection?: number;
  weathercode?: number;
  time?: string;
};

type HourlyWeather = {
  time: string[];
  temperature_2m?: number[];
  precipitation?: number[];
  wind_speed?: number[];
  weathercode?: number[];
};

type WeatherData = {
  latitude: number;
  longitude: number;
  current?: CurrentWeather;
  hourly?: HourlyWeather;
  raw?: unknown;
};

const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes
const cache = new Map<string, { ts: number; data: WeatherData }>();

async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current_weather", "true");
  url.searchParams.set("hourly", "temperature_2m,precipitation,wind_speed,weathercode");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const json = await res.json();
  return {
    latitude: Number(json.latitude),
    longitude: Number(json.longitude),
    current: json.current_weather as CurrentWeather,
    hourly: json.hourly as HourlyWeather,
    raw: json as unknown,
  };
}

/** Get weather by coordinates, with caching. */
export async function getWeatherByCoords(lat: number, lon: number): Promise<WeatherData> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const entry = cache.get(key);
  const now = Date.now();
  if (entry && now - entry.ts < CACHE_TTL_MS) return entry.data;

  try {
    let data: WeatherData;
    // Currently only open-meteo is implemented (no API key)
    if ((env.WEATHER_PROVIDER || "open-meteo") === "open-meteo") {
      data = await fetchOpenMeteo(lat, lon);
    } else {
      // Placeholder for other providers if configured in future
      data = await fetchOpenMeteo(lat, lon);
    }
    cache.set(key, { ts: now, data });
    return data;
  } catch (err) {
    logger.error("getWeatherByCoords failed", { error: (err as Error).message, lat, lon });
    throw err;
  }
}

/**
 * Get weather for an inverter by id. Falls back to DEFAULT_LATITUDE/LONGITUDE
 * if the inverter document doesn't contain explicit coords.
 */
export async function getWeatherForInverter(inverterId: string): Promise<WeatherData> {
  await connectDB();
  const inv = await Inverter.findOne({ inverterId }).lean();

  let lat = parseFloat(env.DEFAULT_LATITUDE as string);
  let lon = parseFloat(env.DEFAULT_LONGITUDE as string);

  if (inv) {
    // If the inverter document contains latitude/longitude fields, use them.
    // This is optional and DOES NOT affect ML training data unless you explicitly
    // choose to include these fields in the training pipeline.
  const maybeLat = (inv as unknown as Record<string, unknown>)?.latitude;
  const maybeLon = (inv as unknown as Record<string, unknown>)?.longitude;
    if (typeof maybeLat === "number" || typeof maybeLat === "string") {
      const parsed = Number(maybeLat);
      if (!Number.isNaN(parsed)) lat = parsed;
    }
    if (typeof maybeLon === "number" || typeof maybeLon === "string") {
      const parsed = Number(maybeLon);
      if (!Number.isNaN(parsed)) lon = parsed;
    }
  }

  return getWeatherByCoords(lat, lon);
}

const weatherService = {
  getWeatherByCoords,
  getWeatherForInverter,
};

export default weatherService;
