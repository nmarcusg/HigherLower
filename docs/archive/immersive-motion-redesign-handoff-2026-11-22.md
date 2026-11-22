# Immersive Motion Enhancement — Code Stage Handoff

**Date:** 2026-11-22
**Stage:** Code (+ verification, + postfix)
**Task type:** Visual change + interaction enhancement (motion layer)
**Status:** Implementation complete. Two verification findings found and fixed. One check blocked, two partial.
**Source of truth:** `docs/immersive-motion-redesign-plan-2026-11-22.md` (authoritative), then the design, then the analysis. None of those three documents was modified.

---

## 1. Approved scope executed

The owner-approved scope was executed as written: the motion layer from the design, on the Home and Gameplay surfaces, plus the approved route-level `<ViewTransition>` (E1–E3), the streak-escalating five-tier ladder, two Home-only ambient loops, and the reduced-motion fidelity upgrade.

No layout, theme, copy, dependency, provider, API, or route change beyond E1/E2. No gameplay rule, score, deck, timer, or storage semantics were touched.

---

## 2. Changed-file set

16 files: 15 modified, 1 added. Every file is inside the approved allowlist.

### 2.1 Approved expansions (E1–E4)

| # | File | Change | Evidence |
|---|---|---|---|
| E1 | [`app/page.tsx`](app/page.tsx:1) | Imports `ViewTransition` from `react`; wraps `<HomeSetup />` with `enter`/`exit` keyed `{"nav-forward": "nav-forward", default: "none"}` and `default="none"` | [`app/page.tsx:9`](app/page.tsx:9) |
| E2 | [`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:49) | Same wrapper around the `ClassicGame` and `TimeAttackGame` returns only. `redirect` / `notFound` / `DerivedGameState` early returns are unwrapped and their order is unchanged | [`app/game/[mode]/page.tsx:49`](app/game/[mode]/page.tsx:49), [`:64`](app/game/[mode]/page.tsx:64) |
| E3 | [`types/view-transition.d.ts`](types/view-transition.d.ts:1) | New file: `/// <reference types="react/canary" />` with a comment explaining why | whole file |
| E4 | `tsconfig.json` | **Not used.** E3 type-checked on the first attempt | see §3 |

### 2.2 Tier A

| # | File | Change | Landmark |
|---|---|---|---|
| 1 | [`app/globals.css`](app/globals.css:455) | Appended motion layer: second `:root` with the duration/easing/distance/delay tokens, five new keyframes, variant classes reusing existing keyframes, `(hover: hover) and (pointer: fine)`-gated hover utility, `@starting-style` selection-dot pop, ambient loops inside `prefers-reduced-motion: no-preference`, appended reduced-motion fidelity rules, and the `::view-transition` route CSS | tokens [`:456`](app/globals.css:456), `value-land` [`:502`](app/globals.css:502), `tally-bump` [`:514`](app/globals.css:514), `row-cascade` [`:623`](app/globals.css:623), `selection-dot` [`:629`](app/globals.css:629), `decision-lift` [`:651`](app/globals.css:651), ambient gating [`:669`](app/globals.css:669), reduced-motion fidelity [`:704`](app/globals.css:704), view transition [`:741`](app/globals.css:741) |
| 1b | [`app/globals.css`](app/globals.css:134) | Retimed the four dialog in/out rules from a literal `200ms` to `var(--motion-dur-base)` / `var(--motion-ease-out)` (authorised by plan item 13). These are the **only** four original declarations changed in the file | [`:134`](app/globals.css:134)–[`:149`](app/globals.css:149) |
| 2 | [`components/game/GameCard.tsx`](components/game/GameCard.tsx:21) | `enterHandoff` / `enterDelay` props, `data-result`, Motion-driven enter-only handoff (`±10px`, 240 ms, in-out), `tint-step` on tint + border, `value-land` on the next card's value block. Native `<img>`, the `aria-live` wrapper, attribution and plate geometry untouched | [`:21`](components/game/GameCard.tsx:21), [`:61`](components/game/GameCard.tsx:61), [`:115`](components/game/GameCard.tsx:115), [`:134`](components/game/GameCard.tsx:134) |
| 3 | [`components/game/ComparisonBoard.tsx`](components/game/ComparisonBoard.tsx:11) | Optional `phase` prop; OR badge fades to `opacity-50` over 140 ms during `revealing`. No layout or stagger change | [`:11`](components/game/ComparisonBoard.tsx:11), [`:43`](components/game/ComparisonBoard.tsx:43) |
| 4 | [`components/game/DecisionControls.tsx`](components/game/DecisionControls.tsx:24) | Press/hover retimed onto `.decision-lift` (90 ms tap with `scale(0.985)`, 140 ms hover lift gated to fine pointers). `disabled:opacity-45`, `disabled:hover:translate-y-0`, the `5px 5px 0` ring and focus-visible behaviour preserved. No handler change | [`:24`](components/game/DecisionControls.tsx:24) |
| 5 | [`components/game/GameplayStatus.tsx`](components/game/GameplayStatus.tsx:1) | Optional `bump` and `tier`; value-derived `key` restarts the tally beat; t3+ decorative ring and streak line (both `aria-hidden`, absolutely positioned, zero layout impact). Default off, so the countdown never bumps. `role="progressbar"` / `aria-value*` / markup order unchanged | [`:1`](components/game/GameplayStatus.tsx:1), [`:36`](components/game/GameplayStatus.tsx:36) |
| 6 | [`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:49) | Display-only `resolveTier`, `openingItemId` handoff gate, fixed off-ladder wrong beat on the board, tier passed to the status. `handleGuess`, the 1500 ms reveal timer, deck logic, high-score writes, keyboard handling and the game-over panel are untouched | `resolveTier` [`:59`](components/game/ClassicGame.tsx:59), gate [`:111`](components/game/ClassicGame.tsx:111), tier [`:131`](components/game/ClassicGame.tsx:131), cards [`:293`](components/game/ClassicGame.tsx:293) |
| 7 | [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:67) | Same tier derivation from the cumulative correct count; `.timer-urgent` added to the timer numeral while urgent; delta label retimed to `float-up-brief` (380 ms) / `float-up-reveal` (700 ms); handoff props. `INITIAL_TIME`, `BONUS_CORRECT`, `PENALTY_WRONG`, `REVEAL_MS_*`, the 1000 ms interval, the 460 ms shake window, `guessLocked` and `aria-live` are untouched | `resolveTier` [`:67`](components/game/TimeAttackGame.tsx:67), urgency [`:383`](components/game/TimeAttackGame.tsx:383), delta [`:393`](components/game/TimeAttackGame.tsx:393) |
| 8 | [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:178) | `data-ambient` on `<main>`, one shared `IntersectionObserver` for both hosts, chevron and `go!` offset marked as ambient hosts, `transitionTypes: ["nav-forward"]` on `router.push`. Hero entrance variants, setup-arrival pulse and `go!` geometry unchanged | observer [`:76`](components/home/HomeSetup.tsx:76), `data-ambient` [`:178`](components/home/HomeSetup.tsx:178), chevron [`:236`](components/home/HomeSetup.tsx:236), `go!` offset [`:326`](components/home/HomeSetup.tsx:326) |
| 9 | [`components/home/CategorySelector.tsx`](components/home/CategorySelector.tsx:86) | Row cascade replaces the previous container fade inside the existing `key={domainKey}` remount. The imperative height interpolation and its reduced-motion branch are untouched | [`:86`](components/home/CategorySelector.tsx:86) |
| 10 | [`components/home/DomainSelector.tsx`](components/home/DomainSelector.tsx:62) | Selection-dot pop, offset-shadow step, 150 ms → 140 ms token retiming. `peer`/`sr-only` wiring and every `focus-within` / `peer-focus-visible` outline rule preserved | [`:62`](components/home/DomainSelector.tsx:62) |
| 11 | [`components/CategoryCard.tsx`](components/CategoryCard.tsx:17) | `cascadeIndex` (capped at 6, 32 ms), selection-dot pop, offset-shadow step. The `unavailable` path stays motion-free | [`:17`](components/CategoryCard.tsx:17) |
| 12 | [`components/ModeButton.tsx`](components/ModeButton.tsx:42) | Same dot pop and token retiming. `comingSoon` / disabled modes stay motionless | [`:42`](components/ModeButton.tsx:42) |
| 13 | [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:302) | Row cascade (`32ms`, cap 6) on the result rows. Focus management, `onCancel`, backdrop click, the 200 ms JS close delay and its reduced-motion branch untouched | [`:302`](components/HighScoresModal.tsx:302) |
| 14 | `components/game/GameplayShell.tsx` | **Dropped from the change set — untouched.** The focus-mode treatment lives on the OR badge in `ComparisonBoard`, exactly as the plan anticipated | no diff |

### 2.3 Frozen files

None of `app/game/layout.tsx`, `app/layout.tsx`, `app/game/classic/page.tsx`, `app/game/time-attack/page.tsx`, `components/game/DerivedGameState.tsx`, `components/game/GameplayDivider.tsx`, `components/ui/button.tsx`, `lib/**`, `scripts/**`, `app/api/**`, `next.config.ts`, `components.json`, `package.json`, `package-lock.json` was modified. `types/**` was touched only by the new E3 file.

---

## 3. S2 outcome — E4 not used

The type spike passed on the first attempt.

1. Wrote [`types/view-transition.d.ts`](types/view-transition.d.ts:1) with `/// <reference types="react/canary" />`.
2. Added a temporary compile-time probe (`typeof import("react").ViewTransition`) to prove the component is actually type-visible rather than merely compiling.
3. `npx tsc --noEmit` → **exit 0**, no diagnostics. The probe proves resolution, not just absence of noise.
4. Removed the probe; re-ran `npx tsc --noEmit` → **exit 0**.
5. Only then touched the route files (S6).

**`tsconfig.json` was not modified.** E4's precondition ("only if E3 fails") was never met. No `@ts-expect-error`, no `any`, no runtime-created component.

---

## 4. Static verification

| Check | Command | Status |
|---|---|---|
| Type check | `npx tsc --noEmit` | `[Pass]` — exit 0, zero diagnostics, run after S2, after S4, and again after both postfixes |
| Lint | `npm run lint` | `[Pass]` — **0 errors**, 96 warnings. All 96 are pre-existing and live in `.agents/skills/**`, `lib/api/worldbank.ts`, `lib/catalog/availability.ts`, plus one pre-existing "unused eslint-disable directive" in `TimeAttackGame.tsx` |
| Source read-back | `git diff` review of every touched file | `[Pass]` |
| `:root` token block untouched | `git diff -U0 app/globals.css` | `[Pass]` — unchanged |
| `prefers-reduced-motion` block untouched | same | `[Pass]` — unchanged |
| Append-only claim, qualified | same | `[Partial]` — the file is append-only **except** the four `home-dialog-in/out` rules at `:134`–`:149`, retimed to tokens under plan item 13. Those are the only four original declarations changed |
| Timing-constant diff | `git diff` filtered for `1500\|800\|400\|1000\|460` across both game components | `[Pass]` — **zero** changed lines contain any timing constant |
| Build | `npm run build` | `[Blocked]` — the owner's `next dev` (port 3000) owns `.next`; the plan and the task both forbid stopping it. Not run, so not claimed |

**Lint findings that were fixed rather than suppressed.** The first lint run surfaced 7 real React-correctness errors in the new code (`react-hooks/refs` ×6, `react-hooks/set-state-in-effect` ×1). They were resolved properly:

- The render-phase ref gate for the card handoff was replaced with a `useState` lazy initializer capturing the opening item id (`openingItemId`), which is correct in the same commit that swaps the cards and needs no effect round-trip.
- The synchronous `setState` in the Home ambient observer effect was removed entirely; the loops only exist inside `no-preference` CSS, so reduced motion needs no branch there.

---

## 5. Runtime verification matrix (V1–V23)

Environment: owner's pre-existing `next dev` on `http://localhost:3000` (left running, never stopped), Playwright MCP, Chromium 1255. Date 2026-11-22.

| # | Check | Status | Measured evidence |
|---|---|---|---|
| V1 | Home renders, zero console errors | `[Pass]` | Fresh load: 2 messages, **0 errors, 0 warnings**. Document 2242 px at 1440×900 |
| V2 | Gameplay renders, both modes | `[Pass]` | `/game/classic?category=movie-series-rating` and `/game/time-attack?category=movie-series-rating` both render; classic 900 px doc at 1440×900 |
| V3 | Exactly 2 ambient loops on Home, 0 on gameplay | `[Pass]` | Home `document.getAnimations()` = 2, both `ambient-bob` / `ambient-drift`. Gameplay at rest = **0** (Classic). TA's only persistent animation is the timer bar `width` |
| V4 | Ambient amplitude and duration | `[Pass]` | `ambient-bob` 2400 ms, sampled peak **4.0 px** (never exceeded). `ambient-drift` 3200 ms, sampled peak **2.0 px** diagonal. Both `transform`/`translate` only |
| V5 | Ambient pause offscreen | `[Pass]` | At scroll top `data-ambient="hero"`, offset loop `animation-play-state: paused`, translate stayed `0px` across 8 samples. After scrolling the CTA into view → `data-ambient="cta"`, `running`, translate animated |
| V6 | Decision hover + press | `[Pass]` | Hover → `matrix(1,0,0,1,0,-4)` (−4 px, matches `--motion-dist-lift`); pressed → `matrix(0.985,0,0,0.985,0,0)` (`--motion-scale-press`); transition duration 0.14 s / 0.09 s |
| V7 | Correct reveal | `[Pass]` | `tint-in` 140 ms, `value-land` 180 ms at **+120 ms delay** (ends 300 ms), OR badge opacity 140 ms, status fade 150 ms. All motion ended well inside the 1500 ms window. Both cards `data-result="correct"`, status "Incorrect"/"Correct" as appropriate |
| V8 | Wrong reveal | `[Pass]` | `tint-in` 140 ms, `shake-brief` (`shake` keyframe) 240 ms with the board sampled mid-shake at translateX **7.31 px**, status "Incorrect", both cards `data-result="incorrect"`. Time Attack wrong delta label measured as `float-up-brief` (380 ms) inside the 400 ms window |
| V9 | t1→t4 escalation | `[Pass]` | Verified by reading the tally class per rung: score 1 → `tally-bump`, no accents; score 2 → `tally-bump`, no accents; score 3 → `tally-bump` + ring + line; score 4 → `tally-bump` + ring + line; score 5 → `tier-stamp` + ring + line; score 6 → `tier-stamp`. One rung per reveal, never two |
| V10 | Streak line appears only with a streak | `[Pass]` | `[data-streak-line]` / `[data-streak-ring]` absent at t1 and t2, present from t3 |
| V11 | Tally bump never fires on the TA countdown | `[Pass]` | Sampled every frame for 4200 ms (5+ ticks, 55→51): **0** animations on the `role="timer"` node |
| V12 | Timer urgency | `[Pass]` | At 07 s: `.timer-urgent` present, colour `rgb(240, 90, 199)` (= `--status-error`), `aria-live="assertive"`, `timer-urgent` 0.6 s infinite (1.67 Hz, under the 3 Hz ceiling) |
| V13 | Game over unchanged | `[Pass]` | Panel `animation-name: none`, `transition-duration: 0s`, `opacity 1`, `transform none`, heading "Game over", focus inside the dialog |
| V14 | Modal open/close | `[Pass]` | Dialog `home-dialog-in` at **0.18 s** (`--motion-dur-base`). Rows cascaded at **0 s / 0.032 s / 0.064 s**, 0.18 s each. Escape closed it and focus returned to the "View High Scores" opener |
| V15 | Card handoff | `[Pass]` | Enter-only Motion handoff measured at **240 ms** (`waapi:240`) per advance; no height change (document height stable at 900 px desktop / 1252 px mobile); no duplicate cards (one `article` per slot) |
| V16 | Mobile geometry unchanged | `[Pass]` | At 390×844: `scrollHeight` **1252 px**, Higher at **y=1100**, Lower at **y=1166**, `scrollWidth` **385** vs viewport 390 → no horizontal overflow. Matches the analysis baseline exactly (1252 / 1100 / 1166). Home 390×844: `scrollHeight` **2489 px**, `scrollWidth` 385 |
| V17 | Route transition | `[Pass]` | `document.startViewTransition` called exactly **once** on `go!`; the returned transition reported `types: ["nav-forward"]` both at creation and at `ready`, and `finished` normally. Double-pressing `go!` still navigated (no lost input). `::view-transition { pointer-events: none }` confirmed present in the loaded stylesheet |
| V18 | Reduced motion | `[Pass]` (after postfix) | Emulated `reduce`: media matches; Home **0** animations, chevron `animation-name: none`, transform `none`; decision hover transform `none`, press transform `none`; reveal beat = `tint-in` 140 ms opacity crossfade only; board transform `none` (no jolt); no `shake`, `pulse-ring` or `tier-stamp` |
| V19 | Console after the whole sweep | `[Pass]` with a caveat | Normal motion: fresh Home, fresh Classic and fresh Time Attack each **0 errors / 0 warnings**. Under emulated reduced motion a **pre-existing** hydration mismatch surfaces — see §7 |
| V20 | animation-inspector diagnostics | `[Blocked]` | The MCP refuses `localhost` ("Disallowed hostname") and `127.0.0.1` ("Private/reserved IP address … not allowed") in this environment. The equivalent inventory was measured directly instead: `document.getAnimations()` grouped by `animationName` with duration and iteration count (V3/V4/V11/V12 above), which is the same measurement source the inspector uses |
| V21 | Screenshot comparison | `[Partial]` | 11 "after" captures written (see §6). Pixel diffing was not performed — this model cannot inspect images. Layout stability is evidenced numerically instead: Home 2242 px desktop / 2489 px mobile and gameplay 900 px desktop / 1252 px mobile are **identical to the pre-change baseline** recorded in the analysis |
| V22 | Keyboard parity | `[Partial]` | `ArrowUp` produced the same reveal acknowledgement as pointer input: status "Correct"/"Incorrect", both cards `data-result`, `shake-brief` on a wrong answer, `value-land` on the next value. **But the pointer-only press scale is not mirrored on keyboard**, because that needs a keydown-driven `data-pressed` beat, i.e. handler changes, which plan item 4 forbids ("No handler changes"). Reveal parity holds; press-scale parity does not |
| V23 | Focus visibility | `[Pass]` | Tab traversal: 3 px solid outline at 4 px offset on the back control (`rgb(253,255,255)`) and the game-over action (`rgb(34,211,238)` = `--focus-ring`). No animated layer occluded a focus ring |

### 5.1 Cannot be assessed here

| Item | Status |
|---|---|
| Perceptual / feel acceptance of the tier ladder | `[Not tested]` — requires a human reviewer. Not claimed |
| Non-Chromium engines for view transitions | `[Not tested]` |
| `@starting-style` across the full target browser set | `[Not tested]` |
| Production build | `[Blocked]` — owner's dev server owns `.next` |

---

## 6. Screenshots

All under `docs/assets/immersive-motion/after/`:

| File | Frame |
|---|---|
| `local-home-desktop-1440.png` | Home, 1440×900 |
| `local-home-mobile-390.png` | Home, 390×844 |
| `local-gameplay-desktop-1440.png` | Classic gameplay, 1440×900 |
| `local-gameplay-mobile-390.png` | Classic gameplay, 390×844 |
| `local-gameplay-outcome-desktop-1440.png` | Correct reveal mid-beat, 1440×900 |
| `local-gameplay-outcome-mobile-390.png` | Correct reveal mid-beat, 390×844 |
| `local-gameover-desktop-1440.png` | Game-over panel, 1440×900 |
| `local-gameover-mobile-390.png` | Game-over panel, 390×844 |
| `local-highscores-modal-desktop-1440.png` | High Scores modal with 3 score rows, 1440×900 |
| `local-highscores-modal-mobile-390.png` | High Scores modal, 390×844 |
| `local-route-transition-mid-1440.png` | Home → gameplay transition, captured 90 ms after `go!` |

The captures were written but **not visually reviewed** by the agent (no image inspection capability in this model). The route-transition frame in particular is evidence that a capture was taken, not proof of the rendered interpolation; the transition type propagation in V17 is the actual proof.

---

## 7. Deviations, stop conditions, and findings

No stop condition was hit. Two implementation bugs were found by verification and fixed under the postfix condition.

### 7.1 Postfix 1 — tier 4 fired too early (implementation bug)

**Symptom:** with no stored best (`highScore === 0`), the "new personal best" clause in `resolveTier` was true for every score ≥ 3, so **tier 4** fired at score 3 instead of tier 3.

**Classification:** implementation bug — the code did not match the intended ladder in design §4.3.

**Fix:** the new-best clause now requires a best to actually beat: `resolveTier(score, highScore > 0 && score > highScore)`, in both [`ClassicGame.tsx:131`](components/game/ClassicGame.tsx:131) and [`TimeAttackGame.tsx:162`](components/game/TimeAttackGame.tsx:162). Minimal, display-only, no gameplay effect.

**Re-verified:** the full ladder was re-driven from a fresh run — t1, t2, t3, t3, t4, t4 as recorded in V9.

### 7.2 Postfix 2 — positional movement survived reduced motion (implementation bug)

**Symptom:** under emulated `prefers-reduced-motion: reduce`, the decision button still jumped 4 px on hover and scaled on press. The global reduced-motion block only collapses *durations*, so the `transform` still applied instantly.

**Classification:** implementation bug — owner decision 4 requires dropping positional movement while keeping opacity crossfades.

**Fix:** an additive rule inside the appended reduced-motion block ([`app/globals.css:725`](app/globals.css:725)) neutralises `transform` for `.decision-lift` hover and active. The existing global block was not weakened, reordered or removed.

**Re-verified:** hover and press transforms both measure `none`; the reveal beat is a 140 ms opacity crossfade only.

### 7.3 Deviations from the plan text

| # | Plan said | Implemented | Why |
|---|---|---|---|
| 1 | Four new keyframes (`value-land`, `tally-bump`, `tier-stamp`, `ambient-drift`) | **Five**: those four plus `ambient-bob` | The two ambient hosts need different CSS properties. The chevron's existing hover lift and the CTA's existing press counter-offset are `transform`-based, so a single shared keyframe animating one property would silently clobber either the hover lift or the press affordance. `ambient-bob` animates `transform` (composes with the chevron's `translate`-based hover), `ambient-drift` animates `translate` (composes with the offset layer's `transform`-based press). Both verified at runtime |
| 2 | `data-ambient` toggles "a single `data-ambient` attribute" | Single attribute with four values: `none` / `hero` / `cta` / `both` | Each loop must pause on *its own* visibility, and loop A is in the first viewport while loop B is ~2000 px lower. A boolean cannot express that. Still one attribute, still one shared observer, still no per-element observers |
| 3 | t3 adds "a one-shot accent ring … and a secondary streak line"; design §7.3 says "streak is always present as text when it appears" | One-shot ring + a decorative 2 px streak bar under the tally; **no new text** | Adding streak *text* would change copy/labels, which is plan stop condition 9. The streak is already conveyed as text by the always-visible numeric score, so the accents are decorative (`aria-hidden`) and carry no information alone |
| 4 | Wrong-answer jolt: plan §3.6 reuse the `shake` keyframe with a duration variant; design §4.3 calls for `±3px` | Reused `shake` at 240 ms, i.e. the keyframe's own `±10 px` amplitude | The plan is authoritative over the design, and reusing the keyframe keeps one shake vocabulary. Measured board excursion 7.31 px mid-decay, inside the ≤10 px budget and clipping-safe under the shell's `overflow-x: hidden`. Amplitude difference flagged below |
| 5 | Ambient loop B pauses on hover / focus-visible | Implemented as `animation-play-state: paused` exactly as asked | Press (a subset of hover for pointer, and covered by focus-visible for keyboard) is therefore also covered |

### 7.4 Pre-existing issue observed, not introduced

Under emulated `prefers-reduced-motion: reduce`, a **hydration mismatch** appears on Home: the hero `motion.h1` / `motion.p` / `motion.a` server HTML carries `opacity: "0"` + `translateY(8px)` while the client hydrates with `opacity: 1` + `translateY(0px)`, and `HighScoresModal`'s `dialog` `className` differs by the `motion-reduce` class.

Both sources are **untouched pre-existing code**: the `heroEntrance` branch and the `highScores-dialog` class expression predate this task and do not appear in the diff. The root cause is `useReducedMotion()` returning `null`/`false` during SSR and `true` on the client. It only manifests when the OS preference is *reduce*; with normal motion the console measured **0 errors, 0 warnings** (V1, V19).

This is recorded rather than fixed: correcting it means changing pre-existing render behaviour outside the task's scope.

---

## 8. Working-tree discipline

- Baseline before any edit: branch `lj-branch`, `git diff --stat` empty, untracked `.agents/`, `docs/`, `skills-lock.json` — all preserved untouched.
- Nothing unrelated was reverted, reformatted, or absorbed.
- `components/game/GameplayShell.tsx` was on the conditional allowlist and is **untouched**; it is not in the change set.
- New untracked directory `.playwright-mcp/` contains verification tool output (console logs, accessibility snapshots) generated by the Playwright MCP during this session. It is not a source change and is not part of the change set.

---

## 9. Open `Needs Verification`

1. `Needs Verification [product-decision]` — **Perceptual acceptance of the five-tier ladder.** The mechanism is measured and correct, but "does t3 feel earned" is a human judgement. No human reviewed the motion.
2. `Needs Verification [product-decision]` — **Wrong-answer jolt amplitude.** Measured excursion is 7.31 px (the reused `shake` keyframe) rather than the design's `±3 px`. Needs an owner call on whether the shared keyframe's amplitude is acceptable or a dedicated lower-amplitude keyframe is wanted.
3. `Needs Verification [product-decision]` — **Time Attack tiers read the cumulative correct count**, per owner decision 8. If a true consecutive-correct combo is ever wanted, it is new display state and a separate task.
4. `Needs Verification [product-decision]` — **Keyboard press-scale parity is absent.** V22 confirms reveal parity but not the pointer-only 4 px lift / press scale, which needs a handler-level `data-pressed` beat the plan forbids. Decide whether to authorise that handler change.
5. `Needs Verification [environment-specific]` — **Non-Chromium behaviour** of the route transition and `@starting-style` was not tested (Chromium 1255 only).
6. `Needs Verification [inferred-from-codebase]` — **The reduced-motion hydration mismatch (§7.4)** is pre-existing and out of scope. It should be scheduled as its own fix, because it currently logs a React error for any visitor whose OS asks for reduced motion.
7. `Needs Verification [capability-unavailable]` — **V20 was blocked.** The animation-inspector MCP rejects `localhost` and private IPs here, so the structured inventory was substituted with direct `document.getAnimations()` sampling.
8. `Needs Verification [capability-unavailable]` — **V21 pixel comparison** was not performed; only numeric geometry parity was established.
9. `Needs Verification [product-decision]` — **Pre-existing 2 px hover lifts** on the Home selection labels and mode buttons still translate under reduced motion. They are outside the motion layer this task introduced and were left alone; the new decision-control lift was neutralised because the new motion layer owns it.

---

## 10. Handoff summary

- **S1–S7 executed in order.** S2 passed first-try, so **E4 was never needed** and `tsconfig.json` is unchanged.
- **16 files touched** (15 modified + `types/view-transition.d.ts`), all inside the allowlist; `GameplayShell.tsx` correctly dropped.
- **Static:** `tsc --noEmit` clean; `npm run lint` 0 errors; timing constants provably unchanged; `:root` and the reduced-motion block byte-identical. `npm run build` `[Blocked]` by the owner's dev server.
- **Runtime:** V1–V17, V19, V23 `[Pass]`; V18 `[Pass]` after postfix; V22 `[Partial]`; V20 `[Blocked]`; V21 `[Partial]`.
- **Two real bugs found by verification and fixed:** premature tier 4, and reduced-motion positional movement on the decision controls.
- **One pre-existing issue disclosed and left alone:** reduced-motion hydration mismatch on Home.
- **Perceptual acceptance is explicitly not claimed.**
