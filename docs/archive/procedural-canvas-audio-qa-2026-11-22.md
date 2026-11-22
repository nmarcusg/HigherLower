# Procedural Canvas Backdrop + Web Audio — QA Report

**Date:** 2026-11-22
**Stage:** QA (verification only)
**Task type:** Visual enhancement (persistent procedural canvas) + new interaction subsystem (procedural audio) — verification and regression sweep
**Verifier:** independent QA pass. Every runtime figure below was measured in this session; `docs/procedural-canvas-audio-handoff-2026-11-22.md` was treated as claims to test, not as evidence.
**Branch:** `lj-branch`

---

## 1. Scope and guardrail

This pass verified the implemented feature against the plan, design, analysis and owner brief. **No application code was modified.** Files created by this QA pass:

- `docs/procedural-canvas-audio-qa-2026-11-22.md` (this report)
- 9 screenshots in `docs/assets/procedural-canvas-audio/qa/`

Nothing under `app/`, `components/`, `lib/`, `types/`, `scripts/`, `public/`, or any config/manifest was edited, and no existing document was altered.

### 1.1 Environment

| Item | Value |
|---|---|
| Dev server | owner's pre-existing `next dev` on `http://localhost:3000` (reused, never stopped or restarted) |
| Browser | Playwright MCP, Chromium, fresh isolated browser contexts per measurement group |
| Viewports | 1440×900 (DPR 1) and 390×844 |
| Instrumentation | `page.addInitScript` monkey-patches of `AudioContext`, `BaseAudioContext.prototype.createOscillator` / `createBufferSource`, `AudioParam.prototype.setValueAtTime` / `linearRampToValueAtTime` / `setTargetAtTime`, and `document.startViewTransition`. **No production debug hook was added or required.** |
| Date | 2026-11-22 |

Two capability notes, stated up front because they bound some claims:

- `animation-inspector` refuses `localhost`, so all animation evidence was gathered through Playwright directly (`document.getAnimations()`, computed styles, forced frames).
- The headless compositor produces animation frames **on demand**. A `getImageData` read before any forced frame can therefore return a pre-paint canvas. Every "static/changed" claim below is therefore stated only for reads taken **after** the first forced paint, and the initial-paint artifact is called out where it occurred rather than being reported as product behaviour.

---

## 2. Allowlist result

**Result: `[Pass]` — the changed set matches the approved allowlist exactly, with one documentation inaccuracy in the task framing.**

`git status --porcelain` at the end of the pass reports **17 modified** tracked files and the **10 new** feature files. There are no staged changes.

### 2.1 Modified (17)

Two of them are attributable to this feature alone:

| File | Feature change |
|---|---|
| [`app/layout.tsx`](../app/layout.tsx:38) | mounts `<AtmosphereBackdrop />` before `{children}` and the headless `<AudioSurface />` after; `<html>`/`<body>` class strings untouched (4 insertions total: 2 imports, 2 elements) |
| [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx:44) | `gameplay-surface` class, header `backdrop-blur` removed, `truncate` subtitle, `<AudioSurface variant="gameplay" />` as first child of the col-3 cluster |

