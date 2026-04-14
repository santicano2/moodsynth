"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Clock3,
  Droplets,
  MapPin,
  Music2,
  Sun,
  Thermometer,
  WandSparkles,
  Volume2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

type CitySuggestion = {
  label: string;
  query: string;
};

type Preset = {
  label: string;
  mood: Mood;
  volume: number;
};

const MOODS: Array<{ value: Mood; label: string }> = [
  { value: "Feliz", label: "Feliz" },
  { value: "Melancolico", label: "Melancolico" },
  { value: "Ansioso", label: "Ansioso" },
  { value: "Tranquilo", label: "Tranquilo" },
  { value: "Energetico", label: "Energetico" },
];

const QUICK_PRESETS: Preset[] = [
  { label: "Calma", mood: "Tranquilo", volume: 42 },
  { label: "Noche", mood: "Melancolico", volume: 36 },
  { label: "Tormenta", mood: "Ansioso", volume: 74 },
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

function WeatherIcon({ condition }: { condition: WeatherCondition }) {
  if (condition === "clear") return <Sun size={20} />;
  if (condition === "clouds") return <Cloud size={20} />;
  if (condition === "rain") return <CloudRain size={20} />;
  if (condition === "thunderstorm") return <CloudLightning size={20} />;
  return <CloudSnow size={20} />;
}

export function MoodSynthPlayer() {
  const engineRef = useRef<MoodSynthEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [city, setCity] = useState("Buenos Aires");
  const [mood, setMood] = useState<Mood>("Tranquilo");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [volume, setVolume] = useState(70);
  const [useAutoLocation, setUseAutoLocation] = useState(true);
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>("clouds");
  const [weatherData, setWeatherData] = useState<WeatherApiResponse | null>(null);
  const [lastBpm, setLastBpm] = useState<number | null>(null);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "requesting" | "granted" | "denied">(
    "idle",
  );
  const [compositionText, setCompositionText] = useState(
    "Listo para generar una pieza unica. Ajusta mood y ubicacion.",
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
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoState("denied");
      return;
    }

    setGeoState("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        setGeoState("granted");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    if (geoState === "denied") {
      setUseAutoLocation(false);
    }
  }, [geoState]);

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
      context.fillStyle = "rgba(0,0,0,0.2)";
      context.fillRect(0, 0, width, height);

      const waveform = engine.getWaveform();
      const bars = 64;
      const barWidth = width / bars;

      for (let i = 0; i < bars; i += 1) {
        const index = Math.floor((i / bars) * waveform.length);
        const sample = Math.abs(waveform[index] ?? 0);
        const amp = isPlaying ? Math.max(sample, 0.05) : 0.025;
        const barHeight = Math.max(4, amp * height * 2.3);
        const x = i * barWidth + barWidth * 0.3;
        const y = (height - barHeight) / 2;

        context.fillStyle = `rgba(159, 175, 166, ${0.2 + (i / bars) * 0.7})`;
        context.beginPath();
        context.roundRect(x, y, Math.max(2, barWidth * 0.42), barHeight, 4);
        context.fill();
      }

      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying]);

  useEffect(() => {
    const normalized = city.trim();
    if (normalized.length < 2 || (useAutoLocation && geoCoords)) {
      setCitySuggestions([]);
      setIsSearchingCity(false);
      return;
    }

    const controller = new AbortController();
    const timerId = window.setTimeout(async () => {
      setIsSearchingCity(true);
      try {
        const response = await fetch(`/api/cities?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as { suggestions?: CitySuggestion[] };

        if (!response.ok) {
          setCitySuggestions([]);
          return;
        }

        setCitySuggestions(payload.suggestions ?? []);
      } catch (caughtError) {
        if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
          return;
        }
        setCitySuggestions([]);
      } finally {
        setIsSearchingCity(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timerId);
    };
  }, [city, geoCoords, useAutoLocation]);

  useEffect(() => {
    engineRef.current?.setVolume(volume);
  }, [volume]);

  const isGenerateDisabled = useMemo(() => {
    if (isLoading) return true;
    if (useAutoLocation && geoCoords) return false;
    return city.trim().length === 0;
  }, [city, geoCoords, isLoading, useAutoLocation]);

  async function fetchAndPlayWeather() {
    const params = new URLSearchParams();
    if (useAutoLocation && geoCoords) {
      params.set("lat", String(geoCoords.lat));
      params.set("lon", String(geoCoords.lon));
    } else {
      params.set("city", city.trim());
    }

    const response = await fetch(`/api/weather?${params.toString()}`);
    const data = (await response.json()) as WeatherApiResponse | { error: string };

    if (!response.ok) {
      const message = "error" in data ? data.error : "No se pudo obtener el clima.";
      throw new Error(message);
    }

    const weather = data as WeatherApiResponse;
    setWeatherData(weather);
    setWeatherCondition(weather.condition);

    const composition = composeMusic(mood, {
      temperature: weather.temperature,
      condition: weather.condition,
      humidity: weather.humidity,
      localTime: weather.localTime,
    });

    await engineRef.current?.play(composition);
    setIsPlaying(true);
    setLastBpm(composition.bpm);
    setCompositionText(
      `${composition.description} Clima en ${weather.city}: ${weatherLabel(weather.condition)}, ${weather.temperature}C y humedad ${weather.humidity}%. Hora local ${weather.localTime}.`,
    );
  }

  async function handleGenerate() {
    setError(null);
    setIsLoading(true);
    try {
      await fetchAndPlayWeather();
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

  async function handleRegenerateVariation() {
    if (!weatherData) {
      await handleGenerate();
      return;
    }

    setError(null);
    const composition = composeMusic(mood, {
      temperature: weatherData.temperature,
      condition: weatherData.condition,
      humidity: weatherData.humidity,
      localTime: weatherData.localTime,
    });

    await engineRef.current?.play(composition);
    setIsPlaying(true);
    setLastBpm(composition.bpm);
    setCompositionText(
      `${composition.description} Variacion regenerada para ${weatherData.city} con ${weatherLabel(weatherData.condition)}.`,
    );
  }

  function applyPreset(preset: Preset) {
    setMood(preset.mood);
    setVolume(preset.volume);
  }

  return (
    <main className={`studio-shell ${WEATHER_BACKGROUND[weatherCondition]}`}>
      <div className="studio-overlay" />

      <section className="studio-frame">
        <header className="studio-head">
          <div>
            <p className="studio-kicker">MoodSynth</p>
            <h1>Procedural Atmospheres</h1>
          </div>
          <div className="studio-time">{weatherData?.localTime ?? "--:--"}</div>
        </header>

        <div className="studio-grid">
          <aside className="panel controls">
            <div className="mode-toggle">
              <button
                type="button"
                className={useAutoLocation ? "active" : ""}
                onClick={() => setUseAutoLocation(true)}
                disabled={geoState !== "granted"}
              >
                Ubicacion
              </button>
              <button
                type="button"
                className={!useAutoLocation ? "active" : ""}
                onClick={() => setUseAutoLocation(false)}
              >
                Manual
              </button>
            </div>

            <label htmlFor="city">Ciudad</label>
            <Input
              id="city"
              list="city-suggestions"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Ej: Buenos Aires"
              autoComplete="off"
              disabled={useAutoLocation && geoState === "granted"}
            />
            <datalist id="city-suggestions">
              {citySuggestions.map((suggestion) => (
                <option key={`${suggestion.query}-${suggestion.label}`} value={suggestion.query}>
                  {suggestion.label}
                </option>
              ))}
            </datalist>

            <label htmlFor="mood">Mood</label>
            <Select value={mood} onValueChange={(value) => setMood(value as Mood)}>
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

            <label htmlFor="volume">Volumen {volume}%</label>
            <input
              id="volume"
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="studio-slider"
            />

            <div className="preset-row">
              {QUICK_PRESETS.map((preset) => (
                <button key={preset.label} type="button" onClick={() => applyPreset(preset)}>
                  {preset.label}
                </button>
              ))}
            </div>

            {isSearchingCity ? <p className="hint">Buscando ciudades...</p> : null}
            {useAutoLocation && geoState === "granted" ? (
              <p className="hint">Se usa la ubicacion actual.</p>
            ) : null}
          </aside>

          <section className="panel visualizer-panel">
            <canvas ref={canvasRef} className="studio-visualizer" />
          </section>

          <aside className="panel weather">
            <div className="weather-head">
              <span className="icon-wrap">
                <WeatherIcon condition={weatherCondition} />
              </span>
              <div>
                <p>Entorno</p>
                <h3>{weatherData?.city ?? "Sin ciudad"}</h3>
              </div>
            </div>

            <div className="metric-grid">
              <article>
                <p>
                  <Thermometer size={12} /> Temp
                </p>
                <strong>{weatherData ? `${weatherData.temperature}C` : "--"}</strong>
              </article>
              <article>
                <p>
                  <Droplets size={12} /> Humedad
                </p>
                <strong>{weatherData ? `${weatherData.humidity}%` : "--"}</strong>
              </article>
              <article>
                <p>
                  <Clock3 size={12} /> Hora
                </p>
                <strong>{weatherData?.localTime ?? "--:--"}</strong>
              </article>
              <article>
                <p>
                  <Cloud size={12} /> Cielo
                </p>
                <strong>{weatherLabel(weatherCondition)}</strong>
              </article>
            </div>
          </aside>
        </div>

        <footer className="studio-dock">
          <div className="dock-meta">
            <span>
              <MapPin size={14} /> {weatherData?.city ?? "Sin ciudad"}
            </span>
            <span>
              <Music2 size={14} /> {mood}
            </span>
            <span>
              <Volume2 size={14} /> {volume}%
            </span>
            <span>
              <Clock3 size={14} /> {lastBpm ? `${lastBpm} BPM` : "-- BPM"}
            </span>
          </div>

          <div className="dock-actions">
            <Button onClick={handleGenerate} disabled={isGenerateDisabled}>
              {isLoading ? "Generando..." : "Generar"}
            </Button>
            <Button variant="outline" onClick={handleRegenerateVariation}>
              <WandSparkles size={14} /> Variar
            </Button>
            <Button variant="secondary" onClick={handleStop} disabled={!isPlaying}>
              Detener
            </Button>
          </div>

          <p className="dock-text">{compositionText}</p>
        </footer>

        {error ? <p className="dock-error">{error}</p> : null}
      </section>
    </main>
  );
}
