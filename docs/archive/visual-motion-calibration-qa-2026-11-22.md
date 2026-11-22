# Visual & Motion Calibration — Independent QA

**Date:** 2026-11-22
**Stage:** Independent QA of the approved calibration implementation. **No code was modified.**
**Repository writes in this stage:** this document and screenshots under `docs/assets/visual-motion-calibration/qa/` only.
**Branch:** `lj-branch` (HEAD `ea650b7`). Nothing staged (`git diff --cached --name-only` empty).
**Runtime:** the owner's existing dev server on `http://localhost:3000` (reused; never stopped, restarted or rebuilt). Playwright/Chromium, `devicePixelRatio = 1`, viewports 1440×900 and 390×844.
**Claims under test:** [`docs/visual-motion-calibration-handoff-2026-11-22.md`](./visual-motion-calibration-handoff-2026-11-22.md) against [`docs/visual-motion-calibration-analysis-plan-2026-11-22.md`](./visual-motion-calibration-analysis-plan-2026-11-22.md), plus the prior `idle-sprites-*`, procedural-canvas-audio and immersive-motion documents.

> The handoff was treated as claims, not proof. Every number below was produced in this QA run unless a row explicitly says *source-read* or *computed*.

---

## 1. Allowlist result

`git status --porcelain` / `git diff --name-only` show 18 tracked modifications and 11 untracked entries. The analysis baseline recorded 17 modifications and the same 11 untracked entries, so a per-file drift comparison isolates what the calibration actually touched:

| File | Baseline changes (`analysis-plan` §1) | Now | Drift attributable to calibration |
|---|---|---|---|
| `app/game/layout.tsx` | not in diff | `6 +-` | **+6 → yes** |
| `app/globals.css` | `753 +` | `791 +` | **+38 → yes** |
| `components/HighScoresModal.tsx` | `27 +-` | `29 +-` | **+2 → yes** |
| `components/home/HomeSetup.tsx` | `124 +-` | `133 +-` | **+9 → yes** |
| `lib/atmosphere/canvasEngine.ts` | untracked (no VCS baseline) | untracked | **content-verified, not diff-verified** |
| every other tracked file (`[mode]/page.tsx` 33, `app/layout.tsx` 4, `app/page.tsx` 11, `CategoryCard` 19, `ModeButton` 8, `ClassicGame` 113, `ComparisonBoard` 11, `DecisionControls` 8, `GameCard` 51, `GameplayShell` 8, `GameplayStatus` 39, `TimeAttackGame` 130, `CategorySelector` 17, `DomainSelector` 8) | identical counts | identical counts | **no change** |

**Allowlist: `[Pass]`** for the four tracked files. **No dependency change:** `git diff --name-only -- package.json package-lock.json components.json next.config.ts tsconfig.json eslint.config.mjs postcss.config.mjs` returns empty, and `package.json` dependencies are unchanged (`motion`, `radix-ui`, `cn`, `lucide-react`, `class-variance-authority`, `next`, `react`, `react-dom`, `tailwindcss` only).

**Limitation `Needs Verification [capability-unavailable]`:** `lib/atmosphere/canvasEngine.ts` is untracked on `lj-branch`, so no diff can prove it contains *only* calibration edits. Its content was verified against the plan's exact numbers (§2.4 below) and against the plan's cited line numbers, which have shifted by the expected amount (e.g. the `readTuning` block adds ≈39 lines: `SURGE_*` constants remain at `canvasEngine.ts:50`–`:55`, the mote seed moved `:322` → `:361`).

---

## 2. Static verification

### 2.1 `app/globals.css` provenance
`git diff -U0 -- app/globals.css` produces exactly five hunks: four single-line replacements at **135 / 139 / 144 / 148** (`.high-scores-dialog` animation declarations that use `var(--motion-dur-base)`), and one append **`@@ -453,0 +454,783 @@`**. There are **no other edits** — no `:root` token was renamed, reordered or removed, `prefers-reduced-motion` blocks are intact, and the legacy keyframes are untouched.

* Calibration arithmetic: the analysis baseline recorded `753` changed lines (`4` modified lines = 8 changes ⇒ **745** appended) against today's **783** appended ⇒ the calibration appended **38 lines** and touched nothing else. **`[Pass]`** for "calibration edits are ≥ 806 / pre-existing region byte-identical to the pre-calibration state".
* **Caveat:** lines 135/139/144/148 are **not** byte-identical to `HEAD`. They come from the earlier (pre-calibration, uncommitted) motion work, not from this task — the baseline diff already contained them. Reported as a fact, not a defect.