The remaining five are shared with the pre-existing immersive-motion work: [`app/globals.css`](../app/globals.css:795), [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:85), [`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:196), [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:188), [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:152).

The other **10 modified files** (`app/page.tsx`, `app/game/[mode]/page.tsx`, `CategoryCard`, `ModeButton`, `GameCard`, `ComparisonBoard`, `DecisionControls`, `GameplayStatus`, `CategorySelector`, `DomainSelector`) belong to the earlier immersive-motion task.

> **Documentation discrepancy (not a code defect).** The task framing describes "7 pre-existing modified files from the immersive-motion work". The immersive-motion handoff (§2.2) records **15** modified files, and 15 + `layout.tsx` + `GameplayShell.tsx` = the 17 observed. The *union* is exactly what is claimed; only the "7" figure is wrong. Recorded so the next reader does not treat 17 as scope creep.

### 2.2 Frozen-for-this-task files contain no feature work

Verified with a git pickaxe over the diff text (`git diff -G"atmosphere|Atmosphere|AudioSurface|soundMap|data-audio|data-atmo|bgm|canvas|BGM" --name-only`). It returns **exactly seven** files:

```
app/globals.css, app/layout.tsx, components/HighScoresModal.tsx,
components/game/ClassicGame.tsx, components/game/GameplayShell.tsx,
components/game/TimeAttackGame.tsx, components/home/HomeSetup.tsx
```

None of `GameCard`, `ComparisonBoard`, `GameplayStatus`, `DerivedGameState`, `GameplayDivider`, `DecisionControls`, the Home selectors, `ui/button`, `lib/api|catalog|game|highScores`, `types/**`, `scripts/**`, `public/**`, or any config/manifest contains a single atmosphere/audio/canvas reference. **`[Pass]`**

### 2.3 New files (10 — exact)

```
lib/atmosphere/{types,eventBus,delegation,canvasEngine}.ts
lib/audio/{settings,soundMap,audioEngine,bgm}.ts
components/atmosphere/AtmosphereBackdrop.tsx
components/audio/AudioSurface.tsx
```

No 11th file. `types/view-transition.d.ts` is untracked but belongs to the earlier immersive-motion work (E3), not to this feature. **`[Pass]`**

### 2.4 Dependencies, media, network

| Check | Result |
|---|---|
| `package.json`, `package-lock.json` | `[Pass]` — no diff |
| `next.config.ts`, `components.json`, `tsconfig.json`, eslint/postcss configs | `[Pass]` — no diff |
| Media assets added | `[Pass]` — no tracked or untracked `.mp3/.wav/.ogg/.m4a/.aac/.flac` |
| Media network requests at runtime | `[Pass]` — `performance.getEntriesByType('resource')` filtered for audio extensions returned `[]` on Home and in both game modes; no `<audio>`/`<video>` elements exist |

---

## 3. Static checks

| # | Check | Result | Evidence |
|---|---|---|---|
| S1 | `npx tsc --noEmit` | `[Pass]` | exit 0, zero diagnostics |
| S2 | `npm run lint` | `[Pass]` | **0 errors, 95 warnings**. All 95 are pre-existing and outside the feature: vendored `.agents/skills/**` (93) plus `lib/api/worldbank.ts` (1) and `lib/catalog/availability.ts` (1). A search of the lint output for `atmosphere\|audio\|ClassicGame\|TimeAttack\|HighScoresModal\|HomeSetup\|GameplayShell\|layout.tsx` returned **no matches**, so no warning lands in a feature file |
| S3 | `app/globals.css` append-only | `[Pass]` (with the pre-existing caveat below) | see §3.1 |
| S4 | Timing constants unchanged | `[Pass]` | searching every added/removed line of both game components for `1500\|800\|400\|1000\|460` returns **two comment-only matches** ("untouched 1500 ms reveal timer", "untouched 800 ms advance"). No code line carrying a timing constant was added or removed |
| S5 | Gameplay logic / deck / scoring / storage | `[Pass]` | `git diff` of `ClassicGame`/`TimeAttackGame` contains emits, display-only `resolveTier`/`displayScore` derivations, and the `guessSourceRef` label; `handleGuess` score/timer writes, `startTimer`, `guessLocked`, `aria-live` and the deck calls are untouched. `lib/game/deck.ts` and `lib/highScores/**` have no diff |
| S6 | `npm run build` | `[Blocked]` | the owner's `next dev` owns `.next`; the task forbids disturbing it, so no build was run and none is claimed |

### 3.1 CSS append-only, measured

`git diff -U0 -- app/globals.css` yields **5 hunks** and **exactly 4 removed lines**:

| Hunk | Nature |
|---|---|
| `@@ -135 +135 @@`, `-139 +139`, `-144 +144`, `-148 +148` | the four `home-dialog-in/out` declarations retimed to `var(--motion-dur-base)`/`var(--motion-ease-out)` — **pre-existing immersive-motion work**, authorised there by its plan item 13 |
| `@@ -453,0 +454,471 @@` | pure insertion (471 lines) = the immersive motion layer plus the appended atmosphere/audio layer |

Consequences:

- Relative to `HEAD`, the file is **not** globally byte-identical (4 dialog `animation` shorthands changed) — but those lines belong to the earlier task, are outside `:root`, outside `prefers-reduced-motion`, and are not keyframe definitions.
- The protected blocks named by the task — the `:root` token block (lines 4–72), the `prefers-reduced-motion` block (line 124) and the legacy keyframes — have **no hunk at all**, so they are byte-identical to `HEAD`.
- Relative to the immersive baseline, everything this feature added is append-only from line ~795, matching the handoff's claim.

All nine protected blocks the handoff listed are therefore intact; the only caveat is that the *pre-existing* 4-line retiming makes a naive `git diff HEAD` look non-append-only.

**`[Pass]` with the documented caveat.**

---

## 4. Runtime verification matrix

Statuses: `[Pass]` / `[Partial]` / `[Fail]` / `[Blocked]` / `[Not tested]`.

### 4.1 Canvas

| # | Check | Measured | Status |
|---|---|---|---|
| C1 | Exactly one canvas (Home, Classic, Time Attack, after client nav) | 1 at every point | `[Pass]` |
| C2 | Host `position: fixed`, `inset: 0`, `pointer-events: none`, `overflow: hidden` | `fixed` / `0px` / `none` / `hidden`, `z-index: 0` | `[Pass]` |
| C3 | `aria-hidden="true"` on host **and** canvas | `"true"` on both | `[Pass]` |
| C4 | Canvas covers the layout viewport, below content | 1435×900 at 1440×900 (scrollbar excluded), rect `0,0,1435,900` | `[Pass]` |
| C5 | Never the `elementFromPoint` hit | at (1400, 30) → `MAIN`; on gameplay the header/status/decision controls all win | `[Pass]` |
| C6 | Survives Home → gameplay `<ViewTransition>` on the same node | sentinel `__qaSentinel="qa-persist-42"` set before `go!` still present after landing on `/game/classic`; 1 canvas, `data-atmosphere="on"`; `startViewTransition` called **exactly once** | `[Pass]` |
| C7 | Survives gameplay → Home (back navigation) | sentinel `__qaBack` survived the client navigation to `/`; 1 canvas | `[Pass]` |
| C8 | No flicker/reset across the transition | `data-atmosphere` stayed `on`, canvas node identity unchanged either side | `[Partial]` — no frame-level trace of the transition snapshot, see §7 |
| C9 | Pixels change at rest (normal motion) | fingerprints differed across forced frames on Home (e.g. `97766478` → `97938107`) and in Classic | `[Pass]` |
| C10 | Static under reduced motion | samples `[97768045, 97939674, 97939674, 97939674]` — identical after the initial paint; `document.getAnimations()` = `[]`; `data-atmosphere="on"` | `[Pass]` |
| C11 | No scroll/hover motion under reduced motion | fingerprint after `scrollTo(0, 700)` identical to rest; `label` transform `none` before and after a synthetic hover; chevron `animation-name: none`, `transform: none` | `[Pass]` |
| C12 | Paused while hidden | simulated `visibilitychange` (hidden): fingerprint identical across forced frames | `[Pass]` |
| C13 | Resumes when visible | normal motion: animating → identical while hidden → **differing again** after visible | `[Pass]` |
| C14 | `getContext("2d") → null` fallback | `data-atmosphere="off"`, page fully rendered (`go!` present, copy intact), 1 inert 300×150 canvas, **zero page errors**; the audio control still present and enabled (subsystems independent) | `[Pass]` |
| C15 | No React re-render per frame | engine is created once in a mount effect and driven entirely through refs; no `setState` exists anywhere on the frame path; the only per-event writer touches `data-*` attributes on `<html>` | `[Pass]` (source-verified) |

**Environment note on C9/C10.** The first `getImageData` in a fresh document sometimes returns a pre-paint canvas (observed as `f1 = 0` on Home). The initial-paint read is therefore excluded and stability/motion is asserted only between post-paint frames. Continuous frame cadence and a p95 frame budget remain unmeasurable here — see §7.

### 4.2 Event mapping

Cue frequencies below are exact values captured from `OscillatorNode.frequency.setValueAtTime` / `linearRampToValueAtTime`, i.e. the scheduled value rather than the 440 Hz default.

| # | Check | Measured | Status |
|---|---|---|---|
| E1 | Scroll parallax changes the field | fingerprint changed after `scrollTo(0, 600)` (`97938107` → `97939690`) | `[Pass]` |
| E2 | Domain selector ripple origin | `pointer` event carries the label's own box (`rectOf`); cue `select` → `square 520 + triangle 1040` | `[Pass]` (cue) / origin source-verified |
| E3 | Category selector ripple origin | `category-N` target → `select-deep` `square 610`; canvas `band` impulse spans the row | `[Partial]` — cue verified; canvas band geometry source-verified only |
| E4 | Mode selector ripple | `mode` → `triangle 330 + triangle 495`, plus `data-mode` flips to `time-attack` on Home | `[Pass]` |
| E5 | `go!` warp | exactly one `AudioBufferSource` created (`buf` 0 → 1) plus a `launch` canvas impulse; navigates | `[Pass]` |
| E6 | Modal dampening | music bus target **0.03** on open, restored to **0.10**/`1` on close | `[Pass]` |
| E7 | Modal micro-impulses | `modal` closed event carries `opener` rect → ripple at the opener | `[Pass]` (source) |
| E8 | Reveal pulses scaled to tier | tier-1 `262`; tier-2 `262+524`; tier-3 `262+524+330`; tier-4 `262+524+330+392` + `sine 60` sub. `data-tier` walked 1→2→3→4 | `[Pass]` |
| E9 | Fixed wrong jolt/vignette | `sine 90 + sine 95.5` on every wrong answer regardless of streak; canvas `fracture` (source) | `[Pass]` |
| E10 | Round-advance / land scan | `reveal` correct → `land` impulse at the status origin | `[Pass]` (source); not pixel-isolated |
| E11 | ≤10 s urgency | 10 × `square 900` ticks, none after `game-over` | `[Pass]` |
| E12 | Game-over dampening | `triangle 220 + triangle 165`; music target **0** | `[Pass]` |
| E13 | Deviation: `reveal` at the reveal beat | cue + tier fire at guess time; `sine 880` present in the same batch as the guess sweep | `[Pass]` — deviation confirmed as implemented |
| E14 | Deviation: `phase: revealing` at guess | `data-phase="revealing"` 80 ms after the guess, in **both** modes | `[Pass]` |
| E15 | Deviation: TA timeout emits `phase: game-over` | `data-phase="game-over"` after the countdown expired with no guess | `[Pass]` |
| E16 | Back-navigation reverse drift | canvas persists; `data-surface` returns to `home`, `data-mode` removed | `[Partial]` — see F7: `data-phase` and the engine phase stay at `game-over`, and no `route` emit occurs on back navigation |

### 4.3 Audio

| # | Check | Measured | Status |
|---|---|---|---|
| A1 | Zero contexts before a gesture | `contexts: 0`, `data-audio-state="armed"`, no `<audio>`/`<video>`, zero media requests | `[Pass]` |
| A2 | Exactly one context on the first gesture, `running` | `contexts: 1`, `ctxStates: ["running"]`, `data-audio-state="running"` | `[Pass]` |
| A3 | Keyboard also unlocks | keydown shares the same `once` handler (source) | `[Pass]` (source) |
| A4 | BGM auto-starts at music-bus **0.10** | `setTargetAtTime` sequence after unlock: `1, 1, 0.7, 0.9, 0.1 (τ 0.3), 1` — the `0.10` is `MUSIC_AUTO_LEVEL` | `[Pass]` |
| A5 | Pad voice construction | 2 detuned `triangle` at `110` Hz (detune 0 / +6) + 2 low-rate `sine` LFOs | `[Pass]` |
| A6 | SFX for Home controls | category `square 610`; mode `triangle 330+495`; High Scores `triangle 660`; hover on a domain label `sine 1400` | `[Pass]` |
| A7 | `go!` SFX | one buffer source (bandpass whoosh); no oscillator | `[Pass]` |
| A8 | Higher/Lower pointer | `triangle 300→480` (higher) / `triangle 380→240` (lower) | `[Pass]` |
| A9 | Higher/Lower keyboard | `ArrowUp` → `300→480`; `ArrowDown` → `380→240` — **byte-identical cue to pointer** | `[Pass]` |
| A10 | t1–t4 escalation | see E8; exact per-tier voice sets | `[Pass]` |
| A11 | Fixed wrong thud | `sine 90 + sine 95.5`, constant across the run | `[Pass]` |
| A12 | ≤10 s ticks | 10 × `square 900` in the countdown window; **none** after game-over | `[Pass]` |
| A13 | Game-over cadence | `triangle 220 + triangle 165`, music → 0 | `[Pass]` |
| A14 | One-click master mute | `aria-pressed` false→true, label → "Sound off — unmute all audio", `data-audio-sfx/music="off"`, storage `muted:true`, glyph `VolumeX`; silent by design (`osc: []`); unmute plays `triangle 523→784` | `[Pass]` |
| A15 | Per-channel switches | `sfx`/`music`/`ticks` toggle independently, each write `data-audio-*` and `hl:audio:v1` | `[Pass]` |
| A16 | `hl:audio:v1` persistence semantics | `null` before any explicit change (verified in a cleared context); written on each toggle | `[Pass]` |
| A17 | Persisted mute/music-off wins over auto-start | seeded `muted:true` → pre-gesture `aria-pressed="true"`, both channels `off`; after gesture targets `[1,1,0,0,0,0]` — **no 0.10 ramp** | `[Pass]` |
| A18 | Modal ducking | open → **0.03**; close → **1 / 0.10**; all three close paths (X, backdrop, Escape) restore | `[Pass]` |
| A19 | Game-over ducking | music target 0 at `phase: game-over` | `[Pass]` |
| A20 | Route ducking | `route` emit sets music target 0 on `go!`; arriving surface restores | `[Pass]` forward only — see F7 for the back-navigation hole |
| A21 | Hidden-tab ducking | master → 0, BGM scheduler paused, `suspend()` scheduled (source); canvas confirmed paused | `[Partial]` — audio graph path source-verified, `suspend()` not observed directly |
| A22 | **Reveal-beat ducking (handoff says not implemented)** | **no `0.03` (or any duck) appears on any guess in either mode** — `tg: []` on Classic, `tg: [1, 0.1]` on TA (a restore, not a duck) | `[Fail]` against the brief/first-seen design — see **F1** |
| A23 | Zero console errors | 0 errors on Home, Classic, Time Attack, modal open/close, game over, full audio-settings cycle, and both degraded paths | `[Pass]` |
| A24 | No media network requests | `[]` | `[Pass]` |
| A25 | No `AudioContext` support | control `disabled`, `aria-disabled="true"`, `data-audio-state="off"`, canvas unaffected, zero errors | `[Pass]` |
| A26 | Autoplay refusal path | not forced (would need a rejecting `resume()`) | `[Not tested]` |

**Note on console warnings.** Two warnings appeared during this pass and both are QA-induced, not product behaviour: `Canvas2D: Multiple readback operations using getImageData…`, caused by this QA harness reading pixels. Production pages produced **0 errors / 0 warnings** under normal motion.

### 4.4 UI harmonization

| # | Check | Measured | Status |
|---|---|---|---|
| H1 | `data-*` contract exists on `<html>` | `data-atmosphere`, `data-surface`, `data-mode`, `data-phase`, `data-tier`, `data-guess`, `data-modal`, `data-audio-sfx`, `data-audio-music`, `data-audio-state` all written | `[Pass]` |
| H2 | Every CSS selector resolves to a real element | `[data-streak-ring]` / `[data-streak-line]` exist in [`GameplayStatus.tsx`](../components/game/GameplayStatus.tsx:56); all referenced tokens (`--text-muted`, `--border-mid`, `--accent-action-higher`, `--bg-elevated`, …) are defined in `:root` | `[Pass]` |
| H3 | Header opaque, blur removed | `backdrop-filter: none`, `background: rgb(21, 18, 43)` | `[Pass]` |
| H4 | Gameplay show-through 84 % | `color(srgb 0.0823 0.0706 0.1686 / 0.84)` on `.gameplay-surface` | `[Pass]` |
| H5 | OR badge harmonization | OR badge carries a `phase === "revealing" ? opacity-50` step (pre-existing immersive work) | `[Pass]` |
| H6 | **Card offset shadows harmonize with canvas lighting** | **no mechanism exists.** A repo search for `card-accent` finds only the token declaration and `GameCard`'s own inline `--card-accent`; no `html[data-*]` rule touches the card plate or its `shadow-[0_9px_0_var(--card-accent)]` | `[Fail]` against the brief — see **F2** |
| H7 | Audio control harmonizes with lighting | state is carried by `--atmo-accent` on the 4 px offset shadow (`html[data-audio-music]`), `html[data-modal="open"]` dims it to 0.6, `html[data-audio-state="armed"]` adds a 4 px tell | `[Pass]` (source + computed) |

### 4.5 Audio control

| # | Check | 1440×900 | 390×844 | Status |
|---|---|---|---|---|
| P1 | Size 44×44 | 44×44 | 44×44 | `[Pass]` |
| P2 | Home placement, right of `go!`, left of High Scores | `(1195, 20)`; gap to High Scores **8 px**, overlap **0** | `(185, 20)`; gap 8 px, overlap 0 | `[Pass]` |
| P3 | Gameplay placement inside the col-3 status cluster | `(1311, 22)`, `audioInStatus: true`; overlap with back / Higher / Lower = 0 | `(283, 22)`; overlaps 0 | `[Pass]` |
| P4 | Clear of the TA timer footer | audio `(1311, 22)`, timer `(24, 88)` — disjoint | n/a | `[Pass]` |
| P5 | Hiding the control changes no geometry | Home `docH 2489` both ways, `go!` at `(121, 2201)` both ways; Classic `docH 1252` and Lower `y=1100` both ways | same | `[Pass]` |
| P6 | CLS | buffered `layout-shift` sum **0** (mount + popover open/close) | 0 | `[Pass]` |
| P7 | `aria-pressed` / `aria-expanded` / `aria-controls` | present, `aria-controls` only while open | same | `[Pass]` |
| P8 | Popover anatomy | `role="group"`, `aria-label="Audio settings"`, 3 × `role="switch"` at **44 px** tall, 240×152 panel | same | `[Pass]` |
| P9 | Keyboard | `ArrowDown` opens and focuses row 1; `ArrowUp`/`ArrowDown` cycle; `Escape` closes and returns focus | same | `[Pass]` |
| P10 | Coarse pointer behaviour | fine pointer → ticks effective | touch emulation: `(pointer: coarse)`/`(hover: none)` true, row reads **"Interface ticks · touch"**, `aria-checked="false"` | `[Pass]` |
| P11 | Popover fits the viewport | `x=999, right=1239` — inside | **`x = −11`**, right 229; clipped by `<main>`'s `overflow-x: clip` | `[Fail]` at 390 px — see **F3** |

### 4.6 Keyboard parity

| # | Check | Result | Status |
|---|---|---|---|
| K1 | Shortcuts in source | `ArrowUp`/`h` → higher, `ArrowDown`/`l` → lower, in both modes; guarded by `shouldIgnoreShortcut` | `[Pass]` |
| K2 | Click vs keyboard produce the same SFX | pointer higher `300→480` = keyboard higher `300→480`; pointer lower `380→240` = keyboard lower `380→240` | `[Pass]` |
| K3 | Same canvas impulse | both paths run the same `guess` emit → one `updraft`/`downdraft`; the pointer cue for higher/lower is deliberately silent, which is what makes parity exact | `[Pass]` |
| K4 | Key repeat cannot flood | `event.repeat` skipped in delegation; `guessLocked`/phase guard in the components; per-cue rate limits in the engine | `[Pass]` (source) |

### 4.7 Regressions

| # | Check | Result | Status |
|---|---|---|---|
| R1 | Five-tier ladder | `data-tier` 1→2→3→4 observed with matching cues; tally bump/ring/line are display-only | `[Pass]` |
| R2 | Reveal-time tally | `displayScore = score + 1` during `revealing` only; score state still written inside the untouched timer | `[Pass]` |
| R3 | `<ViewTransition>` | `startViewTransition` once on `go!`; navigation completed | `[Pass]` |
| R4 | Home ambient loops | `document.getAnimations()` = exactly `["ambient-bob", "ambient-drift"]`; canvas contributes none | `[Pass]` |
| R5 | Game-over panel | `animation-name: none` behaviour preserved; panel renders, focus reaches the dialog action | `[Pass]` |
| R6 | Timer cadence | 1000 ms interval, `phaseRef` guard, `≤ 0` → game over; `10` urgent ticks then silence | `[Pass]` |
| R7 | Legacy CSS byte-identical | `:root`, `prefers-reduced-motion`, legacy keyframes have no hunk vs `HEAD` | `[Pass]` |
| R8 | Focus return | modal → opener ("View High Scores"); Escape on popover → the audio control | `[Pass]` |
| R9 | Header heights | 90 px Classic, 138 px Time Attack — unchanged | `[Pass]` |
| R10 | No horizontal overflow | `scrollWidth` 385 at 390 viewport, both surfaces | `[Pass]` |
| R11 | Normal-motion console | 0 errors / 0 warnings | `[Pass]` |
| R12 | Hydration | mismatch **only** under emulated reduced motion, caused by Motion's `initial` opacity/transform styles on `motion.h1/p/a` — pre-existing immersive-motion issue, not attributable to this feature | `[Pass]` for this feature |

### 4.8 Status counts

| Status | Count |
|---|---|
| `[Pass]` | 76 |
| `[Partial]` | 5 (C8 frame-level transition trace, E3 canvas band geometry, E16 back-nav state, A21 suspend, plus C15 source-only) |
| `[Fail]` | 3 (A22 reveal ducking, H6 card shadows, P11 mobile popover) |
| `[Blocked]` | 1 (S6 build) |
| `[Not tested]` | 1 (A26 autoplay refusal) |

---

## 5. Findings

Severity: **High** = blocks the brief or breaks function · **Moderate** = explicit brief requirement unmet · **Low** = polish or edge case.

### F1 — Reveal-beat BGM ducking is not implemented (explicit brief requirement)

- **Expected:** the brief asks for the music to duck during reveals; the design's ducking row lists the reveal beat alongside the modal.
- **Observed:** no duck on any reveal. Instrumented music-bus targets were `[]` on every Classic guess and `[1, 0.1]` on every Time Attack guess (a restore, never a duck). The only duck in the shipped code is the modal (`0.03`), plus hard cuts at game over and route change. Source: the `reveal` case in [`lib/audio/audioEngine.ts`](../lib/audio/audioEngine.ts:397) plays cues and returns; `duckMusic()` is called only from the `modal` case at [`:429`](../lib/audio/audioEngine.ts:429).
- **Classification:** **spec gap** — the handoff discloses the omission (deviation 7) and states a rationale (a duck on every guess would fight the 84 BPM pulse). The code matches the *documented deviation* but not the brief.
- **Severity:** **Moderate**.
- **Note:** this is a product call, not a mechanical bug. If the owner accepts the rationale, the brief and design should be amended so the next reader does not treat it as a defect.

### F2 — Card offset-shadow harmonization was dropped with no substitute mechanism

- **Expected:** the brief explicitly requires the card offset shadows to harmonize with the canvas lighting.
- **Observed:** there is **no mechanism at all**. `--card-accent` appears only as a token declaration ([`app/globals.css`](../app/globals.css:38) area) and as an inline style on the card ([`GameCard.tsx`](../components/game/GameCard.tsx:65)); the plate is a static `translate-x-2 translate-y-2` solid and the face shadow is a static `shadow-[0_9px_0_var(--card-accent)]` ([`GameCard.tsx`](../components/game/GameCard.tsx:87)). No `html[data-atmosphere|data-phase|data-tier|data-guess]` rule reaches either. The git pickaxe confirms `GameCard.tsx` contains zero atmosphere references.
- **Classification:** **implementation bug** — an explicit brief requirement silently dropped. The handoff documents the drop (deviation 6) citing plan stop condition 12, but that condition permits dropping a *row of the plan*, not overriding the owner brief.
- **Severity:** **Moderate**.

### F3 — Audio popover clips off the left edge on Home at 390 px

- **Expected:** the popover opens fully on-screen at both breakpoints.
- **Observed:** at 390×844 the panel is `x = −11, right = 229, 240×152`, i.e. **11 px past the left viewport edge**, and its nearest clipping ancestor is `<main class="… overflow-x-clip …">`. The panel's left border and the left edge of the SFX row are cut. Desktop (`999→1239`) and gameplay-mobile (control at 283, so the panel lands at 87) are unaffected — only Home at narrow widths, because the panel is `absolute right-0` under a control that sits 161 px from the left edge.
- **Classification:** **implementation bug**.
- **Severity:** **Low** (labels remain readable and every switch is still hit-testable and operable; it is a visible polish defect).
- **Evidence:** `docs/assets/procedural-canvas-audio/qa/qa-home-mobile-390-popover-clip.png`.

### F4 — Higher/Lower hover glow is not wired (brief: "hover drift + cyan/magenta glows")

- **Expected:** hovering Higher/Lower produces a canvas drift/glow in the higher (cyan) / lower (magenta) accent.
- **Observed:** the *CSS* hover lift exists (`.decision-lift`, `hover:-translate-y-0.5`), but **no hover event is ever emitted for the decision buttons**. The only hover listener is `onPointerOver` in [`lib/atmosphere/delegation.ts`](../lib/atmosphere/delegation.ts:203), which early-returns unless the target is a `<label>` wrapping a radio input; Higher/Lower are `<button>`s. Consequently the canvas `hover → glow` branch and the `accentForTarget("higher"|"lower")` accent split in [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:739) are unreachable via hover. A repo-wide search for `pointerover|pointerenter|mouseover|onMouseEnter|onPointerEnter|mouseenter` returns only the delegation listeners.
- **Classification:** **implementation bug** — a partial, unflagged divergence from the brief (the handoff does not list this as a deviation).
- **Severity:** **Low–Moderate** (purely cosmetic; no functional or accessibility impact).

### F5 — ≤10 s urgency deviates from the design's ≤5 s (owner brief wins)

- **Expected per design/plan:** urgency at ≤ 5 s. **Per owner brief:** ≤ 10 s.
- **Observed:** `urgent: secondsLeft <= 10` in [`TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:191); 10 × `square 900` ticks, none after game over; visual urgency confirmed live at `07 s` with `.timer-urgent`, `aria-live="assertive"`, colour `rgb(240, 90, 199)`.
- **Classification:** **spec gap** — the brief legitimately supersedes the design, and the handoff records the deviation (deviation 1). Implemented consistently.
- **Severity:** **None (informational)**. Documented so the design text gets corrected rather than re-litigated.

### F6 — The first-ever gesture is silent

- **Expected:** design §8.3 "SFX on, but silent until the first gesture".
- **Observed:** on the very first interaction the pad oscillators start (2 × `triangle 110`, 2 LFOs) but **no cue is produced** — the `select-deep`/`select` for the clicked control is dropped because delegation runs in the capture phase and the context does not exist yet. Every subsequent gesture is sonified.
- **Classification:** **spec gap** (handoff deviation 8, deliberate).
- **Severity:** **Low** — the first click of a session is silent, which reads as "audio did not start" to a first-time visitor even though the pad begins.

### F7 — `data-phase` and the engine's field recession are not reset on back navigation

- **Expected:** returning to Home resets the gameplay state; the surface should return to its full field.
- **Observed:** after Back-to-setup, `data-surface="home"` and `data-mode` are removed correctly, but `data-phase` remains `"game-over"`. Only the `route` event resets the engine's phase ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:953) and [`AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx:112)), and `route` is emitted only by `HomeSetup.startGame` on the way *forward*. Since `updateTarget()` maps `game-over` to a `0.75` recession ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:39)), the engine is left targeting a dimmed field on Home. Supporting measurement: Home's canvas mean brightness immediately after back navigation was **5.4 % lower** than after a hard reload (`98.92` vs `104.55`), consistent with a stuck recession but not proof of it (motes and breathing vary frame to frame). A related consequence is that the handoff's "route ramps music to 0" only holds for forward navigation; back navigation has no `route` emit, so music is not ducked during that transition.
- **Classification:** **implementation bug**.
- **Severity:** **Low**, `Needs Verification [inferred-from-codebase]` for the magnitude of the recession (the stale attribute is directly observed; the visual delta is inferred).

