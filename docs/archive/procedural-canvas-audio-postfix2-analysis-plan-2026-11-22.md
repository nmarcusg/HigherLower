# Procedural Canvas + Audio — Postfix 2: Analysis + Plan

**Date:** 2026-11-22
**Stage:** Analysis + Plan only (no implementation)
**Task type:** Postfix scoping — feature reduction (audio), visual correction (initial canvas tint), and repair of preserve items that were never delivered
**Branch:** `lj-branch`
**Author:** Analysis/planning pass. Nothing under `app/`, `components/`, `lib/`, `types/`, `scripts/`, `public/`, or any config/manifest was modified. The only file created by this pass is this document.

---

## 1. Task type, scope, and the state correction

### 1.1 State correction (important)

The owner brief describes these changes as sitting "on top of the completed procedural canvas + audio implementation **and postfix pass**". **No postfix pass has ever been executed.**

- The last verified state is [`docs/procedural-canvas-audio-qa-2026-11-22.md`](./procedural-canvas-audio-qa-2026-11-22.md): **conditional pass**, with **3 `[Fail]`** (reveal ducking, card offset-shadow harmonization, mobile popover clipping), **5 `[Partial]`**, and five behavioural findings (F6–F10).
- Nothing in the working tree implements any of QA §6.1's proposed fixes. Verified by source in §4 below.
- Therefore several items in the owner's "preserve" list are **not currently working**. "Preserve" for those items means "build them so they can then be preserved", not "leave them alone".

### 1.2 Scope of this pass

| Item | In scope |
|---|---|
| Remove all BGM / passive audio; keep action SFX only | yes |
| Remove the Music channel from UI, `data-audio-music`, and its CSS | yes |
| `hl:audio:v1` backward compatibility | yes |
| Fix the initial Home canvas tint (no blue/cyan fallback) | yes |
| Fix preserve items that QA proved broken: card shadow harmonization, mobile popover clipping, Higher/Lower hover glow, silent first gesture, stale `data-phase` on back navigation | yes |
| Anything else in the codebase | **no** |

Design stage applicability: **applicable but already settled** — this is a visual correction with owner-specified values (`#6355cb` / `#d93fd0`) and one visual amplification (card harmonization) that needs a decision (§10). No new visual language is invented here.

---

## 2. Git baseline

Measured in this session (`git status --porcelain=v1 -uall`, `git branch --show-current`, `git diff --stat`, `git diff --cached --stat`).

| Fact | Value |
|---|---|
| Branch | `lj-branch` |
| HEAD | `ea650b7 refactor(twitch): retire orphaned followers snapshot and generator` |
| Staged changes | **none** |
| Modified tracked files | **17**, `924 insertions(+), 65 deletions(-)` |
| Untracked feature files | **10** (exactly the canvas/audio feature set) |
| Untracked non-feature noise | `.agents/**`, `.playwright-mcp/**`, `skills-lock.json`, `docs/**` (all pre-existing or tooling-produced) |

**Modified (17)** — matches QA §2.1 exactly: `app/game/[mode]/page.tsx`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/CategoryCard.tsx`, `components/HighScoresModal.tsx`, `components/ModeButton.tsx`, `components/game/{ClassicGame,ComparisonBoard,DecisionControls,GameCard,GameplayShell,GameplayStatus,TimeAttackGame}.tsx`, `components/home/{CategorySelector,DomainSelector,HomeSetup}.tsx`.

**New (10)** — `lib/atmosphere/{types,eventBus,delegation,canvasEngine}.ts`, `lib/audio/{settings,soundMap,audioEngine,bgm}.ts`, `components/atmosphere/AtmosphereBackdrop.tsx`, `components/audio/AudioSurface.tsx`.

**Dev server:** owner's `next dev` on `http://localhost:3000`, listening, `OwningProcess 17272` (confirmed read-only via `Get-NetTCPConnection`). Never stopped, restarted, or rebuilt. The only request this pass made was one `GET /` to read the server-rendered markup (§5.5).

---

## 3. Current-state table — every preserve-list item

Statuses here describe the **code as it exists now**, not the QA-pass statuses.

| # | Preserve item | Expected | Actual now | Evidence | Postfix must touch it? |
|---|---|---|---|---|---|
| P1 | Full canvas engine | 5 passes, one canvas | Working; QA C1–C15 all pass | [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:152), QA §4.1 | **No** (only two micro-edits, §6/§7) |
| P2 | Bidirectional UI choreography | forward + back keep the field coherent | Forward works; back leaves the engine recessed at `game-over` (F7) | [`AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx:142) never resets phase; `route` only emitted forward at [`HomeSetup.tsx`](../components/home/HomeSetup.tsx:151) | **Yes** |
| P3 | Higher/Lower **hover glow** | hover emits a canvas glow in the higher (cyan) / lower (magenta) accent | **Absent.** The canvas branch exists but is unreachable from a button | Canvas branch: [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:739); only hover listener: [`delegation.ts`](../lib/atmosphere/delegation.ts:203), which `el.closest("label")` + requires a radio child; Higher/Lower are `<button aria-label>` at [`DecisionControls.tsx`](../components/game/DecisionControls.tsx:34) | **Yes** |
| P4 | **Card offset-shadow harmonization** | card plate/shadow respond to the same lighting as the canvas | **Absent, no mechanism** | `--card-accent` is inline ([`GameCard.tsx`](../components/game/GameCard.tsx:65)); plate is static `translate-x-2 translate-y-2` ([`:87`](../components/game/GameCard.tsx:87)); face is `shadow-[0_9px_0_var(--card-accent)]` ([`:89`](../components/game/GameCard.tsx:89)). No `html[data-*]` rule in the appended CSS reaches either | **Yes** — needs a `GameCard.tsx` hook (expansion, §6.6) |
| P5 | Modal canvas dimming | modal recesses the field | Working (`modalOpen` → `RECESSION_MODAL 0.55`) | [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:935), [`:706`](../lib/atmosphere/canvasEngine.ts:706) | **No** (only the *audio* duck is deleted, §6) |
| P6 | GameplayShell transparency | 84 % surface show-through | Working | [`.gameplay-surface`](../app/globals.css:902), class at [`GameplayShell.tsx`](../components/game/GameplayShell.tsx:46) | **No** |
| P7 | Stale `data-phase` reset on back navigation | Home returns to a full field with no gameplay phase attribute | **Broken.** `data-phase` stays `game-over`; engine phase stays `game-over` → 0.75 recession | Writer only, no resetter: [`AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx:95); home branch removes `data-mode` only ([`:150`](../components/atmosphere/AtmosphereBackdrop.tsx:150)) | **Yes** |
| P8 | Fixed mobile audio popover placement | popover fully on-screen at 390 px | **Broken** at 390 px on Home: `x = −11`, clipped by `<main>`'s `overflow-x-clip` | Panel is `absolute right-0 w-60` ([`AudioSurface.tsx`](../components/audio/AudioSurface.tsx:300)) under a control at `x≈185`; clip ancestor [`HomeSetup.tsx`](../components/home/HomeSetup.tsx:188) | **Yes** |
| P9 | Zero layout shift | CLS 0 on mount and popover open/close | Passing today; must stay 0 after the popover change | QA P6 | **Verify only** |
| P10 | 44×44 top-right control on Home and Gameplay | 44×44, no overlap | Passing | [`AudioSurface.tsx`](../components/audio/AudioSurface.tsx:285) `h-11 w-11`; mounts at [`HomeSetup.tsx`](../components/home/HomeSetup.tsx:191) and [`GameplayShell.tsx`](../components/game/GameplayShell.tsx:74) | **No** |
| P11 | Lazy AudioContext unlock on first gesture | one context, created inside a gesture | Passes (A1–A3) | [`AudioSurface.tsx`](../components/audio/AudioSurface.tsx:125) | **No** |
| P12 | **First-gesture SFX** | the very first gesture is audible | **Broken (F6).** Unlock listener is `window` **bubble**-phase; delegation is `document` **capture**-phase, so the cue is classified before a context exists | [`AudioSurface.tsx`](../components/audio/AudioSurface.tsx:130) vs [`delegation.ts`](../lib/atmosphere/delegation.ts:227) | **Yes** |
| P13 | Voice capping, per-cue rate limit, visibility suspend/resume, iOS silent-switch respect | as designed | Passing (A21 partial: source-verified) | [`audioEngine.ts`](../lib/audio/audioEngine.ts:32), [`:348`](../lib/audio/audioEngine.ts:348), [`:453`](../lib/audio/audioEngine.ts:453) | **Preserve while editing** |
| P14 | Action SFX set (selection, hover ticks, `launch`, modal, guesses, tiers, wrong, deltas, urgency, game-over, restart, unmute) | all present, pointer/keyboard parity | Passing (A6–A13, K2) | [`soundMap.ts`](../lib/audio/soundMap.ts:116) | **Preserve** |

