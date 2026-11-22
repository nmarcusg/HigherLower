/**
 * Atmosphere canvas engine — one canvas, five draw passes, zero React state.
 *
 * Passes (design §3.2):
 *   P0 horizon wash  — pre-rendered, re-baked on resize / mode change
 *   P1 depth field   — 28 / 12 cached spark sprites on two depth planes plus
 *                    10 / 6 chevrons on a slightly forward plane, `drawImage`
 *                    only (every sprite is baked offscreen, never in the DOM)
 *   P2 tint wash     — pre-rendered per mode
 *   P3 impulses      — fixed 2-slot ring, stroke/fill only, ≤ 700 ms each
 *   P4 recession     — one float lerp per frame
 *   P5 vignette + text-safe bands — pre-rendered; the bands are erased with
 *                    `destination-out` *before* the wash, so they suppress only
 *                    the sprite / chevron / impulse field. The horizon wash and
 *                    the vignette are painted after the erase, so the tinted
 *                    field still passes behind text; readable contrast comes
 *                    from each surface's own opaque backing, not a field-free band.
 *
 * Discipline: no allocation per frame, no `getComputedStyle`, no DOM reads, no
 * `shadowBlur`, no `filter`, no gradients created inside the loop. Origins are
 * captured once per event by the delegation layer.
 */

import type {
  AtmosphereEvent,
  GameplayModeId,
  Phase,
  SurfaceId,
  Tier,
} from "./types";
import {
  bakeSprites,
  CHEVRON_H_CSS,
  CHEVRON_W_CSS,
  type SpriteSet,
} from "./sprites";

// ─── Tuning ──────────────────────────────────────────────────────────────────

const DPR_CAP = 2;
const MOTES_DESKTOP = 28;
const MOTES_MOBILE = 12;
const MOTES_LOW_QUALITY = 12;
const CHEVRONS_DESKTOP = 10;
const CHEVRONS_MOBILE = 6;
const CHEVRONS_LOW_QUALITY = 6;
/** Desktop 10 = 6 base + 4 reserve (2 pairs); mobile has no reserve (C-3). */
const CHEVRON_RESERVE_START = 6;
const CHEVRON_RESERVE_PAIRS = 2;
const CHEVRON_Z = 1.15;
const IMPULSE_SLOTS = 2;

// Reactive field windows. Constants by design: they never grow with a streak.
const SURGE_DURATION_MS = 420;
const SURGE_PEAK_AT = 0.17;
const SURGE_ALPHA_BASE = 0.26;
const SURGE_ALPHA_PEAK = 0.88;
const SURGE_RECEDE_ALPHA = 0.08;
const SURGE_OFFSET_PX = 10;
/** Design §3.1 — `dirY` bias added to the `near` plane on a correct reveal. */
const SURGE_SPARK_BIAS = 0.35;
const WRONG_RECEDE_MS = 180;
const WRONG_LIFT_MS = 120;
const WRONG_ALPHA = 0.1;
const WRONG_LIFT_ALPHA = 0.06;
const RECESSION_K = 0.12;
const MAX_DELTA_S = 0.05;
const LOW_QUALITY_FRAME_SKIP = 2;

/**
 * Gameplay-only field gain (PD-3). The gameplay field survives only ~29 % of
 * the accepted DOM scrim, so its sprites and idle chevrons are drawn brighter
 * instead of retuning the scrim. Home keeps the calibrated 1.0 amplitude; the
 * reactive surge alphas are absolute and never multiplied by these.
 */
const SPRITE_GAIN_GAMEPLAY = 3;
const CHEVRON_GAIN_GAMEPLAY = 2;

const DOMAIN_TINT_ORDER = ["time-attack", "higher", "classic", "highlight"] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

type ImpulseKind =
  | "ripple"
  | "shockwave"
  | "updraft"
  | "downdraft"
  | "land"
  | "fracture"
  | "swell"
  | "launch"
  | "ack"
  | "band"
  | "glow"
  | "wash"
  | "tier";

interface Impulse {
  active: boolean;
  kind: ImpulseKind;
  x: number;
  y: number;
  w: number;
  h: number;
  start: number;
  dur: number;
  maxRadius: number;
  strength: number;
  color: string;
  amount: number;
}

interface Mote {
  nx: number;
  ny: number;
  z: number;
  size: number;
  alpha: number;
  speed: number;
  dirX: number;
  dirY: number;
  colorIndex: number;
  phase: number;
}

/**
 * A chevron field entry. Position is a pure function of `elapsed`, so the field
 * never mutates per frame and a frozen `elapsed` yields a frozen field.
 */
interface Chevron {
  nx: number;
  ny: number;
  up: boolean;
  alpha: number;
  speed: number;
}

interface Palette {
  classic: string;
  timeAttack: string;
  higher: string;
  highlight: string;
  error: string;
  elevated: string;
}

/**
 * Field-tuning values read from the `--atmo-*` tokens at (re)bake time.
 *
 * These used to be module literals, which meant a token edit silently did
 * nothing. They are refreshed in `rebakeAll()` — on init, resize, mode change
 * and surface change — never inside a frame.
 */
interface Tuning {
  horizon: number;
  top: number;
  tintHome: number;
  tintGameplay: number;
  tintLow: number;
  recedePlaying: number;
  recedeReveal: number;
  recedeModal: number;
  recedeGameOver: number;
  recedeLow: number;
  /** Surface-dependent spark gain, clamped before `fieldAlpha`. */
  spriteGain: number;
  /** Surface-dependent idle chevron gain; reactive windows ignore it. */
  chevronGain: number;
}

interface EngineQuality {
  scale: number;
  moteCount: number;
  chevronCount: number;
  frameSkip: number;
}

export interface AtmosphereEngine {
  start(): void;
  destroy(): void;
  setSurface(surface: SurfaceId, mode: GameplayModeId | null): void;
  setReducedMotion(reduce: boolean): void;
  setLowEnergy(low: boolean): void;
  setScroll(y: number): void;
  handleEvent(event: AtmosphereEvent): void;
}

// ─── Colour helpers ──────────────────────────────────────────────────────────

