/**
 * Audio engine — a module singleton. One `AudioContext`, one bus graph, one
 * voice pool. Action SFX only: nothing here runs a continuous oscillator, a
 * scheduler or a timer, so the engine is silent at rest by construction.
 *
 * Lifecycle rules encoded here:
 *  - the context is created **inside the first qualifying gesture** only;
 *  - `resume()` is attempted before scheduling and a rejection is swallowed
 *    (staying `armed` so the next gesture retries) — never retried in a loop;
 *  - muted = master gain 0, never `suspend()`, so unmute is instant;
 *  - `close()` is never called: the engine lives in the layout.
 *
 * `navigator.audioSession` is never touched, so the iOS Ring/Silent switch is
 * respected by construction (D9).
 */

import { subscribeAtmosphere } from "@/lib/atmosphere/eventBus";
import type { AtmosphereEvent } from "@/lib/atmosphere/types";
import {
  getAudioSettingsSnapshot,
  isAudioMuted,
  resolveTicks,
  subscribeAudioSettings,
  type AudioSettings,
} from "./settings";
import { CUES, RATE_LIMIT_MS, type CueName, type VoiceSpec } from "./soundMap";

const MASTER_LEVEL = 0.7;
const SFX_LEVEL = 0.9;
const MAX_VOICES = 8;

export type AudioState = "off" | "armed" | "running" | "suspended";

interface EngineState {
  ctx: AudioContext | null;
  master: GainNode | null;
  sfxBus: GainNode | null;
  noise: AudioBuffer | null;
  voices: number;
  lastPlayed: Map<CueName, number>;
  pending: Array<{ name: CueName; at: number }>;
  started: boolean;
}

const state: EngineState = {
  ctx: null,
  master: null,
  sfxBus: null,
  noise: null,
  voices: 0,
  lastPlayed: new Map(),
  pending: [],
  started: false,
};

// ─── Observable lifecycle state (for `data-audio-state` and `aria`) ──────────

let audioState: AudioState = "armed";
const stateListeners = new Set<() => void>();

export function getAudioStateSnapshot(): AudioState {
  return audioState;
}

export function subscribeAudioState(listener: () => void): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

function setAudioState(next: AudioState) {
  if (audioState === next) return;
  audioState = next;
  for (const listener of stateListeners) {
    try {
      listener();
    } catch {
      // ignore
    }
  }
}

type AudioContextCtor = typeof AudioContext;

function contextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const webkit = (window as unknown as { webkitAudioContext?: AudioContextCtor })
    .webkitAudioContext;
  return window.AudioContext ?? webkit ?? null;
}

export function isAudioSupported(): boolean {
  return contextCtor() !== null;
}

// ─── Graph ───────────────────────────────────────────────────────────────────

function buildNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.ceil(0.4 * ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Create or resume the context inside a user gesture. */
export function unlockAudio(): void {
  if (state.ctx) {
    if (state.ctx.state === "running") {
      setAudioState("running");
      return;
    }
    void state.ctx
      .resume()
      .then(() => setAudioState("running"))
      .catch(() => setAudioState("armed"));
    return;
  }

  const Ctor = contextCtor();
  if (!Ctor) {
    setAudioState("off");
    return;
  }

  try {
    const ctx = new Ctor();
    const master = ctx.createGain();
    const sfxBus = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();

    master.gain.value = 0;
    sfxBus.gain.value = 0;
    limiter.threshold.value = -12;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;

    sfxBus.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    state.ctx = ctx;
    state.master = master;
    state.sfxBus = sfxBus;
    state.noise = buildNoiseBuffer(ctx);

    // Buses start at 0 and ramp, so nothing clicks on the first gesture.
    const now = ctx.currentTime;
    master.gain.setTargetAtTime(1, now, 0.08);
    sfxBus.gain.setTargetAtTime(1, now, 0.08);

    void ctx
      .resume()
      .then(() => {
        setAudioState("running");
        applySettings();
        flushPendingCues();
      })
      .catch(() => {
        setAudioState("armed");
      });
    setAudioState(ctx.state === "running" ? "running" : "armed");
  } catch {
    setAudioState("off");
  }
}

// ─── Settings → graph ────────────────────────────────────────────────────────

export function applySettings(settings: AudioSettings = getAudioSettingsSnapshot()) {
  const { ctx, master, sfxBus } = state;
  if (!ctx || !master || !sfxBus) return;
  const now = ctx.currentTime;
  const muted = isAudioMuted(settings);

  master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, now, 0.06);
  sfxBus.gain.setTargetAtTime(settings.muted || !settings.sfx ? 0 : SFX_LEVEL, now, 0.06);
}

