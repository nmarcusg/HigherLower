/**
 * Sound map — cue id → synthesis parameters (design §8.2).
 *
 * Every voice is an oscillator through a low-pass, with an attack/decay
 * envelope that ramps to 0.0001 (never to zero, so no click). Frequencies are
 * explicit Hz values, never derived from `sampleRate`; the single generated
 * buffer (the `launch` whoosh) is the only rate-dependent object and its length
 * is computed at unlock time.
 *
 * No cue starts above 0.14 peak, and none is a raw unfiltered wave, so nothing
 * can startle a user or spike the output on the first gesture.
 */

export type CueName =
  | "select"
  | "select-deep"
  | "hover-tick"
  | "mode"
  | "tab"
  | "filter"
  | "open"
  | "modal-in"
  | "modal-out"
  | "warn"
  | "confirm"
  | "launch"
  | "higher"
  | "lower"
  | "reveal-tick"
  | "tier-1"
  | "tier-2"
  | "tier-3"
  | "tier-4"
  | "wrong"
  | "gain"
  | "loss"
  | "tick-urgent"
  | "game-over"
  | "restart"
  | "back"
  | "audio-on"
  | "audio-off";

export interface FilterSpec {
  type: BiquadFilterType;
  freq: number;
  q?: number;
}

export interface VoiceSpec {
  wave: OscillatorType;
  /** A fixed Hz value, or a `[from, to]` pair for a linear frequency sweep. */
  freq: number | [number, number];
  filter?: FilterSpec;
  /** Seconds from the cue start. */
  attack: number;
  /** Seconds from the attack peak. */
  decay: number;
  /** Linear peak gain. */
  peak: number;
  /** Delay from the cue start, in seconds. */
  offset?: number;
}

export interface NoiseSpec {
  from: number;
  to: number;
  q: number;
  attack: number;
  decay: number;
  peak: number;
}

export interface CueRecipe {
  voices: VoiceSpec[];
  noise?: NoiseSpec;
}

/** Minimum interval per cue, so key repeat cannot machine-gun the graph. */
export const RATE_LIMIT_MS: Record<CueName, number> = {
  select: 40,
  "select-deep": 40,
  "hover-tick": 120,
  mode: 40,
  tab: 40,
  filter: 40,
  open: 40,
  "modal-in": 40,
  "modal-out": 40,
  warn: 40,
  confirm: 40,
  launch: 200,
  higher: 60,
  lower: 60,
  "reveal-tick": 40,
  "tier-1": 40,
  "tier-2": 40,
  "tier-3": 40,
  "tier-4": 40,
  wrong: 80,
  gain: 40,
  loss: 40,
  "tick-urgent": 250,
  "game-over": 400,
  restart: 120,
  back: 60,
  "audio-on": 60,
  "audio-off": 60,
};

const LOWPASS_3K: FilterSpec = { type: "lowpass", freq: 3000, q: 0.7 };
const LOWPASS_24K: FilterSpec = { type: "lowpass", freq: 2400, q: 1 };
const LOWPASS_2K: FilterSpec = { type: "lowpass", freq: 2000 };
const LOWPASS_4K: FilterSpec = { type: "lowpass", freq: 4000 };