**Net:** of the eleven "preserve" claims, **five are currently broken or absent** (P2, P3, P4, P7, P8, plus P12). The owner's list is aspirational, not descriptive.

Also note two QA findings that **disappear** with BGM removal: **F1** (reveal-beat ducking) and **F8** (unmute promoting music 0.10 → 0.28). They should be closed as "moot — channel removed", not fixed.

---

## 4. BGM removal inventory

### 4.1 The modules

`lib/audio/bgm.ts` is the entire generative BGM: a two-triangle pad through a low-pass with two low-rate LFOs, plus a 25 ms lookahead scheduler producing a pentatonic pulse.

| Reference | Location | Disposition |
|---|---|---|
| Module + header doc | [`lib/audio/bgm.ts:1-26`](../lib/audio/bgm.ts:1) | **Delete file** |
| Pad constant | [`bgm.ts:30`](../lib/audio/bgm.ts:30) `PAD_GAIN = 0.06` | Delete with file |
| Tempo/root tables | [`bgm.ts:32-39`](../lib/audio/bgm.ts:32) | Delete with file |
| Pad filter + LFOs + oscillators, `start()` (4 continuous oscillators) | [`bgm.ts:47-87`](../lib/audio/bgm.ts:47) | Delete with file |
| Pulse note scheduler | [`bgm.ts:108-161`](../lib/audio/bgm.ts:108) | Delete with file |
| **`setInterval` lookahead clock (25 ms)** | [`bgm.ts:166`](../lib/audio/bgm.ts:166) | Delete with file |
| `duck()/restore()/pause()/resume()/setLevel()/setScene()` | [`bgm.ts:176-215`](../lib/audio/bgm.ts:176) | Delete with file |

There is **no separate `pad-swell` identifier** in the codebase. The "Home hero `pad-swell`" the owner names *is* this pad (`PAD_GAIN`, 12 s breath LFO at [`bgm.ts:63-69`](../lib/audio/bgm.ts:63)). Deleting `bgm.ts` removes it. (`"swell"` also exists as a **canvas impulse kind** at [`canvasEngine.ts:54`](../lib/atmosphere/canvasEngine.ts:54) — visual only, untouched.)

### 4.2 `lib/audio/audioEngine.ts`

| Reference | Location | Disposition |
|---|---|---|
| Header doc "one BGM controller" | [`:2-3`](../lib/audio/audioEngine.ts:2) | Modify comment |
| `import { createBgm, type BgmController }` | [`:18`](../lib/audio/audioEngine.ts:18) | **Delete** |
| `MUSIC_AUTO_LEVEL`, `MUSIC_USER_LEVEL` | [`:30-31`](../lib/audio/audioEngine.ts:30) | **Delete** |
| `EngineState` fields `musicBus`, `bgm`, `musicTarget`, `duckFactor`, `explicitMusic` | [`:40-49`](../lib/audio/audioEngine.ts:40) | **Delete** |
| Same fields in the initial state | [`:57-58, 64-67`](../lib/audio/audioEngine.ts:57) | **Delete** |
| `musicBus` gain node creation/zero/connect | [`:147, 152, 160, 167`](../lib/audio/audioEngine.ts:147) | **Delete** |
| `state.bgm = createBgm(...)`, `setScene`, initial `setLevel` | [`:169-170`](../lib/audio/audioEngine.ts:169) | **Delete** |
| `applyMusicGain()` | [`:194-202`](../lib/audio/audioEngine.ts:194) | **Delete** |
| `musicLevelFor()` | [`:205-208`](../lib/audio/audioEngine.ts:205) | **Delete** |
| `applySettings()` music block | [`:219-221`](../lib/audio/audioEngine.ts:219) | **Delete those 3 lines**; keep master + sfx bus ramps |
| `setExplicitMusic()` | [`:225-228`](../lib/audio/audioEngine.ts:225) | **Delete** |
| `duckMusic()` | [`:230-233`](../lib/audio/audioEngine.ts:230) | **Delete** |
| `restoreMusic()` | [`:240-246`](../lib/audio/audioEngine.ts:240) | **Delete** |
| `setScene()` (only consumer was BGM) | [`:248-252`](../lib/audio/audioEngine.ts:248) | **Delete**; then `surface`/`mode` state fields become dead → delete too |
| `phase: game-over` music zero + `bgm.setLevel(0)` | [`:410-412`](../lib/audio/audioEngine.ts:410) | **Delete**; keep `playCue("game-over")` |
| `phase: playing` → `restoreMusic()` | [`:413-415`](../lib/audio/audioEngine.ts:413) | **Delete the `else` branch** |
| `modal open` → `duckMusic()`, `closed` → `restoreMusic()` | [`:429, 432`](../lib/audio/audioEngine.ts:429) | **Delete**; keep `playCue("modal-in"/"modal-out")` |
| `route` case (music zero only) | [`:436-441`](../lib/audio/audioEngine.ts:436) | **Delete the whole case** |
| `onVisibilityChange` destructures `bgm`, calls `pause()`/`resume()` | [`:454, 458, 471`](../lib/audio/audioEngine.ts:454) | **Delete those three references**; keep master ramp + `suspend()` |
| `playCue` gate `audioState !== "running"` | [`:339`](../lib/audio/audioEngine.ts:339) | **Modify** for F6 (§7.4) |

