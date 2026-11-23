# Procedural Canvas Backdrop + Web Audio — Plan

**Date:** 2026-11-22
**Stage:** Plan only. No application code, config, manifest, or other document was edited.
**Task type:** Visual enhancement (persistent procedural canvas) + new interaction subsystem (procedural audio)
**Status:** Plan complete. Code stage not started.
**Design source of truth:** [`docs/procedural-canvas-audio-design-2026-11-22.md`](procedural-canvas-audio-design-2026-11-22.md)
**Upstream analysis:** [`docs/procedural-canvas-audio-analysis-2026-11-22.md`](procedural-canvas-audio-analysis-2026-11-22.md)

---

## 1. What this plan executes

The design document, and only the design document: one persisted full-viewport canvas, one Web Audio engine, one 44×44 header control per surface, the approved `GameplayShell` transparency, and append-only CSS. Nothing else is refactored, renamed, or "tidied while we are here".

Binding owner decisions carried forward (§1.1 of the design): D1 canvas on Home + Gameplay; **D2 `GameplayShell.tsx` transparency approved**; D3 SFX on after first gesture; **D4 amended — BGM auto-starts at low volume after the first gesture, with a persisted "off" always winning**; D5 header-integrated 44×44 control top-right on both surfaces; D6 one-click mute + SFX/Music popover; D7 shared generative theme with mode tempo/root; D8 ticks auto by pointer type; D9 respect the iOS silent switch; D10 one static canvas frame under reduced motion; D11 ticks only at ≤ 5 s; D12 modal dampening 55 % field / 30 % BGM; D13 keyboard press styling stays out of scope; D14 no extra motion toggle.

---

## 2. Exact modification allowlist

### 2.1 Tier A — modified existing files

