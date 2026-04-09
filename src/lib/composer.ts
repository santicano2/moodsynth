export type Mood =
  | "Feliz"
  | "Melancolico"
  | "Ansioso"
  | "Tranquilo"
  | "Energetico";

export type WeatherCondition =
  | "rain"
  | "clear"
  | "clouds"
  | "thunderstorm"
  | "snow";

export type WeatherInput = {
  temperature: number;
  condition: WeatherCondition;
  humidity: number;
  localTime?: string;
};

export type ScaleMode = "major" | "minor" | "dorian" | "phrygian";

export type Instrument = "synth" | "piano" | "ambient-pad" | "pluck";

type Density = "light" | "normal" | "dense";
type Brightness = "dark" | "neutral" | "bright";

type LayerData = {
  melody: Array<string | null>;
  bass: Array<string | null>;
  pad: Array<string[] | null>;
};

export type CompositionConfig = {
  mood: Mood;
  weather: WeatherCondition;
  keyRoot: string;
  scale: ScaleMode;
  bpm: number;
  instruments: Instrument[];
  ambience: {
    reverb: boolean;
    density: Density;
    brightness: Brightness;
  };
  transport: {
    melodySubdivision: "8n";
    bassSubdivision: "4n";
    padSubdivision: "1m";
  };
  layers: LayerData;
  description: string;
};

const SCALE_INTERVALS: Record<ScaleMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const MOOD_PROFILE: Record<
  Mood,
  {
    baseScale: ScaleMode;
    energy: number;
    instruments: Instrument[];
    roots: string[];
  }
> = {
  Feliz: {
    baseScale: "major",
    energy: 0.68,
    instruments: ["pluck", "synth"],
    roots: ["C", "D", "G", "A"],
  },
  Melancolico: {
    baseScale: "minor",
    energy: 0.22,
    instruments: ["piano", "ambient-pad"],
    roots: ["D", "E", "A", "B"],
  },
  Ansioso: {
    baseScale: "phrygian",
    energy: 0.85,
    instruments: ["synth", "piano"],
    roots: ["E", "F#", "G", "B"],
  },
  Tranquilo: {
    baseScale: "dorian",
    energy: 0.35,
    instruments: ["ambient-pad", "piano"],
    roots: ["D", "G", "A", "C"],
  },
  Energetico: {
    baseScale: "major",
    energy: 1,
    instruments: ["pluck", "synth"],
    roots: ["E", "F#", "G", "A"],
  },
};

const WEATHER_SCALE_HINT: Record<WeatherCondition, ScaleMode> = {
  clear: "major",
  clouds: "dorian",
  rain: "minor",
  thunderstorm: "phrygian",
  snow: "dorian",
};

const MODE_NAME_ES: Record<ScaleMode, string> = {
  major: "mayor",
  minor: "menor",
  dorian: "dorica",
  phrygian: "frigia",
};

const NOTE_NAME_ES: Record<string, string> = {
  C: "Do",
  "C#": "Do sostenido",
  D: "Re",
  "D#": "Re sostenido",
  E: "Mi",
  F: "Fa",
  "F#": "Fa sostenido",
  G: "Sol",
  "G#": "Sol sostenido",
  A: "La",
  "A#": "La sostenido",
  B: "Si",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomFrom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)] as T;
}

function weightedPickScale(mood: Mood, condition: WeatherCondition): ScaleMode {
  const fromMood = MOOD_PROFILE[mood].baseScale;
  const fromWeather = WEATHER_SCALE_HINT[condition];

  if (fromMood === fromWeather) {
    return fromMood;
  }

  return Math.random() < 0.7 ? fromMood : fromWeather;
}

function estimateBpm(mood: Mood, temperature: number): number {
  const moodEnergy = MOOD_PROFILE[mood].energy;
  const base = 50 + moodEnergy * 70;
  const tempInfluence = clamp((temperature - 10) * 0.75, -10, 20);
  return clamp(Math.round(base + tempInfluence), 50, 140);
}

function noteToMidi(note: string, octave: number): number {
  const noteIndex = NOTE_NAMES.indexOf(note);
  return (octave + 1) * 12 + noteIndex;
}

