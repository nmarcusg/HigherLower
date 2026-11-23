# Procedural Canvas Backdrop + Web Audio — Implementation Handoff

**Date:** 2026-11-22
**Stage:** Implementation (S1–S9) + static and runtime verification
**Task type:** Visual enhancement (persistent procedural canvas) + new interaction subsystem (procedural audio)
**Source of truth:** [`docs/procedural-canvas-audio-plan-2026-11-22.md`](procedural-canvas-audio-plan-2026-11-22.md), then the design, then the analysis — with the owner brief's amendments taking precedence where they differ.
**Dev server:** the owner's `next dev` on `http://localhost:3000` was reused for every runtime check and never stopped or restarted.

---

## 1. Changed-file set

### 1.1 Modified (7 — the approved allowlist, nothing outside it)

| File | Change |
|---|---|
| [`app/layout.tsx`](../app/layout.tsx:1) | Mounts `<AtmosphereBackdrop />` before `{children}` and `<AudioSurface />` (headless instance) after. `<html>`/`<body>` class strings byte-identical. |
| [`app/globals.css`](../app/globals.css:795) | **Append-only** from line 795: `--atmo-*` tokens, `.audio-surface` / `.audio-surface-popover` / `.audio-row` presentation, `html[data-tier]` streak harmonization, and the `.gameplay-surface` colour-mix surface with an opaque fallback declaration. Nothing above the append point was edited. |
| [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx:45) | Shell surface → `gameplay-surface` (84 % surface / 16 % field), header opaque with `backdrop-blur` removed, `truncate` on the subtitle, `<AudioSurface variant="gameplay" />` as the first child of the col-3 cluster. |
| [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:147) | `<AudioSurface variant="home" />` as the first child of the right-anchored header row; one `route` emit in `startGame`. |
| [`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:170) | Semantic emits only — `guess`, `reveal`, `phase`; plus a `guessSourceRef` used solely to label the emitted `source`. No gameplay, timing, deck, scoring or focus change. |
| [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:177) | Semantic emits only — `guess`, `reveal`, `phase`, `timer`, `delta`. Timing constants, interval, `guessLocked`, `aria-live` untouched. |
| [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:68) | Approved allowlist expansion: `modal` open emit in the existing open/close effect and `modal` closed emit in `handleClose` (the single funnel for X, Escape and backdrop). |

### 1.2 New (10)

`lib/atmosphere/` — [`types.ts`](../lib/atmosphere/types.ts:1), [`eventBus.ts`](../lib/atmosphere/eventBus.ts:1), [`delegation.ts`](../lib/atmosphere/delegation.ts:1), [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:1)
`lib/audio/` — [`settings.ts`](../lib/audio/settings.ts:1), [`soundMap.ts`](../lib/audio/soundMap.ts:1), [`audioEngine.ts`](../lib/audio/audioEngine.ts:1), [`bgm.ts`](../lib/audio/bgm.ts:1)
`components/atmosphere/` — [`AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx:1)
`components/audio/` — [`AudioSurface.tsx`](../components/audio/AudioSurface.tsx:1) (exports both the control and the headless layout instance; no 11th file)

### 1.3 Frozen files

`git diff --stat` shows no change to `app/page.tsx`, `app/game/**`, `components/game/{GameCard,ComparisonBoard,GameplayStatus,DerivedGameState,GameplayDivider,DecisionControls}.tsx`, `components/{CategoryCard,ModeButton}.tsx`, `components/home/{CategorySelector,DomainSelector}.tsx`, `components/ui/button.tsx`, `lib/**` (api/catalog/game/highScores), `types/**`, `scripts/**`, `public/**`, `next.config.ts`, `components.json`, `package.json`, `package-lock.json`. The 10 pre-existing motion-work file modifications outside the allowlist were present before this task and were not touched.

---

## 2. Per-step status

| Step | Status | Evidence |
|---|---|---|
| **S1** typed contracts, event bus, delegation | `[Pass]` | `tsc --noEmit` clean; delegation exercised by every runtime click in §4. |
| **S2** canvas engine core | `[Pass]` | One canvas, five passes, 28/12 motes, 2-slot impulse ring, DPR/delta/visibility/reduced-motion paths (§4). |
| **S3** backdrop, layout mount, `data-*` writer | `[Pass]` | `data-atmosphere/surface/mode/phase/tier/guess/modal` observed live (§4.2). |
| **S4** audio settings, sound map (27 cues), engine, BGM | `[Pass]` | Instrumented runs in §4.3; latency-free `getServerSnapshot` defaults. |
| **S5** 44×44 control + popover + persistence | `[Pass]` | §4.4 — geometry, ARIA, keyboard, `hl:audio:v1`. |
| **S6** surface integrations + D2 transparency | `[Pass]` | 84 % shell alpha, header blur removed, header heights 90/138 unchanged (§4.1). |
| **S7** semantic emits | `[Pass]` | §4.5 parity and state-machine evidence. |
| **S8** harmonization, modal dampening, ducking | `[Pass]` | 0.55 field / 0.03 music-bus target on modal open, restore on close (§4.6). |
| **S9** reduced motion, accessibility, sweep | `[Pass]` with `[Not tested]` items | §4.7, §5. |