### 4.3 `lib/audio/settings.ts`

| Reference | Location | Disposition |
|---|---|---|
| Doc comment "persisted `music: false` … auto-start" | [`:9-10`](../lib/audio/settings.ts:9) | Modify comment |
| `AudioSettings.music` | [`:20`](../lib/audio/settings.ts:20) | **Delete field** |
| `DEFAULT_AUDIO_SETTINGS.music` | [`:29`](../lib/audio/settings.ts:29) | **Delete** |
| `sanitise()` reads `record.music` | [`:48`](../lib/audio/settings.ts:48) | **Delete the branch** — a legacy `music` key then falls through as an unrecognised key and is ignored (this is the required backward compatibility) |
| `updateAudioSettings` equality check on `music` | [`:107`](../lib/audio/settings.ts:107) | **Delete that comparison** |
| `isAudioMuted` `muted \|\| (!sfx && !music)` | [`:120-122`](../lib/audio/settings.ts:120) | **Modify** → `muted \|\| !sfx` |

`AUDIO_STORAGE_KEY = "hl:audio:v1"` ([`:13`](../lib/audio/settings.ts:13)) is **unchanged**. No version bump, no migration write. `readStorage` already tolerates a missing/garbage/unparsable entry and only writes on an explicit change ([`:55-72`](../lib/audio/settings.ts:55)), so:
- legacy `{v:1, sfx:true, music:true, ticks:"auto", muted:false}` → SFX on, ticks auto, not muted ✔
- legacy `{…, music:false, muted:false}` → SFX on, not muted ✔ (the removed channel has no effect)
- legacy `{…, muted:true}` → still muted ✔
- no throw on a `music` key, because `sanitise` ignores unknown keys rather than validating them ✔

### 4.4 `components/audio/AudioSurface.tsx`

| Reference | Location | Disposition |
|---|---|---|
| Imports `restoreMusic`, `setExplicitMusic`, `setScene` | [`:36-38`](../components/audio/AudioSurface.tsx:36) | **Delete** |
| `usePathname` + `resolveScene()` + pathname effect (`setScene`/`restoreMusic`) | [`:27`](../components/audio/AudioSurface.tsx:27), [`:59-64`](../components/audio/AudioSurface.tsx:59), [`:138-144`](../components/audio/AudioSurface.tsx:138) | **Delete entirely** (no BGM ⇒ no per-route scene) |
| `data-audio-music` write | [`:150`](../components/audio/AudioSurface.tsx:150) | **Delete**; drop `settings.music` from the dependency array [`:152`](../components/audio/AudioSurface.tsx:152) |
| `music` in the `audio` announce payload | [`:176`](../components/audio/AudioSurface.tsx:176) | **Delete** |
| `setExplicitMusic(...)` inside `toggleMaster` (**F8**) | [`:185`](../components/audio/AudioSurface.tsx:185) | **Delete** |
| `toggleMusic` callback | [`:214-221`](../components/audio/AudioSurface.tsx:214) | **Delete** |
| `ROWS = 3` | [`:66`](../components/audio/AudioSurface.tsx:66) | **Modify** → `2` (arrow-key cycling bound) |
| Music row | [`:262`](../components/audio/AudioSurface.tsx:262) | **Delete** row object |
| Popover panel class (F3) | [`:300`](../components/audio/AudioSurface.tsx:300) | **Modify** (§7.5) |
| Unlock listener phase (F6) | [`:130-131`](../components/audio/AudioSurface.tsx:130) | **Modify** (§7.4) |

Post-removal popover is exactly two switches — `SFX`, `Interface ticks` — under the one-click master mute, `role="group" aria-label="Audio settings"`. The master mute is still worth keeping: `isAudioMuted` reads `muted || !sfx`, the label/glyph contract (`aria-pressed`, `VolumeX`, "Sound off — unmute all audio") is unchanged, and unmute restores `{muted:false, sfx:true}` — see §10.1.

### 4.5 `app/globals.css` — appended section only (lines 795–925)

| Reference | Location | Disposition |
|---|---|---|
| `html[data-audio-music="on"] .audio-surface { --atmo-accent: var(--accent-highlight) }` | [`globals.css:836-838`](../app/globals.css:836) | **Replace selector** with `html[data-audio-sfx="on"]` |
| `html[data-audio-music="off"] .audio-surface { --atmo-accent: var(--border-mid) }` | [`globals.css:840-842`](../app/globals.css:840) | **Replace selector** with `html[data-audio-sfx="off"]` |
| `html[data-audio-sfx="off"][data-audio-music="off"] .audio-surface { color: var(--text-muted) }` | [`globals.css:844-846`](../app/globals.css:844) | **Simplify** to `html[data-audio-sfx="off"] .audio-surface` (single channel) |
| `html[data-audio-state="armed"]`, `[data-modal="open"]`, `.audio-surface-popover`, `.audio-row[aria-checked="true"]`, tier rules, `.gameplay-surface`, reduced-motion block | [`globals.css:848-924`](../app/globals.css:848) | **Unchanged** |

**Byte-identical zones that must not move:** everything from line 1 to 794 — the `:root` token block (`4–72`), the legacy keyframes, the `prefers-reduced-motion` block at `124`, the `::view-transition` reduced-motion block (`780–793`), and the four `home-dialog-in/out` retimes that belong to the earlier immersive-motion task. Only lines inside the *appended* section change.

