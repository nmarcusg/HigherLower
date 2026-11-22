/**
 * Atmosphere contracts — types only, no runtime code.
 *
 * One shared vocabulary for the canvas engine, the audio engine, the DOM
 * delegation classifier, and the semantic emits inside the game components.
 * Nothing in this module touches the DOM, so it is safe to import from any
 * client boundary (and from types-only positions).
 */

/** Which authored surface the visitor is on. */
export type SurfaceId = "home" | "gameplay";

/** Game phase vocabulary shared by Classic and Time Attack. */
export type Phase = "playing" | "revealing" | "game-over";

/** Display-only reward ladder rung (0 = no rung yet). */
export type Tier = 0 | 1 | 2 | 3 | 4;

/** Playable gameplay modes; `null` on Home before a mode is chosen. */
export type GameplayModeId = "classic" | "time-attack";

/** Classified interaction families the delegation layer can produce. */
export type CueKind =
  | "select"
  | "press"
  | "hover"
  | "open"
  | "close"
  | "tick"
  | "warn"
  | "confirm"
  | "mode"
  | "filter"
  | "tab"
  | "audio";

/** A viewport-space box. Read once per event, never per frame. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AtmosphereEvent =
  | {
      type: "pointer";
      cue: CueKind;
      /**
       * Short stable identifier resolved by the delegation classifier
       * (for example `"higher"`, `"go"`, `"domain-2"`, `"mode"`, `"audio"`).
       */
      target: string;
      x: number;
      y: number;
      w: number;
      h: number;
      source: "pointer" | "keyboard";
    }
  | {
      type: "guess";
      direction: "higher" | "lower";
      source: "pointer" | "keyboard";
      x: number;
      y: number;
      w: number;
      h: number;
    }
  | { type: "reveal"; correct: boolean; tier: Tier; origin: Rect }
  | { type: "phase"; phase: Phase }
  | { type: "timer"; secondsLeft: number; urgent: boolean; fromTick: boolean }
  | { type: "delta"; kind: "gain" | "loss"; origin: Rect }
  | { type: "modal"; state: "open" | "closed"; opener: Rect | null }
  | {
      type: "route";
      from: SurfaceId | null;
      to: SurfaceId;
      mode: GameplayModeId | null;
      intent: "forward" | "back";
    }
  /**
   * The Home surface's selected mode, emitted whenever it changes (including
   * domain/category resets) so the field tint follows the real selection rather
   * than requiring a click on a mode card.
   */
  | { type: "mode"; mode: GameplayModeId | null; surface: SurfaceId }
  | { type: "scroll"; y: number }
  | { type: "audio"; sfx: boolean; ticks: boolean };

export type AtmosphereListener = (event: AtmosphereEvent) => void;

/** The two depth planes the mote pool is distributed across. */
export type DepthPlane = "near" | "far";

/** Empty-rect fallback so consumers never branch on `null` geometry. */
export const EMPTY_RECT: Rect = { x: 0, y: 0, w: 0, h: 0 };