### 2.2 `app/game/layout.tsx`
Source (`app/game/layout.tsx:22`) is now `className="relative min-h-dvh flex flex-col overflow-x-hidden"` — no `bg-[var(--surface-background)]`, no `bg-grid`. Runtime computed style of both `/game/*` wrappers: `background-color: rgba(0, 0, 0, 0)`. The grid is declared once, on `.gameplay-surface`. **`[Pass]`**

### 2.3 Engine tuning and token wiring (source)
* Constants match the approved table exactly: `SURGE_DURATION_MS 420`, `SURGE_ALPHA_BASE 0.26`, `SURGE_ALPHA_PEAK 0.88`, `SURGE_OFFSET_PX 10`, `WRONG_RECEDE_MS 180`, `WRONG_LIFT_MS 120`, `WRONG_ALPHA 0.1`, `WRONG_LIFT_ALPHA 0.06` (`canvasEngine.ts:50`–`:61`); mote alpha `0.18 + rnd·0.08` / `0.09 + rnd·0.05`, speed `8 + rnd·10`, breathe `0.8 + 0.2·sin` (`:361`, `:362`, `:696`); chevron alpha `0.22 + rnd·0.1` / `0.16 + rnd·0.04` (`:394`).
* `readTuning()` (`:303`) reads `--atmo-horizon-alpha`, `--atmo-top-alpha`, `--atmo-tint-alpha`, `--atmo-tint-alpha-gameplay`, `--atmo-tint-alpha-low`, `--atmo-recede-*`. It is called **only** from `rebakeAll()` (`:578`), i.e. from init, `resize()`, `setSurface()` and `setLowEnergy()`. No `getComputedStyle` call exists inside `step()`/`drawFrame()`. **`[Pass]`**
* Draw order (`drawFrame`, `:958`–`:981`): sprites → chevrons → impulses → `destination-out(safeLayer)` → `staticLayer` (wash) → `vignetteLayer`. Matches the S1 Option-A fix. **`[Pass]`**
* Remaining literals in the draw path are the spark/surge/wrong constants above, which the plan's E3 scope did not tokenise. No stale duplicate of a tokenised value was found.

### 2.4 CSS values (source)
* `--atmo-*`: `.16 / .1 / .14 / .16 / .03 / 1 / .92 / .55 / .75 / .35` (`globals.css:808`–`:819`) — identical to the approved table. Runtime `getComputedStyle(:root)` returns the same values.
* `.gameplay-surface` (`:944`): `background-color: transparent`, grid re-declared as two top layers, radial stops `0.84 / 0.66 / 0.42` (`:955`–`:957`).
* Entrance card keyframes travel `14px`, durations `320ms @0` / `320ms @32`, `180ms @96`, `140ms @168`, `160ms @220` (`:1041`–`:1112`).
* E1 hero rule (`:831`), E2 dialog rule (`:842`), 100 ms route-crossfade override (`:853`).

### 2.5 E1 / E2 source changes
* `HomeSetup.tsx`: the render-time `prefersReducedMotion ? { initial: false } : { initial: "hidden" }` ternary is gone; `heroEntrance` is now a constant (`:220`) and `data-atmo-safe="hero"` was added to the motion wrapper. `[Pass]`
* `HighScoresModal.tsx`: the conditional `${prefersReducedMotion ? "motion-reduce" : ""}` class append is gone from the dialog `className`. `[Pass]`
* Observation (not a defect): `HomeSetup.tsx` still branches on `prefersReducedMotion` for Motion's `transition.duration` (`:235`) and the `setupArrived` animate array (`:315`). Those are props, not SSR'd markup, and hydration was clean at runtime (§5.4).

### 2.6 Static checks
| Check | Status | Evidence |
|---|---|---|
| `npx tsc --noEmit` | `[Pass]` | exit 0 |
| `npm run lint` | `[Pass]` | exit 0, **0 errors**, 95 warnings — all pre-existing in `.agents/`, `lib/api/worldbank.ts`, `lib/catalog/availability.ts`; none in a calibration file |
| `npm run build` | `[Blocked]` | the owner's `next dev` owns port 3000 **and** `.next`; `next build` would replace the dev server's build output. Not run, by design. |
| `git status` / staged state | `[Pass]` | nothing staged; allowlist drift as §1 |

---

## 3. Runtime matrix — S1 (Home cutout)

Method: one coherent `getImageData` snapshot per state (full canvas buffer), then per-row mean alpha over the central 400 px; the seam detector is the largest adjacent-row jump **anywhere** in the buffer. Earlier attempts that compared two separate reads were discarded — the engine repaints between reads, which injected 8–13/255 of sprite noise into the seam metric (see §6 F7).

