/**
 * Audio settings — versioned persistence with a `useSyncExternalStore` shape.
 *
 * Browser storage is read only on the client, wrapped in try/catch (private
 * mode throws). The server snapshot is the default object, so the control's
 * first client render matches the server markup and the glyph cannot flip
 * during hydration.
 *
 * Only action-SFX settings persist. A legacy `music` key from an older build is
 * an unrecognised key: it is ignored rather than validated, so it can never
 * reset mute, SFX or ticks, and reading it never throws. Nothing here overrides
 * an explicit user choice.
 */

export const AUDIO_STORAGE_KEY = "hl:audio:v1";

export type TicksSetting = "auto" | boolean;

export interface AudioSettings {
  v: 1;
  sfx: boolean;
  ticks: TicksSetting;
  muted: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  v: 1,
  sfx: true,
  ticks: "auto",
  muted: false,
};

export type AudioSettingsPatch = Partial<Omit<AudioSettings, "v">>;

type Listener = () => void;

const listeners = new Set<Listener>();

let snapshot: AudioSettings | null = null;

function sanitise(value: unknown): AudioSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_AUDIO_SETTINGS };
  const record = value as Record<string, unknown>;
  const ticks = record.ticks;
  return {
    v: 1,
    sfx: typeof record.sfx === "boolean" ? record.sfx : DEFAULT_AUDIO_SETTINGS.sfx,
    ticks:
      ticks === "auto" || typeof ticks === "boolean" ? (ticks as TicksSetting) : "auto",
    muted: typeof record.muted === "boolean" ? record.muted : DEFAULT_AUDIO_SETTINGS.muted,
  };
}

function readStorage(): AudioSettings {
  if (typeof window === "undefined") return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const raw = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    return sanitise(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

function writeStorage(next: AudioSettings): void {
  try {
    window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode / quota): the in-memory value stands.
  }
}

function emit(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // A broken subscriber must not break the store.
    }
  }
}

/** Stable client snapshot: the same object until a real change happens. */
export function getAudioSettingsSnapshot(): AudioSettings {
  if (snapshot === null) snapshot = readStorage();
  return snapshot;
}

/** Server + first-render snapshot. Always the defaults. */
export function getServerAudioSettingsSnapshot(): AudioSettings {
  return DEFAULT_AUDIO_SETTINGS;
}

export function subscribeAudioSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function updateAudioSettings(patch: AudioSettingsPatch): AudioSettings {
  const current = getAudioSettingsSnapshot();
  const next: AudioSettings = { ...current, ...patch, v: 1 };
  if (
    next.sfx === current.sfx &&
    next.ticks === current.ticks &&
    next.muted === current.muted
  ) {
    return current;
  }
  snapshot = next;
  writeStorage(next);
  emit();
  return next;
}

/**
 * True when the one-click control is in its muted state.
 *
 * With a single audible channel (action SFX), "SFX off" *is* "no sound", so the
 * master reads as muted and the glyph stays honest.
 */
export function isAudioMuted(settings: AudioSettings): boolean {
  return settings.muted || !settings.sfx;
}

/** Ticks resolve from the pointer type while `ticks === "auto"` (D8). */
export function resolveTicks(settings: AudioSettings): boolean {
  if (typeof settings.ticks === "boolean") return settings.ticks;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Read-through helper for non-React consumers (the audio engine). */
export function readAudioSettings(): AudioSettings {
  return getAudioSettingsSnapshot();
}
