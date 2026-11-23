# Procedural Canvas Backdrop + Web Audio — Design

**Date:** 2026-11-22
**Stage:** Design only. No application code, config, manifest, or other document was edited.
**Task type:** Visual enhancement (persistent procedural canvas) + new interaction subsystem (procedural audio) — *refinement preserves*, not redesign replaces.
**Status:** Design complete. Plan stage next. Code stage not started.
**Upstream analysis:** [`docs/procedural-canvas-audio-analysis-2026-11-22.md`](procedural-canvas-audio-analysis-2026-11-22.md)
**Downstream plan:** [`docs/procedural-canvas-audio-plan-2026-11-22.md`](procedural-canvas-audio-plan-2026-11-22.md)

---

## 0. Stage inputs, tooling status, and what this document is not

### 0.1 Inputs read for this stage

| Input | Purpose | Evidence |
|---|---|---|
| Corrected analysis, all sections including §0 correction log, §5 36-row matrix, §6 architecture, §9 risks, §10 D1–D14, §11 open items | Incumbent truth, measured geometry, allowlist, risks, decision log | [`docs/procedural-canvas-audio-analysis-2026-11-22.md`](procedural-canvas-audio-analysis-2026-11-22.md:1) |
| Six completed immersive-motion documents | Inherited constraints that must not regress | `docs/immersive-motion-redesign-{analysis,design,plan,handoff,qa,postfix}-2026-11-22.md` |
| `design-reference/tokens/*` | Authoritative incumbent visual evidence: grid, offset shadows, mode accents, Space Mono | [`visual-patterns.md`](../design-reference/tokens/visual-patterns.md:1), [`colors.md`](../design-reference/tokens/colors.md:1), [`layout.md`](../design-reference/tokens/layout.md:1), [`typography.md`](../design-reference/tokens/typography.md:1) |
| `app/globals.css` (all 794 lines) | Tokens, grid, focus ring, noise overlay, reduced-motion strip, motion layer, `::view-transition` rules | [`app/globals.css`](../app/globals.css:1) |
| `app/layout.tsx` | The only allowed mount point | [`app/layout.tsx`](../app/layout.tsx:36) |
| `app/page.tsx` | Confirms the `<ViewTransition>` wrapper is in `page.tsx` | [`app/page.tsx`](../app/page.tsx:9) |
| `components/game/GameplayShell.tsx` | Opaque shell surface, header `backdrop-blur`, 3-column header grid, status slot | [`GameplayShell.tsx`](../components/game/GameplayShell.tsx:45) |
| `components/home/HomeSetup.tsx` | Home header row, `startGame`, ambient observer | [`HomeSetup.tsx`](../components/home/HomeSetup.tsx:181) |
| `components/game/ClassicGame.tsx`, `TimeAttackGame.tsx` | Guess funnel, reveal callbacks, timer tick, game-over scrim, timing constants | [`ClassicGame.tsx`](../components/game/ClassicGame.tsx:170), [`TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:242) |
| `components/game/GameCard.tsx`, `ComparisonBoard.tsx`, `GameplayDivider.tsx`, `GameplayStatus.tsx`, `DecisionControls.tsx` | Confirmed frozen-markup hooks usable in CSS selectors | [`GameCard.tsx`](../components/game/GameCard.tsx:61), [`ComparisonBoard.tsx`](../components/game/ComparisonBoard.tsx:41), [`GameplayDivider.tsx`](../components/game/GameplayDivider.tsx:11), [`GameplayStatus.tsx`](../components/game/GameplayStatus.tsx:46), [`DecisionControls.tsx`](../components/game/DecisionControls.tsx:28) |
| `components/HighScoresModal.tsx` | Modal open/close, tablist, filter, two-step confirms | [`HighScoresModal.tsx`](../components/HighScoresModal.tsx:68) |
| Next.js 16 local docs | Layout persistence, client-boundary rules, `<ViewTransition>` semantics | [`view-transitions.md`](../node_modules/next/dist/docs/01-app/02-guides/view-transitions.md:268), [`layout.md`](../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md:152) |
| `.roo/rules/*`, `governance/conditions/{design,plan}.md` | Stage policy | `.roo/rules/` |

### 0.2 Tooling status for this stage

| Capability | Status | Detail |
|---|---|---|
| `impeccable context` launcher | `[Blocked]` — not executable here | This session's Architect toolset has no command-execution tool, so `.agents/skills/impeccable/scripts/impeccable context` could not be run. Context loading did not run; existing project context was read directly, with no invented context. The completed motion work already recorded the launcher's directives for this project: `NO_PRODUCT_MD`, `SCOPED_EXISTING_ALLOWED`, `EXISTING_VISUAL_SYSTEM`, `MANUAL_DETECTOR_REQUIRED` ([`docs/immersive-motion-redesign-design-2026-11-22.md`](immersive-motion-redesign-design-2026-11-22.md:31)). Treated as current. |
| `reference/craft-floor.md` | Deliberately **not** loaded | Planning-only stage; the skill directs loading the craft floor immediately before a UI edit. |
| Browser / Playwright / animation-inspector / design-extract | Not used this stage | Design is source- and evidence-based. Runtime verification belongs to QA; the analysis's own Playwright numbers are the runtime baseline. |
| `impeccable` command routing | Ordinary design work (no sub-command implied) | This is an additive enhancement of existing surfaces, so it is *refinement preserves*, not new-work/world replacement. `init`/`document` were not run: the incumbent world is already evidenced by `design-reference/` and `app/globals.css`. |

### 0.3 What this document is not

- It is **not** a layout change, theme change, copy change, or gameplay change.
- It is **not** a replacement visual world. It adds an atmosphere layer *inside* the incumbent dark-neon arcade identity.
- It does **not** re-open D1–D14. They are binding as approved, with D4 amended by the owner.
- It is **not** an implementation. No file under `app/`, `components/`, `lib/`, `types/`, `scripts/`, `public/` is touched.
- It contains no effort estimates.

---

## 1. Decision log

### 1.1 Binding owner decisions (carried verbatim, D4 amended)

| # | Decision | Status |
|---|---|---|
| **D1** | Canvas scope: Home + Gameplay, with modal dimming and game-over behind the 90 % scrim. | Approved |
| **D2** | `GameplayShell.tsx` Tier B transparency **approved**: the canvas must be visible behind gameplay while cards, text and focus rings retain contrast. | **Approved (Tier B)** |
| **D3** | SFX default: on after the first gesture (silent until the context exists). | Approved |
| **D4** | **AMENDED:** BGM **auto-starts at low volume after the first user gesture** (not opt-in, not off by default). SFX remain on but silent until the first gesture. If the user previously disabled Music, or disabled master audio, that persisted choice wins and auto-start must not override it. | **Approved (amended)** |
| **D5** | Audio control: header-integrated 44×44 control at top-right on both Home and Gameplay. | Approved |
| **D6** | Control pattern: one-click mute + compact SFX/Music popover. | Approved |
| **D7** | BGM character: one shared generative theme with mode-specific tempo/root. | Approved |
| **D8** | Interface ticks: on for fine pointers, off for touch, toggleable. | Approved |
| **D9** | iOS silent switch: respect it — never set `navigator.audioSession.type`. | Approved |
| **D10** | Reduced motion + canvas: draw one static frame. | Approved |
| **D11** | Urgent-timer audio: tick only at ≤ 5 s, 1/s. | Approved |
| **D12** | High Scores modal open: canvas dims to 55 %, BGM ducks to 30 %, SFX available inside the dialog. | Approved |
| **D13** | Keyboard press styling parity (inherited QA F2): **out of scope**. | Approved |
| **D14** | No extra user-facing motion toggle beyond `prefers-reduced-motion`. | Approved |

### 1.2 Design-level decisions taken inside the approved scope

These are technical/design resolutions the brief delegates to this stage. None is a product call.

| # | Decision | Rationale |
|---|---|---|
| **DD-1** | The canvas does **not** re-draw the dot grid. The incumbent CSS grid stays authoritative (`body.bg-grid` at [`globals.css:112`](../app/globals.css:112) and the shell's own `bg-grid`). The canvas supplies depth, horizon, tint, impulses and vignette only. | Two independent grids at different registration would moiré and read as noise, and would double the per-frame fill. **Deviation from analysis §6.3 layer 0, flagged in §13 (C-1).** |
| **DD-2** | One `<canvas>`, not two. The reference two-layer pattern (krillion) is reproduced as two *draw passes* into one buffer. | The brief requires a single persisted loop; a second buffer buys nothing at these alphas and doubles memory plus a second lifecycle. |
| **DD-3** | `data-*` state lives on `document.documentElement` as **separate single-value attributes** (`data-audio-sfx`, `data-audio-music`) rather than one packed value. | CSS selectors must be trivially specific; a packed `sfx-on:music-off` string requires attribute-substring matching. **Deviation from analysis §6.2, flagged (C-3).** |
| **DD-4** | The gameplay body region renders the canvas through **`color-mix()` alpha on the existing shell surface**, and the header's `backdrop-filter` is **removed**. | Keeps one token source, avoids re-blurring a live canvas every frame (analysis R3), and preserves incumbent colour identity. |
| **DD-5** | The canvas reads design tokens once from `getComputedStyle(documentElement)` at mount and on mode change; it never reads CSS per frame. | Tokens stay the single source of truth and per-frame DOM/`getComputedStyle` reads are eliminated. |
| **DD-6** | Audio is a **module singleton** with a tiny `useSyncExternalStore` settings store; React renders only the control. | Matches the analysis's zero-re-render requirement and the project's existing `useSyncExternalStore` pattern at [`HighScoresModal.tsx:58`](../components/HighScoresModal.tsx:58). |
| **DD-7** | Ambience on gameplay is deliberately **sub-perceptual at the card plane**: the canvas contributes ≤ 16 % show-through of an already-low-luminance field, so the strong gameplay signals are audio, the OR badge and the status cluster. | Honours "never compete with `GameCard` cover art" while satisfying D2 (visible in the gutters). |
| **DD-8** | Under `prefers-reduced-motion: reduce` the canvas draws **one frame at mount and one on resize** and never starts `requestAnimationFrame`; audio is unaffected (sound is not motion). | D10 + D14. Audio preference and motion preference are independent. |

### 1.3 Contradictions found between the analysis and the approved decisions

Flagged rather than silently resolved, per governance.

| # | Contradiction | Resolution used here |
|---|---|---|
| **C-1** | Analysis §6.3 layer 0 wants the incumbent dot grid "re-expressed" on the canvas, but the incumbent grid is a live CSS background on both `body` and the gameplay shell. | Not re-drawn (DD-1). Recorded for owner awareness; no product behaviour changes. |
| **C-2** | Analysis §7.3 recommends BGM **off** by default (the basis of D4's original text). | Owner overrode: amended D4 auto-starts BGM low after the first gesture, with persisted user choice winning. This document implements amended D4 only. |
| **C-3** | Analysis §6.2 proposes a single packed `data-audio` attribute. | Split into `data-audio-sfx` / `data-audio-music` (DD-3). |
| **C-4** | Analysis row **H4** says the field dims to **70 %** while the High Scores modal is open; row **H12** and **D12** say **55 %** and ducking to 30 %. | One target only: **55 % field, 30 % BGM** (D12 authoritative). H4 keeps a small ripple, no second dim value. |
| **C-5** | Analysis §6.6 lists `AudioSurface` as a separate client component from `AtmosphereBackdrop`, while §8.2 also puts an audio control inside `HomeSetup`'s header. | One component, two mounts: `AudioSurface` is rendered in the layout (for gameplay chrome) **and** in the Home header slot, sharing the singleton store. Only the header instance is visible on Home. See §9.2. |

---

## 2. Visual authority and scope

### 2.1 Authority order for every visual value in this document

1. Explicit owner decisions D1–D14 (including amended D4).
2. `.roo/rules/*`, including `ui-design-system.md` theme preservation.
3. Incumbent implementation and `design-reference/` evidence.
4. The analysis's measured runtime values.
5. Reference-site *principles* — never their worlds.

No value in §3, §5, §7 or §9 is invented: each cites a token in [`app/globals.css`](../app/globals.css:4) or a measured geometry from the analysis §2.1 / §7.1.

### 2.2 What is preserved, exactly

| Preserved | Evidence |
|---|---|
| All design tokens (`:root` at `:4`, motion `:root` at `:460`) — nothing renamed, reordered or removed | [`globals.css:4`](../app/globals.css:4), [`globals.css:460`](../app/globals.css:460) |
| Space Mono as the only typeface; no new font loading | [`globals.css:75`](../app/globals.css:75), [`layout.tsx:5`](../app/layout.tsx:5) |
| Offset-shadow geometry (`0 9px 0`, `5px 5px 0`, `8px 8px 0`, `10px 10px 0`) and every border weight | [`globals.css:38`](../app/globals.css:38), [`GameCard.tsx:89`](../components/game/GameCard.tsx:89), [`DecisionControls.tsx:39`](../components/game/DecisionControls.tsx:39), [`GameplayShell.tsx:56`](../components/game/GameplayShell.tsx:56) |
| Noise grain overlay and its stacking (`z-index: 0`, fixed, `pointer-events: none`) | [`globals.css:200`](../app/globals.css:200)–[`:207`](../app/globals.css:207) |
| Global focus ring (`3px` outline, `4px` offset) and every per-control `focus-visible` override | [`globals.css:119`](../app/globals.css:119) |
| Layout, spacing, breakpoints, section order, `min-h-[5.5rem]` header, 3-column header grid | [`GameplayShell.tsx:49`](../components/game/GameplayShell.tsx:49) |
| Card cover art plane: aspect-square, `rounded-[2.25rem]`, native `<img>`, offset plate | [`GameCard.tsx:87`](../components/game/GameCard.tsx:87)–[`:122`](../components/game/GameCard.tsx:122) |
| Body class string, byte-identical | [`layout.tsx:37`](../app/layout.tsx:37) |
| The global reduced-motion hard-strip block, byte-identical | [`globals.css:188`](../app/globals.css:188) |
| Five-tier ladder, reveal-time tally, `<ViewTransition>` route wrappers, Home ambient loops, game-over entrance, timer cadence | [`ClassicGame.tsx:59`](../components/game/ClassicGame.tsx:59), [`TimeAttackGame.tsx:67`](../components/game/TimeAttackGame.tsx:67), [`app/page.tsx:9`](../app/page.tsx:9), [`globals.css:668`](../app/globals.css:668) |

### 2.3 What is explicitly not copied from the references

Not adopted: krillion's sea/creature fiction and palettes, noillirk's pixel-art 0.25× buffers and 12 309 px marketing shell, fairways' WebGL/Three stack and 0.33× buffers, any third-party typeface, any ad/iframe surface, any 5 s `steps(1)` title flicker, any mascot. Only measured *principles* transfer (see §12).

### 2.4 Surface modes

| Surface | Mode | Atmosphere ambition |
|---|---|---|
| Home / setup | **Persuade** | The only surface that earns ambience: a slow parallax depth field, selector ripples and a `go!` warp. |
| Gameplay (Classic, Time Attack) | **Experience** | Precision only: field recession during reveals, tier-shaped status accents, never over the card plane. |
| High Scores modal / game-over panel | **Operate** | Dampening and micro-impulses; no authored choreography inside a dialog. |

---

## 3. Atmosphere visual system

### 3.1 The visual idea, in one paragraph

Higher or Lower is a dark-navy arcade cabinet with white outlines and hard coloured offset shadows. The atmosphere layer is the **inside of that cabinet**: a low-ceiling horizon glow behind the content, a handful of slow drifting motes on two depth planes, and mode-tinted light that breathes at the edges. It has no characters, no scenery, no texture of its own — it is *light and depth* behind an interface that already owns the grid, the type and the shadows. Every reaction to input is a short, bright, geometric pulse that originates at the control that caused it, travels outward, and decays; nothing lingers, nothing loops loudly, and nothing ever crosses a card, a label, or a focus ring.

### 3.2 Layer stack (draw order inside the single canvas)

| Pass | Content | Cadence | Cost control |
|---|---|---|---|
| **P0 — Horizon wash** | Two pre-rendered radial gradients: a bottom-centre lift in the route/mode accent at ≤ 10 % alpha, and a top-edge lift at ≤ 6 %. | Re-rendered **only** on mount, resize, or mode change. | Cached in one offscreen bitmap, blitted with one `drawImage`. |
| **P1 — Depth field** | 28 motes desktop / 12 mobile, on 2 depth planes (z 0.5 and 1.0), radius 1.0–2.5 px, alpha 0.05–0.18, drift ≤ 6 px/s, colours from `--accent-*` only. | Per frame, `fillRect` only. | Pre-allocated pool, no allocation, no `shadowBlur`, no `filter`. |
| **P2 — Tint wash** | Mode accent radial at 6–8 %: classic `#6355cb`, time-attack `#d93fd0`; Home mixes the three hero accents (`--accent-time-attack`, `--accent-action-higher`, `--accent-classic`) at 6 %. | Re-rendered on mode change only. | One cached gradient, one `fillRect` per frame. |
| **P3 — Impulses** | `ripple`, `shockwave`, `updraft`, `downdraft`, `land` scan, `fracture`, `swell`, `launch`, `reset`, `ack`. | Per frame while alive; ≤ 700 ms each, **max 2 concurrent**, oldest evicted. | Ring/stroke draws only at low alpha; decayed via `globalAlpha`. |
| **P4 — Recession** | Whole-field multiplier: 1.00 playing, 0.80 revealing, 0.55 modal open, 0.75 game-over behind the scrim, 0.35 dimmed/low-energy states. | One float lerp per frame (`setTargetAtTime` equivalent in rAF, `k = 0.12`). | One integer multiply. |
| **P5 — Vignette + text-safe bands** | Pre-rendered radial darkening at the edges, plus horizontal bands over the header band, the status overlay line and the decision-control row, multiplied to **zero** field luminance inside those bands. | Re-rendered on resize only. | Two cached bitmaps. |

**Hard rules.** The canvas never paints over the card plane, never paints over a focus ring, and never raises local luminance behind text by more than **8 %** relative to `--bg-base` (analysis §6.3 constraint, R6). Where the gameplay `role="status"` line ("Correct" / "Incorrect") sits over the shell surface rather than a card ([`ClassicGame.tsx:292`](../components/game/ClassicGame.tsx:292)), the text-safe band covers it.

### 3.3 Route and mode tint palettes

| State | Tint source token | Alpha | Notes |
|---|---|---|---|
| Home, no mode chosen | mix of `--accent-time-attack` + `--accent-action-higher` + `--accent-classic` | 6 % | Matches the hero's three per-word offsets ([`HomeSetup.tsx:204`](../components/home/HomeSetup.tsx:204)–[`:206`](../components/home/HomeSetup.tsx:206)) |
| Home, mode `classic` selected | `--accent-classic` `#6355cb` | 8 % | Selection is a state, not an event: tint lerps over 500 ms |
| Home, mode `time-attack` selected | `--accent-time-attack` `#d93fd0` | 8 % | Same |
| Gameplay `classic` | `--accent-classic` | 8 % → 10 % at tier ≥ 3 | Mirrors `--gameplay-accent` set at [`GameplayShell.tsx:46`](../components/game/GameplayShell.tsx:46) |
| Gameplay `time-attack` | `--accent-time-attack` | 8 % → 10 % at tier ≥ 3 | Same |
| Low-energy / error / empty state | none | ≤ 2 % | `DerivedGameState` (row G16): field is nearly inert |

Domain tints (row H5) are **transient** impulses, not persistent palettes: movies → magenta (`--accent-time-attack`), gaming → cyan (`--accent-action-higher`), music → purple (`--accent-classic`), social-media → amber (`--accent-highlight`), each at 8 % alpha for 500 ms.

### 3.4 Layering, z-index, pointer events, aria

| Property | Value | Why it is safe |
|---|---|---|
| `position` | `fixed`, `inset: 0` | Persists across scroll and route inside the layout |
| `z-index` | `0` | Body has no stacking context (`position: static`); the canvas is painted after the body background and before later siblings. `.bg-noise::after` (also `z-index: 0`, but generated last inside `body`) paints **above** the canvas, so grain stays on top — exactly the incumbent identity ([`globals.css:200`](../app/globals.css:200)). |
| `pointer-events` | `none` | Cannot steal focus, cannot block a press, cannot intercept `elementFromPoint` |
| `aria-hidden` | `"true"` | Pure decoration; nothing is conveyed only by canvas |
| `width`/`height` attributes | drawing buffer = `round(css × scale)` | Canvas `width`/`height` are attributes, not CSS; CSS sets the box to `100%` of the viewport |
| Host element | a single `<div data-atmosphere-host aria-hidden="true">` wrapping the canvas | One `ResizeObserver` target, one `IntersectionObserver` target |

**Compatibility with existing shadows and the noise overlay.** Because the canvas sits in the root stacking context at `z-index: 0`, every content layer that is positioned with `z-index: auto` or higher paints above it: Home `main` (`relative isolate`, [`HomeSetup.tsx:179`](../components/home/HomeSetup.tsx:179)), the gameplay shell (`relative isolate`, [`GameplayShell.tsx:45`](../components/game/GameplayShell.tsx:45)), the header (`z-20`), the divider (`z-0` *inside* the shell's isolated context, so it still paints above the canvas), the status overlay (`z-30`), the OR badge (`z-20`), the decision controls (`z-30`), the game-over panel (`z-50`) and every `dialog` (top layer, above everything). Hard offset shadows are box-shadows on those layers and are unaffected. **Nothing needs a `z-index` change to accommodate the canvas.**

### 3.5 Reduced motion

Under `prefers-reduced-motion: reduce`: draw P0, P1 (frozen at its seeded positions), P2, P5 once on mount, and once more after each resize or mode change; never start rAF; never emit impulses; never apply scroll parallax. State changes still reach the user through existing CSS opacity/tint rules (the project already re-admits opacity crossfades under reduced motion at [`globals.css:705`](../app/globals.css:705)). The reduced-motion canvas is **visible but motionless** (D10) — not omitted.

---

## 4. Event model and choreography

### 4.1 The bus

One module-level, framework-free emitter. No React state is involved in any cue.

```ts
// lib/atmosphere/eventBus.ts — shape only; not implemented in this stage
type SurfaceId = "home" | "gameplay";
type Phase = "playing" | "revealing" | "game-over";
type Tier = 0 | 1 | 2 | 3 | 4;
type CueKind =
  | "select" | "press" | "hover" | "open" | "close"
  | "tick" | "warn" | "confirm" | "mode" | "filter" | "tab" | "audio";

type AtmosphereEvent =
  | { type: "pointer"; cue: CueKind; x: number; y: number; w: number; h: number;
      source: "pointer" | "keyboard"; target: string }
  | { type: "guess"; direction: "higher" | "lower"; source: "pointer" | "keyboard";
      x: number; y: number; w: number; h: number }
  | { type: "reveal"; correct: boolean; tier: Tier; revealedValueOrigin: { x: number; y: number; w: number; h: number } }
  | { type: "phase"; phase: Phase }
  | { type: "timer"; secondsLeft: number; urgent: boolean; fromTick: boolean }
  | { type: "delta"; kind: "gain" | "loss"; y: number }
  | { type: "modal"; state: "open" | "closed"; opener: { x: number; y: number; w: number; h: number } | null }
  | { type: "route"; from: SurfaceId | null; to: SurfaceId; mode: "classic" | "time-attack" | null; intent: "forward" | "back" }
  | { type: "scroll"; y: number }
  | { type: "audio"; sfx: boolean; music: boolean; ticks: boolean };
```

`target` is a short stable string (`"higher"`, `"lower"`, `"go"`, `"domain"`, `"category"`, `"mode"`, `"tab"`, `"filter"`, `"audio"`, …) resolved by the delegation classifier, so both the canvas and the audio engine can pick a recipe without touching the DOM again.

### 4.2 Producers: delegation first, semantic emits only where meaning is required

**(a) Generic capture-phase delegation** — owned by `AtmosphereBackdrop`, attaches three listeners on `document` in the capture phase:

| Listener | Filter | Emits |
|---|---|---|
| `pointerdown` | target matches `closest('button, a[href], input, label, select, [role="tab"], [role="switch"]')` and is not `disabled` | `pointer` with `cue` derived from the matched tag/role and the element's `getBoundingClientRect()`, `source: "pointer"` |
| `keydown` | `Enter`, `Space`, or the game's own `ArrowUp`/`h`/`ArrowDown`/`l` on the same matcher | `pointer` with `source: "keyboard"` for activation keys; never for Tab/Escape |
| `focusin` | same matcher | *No event.* Focus is not echoed into the canvas; only its ring is visible. Prevents a cue on every Tab. |
| `pointerover` (fine pointers only, `matchMedia('(hover: hover) and (pointer: fine)')`) | `label` inside `radiogroup` | `pointer` with `cue: "hover"`, rate-limited to one per 120 ms |

Activation-key delegation must **not** double-fire with the native click: the rule is that delegation only reacts to `pointerdown` (pointer path) and to `keydown` where the key activates a native control **and** the element is a `<button>` or `[role="tab"]`/`[role="switch"]` whose activation the browser performs on `keyup` for Space. To avoid two cues for one interaction, delegation suppresses a keyboard cue within 350 ms of a pointer cue on the same element, and vice versa. This is the one place where a runtime double-fire check is mandatory (analysis §11.9).

**(b) Semantic emits** — four files, one line each, inside existing funnels:

| Location | Emit |
|---|---|
| [`ClassicGame.tsx:170`](../components/game/ClassicGame.tsx:170) `handleGuess` | `guess` (after the `phase !== "playing"` guard; origin = the `document.activeElement` rect the handler already captures at `:173`) |
| [`ClassicGame.tsx:193`](../components/game/ClassicGame.tsx:193) 1500 ms callback | `reveal` (`correct`, `tier` from the existing `resolveTier`) + `phase` |
| [`TimeAttackGame.tsx:242`](../components/game/TimeAttackGame.tsx:242) `handleGuess` | `guess` (same funnel, after `guessLocked`/`phaseRef` guards) |
| [`TimeAttackGame.tsx:287`](../components/game/TimeAttackGame.tsx:287) reveal callback | `reveal` + `phase` |
| [`TimeAttackGame.tsx:177`](../components/game/TimeAttackGame.tsx:177) 1000 ms interval | `timer` (`secondsLeft = timerRef.current`, `urgent = <= 10`) |
| [`TimeAttackGame.tsx:267`](../components/game/TimeAttackGame.tsx:267), [`:276`](../components/game/TimeAttackGame.tsx:276) | `delta` (`gain` / `loss`) |
| [`HomeSetup.tsx:147`](../components/home/HomeSetup.tsx:147) `startGame` | `route` (`intent: "forward"`) |
| [`HighScoresModal.tsx:68`](../components/HighScoresModal.tsx:68) effect | `modal` open/closed (the click path is already covered by delegation; this covers Escape, `onCancel` and backdrop close) |

Because `guess` is emitted **inside** `handleGuess`, pointer and keyboard parity is structural — the requirement is satisfied without touching either handler's semantics (analysis R10).

**(c) Coordinate origin.** Every origin is `el.getBoundingClientRect()` read once per event, **never** per frame. `x`/`y` are viewport coordinates (the canvas is `position: fixed`, so no scroll compensation is needed for impulses). The canvas stores the event origin in *viewport* space and converts to buffer space with the current `scale` at draw time — an impulse created before a scroll keeps its screen position for its ≤ 700 ms life, which is the correct behaviour for a fixed backdrop.

### 4.3 Event-to-visual mapping — all 36 audited rows

Legend: **RTE** = reduced-motion equivalent. Every reaction is outside the card image plane and changes no layout.

#### Home (19 rows)

| # | Element | Visual reaction | Cue / amplitude | RTE |
|---|---|---|---|---|
| **H1** | Page scroll | Depth field offsets vertically by `−scrollY × 0.06`, clamped to ±96 px; P0/P2 stay fixed. Not a scroll-jacker, no `scroll-behavior` change. | continuous, ≤ 6 % of delta | No parallax; field static |
| **H2** | Hero wordmark entrance | One `swell`: horizon wash +6 % luminance for 600 ms, origin at the `h1` baseline centre | 1 impulse | opacity flash only |
| **H3** | `a[aria-label="Start Comparing"]` | `ripple` at the anchor centre, radius 240 px, 700 ms; grid phase is *not* shifted (CSS owns the grid) | `pointer/select` | single 140 ms opacity flash, no radius growth |
| **H4** | `button[aria-label="View High Scores"]` | `ripple` 160 px + field begins recessing toward the modal target (handed to H12) | `pointer/open` | flash only |
| **H5** | Domain radios (`input[name="semantic-domain"]` ×4) | `shockwave` from the **label** box (the input is 1×1 `sr-only`), 500 ms; transient domain tint 8 % | `pointer/select` | tint change instant |
| **H5b** | Domain label hover | `glow` at 25 % strength, following pointer x along the label baseline | `pointer/hover`, rate-limited 120 ms | none |
| **H6** | Category rows (`input[name="semantic-category"]`) | `column-pulse`: a vertical band under the row height matching the row, decay 400 ms | `pointer/select` | static 3 % tint |
| **H7** | Disabled category row | **No impulse.** | — | — |
| **H8** | Mode radios (classic, time-attack) | `mode-tint`: whole field lerps to the mode accent over 500 ms; one ring from the label | `pointer/mode` | instant tint |
| **H9** | Disabled `pvp` | **No impulse.** | — | — |
| **H10** | `button.home-go` "go!" | `launch`: radial contraction (120 ms) then outward burst in `--accent-time-attack` (380 ms), then field fades to 0 over 320 ms to hand over to the route transition | `pointer/press` | burst suppressed; 140 ms field fade only |
| **H11** | Footer | None | — | — |
| **H12** | High Scores dialog open | `vignette-in`: field recesses to **55 %** over 180 ms, no darkening layer added (the `::backdrop` at `rgb(9 7 25 / 78 %)` already dims the page) | `modal/open` | immediate 55 % |
| **H13** | Modal tabs ×2 | `ripple` 160 px from the tab box; field tint nudges toward the tab's mode accent | `pointer/tab` | instant tint |
| **H14** | Modal `select` filter | small `ripple` 120 px at the select's right edge | `pointer/filter` | none |
| **H15** | Clear this leaderboard (2 presses) | press 1: `dim-pulse` in `--status-error` at 6 % for 200 ms; press 2: `resolve` micro-flash 140 ms | `pointer/warn` → `pointer/confirm` | instant tint |
| **H16** | Clear all High Scores (2 presses) | Same as H15 | `pointer/warn` → `pointer/confirm` | instant tint |
| **H17** | Modal close (X / Escape / backdrop) | `vignette-out`: field restores 55 % → 100 % over 180 ms; `settle` ripple centred on the opener button | `modal/closed` | immediate restore |
| **H18** | **Audio control** | `ack` 200 ms at the control origin: a 44 px ring + a 120 ms glow in `--accent-highlight` when music turns on, `--foreground-muted` when off | `pointer/audio` | instant glyph + tint only |

#### Gameplay (17 rows)

| # | Element | Visual reaction | Cue / amplitude | RTE |
|---|---|---|---|---|
| **G1** | `a[aria-label="Back to game setup"]` | `ripple` 160 px at the control; field fade begins before navigation (`intent: "back"`) | `pointer/press` | instant flash |
| **G2** | Board `section[aria-label="Higher or lower comparison"]` | Passive recession only: field 100 % → **80 %** during `revealing`, restored on the next `playing`. Matches the OR badge's own 1→0.5 fade ([`ComparisonBoard.tsx:43`](../components/game/ComparisonBoard.tsx:43)). | `phase` | no recession |
| **G3** | Next-value reveal | `land` scan: 1 px horizontal line crossing the *board* at the card's y-centre, 240 ms, **clipped to exclude the card's image rect** so cover art is never overlaid | `reveal` | opacity flash, no travel |
| **G4** | `button[aria-label="Higher"]` | `updraft`: three upward convection lines from the button box, 300 ms; correct answer drives the field upward | `guess/higher` | brightness step 140 ms |
| **G5** | `button[aria-label="Lower"]` | `downdraft`: mirrored | `guess/lower` | brightness step 140 ms |
| **G6** | Keyboard `ArrowUp`/`h`, `ArrowDown`/`l` | **Identical to G4/G5** — emitted from inside `handleGuess` | `guess` with `source: "keyboard"` | same as G4/G5 |
| **G7** | `GameplayStatus` tally | Tier-shaped impulse at the status cluster's y-origin: t1 `pulse`, t2 `double-pulse`, t3 `ring + streak band`, t4 `slam` (single-frame field invert at 4 % alpha) | `reveal.tier` | brightness only |
| **G8** | `role="timer"` numeral | When `isUrgent`: grid-free field contracts 2 % and pulses at 1.67 Hz, phase-locked to the existing 600 ms `.timer-urgent` keyframe ([`globals.css:436`](../app/globals.css:436)) | `timer` | no contraction, no pulse |
| **G9** | `role="progressbar"` | A 1 px scan line in the field's lower glow tracks remaining time (read-only mirror; no impulse) | `timer` | static line |
| **G10** | Delta label `+3s / −5s` | `gain` (upward bright wash) or `loss` (red-shifted dim wash) at the label's y-origin | `delta` | colour only |
| **G11** | Wrong answer | `fracture`: 3 short cracks from the board centre, 320 ms, decaying; magnitude **fixed** (never escalates); never inside the card rects | `reveal.correct = false` | tint only |
| **G12** | Game over panel | Field `settle` to **75 %** behind the 90 % scrim and drop to a slow 12 s breathing loop; no burst | `phase: "game-over"` | single static frame |
| **G13** | `#btn-play-again` | `reset`: field returns to the mode tint over 500 ms; motes reseeded | `pointer/press` | instant restore |
| **G14** | `#btn-back-to-menu` | Same as G1 | `pointer/press` | instant flash |
| **G15** | Game-over Tab trap | **None.** Focus movement is never echoed. | — | — |
| **G16** | `DerivedGameState` link (empty/unavailable/error) | Low-energy field: 20 % density, no reactions, 35 % recess | none | static frame |
| **G17** | **Audio control (gameplay)** | `ack` at the control origin (same as H18) | `pointer/audio` | instant |

**Row count check:** Home 19 (H1–H18 plus H5b) + Gameplay 17 (G1–G17) = **36**, matching analysis §5 exactly.

### 4.4 Choreography rules (what makes it feel authored rather than random)

1. **One origin per event.** An impulse starts at the element that caused it, never at a fixed screen point.
2. **Nothing outlives its cause.** Longest impulse 700 ms (H3); everything else ≤ 500 ms. No impulse survives a route change: `route` clears the impulse list.
3. **Tier shapes the *status*, not the card.** Escalation is expressed in ring/streak/sub-thump, never in card movement, never in cover-art overlay.
4. **The wrong beat is fixed.** No escalation on failure — a punishing visual on a losing streak is the classic arcade cruelty the brief excludes.
5. **Recession is continuous, impulses are discrete.** Field alpha lerps (never jumps); impulses are one-shot.
6. **Scroll parallax is capped and unsynced to layout.** ≤ 6 % of scroll delta, clamped ±96 px, applied to P1 only. The `scrollIntoView` on Home H3 still decides scroll position; the canvas only follows it.
7. **`go!` hands over, it does not linger.** The 380 ms burst + 320 ms field fade both finish inside `--motion-dur-route` (320 ms) plus one beat, so the route snapshot never contains a half-finished burst (analysis R12).
8. **Dialogs dampen, they do not mute.** 55 % field + 30 % BGM + full SFX inside the dialog (D12).

---

## 5. UI harmonization: the `data-*` contract

### 5.1 The contract

Written on `document.documentElement` (`<html>`), never on `<body>` (the body class string must stay byte-identical at [`layout.tsx:37`](../app/layout.tsx:37)) and never on a per-frame path.

| Attribute | Values | Writer | When |
|---|---|---|---|
| `data-atmosphere` | `on` / `off` | `AtmosphereBackdrop` effect | On mount when a 2D context was obtained; `off` otherwise (or if `IntersectionObserver`/`getContext` is unavailable) |
| `data-surface` | `home` / `gameplay` | `AtmosphereBackdrop` effect | On `usePathname()` change ([`layout.md:242`](../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md:242) — `usePathname` must be read inside a client component; layouts themselves do not re-render, [`layout.md:154`](../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md:154)) |
| `data-mode` | `classic` / `time-attack` / *(removed)* | `AtmosphereBackdrop` effect | Same effect, derived from the same pathname |
| `data-phase` | `playing` / `revealing` / `game-over` | `AtmosphereBackdrop` effect on `phase` events | Reveal commit and game-over transition (2 writes per round, never per frame) |
| `data-tier` | `0`–`4` | Same effect | With each `reveal` (1 write per round) |
| `data-guess` | `idle` / `higher` / `lower` | Same effect | `guess`, cleared when `data-phase` returns to `playing` |
| `data-audio-sfx` | `on` / `off` | `AudioSurface` (settings store subscription) | On settings change only |
| `data-audio-music` | `on` / `off` | Same | On settings change only |
| `data-audio-state` | `armed` / `running` / `suspended` / `off` | `AudioSurface` | On context lifecycle change only (≤ 4 times per session) |
| `data-modal` | `open` / *(removed)* | `AtmosphereBackdrop` | `modal` events |

**No `data-motion` attribute is introduced (D14).** Motion preference is read from `matchMedia('(prefers-reduced-motion: reduce)')` only.

**Write budget:** at most ~12 attribute writes per round on gameplay (phase, tier, guess set/clear, timer-driven nothing, delta nothing), 0 per frame, and 0 per audio frame.

### 5.2 The CSS selectors that consume it

Appended to `app/globals.css` only (append-only; nothing above is edited):

| Rule | Purpose | Harmonizes |
|---|---|---|
| `html[data-atmosphere="on"] .audio-surface { color: var(--foreground-muted) }` … `html[data-audio-music="on"] .audio-surface { color: var(--accent-highlight) }` | The control's glyph and its 2 px offset shadow agree with whether music is actually running | Audio control ↔ backdrop lighting |
| `html[data-audio-state="armed"] .audio-surface::after` | A 4 px dot on the control's outer edge, in `--accent-highlight` at 60 %, while audio is armed but not yet unlocked | Audio control ↔ no-context state |
| `html[data-tier="3"] [data-streak-ring]`, `html[data-tier="4"] [data-streak-ring]` | Existing streak ring (already rendered at tier ≥ 3, [`GameplayStatus.tsx:54`](../components/game/GameplayStatus.tsx:54)) gains a 1 px accent glow at 20 % | Status cluster ↔ field tint |
| `html[data-tier="4"] [data-streak-line]` | Streak line height 0.5 px → 1 px | Status cluster ↔ reveal amplitude |
| `html[data-phase="revealing"] [data-result="correct"]` / `[data-result="incorrect"]` | The offset plate behind the card keeps `--card-accent`; only its shadow *spread* is nudged by 1 px while revealing, so the plate agrees with the field recession without touching cover art | Card shadows ↔ field |
| `html[data-modal="open"] .audio-surface` | The control (unreachable behind the top layer) drops to 60 % opacity so it does not read as an available action | Modal ↔ chrome |
| `html[data-guess="higher"] #btn-play-again`-style accent reuse is **not** added | The game-over panel keeps its own static accents (D-5 in the motion work: no new entrance) | — |

**What is deliberately not done:** no selector reaches inside `GameCard`'s `<img>`, no selector changes a border colour, no selector changes a focus outline, no selector animates anything per frame. The OR badge needs **no new selector** — its offset shadow already resolves `var(--gameplay-accent)`, set once on the shell ([`GameplayShell.tsx:46`](../components/game/GameplayShell.tsx:46)); the canvas reads the same token (DD-5), so badge and field agree by construction.

**Card-shadow selector caveat.** `article[data-result] > div.relative > [aria-hidden="true"]:first-child` is the offset plate ([`GameCard.tsx:86`](../components/game/GameCard.tsx:86)–[`:88`](../components/game/GameCard.tsx:88)). `GameCard.tsx` is frozen, so the selector targets existing markup without editing it. Whether that selector is stable enough to ship is `Needs Verification [inferred-from-codebase]` (§13.6); if it proves brittle, the card-shadow row is dropped and the harmonization still holds through `--card-accent` alone.

---

## 6. Mount and lifecycle

### 6.1 Mount point

```tsx
// app/layout.tsx — illustrative only; implemented in the Code stage
<body className="min-h-full flex flex-col bg-grid bg-noise antialiased">
  <AtmosphereBackdrop />   {/* client: fixed <canvas aria-hidden> + delegation + data-* writer */}
  {children}
  <AudioSurface />         {/* client: the audio control; engine is a module singleton */}