| Viewport | Hero rect | α 40 px above | α 2 px above top | α mid-band | α 2 px inside top | ratio mid/above | max adjacent-row jump (whole buffer) | band pixels lit |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | `56,319 1323×277` | 0.1703 | 0.1791 | **0.1958** | 0.1801 | **1.15** | **0.0047** (at y=54) | **100 %** |
| 390×844 | `16,320 353×234` | 0.1333 | 0.1395 | **0.1598** | 0.1438 | **1.199** | **0.0057** (at y=82) | **100 %** |
| 1440×900, reduced motion | `56,319 1323×277` | 0.1798 | 0.1882 | **0.2059** | 0.1896 | **1.145** | **0.0053** (at y=78) | 100 % |

The former artifact was a binary α=0 rect with a −7/−5/−13 composited step at a single row. Today the band is continuous, fully lit, and the worst adjacent-row jump in the entire buffer is 0.005 alpha *and is not at the hero edges*. Spot values also reproduce the handoff exactly (α 0.2078 inside, 0.1804 above at x=720). **S1: `[Pass]`** — no cutout, no seam, at both viewports and under reduced motion.

---

## 4. Runtime matrix — S2 (gameplay field, occlusion, contrast)

### 4.1 Occlusion
Control: canvas host `display:none` vs visible, composited screenshot diff.

| Region (1440×900) | % pixels Δ>2 | mean Δ | max Δ |
|---|---|---|---|
| whole viewport | 43.5 % | 3.37 | **144** |
| left gutter 0–155 | 33.0 % | 2.03 | 16 |
| centre gap 590–845 | **92.3 %** | **6.58** | **141** |
| right gutter 1280–1435 | 19.5 % | 1.74 | 144 |
| control band 692–900 | **82.4 %** | **7.31** | **146** |
| header band 0–116 | 1.8 % | 1.13 | 236 (boundary sprite) |

The analysis measured max Δ **0** in this state. The opaque-wrapper root cause is fixed and the canvas is decisive. **S2 occlusion: `[Pass]`.**

*Against the analysis's own V2 pass condition ("mean Δ ≥ 12/255 in the gutters") the side gutters reach only 1.7–2.0.* That is not a regression — it is a consequence of card geometry (two 432 px cards leave only 155 px side gutters) plus the vignette. See **F3**.

### 4.2 Sprite presence in the buffer (1440×900, x 200–700 windows)
`mean α 0.21–0.24`; sprite cores (`α>0.28`) present in every window (`left 84 px`, `centre gap 58 px`, `right 13 px`). Canvas buffer tint at the centre gap: classic `rgb(93,78,201) @0.204`, time-attack `rgb(220,60,205) @0.200` — the mode accent reaches the buffer.

### 4.3 Contrast (composited, sampled from the live page)
| Pair | Ratio | Verdict |
|---|---|---|
| white on composited `rgb(22,19,44)` (status strip) | **18.05 : 1** | AAA |
| `#aaa3d5` on the same | **7.66 : 1** | AAA |
| white on header `rgb(21,18,43)` | 18.21 : 1 | AAA |
| Higher label `rgb(21,18,43)` on `rgb(34,211,238)` | 10.08 : 1 | AAA |
| Lower label `rgb(21,18,43)` on `rgb(217,63,208)` | **4.83 : 1** | AA (plan computed 4.97; the real token pairing is slightly lower, still AA) |
| focus ring `#22d3ee` on composited gutter `rgb(35,31,71)` | **8.58 : 1** *(computed)* | passes ≥3:1 non-text |

No text sits on the canvas without either an opaque plate/button or ≥6:1 composited backing. **AA: `[Pass]`.**

### 4.4 Frozen surfaces
* Game-over overlay reached live: `position: absolute`, `bg lab(6.75 …)/0.9` (= `#15122b/90`), `backdrop-filter: blur(8px)`, panel `rgb(33,29,58)`, title “Game over”, buttons “Play again” (**focused**) and “Back to setup”, `z-index 50`. Unchanged. `[Pass]`
* LaunchDock on the hero viewport: `data-open="false"`, `data-keyboard="closed"`, `opacity 0`, `visibility hidden`, `pointer-events none`, `inert` present. `[Pass]`
* Audio: `lib/audio/audioEngine.ts` builds an `AudioBuffer` noise source, `createOscillator` and `createBufferSource`; **no `setInterval`** anywhere in `lib/audio`. SFX-only, untouched. `[Pass]` *(source-read)*

---

## 5. Runtime matrix — S3 (mode carry), S4 (motion), S5/E1/E2, E3

