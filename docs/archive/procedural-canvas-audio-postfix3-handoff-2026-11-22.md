# Procedural Canvas + Audio — Postfix 3: Handoff

**Date:** 2026-11-22
**Task type:** Post-fix correction (surgical cleanup) — visual/interaction fix + comment cleanup, plus verification.
**Branch:** `lj-branch`
**Environment:** Owner's live `next dev` on `http://localhost:3000` (PID 17272), reused and never restarted. Playwright MCP (Chromium) with `addInitScript` instrumentation. Viewports 390×844 and 1440×900.
**Supersedes:** the two residual items in [`docs/procedural-canvas-audio-postfix2-qa-2026-11-22.md`](./procedural-canvas-audio-postfix2-qa-2026-11-22.md) (F-4 gameplay popover, F-1 stale comment).

---

## 1. Scope and files changed

Approved allowlist: `components/audio/AudioSurface.tsx`, `lib/audio/soundMap.ts`, and a **conditional** `components/game/GameplayShell.tsx` change only if the popover could not be fixed in `AudioSurface.tsx`.

| File | Change | Notes |
|---|---|---|
| [`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx) | Popover positioning/focus/pointer fix | Only file changed for the popover |
| [`lib/audio/soundMap.ts`](../lib/audio/soundMap.ts) | Comment-only cleanup (stale "auto-start music level") | No code change |
| `components/game/GameplayShell.tsx` | **Not modified** | The popover was fixable inside `AudioSurface.tsx`; the conditional change was unnecessary and avoided |

No gameplay logic, deck, scoring, storage, providers, timing constants, routes, configs, manifests, or other components were touched. All pre-existing uncommitted feature work and untracked docs/assets were preserved. Both changed files live under untracked feature directories (`components/audio/`, `lib/audio/`), so `git diff` does not surface them; the whole feature remains uncommitted by design.

---

## 2. Root cause

The gameplay mobile popover had **two compounding defects**, both confined to the audio control, so no shell change was required:

1. **Ancestor clipping.** The popover was `position: absolute` inside the gameplay header's score/status cell, which is `overflow-hidden` ([`GameplayShell.tsx:73`](../components/game/GameplayShell.tsx:73)). The absolutely-positioned panel was clipped to that cell's box, so only a sliver painted and the rows were not hit-testable — `elementFromPoint` over both rows returned the status `<p>`/`<section>` behind them.
2. **Focus-induced scroll.** Opening the popover called `rowRefs.current[0]?.focus()`. Focusing a row inside the `overflow:hidden` cell scrolled a nested scroll container ~58px (the wrapper collapsed to viewport `top:-36`), which displaced the trigger and folded the panel up onto the status region (`top 16` vs the expected `top 74`).

A `position: fixed` descendant of an `overflow:hidden` ancestor is **not** clipped unless an ancestor establishes a containing block. The control's full ancestor chain was verified in-browser to have `transform/filter/will-change/contain/backdrop-filter` all `none`, so a viewport-fixed panel escapes the clip cleanly.

---

## 3. Fix

All in [`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx):

- **Viewport-fixed anchoring.** Replaced the wrapper-relative `clampPopover` with [`positionPopover()`](../components/audio/AudioSurface.tsx:171): `position: fixed`, `left/top` computed from the control's `getBoundingClientRect()` against the viewport, right-aligned to the control and clamped to an 8px inset.
- **Clear the status region.** The panel's top is placed below the control's **parent row** (`wrapperRef.parentElement` — the header/status cluster) plus an 8px gap, so it never covers the status text; it flips above only when the viewport bottom leaves no room.
- **No focus scroll.** `rowRefs.current[0]?.focus({ preventScroll: true })`, arrow-nav focus, and Escape's return-to-button focus all use `preventScroll: true`.
- **Reposition on resize/scroll.** The open effect re-runs `positionPopover` on `resize` and on capture-phase `scroll` (nested scroll containers included).
- **`className`.** `absolute right-0 top-[calc(100%+8px)]` → `fixed` (JS sets `left/top`).

Preserved: the 44×44 control, one-click master mute (`toggleMaster`), the two-row SFX / Interface-ticks popover, `isAudioMuted = muted || !sfx`, persistence, and zero layout shift (the panel is out of flow).

`soundMap.ts`: reworded the stale header comment to "…so nothing can startle a user or spike the output on the first gesture." No code change.

---

## 4. Verification results

### 4.1 Static checks