function parseHex(hex: string, fallback: [number, number, number]): [number, number, number] {
  const value = hex.trim();
  const match = /^#([0-9a-f]{6})$/i.exec(value) ?? /^#([0-9a-f]{3})$/i.exec(value);
  if (!match) return fallback;
  const body = match[1];
  if (body.length === 3) {
    const r = parseInt(body[0] + body[0], 16);
    const g = parseInt(body[1] + body[1], 16);
    const b = parseInt(body[2] + body[2], 16);
    return [r, g, b];
  }
  return [
    parseInt(body.slice(0, 2), 16),
    parseInt(body.slice(2, 4), 16),
    parseInt(body.slice(4, 6), 16),
  ];
}

function rgba(hex: string, alpha: number, fallback: [number, number, number]): string {
  const [r, g, b] = parseHex(hex, fallback);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Deterministic seeding ───────────────────────────────────────────────────

function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export function createAtmosphereEngine(canvas: HTMLCanvasElement): AtmosphereEngine | null {
  const context2d = canvas.getContext("2d", { alpha: true });
  if (!context2d) return null;
  const ctx: CanvasRenderingContext2D = context2d;

  const host = canvas.parentElement ?? canvas;
  const root = document.documentElement;

  // Surface is assigned before the first bake: `readTuning()` resolves the
  // surface-dependent gain tokens from it.
  let surface: SurfaceId = "home";
  let mode: GameplayModeId | null = null;

  // Tokens are read once per (re)bake — never per frame.
  let palette: Palette = readPalette();
  let tuning: Tuning = readTuning();
  let phase: Phase = "playing";
  let modalOpen = false;
  let lowEnergy = false;
  let scrollY = 0;
  let reducedMotion = false;

  let quality: EngineQuality = resolveQuality();
  let cssW = 1;
  let cssH = 1;
  let scale = quality.scale;
  let frameCount = 0;

  let rafId = 0;
  let running = false;
  let lastTime = 0;
  let fieldAlpha = tuning.recedePlaying;
  let targetAlpha = tuning.recedePlaying;
  let elapsed = 0;

  // Reactive field state (display-only). Written on events, read in the frame —
  // never written during a draw, so there is no continuous reactive loop.
  let lastGuessDirection: "higher" | "lower" = "higher";
  let surgeActive = false;
  let surgeStart = 0;
  let surgeDirection: "higher" | "lower" = "higher";
  let surgePairs = 0;
  let beatActive = false;
  let beatStart = 0;
  let assertiveDirection: "higher" | "lower" | null = null;
  let assertiveWrong = false;

  // Baked once per (re)bake; never appended to the document.
  let sprites: SpriteSet | null = null;

  // Pre-rendered layers (device-resolution canvases drawn 1:1).
  const staticLayer = document.createElement("canvas");
  const vignetteLayer = document.createElement("canvas");
  const safeLayer = document.createElement("canvas");

  const impulses: Impulse[] = Array.from({ length: IMPULSE_SLOTS }, () => ({
    active: false,
    kind: "ripple" as ImpulseKind,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    start: 0,
    dur: 0,
    maxRadius: 0,
    strength: 0,
    color: "",
    amount: 0,
  }));
  let impulseCursor = 0;

  const motes: Mote[] = seedMotes(MOTES_DESKTOP);
  const chevrons: Chevron[] = seedChevrons(CHEVRONS_DESKTOP);

  let resizeObserver: ResizeObserver | null = null;
  let visibilityHandler: (() => void) | null = null;
  let reducedMedia: MediaQueryList | null = null;
  let dprMedia: MediaQueryList | null = null;

  function readPalette(): Palette {
    const styles = getComputedStyle(root);
    const read = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    return {
      classic: read("--accent-classic", "#6355cb"),
      timeAttack: read("--accent-time-attack", "#d93fd0"),
      higher: read("--accent-action-higher", "#22d3ee"),
      highlight: read("--accent-highlight", "#ffcc00"),
      error: read("--status-error", "#f05ac7"),
      elevated: read("--bg-elevated", "#211d3a"),
    };
  }

  /**
   * Read the `--atmo-*` tuning tokens once per bake. Fallbacks equal the
   * calibrated values, so an absent token degrades to the intended field.
   */
  function readTuning(): Tuning {
    const styles = getComputedStyle(root);
    const num = (name: string, fallback: number) => {
      const raw = Number.parseFloat(styles.getPropertyValue(name));
      return Number.isFinite(raw) ? raw : fallback;
    };
    return {
      horizon: num("--atmo-horizon-alpha", 0.16),
      top: num("--atmo-top-alpha", 0.1),
      tintHome: num("--atmo-tint-alpha", 0.14),
      tintGameplay: num("--atmo-tint-alpha-gameplay", 0.16),
      tintLow: num("--atmo-tint-alpha-low", 0.03),
      recedePlaying: num("--atmo-recede-playing", 1),
      recedeReveal: num("--atmo-recede-reveal", 1),
      recedeModal: num("--atmo-recede-modal", 0.55),
      recedeGameOver: num("--atmo-recede-game-over", 0.75),
      recedeLow: num("--atmo-recede-low", 0.35),
      spriteGain: num(
        surface === "gameplay" ? "--atmo-sprite-gain-gameplay" : "--atmo-sprite-gain",
        surface === "gameplay" ? SPRITE_GAIN_GAMEPLAY : 1,
      ),
      chevronGain: num(
        surface === "gameplay" ? "--atmo-chevron-gain-gameplay" : "--atmo-chevron-gain",
        surface === "gameplay" ? CHEVRON_GAIN_GAMEPLAY : 1,
      ),
    };
  }

  function resolveQuality(): EngineQuality {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const base: EngineQuality = {
      scale: Math.min(window.devicePixelRatio || 1, DPR_CAP),
      moteCount: mobile ? MOTES_MOBILE : MOTES_DESKTOP,
      chevronCount: mobile ? CHEVRONS_MOBILE : CHEVRONS_DESKTOP,
      frameSkip: 1,
    };
    let forcedLow = false;
    try {
      forcedLow = window.localStorage.getItem("hl:atmosphere:quality") === "low";
    } catch {
      forcedLow = false;
    }
    const cores = navigator.hardwareConcurrency ?? 8;
    const slowUpdate = window.matchMedia("(update: slow)").matches;
    if (forcedLow || cores <= 4 || slowUpdate) {
      return {
        scale: 1,
        moteCount: MOTES_LOW_QUALITY,
        chevronCount: CHEVRONS_LOW_QUALITY,
        frameSkip: LOW_QUALITY_FRAME_SKIP,
      };
    }
    return base;
  }

  function seedMotes(count: number): Mote[] {
    const random = makeRandom(20261122);
    const list: Mote[] = [];
    for (let index = 0; index < count; index += 1) {
      const near = index % 2 === 1;
      const angle = random() * Math.PI * 2;
      list.push({
        nx: random(),
        ny: random(),
        z: near ? 1 : 0.5,
        size: near ? 1.6 + random() * 0.9 : 1 + random() * 0.6,
        alpha: near ? 0.18 + random() * 0.08 : 0.09 + random() * 0.05,
        speed: 8 + random() * 10,
        dirX: Math.cos(angle),
        dirY: Math.sin(angle) * 0.6,
        colorIndex: index % 3,
        phase: random() * Math.PI * 2,
      });
    }
    return list;
  }

  function activeMoteCount(): number {
    const cap = Math.min(quality.moteCount, motes.length);
    return lowEnergy ? Math.max(4, Math.round(cap * 0.2)) : cap;
  }

  /**
   * Chevron pool — seeded once at the desktop maximum with a distinct salt so
   * the spark positions do not shift. Mobile and the low-quality path iterate
   * fewer entries, exactly as `activeMoteCount()` does: no churn, no respawn.
   *
   * Index parity fixes the family (even = up/cyan, odd = down/magenta), so the
   * reserve indices 6–9 hold two pairs of one of each.
   */
  function seedChevrons(count: number): Chevron[] {
    const random = makeRandom(20261123);
    const list: Chevron[] = [];
    for (let index = 0; index < count; index += 1) {
      const reserve = index >= CHEVRON_RESERVE_START;
      list.push({
        nx: random(),
        ny: random(),
        up: index % 2 === 0,
        alpha: reserve ? 0.16 + random() * 0.04 : 0.22 + random() * 0.1,
        speed: 4 + random() * 5,
      });
    }
    return list;
  }

  function activeChevronCount(): number {
    const cap = Math.min(quality.chevronCount, chevrons.length);
    return lowEnergy ? Math.max(2, Math.round(cap * 0.4)) : cap;
  }

  /**
   * The one accent baked into the P0 horizon and the P2 tint wash.
   *
   * An unresolved mode resolves to Classic on both surfaces. Home must never
   * default to the higher/lower action accent — that is what turned the first
   * painted frame cyan instead of the preselected mode.
   */
  function tintColor(): string {
    return mode === "time-attack" ? palette.timeAttack : palette.classic;
  }

  function domainColor(index: number): string {
    const key = DOMAIN_TINT_ORDER[index] ?? "classic";
    return key === "time-attack"
      ? palette.timeAttack
      : key === "higher"
        ? palette.higher
        : key === "classic"
          ? palette.classic
          : palette.highlight;
  }

  function accentForTarget(target: string): string {
    if (target.startsWith("domain-")) {
      return domainColor(Number.parseInt(target.slice(7), 10) || 0);
    }
    if (target === "higher") return palette.higher;
    if (target === "lower") return palette.timeAttack;
    if (target === "go") return palette.timeAttack;
    if (target === "audio") return palette.highlight;
    return tintColor();
  }

  // ── Layer baking ───────────────────────────────────────────────────────────

  function prepareLayer(layer: HTMLCanvasElement) {
    const width = Math.max(1, Math.round(cssW * scale));
    const height = Math.max(1, Math.round(cssH * scale));
    if (layer.width !== width || layer.height !== height) {
      layer.width = width;
      layer.height = height;
    }
    const layerCtx = layer.getContext("2d");
    if (!layerCtx) return null;
    layerCtx.setTransform(1, 0, 0, 1, 0, 0);
    layerCtx.clearRect(0, 0, width, height);
    layerCtx.setTransform(scale, 0, 0, scale, 0, 0);
    return layerCtx;
  }

  function bakeStatic() {
    const layerCtx = prepareLayer(staticLayer);
    if (!layerCtx) return;
    const accent = tintColor();
    const tintAlpha = lowEnergy
      ? tuning.tintLow
      : surface === "gameplay"
        ? tuning.tintGameplay
        : tuning.tintHome;

    // P0 — horizon wash: bottom-centre lift, then a thin top-edge lift.
    const bottom = layerCtx.createRadialGradient(
      cssW * 0.5,
      cssH * 1.02,
      0,
      cssW * 0.5,
      cssH * 1.02,
      Math.max(cssW, cssH) * 0.72,
    );
    bottom.addColorStop(0, rgba(accent, tuning.horizon, [99, 85, 203]));
    bottom.addColorStop(1, rgba(accent, 0, [99, 85, 203]));
    layerCtx.fillStyle = bottom;
    layerCtx.fillRect(0, 0, cssW, cssH);

    const top = layerCtx.createLinearGradient(0, 0, 0, cssH * 0.24);
    top.addColorStop(0, rgba(accent, tuning.top, [99, 85, 203]));
    top.addColorStop(1, rgba(accent, 0, [99, 85, 203]));
    layerCtx.fillStyle = top;
    layerCtx.fillRect(0, 0, cssW, cssH * 0.24);

    // P2 — mode tint wash.
    // Surface-aware reach: on gameplay the tint radius is stretched past the
    // viewport diagonal so the mode accent survives out to the side gutters,
    // and a non-zero outer stop keeps a floor of colour at the edges instead of
    // fading to nothing. Home keeps the tighter, centre-weighted falloff. The
    // accent itself stays fully switched by `tintColor()` on both surfaces.
    const gameplayTint = surface === "gameplay";
    const tintRadius = Math.max(cssW, cssH) * (gameplayTint ? 1.05 : 0.62);
    const tintOuter = gameplayTint ? tintAlpha * 0.6 : 0;
    const tint = layerCtx.createRadialGradient(
      cssW * 0.5,
      cssH * 0.42,
      0,
      cssW * 0.5,
      cssH * 0.42,
      tintRadius,
    );
    tint.addColorStop(0, rgba(accent, tintAlpha, [99, 85, 203]));
    tint.addColorStop(1, rgba(accent, tintOuter, [99, 85, 203]));
    layerCtx.fillStyle = tint;
    layerCtx.fillRect(0, 0, cssW, cssH);
  }

  function bakeVignette() {
    const layerCtx = prepareLayer(vignetteLayer);
    if (!layerCtx) return;
    const vignette = layerCtx.createRadialGradient(
      cssW * 0.5,
      cssH * 0.5,
      Math.min(cssW, cssH) * 0.36,
      cssW * 0.5,
      cssH * 0.5,
      Math.max(cssW, cssH) * 0.78,
    );
    vignette.addColorStop(0, "rgba(9, 7, 25, 0)");
    vignette.addColorStop(1, "rgba(9, 7, 25, 0.42)");
    layerCtx.fillStyle = vignette;
    layerCtx.fillRect(0, 0, cssW, cssH);
  }

  /**
   * Punch one live-DOM rect into the erase layer. Called at bake time only, so
   * no frame ever reads layout.
   */
  function punchRect(
    layerCtx: CanvasRenderingContext2D,
    rect: DOMRect,
    originX: number,
    originY: number,
  ) {
    if (rect.width <= 0 || rect.height <= 0) return;
    layerCtx.fillRect(rect.left - originX, rect.top - originY, rect.width, rect.height);
  }

  /**
   * Text-safe bands and card-safe rects are erased from the field with
   * `destination-out`, so the page's own background shows through unchanged
   * behind every readable surface. Sprites are drawn before the blit, so the
   * erasure needs no per-sprite branch in the loop.
   */
  function bakeSafeBands() {
    const layerCtx = prepareLayer(safeLayer);
    if (!layerCtx) return;
    layerCtx.fillStyle = "#ffffff";

    if (surface !== "gameplay") {
      // Home gains one band: the hero wordmark block plus the primary CTA.
      const hero = document.querySelector<HTMLElement>('[data-atmo-safe="hero"]');
      if (!hero) return;
      const origin = host.getBoundingClientRect();
      punchRect(layerCtx, hero.getBoundingClientRect(), origin.left, origin.top);
      return;
    }

    const headerBand = 116;
    const statusBand = Math.min(cssH * 0.16, 140);
    const controlBand = Math.min(cssH * 0.24, 208);
    layerCtx.fillRect(0, 0, cssW, headerBand);
    layerCtx.fillRect(0, headerBand, cssW, Math.max(0, statusBand - headerBand) * 0.5);
    layerCtx.fillRect(0, cssH - controlBand, cssW, controlBand);

    // Card-safe rects: both comparison cards (label, plate and metadata) and the
    // OR badge. Erasing is a visual no-op — the card face is opaque — but it
    // keeps the field out of the art. The board only exists once the deck
    // resolved; a missing board simply leaves nothing to erase.
    const board = document.querySelector<HTMLElement>(
      'section[aria-label="Higher or lower comparison"]',
    );
    if (!board) return;
    const origin = host.getBoundingClientRect();
    for (const card of board.querySelectorAll<HTMLElement>("article[aria-label]")) {
      punchRect(layerCtx, card.getBoundingClientRect(), origin.left, origin.top);
    }
    // Direct child only: each card also contains an `aria-hidden` plate.
    const badge = board.querySelector<HTMLElement>(':scope > div[aria-hidden="true"]');
    if (badge) punchRect(layerCtx, badge.getBoundingClientRect(), origin.left, origin.top);
  }

  function rebakeAll() {
    palette = readPalette();
    tuning = readTuning();
    // Sprites first: the draw path must never see a stale or missing set for the
    // current `scale`.
    sprites = bakeSprites(scale, {
      white: "#ffffff",
      cyan: palette.higher,
      magenta: palette.timeAttack,
    });
    bakeStatic();
    bakeVignette();
    bakeSafeBands();
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    const nextW = Math.max(1, rect.width || window.innerWidth);
    const nextH = Math.max(1, rect.height || window.innerHeight);
    quality = resolveQuality();
    scale = quality.scale;
    cssW = nextW;
    cssH = nextH;
    canvas.width = Math.max(1, Math.round(cssW * scale));
    canvas.height = Math.max(1, Math.round(cssH * scale));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    // Assigning width/height resets all context state.
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    rebakeAll();
    if (reducedMotion) drawFrame(elapsed * 1000);
  }

  // ── Impulses ───────────────────────────────────────────────────────────────

  function pushImpulse(partial: Omit<Impulse, "active" | "start" | "amount"> & { amount?: number }) {
    const slot = impulses[impulseCursor];
    impulseCursor = (impulseCursor + 1) % IMPULSE_SLOTS;
    slot.active = true;
    slot.kind = partial.kind;
    slot.x = partial.x;
    slot.y = partial.y;
    slot.w = partial.w;
    slot.h = partial.h;
    slot.dur = partial.dur;
    slot.maxRadius = partial.maxRadius;
    slot.strength = partial.strength;
    slot.color = partial.color;
    slot.amount = partial.amount ?? 1;
    slot.start = elapsed * 1000;
  }

  function clearImpulses() {
    for (const slot of impulses) slot.active = false;
  }

  function pushTierPulse(tier: Tier, origin: { x: number; y: number; w: number; h: number }) {
    if (tier < 1) return;
    pushImpulse({
      kind: "tier",
      x: origin.x + origin.w * 0.5,
      y: origin.y + origin.h * 0.5,
      w: origin.w,
      h: origin.h,
      dur: tier >= 4 ? 520 : 420,
      maxRadius: 34 + tier * 16,
      strength: tier >= 4 ? 0.5 : 0.34,
      color: tier >= 4 ? palette.highlight : tintColor(),
      amount: tier,
    });
  }

  // ── Frame ──────────────────────────────────────────────────────────────────

  function sparkSprite(index: number, near: boolean): HTMLCanvasElement | null {
    if (!sprites) return null;
    const plane = near ? sprites.sparkNear : sprites.sparkFar;
    if (index === 0) return plane.white;
    if (index === 1) return plane.cyan;
    return plane.magenta;
  }

  /**
   * One `drawImage` per spark from a snug cached sprite. Position stays a pure
   * function of `elapsed`, so a frozen clock produces a frozen field.
   *
   * On a correct reveal the `near` plane takes the design's `dirY` bias toward
   * the revealed direction. The bias is integrated from `surgeStart` rather
   * than folded into the absolute `time` term: the displacement therefore
   * starts at zero on the beat (no jump), follows the surge envelope back to
   * zero, and is still a pure function of `elapsed` — nothing is stored or
   * mutated per sprite, and a frozen clock stays frozen.
   */
  function drawSprites(time: number, nowMs: number) {
    if (!sprites) return;
    const bakedScale = sprites.scale;
    const count = activeMoteCount();
    const parallax = Math.max(-96, Math.min(96, scrollY * 0.06));
    const surgeAge = nowMs - surgeStart;
    const sparkSurgeOn =
      !reducedMotion && surgeActive && surgeAge >= 0 && surgeAge < SURGE_DURATION_MS;
    const sparkBiasSeconds = sparkSurgeOn ? surgeAge / 1000 : 0;
    const sparkBiasEnvelope = sparkSurgeOn ? surgeEnvelope(surgeAge) : 0;
    const sparkBiasSign = surgeDirection === "higher" ? -1 : 1;
    for (let index = 0; index < count; index += 1) {
      const mote = motes[index];
      const near = mote.z >= 0.9;
      const sprite = sparkSprite(mote.colorIndex, near);
      if (!sprite) continue;
      // Exactly `sprite.width` device pixels under the active transform.
      const destination = sprite.width / bakedScale;
      const x = ((mote.nx * cssW + time * mote.speed * mote.dirX * 0.4) % cssW + cssW) % cssW;
      // `near` dust leans into the revealed direction for the surge window.
      const bias =
        sparkSurgeOn && near
          ? sparkBiasSeconds * mote.speed * SURGE_SPARK_BIAS * 0.4 * sparkBiasSign * sparkBiasEnvelope
          : 0;
      const rawY =
        mote.ny * cssH + time * mote.speed * mote.dirY * 0.4 + bias + parallax * mote.z;
      const y = ((rawY % cssH) + cssH) % cssH;
      const breathe = 0.8 + 0.2 * Math.sin(time * 0.5 + mote.phase);
      // The surface gain is clamped *before* the recession multiplier, so the
      // low-energy (0.35) and modal / game-over recessions still scale it down.
      ctx.globalAlpha = Math.min(0.85, mote.alpha * breathe * tuning.spriteGain) * fieldAlpha;
      ctx.drawImage(
        sprite,
        Math.round(x - destination / 2),
        Math.round(y - destination / 2),
        destination,
        destination,
      );
    }
    ctx.globalAlpha = 1;
  }

  /** 0 → 1 → 0 over the fixed 420 ms surge, peaking 17 % in. */
  function surgeEnvelope(age: number): number {
    const u = age / SURGE_DURATION_MS;
    if (u <= 0 || u >= 1) return 0;
    return u < SURGE_PEAK_AT ? u / SURGE_PEAK_AT : (1 - u) / (1 - SURGE_PEAK_AT);
  }

  /**
   * Chevrons on a plane slightly ahead of the dust. Correct reveals swap the
   * winning family to the hot sprite and lift it 10 px; a miss takes one fixed
   * recession plus a single 120 ms white lift. Nothing escalates with streak.
   *
   * Under reduced motion the same loop draws a single frozen composition with
   * brightness only — no drift, no ramp, no offsets.
   */
  function drawChevrons(time: number, nowMs: number) {
    if (!sprites) return;
    const set = sprites;
    const count = activeChevronCount();
    const parallax = Math.max(-96, Math.min(96, scrollY * 0.06));
    const span = cssH + CHEVRON_H_CSS * 2;

    const surgeAge = nowMs - surgeStart;
    const surgeOn = !reducedMotion && surgeActive && surgeAge >= 0 && surgeAge < SURGE_DURATION_MS;
    const beatAge = nowMs - beatStart;
    const wrongOn = !reducedMotion && beatActive && beatAge >= 0 && beatAge < WRONG_RECEDE_MS;

    for (let index = 0; index < count; index += 1) {
      const chevron = chevrons[index];
      const direction: "higher" | "lower" = chevron.up ? "higher" : "lower";
      const reserve = index >= CHEVRON_RESERVE_START;
      // Tier 1–2 only wake already-seeded reserve entries; the pool never grows.
      const joins = !reserve || index - CHEVRON_RESERVE_START < surgePairs * 2;

      let alpha = chevron.alpha;
      let hot = false;
      let offsetY = 0;
      // The gain applies to the at-rest field only. The reactive windows (the
      // Higher/Lower surge, a miss, the reduced-motion assertive state) keep
      // their own absolute alphas, so an answer flash still pops above idle.
      let idle = true;

      if (reducedMotion) {
        if (assertiveWrong) {
          alpha = WRONG_ALPHA;
          idle = false;
        } else if (assertiveDirection) {
          const winning = assertiveDirection === direction;
          alpha = winning ? SURGE_ALPHA_PEAK : SURGE_RECEDE_ALPHA;
          hot = winning;
          idle = false;
        }
      } else if (wrongOn) {
        alpha = WRONG_ALPHA;
        idle = false;
      } else if (surgeOn) {
        idle = false;
        const winning = direction === surgeDirection;
        if (winning && joins) {
          const envelope = surgeEnvelope(surgeAge);
          alpha = SURGE_ALPHA_BASE + (SURGE_ALPHA_PEAK - SURGE_ALPHA_BASE) * envelope;
          hot = true;
          offsetY = (direction === "higher" ? -SURGE_OFFSET_PX : SURGE_OFFSET_PX) * envelope;
        } else if (winning) {
          alpha = chevron.alpha;
        } else {
          alpha = SURGE_RECEDE_ALPHA;
        }
      }

      const sprite = hot
        ? chevron.up
          ? set.chevronUpHot
          : set.chevronDownHot
        : chevron.up
          ? set.chevronUp
          : set.chevronDown;

      if (idle) alpha = Math.min(1, alpha * tuning.chevronGain);

      const drift = chevron.up ? -1 : 1;
      const rawY = chevron.ny * cssH + drift * time * chevron.speed + parallax * CHEVRON_Z;
      const y = (((rawY + CHEVRON_H_CSS) % span) + span) % span - CHEVRON_H_CSS;
      const x = chevron.nx * Math.max(0, cssW - CHEVRON_W_CSS);
      ctx.globalAlpha = alpha * fieldAlpha;
      ctx.drawImage(
        sprite,
        Math.round(x),
        Math.round(y + offsetY),
        CHEVRON_W_CSS,
        CHEVRON_H_CSS,
      );
    }
    ctx.globalAlpha = 1;

    // D8: one fixed +6 % white lift for the first 120 ms of a miss — identical on
    // the first and the twentieth miss, with no scale and no repeat.
    if (wrongOn && beatAge < WRONG_LIFT_MS) {
      ctx.globalAlpha = WRONG_LIFT_ALPHA * fieldAlpha;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.globalAlpha = 1;
    }
  }

  function drawImpulses(nowMs: number) {
    for (const impulse of impulses) {
      if (!impulse.active) continue;
      const progress = (nowMs - impulse.start) / impulse.dur;
      if (progress >= 1 || progress < 0) {
        impulse.active = false;
        continue;
      }
      const eased = 1 - Math.pow(1 - progress, 3);
      const alpha = (1 - progress) * impulse.strength * fieldAlpha;
      if (alpha <= 0.002) continue;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(impulse.color, alpha, [99, 85, 203]);
      ctx.fillStyle = rgba(impulse.color, alpha, [99, 85, 203]);

      switch (impulse.kind) {
        case "ripple":
        case "shockwave": {
          const radius = impulse.maxRadius * eased;
          ctx.lineWidth = impulse.kind === "shockwave" ? 3 : 2;
          ctx.beginPath();
          ctx.arc(impulse.x, impulse.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case "ack": {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(impulse.x, impulse.y, 22 + 16 * eased, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case "updraft":
        case "downdraft": {
          const sign = impulse.kind === "updraft" ? -1 : 1;
          const spread = impulse.w * 0.34;
          ctx.lineWidth = 2;
          for (let line = 0; line < 3; line += 1) {
            const startX = impulse.x + impulse.w * 0.5 + (line - 1) * spread * 0.5;
            const startY = sign < 0 ? impulse.y + impulse.h : impulse.y;
            const travel = (impulse.h + 46) * eased;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX, startY + sign * travel);
            ctx.stroke();
          }
          break;
        }
        case "land": {
          // Horizontal scan across the board's outer margins — the card image
          // plane in the middle is never crossed.
          const margin = Math.max(24, impulse.w * 0.2);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(impulse.x, impulse.y);
          ctx.lineTo(impulse.x + margin, impulse.y);
          ctx.moveTo(impulse.x + impulse.w - margin, impulse.y);
          ctx.lineTo(impulse.x + impulse.w, impulse.y);
          ctx.stroke();
          break;
        }
        case "fracture": {
          ctx.lineWidth = 2;
          for (let crack = 0; crack < 3; crack += 1) {
            const angle = -Math.PI / 2 + (crack - 1) * 0.5;
            const length = 26 + 30 * eased;
            ctx.beginPath();
            ctx.moveTo(impulse.x, impulse.y);
            ctx.lineTo(
              impulse.x + Math.cos(angle) * length,
              impulse.y + Math.sin(angle) * length,
            );
            ctx.stroke();
          }
          break;
        }
        case "swell": {
          const radius = Math.max(impulse.w, 120) * (0.4 + 0.6 * eased);
          const flare = ctx.createRadialGradient(
            impulse.x,
            impulse.y,
            0,
            impulse.x,
            impulse.y,
            radius,
          );
          flare.addColorStop(0, rgba(impulse.color, alpha, [99, 85, 203]));
          flare.addColorStop(1, rgba(impulse.color, 0, [99, 85, 203]));
          ctx.fillStyle = flare;
          ctx.fillRect(impulse.x - radius, impulse.y - radius, radius * 2, radius * 2);
          break;
        }
        case "launch": {
          const contraction = progress < 0.28 ? progress / 0.28 : 1;
          const radius =
            progress < 0.28
              ? 48 * contraction
              : 48 + (impulse.maxRadius - 48) * ((progress - 0.28) / 0.72);
          ctx.lineWidth = progress < 0.28 ? 5 : 2;
          ctx.beginPath();
          ctx.arc(impulse.x, impulse.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case "band": {
          ctx.fillRect(impulse.x, impulse.y, impulse.w, impulse.h);
          break;
        }
        case "glow": {
          const radius = 120;
          const glow = ctx.createRadialGradient(
            impulse.x,
            impulse.y,
            0,
            impulse.x,
            impulse.y,
            radius,
          );
          glow.addColorStop(0, rgba(impulse.color, alpha * 0.5, [99, 85, 203]));
          glow.addColorStop(1, rgba(impulse.color, 0, [99, 85, 203]));
          ctx.fillStyle = glow;
          ctx.fillRect(impulse.x - radius, impulse.y - radius, radius * 2, radius * 2);
          break;
        }
        case "wash": {
          ctx.fillRect(0, impulse.y - 40, cssW, 80);
          break;
        }
        case "tier": {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(impulse.x, impulse.y, impulse.maxRadius * eased, 0, Math.PI * 2);
          ctx.stroke();
          if (impulse.amount >= 3) {
            const bandWidth = impulse.maxRadius * 2.4;
            ctx.globalAlpha = 1;
            ctx.fillStyle = rgba(impulse.color, alpha * 0.5, [99, 85, 203]);
            ctx.fillRect(impulse.x - bandWidth * 0.5, impulse.y, bandWidth, 1);
          }
          if (impulse.amount >= 4 && progress < 0.16) {
            // Single-frame 4 % field lift; ≈ 80 ms, at most once per reveal.
            ctx.globalAlpha = 1;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.04 * fieldAlpha})`;
            ctx.fillRect(0, 0, cssW, cssH);
          }
          break;
        }
        default:
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFrame(timeMs: number) {
    if (canvas.width === 0 || canvas.height === 0) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.globalCompositeOperation = "source-over";

    // S1: the field is drawn first, then the text-safe bands erase only the
    // field (sprites/chevrons/impulses), and the wash + vignette are painted
    // *after* the erase. The band therefore suppresses sprites without leaving
    // an edge in the wash — invisible by construction, still one canvas.
    drawSprites(timeMs / 1000, timeMs);
    drawChevrons(timeMs / 1000, timeMs);
    drawImpulses(timeMs);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(safeLayer, 0, 0, cssW, cssH);
    ctx.globalCompositeOperation = "source-over";

    ctx.globalAlpha = fieldAlpha;
    ctx.drawImage(staticLayer, 0, 0, cssW, cssH);
    ctx.globalAlpha = 1;
    ctx.drawImage(vignetteLayer, 0, 0, cssW, cssH);
  }

  function step(now: number) {
    if (!running) return;
    rafId = requestAnimationFrame(step);
    if (quality.frameSkip > 1) {
      frameCount += 1;
      if (frameCount % quality.frameSkip !== 0) return;
    }
    const delta = lastTime === 0 ? 0.016 : Math.min((now - lastTime) / 1000, MAX_DELTA_S);
    lastTime = now;
    elapsed += delta;

    fieldAlpha += (targetAlpha - fieldAlpha) * RECESSION_K;
    if (Math.abs(targetAlpha - fieldAlpha) < 0.002) fieldAlpha = targetAlpha;

    // Game-over: a slow 12 s breathing loop behind the scrim.
    const breathing =
      phase === "game-over" ? 1 + 0.05 * Math.sin((elapsed * Math.PI * 2) / 12) : 1;
    const previousAlpha = fieldAlpha;
    fieldAlpha = fieldAlpha * breathing;
    // Impulses are timestamped on the engine's own clock, so the frame and the
    // impulse ring must read the same one.
    drawFrame(elapsed * 1000);
    fieldAlpha = previousAlpha;
  }

  function start() {
    if (running) return;
    if (reducedMotion) {
      drawFrame(elapsed * 1000);
      return;
    }
    running = true;
    lastTime = 0;
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function updateTarget() {
    if (lowEnergy) targetAlpha = tuning.recedeLow;
    else if (modalOpen) targetAlpha = tuning.recedeModal;
    else if (phase === "game-over") targetAlpha = tuning.recedeGameOver;
    else if (phase === "revealing") targetAlpha = tuning.recedeReveal;
    else targetAlpha = tuning.recedePlaying;
    if (reducedMotion) {
      fieldAlpha = targetAlpha;
    }
  }

  // ── Event intake ───────────────────────────────────────────────────────────

  function handleEvent(event: AtmosphereEvent) {
    if (reducedMotion && event.type !== "scroll") {
      // Reduced motion: state changes still land (they drive CSS), but the
      // canvas never animates and never emits an impulse. The field is one
      // frozen frame; a reveal changes its *brightness* through a single
      // discrete repaint, never through motion.
      if (event.type === "phase") {
        phase = event.phase;
        updateTarget();
        if (event.phase === "playing" && (assertiveDirection || assertiveWrong)) {
          assertiveDirection = null;
          assertiveWrong = false;
          drawFrame(elapsed * 1000);
        }
      } else if (event.type === "modal") {
        modalOpen = event.state === "open";
        updateTarget();
      } else if (event.type === "route") {
        clearImpulses();
        phase = "playing";
        assertiveWrong = false;
        assertiveDirection = null;
        updateTarget();
        // The loop is stopped under reduced motion, so a reset that only changes
        // state would leave the last-recession field on screen. Repaint once.
        drawFrame(elapsed * 1000);
      } else if (event.type === "guess") {
        lastGuessDirection = event.direction;
      } else if (event.type === "reveal") {
        assertiveWrong = !event.correct;
        assertiveDirection = event.correct ? lastGuessDirection : null;
        drawFrame(elapsed * 1000);
      }
      return;
    }

    switch (event.type) {
      case "pointer": {
        const { cue, target, x, y, w, h } = event;
        const color = accentForTarget(target);
        if (cue === "hover") {
          pushImpulse({
            kind: "glow",
            x: x + w * 0.5,
            y: y + h * 0.5,
            w,
            h,
            dur: 460,
            maxRadius: 120,
            strength: 0.12,
            color,
          });
          return;
        }
        if (target === "go") {
          pushImpulse({
            kind: "launch",
            x: x + w * 0.5,
            y: y + h * 0.5,
            w,
            h,
            dur: 500,
            maxRadius: Math.max(w, h) * 1.4,
            strength: 0.55,
            color,
          });
          return;
        }
        if (target === "audio") {
          pushImpulse({
            kind: "ack",
            x: x + w * 0.5,
            y: y + h * 0.5,
            w,
            h,
            dur: 260,
            maxRadius: 40,
            strength: 0.4,
            color,
          });
          return;
        }
        if (target.startsWith("domain-")) {
          pushImpulse({
            kind: "shockwave",
            x: x + w * 0.5,
            y: y + h * 0.5,
            w,
            h,
            dur: 500,
            maxRadius: Math.max(w, h) * 0.9 + 40,
            strength: 0.3,
            color,
          });
          return;
        }
        if (target.startsWith("category-")) {
          pushImpulse({
            kind: "band",
            x: 0,
            y,
            w: cssW,
            h,
            dur: 400,
            maxRadius: 0,
            strength: 0.05,
            color,
          });
          return;
        }
        if (target.startsWith("mode-")) {
          pushImpulse({
            kind: "ripple",
            x: x + w * 0.5,
            y: y + h * 0.5,
            w,
            h,
            dur: 420,
            maxRadius: Math.max(w, h) * 0.7,
            strength: 0.26,
            color,
          });
          return;
        }
        if (cue === "warn") {
          pushImpulse({
            kind: "wash",
            x: 0,
            y: y + h * 0.5,
            w: cssW,
            h: 80,
            dur: 220,
            maxRadius: 0,
            strength: 0.05,
            color: palette.error,
          });
          return;
        }
        if (cue === "confirm") {
          pushImpulse({
            kind: "ack",
            x: x + w * 0.5,
            y: y + h * 0.5,
            w,
            h,
            dur: 180,
            maxRadius: 34,
            strength: 0.3,
            color: palette.highlight,
          });
          return;
        }
        const radius = cue === "filter" ? 120 : cue === "open" ? 160 : 160;
        pushImpulse({
          kind: "ripple",
          x: x + w * 0.5,
          y: y + h * 0.5,
          w,
          h,
          dur: cue === "tab" ? 300 : 480,
          maxRadius: radius,
          strength: 0.28,
          color,
        });
        return;
      }
      case "guess": {
        // Remembered so the following `reveal` knows which family to light up.
        lastGuessDirection = event.direction;
        pushImpulse({
          kind: event.direction === "higher" ? "updraft" : "downdraft",
          x: event.x,
          y: event.y,
          w: event.w,
          h: event.h,
          dur: 300,
          maxRadius: 0,
          strength: 0.34,
          color: event.direction === "higher" ? palette.higher : palette.timeAttack,
        });
        return;
      }
      case "reveal": {
        // Display-only reactive field. The surge window is a constant 420 ms and
        // never grows with tier or streak; the tier only wakes already-seeded
        // reserve pairs, so the pool cannot expand.
        if (event.correct) {
          surgeActive = true;
          surgeStart = elapsed * 1000;
          surgeDirection = lastGuessDirection;
          surgePairs = Math.min(event.tier, CHEVRON_RESERVE_PAIRS);
          beatActive = false;
        } else {
          surgeActive = false;
          beatActive = true;
          beatStart = elapsed * 1000;
        }
        if (event.correct) {
          pushImpulse({
            kind: "land",
            x: 0,
            y: event.origin.y + event.origin.h * 0.5,
            w: cssW,
            h: 1,
            dur: 240,
            maxRadius: 0,
            strength: 0.22,
            color: tintColor(),
          });
          pushTierPulse(event.tier, event.origin);
        } else {
          pushImpulse({
            kind: "fracture",
            x: event.origin.x + event.origin.w * 0.5,
            y: event.origin.y + event.origin.h * 0.5,
            w: event.origin.w,
            h: event.origin.h,
            dur: 320,
            maxRadius: 0,
            strength: 0.34,
            color: palette.error,
          });
        }
        return;
      }
      case "phase": {
        phase = event.phase;
        if (event.phase === "playing") {
          for (const slot of impulses) {
            if (slot.kind === "band") slot.active = false;
          }
        }
        updateTarget();
        return;
      }
      case "timer": {
        return;
      }
      case "delta": {
        pushImpulse({
          kind: "wash",
          x: 0,
          y: event.origin.y + event.origin.h * 0.5,
          w: cssW,
          h: 80,
          dur: 260,
          maxRadius: 0,
          strength: 0.06,
          color: event.kind === "gain" ? palette.higher : palette.error,
        });
        return;
      }
      case "modal": {
        modalOpen = event.state === "open";
        if (!modalOpen && event.opener) {
          pushImpulse({
            kind: "ripple",
            x: event.opener.x + event.opener.w * 0.5,
            y: event.opener.y + event.opener.h * 0.5,
            w: event.opener.w,
            h: event.opener.h,
            dur: 420,
            maxRadius: 150,
            strength: 0.22,
            color: tintColor(),
          });
        }
        updateTarget();
        return;
      }
      case "route": {
        clearImpulses();
        phase = "playing";
        modalOpen = false;
        surgeActive = false;
        beatActive = false;
        assertiveDirection = null;
        assertiveWrong = false;
        updateTarget();
        return;
      }
      case "scroll": {
        scrollY = event.y;
        return;
      }
      default:
        return;
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  function onVisibility() {
    if (document.hidden) stop();
    else start();
  }

  function onReducedMotionChange(event: MediaQueryListEvent) {
    reducedMotion = event.matches;
    if (reducedMotion) {
      stop();
      fieldAlpha = targetAlpha;
      drawFrame(elapsed * 1000);
    } else {
      start();
    }
  }

  function onDprChange() {
    resize();
  }

  resize();

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(host);
  }
  window.addEventListener("resize", resize, { passive: true });

  visibilityHandler = onVisibility;
  document.addEventListener("visibilitychange", onVisibility);

  if (typeof window.matchMedia === "function") {
    reducedMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = reducedMedia.matches;
    reducedMedia.addEventListener("change", onReducedMotionChange);
    dprMedia = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    dprMedia.addEventListener("change", onDprChange);
  }

  return {
    start,
    destroy() {
      stop();
      sprites = null;
      resizeObserver?.disconnect();
      resizeObserver = null;
      window.removeEventListener("resize", resize);
      if (visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler);
        visibilityHandler = null;
      }
      reducedMedia?.removeEventListener("change", onReducedMotionChange);
      dprMedia?.removeEventListener("change", onDprChange);
      reducedMedia = null;
      dprMedia = null;
      clearImpulses();
    },
    setSurface(nextSurface: SurfaceId, nextMode: GameplayModeId | null) {
      if (surface === nextSurface && mode === nextMode) return;
      surface = nextSurface;
      mode = nextMode;
      rebakeAll();
      if (reducedMotion) drawFrame(elapsed * 1000);
    },
    setReducedMotion(reduce: boolean) {
      if (reducedMotion === reduce) return;
      reducedMotion = reduce;
      if (reduce) {
        stop();
        fieldAlpha = targetAlpha;
        drawFrame(elapsed * 1000);
      } else {
        start();
      }
    },
    setLowEnergy(low: boolean) {
      if (lowEnergy === low) return;
      lowEnergy = low;
      rebakeAll();
      updateTarget();
      if (reducedMotion) drawFrame(elapsed * 1000);
    },
    setScroll(y: number) {
      scrollY = y;
    },
    handleEvent,
  };
}