function flushPendingCues() {
  if (state.pending.length === 0) return;
  const nowMs = performance.now();
  const queued = state.pending.splice(0, state.pending.length);
  for (const cue of queued) {
    if (nowMs - cue.at > 1500) continue;
    playCue(cue.name);
  }
}

// ─── Voices ──────────────────────────────────────────────────────────────────

function setFrequency(osc: OscillatorNode, spec: VoiceSpec, start: number, end: number) {
  if (Array.isArray(spec.freq)) {
    osc.frequency.setValueAtTime(spec.freq[0], start);
    osc.frequency.linearRampToValueAtTime(spec.freq[1], end);
  } else {
    osc.frequency.setValueAtTime(spec.freq, start);
  }
}

function playVoice(spec: VoiceSpec, now: number) {
  const { ctx, sfxBus } = state;
  if (!ctx || !sfxBus) return;
  const start = now + (spec.offset ?? 0);
  const peakAt = start + spec.attack;
  const end = peakAt + spec.decay;

  const osc = ctx.createOscillator();
  osc.type = spec.wave;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(spec.peak, peakAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  let head: AudioNode = osc;
  if (spec.filter) {
    const filter = ctx.createBiquadFilter();
    filter.type = spec.filter.type;
    filter.frequency.value = spec.filter.freq;
    if (spec.filter.q !== undefined) filter.Q.value = spec.filter.q;
    osc.connect(filter);
    head = filter;
  }
  head.connect(gain);
  gain.connect(sfxBus);
  setFrequency(osc, spec, start, end);

  state.voices += 1;
  osc.onended = () => {
    state.voices = Math.max(0, state.voices - 1);
    osc.disconnect();
    gain.disconnect();
    head.disconnect();
  };
  osc.start(start);
  osc.stop(end + 0.02);
}

function playNoise(
  noise: { from: number; to: number; q: number; attack: number; decay: number; peak: number },
  now: number,
) {
  const { ctx, sfxBus, noise: buffer } = state;
  if (!ctx || !sfxBus || !buffer) return;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.Q.value = noise.q;
  bandpass.frequency.setValueAtTime(noise.from, now);
  bandpass.frequency.linearRampToValueAtTime(noise.to, now + noise.attack + noise.decay);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(noise.peak, now + noise.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + noise.attack + noise.decay);
  source.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(sfxBus);

  state.voices += 1;
  source.onended = () => {
    state.voices = Math.max(0, state.voices - 1);
    source.disconnect();
    bandpass.disconnect();
    gain.disconnect();
  };
  source.start(now);
  source.stop(now + noise.attack + noise.decay + 0.02);
}

/** Fire one cue, subject to mute, channel, rate limit and the voice cap. */
export function playCue(name: CueName): void {
  const { ctx } = state;
  // Gate on the real context, not the lifecycle label: a context constructed
  // inside a gesture is already `running` in Chromium, so the *first* qualifying
  // gesture plays its own cue instead of losing it to ordering.
  if (!ctx || ctx.state !== "running") {
    // Keep the newest cues so they survive the gap before the first gesture (or
    // while suspended) instead of being lost until the user reloads.
    state.pending.push({ name, at: performance.now() });
    if (state.pending.length > 6) state.pending.shift();
    return;
  }
  const settings = getAudioSettingsSnapshot();
  if (isAudioMuted(settings) || !settings.sfx) return;
  if (name === "hover-tick" && !resolveTicks(settings)) return;

  const recipe = CUES[name];
  if (!recipe) return;
  const nowMs = performance.now();
  const last = state.lastPlayed.get(name) ?? 0;
  if (nowMs - last < RATE_LIMIT_MS[name]) return;

  const cost = recipe.voices.length + (recipe.noise ? 1 : 0);
  if (cost === 0) return; // `audio-off` is silent by design
  if (state.voices + cost > MAX_VOICES) return; // drop, never queue

  state.lastPlayed.set(name, nowMs);
  const now = ctx.currentTime;
  for (const voice of recipe.voices) playVoice(voice, now);
  if (recipe.noise) playNoise(recipe.noise, now);
}

// ─── Bus → cues ──────────────────────────────────────────────────────────────

function cueForPointer(event: Extract<AtmosphereEvent, { type: "pointer" }>): CueName | null {
  const { cue, target } = event;
  if (cue === "audio") return null; // the control plays its own state cue
  // Higher/Lower are sonified by the `guess` event inside `handleGuess`, so the
  // pointer cue for them stays silent — that is what keeps keyboard parity exact.
  if (target === "higher" || target === "lower") return null;
  if (cue === "hover") {
    return target.startsWith("hover-semantic-domain") ? "hover-tick" : null;
  }
  if (target === "go") return "launch";
  if (target === "start") return "select";
  if (target === "scores") return "open";
  if (target === "back" || target === "menu") return "back";
  if (target === "restart") return "restart";
  if (target === "danger") return "warn";
  if (target === "confirm") return "confirm";
  if (target.startsWith("domain-")) return "select";
  if (target.startsWith("category-")) return "select-deep";
  if (target.startsWith("mode-")) return "mode";
  if (cue === "tab") return "tab";
  if (cue === "filter") return "filter";
  return "select";
}

function handleAtmosphereEvent(event: AtmosphereEvent) {
  switch (event.type) {
    case "pointer": {
      const cue = cueForPointer(event);
      if (cue) playCue(cue);
      return;
    }
    case "guess": {
      playCue(event.direction === "higher" ? "higher" : "lower");
      return;
    }
    case "reveal": {
      playCue("reveal-tick");
      if (event.correct && event.tier >= 1) {
        playCue(`tier-${event.tier}` as CueName);
      } else if (!event.correct) {
        // Fixed low thud: never escalates with the losing streak.
        playCue("wrong");
      }
      return;
    }
    case "phase": {
      if (event.phase === "game-over") playCue("game-over");
      return;
    }
    case "timer": {
      if (event.urgent && event.fromTick && event.secondsLeft > 0) playCue("tick-urgent");
      return;
    }
    case "delta": {
      playCue(event.kind === "gain" ? "gain" : "loss");
      return;
    }
    case "modal": {
      playCue(event.state === "open" ? "modal-in" : "modal-out");
      return;
    }
    case "audio": {
      applySettings();
      return;
    }
    default:
      return;
  }
}

// ─── Visibility ──────────────────────────────────────────────────────────────

function onVisibilityChange() {
  const { ctx, master } = state;
  if (!ctx) return;
  if (document.hidden) {
    if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
    window.setTimeout(() => {
      if (document.hidden && ctx.state === "running") {
        void ctx.suspend().catch(() => {});
        setAudioState("suspended");
      }
    }, 120);
  } else {
    void ctx
      .resume()
      .then(() => {
        setAudioState("running");
        applySettings();
        flushPendingCues();
      })
      .catch(() => setAudioState("armed"));
  }
}

/** Wire the engine to the bus, the settings store and visibility. Idempotent. */
export function startAudioEngine(): () => void {
  if (state.started) return () => {};
  state.started = true;

  const unsubscribeBus = subscribeAtmosphere(handleAtmosphereEvent);
  const unsubscribeSettings = subscribeAudioSettings(() => applySettings());
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Any first gesture anywhere unlocks the context, even when the visible audio
  // control has never been touched.
  const gestureOptions: AddEventListenerOptions = { passive: true, capture: true };
  const onFirstGesture = () => {
    unlockAudio();
    window.removeEventListener("pointerdown", onFirstGesture, gestureOptions);
    window.removeEventListener("keydown", onFirstGesture, gestureOptions);
    window.removeEventListener("touchstart", onFirstGesture, gestureOptions);
  };
  window.addEventListener("pointerdown", onFirstGesture, gestureOptions);
  window.addEventListener("keydown", onFirstGesture, gestureOptions);
  window.addEventListener("touchstart", onFirstGesture, gestureOptions);

  if (audioState !== "off" && !isAudioSupported()) setAudioState("off");

  return () => {
    unsubscribeBus();
    unsubscribeSettings();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pointerdown", onFirstGesture, gestureOptions);
    window.removeEventListener("keydown", onFirstGesture, gestureOptions);
    window.removeEventListener("touchstart", onFirstGesture, gestureOptions);
    state.started = false;
  };
}

/** The state the control's glyph and `aria-pressed` describe. */
export function currentSettings(): AudioSettings {
  return getAudioSettingsSnapshot();
}
