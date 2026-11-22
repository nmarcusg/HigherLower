# Idle Sprites · Reactive Field · Loading & Entrance · Scroll-Free Go — Independent QA

**Date:** 2026-11-22
**Stage:** Independent QA (verification only). **No application code was modified.**
**Branch:** `lj-branch`
**Reviewer:** QA pass executed against the owner's running `next dev` on port 3000
**Inputs treated as claims, not proof:** [`idle-sprites-transition-go-ux-handoff-2026-11-22.md`](./idle-sprites-transition-go-ux-handoff-2026-11-22.md), [`…-plan-…`](./idle-sprites-transition-go-ux-plan-2026-11-22.md), [`…-design-…`](./idle-sprites-transition-go-ux-design-2026-11-22.md), [`…-analysis-…`](./idle-sprites-transition-go-ux-analysis-2026-11-22.md), plus the earlier procedural-canvas/audio and immersive-motion documents.

---

## 1. Environment and method

| Item | Value |
|---|---|
| Runtime | Next.js dev server on `http://localhost:3000` (owner process, reused, never stopped) |
| Browser harness | Playwright MCP, `devicePixelRatio: 1` |
| Viewports | 1440×900 and 390×844 (required); 390×700 used as a supplemental structural probe |
| Reduced motion | `page.emulateMedia({ reducedMotion })` |
| Build | **Not run** — the owner's dev server holds `.next`; recorded `[Blocked]` |
| animation-inspector | Not used (still refuses localhost, as the handoff states) |
| Secrets | None read, copied, or recorded |

**Harness limitation that shapes this report.** The browser window is occluded in this environment, so Chromium throttles `requestAnimationFrame` to ~1–2 Hz even while `document.visibilityState === 'visible'` and `document.hasFocus() === true` (measured: 2 rAF/s; engine ~1 frame/s). Consequences:

- **Per-frame structural facts are measurable** (one frame is still a full frame: sprite draw counts, gradients, `clearRect`).
- **Sub-360 ms temporal sampling is not trustworthy** (`[Blocked]`). This is the same limitation the handoff recorded in V5. It applies to surge amplitude, the +6 px offset, the 180 ms/80 ms wrong beat and tier reserve behaviour.
- **CSS transitions can be frozen at their start value** because style interpolation needs frames. Where a transition interfered with reading a target state, QA disabled transitions **on the page** (injected `<style>`, not a source edit) and re-measured. Those readings are marked *"settled (transitions disabled)"*.

---

## 2. Allowlist result

### 2.1 Named files — confirmed present and matching the claims

| Expected | Present | Content check |
|---|---|---|
| New `lib/atmosphere/sprites.ts` | Yes | Offscreen baker: 6 spark + 4 chevron canvases, `document.createElement`, never appended |
| New `components/home/LaunchDock.tsx` | Yes | Presentational; `data-atmo-go`, `aria-hidden` when closed, single `<button>` |
| New `components/game/GameplayEntrance.tsx` | Yes | `cloneElement` cloner, no wrapper node, no state |
| Mod `lib/atmosphere/canvasEngine.ts` | Yes | Sprite set, `drawSprites`/`drawChevrons`, masks, surge/beat state, reduced-motion branch |
| Mod `lib/atmosphere/delegation.ts` | Yes | One additive `data-atmo-go → { target: "go", cue: "press" }` branch |
| Mod `components/home/HomeSetup.tsx` | Yes | `setupRef` on the existing observer, `dockVisible`/`keyboardOpen`, `<LaunchDock/>`, `data-atmo-safe="hero"` |
| Mod `components/game/ClassicGame.tsx` | Yes | `gameplay-entrance`, `GameplayEntranceStatus`, `gameplay-entrance-controls` |
| Mod `components/game/TimeAttackGame.tsx` | Yes | Same three edits, `shake` preserved |
| Mod `components/game/DecisionControls.tsx` | Yes | Lower label `text-[#15122b]` ([`DecisionControls.tsx`](../components/game/DecisionControls.tsx:48)) |
| Mod `components/HighScoresModal.tsx` | Yes | Selected tab `bg-[var(--accent-classic)]/22 text-white` ([`HighScoresModal.tsx`](../components/HighScoresModal.tsx:281)) |
| Mod `app/globals.css` | Yes | Scrim, entrance keyframes, dock block, `nav-forward` retarget, reduced-motion overrides |

