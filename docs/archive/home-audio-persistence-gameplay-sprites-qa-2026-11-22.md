# Home Audio Control · Gameplay Audio Mount · Home Setup Persistence · Gameplay Sprite Visibility — Independent QA

**Stage:** QA only. **No application code, component, library, type, config, manifest or existing document was modified by this pass.**
**Date:** 2026-11-22
**Branch:** `lj-branch`, HEAD `ea650b7` (`refactor(twitch): retire orphaned followers snapshot and generator`) — verified with `git rev-parse --short HEAD`.
**Claims under test:** [`home-audio-persistence-gameplay-sprites-handoff-2026-11-22.md`](./home-audio-persistence-gameplay-sprites-handoff-2026-11-22.md) (treated as claims, not proof) against [`home-audio-persistence-gameplay-sprites-analysis-plan-2026-11-22.md`](./home-audio-persistence-gameplay-sprites-analysis-plan-2026-11-22.md) (approval source).
**Runtime:** the owner's existing `next dev` on `http://localhost:3000` (PID 17272) — reused only, never stopped, restarted or rebuilt. Playwright MCP (Chromium), `devicePixelRatio = 1`, viewports **1440×900** and **390×844**.
**Repository writes made by this stage:** this document, screenshots and console dumps under `docs/assets/ui-postfix/qa/`. A temporary lint log created during the run was deleted.

---

## 1. Allowlist result — `[Pass]`, with a stated limitation

`git diff` cannot isolate this postfix. The entire canvas/audio/motion feature set is uncommitted by design (HEAD is unchanged since before the analysis stage), so a single `git status` reflects four tasks of work. Provenance was therefore established three independent ways.

| # | Evidence | Result |
|---|---|---|
| A1 | `git status --porcelain` | **18** tracked modifications, **12** untracked entries, **nothing staged** (`git diff --cached --name-only` empty) |
| A2 | Comparison with the pre-task baseline recorded in [analysis §1](./home-audio-persistence-gameplay-sprites-analysis-plan-2026-11-22.md) | The 18 tracked modified files are **the same 18** listed there, file for file. The untracked set differs by **exactly one entry**: `lib/home/` (new). The aggregate tracked diff moved from `18 files, +1338 / −90` (analysis baseline) to `18 files, +1388 / −91`, i.e. this postfix contributed **+50 / −1** across the three tracked allowlist files (`app/globals.css`, `components/home/HomeSetup.tsx`, `components/game/GameplayShell.tsx`); the other three allowlist files are untracked and therefore invisible to `git diff`. |
| A3 | `find . -newermt '2026-11-22 23:50'` (excluding `node_modules`, `.next`, `.git`, `.playwright-mcp`) | Only the six allowlist files, this task's docs/screenshots, and `tsconfig.tsbuildinfo` (a `tsc` artifact; git-ignored) |
| A4 | mtimes of frozen neighbours | `ClassicGame` 21:42, `TimeAttackGame` 21:42, `GameCard` 20:37, `ComparisonBoard` 18:36, `DecisionControls` 21:41, `GameplayStatus` 18:36, `GameplayEntrance` 21:42, `LaunchDock` 22:04, `CategorySelector` 18:38, `DomainSelector` 18:38, `ModeButton` 18:38, `CategoryCard` 18:38, `HighScoresModal` 22:32, `AtmosphereBackdrop` 20:37, `lib/audio/settings` 20:36, `app/layout` 19:57, `app/page` 18:38 — **all ≤ 22:32**, i.e. all before the postfix window |
| A5 | Manifest/config diff | `git diff --stat -- package.json package-lock.json next.config.ts eslint.config.mjs postcss.config.mjs tsconfig.json components.json` → **empty** |
| A6 | Dependency inventory | `class-variance-authority, cn, lucide-react, motion, next, radix-ui, react, react-dom` + the same seven dev dependencies. **No new dependency.** |

**Allowlist as written in the plan, confirmed present and changed in the postfix window (23:56–23:58):**

