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
  name: string;
  country: string;
  state?: string;
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

const WEATHER_BACKGROUND: Record<WeatherCondition, string> = {
  clear: "bg-clear",
  clouds: "bg-clouds",
  rain: "bg-rain",
  thunderstorm: "bg-thunderstorm",
  snow: "bg-snow",
};

const QUICK_PRESETS: Preset[] = [
  { label: "Calma", mood: "Tranquilo", volume: 42 },
  { label: "Noche", mood: "Melancolico", volume: 36 },
  { label: "Tormenta", mood: "Ansioso", volume: 74 },
];

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
      context.fillStyle = "rgba(0,0,0,0.22)";
      context.fillRect(0, 0, width, height);

      const waveform = engine.getWaveform();
      const bars = 56;
      const barWidth = width / bars;

      for (let i = 0; i < bars; i += 1) {
        const index = Math.floor((i / bars) * waveform.length);
        const sample = Math.abs(waveform[index] ?? 0);
        const amp = isPlaying ? Math.max(sample, 0.04) : 0.03;
        const barHeight = Math.max(6, amp * height * 2.2);
        const x = i * barWidth + barWidth * 0.28;
        const y = (height - barHeight) / 2;

        const opacity = 0.2 + (i / bars) * 0.6;
        context.fillStyle = `rgba(147, 161, 154, ${opacity})`;
        context.beginPath();
        context.roundRect(x, y, Math.max(2, barWidth * 0.45), barHeight, 6);
        context.fill();
      }

      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isPlaying]);

  useEffect(() => {
    const normalized = city.trim();
    if (normalized.length < 2) {
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
        const payload = (await response.json()) as {
          suggestions?: CitySuggestion[];
        };

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
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timerId);
    };
  }, [city]);

  useEffect(() => {
    engineRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoState("denied");
      return;
    }

    setGeoState("requesting");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setGeoState("granted");
      },
      () => {
        setGeoState("denied");
      },
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 300000,
      },
    );
  }, []);

  const isGenerateDisabled = useMemo(() => {
    if (isLoading) {
      return true;
    }

    const canUseGeo = useAutoLocation && geoCoords !== null;
    if (canUseGeo) {
      return false;
    }

    return city.trim().length === 0;
  }, [city, geoCoords, isLoading, useAutoLocation]);

  async function handleGenerate() {
    if (!engineRef.current) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
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

      await engineRef.current.play(composition);
      setIsPlaying(true);
      setLastBpm(composition.bpm);
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

  async function handleRegenerateVariation() {
    if (!engineRef.current) {
      return;
    }

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

    await engineRef.current.play(composition);
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
    <main className={`modern-shell ${WEATHER_BACKGROUND[weatherCondition]}`}>
      <div className="modern-body">
        <section className="modern-main">
          <div className="modern-headline">
            <div>
              <h1>MOODSYNTH_01</h1>
              <p>
                {geoState === "granted"
                  ? "Ubicacion detectada automaticamente"
                  : geoState === "requesting"
                    ? "Solicitando ubicacion..."
                    : "Ubicacion no disponible, usa ciudad manual"}
              </p>
            </div>
            <div className="modern-clock">{weatherData?.localTime ?? "--:--"}</div>
          </div>

          <div className="modern-grid">
            <div className="modern-panel-left">
              <label htmlFor="city">Ciudad</label>
              <div className="modern-toggle-row">
                <button
                  type="button"
                  className={`modern-toggle ${useAutoLocation ? "is-active" : ""}`}
                  onClick={() => setUseAutoLocation(true)}
                  disabled={geoState !== "granted"}
                >
                  Usar ubicacion
                </button>
                <button
                  type="button"
                  className={`modern-toggle ${!useAutoLocation ? "is-active" : ""}`}
                  onClick={() => setUseAutoLocation(false)}
                >
                  Manual
                </button>
              </div>
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

              <label htmlFor="mood">Estado de animo</label>
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
                step={1}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="modern-slider"
              />

              {isSearchingCity ? <p className="modern-help">Buscando ciudades...</p> : null}
              {useAutoLocation && geoState === "granted" ? (
                <p className="modern-help">Usando tu ubicacion actual para el clima.</p>
              ) : null}

              <div className="modern-presets">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="modern-chip"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="modern-panel-center">
              <canvas ref={canvasRef} className="modern-visualizer" />
            </div>

            <div className="modern-panel-right">
              <div className="modern-weather-card">
                <span className="modern-icon">
                  <WeatherIcon condition={weatherCondition} />
                </span>
                <div>
                  <p className="modern-kicker">Environment</p>
                  <h3>{weatherData?.city ?? "Sin ciudad"}</h3>
                </div>
              </div>

              <div className="modern-metrics">
                <div>
                  <p>
                    <Thermometer size={12} /> TEMP
                  </p>
                  <strong>{weatherData ? `${weatherData.temperature}C` : "--"}</strong>
                </div>
                <div>
                  <p>
                    <Droplets size={12} /> HUM
                  </p>
                  <strong>{weatherData ? `${weatherData.humidity}%` : "--"}</strong>
                </div>
                <div>
                  <p>
                    <Clock3 size={12} /> TIME
                  </p>
                  <strong>{weatherData?.localTime ?? "--:--"}</strong>
                </div>
                <div>
                  <p>
                    <Cloud size={12} /> SKY
                  </p>
                  <strong>{weatherLabel(weatherCondition)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="modern-footerbar">
            <div className="modern-dock-top">
              <div className="modern-dock-meta">
                <MapPin size={14} />
                <span>{weatherData?.city ?? "Sin ciudad"}</span>
              </div>
              <div className="modern-dock-meta">
                <Music2 size={14} />
                <span>{mood}</span>
              </div>
              <div className="modern-dock-meta">
                <Volume2 size={14} />
                <span>{volume}%</span>
              </div>
              <div className="modern-dock-meta">
                <Clock3 size={14} />
                <span>{lastBpm ? `${lastBpm} BPM` : "-- BPM"}</span>
              </div>
            </div>

            <div className="modern-dock-actions">
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

            <p>{compositionText}</p>
          </div>

          {error ? <p className="modern-error">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