### 5.1 S3 — Home (1440×900 and 390×844)
Engine buffer switches accent at identical alpha (`rgb(85,74,193) @0.1765` → `rgb(198,57,193) @0.1765`; `rgb(93,78,201) @0.2039` → `rgb(216,59,206) @0.2039`). Composited 21×21-box deltas (Time Attack − Classic), desktop:

| Point | Classic | Time Attack | ΔR | ΔG |
|---|---|---|---|---|
| 720,120 | 35.7, 31.5, 71.4 | 55.8, 28.0, 72.3 | **+20.1** | −3.5 |
| 720,200 | 35.7, 30.8, 70.4 | 55.0, 27.6, 71.2 | **+19.3** | −3.2 |
| 300,150 | 30.9, 26.0, 59.4 | 42.4, 23.3, 59.8 | +11.5 | −2.7 |
| 720,640 | 40.3, 34.5, 78.5 | 63.6, 29.9, 79.5 | **+23.3** | −4.6 |
| 720,860 | 38.5, 33.6, 75.9 | 61.4, 29.0, 77.0 | **+22.9** | −4.6 |

92.3 % of the viewport changes by >4/255. Mobile: ΔR **+10.3 / +15.8 / +17.8 / +13.9** at four points, 93.4 % changed. **S3 Home: `[Pass]`** (V4's ≥18 is met centre-of-field; the off-centre left point is +11.5 as expected at the radial's edge).

### 5.2 S3 — gameplay (the central finding)
Same method, points chosen outside the cards in both modes (desktop: 155 px side gutters + 261 px centre gap; mobile: 16 px side margins, since the cards stack and their y-origin differs between modes).

| Viewport | Point | ΔR | ΔG | ΔB |
|---|---|---|---|---|
| 1440×900 | 80,300 (left gutter) | **+1.9** | −0.5 | 0 |
| 1440×900 | 1360,300 (right gutter) | **+2.0** | −0.6 | −0.1 |
| 1440×900 | 80,450 | **+2.3** | −0.7 | +0.1 |
| 1440×900 | 717,300 (centre gap) | **+4.7** | −0.7 | +0.8 |
| 390×844 | 8,422 (left margin) | **+4.3** | −0.8 | +0.3 |
| 390×844 | 382,422 (right margin) | **+3.1** | −0.6 | +0.2 |

The engine buffer at the same points shows a large accent difference (`rgb(26,17,65)` → `rgb(53,13,66)` left gutter; `rgb(93,78,201)` → `rgb(220,60,205)` centre gap), so the plumbing is right. What survives compositing is **ΔR ≈ 2–5/255 (≈1–2 % of range)** — below any reasonable "the background changed" threshold, and below V4's ≥18 pass condition. **S3 gameplay: `[Fail]`** against the owner's "noticeably adjust" intent. Classification and remediation in **F1/F2**; see §8 for the postfix scope.

The mobile numbers also **do not reproduce the handoff's "mobile gameplay gutter ΔR +12 / +28 (visible)"** at the side margins (F2).

### 5.3 S4 — idle motion (201 rAF/s, foreground tab)
| Surface | Composited 420 ms pair | Canvas buffer 420 ms pair |
|---|---|---|
| Home 1440×900 | **2302 px** >2/255 (0.178 %), 1243 px >10/255, max **216** | 2664 px, max 89 |
| Gameplay 1440×900 | **371 px** >2/255 (0.029 %), 24 px >10/255, max **14** | 731 px, max 86 |

Home is clearly alive (the `ambient-bob` chevron edge dominates at max 216). Gameplay is measurable but marginal; inside the 155 px gutters alone only **123 px** change, under V3's ≥300 target (F6).

### 5.4 S4 — reactive beats
Correct reveal, sampled on the engine buffer (Time Attack/Classic, foreground tab):

| t after click | hot px `α>0.45` | px `α>0.28` | max α | mean α | phase |
|---|---|---|---|---|---|
| before | 3 | 18 229 | 0.471 | 0.2205 | playing |
| **+57 ms** | **61** | 15 046 | **0.867** | 0.2124 | revealing |
| +116 ms | 53 | 14 067 | 0.784 | 0.2102 | revealing |
| +178 ms | 36 | 13 780 | 0.706 | 0.2098 | revealing |
| +368 ms | 27 | 13 765 | 0.475 | 0.2097 | revealing |
| +427 ms | **0** | 13 736 | 0.447 | 0.2097 | revealing |
| settled (playing) | 3 | 18 241 | 0.471 | 0.2206 | playing |

* The surge is real and now bright: hot pixels 3 → 61, peak α **0.867** (target 0.88). `[Pass]`
* **The reward still dims the whole field:** mean α 0.2205 → 0.2097 (**−4.9 %**), and threshold-crossing lit pixels fall **−17.5 %** at the surge and **−24.6 %** at settle. V5's "total lit field pixels **not lower** than the pre-guess frame" is therefore **not met** (F5).

