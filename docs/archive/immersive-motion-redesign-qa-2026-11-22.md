# Immersive Motion Enhancement — QA Stage

**Date:** 2026-11-22
**Stage:** QA only (no code changes)
**Branch:** `lj-branch`
**Task type:** Visual change + interaction enhancement — independent verification of the Code-stage handoff
**Authoritative inputs (read in order):** handoff → plan (V1–V23 matrix, allowlist, stop conditions) → design → analysis
**Verification owner:** QA stage (this document). The handoff's claims were re-derived independently; nothing below is copied from the handoff without its own evidence.

---

## 0. QA scope and guardrail

- **Guardrail honoured:** no application, config, manifest, script, type, or existing document was edited. The only files QA created are this document and screenshots under `docs/assets/immersive-motion/qa/`.
- **Environment:** owner's pre-existing `next dev` on `http://localhost:3000` (PID 17272), reused and **never stopped**. Playwright MCP, Chromium revision 1255. Desktop `1440×900`, mobile `390×844`. animation-inspector MCP attempted and blocked (see V20).
- **Deviation from the handoff's environment note:** the session shell resolves to `cmd.exe`; all shell checks were run through `"C:\Program Files\Git\bin\bash.exe" -lc`. Read-only/verification commands only.
- **Method:** every material claim was re-checked against source, a command exit/output, or live runtime measurement. Unrun checks are marked `[Not tested]`; unavailable ones `[Blocked]`.

---

## 1. Allowlist compliance — `[Pass]`

`git status --porcelain` / `git diff --name-only` (staged set empty):

```
 M app/game/[mode]/page.tsx
 M app/globals.css
 M app/page.tsx
 M components/CategoryCard.tsx
 M components/HighScoresModal.tsx
 M components/ModeButton.tsx
 M components/game/ClassicGame.tsx
 M components/game/ComparisonBoard.tsx
 M components/game/DecisionControls.tsx
 M components/game/GameCard.tsx
 M components/game/GameplayStatus.tsx
 M components/game/TimeAttackGame.tsx
 M components/home/CategorySelector.tsx
 M components/home/DomainSelector.tsx
 M components/home/HomeSetup.tsx
?? types/view-transition.d.ts
```

| Assertion | Result | Evidence |
|---|---|---|
| Changed set == handoff/plan allowlist (Tier A + E1 + E2 + new E3) | `[Pass]` | The 15 modified files are exactly plan §2 items 1–13 minus the dropped `GameplayShell.tsx`, plus E1/E2; the single untracked type file is E3 |
| No **frozen** file changed (`app/game/layout.tsx`, `app/layout.tsx`, concrete route pages, `DerivedGameState.tsx`, `GameplayDivider.tsx`, `components/ui/button.tsx`, `lib/**`, other `types/**`, `scripts/**`, `app/api/**`, `next.config.ts`, `components.json`, `package.json`, `package-lock.json`) | `[Pass]` | `git status --porcelain <frozen paths>` returns only `?? types/view-transition.d.ts` (the new E3 file) |
| `GameplayShell.tsx` untouched | `[Pass]` | Not in the changed set; plan anticipated it could be dropped |
| `tsconfig.json` unchanged (E4 unused) | `[Pass]` | `git diff -- tsconfig.json` empty; `npx tsc --noEmit` clean, so E4 was not needed |
| No new dependencies | `[Pass]` | `git diff -- package.json package-lock.json` empty |
| `:root` block (lines 4–70) byte-identical to `HEAD` | `[Pass]` | `diff <(git show HEAD:app/globals.css \| sed -n '4,70p') <(sed -n '4,70p' app/globals.css)` → identical |
| `prefers-reduced-motion` block (lines 188–197) byte-identical to `HEAD` | `[Pass]` | Same diff over `188,197` → identical |
| Appended layer is additive except authorised dialog retime | `[Pass]` | `globals.css` diff `+344 / -4`; the only non-append hunks are the four `high-scores-dialog` rules at `:134`–`:149`, retimed to `--motion-dur-base` / `--motion-ease-out` (plan item 13) |
| `docs/` byte-identity of plan/design/analysis | `Needs Verification [environment-specific]` | `docs/` is untracked in git, so git cannot prove the three source documents were unmodified. QA read them as-is and wrote only this file |

