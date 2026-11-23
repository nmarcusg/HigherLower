/**
 * Atmosphere sprite baker — pure, offscreen, device-resolution.
 *
 * Every sprite is a `document.createElement("canvas")` node drawn once at bake
 * time and **never appended to the document**, exactly like the engine's
 * `staticLayer` / `vignetteLayer` / `safeLayer` (so
 * `document.querySelectorAll("canvas").length` stays 1).
 *
 * Because each canvas is sized in device pixels (`round(css x scale)`) and the
 * engine draws it with an explicit destination size of `canvas.width / scale`
 * CSS units under an active `setTransform(scale, ...)`, the blit is 1:1 device
 * pixels at every DPR — no re-sampling, no shimmer.
 *
 * Discipline: no React, no state, no timers, no DOM reads and no measurement
 * APIs beyond `document.createElement`. Gradients are created here, never in
 * the frame loop.
 */

// ─── Fixed geometry (CSS pixels) ─────────────────────────────────────────────

export const SPARK_NEAR_CSS = 14;
export const SPARK_FAR_CSS = 8;
export const CHEVRON_W_CSS = 20;
export const CHEVRON_H_CSS = 26;
export const CHEVRON_STEP_CSS = 8;
export const CHEVRON_SPAN_CSS = 12;
export const CHEVRON_STROKE_CSS = 2;
/** Top→bottom stroke alpha ladder, so a stack reads as a directional smear. */
export const CHEVRON_ALPHAS: readonly number[] = [0.95, 0.55, 0.28];

const SPARK_GLOW_ALPHA = 0.18;
const SPARK_ARM_ALPHA = 0.6;
const SPARK_NEAR_BODY_R = 3.5;
const SPARK_FAR_BODY_R = 2;
const CHEVRON_TOP_OFFSET = 3;
const CHEVRON_HOT_CORE_ALPHA = 0.85;

// ─── Types ───────────────────────────────────────────────────────────────────

/** One depth plane's three spark colours. */
export interface SparkPlane {
  white: HTMLCanvasElement;
  cyan: HTMLCanvasElement;
  magenta: HTMLCanvasElement;
}

export interface SpriteSet {
  /** The DPR scale the set was baked at. */
  scale: number;
  sparkNear: SparkPlane;
  sparkFar: SparkPlane;
  chevronUp: HTMLCanvasElement;
  chevronDown: HTMLCanvasElement;
  chevronUpHot: HTMLCanvasElement;
  chevronDownHot: HTMLCanvasElement;
}

/** Resolved colours handed in by the engine from the live token palette. */
export interface SpriteColors {
  white: string;
  cyan: string;
  magenta: string;
}

// ─── Colour helpers ──────────────────────────────────────────────────────────

function parseHex(hex: string, fallback: [number, number, number]): [number, number, number] {
  const value = hex.trim();
  const match = /^#([0-9a-f]{6})$/i.exec(value) ?? /^#([0-9a-f]{3})$/i.exec(value);
  if (!match) return fallback;
  const body = match[1];
  if (body.length === 3) {
    return [
      Number.parseInt(body[0] + body[0], 16),
      Number.parseInt(body[1] + body[1], 16),
      Number.parseInt(body[2] + body[2], 16),
    ];
  }
  return [
    Number.parseInt(body.slice(0, 2), 16),
    Number.parseInt(body.slice(2, 4), 16),
    Number.parseInt(body.slice(4, 6), 16),
  ];
}

function withAlpha(colour: string, alpha: number): string {
  const [r, g, b] = parseHex(colour, [255, 255, 255]);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Baking ──────────────────────────────────────────────────────────────────

function bakeCanvas(cssW: number, cssH: number, scale: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cssW * scale));
  canvas.height = Math.max(1, Math.round(cssH * scale));
  return canvas;
}

/**
 * A four-point spark: baked glow disc, opaque body circle, two one-device-pixel
 * crosshair arms. The glow is a second radial disc inside the same sprite, so
 * `shadowBlur` is never used anywhere.
 */
