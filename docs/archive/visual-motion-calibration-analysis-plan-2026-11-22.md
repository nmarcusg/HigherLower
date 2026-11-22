# Visual & Motion Calibration — Analysis + Plan

**Date:** 2026-11-22
**Stage:** Investigation / Analysis + Plan only. **No application code, config, asset, or manifest change was made.**
**Repository writes in this stage:** this document and screenshots under `docs/assets/visual-motion-calibration/`.
**Runtime used:** the owner's existing dev server on `http://localhost:3000` (unmodified, not restarted). Playwright/Chromium, `devicePixelRatio = 1` in both viewports, `sharp` used for exact composited-pixel measurement.

---

## 1. Git baseline

```
$ git branch --show-current
lj-branch

$ git log -1 --oneline
ea650b7 refactor(twitch): retire orphaned followers snapshot and generator

$ git diff --cached --stat
(empty — nothing staged)

$ git diff --stat
 app/game/[mode]/page.tsx             |  33 +-
 app/globals.css                      | 753 ++++++++++++++++++++++++++++++++++-
 app/layout.tsx                       |   4 +
 app/page.tsx                         |  11 +-
 components/CategoryCard.tsx          |  19 +-
 components/HighScoresModal.tsx       |  27 +-
 components/ModeButton.tsx            |   8 +-
 components/game/ClassicGame.tsx      | 113 +++++-
 components/game/ComparisonBoard.tsx  |  11 +-
 components/game/DecisionControls.tsx |   8 +-
 components/game/GameCard.tsx         |  51 ++-
 components/game/GameplayShell.tsx    |   8 +-
 components/game/GameplayStatus.tsx   |  39 +-
 components/game/TimeAttackGame.tsx   | 130 +++++-
 components/home/CategorySelector.tsx |  17 +-
 components/home/DomainSelector.tsx   |   8 +-
 components/home/HomeSetup.tsx        | 124 +++++-
 17 files changed, 1284 insertions(+), 80 deletions(-)

$ git status --porcelain   (untracked subset)
?? .agents/  ?? .playwright-mcp/  ?? components/atmosphere/  ?? components/audio/
?? components/game/GameplayEntrance.tsx  ?? components/home/LaunchDock.tsx
?? docs/  ?? lib/atmosphere/  ?? lib/audio/  ?? skills-lock.json  ?? types/view-transition.d.ts
```

**Working-tree note.** The whole atmosphere/audio/motion layer is uncommitted work in progress on `lj-branch`. All of the 17 modified files and 11 untracked entries above pre-date this task. Nothing was reverted, reformatted, or absorbed by this analysis.

---

## 2. Method (what was actually measured)

| Instrument | What it gives | Where used |
|---|---|---|
| `canvas.getContext("2d").getImageData()` on the live canvas | the engine's own buffer: per-pixel alpha/RGB, region statistics | S1, S2, S3, S4 |
| Playwright viewport screenshots + `sharp` raw-pixel decode | **composited** result after all CSS layers | S1, S2, S3, S4 |
| Frame-to-frame screenshot diffing (two shots, Δt = 420 ms) | which pixels actually *move* on screen | S4 |
| Canvas-hidden control shot (host `display:none`) | the canvas's true contribution to the composite | S2 (**decisive**) |
| `getComputedStyle`, `elementFromPoint`, ancestor-chain walk | layer stack and stacking order | S1, S2 |
| `document.getAnimations()` | live CSS animation names, durations, delays, play state | S4 |
| WCAG relative-luminance maths over token × composited colours | AA ratios for text/controls on every proposed background | §6 |

All numbers below are **measured** unless the row says *computed* (derived from token maths) or *proposed*.

---

## 3. Root-cause audit — summary table

| # | Symptom | Verdict | True root cause (one line) | Fix class |
|---|---|---|---|---|
| **S1** | Dark shadowed box / cutout in the centre of Home | **Verified** | `bakeSafeBands()` erases a hard-edged **binary** rect (the hero container, 1323 × 277 px at 1440×900) from the *whole* composite with `destination-out`, deleting the horizon/tint wash only inside that rect. | Reorder the draw path so the band erases only the field (Option A) |
| **S2** | Home vs Gameplay background/animation mismatch; sprites "missing" in Gameplay | **Verified** (occlusion) / **Refuted** as "missing or masked by the scrim" | The `/game/*` **route wrapper** carries an **opaque** `bg-[var(--surface-background)]` (`rgb(21,18,43)`, 1440×900) that paints **above** the `fixed z-0` canvas. The canvas contributes **0 pixels** to gameplay. They are not drawn-and-masked; they are fully covered. | Remove the opaque background from the wrapper (one class), then retune the scrim |
| **S3** | Mode selection not visibly changing the background | **Partially Verified** — plumbing is correct; **percept is not** | State, `data-mode`, canvas rebake and tint colour all change correctly (canvas `rgb(96,82,199) → rgb(211,59,204)`). The composited delta is only **ΔR +8…+13 / ΔG −1…−3 / ΔB 0…+1** at 6–8 % tint alpha, and the strongest tint area (screen centre) is the erased hero band. | Raise tint/horizon alpha + fix S1 |
| **S4** | Animations too subtle | **Verified** | Idle sparks: effective alpha **0.026–0.18** (mean ≈ 0.07) at **0.8–2.4 px/s** motion, drawn on `Math.round()` integer coordinates → sub-pixel travel, so most frames are literally identical. The correct-answer surge is **cancelled** by the recession that fires on the same beat (**−24 %** field pixels at the moment of reward). The 380 ms gameplay entrance is overlapped by a **140 ms** page crossfade that starts at opacity 0. | Calibrate alpha / speed / surge / recession / entrance overlap |
| **S5** | *(new)* Reduced-motion page is **not** animation-free at first paint, and produces **hydration errors** | **Verified** | `useReducedMotion()` is branched inside render in two places, so the server and the reduced-motion client emit different styles/classes. | Scope-expansion request (see §8) |
| **S6** | *(new)* Canvas alphas are **not token-driven** | **Verified** | `--atmo-horizon-alpha`, `--atmo-top-alpha`, `--atmo-tint-alpha`, `--atmo-recede-*` are declared in `:root` but the engine hard-codes the same values as literals and never reads them. | Route the constants through the tokens (or delete the tokens) |
| **S7** | *(new)* Prior QA verdict "the field is now perceptible in the gameplay gutters" | **Refuted** | The `+2/255` gutter delta the earlier QA attributed to the canvas is the `bg-noise` overlay + grid dither: with the canvas hidden the composite is **pixel-identical** (max Δ 0). | Correct the record; the S2 fix is the prerequisite for any gameplay field testing |

