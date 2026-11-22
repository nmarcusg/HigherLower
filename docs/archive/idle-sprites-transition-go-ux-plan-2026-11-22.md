# Idle Sprites · Reactive Field · Loading & Entrance · Scroll-Free Go — Plan

**Date:** 2026-11-22
**Stage:** Plan only. **No code is written by this stage.**
**Branch:** `lj-branch`
**Source of truth order:** owner decisions D1–D9 → [`idle-sprites-transition-go-ux-design-2026-11-22.md`](./idle-sprites-transition-go-ux-design-2026-11-22.md) → [`idle-sprites-transition-go-ux-analysis-2026-11-22.md`](./idle-sprites-transition-go-ux-analysis-2026-11-22.md) → this plan.
**Repository writes made by this stage:** this document and the design document above. Nothing else.

---

## 1. Exact modification allowlist

Three new files, seven modified files. Every entry traces to a design section. **No other file may be touched.** Files marked ⛔ were approved for expansion by D5 but are **verified unnecessary** (§1.4) — touching them is a scope violation.

### 1.1 New files (3)

| # | File | Change summary | Design § |
|---|---|---|---|
| N1 | `lib/atmosphere/sprites.ts` | Pure, DOM-free-except-canvas-creation sprite baker. Exports `bakeSprites(scale, palette): SpriteSet` where `SpriteSet = { sparkNear: {white,cyan,magenta}, sparkFar: {…}, chevronUp, chevronDown, chevronUpHot, chevronDownHot }`, plus the fixed geometry constants (`SPARK_NEAR_CSS 14`, `SPARK_FAR_CSS 8`, `CHEVRON_W_CSS 20`, `CHEVRON_H_CSS 26`, `CHEVRON_STEP_CSS 8`, alpha ladders). Every canvas is `document.createElement("canvas")` sized `round(css × scale)`, drawn at device resolution, and never appended. No React, no state, no timers, no DOM reads. | §2.2, §2.3 |
| N2 | `components/home/LaunchDock.tsx` | `"use client"` presentational dock: container + Category label + Mode label + `GO!` button carrying `data-atmo-go`. Props `{ visible, keyboardOpen, categoryLabel, modeLabel, canPlay, onLaunch }`. No observer, no timer, no router. Renders `data-open` / `data-keyboard`; `visibility` toggling keeps it out of the tab order while closed. | §6.2–§6.8 |
| N3 | `components/game/GameplayEntrance.tsx` | Two exports in one file: `GameplayEntrance` (a fragment-level wrapper that does **not** add a DOM node — it clones/annotates the existing body div with the `gameplay-entrance` class) and `GameplayEntranceStatus` (adds `gameplay-entrance-status` to the existing status row). Client component for the class toggle only; no state, no motion library, no reduced-motion branch. | §5.3, §5.5, §7.3 |

> Implementation note for N3: the wrapper must **not** introduce a new element around the board — the existing `<div className="relative flex min-h-0 flex-1 flex-col">` gains the class. If a fragment-with-class proves impossible without a node, the fallback is to append the class string in each game component (no component needed for the board) and keep only `GameplayEntranceStatus` in the file. Either way the DOM shape and the frozen CSS layout stay identical.

### 1.2 Modified files (7)