export const CUES: Record<CueName, CueRecipe> = {
  select: {
    voices: [
      { wave: "square", freq: 520, filter: LOWPASS_3K, attack: 0.006, decay: 0.054, peak: 0.08 },
      { wave: "triangle", freq: 1040, filter: LOWPASS_3K, attack: 0.006, decay: 0.054, peak: 0.028 },
    ],
  },
  "select-deep": {
    voices: [
      { wave: "square", freq: 610, filter: LOWPASS_3K, attack: 0.006, decay: 0.054, peak: 0.07 },
    ],
  },
  "hover-tick": {
    voices: [{ wave: "sine", freq: 1400, attack: 0.002, decay: 0.038, peak: 0.03 }],
  },
  mode: {
    voices: [
      { wave: "triangle", freq: 330, filter: LOWPASS_24K, attack: 0.01, decay: 0.17, peak: 0.07 },
      { wave: "triangle", freq: 495, filter: LOWPASS_24K, attack: 0.01, decay: 0.17, peak: 0.07 },
    ],
  },
  tab: {
    voices: [{ wave: "triangle", freq: 480, filter: LOWPASS_4K, attack: 0.005, decay: 0.045, peak: 0.06 }],
  },
  filter: {
    voices: [{ wave: "triangle", freq: 520, filter: LOWPASS_4K, attack: 0.005, decay: 0.045, peak: 0.05 }],
  },
  open: {
    voices: [{ wave: "triangle", freq: 660, filter: LOWPASS_3K, attack: 0.004, decay: 0.066, peak: 0.07 }],
  },
  "modal-in": {
    voices: [
      { wave: "triangle", freq: 494, filter: LOWPASS_24K, attack: 0.008, decay: 0.09, peak: 0.06 },
      { wave: "triangle", freq: 659, filter: LOWPASS_24K, attack: 0.008, decay: 0.09, peak: 0.06, offset: 0.15 },
    ],
  },
  "modal-out": {
    voices: [
      { wave: "triangle", freq: 587, filter: LOWPASS_24K, attack: 0.008, decay: 0.082, peak: 0.06 },
      { wave: "triangle", freq: 440, filter: LOWPASS_24K, attack: 0.008, decay: 0.082, peak: 0.06, offset: 0.09 },
    ],
  },
  warn: {
    voices: [
      { wave: "square", freq: 196, filter: { type: "lowpass", freq: 1200 }, attack: 0.01, decay: 0.11, peak: 0.07 },
      { wave: "square", freq: 185, filter: { type: "lowpass", freq: 1200 }, attack: 0.01, decay: 0.11, peak: 0.05 },
    ],
  },
  confirm: {
    voices: [{ wave: "square", freq: 392, filter: LOWPASS_3K, attack: 0.004, decay: 0.046, peak: 0.06 }],
  },
  launch: {
    voices: [],
    noise: { from: 400, to: 3000, q: 1.2, attack: 0.01, decay: 0.3, peak: 0.1 },
  },
  higher: {
    voices: [
      { wave: "triangle", freq: [300, 480], filter: LOWPASS_24K, attack: 0.006, decay: 0.134, peak: 0.09 },
    ],
  },
  lower: {
    voices: [
      { wave: "triangle", freq: [380, 240], filter: LOWPASS_24K, attack: 0.006, decay: 0.134, peak: 0.09 },
    ],
  },
  "reveal-tick": {
    voices: [{ wave: "sine", freq: 880, attack: 0.003, decay: 0.047, peak: 0.04 }],
  },
  "tier-1": {
    voices: [{ wave: "triangle", freq: 262, filter: LOWPASS_2K, attack: 0.008, decay: 0.18, peak: 0.08 }],
  },
  "tier-2": {
    voices: [
      { wave: "triangle", freq: 262, filter: LOWPASS_2K, attack: 0.008, decay: 0.19, peak: 0.07 },
      { wave: "triangle", freq: 524, filter: LOWPASS_2K, attack: 0.008, decay: 0.19, peak: 0.07 },
    ],
  },
  "tier-3": {
    voices: [
      { wave: "triangle", freq: 262, filter: { type: "lowpass", freq: 2200 }, attack: 0.008, decay: 0.21, peak: 0.06 },
      { wave: "triangle", freq: 524, filter: { type: "lowpass", freq: 2200 }, attack: 0.008, decay: 0.21, peak: 0.06 },
      { wave: "triangle", freq: 330, filter: { type: "lowpass", freq: 2200 }, attack: 0.008, decay: 0.21, peak: 0.06 },
    ],
  },
  "tier-4": {
    voices: [
      { wave: "triangle", freq: 262, filter: { type: "lowpass", freq: 2600 }, attack: 0.006, decay: 0.24, peak: 0.05 },
      { wave: "triangle", freq: 524, filter: { type: "lowpass", freq: 2600 }, attack: 0.006, decay: 0.24, peak: 0.05 },
      { wave: "triangle", freq: 330, filter: { type: "lowpass", freq: 2600 }, attack: 0.006, decay: 0.24, peak: 0.05 },
      { wave: "triangle", freq: 392, filter: { type: "lowpass", freq: 2600 }, attack: 0.006, decay: 0.24, peak: 0.05 },
      { wave: "sine", freq: 60, attack: 0.006, decay: 0.09, peak: 0.12 },
    ],
  },
  wrong: {
    voices: [
      { wave: "sine", freq: 90, filter: { type: "lowpass", freq: 400 }, attack: 0.004, decay: 0.22, peak: 0.14 },
      { wave: "sine", freq: 95.5, filter: { type: "lowpass", freq: 400 }, attack: 0.004, decay: 0.22, peak: 0.09 },
    ],
  },
  gain: {
    voices: [
      { wave: "triangle", freq: [392, 587], filter: LOWPASS_3K, attack: 0.005, decay: 0.07, peak: 0.07 },
      { wave: "triangle", freq: 587, filter: LOWPASS_3K, attack: 0.005, decay: 0.07, peak: 0.05, offset: 0.08 },
    ],
  },
  loss: {
    voices: [
      { wave: "triangle", freq: [466, 349], filter: LOWPASS_24K, attack: 0.005, decay: 0.08, peak: 0.07 },
      { wave: "triangle", freq: 466, filter: LOWPASS_24K, attack: 0.005, decay: 0.08, peak: 0.05, offset: 0.08 },
    ],
  },
  "tick-urgent": {
    voices: [
      { wave: "square", freq: 900, filter: { type: "lowpass", freq: 5000 }, attack: 0.002, decay: 0.038, peak: 0.035 },
    ],
  },
  "game-over": {
    voices: [
      { wave: "triangle", freq: 220, filter: { type: "lowpass", freq: 1600 }, attack: 0.01, decay: 0.23, peak: 0.1 },
      { wave: "triangle", freq: 165, filter: { type: "lowpass", freq: 1600 }, attack: 0.01, decay: 0.23, peak: 0.1, offset: 0.25 },
    ],
  },
  restart: {
    voices: [
      { wave: "triangle", freq: [160, 400], filter: LOWPASS_24K, attack: 0.008, decay: 0.292, peak: 0.09 },
    ],
  },
  back: {
    voices: [
      { wave: "triangle", freq: [300, 220], filter: LOWPASS_24K, attack: 0.006, decay: 0.114, peak: 0.08 },
    ],
  },
  "audio-on": {
    voices: [
      { wave: "triangle", freq: [523, 784], filter: LOWPASS_3K, attack: 0.004, decay: 0.116, peak: 0.06 },
    ],
  },
  // Muting is deliberately silent: the visual `ack` is the confirmation.
  "audio-off": { voices: [] },
};
