"use client";

import { useQuery } from "@tanstack/react-query";
import { Cloud, Wind, Thermometer, MapPin, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/i18n/context";
import { TranslatedText } from "@/components/ui/translated-text";
import { cn } from "@/lib/utils";

/* ── WMO weather code → human description ─────────────────────── */
function wmoDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 9) return "Overcast";
  if (code <= 19) return "Fog";
  if (code <= 29) return "Drizzle";
  if (code <= 39) return "Rain";
  if (code <= 49) return "Snow";
  if (code <= 59) return "Sleet";
  if (code <= 69) return "Rain showers";
  if (code <= 79) return "Snow showers";
  if (code <= 89) return "Thunderstorm";
  return "Violent thunderstorm";
}

/* ── WMO code → simple icon class ─────────────────────────────── */
function wmoIcon(code: number): string {
  if (code === 0) return "text-yellow-400";
  if (code <= 3) return "text-sky-300";
  if (code <= 9) return "text-slate-400";
  if (code <= 49) return "text-slate-400";
  if (code <= 69) return "text-blue-400";
  return "text-indigo-400";
}

/* ── API response shape ─────────────────────────────────────────── */
interface WeatherData {
  temperature: number;
  windspeed: number;
  weathercode: number;
  latitude: number;
  longitude: number;
  time: string;
}

interface WeatherApiResponse {
  data: WeatherData;
}

/* ── Fetcher ─────────────────────────────────────────────────────── */
async function fetchWeather(inverterId: string): Promise<WeatherData> {
  const res = await fetch(`/api/weather/${inverterId}`);
  if (!res.ok) throw new Error("weather_fetch_failed");
  const json: WeatherApiResponse = await res.json();
  return json.data;
}

/* ── Props ───────────────────────────────────────────────────────── */
interface WeatherCardProps {
  inverterId: string;
  className?: string;
  compact?: boolean;
}

/* ── Component ───────────────────────────────────────────────────── */
export function WeatherCard({ inverterId, className, compact = false }: WeatherCardProps) {
  const { t } = useLang();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<WeatherData, Error>({
    queryKey: ["weather", inverterId],
    queryFn: () => fetchWeather(inverterId),
    staleTime: 10 * 60 * 1000, // 10 min — matches server cache
    retry: 1,
  });

  /* ── Loading ── */
  if (isLoading) {
    return (
      <Card className={cn("border-border/50 bg-surface-1", className)}>
        <CardHeader className="pb-2 pt-4 px-4">
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  /* ── Error ── */
  if (isError || !data) {
    return (
      <Card className={cn("border-border/50 bg-surface-1", className)}>
        <CardContent className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
          <span>{t("weather.unavailable")}</span>
        </CardContent>
      </Card>
    );
  }

  const conditionText = wmoDescription(data.weathercode);
  const iconColour = wmoIcon(data.weathercode);

  if (compact) {
    /* ── Compact inline strip ── */
    return (
      <div className={cn("flex items-center gap-3 text-sm text-muted-foreground", className)}>
        <Cloud className={cn("h-4 w-4 shrink-0", iconColour)} />
        <span className="font-semibold text-foreground">{data.temperature}°C</span>
        <span className="hidden sm:inline">·</span>
        <span className="hidden sm:inline">
          <TranslatedText text={conditionText} />
        </span>
        <span>·</span>
        <Wind className="h-3 w-3 shrink-0" />
        <span>{data.windspeed} km/h</span>
      </div>
    );
  }

  /* ── Full card ── */
  return (
    <Card className={cn("border-border/50 bg-surface-1", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Cloud className={cn("h-4 w-4", iconColour)} />
          {t("weather.title")}
        </CardTitle>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
          title="Refresh weather"
        >
          <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
        </button>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Temperature */}
        <div className="flex items-end gap-1">
          <Thermometer className="mb-1 h-5 w-5 text-orange-400 shrink-0" />
          <span className="text-3xl font-bold text-foreground tabular-nums">
            {data.temperature}
          </span>
          <span className="mb-1 text-lg text-muted-foreground">°C</span>
        </div>

        {/* Condition */}
        <p className="text-sm text-muted-foreground">
          <TranslatedText text={conditionText} />
        </p>

        {/* Wind */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Wind className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground font-medium">{data.windspeed}</span>
          <span>km/h — {t("weather.wind")}</span>
        </div>

        {/* Coordinates */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
          <MapPin className="h-3 w-3 shrink-0" />
          <span>
            {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