---

## 2. Static checks

| # | Check | Status | Evidence |
|---|---|---|---|
| S1 | Type check | `[Pass]` | `npx tsc --noEmit` → exit 0, no diagnostics |
| S2 | Lint | `[Pass]` | `npm run lint` → `0 errors, 96 warnings`. Warnings are pre-existing: `.agents/skills/**` scripts, `lib/api/worldbank.ts:22`, `lib/catalog/availability.ts:82`, and the pre-existing unused eslint-disable at `components/game/TimeAttackGame.tsx:187`. No warning originates in an added line of this diff |
| S3 | Timing constants unchanged | `[Pass]` | `git diff -U0 -- components/game/{ClassicGame,TimeAttackGame}.tsx` filtered for `1500\|800\|400\|1000\|460` → **no changed line**. Source still shows `REVEAL_MS_CORRECT 800`, `REVEAL_MS_WRONG 400`, `setTimeout(...460)`, `ClassicGame` `1500` |
| S4 | No layout-driving animated property added | `[Pass]` | New keyframes animate only `opacity`/`transform`/`translate`; new transitions only `transform`/`opacity`/`border-color`/`background-color`/`text-shadow`/`color`. Decorative `inset-*` on the streak ring/line are static positioning, not animated. No new `width`/`height`/`margin`/`padding`/`top`/`left` animation. `CategorySelector` height interpolation untouched |
| S5 | Build | `[Blocked]` | Owner's `next dev` (PID 17272) owns `.next`; plan §6.1 and the task forbid stopping it. Not run, so not claimed |

The only diff hits for the timing numbers are the new token declarations `--motion-dur-accent: 400ms`, `--motion-dur-ambient: 2400ms`, `--motion-dur-timer: 1000ms`. `--motion-dur-timer` documents the existing 1 s tick and does not change it (runtime confirms the timer transition is still `1000ms`, V3).

---

## 3. Runtime verification V1–V23

Statuses: `[Pass]` 18 · `[Partial]` 4 · `[Blocked]` 1 · `[Fail]` 0 · `[Not tested]` 0.

