# Visual & Motion Calibration — Postfix (F1–F9)

**Date:** 2026-11-22
**Stage:** Approved calibration postfix, executed against the independent QA in [`docs/visual-motion-calibration-qa-2026-11-22.md`](./visual-motion-calibration-qa-2026-11-22.md).
**Branch:** `lj-branch`, HEAD `ea650b7`. Nothing staged (`git diff --cached --name-only` empty) before or after.
**Runtime:** the owner's existing dev server on `http://localhost:3000` (reused; never stopped, restarted or rebuilt). Playwright/Chromium, `devicePixelRatio = 1`, foregrounded (`page.bringToFront()`), viewports 1440×900 and 390×844.
**Task type:** post-fix correction on an approved allowlist. Two files changed, nothing else.

---

## 1. Changed files

| File | Change |
|---|---|
| [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts) | (a) corrected the now-false P5 text-safe-band doc comment; (b) `readTuning()` `recedeReveal` fallback `0.92 → 1`; (c) P2 tint radial made surface-aware — wider radius + non-zero outer stop on `gameplay`. |
| [`app/globals.css`](../app/globals.css) | (a) removed the dead `.high-scores-dialog.motion-reduce` rule (F8); (b) updated the append-block comment to record the one approved byte-identical exception; (c) `--atmo-recede-reveal: 0.92 → 1`; (d) `.gameplay-surface` radial 100% stop `rgba(21,18,43,0.42) → rgba(21,18,43,0.30)`. |

Allowlist: **`[Pass]`** — the working tree shows the same 18 tracked modifications + untracked `lib/atmosphere/` the QA baseline recorded; only the two allowlisted files carry new edits. No dependency or config file changed.

(The `--atmo-recede-reveal` token lives in `app/globals.css` and is the runtime authority; the engine fallback only applies when the token is absent. Both were moved to `1` so the reveal is additive in source **and** at runtime. The token also drives `--card-light` during `revealing`, so the card backing is likewise no longer dimmed on a correct reveal — consistent with the strictly-additive intent.)

---

## 2. Exact calibration changes

### 2.1 `canvasEngine.ts` — safe-band comment (source now matches behaviour)
Old header claimed the bands are erased "so field luminance behind text is zero". After the S1 reorder the wash + vignette paint **after** the erase, so the comment was false. New wording states the bands erase only the sprite/chevron/impulse field and that the tinted wash still passes behind text with contrast from each surface's own opaque backing.

### 2.2 `canvasEngine.ts` — `recedeReveal` default
`num("--atmo-recede-reveal", 0.92)` → `num("--atmo-recede-reveal", 1)` ([`:320`](../lib/atmosphere/canvasEngine.ts:320)).

### 2.3 `canvasEngine.ts` — surface-aware P2 tint radial
```ts
const gameplayTint = surface === "gameplay";
const tintRadius = Math.max(cssW, cssH) * (gameplayTint ? 1.05 : 0.62);
const tintOuter  = gameplayTint ? tintAlpha * 0.6 : 0;
// radial centre (0.5w, 0.42h); stops: tintAlpha → tintOuter
```
Home keeps the original `0.62` radius and `0` outer stop, so Home carry is untouched. The buffered accent stays fully switched because `tintColor()` still selects `--accent-classic` / `--accent-time-attack`.

### 2.4 `globals.css`
- Dead rule removed:
  ```css
  .high-scores-dialog.motion-reduce[open],
  .high-scores-dialog.motion-reduce::backdrop { animation-duration: 0.01ms; }
  ```
  The reduced-motion path for the dialog is still covered by the CSS-only `@media (prefers-reduced-motion: reduce)` rule on `.high-scores-dialog`.
- `--atmo-recede-reveal: 1;`
- `.gameplay-surface` radial `… 0.30) 100%`.

---

## 3. F1–F9 results