### 2.2 No new dependencies / config changes — confirmed

`git diff --name-only` contains **no** `package.json`, `package-lock.json`, `next.config.ts`, `components.json`, `tsconfig.json`, `eslint.config.mjs` or `postcss.config.mjs`. `package.json` is untouched in the working tree.

### 2.3 Exact-allowlist isolation — `[Blocked] [environment-specific]`

`git status` shows **more** modified/untracked paths than this task's allowlist:

- Modified: `app/game/[mode]/page.tsx`, `app/layout.tsx`, `app/page.tsx`, `components/CategoryCard.tsx`, `components/ModeButton.tsx`, `components/game/ComparisonBoard.tsx`, `components/game/GameCard.tsx`, `components/game/GameplayShell.tsx`, `components/game/GameplayStatus.tsx`, `components/home/CategorySelector.tsx`, `components/home/DomainSelector.tsx`
- Untracked: `components/atmosphere/`, `components/audio/`, `lib/audio/`, `types/view-transition.d.ts`, `lib/atmosphere/{eventBus,types}.ts`

There is **no commit boundary for this task**: HEAD predates the procedural-canvas/audio and immersive-motion tasks, whose work is still uncommitted in the same tree. Those extra paths are attributable to that prior approved work (their own handoffs name the same files), but git alone cannot prove per-task provenance. Allowlist verification is therefore **content-confirmed for the named files** and **not provable as an exact set** from this working tree. This is a recorded limitation, not a detected scope violation.

### 2.4 `app/globals.css` byte-identity — `[Partial]`

Relative to HEAD the diff has non-append hunks at `:134`–`:149` (four `high-scores-dialog` in/out rules retimed to `--motion-dur-base`/`--motion-ease-out`). Those are the **immersive-motion task's authorised retime** (its handoff item 1b), not this task's. Confirmed unchanged in the current file: the token `:root`, the single `prefers-reduced-motion` block, and the legacy keyframes (`floatUp`, `shake`, `pulse-ring`, `home-dialog-in/out`, …). Everything this task added is in the appended layer:

- `::view-transition-new(.nav-forward)` → `route-fade-in var(--motion-dur-quick) var(--motion-ease-out) both`; `route-rise-in` remains defined but now unused.
- `.gameplay-surface` three-layer scrim.
- Entrance keyframes/classes and dock block.

Because the append itself arrived with the immersive-motion task in the same uncommitted tree, the "one retarget inside pre-existing appended content" claim cannot be isolated by `git diff` here; the **current end state** was verified instead (see §4.4).

---

## 3. Static checks

| ID | Check | Status | Evidence |
|---|---|---|---|
| S1 | TypeScript | `[Pass]` | `npx tsc --noEmit` exit 0 |
| S2 | Lint | `[Pass]` | `npm run lint` exit 0, **0 errors**, 95 pre-existing warnings (`.agents/` scripts, `lib/api/worldbank.ts`, `lib/catalog/availability.ts`) |
| S3 | Build | `[Blocked]` | Owner's dev server holds `.next`; not stopped |
| S4 | One canvas / one rAF chain | `[Pass]` | Sprites are offscreen (`bakeCanvas` → `document.createElement("canvas")`, never appended, [`sprites.ts`](../lib/atmosphere/sprites.ts:93)). Exactly two `requestAnimationFrame` call sites in the engine (start + self-schedule in `step`, [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:915), [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:946)); one `rafId`; no `setInterval`; no `IntersectionObserver` in `lib/atmosphere/**`. Runtime `document.querySelectorAll('canvas').length === 1` at every viewport tested |
| S5 | Sprite cache outside the loop | `[Pass]` | `drawSprites`/`drawChevrons` contain only arithmetic + `drawImage` ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:616), [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:658)). Zero `shadowBlur` assignments and zero `ctx.filter` assignments measured at runtime (prototype setters instrumented). `createRadialGradient` calls per second in the steady state: **0** (all gradients are in `bakeStatic`/`bakeVignette`/`sprites.ts`, or the pre-existing `swell`/`glow` impulse kinds) |
| S6 | Sprite counts | `[Pass]` | Desktop: 28 sparks + 10 chevrons per frame. Mobile: 12 sparks + 6 chevrons per frame (measured via `drawImage` destination sizes 14/8 px vs 20×26 px) |
| S7 | Masks are bake-time only | `[Pass]` | `punchRect` / `bakeSafeBands` read layout only inside `rebakeAll()` ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:477), [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:493)); `drawFrame` performs no DOM read |
| S8 | `#6355cb` text ban (D9) | `[Pass]` | Full computed-style scan for `color: rgb(99, 85, 203)` on text-bearing leaf nodes: **0 offenders** on Home and gameplay. Token `--accent-classic` is still `#6355cb`, used only as tint/shadow/border |
| S9 | HV-1 fix | `[Pass]` | Selected score tab renders `text-white` on a 22 % classic tint ([`HighScoresModal.tsx`](../components/HighScoresModal.tsx:281)); composite ≈ `rgb(38,33,78)` under white ≈ **15:1** (was solid `#6355cb` at 3.25:1) |

