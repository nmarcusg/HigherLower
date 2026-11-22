# Immersive Motion Enhancement — Plan

**Date:** 2026-11-22
**Stage:** Plan only (no code changes)
**Task type:** Visual change + interaction enhancement (motion layer)
**Status:** Plan complete. Code stage not started.
**Design source of truth:** [`docs/immersive-motion-redesign-design-2026-11-22.md`](immersive-motion-redesign-design-2026-11-22.md)
**Upstream analysis:** [`docs/immersive-motion-redesign-analysis-2026-11-22.md`](immersive-motion-redesign-analysis-2026-11-22.md)

---

## 1. What this plan executes

Exactly one thing: the motion layer defined in the design document, on two existing surfaces, plus one route transition, plus a reduced-motion fidelity upgrade, plus an accessibility sweep of the touched surface. Nothing else.

Owner decisions carried forward verbatim from the design's binding decision log ([design §1.1](immersive-motion-redesign-design-2026-11-22.md:80)): route-level `<ViewTransition>` = YES; streak-escalating five-tier intensity; max two indoor-loop ambience, Home only, sub-8 px, ≥ 2 s, none in gameplay; reduced motion keeps opacity crossfades and drops positional movement; game-over entrance unchanged; mobile layout untouched and the below-fold decision controls recorded as an accepted UX tradeoff.

---

## 2. Exact modification allowlist (Tier A)

Every file below traces to a requirement in the design document. No speculative refactors, no cleanup, no reformatting. If a change below turns out to be unnecessary, the file is **dropped** from the change set rather than edited for appearance.

