# Visual & Motion Calibration — Final Targeted Calibration

**Date:** 2026-11-22
**Stage:** Approved final calibration, executed against [`docs/visual-motion-calibration-postfix-2026-11-22.md`](./visual-motion-calibration-postfix-2026-11-22.md) and [`docs/visual-motion-calibration-qa-2026-11-22.md`](./visual-motion-calibration-qa-2026-11-22.md).
**Branch:** `lj-branch`, HEAD `ea650b7`. Nothing staged (`git diff --cached --name-only` empty) before and after.
**Runtime:** the owner's existing dev server on `http://localhost:3000` (reused; never stopped, restarted or rebuilt). Playwright/Chromium, `devicePixelRatio = 1`, foregrounded, viewports 1440×900 and 390×844.
**Task type:** post-fix correction on an approved allowlist. One file changed.

---

## 1. Changed files

| File | Change | Allowlist |
|---|---|---|
| [`app/globals.css`](../app/globals.css:809) | `--atmo-tint-alpha-gameplay: 0.16 → 0.26` | yes |
| [`app/globals.css`](../app/globals.css:956) | `.gameplay-surface` radial 100 % stop `rgba(21,18,43,0.30) → rgba(21,18,43,0.10)` | yes |
| [`app/globals.css`](../app/globals.css:932) | adjacent scrim comment `42 %` → `10 %`, plus two lines recording why the gutter stop is low | yes (same edit's own documentation) |
| [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:464) | **no change** | not needed |

**Allowlist: `[Pass]`.** `git diff --name-only` still returns the same 18 pre-existing tracked modifications, none staged. `app/globals.css` hunk headers are the four known legacy single-line hunks at `135 / 139 / 144 / 148` plus the append block — **no new hunk in the legacy region**. File went 1234 → 1236 lines (the two added comment lines).

**Why the engine needed no change.** The surface-aware tint radial already consumes the token at bake time: `tintAlpha` resolves from `tuning.tintGameplay` when `surface === "gameplay"` ([`:464`](../lib/atmosphere/canvasEngine.ts:464)), and the widened radius / non-zero outer stop from the previous pass ([`:496`](../lib/atmosphere/canvasEngine.ts:496)) already scale off that value. Raising the token therefore raises both the inner stop (`0.26`) and the outer floor (`0.26 × 0.6 = 0.156`). No radial adjustment was required, so the allowlist's conditional edit was not taken.

---

## 2. Exact values applied

```css
/* app/globals.css:809 */
--atmo-tint-alpha-gameplay: 0.26;

/* app/globals.css:952-957 */
radial-gradient(
  120% 90% at 50% 45%,
  rgba(21, 18, 43, 0.84) 0%,
  rgba(21, 18, 43, 0.66) 55%,
  rgba(21, 18, 43, 0.10) 100%
);
```

The two middle stops (`0.84` at 0 %, `0.66` at 55 %) and the `120% 90%` size are **unchanged**. Only the 100 % stop moved. Runtime read-back after the edit: `--atmo-tint-alpha-gameplay` = `.26`; computed `background-image` of `.gameplay-surface` ends `rgba(21, 18, 43, 0.1) 100%`.

---

## 3. Mode carry — Classic vs Time Attack, composited

Method: 20×20 px clip per point, decoded in-page (data-URL → canvas → `getImageData`), **3 samples per point averaged** over ~360 ms, tab foregrounded. Classic and Time Attack sampled at identical coordinates on identical routes (`/game/{mode}?category=movie-series-rating`).

### Desktop 1440×900

| Point | Before C | Before TA | **Before ΔR** | After C | After TA | **After ΔR** |
|---|---|---|---|---|---|---|
| 80,300 (left gutter) | 25.40 | 29.64 | **+4.24** | 27.10 | 33.47 | **+6.37** |
| 80,450 (left gutter) | 25.52 | 30.46 | **+4.94** | 27.04 | 33.68 | **+6.64** |
| 717,300 (centre gap) | 35.22 | 39.78 | **+4.56** | 36.29 | 42.88 | **+6.59** |
| 1360,300 (right gutter) | 26.11 | 30.33 | **+4.22** | 27.82 | 34.14 | **+6.32** |
| 720,720 (below cards) | — | — | — | 37.94 | 47.73 | **+9.79** |

"Before" was re-measured in this run at the pre-edit values (tint `.16`, scrim `0.30`) and reproduces the postfix §4 table to ±0.05, which validates the harness.

### Mobile 390×844

| Point | After C | After TA | **After ΔR** | Note |
|---|---|---|---|---|
| 8,422 (left margin) | 54.81 | 62.51 | **+7.70** | 16 px margin — real field |
| 382,422 (right margin) | 101.77 | 137.91 | +36.14 | lands on card edge, not field |
| 195,700 | 108.27 | 98.21 | −10.06 | cover-art region, not field |

Mobile **before** is the postfix document's `+4.76` at (8,422); it was not re-measured in this run because that would require reverting the edit.

### Result vs the ≥ 18 target

**`[Fail]` — desktop gameplay ΔR reaches +6.32…+6.64, not ≥ 18.**

The gain is real — every sampled point improved by ≈ +2.1/255 (≈ +50 % relative) — and the fallback was **not** needed for contrast, but the target is not met and the approved values were **not exceeded** to force it.

**Why the number moved so little — measured, not inferred.** The `120% 90%` ellipse centred at `50% 45%` on 1440×900 has radii ≈ 1728 × 810. At x = 80 the gutter sits at ≈ 39–42 % of that ellipse — that is, **between the 0 % (0.84) and 55 % (0.66) stops**, nowhere near the 100 % stop. Moving the 100 % stop from `0.30 → 0.10` therefore changes almost nothing at the sampled gutters. The entire +2.1 improvement comes from the tint token (`0.16 → 0.26`), which is consistent with the postfix diagnostic (tint `0.40` with the scrim on reached only ≈ 9.5).

Reaching ΔR ≥ 18 requires moving the **0 % / 55 % stops or the ellipse size** — outside this allowlist. Not applied; carried forward as item 1 in §8.

---

## 4. Gutter field visibility

Canvas visible vs `visibility:hidden`, composited full-viewport diff, 1440×900.

| Region | Before mean Δ (postfix) | **After mean Δ** | % px > 2/255 | max Δ |
|---|---|---|---|---|
| Left gutter 0–155 | 3.28 | **8.40** | 100 % | 21 |
| Right gutter 1285–1440 | (1.74 in QA) | **8.13** | 97 % | 14 |
| Centre gap 590–845 | (6.58 in QA) | **10.29** | 93.9 % | 19 |
| Control band 692–900 | (7.31 in QA) | **12.64** | 88.8 % | 21 |

Side-gutter field visibility more than doubled (3.28 → 8.40) and the field is now visible across the whole left gutter band rather than a thin fraction. It is still below the ≥ 12 concept target in the side gutters (the centre gap and control band clear it). Same root cause as §3, same open decision.

---

## 5. AA gate — measured on the real composited backing

Method: for each text node the glyph colour is set to `transparent`, the element's own rect is screenshotted, and the WCAG ratio is computed against the **mean** and the **5th/95th-percentile luminance** of that true composited backing (canvas + scrim + card included). The conservative "worst" column is the minimum of those three. Control labels sit on fully opaque buttons, so their ratio is a direct token pairing.

| Pair | Desktop worst | Mobile worst | Required | Verdict |
|---|---|---|---|---|
| White mode header (16 px bold) | **17.70 : 1** | **17.70 : 1** | 4.5 | `[Pass]` |
| Muted `rgb(212,206,255)` 12 px | **11.86 : 1** | **11.84 : 1** | 4.5 | `[Pass]` |
| Card title white 24 px bold | **14.09 : 1** | **16.60 : 1** | 3.0 (large) | `[Pass]` |
| Muted "Higher or lower?" 14 px | **11.01 : 1** | **9.33 : 1** | 4.5 | `[Pass]` |
| **Higher** label `rgb(21,18,43)` on `rgb(34,211,238)` | **10.08 : 1** | same token pair | 4.5 | `[Pass]` |
| **Lower** label `rgb(21,18,43)` on `rgb(217,63,208)` | **4.83 : 1** | same token pair | 4.5 | `[Pass]` (≥ 4.5) |
| Focus ring `rgb(34,211,238)` 3 px solid vs composited gutter | **11.56 : 1** | — | 3.0 (non-text) | `[Pass]` |

**Fallback status: not applied.** No required pair fell below AA, so the approved `scrim ~0.14 / tint ~0.20` fallback was not triggered. The lowest margin is the **Lower** label at 4.83 : 1 (opaque button, unaffected by either edited value), and the tightest *field-dependent* pair is mobile muted text at 9.33 : 1 — comfortably clear.

---

## 6. Verification matrix

| Check | Status | Evidence |
|---|---|---|
| `npx tsc --noEmit` | `[Pass]` | exit 0 |
| `npm run lint` | `[Pass]` | 0 errors, 95 warnings — byte-identical count to the QA baseline; all in `.agents/`, `lib/api/worldbank.ts`, `lib/catalog/availability.ts`; none in a changed file |
| `npm run build` | `[Blocked]` | the owner's `next dev` owns port 3000 and `.next`; not run, by design |
| Allowlist / provenance | `[Pass]` | one file edited, engine untouched; 5 known globals.css hunks only; nothing staged |
| One DOM canvas | `[Pass]` | `querySelectorAll("canvas").length === 1` on Home, Classic, Time Attack, game-over, both viewports, reduced motion |
| One rAF loop / one draw per frame | `[Pass]` | 1000 ms window, foregrounded: `requestAnimationFrame` 201, `clearRect` 201 (1:1); repeated twice, identical |
| Per-frame `shadowBlur` | `[Pass]` | non-zero setter calls **0** / 1000 ms idle |
| Per-frame `filter` | `[Pass]` | non-zero setter calls **0** / 1000 ms idle |
| Per-frame gradient allocation | `[Pass]` (idle) | `createRadialGradient` **0**, `createLinearGradient` **0** / 1000 ms idle |
| `getComputedStyle` in steady state | `[Pass]` | **0** calls / 1000 ms idle (tokens read only at bake) |
| Offscreen sprites | `[Pass]` | 1 canvas in every state; `drawImage` 8241/s are blits from non-DOM sprite sheets |
| CLS | `[Pass]` | `PerformanceObserver('layout-shift', buffered)`, `hadRecentInput` excluded → **0.0022** |
| Desktop geometry | `[Pass]` | `scrollWidth === clientWidth === 1440` |
| Mobile geometry | `[Pass]` | `scrollWidth === clientWidth === 385`, no horizontal scroll; Classic docHeight 1272 |
| Reduced-motion static frame | `[Pass]` | Classic gameplay under `reduce`, 600 ms pair → **0 px changed, max Δ 0**, 1 canvas |
| Console / page errors | `[Pass]` | **0 errors, 0 warnings** across fresh Home → Classic → Time Attack navigations (no hydration mismatch) |
| Game-over overlay | `[Pass]` | `position: absolute; inset: 0; z-index: 50`, `lab(6.75 …)/0.9` = `#15122b/90`, `backdrop-filter: blur(8px)`, title “Game over”, “Play again” focused. Unchanged |
| LaunchDock / inert / dead-zone | `[Pass]` | `data-open="false"`, `data-keyboard="closed"`, `inert` present, `opacity 0`, `visibility hidden`, `pointer-events none` |
| Card cover art preserved | `[Pass]` | 2 `<img>` both `complete` with natural size 780 × 1102 / 780 × 1170; canvas visible vs hidden **inside the cover art = 0 px changed, max Δ 0** — the field cannot reach opaque card art |
| Home accent carry unchanged | `[Pass]` | Home (untouched `--atmo-tint-alpha: 0.14`) Classic → TA: ΔR **+20.03** at 720,120 and **+22.46** at 720,640 — matches QA `+20.1 / +23.3` |
| Gameplay rules / deck / scoring / storage / timing | `[Pass]` | untouched — only two CSS values plus a comment changed |
| SFX-only audio | `[Pass]` | untouched by this pass; source-read in prior QA (no scheduler, no BGM) |
| Impeccable detector | `[Pass]` (no new) | 3 findings, all pre-existing and off the changed lines: `gradient-text` `globals.css:227`, two `bounce-easing` `globals.css:470`/`:471` |
| Perceptual acceptance | `[Not tested]` | no human reviewer in this run; not claimed |
| DPR 2/3, Safari, Firefox | `[Not tested]` | Chromium @ DPR 1 only |

---

## 7. Screenshots — `docs/assets/visual-motion-calibration/final/`

| File | Content |
|---|---|
| `home-classic-1440x900.png` | fresh Home, Classic mode (`data-mode=classic`) |
| `home-time-attack-1440x900.png` | Home, Time Attack selected via the real radio control (`data-mode=time-attack`, verified) |
| `gameplay-classic-1440x900.png` | Classic gameplay, settled |
| `gameplay-time-attack-1440x900.png` | Time Attack gameplay, settled |
| `home-classic-390x844.png` | fresh Home, Classic, mobile |
| `home-time-attack-390x844.png` | Home, Time Attack, mobile (verified switch) |
| `gameplay-classic-390x844.png` | Classic gameplay, mobile |
| `gameplay-time-attack-390x844.png` | Time Attack gameplay, mobile |
| `reduced-motion-home-1440x900.png` | Home under `prefers-reduced-motion: reduce` |
| `gameplay-classic-gameover-1440x900.png` | Classic game-over overlay, “Play again” focused |
| `verify-gameplay-classic-1440x900.png` | the live frame used for the visual look |

> Note: `final/` already contained files with these names before this pass. They were **overwritten** by the captures in this run, so every file above now reflects the applied values.

---

## 8. Remaining items (open)

| # | Item | Qualifier |
|---|---|---|
| 1 | **Desktop gameplay ΔR ≥ 18 not reached** — measured **+6.32 … +6.64** at the gutters. The 100 % scrim stop cannot move the gutters because they sit between the 0 % (0.84) and 55 % (0.66) stops of a 1728 × 810 ellipse. Closing the gap needs the **0 %/55 % stops or the ellipse size** retuned (or a much higher tint), all outside this allowlist. | `[product-decision]` — requires scope expansion |
| 2 | Side-gutter field visibility 8.40 (target ≥ 12) — same scrim cause as (1); centre gap 10.29 and control band 12.64 already clear it. | `[product-decision]` (coupled to 1) |
| 3 | Mobile gameplay carry stays geometry-bound at 16 px margins (+7.70 at the left margin); a desktop-like target needs a layout change. | `[product-decision]` |
| 4 | `lib/atmosphere/canvasEngine.ts:317` fallback is still `0.16` while the token is `0.26`. It only applies when the token is absent (the comment there says fallbacks equal the calibrated values). Left untouched because the allowlist conditions the engine edit on the radial needing adjustment. | `[inferred-from-codebase]` — docs-consistency nit |
| 5 | `npm run build` never run — dev server owns `.next`/port 3000. | `[Blocked]` |
| 6 | Mobile document height 1272 for Classic vs 1252 recorded by QA — art/state dependent. | `[environment-specific]` |
| 7 | DPR 2/3, Safari, Firefox not exercised. | `[Not tested]` |
| 8 | Perceptual/UX acceptance of the brighter field not assessed by a human in this run. | `[Not tested]` |
| 9 | Mobile "before" mode carry (+4.76) is cited from the postfix document, not re-measured here. | `[Not tested]` in this run |

---

## 9. Sign-off

Applied exactly the approved final calibration and nothing more: gameplay scrim 100 % stop `0.30 → 0.10`, `--atmo-tint-alpha-gameplay 0.16 → 0.26`, plus the adjacent comment so the file does not assert a stale `42 %`. The engine needed no change because it already consumes the token at bake time.

What improved and is verified at runtime: side-gutter field visibility **3.28 → 8.40**, centre gap 10.29, control band 12.64; desktop mode carry roughly +50 % relative (**+4.2…+4.9 → +6.3…+6.6**); Home carry, cover art, game-over overlay, LaunchDock/inert, one canvas, one rAF, zero per-frame shadow/filter/gradient, CLS 0.0022, 0 console errors, byte-static reduced-motion frame, and mobile geometry all hold. AA passes on the real composited backing for every required pair, so the fallback was **not** applied.

What did not: **ΔR ≥ 18 is not reached** on desktop, and side-gutter visibility remains under the ≥ 12 concept target. Both trace to the scrim's inner stop geometry, which this allowlist does not include. That decision is carried forward, not resolved silently, and the approved values were not exceeded to manufacture the number.

---

## 10. Owner acceptance (2026-11-22)

The owner reviewed the measured results and accepted the current calibration as final:

- Desktop gameplay mode carry **ΔR +6.32 … +6.64** and side-gutter field visibility **8.40** are accepted as-is.
- The **≥ 18 ΔR** and **≥ 12 side-gutter** targets are not pursued further. They remain documented limitations that would require retuning the scrim's 0 %/55 % stops or ellipse geometry.
- The AA gate passed on the real composited backing; the `0.14 / 0.20` fallback was not applied.
- No further code changes were made for this acceptance.
