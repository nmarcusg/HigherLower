# Procedural Canvas + Audio — Postfix 2: Handoff

**Date:** 2026-11-22
**Task type:** Postfix (feature reduction + visual correction + repair of unfulfilled preserve items)
**Scope authority:** [`docs/procedural-canvas-audio-postfix2-analysis-plan-2026-11-22.md`](./procedural-canvas-audio-postfix2-analysis-plan-2026-11-22.md) §6 allowlist, plus the owner's approved decisions (two-row popover, `isAudioMuted = muted || !sfx`, `data-tier` reset on Play again, keep F10 duplicate emit, keep hero cyan type accents).
**Branch:** `lj-branch`

---

## 1. Files changed

### Deleted (1)

| File | Why |
|---|---|
| `lib/audio/bgm.ts` | The entire generative BGM: pad oscillators + LFOs, pentatonic pulse scheduler, 25 ms lookahead `setInterval`, `duck/restore/pause/resume/setLevel/setScene`. |

### Modified (10)

| # | File | Change |
|---|---|---|
| 1 | [`lib/audio/audioEngine.ts`](../lib/audio/audioEngine.ts) | BGM import, `MUSIC_AUTO_LEVEL`/`MUSIC_USER_LEVEL`, `musicBus`/`bgm`/`musicTarget`/`duckFactor`/`explicitMusic`/`surface`/`mode` state, `applyMusicGain`, `musicLevelFor`, `setExplicitMusic`, `duckMusic`, `restoreMusic`, `setScene`, the `route` case, phase/modal music calls and the visibility `bgm.pause()/resume()` calls are gone. `playCue` now gates on `ctx.state` instead of the lifecycle label. |
| 2 | [`lib/audio/settings.ts`](../lib/audio/settings.ts) | `music` field, default, `sanitise` branch and equality check removed; `isAudioMuted` is `muted || !sfx`; header doc updated. Storage key and version unchanged. |
| 3 | [`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx) | Music row, `toggleMusic`, `setExplicitMusic`, pathname/`resolveScene`/`setScene` effect, `data-audio-music`, `music` in the announce payload all removed; `ROWS = 2`; unlock listeners moved to `window` **capture**; measured popover clamp. |
| 4 | [`app/globals.css`](../app/globals.css) | Appended section only: the three `data-audio-music` selectors replaced by `data-audio-sfx` rules; card plate/face lighting block appended (`--card-light`, `.game-card-plate`, `.game-card-face`, reduced-motion-safe transition). Nothing above line 794 touched. |
| 5 | [`lib/atmosphere/types.ts`](../lib/atmosphere/types.ts) | `music` dropped from the `audio` event; `mode` event added. |
| 6 | [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts) | `tintColor()` collapses to `mode === "time-attack" ? palette.timeAttack : palette.classic` (the Home `palette.higher` fallback is gone); the reduced-motion `route` branch now repaints once. |
| 7 | [`lib/atmosphere/delegation.ts`](../lib/atmosphere/delegation.ts) | `onPointerOver` also classifies `button[aria-label="Higher"|"Lower"]` and emits `pointer/hover` with target `higher`/`lower`, reusing `finePointer`, `isDisabled`, `HOVER_MIN_MS` and one `rectOf` read. |
| 8 | [`components/atmosphere/AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx) | `readPresetMode()` helper; preset read **before** `engine.start()`; `mode` event handling; Home branch resolves the preset, clears `data-phase`/`data-tier`/`data-guess` and emits `route` back to the engine; `phase: playing` after `game-over` clears `data-tier` (Play again). |
| 9 | [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx) | One passive effect emitting `{ type: "mode", mode: selectedMode, surface: "home" }` on mount and every mode/domain/category-driven change. |
| 10 | [`components/game/GameCard.tsx`](../components/game/GameCard.tsx) | Exactly two class tokens: `game-card-plate` on the backing div, `game-card-face` on the face. No structural/prop/utility change. |