---

## 4. Runtime matrix

### 4.1 Canvas / sprites / field

| Check | 1440×900 | 390×844 |
|---|---|---|
| `<canvas>` count | 1 | 1 |
| Canvas geometry | 1435×900 (5 px scrollbar) | 385×844 |
| Sparks / chevrons per frame | 28 / 10 | 12 / 6 |
| Chevron idle alpha range | 0.102 – 0.257 | — |
| `shadowBlur` / `filter` sets | 0 / 0 | 0 / 0 |
| `createRadialGradient` per second (steady) | 0 | 0 |
| Hero-band alpha at centre (`[data-atmo-safe="hero"]`) | — | **0** (erased) |
| Field alpha outside the band | — | 36 |
| Field coverage (sparse 25 px grid) | — | 384/510 points non-zero, `maxAlpha 78` |
| Text-safe/card-safe mask | gameplay header/status/control bands + card + OR rects punched at bake (source) | same |
| Gameplay recession (`data-surface`, `data-mode`) | present | present |
| Reduced-motion frozen frame (900 ms apart) | — | Home: **identical**; `document.getAnimations()` = 0; idle `clearRect` = 0 / 1200 ms |

### 4.2 Reactive form

| Check | Result |
|---|---|
| Pointer `Higher` | `data-guess="higher"`; `data-phase` transitions to `revealing`/`game-over`; `data-tier` written |
| Keyboard `h` / `ArrowUp` | `data-guess="higher"` — match |
| Keyboard `ArrowDown` | `data-guess="lower"` — match |
| Keyboard `l` | not reached (run ended at game-over); same handler as `ArrowDown` by source ([`ClassicGame.tsx`](../components/game/ClassicGame.tsx:285)) |
| Tier progression observed | `tier` 0 → 1 → 2 across three correct/keyboard beats |
| Pointer/keyboard parity | `[Pass]` — same `handleGuess`; engine ignores `source` |
| Hot-swap / ±6 px / 0.20→0.62 / 180+80 ms wrong beat | `[Blocked]` — rAF throttle (§1) |
| Tier reserve pairs joining surge | `[Not tested]` at runtime; source rule `index - 6 < surgePairs*2`, capped at 2 pairs ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:675)) matches design §3.3 |
| Non-escalation | source: one fixed beat, no accumulation ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:728)) |
| Reduced-motion reveal | **exactly 1** `clearRect` after a guess (still 1 after 2.4 s); canvas pixel hash changed → discrete brightness swap, no motion |
| Reduced-motion second repaint (phase→playing) | source-only; not observed because the guess ended the run |

### 4.3 Scrim / contrast / grid

| Check | Result |
|---|---|
| `.gameplay-surface` `background-image` | grid (right), grid (bottom), `radial-gradient(120% 90% at 50% 45%, rgba(21,18,43,.86) 0%, .8 55%, .6 100%)` — **86 → 80 → 60** confirmed |
| `background-size` | `54px 54px, 54px 54px, 100% 100%` |
| `background-color` | `rgba(0,0,0,0)` (transparent, per DEV-3) |
| Dot grid still paints | grid layers retained as top background layers; `background-repeat: repeat, repeat, no-repeat` |
| Lower button | `rgb(21,18,43)` on `rgb(217,63,208)` → **4.83 : 1** `[Pass]` AA (16 px bold) |
| Higher button | **10.08 : 1** `[Pass]` |
| Focus ring | `3px solid rgb(34,211,238)`, offset 4 px `[Pass]` |
| HV-1 selected tab | ≈ **15 : 1** `[Pass]` |

