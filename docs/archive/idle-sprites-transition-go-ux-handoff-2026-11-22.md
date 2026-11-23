# Idle Sprites · Reactive Field · Loading & Entrance · Scroll-Free Go — Implementation Handoff

**Date:** 2026-11-22
**Stage:** Implementation (Sets A–H of [`idle-sprites-transition-go-ux-plan-2026-11-22.md`](./idle-sprites-transition-go-ux-plan-2026-11-22.md))
**Branch:** `lj-branch`
**Source of truth:** owner decisions D1–D9 → design → analysis → plan. Where the plan and the design disagreed with themselves, the deviation is recorded in §4 rather than silently resolved.
**Analysis / design / plan documents were not edited.**

---

## 1. Changed files

### New (3)

| File | Purpose |
|---|---|
| [`lib/atmosphere/sprites.ts`](../lib/atmosphere/sprites.ts) | Pure offscreen sprite baker: 6 spark canvases (white `#ffffff` / cyan `#22d3ee` / magenta `#d93fd0` × near 14 px / far 8 px) and 4 chevron canvases (`chevronUp/Down`, `chevronUpHot/DownHot`, 20×26, three 2 px strokes at an 8 px step, alphas `0.95/0.55/0.28`). Baked at device pixels (`round(css × scale)`), never appended to the DOM. |
| [`components/home/LaunchDock.tsx`](../components/home/LaunchDock.tsx) | Presentational sticky dock: container + Category · Mode context line + `GO!` button carrying `data-atmo-go`. No observer, timer, router or emit. |
| [`components/game/GameplayEntrance.tsx`](../components/game/GameplayEntrance.tsx) | `GameplayEntranceStatus` — a class *cloner* (no wrapper node) that adds `gameplay-entrance-status` to the existing tally cluster. See **DEV-4** for the body class. |

### Modified (8)