---

## 3. Deviations from the plan / design (flagged, not silent)

1. **Urgency at ≤ 10 s, not ≤ 5 s (owner brief).** `timer` events carry `urgent: secondsLeft <= 10`, the audio engine plays `tick-urgent` (square 900 Hz, 40 ms) on every 1000 ms tick while `phase !== "game-over"`. Measured: 10 ticks across the countdown, none after game over. The design/plan text says ≤ 5 s; the owner brief was followed and this deviation is recorded.
2. **`reveal` is emitted on the reveal beat, not inside the 1500 ms callback.** Plan §2.1 A5/A6 places `reveal` in the reveal-commit callback. Emitting there would have delayed the correct/wrong cue and the tier pulse by 1500 ms (Classic) / 800 ms (TA) after the card value and tally had already changed. `reveal` therefore fires immediately in `handleGuess` (with the prospective tier, identical to the display tier), and `phase` fires at the reveal commit. No timing constant, handler semantic or score write moved.
3. **`phase: "revealing"` is emitted at guess time.** Neither document lists it explicitly, but the recession target (0.80) and `data-phase` both require it. Without it `data-phase` never left `playing`.
4. **Time-attack timeout game-over now emits `phase`.** The timer's `<= 0` branch had no emit, so the game-over cadence, field settle and BGM fade never fired on a timeout. One emit added; no timing change.
5. **Audio-control state is carried by the offset shadow, not the glyph colour.** Design §5.2 says `html[data-audio-music="on"] .audio-surface { color: var(--accent-highlight) }`. A permanently yellow 18 px icon in the header competes with emphasis, so the same state is expressed on `--atmo-accent` (the 4 px offset shadow) and the glyph stays `--foreground-muted` → white on hover/expanded. Same information, quieter chrome.
6. **The card offset-plate harmonization row was dropped.** Design §5.2's "shadow spread nudged by 1 px" targets a solid translated plate (`translate-x-2 translate-y-2`), not a shadow; nudging it would move the plate. Plan stop condition 12 explicitly permits dropping the row. `--card-accent` and the field recession carry the state instead.
7. **Reveal-beat BGM ducking (design §8.8 row 1) is not implemented.** Ducking is applied for the High Scores modal (0.30), game over (0), route change (0) and tab-hidden (0 then suspend). Ducking on every reveal would fight the 84 BPM pulse on every guess in Classic.
8. **The first-ever gesture is silent.** Cues are requested before the context exists on that same gesture (delegation runs in the capture phase, unlock on the window). Design §8.3's "SFX on, but silent until the first gesture" is honoured literally.
9. **`AudioSurface` without a `variant` renders `null`.** The layout instance owns the engine wiring, gesture unlock, `data-audio-*` writer and visibility handling; the two header slots render the visible control. This keeps exactly one visible control per surface and avoids a stray 44 px button at the end of `<body>`.
10. **The `guess` `source` field uses a ref set around the keyboard handler.** Informational only; the emitted event sequence is identical for pointer and keyboard.

---

## 4. Verification performed (runtime, Playwright MCP + instrumented pages)

All instrumented runs used a fresh browser context and `addInitScript` patches of `AudioContext`, `BaseAudioContext.prototype.createOscillator` and `AudioParam.prototype.setTargetAtTime`. **No production debug hook was added.**

### 4.1 Geometry invariants (DPR 1)