### 4.4 Transition / entrance

| Check | Result |
|---|---|
| `startViewTransition` calls on dock launch | **1**, `types: ["nav-forward"]` — the handoff's `[Partial]` is resolved for this path (the JS context survives the client-side push) |
| `::view-transition-new(.nav-forward)` | `route-fade-in`; keyframes `0% { opacity: 0 } → 100% { opacity: 1 }` — **opacity only, no translate** |
| Entrance beats (computed) | card-current `240 ms @ 0`, card-next `240 ms @ 32 ms`, OR `180 ms @ 96 ms`, status `140 ms @ 168 ms`, controls `160 ms @ 220 ms` — controls settle at **380 ms** |
| Fill mode | `backwards` on all five |
| Double animation | none: card nodes carry no inline `transform`/`translate` on first mount; `.gameplay-entrance` itself has `animation-name: none` |
| Reduced-motion entrance | all five compute `tint-in 0.12 s @ 0` |
| Game-over overlay | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="classic-game-over-title"`, focus on `#btn-play-again`; dialog carries **no** entrance class; body keeps `gameplay-entrance` |
| Input blocking | none observed (double-guess navigation unaffected; `::view-transition` pointer-events rule present) |

### 4.5 Dock

| Check | 1440×900 | 390×844 |
|---|---|---|
| Closed at load | `data-open="false"`, `visibility: hidden`, `aria-hidden="true"` | same |
| Opens after `Start Comparing` | yes, `setup` ratio 1.0, `go!` 989 px below fold | yes, `go!` 1357 px below fold |
| Hides when `go!` enters | yes — closes as `go!` begins to intersect | yes — closes at the `go!` intersection |
| Dead zone (dock closed, `go!` fully off screen) | **none observed** | **none at 844 px** |
| Dead zone at a shorter viewport (supplemental 390×700) | — | **present at scrollY 1300–1340** (see F3) |
| Width / placement | 416 px, left 510, bottom 896 | 359 px, left 13, right 372, bottom 840 |
| Tab order | closed dock not focusable; open dock exposes exactly one `Go! …` button | same |
| Accessible name | `Go! Start Movie/Series Rating on Classic` (not "Start Comparing") | same |
| Context line | `Movie/Series Rating · Classic` | same |
| CLS | — | **0** (`layout-shift` observer, 0→900→0 scroll); doc height 2489 → 2489 |
| Audio-control overlap | — | false |
| Modal open → hidden | `html[data-modal="open"]` → `visibility: hidden`, `opacity: 0` (settled) | same |
| Software keyboard | `[Blocked]` — no `visualViewport` shrink emulation in this harness; `keyboard` stays `closed` |

### 4.6 Launch parity

| Check | Result |
|---|---|
| Dock launch target | `/game/classic?category=movie-series-rating` — identical to the main `go!` path |
| Transition | exactly 1 `nav-forward` |
| SFX | `target === "go"` → `launch` ([`audioEngine.ts`](../lib/audio/audioEngine.ts:302)); dock carries `data-atmo-go` → `{ target: "go" }`. Audible output not asserted |
| Warp origin | origin is the pressed element's rect (`originFor`), so the dock's own rect; not sampled per-frame |
| Audio is SFX-only | source: bounded `osc.start/stop`, noise sources stopped, no loop/music; legacy `music` key ignored ([`settings.ts`](../lib/audio/settings.ts:9)) |

### 4.7 Geometry / regression

| Check | Result |
|---|---|
| 390 gameplay `scrollWidth` | 385 (innerWidth 390) — no horizontal overflow |
| 390 gameplay `scrollHeight` | **1252**; Higher `y=1100`, Lower `y=1166` — matches the analysis baseline exactly |
| 390 Home `scrollHeight` | **2489** — unchanged |
| 1440 gameplay | `scrollWidth 1440`, `scrollHeight 900` — no overflow/scroll |
| Decision-control positions | unchanged; no audio overlap |
| Reveal/tally timings, deck, scoring, storage | untouched by diff (source) |
| Console, normal motion | Home: **0 errors**; gameplay: 0 errors (after isolating per navigation) |
| Console, reduced motion | Home: **1 error** — the pre-existing hero hydration mismatch (see F5) |
| Home ambient loops | present (`ambient-bob` running, `ambient-drift` paused offscreen) — unchanged by this task |