| Check | Status | Evidence |
|---|---|---|
| `npx tsc --noEmit` | `[Pass]` | exit 0, no diagnostics |
| `npm run lint` | `[Pass]` | exit 0, **0 errors, 95 warnings** — all from `.agents/skills/impeccable/scripts/*` (vendor) plus pre-existing `lib/api/worldbank.ts:22` and `lib/catalog/availability.ts:82`. None in changed files. |
| Impeccable detector on `AudioSurface.tsx` | `[Pass]` | `impeccable detect --json components/audio/AudioSurface.tsx` → `[]` |

### 4.2 BGM/music reference count

| Check | Status | Evidence |
|---|---|---|
| Feature-identifier grep (`bgm\|musicBus\|duckMusic\|restoreMusic\|setExplicitMusic\|applyMusicGain\|musicTarget\|explicitMusic\|MUSIC_\|pad-swell\|setScene\|settings.music\|toggleMusic\|data-audio-music`) over `app components lib types`, excluding `lib/api/data` | `[Pass]` | **0 matches** (`NO_SOURCE_BGM_MATCHES`). The stale `soundMap.ts` comment is gone. |
| Broad `music` sweep (same scope) | `[Pass]` | Only `MusicBrainz` provider/adapters, the `"music"` semantic domain (label "Music"), and the intentional legacy-key note at `lib/audio/settings.ts:9`. These are the allowed provider/domain terms. |

**BGM/music feature references after the change: 0.**

### 4.3 Popover (Home + Gameplay, 390×844 and 1440×900)

Each case: open via keyboard (`ArrowDown`), measure bounds, hit-test both rows, pointer-click both switches, verify keyboard toggle, Escape, and layout stability.

| Surface / viewport | Panel box (fixed) | In viewport | Rows pointer-hit | Pointer toggles + persist | Keyboard | Layout shift | Control |
|---|---|---|---|---|---|---|---|
| Home 390×844 | `top 72, bottom 180, left 8, right 248` | `[Pass]` | `[Pass]` (both `hitIsRow`) | `[Pass]` | `[Pass]` | `[Pass]` (none) | 44×44 |
| Gameplay 390×844 | `top 74, bottom 182, left 87, right 327` | `[Pass]` | `[Pass]` (both `hitIsRow`) | `[Pass]` | `[Pass]` | `[Pass]` (none) | 44×44 |
| Home 1440×900 | `top 72, bottom 180, left 999, right 1239` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | 44×44 |
| Gameplay 1440×900 | `top 74, bottom 182, left 1120, right 1360` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | 44×44 |

- **No status overlap (gameplay):** the status region (score/status cell) spans `y 22–66`; the panel opens at `y 74` on both breakpoints — below the status content. The rows now hit-test back to themselves (previously they returned the status `<p>`/`<section>`).
- **Pointer + keyboard:** every pointer click on `SFX` / `Interface ticks` flipped `aria-checked` and rewrote `hl:audio:v1` (e.g. `sfx:false`, then `ticks:false`); keyboard `ArrowDown → ArrowDown → Enter` toggled ticks (`false → true`, persisted); `Escape` closed the panel and returned focus to the control.
- **Zero layout shift:** `window.scrollY` unchanged and the 44×44 control's rect identical before/after opening on all four cases.

### 4.4 Audio engine (instrumented via `addInitScript`)

Instrumentation patched `AudioContext.prototype.createOscillator` (create/start/stop + first scheduled frequency) and `setInterval`. "live" = started − stopped.

| Check | Status | Evidence |
|---|---|---|
| Home at rest before gesture | `[Pass]` | `osc 0 / start 0 / stop 0 / int 0`, `data-audio-state "armed"` |
| First gesture unlocks + plays SFX | `[Pass]` | "High Scores" click → state `running`; cue oscillators created/started/stopped (fire-and-stop) |
| Zero BGM after gesture (idle) | `[Pass]` | `live 0`, `int 0` after settle |
| Classic rest before gesture | `[Pass]` | `osc 0 / int 0`, `armed` |
| Time Attack rest | `[Pass]` (note) | `osc 0`; `int 8` are the game countdown timers, **not** a BGM scheduler |
| No BGM timers/oscillators at rest (all modes) | `[Pass]` | No continuous oscillator; only TA countdown `setInterval` remains |

Per-cue coverage (frequency-attributed: higher=300, lower=380, reveal-tick=880, tier=262, wrong=90/95.5, game-over=220/165, restart=160, gain=392, loss=466, urgent=900):