| # | File | Precise change summary | Design reference |
|---|---|---|---|
| 1 | [`app/globals.css`](../app/globals.css:1) | **Append only.** (a) A second `:root` block declaring the sixteen `--motion-*` tokens. (b) Four new keyframes: `value-land`, `tally-bump`, `tier-stamp`, `ambient-drift`. (c) Duration/variant classes that **reuse existing keyframes**: `shake-brief`, `pulse-ring-once`, `float-up-brief`, `float-up-reveal`, `fade-in-up-beat`. (d) `@media (prefers-reduced-motion: no-preference)` wrappers so ambient loops only exist when motion is wanted. (e) `(hover: hover) and (pointer: fine)` gated hover utilities. (f) If decision 1 is approved: `::view-transition { pointer-events: none }`, the `nav-forward` old/new rules, and a reduced-motion block that zeroes the positional part while keeping the opacity crossfade. Existing declarations — including the `:root` block at `:4` and the reduced-motion block at `:188` — must remain byte-identical. | [design §3](immersive-motion-redesign-design-2026-11-22.md:126), [§3.6](immersive-motion-redesign-design-2026-11-22.md:186), [§5.2](immersive-motion-redesign-design-2026-11-22.md:262) |
| 2 | [`components/game/GameCard.tsx`](../components/game/GameCard.tsx:1) | Add an optional `enterHandoff` prop and a `data-result` attribute. Apply the handoff enter animation (opacity + `translateY(±10px→0)`, `240ms`, `--motion-ease-in-out`) only when `enterHandoff` is true, so first mount never animates. Apply the tint/border state flip with `--motion-ease-step-2` (`140ms`). Sequence the value block: plate first, value `opacity` + `translateY(6px→0)` at `+120ms`. Reduced motion: opacity only, no delay. **Do not touch** the native `<img>`, the `aria-live="polite"` wrapper, the attribution block, or the offset plate geometry. | [design §5.3](immersive-motion-redesign-design-2026-11-22.md:305) |
| 3 | [`components/game/ComparisonBoard.tsx`](../components/game/ComparisonBoard.tsx:1) | Accept and forward handoff props to the two card slots; give the incoming next card its `+40ms` delay. Add the reveal focus-mode treatment on the existing decorative OR badge (`opacity 1→0.5` while `phase === "revealing"`, `140ms`). No layout, no stagger offset change. | [design §5.3](immersive-motion-redesign-design-2026-11-22.md:305) |
| 4 | [`components/game/DecisionControls.tsx`](../components/game/DecisionControls.tsx:1) | Retime hover lift to `--motion-dur-quick` / `--motion-ease-out` and press to `--motion-dur-tap` with `scale(0.985)`. Gate hover behind `(hover: hover) and (pointer: fine)`. Keep `disabled:opacity-45`, `disabled:hover:translate-y-0`, the `5px 5px 0` white offset ring and the `focus-visible` behaviour exactly as they are. No handler changes. | [design §5.3](immersive-motion-redesign-design-2026-11-22.md:305), [§6](immersive-motion-redesign-design-2026-11-22.md:355) |
| 5 | [`components/game/GameplayStatus.tsx`](../components/game/GameplayStatus.tsx:1) | Add an optional `bump?: boolean` prop that renders the value with `tally-bump` and a value-derived `key` so the animation restarts on change. Default `false`, so the Time Attack countdown never bumps. No change to `role="progressbar"`, `aria-value*`, or markup order. | [design §5.3](immersive-motion-redesign-design-2026-11-22.md:305) |
| 6 | [`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:1) | Add a display-only `resolveTier` derivation from existing `score` / `lastCorrect` / new-best state and pass it to the board, cards and status. Track a `round` counter incremented on deck advance to drive `enterHandoff`. Add the Classic `wrong` beat (brief jolt variant, `240ms`). **No changes** to `handleGuess`, the `1500 ms` reveal timer, deck logic, high-score writes, keyboard handling, or the game-over panel. | [design §4.2](immersive-motion-redesign-design-2026-11-22.md:203), [§5.3](immersive-motion-redesign-design-2026-11-22.md:305) |
| 7 | [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:1) | Add the same display-only tier derivation from `score`. Add the existing `.timer-urgent` class to the timer numeral when `displayTime <= 10 && phase !== "game-over"`, and remove it at game-over. Retime the delta label to `float-up-brief` (`380ms`) for wrong and `float-up-reveal` (`700ms`) for correct. **No changes** to `INITIAL_TIME`, `BONUS_CORRECT`, `PENALTY_WRONG`, `REVEAL_MS_CORRECT`, `REVEAL_MS_WRONG`, the `1000 ms` interval, the `460 ms` shake window, `guessLocked`, or `aria-live`. | [design §5.3](immersive-motion-redesign-design-2026-11-22.md:305) |
| 8 | [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:1) | Add the two ambient loop hosts (chevron bob `2400ms`, `go!` offset-layer drift `3200ms`, both `transform` only, ≤ 4 px). One shared `IntersectionObserver` toggles a single `data-ambient` attribute on `<main>`; no per-element observers. Pause loop B while the CTA is hovered or focus-visible. Add `transitionTypes: ["nav-forward"]` to the existing `router.push` call. **Preserve the hero entrance variants, the setup-arrival pulse and the `go!` press geometry unchanged.** | [design §5.1](immersive-motion-redesign-design-2026-11-22.md:245), [§5.2](immersive-motion-redesign-design-2026-11-22.md:262) |
| 9 | [`components/home/CategorySelector.tsx`](../components/home/CategorySelector.tsx:1) | Add the row cascade (`32ms` stagger, cap 6, `180ms` each) inside the existing `key={domainKey}` remount, so it replaces rather than stacks on the current 180 ms fade. Keep the imperative height interpolation and its reduced-motion branch untouched. | [design §5.1](immersive-motion-redesign-design-2026-11-22.md:245) |
| 10 | [`components/home/DomainSelector.tsx`](../components/home/DomainSelector.tsx:1) | Selection-dot pop via `@starting-style` + `--motion-ease-overshoot` (`140ms`); label offset-shadow step via `--motion-ease-step-2`. Retime the existing 150 ms transitions to the token. Keep `peer`/`sr-only` input wiring and every `focus-within` / `peer-focus-visible` outline rule. | [design §5.1](immersive-motion-redesign-design-2026-11-22.md:245) |
| 11 | [`components/CategoryCard.tsx`](../components/CategoryCard.tsx:1) | Same dot pop and token retiming as the domain selector. Keep the `unavailable` path (`opacity-55`, `cursor-not-allowed`, disabled input) free of motion. | [design §5.1](immersive-motion-redesign-design-2026-11-22.md:245) |
| 12 | [`components/ModeButton.tsx`](../components/ModeButton.tsx:1) | Same dot pop and token retiming. `comingSoon` / disabled modes stay motionless. | [design §5.1](immersive-motion-redesign-design-2026-11-22.md:245) |
| 13 | [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:1) | Add the row cascade (`32ms`, cap 6) on open; retime the existing 200 ms in/out to `--motion-dur-base` without changing the `200 ms` JS close delay or its `prefersReducedMotion` branch. **No change** to focus management, `onCancel`, backdrop click handling, or storage calls. | [design §5.1](immersive-motion-redesign-design-2026-11-22.md:245) |
| 14 | [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx:1) | **Conditional.** The design's focus-mode treatment moved to the OR badge, which lives in `ComparisonBoard`, so this file may need **no change at all**. Include it only if the header needs a motion-relevant attribute; otherwise drop it from the change set and record that it was untouched. | [design §10 item 9](immersive-motion-redesign-design-2026-11-22.md:452) |

### 2.1 Tier B — frozen, not authorised

| File | Why it stays frozen |
|---|---|
| [`app/game/classic/page.tsx`](../app/game/classic/page.tsx:1), [`app/game/time-attack/page.tsx`](../app/game/time-attack/page.tsx:1) | Concrete routes with authorization logic. HomeSetup navigates to `/game/${mode}`, which resolves to `app/game/[mode]/page.tsx`, not these files, so they are not on the transition path. Touching them would be scope expansion with no benefit. |
| [`app/game/layout.tsx`](../app/game/layout.tsx:1) | Next's view-transition docs state enter/exit never fire in a layout because layouts persist ([`view-transitions.md`](../node_modules/next/dist/docs/01-app/02-guides/view-transitions.md:268)). Hosting a transition here cannot work. |
| [`app/layout.tsx`](../app/layout.tsx:1) | No global motion provider, no global transition name, no token injection needed. |
| [`components/game/DerivedGameState.tsx`](../components/game/DerivedGameState.tsx:1) | Loading/error entrance was not requested and adds no engagement. Its `animate-spin` already has `motion-reduce:animate-none`. |
| [`components/game/GameplayDivider.tsx`](../components/game/GameplayDivider.tsx:1) | Decorative; the focus-mode treatment was deliberately relocated to the OR badge to avoid touching it. |
| [`components/ui/button.tsx`](../components/ui/button.tsx:1) | Unused by the game surfaces ([analysis open question 11](immersive-motion-redesign-analysis-2026-11-22.md:447)). Upgrading the primitive would not reach any rendered control. |

### 2.2 Must-not-touch (for the record)

`lib/game/deck.ts`, `lib/api/**`, `lib/catalog/**`, `lib/highScores/**`, `types/**` (except the expansion-requested declaration file), `scripts/**`, `app/api/**`, `next.config.ts`, `components.json`, `package.json`, `package-lock.json`.

---

## 3. Allowlist expansion requests requiring owner approval

These are **requests**, not authorised changes. Each is required only by owner decision 1 (route-level `<ViewTransition>`). If any is refused, the Tier-A-only fallback in §3.2 applies and every other part of this plan still ships.

| # | File | Minimal change | Why it is required | Blast radius |
|---|---|---|---|---|
| E1 | [`app/page.tsx`](../app/page.tsx:1) | Wrap `<HomeSetup catalog={catalog} />` in a `<ViewTransition default="none" enter={{ "nav-forward": "nav-forward", default: "none" }} exit={{ "nav-forward": "nav-forward", default: "none" }}>`. Four added props, no logic change. | The wrapper must live in `page.tsx`, not a layout ([`view-transitions.md`](../node_modules/next/dist/docs/01-app/02-guides/view-transitions.md:268)). Without it the Home side of the pair does not exist. | Low. Server component, single child, no data flow change |
| E2 | [`app/game/[mode]/page.tsx`](../app/game/[mode]/page.tsx:1) | Wrap the `ClassicGame` / `TimeAttackGame` returns in the matching `<ViewTransition>`. Leave the `redirect` / `notFound` / `DerivedGameState` early returns unwrapped. | Same reason — the destination needs its own wrapper to form the enter/exit pair. | Low–medium. This file holds route authorization; the change must not reorder the authorization checks or move the provider call |
| E3 | New file `types/view-transition.d.ts` | A single line: `/// <reference types="react/canary" />`, optionally with a one-line comment explaining why. | `@types/react@19` declares `ViewTransition` only in `canary.d.ts`, not `index.d.ts` ([`node_modules/@types/react/canary.d.ts`](../node_modules/@types/react/canary.d.ts:109)); nothing in the project references it ([`tsconfig.json`](../tsconfig.json:1), [`next-env.d.ts`](../next-env.d.ts:1)). Without it the import fails type-checking even though runtime resolution works via Next's bundled React ([`node_modules/next/dist/compiled/react/cjs/react.production.js`](../node_modules/next/dist/compiled/react/cjs/react.production.js:395)). | Low–medium. A canary reference can augment global React types. Must be validated by a full type check before any route wiring lands |
| E4 | `tsconfig.json` (**only if E3 fails**) | Add `"react/canary"` to a `types` array. | Same purpose, wider effect. | High. Global type changes for the whole project; prefer E3 |

**Not requested:** `app/game/classic/page.tsx`, `app/game/time-attack/page.tsx`, `app/game/layout.tsx`, `app/layout.tsx`, `next.config.ts`. Next's docs state view transitions need no configuration ([`view-transitions.md`](../node_modules/next/dist/docs/01-app/02-guides/view-transitions.md:50)), and the layout is the wrong host ([`view-transitions.md`](../node_modules/next/dist/docs/01-app/02-guides/view-transitions.md:268)). If an implementation attempt concludes otherwise, that is a **stop condition**, not a silent addition.

### 3.1 Sequencing constraint for the expansion

E3 must land and type-check **first**. If `ViewTransition` cannot be made type-visible within one attempt, decision 1 is abandoned for this pass rather than worked around with `@ts-expect-error`, `any`, or a runtime-created component. Those workarounds hide a framework-type gap behind a lie.

### 3.2 Tier-A-only fallback (if E1–E4 are refused)

Route motion is dropped. No delayed navigation, no artificial exit fade, no `startViewTransition` call by hand. The navigation becomes instant again — exactly today's behaviour ([analysis §4.5](immersive-motion-redesign-analysis-2026-11-22.md:309)) — and the design's "continuity" job is carried entirely by the in-round card handoff, which is Tier A. Nothing else in this plan changes, and the route-continuity principle is recorded as deferred, not delivered.

---

## 4. Implementation sequence

Dependency order. Steps marked **independent** can land on their own.

| Step | Work | Files | Independent? | Why this order |
|---|---|---|---|---|
| **S1** | Motion tokens + keyframes + variant classes | `app/globals.css` | **Yes** | Nothing changes visually until consumed. Establishes the vocabulary every later step references; prevents ad-hoc values appearing in components |
| **S2** | Route-transition type spike: add the canary reference, confirm `ViewTransition` type-resolves, confirm `npm run lint` and a type check stay clean, then revert if it fails | `types/view-transition.d.ts` (E3) | **Yes** | Highest-uncertainty item; must be settled before any route file is edited, and is cheap to abandon |
| **S3** | Gameplay primitives: card handoff + tint steps + value sequencing; decision press/hover retiming; tally bump prop | `GameCard.tsx`, `DecisionControls.tsx`, `GameplayStatus.tsx` | **Yes** | Leaf components that take props; no orchestration needed to verify them in isolation |
| **S4** | Gameplay orchestration: tier derivation, round counter, wrong beat, OR-badge focus mode, timer urgency class, delta retiming | `ClassicGame.tsx`, `TimeAttackGame.tsx`, `ComparisonBoard.tsx`, (`GameplayShell.tsx` only if needed) | Yes, given S3 | Consumes S3's prop surface. Tier logic must be display-only and reviewed against the untouched timing constants |
| **S5** | Home choreography: ambient hosts + observer, selection physics, category cascade, modal cascade, `transitionTypes` on `router.push` | `HomeSetup.tsx`, `CategorySelector.tsx`, `DomainSelector.tsx`, `CategoryCard.tsx`, `ModeButton.tsx`, `HighScoresModal.tsx` | Yes, given S1 | Independent of gameplay. `transitionTypes` is inert until S6 lands, so it is safe to add early |
| **S6** | Route transition wiring: wrappers + CSS | `app/page.tsx` (E1), `app/game/[mode]/page.tsx` (E2), `app/globals.css` | Requires S2 + approval | Last because it depends on S2's verdict and on S5's `transitionTypes` |
| **S7** | Reduced-motion pass + accessibility sweep + full verification | All touched files | Requires S1–S6 | Cross-cutting validation only makes sense once every beat exists |

**Landable sets:** {S1}, {S1 + S3}, {S1 + S3 + S4}, {S1 + S5}, {S1…S6}, {S1…S7}. Each set is internally consistent and leaves the app working.

---

## 5. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Detection |
|---|---|---|---|---|---|
| R1 | **Gameplay timing drift.** A motion carry-over pushes a deck advance or delays an input | Low | High — it changes the game | Motion never touches timers, handlers or `setTimeout` values; every beat is budgeted to end inside the existing window (≤ 460 ms vs 1500/800/400 ms) | Source diff on the four timing constants; Playwright timing capture of the reveal-to-advance interval |
| R2 | **Timer accuracy.** Animated work starves the 1000 ms interval in Time Attack | Low | Medium | Compositor-only properties; no new rAF; no animated filter/blur; the interval logic is untouched | Compare `displayTime` decrement cadence against wall clock during a 10 s sample |
| R3 | **Double-fire on rapid input.** Two entries stacked on the same card, or a repeated tier stamp | Medium | Medium | Tier beats are one-shot per reveal, driven by `phase`; card handoff is gated by a round counter; `guessLocked` (TA) and `phase !== "playing"` (Classic) already block re-entry and are not modified | Rapid double-click and key-hold tests; assert a single `data-result` per reveal |
| R4 | **Reduced-motion regression.** New Motion paths ignore `useReducedMotion`, so movement survives the preference | Medium | High — accessibility regression | Every new Motion beat is authored with an explicit opacity-only variant in the same edit; the global CSS block is untouched and still covers CSS paths | Emulated `prefers-reduced-motion: reduce` pass asserting non-zero positional frames do not occur |
| R5 | **Hydration / SSR flash with Motion.** A component renders `opacity: 0` on the server and only JS reveals it | Medium | High — content invisible if JS fails | No entry animation on first mount; handoff animations are prop-gated; `@starting-style` for CSS-only entries; nothing is hidden by default in server markup | View-source / JS-disabled check on Home and Gameplay; console hydration warnings |
| R6 | **ViewTransition browser support.** Non-supporting engines silently skip the transition, or Safari behaves differently | Low | Low — documented graceful degradation ([`view-transitions.md`](../node_modules/next/dist/docs/01-app/02-guides/view-transitions.md:53)) | Accept degradation; no content depends on the transition | Chromium verification only; other engines recorded as `[Not tested]` |
| R7 | **ViewTransition overlay swallows a click.** The player presses `go!` twice and the second press is lost | Low | Low | `::view-transition { pointer-events: none }`; no named participants; `--motion-dur-route` kept at `320 ms` | Rapid double-click on `go!` test |
| R8 | **Mobile overflow.** A transform excursion widens the 390 px document | Low | Medium | All excursions ≤ 10 px and transform-only; `overflow-x: hidden` already on body and shell | 390×844 `scrollWidth` assertion on Home and both modes |
| R9 | **`@starting-style` unavailable.** Selection dot appears instantly on older engines | Medium | Low | Instant appearance is a valid outcome; the state remains encoded by the filled dot and the label shadow | Feature check in the target browser; visual comparison |
| R10 | **Type gate blocked.** E3 augments global React types in a way that breaks existing compilation | Medium | Medium | S2 is a spike: land the reference, type-check, and revert if anything else breaks. Never proceed with `@ts-expect-error` | `npm run lint` plus a full type check immediately after S2 |
| R11 | **Two motion vocabularies remain.** Legacy unused CSS utilities coexist with the new ladder | High (accepted) | Low | Explicit reuse ledger ([design §3.6](immersive-motion-redesign-design-2026-11-22.md:186)); deleting legacy CSS is declared out of scope, not forgotten | Read-back of `globals.css` showing the new block is append-only |
| R12 | **Scope creep into layout.** A beat tempts a spacing or stacking change | Medium | High — violates a hard owner constraint | Any layout change is a stop condition (§7) | Diff review limited to `transform`/`opacity`/colour/attribute lines |

---

## 6. Verification matrix

Verification is proportional: source read-back for every change; runtime checks only where the capability and a running environment are confirmed. Unrun checks are reported as `[Not tested]`; blocked ones as `[Blocked]` with the reason.

### 6.1 Static checks

| Check | Command / method | Applies to |
|---|---|---|
| Source read-back | Read every touched file after editing; confirm the token block is append-only and the `:root` at `:4` and reduced-motion block at `:188` are unchanged | All |
| Lint | `npm run lint` | All |
| Type check | `npx tsc --noEmit` (project has `noEmit: true`) | All, and mandatory after S2 |
| Build | `npm run build` — **only if the dev server is stopped first**, since a running `next dev` on the same `.next` directory can conflict. Otherwise `[Blocked]` with that reason | All |
| Timing-constant diff | Confirm `1500`, `800`, `400`, `1000`, `460` are unchanged in the two game components | S4 |

### 6.2 Runtime checks (local dev server)

Server: the pre-existing `next dev` on `http://localhost:3000` (HTTP 200 recorded in the analysis). If it is not running, start it and record that fact.

| # | Check | Method | Viewports | Status target |
|---|---|---|---|---|
| V1 | Home renders, zero console errors | Playwright navigate + console capture | 1440×900, 390×844 | `[Pass]` = 0 errors, 0 warnings |
| V2 | Gameplay renders for both modes | `/game/classic?category=movie-series-rating`, `/game/time-attack?category=…` | 1440×900, 390×844 | `[Pass]` |
| V3 | Ambient loops: exactly 2 at rest on Home, 0 on gameplay | `document.getAnimations()` count, grouped by `animationName` | 1440×900, 390×844 | 2 on Home, 0 on gameplay (except the TA timer `width`) |
| V4 | Ambient amplitude and duration | Computed `animation-duration` and keyframe offsets | Both | ≤ 4 px, ≥ 2400 ms |
| V5 | Ambient pause offscreen | Scroll the CTA out of view; assert `animation-play-state` | 390×844 | `[Pass]` |
| V6 | Decision hover + press | Hover, then `mousedown`; sample `getAnimations()` | Both | Press ≤ 90 ms; hover settle ≤ 140 ms |
| V7 | Correct reveal | Click the correct direction; sample for 600 ms | Both | Plate flip ≤ 140 ms, value lands at ≈ 120–300 ms, all motion ends ≤ 460 ms |
| V8 | Wrong reveal | Click the wrong direction | Both | Tint ≤ 140 ms; TA jolt ≤ 460 ms; TA delta label ≤ 380 ms |
| V9 | t1→t4 escalation | Hold a correct streak past 2, 3 and 5 | Both | One distinct beat per tier; no two tiers fire at once |
| V10 | Streak line appears only with a streak | Inspect the status subtree | Both | Absent at t1/t2 |
| V11 | Tally bump does not fire on the TA countdown | Observe the `role="timer"` node across ≥ 5 ticks | time-attack | 0 bump animations on the timer |
| V12 | Timer urgency | Drive `displayTime` to ≤ 10 | time-attack | `.timer-urgent` present, colour `rgb(240,90,199)`, `aria-live="assertive"`, pulse ≈ 600 ms |
| V13 | Game over unchanged | Reach game-over in both modes | Both | `animation-name: none` on the panel container |
| V14 | Modal open/close | Open High Scores, close via button, Escape, backdrop | Home | 200 ms in/out; rows cascade; opener regains focus |
| V15 | Card handoff | Advance rounds repeatedly | Both | Enter only; no height change; no duplicate cards |
| V16 | Mobile geometry unchanged | Measure `scrollHeight`, control `y`, `scrollWidth` | 390×844 | Document height ≈ 1252 px for Classic, controls at ≈ 1100/1166, `scrollWidth` = viewport width |
| V17 | Route transition | Press `go!` | 1440×900 | Fade + 8 px rise ≈ 320 ms; no pointer-event loss on a rapid double-click |
| V18 | Reduced motion | Emulate `prefers-reduced-motion: reduce` and repeat V6–V15 | Both | Opacity crossfades present (≥ 100 ms); **zero** positional movement; ambient loops absent; no jolt, shake, ring or stamp |
| V19 | Console after the whole sweep | Console capture, all messages | Both | 0 errors, 0 warnings |
| V20 | animation-inspector diagnostics | `discover_animations` + `extract_animation_code` against the local URLs | Home, gameplay | Inventory matches V3 and V4; no unexpected infinite loops |
| V21 | Screenshot comparison | Before/after captures of Home and gameplay at both viewports | Both | Layout identical except in-motion frames |
| V22 | Keyboard parity | `ArrowUp`/`h` and `ArrowDown`/`l` | Both | Same visual acknowledgement as pointer input |
| V23 | Focus visibility | Tab through Home and gameplay | Both | Focus ring visible on every control, never occluded by an animated layer |

### 6.3 Not assessable in this plan

| Item | Status |
|---|---|
| Perceptual / feel acceptance of the tier ladder | `[Not tested]` — requires a human reviewer. The plan does not claim it |
| Non-Chromium engine behaviour for view transitions | `[Not tested]` |
| `@starting-style` on the project's full browser target set | `[Not tested]` |
| Production build under the running dev server | `[Blocked]` if the server cannot be stopped |

---

## 7. Stop conditions

Stop and report rather than proceeding if any of these occur:

1. **A file outside the Tier A allowlist turns out to be necessary** and it is not in the §3 expansion table. Do not add it silently.
2. **`ViewTransition` cannot be made type-visible** by E3/E4 within one attempt, or the canary reference breaks existing compilation. Abandon decision 1 for this pass and use the §3.2 fallback.
3. **Any timing constant** (`1500`, `800`, `400`, `1000`, `460`) would need to change to fit a beat. Trim the beat instead; if it still does not fit, stop.
4. **A beat requires a layout-driving property** (width, height, margin, padding, top, left) beyond the single existing `CategorySelector` height exception.
5. **A change would alter gameplay state, scoring, deck behaviour, storage semantics, or provider calls** — even if it makes the motion nicer.
6. **Reduced motion cannot be preserved** for a beat, or the global reduced-motion block would need weakening, reordering or removal.
7. **A new dependency** would be required. None is planned; Motion `14.1.0` is enough.
8. **Mobile layout would shift**: document height changes, controls move further down, or horizontal overflow appears.
9. **Copy, labels or live-region wording** would need to change.
10. **Contradiction** is found between this plan, the design document, the analysis, or `.roo/rules/`. Flag it; do not pick a side.
11. **The working tree contains unrelated uncommitted changes** that touch an allowlisted file. Preserve them; do not revert, overwrite or absorb them. Re-check the tree at the start of implementation (the analysis recorded branch `lj-branch` with empty tracked diffs on 2026-11-22).

---

## 8. Open questions / `Needs Verification`

1. `Needs Verification [inferred-from-codebase]` — **E3 is unproven.** A `/// <reference types="react/canary" />` declaration file is the least invasive way to make `ViewTransition` type-visible, but whether `@types/react@19.2.8`'s canary surface augments cleanly without disturbing existing component types is not verified. S2 exists to answer this before any route file is touched.
2. `Needs Verification [product-decision]` — **Wrong answers sit off the reward ladder** at fixed intensity ([design §4.1](immersive-motion-redesign-design-2026-11-22.md:196)). Escalating them is a different product call and would conflict with the restrained game-over decision.
3. `Needs Verification [product-decision]` — **Time Attack tiers read cumulative `score`, not a consecutive-correct combo.** A real combo needs new display state and is not in this plan.
4. `Needs Verification [product-decision]` — **Ambient loop B needs one `IntersectionObserver`.** If zero-JS ambience is preferred, loop B is dropped and the two-loop budget is simply under-used.
5. `Needs Verification [product-decision]` — **No user-facing motion toggle.** OS-level preference is the only control.
6. `Needs Verification [environment-specific]` — **`@starting-style` support** on the project's target browsers is unverified; the fallback is an instant dot.
7. `Needs Verification [capability-unavailable]` — **Perceptual acceptance of the ladder is not assessed**; no human review exists.
8. `Needs Verification [capability-unavailable]` — **`impeccable context` did not run in this planning session** (no command-execution tool). Its analysis-stage directives were reused. Re-run before implementation if the tool becomes available.
9. `Needs Verification [inferred-from-codebase]` — **`components/game/GameplayShell.tsx` may require no change.** If so it is dropped from the change set, not edited cosmetically.
10. `Needs Verification [inferred-from-codebase]` — **Whether wrapping the Home page in `<ViewTransition>` interacts badly with `HomeSetup`'s client boundary and its hero entrance.** Both are plausible individually; the combination is untested and is covered by V17 plus V1.
11. `Needs Verification [inferred-from-codebase]` — **The design's `--motion-ease-overshoot` and `--motion-ease-slam` values are copied from measured computed styles**, not from per-percent keyframe captures ([analysis §4.5](immersive-motion-redesign-analysis-2026-11-22.md:340)). They are the best available evidence and should be re-judged perceptually during QA.

---

## 9. Handoff trace

- **Task type:** visual change + interaction enhancement; Plan stage only.
- **Files written by this stage:** this document only. The design document was created by the immediately preceding stage and is referenced as the source of truth.
- **Files changed in the application:** none.
- **Analysis document:** not modified.
- **Approved modification allowlist:** the fourteen Tier A files in §2, with `GameplayShell.tsx` conditional; Tier B frozen per §2.1.
- **Pending owner decisions:** the four expansion requests in §3 (E1–E4) are required only for the route-level transition already approved in principle; the Tier-A-only fallback in §3.2 needs no approval.
- **Verification performed for this stage:** source read-back of the analysis, design, governance rules, `design-reference/` tokens, `app/globals.css`, every in-scope component, `package.json`, `tsconfig.json`, `next-env.d.ts`, the Next 16 view-transition / `useRouter` / `Link` docs, and a `node_modules` search confirming where `ViewTransition` types and runtime exports actually live.
- **Verification not performed:** nothing was implemented, so no runtime, lint, build, browser, or perceptual check was possible. All of §6 is forward-looking.
- **Open `Needs Verification` items:** eleven, listed in §8 with qualifiers, carried forward to the implementation stage.