| # | File | Change summary | Design § |
|---|---|---|---|
| M1 | `lib/atmosphere/canvasEngine.ts` | (a) import `bakeSprites`; bake on `resize()` and inside `rebakeAll()`; (b) `drawMotes` switches from `fillRect` to `drawImage` of the white/cyan/magenta spark sprite by `colorIndex` and `z`; (c) new seeded chevron pool (desktop max 10 = 6 base + 4 reserve; mobile 6) drawn after motes, before impulses; (d) surge state `{ dir, start, extraPairs }` fed from `guess.direction` + `reveal.correct/tier`; (e) wrong beat `{ start }` = 180 ms recession + 80 ms 3 % lift; (f) `bakeSafeBands` gains the card/OR-badge rects (read from the live board selector) and the Home `[data-atmo-safe="hero"]` band; (g) reduced-motion branch of `handleEvent` records `assertiveDirection` on `reveal` and repaints once. **No** new rAF, timer, canvas, or DOM read in `drawFrame`. | §2, §3, §4.2 |
| M2 | `lib/atmosphere/delegation.ts` | One additive branch in `resolveTarget`, placed with the other attribute checks: `if (el.hasAttribute("data-atmo-go")) return { target: "go", cue: "press" };`. Nothing else changes — no listener, no matcher, no dedupe change. | §6.4, C-7 |
| M3 | `components/home/HomeSetup.tsx` | (a) `observe(setupRef)` added to the existing single observer and a `dockVisible` boolean set in the same callback (`setupVisible && !goVisible`); (b) render `<LaunchDock …/>` as the last child of `<main>`, wired to the existing `startGame`, `selectedCategory?.label`, the mode label, and `canPlay`; (c) `data-atmo-safe="hero"` on the hero `motion.div` ([`HomeSetup.tsx`](../components/home/HomeSetup.tsx:215)). **No** second observer, no listeners, no `useReducedMotion` branch added. | §2.6, §6.3, §6.4 |
| M4 | `components/game/ClassicGame.tsx` | Add `gameplay-entrance` to the body div class ([`ClassicGame.tsx`](../components/game/ClassicGame.tsx:332)); wrap the `status` node in `GameplayEntranceStatus`; append `gameplay-entrance-controls` to the `DecisionControls` className ([`ClassicGame.tsx`](../components/game/ClassicGame.tsx:376)). Guess/reveal/deck/timer/scoring untouched. | §5.3, §6.4 |
| M5 | `components/game/TimeAttackGame.tsx` | Same three edits, preserving the existing `shaking ? "shake" : ""` class ([`TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:483), [`525`](../components/game/TimeAttackGame.tsx:525)). Timer, deck, delta labels untouched. | §5.3, §6.4 |
| M6 | `components/game/DecisionControls.tsx` | D9 only: Lower button label `text-white` → `text-[#15122b]` ([`DecisionControls.tsx`](../components/game/DecisionControls.tsx:48)). No geometry, no shadow, no label copy, no `aria-label` change. | §4.4 |
| M7 | `app/globals.css` | Append-only, in the designated sections, plus **one retargeted rule**: (a) retarget `::view-transition-new(.nav-forward)` to `route-fade-in` 140 ms (the only edit inside the pre-existing appended block); (b) new `.gameplay-surface` three-layer scrim inside the existing gameplay-surface section; (c) new `@keyframes` + `animation` classes for the five entrance beats and their reduced-motion override; (d) new `.launch-dock` block (placement, open/closed states, keyboard state, modal state, safe-area, reduced-motion); (e) reduced-motion additions in the existing reduce block. Everything above L735 stays **byte-identical**. | §4.2, §5.1, §5.3, §5.5, §6.5–§6.8 |

### 1.3 Frozen — explicitly out of scope

`lib/api/**` (providers, snapshots, dispatcher, `data/`), `lib/catalog/**`, `lib/highScores/**`, `lib/game/deck.ts`, `lib/audio/audioEngine.ts`, `lib/audio/settings.ts`, `lib/audio/soundMap.ts`, `lib/atmosphere/eventBus.ts`, `components/audio/**`, `components/game/GameCard.tsx`, `components/game/ComparisonBoard.tsx`, `components/game/GameplayStatus.tsx`, `components/game/GameplayDivider.tsx`, `components/game/DerivedGameState.tsx`, `components/home/DomainSelector.tsx`, `components/home/CategorySelector.tsx`, `components/CategoryCard.tsx`, `components/ModeButton.tsx`, `components/HighScoresModal.tsx`, `app/layout.tsx`, `app/page.tsx`, `app/game/layout.tsx`, `app/game/classic/page.tsx`, `app/game/time-attack/page.tsx`, `app/api/**`, `next.config.ts`, `package.json`, `package-lock.json`, `components.json`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `design-reference/**`, `scripts/**`.

Also frozen **as values**: every gameplay rule, deck/shuffle logic, scoring, tier resolver, reveal windows (1500 / 800 / 400 ms), Time Attack timer cadence and `INITIAL_TIME`, high-score namespaces and keys, storage schema, provider shapes, `GameItem`, audio settings keys, sound-map entries and gains, motion tokens (`--motion-*`), semantic colour tokens (`--accent-*`, `--status-*`, `--text-*`, `--border-*`, `--focus-ring`).

`app/game/[mode]/loading.tsx` **must not be created** (D3).

### 1.4 Approved expansions verified unnecessary (do not touch)

| File | Evidence it is not needed |
|---|---|
| `components/atmosphere/AtmosphereBackdrop.tsx` | `guess` / `reveal` / `phase` are already forwarded to `engine.handleEvent` ([`AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx:156)); the pathname effect already calls `engine.setSurface(...)` which rebakes (and therefore re-reads card rects) after the route commits ([`AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx:195)) |
| `lib/atmosphere/types.ts` | `guess.direction`, `reveal.correct`, `reveal.tier`, `phase.phase` cover every reactive need (design §2.7) |
| `app/game/[mode]/page.tsx` | already `enter={{ "nav-forward": "nav-forward", default: "none" }}` + `default="none"` ([`app/game/[mode]/page.tsx`](../app/game/[mode]/page.tsx:49)); the fade is a CSS retarget |
| `components/game/GameplayShell.tsx` | the scrim is `.gameplay-surface` on the shell's own root class ([`GameplayShell.tsx`](../components/game/GameplayShell.tsx:46)) and is CSS-only; the tally is animated through the `status` React node supplied by the game components |
| `components/game/ComparisonBoard.tsx` | entrance targets its existing children by selector; nothing is added to it |

If implementation discovers that any of these five is genuinely required, **stop and flag it as a new expansion request** rather than editing.

---

## 2. Per-file change list and matrix-row coverage

### 2.1 Detailed change list

**N1 `lib/atmosphere/sprites.ts`**
1. Constants: spark near/far CSS sizes, chevron box, stroke width, step, alpha ladders (`0.95/0.55/0.28`), hot core width, glow alpha cap `0.18`.
2. `bakeSpark(colour, cssSize, scale)` — snug canvas, `setTransform(scale)`, glow disc (`createRadialGradient` at bake only), body circle, two `1/scale`-wide arms.
3. `bakeChevron(colour, direction, hot, scale)` — three strokes at the fixed step; hot adds the white core underneath.
4. `bakeSprites(scale, palette)` — returns the 10 canvases; no caching dependency on mode (all three colours are always baked).
5. No `window`, no `document.body`, no measurement APIs beyond `document.createElement`.

**M1 `lib/atmosphere/canvasEngine.ts`**
1. `import { bakeSprites, type SpriteSet } from "./sprites";` and a module-level `let sprites: SpriteSet | null`.
2. `rebakeAll()` → `sprites = bakeSprites(scale, palette)` **before** `bakeStatic()`.
3. `planChevrons()` seeding alongside `seedMotes()`, using `makeRandom(20261122)` with a distinct salt constant so spark positions do not shift.
4. `activeChevronCount()` mirroring `activeMoteCount()` (base + reserve rules, `lowEnergy` ratio).
5. `drawSprites(time)` replacing the body of `drawMotes()`; `drawChevrons(time)` after it. Both `drawImage` with `Math.round` coordinates and `sprite.width / scale` destination size.
6. Surge/beat state + `env(u)` helper (design §3.1); consumption inside `drawChevrons` only — no state written during draw.
7. `handleEvent`: `case "guess"` stores `lastGuessDirection` (in addition to the existing updraft/downdraft impulse); `case "reveal"` sets `surge = { dir: lastGuessDirection, start: elapsed*1000, extraPairs }` when correct, `beat = { start }` when incorrect, and **also** performs the existing `land`/`fracture`/`tier` pushes unchanged.
8. `bakeSafeBands()` gains: (i) gameplay card/OR rects, (ii) the Home hero band, both from `querySelectorAll` at bake; guarded by `try/catch`-free `if (!el) continue` semantics.
9. Reduced-motion path: on `reveal`, set `assertiveDirection` then `drawFrame(elapsed*1000)` once.
10. `destroy()` sets `sprites = null` (no listeners added, nothing to remove).

**M2 `lib/atmosphere/delegation.ts`** — one `if (el.hasAttribute("data-atmo-go")) return { target: "go", cue: "press" };` line, above the `home-go` check so the dock never depends on a presentation class.

**M3 `components/home/HomeSetup.tsx`**
1. `useState` `dockVisible` + `keyboardOpen`.
2. Observer callback: `const setupVisible = visible.get(setupRef.current) === true;` then `setDockVisible(setupVisible && !goVisible)`; add `if (setupRef.current) observer.observe(setupRef.current);`.
3. One `useEffect` for `visualViewport` (`resize` only, no rAF): `keyboardOpen = vv.height < window.innerHeight * 0.75`; cleanup removes it; no-op when `visualViewport` is undefined.
4. `<LaunchDock … />` rendered as the last child of `<main>` (after `<footer>`), fed by existing state and `startGame`.
5. `data-atmo-safe="hero"` on the hero `motion.div`.

**M4 / M5 `ClassicGame.tsx` / `TimeAttackGame.tsx`** — `gameplay-entrance` class on the body div; `status` wrapped in `GameplayEntranceStatus`; `gameplay-entrance-controls` appended to the `DecisionControls` `className` string. Nothing else.

**M6 `DecisionControls.tsx`** — `text-white` → `text-[#15122b]` on the Lower button only.

**M7 `app/globals.css`**
1. **Retarget (only edit inside pre-existing appended content):** `::view-transition-new(.nav-forward)` → `route-fade-in var(--motion-dur-quick) var(--motion-ease-out) both`. `route-rise-in` stays defined but unused.
2. **Scrim:** replace the single `background-color: color-mix(…84 %)` in `.gameplay-surface` with the opaque `background-color` + three-layer `background-image` + `background-size`/`background-repeat` from design §4.2 (grid re-declared **on top**, radial last).
3. **Entrance:** `@keyframes entrance-card-current / entrance-card-next / entrance-or / entrance-status / entrance-controls`; the five selector rules scoped under `.gameplay-entrance` (and `.gameplay-entrance-status` / `.gameplay-entrance-controls`); `animation-fill-mode: backwards`; all timing/delay values per design §5.3.
4. **Dock:** `.launch-dock`, `.launch-dock[data-open="true"]`, `.launch-dock[data-keyboard="open"]`, `html[data-modal="open"] .launch-dock`, `env(safe-area-inset-bottom)`, `z-index: 40`, `width: min(92vw, 26rem)`.
5. **Reduced motion:** inside the existing `@media (prefers-reduced-motion: reduce)` appends — entrance → `tint-in 120ms linear 0ms`; dock transition declared only under `no-preference`; nothing that removes the route fade.

### 2.2 Matrix-row coverage

| Requirement row | Primary files | Verification |
|---|---|---|
| Sprite bake, DPR, integer blit, no `shadowBlur` | N1, M1 | V2, V3, V14 |
| Counts / planes / pool caps (D2) | N1, M1 | V3, V12 |
| Text-safe + card-safe masks | M1, M3 | V6, V10 |
| Reactive direction + tier + pointer/keyboard parity | M1 (reads existing emits) | V5, V12 |
| Non-escalating wrong beat (D8) | M1 | V5 |
| Reduced-motion frozen frame | M1, M7 | V4 |
| Mode tint + 60 % scrim + AA (D7) | M7 | V6 |
| `#6355cb` ban + Lower AA (D9) | M6, M7 (no token edits) | V6, V11 |
| Route crossfade, no 8 px rise (D3) | M7 | V7, V13 |
| 380 ms entrance, no double animation (D4) | N3, M4, M5, M7 | V7, V8 |
| Game-over overlay unchanged | M4, M5 (structural) | V8 |
| Dock show/hide, same launch path (D1) | N2, M2, M3, M7 | V9, V15 |
| Dock keyboard behaviour (D6) | N2, M3, M7 | V9 |
| Dock accessibility, focus, no CLS, no overlap | N2, M3, M7 | V9, V10 |
| Console / hydration clean | N3, M3, M7 | V11 |
| SFX-only + gameplay timing invariants | M1, M4, M5 | V12 |
| Legacy CSS untouched | M7 | V13 |

---

## 3. Implementation sequence (dependency order, independently landable sets)

**Set A — sprite primitives (landable, invisible).**
A1 create `lib/atmosphere/sprites.ts`; A2 wire `bakeSprites` into `resize()`/`rebakeAll()` inside `canvasEngine.ts` with the sprite set stored but **not yet drawn**. Visible change: none. Verifies V2, V3, V11.

**Set B — sprite draw path (first visible change).**
B1 `drawMotes` → `drawImage` sparks; B2 chevron pool + `drawChevrons`; B3 card/OR/hero masks (`bakeSafeBands` + M3's `data-atmo-safe`). Verifies V2, V3, V6 (mask only), V10, V14.

**Set C — reactive field.**
C1 last-guess memory + surge/beat state; C2 envelope + hot swap + offsets + recede; C3 tier extra pairs; C4 reduced-motion static brightness. Verifies V4, V5, V12.

**Set D — scrim (prerequisite for judging B/C visibly).**
D1 `.gameplay-surface` three-layer scrim in `globals.css`. Verifies V6. **Order note:** D may be moved before B if the owner wants to see the sprites at full effect earlier; it must not come after Set F, because the entrance is judged against the final field.

**Set E — D9 contrast.**
E1 `DecisionControls.tsx` ink change. Verifies V6, V11. Independent of A–D.

**Set F — transition + entrance.**
F1 route crossfade retarget; F2 entrance keyframes/classes; F3 `GameplayEntrance.tsx` + the class/status/controls edits in both game components; F4 reduced-motion override. Verifies V7, V8, V11, V13.

**Set G — Go dock.**
G1 `data-atmo-go` branch in `delegation.ts`; G2 `LaunchDock.tsx`; G3 `HomeSetup` observer extension + `visualViewport` effect + mount; G4 dock CSS. Verifies V9, V10, V15.

**Set H — close-out.**
H1 full read-back diff against the frozen list; H2 legacy CSS byte check; H3 re-run the whole matrix; H4 handoff trace (task type, changed files, evidence, limits, open `Needs Verification`).

Sets A, E and G are independent of one another and of F. Sets B/C depend on A. Set D is independent but should precede final judgement of B/C/F.

---

## 4. Verification matrix

Status vocabulary: `[Pass] · [Partial] · [Fail] · [Blocked] · [Not tested]`. Nothing below is claimed as passing before it is run.

| ID | Check | Method | Capability / notes |
|---|---|---|---|
| **V1** | Static correctness | `npx tsc --noEmit`; `npm run lint`; `npm run build` **only if** the owner's `next dev` is stopped | build is expected `[Blocked]` while the live dev server holds `.next` — record honestly |
| **V2** | One canvas, one rAF | `document.querySelectorAll("canvas").length === 1`; read `step()` — single self-scheduled `requestAnimationFrame`; grep for `setInterval` / second `requestAnimationFrame` in `lib/atmosphere` | Playwright + source read |
| **V3** | Sprite cache built outside the loop | source read of N1/M1; grep `shadowBlur`, `filter`, `createRadialGradient` inside `drawFrame`/`drawMotes`/`drawChevrons` (must be zero); counts 28/10 desktop, 12/6 mobile | source read; `devicePixelRatio` from the browser |
| **V4** | Reduced-motion static frame | `emulateMedia({ reducedMotion: 'reduce' })` + fresh load; sample the canvas signature twice 900 ms apart — must be identical; `document.getAnimations()` — entrance must not leave running animations | Playwright |
| **V5** | Reactive direction / tier / parity | click `Higher` and `Lower` on a known-equal-value deck; keyboard `ArrowUp`/`ArrowDown`; assert `data-guess`, `data-tier`, surge window ≤ 360 ms, down-family alpha drop; wrong answer twice in a row → identical response both times | Playwright + canvas sampling |
| **V6** | Mode tint, scrim, AA | switch Classic ↔ Time Attack, confirm `data-mode` and gutter tint difference; sample composite behind the “Current/Next up” label and behind a card; re-measure the §4.3 pairs; confirm Lower button `4.83 : 1` behaviour in contrast terms and that no new text uses `#6355cb` | Playwright + computed contrast |
| **V7** | Entrance timing, no double animation | instrument `document.startViewTransition` (expect **1** per nav); assert the incoming page has **no** `translateY` in the route animation; measure the five beats' `animationend` — controls must settle at 380 ms ± one frame; assert no node outside `.gameplay-entrance*` animates on mount | Playwright |
| **V8** | Game-over unchanged | force game-over; assert the overlay's class/markup/shadow are unchanged, focus lands on `#btn-play-again`, the Tab trap works, and no entrance class exists on the dialog | Playwright |
| **V9** | Dock behaviour | at 390×844 and 1440×900: click `Start Comparing` → dock appears with the main `go!` off-screen; scroll to the CTA → dock hides; `Tab` order excludes the dock while closed; focus ring visible when open; `visualViewport` shrink (emulated keyboard) hides it; `HighScores` dialog open hides it; CLS via PerformanceObserver stays at the postfix2 baseline (0.00053); no overlap with the audio control | Playwright; emulated keyboard may be `[Blocked]` if the capability is unavailable |
| **V10** | Mobile geometry, overflow | 390×844: `scrollWidth === innerWidth`; dock width ≤ 92vw; document height delta ≤ dock height; gameplay controls still reachable | Playwright |
| **V11** | Console / hydration | fresh load at both viewports, default and `reduce`: zero console errors; the pre-existing reduced-motion hero mismatch is **expected** and must be recorded, not mistaken for a regression | Playwright |
| **V12** | Invariants: SFX-only, timing | assert reveal windows unchanged (Classic 1500 ms; Time Attack 800/400 ms), timer cadence unchanged, `launch` SFX fires once per launch, no new audio cues, deck order unchanged across a guess | Playwright + source read |
| **V13** | Legacy CSS byte-identical | `git diff app/globals.css` — the only hunk inside pre-existing content is the `::view-transition-new(.nav-forward)` retarget; everything above L735 unchanged; all other hunks are appends | `git diff` |
| **V14** | DPR 2 crispness | emulate `deviceScaleFactor: 2`; confirm sprite blit is integer device pixels and no shimmer on scroll | Playwright; if DPR emulation is unavailable → `[Blocked]`, carry to handoff |
| **V15** | Launch parity | dock launch emits the same `route` event, triggers exactly one `nav-forward` transition, one `launch` SFX, and a warp impulse whose origin is the dock rect | Playwright + `data-*` assertions |
| **V16** | Frame budget | long-task / frame-duration probe during a 10 s gameplay session at desktop maximum; no layout reads per frame (source), no long tasks attributable to the canvas | `[Not tested]` unless a probe capability is confirmed |

---

## 5. Risk register and mitigations

| # | Risk | Severity | Mitigation / evidence |
|---|---|---|---|
| P1 | Sprites invisible under the shell (analysis R2) | High | Set D (scrim) is a **prerequisite** for judging Sets B/C; D7's 86 → 60 % stops are fixed, not "tune later" |
| P2 | A second canvas / second loop slips in | High | V2 asserts one canvas and one rAF; sprites are created but never appended |
| P3 | Reduced motion regresses to an animated field | High | All sprite positions derive from `elapsed`; V4 samples the frame twice |
| P4 | Double animation (route rise + entrance) | High | Route retarget is in **Set F** with the entrance, not before; V7 measures both |
| P5 | Hydration mismatch re-created by a reduced-motion branch in N3/M3 | High | CSS-only gate; N3 has no `useReducedMotion`; V11 checks both modes |
| P6 | `.gameplay-surface` scrim deletes the dot grid (**C-4**) | Medium | grid re-declared as the top background layers; V6 inspects the rendered grid on gameplay |
| P7 | Legacy CSS drift | Medium | V13 diff rule: one retarget, everything else appends; anything else is a stop condition |
| P8 | Card-mask hard edge reads as a bug | Medium | accepted in design §2.6; flagged `[product-decision]`; mask is erasure only, never paint over art |
| P9 | Tier compounds into a strobe on long streaks | Medium | D8 non-escalation; window constant at 360 ms; pool never grows; V5 repeats a wrong answer twice |
| P10 | Dock duplication / second focusable “go” | Medium | `visibility: hidden` while closed; `aria-label` deliberately not “Start Comparing”; V9 asserts tab order |
| P11 | `position: fixed` dock clipped by `<main class="overflow-x-clip">` | Medium | `main` creates no containing block for fixed descendants; confirmed at runtime in V9, with a `createPortal` fallback **only if** V9 fails (would be a new expansion) |
| P12 | Mobile keyboard covers the dock | Medium | D6 heuristic (>25 % `visualViewport` shrink) + V9 |
| P13 | Dock scroll observer fights the ambient observer | Low | one observer, one callback, two booleans; no new listener besides `visualViewport` |
| P14 | `#15122b` on `#d93fd0` lands just under AA if computed differently | Medium | 4.83 : 1 computed; V6 measures the rendered result; fallback option in §6.4 |
| P15 | Build cannot run while `next dev` is live | Low | V1 records `[Blocked]`; do not stop the owner's server |
| P16 | Sprite rect staleness after a deck swap | Low | cosmetic-only failure mode; re-read on every bake; design §2.6 |
| P17 | Scope creep into the five unnecessary expansions | Medium | §1.4 lists them explicitly; touching one is a stop condition |

### Stop conditions

Stop and ask the owner before proceeding if **any** of these occurs:

1. A file outside §1.1–§1.2 must change (including the five §1.4 files, `HighScoresModal.tsx` for HV-1, or `gameplay` route files).
2. The card/OR/hero mask cannot be read at bake without a DOM read inside the frame.
3. The entrance cannot reach 380 ms without a layout-affecting property.
4. The scrim cannot preserve the dot grid, or any measured pair in design §4.3 falls below AA.
5. The dock requires `createPortal`, a second observer, or a new event type.
6. `startViewTransition` fires more than once per launch, or the entrance produces a second animation on the same node.
7. Gameplay timing, deck order, scoring, or storage must change to make something work.
8. A document contradiction beyond **C-1…C-7** appears.

---

## 6. Open `Needs Verification`

1. **DPR 2/3 sprite crispness** — designed device-first; the analysis browser ran at DPR 1. `[Not tested]`.
2. **Perceptual acceptance** of density, surge, 60 % gutter, hot-chevron white core, mask hard edge. `[product-decision]`.
3. **Reduced-motion reactive brightness** (discrete swap, no motion). `[product-decision]`.
4. **Lower-button fix shape** — dark ink (planned, 4.83 : 1 computed) vs darkening `--accent-action-lower` (brand change). `[product-decision]`.
5. **HV-1 `HighScoresModal.tsx:281`** — the one live `#6355cb`-as-text instance (3.20 : 1) is inside a frozen file; needs an owner decision to reopen. `[product-decision]`.
6. **Mobile tier parity** — 6 mobile chevrons leave no reserve, so tiers 1–2 add no sprite on mobile (**C-3**). `[product-decision]`.
7. **Cold production navigation latency** — the 90–121 ms figure is a warm local dev server. `[environment-specific]`.
8. **Pre-existing reduced-motion hero hydration mismatch** (`HomeSetup.tsx:172`) — traced, deliberately not fixed; it will still appear in V11 and must not be read as a regression. `[product-decision]`.
9. **Frame-budget probe (V16)** — depends on an available measurement capability. `[capability-unavailable]` until confirmed.
10. **Emulated software-keyboard check (V9 sub-case)** — depends on `visualViewport` emulation support in the browser harness. `[capability-unavailable]` if absent.
11. **`npm run build`** — expected `[Blocked]` while the owner's `next dev` holds `.next`; not to be forced.
12. **Dock on desktop** — measured need is real (105 px), but a desktop-specific variant is not designed. `[product-decision]` only if the single dock form is rejected.
13. **`html[data-modal="open"]` × card combined state** — still unreachable; carried from postfix2. `[Not tested]`.

### Contradictions carried from the design (do not resolve silently during implementation)

- **C-1** entrance 460 ms vs 380 ms → 380 ms wins (D4); re-timed table in design §5.3.
- **C-2** D9 vs frozen `HighScoresModal` → HV-1, unfixed.
- **C-3** D2's 10 chevrons vs tier 4's third pair → reuse reserve pair 1; no pool growth; no mobile reserve.
- **C-4** D7 scrim vs `bg-grid` → three-layer background with the grid on top.
- **C-5** binary mask hard edge → accepted, perceptually open.
- **C-6** frozen frame vs reactive brightness → one discrete repaint per reveal.
- **C-7** `home-go` reuse vs `.home-go` presentation → `data-atmo-go` + one delegation branch.