---

## 4. Symptom detail

### S1 — the dark cutout on Home · **Verified**

**Mechanism** ([`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:930)):

```ts
ctx.globalCompositeOperation = "destination-out";
ctx.drawImage(safeLayer, 0, 0, cssW, cssH);
```

`safeLayer` is filled by [`bakeSafeBands()`](../lib/atmosphere/canvasEngine.ts:495). On Home the code takes the first branch ([`:500`](../lib/atmosphere/canvasEngine.ts:500)–[`:507`](../lib/atmosphere/canvasEngine.ts:507)) and punches **one opaque white rect** — `punchRect(layerCtx, hero.getBoundingClientRect(), …)` at [`:505`](../lib/atmosphere/canvasEngine.ts:505) — which erases *everything* drawn before it in that rect: horizon wash, tint wash, vignette **and** sprites. It is binary: full alpha inside, untouched outside, with no feather.

**Measured geometry (live `getBoundingClientRect`):**

| Viewport | Erased rect | Coverage |
|---|---|---|
| 1440 × 900 | `x 56 → 1379`, `y 319.3 → 596.7` (1323 × 277) | nearly the full content width, dead centre vertically |
| 390 × 844 | `x 16 → 369`, `y 321 → 555` (353 × 234) | nearly the full width, dead centre |

**Measured canvas alpha** at `(720, y)` on Home Classic, 1440×900:

| y | 120 (above) | 320 (inside) | 450 (inside) | 620 (below) | 840 (bottom) |
|---|---|---|---|---|---|
| α | **0.0928** | **0** | **0** | **0.0995** | **0.149** |
| RGB | 96,82,199 | 0,0,0 | 0,0,0 | 102,86,205 | 83,70,158 |

**Measured composited pixels** (screenshot, `sharp` raw decode) — the artifact is visible to the eye because the surrounding wash is missing inside the rect:

| Point | Home Classic 1440×900 | Mobile 390×844 |
|---|---|---|
| above the band | `30,25,58` (y=300) | `28,23,54` (y=320) |
| **inside the band** | **`23,20,45`** (y=340–500) | **`22,19,44`** (y=360–500) |
| below the band | `32,26,61` (y=620) | `29,23,57` (y=560) |
| **step across the top seam** | **R −7, G −5, B −13** | **R −6, G −4, B −10** |

The step is a **single-pixel vertical discontinuity** running the full 1323 px width. Because the left/right edges of the rect coincide with the page gutter (where the wash is already ≈0) only the top and bottom seams are visible — which is exactly why it reads as a *slab / shadowed box / cutout* across the middle of Home rather than an obvious rectangle.

**Recommended fix — Option A (recommended): make the band erase only the field.**
Move the pre-rendered wash **after** the erase so the band suppresses sprites only, and the wash/vignette stay continuous:

```
clear → sprites/chevrons/impulses → destination-out(safeLayer) → staticLayer(wash) → vignetteLayer
```

* Zero new allocations, still one canvas, one rAF, no per-frame gradient/filter/blur.
* Text protection is unchanged in substance: the thing that could sit behind the wordmark is a *sprite*; the wash is a smooth ≤16 % gradient that cannot move AA (white on the tinted base stays ≥16.7 : 1, §6).
* The band becomes invisible by construction — there is no edge left to see.

**Option B:** keep the order, replace `fillRect` with a nested-rect feather (5 rects at 16 px steps, alphas 10/30/55/80/100 %). Removes the seam but still flattens the wash inside the hero block (a soft version of the same artefact). Bake-time only; no blur.
**Option C:** shrink the band to the wordmark's ink box. Reduces area but keeps a binary edge.

*Tradeoffs:* Option A slightly dims impulses that fire under the hero band (they now sit under a ≤16 % wash instead of above none) — imperceptible, and it is the correct layering anyway. Options B/C keep the current layering contract and are lower-risk to review.

---

### S2 — Home vs Gameplay mismatch, "sprites missing" · **Verified occlusion / Refuted "masked or not drawn"**

**`app/game/layout.tsx:18`** ([`app/game/layout.tsx`](../app/game/layout.tsx:18)):

```tsx
<div className="relative min-h-dvh flex flex-col overflow-x-hidden bg-grid bg-[var(--surface-background)]">
```

**Measured computed style of that wrapper:** `background-color: rgb(21, 18, 43)` (**opaque**), `position: relative`, `z-index: auto`, rect `0,0 1440×900`.
**Measured atmosphere host:** `position: fixed; inset: 0; z-index: 0` ([`components/atmosphere/AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx:235)).
Both are positioned descendants of the root stacking context at step 6 of the paint order; the wrapper comes **later in tree order**, so it paints **above** the canvas — and it is 100 % opaque.

**Decisive measurement (2×2 control):**

