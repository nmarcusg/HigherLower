# Procedural Canvas + Audio — Postfix 2: Independent QA

**Date:** 2026-11-22
**Stage:** Independent QA of the postfix (verification only — no code changes)
**Branch:** `lj-branch`
**Environment:** Owner's live `next dev` on `http://localhost:3000` (PID 17272), reused and never restarted. Playwright MCP, Chromium. Viewports 1440×900 and 390×844. Instrumentation injected from the test side via `addInitScript` (patched `AudioContext`, `createOscillator`, `setInterval`, and a buffered `layout-shift` observer). No production hooks, no source edits.
**Inputs treated as claims, not proof:**
- [`docs/procedural-canvas-audio-postfix2-handoff-2026-11-22.md`](./procedural-canvas-audio-postfix2-handoff-2026-11-22.md)
- [`docs/procedural-canvas-audio-postfix2-analysis-plan-2026-11-22.md`](./procedural-canvas-audio-postfix2-analysis-plan-2026-11-22.md)
- [`docs/procedural-canvas-audio-qa-2026-11-22.md`](./procedural-canvas-audio-qa-2026-11-22.md)
- [`docs/procedural-canvas-audio-handoff-2026-11-22.md`](./procedural-canvas-audio-handoff-2026-11-22.md), design, plan, analysis, and the six immersive-motion docs.

---

## 1. Allowlist result

The working tree carries the **entire uncommitted feature** (one deletion inside an untracked directory, 17 tracked modifications, plus untracked feature source dirs), so `git diff` reflects cumulative work rather than the postfix2 delta alone. The handoff states this explicitly. Postfix2-specific facts were therefore verified by file existence and content rather than by `git diff` alone.

| Claim | Result | Evidence |
|---|---|---|
| `lib/audio/bgm.ts` deleted | `[Pass]` | `Test-Path lib/audio/bgm.ts` → `False`. `lib/audio/` now contains only `audioEngine.ts`, `settings.ts`, `soundMap.ts`. |
| Modified set within the approved postfix set | `[Pass]` | 17 tracked modifications present, matching the handoff's "17 tracked modifications" note. The postfix2-touched subset (`globals.css`, `GameCard.tsx`, `HomeSetup.tsx`, `audioEngine.ts`, `settings.ts`, `AudioSurface.tsx`, `types.ts`, `canvasEngine.ts`, `delegation.ts`, `AtmosphereBackdrop.tsx`) all carry the claimed changes (source read-back §3). |
| No other source/config/manifest change | `[Pass]` (vs HEAD) | `git status --porcelain -- package.json package-lock.json next.config.ts components.json tsconfig.json postcss.config.mjs eslint.config.mjs` → empty. |
| No new dependency | `[Pass]` | `package.json`, `package-lock.json` unchanged vs HEAD. |
| No new media asset | `[Pass]` | Recursive scan (excl. `node_modules`) for `*.mp3|wav|ogg|m4a|flac|aac|webm|mp4|weba` → **0 files**. Zero media network requests observed at runtime (`mediaReqs: 0`). |

---

## 2. Static checks

