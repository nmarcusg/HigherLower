# Visual & Motion Calibration — Implementation Handoff

**Date:** 2026-11-22
**Stage:** Approved calibration implementation (S1–S6 + E1–E3).
**Authoritative source:** [`docs/visual-motion-calibration-analysis-plan-2026-11-22.md`](./visual-motion-calibration-analysis-plan-2026-11-22.md).
**Runtime:** owner's dev server on `http://localhost:3000` (reused, never stopped/restarted). Playwright/Chromium at 1440×900 and 390×844, `devicePixelRatio = 1`.

---

## 1. Changed files (exact approved allowlist)

| File | Change |
|---|---|
| [`app/game/layout.tsx`](../app/game/layout.tsx:17) | Removed the opaque `bg-[var(--surface-background)]` **and** the now-duplicated `bg-grid` from the `/game/*` wrapper, so the fixed atmosphere canvas is no longer occluded (S2). Grid now lives only on `.gameplay-surface`, which re-declares it. |
| [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:49) | S1 draw-order reorder; S3/S4 constant calibration; spark alpha/speed/breathe; `readTuning()` token wiring (E3); recession targets sourced from `--atmo-recede-*`. |
| [`app/globals.css`](../app/globals.css:806) | Updated `--atmo-*` tokens; new `--atmo-tint-alpha-gameplay` / `--atmo-tint-alpha-low`; `.gameplay-surface` scrim stops; entrance card travel + duration; appended reduced-motion hero rule (E1), dialog reduced-motion rule (E2), and route-crossfade override. **All edits are in the appended region (line ≥ 806); the pre-existing 1–795 range is untouched by this task.** |
| [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:215) | Removed the render-time `useReducedMotion()` branch from `heroEntrance`; SSR and client now emit identical `initial`/`animate` (E1). |
| [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:197) | Removed the client-only `motion-reduce` class append from the dialog `className` (E2). |

No other file was modified. Frozen files (gameplay/deck/scoring/storage/providers/timing/LaunchDock/delegation/sprites baker/GameplayEntrance/GameplayShell/ComparisonBoard/GameCard/GameplayStatus/DecisionControls/audio/configs/manifests) are unchanged.

---

## 2. Calibration applied (exact analysis values)

### S1 — Home cutout (draw order)
`clear → sprites/chevrons/impulses → destination-out(safeLayer) → static wash → vignette`.
The text-safe band now erases only the field; the wash/vignette are painted after it, so the band is invisible by construction. One canvas, one rAF, no new allocation, no `shadowBlur`/`filter`/gradient in the draw path.

### S3/S4 — mode carry, wash, sparks, reactive field
| Parameter | Before | After |
|---|---|---|
| tint alpha home / gameplay / low | 0.06 / 0.08 / 0.02 | **0.14 / 0.16 / 0.03** |
| horizon alpha | 0.10 | **0.16** |
| top-edge alpha | 0.06 | **0.10** |
| near spark alpha | 0.11–0.18 | **0.18–0.26** |
| far spark alpha | 0.05–0.10 | **0.09–0.14** |
| spark speed | 2–6 ×0.4 (0.8–2.4 px/s) | **8–18 ×0.4 (3.2–7.2 px/s)** |
| breathe curve | `0.62 + 0.38·sin` (0.24–1.00) | **`0.80 + 0.20·sin` (0.60–1.00)** |
| chevron base alpha | 0.16–0.26 | **0.22–0.32** |
| chevron reserve alpha | 0.10–0.14 | **0.16–0.20** |
| `SURGE_ALPHA_BASE` | 0.20 | **0.26** |
| `SURGE_ALPHA_PEAK` | 0.62 | **0.88** |
| `SURGE_OFFSET_PX` | 6 | **10** |
| `SURGE_DURATION_MS` | 360 | **420** |
| `RECESSION_REVEALING` | 0.80 | **0.92** |
| `WRONG_ALPHA` | 0.05 | **0.10** |
| `WRONG_LIFT_ALPHA` | 0.03 | **0.06** |
| `WRONG_LIFT_MS` | 80 | **120** |
| gameplay scrim (0 % / 55 % / 100 %) | 0.86 / 0.80 / 0.60 | **0.84 / 0.66 / 0.42** |
| entrance card travel | 10 px | **14 px** |
| entrance card duration | 240 ms | **320 ms** (delays 0/32 kept) |
| route crossfade | 140 ms | **100 ms** (appended override) |
| mobile sprite budget | 12 motes / 6 chevrons | **unchanged** (analysis table) |