`--atmo-accent` (default `var(--accent-classic)`, [`globals.css:816`](../app/globals.css:816)) and `--atmo-accent-off` (`:817`) stay. `--atmo-accent-off` is currently unreferenced; leave it rather than expand scope.

### 4.6 Verified non-BGM `setInterval` / continuous oscillators

Repo-wide search for `setInterval` in `app/ components/ lib/` returns exactly two sites: the deleted BGM scheduler ([`bgm.ts:166`](../lib/audio/bgm.ts:166)) and the Time Attack countdown ([`TimeAttackGame.tsx:182`](../components/game/TimeAttackGame.tsx:182)) — game logic, untouched. After the removal, **no audio timer and no continuous oscillator remains in the app**; every `soundMap` voice is a one-shot with `osc.stop()` ([`audioEngine.ts:301`](../lib/audio/audioEngine.ts:301)).

---

## 5. Initial Home tint — root cause and minimal fix

### 5.1 Observed defect

On the first render of `/`, the canvas P0 horizon wash and P2 tint are baked from `--accent-action-higher` (`#22d3ee`, cyan) instead of the preselected mode's accent.

### 5.2 Exact code path (confirmed)

1. `bakeStatic()` asks `tintColor()` for one accent and uses it for all three gradients — bottom horizon, top edge, and the P2 radial:
   [`canvasEngine.ts:324-363`](../lib/atmosphere/canvasEngine.ts:324).
2. `tintColor()` on Home with `mode === null` returns `palette.higher`:
   ```ts
   if (surface === "home") {
     return mode === "classic" ? palette.classic
       : mode === "time-attack" ? palette.timeAttack
       : palette.higher;          // ← the blue/cyan fallback, canvasEngine.ts:280
   }
   ```
   [`canvasEngine.ts:274-283`](../lib/atmosphere/canvasEngine.ts:274).
3. `palette.higher` is `--accent-action-higher` read from `:root` at bake time
   ([`:219`](../lib/atmosphere/canvasEngine.ts:219)); token value `#22d3ee` at [`globals.css:33`](../app/globals.css:33).
4. **Nothing ever tells the engine about the preselected mode.** The engine's mode is set in exactly two places:
   - the `AtmosphereBackdrop` mount effect, which passes the hard-coded `{surface:"home", mode:null}` ref ([`AtmosphereBackdrop.tsx:49, 76`](../components/atmosphere/AtmosphereBackdrop.tsx:49));
   - the `pointer` + `cue:"mode"` branch, which only fires when a **mode radio is clicked** ([`AtmosphereBackdrop.tsx:84-91`](../components/atmosphere/AtmosphereBackdrop.tsx:84)).
   `HomeSetup` preselects a mode in state ([`HomeSetup.tsx:72-78`](../components/home/HomeSetup.tsx:72)) and never emits it; it only emits `route` on **Start** ([`:151`](../components/home/HomeSetup.tsx:151)).
5. Result: on load, `data-mode` is absent (confirmed: the SSR document contains no `data-mode`), `tintColor()` takes the cyan branch, and the whole Home field is cyan-tinted until the user clicks a mode card.

### 5.3 The mode source and its reset paths (`HomeSetup`)

| Moment | What happens | Tint consequence today |
|---|---|---|
| Mount | `selectedMode` initialised from the initial domain's first playable category: `includes("classic") ? "classic" : compatibleModes[0] ?? null` ([`:72-78`](../components/home/HomeSetup.tsx:72)) | engine still `null` → cyan |
| Domain change | `selectDomain` re-picks the category and, only if the mode is incompatible (or absent), resets to `classic`/first compatible ([`:124-136`](../components/home/HomeSetup.tsx:124)) | engine unchanged → stale |
| Category change | `selectCategory` same reset rule ([`:138-147`](../components/home/HomeSetup.tsx:138)) | engine unchanged → stale |
| Mode click | `setSelectedMode` ([`:298`](../components/home/HomeSetup.tsx:298)) **and** the delegation `pointer/mode` event → engine updated | correct (only this path) |

Verified server-side initial value (read-only `GET /` in this session): the SSR markup contains
`name="playable-mode" checked="" value="classic"` and no `data-mode`. **The initial preset is `classic` ⇒ the correct initial accent is `#6355cb`.**

### 5.4 Why reduce-motion does not save it

`createAtmosphereEngine` bakes on creation via `resize()` and, under reduced motion, `start()` paints once ([`canvasEngine.ts:687-696`](../lib/atmosphere/canvasEngine.ts:687)). `setSurface()` re-bakes and repaints under reduced motion ([`:1027-1033`](../lib/atmosphere/canvasEngine.ts:1027)). So the *fix* works under reduced motion — but today the *defect* is equally present under reduced motion, because the mode is still `null` at that first paint. QA's reduced-motion screenshot (`qa-reduced-motion-home-desktop-1440.png`) is the frozen cyan state.

### 5.5 Minimal fix (three small pieces, one shared helper)

**A. Remove the fallback (1 line).** In `tintColor()`'s Home branch, return `palette.classic` when `mode === null`:

```ts
return mode === "time-attack" ? palette.timeAttack : palette.classic;
```
This makes the same expression as the gameplay branch ([`:282`](../lib/atmosphere/canvasEngine.ts:282)) and removes `--accent-action-higher` from the *default* Home mix entirely. `palette.higher` stays in use for the higher/lower accents, domain tint index 1, `guess`/`delta` impulses and the hero type — those are not the initial wash.

**B. Sync the engine to the real preset before the first paint.** In `AtmosphereBackdrop`, add one helper and use it in two places:

```ts
function readPresetMode(): GameplayModeId | null {
  const el = document.querySelector<HTMLInputElement>('input[name="playable-mode"]:checked');
  const value = el?.value;
  return value === "time-attack" ? "time-attack" : value === "classic" ? "classic" : null;
}
```
- mount effect, **before** `engine.start()`: `engine.setSurface("home", readPresetMode())` when the surface is home (replacing the hard-coded `null` at [`:76`](../components/atmosphere/AtmosphereBackdrop.tsx:76));
- pathname effect home branch: same call, plus `data-mode` written/removed to match.

This is safe at SSR because it runs only inside a client effect — no server render reads the DOM, so no hydration mismatch. It is correct on the first painted frame because the engine's first `start()` happens after the `setSurface` call, and `setSurface` re-bakes synchronously.

**C. Keep it synchronized afterwards.** Add one event to the atmosphere contract:

```ts
| { type: "mode"; mode: GameplayModeId | null; surface: SurfaceId }
```
- `HomeSetup`: a passive effect on `[selectedMode]` emits `{ type: "mode", mode: selectedMode, surface: "home" }`. This covers domain/category resets *and* direct mode clicks, without adding per-control handlers.
- `AtmosphereBackdrop` handles it exactly like the existing `pointer/mode` branch: update `surfaceRef`, `engine.setSurface(surface, mode)` (early-returns when unchanged, [`canvasEngine.ts:1028`](../lib/atmosphere/canvasEngine.ts:1028)), and write/remove `data-mode`.
- `canvasEngine.handleEvent` needs no new case (the backdrop drives `setSurface`; the default branch returns).

**Why both B and C.** C alone would leave one frame at the fallback mode, because the engine's mount effect runs before `HomeSetup`'s passive effect (sibling order: backdrop is the first child of `<body>`, [`app/layout.tsx:40`](../app/layout.tsx:40)). B closes that frame. B alone would go stale after a domain/category reset. Together they satisfy "never fall back while a mode is active" with no flash: today the preset *is* `classic`, and B paints `classic` first.

`setSurface` returns early if the surface/mode pair is unchanged, so B and C cannot thrash.

---

## 6. Exact minimal allowlist

### 6.1 Modify (11)

| # | File | Change | Why |
|---|---|---|---|
| 1 | [`lib/audio/audioEngine.ts`](../lib/audio/audioEngine.ts) | §4.2 deletions + `playCue` gate | BGM removal, F6 |
| 2 | [`lib/audio/settings.ts`](../lib/audio/settings.ts) | drop `music`; `isAudioMuted` | BGM removal, legacy tolerance |
| 3 | [`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx) | §4.4 + F3 clamp + F6 listener phase | BGM removal, F3, F6 |
| 4 | [`app/globals.css`](../app/globals.css) | appended section only: sfx-only accent rules; card harmonization rules; nothing above line 794 | BGM removal, P4 |
| 5 | [`lib/atmosphere/types.ts`](../lib/atmosphere/types.ts) | add `mode` event; drop `music` from the `audio` event | §5.5C |
| 6 | [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts) | Home tint fallback → classic (1 line); one `drawFrame` in the reduced-motion `route` branch | §5.5A, F7 repaint |
| 7 | [`lib/atmosphere/delegation.ts`](../lib/atmosphere/delegation.ts) | hover for Higher/Lower buttons | P3/F4 |
| 8 | [`components/atmosphere/AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx) | `mode` event; home reset of `data-phase`/`data-tier`/`data-guess` + `route`; initial preset read | P2/P7, §5.5B/C |
| 9 | [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx) | emit `mode` on `selectedMode` change | §5.5C |
| 10 | [`components/game/GameCard.tsx`](../components/game/GameCard.tsx) | **expansion request** — two class tokens (`game-card-plate`, `game-card-face`) | P4 |
| 11 | [`lib/audio/soundMap.ts`](../lib/audio/soundMap.ts) | *(optional, comments only)* stale "0.10 auto-start music" wording at [`soundMap.ts:10-11`](../lib/audio/soundMap.ts:10) | hygiene — **excluded by default** |

### 6.2 Delete (1)

- [`lib/audio/bgm.ts`](../lib/audio/bgm.ts) — whole file.

### 6.3 Create (0)

This document is the only new file.

### 6.4 Frozen — must remain untouched

`app/layout.tsx`, `app/page.tsx`, `app/game/**`, `components/CategoryCard.tsx`, `components/ModeButton.tsx`, `components/HighScoresModal.tsx`, `components/home/CategorySelector.tsx`, `components/home/DomainSelector.tsx`, `components/game/{ClassicGame,TimeAttackGame,ComparisonBoard,GameplayStatus,GameplayDivider,GameplayShell,DerivedGameState}.tsx`, `components/game/DecisionControls.tsx`, `components/ui/button.tsx`, `lib/atmosphere/eventBus.ts`, `lib/api/**`, `lib/catalog/**`, `lib/game/deck.ts`, `lib/highScores/**`, `types/api.ts`, `types/game.ts`, `types/view-transition.d.ts`, `scripts/**`, `public/**`, and every config/manifest.

### 6.5 Why `DecisionControls` is **not** needed for the hover glow

The Higher/Lower buttons already carry `aria-label="Higher"` / `"Lower"` ([`DecisionControls.tsx:38, 47`](../components/game/DecisionControls.tsx:38)) and the classifier already maps those labels ([`delegation.ts:112-113`](../lib/atmosphere/delegation.ts:112)). The glow can be produced entirely by the delegation layer, and `cueForPointer` keeps it **silent** for `higher`/`lower` ([`audioEngine.ts:367`](../lib/audio/audioEngine.ts:367)), so pointer/keyboard SFX parity (QA K2) is preserved by construction.

### 6.6 `GameCard.tsx` — explicit expansion request

The requirement is "card offset shadows harmonize with the canvas lighting". The card's plate and face carry no stable hook:

- plate: `className="absolute inset-0 translate-x-2 translate-y-2 rounded-[2.25rem] bg-[var(--card-accent)]"` ([`:87`](../components/game/GameCard.tsx:87));
- face: `className="relative aspect-square w-full overflow-hidden rounded-[2.25rem] border-4 border-white bg-[var(--surface-raised)] shadow-[0_9px_0_var(--card-accent)]"` ([`:89`](../components/game/GameCard.tsx:89));
- `--card-accent` is an **inline style** on the `<article>` ([`:65`](../components/game/GameCard.tsx:65)), so a CSS rule cannot override it — the rule must reach the two child elements instead.

Two options, one recommended:

- **Recommended (needs approval):** add exactly two class tokens — `game-card-plate` and `game-card-face` — to those two `className` strings. No structural, behavioural, prop, or styling change; the existing utilities keep working and the new unlayered rules simply win where they overlap.
- **Zero-touch alternative (not recommended):** a structural selector such as `article[aria-label] > div.relative > div.relative` / `:nth-child(2)`. It works today, but it silently breaks if the card markup is ever reordered, and it is harder to read than a class. `GameCard.tsx` was frozen for the previous task; expanding it by two class names is the smaller risk.

None of `lib/api|atmosphere/catalog|game|highScores`, `types/**`, `scripts/**`, `public/**`, or any config is involved.

---

## 7. Implementation sequence (small, surgical)