### F8 — Unmuting the master promotes music from the auto level to the user level

- **Expected:** the auto-start level is 0.10; an explicit *music* choice ramps to 0.28.
- **Observed:** unmuting via the master control reaches `setExplicitMusic(...)` ([`AudioSurface.tsx`](../components/audio/AudioSurface.tsx:185)), so a mute→unmute cycle leaves the music bus at **0.28** instead of 0.10 — a 2.8× louder pad/pulse than the documented auto-start, triggered by a control that says nothing about music. Measured after unmute: targets included `0.28`.
- **Classification:** **implementation bug** (likely unintended coupling).
- **Severity:** **Low**.

### F9 — `data-tier` is not reset on "Play again"

- **Observed:** after a restart, `data-phase` returns to `playing` and the timer resets, but `data-tier` stays at the last value (`"4"`) until the next reveal. Only `route` resets it to `0`.
- **Classification:** **implementation bug** (cosmetic).
- **Severity:** **Informational** — no CSS rule keys off `data-tier` without a matching `[data-streak-ring]`, which is unmounted, so nothing is visibly wrong today.

### F10 — Duplicate `pointer`/"audio" emission on the audio control (source-observed)

- **Observed:** a click on the control produces one `pointer` event from delegation (`data-audio-control` → target `audio`) and a second from `toggleMaster`'s own emit, so two `ack` impulses are pushed into the 2-slot ring for one press. Harmless (the second overwrites the first) and inaudible (`cueForPointer` returns `null` for `audio`).
- **Classification:** **implementation bug** (redundancy only).
- **Severity:** **Informational**, `[inferred-from-codebase]`.