### 4.8 Screenshots

- [`qa/home-1440-setup-dock.png`](./assets/visual-ux-upgrade/qa/home-1440-setup-dock.png)
- [`qa/home-390-setup-dock.png`](./assets/visual-ux-upgrade/qa/home-390-setup-dock.png)
- [`qa/home-390-modal.png`](./assets/visual-ux-upgrade/qa/home-390-modal.png) (dock hidden while the high-scores dialog is open)
- [`qa/classic-1440.png`](./assets/visual-ux-upgrade/qa/classic-1440.png)
- [`qa/classic-390.png`](./assets/visual-ux-upgrade/qa/classic-390.png)
- [`qa/home-1440-reduced.png`](./assets/visual-ux-upgrade/qa/home-1440-reduced.png)

---

## 5. Findings

| # | Finding | Expected | Observed | Evidence | Classification | Severity |
|---|---|---|---|---|---|---|
| **F1** | Correct-reveal spark bias not implemented | Design §3.1: on a correct reveal the `near`-plane sparks get a `dirY` bias of `0.35` upward | `drawSprites` has no surge/beat term — only `mote.dirY` and `parallax`; no `0.35`/bias constant anywhere in the engine | [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:616)–[`641`](../lib/atmosphere/canvasEngine.ts:641); grep `0.35\|bias\|dirY` → only seeding + parallax | **Implementation bug** (design requirement absent) | **Low** — display-only; chevrons carry the direction cue |
| **F2** | Reduced-motion repaint after `resize()` uses seconds | `drawFrame(elapsed * 1000)` everywhere on the reduced-motion path | `resize()` calls `drawFrame(elapsed)` (seconds), inconsistent with every other call site; the frozen field is painted at a stale time | [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:560) vs [`968`](../lib/atmosphere/canvasEngine.ts:968)/[`996`](../lib/atmosphere/canvasEngine.ts:996)/[`1270`](../lib/atmosphere/canvasEngine.ts:1270) | **Implementation bug** (minor inconsistency) | **Low** — cosmetic sprite placement on a frozen frame |
| **F3** | Dock trigger leaves a **dead zone** at shorter viewports | Design §6.2: the dock "shows when `#setup` is intersecting and the real `.home-go` is not"; no stretch without a launch affordance | Implemented with an extra `setup ratio ≥ 0.25` gate (DEV-2). At 390×700: dock `data-open="false"` at scrollY 1300 (setup ratio 0.21) and 1340 (0.15) while `go!` top is 757/717 → **0 px visible**. At 1440×900 and 390×844 no dead zone occurs because `go!` intersects first | supplemental sweep, §4.5; [`HomeSetup.tsx`](../components/home/HomeSetup.tsx:110)–[`115`](../components/home/HomeSetup.tsx:115) | **Spec gap** (literal trigger vs design intent; already flagged by the implementer as open item 1) | **Medium** — needs a product decision, not a unilateral patch |
| **F4** | Two-CTA overlap window in the throttled harness | Never two CTAs on screen | At 1440×900, scrollY 1000 showed dock open with 11 px of `go!` visible, then closed on the next IO delivery (~350 ms later). With a 600 ms settle at 390 the close was exact at `go!` intersection | §4.5 sweeps | **Verification gap** (`[environment-specific]`) — IO delivery lag under 1–2 Hz frames, not a confirmed product bug | Low |
| **F5** | Reduced-motion hydration mismatch | — (pre-existing) | 1 console error on Home under `prefers-reduced-motion: reduce`: hero `h1/p/a` SSR `opacity 0 / translateY(8px)` vs client `1 / translateY(0)`, plus the dialog `className` differing by `motion-reduce` | console capture after fresh reduce navigation; matches prior QA F4 | **Pre-existing implementation bug, outside this task's diff** — entrance/dock add no JS/SSR branch | High visibility / out of scope |
| **F6** | Reactive amplitude unmeasured | Hot swap, `0.20 → 0.62`, ±6 px, 180/80 ms wrong beat, tier reserve | `[Blocked]` — 1–2 rAF/s makes sub-360 ms sampling meaningless | §1 | **Verification gap** (`[capability-unavailable]`) | Medium (coverage) |
| **F7** | Reduced-motion repaint count | "One discrete repaint per reveal" (C-6) | Observed exactly 1 for a game-ending reveal. Source adds a second repaint when `phase` returns to `playing` with an assertive flag set — not reachable in the observed run | [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:977)–[`981`](../lib/atmosphere/canvasEngine.ts:981) | **Verification gap** (`[Partial]`) | Low |
| **F8** | Closed dock stays focusable during its 180 ms visibility delay | Closed dock out of the tab order | `visibility` transitions with a 180 ms delay after `data-open=false`, so an invisible button remains focusable for that window (`pointer-events: none` blocks clicks). At steady state the dock is correctly non-focusable; in the frame-starved harness the window is unbounded | §4.5 focus tests; dock CSS `visibility 0s linear var(--motion-dur-base)` | **Implementation nuance** (design-intended fade), not a regression | Low |