1. **Audio teardown (no visual change).** Delete `lib/audio/bgm.ts`; strip `audioEngine` (imports, constants, state, graph, `applyMusicGain`, `musicLevelFor`, `setExplicitMusic`, `duckMusic`, `restoreMusic`, `setScene`, phase/route/modal/visibility music calls); strip `settings.music`; strip `AudioSurface` music row/toggle/pathname effect/`data-audio-music`; swap the three CSS selectors in the appended section. → `npx tsc --noEmit` must be clean before touching anything visual.
2. **F6 first gesture.** Move the unlock registration to window capture and relax the `playCue` gate (§7.4). Verify with a fresh context: first click audible.
3. **F3 popover clamp.** Measured, clamped `absolute` offset (§7.5). Verify 390 px + 1440 px + gameplay, CLS 0.
4. **Initial tint.** `tintColor()` fallback + `readPresetMode()` + `mode` event + `HomeSetup` emit (§5.5). Verify normal and reduced motion, classic and time-attack, domain/category resets.
5. **F7 back navigation.** Home reset of `data-phase`/`data-tier`/`data-guess` + `route` to the engine + reduced-motion `drawFrame` (§7.6).
6. **F4 hover glow.** Extend `onPointerOver` with a Higher/Lower branch using `aria-label`, throttled by the existing `HOVER_MIN_MS` (§7.3).
7. **P4 card harmonization.** CSS rules in the appended section + the two `GameCard` class tokens (pending approval).
8. **Full verification sweep** (§8), then handoff.

Each step is independently revertable and independently verifiable. No step requires another step's code to compile.

### 7.1 Audio teardown detail

`applySettings()` keeps only the master and SFX ramps:

```ts
master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, now, 0.06);
sfxBus.gain.setTargetAtTime(settings.muted || !settings.sfx ? 0 : SFX_LEVEL, now, 0.06);
```
`unlockAudio()` no longer creates `musicBus` or a BGM controller; the compressor/limiter, the noise buffer, the 0 → 1 bus ramp and the `resume()`-swallow behaviour are untouched.

### 7.2 Settings compatibility detail

`AudioSettings` becomes `{ v: 1; sfx: boolean; ticks: TicksSetting; muted: boolean }`. `sanitise()` keeps its shape and simply stops reading `music`; a legacy key is an unknown key, which it already ignores ([`settings.ts:41-53`](../lib/audio/settings.ts:41)). No version bump: `v` stays `1` so an older build can still read the file (it will see `music` missing and fall back to its own default `true`, which is harmless because that channel no longer exists).

### 7.3 F4 hover detail

In `attachAtmosphereDelegation`, keep the existing `<label>`/radio branch and add a narrow button branch:

```ts
const button = raw.closest('button[aria-label="Higher"], button[aria-label="Lower"]');
if (button) { /* emit { type:"pointer", cue:"hover", target: "higher"|"lower", rect … } , HOVER_MIN_MS throttle */ }
```
Guards to keep: `finePointer.matches`, `isDisabled(el)`, the `HOVER_MIN_MS` throttle, and `rectOf` (one read per event, never per frame). The canvas already renders the `glow` impulse ([`canvasEngine.ts:739-751`](../lib/atmosphere/canvasEngine.ts:739)) with `accentForTarget("higher") = --accent-action-higher`, `("lower") = --accent-time-attack` ([`:296-305`](../lib/atmosphere/canvasEngine.ts:296)). Audio stays silent for these targets ([`audioEngine.ts:367`](../lib/audio/audioEngine.ts:367)).

### 7.4 F6 first-gesture detail

Root cause (confirmed): `onPointerDown` is registered on `document` in the **capture** phase ([`delegation.ts:227`](../lib/atmosphere/delegation.ts:227)), while the unlock listener is `window` **bubble** ([`AudioSurface.tsx:130`](../components/audio/AudioSurface.tsx:130)). Capture at `document` precedes bubble at `window`, so the very first activation is classified — and its cue dropped, because no context exists yet — before the unlock runs.

Two changes:
1. Register the `once` listeners with `{ passive: true, capture: true }`. Window capture is the first phase on the event path, so unlock always wins the race regardless of effect order.
2. Relax the `playCue` gate from `audioState !== "running"` to a check on the real context: `if (!ctx || ctx.state !== "running") return;`. In Chromium a context constructed inside a gesture is already `running` synchronously, so the first cue plays; in engines that hand back a `suspended` context the cue is still dropped for that one gesture (unchanged from today) rather than queueing.

Guard rails retained: mute/SFX checks, `hover-tick` tick resolution, per-cue rate limit, voice cap ([`audioEngine.ts:337-358`](../lib/audio/audioEngine.ts:337)).

### 7.5 F3 popover detail

Measured clamp, no portals, no layout shift:

- keep the current `absolute right-0 top-[calc(100%+8px)] w-60` classes as the pre-measurement fallback;
- add a `popoverRef`; in a `useLayoutEffect` keyed on `open`, measure the wrapper and the panel and clamp:
  `left = clamp(anchor.right − panelW, 8, innerWidth − panelW − 8)`, then set inline `left`, `right: 'auto'`, `top: 'calc(100% + 8px)'` **relative to the wrapper** (`left − anchor.left`);
- recompute on `resize` while open; the existing outside-`pointerdown` and `Escape` closures are unchanged.

`position: absolute` (not `fixed`) is deliberate: the panel stays inside the wrapper's containing block, so the `<main>` `overflow-x-clip` ancestor can never clip it once `left ≥ 8`, and it cannot introduce a scrollbar. Zero CLS because the panel is out of flow, as today (QA P6 measured 0).

### 7.6 F7 back-navigation detail

In `AtmosphereBackdrop`'s pathname effect, home branch ([`AtmosphereBackdrop.tsx:150-153`](../components/atmosphere/AtmosphereBackdrop.tsx:150)):

```ts
root.setAttribute("data-surface", "home");
root.removeAttribute("data-mode");      // plus the resolved preset, §5.5B
root.removeAttribute("data-phase");
root.removeAttribute("data-tier");
root.removeAttribute("data-guess");
engine.handleEvent({ type: "route", from: "gameplay", to: "home", mode: null, intent: "back" });
```
`route` already resets `phase`, `modalOpen`, impulses and the recession target ([`canvasEngine.ts:953-959`](../lib/atmosphere/canvasEngine.ts:953)). One added line in the engine's reduced-motion `route` branch ([`:727-731`](../lib/atmosphere/canvasEngine.ts:727)) — `drawFrame(elapsed * 1000)` — makes the reset actually repaint when the loop is stopped. This also closes **F9** (`data-tier` stuck at `4` after Play again) for the back-navigation path; the in-place "Play again" case is the same missing reset and can take the same one-line treatment *if* the owner wants it (§10.4).

### 7.7 P4 card harmonization detail (CSS, appended section)