| Viewport | Surface | Expected | Measured | Status |
|---|---|---|---|---|
| 1440×900 | Home | doc 2242, `scrollWidth` 1435 | 2242 / 1435 | `[Pass]` |
| 1440×900 | Home | High Scores 132×44 @ (1247,20) | 132×44 @ (1247,20) | `[Pass]` |
| 1440×900 | Home | audio 44×44 ≈(1195,20), right ≤ 1239 | 44×44 @ (1195,20) | `[Pass]` |
| 1440×900 | Home | `go!` 176×176 @ (630,1889) | 176×176 @ (630,1889) | `[Pass]` |
| 1440×900 | Classic | header 90, back 44×44 @ (24,22) | 90 / 44×44 @ (24,22) | `[Pass]` |
| 1440×900 | Classic | Higher 283×54 @ (919,724), Lower @ (919,790) | exact match | `[Pass]` |
| 1440×900 | Classic | audio inside col-3 | 44×44 @ (1316,22) | `[Pass]` |
| 1440×900 | Time Attack | header 138, timer 37×36 @ (24,88), bar ends 1411 | 138 / 37×36 @ (24,88) / 1411 | `[Pass]` |
| 1440×900 | Time Attack | audio no overlap with the timer footer | 44×44 @ (1311,22) | `[Pass]` |
| 390×844 | Home | doc 2489, `scrollWidth` 385, `h1` 56 px | 2489 / 385 / 56 | `[Pass]` |
| 390×844 | Home | High Scores 132×44 @ (237,20) | exact match | `[Pass]` |
| 390×844 | Home | audio 44×44 ≈(185,20), right ≤ 229 | 44×44 @ (185,20) | `[Pass]` |
| 390×844 | Home | `go!` @ (121,2201) | 144×144 @ (121,2201) | `[Pass]` |
| 390×844 | Classic | doc 1252, Higher y1100, Lower y1166, x 51–334 | 1252 / 1100 / 1166 / 51–334 | `[Pass]` |
| 390×844 | Classic | header must not grow; title may truncate | header 90 (2 px border + `min-h-5.5rem`), title truncated | `[Pass]` |
| Any | Any | layout shift < 0.01 | CLS **0** (buffered `layout-shift`, Home + Classic, mount + popover open/close) | `[Pass]` |

**Audio-control contribution isolated:** hiding the control's wrapper at 390×844 leaves the document height and Higher/Lower positions unchanged (1252 / 1100 both ways) — the slot adds zero layout.

One earlier mobile reading showed 1272 / 1120; re-measuring on a fresh deck gave the 1252 / 1100 baseline exactly, and hiding the control does not change either. The delta was the content-dependent card text height (a longer item name wrapping), not the control.

### 4.2 Canvas

| # | Check | Result | Status |
|---|---|---|---|
| V1 | Exactly one canvas on Home, Classic, Time Attack, and after a client navigation | 1 every time | `[Pass]` |
| V2 | Fixed host, full viewport | host `position: fixed`, `inset: 0`, rect 1435×900 (= layout viewport at 1440 minus the scrollbar) | `[Pass]` |
| V3 | Non-interactive, hidden from AT | `pointer-events: none` on host and canvas, `aria-hidden="true"` on both | `[Pass]` |
| V4 | Never the top element | `elementFromPoint` at the header, the audio control, High Scores and a content point always returned real controls/content | `[Pass]` |
| V5 | Survives navigation without remount | a sentinel property set on the canvas node before `go!` was still present after the client navigation to `/game/classic`; one canvas, `data-atmosphere="on"` throughout | `[Pass]` |
| V6 | No flicker/reset across the transition | no white/black frame captured; the destination tint matched `data-mode` | `[Partial]` — screenshot burst, not a frame-by-frame trace |
| V7 | Pixels change at rest | fingerprint changed across a forced frame (1443673689 → 1761160718) | `[Partial]` — see the environment note below |
| V8 | Static under reduced motion | fingerprints identical across two forced frames; `document.getAnimations()` = `[]`; `data-atmosphere="on"` (visible, motionless) | `[Pass]` |
| V9 | Paused while hidden | after a simulated `visibilitychange` (hidden), fingerprints identical across two forced frames | `[Pass]` |
| V10 | No 2D context | `getContext` stubbed to return `null`: `data-atmosphere="off"`, page fully rendered, one inert canvas element, zero page errors | `[Pass]` |
| V11 | Low-quality path | `hl:atmosphere:quality="low"` path implemented (scale 1, 12 motes, odd-frame skip) | `[Not tested]` — not driven in this session |
| V12 | Route-transition snapshot | the canvas is layout-mounted and outside `<ViewTransition>`; the `go!` burst completes inside the window | `[Not tested]` — needs a frame-level capture |

**Environment note on V7:** the Playwright MCP browser produces frames only on demand (a bare `requestAnimationFrame` counter advanced **1** frame in 500 ms while `document.visibilityState === "visible"`). The engine therefore renders one frame per forced paint rather than at 60 Hz. Fingerprints do change per frame, which proves the loop is alive, but continuous cadence and frame budget are **`[Blocked]`** by the headless compositor in this environment, not by the code.

### 4.3 Audio (instrumented)