function midiToNote(midi: number): string {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

function buildScale(root: string, mode: ScaleMode, octave: number): string[] {
  const rootMidi = noteToMidi(root, octave);
  return SCALE_INTERVALS[mode].map((interval) =>
    midiToNote(rootMidi + interval),
  );
}

function buildMelody(scale: string[], density: Density): Array<string | null> {
  const steps = Array.from({ length: 16 }, () => null as string | null);
  const playChance =
    density === "dense" ? 0.85 : density === "normal" ? 0.65 : 0.45;
  const accents = [scale[0], scale[2], scale[4], scale[5], scale[6]];

  for (let i = 0; i < steps.length; i += 1) {
    if (Math.random() > playChance) {
      continue;
    }

    const isAccentBeat = i % 4 === 0;
    steps[i] = isAccentBeat ? randomFrom(accents) : randomFrom(scale);
  }

  if (!steps.some((step) => step !== null)) {
    steps[0] = scale[0];
  }

  return steps;
}

function buildBass(scale: string[], density: Density): Array<string | null> {
  const steps = Array.from({ length: 8 }, () => null as string | null);
  const root = scale[0];
  const fifth = scale[4] ?? scale[0];
  const third = scale[2] ?? scale[0];
  const playChance =
    density === "dense" ? 0.9 : density === "normal" ? 0.75 : 0.55;

  for (let i = 0; i < steps.length; i += 1) {
    if (Math.random() > playChance) {
      continue;
    }

    if (i % 4 === 0) {
      steps[i] = root;
      continue;
    }

    steps[i] = randomFrom([fifth, root, third]);
  }

  if (!steps.some((step) => step !== null)) {
    steps[0] = root;
  }

  return steps;
}

function buildPadChords(
  scale: string[],
  density: Density,
): Array<string[] | null> {
  const chords: Array<string[] | null> = [];
  const triads = [
    [scale[0], scale[2], scale[4]],
    [scale[3] ?? scale[0], scale[5] ?? scale[2], scale[0]],
    [scale[4] ?? scale[0], scale[6] ?? scale[2], scale[1] ?? scale[4]],
    [scale[2] ?? scale[0], scale[4] ?? scale[2], scale[6] ?? scale[4]],
  ];

  for (let i = 0; i < 4; i += 1) {
    const shouldRest = density === "light" && Math.random() > 0.6;
    chords.push(shouldRest ? null : randomFrom(triads));
  }

  if (!chords.some((chord) => chord !== null)) {
    chords[0] = triads[0];
  }

  return chords;
}

function applySpecialRules(
  mood: Mood,
  condition: WeatherCondition,
  base: Pick<CompositionConfig, "scale" | "bpm" | "instruments" | "ambience">,
) {
  const rules = {
    scale: base.scale,
    bpm: base.bpm,
    instruments: [...base.instruments],
    ambience: { ...base.ambience },
  };

  if (mood === "Melancolico" && condition === "rain") {
    rules.scale = "minor";
    rules.bpm = 60;
    rules.instruments = ["piano", "ambient-pad"];
    rules.ambience.reverb = true;
    rules.ambience.density = "light";
  }

  if (mood === "Feliz" && condition === "clear") {
    rules.scale = "major";
    rules.bpm = 100;
    rules.instruments = ["pluck", "synth"];
    rules.ambience.brightness = "bright";
    rules.ambience.density = "normal";
  }

  if (mood === "Ansioso" && condition === "thunderstorm") {
    rules.scale = "phrygian";
    rules.bpm = 130;
    rules.ambience.reverb = true;
    rules.ambience.density = "dense";
  }

  if (mood === "Tranquilo" && condition === "clouds") {
    rules.scale = "dorian";
    rules.bpm = 70;
    rules.instruments = ["ambient-pad"];
    rules.ambience.reverb = true;
    rules.ambience.density = "light";
  }

  if (mood === "Energetico") {
    rules.bpm = clamp(
      Math.max(rules.bpm, 122 + Math.round(Math.random() * 16)),
      122,
      140,
    );
    rules.ambience.density = "dense";
    if (!rules.instruments.includes("pluck")) {
      rules.instruments.unshift("pluck");
    }
  }

  return rules;
}

function humanizeInstruments(instruments: Instrument[]): string {
  return instruments
    .map((instrument) => {
      if (instrument === "ambient-pad") {
        return "ambient pad";
      }

      return instrument;
    })
    .join(" y ");
}

export function composeMusic(
  mood: Mood,
  weather: WeatherInput,
): CompositionConfig {
  const profile = MOOD_PROFILE[mood];
  const root = randomFrom(profile.roots);
  const baseScale = weightedPickScale(mood, weather.condition);
  const baseBpm = estimateBpm(mood, weather.temperature);

  const withRules = applySpecialRules(mood, weather.condition, {
    scale: baseScale,
    bpm: baseBpm,
    instruments: profile.instruments,
    ambience: {
      reverb: weather.humidity >= 75,
      density:
        profile.energy > 0.75
          ? "dense"
          : profile.energy > 0.4
            ? "normal"
            : "light",
      brightness:
        weather.condition === "clear"
          ? "bright"
          : mood === "Melancolico"
            ? "dark"
            : "neutral",
    },
  });

  const melodyScale = buildScale(root, withRules.scale, 4);
  const bassScale = buildScale(root, withRules.scale, 2);
  const padScale = buildScale(root, withRules.scale, 3);

  const layers: LayerData = {
    melody: buildMelody(melodyScale, withRules.ambience.density),
    bass: buildBass(bassScale, withRules.ambience.density),
    pad: buildPadChords(padScale, withRules.ambience.density),
  };

  return {
    mood,
    weather: weather.condition,
    keyRoot: root,
    scale: withRules.scale,
    bpm: withRules.bpm,
    instruments: withRules.instruments,
    ambience: withRules.ambience,
    transport: {
      melodySubdivision: "8n",
      bassSubdivision: "4n",
      padSubdivision: "1m",
    },
    layers,
    description: `Generando una pieza en ${NOTE_NAME_ES[root]} ${MODE_NAME_ES[withRules.scale]} a ${withRules.bpm} BPM con ${humanizeInstruments(withRules.instruments)}...`,
  };
}