| File | mtime (2026-11-22) |
|---|---|
| [`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx) | 23:56:29 |
| [`lib/home/selection.ts`](../lib/home/selection.ts) **(new)** | 23:56:51 |
| [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx) | 23:56:43 |
| [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts) | 23:57:12 |
| [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx) | 23:58:05 |
| [`app/globals.css`](../app/globals.css) | 23:56:37 |

**No file outside the allowlist shows a postfix-window mtime, and no tracked file was added to or removed from the modified set.** Pre-existing uncommitted work is intact: nothing was reverted, reformatted or absorbed.

**Limitation (`Needs Verification [inferred-from-codebase]`):** because the six allowlist files were already untracked or already modified before this task, A2–A4 establish that *only* they changed in the postfix window; they cannot prove which individual hunks inside them belong to this task. Every check below therefore verifies the shipped behaviour, not a diff.

---

## 2. Static verification

| # | Check | Result | Evidence |
|---|---|---|---|
| S1 | `app/layout.tsx` still mounts the headless `AudioSurface` | `[Pass]` | `<AudioSurface />` at [`app/layout.tsx:42`](../app/layout.tsx:42); the instance receives no `variant` |
| S2 | `GameplayShell` no longer imports or mounts an audio control | `[Pass]` | No `AudioSurface` import; the status cluster renders `{status}` only ([`GameplayShell.tsx:74-76`](../components/game/GameplayShell.tsx:74)). `gap-2 sm:gap-4` retained (inert with one child) |
| S3 | Engine/unlock/`data-*` wiring precedes the `null` return | `[Pass]` | Effects at [`AudioSurface.tsx:120`](../components/audio/AudioSurface.tsx:120), [`:122-136`](../components/audio/AudioSurface.tsx:122), [`:139-143`](../components/audio/AudioSurface.tsx:139); `if (!variant) return null` at [`:295`](../components/audio/AudioSurface.tsx:295) |
| S4 | `variant` union narrowed to `"home"` | `[Pass]` | [`AudioSurface.tsx:54-57`](../components/audio/AudioSurface.tsx:54) |
| S5 | Gain tokens as shipped (3 / 2 / 1 / 1) | `[Pass]` | `--atmo-sprite-gain: 1`, `--atmo-sprite-gain-gameplay: 3`, `--atmo-chevron-gain: 1`, `--atmo-chevron-gain-gameplay: 2` at [`globals.css:822-825`](../app/globals.css:822) |
| S6 | Spark gain clamped **before** `fieldAlpha` | `[Pass]` | `Math.min(0.85, mote.alpha * breathe * tuning.spriteGain) * fieldAlpha` at [`canvasEngine.ts:734`](../lib/atmosphere/canvasEngine.ts:734) |
| S7 | Reactive surge not multiplied by the gain | `[Pass]` | `idle` is cleared in every reactive branch ([`canvasEngine.ts:789-813`](../lib/atmosphere/canvasEngine.ts:789)); the multiply is guarded by `if (idle)` at [`:824`](../lib/atmosphere/canvasEngine.ts:824). `SURGE_ALPHA_PEAK` still `0.88`, `WRONG_ALPHA` still `0.1` ([`:57`](../lib/atmosphere/canvasEngine.ts:57), [`:64`](../lib/atmosphere/canvasEngine.ts:64)) |
| S8 | Surface-dependent token resolved on the initial bake | `[Pass]` | `let surface: SurfaceId = "home"` at [`canvasEngine.ts:235`](../lib/atmosphere/canvasEngine.ts:235) precedes `tuning = readTuning()` at [`:240`](../lib/atmosphere/canvasEngine.ts:240); token choice at [`:339-346`](../lib/atmosphere/canvasEngine.ts:339) |
| S9 | `hl:setup:v1` schema + validation | `[Pass]` | Key and `HomeSelection { v, domainId, categoryId, mode }` at [`selection.ts:26-33`](../lib/home/selection.ts:26); `isStoredSelection` rejects wrong version/shape/non-playable mode ([`:45-56`](../lib/home/selection.ts:45)); `resolveHomeSelection` checks domain → playable category → `compatibleModes` ([`:94-115`](../lib/home/selection.ts:94)) |
| S10 | SSR-safe read/write path | `[Pass]` | `typeof window` guards + `try/catch` on both read and write ([`selection.ts:59-86`](../lib/home/selection.ts:59)); the read happens only inside a passive effect, never during render |
| S11 | Restore/persist effect ordering | `[Pass]` | Restore effect then `setSelectionRestored(true)` ([`HomeSetup.tsx:165-173`](../components/home/HomeSetup.tsx:165)); persist effect returns early while `selectionRestored === false` ([`:178-186`](../components/home/HomeSetup.tsx:178)); the three `useState` initialisers are untouched defaults ([`:76-89`](../components/home/HomeSetup.tsx:76)) |
| S12 | Scoped `eslint-disable` deviation inspected | `[Pass]` | The disable is scoped to one effect: `/* eslint-disable react-hooks/set-state-in-effect */` at [`HomeSetup.tsx:164`](../components/home/HomeSetup.tsx:164), re-enabled at [`:174`](../components/home/HomeSetup.tsx:174), with a stated reason at [`:159-163`](../components/home/HomeSetup.tsx:159). A disable-comment precedent exists at [`GameCard.tsx:91`](../components/game/GameCard.tsx:91). `npm run lint` reports **0 errors**, so the rule is genuinely satisfied under the documented exception and nothing else is suppressed |
| S13 | `npx tsc --noEmit` | `[Pass]` | Exit code **0**, run independently in this pass |
| S14 | `npm run lint` | `[Pass]` | **0 errors / 95 warnings** — identical to the recorded baseline; `findstr` over the lint log for `HomeSetup`, `AudioSurface`, `GameplayShell`, `canvasEngine`, `globals.css`, `selection.ts` returned **no lines**, i.e. no warning sits in a changed file |
| S15 | `npm run build` | `[Blocked]` | Not run — the owner's `next dev` owns `.next` and port 3000 |
| S16 | Legacy CSS preserved | `[Pass]` with note | `git diff -U0 -- app/globals.css` removes **9** lines in total, all belonging to the previously-approved removal of the dead `.high-scores-dialog.motion-reduce` block (F8) and the four `home-dialog-in/out` animation declarations it duplicated; **798** lines added. No audio-surface or token line is removed relative to HEAD, because that whole block is new relative to HEAD. The postfix's own CSS is additive (four tokens, the transition list, the `sfx-off`-only colour rule) |

---

## 3. Runtime verification matrix

Environment: Chromium, DPR 1, 1440×900 and 390×844, 2026-11-22, owner's dev server.

### 3.1 Home audio control (icon-only ghost button)

| # | Check | Result | Measured |
|---|---|---|---|
| R1 | Computed chrome at rest | `[Pass]` | `border: 1px solid rgba(0,0,0,0)`, `background: rgba(0,0,0,0)`, `box-shadow: none`, `border-radius: 0px`, `cursor: pointer`, `color: rgb(212,206,255)`, 44×44 |
| R2 | Parity with `View High Scores` | `[Pass]` | Peer computed **identical** (`border 1px solid rgba(0,0,0,0)`, transparent, no shadow, radius 0, `cursor: pointer`, same colour); header children `audio x 1195.2 w 44` → `scores x 1247.2 w 131.8`, `gap: 8px`, header `183.8×44` at `1195.2,20` (1440) and `185.2,20` (390) |
| R3 | Hover | `[Pass]` | `background: oklab(0.9999… / 0.1)` (= `rgba(255,255,255,0.1)`), `color: rgb(255,255,255)`; the peer control measured the same values in the same probe. Compiled utilities present: `.hover\:bg-white\/10:hover{background-color:rgba(255,255,255,.1)}`, `.active\:bg-white\/15:active{…,.15}`, `.focus-visible\:border-white:focus-visible{border-color:var(--color-white)}` |
| R4 | Active | `[Pass]` | Mouse held down: `el.matches(':active') = true`, `background oklab(… / 0.15)`, colour white |
| R5 | Focus-visible | `[Pass]` | `outline: 3px solid rgb(34,211,238)`, `outline-offset: 4px`, `:focus-visible` matches; reached by keyboard Tab (9th stop, DOM order after the page content) |
| R6 | Labels / state / ARIA | `[Pass]` | `aria-label` flips "Sound on — mute all audio" ↔ "Sound off — unmute all audio"; `aria-pressed` `false` → `true`; `aria-expanded` `false` → `true` with `aria-controls` matching the panel id; `aria-disabled="false"`; `data-audio-sfx` `on` → `off`; muted colour `rgb(170,163,213)` |
| R7 | Popover | `[Pass]` | 240×108, `position: fixed`, `z-index: 50`, at `999,72` (1440) and `8,72` (390), fully inside the viewport at both; 2 rows, each `min-height: 44px`; focus moves to the `sfx` row; `aria-expanded` true; Escape closes, returns focus to the control and restores `aria-expanded` |
| R8 | Keyboard model / storage | `[Pass]` | ArrowDown opens; **Enter** toggles the row and rewrites `hl:audio:v1` (`sfx:true→false→true`, `muted:false` throughout); settings restored to `on` at the end of the pass |
| R9 | CLS | `[Pass]` | `layout-shift` observer (buffered, `hadRecentInput` excluded): **0.0000** after load, **0.0000** with the popover open, **0.0000** at the end (baseline 0.0022); audio rect identical before/after (`1195.2,20,44×44`) |
| R10 | Overflow | `[Pass]` | `scrollWidth === clientWidth` (1435/1435 at 1440; **385/385** at 390) |

### 3.2 Gameplay audio removal + direct-load SFX

| # | Check | Result | Measured |
|---|---|---|---|
| R11 | Zero audio controls on gameplay | `[Pass]` | `[data-audio-control]` = **0** and `.audio-surface` = **0** on `/game/classic?category=movie-series-rating` and `/game/time-attack?category=player-count`, at **both** viewports. Home still has exactly **1** |
| R12 | Header / status geometry | `[Pass]` | 1440 classic: cluster `x 1294.7, w 116.3, right 1411`, header **90**; 390 classic: cluster `263.8 / 105.2 / right 369`, header **90**, back control 44×44 at `x 16`; 1440 time-attack: `40.2` wide, header **138**; 390 time-attack: `335 / 34 / right 369`, header **138**. `scrollWidth === clientWidth` in every state. Widths match the approved `116.3` / `105.2` / `34` exactly (see F4 for the 5 px right-edge offset) |
| R13 | Direct-load first-gesture SFX | `[Pass]` | `AudioContext` subclassed via `addInitScript` **before** navigation. At rest on a fresh `/game/classic?category=movie-series-rating`: `ctxCreated 0`, `oscCreated 0`, `data-audio-state="armed"`, `data-audio-sfx="on"`, **0** visible controls. First `Higher` click: `ctxCreated 1`, states `["running","change:running"]`, `resumeCalls 1`, `oscCreated 3` / `started 3` / `stopped 3`, frequencies `[300, 880, 262]`, `data-audio-state="running"`, `data-guess="higher"` |
| R14 | Cross-mode parity | `[Pass]` | Same zero-control result on Time Attack at both viewports; the mode carry (`data-gameplay-mode`) and timer header row are intact |

### 3.3 Persistence

| # | Check | Result | Measured |
|---|---|---|---|
| R15 | Round trip (Gaming → Peak Concurrent Players → Time Attack) | `[Pass]` | After the three selections: `data-mode="time-attack"`, radios checked `Gaming / Peak Concurrent Players / Time Attack`, canvas sample `rgba(221,59,211,52)` (magenta family), storage `{"v":1,"domainId":"gaming","categoryId":"player-count","mode":"time-attack"}`, `.home-go` enabled |
| R16 | Launch | `[Pass]` | `go!` → `/game/time-attack?category=player-count`, `data-gameplay-mode="time-attack"`, `data-surface="gameplay"`, 0 audio controls, storage unchanged |
| R17 | Restore after Back | `[Pass]` | `Back to game setup` → `/` with the **same three radios checked**, `data-mode="time-attack"`, storage unchanged, and canvas samples **identical to pre-launch**: `700,450 rgba(221,59,211,52)` and `110,400 rgba(70,19,79,55)` |
| R18 | Unknown ids + `mode:"pvp"` | `[Pass]` | Defaults (`movies-series / movie-series-rating / classic`), key **rewritten to defaults**, no console error |
| R19 | Malformed JSON (`{not json`) | `[Pass]` | Defaults, key rewritten, no error thrown |
| R20 | `v: 2` | `[Pass]` | Defaults, key rewritten |
| R21 | Cross-domain (`gaming` + `movie-series-rating`) | `[Pass]` | Defaults, key rewritten |
| R22 | Valid triple honoured | `[Pass]` | `gaming / player-count / time-attack` restored as stored, `data-mode="time-attack"` |
| R23 | Absent key | `[Pass]` | Defaults, key re-created with the defaults |
| R24 | Hydration / console | `[Pass]` | Session total **184 messages, 0 errors, 27 warnings** — every warning is either this pass's own `getImageData` readback advisory or Motion's reduced-motion notice from a deliberate `emulateMedia` run. **No hydration warning, no React error, no page error** |

### 3.4 Sprite gain, reactive window, and per-frame cost

Draw calls were classified by destination size: sparks are square `8×8` / `14×14`, chevrons are `20×26`, and the full-screen `1435×900` wash blit is recorded separately ([`sprites.ts:21-24`](../lib/atmosphere/sprites.ts:21)). `ctx.globalAlpha` was sampled at `drawImage` time over 800 ms windows.

| # | Check | Result | Measured |
|---|---|---|---|
| R25 | Spark gain ≈3× | `[Pass]` | Home idle `14×14` max **0.2320**, `8×8` max **0.1336**; gameplay idle `14×14` max **0.6979**, `8×8` max **0.4013** → ratios **3.008×** and **3.003×** |
| R26 | Idle chevron gain ≈2× | `[Pass]` | `20×26` max **0.3166** (Home) → **0.6332** (gameplay) = **2.000×**; post-reveal idle returned to the same band (0.4863 mid-breath) |
| R27 | Clamp not engaged / applied before `fieldAlpha` | `[Pass]` | Highest spark alpha observed anywhere **0.7476** < the 0.85 clamp; the clamp sits inside the `fieldAlpha` multiply in source |
| R28 | Correct-reveal surge | `[Pass]` | Peak chevron **0.8738** at t≈123 ms, decaying 0.8295 → 0.7226 → 0.6161 → 0.5003 → 0.3936, then back to idle **0.6332**. Above idle, **≤ 1.0**, and ≈`SURGE_ALPHA_PEAK` (0.88) — a 2× multiplier would have produced 1.0 |
| R29 | Wrong-reveal recession untouched by the gain | `[Pass]` | Same session, an incorrect guess produced chevron max **0.1000** — exactly `WRONG_ALPHA`, not `0.2`. Direct runtime proof the reactive window bypasses `chevronGain` |
| R30 | Composited gameplay visibility | `[Pass]` (see F2) | Canvas-on vs canvas-off, 1440×900: left gutter `0–120 × 240–660` mean **3.72**, max **21.2**, 99.9 % of pixels changed; centre gap mean 4.30 / max 13.2; below cards mean 6.33 / max 11.0; header band mean 1.19 / max 6.9. Motion floor over 140 ms: **0.00 / 0.0 / 0 %** in every region |
| R31 | Card cover art | `[Pass]` | Inside the two `article img` rects: canvas contribution **0.1 %** of pixels changed, max Δ **5.6 / 5.7**, motion floor 0 — the residual is the pre-existing constant tint wash through the translucent card plate, not a sprite-driven change. `GameCard.tsx` is untouched (mtime 20:37) |
| R32 | AA on real text/controls (composited backdrop, text set transparent, luminance sampled from the rendered PNG) | `[Pass]` | Header title **17.86** (p05 18.05 / p95 17.71), subtitle **11.96** (11.86 worst), card title **16.50** (16.32), Higher control **10.07** (9.98), Lower control **5.01** (worst **4.82**). Every pair ≥ 4.5:1; the tightest is the untouched magenta Lower face. Header background is opaque `rgb(21,18,43)` with no background image, so canvas sprites cannot reach the header text |
| R33 | One canvas / one rAF / no per-frame cost | `[Pass]` | `canvasCount 1`; Home **201 rAF : 201 `clearRect`** in 1 s, gameplay **202 : 202**; `shadowBlur` sets **0**, `filter` sets **0** in idle and during a reveal; `createRadialGradient` stayed at **45** across both windows (bake-time only, **0** added per frame) |
| R34 | Reduced motion | `[Pass]` | With `reducedMotion: 'reduce'`: two composited frames 700 ms apart → mean **0.00**, max **0**, **0 %** changed; the boosted field is present in the single static frame. (Buffer-level nuance in F3.) |

### 3.5 Other invariants

| # | Check | Result | Measured |
|---|---|---|---|
| R35 | SFX only, no BGM | `[Pass]` | Source: `lib/audio` has cue synthesis only — `createBuffer`/`createBufferSource` for one-shot cues, no loop, no music path; `settings.ts` explicitly rejects the legacy `music` key. Runtime: the first gesture created 3 oscillators and **stopped all 3**; nothing sustained |
| R36 | Gameplay rules / timings | `[Pass]` | Classic: correct → score 1, `phase: revealing`, decision buttons disabled during the reveal; wrong → `INCORRECT` and `phase: game-over`. Time Attack: header 138 px with its timer row, `RACE THE CLOCK`, 60 s start. No timing constant touched |
| R37 | Game-over overlay | `[Pass]` | `phase="game-over"`, `GAME OVER` rendered with the reveal explanation ("Collision Course was 6.3 / 10"), controls `Back to game setup`, `Play again`, `Back to setup`; 390: `scrollWidth === clientWidth` (385/385) |
| R38 | LaunchDock + `inert` | `[Pass]` | Closed: `data-open="false"`, `data-keyboard="closed"`, `aria-hidden="true"`, `inert` present, `opacity 0`, `visibility: hidden`, `pointer-events: none`. Scrolled open: `data-open="true"`, no `inert`, `pointer-events: auto`, button enabled with label `Go! Start Movie/Series Rating on Classic`. Matches [`LaunchDock.tsx:38-56`](../components/home/LaunchDock.tsx:38) |
| R39 | Mobile 390×844 geometry | `[Pass]` | Home audio `185.2,20 44×44`, scores `237.2`, header right 369, gap 8; gameplay cluster `263.8 / 105.2 / 369` (classic) and `335 / 34 / 369` (time attack); popover clamped to `x 8`; no horizontal overflow anywhere |
| R40 | Console / hydration across the session | `[Pass]` | `docs/assets/ui-postfix/qa/console-errors-session.txt`: `Total messages: 184 (Errors: 0, Warnings: 27)`; warning text triaged in §3.3 R24 |

---

## 4. Findings

| ID | Finding | Expected | Observed | Evidence | Classification | Severity |
|---|---|---|---|---|---|---|
| **F1** | Shipped class list omits the plan's `hover:text-white` | Plan §3.1 diff ends `… hover:bg-white/10 hover:text-white active:bg-white/15 …` | Shipped list at [`AudioSurface.tsx:322`](../components/audio/AudioSurface.tsx:322) has `hover:bg-white/10` then `active:bg-white/15` — no `hover:text-white` | Hover still computes `color: rgb(255,255,255)` because `.audio-surface:hover { color: var(--foreground-primary) }` ([`globals.css:876-879`](../app/globals.css:876)) supplies it | **Spec gap** (plan text vs code; behaviour identical, not user-visible) | Info |
| **F2** | Gameplay gutter peak is below the plan's projection | Plan §3.4 projected gutter max Δ 24–28 and mean ≈6.5 | max Δ **21.2**, mean **3.72** — identical to the handoff's own numbers | §3.4 R30; the draw multiply is exact (3.008× / 2.000×, R25–R26), so the shortfall is the composite, not the gain | **Spec gap** (projection attributed the gutter peak to a spark; it is a chevron) — carried as `Needs Verification [product-decision]` | Low |
| **F3** | Reduced-motion canvas buffer is not byte-identical between grabs | "0 px changed, max Δ 0" | Composited frames **are** identical (mean 0.00, max 0, 0 %); the raw buffer sum differed by **132,128 / 515,918,847 ≈ 0.026 %** across two grabs 700 ms apart, with unchanged non-zero coverage (1,296,000 px) | §3.4 R34 | **Verification gap** (visible criterion met; sub-1/255 buffer jitter unexplained) `TODO:` confirm whether any per-frame redraw persists under reduced motion | Info |
| **F4** | Gameplay status-cell right edge 5 px left of the handoff | Handoff R6: `cell right 1416` at 1440 | `right 1411`; **cell width identical** (`116.3`), and 390 matches exactly (`right 369`) | §3.2 R12; `documentElement.clientWidth` is 1435, i.e. a classic scrollbar, and the handoff's own Home figures match mine | **Verification gap** (measurement variance) `Needs Verification [environment-specific]` | Info |
| **F5** | One Playwright locator click on the gameplay back control did not navigate after a guess | Back → `/` | On that attempt the URL stayed on `/game/time-attack`; two programmatic retests (no guess, after guess) both navigated, with the hit-test showing the click point inside the anchor | §3.2; retest in the same session | **Verification gap** (harness/transition timing — screenshot followed immediately by a locator click during a view transition). Not reproducible | Info |
| **F6** | Incompatible-mode rejection not exercised with a real incompatible pair | A stored mode absent from `compatibleModes` must fall back | The pair I constructed (`gross-revenue` + `time-attack`) turned out to be **compatible** and was correctly honoured — a valid-triple pass, not a rejection test | §3.3 R18–R23 cover rejection via `pvp`, unknown ids, wrong domain, `v:2`, malformed JSON; the `compatibleModes` check itself is source-verified at [`selection.ts:108`](../lib/home/selection.ts:108) | **Verification gap** `TODO:` construct a genuinely incompatible existing category/mode pair | Info |

No finding is an implementation bug. No finding requires a code fix to the four adjustments.

---

## 5. Verdict

**PASS.** All four owner-approved adjustments are implemented inside the six-file allowlist and behave as approved at both viewports:

1. **Home audio control** — an icon-only ghost button byte-for-byte in the same component language as `View High Scores` (transparent face, no shadow, radius 0, `cursor: pointer`, identical hover/active/focus), 44×44, with the popover, labels and keyboard model intact and **CLS 0.0000**.
2. **Gameplay audio mount removed** — exactly **0** audio controls on both modes at both viewports, status geometry unchanged in width and header height, and the **first gesture of a direct load still creates a running `AudioContext` and plays its cue set**.
3. **Home setup persistence** — `hl:setup:v1` survives a full Time Attack round trip (selection, `data-mode`, magenta canvas tint and LaunchDock summary all restored identically), and every invalid/unknown/`v:2`/cross-domain/absent case degrades to the defaults and rewrites the key, with **0 hydration errors**.
4. **Gameplay sprite visibility** — sparks exactly **3.00×** and idle chevrons exactly **2.00×** at draw time, clamped before `fieldAlpha`, with the reactive surge **not** multiplied (peak 0.8738; wrong-recede exactly 0.1), one canvas, one rAF, no per-frame `shadowBlur`/`filter`/gradient, static under reduced motion, and AA ≥ 4.82:1.

**Postfix required: no.** F1 is a plan-text divergence with no behavioural effect; F2/F4/F5/F6 are spec-gap, environment, harness and coverage notes. If the owner decides the gameplay field still reads too faint (**F2**, the handoff's open `[product-decision]`), the minimal responsive scope would be a **token value only** — `--atmo-sprite-gain-gameplay` / `--atmo-chevron-gain-gameplay` in [`app/globals.css:823-825`](../app/globals.css:823) — with no code change, since the draw path already reads the token at bake time.

---

## 6. Open items / `Needs Verification`

1. **Gameplay field strength is a perception call** — `Needs Verification [product-decision]`. The multiply is exact (3.008× / 2.000×) but the composited gutter peak is 21.2 (plan projected 24–28). Perceptual acceptance was **not assessed**: no human reviewer took part in this pass.
2. **Reduced-motion buffer jitter** — `Needs Verification [capability-unavailable]` at the buffer level only; the visible criterion (0 px changed, max Δ 0) passes. `TODO:` determine whether anything redraws per frame under `prefers-reduced-motion`.
3. **5 px right-edge offset at 1440** — `Needs Verification [environment-specific]`, scrollbar-related; cell widths are identical, so layout neutrality stands.
4. **Incompatible-mode rejection** — `TODO:` exercise a genuinely incompatible stored category/mode pair (F6).
5. **`npm run build`** — `[Blocked]`: the owner's dev server owns `.next` and port 3000.
6. **Not exercised** — `[Not tested]`: DPR 2/3, Safari, Firefox, and perceptual acceptance of the icon-only control, the popover and the boosted field.
7. **Carried from the handoff, unchanged by QA** — card-art residual wash leak (measured 0.1 % of pixels, Δ ≤ 5.7), the pre-existing `impeccable detect` findings on the hero `background-clip` gradient and two bounce easings, and the declared-but-unused `--atmo-accent` / `--atmo-accent-off` tokens (PD-6).

---

## 7. Sign-off

| Item | Status |
|---|---|
| Allowlist / provenance | `[Pass]` (git cannot isolate; three independent corroborations incl. an exact match to the pre-task file inventory) |
| Static gates (`tsc`, `lint`) | `[Pass]` (0 errors; 95 warnings, none in a changed file) |
| Build | `[Blocked]` (owner's dev server) |
| Home audio control | `[Pass]` |
| Gameplay audio removal + direct-load SFX | `[Pass]` |
| Persistence + validation | `[Pass]` |
| Sprite gain / surge ceiling / per-frame cost / reduced motion | `[Pass]` (F2/F3 notes) |
| AA / geometry / console / hydration | `[Pass]` |
| Perceptual acceptance | `[Not tested]` — no human reviewer |

**Runtime verification was applicable and available**, and was performed on the owner's live dev server without restarting it. Unresolved items above are carried with their qualifiers; none of them is a defect in the four adjustments.