</body>
```

Why here and only here:

1. Root layouts are cached on the client and **do not re-render on navigation** ([`layout.md:152`](../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md:152)–[`:154`](../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md:154)), so the canvas DOM node and the `AudioContext` survive Home → gameplay.
2. `<ViewTransition>` wrappers must stay in `page.tsx`, because **layouts persist across navigations so enter/exit never fire there** ([`view-transitions.md:268`](../node_modules/next/dist/docs/01-app/02-guides/view-transitions.md:268)). Mounting in the layout therefore places the canvas *outside* the transition boundary.
3. One canvas → one rAF loop; one engine → one `AudioContext`; one store → one settings source.

**Tier B approval recorded:** `app/layout.tsx` is an **approved** modification (D2-adjacent Tier B), and its `<html>`/`<body>` class strings must remain byte-identical.

### 6.2 SSR safety

- `AtmosphereBackdrop` and `AudioSurface` are `"use client"`. Both render **deterministic markup on the server**: an empty `<canvas>` (harmless, zero pixels) and the audio button in its default-armed visual state.
- No browser API is touched during render. `window`, `document`, `matchMedia`, `getContext`, `AudioContext`, `localStorage` are read only inside `useEffect` or inside event handlers.
- The audio control's *state* comes from `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` where `getServerSnapshot` returns the **default settings object**, so the server and first client render agree and the glyph cannot flip during hydration (analysis R9; the project's existing precedent is [`HighScoresModal.tsx:58`](../components/HighScoresModal.tsx:58)).
- The canvas writes no attribute until its effect runs, so server markup has no `data-atmosphere` and CSS harmonization rules simply do not match on the first paint. That is intentional: no pre-hydration flicker.

### 6.3 Runtime lifecycle

| Event | Action |
|---|---|
| Mount | `getContext("2d")`; if `null` → render the canvas and do nothing, set `data-atmosphere="off"`. Otherwise read tokens, pre-render P0/P2/P5 bitmaps, seed the mote pool, size the buffer, attach observers and delegation listeners, start rAF (unless reduced motion). |
| `ResizeObserver` on the host + `visualViewport` `resize` | Recompute `canvas.width/height = round(css × scale)` **once per frame** (coalesced via a dirty flag), `ctx.setTransform(scale,0,0,scale,0,0)` (assigning `width` resets state), re-render P0/P2/P5. |
| `devicePixelRatio` change (`matchMedia('(resolution: Xdppx)')`) | Treated as a resize. |
| `document.visibilitychange` → hidden | Stop rAF. Leave the last frame (no clearing). |
| → visible | Reset `last` timestamp, resume rAF. |
| `IntersectionObserver` on host (host leaves viewport — only relevant if a future surface scrolls it out) | Pause rAF. |
| `prefers-reduced-motion` change | Re-evaluate: entering reduce → cancel rAF, draw one frame; leaving → resume. |
| `usePathname()` change | Write `data-surface`/`data-mode`, re-render P2, emit `route`. |
| Unmount | `cancelAnimationFrame`, disconnect both observers, remove all listeners, drop references to the buffer. |

**Scale and frame discipline**

- `scale = min(window.devicePixelRatio || 1, 2)`. Low-quality mode (`scale = 1`, 12 motes, 30 fps via every-other-frame skip) when any of: `navigator.hardwareConcurrency <= 4`, `matchMedia('(update: slow)').matches`, or `localStorage["hl:atmosphere:quality"] === "low"`.
- `dt = Math.min((now - last) / 1000, 0.05)` — a backgrounded tab cannot produce a teleport.
- Impulse list is a fixed 2-slot ring. No array growth, no object literals per frame, no string building.

### 6.4 Route-transition interaction

The canvas is outside the `<ViewTransition>` boundary, so during the ~320 ms `nav-forward` crossfade it is a **frozen snapshot** in the root group, not a live layer. Accepted (`Needs Verification [inferred-from-codebase]`, analysis §11.2). Mitigations authored here:

1. `go!`'s burst finishes within the same window, so the snapshot shows a settled bright frame rather than a frozen mid-burst.
2. The field is at its full-tint state when `route` fires, so the snapshot's tint matches the destination's tint (mode is known before navigation because the mode radio is selected on Home).
3. No canvas opacity animation is added around navigation — a self-animated fade would fight the snapshot's own crossfade.

---

## 7. GameplayShell transparency specification (Tier B, approved by D2)

### 7.1 The two offending declarations

| Declaration | Current | Problem |
|---|---|---|
| Shell surface | `bg-[var(--surface-background)]` → computed `rgb(21, 18, 43)`, opaque ([`GameplayShell.tsx:45`](../components/game/GameplayShell.tsx:45)) | Completely hides the canvas on the surface that matters most (analysis R4) |
| Header filter | `bg-[var(--surface-background)]/95 backdrop-blur` → computed `backdrop-filter: blur(8px)` ([`GameplayShell.tsx:48`](../components/game/GameplayShell.tsx:48)) | Re-blurs a live canvas every frame — a real compositor cost (analysis R3) |

### 7.2 Prescribed change

| Element | New value | Rationale |
|---|---|---|
| Shell root ([`:45`](../components/game/GameplayShell.tsx:45)) | `bg-grid bg-[color-mix(in_srgb,var(--surface-background)_84%,transparent)]` | 16 % show-through of an already-capped field. `bg-grid` **stays** (it is part of the incumbent identity; DD-1 means the canvas does not duplicate it). `position: relative`, `isolation: isolate`, `overflow-x-hidden`, `min-h-dvh` all unchanged. |
| Header ([`:48`](../components/game/GameplayShell.tsx:48)) | `bg-[var(--surface-background)]` (opaque) and **`backdrop-blur` removed** | The header is chrome: it must read as a solid bar and it must not re-blur the canvas. Opaque also removes all contrast risk for the title, subtitle and status numerals. |
| Header subtitle ([`:66`](../components/game/GameplayShell.tsx:66)) | add `truncate` | The audio control shrinks the centred title column by ~52 px at 390 ([analysis §7.1](procedural-canvas-audio-analysis-2026-11-22.md:618)); without `truncate` on **both** lines the subtitle can wrap and grow the header beyond `min-h-[5.5rem]`, which would be a real layout shift. |
| Status cluster ([`:72`](../components/game/GameplayShell.tsx:72)) | unchanged markup; the audio control becomes its first sibling | Header stays `flex items-center justify-end gap-2`; `overflow-hidden` already prevents overflow |
| Game-over scrim ([`ClassicGame.tsx:361`](../components/game/ClassicGame.tsx:361), [`TimeAttackGame.tsx:501`](../components/game/TimeAttackGame.tsx:501)) | **Unchanged** (`bg-[#15122b]/90 backdrop-blur-sm`) | It is a modal scrim shown only at game-over; the blur cost is bounded to that state. Changing it would alter the approved game-over appearance. |

### 7.3 Colour math (why contrast is preserved)

`--surface-background` is `#15122b` = `rgb(21, 18, 43)`. At 84 % over a field whose local luminance is at most `#211d3a`-equivalent (`rgb(33, 29, 58)` at the brightest mote over the brightest tint):

- composite ≈ `0.84 × (21,18,43) + 0.16 × (33,29,58)` = `(22.9, 19.8, 45.4)` — a **Δ of about +2 per channel** versus the current opaque surface.
- `--text-primary` `#ffffff` on `rgb(23, 20, 45)` → contrast ≈ **17.4 : 1** (current ≈ 17.6 : 1).
- `--foreground-muted` `#d4ceff` on the same → ≈ **11.9 : 1** (current ≈ 12.1 : 1).
- `--divider-line` `#8e8e8e` on the same → ≈ **5.4 : 1** for a 3 px dashed line (unchanged classification).
- `--focus-ring` `#22d3ee` on the same → ≈ **10.6 : 1**.

All well above WCAG AA (4.5 : 1 body, 3 : 1 large/non-text). Because the delta is ~2/255 per channel, **no text region on gameplay can regress measurably**. The visible effect is movement and tint in the empty gutters, which is exactly D2's intent. `[Inferred-from-codebase]` arithmetic; must be confirmed by rendered contrast sampling in QA.

### 7.4 Layout preservation evidence

- The shell root is `position: relative` and its background change is a colour only → no geometry change.
- The header's `min-h-[5.5rem]` grid ([`GameplayShell.tsx:49`](../components/game/GameplayShell.tsx:49)) still sets the height; `truncate` on both text lines guarantees it cannot be exceeded.
- Measured baselines to re-assert in QA: Classic desktop header **90 px**, Time Attack header **138 px** (88 grid + 48 footer), back control **44×44 at (24, 22)** desktop / **(16, 22)** mobile, status cluster **1300–1416** desktop / **264–369** mobile (analysis §2.1, §7.1).

---

## 8. Audio system

### 8.1 Graph

```
voice ──► sfxBus (Gain) ──┐
                          ├──► master (Gain) ──► DynamicsCompressor (limiter) ──► destination
music/pad + pulse ────────┘
       └─► musicBus (Gain) ─┘
```

- `master.gain` default **0.7**; `sfxBus` **0.9**; `musicBus` **0.28** with an auto-start target of **0.10** (see §8.7). All buses start at 0 and ramp up over 240 ms to prevent a click.
- Limiter: `DynamicsCompressorNode` — `threshold −12 dB`, `knee 6`, `ratio 12`, `attack 0.003`, `release 0.25`. This is the only node that touches the whole bus; no per-voice compression.
- Muting sets `master.gain` target to 0 rather than `suspend()`ing, so the graph stays warm and unmute is instant and click-free.
- No `ConvolverNode`, no `PannerNode`, no assets. All voices are `OscillatorNode` + `BiquadFilterNode` + `GainNode`; one generated `AudioBuffer` (0.4 s of white noise) is created once at unlock for the `launch` whoosh.

### 8.2 Voice recipes (the synthesis table)

All times are ms from `ctx.currentTime`. Envelopes use `gain.setValueAtTime` + `exponentialRampToValueAtTime` to 0.0001 (never to 0). All frequencies derive from fixed Hz values, not from `sampleRate` — no generated buffer is frequency-critical except the noise buffer, whose length is `ceil(0.4 × ctx.sampleRate)` samples (§8.10).

| Cue id | Used by | Oscillator(s) | Filter | Envelope | Duration | Peak gain |
|---|---|---|---|---|---|---|
| `select` | H3, H5, H6, general | square 520 Hz + triangle 1040 Hz (−9 dB) | lowpass 3 kHz Q 0.7 | 6 ms attack, 54 ms decay | 60 | 0.08 |
| `select-deep` | H6 (category rows) | square 610 Hz (≈ +3 semitones over `select`) | lowpass 3 kHz | same | 60 | 0.07 |
| `hover-tick` | H5b (fine pointers only) | sine 1.4 kHz | — | 2 ms / 38 ms | 40 | 0.03 |
| `mode` | H8 | triangle root 330 Hz + triangle fifth 495 Hz | lowpass 2.4 kHz | 10 / 170 | 180 | 0.07 each |
| `tab` | H13 | triangle 480 Hz | lowpass 4 kHz | 5 / 45 | 50 | 0.06 |
| `filter` | H14 | triangle 520 Hz | lowpass 4 kHz | 5 / 45 | 50 | 0.05 |
| `open` | H4, H12 | triangle 660 Hz | lowpass 3 kHz | 4 / 66 | 70 | 0.07 |
| `modal-in` | H12 | two notes 494 → 659 Hz (150 ms apart) | lowpass 2.4 kHz | 8 / 90 each | 240 | 0.06 |
| `modal-out` | H17 | 587 → 440 Hz descending | lowpass 2.4 kHz | 8 / 82 each | 180 | 0.06 |
| `warn` | H15/H16 step 1 | square 196 Hz + square 185 Hz (detuned pair) | lowpass 1.2 kHz | 10 / 110 | 140 | 0.07 |
| `confirm` | H15/H16 step 2 | square 392 Hz | lowpass 3 kHz | 4 / 46 | 50 | 0.06 |
| `launch` | H10 | noise buffer → bandpass swept 400 → 3000 Hz (linear, 0.35 s) | bandpass Q 1.2 | 10 / 300 | 400 (hard-capped at 320 audible) | 0.10 |
| `higher` | G4, G6 | triangle 300 → 480 Hz linear sweep | lowpass 2.4 kHz Q 1.0 | 6 / 134 | 140 | 0.09 |
| `lower` | G5, G6 | triangle 380 → 240 Hz linear sweep | lowpass 2.4 kHz Q 1.0 | 6 / 134 | 140 | 0.09 |
| `reveal-tick` | G3 | sine 880 Hz | — | 3 / 47 | 50 | 0.04 |
| `tier-1` | G7 t1 | triangle root 262 Hz | lowpass 2 kHz | 8 / 180 | 190 | 0.08 |
| `tier-2` | G7 t2 | triangle 262 + 524 Hz | lowpass 2 kHz | 8 / 190 | 200 | 0.07 each |
| `tier-3` | G7 t3 | + major third 330 Hz (triad) | lowpass 2.2 kHz | 8 / 210 | 220 | 0.06 each |
| `tier-4` | G7 t4 | triad + fifth 392 Hz + **60 Hz sine sub thump** (90 ms, 0.12 peak) | lowpass 2.6 kHz | 6 / 240 | 260 | 0.05 each, sub 0.12 |
| `wrong` | G11 | sine 90 Hz + sine 95.5 Hz (≈ +1 semitone, beating) | lowpass 400 Hz | 4 / 220 exponential | 224 | 0.14 |
| `gain` | G10 `+3s` | triangle 392 → 587 Hz, two steps | lowpass 3 kHz | 5 / 70 each | 160 | 0.07 |
| `loss` | G10 `−5s` | triangle 466 → 349 Hz, detuned pair | lowpass 2.4 kHz | 5 / 80 each | 180 | 0.07 |
| `tick-urgent` | G8 (≤ 5 s only) | square 900 Hz | lowpass 5 kHz | 2 / 38 | 40 | 0.035 |
| `game-over` | G12 | triangle 220 → 165 Hz, 500 ms total, two notes | lowpass 1.6 kHz | 10 / 230 ×2 | 500 | 0.10 |
| `restart` | G13 | triangle 160 → 400 Hz sweep | lowpass 2.4 kHz | 8 / 292 | 300 | 0.09 |
| `back` | G1, G14 | triangle 300 → 220 Hz | lowpass 2.4 kHz | 6 / 114 | 120 | 0.08 |
| `audio-on` | H18/G17 | triangle 523 → 784 Hz, 120 ms | lowpass 3 kHz | 4 / 116 | 120 | 0.06 |
| `audio-off` | H18/G17 | **silence** (muting produces no sound; only the visual `ack` confirms) | — | — | — | 0 |

**Voice cap and rate limit.** Maximum **8** concurrent voices; a request beyond the cap is dropped, not queued. Per-cue minimum interval: `tick-urgent` 250 ms, `hover-tick` 120 ms, everything else 40 ms. Key repeat cannot machine-gun the graph (analysis R11).

### 8.3 Complete sound map — every audited interaction

| Row | Cue(s) | Notes |
|---|---|---|
| H1 scroll | none | Scrolling is never sonified |
| H2 hero entrance | `pad-swell` (one 220 ms sine at 220 Hz, −30 dB) | Fires once per Home mount |
| H3 Start Comparing | `select` + `back`-class descend blip (sawtooth 220 → 160 Hz, 120 ms) | "descend" |
| H4 View High Scores | `open` then `modal-in` | Open is instant; modal-in follows on dialog open |
| H5 domain radios | `select` | Pitch nudged +12 Hz per domain index (0–3) so the four read as a scale |
| H5b domain hover | `hover-tick` (fine pointers, ticks on) | D8: off for touch |
| H6 category rows | `select-deep` | |
| H7 disabled row | none | Must not imply interactivity |
| H8 mode radios | `mode` | Classic = root 330 Hz; Time Attack = root 392 Hz (brighter), same shape |
| H9 disabled pvp | none | |
| H10 `go!` | `launch` | Ends ≤ 320 ms audible, inside the route window |
| H11 footer | none | |
| H12 dialog open | `modal-in` + BGM duck to 30 % | |
| H13 tabs | `tab` | |
| H14 filter select | `filter` | |
| H15 clear-leaderboard | `warn` → `confirm` | Two presses = two cues (analysis C7) |
| H16 clear-all | `warn` → `confirm` | |
| H17 dialog close | `modal-out` + BGM restore over 400 ms | |
| H18 audio control | `audio-on` / `audio-off` | `audio-off` is silent by definition |
| G1 back link | `back` | |
| G2 board | none | Passive recession only |
| G3 value reveal | `reveal-tick` at reveal start, −26 dB | Deliberately the quietest gameplay cue |
| G4 Higher | `higher` | |
| G5 Lower | `lower` | |
| G6 keyboard guess | **`higher` / `lower`, identical** | Parity is structural (emitted inside `handleGuess`) |
| G7 tally | `tier-1` … `tier-4` | Tier comes from the existing `resolveTier` |
| G8 timer | `tick-urgent` at ≤ 5 s, 1/s; **silent 6–10 s** | D11 |
| G9 progressbar | none | Visual only |
| G10 delta label | `gain` / `loss` | |
| G11 wrong answer | `wrong` | Fixed, never escalates |
| G12 game over | `game-over` + BGM fade to 0 over 600 ms | |
| G13 Play again | `restart` + BGM back to its target | |
| G14 Back to setup | `back` | |
| G15 Tab trap | none | Focus is never sonified |
| G16 derived-state link | **none** | Deliberately silent (low-energy state) |
| G17 audio control | `audio-on` / `audio-off` | |

### 8.4 Musical escalation t1–t4

- Root is fixed per surface: **D** (293.66 Hz) in gameplay, **A** (220 Hz) on Home.
- t1 root; t2 root + octave; t3 + major third; t4 + fifth and a 60 Hz sub thump. The stack is additive and *never* transposed, so the ladder reads as growing colour, not as a rising alarm.
- Maximum aggregate peak at t4 ≈ 0.32 before the master gain, i.e. comfortably under the limiter threshold; the limiter exists for stacked simultaneous cues (e.g. `tier-4` + `gain` + `reveal-tick`), not for routine play.
- No cue exceeds **0.14** peak individually, so no sound can startle a user in a quiet room at the auto-start music level of 0.10.

### 8.5 `go!` sweep and urgency ticks

- `launch` = the only noise-based voice. The noise buffer is generated once at unlock; `400 → 3000 Hz` bandpass sweep over 350 ms with a 10 ms attack and a 40 ms release. Audible tail is clamped at 320 ms so it cannot bleed into the destination route.
- `tick-urgent` starts **only** when `secondsLeft <= 5` and only while `phase !== "game-over"`, driven by the existing 1000 ms interval — the audio engine adds no timer of its own.
- The audio tick is silent at 6–10 s on purpose: the visual urgency (`aria-live="assertive"`, `.timer-urgent`) already escalates at 10 s, and 10 ticks of fatigue buys nothing.

### 8.6 Game-over cadence

`game-over` = a two-note descending cadence (220 → 165 Hz), 500 ms, triangle, low register, 0.10 peak — the interval is a **minor third** (deliberately not a "you lost" tritone). BGM fades to 0 over 600 ms via `musicBus.gain.setTargetAtTime(0, now, 0.2)`. Nothing plays at 90 % scrim time beyond that; there is no victory fanfare in the product.

### 8.7 Generative BGM (D7) and amended D4 auto-start

**Home pad.** Two detuned triangle oscillators (`A2` 110 Hz and `A2 + 6 cents`) through a lowpass at 900 Hz whose cutoff is modulated by a 0.08 Hz sine LFO (±120 Hz), gain 0.06, plus a very slow 12 s amplitude breathing (`±15 %`). No percussion. It is furniture-level ambience, not music you listen to.

**Gameplay pulse.** A lookahead-scheduled pattern over a fixed pentatonic set (D, E, F♯, A, B). Classic: 84 BPM, root D3, one pulse per beat, triangle, 90 ms, gain 0.05, with every 4th beat dropped. Time Attack: 108 BPM, root D4, plus a square eighth-note tick at 0.025. The pattern is generated per bar from a tiny deterministic table (no `Math.random` at schedule time, so the session is reproducible).

**Lookahead scheduler (MDN "A Tale of Two Clocks").** A `setInterval` of **25 ms** calls `schedule()` which books every note whose time is within a **100 ms** horizon using `ctx.currentTime` arithmetic. It is *not* an animation frame callback, it does not read the DOM, and it stops on `visibilitychange: hidden`. Paused/resumed without re-deriving state.

**Amended D4 — auto-start at low volume.** On the **first qualifying gesture** of the session (`pointerdown` or `keydown`, once):

1. Create the `AudioContext` inside the gesture handler. If `state === "suspended"`, `await ctx.resume()`.
2. Ramp buses up to their targets over 240 ms.
3. If `settings.music === true` (the default, or a persisted `true`), ramp `musicBus` to the **auto-start target 0.10** and begin the Home pad or the gameplay pulse immediately, with a 900 ms fade-in so nothing "switches on".
4. If `settings.music === false` (persisted user choice), do **not** start music. No override, ever.
5. If master is muted (`settings.sfx === false && settings.music === false`, or `muted === true`), do **not** ramp anything; keep the graph warm at gain 0.
6. SFX are "on" the whole time but produce nothing before step 1 because no context exists.

The distinction between the **auto-start target (0.10)** and the **user-enabled target (0.28)** matters: choosing "Music" in the popover ramps to 0.28; a session's automatic start ramps only to 0.10. On the next gesture-driven user toggle the value goes to 0.28, and that explicit choice is persisted.

### 8.8 Ducking

| Trigger | `musicBus` target | Ramp |
|---|---|---|
| Reveal beat (G7/G3) | 30 % of current target | `setTargetAtTime`, τ 0.12, restore τ 0.30 after `phase → playing` |
| High Scores modal open (H12) | 30 % (D12) | τ 0.15; restore on close, τ 0.20 |
| Game over (G12) | 0 | τ 0.20 over 600 ms |
| Route change (`go!`) | 0 | τ 0.10; new surface ramps from 0 |
| Tab hidden | 0 then `suspend()` | τ 0.05 (120 ms) then suspend |

Ducking is implemented with `AudioParam` targets only — never `setTimeout`.

### 8.9 Visibility, iOS, and failure behaviour

- `visibilitychange → hidden`: ramp master to 0 over 120 ms, then `ctx.suspend()`. `→ visible`: `ctx.resume()` only if a context exists and any channel is enabled; ramp back over 240 ms. WebKit suspends contexts when an iOS page backgrounds (analysis §6.5), so the resume path must tolerate a rejected promise (catch, retry on next gesture).
- **iOS silent switch (D9):** never call `navigator.audioSession.type`. With the Ring/Silent switch on, the mixer is inaudible — respected deliberately. The popover carries one line of copy only if the design later decides to explain it; no code changes behaviour.
- **Autoplay refusal is expected.** `ctx.resume()` may reject; catch it, keep the UI honest (`data-audio-state="armed"`), retry on the next gesture. Never retry in a loop.
- **No `AudioContext` at all** (unsupported engine): the control renders disabled with `aria-disabled` and no listeners; the app is otherwise unchanged.
- **`close()` is never called** on route change — the engine lives in the layout.

### 8.10 Sample rate

Never assume `48000` or `44100`. The noise buffer length is `Math.ceil(0.4 * ctx.sampleRate)`; every oscillator frequency is an explicit Hz value, so no other rate dependence exists. If any future buffer becomes pitch-critical, it must derive from `ctx.sampleRate`.

### 8.11 Persisted schema

`localStorage["hl:audio:v1"]`, JSON:

```json
{ "v": 1, "sfx": true, "music": true, "ticks": "auto", "muted": false }
```

- Missing key or invalid JSON → defaults above (D3 SFX on, amended D4 music on, D8 ticks auto).
- `ticks: "auto"` = on for `(hover: hover) and (pointer: fine)`, off otherwise. `true`/`false` once the user touches the row.
- `muted: true` = master mute from the one-click control. **A persisted `muted: true` or `music: false` always wins over auto-start** (amended D4).
- Writes happen only in the settings store on explicit user change — never during a render, never per gesture.
- `localStorage` access is wrapped in try/catch (private-mode browsers throw); a failed read yields defaults and a failed write is ignored.
- Unrelated key `hl:atmosphere:quality` (optional manual low-quality override) lives outside this object and is read-only from the canvas engine.

---

## 9. Audio-control UX

### 9.1 Anatomy

One 44×44 `<button type="button">` with:
- Lucide glyph `Volume2` (unmuted) / `VolumeX` (muted), `size={18}`, `aria-hidden` on the icon.
- `min-h-11 min-w-11` (44 px), `inline-flex items-center justify-center`, `rounded-full border-2 border-white`, `bg-[var(--surface-background)]`, `shadow-[4px_4px_0_var(--atmo-accent)]` — deliberately the same construction as the gameplay back control ([`GameplayShell.tsx:56`](../components/game/GameplayShell.tsx:56)) so it reads as family.
- `text-[var(--foreground-muted)]` → `text-white` on hover; `transition-colors` on `--motion-dur-quick`.
- Inherits the global `:focus-visible` ring ([`globals.css:119`](../app/globals.css:119)); no override.

States and attributes:

| Condition | `aria-pressed` | `aria-label` | Glyph |
|---|---|---|---|
| Any channel on | `false` (not muted) | `"Sound on — mute all audio"` | `Volume2` |
| All channels off / muted | `true` | `"Sound off — unmute all audio"` | `VolumeX` |
| Context armed, not yet unlocked | `false` | `"Sound on — mute all audio"` | `Volume2` + `::after` armed dot (§5.2) |

The label describes the **state**, the pressed flag describes the **muted state**, and the glyph matches the state. This is the deliberate inverse of the krillion anti-reference (label = action, pressed = state, glyph = third meaning).

`aria-expanded` + `aria-controls` exist only while the popover is mounted; the popover is `role="group"` with `aria-label="Audio settings"`, `position: absolute`, `top: calc(100% + 8px)`, `right: 0`, `w-[15rem]`, `border-2 border-white`, `bg-[var(--surface-background)]`, `shadow-[6px_6px_0_var(--accent-classic)]`, `p-2`, `z-50` (inside the header's stacking context).

Rows (each a 44 px `role="switch"` button with `aria-checked`):
1. **SFX** — `aria-checked={sfx}`.
2. **Music** — `aria-checked={music}`.
3. **Interface ticks** — `aria-checked={ticksEffective}`; label reads `Interface ticks · touch` when `ticks === "auto"` and the pointer is coarse.

### 9.2 Placement (D5)

**Home.** First child of the existing header row ([`HomeSetup.tsx:181`](../components/home/HomeSetup.tsx:181)), which is `absolute right-[var(--space-page)] top-5 z-10 flex items-center gap-2`:

```
[ audio 44×44 ] 8px [ High Scores 132×44 ]
                 ↑ row is right-anchored, so adding a child extends it leftwards
```

Measured consequence (analysis §7.1, corrected): the row's left edge moves from **237 → ≈185** at 390 and from **1247 → ≈1195** at 1440; the control occupies **185–229** / **1195–1239**. The `h1` top is 321 at 390, so there is no vertical or horizontal collision, and because the header is `position: absolute` no document reflow occurs.

**Gameplay.** First child of the col-3 status cluster ([`GameplayShell.tsx:72`](../components/game/GameplayShell.tsx:72)), which is already `flex items-center justify-end gap-2`:

```
grid: [ back 44 ] [ title (minmax(0,1fr)) ] [ audio 44 | status 105 ]
```

- Header height is fixed by `min-h-[5.5rem]`, and `truncate` is added to the title *and* subtitle (§7.2), so the header cannot grow.
- Cost: the centred title's track shrinks by **≈52 px** at 390 (measured cols `44 / 187.8 / 105.2` → `44 / ≈135.8 / ≈157`). Long titles truncate earlier. This is an **accepted, recorded tradeoff**, not a defect; the alternative placements were measured and rejected (fixed bottom chip overlaps card art at mobile width; the TA header footer is fully occupied at 24–1411).

**Must not overlap:** High Scores button, back link, status cluster, `go!`, timer numeral, progress bar, Higher/Lower. Verified by the geometry assertions in the plan's verification matrix — not by eye.

### 9.3 Interaction

| Input | Result |
|---|---|
| Click / `Enter` / `Space` on the button | Toggle **master** (all channels). Writes `muted`. Emits `pointer/audio` and `audio` |
| `ArrowDown` on the button | Open the popover, focus row 1 |
| `ArrowUp`/`ArrowDown` inside the popover | Move between rows |
| `Enter` / `Space` on a row | Toggle that channel; unmuting a channel also clears `muted` |
| `Escape` | Close the popover, return focus to the button |
| Click outside / focus leaves the popover | Close, no focus move |
| Hover | Colour only (no sound on hover for the control itself) |

The popover is **not** duplicated inside modals (top layer, the control is unreachable while a dialog is open — analysis §7.2, R15). No focus trap is added; the popover is a `group`, not a `dialog`, so no `aria-modal` semantics are claimed.

### 9.4 Initial state and zero layout shift

- Initial paint (server and first client render) shows the **default-armed** state: `Volume2`, `aria-pressed="false"`, label "Sound on — mute all audio". No flash, because `getServerSnapshot` returns defaults (§6.2).
- The control is `position: relative` and sized by `min-h-11 min-w-11` inside existing flex rows that already tolerate a 44 px child (High Scores is 132×44; the back control is 44×44).
- The popover is `position: absolute` and therefore contributes **zero** height to either header.
- **Measured invariants for QA (must hold, not merely be intended):** at 1440×900 and 390×844 — Home document height unchanged, gameplay header heights 90/138 unchanged, back-control rect unchanged, High Scores rect unchanged, `scrollWidth` unchanged (1435 at 1440, 385 at 390), and audio-control rect fully inside the header band.

---

## 10. Accessibility and reduced motion

| Concern | Provision |
|---|---|
| Canvas semantics | `aria-hidden="true"`, no `role`, no tab stop, `pointer-events: none`. Nothing is conveyed only by the canvas. |
| Audio-only information | None. Every sound accompanies an existing visual state (tally, tint, delta label, timer colour, `aria-live` regions). Muting loses no information. |
| Text contrast over the live field | Field luminance delta behind any text region ≤ 8 %; text-safe bands in P5 drive field contribution to zero over the gameplay status overlay and the header band; gameplay show-through capped at 16 % of an already-dim field (§7.3). |
| Focus | The canvas can never cover a ring (`z-index: 0`, below every content layer). No new `outline` rules; the audio control inherits `:focus-visible`. Focus movement is never sonified (G15) and never echoed as a canvas impulse. |
| Reduced motion (D10, D14) | One static frame; no rAF, no parallax, no impulses; state changes still land through existing CSS opacity/tint. Audio unaffected. No user-facing motion toggle is added. |
| Flashing | No opacity oscillation above **3 Hz**. The only near-flash is the t4 single-frame 4 % field invert, at most once per reveal (≥ 1500 ms in Classic, ≥ 800 ms in TA) → **< 1 Hz**, well under the WCAG 2.3.1 three-flashes threshold. |
| Sound-bars / glyph motion | The audio glyph never animates. There is no equalizer animation, so there is nothing to suppress under reduced motion. |
| Keyboard reachability | The audio control is reachable from `go!` and from the game-over panel by ordinary Tab order (header precedes content in DOM order on Home; on gameplay the shell header precedes the board). |
| Announcements | The audio control announces through its label change; no new live region is created. |
| Autoplay and user control | Audio starts only after a gesture; master mute is one click away and persists; the popover exposes each channel. |

---

## 11. Performance budget

| Budget | Value | Enforcement |
|---|---|---|
| rAF loops | **1** (the atmosphere) | The audio scheduler is a 25 ms `setInterval`, not rAF; the game has no rAF loop of its own |
| Canvas count | 1 | DD-2 |
| Motes | 28 desktop / 12 mobile / 12 low quality | Fixed pool, allocated once |
| Concurrent impulses | 2 (fixed ring) | Oldest evicted |
| Drawing buffer | `min(DPR, 2)` capped; `1` in low quality | §6.3 |
| Frame rate | Unbounded by default; 30 fps cap in low quality | Odd-frame skip |
| Per-frame work | 1 `drawImage` (P0/P2/P5 composite), ≤ 40 `fillRect`, ≤ 2 stroke paths | No `path` allocation per frame, no `shadowBlur`, no `filter`, no `createLinearGradient` per frame |
| `getComputedStyle` / DOM reads per frame | **0** | DD-5; origins captured per event |
| `backdrop-filter` over the canvas | **0** — the gameplay header's blur is removed (§7.2); the game-over scrim's `backdrop-blur-sm` is bounded to the game-over state | R3 |
| React renders caused by the atmosphere | **0** | No `setState` in canvas or engine; `data-*` writes are imperative |
| New dependencies | **0** | Native Canvas 2D + Web Audio only |
| Media assets | **0** | No MP3/WAV; one generated noise buffer |
| New network requests | **0** | No fonts, no images, no workers |
| Slow-frame guard | Long-task sampling in QA; if p95 frame > 24 ms at 390, low-quality mode becomes the mobile default (recorded as a plan stop condition) | QA trace |

---

## 12. Anti-references

Adopted from the references as *principles* only; these are the things this design deliberately refuses.

| Anti-reference | Where it was observed | What this design does instead |
|---|---|---|
| 34×26 px glyph mute button | krillion `button.ds-mute` (analysis §3.1) | 44×44, clearing the project's 44 px touch baseline |
| `aria-pressed` inverted against the label | krillion (`aria-label="turn sound off"` + `aria-pressed="false"`) | Label describes state, pressed describes muted, glyph matches state (§9.1) |
| 5 s `steps(1)` title flicker | krillion `ds-title-flicker` | No flicker anywhere; no opacity oscillation above 3 Hz |
| Two full-bleed canvases at 1×, one `pointer-events: auto` | krillion `.ds-sea` / `.ds-fore` | One canvas, `pointer-events: none`, two draw passes |
| 0.25× / 0.33× buffers | noillirk `climb-scene`, fairways `#gl` | `min(DPR, 2)` with a *documented* low-quality mode; sharpness matters because the sub-surface is a fine grid of light motes |
| WebGL / Three.js scene graph | fairways `#gl` | Canvas 2D only; a scene graph is a rewrite, not a layer |
| 12 309 px marketing page wrapping the game | noillirk | The incumbent routes are untouched |
| Zero audio affordance | noillirk (no `AudioContext` at all) | Explicit, persistent, labelled control |
| 36 third-party iframes + ad-tech storage on a game page | krillion | Zero new network, zero new storage besides `hl:audio:v1` |
| Full-volume music autoplay | the classic autoplay complaint | Amended D4 auto-starts **at 0.10**, behind a 900 ms fade, and never overrides a persisted "off" |
| A `data-motion` user toggle layered on top of the OS preference | noillirk `data-motion="full"` | D14: OS preference only |
| CRT scanlines, mascots, borrowed palettes/typefaces | all three | The incumbent dark-navy + white outline + hard offset shadow + Space Mono identity is untouched |

---

## 13. Open questions and `Needs Verification`

1. `Needs Verification [product-decision]` — **C-2**: the owner's amended D4 contradicts the analysis's recommended default (BGM off). This document implements amended D4. If the owner intended the analysis default instead, §8.7 and §9.4 change and nothing else does.
2. `Needs Verification [inferred-from-codebase]` — **View-transition freeze.** A layout-mounted fixed canvas is expected to be a static snapshot for the ~320 ms `nav-forward` window (analysis §11.2). Not measured. Mitigations in §6.4 assume the freeze; if the canvas turns out to stay live, the `go!` handover is still correct and nothing else changes.
3. `Needs Verification [environment-specific]` — **DPR ≠ 1.** All measured evidence is DPR 1. The `min(DPR, 2)` clamp, the blur-cost removal and the mobile frame budget are unverified at 2×/3×.
4. `Needs Verification [capability-unavailable]` — **Perceptual audio.** Nothing has been listened to. Voice recipes in §8.2 are structurally specified (waveform/filter/envelope/frequency/duration/peak) but loudness balance, timbre and BGM fatigue require a human judgment in QA.
5. `Needs Verification [inferred-from-codebase]` — **Delegation double-fire.** The activate-key suppression window (§4.2a) is designed to prevent a keyboard cue plus a native click plus a `pointerdown` cue for one interaction. This needs a runtime assertion per control class (`button`, `a[href]`, radio label, `select`, `role="tab"`, `role="switch"`).
6. `Needs Verification [inferred-from-codebase]` — **Card offset-plate selector.** `article[data-result] > div.relative > [aria-hidden="true"]:first-child` is derived from [`GameCard.tsx:86`](../components/game/GameCard.tsx:86) and `GameCard.tsx` is frozen. If it proves brittle at implementation, the card-shadow harmonization row is dropped and §5.2's remaining rules still hold.
7. `Needs Verification [inferred-from-codebase]` — **Contrast arithmetic.** §7.3 is computed, not sampled. QA must sample rendered contrast at the brightest field moment behind the gameplay status overlay.
8. `Needs Verification [capability-unavailable]` — **Non-Chromium engines.** `<ViewTransition>` degrades gracefully by documentation ([`view-transitions.md:53`](../node_modules/next/dist/docs/01-app/02-guides/view-transitions.md:53)); the canvas and audio paths are unverified in Firefox/Safari.
9. `Needs Verification [product-decision]` — **Gameplay show-through level (16 %).** D2 approves transparency but not a specific alpha. If 16 % reads as too faint in the gutters at 1440 or too present at 390, the single value in §7.2 is the only thing to change.
10. `Needs Verification [environment-specific]` — **iOS silent switch.** D9 is respected by construction (no `audioSession` call), but no iOS device was exercised, so "the app is silent with the switch on, and that is correct" is unobserved here.
11. `Needs Verification [inferred-from-codebase]` — **Ambient coexistence (R14).** Home already runs two CSS ambient loops ([`globals.css:668`](../app/globals.css:668)). At Home the canvas is deliberately the slowest thing on screen; whether the three together read as "alive" or as "busy" is a perceptual call (`[Not tested]`).
12. `Needs Verification [product-decision]` — **Audio-control overlap on gameplay at 390.** §9.2 gives measured numbers for the title-column cost, but "the truncated title is acceptable" is a product call the owner has effectively made by approving D5. Recorded here so the tradeoff is not rediscovered as a defect.