| # | Check | Status | Evidence |
|---|---|---|---|
| S1 | `npx tsc --noEmit` | `[Pass]` | exit 0, no diagnostics. |
| S2 | `npm run lint` | `[Pass]` (with note) | exit 0, **0 errors, 95 warnings**. Warnings originate from `.agents/skills/impeccable/scripts/*.js` (untracked vendor skill code) and two pre-existing app files (`lib/api/worldbank.ts:22`, `lib/catalog/availability.ts:82`). None are attributable to postfix2. See Finding F-7 re: the handoff's "no errors or warnings" wording. |
| S3 | BGM/music identifier grep (`*.ts|*.tsx|*.css`) | `[Pass]` | Patterns `bgm|musicBus|duckMusic|restoreMusic|setExplicitMusic|applyMusicGain|musicTarget|explicitMusic|MUSIC_|pad-swell|setScene|settings.music|toggleMusic|data-audio-music` → **0 matches** in `app/ components/ lib/ types/`. |
| S4 | Broad `music` sweep (to catch comments) | `[Pass]` (one stale comment) | Only non-BGM hits: `MusicBrainz` provider/`musicbrainz.ts`, the `music` **semantic domain** (`lib/catalog/semanticCatalog.ts`), and two intentional comments: `lib/audio/settings.ts:9` (legacy-key note) and `lib/audio/soundMap.ts:10-11` (stale). See Findings F-1 and F-2. |
| S5 | No `data-audio-music` | `[Pass]` | 0 matches in source/CSS; runtime `getAttribute("data-audio-music")` → `null` on every load/route. |
| S6 | `setInterval` residue | `[Pass]` | Only `components/game/TimeAttackGame.tsx:135,182` (Time Attack countdown — game logic, frozen). No BGM scheduler. |
| S7 | CSS append-only apart from approved removals | `[Pass]` (with note) | `git diff -U0 -- app/globals.css` shows **only 4 deleted lines** (old 135/139/144/148, the `home-dialog-in/out` retimes that the handoff attributes to the earlier immersive-motion task) plus one appended block from old line 454 (+513). Postfix2 introduced no deletions outside the appended section. |
| S8 | `:root`, `prefers-reduced-motion`, keyframes, timing constants byte-identical | `[Pass]` | No `-`/hunk appears in the pre-454 region except the four home-dialog retimes above; `:root` (L4+), `prefers-reduced-motion` (L124) and keyframes are untouched. |
| S9 | `npm run build` | `[Blocked]` | Not run: `next build` writes into `.next`, used by the owner's live `next dev` (PID 17272). Not restarted per standing instruction. |

---

## 3. Source read-back (postfix2 claims)

| File | Claim | Confirmed |
|---|---|---|
| [`lib/audio/audioEngine.ts`](../lib/audio/audioEngine.ts) | BGM import/state/`applyMusicGain`/`duckMusic`/`restoreMusic`/`setScene`/`route` case all gone; `playCue` gates on `ctx.state` not a lifecycle label. | Yes — header states "no continuous oscillator, scheduler or timer"; [`playCue`](../lib/audio/audioEngine.ts:270) gates `ctx.state !== "running"`; `handleAtmosphereEvent` has no `route`/music case. |
| [`lib/audio/settings.ts`](../lib/audio/settings.ts) | `music` field/default/`sanitise`/equality removed; `isAudioMuted = muted || !sfx`; key/version unchanged. | Yes — `AudioSettings` = `{v,sfx,ticks,muted}`; `sanitise` ignores unknown keys; key `hl:audio:v1`. |
| [`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx) | Music row/`toggleMusic`/`setExplicitMusic`/`setScene` effect/`data-audio-music` removed; `ROWS = 2`; `window` capture unlock; measured clamp. | Yes — `ROWS = 2` (L55), `data-audio-sfx` writer (L136), `clampPopover` with `POPOVER_INSET = 8` (L164-182), window-capture unlock (L124-129). |
| [`lib/atmosphere/types.ts`](../lib/atmosphere/types.ts) | `music` dropped from `audio`; `mode` event added. | Yes — `audio` = `{sfx,ticks}`; `{type:"mode", mode, surface}` present. |
| [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts) | `tintColor()` collapses to `mode === "time-attack" ? palette.timeAttack : palette.classic`; reduced-motion `route` repaints once. | Yes — L282; L727-733 repaint. |
| [`lib/atmosphere/delegation.ts`](../lib/atmosphere/delegation.ts) | `onPointerOver` classifies Higher/Lower with `finePointer` gate → `pointer/hover` target `higher`/`lower`. | Yes — L204 gate, L211-217; `cueForPointer` returns `null` for `higher`/`lower` so hover is silent (SFX parity). |
| [`components/atmosphere/AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx) | Preset read before `start()`; Home clears `data-phase/tier/guess` and emits `route` on gameplay→home; `phase: playing` after `game-over` clears `data-tier`. | Yes — L52-56/90-94, L197-211, L124-129. |
| [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx) | Passive `mode` emit on `selectedMode` change. | Yes — L107-109. |
| [`components/game/GameCard.tsx`](../components/game/GameCard.tsx) | Two class tokens only (`game-card-plate`, `game-card-face`). | Yes — L87, L89. |