```css
/* Card plate/face follow the field's own light level. */
:root { --card-light: 1; }
html[data-modal="open"]      { --card-light: var(--atmo-recede-modal); }
html[data-phase="game-over"] { --card-light: var(--atmo-recede-game-over); }
html[data-phase="revealing"] { --card-light: var(--atmo-recede-reveal); }

.game-card-plate {
  background-color: color-mix(in srgb, var(--card-accent) calc(var(--card-light) * 100%), transparent);
}
.game-card-face {
  box-shadow: 0 calc(9px * var(--card-light)) 0
    color-mix(in srgb, var(--card-accent) calc(var(--card-light) * 100%), transparent);
}
@media (prefers-reduced-motion: no-preference) {
  .game-card-plate, .game-card-face {
    transition: background-color var(--motion-dur-base) var(--motion-ease-out),
                box-shadow var(--motion-dur-base) var(--motion-ease-out);
  }
}
```
Reuses the existing `--atmo-recede-*` tokens ([`globals.css:810-814`](../app/globals.css:810)) so the card literally follows the canvas recession curve; keeps the mode accent from the inline `--card-accent`; `box-shadow` and `background-color` do not affect layout, so geometry invariants (QA R9/R10) are safe. Unlayered rules beat the Tailwind utilities layer, so no arbitrary utility needs deleting. A tier-3/4 accent glow can be added later; it is not required to satisfy the brief.

---

## 8. Verification matrix (implementation stage)

Static:

| # | Check | Command / method | Pass criterion |
|---|---|---|---|
| V1 | Types | `npx tsc --noEmit` | exit 0, zero diagnostics |
| V2 | Lint | `npm run lint` | 0 errors; warning count unchanged from QA's 95 (all outside feature files) |
| V3 | BGM gone | search `app/ components/ lib/` for `bgm\|createBgm\|BgmController\|musicBus\|duckMusic\|restoreMusic\|setExplicitMusic\|applyMusicGain\|musicTarget\|explicitMusic\|MUSIC_AUTO_LEVEL\|MUSIC_USER_LEVEL\|pad-swell\|setInterval` | zero matches except the Time Attack timer (`TimeAttackGame.tsx:182`) |
| V4 | No `data-audio-music` anywhere | search `data-audio-music` | zero matches in code and CSS |
| V5 | CSS zones byte-identical vs `HEAD` | `git diff -U0 -- app/globals.css` | every hunk starts at line ≥ 795; `:root`, the `124` reduced-motion block, legacy keyframes, `780–793` produce **no** hunk |
| V6 | No new dependency / asset | `git diff --stat package.json package-lock.json next.config.ts components.json tsconfig.json`; file search for audio extensions | empty / none |
| V7 | Frozen files untouched | `git diff --name-only` | changed-set ⊆ §6.1 ∪ the delete |