| # | Item | Result | Evidence |
|---|---|---|---|
| **F1** | Desktop gameplay mode carry ≥18 at x=80 | **`[Fail]`** — measured ΔR **+4.23 / +4.94** at (80,300)/(80,450), **+4.57** centre gap, **+4.22** right gutter. Improved from QA's +1.9…+4.7 but still far below 18. | Composited 20×20 box average, §4. |
| **F2** | Mobile gameplay mode carry | **`[Partial]`** — ΔR **+4.76** at left margin (8,422); **+34.99** at (382,422) (that point lands on a card/edge element, not pure field). Still **geometry-bound**: 16 px side margins leave almost no field. | §4 |
| **F3** | Gutter field visibility ≥12 | **`[Partial]`** — canvas-on/off mean Δ **3.28** over the left-gutter region (97.2 % of pixels change, max 5). Up from QA's ~2.0 but below 12. | §4 |
| **F4** | Safe bands visible / comment correct | **`[Pass]`** — comment corrected to describe actual behaviour; bands remain non-erased and the field passes behind text, with AA intact (§5). | §2.1, §5 |
| **F5** | Correct reveal strictly additive (no field dim) | **`[Pass]`** — mean field α **69.333 (before) → 72.346 at +90 ms (+4.35 %, the surge) → 69.334 at settle (0.00 %)**. No dimming. | §5 |
| **F6** | Integer sprite coordinates preserved | **`[Pass]`** — draw path untouched; `Math.round(...)` quantisation unchanged. | source-read |
| **F7** | Foreground precondition | **`[Pass]`** — all measurements taken after `page.bringToFront()`; rAF/clear were 202/s in the instrumented window. | §5 |
| **F8** | Dead `.motion-reduce` rule removed | **`[Pass]`** — removed; append-block comment updated to record the approved exception. | §2.4 |
| **F9** | Mobile document heights | **`[Partial]`** — Home 2489, Classic 1252, Time Attack 1300 at 390×844. Reproduced, but the analysis's 1100/1166 are state-/art-dependent. `[environment-specific]`. | §5 |

### F1/F3 root cause — measured, not inferred
The approved levers (wider radial + non-zero outer stop + 100% scrim stop 0.30) cannot reach ΔR ≥ 18 because the `.gameplay-surface` scrim's ellipse is much larger than its 100% stop implies (size `120% 90%` ⇒ radii ≈ 1728 × 810). At x = 80 the gutter sits at ≈ 39–42 % of that ellipse — between the 0 % (0.84) and 55 % (0.66) stops, **not** at the 100 % stop. So the `0.42 → 0.30` change barely touches the gutter, and the scrim still knocks roughly 70 % off there.

A controlled diagnostic (in-browser overrides + forced rebake, no file edits) isolates the lever:

| Config | ΔR at (80,300) | ΔR at (80,450) |
|---|---|---|
| as-shipped (tint 0.16, scrim on) | 4.24 | 4.94 |
| tint 0.40, scrim on | 9.47 | 9.55 |
| tint 0.40, scrim **off** | 33.24 | 34.34 |
| tint 0.16, scrim **off** | 13.81 | 16.01 |

Two conclusions:
1. With the scrim on, even a **0.40** tint reaches only ≈ 9.5 — the tint token alone cannot close the gap.
2. With the scrim off, the *existing* 0.16 tint already gives ≈ 14–16, i.e. the visual suppression is the scrim, not the accent.

Reaching ΔR ≥ 18 therefore requires a change **outside the approved allowlist** — either the `.gameplay-surface` radial's *other* stops/size (so the gutter falls nearer the 100 % stop), or raising `--atmo-tint-alpha-gameplay`. Neither was authorised, so nothing further was applied. **Owner decision required** (§8).

---

## 4. Runtime — mode carry and field visibility

Method: one full `page.screenshot` clip per point, decoded to pixels in-page (data-URL → canvas → `getImageData`), 20×20 box average. Classic and Time Attack sampled at identical coordinates.