| # | Check | Result | Status |
|---|---|---|---|
| U1 | No context before a gesture | `created: 0`, no `<audio>`/`<video>`, `data-audio-state="armed"`, no media network request (`[]`) | `[Pass]` |
| U2 | One context on the first gesture | `created: 1`, state `running`, `resume` calls 1 | `[Pass]` |
| U3 | Keyboard also unlocks | keydown listener shares the unlock path | `[Pass]` — source + same handler |
| U4 | Amended-D4 auto-start | music bus target **0.10** (τ 0.3) after the gesture; pad = 2 detuned triangles at 110 Hz + 2 LFOs started at unlock | `[Pass]` |
| U5 | Persisted `music:false` wins | `applySettings` derives `musicTarget = 0` from the store; music never ramps | `[Pass]` — source-reasoned (store→graph path exercised by U7) |
| U6 | Persisted `muted:true` wins | master target 0, glyph `VolumeX`, `aria-pressed="true"`, `data-audio-*-off` | `[Pass]` |
| U7 | One-click master | click → `pressed: "true"`, label "Sound off — unmute all audio", stored `{…"muted":true}`, both channels `off`; second click → restores | `[Pass]` |
| U8 | Per-channel switches | popover rows toggle `sfx`/`music`/`ticks` independently and persist | `[Pass]` |
| U9 | Guess parity | pointer Higher and `ArrowUp` each produced exactly `triangle 300→480` then `sine 880` — identical type/order/frequencies | `[Pass]` |
| U10 | Key-repeat flood | per-cue rate limits + the existing phase guard; held keys cannot exceed one `guess` per round | `[Pass]` — source + guard |
| U11 | Tier ladder | `data-tier` walked 0→1→2→3→4 in one TA run; `tier-1` (triangle 262) captured; t4 carries the 60 Hz sub by construction | `[Pass]` for the ladder, `[Partial]` for t2–t4 spectra |
| U12 | Wrong thud | `sine 90` + `sine 95.5` captured on a wrong answer | `[Pass]` |
| U13 | `go!` sweep | exactly one `AudioBufferSource` created on `go!` (bandpass 400→3000 Hz, 300 ms) | `[Pass]` |
| U14 | Urgent ticks | 10 `square 900 Hz` ticks during the countdown, none after the game-over transition | `[Pass]` |
| U15 | Game-over cadence | `triangle 220` + `triangle 165`; music bus target 0; BGM scheduled level 0 | `[Pass]` |
| U16 | Ducking | modal open → music bus target **0.03** (0.10 × 0.3); close → **0.10** | `[Pass]` |
| U17 | Visibility | hidden: master → 0, BGM scheduler paused, `suspend()` after 120 ms; visible: `resume()` + ramp | `[Partial]` — graph path verified, suspend observed indirectly |
| U18 | Autoplay refusal | `resume()` rejection caught, state returns to `armed`, next gesture retries | `[Not tested]` — not forced |
| U19 | No `AudioContext` | unsupported engine → control `disabled` + `aria-disabled`, no exception | `[Not tested]` — context stub not run |
| U20 | Console | zero page errors and zero console errors on Home, Classic, Time Attack, modal open/close, game over and a full audio toggle cycle | `[Pass]` |

**Modal close fix:** the first instrumented pass showed `data-modal` stuck at `open` after Escape, because `handleClose()` sets `closing.current` before the effect's `else if (!open && … && !closing.current)` branch could run. The closed emit now lives in `handleClose()` itself; re-verified: `data-modal` removed, `modal-out` cue (587 → 440), duck restored, focus back on "View High Scores".

**Play-again fix:** the first pass showed the music target staying at 0 after "Play again" (a duck/target restore only multiplied the already-zero target). `restoreMusic()` now re-derives the channel level from the settings store; re-verified: `phase: "playing"`, `restart` cue (triangle 160), music target 0.10.

### 4.4 Audio control

| Check | Result | Status |
|---|---|---|
| 44×44 at both breakpoints, inside the header band | 1195–1239 / 185–229, y 20–64 | `[Pass]` |
| `aria-pressed`, `aria-expanded`, `aria-controls`, state-describing label | `false` → `true` on mute; label flips with the state; `aria-controls` present only while open | `[Pass]` |
| Popover anatomy | `role="group"`, `aria-label="Audio settings"`, three `role="switch"` rows at 44 px, `aria-checked` correct | `[Pass]` |
| Keyboard | `ArrowDown` on the control opens and focuses row 1; `ArrowUp`/`ArrowDown` cycle; `Escape` closes and returns focus to the control | `[Pass]` |
| Persistence | `hl:audio:v1` written only on an explicit change (`null` before any toggle) | `[Pass]` |
| Zero layout shift | CLS 0 across mount and popover open/close | `[Pass]` |