Wrong reveal (Classic, wrong guess → game over): field mean α **+4.4 % (0.2206 → 0.2303)** in the first ~60 ms (the 120 ms white lift), chevron max α falls `0.471 → 0.388/0.373` (dim to 0.10), then the field settles at 0.1903 under the game-over recession. **Wrong beat: `[Pass]`** — both halves of the beat are measurable.

Entrance beats, live `document.getAnimations()` on a fresh `/game/time-attack` load: `entrance-card-current 320 ms @0`, `entrance-card-next 320 ms @32`, `entrance-or 180 ms @96`, `entrance-status 140 ms @168`, `entrance-controls 160 ms @220`; no running animations after ~500 ms (settle 380 ms ≤ 470 target). **`[Pass]`** — this is the calibrated 320 ms card stretch, not the old 240 ms.

Route crossfade: the 100 ms override is present at `globals.css:853`-`:858` and was not isolated at runtime (the direct `page.goto` navigations this QA used do not create a view transition). **`[Partial]`**, same limitation the handoff recorded.

### 5.5 S5 / E1 / E2 — reduced motion
`emulateMedia({ reducedMotion: "reduce" })` + fresh load:

| Check | Result |
|---|---|
| Console errors / page errors on `/` | **0 and 0** (was 2 hydration mismatches before) |
| Hero first paint | `h1`, `p`, `a`: `opacity: 1`, `transform: none` |
| Static frame | 600 ms pairs: **max Δ 0, 0 px changed** (twice) |
| Cutout | α above 0.1798 vs mid 0.2059, ratio 1.145, worst row jump 0.0053 |
| Classic gameplay static | 600 ms pair: **max Δ 0, 0 px** |
| Time Attack gameplay static | 458 px changed / max 236 — attributable to the visible 1 Hz timer, not the canvas |

**S5/E1/E2: `[Pass]`.**

### 5.6 E3 — token wiring (runtime proof)
| Step | Canvas α at (717, 378) |
|---|---|
| as shipped (`--atmo-tint-alpha: .14`) | 0.2078 |
| `documentElement.style.setProperty("--atmo-tint-alpha", "0.5")` + 1 px resize (forces `rebakeAll`) | **0.5412** |
| token removed + resize back | 0.2078 |

The engine consumes the token at bake time. Steady-state instrumentation over 1000 ms: **`getComputedStyle` 0 calls**, `clearRect` 201/s against a 201/s rAF cadence (⇒ exactly one draw per frame, one loop). **E3: `[Pass]`.**

### 5.7 Invariants
| Invariant | Status | Evidence |
|---|---|---|
| one DOM canvas | `[Pass]` | `document.querySelectorAll("canvas").length === 1` on Home, Classic, Time Attack, game-over, mobile, reduced motion |
| one rAF chain | `[Pass]` | `clearRect` 201/s vs rAF 201/s — one draw per frame, no second loop |
| sprites offscreen | `[Pass]` | canvas count 1 in every state; sprite sheets are `document.createElement("canvas")` never appended |
| no per-frame `shadowBlur` / `filter` | `[Pass]` | prototype setter counters: 0 / 0 over 1200 ms idle **and** 700 ms hover |
| no per-frame gradient (idle) | `[Pass]` | `createRadialGradient` 0, `createLinearGradient` 0 over 1200 ms idle |
| no per-frame gradient (**impulses**) | `[Fail]` (pre-existing, disclosed) | source `canvasEngine.ts:882` (`swell`) and `:914` (`glow`) allocate a radial per active frame. Unchanged by the calibration; the handoff discloses it. My hover test did not land on a gradient-emitting target, so this row is source evidence only |
| SFX-only audio | `[Pass]` | source-read, no `setInterval`, no BGM path |
| timing constants | `[Pass]` | constants table read back, §2.3 |
| LaunchDock / inert / dead-zone | `[Pass]` | §4.4 |
| game-over overlay | `[Pass]` | §4.4 |
| AA | `[Pass]` | §4.3 |
| CLS | `[Pass]` | `PerformanceObserver('layout-shift', buffered)` → **0** on Home |
| console | `[Pass]` | 190 messages, **0 errors**, 21 warnings = this harness's `getImageData` readback notices + Motion's reduced-motion notice |
| mobile `scrollWidth ≤ 390` | `[Pass]` | **385** on Home, Classic and Time Attack (`clientWidth` 385) |
| mobile document heights | `[Partial]` | Classic **1252** ✓; Home **2489**; Time Attack **1300**; the analysis's `1100 / 1166` were not reproduced — same limitation the handoff recorded |
| desktop Home height | fact | 2242 |
| DPR 2/3, Safari, Firefox | `[Not tested]` | Chromium @ DPR 1 only |

