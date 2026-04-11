"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { MoodSynthEngine } from "@/lib/audio-engine";
import { composeMusic, type Mood, type WeatherCondition } from "@/lib/composer";

type WeatherApiResponse = {
  city: string;
  temperature: number;
  condition: WeatherCondition;
  humidity: number;
  localTime: string;
};

const MOODS: Array<{ value: Mood; label: string }> = [
  { value: "Feliz", label: "Feliz" },
  { value: "Melancolico", label: "Melancolico" },
  { value: "Ansioso", label: "Ansioso" },
  { value: "Tranquilo", label: "Tranquilo" },
  { value: "Energetico", label: "Energetico" },
];

const WEATHER_BACKGROUND: Record<WeatherCondition, string> = {
  clear: "bg-clear",
  clouds: "bg-clouds",
  rain: "bg-rain",
  thunderstorm: "bg-thunderstorm",
  snow: "bg-snow",
};

function weatherLabel(condition: WeatherCondition): string {
  if (condition === "clear") return "despejado";
  if (condition === "clouds") return "nublado";
  if (condition === "rain") return "lluvia";
  if (condition === "thunderstorm") return "tormenta";
  return "nieve";
}

export function MoodSynthPlayer() {
  const engineRef = useRef<MoodSynthEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [city, setCity] = useState("Buenos Aires");
  const [mood, setMood] = useState<Mood>("Tranquilo");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [weatherCondition, setWeatherCondition] =
    useState<WeatherCondition>("clouds");
  const [compositionText, setCompositionText] = useState(
    "Completa ciudad y estado de animo para generar una pieza.",
  );
  const [error, setError] = useState<string | null>(null);

  if (!engineRef.current) {
    engineRef.current = new MoodSynthEngine();
  }

  useEffect(() => {
    const engine = engineRef.current;

    return () => {
      engine?.dispose();
    };
  }, []);

  useEffect(() => {
    let frameId = 0;

    const canvas = canvasRef.current;
    const engine = engineRef.current;

    if (!canvas || !engine) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(5, 8, 18, 0.35)";
      context.fillRect(0, 0, width, height);

      const waveform = engine.getWaveform();

      context.beginPath();
      context.lineWidth = 2;
      context.strokeStyle = "rgba(167, 243, 208, 0.95)";

      if (isPlaying && waveform.length > 0) {
        for (let i = 0; i < waveform.length; i += 1) {
          const x = (i / (waveform.length - 1)) * width;
          const y = ((waveform[i] + 1) / 2) * height;

          if (i === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
        }
      } else {
        context.moveTo(0, height / 2);
        context.lineTo(width, height / 2);
      }

      context.stroke();
      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isPlaying]);

  const isGenerateDisabled = useMemo(
    () => isLoading || city.trim().length === 0,
    [city, isLoading],
  );

  async function handleGenerate() {
    if (!engineRef.current) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/weather?city=${encodeURIComponent(city.trim())}`,
      );
      const data = (await response.json()) as
        | WeatherApiResponse
        | { error: string };

      if (!response.ok) {
        const message =
          "error" in data ? data.error : "No se pudo obtener el clima.";
        throw new Error(message);
      }

      const weather = data as WeatherApiResponse;
      setWeatherCondition(weather.condition);
      const composition = composeMusic(mood, {
        temperature: weather.temperature,
        condition: weather.condition,
        humidity: weather.humidity,
        localTime: weather.localTime,
      });

      await engineRef.current.play(composition);

      setIsPlaying(true);
      setCompositionText(
        `${composition.description} Clima en ${weather.city}: ${weatherLabel(weather.condition)}, ${weather.temperature}C y humedad ${weather.humidity}%. Hora local ${weather.localTime}.`,
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Fallo inesperado al generar musica.";
      setError(message);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleStop() {
    engineRef.current?.stop();
    setIsPlaying(false);
  }

  return (
    <main
      className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 ${WEATHER_BACKGROUND[weatherCondition]}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,.16),transparent_40%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,.1),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(0,0,0,.4),transparent_52%)]" />

      <Card className="relative z-10 w-full max-w-2xl border-white/15 bg-black/45 shadow-2xl backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-2xl text-zinc-100">MoodSynth</CardTitle>
          <CardDescription>
            Generador procedural de musica basado en estado de animo y clima en
            tiempo real.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1.2fr_.8fr]">
            <div className="space-y-2">
              <label className="text-sm text-zinc-300" htmlFor="city">
                Ciudad
              </label>
              <Input
                id="city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Ej: Buenos Aires"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-300" htmlFor="mood">
                Estado de animo
              </label>
              <Select
                value={mood}
                onValueChange={(value) => setMood(value as Mood)}
              >
                <SelectTrigger id="mood" className="w-full">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {MOODS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="sm:flex-1"
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
            >
              {isLoading ? "Generando..." : "Generar musica"}
            </Button>
            <Button
              variant="secondary"
              className="sm:flex-1"
              onClick={handleStop}
              disabled={!isPlaying}
            >
              Detener
            </Button>
          </div>

          <canvas
            ref={canvasRef}
            className="h-28 w-full rounded-lg border border-white/20 bg-black/30"
          />

          <p className="text-sm leading-relaxed text-zinc-200">
            {compositionText}
          </p>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="pointer-events-none absolute bottom-4 z-10 text-xs tracking-wide text-white/70">
        Clima actual: {weatherLabel(weatherCondition)}
      </div>
    </main>
  );
}