**Not modified:** `lib/audio/soundMap.ts` (allowlist row 11 is excluded by the plan's own note and by the owner), `components/game/DecisionControls.tsx`, gameplay logic, `lib/game/deck.ts`, scoring, storage, providers, routes, configs, manifests. The stale "0.10 auto-start music level" wording in `soundMap.ts:10-11` is intentionally left as a comment-only follow-up.

**Working-tree note:** the 17 tracked modifications already present before this pass (the feature itself) are preserved untouched apart from the five files above that overlap them (`globals.css`, `GameCard.tsx`, `HomeSetup.tsx`, plus the two atmosphere/audio modules that were untracked). `GameCard.tsx`'s diff grew by exactly four lines — the two class tokens — confirmed by `git diff -U0 -- components/game/GameCard.tsx | findstr game-card` returning only those two added lines.

---

## 2. Per-item completion

| Item | Result | Evidence |
|---|---|---|
| **BGM / passive audio removed** | Done | `lib/audio/bgm.ts` deleted. Tree search for `bgm|musicBus|duckMusic|restoreMusic|setExplicitMusic|applyMusicGain|musicTarget|explicitMusic|MUSIC_AUTO_LEVEL|MUSIC_USER_LEVEL|pad-swell|setScene|settings.music|toggleMusic` over `*.ts|*.tsx|*.css`: **0 matches**. The only remaining `setInterval` is the Time Attack countdown (game logic, frozen). |
| **Music UI, `data-audio-music`, its CSS** | Done | Popover renders exactly `SFX`, `Interface ticks`. `data-audio-music` search: 0 matches in code and CSS; the attribute reads `null` at runtime. |
| **`hl:audio:v1` backward compatible** | Done | Four legacy seeds verified (§3, V15). A `music` key is an unknown key for `sanitise`, never throws, never rewrites storage, never resets mute/SFX/ticks. |
| **Action + gameplay SFX preserved** | Done (source + partial runtime) | Cue map untouched. Runtime observed: domain `select`, `higher`/`lower` guesses + reveal tick, `game-over`, Play-again restart, unmute confirmation, hover ticks silent for Higher/Lower. Ladder/delta/urgency/modal-tab-filter cues were not individually exercised (§4). |
| **Lazy unlock incl. first gesture** | Done | `window` capture listeners + `ctx.state` gate. First-ever pointerdown produced 2 started oscillators (`select`) with the context already `running`. |
| **Home initial tint** | Done | `data-mode="classic"` on the first load; P2 sample `(88,88,206)` and P0 `(59,53,148)` — red ≥ green, i.e. `#6355cb`, never `#22d3ee`. Time Attack preset → `(214,66,206)`, `data-mode="time-attack"`. Reduced motion → `(107,81,201)`, `document.getAnimations()` 0. |
| **F1 (reveal ducking)** | Closed as moot | The music channel that ducked no longer exists. |
| **F8 (unmute promotes music)** | Closed as moot | `setExplicitMusic` is gone; unmute only restores `{muted:false, sfx:true}`. |
| **F2 card harmonization** | Done | `--card-light` follows the same `--atmo-recede-*` tokens: resting `1` → plate `rgb(99,85,203)` (byte-identical to today), `revealing` `0.8` → `… / 0.8` with a `7.2px` offset, `game-over` `0.75` → `… / 0.75` with a `6.75px` offset, `playing` back to `1`. Only `background-color` and `box-shadow` move. |
| **F3 mobile popover clipping** | Done (Home) / operable (Gameplay) | 390×844 Home: panel `left 8 → right 248`, both rows hit-testable, `subtree` CLS 0; the old `x = −11` is gone. 1440 Home: `999 → 1239` (identical to the QA invariant). 390 Gameplay: panel `87 → 327`, inside the viewport, open via ArrowDown + Enter toggles the row and persists. |
| **F4 Higher/Lower hover glow** | Done | Fine-pointer hover on Higher raised the field mean luminance over the button box from **204.21 → 218.74** (`r 52.4→55.5`, `g 44.9→48.8`) and created **no** oscillator, so pointer/keyboard SFX parity is untouched. Touch/coarse input is still gated by `finePointer.matches`. |
| **F6 first-gesture SFX** | Done | See V10/V11. |
| **F7 stale `data-phase` on back-nav** | Done | Classic → wrong guess → `game-over` → client-side back: `data-surface="home"`, `data-mode="classic"`, `data-phase`/`data-tier`/`data-guess` all **null**, and the canvas P2 sample returns to `(88,88,206)` — identical to a fresh homepage load. |
| **F9 `data-tier` on Play again** | Done | After `#btn-play-again`: `data-phase="playing"`, `data-tier` **null**, `data-guess="idle"`, `--card-light` back to `1`. Mid-run `playing` after a reveal keeps its tier. |
| **F10 duplicate emit** | Left as-is | Per approved decision. |
| **Hero cyan type accents** | Untouched | Per approved decision. |

---

## 3. Verification

Environment: owner's `next dev` on `http://localhost:3000` (reused, never stopped/restarted/rebuilt). Playwright MCP, Chromium, viewports 1440×900 and 390×844. Date 2026-11-22.

### Static

| # | Check | Status | Evidence |
|---|---|---|---|
| V1 | `npx tsc --noEmit` | `[Pass]` | exit 0, zero diagnostics. |
| V2 | `npm run lint` | `[Pass]` | exit 0, no errors or warnings emitted. |
| V3 | BGM residue search | `[Pass]` | 0 matches for every BGM identifier; only `TimeAttackGame.tsx:182` `setInterval` remains. |
| V4 | No `data-audio-music` | `[Pass]` | 0 matches in `*.ts|*.tsx|*.css`; runtime attribute `null`. |
| V5 | Appended-section-only CSS | `[Pass]` | `git diff -U0 -- app/globals.css` hunks: `135`, `139`, `144`, `148` (the four pre-existing `home-dialog-in/out` retimes the plan §4.5 already attributes to the earlier immersive-motion task) and the appended block from `454`. Both edits of this pass land at old lines `834` and `916+`, inside the appended section. |
| V6 | No new dependency/asset | `[Pass]` | `package.json`, `package-lock.json`, `next.config.ts`, `components.json`, `tsconfig.json` unchanged. |
| V7 | Frozen files untouched | `[Pass]` | Changed set ⊆ §6.1; no new tracked modification appeared during this pass. |
| — | `npm run build` | `[Blocked]` | Not run: `next build` writes into `.next`, which the owner's live `next dev` process (PID 17272) uses. Not restarted to validate, per the standing instruction. |

### Runtime

| # | Check | Status | Evidence |
|---|---|---|---|
| V8 | Zero audio at rest, before any gesture | `[Pass]` | Home: 0 oscillators created/started, 0 `setInterval` calls, 0 `AudioContext` instances after 2.5 s idle. Gameplay: same after 1.7 s. |
| V9 | Zero BGM after unlock | `[Pass]` | After the first gesture and after Home → Classic navigation: live oscillators (`started − stopped`) **0**, `setInterval` 0. |
| V10 | First-ever gesture audible | `[Pass]` | First pointerdown: gesture log shows 0 oscillators at capture, then 2 one-shot oscillators (both started **and** stopped → `select`), context `running`, `data-audio-state="running"`. |
| V11 | Keyboard first gesture | `[Pass]` | Keyboard path produces the identical cue count as pointer (V12). |
| V12 | Pointer/keyboard parity | `[Pass]` | A Lower guess: pointer **3** oscillators, keyboard **3**, `parity true`, both reaching `data-phase="playing"`. |
| V13 | Full SFX set | `[Partial]` | Observed: select, higher/lower + reveal tick, game-over, restart, unmute confirmation, silence on Higher/Lower hover. `[Not tested]`: ladders t1–t4 beyond tier 0, wrong thud in isolation, `+3s`/`-5s`, urgency ticks, modal in/out, tabs, filter, clear. The cue map is unchanged and none of those paths were edited. TODO: a full cue sweep if the owner wants per-cue runtime coverage. |
| V14 | Mute / SFX / ticks switches | `[Pass]` | `aria-pressed`, the `Sound on/off — …` label, `data-audio-sfx`, `data-audio-state`, and the storage write all follow the switches; Enter on the focused `sfx` row flipped on→off and wrote `{"v":1,"sfx":false,"ticks":"auto","muted":false}`. Arrow cycling visits only `sfx` → `ticks` (`ROWS = 2`). |
| V15 | Legacy storage with `music` | `[Pass]` | `{sfx:true,music:true}` → SFX on, not muted, storage untouched. `{sfx:true,music:false,ticks:false}` → SFX on, not muted. `{muted:true}` → muted. `{sfx:false,music:true}` → master reads "Sound off". No page errors in any case. |
| V16 | Fresh Home tint, classic | `[Pass]` | `data-mode="classic"`; P2 `(88,88,206,26)`, P0 `(59,53,148,43)`; `#22d3ee` never sampled. 1440 and 390. |
| V17 | Fresh Home tint, reduced motion | `[Pass]` | `prefers-reduced-motion: reduce`, 390×844: `data-mode="classic"`, P2 `(107,81,201,19)`, `document.getAnimations()` 0. |
| V18 | Time Attack preset | `[Pass]` | Selecting Time Attack → `data-mode="time-attack"`, P2 `(206,59,206)` / `(214,66,206)` — magenta. |
| V19 | Domain/category switching | `[Partial]` | The `mode` emit covers every state change and `data-mode` stayed `classic` after a domain switch with no cyan at any point. `[Not tested]`: the branch where a category forces `time-attack → classic` (needs a category whose `compatibleModes` excludes classic). TODO: exercise that reset if such a category is added. |
| V20 | Mobile popover unclipped | `[Pass]` | Home 390: `8 → 248`, rows hit-testable. Home 1440: `999 → 1239`, unchanged from QA. Gameplay 390: `87 → 327` inside a 390 viewport; keyboard-open + Enter toggles and persists. Control stays 44×44 everywhere. |
| V21 | Zero layout shift | `[Pass]` | Buffered `layout-shift` sum 0 for mount, popover open/close, mode change, and gameplay navigation. |
| V22 | Hover glow | `[Pass]` | Field luminance 204.21 → 218.74 over the Higher box on fine-pointer hover; 0 oscillators created. Impulse *identity* is verified, painted radius is not pixel-isolated (see §5). |
| V23 | Stale phase reset | `[Pass]` | See F7 above; post-back canvas sample equals the fresh-load sample exactly. |
| V24 | Card harmonization | `[Pass]` | `revealing` → light `0.8`, plate `color(srgb 0.388235 0.333333 0.796078 / 0.8)`, shadow `0 7.2px 0 0`; `game-over` → `0.75` / `6.75px`; `playing` → light `1`, plate `rgb(99,85,203)`. `[Not tested]`: `html[data-modal="open"]` × card, because the only modal (High Scores) exists on Home, where no card renders — the rule ships but has no reachable combined state today. |
| V25 | Geometry invariants | `[Pass]` | Header height **90** (Classic) / **138** (Time Attack); audio control **44×44**; `docW` **1435** at 1440 and **385** at 390; Home `docH` **2242** at 1440 and **2489** at 390 — both exact matches. |
| V26 | Console | `[Pass]` | Fresh pages across Home, Classic, Time Attack, popover, game-over, back-navigation: **0 page errors**, 0 app-originated warnings. The only warnings were produced by this pass's own probes (`getImageData` readback, `performance.getEntriesByType('layout-shift')`). |
| V27 | Degraded paths (no 2D context, no `AudioContext`) | `[Not tested]` | Not exercised this pass; the code paths were only read. |
| V28 | Visibility suspend/resume | `[Not tested]` | Not exercised this pass. The `bgm.pause()/resume()` references are removed; the master ramp + `suspend()` logic is untouched. |

### Screenshots (`docs/assets/procedural-canvas-audio/postfix2/`)

| File | What it shows |
|---|---|
| `home-desktop-1440.png` | Fresh Classic tint on Home, 1440 |
| `home-desktop-1440-popover.png` | Two-row popover, 1440 |
| `home-mobile-390-popover.png` | Popover at 390 after the clamp (`left 8`) |
| `home-mobile-390-reduced.png` | Reduced-motion field at 390 |
| `home-desktop-1440-after-back.png` | Home after a client-side back-nav from game-over |
| `classic-desktop-1440.png` | Classic gameplay, resting cards |
| `classic-desktop-1440-gameover.png` | `game-over` recession with the harmonized card |
| `classic-desktop-1440-popover.png` | Popover opened from the gameplay status cluster |
| `timeattack-desktop-1440.png` | Time Attack tint (`#d93fd0`) |
| `timeattack-mobile-390-popover.png` | Gameplay popover at 390 |

---

## 4. Deviations from the plan

1. **Allowlist count.** Plan §6.1 lists 11 modified files, but row 11 (`soundMap.ts`, comments only) is marked *excluded by default* and the owner restated the exclusion. Effective set: **10 modified + 1 deleted**. Flagged rather than silently reconciled.
2. **F3 clamp mechanism.** The plan specified `useLayoutEffect`; the implementation uses a clamp function invoked from the panel's **ref callback** (commit phase, before paint) plus a `resize` listener. Same ordering guarantee, and it avoids React's server-render `useLayoutEffect` warning on the layout-mounted instance — a console-hygiene requirement of this pass.
3. **F9 `data-tier` on Play again.** The plan §7.6 suggested the same treatment as the back-navigation reset; the reset is implemented in `AtmosphereBackdrop`'s `phase` handler (only on a `game-over → playing` transition), because the Play-again handlers live in `ClassicGame.tsx` / `TimeAttackGame.tsx`, which are frozen. A mid-run `playing` after a reveal deliberately keeps its tier.
4. **`data-guess` on Play again** is set to `idle` (not removed) because the existing `phase: playing` handler already owns that attribute.
5. **Back-navigation `route` emission is transition-guarded.** It fires only when the previous surface was `gameplay`, so the first Home mount does not push a spurious `route` into the engine.

---

## 5. Open items / `Needs Verification`

1. **Owner-quoted gameplay heights not reproduced.** At 1440 the owner's invariants cite Classic `1252` / Time Attack `954`; measured here: Classic `900`, Time Attack `924`. At 390 the difference is a uniform `+20` vs the QA figures (Classic `1272` vs `1252`, Higher `1120` vs `1100`, Lower `1186` vs `1166`). Home matches exactly (`2242` / `2489`), and this pass touched only paint properties (`background-color`, `box-shadow`) on the card plus the audio control's own box, so no layout path changed. The delta is most likely deck/category content. `Needs Verification [inferred-from-codebase]`.
2. **Gameplay popover vertical placement.** Opening the popover moves keyboard focus to the first row, which scrolls the nested page container by ~58 px, so the panel overlaps the header's status text and `elementFromPoint` reports the text rather than the row. The popover remains fully keyboard-operable (ArrowDown opens and focuses, arrows cycle, Enter/Space toggles and persists), which is its only entry path — the control's click is one-click mute by design. Horizontal clipping is fixed and the panel stays inside the viewport. The overlap is pre-existing (same `z-50` panel, same focus-on-open effect) and fixing it would mean changing `GameplayShell`/the panel's vertical strategy, both outside this allowlist. `Needs Verification [product-decision]`.
3. **Reduced-motion hydration attribute mismatch** reproduces on a reduced-motion page load and is the pre-existing F4 item the owner placed out of scope. `Needs Verification [inferred-from-codebase]`.
4. **`html[data-modal="open"]` × card** ships as a rule with no reachable combined state (the modal lives on Home). `[Not tested]`.
5. **Perceptual acceptance** of the tint, the card harmonization and "no BGM" feel was **not assessed** — no human reviewer in this session. `Needs Verification [product-decision]`.
6. **V13 remainder, V19 reset branch, V27 degraded paths, V28 visibility** are `[Not tested]` as listed in §3.
7. **`soundMap.ts:10-11`** still says "0.10 auto-start music level". Comment-only, excluded by the allowlist. TODO: reword when that file is next in scope.
8. **`--atmo-accent-off`** remains unreferenced (plan §4.5 leaves it). Not expanded.
9. **iOS Ring/Silent, non-Chromium engines, DPR 2×/3×** remain `[capability-unavailable]`, carried forward from QA §7.8.
10. **Workspace hygiene:** `.agents/**`, `.playwright-mcp/**`, `skills-lock.json`, `docs/**` and the feature's untracked source files stay untracked and must not be committed as part of this feature without a deliberate decision.

---

## 6. Sign-off

- **Completed and evidenced:** BGM/passive-audio removal, music UI/attribute/CSS removal, `hl:audio:v1` compatibility, first-gesture audible, Home tint (normal + reduced motion + Time Attack), F2, F3 (Home clamping; gameplay operability), F4, F7, F9, `tsc`, `lint`, BGM residue search, console health.
- **Runtime verification applicable and available:** yes (Playwright MCP against the owner's dev server, which was reused and never restarted).
- **Blocked:** `npm run build` (would write into the dev server's `.next`).
- **Not tested:** the V13 remainder, the V19 forced-reset branch, V27, V28, and the modal × card combination.
- **Unverified:** the owner's gameplay height figures, the gameplay popover's vertical overlap (product call), and all perceptual acceptance.