Runtime (Playwright MCP against the owner's dev server; read-only, never restarted):

| # | Check | Pass criterion |
|---|---|---|
| V8 | Zero BGM at rest, **before** any gesture | instrument `createOscillator`/`createBufferSource`; **0** creations and 0 `setInterval` callbacks for 3 s idle on Home |
| V9 | Zero BGM after unlock, before any other action | one gesture; no pad oscillators (previously 4), no periodic pulse; `AudioContext` count still 1, state `running` |
| V10 | First-ever gesture is audible | fresh context, click a domain label → the `select` cue's oscillator frequencies appear on the **first** pointerdown |
| V11 | Keyboard also unlocks and is audible first | fresh context, `Tab`+`Enter` (or `ArrowDown`) → cue on first keydown |
| V12 | SFX pointer/keyboard parity retained | Higher/Lower pointer cues `300→480` / `380→240` identical to keyboard (QA K2) |
| V13 | Full SFX set still present | Home selection, `go!` buffer whoosh, modal in/out/tabs/filter/clear, back, guesses, reveal tick, t1–t4, wrong thud, `+3s`/`-5s`, urgency ticks ≤10 s, game-over cadence, restart, unmute confirmation |
| V14 | Mute / SFX / ticks switches | `aria-pressed`, glyph, `data-audio-sfx`, `data-audio-state`, `hl:audio:v1` written; ticks switch still resolves auto/coarse |
| V15 | Legacy storage with `music` | seed `{"v":1,"sfx":true,"music":true,"ticks":"auto","muted":false}` → no throw, SFX on, not muted; seed `muted:true` → still muted; seed `sfx:false,music:true` → SFX off, master reads muted (per §10.1) |
| V16 | Fresh Home tint — classic | 1440×900 and 390×844, normal motion: canvas P0/P2 accent = `#6355cb` on the **first** painted frame (no `#22d3ee` sample at any frame) |
| V17 | Fresh Home tint — reduced motion | same, `prefers-reduced-motion: reduce`: frozen field is `#6355cb`; `document.getAnimations()` empty |
| V18 | Fresh Home tint — time-attack preset | select Time Attack, reload-free remount / navigation back → accent `#d93fd0`; never cyan |
| V19 | Domain/category switching | change domain so the mode resets → `data-mode` and the canvas accent follow within one frame; change category → same; no cyan at any point |
| V20 | Mobile popover unclipped | 390×844 Home: `panel.left ≥ 8`, `panel.right ≤ innerWidth − 8`, all rows hit-testable; gameplay mobile unchanged; desktop unchanged (`999→1239`) |
| V21 | Zero layout shift | buffered `layout-shift` sum 0 across mount, popover open/close, and a mode/domain change |
| V22 | Hover glow | fine-pointer hover on Higher → canvas `glow` impulse at the button box in `--accent-action-higher`; Lower → `--accent-time-attack`; **no** SFX on hover; touch emulation → no glow |
| V23 | Stale phase reset | Classic → game over → Back: `data-phase`/`data-tier`/`data-guess` absent, `data-surface="home"`, `data-mode` = preset, field recession back to 1 (mean-brightness delta vs hard reload within noise) |
| V24 | Card harmonization | `data-modal="open"` → card plate/shadow `color-mix` alpha 0.55; `data-phase="game-over"` → 0.75; `data-phase="revealing"` → 0.8; back to 1 when playing; shadow offset compresses with the same factor; no layout change on any transition |
| V25 | Geometry invariants | header heights 90 px Classic / 138 px Time Attack; `scrollWidth` 385 at 390; `go!` position unchanged with/without the audio control visible |
| V26 | Console | 0 errors / 0 warnings (production paths) across Home, Classic, Time Attack, modal cycle, audio cycle, back navigation |
| V27 | Degraded paths | `getContext("2d") → null` and missing `AudioContext` still degrade cleanly, control disabled, 0 errors |
| V28 | Visibility | hidden tab → master 0 + `suspend()`; visible → resume; no BGM scheduler exists to pause |

Perceptual acceptance (does the field read as lit, is the card row harmonized) is **not assessable in this environment** — no human reviewer — and must not be claimed.

---

## 9. Risk register and stop conditions

| Risk | Likelihood | Mitigation |
|---|---|---|
| Over-deleting in `audioEngine` breaks action SFX | medium | delete only the enumerated lines in §4.2; V13 + V12 gate the result |
| `data-audio-music` removal leaves a dangling CSS selector | low | V4/V5 searches; the three selectors are listed by line |
| Legacy `hl:audio:v1` with `music` resets mute/SFX/ticks | low | `sanitise` ignores unknown keys and only writes on change; V15 |
| `isAudioMuted = muted \|\| !sfx` changes the meaning of the master for legacy `sfx:false` users | low | documented as a product decision (§10.1); a `sfx:false` user was already silent |
| First-frame tint flash persists because the preset read runs too late | low | preset read happens **before** `engine.start()`; V16 asserts frame-1 colour |
| `readPresetMode()` reads a radio that is mid-update | low | read in the mount effect and in the pathname effect only; the `mode` event then owns subsequent state; fallback is `classic`, never cyan |
| Clamped popover still clipped | low | `absolute` inside the wrapper + `left ≥ 8` keeps it inside `<main>`; V20 measures both variants at both breakpoints |
| Hover glow impulses become noisy | medium | reuse `HOVER_MIN_MS` and the 2-slot ring; no per-frame work; V22 |
| `GameCard` class tokens disturb existing edge animation | low | tokens are additive; classes only add declarations for `box-shadow`/`background-color` that the current utilities already set |
| Reducing the popover to two rows breaks arrow-key cycling | low | `ROWS` constant updated in the same edit; V14 includes keyboard cycling |
| A third-party consumer expects `music` in `hl:audio:v1` | low | no such consumer in the repo; the key is additive and no longer written |

**Stop and ask the owner if:** `GameCard.tsx` expansion is refused but card harmonization remains required; `npx tsc --noEmit` or `npm run lint` introduces a new error not attributable to this change; the dev server must be restarted to verify anything; a preserve item turns out to need a file outside §6.1.

---

## 10. Product decisions needing owner sign-off

1. **Popover shape after BGM removal.** Two switches (`SFX`, `Interface ticks`) under a one-click master mute. *Recommended default:* keep exactly that. The master is now partly redundant with the SFX switch, but it preserves the QA-verified one-click mute, the `aria-pressed`/`VolumeX` contract, and the unmute confirmation cue. Dropping to a single switch would remove the ticks control, which is an explicit preserve item.
2. **Master-mute semantics with one channel.** `isAudioMuted = muted || !sfx`, so "SFX off" reads as "sound off" and master unmute restores `{muted:false, sfx:true}`. *Recommended default:* yes — audibility and the glyph stay consistent, and legacy `{sfx:false,music:true}` users correctly show muted.
3. **`GameCard.tsx` expansion** (§6.6). *Recommended default:* approve two class tokens; refuse only if the file must stay byte-frozen, in which case card harmonization has to be formally waived or accept the brittle structural selector.
4. **`data-tier` / `data-guess` reset on Play again (QA F9).** *Recommended default:* reset `data-tier` too, in the same place as the back-navigation reset (one line, zero visual risk). QA rates it informational because no CSS keys off it without the ring.
5. **Duplicate `pointer`/"audio" emission on the control (QA F10).** *Recommended default:* leave it. It is inaudible and harmless; removing the extra emit is an unrelated behaviour change inside a file we are already touching, and it is not in the owner's list.
6. **Headline and hero accents keep `--accent-action-higher`** ("or" word, Higher button, brush glows). *Recommended default:* leave them. The owner's tint request concerns the canvas wash, not the brand type.
7. **Close F1 (reveal ducking) and F8 (unmute promotes music) as moot** rather than fixing them. *Recommended default:* yes; note it in the handoff so the design document's ducking row can be corrected.

---

## 11. Open `Needs Verification`

| # | Item | Qualifier |
|---|---|---|
| 1 | Does the first CSS-drawn frame ever sample `#22d3ee` after §5.5A+B? | `[inferred-from-codebase]` — argued from effect order and `setSurface`-before-`start()`; V16 must measure pixels |
| 2 | Whether `checked` on `input[name="playable-mode"]` is present before hydration in every catalog state | `[inferred-from-codebase]` — confirmed for the current catalog via SSR markup (`checked="" value="classic"`); a future catalog whose first playable category excludes `classic` needs re-checking |
| 3 | Perceptual acceptance of the classic/time-attack tint, the card harmonization, and "no BGM" feel | `[product-decision]` — no human reviewer in this session; **not assessed** |
| 4 | p95 frame budget and continuous frame cadence at 390×844 / 1440×900 | `[environment-specific]` — headless compositor renders on demand (carried from QA §7.1) |
| 5 | Whether the clamped `absolute` popover can still be clipped by a future ancestor change | `[inferred-from-codebase]` — V20 measures the current tree |
| 6 | iOS Ring/Silent switch, DPR 2×/3×, non-Chromium | `[capability-unavailable]` — no device (carried from QA §7.8) |
| 7 | Autoplay-refusal path (a rejecting `resume()`), including whether the first cue plays there | `[Not tested]` — V10/V11 cover Chromium only |
| 8 | Any external consumer of `hl:audio:v1.music` | `[inferred-from-codebase]` — none in the repo; assume none |
| 9 | Canvas impulse geometry (ripple origins/radius) after the hover-glow change | `[capability-unavailable]` — cue identity verifiable, painted radius not pixel-isolated |
| 10 | Workspace hygiene: `.playwright-mcp/**`, `.agents/**`, `skills-lock.json` remain untracked and must not be committed with this feature | `[inferred-from-codebase]` |

---

## 12. Handoff trace

- **Task type:** postfix analysis + plan (no code changed).
- **Evidence:** working-tree inspection, source reads with line numbers, one read-only SSR fetch of `http://localhost:3000/`, and the QA report as the last verified behavioural baseline.
- **What was not done:** no edit, no delete, no build, no lint, no type-check, no browser session, no dev-server contact beyond one `GET /`.
- **Open items:** §10 (7 decisions) and §11 (10 verification items). Nothing in this document is implemented; the allowlist in §6 requires owner confirmation, with `GameCard.tsx` needing explicit expansion approval.