### E3 — token wiring
The engine now reads `--atmo-horizon-alpha`, `--atmo-top-alpha`, `--atmo-tint-alpha`, `--atmo-tint-alpha-gameplay`, `--atmo-tint-alpha-low`, `--atmo-recede-*` via `readTuning()` inside `rebakeAll()` — i.e. at init, resize, mode change and surface change — never per frame.

---

## 3. S1–S6 results (measured)

| # | Result | Evidence |
|---|---|---|
| **S1** | `[Pass]` | Home 1440×900 canvas α: band-mid `0.2078`, 40 px above `0.1804`, 40 px inside `0.2000` — continuous, ratio inside/outside ≈ 1.15 (was `0` inside). Mobile 390×844 band-mid `0.1608` vs above `0.1373`. No binary hole; wash continuous across the band. |
| **S2** | `[Pass]` | Gameplay canvas visible-vs-`display:none`: whole-viewport mean Δ 6.27, **max Δ 225**, 51.6 % pixels changed (was max Δ 0). Centre-gap mean 9.83, max 192, 73 % changed. Sprite pixels are visible. |
| **S3** | `[Pass]` Home / `[Partial]` desktop gameplay | Home composited Classic→Time Attack **ΔR +20 / +23 / +23** at four points (target ≥ 18). `data-mode` and canvas tint both switch (buffer `rgb(98,78,201)` → `rgb(216,59,206)`). Desktop gameplay gutter ΔR is only **+2…+3** (see §6 deviation); mobile gameplay gutter ΔR **+12 / +28** (visible). |
| **S4** | `[Pass]` idle motion / `[Partial]` reactive beat | Idle sparks now move: Home frame-pair (420 ms) **272 px changed**, max Δ 157; gameplay whole-canvas **333 px changed** (0.026 %), max Δ 219 — no longer `Math.round`-zeroed. Entrance beats measured via `getAnimations()`: card-current 320 ms @0, card-next 320 ms @32, or 180 ms @96. Reactive constants applied exactly; a wrong reveal was observed dimming the field (hot α>0.45 px 12→0, max α 120→111). The correct-answer surge was not deterministically captured in this run (the sampled reveal was a miss) → see §6. |
| **S5** | `[Pass]` | With `prefers-reduced-motion: reduce`, Home produced **0 console errors** (196→197 messages, 5–6 warnings, all Canvas2D readback from the test harness + one Motion reduced-motion notice — no hydration warnings). Hero `opacity: 1`, `transform: none` at first paint. Static frame: frame-pair diffs 1 px (max Δ 3) then **0 px**. No cutout (band-mid α 0.2078 > outside 0.1804). |
| **S6** | `[Pass]` | `getComputedStyle(:root)` returns the calibrated tokens (`.16/.1/.14/.16/.03/.92`), and the engine consumes them (tint/horizon/recession track the tokens; values are read only in `rebakeAll`). |

---

## 4. Verification matrix