function bakeSpark(colour: string, cssSize: number, scale: number): HTMLCanvasElement {
  const canvas = bakeCanvas(cssSize, cssSize, scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const centre = cssSize / 2;

  const glow = ctx.createRadialGradient(centre, centre, 0, centre, centre, centre);
  glow.addColorStop(0, withAlpha(colour, SPARK_GLOW_ALPHA));
  glow.addColorStop(1, withAlpha(colour, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, cssSize, cssSize);

  const body = cssSize >= SPARK_NEAR_CSS ? SPARK_NEAR_BODY_R : SPARK_FAR_BODY_R;
  ctx.fillStyle = withAlpha(colour, 1);
  ctx.beginPath();
  ctx.arc(centre, centre, body, 0, Math.PI * 2);
  ctx.fill();

  // 1 device pixel wide at any DPR; the +0.5/scale nudge keeps it crisp.
  const crisp = 0.5 / scale;
  const arm = (cssSize * 0.86) / 2;
  ctx.strokeStyle = withAlpha(colour, SPARK_ARM_ALPHA);
  ctx.lineWidth = 1 / scale;
  ctx.beginPath();
  ctx.moveTo(centre - arm, centre + crisp);
  ctx.lineTo(centre + arm, centre + crisp);
  ctx.moveTo(centre + crisp, centre - arm);
  ctx.lineTo(centre + crisp, centre + arm);
  ctx.stroke();

  return canvas;
}

function strokeChevron(
  ctx: CanvasRenderingContext2D,
  yApex: number,
  up: boolean,
) {
  const left = (CHEVRON_W_CSS - CHEVRON_SPAN_CSS) / 2;
  const right = left + CHEVRON_SPAN_CSS;
  const mid = CHEVRON_W_CSS / 2;
  const near = yApex + 6;
  ctx.beginPath();
  if (up) {
    ctx.moveTo(left, near);
    ctx.lineTo(mid, yApex);
    ctx.lineTo(right, near);
  } else {
    ctx.moveTo(left, yApex);
    ctx.lineTo(mid, near);
    ctx.lineTo(right, yApex);
  }
  ctx.stroke();
}

/**
 * Three stacked chevrons at a fixed 8 px step. `hot` bakes the reactive variant:
 * full stroke alpha plus a wider white under-stroke that reads as a lit core.
 */
function bakeChevron(
  colour: string,
  up: boolean,
  hot: boolean,
  scale: number,
): HTMLCanvasElement {
  const canvas = bakeCanvas(CHEVRON_W_CSS, CHEVRON_H_CSS, scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";

  for (let index = 0; index < CHEVRON_ALPHAS.length; index += 1) {
    const yApex = CHEVRON_TOP_OFFSET + index * CHEVRON_STEP_CSS;
    if (hot) {
      ctx.strokeStyle = withAlpha("#ffffff", CHEVRON_HOT_CORE_ALPHA);
      ctx.lineWidth = CHEVRON_STROKE_CSS + 1;
      strokeChevron(ctx, yApex, up);
      ctx.lineWidth = CHEVRON_STROKE_CSS;
    }
    ctx.strokeStyle = withAlpha(colour, hot ? 1 : CHEVRON_ALPHAS[index]);
    strokeChevron(ctx, yApex, up);
  }

  return canvas;
}

/**
 * Bake the full set: 6 spark canvases (3 colours x 2 depth sizes) and 4 chevron
 * canvases (up/down x base/hot). All three spark colours are always baked, so a
 * later mode change never needs a partial rebake.
 */
export function bakeSprites(scale: number, colours: SpriteColors): SpriteSet {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return {
    scale: safeScale,
    sparkNear: {
      white: bakeSpark(colours.white, SPARK_NEAR_CSS, safeScale),
      cyan: bakeSpark(colours.cyan, SPARK_NEAR_CSS, safeScale),
      magenta: bakeSpark(colours.magenta, SPARK_NEAR_CSS, safeScale),
    },
    sparkFar: {
      white: bakeSpark(colours.white, SPARK_FAR_CSS, safeScale),
      cyan: bakeSpark(colours.cyan, SPARK_FAR_CSS, safeScale),
      magenta: bakeSpark(colours.magenta, SPARK_FAR_CSS, safeScale),
    },
    chevronUp: bakeChevron(colours.cyan, true, false, safeScale),
    chevronDown: bakeChevron(colours.magenta, false, false, safeScale),
    chevronUpHot: bakeChevron(colours.cyan, true, true, safeScale),
    chevronDownHot: bakeChevron(colours.magenta, false, true, safeScale),
  };
}
