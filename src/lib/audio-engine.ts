import type * as ToneType from "tone";

import type { CompositionConfig, Instrument } from "@/lib/composer";

type ActiveEngine = {
  melody: ToneType.Sequence<string | null>;
  bass: ToneType.Sequence<string | null>;
  pad: ToneType.Sequence<string[] | null>;
  melodySynth: ToneType.PolySynth;
  bassSynth: ToneType.MonoSynth;
  padSynth: ToneType.PolySynth;
  masterReverb: ToneType.Reverb;
};

type ToneModule = typeof ToneType;

function hasInstrument(instruments: Instrument[], value: Instrument): boolean {
  return instruments.includes(value);
}

export class MoodSynthEngine {
  private active: ActiveEngine | null = null;
  private tone: ToneModule | null = null;
  private analyser: ToneType.Analyser | null = null;
  private volumePercent = 70;

  private percentToDb(percent: number): number {
    if (percent <= 0) {
      return -60;
    }

    return -40 + (percent / 100) * 40;
  }

  private async getTone(): Promise<ToneModule> {
    if (!this.tone) {
      this.tone = await import("tone");
    }

    return this.tone;
  }

  async play(config: CompositionConfig) {
    const Tone = await this.getTone();

    await Tone.start();
    this.stop();

    Tone.Destination.volume.value = this.percentToDb(this.volumePercent);

    if (!this.analyser) {
      this.analyser = new Tone.Analyser("waveform", 256);
    }

    const masterReverb = new Tone.Reverb({
      decay: config.ambience.density === "dense" ? 6 : 3,
      wet: config.ambience.reverb ? 0.45 : 0.15,
    });

    masterReverb.toDestination();
    masterReverb.connect(this.analyser);

    const melodySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: hasInstrument(config.instruments, "pluck") ? "triangle" : "sine",
      },
      envelope: {
        attack: hasInstrument(config.instruments, "pluck") ? 0.01 : 0.04,
        decay: 0.18,
        sustain: hasInstrument(config.instruments, "pluck") ? 0.15 : 0.4,
        release: 0.35,
      },
      volume: hasInstrument(config.instruments, "synth") ? -8 : -12,
    }).connect(masterReverb);

    const bassSynth = new Tone.MonoSynth({
      oscillator: { type: "square" },
      envelope: {
        attack: 0.02,
        decay: 0.2,
        sustain: 0.55,
        release: 0.3,
      },
      filter: {
        type: "lowpass",
        frequency: 380,
        rolloff: -24,
      },
      volume: -11,
    }).connect(masterReverb);

    const padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: {
        attack: 0.5,
        decay: 0.2,
        sustain: 0.8,
        release: 1.2,
      },
      volume: hasInstrument(config.instruments, "ambient-pad") ? -14 : -20,
    }).connect(masterReverb);

    const melody = new Tone.Sequence<string | null>(
      (time, note) => {
        if (!note) {
          return;
        }

        melodySynth.triggerAttackRelease(note, "8n", time, 0.9);
      },
      config.layers.melody,
      config.transport.melodySubdivision,
    );

    const bass = new Tone.Sequence<string | null>(
      (time, note) => {
        if (!note) {
          return;
        }

        bassSynth.triggerAttackRelease(note, "8n", time, 0.65);
      },
      config.layers.bass,
      config.transport.bassSubdivision,
    );

    const pad = new Tone.Sequence<string[] | null>(
      (time, chord) => {
        if (!chord) {
          return;
        }

        padSynth.triggerAttackRelease(chord, "1m", time, 0.4);
      },
      config.layers.pad,
      config.transport.padSubdivision,
    );

    Tone.Transport.bpm.value = config.bpm;
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = "4m";

    melody.start(0);
    bass.start(0);
    pad.start(0);

    Tone.Transport.start("+0.02");

    this.active = {
      melody,
      bass,
      pad,
      melodySynth,
      bassSynth,
      padSynth,
      masterReverb,
    };
  }

  setVolume(percent: number) {
    this.volumePercent = Math.max(0, Math.min(100, percent));

    if (!this.tone) {
      return;
    }

    this.tone.Destination.volume.rampTo(this.percentToDb(this.volumePercent), 0.05);
  }

  stop() {
    const Tone = this.tone;

    if (!Tone) {
      return;
    }

    Tone.Transport.stop();
    Tone.Transport.cancel(0);

    if (!this.active) {
      return;
    }

    this.active.melody.dispose();
    this.active.bass.dispose();
    this.active.pad.dispose();
    this.active.melodySynth.dispose();
    this.active.bassSynth.dispose();
    this.active.padSynth.dispose();
    this.active.masterReverb.dispose();

    this.active = null;
  }

  dispose() {
    this.stop();
    this.analyser?.dispose();
    this.analyser = null;
  }

  getWaveform(): Float32Array {
    if (!this.analyser) {
      return new Float32Array();
    }

    const value = this.analyser.getValue();

    if (Array.isArray(value)) {
      return value[0] ?? new Float32Array();
    }

    return value;
  }
}