| # | Check | Status | Independently measured evidence |
|---|---|---|---|
| V1 | Home renders, console clean | `[Pass]` | 1440×900: doc **2242 px**, `scrollWidth` 1435, h1 152 px / −13.68 px; console 2 info messages, **0 errors / 0 warnings** |
| V2 | Both gameplay modes render | `[Pass]` | `/game/classic?category=movie-series-rating` and `/game/time-attack?…` render; Classic 900 px at desktop |
| V3 | Ambient loops: 2 on Home, 0 on gameplay (TA bar excepted) | `[Pass]` | Home at rest: `ambient-bob` 2400 ms (running) + `ambient-drift` 3200 ms (paused offscreen) = **2**. Classic at rest: **0**. Time Attack at rest: **1** (`width` transition, 1000 ms) — pre-existing timer bar |
| V4 | Ambient amplitude and duration | `[Pass]` | `ambient-bob` 2.4 s, sampled peak **3.70 px** (keyframe bound 4 px); `ambient-drift` 3.2 s, `translate` keyframe 2 px diagonal, sampled 0.59 → 1.84 px |
| V5 | Ambient pause offscreen / hover | `[Pass]` | Top: `data-ambient="hero"`, drift `paused` / `translate 0px`. Scroll CTA into view: `data-ambient="cta"`, drift `running` (`0.59 → 1.84 px`), chevron `paused`. Real hover on CTA: drift `paused`, `matches(':hover')` true |
| V6 | Decision hover + press | `[Pass]` | Hover → `matrix(1,0,0,1,0,-4)` (4 px lift), transition 0.14 s; press → `matrix(0.985,0,0,0.985,0,0)`, transition 0.09 s, `:active` true |
| V7 | Correct reveal not instant | `[Pass]` | At +150 ms: `value-land` running (180 ms, 120 ms delay), `tint-in` 140 ms, status `Correct`, both cards `data-result="correct"`. All motion ends well inside 1500 ms |
| V8 | Wrong reveal | `[Pass]` | Board gets `shake-brief`; `tint-in` 140 ms; status `Incorrect`; both cards `data-result="incorrect"`. TA wrong delta label measured `float-up-brief` (380 ms) inside the 400 ms window. (Amplitude is a separate finding, F1) |
| V9 | Tier ladder t1→t4 | `[Pass]` | Driven deterministically from the server deck: score 1 → `tally-bump`, no accents; 2 → `tally-bump`, no accents; 3 → `tally-bump` + ring + line; 4 → `tally-bump` + ring + line; 5 → `tier-stamp` (240 ms) + ring + line. **Premature-tier-4 fix holds**: with `highScore` 0, score 3/4 render `tally-bump`, not `tier-stamp` |
| V10 | Streak accents only with a streak | `[Pass]` | `[data-streak-ring]` / `[data-streak-line]` absent at score 1–2, present from score 3 |
| V11 | Tally never bumps the TA countdown | `[Pass]` | 51 samples over 5.2 s across 6 distinct tick values: **0** animation entries on the `role="timer"` node |
| V12 | Timer urgency at ≤10 s | `[Pass]` | At 10 s: class `timer-urgent` + `text-[var(--status-error)]`, colour `rgb(240, 90, 199)`, `aria-live="assertive"`, animation `timer-urgent 0.6s infinite` (1.67 Hz). Class removed at game-over |
| V13 | Game over unchanged | `[Pass]` (desktop + mobile) | Panel `animation-name: none`, `transition-duration: 0s`, opacity 1, transform none, focus inside dialog, heading `Game over` |
| V14 | Modal open/close, stagger, focus return | `[Pass]` | Dialog `home-dialog-in` **0.18 s**; rows `row-cascade` 0.18 s at delays **0 / 0.032 / 0.064 s**; `Escape` → `dialog.open === false`, focus restored to `View High Scores` |
| V15 | Card handoff enter-only, no layout change | `[Pass]` | Enter-only Motion handoff observed as two 240 ms animations after a deck advance; exactly one `article` per slot; doc height stable 900 px desktop / 1252 px mobile |
| V16 | Mobile geometry unchanged | `[Pass]` | 390×844 Classic: `scrollHeight` **1252**, Higher y **1100**, Lower y **1166**, `scrollWidth` **385** (< 390). Home: **2489**, `scrollWidth` 385. Matches analysis baseline exactly |
| V17 | Route transition | `[Pass]` | Instrumented `document.startViewTransition`: exactly **one** call, `types: ["nav-forward"]` at creation and at `ready`, `finished` normally; `::view-transition { pointer-events: none }` computed `pointerEvents: none`; double-press of `go!` still navigated to gameplay |
| V18 | Reduced motion fidelity | `[Partial]` | Media matches; Home **0** animations, chevron `animation-name: none`, transform none; decision hover/press `transform: none` (postfix 2 holds); reveal `value-land` computes to `tint-in` 0.14 s at 0 delay, `transform: none`; wrong beat keeps the class but computes `animation-name: none`. **Not exercised under reduce:** a t3/t4 reveal (ring/stamp suppression verified only from the appended CSS rules `:718`–`:734`, not measured live) |
| V19 | Console after the sweep | `[Partial]` | Normal motion: Home, Classic and Time Attack each **0 errors / 0 warnings**. Under emulated reduce: 1 React **error** (hydration mismatch) + 1 Motion warning — see F4 |
| V20 | animation-inspector diagnostics | `[Blocked]` | `discover_animations("http://localhost:3000/")` → `Disallowed hostname "localhost"`; retry on `http://127.0.0.1:3000/` → `Private/reserved IP address … not allowed`. Substituted with direct `document.getAnimations()` + computed styles (the same measurement source) |
| V21 | Screenshot comparison | `[Partial]` | 13 captures written to `docs/assets/immersive-motion/qa/` (desktop + mobile). **No pixel diff performed** (this model cannot inspect images); layout parity established numerically instead (V1/V16). The route-transition frame proves a capture was taken, not the interpolated render |
| V22 | Keyboard parity | `[Partial]` | Reveal parity holds: `Arrow` guess produced status `Correct`/`Incorrect`, both cards' `data-result`, `value-land` and the wrong `shake` beat. While the key is held the button computes `transform: none` (`:active` false) → **no press-scale parity** (pointer-only) |
| V23 | Focus visibility | `[Pass]` | Tab traversal: `3px solid rgb(34, 211, 238)` at `4px` offset on Higher, Lower and the back control; no animated layer occludes a ring |