---

## 6. Findings

Severity scale: **Major** = the calibrated intent is not achieved / a user-visible regression; **Moderate** = intent partly achieved or an undisclosed behaviour change; **Minor** = cosmetic or documentation drift; **Trivial** = dead code.

### F1 — Desktop gameplay mode carry is not perceptible — **Major**, *spec gap*
* **Expected:** "mode selection noticeably adjusts the background" (owner intent), V4 ≥ 18/255.
* **Observed:** ΔR **+1.9 … +4.7** at gutter/centre-gap points, 1440×900, box-averaged over 21×21 px; engine buffer shows the accent fully switched (`rgb(93,78,201)` → `rgb(220,60,205)`).
* **Cause (measured, not inferred):** the tint radial is `radial-gradient(... Math.max(cssW,cssH)·0.62)` centred at 50 %/42 %, so at x = 80 the accent is already ≈0.55 of peak; the `.gameplay-surface` scrim's nominal 0.42 gutter stop is an *ellipse-edge* value that is ≈0.70 at the mid-edge where the gutters are; and the vignette (`rgba(9,7,25,0.42)` at the edge) then desaturates what is left. Arithmetic from the measured buffer reproduces the measured composite to within ~1/255.
* **Classification:** spec gap — the approved numbers were implemented exactly; the numbers themselves do not reach the intent on the wide desktop canvas. Not an implementation bug, and the handoff disclosed it (`Needs Verification [product-decision]`), but QA must record it as a **failed intent**, not a partial.
* **Owner decision required.**

### F2 — Mobile gameplay mode carry does not reproduce the handoff's +12 / +28 — **Moderate**, *verification gap*
* **Expected (handoff §3):** "mobile gameplay gutter ΔR **+12 / +28** (visible)".
* **Observed:** +4.3 and +3.1 at the 16 px side margins (390×844, 11×11 box averages), with the buffer showing `rgb(79,67,158)` → `rgb(158,49,164)`.
* **Classification:** the claim could not be reproduced. Either the handoff sampled single pixels (which would be dominated by a moving sprite) or different points. Either way the *visible* mobile carry is ≈3–4/255, i.e. the same failure mode as F1. Severity Moderate because the record currently overstates the result.

### F3 — Gameplay field visibility in the outer gutters — **Moderate**, *spec gap*
* **Expected:** V2 "mean Δ ≥ 12/255 in the gutters".
* **Observed:** canvas-on/off mean Δ **2.03** (left gutter) and **1.74** (right gutter); **6.58** centre gap; **7.31** control band; max Δ 141–146 where sprites/chevrons sit.
* **Classification:** spec gap, not a regression — the S2 occlusion fix itself is proven (`[Pass]`). At 1440 px the two 432 px cards leave only 155 px of gutter, and the vignette reduces the field there to roughly the base colour. Worth an owner note: the concept "field lives in the gutters" only holds where the gutter is wide (centre gap / below the cards), not at the page edges.

### F4 — Gameplay text-safe bands no longer suppress the wash — **Moderate**, *spec gap (undisclosed)*
* **Expected (engine doc comment `canvasEngine.ts:12`-`:13`, analysis §4.2):** the safe bands are erased so "field luminance behind text is zero"; gameplay bands measured α = 0 before this task.
* **Observed:** after the S1 reorder the erase removes only sprites/chevrons/impulses; the wash + vignette are painted *after* it and therefore cover every band. Gameplay buffer: y 700–800 `mean α 0.2326`, `max 0.294` (was 0). Composited canvas contribution in the control band (692–900): mean **7.31**, 82.4 % of pixels changed.
* **Impact check:** no contrast regression — status text measures 18.05:1 (white) / 7.66:1 (muted) on the real composited backing, and the decision-control labels sit on fully opaque buttons (≥4.83:1). The header band is effectively untouched (mean 1.13, 1.8 % of pixels).
* **Classification:** spec gap. The S1 fix is a single global draw path, so the gameplay bands necessarily changed with it; the handoff describes the fix only in terms of Home's hero band and does not disclose that gameplay's header/status/control bands stopped being field-free. The engine's own doc comment is now false. Owner should confirm this is acceptable and the comment should be corrected in the next pass.