---

## 4. Audio runtime matrix

Instrumentation counted `AudioContext` constructions, oscillator `create/start/stop`, and `setInterval` calls. "live" = started − stopped.

| # | Check | Status | Evidence |
|---|---|---|---|
| A1 | Home at rest, before any gesture | `[Pass]` | `ctxCount 0, oscCreated 0, oscStarted 0, intervals 0` after 2.5 s idle; `data-audio-state "armed"`. |
| A2 | Gameplay at rest, before gesture | `[Pass]` | After client nav to Classic: `created 0, starts 0, stops 0, intervals 0, live 0`. |
| A3 | First qualifying gesture unlocks + plays its own SFX | `[Pass]` | Trusted click on a domain label: `ctxCreated` state **`running`**; **exactly 2 oscillators created, both started and stopped**; `live 0`; `data-audio-state "running"`. This is the `select` cue (2 voices). Isolated repro of the mode-label click: `starts 2 / stops 2 / live 0`. |
| A4 | Keyboard first gesture parity | `[Pass]` (structural) | Unlock listens on `window` capture for `keydown` as well; `playCue` gates on `ctx.state`. Keyboard parity counts not separately re-run here (handoff V11/V12); see F-5. |
| A5 | Zero BGM after unlock / after navigation | `[Pass]` | Gameplay rest `intervals 0`, `live 0`; Classic guesses: all oscillators stopped, `live 0`; `intervals` stays 0 on Classic. |
| A6 | Time Attack has only the countdown timer | `[Pass]` | TA mobile rest `intervals 2` (countdown/urgency game logic), `live 0`; 3 guesses → `created 17 / starts 17 / stops 17 / live 0`. |
| A7 | `hl:audio:v1` with `music:true` (legacy) | `[Pass]` | Seeded `{v:1,sfx:true,music:true,ticks:"auto",muted:false}` then reload: SFX on, label "Sound on", `aria-pressed "false"`, `data-audio-sfx "on"`, storage **not rewritten**, no console error. A later explicit write drops the unknown `music` key (normalisation, not a reset). |
| A8 | Popover = SFX + Interface ticks only; one-click master; `isAudioMuted = muted \|\| !sfx` | `[Pass]` | Rows render `SFX`, `Interface ticks`. Master mute: label "Sound off", `muted:true`, **silent (0 oscillators)**. Master unmute: label "Sound on", **`audio-on` cue (1 oscillator, stopped)**. |
| A9 | Modal cues | `[Pass]` (open/close) | High Scores open → `data-modal "open"`, +3 oscillators (`modal-in`); close → `data-modal null`, +2 (`modal-out`). |
| A10 | Full per-cue SFX sweep (ladders t1–t4, wrong thud isolated, `+3s`/`-5s` isolated, urgency ticks isolated, modal tabs/filter/clear) | `[Partial]` | Cue map unchanged (source) and cues fire-and-stop within the guess flows (A5/A6), but individual rungs were not isolated per name. See Finding F-5. |
| A11 | Degraded paths (no 2D ctx / no `AudioContext`), visibility suspend/resume | `[Not tested]` | Not exercised; code paths read only. |
| A12 | Zero media network requests | `[Pass]` | `mediaReqs 0` across Home, Classic, Time Attack. |

Note (investigated, not a defect): an early first-page reading reported `1 oscillator started / 0 stopped`. Two clean isolated re-runs (domain cue and mode cue) both showed **2 created, 2 started, 2 stopped, live 0**. The singleton reading was a first-page instrumentation artifact (page had prior tint probes) and is **not reproducible**; live oscillators settle to 0.

---

## 5. Canvas tint matrix