### 3.1 Not assessable here

| Item | Status |
|---|---|
| Perceptual / feel acceptance of the ladder | `[Not tested]` — requires a human reviewer |
| Non-Chromium engines (view transitions, `@starting-style`) | `[Not tested]` — Chromium 1255 only |
| Production build | `[Blocked]` — owner's dev server owns `.next` |

---

## 4. Findings

Severity scale: High = correctness/accessibility/scope break; Medium = perceptible deviation or an error in the console; Low = nuance an owner may accept.

| ID | Finding | Expected (plan/design) | Observed (evidence) | Classification | Severity |
|---|---|---|---|---|---|
| **F1** | Wrong-answer jolt amplitude | Design §4.3: `±3px` decaying | Board `shake-brief` peaked at **9.97 px** `translateX` (reused `shake` keyframe, 10 px peaks) | **Spec conflict** — plan §3.6 explicitly authorised reusing `shake` and the plan is authoritative over the design. Implementation matches the plan, not the design | Medium (owner call) |
| **F2** | Keyboard press-scale parity absent | Design §5.3/§6: pressed state follows `:active` plus an explicit `data-pressed` beat on keypress | Held arrow key → button `transform: none`; reveal parity is otherwise complete | **Spec gap** — the design requires a handler-level `data-pressed` beat, which plan item 4 forbids ("No handler changes") | Low |
| **F3** | Tally bump fires at the deck advance, not the reveal | Design §4.3 t1: tally `180 ms` overlaps the reveal (plate → value; tally overlaps) | At +150 ms into the reveal only `value-land` runs; `tally-bump` first appears at +1600 ms (currentTime 115 ms), i.e. ~1.5 s after the outcome, when the next card mounts (score state is set inside the 1500 ms advance timer) | **Implementation bug** — code does not match the design's sequencing. Low perceptible impact (reads as the score landing with the next card) | Low |
| **F4** | Reduced-motion hydration mismatch | Console clean; SSR and client agree | Emulated `reduce` on Home: React **error** — hero `h1/p/a` server `opacity: 0 / translateY(8px)` vs client `opacity: 1 / translateY(0)`; plus dialog `className` differs by `motion-reduce` | **Implementation bug, pre-existing and outside this diff** — `useReducedMotion()` returns `null` on the server and `true` on the client. `git diff` shows the `heroEntrance`/`heroChildVariants` branch and the `high-scores-dialog` className expression are untouched; the only reduced-motion line in the diff is HomeSetup's new observer deps array. Newly introduced? **No** | Medium (logs an error for every reduced-motion visitor) |
| **F5** | V20 unavailable | Structured animation inventory | localhost and private IPs refused by the inspector | **Verification gap** | Low |
| **F6** | V21 no pixel diff | Before/after pixel comparison | Numeric geometry parity only | **Verification gap** | Low |
| **F7** | Motion library reduced-motion notice | — | `[WARNING] You have Reduced Motion enabled on your device…` (motion.dev) under emulated reduce | **Observation** — pre-existing Motion behaviour, not part of the diff | Info |

### 4.1 Findings that resolve in the handoff's favour

Two handoff claims were independently confirmed rather than merely repeated: the **premature tier-4 postfix** (score 3/4 → `tally-bump`, not `tier-stamp`, with no stored best) and the **reduced-motion positional-movement postfix** (hover/press `transform: none`). The handoff's disclosed deviations (five keyframes, four-value `data-ambient`, decorative-only streak accent, reused `shake`) all match the source.

---

## 5. Postfix assessment

**No postfix is required for scope, safety, or correctness.** There is no frozen-file violation, no gameplay/timing drift, no dependency change, and no new console error under normal motion.

Optional postfix work, in priority order — none of it is authorised by QA:

| For | Minimal scope | Note |
|---|---|---|
| F3 (if the owner wants design-exact sequencing) | `components/game/GameplayStatus.tsx` key derivation + a reveal-beat key passed from `ClassicGame.tsx` / `TimeAttackGame.tsx` | Display-only; no timing-constant change |
| F1 (if the design's ±3 px is wanted) | New lower-amplitude keyframe in `app/globals.css` + swap the `shake-brief` class | Or the owner accepts the reused 10 px keyframe |
| F2 (keyboard press parity) | `components/game/DecisionControls.tsx` + a keydown/keyup `data-pressed` beat in both game components | Requires the handler change plan item 4 forbids — owner approval needed |
| F4 (hydration mismatch) | `components/home/HomeSetup.tsx` and `components/HighScoresModal.tsx` SSR-safe `useReducedMotion` initial state | Pre-existing; recommend its own task rather than folding into this one |

---

## 6. Overall verdict

**QA: PASS with findings.** The motion layer is present and behaves as designed in every mechanism the plan specifies: two Home-only ambient loops within budget with correct offscreen/hover gating, retimed hover/press, sequenced card handoff, a working five-tier ladder without the premature tier 4, Time Attack urgency without countdown bumping, an unchanged game-over panel, a staggered modal with focus return, a single `nav-forward` route transition with non-blocking pointer events, and reduced-motion fidelity minus positional movement.

The only live-render deviations are F1 (10 px vs design 3 px, a plan-authorised conflict), F3 (tally beats at the advance, a design-sequencing gap), and the pre-existing reduced-motion hydration error F4. Allowlist compliance, frozen-file integrity, `:root`/reduced-motion byte-identity, timing constants, geometry and mobile layout all hold.

---

## 7. Open `Needs Verification`

1. `Needs Verification [product-decision]` — **F1 wrong-jolt amplitude.** Accept the reused `shake` at 10 px, or authorise a dedicated ±3 px keyframe.
2. `Needs Verification [product-decision]` — **F3 tally-beat timing.** Accept the advance-time tally, or authorise the small display-only postfix.
3. `Needs Verification [product-decision]` — **F2 keyboard press-scale.** Needs approval to add a `data-pressed` handler beat.
4. `Needs Verification [product-decision]` — **Perceptual acceptance of the five-tier ladder.** Not claimed; no human review.
5. `Needs Verification [environment-specific]` — **F4 reduced-motion hydration mismatch** is pre-existing and should be scheduled separately; it currently logs a React error for reduced-motion visitors.
6. `Needs Verification [environment-specific]` — **Source-document byte-identity** cannot be proven via git because `docs/` is untracked.
7. `Needs Verification [capability-unavailable]` — **V20** (inspector) and **V21** (pixel diff) were unavailable; substitutes recorded above.
8. `Needs Verification [not tested]` — **Non-Chromium engines** and **`@starting-style`** across the full target browser set were not exercised.

---

## 8. Handoff trace

- **Files created by QA:** this document and 13 screenshots in `docs/assets/immersive-motion/qa/` (`qa-home-desktop-1440.png`, `qa-home-mobile-390.png`, `qa-gameplay-desktop-1440.png`, `qa-gameplay-mobile-390.png`, `qa-gameplay-correct-outcome-desktop-1440.png`, `qa-gameplay-correct-outcome-mobile-390.png`, `qa-gameplay-wrong-outcome-desktop-1440.png`, `qa-gameover-desktop-1440.png`, `qa-gameover-mobile-390.png`, `qa-highscores-modal-desktop-1440.png`, `qa-highscores-modal-mobile-390.png`, `qa-timeattack-urgent-desktop-1440.png`, `qa-route-transition-mid-1440.png`).
- **Files modified:** none.
- **Commands run:** `git status/diff/show`, `diff` against `HEAD:app/globals.css`, `npx tsc --noEmit`, `npm run lint`. `npm run build` intentionally not run (owner's dev server owns `.next`).
- **Runtime:** Playwright MCP at 1440×900 and 390×844, plus direct `document.getAnimations()` / computed-style / React-fiber inspection for deterministic ladder driving.
- **Dev server:** reused, never stopped.
- **Sign-off:** QA is complete and independent. Mechanism verification passed; the deviations above are recorded, not fixed.