| Check | Status | Evidence |
|---|---|---|
| `npx tsc --noEmit` | `[Pass]` | exit 0 |
| `npm run lint` | `[Pass]` | exit 0, 0 errors (warnings are pre-existing in `.agents/`/`lib/api`; none in changed files) |
| `npm run build` | `[Blocked]` | owner's dev server owns `.next`/port 3000; build not run to avoid disturbing it |
| S1 no seam / no cutout | `[Pass]` | α sampling above |
| S2 canvas contribution | `[Pass]` | max Δ 225 visible-vs-hidden |
| S3 mode carry | `[Pass]` home / `[Partial]` desktop gameplay | see §3 |
| S4 idle spark motion | `[Pass]` | 272 / 333 px moved per 420 ms |
| S4 reactive surge/wrong | `[Partial]` | wrong-beat dim observed; correct surge not captured deterministically |
| S4 entrance beats + settle | `[Pass]` | 320 ms cards, measured settle ≤ 380 ms (≤ 470 target) |
| Crossfade 100 ms | `[Partial]` | appended override present in source; view-transition timing not runtime-isolated |
| One canvas | `[Pass]` | `document.querySelectorAll("canvas").length === 1` in every state |
| One rAF | `[Partial]` | single canvas + engine mount-once design; concurrent rAF chains not independently counted |
| Per-frame `shadowBlur`/`filter` | `[Pass]` | source scan: only a documentation comment; zero real usages |
| Per-frame gradient allocation (idle) | `[Pass]` | 0 `createRadial/LinearGradient` calls over 1200 ms steady state |
| Gradient allocation during impulses | `[Not tested]` | `swell`/`glow` impulse kinds create a radial gradient per active frame — pre-existing, unchanged, outside the calibration table (see §6) |
| Console errors | `[Pass]` | 0 errors in all four states and under reduced motion |
| Mobile `scrollWidth` | `[Pass]` | 385 ≤ 390 in all states |
| Mobile document heights | `[Partial]` | Classic gameplay `scrollHeight = 1252` (matches); Home 2489; Time Attack 1300. The analysis's `1100 / 1166` figures were not reproduced — see §6 |
| CLS | `[Not tested]` | changes are opacity/transform/background/alpha only (no layout property touched); reasoned, not observed |
| LaunchDock / game-over / legacy CSS | `[Pass]` | frozen files untouched; globals.css edits confined to line ≥ 806 (verified: hunk content only in the appended block) |
| SFX-only audio | `[Pass]` | audio layer untouched |
| DPR 2/3, Safari/Firefox | `[Not tested]` | Chromium @ DPR 1 only |

---

## 5. Screenshots (`docs/assets/visual-motion-calibration/after/`)

- `home-classic-1440x900.png`
- `home-time-attack-1440x900.png`
- `gameplay-classic-1440x900.png`
- `gameplay-time-attack-1440x900.png`
- `_tmp-gameplay-classic-canvas-hidden.png` — S2 control (canvas host hidden)
- `reduced-motion-home-1440x900.png`
- `home-classic-390x844.png`
- `home-time-attack-390x844.png`
- `gameplay-classic-390x844.png`
- `gameplay-time-attack-390x844.png`

---

## 6. Deviations & open items

- **`Needs Verification [product-decision]` — transient mode wash impulse.** §5.1 proposed a 320 ms `wash` impulse (strength 0.12) on the `mode` event. It was **not** added: under the approved S1 draw order the impulse is drawn before the band erase and would be erased by the hero safe band (it sits at screen centre), so it cannot deliver its intended effect on Home. S3 is instead carried by the tint/wash alpha raise plus the S1 fix, exactly as the task's S3 section frames it ("apply the calibrated tint/wash alphas"). Adding a non-erased variant would be a new product call.
- **`Needs Verification [product-decision]` — desktop gameplay mode contrast.** With the exact approved numbers, the desktop gameplay gutter composite changes only ΔR ≈ 2–3 between modes, because the tint radial's edge-fade plus the radial scrim's actual geometry (≈0.70 mid-edge, not the 0.42 100 %-stop) leave little accent in the wide desktop gutters. Mobile gameplay is visibly different (ΔR 12–28). Widening the tint radial or further lowering the scrim would exceed the approved calibration numbers and is left to the owner.
- **`Needs Verification [environment-specific]` — mobile document heights.** Classic gameplay `1252` reproduced; Time Attack measured `1300` and Home `2489`, none matching the analysis's `1100 / 1166`. These figures look state-/card-art-dependent; not asserted as pass.
- **Correct-answer surge** was not deterministically captured (the sampled reveal was a miss). Wrong-beat dim was observed. Constants verified in source with the exact values.
- **Impulse gradient allocation.** `swell`/`glow` impulses allocate a radial gradient per active frame (pre-existing, not in the calibration table). Idle steady-state allocation is 0. The hard "zero per-frame gradient" invariant holds for the static field but not for those two transient impulse kinds.
- **Build** `[Blocked]` (dev server), **DPR 2/3 / Safari / Firefox / CLS** `[Not tested]`.

---

## 7. Sign-off

Completed: S1 draw-order fix, S2 occlusion fix, S3/S4 calibration and token wiring, E1/E2 hydration fixes. Static checks pass (0 errors). Runtime evidence is Chromium @ DPR 1 at 1440×900 and 390×844; four-state screenshots captured; reduced-motion page is console-clean and static with no cutout; `scrollWidth 385 ≤ 390`. Unverified items and two product decisions are listed in §6 and carried forward.
