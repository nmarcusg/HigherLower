/**
 * Atmosphere delegation — one capture-phase classifier for generic cues.
 *
 * It turns a DOM interaction into an `AtmosphereEvent` with the element's own
 * viewport box, so every control gets an origin-accurate reaction without any
 * per-control edits. Only three listeners exist, and none of them runs on a
 * per-frame path.
 *
 * De-duplication: a native control can produce `pointerdown` and then a
 * `keydown` activation for what the user experiences as one press. A 350 ms
 * window suppresses the second cue for the same element, in either direction.
 * Pointer activation is taken from `pointerdown` only — never `click` — so a
 * programmatic click cannot double-fire.
 */

import { emitAtmosphere } from "./eventBus";
import type { CueKind, Rect } from "./types";

const MATCHER =
  'button, a[href], input, label, select, [role="tab"], [role="switch"]';

/** Only real activation keys. Arrow/h/l guessing is emitted semantically. */
const ACTIVATION_KEYS = new Set(["Enter", " "]);

const DEDUPE_MS = 350;
const HOVER_MIN_MS = 120;

let attached = false;
let pointerAt = 0;
let pointerEl: Element | null = null;
let keyboardAt = 0;
let keyboardEl: Element | null = null;

/** Read an element's viewport box once per event. Never called per frame. */
export function rectOf(el: Element | null | undefined): Rect {
  if (!el) return { x: 0, y: 0, w: 0, h: 0 };
  const box = el.getBoundingClientRect();
  return { x: box.left, y: box.top, w: box.width, h: box.height };
}

/**
 * The gameplay status cluster's screen box, read from the live header.
 * Used as the origin of the tier-shaped reveal pulse so the impulse starts at
 * the tally it belongs to, not at a fixed screen point.
 */
export function gameplayStatusOrigin(): Rect {
  const header = document.querySelector<HTMLElement>("[data-gameplay-mode] header");
  if (!header) return { x: 0, y: 0, w: 0, h: 0 };
  const box = header.getBoundingClientRect();
  const width = Math.min(132, box.width);
  return {
    x: box.right - width,
    y: box.top + box.height * 0.5,
    w: width,
    h: 24,
  };
}

/**
 * The box of an element chosen as an interaction origin, with an explicit
 * fallback selector so a guess made from the document body still has a real
 * origin (the Higher/Lower button it acted like).
 */
export function originFor(el: Element | null | undefined, fallbackSelector: string): Rect {
  if (el && el !== document.body && el !== document.documentElement) {
    const box = rectOf(el);
    if (box.w > 0 && box.h > 0) return box;
  }
  return rectOf(document.querySelector(fallbackSelector));
}

function isDisabled(el: Element): boolean {
  const control = el as HTMLElement & { disabled?: boolean };
  if (control.disabled === true) return true;
  if (el.getAttribute("aria-disabled") === "true") return true;
  if (el.closest("[disabled]")) return true;
  if (el instanceof HTMLLabelElement) {
    const input = el.querySelector("input, select, textarea");
    if (input instanceof HTMLElement && "disabled" in input && input.disabled) {
      return true;
    }
  }
  return false;
}

function radioIndex(el: Element | null): number {
  if (!el) return 0;
  const input =
    el instanceof HTMLInputElement ? el : el.querySelector("input[type='radio']");
  if (!(input instanceof HTMLInputElement)) return 0;
  const group = Array.from(
    document.querySelectorAll<HTMLInputElement>(`input[name="${input.name}"]`),
  );
  const index = group.indexOf(input);
  return index < 0 ? 0 : index;
}

interface ResolvedTarget {
  target: string;
  cue: CueKind;
}