### F5 — The reward still dims the field — **Moderate**, *spec gap*
* **Expected:** V5 "hot-pixel count > 0 at t+90 ms **and** total lit field pixels **not lower** than the pre-guess frame"; handoff "recession no longer fights the surge".
* **Observed:** hot pixels 3 → 61 and peak α 0.867 (surge works), but mean field α **0.2205 → 0.2097 (−4.9 %)** and pixels above α 0.28 **18 229 → 13 746 (−24.6 % at settle, −17.5 % during the surge)**.
* **Cause:** `--atmo-recede-reveal: 0.92` still multiplies the whole wash; the wash sits just under the 0.28 threshold, so an 8 % reduction drops a large area below it.
* **Classification:** spec gap — the approved 0.92 improves the old −24 % *mean* dip to −4.9 %, but the metric the plan itself specified still fails. If the owner wants a strictly additive reward beat, the reveal target needs to be 1.0 (or the wash needs to be threshold-independent).

### F6 — Gameplay idle spark motion remains marginal — **Minor**, *spec gap*
* **Observed:** composited 420 ms pair = 371 px >2/255 (0.029 %), only 24 px >10/255, max Δ 14; the 155 px side gutters alone give 123 px, under V3's ≥300.
* **Fact correction to the handoff:** the handoff states the idle field is "no longer `Math.round`-zeroed". `Math.round(x − destination/2)` is still in `drawSprites` (`canvasEngine.ts:700`) and `drawChevrons` (`:787`); the improvement comes from the speed change (3.2–7.2 px/s), not from removing quantisation. A mote still dwells 1 px for ~140–310 ms, so most frames are byte-identical.
* **Classification:** spec gap (in the plan's own table the speed change was expected to suffice); the handoff's causal claim is inaccurate.

### F7 — Environment: the page must be foregrounded or all motion measurements are invalid — **verification note**
* With the tab in the background the same page ran at **2 rAF/s** and the canvas buffer returned byte-identical frames for ~900 ms, which would read as "frozen field". `page.bringToFront()` restored **201–204 rAF/s** and all measurements in this document were taken in that state.
* Recorded so the handoff's motion numbers can be re-checked if they were captured without foregrounding. `Needs Verification [environment-specific]` — no accusation, just an unverified precondition.

### F8 — Legacy `.motion-reduce` CSS is now dead — **Trivial**, *implementation nit*
`globals.css:151`-`:154` still carries `.high-scores-dialog.motion-reduce[open] { animation-duration: 0.01ms }`, but E2 removed the class from the JSX. Harmless duplication of the new `@media (prefers-reduced-motion: reduce)` rule at `:842`. No functional impact.

### F9 — Mobile document heights — **Minor**, *verification gap*
Classic gameplay 1252 reproduced exactly; Home 2489 and Time Attack 1300 do not match the analysis's 1100/1166. Same limitation the handoff recorded; state-/art-dependent. `Needs Verification [environment-specific]`.

---

## 7. Verdict

| Area | Verdict |
|---|---|
| Allowlist / provenance | **`[Pass]`** (4 tracked files + untracked engine content-verified; no deps; legacy CSS region intact) |
| `tsc` / `lint` | **`[Pass]`** / **`[Pass]`** (0 errors) |
| Build | **`[Blocked]`** (owner's dev server owns `.next` and port 3000) |
| S1 Home cutout | **`[Pass]`** desktop, mobile, reduced motion |
| S2 gameplay occlusion | **`[Pass]`**; field-visibility *threshold* **`[Partial]`** (F3) |
| S3 Home mode carry | **`[Pass]`** (+19…+23 desktop, +10…+18 mobile) |
| S3 gameplay mode carry | **`[Fail]`** desktop and mobile (ΔR 2–5; F1/F2) |
| S4 idle motion | **`[Partial]`** Home `[Pass]`, gameplay `[Partial]` (F6) |
| S4 correct surge | **`[Partial]`** — surge `[Pass]`, "no field dimming" `[Fail]` (F5) |
| S4 wrong beat | **`[Pass]`** |
| S4 entrance / settle | **`[Pass]`** (320/320@32/180@96/140@168/160@220, settle 380 ms) |
| Crossfade 100 ms | **`[Partial]`** — source only |
| S5 / E1 / E2 | **`[Pass]`** — 0 console errors, static frame, hero settled, no cutout |
| E3 token wiring | **`[Pass]`** — runtime override changes the bake; 0 `getComputedStyle`/s in steady state |
| Invariants | `[Pass]` except transient `swell`/`glow` gradients (pre-existing, disclosed) |
| AA / CLS / console / geometry | **`[Pass]`** / **`[Pass]`** / **`[Pass]`** / `[Partial]` (heights only) |

**Overall: conditional pass.** The calibration is implemented faithfully and the two headline defects it targeted are gone: the Home cutout is fixed by construction (worst adjacent-row alpha jump 0.005 across the whole buffer), the gameplay canvas is no longer occluded (max composited Δ 144 vs the previous 0), reduced motion is hydration-clean and genuinely static, and the tokens are wired at bake time. Static checks are clean and nothing outside the allowlist moved.

**Postfix is required** — not because the code deviates from the approved plan, but because two of the plan's own acceptance conditions are unmet in gameplay (F1/F2 mode carry, F5 reward dimming) and one undisclosed behaviour change needs an owner decision (F4). Per the postfix condition, F1/F2/F5 are **spec gaps**, not implementation bugs: patching only the code would leave the approved table wrong.

---

## 8. Postfix scope (minimal, owner-approval gated)

Only if the owner wants the gameplay intent met. Nothing here is a bug fix; every line changes an approved number.

1. `lib/atmosphere/canvasEngine.ts` — make the tint radial surface-aware so the accent survives to the gutters: enlarge the gameplay tint radius (e.g. `Math.max(cssW, cssH) * (surface === "gameplay" ? 1.05 : 0.62)`), or add a non-zero outer stop. Target: composited ΔR ≥ 18 at x = 80 on 1440×900.
2. `lib/atmosphere/canvasEngine.ts` — `readTuning` fallback + `:316` `recedeReveal` default: if a strictly additive reward beat is wanted, set the reveal target to `1.0` (token `--atmo-recede-reveal`) and re-measure the V5 "not lower" clause.
3. `app/globals.css` — **only if** (1) cannot reach the target without washing out the card column: lower the `.gameplay-surface` 100 % stop (`:957`) from `0.42` toward `0.30`.
4. Documentation only: correct the engine doc comment (`canvasEngine.ts:12`-`:13`) about safe bands suppressing "field luminance behind text to zero", and the stale `.motion-reduce` rule (`globals.css:151`).

No other file needs to change. Mobile side margins are constrained by geometry (16 px), so F2 may remain unfixable without a layout change; that is an owner product call.

---

## 9. Open items

| # | Item | Qualifier |
|---|---|---|
| 1 | Gameplay desktop mode carry (F1) and the correct-reveal dimming (F5) need an owner decision on the numbers in §8 | `[product-decision]` |
| 2 | Gameplay safe bands no longer field-free (F4) — confirm acceptable, then fix the stale comment | `[product-decision]` |
| 3 | Mobile mode carry cannot reach the desktop target without a layout change (F2) | `[product-decision]` |
| 4 | `npm run build` never run — dev server owns `.next` | `[Blocked]` |
| 5 | Route crossfade 100 ms verified in source only | `[Not tested]` |
| 6 | Mobile document heights 1100/1166 not reproduced (F9) | `[environment-specific]` |
| 7 | DPR 2/3, Safari, Firefox not exercised | `[Not tested]` |
| 8 | `swell`/`glow` impulse gradients measured in source only; the runtime hover probe missed a gradient-emitting target | `[Not tested]` (source-confirmed) |
| 9 | Whether the handoff's motion numbers were captured with the tab foregrounded (F7) | `[environment-specific]` |
| 10 | `lib/atmosphere/canvasEngine.ts` has no VCS baseline, so its diff is content-verified only | `[capability-unavailable]` |
| 11 | Dev-server PID 17272 was not independently confirmed; port 3000 answered HTTP 200 throughout | `[environment-specific]` |

---

## 10. Screenshots (`docs/assets/visual-motion-calibration/qa/`)

| File | Content |
|---|---|
| `home-classic-1440x900.png` | Home / Classic (no cutout band) |
| `home-time-attack-1440x900.png` | Home / Time Attack |
| `gameplay-classic-1440x900.png` | Classic gameplay, settled |
| `gameplay-time-attack-1440x900.png` | Time Attack gameplay, settled |
| `gameplay-classic-revealed-1440x900.png` | Classic, reveal state (surge/recession) |
| `gameplay-classic-gameover-1440x900.png` | Classic game-over overlay with focus on “Play again” |
| `home-classic-390x844.png` | Home / Classic, mobile |
| `home-time-attack-390x844.png` | Home / Time Attack, mobile |
| `gameplay-classic-390x844.png` | Classic gameplay, mobile |
| `gameplay-time-attack-390x844.png` | Time Attack gameplay, mobile |
| `reduced-motion-home-1440x900.png` | Home under `prefers-reduced-motion: reduce` |

Sign-off: static checks and runtime verification completed as listed; the `[Blocked]`, `[Not tested]` and `Needs Verification` rows in §3–§7 are honest limits of this run, not implied passes. No application file was modified by this QA stage.