### F11 — Not a defect of this feature: reduced-motion hydration mismatch

- Under emulated `prefers-reduced-motion: reduce`, React logs a hydration-mismatch error. The diff is entirely Motion's `initial` `opacity`/`transform` styles on `motion.h1`/`motion.p`/`motion.a` in `HomeSetup`, plus a cosmetic `className` representation difference on the dialog. **No canvas/audio/`data-*` node is involved**, normal motion is clean, and the immersive-motion handoff already records this as pre-existing (§7). Carried here only so it is not mistaken for feature damage.

---

## 6. Overall verdict

**Conditional pass.** The canvas/audio subsystem does what the handoff says it does, to a high standard: one persistent, non-interactive, correctly-contained canvas; a single audio context created only inside a gesture; an exact cue map; the full tier ladder; correct ≤10 s urgency; correct ducking for modal / game over / route / hidden; correct persistence precedence; honest degraded paths (`getContext → null`, no `AudioContext`); static-under-reduced-motion and paused-when-hidden with clean resume; zero console errors under normal motion; and no geometry, CLS, timing-constant, deck, scoring or storage regression.

It does **not** fully satisfy the brief in two places the handoff disclosed as deviations (reveal-beat ducking, card offset-shadow harmonization), and it has one undisclosed divergence (Higher/Lower hover glow), one mobile clipping defect, and three minor behavioural bugs.