Sampling over the atmosphere canvas (`getImageData`), classifying "cyan-ish" as `G > R+25 && G > 120 && B > 150`.

| # | Check | Status | Evidence |
|---|---|---|---|
| T1 | Fresh `/`, normal motion → Classic purple, no cyan | `[Pass]` | `data-mode "classic"`; **cyanCount 0**, purpleCount 3779/3780; center `[94,85,198]` (B highest, R>G ⇒ `#6355cb` family); avg `{59,51,125}`. |
| T2 | No blue flash on earliest frame | `[Partial]` | Tint fix is source-verified (preset read before `engine.start()`; base tint has no cyan path). After-load samples contain no cyan, but first-paint timing was not pixel-isolated ⇒ `[Partial]` per instructions. |
| T3 | Select Time Attack → magenta tint | `[Pass]` | `data-mode "time-attack"`, `checked "time-attack"`; **cyanCount 0**, magentaCount 1823; center `[217,57,198]` ≈ `#d93fd0`. |
| T4 | Domain/category switching → no blue fallback | `[Pass]` | `mode` emit covers every state change; `data-mode` stable; no cyan at any sampled point. (Forced `time-attack→classic` reset branch not exercised — F-5.) |
| T5 | Reduced motion → correct preselected tint, static frame | `[Pass]` | `prefers-reduced-motion: reduce`, 390×844: `data-mode "classic"`, cyanCount 0, purple 1763, `document.getAnimations() 0`. |
| T6 | Hero cyan type accents present, not the canvas tint | `[Pass]` | Hero `"or"` span `text-shadow: rgb(34,211,238) 6px 6px 0` (`#22d3ee`); `"higher"` magenta, `"lower?"` purple. DOM type accent only; canvas cyanCount 0. `textShadowCyanElements 1`. |

---

## 6. Preserve-item matrix

| Item | Status | Evidence |
|---|---|---|
| **F2** card offset-shadow harmonization | `[Pass]` | `.game-card-face` box-shadow `0 calc(9px*--card-light) 0`: rest `light 1` → `0 9px 0 #6355cb` (byte-identical to current); `revealing` `.8` → `0 7.21736px`; `game-over` `.75` → `0 6.75336px` (real game-over: `… / 0.75 0px 6.75px`). `.game-card-plate` background alpha tracks (rest `#6355cb`, `.8019`, `.7504`). Only `background-color`+`box-shadow` transition. Playthrough CLS **0.00053** (< 0.01) — no layout shift. Rest bytes preserved. |
| **F3** mobile popover | `[Partial]` | **Home 390** `[Pass]`: panel `left 8 → right 248`, in-viewport, both rows hit-test (sfx→button, ticks→span-in-row); old `x=−11` gone. **Home 1440** `[Pass]`: `999 → 1239`. **Gameplay 390** `[Partial]`: panel `87 → 327`, **unclipped and inside viewport**, but opens at `top 16` (vs Home `72`) and **overlaps the header status region (0–90)**; `elementFromPoint` over both rows returns the status `<p>`/`<section>`, so rows are **not pointer-hit-testable** through the overlap. Keyboard fully operable: ArrowDown opens (focus `sfx`), Enter toggles (`sfx true→false`, persisted), ArrowDown→`ticks`, Enter toggles (`ticks auto→false`). Escape closes and returns focus to the button. Audio control 44×44. See Findings F-4. |
| **F4** Higher/Lower hover glow | `[Pass]` | Fine-pointer hover over Higher (1440, 120 px radius): local canvas alpha `500770 → 547956`; color shifts toward cyan (`g 64.4→68.1`, `b 152.8→155.4`, `r ↓`). **0 oscillators created** ⇒ SFX parity intact. Coarse-pointer gating is source-verified (`if (!finePointer.matches) return`). |
| **F6** first-gesture SFX | `[Pass]` | See A3 (2 oscillators, context `running`, live 0). |
| **F7** stale phase on back-nav | `[Pass]` | Classic → game-over → click `#btn-back-to-menu` (`<a>` "Back to setup"): URL `/`, `data-phase`/`data-tier`/`data-guess` all `null`, `data-surface "home"`, `data-mode "classic"`, canvas P2 `[94,85,198]` — **identical to fresh-load sample**. |
| **F9** `data-tier` reset on Play again | `[Pass]` | After `#btn-play-again`: `data-phase "playing"`, `data-tier null`, `data-guess "idle"`, restart cue fired (`live 0`). |
| **F1 / F8** | Closed as moot | The music channel and `setExplicitMusic` no longer exist (source). |