| Test | Result |
|---|---|
| Gameplay, canvas visible vs `display:none` on the host | **identical** — `max Δ = 0` over all 1,296,000 pixels |
| Gameplay, two frames 420 ms apart | **identical** — `max Δ = 0` (no visible animation at all) |
| Same page with the wrapper's `background-color` set to `transparent` at runtime | mean Δ **26.9/255**, centre region mean **38.8**, **75.8 %** of the centre region changed > 2 |

So: the sprites are **not** missing from the pipeline and **not** hidden by the `.gameplay-surface` scrim. The engine is drawing them — the canvas buffer inside the field region measures `mean α 0.068`, `max α 0.404`, 41 % of pixels above 2 % alpha — and the entire result is behind an opaque route wrapper.

**Secondary mismatches that exist even after the occlusion is fixed:**

1. **Scrim.** [`.gameplay-surface`](../app/globals.css:906) declares `radial-gradient(120% 90% at 50% 45%, rgba(21,18,43,0.86) 0%, …0.8 55%, …0.6 100%)` whose colour is **the same** as the page base `#15122b`. Over an opaque base of that exact colour it is a colour no-op; its only real function is to attenuate the canvas. Its darkest stop (0.86) sits where the cards are (already opaque) and its lightest (0.60) where the field should be visible.
2. **Erased regions.** Gameplay safe bands measure **α = 0** for `y 0→128` and `y 692→900` (header `116` + half the status band `12`; control band `min(0.24·900, 208) = 208`), computed from [`:509`](../lib/atmosphere/canvasEngine.ts:509)–[`:514`](../lib/atmosphere/canvasEngine.ts:514) and confirmed by region sampling (0 pixels above 2 % alpha in both bands). Only `y 128 → 692` can carry a field.
3. **Grid is declared twice** (`bg-grid` on the wrapper *and* re-declared inside `.gameplay-surface`). Measured grid-line pixel `x = 54`: Home `42,41,76` vs Gameplay `37,34,65` — the two surfaces' grids are not the same brightness because Home's grid sits on the canvas-lifted base and gameplay's on the flat base over a doubled declaration.
4. **Tint alpha differs by surface** (`0.06` home vs `0.08` gameplay, [`canvasEngine.ts:421`](../lib/atmosphere/canvasEngine.ts:421)) for no perceptual reason anyone can see today.

**Recommended fix:**

1. **Root cause (required):** drop `bg-[var(--surface-background)]` from [`app/game/layout.tsx:18`](../app/game/layout.tsx:18); the `<body>` already provides the opaque `--bg-base` fallback ([`globals.css:89`](../app/globals.css:89)), and the gameplay surface re-declares the grid. Keep `bg-grid` on exactly **one** of the two elements.
2. **Then** open the scrim: `0.86 → 0.84` centre (no text there), `0.80 → 0.66` at 55 %, `0.60 → 0.42` in the gutters — i.e. keep the card column as protected as today and let the field live where the design has no text.
3. Only after 1+2 should sprite amplitude be judged (S4); otherwise gameplay calibration is being measured through an opaque wall.

*Tradeoffs:* a visible field in gameplay is a deliberate visual change (owner decision, §9). 0.42 in the gutters raises the field's presence ~2.6× versus 0.60; the decision controls and card faces are opaque, so no text sits on the opened area.

---

### S3 — mode selection not visibly changing the background · **Partially Verified**

**What is correct (verified):**
* Clicking the Time Attack label sets `data-mode="time-attack"` on `<html>` and rebakes.
* The canvas tint colour changes materially in the buffer at the same alpha:
  `above hero (720,120)`: classic `α 0.0928 rgb(96,82,199)` → time-attack `α 0.0928 rgb(211,59,204)`;
  `below hero (500,620)`: `α 0.0995 rgb(102,86,205)` → `rgb(218,63,211)`.
* `--accent-time-attack` is live (`rgb(217,63,208)` on the `go!` button).

**What is not (measured on the composited page, Classic vs Time Attack, 1440×900):**

| Point | Classic | Time Attack | Δ |
|---|---|---|---|
| (720,120) | `31,25,58` | `41,23,58` | **R +10, G −2, B 0** |
| (720,200) | `28,24,56` | `37,22,56` | R +9, G −2, B 0 |
| (300,150) | `26,23,51` | `34,22,51` | R +8, G −1, B 0 |
| (720,640) | `33,27,61` | `45,24,61` | R +12, G −3, B 0 |
| (720,860) | `30,26,61` | `43,23,62` | R +13, G −3, B +1 |

The entire, global, static difference between the two modes is **a red-channel shift of 8–13 / 255 (3–5 % of range)**, uniform across the screen, with no green/blue response. That is below the threshold at which a full-screen tint change reads as "the background changed", especially when it is *static* (no transition accompanies it).