| # | File | Precise change summary | Matrix rows covered | Design ref |
|---|---|---|---|---|
| **A1** | [`app/layout.tsx`](../app/layout.tsx:37) | Render `<AtmosphereBackdrop />` as the first child of `<body>` and `<AudioSurface variant="gameplay" />` after `{children}`. **`<html>` class string at `:36` and `<body>` class string at `:37` stay byte-identical.** No metadata change. | Canvas persistence for all 36 rows; audio availability on gameplay | §6.1 |
| **A2** | [`app/globals.css`](../app/globals.css:1) | **Append only.** (a) `:root` block with `--atmo-*` tokens (grid-free horizon/tint alphas, recession targets, control accent). (b) `@media (prefers-reduced-motion: no-preference)`-guarded `html[data-*]` harmonization rules from design §5.2. (c) A `prefers-reduced-motion: reduce` block for the same selectors that removes any transition and keeps only instant state. (d) `.audio-surface` / `.audio-surface-popover` presentation classes. **Nothing above the append point may change** — in particular the `:root` at `:4`, the grid at `:112`, the focus ring at `:119`, the reduced-motion strip at `:188`, the noise overlay at `:200`–`:207`, the motion `:root` at `:460`, the ambient block at `:668`, the reduced-motion fidelity block at `:705`, and the `::view-transition` rules at `:741`–`:793`. | H4, H12, H17, G2, G7, G11, H18, G17 (state harmonization) | §3.2, §5.2, §10 |
| **A3** | [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx:45) | **Tier B, approved by D2.** (1) `:45` shell surface → `bg-[color-mix(in_srgb,var(--surface-background)_84%,transparent)]`; `bg-grid`, `relative isolate`, `overflow-x-hidden`, `min-h-dvh` unchanged. (2) `:48` header → opaque `bg-[var(--surface-background)]` and **`backdrop-blur` removed**. (3) `:66` header subtitle gains `truncate` (title already has it at `:63`) so the shrunk centre column cannot grow the header. (4) `:72` col-3 cluster gains `<AudioSurface variant="gameplay" />` as its first child. No other class, order, or element changes; `status` and `headerFooter` props untouched. | G2 (visibility), G4/G5 (gutter visibility), G17 | §7.2, §9.2 |
| **A4** | [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:181) | (1) Insert `<AudioSurface variant="home" />` as the **first** child of the existing header row at `:181` (before the High Scores button). (2) One `route` emit (`intent: "forward"`) inside the existing `startGame` before `router.push` at `:149`. **Preserve** the hero variants, `useReducedMotion` branches, the shared ambient observer at `:82`, `data-ambient`, and `transitionTypes`. | H18; route hand-off for H10; surface detection for all H rows | §9.2 |
| **A5** | [`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:170) | Two emits and nothing else: (1) `guess` inside `handleGuess`, placed **after** the existing `phase !== "playing"` guard at `:172` and using the `document.activeElement` rect the handler already captures at `:173`; (2) `reveal` (`correct`, `tier` from the existing `resolveTier` at `:138`) + `phase` inside the untouched 1500 ms callback at `:193`. **No change** to `handleGuess` semantics, the `1500` ms constant, deck logic, high-score writes, the keyboard effect at `:242`, the game-over panel, or the focus trap. | G2–G7, G11, G12 (via G7/G11 signals) | §4.2b |
| **A6** | [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:242) | Three emits and nothing else: (1) `guess` inside `handleGuess` after the `guessLocked`/`phaseRef` guards at `:244`; (2) `reveal` + `phase` inside the reveal callback at `:287`; (3) `timer` from the existing 1000 ms interval at `:177` reading `timerRef.current`, plus `delta` at `:267`/`:276`. **No change** to `INITIAL_TIME`, `BONUS_CORRECT`, `PENALTY_WRONG`, `REVEAL_MS_CORRECT`, `REVEAL_MS_WRONG`, the `1000` ms interval, the `460` ms shake window, `guessLocked`, `aria-live`, or `startTimer`. | G2–G12 (TA paths), G8, G9, G10 | §4.2b |

### 2.2 Tier A — new files (none of these exist today)

| # | File | One-line responsibility |
|---|---|---|
| **N1** | `lib/atmosphere/types.ts` | The `AtmosphereEvent` union, `SurfaceId`, `Phase`, `Tier`, `CueKind`, and the rect/origin type — types only, no runtime code. |
| **N2** | `lib/atmosphere/eventBus.ts` | Framework-free typed emitter/subscriber singleton with a bounded subscriber list and a `emit()` that never throws to its caller. |
| **N3** | `lib/atmosphere/delegation.ts` | Capture-phase `pointerdown` / `keydown` / `pointerover` classifier that turns a DOM interaction into a `pointer` event, with the 350 ms pointer-vs-keyboard de-duplication window. |
| **N4** | `lib/atmosphere/canvasEngine.ts` | `getContext` guard, token read, P0/P2/P5 pre-render, mote pool, impulse ring, recession lerp, resize/DPR/low-quality handling, visibility + reduced-motion lifecycle, `start()`/`stop()`/`destroy()`. |
| **N5** | `components/atmosphere/AtmosphereBackdrop.tsx` | The only canvas client component: renders `<div aria-hidden><canvas aria-hidden/></div>`, owns the engine instance, the delegation listeners, the `usePathname()`-driven surface/mode detection, and the `data-*` writer. |
| **N6** | `lib/audio/settings.ts` | Versioned `hl:audio:v1` persistence with `subscribe`/`getSnapshot`/`getServerSnapshot`, defaults, `try/catch` storage access, and the "persisted off wins" resolution used by auto-start. |
| **N7** | `lib/audio/soundMap.ts` | Cue → synthesis parameter table (waveform, filter, envelope, frequencies, duration, peak gain) exactly as design §8.2, plus the per-cue rate limits. |
| **N8** | `lib/audio/audioEngine.ts` | `AudioContext` lifecycle, bus graph + limiter, voice factory, concurrent-voice cap, ducking, visibility suspend/resume, first-gesture unlock, auto-start-at-low-volume under amended D4, master/SFX/music gain control. |
| **N9** | `lib/audio/bgm.ts` | Generative Home pad and gameplay pulse plus the 25 ms `setInterval` / 100 ms horizon lookahead scheduler; start/stop/duck hooks. |
| **N10** | `components/audio/AudioSurface.tsx` | The 44×44 control + popover: `useSyncExternalStore` over the settings store, `aria-pressed`/`aria-expanded`/`aria-controls`/`aria-label`, keyboard interaction, and the `data-audio-*` writes. |

### 2.3 Tier B — flagged, requires explicit owner approval (not silently added)

| # | File | Why it may be necessary | Fallback if refused |
|---|---|---|---|
| **B1** | [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:68) | One `modal` emit (`open` / `closed`) in the existing open/close effect at `:68`–`:90`. Delegation already covers the click that opens it; without this, **Escape** (`onCancel` at `:160`) and **backdrop click** (`:173`) closes would not dampen/restore the field or duck BGM. | `AtmosphereBackdrop` observes `dialog[open]` with a `MutationObserver` (attribute-only, read-only, no source edit). Slightly less precise timing (one microtask later) and one extra observer. **Preferred if the owner wants zero modal edits.** |
| **B2** | [`components/atmosphere/`](../components/atmosphere/), [`lib/atmosphere/`](../lib/atmosphere/) path creation | New directories. | None — they are part of the approved new-file set. |
| **B3** | [`components/game/DecisionControls.tsx`](../components/game/DecisionControls.tsx:28) | Only if keyboard-origin press *styling* is wanted (inherited QA F2). | **Not requested.** D13 keeps keyboard press styling out of scope; canvas/SFX parity comes from `handleGuess` (A5/A6), not from this file. |

**No other expansion is requested.** In particular `app/page.tsx`, `app/game/[mode]/page.tsx`, `app/game/layout.tsx`, `app/game/classic/page.tsx`, `app/game/time-attack/page.tsx`, `next.config.ts`, `components.json`, `package.json` and `package-lock.json` are **not** touched. The `<ViewTransition>` wrappers already exist ([`app/page.tsx:9`](../app/page.tsx:9)) and view transitions need no configuration ([`view-transitions.md:50`](../node_modules/next/dist/docs/01-app/02-guides/view-transitions.md:50)).

### 2.4 Frozen — must not change

`lib/api/**`, `lib/catalog/**`, `lib/game/deck.ts`, `lib/highScores/**`, `types/**` (including `types/view-transition.d.ts`), `scripts/**`, `app/api/**`, `next.config.ts`, `components.json`, `package.json`, `package-lock.json`, `app/page.tsx`, `app/game/**` (layout, `[mode]`, classic, time-attack), `components/game/GameCard.tsx`, `ComparisonBoard.tsx`, `GameplayStatus.tsx`, `DerivedGameState.tsx`, `GameplayDivider.tsx`, `components/game/DecisionControls.tsx`, `components/home/{DomainSelector,CategorySelector}.tsx`, `components/CategoryCard.tsx`, `components/ModeButton.tsx`, `components/ui/button.tsx`, `public/**`, and all six `docs/immersive-motion-redesign-*.md`.

Frozen means frozen: the gameplay rules, timing constants (`1500`, `800`, `400`, `1000`, `460` ms), deck logic, scoring, provider adapters, catalog authorization, high-score storage and the type surface are not touched by any step of this plan.

---

## 3. Per-file change list against the 36-row matrix

### 3.1 Coverage map

| File | Rows it makes functional | How |
|---|---|---|
| N3 + N5 (delegation + `data-*` writer) | **H1, H3, H4, H5, H5b, H6, H7, H8, H9, H10, H11, H13, H14, H15, H16, G1, G4, G5, G13, G14** | Generic capture-phase classification + `getBoundingClientRect()` origins; disabled rows (H7, H9) are matched but suppressed because the element is `disabled`, so no impulse is emitted (design §4.3) |
| A2 (CSS harmonization) | H4, H12, H17, G2, G7, G11, H18, G17 | `html[data-audio-*]`, `html[data-tier]`, `html[data-phase]`, `html[data-modal]` selectors |
| A3 (shell transparency + header) | **G2, G4, G5, G7, G11, G17** (visibility), G3 (board context) | Makes the field visible on gameplay without touching card geometry |
| A5 (Classic emits) | **G6, G7, G11, G12** | `guess` inside the shared funnel gives keyboard/pointer parity; `reveal` carries `tier` |
| A6 (TA emits) | **G6, G7, G8, G9, G10, G12** | Same funnel + the existing 1000 ms tick + the existing delta branches |
| A4 (Home audio slot + route) | **H18**, H10 hand-off, H1–H17 surface context | Control mount + `route` intent |
| N1–N10 | H2, H12, H17, G3, G12, G15, G16 too | Hero swell, modal dampening, reveal scan, game-over settle, and the "no reaction" rows are implemented as **explicit no-ops** in the engine (G15, G16, H7, H9, H11) |

### 3.2 Explicit non-actions (recorded so they are not mistaken for omissions)

| Row | Non-action | Reason |
|---|---|---|
| H7, H9 | No impulse, no cue | Disabled controls must not imply interactivity (analysis §5.1) |
| H11 | No cue | Static footer |
| G2 | No cue | Passive container; recession is `phase`-driven |
| G9 | No cue | Progress bar is a visual mirror only |
| G15 | No cue, no impulse | Focus movement is never echoed |
| G16 | No cue; field forced to the low-energy state | Deliberately silent |
| H5b, ticks | Gated by `matchMedia('(hover: hover) and (pointer: fine)')` **and** the ticks setting | D8 |
| D13 | No `data-pressed` handler beat | Out of scope by owner decision |

---

## 4. Implementation sequence

Dependency order. Each step is a coherent unit; the **landable sets** column lists sets that can ship on their own with the app working and nothing half-wired.

| Step | Work | Files | Depends on | Landable set |
|---|---|---|---|---|
| **S1** | **Contracts.** Event union + bus + delegation classifier (no consumers). Nothing renders yet. | N1, N2, N3 | — | ✅ `{S1}` — zero visual change, pure addition |
| **S2** | **Canvas engine core.** Context guard, token read, P0/P2/P5 pre-render, mote pool, impulse ring, recession, resize/DPR/low-quality, visibility + reduced-motion single-frame path, destroy. No React. | N4 | S1 | ✅ `{S1+S2}` — still no visual change (nothing mounts it) |
| **S3** | **Mount the atmosphere.** `AtmosphereBackdrop` component, layout mount, `data-atmosphere`/`data-surface`/`data-mode` writer, `usePathname()` detection, delegation listeners attached. **Home gets a living backdrop at the end of this step.** Gameplay still opaque until S6. | N5, A1 (partial: backdrop only), A2 (partial: tokens only) | S2 | ✅ `{S1+S2+S3}` — Home-only atmosphere, no audio, gameplay unchanged |
| **S4** | **Audio engine + settings + sound map + BGM**, with no UI. Verified only through a temporary console-free harness during QA, never shipped as debug hooks. | N6, N7, N8, N9 | S1 (for cue ids) | ✅ `{S1+S4}` — engine exists, nothing calls it |
| **S5** | **Audio control.** `AudioSurface` (44×44 + popover + store subscription + `data-audio-*`). Mounted in the layout only; the Home header slot lands in S6. | N10, A1 (partial: surface only) | S4 | ✅ `{S1+S4+S5}` — control live on gameplay-adjacent chrome only after S6; on its own it is inert but harmless |
| **S6** | **Surface integrations + D2 transparency.** Home header slot, gameplay col-3 slot, shell `color-mix` surface, header blur removal, header `truncate`, `route` emit. | A3, A4, A1 (complete) | S5 | ✅ `{S1–S6}` — full canvas + audio UX, **but no gameplay cues yet** (guesses are still silent/silent-field because S7 has not landed) |
| **S7** | **Semantic emits.** `guess` / `reveal` / `phase` / `timer` / `delta` in the two game components, plus the `data-*` writer wiring for `data-phase`/`data-tier`/`data-guess`. | A5, A6, N5 (writer completion) | S6 | ✅ `{S1–S7}` — the complete feature |
| **S8** | **Harmonization + modal dampening.** A2's `html[data-*]` rules, `.audio-surface` presentation, and B1 `modal` emit (or its `MutationObserver` fallback). | A2 (complete), B1 | S7 | ✅ `{S1–S8}` — the finished, harmonized feature |
| **S9** | **Reduced-motion, accessibility and full verification sweep.** Emulated-reduce pass, contrast sampling, keyboard parity runs, audio instrumentation, regression ladder. Verification only; fixes go through the postfix condition. | All touched files | S1–S8 | Final |

**Suggested first reviewable point:** `{S1+S2+S3}` — Home visibly alive, zero audio, zero gameplay change, trivially revertable.
**Suggested second:** `{S1–S6}` — full chrome and control shipped, gameplay still silent, so any visual regression is isolated from any gameplay regression.

---

## 5. Verification matrix

Verification is proportional. Unrun checks are reported `[Not tested]`; blocked ones `[Blocked]` with the reason. The project has **no test framework** and **no CI** (`.roo/rules/01-project-boundaries.md`), so runtime checks are Playwright MCP passes against the owner's dev server, and static checks are the two project npm scripts.

### 5.1 Static

| Check | Method | Applies to | Expected |
|---|---|---|---|
| Type check | `npx tsc --noEmit` (`noEmit: true` already set) | All | Clean |
| Lint | `npm run lint` | All | Clean; no new `eslint-disable` except the project's existing native-`<img>` precedent (which must not be added — `GameCard.tsx` is frozen) |
| Build | `npm run build` **only if the dev server is stopped**; otherwise `[Blocked]` (a running `next dev` owns `.next`) | All | Clean |
| Append-only CSS | Diff `app/globals.css` and confirm every change is after the last existing line; assert the `:root` at `:4`, grid at `:112`, focus ring at `:119`, reduced-motion strip at `:188`, noise at `:200`–`:207`, motion `:root` at `:460`, ambient at `:668`, fidelity at `:705`, `::view-transition` at `:741` are byte-identical | A2 | Pass |
| Frozen-file diff | `git diff --stat` must show none of §2.4 | All | Pass |
| Timing-constant diff | `1500`, `800`, `400`, `1000`, `460` unchanged in both game components | A5, A6 | Pass |
| Bundle surface | No new dependency in `package.json`; no import outside `lib/atmosphere`, `lib/audio`, `components/atmosphere`, `components/audio`, `motion/react`, `lucide-react` | All | Pass |
| SSR purity | Grep the new modules for `window`/`document`/`localStorage`/`AudioContext` reached outside `useEffect` or an event handler | N4–N10 | Pass |

### 5.2 Geometry invariants (Playwright, DPR 1)

Measured baselines from the analysis §2.1 / §7.1. **Every value in the "expected" column must be re-asserted unchanged unless the row is explicitly about the new control.**

| Viewport | Surface | Assertion | Expected |
|---|---|---|---|
| 1440×900 | Home | document height | **2242 px** unchanged |
| 1440×900 | Home | `scrollWidth` | **1435** unchanged |
| 1440×900 | Home | High Scores rect | **132×44 at (1247, 20)** unchanged |
| 1440×900 | Home | audio control rect | **44×44 at ≈(1195, 20)**, no overlap with High Scores (`right ≤ 1239`), inside the header band |
| 1440×900 | Home | `go!` rect | **176×176 at (630, 1889)** unchanged |
| 1440×900 | Classic | header height / back rect / status cluster | **90 px** / **44×44 at (24, 22)** / **1300–1416** unchanged |
| 1440×900 | Classic | audio control rect | 44×44, right-aligned inside the col-3 cluster, `left ≥ 1300 − 52`; no overlap with the status cluster or the back link |
| 1440×900 | Classic | Higher / Lower rects | **283×54 at (919, 724)** / **(919, 790)** unchanged |
| 1440×900 | Time Attack | header height (grid + footer) | **138 px** (88 + 48) unchanged |
| 1440×900 | Time Attack | timer rect / progressbar extent | **37×36 at (24, 88)** / bar ends **1411** unchanged |
| 390×844 | Home | document height / `scrollWidth` / `h1` size | **2489** / **385** / **56 px** unchanged |
| 390×844 | Home | High Scores rect | **132×44 at (237, 20)** unchanged |
| 390×844 | Home | audio control rect | 44×44 at **≈(185, 20)**, `right ≤ 229`, no overlap with High Scores (`left 237`) |
| 390×844 | Classic | back rect / status cluster / Higher-Lower | **(16, 22)** / **264–369** / y **1100** & **1166**, x **51–334** unchanged |
| 390×844 | Classic | header height | **≤ 5.5 rem band** — must not grow after the control is inserted; title **may** truncate (accepted, design §13.12) |
| 390×844 | Any | horizontal overflow | `scrollWidth` unchanged (385), no new horizontal scrollbar |
| Any | Any | layout shift | `PerformanceObserver('layout-shift')` cumulative score **< 0.01** across load, audio-control mount, and popover open/close |

### 5.3 Canvas behaviour

| # | Check | Method | Expected |
|---|---|---|---|
| V1 | Exactly one canvas | `document.querySelectorAll('canvas').length` | `1` on Home, Classic, Time Attack, and after any route change |
| V2 | Fixed full-viewport | computed `position` / `inset` / rect | `fixed`, rect equals `innerWidth × innerHeight` |
| V3 | Non-interactive | computed `pointer-events`; `canvas.getAttribute('aria-hidden')` | `none`; `"true"` |
| V4 | Below all content | `elementFromPoint` at the header, a card, `go!`, Higher, Lower, the audio control | Never the canvas (always the real control) |
| V5 | Persists across navigation | Navigate Home → Classic → back; compare canvas identity (`dataset` sentinel written once by the engine) and confirm **no remount** | Same canvas node, `data-atmosphere="on"` throughout, no reset of mote positions |
| V6 | No flicker / no reset | Screenshot burst at 100 ms intervals across the transition | No white/black frame; field tint matches the destination mode after the transition |
| V7 | Pixels actually change at rest | 32×32 `drawImage` fingerprint twice ~650 ms apart on Home (the analysis §3.0 method) | Fingerprints differ; identical under reduced motion |
| V8 | Static under reduced motion | Emulate `prefers-reduced-motion: reduce`; fingerprint twice; `document.getAnimations()` | Fingerprints identical; `getAnimations()` count unchanged from baseline (2 Home / 0 Classic / 1 TA) |
| V9 | Paused when hidden | Simulate visibility hidden (`Page.setWebLifecycleState` or an equivalent Playwright hook); fingerprint twice | Identical; rAF count stops |
| V10 | No context → graceful | Stub `HTMLCanvasElement.prototype.getContext` to return `null` before load | Page renders identically, `data-atmosphere="off"`, no console error |
| V11 | Low-quality path | Set `localStorage["hl:atmosphere:quality"]="low"`; reload | `scale` behaves as 1 (buffer ≈ CSS size), motes halved, no errors |
| V12 | Route-transition snapshot | Record the `nav-forward` window; compare canvas pixels before/after | Backdrop is a still frame during the window (`Needs Verification` item 2); no mid-burst freeze visible |

### 5.4 Event mapping — every row exercised

| Row(s) | Interaction | Assertion |
|---|---|---|
| H1 | Scroll Home to `setup` | Depth field offset changes and is clamped; document height and `scroll-behavior` unchanged |
| H2 | Load Home | One swell at the `h1` origin; exactly one impulse in the ring |
| H3 | Click **Start Comparing** | Ripple origin (`x`,`y`) within 2 px of the anchor's rect centre; scroll still lands at `#setup` |
| H4 | Click **View High Scores** | Ripple 160 px; field recesses to 55 % (not 70 % — design C-4) |
| H5 | Click each of the 4 domain labels | `shockwave` origin equals the **label** rect, not the 1×1 input; tint matches the domain |
| H5b | Hover a domain label (fine pointer) | Glow follows pointer x; **no** glow when emulating a coarse pointer |
| H6 | Select a category row | Vertical band height equals the row height; decay ≈ 400 ms |
| H7 | Click an Unavailable row | **Zero** impulses emitted |
| H8 | Select Classic, then Time Attack | Field tint lerps to `#6355cb` then `#d93fd0` over ≈ 500 ms |
| H9 | Attempt the disabled PvP card | **Zero** impulses |
| H10 | Press `go!` | Burst finishes ≤ 320 ms audible/visible; field fades; navigation occurs; no double navigation on a double click |
| H11 | — | No cue on footer interaction (skipped, recorded) |
| H12 | Open High Scores | Field 55 %, BGM ducked to 30 %, dialog appears unchanged |
| H13 | Click both tabs, and ArrowLeft/Right | Ripple per tab; `aria-selected` unchanged; field tint follows the tab's mode |
| H14 | Change the filter `select` | Small ripple at the right edge |
| H15, H16 | Two-press clear flows (analysis C7: **two** presses) | `warn` then `confirm`; cancel emits nothing further |
| H17 | Close via X, Escape, and backdrop | Field restores over 180 ms; focus returns to the opener |
| H18 | Click the audio control | `ack` at the control origin; glyph, `aria-pressed` and `data-audio-*` agree |
| G1 | Back link | Ripple then field fade; navigation occurs |
| G2 | Make a guess | Field 100 % → 80 % during `revealing`, restored on `playing`; OR badge still 1→0.5 |
| G3 | Reveal | Scan line crosses the **board** but is masked out of both card image rects (pixel check inside the `<img>` rect is unchanged) |
| G4, G5 | Click Higher / Lower | Updraft / downdraft originate at the button rect |
| G6 | `ArrowUp`, `h`, `ArrowDown`, `l` | **Identical** event sequence to the pointer path (same `type`, `direction`, same cue id) |
| G7 | Correct answers 1→5 | `data-tier` walks 1→4; t4 emits the single-frame 4 % invert exactly once |
| G8 | Time Attack at 10 s, then 5 s | Grid pulse starts at ≤ 10 s (visual); **audio ticks only at ≤ 5 s** |
| G9 | Time Attack running | Scan line tracks remaining time; no cue |
| G10 | Correct then wrong in TA | `gain` at the label origin, then `loss`; `delta` text unchanged |
| G11 | Wrong answer | `fracture` magnitude identical on the first and the fifth wrong answer (no escalation) |
| G12 | Lose | Field settles to 75 % behind the scrim; no burst; BGM fades to 0 |
| G13 | Play again | Field returns to the mode tint ≤ 500 ms |
| G14 | Back to setup | Same as G1 |
| G15 | Tab inside the game-over dialog | **Zero** cues/impulses |
| G16 | Navigate with an empty pool | Field at ≈ 35 %, 20 % density, **zero** cues |
| G17 | Audio control in gameplay | Same as H18 |

### 5.5 Audio verification (instrumented, no production debug hooks)

All instrumentation is injected from the test side with `page.addInitScript(...)` **before** navigation. Nothing is added to the app for testability.

```js
// pattern, not a shipped file
await page.addInitScript(() => {
  const Real = window.AudioContext;
  window.__audioProbe = { created: 0, states: [], osc: [], gains: [], resumes: 0 };
  window.AudioContext = class extends Real {
    constructor(...args) { super(...args); window.__audioProbe.created++; }
    createOscillator() { const o = super.createOscillator(); window.__audioProbe.osc.push(o.type); return o; }
    resume() { window.__audioProbe.resumes++; return super.resume(); }
  };
});
```

| # | Check | Expected |
|---|---|---|
| U1 | Before any gesture on load | `__audioProbe.created === 0`; no `<audio>` elements; no network request whose URL ends in `.mp3/.wav/.ogg/.m4a` |
| U2 | After the first `pointerdown` | Exactly **1** context; `state === "running"`; `resumes ≥ 1` |
| U3 | First gesture is a keypress instead | Same as U2 (keyboard unlocks) |
| U4 | BGM under amended D4 | With no stored key: music audible path begins after U2, `musicBus` gain target ≈ 0.10, fade-in ≈ 900 ms, **not** 0.28 |
| U5 | Persisted `music:false` | Seed `localStorage["hl:audio:v1"] = {v:1,sfx:true,music:false,ticks:"auto",muted:false}`; after U2, **no** music voices are scheduled; the popover shows Music off |
| U6 | Persisted `muted:true` | After U2, master gain target 0; no SFX, no music; glyph `VolumeX`; `aria-pressed="true"` |
| U7 | Master one-click | Click → master target 0, persisted `muted:true`, glyph/label/`aria-pressed` all flip together; click again → restores |
| U8 | Per-channel switches | SFX off silences `higher` but music continues; Music off silences BGM but SFX continues; both persist |
| U9 | Guess parity | `ArrowUp` and a Higher click each create the same oscillator type/frequency pair (within tolerance) and the same count (1) |
| U10 | Key-repeat flood | Hold `ArrowUp` 2 s: oscillator creations ≤ the phase guard allows (1 per guess), never a runaway count |
| U11 | Tier ladder | Correct answers 1→5 produce stacks with 1/2/3/4+1 oscillators, and t4 includes the 60 Hz sub |
| U12 | Wrong thud | One sine at ~90 Hz plus the detuned partner; duration ≈ 220 ms; identical on the 5th wrong answer |
| U13 | `go!` sweep | Noise-buffer source created exactly once; bandpass frequency ramps; audible tail ≤ 320 ms |
| U14 | Urgent ticks | Drive TA to 10 s: **0** ticks between 10→6 s; at ≤ 5 s exactly 1 tick per second (± 1 per 5 s window) |
| U15 | Game-over cadence | 2 notes; `musicBus` target 0; no further music scheduling |
| U16 | Ducking | Open High Scores mid-music: `musicBus` target ≈ 30 % within 200 ms; restores after close |
| U17 | Visibility | Hide the tab: master → 0 and `suspend` observed; restore: `resume` + ramp; no error in console |
| U18 | Autoplay refusal | Stub `resume()` to reject once: no unhandled rejection, `data-audio-state="armed"`, next gesture retries |
| U19 | No context support | Delete `window.AudioContext` in `addInitScript`: control renders disabled, no exception, canvas unaffected |
| U20 | Console | Zero errors/warnings added on Home, Classic, Time Attack, modal open/close, game over, and a full audio toggle cycle |

### 5.6 Regression (must not break)

| # | Invariant | Method | Expected |
|---|---|---|---|
| X1 | Five-tier ladder | Score 1→5 in Classic and TA | `data-tier` 1→4 and the existing streak ring/line appear at tier ≥ 3 exactly as today |
| X2 | Reveal-time tally | Reveal a correct answer | Displayed score bumps during the reveal, not after — unchanged |
| X3 | `<ViewTransition>` route | `go!` → gameplay | `nav-forward` still fires with the existing 320 ms timing; `::view-transition { pointer-events: none }` intact |
| X4 | Reduced-motion crossfades | Emulate reduce; reveal, cascade, route | Opacity crossfades still occur; positional motion stripped |
| X5 | Home ambient loops | Load Home | `document.getAnimations()` still reports exactly the 2 ambient animations (`ambient-bob`, `ambient-drift`) besides Motion work — the canvas adds none |
| X6 | Game-over entrance | Lose in each mode | No new entrance animation; panel appearance identical to baseline screenshot |
| X7 | Timer cadence | TA for 20 s | `displayTime` decrements 1/s within ±1 per 10 s; `aria-live` flips to `assertive` at ≤ 10 s |
| X8 | Byte-identical legacy CSS | Diff the nine CSS blocks listed in §5.1 | Byte-identical |
| X9 | Keyboard shortcuts | `h`/`l`/arrows still guess; ignored inside dialogs and on controls | Unchanged |
| X10 | High-score storage | Play to game over | Writes still happen once; no new keys besides `hl:audio:v1` (and optional `hl:atmosphere:quality`) |
| X11 | Focus return | Close modal / game over | Focus returns to the opener or the Higher button exactly as today |
| X12 | Home scroll | Click Start Comparing | Still lands at `#setup`; `setupArrived` pulse still plays |

### 5.7 Perceptual acceptance (separately recorded)

Per QA condition policy: technical verification proves rendering, interaction, accessibility and reduced-motion compliance. **"Does the atmosphere feel right", "is the BGM pleasant", "is the music tiring after two minutes" are perceptual and must be observed by the owner.** They are recorded as `[Not tested]` until a human says otherwise, and are not claimed here.

---

## 6. Risk register

Analysis numbering preserved; new risks appended.

| # | Risk | Likelihood | Impact | Mitigation in this plan | Detection |
|---|---|---|---|---|---|
| **R1** | **Autoplay blocked / silently dead audio.** A context created outside a gesture stays `suspended` and the control lies | Medium | High | Create only inside the first qualifying `pointerdown`/`keydown` (S4); `resume()` before every schedule; catch rejection and stay `armed`; the glyph describes settings intent, and `data-audio-state` exposes the truth | U1–U3, U18 |
| **R2** | **iOS silent-switch "no sound" reports** | High (iOS) | Medium | D9: never set `audioSession.type`; the popover is the place for copy if needed | U-suite is Chromium-only; iOS stays `[Not tested]` |
| **R3** | **`backdrop-filter` over a live canvas**, re-blurring every frame | High if unaddressed | Medium | Header blur is **removed** and the header becomes opaque (A3); the game-over scrim's `backdrop-blur-sm` is bounded to the game-over state | Computed-style assertion: no `backdrop-filter` on the header; frame-time trace on gameplay |
| **R4** | **Opaque shell hides the canvas** — feature "doesn't work" where it matters | Certain if unaddressed | High | A3 `color-mix` 84 % surface (design §7.2–§7.3), approved by D2 | `getComputedStyle(shell).backgroundColor` shows alpha; pixel diff in the desktop gutters |
| **R5** | **Mobile frame budget.** A full-viewport rAF loop beside image decode and Motion | Medium | High | DPR cap 2, low-quality mode, 28/12 motes, 2-impulse ring, no filters/shadows, pause when hidden, single static frame under reduce | `performance_start_trace` long tasks; p95 frame ≤ 24 ms at 390 |
| **R6** | **Contrast regression over the field** | Medium | High | Text-safe bands driving field contribution to 0; ≤ 16 % gameplay show-through of a dim field; ≤ 8 % luminance delta rule | Rendered contrast sampling at the brightest field moment behind the status overlay and the header |
| **R7** | **Canvas competes with `GameCard` cover art** | Medium | High | `z-index: 0` below all content; impulses clipped outside card rects; `land` scan masked out of the image rect | V4; pixel check inside the `<img>` rect during G3 |
| **R8** | **Reduced-motion regression.** Someone starts rAF unconditionally | Medium | High | Single-frame path with an early return; `matchMedia` change re-evaluates; the global CSS block stays byte-identical | V8 + X4 |
| **R9** | **Hydration mismatch** (the F4 class) via settings read during render | Medium | High | `useSyncExternalStore` with a server snapshot equal to defaults; all browser reads in effects; no `data-*` before the effect runs | U20 (console) under both motion preferences; no `data-audio-*` in server HTML |
| **R10** | **Keyboard/pointer divergence.** SFX fires on click but not on `h`/`l` | Medium | High (explicit requirement) | `guess` is emitted inside `handleGuess` in both modes, not in the click handler | G6 and U9 assert identical sequences |
| **R11** | **Audio spam** from key repeat or rapid clicks | Medium | Medium | Per-cue rate limits, 8-voice cap with drop-not-queue, existing `guessLocked`/`phase` guards | U10 |
| **R12** | **View-transition freeze.** The backdrop is a still snapshot during `nav-forward` | High (behaviour) | Low | Accepted; `go!` burst is finished inside the window; tint already matches the destination; no self-animation around navigation | V12 |
| **R13** | **Scope creep into layout.** "Fixing" spacing while adding the control | Medium | High | Every geometry invariant in §5.2 is asserted unchanged; any layout change is a stop condition (§7) | Diff review limited to §2.1 changes |
| **R14** | **Two ambient systems fight** (Home CSS loops + field motion) | Medium | Medium | Home field density reduced and drift ≤ 6 px/s; the canvas never animates the chevron or `go!` offset (CSS owns those); X5 asserts the animation count | Visual check; `getAnimations()` count unchanged |
| **R15** | **Audio control unreachable in a modal**, read as a bug | Low | Low | Documented (analysis R15); the control dims to 60 % while `data-modal="open"` | Design §5.2 selector present |
| **R16** | **Double-fire from delegation** (pointer + native click + keyboard) | Medium | Medium | 350 ms pointer-vs-keyboard de-duplication window; delegation reacts to `pointerdown` only, never `click`; per-class checks | §5.4 H3–H16 assertion that each interaction emits exactly one impulse |
| **R17** | **Header height growth from a wrapped subtitle** at 390 once the control shrinks the centre column | Medium | High (layout shift) | A3 adds `truncate` to the subtitle as well as the title; §5.2 asserts header height ≤ its band | Geometry assertion at 390×844 |
| **R18** | **Audio created per mount leak.** A second engine or context on route change | Low | Medium | Engine is a module singleton; the layout owns it; `close()` never called | U1/U2 across a full Home → Classic → Home cycle: still exactly 1 context |
| **R19** | **BGM fatigue under amended D4.** Auto-start is the owner's call but can annoy | Medium | Medium | Auto-start target is **0.10** (not the user-enabled 0.28), behind a 900 ms fade, one click to off, and persisted | Perceptual — owner judgment, recorded as `[Not tested]` |
| **R20** | **`color-mix()` unsupported.** Older engines ignore the background and the shell goes fully transparent | Low | High | Ship a fallback declaration before it (`bg-[var(--surface-background)]` then the `color-mix` override), so an unsupporting engine keeps today's opaque surface | Computed-style check; a forced-unsupported-engine check if the harness allows |

---

## 7. Stop conditions

Stop and escalate rather than working around any of these.

1. **A required file is outside §2.1–§2.3.** Adding a file not listed is a scope expansion request, not a silent edit.
2. **A layout value in §5.2 changes.** Any changed document height, header height, control rect or `scrollWidth` at 1440×900 or 390×844 is a stop condition until reconciled — including the header growing because the title column shrank.
3. **A frozen file would need to change** (§2.4), including `GameCard.tsx`, `ComparisonBoard.tsx`, `GameplayStatus.tsx`, `types/**`, `package.json`, or any gameplay timing constant.
4. **The canvas cannot be made visible on gameplay without moving a card, a label, or a focus ring.** D2 authorises transparency, not re-layout.
5. **`<ViewTransition>` route motion regresses** (X3 fails) or the `<html>`/`<body>` class strings would have to change.
6. **Audio cannot start after a gesture in the target engine, or the persisted "off" cannot be honoured.** Amended D4 has no "force it anyway" fallback.
7. **A contrast measurement lands below AA** for text over the field at the brightest impulse.
8. **Reduced motion cannot be honoured** with one static frame (V8 fails).
9. **Two concurrent rAF loops or a second `AudioContext`** appear anywhere (R18).
10. **Any new dependency, media asset, font, or network request** would be required.
11. **The design and the analysis contradict** in a way §1.3 does not already record (C-1…C-5 are recorded and resolved; a *new* one is a stop).
12. **The card offset-plate selector (§13.6 of the design) proves brittle** — drop that harmonization row rather than editing `GameCard.tsx`.

---

## 8. Open `Needs Verification` items carried into implementation

| # | Item | Qualifier | Owner of the check |
|---|---|---|---|
| 1 | Amended D4 vs the analysis's BGM-off recommendation (design C-2) | `[product-decision]` | Owner — confirmed by this brief; re-flag only if the intent changes |
| 2 | Whether a layout-mounted canvas freezes during `nav-forward` | `[inferred-from-codebase]` | Code/QA (V12) |
| 3 | DPR ≠ 1 behaviour: clamp, blur cost removal, mobile frame budget | `[environment-specific]` | QA on a real 2×/3× device |
| 4 | Perceptual audio quality, loudness balance, BGM fatigue | `[capability-unavailable]` | Owner listening pass |
| 5 | Delegation double-fire per control class | `[inferred-from-codebase]` | QA (§5.4, R16) |
| 6 | Card offset-plate selector stability | `[inferred-from-codebase]` | Code (§7 stop 12) |
| 7 | Contrast arithmetic in design §7.3 | `[inferred-from-codebase]` | QA sampling |
| 8 | Non-Chromium engines (canvas loop, audio graph, view transitions) | `[capability-unavailable]` | QA, if available |
| 9 | The 16 % gameplay show-through value | `[product-decision]` | Owner after one rendered look |
| 10 | iOS silent switch behaviour | `[environment-specific]` | Owner on device |
| 11 | Whether Home reads as "alive" or "busy" with three motion systems | `[inferred-from-codebase]` | Owner perceptual |
| 12 | Acceptability of the truncated gameplay title at 390 | `[product-decision]` | Owner; D5 already implies acceptance |
| 13 | Whether `color-mix()` fallback ordering is sufficient in the target engines | `[environment-specific]` | Code (R20) |

---

## 9. Handoff expectations for the Code stage

- Report the changed-file set against §2.1–§2.3 and state explicitly which of the 36 rows were exercised and which were only source-reasoned.
- Record every unrun check as `[Not tested]` and every blocked one as `[Blocked]` with the cause; never imply a pass.
- Separate technical verification from perceptual acceptance (sound character, "does it feel alive"); the latter is the owner's.
- If any stop condition fires, stop and report rather than implementing a workaround.