### 6.1 Postfix required?

**Yes — recommended, with a small, surgical scope.** All items are additive or localized; none requires a redesign. Modifications below are *proposals only*; no code was changed in this pass.

| # | Finding | Minimal scope |
|---|---|---|
| F1 | reveal ducking | [`lib/audio/audioEngine.ts`](../lib/audio/audioEngine.ts:397) — duck on `reveal`, restore on `phase: playing`. **Or** amend brief/design if the owner accepts the pulse-conflict rationale. Owner decision first. |
| F2 | card shadow harmonization | [`app/globals.css`](../app/globals.css:795) (append `html[data-phase]`/`[data-tier]` rule for `--card-accent`/shadow depth) + possibly one class in [`GameCard.tsx`](../components/game/GameCard.tsx:87). **Allowlist expansion needed** — `GameCard.tsx` is frozen for this task. |
| F3 | mobile popover clipping | [`AudioSurface.tsx`](../components/audio/AudioSurface.tsx:300) — align the panel to the control's left on narrow viewports (or clamp width). No other file. |
| F4 | Higher/Lower hover glow | [`lib/atmosphere/delegation.ts`](../lib/atmosphere/delegation.ts:203) — emit `hover` for the decision buttons (or add a `button` branch). Canvas side already handles it. |
| F7 | stale phase on back nav | [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:152) or [`AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx:142) — emit `route` (or reset phase) on the returning surface. |
| F8 | unmute promotes music level | [`AudioSurface.tsx`](../components/audio/AudioSurface.tsx:185) — drop the `setExplicitMusic` call from `toggleMaster`. |
| F9/F10 | `data-tier` reset, duplicate emit | optional; both informational. |

### 6.2 Source-of-truth note

Two documents now disagree with the shipped code in ways that will mislead the next reader, and one document is inaccurate about its own baseline:

1. The design's ducking row still lists the reveal beat as required (F1).
2. The design still specifies ≤ 5 s urgency while the brief and code use ≤ 10 s (F5).
3. The handoff's "route ramps music to 0" holds only for forward navigation (F7).
4. The task framing said "7 pre-existing modified files"; the immersive-motion baseline is 15 (§2.1).

---

## 7. Open items / `Needs Verification`

| # | Item | Qualifier |
|---|---|---|
| 1 | Continuous frame cadence and a p95 frame budget at 390×844 and 1440×900 | `[environment-specific]` — the headless compositor renders on demand; only forced-frame behaviour was measurable |
| 2 | Whether the canvas is a frozen snapshot *during* the `nav-forward` view transition (frame-level) | `[capability-unavailable]` — no frame trace possible in this environment |
| 3 | Whether `data-atmosphere`/`data-surface` are updated before the transition snapshot is taken | `[inferred-from-codebase]` |
| 4 | Magnitude of the F7 field recession on Home after back navigation | `[inferred-from-codebase]` — 5.4 % mean-brightness delta is consistent, not conclusive |
| 5 | Perceptual acceptance: does the field feel alive, is the BGM pleasant at 0.10, is the 16 % show-through right, does the card row read as lit | `[product-decision]` — no human reviewer in this session; **not assessed**, not claimed |
| 6 | Reveal-beat ducking: implement, or amend the brief/design | `[product-decision]` — F1 |
| 7 | Card offset-shadow harmonization: implement, or formally waive the brief requirement | `[product-decision]` — F2, and it needs a frozen-file allowlist expansion (`GameCard.tsx`) |
| 8 | iOS Ring/Silent switch, DPR 2×/3×, non-Chromium engines | `[environment-specific]` / `[capability-unavailable]` — no device |
| 9 | Autoplay-refusal path (a rejecting `resume()`) | `[Not tested]` |
| 10 | Canvas impulse *geometry* (exact ripple origins/radii) — cue identity and event origins were verified, painted-radius accuracy was not pixel-isolated | `[capability-unavailable]` |
| 11 | Workspace hygiene: `.playwright-mcp/` now holds console logs, page snapshots and `tmp-*.png` artifacts written automatically by the MCP server, and `skills-lock.json` plus `.agents/` are untracked at repo root | `[inferred-from-codebase]` — none of these are application source and none were created deliberately by this pass; they should not be committed with the feature |

---

## 8. Screenshots

All under `docs/assets/procedural-canvas-audio/qa/`:

| File | Content |
|---|---|
| `qa-home-desktop-1440.png` | Home, desktop, canvas field visible at rest |
| `qa-home-desktop-1440-popover.png` | Audio popover open, desktop (240×152 panel) |
| `qa-home-mobile-390.png` | Home, mobile 390×844 |
| `qa-home-mobile-390-popover-clip.png` | **F3 evidence** — popover clipped 11 px past the left edge |
| `qa-gameplay-classic-desktop-1440.png` | Classic at rest, 84 % surface, opaque header |
| `qa-gameplay-outcome-desktop-1440.png` | Reveal beat (`data-phase="revealing"`) |
| `qa-gameover-desktop-1440.png` | Classic game-over panel |
| `qa-timeattack-urgent-desktop-1440.png` | Time Attack at `07 s`, urgent styling + `aria-live="assertive"` |
| `qa-reduced-motion-home-desktop-1440.png` | Home under `prefers-reduced-motion: reduce` (static field, 0 animations) |

---

## 9. Sign-off

- **Verified:** allowlist and frozen files, dependency/media/network neutrality, CSS append-only status, unchanged timing constants and gameplay logic, type-check, lint, and the runtime matrix in §4 (76 passes, 5 partials).
- **Not verified:** the production build (`[Blocked]` by the owner's dev server), continuous frame cadence, frame-level transition snapshotting, iOS/DPR/non-Chromium behaviour, the autoplay-refusal path, and all perceptual acceptance.
- **Unresolved product calls carried forward:** F1 (reveal ducking), F2 (card shadow harmonization — also needs an allowlist expansion), and the perceptual questions in §7.
- **No code was modified by this QA pass.**