**Root cause = amplitude + the S1 hole + no transition.** This is **not** an event/state sync bug: three independent paths (the delegation `mode-*` branch, the `mode` bus event from `HomeSetup`'s effect, and `resolveSurface`) all agree with the DOM.

**Recommended fix (exact numbers in §5):** raise `--atmo-tint-alpha` home `0.06 → 0.14`, gameplay `0.08 → 0.16`; raise the horizon `0.10 → 0.16` and top `0.06 → 0.10`; fix S1 so the centre is no longer erased; and give the change a **320 ms full-field `wash` impulse** on the `mode` event so the switch is *felt* even in a static screenshot sense (currently a mode change emits only a pointer ripple at the clicked control).

*Tradeoffs:* a stronger tint is the biggest lever on the "brand feel" of the page; at 0.14 the muted text over the strongest tint measures **6.67 : 1** (§6) — AA pass, but the page loses a little of its near-black neutrality. That is a product call.

---

### S4 — animations too subtle · **Verified**

#### 4.1 Idle sparks

| Quantity | Source | Measured / derived |
|---|---|---|
| near mote alpha | [`canvasEngine.ts:322`](../lib/atmosphere/canvasEngine.ts:322) `0.11 + rnd*0.07` | **0.11 – 0.18** |
| far mote alpha | same line `0.05 + rnd*0.05` | **0.05 – 0.10** |
| breathe multiplier | [`canvasEngine.ts:652`](../lib/atmosphere/canvasEngine.ts:652) `0.62 + 0.38·sin` | **0.24 – 1.00** |
| **effective near alpha** | product of the two | **0.026 – 0.18, mean ≈ 0.07** |
| mote speed | [`:323`](../lib/atmosphere/canvasEngine.ts:323) `2 + rnd*4`, × `0.4` at [`:643`](../lib/atmosphere/canvasEngine.ts:643) | **0.8 – 2.4 px/s** |
| draw quantisation | [`:656`](../lib/atmosphere/canvasEngine.ts:656) `Math.round(x - dest/2)` | motion in **1 px steps ⇒ ~0.4–1.2 s dwell per step** |

Frame-to-frame reality check, Home 1440×900, Δt = 420 ms, composited: **1757 px** changed by > 2/255 (**0.14 %** of the viewport), 461 px by > 10/255. The only *strongly* visible Home motion in the frame diff was the `ambient-bob` 4 px chevron loop (`max Δ 226` — a white glyph edge moving off its background).

#### 4.2 Correct-answer surge

Measured on a live correct reveal at tier 2 (Time Attack):

| t | pixels α > 0.45 (hot cores) | pixels α > 0.30 | max α |
|---|---|---|---|
| before guess | 0 | 280 921 | 0.404 |
| **t + 90 ms** (in surge) | **204** | **214 167** | **0.569** |
| settled | 0 | 195 494 | 0.337 |

Two findings:
1. The hot chevrons are real but tiny: **204 hot pixels** ≈ 0.016 % of the viewport, at a peak stroke alpha `0.62 × 0.80 (fieldAlpha during reveal) × 0.95 (baked) ≈ 0.47`.
2. **The reward phase dims the field.** Total lit field pixels *fall* 280 921 → 214 167 (**−24 %**) at the exact moment of a correct answer, because `RECESSION_REVEALING = 0.8` ([`:69`](../lib/atmosphere/canvasEngine.ts:69), applied by [`updateTarget()`](../lib/atmosphere/canvasEngine.ts:977)) fires on the same `reveal` event that starts the surge ([`:1176`](../lib/atmosphere/canvasEngine.ts:1176)). The surge and the recession cancel each other.

#### 4.3 Wrong-answer beat

`WRONG_ALPHA 0.05` for 180 ms, `WRONG_LIFT_ALPHA 0.03` for 80 ms ([`:58`](../lib/atmosphere/canvasEngine.ts:58)–[`:61`](../lib/atmosphere/canvasEngine.ts:61)) — a 5 % field dim plus a 3 % white lift, i.e. ≤ 13/255 before the opaque-wrapper problem, **0** after it. The CSS `shake-brief` (240 ms) is the only miss signal that currently lands.

#### 4.4 Gameplay entrance

Verified live via `document.getAnimations()` immediately after navigation — the five beats match [`globals.css:1056`](../app/globals.css:1056)–[`:1074`](../app/globals.css:1074) exactly:

`entrance-card-current 240 ms @0`, `entrance-card-next 240 ms @32`, `entrance-or 180 ms @96`, `entrance-status 140 ms @168`, `entrance-controls 160 ms @220` (settles at 380 ms).

But the route crossfade runs `route-fade-out/in 140 ms` ([`globals.css:745`](../app/globals.css:745)–[`:753`](../app/globals.css:753)) from `opacity 0`, so **the first 140 ms of the entrance — the card beats at 0 ms and 32 ms — happen while the whole page is still ≤ 100 % opacity and rising from 0.** The most legible part of the entrance is literally behind a fade.

#### 4.5 Other observed motion (for completeness)

* `ambient-bob` 2400 ms / 4 px and `ambient-drift` 3200 ms / 2 px — `running` and `paused` respectively on the live Home (verified).
* `.decision-lift` hover 4 px + press `scale(0.985)` — present and correct, fine as-is.
* `selection-dot` `@starting-style scale(0.9) → 1` at 140 ms — fine.
* `tally-bump` / `tier-stamp` / `pulse-ring-once` — present, but the tally lives in the opaque header where they are visible, so they are **not** part of the subtlety problem.

---

### S5 — *(new)* reduced motion: late frame change + two hydration errors · **Verified**

* **Static frame:** after settle, three screenshots 600 ms apart are **pixel-identical** (`max Δ = 0`, twice). The single-static-frame contract *is* met.
* **But** the first ~2 s of the reduced-motion Home produced a 5406-pixel diff (max Δ 237) between two shots — the client patch landing after first paint.
* **Console error (reproduced) — `prefers-reduced-motion: reduce` on `/`:**

```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
  <motion.h1 style={{ + opacity: 1, − opacity: "0", + transform: "translateY(0px)", − transform: "translateY(8px)" }}>
  <motion.p   … same …
  <motion.a   … same …
  <dialog className={ "high-scores-dialog … " + "motion-reduce" }>
```

Two client-only render branches are responsible:
* [`components/home/HomeSetup.tsx:215`](../components/home/HomeSetup.tsx:215)–[`:217`](../components/home/HomeSetup.tsx:217) — `prefersReducedMotion ? { initial: false } : { initial: "hidden" }` changes the SSR'd inline style.
* [`components/HighScoresModal.tsx:197`](../components/HighScoresModal.tsx:197) — `… ${prefersReducedMotion ? "motion-reduce" : ""}` changes the SSR'd `className`.

This is precisely the failure mode the `GameplayEntrance` comment says it avoided for gameplay ([`GameplayEntrance.tsx:17`](../components/game/GameplayEntrance.tsx:17)), but the same pattern still exists on Home. **Not fixed here** — it needs an owner-approved allowlist expansion (§8).

* **And the S1 cutout persists under reduced motion** (α 0 inside the band, 0.0824 / 0.1137 outside), which violates the stated constraint "reduced motion: single static composed frame, **no unintended dark cutout**".

---

### S6 — *(new)* canvas alphas are not token-driven · **Verified**

`:root` declares `--atmo-horizon-alpha: 0.1`, `--atmo-top-alpha: 0.06`, `--atmo-tint-alpha: 0.08`, `--atmo-recede-playing/reveal/modal/game-over/low` ([`globals.css:806`](../app/globals.css:806)–[`:820`](../app/globals.css:820)). The engine hard-codes the same numbers as module constants and inline literals ([`canvasEngine.ts:50`](../lib/atmosphere/canvasEngine.ts:50)–[`:71`](../lib/atmosphere/canvasEngine.ts:71), [`:421`](../lib/atmosphere/canvasEngine.ts:421)) and **never reads them**. Consequences: a token edit silently does nothing; and the readability of the calibration in §5 depends on editing `canvasEngine.ts` literals, not CSS.

---

### S7 — *(new)* correcting a prior QA claim · **Refuted**

`docs/idle-sprites-transition-go-ux-qa-2026-11-22.md` V6 records "Rendered pixels (PNG sampled): gutters `23,19,44` … vs the `#15122b` base `21,18,43` → **the field is now perceptible**". The controlled measurement above (canvas visible vs hidden ⇒ **max Δ 0**) proves that delta is *not* the canvas; it is `bg-noise` (2.5 % white noise, [`globals.css:200`](../app/globals.css:200)) plus grid dither at fractional pixels. The gameplay field has never been perceptible in the current build. This does not retroactively invalidate the rest of that QA — only the "field perceptible in gameplay" inference.

---

## 5. Before / After calibration table

**Current** = measured on the running app (canvas buffer or composited screenshot) or read from the exact source line. **Proposed** = this plan's recommendation, not implemented.

### 5.1 Home wash, tint and mode carry

| Parameter | Source | Current | Proposed | Basis |
|---|---|---|---|---|
| P0 horizon bottom alpha | [`canvasEngine.ts:432`](../lib/atmosphere/canvasEngine.ts:432) | 0.10 | **0.16** | measured composited lift at the bottom is only `+9…+12/255`; a 60 % raise makes the horizon a legible brand element |
| P0 top-edge alpha | [`canvasEngine.ts:438`](../lib/atmosphere/canvasEngine.ts:438) | 0.06 | **0.10** | computed 0.027 at y=120 — effectively invisible today |
| P2 tint alpha — home | [`canvasEngine.ts:421`](../lib/atmosphere/canvasEngine.ts:421) | 0.06 | **0.14** | mode delta is ΔR 8–13; 0.14 raises it to ≈ ΔR 16–17 and doubles overall tint presence |
| P2 tint alpha — gameplay | same | 0.08 | **0.16** | parity with home after the S2 fix |
| P2 tint alpha — low energy | same | 0.02 | **0.03** | keep the ratio |
| Low-energy field multiplier | [`canvasEngine.ts:66`](../lib/atmosphere/canvasEngine.ts:66) | 0.35 | 0.35 (keep) | already reads as "dimmed" |
| Hero safe band | [`canvasEngine.ts:500`](../lib/atmosphere/canvasEngine.ts:500) | binary erase of the whole composite | **Option A** (erase the field only; wash continues) | measured seam R −7 / G −5 / B −13 |
| Mode-change transition | `mode` event handler | none (pointer ripple only) | **one 320 ms `wash` impulse, strength 0.12, accent = target mode** | makes the mode change perceptible as an event, not just a static colour |

### 5.2 Scrim (`.gameplay-surface`)

| Stop | Source | Current | Proposed | Basis |
|---|---|---|---|---|
| 0 % (centre, under the cards) | [`globals.css:917`](../app/globals.css:917) | 0.86 | **0.84** | cards are opaque; the centre hides nothing |
| 55 % | [`globals.css:918`](../app/globals.css:918) | 0.80 | **0.66** | opens the mid-field between the cards and the gutters |
| 100 % (gutters) | [`globals.css:919`](../app/globals.css:919) | 0.60 | **0.42** | the only region designed to carry the field; 0.42 ≈ 2.6× the field transmission of 0.60 |
| Scrim colour | same | `rgba(21,18,43,·)` = the page base | unchanged | it is a *veil*, not a tint — keep it invisible as colour |
| Route wrapper background | [`app/game/layout.tsx:18`](../app/game/layout.tsx:18) | **opaque `rgb(21,18,43)`** | **removed** | the decisive fix; measured canvas contribution today = 0 px |

### 5.3 Idle sprites

| Parameter | Source | Current | Proposed | Basis |
|---|---|---|---|---|
| near spark alpha | [`canvasEngine.ts:322`](../lib/atmosphere/canvasEngine.ts:322) | 0.11–0.18 | **0.18–0.26** | effective mean 0.07 → ≈ 0.19; composited body delta on white spark ≈ +19 → ≈ +48/255 |
| far spark alpha | same | 0.05–0.10 | **0.09–0.14** | keeps depth separation at the same ratio |
| breathe curve | [`canvasEngine.ts:652`](../lib/atmosphere/canvasEngine.ts:652) | `0.62 + 0.38·sin` (0.24–1.00) | **`0.80 + 0.20·sin`** (0.60–1.00) | stops sparks from nearly vanishing for 40 % of the cycle |
| mote speed | [`canvasEngine.ts:323`](../lib/atmosphere/canvasEngine.ts:323) × `0.4` | 0.8–2.4 px/s | **3.2–7.2 px/s** (`8 + rnd*10`, factor unchanged) | today a mote takes 0.4–1.2 s per 1 px step; proposal = 1 px per 140–310 ms |
| chevron base alpha | [`canvasEngine.ts:355`](../lib/atmosphere/canvasEngine.ts:355) | 0.16–0.26 | **0.22–0.32** | chevrons are the most legible field element; modest raise |
| chevron reserve alpha | same | 0.10–0.14 | **0.16–0.20** | keeps the reserve visually subordinate |
| chevron speed | [`canvasEngine.ts:356`](../lib/atmosphere/canvasEngine.ts:356) | 4–9 px/s | 4–9 (keep) | already produces 1.7–3.8 px per 420 ms — perceptible once alpha is raised |
| counts (desktop / mobile / low) | [`:37`](../lib/atmosphere/canvasEngine.ts:37)–[`:42`](../lib/atmosphere/canvasEngine.ts:42) | 28/12/12, 10/6/6 | unchanged | performance contract |

### 5.4 Reactive field

| Parameter | Source | Current | Proposed | Basis |
|---|---|---|---|---|
| `SURGE_ALPHA_BASE` | [`canvasEngine.ts:52`](../lib/atmosphere/canvasEngine.ts:52) | 0.20 | **0.26** | surge must start above the raised idle chevron alpha (0.22–0.32) |
| `SURGE_ALPHA_PEAK` | [`:53`](../lib/atmosphere/canvasEngine.ts:53) | 0.62 | **0.88** | effective peak 0.47 → ≈ 0.81 with the recession change below |
| `SURGE_RECEDE_ALPHA` | [`:54`](../lib/atmosphere/canvasEngine.ts:54) | 0.08 | 0.08 (keep) | the losing family should stay quiet |
| `SURGE_OFFSET_PX` | [`:55`](../lib/atmosphere/canvasEngine.ts:55) | 6 | **10** | max travel is currently 6 px over 360 ms |
| `SURGE_DURATION_MS` | [`:50`](../lib/atmosphere/canvasEngine.ts:50) | 360 | **420** | +17 %; still one fixed window, never streak-scaled |
| `RECESSION_REVEALING` | [`:69`](../lib/atmosphere/canvasEngine.ts:69) | 0.80 | **0.92** | stops the reward from dimming the field by 24 % (measured) |
| `WRONG_ALPHA` | [`:60`](../lib/atmosphere/canvasEngine.ts:60) | 0.05 | **0.10** | 5 % field dim is unmeasurable after compositing |
| `WRONG_LIFT_ALPHA` | [`:61`](../lib/atmosphere/canvasEngine.ts:61) | 0.03 | **0.06** | 3 % → 6 % single flash |
| `WRONG_LIFT_MS` | [`:59`](../lib/atmosphere/canvasEngine.ts:59) | 80 | **120** | one extra frame of legibility |
| tier pulse | [`canvasEngine.ts:588`](../lib/atmosphere/canvasEngine.ts:588) | dur 420/520, r 34+t·16, strength 0.34/0.5 | keep | already the strongest element |

### 5.5 Entrance, route hand-off, micro-interactions

| Parameter | Source | Current | Proposed | Basis |
|---|---|---|---|---|
| card translate | [`globals.css:1006`](../app/globals.css:1006) / [`:1017`](../app/globals.css:1017) | 10 px | **14 px** | +40 % travel for a beat that is half-hidden today |
| entrance durations | [`:1056`](../app/globals.css:1056)–[`:1074`](../app/globals.css:1074) | 240/240/180/140/160, delays 0/32/96/168/220 (settles 380 ms) | keep beats, **stretch cards to 320 ms** and keep the same delays | settles at 460 ms — still under half a second |
| route crossfade | [`globals.css:746`](../app/globals.css:746) / [`:752`](../app/globals.css:752) | 140 ms | **100 ms** | the crossfade currently masks the first 140 ms of the entrance |
| `ambient-bob` / `ambient-drift` | [`globals.css:541`](../app/globals.css:541) / [`:553`](../app/globals.css:553) | 2400 ms / 4 px, 3200 ms / 2 px | keep | measured as the only clearly visible Home motion — do not over-drive it |
| `.decision-lift` hover/press | [`:651`](../app/globals.css:651)–[`:662`](../app/globals.css:662) | 4 px / `scale(0.985)` | keep | fine |
| `selection-dot` | [`:629`](../app/globals.css:629) | 140 ms, 0.9 → 1 | keep | fine |

---

## 6. WCAG AA verification of the proposed backgrounds

Computed with the WCAG 2.1 relative-luminance formula over the exact composited colour of the proposed tint alphas (accent over `#15122b`).

| Foreground | Background | Ratio | Verdict |
|---|---|---|---|
| `--text-primary #ffffff` | base `#15122b` | **18.21 : 1** | AAA |
| `--text-secondary #d4ceff` | base | **12.20 : 1** | AAA |
| `--text-muted #aaa3d5` | base | **7.72 : 1** | AAA |
| white | classic tint @0.14 `rgb(32,27,65)` | **16.74 → 16.0 : 1** | AAA |
| `#d4ceff` | classic tint @0.14 | **10.87 : 1** | AAA |
| `#aaa3d5` | classic tint @0.14 | **6.88 : 1** | AA (≥4.5) |
| `#aaa3d5` | time-attack tint @0.14 `rgb(48,24,66)` | **6.67 : 1** | AA |
| `#aaa3d5` | classic tint @0.18 | **6.60 : 1** | AA |
| `#aaa3d5` | time-attack tint @0.18 | **6.31 : 1** | AA |
| white | card face `#211d3a` | **16.14 : 1** | AAA |
| `#aaa3d5` | card face | **6.85 : 1** | AA |
| `#121212` | `--accent-time-attack #d93fd0` (`go!`, dock go, Lower button) | **4.97 : 1** | AA |
| white | `--accent-classic #6355cb` | **5.69 : 1** | AA |
| `#ffcc00` | base / card | **12.04 : 1** / **10.67 : 1** | AAA |

**Conclusion:** every proposed alpha keeps all text **≥ 6.31 : 1** and all control label pairs **≥ 4.97 : 1** — AA is preserved with margin, and the only near-miss (AAA at 7 : 1 for muted text) already exists today (`7.72 : 1` at 0.06 tint, `6.88 : 1` at 0.14). The focus ring `#22d3ee` on the base is unaffected by tint changes at these alphas.

---

## 7. Minimal file allowlist

### 7.1 To modify (required for the four symptoms)

| File | Change | Why it cannot be avoided |
|---|---|---|
| [`app/game/layout.tsx`](../app/game/layout.tsx:18) | remove `bg-[var(--surface-background)]`; keep `bg-grid` on exactly one of wrapper / `.gameplay-surface` | the **only** fix for S2 — measured canvas contribution in gameplay is 0 px |
| [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:421) | S1 draw-order reorder (or feathered band); tint/horizon alpha; spark alpha + speed + breathe; surge/wrong constants | all calibration constants live here |
| [`app/globals.css`](../app/globals.css:906) | `.gameplay-surface` scrim stops; entrance duration; route-crossfade duration | CSS-only levers, append/edit inside the appended block |
| [`app/game/[mode]/page.tsx`](../app/game/%5Bmode%5D/page.tsx:1) | **only if** the crossfade is retargeted per-route rather than by token | optional; the CSS retarget is preferred |

### 7.2 Frozen (must not change in the calibration pass)

`components/game/ComparisonBoard.tsx`, `components/game/GameCard.tsx`, `components/game/GameplayShell.tsx`, `components/game/GameplayStatus.tsx`, `components/game/DecisionControls.tsx`, `components/game/GameplayEntrance.tsx`, `components/game/ClassicGame.tsx`, `components/game/TimeAttackGame.tsx`, `components/home/LaunchDock.tsx`, `components/ModeButton.tsx`, `components/CategoryCard.tsx`, `lib/atmosphere/delegation.ts`, `lib/atmosphere/types.ts`, `lib/atmosphere/sprites.ts` (unless a bake-alpha change is approved), `lib/game/deck.ts`, `lib/highScores/*`, every provider/`lib/api/*`, `package.json`, `next.config.ts`, and gameplay rules/deck/scoring/storage/timing constants.

### 7.3 Expansion requests (owner approval required, **not** included in the above)

| # | File | Change | Why |
|---|---|---|---|
| E1 | [`components/home/HomeSetup.tsx:215`](../components/home/HomeSetup.tsx:215) | remove the render-time `useReducedMotion()` branch from `heroEntrance` (use CSS, as `GameplayEntrance` does) | fixes the reproduced **hydration error** under reduced motion (S5) |
| E2 | [`components/HighScoresModal.tsx:197`](../components/HighScoresModal.tsx:197) | stop appending `motion-reduce` from `useReducedMotion()`; use a CSS `@media (prefers-reduced-motion: reduce)` rule on `.high-scores-dialog` alone | second reproduced hydration mismatch (S5) |
| E3 | [`app/globals.css:806`](../app/globals.css:806) + engine | either route the engine alphas through the existing `--atmo-*` tokens or delete the unused tokens | S6 — prevents a future "I changed the token and nothing happened" |

---

## 8. Verification plan (for the implementation stage)

**Static**
1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build` — **only** if the owner confirms the dev server can be stopped afterwards; otherwise `[Not tested]` and record why.

**Runtime — 1440×900 and 390×844, all four states** (fresh screenshots into `docs/assets/visual-motion-calibration/`):

| # | Check | Pass condition |
|---|---|---|
| V1 | Home, canvas alpha at the hero-band centre vs 40 px outside | **ratio ≥ 0.75** (no binary hole); composited seam step **≤ 2/255** |
| V2 | Gameplay, canvas visible vs `display:none` | **non-zero** contribution, mean Δ ≥ 12/255 in the gutters |
| V3 | Gameplay, two frames 420 ms apart | non-zero moving pixels in the gutters (target ≥ 300 px > 2/255) |
| V4 | Classic ↔ Time Attack on Home | composited ΔR between modes **≥ 18/255** at the same point, plus a visible 320 ms wash |
| V5 | Correct reveal | hot-pixel count > 0 at t+90 ms **and** total lit field pixels **not lower** than the pre-guess frame |
| V6 | Wrong reveal | field dim measurable (≥ 8/255 drop) and the 120 ms lift visible |
| V7 | Entrance | five beats as specified; the incoming page animates **after** the crossfade; settles ≤ 470 ms; no double animation on one node |
| V8 | Architecture | `document.querySelectorAll("canvas").length === 1`; exactly one rAF chain (no second loop when navigating Home ↔ gameplay) |
| V9 | Draw-path discipline | zero per-frame `shadowBlur`, `ctx.filter`, `createRadialGradient`/`createLinearGradient` (patch `CanvasRenderingContext2D.prototype` counters and read them after 5 s) |
| V10 | Sprites offscreen | sprite canvases never in the document (`canvasCount === 1` proves it) |
| V11 | Audio | SFX-only: no BGM node, no `setInterval` in `lib/audio/*` |
| V12 | Reduced motion | three frames 600 ms apart identical (**max Δ 0**); opacity-only entrances; S1 cutout absent; **console clean** (this is where E1/E2 must land if approved) |
| V13 | LaunchDock | closed on the hero viewport; opens only when `#setup` is engaged and the real `go!` is offscreen; hidden while the keyboard heuristic is open; `inert`/dead-zone behaviour unchanged |
| V14 | Game-over overlay | unchanged: `bg-[#15122b]/90`, panel copy, restart focus |
| V15 | AA | re-measure §6 pairs on the rendered page (not just computed) |
| V16 | CLS / geometry | mobile `scrollWidth ≤ innerWidth` (currently 385 ≤ 390), no layout shift on mode switch, dock appearance shifts nothing |
| V17 | Legacy CSS | `git diff app/globals.css` shows only the intended edits inside the appended atmosphere block; the pre-existing 1–795 range is byte-identical |
| V18 | Hydration | `/` loads with **0 console errors** in both motion modes |

---

## 9. Open product decisions (owner sign-off)

| ID | Decision | Recommendation | Risk if not decided |
|---|---|---|---|
| **PD-1** | **Gameplay field visibility.** Remove the opaque route wrapper and open the gutter scrim to 0.42? | **Yes** — it is the only way the gameplay atmosphere exists at all | The gameplay background can never match Home; every future sprite calibration is untestable |
| **PD-2** | **Calibration intensity.** Tint 0.06 → 0.14 (home) / 0.16 (gameplay), horizon 0.10 → 0.16, spark alpha ×1.5 | Yes, but this is the single biggest change to the page's "feel" — review on 1440×900 and 390×844 before commit | Too strong = the near-black identity is lost; too weak = today's problem persists |
| **PD-3** | **Surge vs recession.** Raise `RECESSION_REVEALING` 0.80 → 0.92 so the reward stops dimming the field? | Yes | The correct-answer beat will keep reading as "nothing happened" |
| **PD-4** | **Route crossfade 140 ms → 100 ms** so the entrance is not masked | Yes (alternative: delay the entrance +140 ms, which adds perceived latency) | The 5-beat entrance stays half-invisible |
| **PD-5** | **Allowlist expansions E1 / E2** (reduced-motion hydration fixes) | Approve — they are reproduced console errors and directly contradict the stated reduced-motion constraint | Reduced-motion users keep a mismatch + a late repaint on Home |
| **PD-6** | **Token vs literal** (E3) | Route the engine through the existing `--atmo-*` tokens | Calibration values stay split across CSS and TS |
| **PD-7** | **S1 fix shape** — Option A (erase field only, wash continuous) vs Option B (feathered band) | Option A | B leaves a soft version of the same artefact |
| **PD-8** | **Mobile sprite budget** if alpha/speed rise | Keep 12 motes / 6 chevrons; verify p95 frame ≤ 24 ms at 390 | A brighter, faster field at 12 motes should stay inside budget, but it is unmeasured |

---

## 10. Evidence index and limits

**Screenshots (this stage's only repository writes besides this document):**

| File | Content |
|---|---|
| `docs/assets/visual-motion-calibration/home-classic-1440x900.png` | Home / Classic, 1440×900 — shows the darker horizontal band across the middle |
| `docs/assets/visual-motion-calibration/home-time-attack-1440x900.png` | Home / Time Attack, 1440×900 |
| `docs/assets/visual-motion-calibration/gameplay-classic-1440x900.png` | Classic gameplay, 1440×900 — flat base + grid, no field |
| `docs/assets/visual-motion-calibration/gameplay-time-attack-1440x900.png` | Time Attack gameplay, 1440×900 |
| `docs/assets/visual-motion-calibration/home-classic-390x844.png` | Home / Classic, 390×844 |
| `docs/assets/visual-motion-calibration/home-time-attack-390x844.png` | Home / Time Attack, 390×844 |
| `docs/assets/visual-motion-calibration/gameplay-classic-390x844.png` | Classic gameplay, 390×844 |
| `docs/assets/visual-motion-calibration/gameplay-time-attack-390x844.png` | Time Attack gameplay, 390×844 |
| `docs/assets/visual-motion-calibration/reduced-motion-home-1440x900.png` | Home under `prefers-reduced-motion: reduce` — the cutout is still present |

**Reference runs (not committed):** frame-pair and canvas-hidden control shots were captured, diffed with `sharp`, and deleted; every number they produced is recorded in §4.

**Limits — honest status**

* `[Not tested]` **DPR 2 / 3.** Both viewports reported `devicePixelRatio = 1`, and the mobile run is an emulated 390×844 viewport in desktop Chromium, not a real device.
* `[Not tested]` **Safari/Firefox.** All runtime evidence is Chromium.
* `[Not tested]` **Frame-time / p95 ≤ 24 ms** after a brightness/speed raise — no `performance_start_trace` was run in this stage.
* `[Not tested]` **Build** — not run (dev server in use, and this stage makes no code changes).
* `[Not verified perceptually]` Whether the proposed amplitudes *feel* right. All §5 numbers are measurable targets, not a perceptual acceptance; that needs the owner's eyes on both viewports.
* **Needs Verification [product-decision]** PD-1 … PD-8.
* **Needs Verification [inferred-from-codebase]** The S4 "entrance is masked by the crossfade" conclusion is derived from the animation timings and the crossfade's `opacity 0` start; it was not isolated with a screenshot because the two overlap inside a single 140 ms window.
* **Needs Verification [environment-specific]** The two hydration errors were reproduced under Playwright's `emulateMedia({ reducedMotion: "reduce" })`; an OS-level reduced-motion setting should reproduce the same client branch, but that was not separately exercised.