---

## 7. Geometry and regression matrix

| # | Check | Status | Evidence |
|---|---|---|---|
| G1 | Home 1440×900 | `[Pass]` | `docH 2242`, `docW 1435`. |
| G2 | Home 390×844 | `[Pass]` | `docH 2489`, `docW 385`. |
| G3 | Audio control | `[Pass]` | 44×44 on Home (1440 & 390) and Gameplay (390). |
| G4 | CLS | `[Pass]` | Buffered layout-shift sum **0.00053** across a full Classic playthrough (incl. F2 shadow changes). |
| G5 | Classic mobile 390 docH + decision controls | `[Pass]` (content-dependent) | Three fresh loads: **1252** (Higher 1100 / Lower 1166), then **1272** (Higher 1120 / Lower 1186), then **1272**. The recorded `1252 / 1100 / 1166` invariant is reproducible; `1272` is a **uniform +20** on the same run. Controls track content height; they do not move independently. See Finding F-3. |
| G6 | Hiding the audio control | `[Pass]` | `docH` unchanged (`1120 → 1120`) — no reflow from the audio control. |
| G7 | Time Attack mobile 390 | `[Partial]` | Header h **138** (invariant ✓); back link 44×44 at top 22; `data-mode "time-attack"`; `docH 1300` (the "954" reference figure is not reproduced — see F-8). |
| G8 | Header heights | `[Pass]` | Classic **90**, Time Attack **138** (matches invariant). |
| G9 | Tier ladder, reveal-time tally, `<ViewTransition>`, reduced-motion crossfades, Home ambient loops, game-over `animation-name: none`, timer cadence | `[Not tested]` / `[Partial]` | These are regression items outside the postfix2 audio/tint/preserve scope; not individually asserted this pass. Reduced-motion `getAnimations() 0` observed (T5). Not claimed as verified. |

---

## 8. Console / network health

| Check | Status | Evidence |
|---|---|---|
| Normal-motion Home + Classic + Time Attack + popover + game-over + back-nav | `[Pass]` | **0 page errors, 0 app-originated warnings.** Only warning was this pass's own `getImageData` probe (`willReadFrequently`). |
| Reduced-motion fresh load | `[Partial]` | One **hydration attribute-mismatch** error reproduces under reduced motion only (normal reload added 0 new errors). Pre-existing F4 item; not introduced by the tint fix. See Finding F-6. |
| Media network requests | `[Pass]` | 0. |

---

## 9. Findings

### F-1 — Stale `soundMap.ts` "0.10 auto-start music level" comment
- **Expected:** postfix2 removes BGM; no functional music reference; comment acknowledged as a follow-up.
- **Observed:** [`lib/audio/soundMap.ts:10-11`](../lib/audio/soundMap.ts:10) still reads "…nothing can startle a user at the 0.10 auto-start music level." Comment-only; no code path.
- **Evidence:** source line; zero functional BGM identifiers (S3).
- **Classification:** **documentation/spec gap** (stale comment), explicitly excluded from the allowlist by the plan/owner decision.
- **Severity:** Trivial. No runtime effect.
- **Disposition:** Optional reword when `soundMap.ts` is next in scope. No fix applied (QA must not edit).

### F-2 — Residual "music" strings are non-BGM (no functional residue)
- **Expected:** the task asked to report/classify any residual `music` reference.
- **Observed:** zero functional BGM references. Remaining `music` strings are: the `MusicBrainz` provider/adapters, the `music` **semantic domain** label in `semanticCatalog.ts`, `settings.ts:9` (intentional legacy-key backward-compat note), and F-1's stale comment. Runtime `data-audio-music` is `null`.
- **Classification:** **not a defect** (correctly-scoped references).
- **Severity:** none.

