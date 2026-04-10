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

export function MoodSynthPlayer() {
  const engineRef = useRef<MoodSynthEngine | null>(null);
  const [city, setCity] = useState("Buenos Aires");
  const [mood, setMood] = useState<Mood>("Tranquilo");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
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
      const composition = composeMusic(mood, {
        temperature: weather.temperature,
        condition: weather.condition,
        humidity: weather.humidity,
        localTime: weather.localTime,
      });

      await engineRef.current.play(composition);

      setIsPlaying(true);
      setCompositionText(
        `${composition.description} Clima en ${weather.city}: ${weather.condition}.`,
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
    <Card className="w-full max-w-xl border-white/10 bg-black/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-zinc-100">MoodSynth</CardTitle>
        <CardDescription>
          Generador procedural de musica basado en clima y estado de animo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
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

        <p className="text-sm text-zinc-300">{compositionText}</p>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