### 4.5 Surface integrations

| Check | Result | Status |
|---|---|---|
| Shell show-through (D2) | `color(srgb 0.0824 0.0706 0.1686 / 0.84)` | `[Pass]` |
| Header `backdrop-filter` removed | computed `none` | `[Pass]` |
| Header height unchanged (90 / 138) | measured | `[Pass]` |
| `data-surface` / `data-mode` on navigation | `gameplay` / `classic`, then `time-attack` after the mode radio | `[Pass]` |
| `data-mode` follows the Home mode radio | `time-attack` after the click | `[Pass]` |
| Home ambient loops preserved | `document.getAnimations()` = `["ambient-bob","ambient-drift"]` exactly; the canvas contributes none | `[Pass]` |
| Field recession during `revealing` | canvas alpha sum 93227 → 88008 during reveal → 93226 after restore | `[Pass]` |
| Reveal / tier / phase / timer / delta emits | verified through `data-tier`, `data-guess`, `data-phase` and the cue spectra | `[Pass]` |
| BGM resumes on the destination surface | route ramps music to 0, the arriving surface restores it (pulse notes + 0.10 target) | `[Pass]` |
| No media network requests | zero `.mp3/.wav/.ogg/.m4a/.aac/.flac` requests | `[Pass]` |

### 4.6 Not verified

- `npm run build` — `[Blocked]`: a running `next dev` owns `.next`; the owner's server was not to be disturbed.
- Perceptual acceptance (does the field feel alive, is the BGM pleasant, is it tiring, is the 16 % show-through right) — `[Not tested]`; the owner's listening/looking pass.
- iOS silent switch and DPR 2×/3× behaviour, non-Chromium engines — `[Not tested]` / `[Blocked]` (no device).
- Contrast sampling behind gameplay text — `[Not tested]` (design §7.3 arithmetic unchanged and the header is now opaque).
- `aria-live` flips to `assertive` at ≤ 10 s — `[Not tested]` as an attribute read; that code was not modified.

---

## 5. Static checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | `[Pass]` — clean |
| `npx eslint` over every touched file | `[Pass]` — clean (the repo-wide run only reports pre-existing warnings in `.agents/`, `lib/api/worldbank.ts` and `lib/catalog/availability.ts`) |
| Append-only CSS | `[Pass]` — the only insertion point was after the final `@media (prefers-reduced-motion: reduce)` block at line 793; the nine protected blocks are byte-identical |
| Frozen-file diff | `[Pass]` — §1.3 |
| Timing constants | `[Pass]` — `1500`, `800`, `400`, `1000`, `460` unchanged in both game components |
| No new dependency / media asset | `[Pass]` — `package.json` and `package-lock.json` untouched; one generated noise buffer at unlock |
| No new `eslint-disable` | `[Pass]` — one pre-existing unused directive was removed; none added |

---

## 6. Screenshots

Written under `docs/assets/procedural-canvas-audio/after/`:

- `home-desktop-1440.png`
- `home-mobile-390.png`
- `home-mobile-390-popover.png`
- `gameplay-desktop-1440.png` (Classic after a `go!` navigation)
- `gameplay-mobile-390.png`
- `timeattack-desktop-1440.png`
- `timeattack-mobile-390.png`

---

## 7. Open `Needs Verification`

| # | Item | Qualifier |
|---|---|---|
| 1 | Continuous frame cadence and the p95 frame budget at 390×844 | `[environment-specific]` — the headless compositor renders on demand only |
| 2 | Whether the canvas is a frozen snapshot during `nav-forward` (V12) | `[inferred-from-codebase]` |
| 3 | Perceptual quality of the field and the BGM, and BGM fatigue at 0.10 | `[capability-unavailable]` — owner pass |
| 4 | The 16 % gameplay show-through reads correctly in the gutters | `[product-decision]` |
| 5 | Whether the reveal-time cue (rather than the plan's 1500 ms commit) is the intended beat | `[product-decision]` — deviation 2 |
| 6 | Whether reveal-beat BGM ducking should exist at all | `[product-decision]` — deviation 7 |
| 7 | iOS silent-switch behaviour, DPR 2×/3×, non-Chromium engines | `[environment-specific]` / `[capability-unavailable]` |
| 8 | Contrast sampling over the field at the brightest impulse | `[inferred-from-codebase]` |
| 9 | Autoplay-refusal (U18) and no-`AudioContext` (U19) instrumented paths | `[Not tested]` |