### Desktop 1440×900 (composited)
| Point | Classic R | Time Attack R | ΔR |
|---|---|---|---|
| 80,300 (left gutter) | 25.40 | 29.64 | **+4.23** |
| 80,450 (left gutter) | 25.52 | 30.46 | **+4.94** |
| 717,300 (centre gap) | 35.22 | 39.79 | **+4.57** |
| 1360,300 (right gutter) | 26.11 | 30.33 | **+4.22** |

Gutter field visibility (canvas visible vs `visibility:hidden`): **mean Δ 3.28**, 97.2 % of pixels > 2/255, max 5.

### Mobile 390×844
| Point | ΔR |
|---|---|
| 8,422 (left margin) | **+4.76** |
| 382,422 (right) | +34.99 (samples a card/edge, not pure field) |

Mobile is still **geometry-bound**: the cards stack and 16 px side margins leave essentially no gutter for the field to live in. Reaching a desktop-like target on mobile needs a layout change — an owner product call.

### Buffer
The canvas buffer keeps the mode accent fully switched (`tintColor()` unchanged); the shortfall is downstream (scrim), not in accent selection.

---

## 5. Verification matrix

| Check | Status | Evidence |
|---|---|---|
| `npx tsc --noEmit` | `[Pass]` | exit 0 |
| `npm run lint` | `[Pass]` | 0 errors, 95 warnings — all pre-existing (`.agents/`, `lib/api/worldbank.ts`, `lib/catalog/availability.ts`); none in an edited file |
| `npm run build` | `[Blocked]` | owner's `next dev` owns port 3000 and `.next`; not run, by design |
| One DOM canvas | `[Pass]` | `document.querySelectorAll("canvas").length === 1` on Home, Classic, Time Attack (desktop and mobile) |
| One rAF loop | `[Pass]` | instrumented over 1000 ms: `requestAnimationFrame` 202, `clearRect` 202 (one draw per frame) |
| No per-frame `shadowBlur` / `filter` | `[Pass]` | prototype setter counters: 0 / 0 over 1000 ms idle |
| No per-frame gradient (idle) | `[Pass]` | `createRadialGradient` 0, `createLinearGradient` 0 over 1000 ms idle (pre-existing `swell`/`glow` impulse gradients unchanged and only allocate while an impulse is active — disclosed in QA) |
| Reward non-dimming (V5) | `[Pass]` | mean α 69.333 → 72.346 (+4.35 %) at +90 ms → 69.334 (0.00 %) at settle |
| CLS | `[Pass]` | `PerformanceObserver('layout-shift', buffered)`, `hadRecentInput` excluded → **0.0022** |
| Reduced motion static frame | `[Pass]` | Classic gameplay under `reduce`: 600 ms pair → **0 px changed, max Δ 0**; no cutout |
| Console / page errors | `[Pass]` | **0 errors** across Home/Classic/Time Attack navigations (1 benign warning per page = harness readback / Motion reduced-motion notice) |
| Mobile geometry | `[Pass]` | `scrollWidth === clientWidth` on Home/Classic/Time Attack (**385 = 385**); no horizontal scroll |
| AA — Higher label | `[Pass]` | `rgb(21,18,43)` on `rgb(34,211,238)` ≈ **10.2 : 1** |
| AA — Lower label | `[Pass]` | `rgb(21,18,43)` on `rgb(217,63,208)` ≈ **4.83 : 1** (AA) |
| AA — focus ring | `[Pass]` | `#22d3ee` vs composited gutter, ≥ 3 : 1 (non-text) |
| Safe bands remain visible | `[Pass]` | field passes behind text (F4 behaviour) with AA intact; not erased |
| Gameplay rules/deck/scoring/storage/timing | `[Pass]` | untouched — only two allowlisted files changed |
| LaunchDock / game-over overlay | `[Not tested]` (this pass) | not exercised here; unchanged by these edits and verified in the prior QA |
| DPR 2/3, Safari, Firefox | `[Not tested]` | Chromium @ DPR 1 only |
| Impeccable detector | `[Pass]` (no new) | 4 findings, all pre-existing (`gradient-text` globals.css:227, two `bounce-easing` globals.css:470/471, `ai-color-palette` types/game.ts:69); none on a changed line |