### F-3 — Classic mobile geometry: 1272 vs 1252 is deck/content-dependent, not a regression
- **Expected (owner invariant):** Classic mobile `docH 1252`, Higher `1100`, Lower `1166`.
- **Observed:** across three fresh loads: `1252 / 1100 / 1166` (reproducible) then `1272 / 1120 / 1186` twice. The `+20` is uniform and shifts both controls together with content height; the audio control's presence/absence changes nothing (G6). Postfix2 touched only paint props on the card and the audio control's own box.
- **Classification:** confirmed as **content/deck-dependent layout variance**, not a postfix2 regression (matches the handoff's caveat).
- **Severity:** informational. No fix required; if an exact docH is ever required, it must be pinned to a specific deck.

### F-4 — Gameplay mobile popover overlaps status text (pointer rows occluded)
- **Expected:** "fixed mobile audio popover placement" / "unclipped"; rows operable.
- **Observed:** Gameplay 390 panel `left 87 → right 327` (unclipped, in-viewport) but opens `top 16` (vs Home `72`), overlapping the header status region (0–90). `elementFromPoint` at both row centers returns the status `<p>` "Higher or Lower" / `<section>` → rows are not pointer-hit-testable there. Keyboard remains fully operable (ArrowDown/Enter persists SFX and ticks), Escape returns focus.
- **Classification:** **pre-existing layout interaction / product decision** (the popover's only entry path is keyboard; a pointer click on the control is one-click mute by design). Note: `#btn-back-to-menu` shows the header back is an `<a>`, so the earlier locator mismatch was a selector/tag issue, not a missing control.
- **Severity:** Low–Medium (visual overlap; keyboard works; horizontal clipping fixed). Identical to the handoff's open item #2 (`Needs Verification [product-decision]`). Fixing would require changing `GameplayShell`/the panel's vertical strategy — outside the postfix2 allowlist.

### F-5 — Untested SFX / branches
- **Expected:** full per-cue runtime coverage where feasible.
- **Observed / `[Not tested]`:** individual `tier-1..4` rungs, isolated wrong thud, isolated `+3s`/`-5s`, isolated urgency ticks, modal tabs/filter/clear, keyboard Higher/Lower parity isolation, the forced `time-attack→classic` category reset branch, degraded paths (no 2D/AudioContext), visibility suspend/resume, iOS Ring/Silent, non-Chromium engines, DPR 2×/3×.
- **Classification:** **verification gap** (cue map unchanged at source; cues fire-and-stop in flows).
- **Severity:** Low.

### F-6 — Reduced-motion hydration attribute mismatch (pre-existing)
- **Expected:** no hydration mismatch introduced by the tint fix.
- **Observed:** one React hydration attribute-mismatch error reproduces on a reduced-motion fresh load; a normal-motion reload adds none. The component stack is the generic Next root boundaries. The tint fix does not render SSR markup, so it cannot produce this; it aligns with the handoff's pre-existing F4 item.
- **Classification:** **pre-existing spec/known item**, owner-scoped out.
- **Severity:** Low (development warning; React recovers).
- **Disposition:** `Needs Verification [product-decision]`; not introduced by postfix2.

### F-7 — Handoff V2 lint claim overstated
- **Expected (handoff V2):** lint emits "no errors or warnings."
- **Observed:** `npm run lint` exits 0 with **0 errors, 95 warnings** (vendor `.agents/skills/**` + pre-existing `worldbank.ts`/`availability.ts`).
- **Classification:** **handoff documentation accuracy gap** (not a code defect; warnings predate postfix2 and are out of app scope).
- **Severity:** Trivial.

### F-8 — Time Attack mobile docH (1300) vs "954" reference
- **Expected:** "Time Attack mobile 954."
- **Observed:** mobile 390 Time Attack `docH 1300`; header 138 measured correctly.
- **Classification:** **spec ambiguity** — consistent with the handoff's open item #1 (owner-quoted heights not reproduced; likely a different viewport/deck). Not a postfix2 regression.
- **Severity:** Low. `Needs Verification [product-decision]`.

---

## 10. Overall verdict

**PASS with cautions.** The postfix2 handoff's substantive claims are independently reproduced:

- **BGM/passive audio fully removed** — `lib/audio/bgm.ts` absent; 0 functional BGM identifiers; **0 `AudioContext`/oscillators/`setInterval` at rest** on Home and Gameplay; first gesture unlocks and plays its own SFX (2 oscillators, context `running`, live 0); the only `setInterval` left is the Time Attack countdown.
- **`hl:audio:v1` backward compatible** — legacy `music:true` ignored, no throw, no reset.
- **Tint fix correct** — fresh Home is Classic purple (`data-mode "classic"`, **0 cyan samples**), Time Attack is magenta (`#d93fd0`), reduced motion is the correct static preselected tint; hero cyan is a DOM text-shadow, distinct from the canvas.
- **Preserve items** — F2 (harmonized card, rest bytes preserved, CLS ~0.0005), F4 (hover glow toward cyan, 0 oscillators), F6 (first-gesture SFX), F7 (back-nav clears phase/tier/guess; canvas returns to fresh sample), F9 (Play-again clears tier) all `[Pass]`. F3 is `[Pass]` on Home (both viewports) and horizontally fixed + keyboard-operable on Gameplay, with a **pre-existing vertical overlap** that is a product decision, not a postfix2 regression.
- **No new dependency or media asset**; `tsc` clean; lint 0 errors; console clean on normal motion.

**Another postfix is not required for correctness.** The remaining items are pre-existing/out-of-scope product decisions (F-4 gameplay popover vertical placement, F-6 reduced-motion hydration) and verification gaps (F-5), plus two trivial documentation items (F-1 stale comment, F-7 lint wording) and two spec-ambiguity notes (F-3 content-dependent 1272, F-8 TA height figure).

---

## 11. Open items / `Needs Verification`

1. **Gameplay popover vertical overlap** (F-4) — `Needs Verification [product-decision]`. Horizontal clip fixed; keyboard operable; pointer rows occluded where the panel overlaps the status text. Fixing requires `GameplayShell`/panel vertical strategy changes outside the allowlist.
2. **Reduced-motion hydration mismatch** (F-6) — pre-existing F4 item, `Needs Verification [product-decision]`, owner-scoped out.
3. **`soundMap.ts:10-11` stale comment** (F-1) — reword when next in scope (comment-only).
4. **Full per-cue SFX sweep** (F-5) — ladder rungs, isolated thud/deltas/urgency, modal tabs/filter/clear, keyboard parity isolation: `[Not tested]`.
5. **`html[data-modal="open"]` × card** — the rule ships but has no reachable combined state today (modal lives on Home, no card). `[Not tested]`.
6. **Owner-quoted geometry figures** (F-3 1272 vs 1252; F-8 TA 954 vs 1300) — content/viewport-dependent; `Needs Verification [product-decision]`.
7. **Degraded paths & platform matrix** (no 2D ctx / no `AudioContext`, visibility suspend/resume, iOS Ring/Silent, non-Chromium, DPR 2×/3×) — `[Not tested]` / `[capability-unavailable]`.
8. **`npm run build`** — `[Blocked]` (owner's live `next dev` holds `.next`).
9. **Perceptual acceptance** — not assessed (no human reviewer); `Needs Verification [product-decision]`.

---

## 12. Screenshots

`docs/assets/procedural-canvas-audio/postfix2/qa/`
- `home-desktop-1440.png`
- `home-mobile-390-popover.png`
- `classic-mobile-390.png`
- `gameplay-mobile-390-popover.png` (illustrates F-4 overlap)

*Note: only the 4 screenshots above were captured this pass; prior-handoff screenshot names are not reproduced here.*