/** Map an interactive element to a short stable target id and cue family. */
function resolveTarget(el: Element): ResolvedTarget {
  const label = el.getAttribute("aria-label") ?? "";
  const tag = el.tagName.toLowerCase();

  if (el.hasAttribute("data-audio-control")) {
    return { target: "audio", cue: "audio" };
  }

  // The scroll-free Go dock. A dedicated semantic attribute rather than the
  // `.home-go` presentation class, which also paints a magenta plate, a white
  // ring, a hover fill and a press translate a compact pill must not inherit.
  if (el.hasAttribute("data-atmo-go")) {
    return { target: "go", cue: "press" };
  }

  if (label === "Higher") return { target: "higher", cue: "press" };
  if (label === "Lower") return { target: "lower", cue: "press" };
  if (label === "Start Comparing") return { target: "start", cue: "press" };
  if (label === "Back to game setup") return { target: "back", cue: "press" };
  if (label === "View High Scores") return { target: "scores", cue: "open" };

  if (el.id === "btn-play-again") return { target: "restart", cue: "press" };
  if (el.id === "btn-back-to-menu") return { target: "menu", cue: "press" };
  if (el.classList.contains("home-go")) return { target: "go", cue: "press" };

  const input = el instanceof HTMLInputElement
    ? el
    : el.querySelector("input[type='radio']");
  if (input instanceof HTMLInputElement) {
    if (input.name === "semantic-domain") {
      return { target: `domain-${radioIndex(el)}`, cue: "select" };
    }
    if (input.name === "semantic-category") {
      return { target: `category-${radioIndex(el)}`, cue: "select" };
    }
    if (input.name === "playable-mode") {
      const mode = input.value === "time-attack" ? "time-attack" : "classic";
      return { target: `mode-${mode}`, cue: "mode" };
    }
  }

  const role = el.getAttribute("role");
  if (role === "tab") return { target: "tab", cue: "tab" };
  if (role === "switch") return { target: "switch", cue: "press" };
  if (tag === "select") return { target: "filter", cue: "filter" };

  const text = (el.textContent ?? "").trim().toLowerCase();
  if (text.startsWith("confirm")) return { target: "confirm", cue: "confirm" };
  if (text.startsWith("clear")) return { target: "danger", cue: "warn" };

  return { target: "press", cue: "press" };
}

/**
 * Attach the capture-phase listeners. Returns an idempotent detach function.
 * Mounted once by `AtmosphereBackdrop`; a second call is a no-op.
 */
export function attachAtmosphereDelegation(): () => void {
  if (attached || typeof window === "undefined") return () => {};
  attached = true;

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let hoverAt = 0;

  function classify(el: Element, source: "pointer" | "keyboard") {
    const { target, cue } = resolveTarget(el);
    const rect = rectOf(el);
    emitAtmosphere({
      type: "pointer",
      cue,
      target,
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      source,
    });
  }

  function onPointerDown(event: PointerEvent) {
    const raw = event.target;
    if (!(raw instanceof Element)) return;
    const el = raw.closest(MATCHER);
    if (!el || isDisabled(el)) return;
    const now = performance.now();
    if (keyboardEl === el && now - keyboardAt < DEDUPE_MS) return;
    pointerAt = now;
    pointerEl = el;
    classify(el, "pointer");
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!ACTIVATION_KEYS.has(event.key)) return;
    const raw = event.target;
    if (!(raw instanceof Element)) return;
    const el = raw.closest(MATCHER);
    if (!el || isDisabled(el)) return;
    // Space activates on keyup for buttons; skip the auto-repeat phase.
    if (event.repeat) return;
    const now = performance.now();
    if (pointerEl === el && now - pointerAt < DEDUPE_MS) return;
    keyboardAt = now;
    keyboardEl = el;
    classify(el, "keyboard");
  }

  function onPointerOver(event: PointerEvent) {
    if (!finePointer.matches) return;
    const raw = event.target;
    if (!(raw instanceof Element)) return;

    // Higher/Lower decision buttons: the field answers with a glow in that
    // button's own accent. These targets are silent in the cue map, so pointer
    // and keyboard remain exact parity (only the press is sonified).
    const decision = raw.closest('button[aria-label="Higher"], button[aria-label="Lower"]');
    const el = decision ?? raw.closest("label");
    if (!el || isDisabled(el)) return;

    let target: string;
    if (decision) {
      target = decision.getAttribute("aria-label") === "Higher" ? "higher" : "lower";
    } else {
      const input = el.querySelector("input[type='radio']");
      if (!(input instanceof HTMLInputElement)) return;
      target = `hover-${input.name}`;
    }

    const now = performance.now();
    if (now - hoverAt < HOVER_MIN_MS) return;
    hoverAt = now;
    const rect = rectOf(el);
    emitAtmosphere({
      type: "pointer",
      cue: "hover",
      target,
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      source: "pointer",
    });
  }

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("pointerover", onPointerOver, true);

  return () => {
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("pointerover", onPointerOver, true);
    pointerEl = null;
    keyboardEl = null;
    attached = false;
  };
}