| File | Change |
|---|---|
| [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts) | Sprite set baked in `rebakeAll()`; `drawMotes` → `drawSprites` (`drawImage`, integer coords, `sprite.width / scale` destination); new seeded chevron pool (10 desktop / 6 mobile / 6 low-quality, reserve from index 6) drawn on `z = 1.15`; 360 ms surge + fixed 180 ms/80 ms wrong beat; tier-limited reserve pairs; card/OR-badge rects and the Home `[data-atmo-safe="hero"]` band punched into `safeLayer` at bake; reduced-motion branch records `assertiveDirection`/`assertiveWrong` and repaints once per reveal. |
| [`lib/atmosphere/delegation.ts`](../lib/atmosphere/delegation.ts) | One additive branch: `data-atmo-go` → `{ target: "go", cue: "press" }`, above the `.home-go` check. |
| [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx) | `setupRef` added to the existing single observer (explicit thresholds), `dockVisible` + `keyboardOpen` state, one `visualViewport` resize listener, `<LaunchDock />` as the last child of `<main>`, `data-atmo-safe="hero"` on the hero block. |
| [`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx) | `gameplay-entrance` on the body div, status wrapped in `GameplayEntranceStatus`, `gameplay-entrance-controls` on the control row. Nothing else. |
| [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx) | Same three edits, preserving `${shaking ? "shake" : ""}`. |
| [`components/game/DecisionControls.tsx`](../components/game/DecisionControls.tsx) | D9: Lower label `text-white` → `text-[#15122b]`. |
| [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx) | HV-1 minimal AA fix on the selected score tab (see **DEV-5**). |
| [`app/globals.css`](../app/globals.css) | `::view-transition-new(.nav-forward)` retargeted to `route-fade-in` 140 ms; `.gameplay-surface` three-layer scrim (grid on top) with a transparent `background-color`; appended entrance keyframes/classes; appended `.launch-dock` block; reduced-motion overrides. |

No file outside the approved allowlist was touched.

---

## 2. Per-step status

| Set | Status | Evidence |
|---|---|---|
| **A** sprite baker | Done | [`sprites.ts`](../lib/atmosphere/sprites.ts:1). Offscreen only; `document.querySelectorAll("canvas").length === 1` at 1440 and 390. |
| **B** draw path + masks | Done | Runtime: 177 cyan + 129 magenta blended pixels on a **Classic (purple-tint)** Home field — colours that only the cyan/magenta spark + chevron sprites can supply. Hero band alpha at its centre = **0** (erased). |
| **C** reactive field | Done (source) / amplitude `[Not tested]` | Constants 360 / 180 / 80 ms, `peakAt 0.17`, `0.20 → 0.62`, ±6 px, reserve-pair cap 2, `0.05` wrong recession, `+3 %` lift for 80 ms. |
| **D** scrim | Done | Computed `background-image` = 2 grid layers + `radial-gradient(120% 90% at 50% 45%, rgba(21,18,43,.86) 0%, … .8 55%, … .6 100%)`, `background-size: 54px 54px, 54px 54px, 100% 100%`, `background-color: rgba(0,0,0,0)`. |
| **E** D9 / HV-1 | Done | Lower button rendered `rgb(21,18,43)` on `rgb(217,63,208)` → **4.83 : 1**; Higher 10.08. |
| **F** route fade + entrance | Done | `::view-transition-new(*.nav-forward)` in the browser CSSOM = `route-fade-in var(--motion-dur-quick) var(--motion-ease-out) both`; no `translateY`. Five beats resolve at 0/32/96/168/220 ms with 240/240/180/140/160 ms, fill `backwards`; controls end at **380 ms**. |
| **G** dock | Done | See §5. |
| **H** close-out | Done | Static checks clean, matrix below, handoff (this file). |

---

## 3. Verification matrix

Status vocabulary: `[Pass] · [Partial] · [Fail] · [Blocked] · [Not tested]`.

| ID | Check | Status | Evidence |
|---|---|---|---|
| **V1** | Static correctness | `[Pass]` | `npx tsc --noEmit` exit 0; `npm run lint` exit 0, **0 errors** (95 pre-existing warnings, all in `.agents/` scripts, `lib/api/worldbank.ts`, `lib/catalog/availability.ts`); `npx eslint --quiet` on every touched file: silent. `npm run build` **`[Blocked]`** — the owner's `next dev` (port 3000) holds `.next`; not stopped. |
| **V2** | One canvas, one rAF | `[Pass]` | Runtime `canvasCount: 1` on Home (1440/390), Classic (1440/390) and Time Attack (390). Source: exactly two `requestAnimationFrame` call sites in the engine (start + self-schedule in `step`) writing one `rafId`; no `setInterval`, no `IntersectionObserver` in `lib/atmosphere/**`. |
| **V3** | Sprite cache outside the loop | `[Pass]` | `drawSprites`/`drawChevrons` contain only `drawImage` + arithmetic; zero `shadowBlur`, zero `ctx.filter`; the only gradients in the engine are in `bakeStatic`/`bakeVignette` and the **pre-existing** `swell`/`glow` impulse kinds; `sprites.ts` bakes its own glow once. Counts: 28 sparks + 10 chevrons desktop, 12 + 6 mobile/low-quality. |
| **V4** | Reduced-motion frozen frame | `[Pass]` | `emulateMedia({ reducedMotion: 'reduce' })`, full-canvas diff 900 ms apart: `diffPixels: 0, alphaDiffs: 0, maxDelta: 0`; `document.getAnimations()` = 0 before and after a launch-scroll. |
| **V5** | Reactive direction / tier / parity | `[Partial]` | Pointer: click Higher → `data-guess="higher"`, `data-phase="game-over"`, `data-tier="0"`. Keyboard: `ArrowUp` → `data-guess="higher"` on every attempt; across 6 attempts 3 advanced (`phase="playing"`, `tier="1"`) and 3 ended (`phase="game-over"`), i.e. the same handler both ways. Non-escalation is enforced by constants (one 180 ms + 80 ms beat, no accumulation). **`TODO:` the per-beat chevron amplitude/hot-swap and the tier reserve behaviour were not measured at runtime** — the harness's frame clock lags badly when the page is not focused, so sub-360 ms captures were not trustworthy. `[Not tested]` perceptually. |
| **V6** | Tint / scrim / AA | `[Pass]` | `data-mode` flips `classic` ↔ `time-attack`; Classic canvas is purple-tinted, Time Attack magenta-tinted. Rendered pixels (PNG sampled): gutters `23,19,44` / `22,18,45` / `23,18,44` vs the `#15122b` base `21,18,43` → the field is now perceptible; the dot grid still paints (`x=54`, `x=108`, `y=108` → `37,35,64`). Lower button 4.83 : 1, Higher 10.08 : 1. No `#6355cb`-as-text remains (the one live instance was HV-1). |
| **V7** | Entrance timing, no double animation | `[Pass]` (source + computed) | Computed `animation-name/duration/delay` on the live nodes match §5.3 exactly; cards keep their own `translate: 0px 40px` / `0px -8px` while the animation drives `transform`, and the OR badge keeps `translate: -50% -50%` → no jump, no second animation on the same node. `startViewTransition` was patched once but the patch is lost across the client navigation, so the "exactly one" count is **`[Partial]`** (unchanged plumbing; see V15). |
| **V8** | Game-over unchanged | `[Pass]` | Overlay keeps `role="dialog"`, `aria-modal`, `aria-labelledby="classic-game-over-title"`, `shadow-[8px_8px_0_var(--accent-classic)]`; focus on `#btn-play-again`; Tab from the last action wraps to the first; **no** entrance class on the dialog, while the body keeps `gameplay-entrance`. |
| **V9** | Dock behaviour | `[Partial]` | 1440×900 and 390×844: closed at load (`data-open="false"`, `visibility: hidden`, `aria-hidden="true"`); opens after `Start Comparing` (`setup` in view, `go!` 105 px / 529 px below the fold); closes when `go!` enters view; closed state is out of the tab order; open state exposes exactly one `Go! …` focusable; no overlap with the audio control (`overlapWithAudio: false`); `documentHeight` unchanged (2242 / 2489 / 1252 baselines) → zero layout growth. Modal-hide rule present in CSSOM (`html[data-modal="open"] .launch-dock`). **Software-keyboard sub-case `[Blocked]`** — no `visualViewport` shrink emulation in this harness. `TODO:` re-run the keyboard-open path on a real device. |
| **V10** | Mobile geometry / overflow | `[Pass]` | 390×844: `scrollWidth 385` = canvas width, `innerWidth 390` → no horizontal overflow; dock `width 359` (= `min(92vw, 26rem)`), `left 13`, `right 372`, `bottom 840`; Home `docHeight 2489` and Classic `docHeight 1252` unchanged from the analysis baseline. |
| **V11** | Console / hydration | `[Partial]` | Normal motion: 0 console errors on Home, Classic and Time Attack. Reduced motion: **1 error — the pre-existing hero hydration mismatch** (`HomeSetup.tsx` `heroEntrance` branch), which the analysis flagged as expected; no new error, and the entrance adds no JS/SSR branch. |
| **V12** | SFX-only / timing invariants | `[Pass]` (source) | No audio file touched; `target === "go"` → `launch` SFX mapping intact ([`audioEngine.ts`](../lib/audio/audioEngine.ts:302)); reveal windows, deck, scoring and storage untouched; the dock calls the same `startGame()` that emits `route` before `router.push`. |
| **V13** | Legacy CSS byte-identical | `[Pass]` | `git diff app/globals.css` hunks: `135/139/144/148` (pre-existing immersive-motion dialog rules, present before this task) and the single appended block from old line 453. Nothing between those and line 735 changed. The one retarget (`::view-transition-new(.nav-forward)`, now at L751) and the `.gameplay-surface` rewrite (L899) both live in the appended layer. |
| **V14** | DPR 2 crispness | `[Blocked]` | The harness reports `devicePixelRatio 1` and offers no DPR emulation; the bake is device-first by construction (`round(css × scale)`, destination `sprite.width / scale`). `TODO:` verify on a real DPR 2 device. |
| **V15** | Launch parity from the dock | `[Partial]` | Dock launch landed on `/game/classic?category=movie-series-rating` (identical to the main `go!` path) at both viewports, with one canvas and the entrance mounted; `data-atmo-go` resolves to `target: "go"` (launch SFX + warp origin = the button rect). The "exactly one `startViewTransition`" count could not survive the navigation boundary — **`[Partial]`**; the launch plumbing itself is unchanged. |
| **V16** | Frame budget | `[Not tested]` | No long-task/frame probe capability was confirmed. Per-frame allocation is zero by construction (seeded pools, no gradients/closures in the draw path). |

Screenshots (viewport, CSS pixels): [`home-1440-hero.png`](./assets/visual-ux-upgrade/after/home-1440-hero.png), [`home-1440-setup-dock.png`](./assets/visual-ux-upgrade/after/home-1440-setup-dock.png), [`home-390-setup-dock.png`](./assets/visual-ux-upgrade/after/home-390-setup-dock.png), [`classic-1440.png`](./assets/visual-ux-upgrade/after/classic-1440.png), [`classic-390.png`](./assets/visual-ux-upgrade/after/classic-390.png).

---

## 4. Deviations

| # | Deviation | Why |
|---|---|---|
| **DEV-1** | Observer uses explicit `threshold: [0, .05, .25, .5, .75, 1]` and a **ratio** test instead of `isIntersecting`. | **Implementation bug found at runtime.** `#setup` sits exactly on the fold at scroll 0, so its first entry is `isIntersecting: true` with ratio `0`; with the default `[0]` threshold that `0 → 1` growth never crosses a threshold, the entry is never refreshed, and the dock stayed permanently closed. |
| **DEV-2** | Dock requires **≥ 25 %** of `#setup` on screen (not merely intersecting). | **Implementation bug found at runtime.** Edge-touching made the dock appear on the hero viewport (two CTAs at once) — exactly what design §6.2 forbids. |
| **DEV-3** | `.gameplay-surface` keeps `background-color: transparent`; the design's literal "`background-color: var(--surface-background)` opaque fallback" line is **not** implemented as written. | **Design contradiction (new, C-8).** An opaque `background-color` paints *under* the gradient layers, so the radial scrim could never let the canvas through — the whole of D7 would have been a visual no-op. The alpha lives in the radial stops; the opaque `--bg-base` page body behind the surface is the real fallback. Verified: computed `background-color: rgba(0,0,0,0)` and measurable gutter show-through. |
| **DEV-4** | The `gameplay-entrance` class is applied as a literal class string on the existing body `<div>`; `GameplayEntranceStatus` (the cloner) is used for the tally. | The plan's own documented fallback for N3: the wrapper variant would have meant re-indenting 45 lines for zero behavioural gain, and the DOM shape must stay identical. No node was added either way. |
| **DEV-5** | HV-1 fix: selected score tab is `bg-[var(--accent-classic)]/22 text-white` instead of a solid `#6355cb` plate. | D9 bans `#6355cb` *behind text*. Dark ink on solid `#6355cb` computes to only **3.25 : 1** (still AA-fail), so the minimal compliant fix is a classic **tint** (white on the 22 % composite ≈ 15 : 1) that keeps the accent as emphasis rather than as a text background. |
| **DEV-6** | Hot chevron = white `stroke-width 3` at α 0.85 painted **under** the colour `stroke-width 2`. | Implemented exactly as design §2.2's parenthetical, which yields a lit white **edge** rather than the "1 px white core" the same sentence names. Recorded, not silently reinterpreted; perceptual acceptance is open (§6.3). |
| **DEV-7** | Motes are now mapped `colorIndex 0/1/2 → white/cyan/magenta` (previously classic-purple/cyan/magenta). | Design §2.2 defines exactly three spark colours (white neutral + cyan up + magenta down). This is a deliberate tint change on Home. |

**Carried plan contradictions, resolved as directed:** **C-1** (380 ms wins over the analysis's 460 ms), **C-3** (mobile has no chevron reserve — tiers 1–2 add no sprite on mobile), **C-4** (grid re-declared as the top layers), **C-6** (one discrete repaint per reveal under reduced motion), **C-7** (`data-atmo-go` instead of the `.home-go` class).

---

## 5. Dock behaviour detail (measured)

| Viewport | State | `data-open` | `visibility` | Primary `go!` | Doc height |
|---|---|---|---|---|---|
| 1440×900 | load (hero) | `false` | `hidden` | off screen | 2242 |
| 1440×900 | `Start Comparing` → setup | `true` | `visible` | `top 1005` (105 px below) | 2242 |
| 1440×900 | scrolled to CTA | `false` | `hidden` | visible | 2242 |
| 390×844 | load | `false` | `hidden` | off screen | 2489 |
| 390×844 | setup | `true` | `visible` | `top 1373` (529 px below) | 2489 |

Dock: `width min(92vw, 26rem)` (416 px / 359 px), `z-index: 40`, `bottom: max(0.75rem, env(safe-area-inset-bottom))`, accessible name `Go! Start <category> on <mode>` (deliberately not "Start Comparing"), `aria-hidden="true"` + `visibility: hidden` while closed, context line `Movie/Series Rating · Classic`.

---

## 6. Open `Needs Verification`

1. **Dock trigger leaves a gap between `#setup` and "Ready?"** — `#setup` only wraps domain + category, so the dock hides across the whole mode-selector section while `go!` is still far below the fold. Design §6.2's parenthetical ("hide … when `#setup` leaves view upward (hero region)") and its literal trigger disagree; the literal trigger was implemented. `[product-decision]`
2. **Perceptual acceptance** of sprite density, surge amplitude, hot-chevron white core, 60 % gutter show-through and the card-mask hard edge. No human reviewer this pass. `[product-decision]`
3. **Reactive amplitude** (hot swap, ±6 px offset, reserve pairs, wrong-beat recession) was verified at source only. `[Not tested]` at runtime.
4. **Reduced-motion reactive brightness** (discrete hot/base swap, no motion) — `[product-decision]`.
5. **DPR 2/3 sprite crispness** — `[Blocked]`, harness runs at DPR 1.
6. **Emulated software-keyboard dock hide (V9 sub-case)** — `[Blocked]`, no `visualViewport` emulation.
7. **`npm run build`** — `[Blocked]`, the owner's dev server holds `.next`.
8. **Single `startViewTransition` per launch (V7/V15)** — `[Partial]`; the counter cannot survive the navigation boundary in this harness.
9. **Pre-existing reduced-motion hero hydration mismatch** — still present (1 console error), traced to the `heroEntrance` branch, deliberately not fixed. `[product-decision]`
10. **Frame budget (V16)** — `[Not tested]`, no probe capability confirmed.
11. **`html[data-modal="open"]` × card combined state** — carried from postfix2, still unreachable. `[Not tested]`