| Cue | Status | Evidence |
|---|---|---|
| First-gesture SFX | `[Pass]` | Modal-open gesture → oscillator fire-and-stop, context `running` |
| Higher / Lower | `[Pass]` | 300 and 380 observed during guesses |
| Ladder rungs (tier family) | `[Partial]` | `tier-1` rung (262) observed on a correct guess; `tier-2/3/4` `[Not tested]` (need a longer correct streak) |
| Wrong thud | `[Pass]` | 90 / 95.5 observed on a wrong guess |
| Game over | `[Pass]` | 220 / 165 observed |
| Play again / restart | `[Pass]` | `#btn-play-again` → 160 observed |
| Time Attack deltas (`+3s` gain / `-5s` loss) | `[Pass]` | 392 (gain) and 466 (loss) both observed |
| Time Attack urgency tick | `[Not tested]` | 900 not reached within the quick run (timer did not drop to the urgent band) |
| Modal tabs (Classic / Time Attack) | `[Pass]` | 480 / tab cue, 1 oscillator each |
| Modal filter/clear | `[Pass]` | Clear-all → 2 cue oscillators |
| Modal open / close | `[Pass]` | in / out cues fire-and-stop |
| Unmute (`audio-on`) | `[Pass]` | 1 oscillator (523→784) on unmute |
| One-click mute is silent | `[Pass]` | mute click → 0 oscillators (by design) |

### 4.5 Time Attack mobile geometry

Two fresh 390×844 loads: `docH **1320**`, then `docH **1300**`; both `docW 385`, header height **138** (invariant), back link 44×44 at `top 22`, `data-gameplay-mode "time-attack"`.

**Conclusion:** the prior "1300 vs 954" figure is **content/deck-dependent**, not a fixed geometry bug. Header height and back control are invariant; only the scrollable content height varies (a 20px spread across fresh loads here, and a larger spread against the owner-quoted figure likely from a different deck/viewport). Per instructions, this was **not** "fixed."

### 4.6 Home / Classic geometry invariants

| Case | Status | Evidence |
|---|---|---|
| Home 1440×900 | `[Pass]` | `docH 2242`, `docW 1435` |
| Home 390×844 | `[Pass]` | `docH 2489`, `docW 385` |
| Classic 390×844 | `[Pass]` | `docH 1252`, `docW 385` (matches the owner Classic-mobile invariant) |
| Classic 1440×900 | `[Pass]` | `docH 900`, `docW 1440` |
| Header heights | `[Pass]` | Classic 90; Time Attack 138 |

### 4.7 Console / network health

| Check | Status | Evidence |
|---|---|---|
| Fresh loads Home / Classic / Time Attack | `[Pass]` | **0 console errors, 0 console warnings** on each; **0 page errors** |
| Media network requests | `[Pass]` | `resourceType === 'media'` → 0 during the Classic run; no media assets exist in the project (prior static scan) |

---

## 5. Screenshots

`docs/assets/procedural-canvas-audio/postfix3/`
- `home-390-popover.png`
- `home-1440-popover.png`
- `gameplay-390-popover.png`
- `gameplay-1440-popover.png`
- `home-1440.png`
- `classic-390.png`
- `time-attack-390.png`

---

## 6. Remaining open items / `Needs Verification`

1. **Ladder rungs `tier-2/3/4`** — `[Not tested]`; require a longer correct streak than the run produced. Cue wiring is source-confirmed unchanged.
2. **Time Attack urgency tick (`900`)** — `[Not tested]`; the timer did not reach the urgent band within the bounded run.
3. **Reduced-motion hydration mismatch** — pre-existing (`Needs Verification [product-decision]`, carried from postfix2 F-6); not introduced or re-checked this pass.
4. **`npm run build`** — `[Blocked]`; the owner's live `next dev` (PID 17272) holds `.next`. Not run per standing instruction.
5. **Perceptual acceptance** — not assessed (no human reviewer this pass).
6. **Time Attack document height** — content-dependent (see §4.5); if an exact figure is ever required it must be pinned to a specific deck, `Needs Verification [product-decision]`.

---

## 7. Sign-off

Both residual postfix2 items are closed at source and in the browser:

- **Gameplay mobile popover** — fixed, unclipped, fully in-viewport, clear of the status region, pointer + keyboard operable, zero layout shift, 44×44 control intact, at 390×844 and 1440×900 on Home and Gameplay.
- **Stale BGM comment** — removed; **0 functional/comment BGM/music feature references remain** (only allowed MusicBrainz/domain terms).

Runtime verification was applicable and available (Playwright + owner dev server) and passed; the only unverified items are the two reachable-in-principle cues (tier-2/3/4, urgency), the blocked `build`, and perceptual acceptance — all recorded above as `[Not tested]`/`[Blocked]`/not assessed rather than implied to pass.