---

## 6. Legacy-exception note

The append block in `globals.css` previously asserted "Everything above this line is byte-identical to the previous file." Removing the dead `.high-scores-dialog.motion-reduce` rule (F8) is an **explicitly approved exception** to that legacy byte-identical constraint. The comment was corrected to state the single exception rather than leaving a claim that is now false. No other line in the legacy region was touched.

---

## 7. Screenshots — `docs/assets/visual-motion-calibration/postfix/`

| File | Content |
|---|---|
| `home-classic-1440x900.png` | Home, Classic selected |
| `home-time-attack-1440x900.png` | Home, Time Attack selected |
| `gameplay-classic-1440x900.png` | Classic gameplay, settled |
| `gameplay-time-attack-1440x900.png` | Time Attack gameplay, settled |
| `home-classic-390x844.png` | Home, Classic, mobile |
| `home-time-attack-390x844.png` | Home, Time Attack, mobile |
| `gameplay-classic-390x844.png` | Classic gameplay, mobile |
| `gameplay-time-attack-390x844.png` | Time Attack gameplay, mobile |
| `reduced-motion-home-1440x900.png` | Home under `prefers-reduced-motion: reduce` |

---

## 8. Remaining items (open)

| # | Item | Qualifier |
|---|---|---|
| 1 | **Desktop gameplay ΔR ≥ 18 not reached** with the approved levers (measured ≈ 4.2–4.9). Diagnostic proves the `.gameplay-surface` scrim geometry is the blocker. Fixing it needs a change outside the allowlist: either retune the scrim's 0–55 %/100 % stops or size (so the gutter falls nearer the 100 % stop), or raise `--atmo-tint-alpha-gameplay`. | `[product-decision]` — owner approval for scope expansion |
| 2 | Gutter field visibility ≈ 3.28, short of the ≥ 12 concept target — same scrim cause as (1). | `[product-decision]` (coupled to item 1) |
| 3 | Mobile mode carry remains geometry-bound (16 px margins); needs a layout change to give the field a gutter. | `[product-decision]` |
| 4 | `npm run build` never run — dev server owns `.next`/port 3000. | `[Blocked]` |
| 5 | LaunchDock / game-over overlay and the 100 ms route crossfade were not re-exercised this pass (unchanged by these edits). | `[Not tested]` |
| 6 | DPR 2/3, Safari, Firefox not exercised. | `[Not tested]` |
| 7 | Mobile document heights 1100/1166 from the analysis not reproduced (Home 2489 / Classic 1252 / Time Attack 1300). | `[environment-specific]` |
| 8 | `lib/atmosphere/canvasEngine.ts` has no VCS baseline; its change is content-verified only. | `[capability-unavailable]` |

---

## 9. Sign-off

Implemented only the approved postfix: corrected the safe-band comment, moved `recedeReveal` to `1.0` (token + fallback), made the gameplay tint radial surface-aware with a non-zero outer stop, lowered the scrim's 100 % stop to 0.30, and removed the dead reduced-motion rule with the legacy exception recorded. Reward dimming (F5) is fixed and verified; the safe-band comment now matches behaviour (F4); invariants, AA, CLS, console, mobile geometry and reduced-motion statics all hold.

**F1/F3 are not met** on desktop, and the diagnostic shows the approved levers cannot meet them: the `.gameplay-surface` scrim, not the accent, suppresses the gutter field. Meeting the ≥ 18 / ≥ 12 targets requires an owner-approved change beyond the allowlist (scrim geometry or tint token). That decision is carried forward rather than resolved silently.