**Checks that came back clean** (no finding): exactly one canvas and one rAF chain; sprites cached outside the loop; no per-frame `shadowBlur`/`filter`/gradient; correct desktop/mobile sprite counts; text- and card-safe masks; frozen reduced-motion field; pointer/keyboard parity; scrim 86→80→60 with the dot grid retained; Lower 4.83 : 1 and HV-1 ≈15 : 1; D9 ban; exactly one `nav-forward` transition; opacity-only route fade; 0/32/96/168/220 → 380 ms entrance with no double animation; unchanged game-over overlay; dock focus/name/CLS/modal/overlap behaviour; mobile geometry unchanged; SFX-only audio.

---

## 6. Verdict

**PASS with findings.** All four visual/UX upgrades are present, correctly wired, and behave as specified in every mechanism this pass could measure: the sprite field is a single cached, gradient-free draw path on one canvas; the gameplay scrim restores field visibility while keeping the dot grid; the reactive field is direction-correct and pointer/keyboard-symmetric; the route fade is opacity-only with exactly one view transition; the five-beat entrance settles at 380 ms with no double animation; and the scroll-free dock is accessible, CLS-free, modal-aware, and launches through the identical path as the main `go!`.

No blocking defect was found. Two low-severity implementation deviations exist (F1 missing spark bias, F2 a seconds/ms inconsistency on the reduced-motion resize repaint), one medium **spec/product** gap exists (F3 dead zone at shorter viewports), and the pre-existing reduced-motion hydration error (F5) is unchanged and remains outside this task's diff.

---

## 7. Postfix requirement and minimal scope

**Postfix is optional, not required for the shipped behaviour.** If the owner wants parity with the design text, the minimal scope is:

| Finding | Minimal fix | File | Approval |
|---|---|---|---|
| F1 | Add the `0.35` near-plane `dirY` bias while a correct surge is active | [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:616) | Within this task's allowlist |
| F2 | `drawFrame(elapsed * 1000)` in `resize()` | [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:560) | Within this task's allowlist |
| F3 | Decide the trigger: either keep the ratio gate and accept the shorter-viewport gap, or extend `dockVisible` to also require "`go!` not yet within N px of the viewport" | [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:110) | **Scope expansion — needs owner approval**; this is a product decision |
| F5 | Out of scope — pre-existing, own task | — | Owner decision |

---

## 8. Open items (`Needs Verification`)

1. **Dock dead zone at shorter viewports** — F3; `[product-decision]`.
2. **Reactive amplitude at runtime** (hot swap, ±6 px, wrong beat, tier reserve) — F6; `[capability-unavailable]` in this harness.
3. **DPR 2/3 sprite crispness** — harness reports `devicePixelRatio 1`; bake is device-first by construction; `[capability-unavailable]`.
4. **Software-keyboard dock hide** — no `visualViewport` shrink emulation; `[capability-unavailable]`.
5. **`npm run build`** — `[Blocked]` by the owner's dev server holding `.next`.
6. **Perceptual acceptance** of density, surge feel, hot-chevron lit edge, 60 % gutter and the card-mask hard edge — no human reviewer this pass; `[product-decision]`.
7. **Reduced-motion second repaint** (phase → playing) — source-only; `[Partial]`.
8. **Exact per-task allowlist provenance** — no commit boundary; prior approved work shares the tree; `[environment-specific]`.
9. **Reduced-motion reactive brightness** (discrete hot/base swap) — observed as a changed frozen frame; perceptual acceptance `[product-decision]`.
