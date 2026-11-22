# Home Audio Control · Gameplay Audio Mount · Home Setup Persistence · Gameplay Sprite Visibility

**Analysis + Plan only.** No application code, config, asset, or manifest was changed by this stage.

**Date:** 2026-11-22
**Stage:** Investigation / Analysis + Plan (owner-requested four targeted UI/state/visual adjustments)
**Branch:** `lj-branch`, HEAD `ea650b7`
**Runtime used:** the owner's existing `next dev` on `http://localhost:3000` (PID 17272 — reused, never stopped, restarted, rebuilt, or killed). Playwright MCP (Chromium), `devicePixelRatio = 1`, foregrounded (`document.visibilityState = "visible"`, `document.hasFocus() = true`, `requestAnimationFrame ≈ 202/s`), viewports **1440×900** and **390×844**.
**Repository writes made by this stage:** this document and screenshots under `docs/assets/ui-postfix/`. Nothing else.

**Completion pass (2026-11-22, later the same day):** every citation was re-read against the working tree and the four headline behaviours were re-measured on the same dev server at 1440×900 and 390×844. One arithmetic label was wrong and is corrected in place (§2.2); one measurement variance is recorded rather than silently repeated (§3.2, §8.2). The citation read-back is §8.1 and the completion status is §11. This pass again changed no application code.

---

## 1. Git baseline (recorded before any work)

| Command | Result |
|---|---|
| `git branch --show-current` | `lj-branch` |
| `git diff --cached --stat` | **empty — nothing staged** |
| `git log --oneline -3` | `ea650b7 refactor(twitch): retire orphaned followers snapshot and generator` · `264ad0e chore(catalog): update Twitch runtime-provider evidence for avatar imagery` · `1770365 test(twitch): assert avatar artifact schema, coverage, and fallback contract` |
| `git diff --stat` (unstaged, tracked) | 18 files, **+1338 / −90** |

**Tracked modifications (18, pre-existing, none created by this stage):**

| File | Δ |
|---|---|
| `app/game/[mode]/page.tsx` | 33 |
| `app/game/layout.tsx` | 6 |
| `app/globals.css` | 800 |
| `app/layout.tsx` | 4 |
| `app/page.tsx` | 11 |
| `components/CategoryCard.tsx` | 19 |
| `components/HighScoresModal.tsx` | 29 |
| `components/ModeButton.tsx` | 8 |
| `components/game/ClassicGame.tsx` | 113 |
| `components/game/ComparisonBoard.tsx` | 11 |
| `components/game/DecisionControls.tsx` | 8 |
| `components/game/GameCard.tsx` | 51 |
| `components/game/GameplayShell.tsx` | 8 |
| `components/game/GameplayStatus.tsx` | 39 |
| `components/game/TimeAttackGame.tsx` | 130 |
| `components/home/CategorySelector.tsx` | 17 |
| `components/home/DomainSelector.tsx` | 8 |
| `components/home/HomeSetup.tsx` | 133 |

**Untracked (pre-existing):** `.agents/`, `.playwright-mcp/`, `components/atmosphere/`, `components/audio/`, `components/game/GameplayEntrance.tsx`, `components/home/LaunchDock.tsx`, `docs/`, `lib/atmosphere/`, `lib/audio/`, `skills-lock.json`, `types/view-transition.d.ts`.

**No file in the working tree was reverted, reformatted, or absorbed.** The whole canvas/audio/motion feature set remains uncommitted by design, so `git diff` cannot prove provenance for files under `lib/atmosphere/`, `lib/audio/`, `components/audio/`; every such claim below is a **read of the current working tree**, not a diff.

---

## 2. Root-cause table

Method notes shared by every row: composited measurements hide the atmosphere canvas with `canvas.style.visibility = "hidden"` and compare full-region PNGs decoded in-page (`createImageBitmap` → `getImageData`); "mean" is the mean absolute **luminance** delta over the region, normalised to 0–255. Canvas-buffer numbers are `getImageData` on the single DOM canvas.

### 2.1 Home audio control does not read as a peer of `View High Scores`

| | |
|---|---|
| **Observed state** | Two controls sit 8 px apart in the Home header. The audio control is a **44×44 white-bordered circle with a solid `#15122b` face and a 4 px yellow offset shadow**; the High Scores control is a **borderless text button with a transparent face and no shadow**. Same text colour (`rgb(212,206,255)`), same focus ring. |
| **Measured evidence** | Audio button computed: `border: 2px solid rgb(255,255,255)`, `background: rgb(21,18,43)`, `box-shadow: rgb(255,204,0) 4px 4px 0`, `border-radius: 3.35544e7px`, `cursor: default`, 44×44 at `x 1195.2 / y 20` (1440) and `x 185.2 / y 20` (390). Source: [`AudioSurface.tsx:317`](../components/audio/AudioSurface.tsx:317). High Scores computed: `border: 1px solid rgba(0,0,0,0)`, `background: rgba(0,0,0,0)`, `box-shadow: none`, `border-radius: 0`, `cursor: pointer`, `padding: 0 12px`, 131.8×44 — source [`HomeSetup.tsx:251`](../components/home/HomeSetup.tsx:251). Hover on the audio control changed **only `color`** (muted → white) — `background`, `border`, `box-shadow` all unchanged; the High Scores hover adds `bg-white/10`. Header: `absolute right-[var(--space-page)] top-5 … gap-2` ([`HomeSetup.tsx:244`](../components/home/HomeSetup.tsx:244)). |
| **True root cause** | The audio control was designed as a **badged circular affordance** (border + opaque face + accent offset shadow) whose offset shadow `--atmo-accent` doubles as the SFX on/off tell ([`globals.css:871-880`](../app/globals.css:871)), while the adjacent utility control uses the house **borderless ghost-button** treatment. The two are different component languages in the same row, with no shared hover/active surface. |
| **Recommended fix** | Make the Home audio control an **icon-only ghost button** in the same language as `View High Scores`: transparent face, no shadow, square hover/active wash, `cursor-pointer`, 44×44 retained. Keep the glyph, `aria-label`, `aria-pressed`, `aria-expanded`, the popover, the armed dot, and the global focus ring. |
| **Tradeoffs** | The yellow offset shadow currently carries "SFX is on" at a glance; with it removed, state is carried by the glyph (`Volume2`/`VolumeX`), the `sfx-off` dimmed colour rule, and the popover rows. A product call (see §7 PD-2). The circle→square change slightly reduces the visual "badge" emphasis on the only audio affordance on Home. |

**Layout / CLS impact of removing border + background + shadow — measured, not inferred.** With the chrome removed in-place (border `0`, background `transparent`, shadow `none`) and re-measured:

| Rect | Before | After |
|---|---|---|
| audio button | `x 1195.2, y 20, 44×44, right 1239.2` | **identical** |
| High Scores | `x 1247.2, y 20, 131.8×44` | **identical** |
| header | `x 1195.2, y 20, 183.8×44` | **identical** |

`h-11 w-11` is a fixed border-box size, and `box-shadow` never participates in layout, so the change is **layout-neutral at both viewports** (`390`: audio `x 185.2`, scores `x 237.2`, header `right 369`, unchanged).

### 2.2 Gameplay header audio control — mount location and direct-load SFX

| | |
|---|---|
| **Observed state** | The Gameplay header renders a **second** visible audio control as the first child of the score/status cell ([`GameplayShell.tsx:74`](../components/game/GameplayShell.tsx:74), inside the `col-start-3` cluster at [`:73`](../components/game/GameplayShell.tsx:73)). The **headless** layout instance also mounts with no `variant` ([`app/layout.tsx:42`](../app/layout.tsx:42)) and renders `null` ([`AudioSurface.tsx:290`](../components/audio/AudioSurface.tsx:290)) **after** all hooks, so it still owns the engine, the unlock listeners, and the `data-audio-*` writer ([`AudioSurface.tsx:114-138`](../components/audio/AudioSurface.tsx:114)). |
| **Measured evidence — mount** | Direct load `/game/classic?category=movie-series-rating`: `document.querySelectorAll('[data-audio-control]').length === 1` (only the gameplay control is visible), `canvasCount === 1`. Instrumenting `window.addEventListener` showed **4 `pointerdown` + 4 `keydown` capture registrations of the named `once` unlock handler** ([`AudioSurface.tsx:118-126`](../components/audio/AudioSurface.tsx:118)) on that load — i.e. **two `AudioSurface` instances × two dev-StrictMode effect passes**, not one. A fifth `pointerdown` registration is Next dev's link interceptor. **The layout instance provably exists alongside the gameplay control.** |
| **Measured evidence — first-gesture SFX on a direct load** | `AudioContext` subclassed via `addInitScript` (constructor/`resume`/`createOscillator`/`start`/`stop`/`setValueAtTime` counted). At rest after load: `ctxCreated 0`, `oscCreated 0`, `data-audio-state="armed"`, `data-audio-sfx="on"`. **First gesture** (`click` on `Higher`): `ctxCreated 1`, context state **`running` at construction** (`ctxStates: ["running","change:running"]`), `resumeCalls 1`, `oscCreated 3`, `oscStarted 3`, `oscStopped 3`, frequencies `300 → ramp 480` (higher), `880` (reveal-tick), `262` (tier-1); `data-audio-state` → `running`. **The action SFX fires on the very first gesture after a direct load.** Second gesture added `380 → ramp 240` (lower), `880`, `262`, `524` — no accumulation, no scheduler. |
| **Direct-load caveat** | A bare `/game/classic` (no `?category=`) does **not** render gameplay: `authorizeGameRoute` returns `missing-category` ([`routeAuthorization.ts:60-66`](../lib/catalog/routeAuthorization.ts:60)) and the page calls `redirect("/")` ([`game/[mode]/page.tsx:21`](../app/game/[mode]/page.tsx:21)). Verified live: navigating to `http://localhost:3000/game/classic` lands on `/`. Direct-load/refresh testing must use `/game/<mode>?category=<id>`. |
| **True root cause of the duplicate control** | Two mounts were intentional in the canvas/audio design (one visible control per surface), but the gameplay duplicate **adds nothing**: the engine, unlock and attribute writer already live in the layout instance, so the gameplay control is pure chrome. |
| **Recommended fix** | **Remove `<AudioSurface variant="gameplay" />` from `GameplayShell`** and narrow the component's `variant` union to the Home surface. Keep the headless layout mount untouched. |
| **Tradeoffs** | Gameplay loses its only visible audio affordance: mute/unmute/SFX/ticks can then only be changed on Home. Gameplay also loses the `accentForTarget("audio")` ack impulse and the "muted → 0.6 opacity while a dialog is open" treatment. If the owner wants in-game mute, a smaller affordance (e.g. a pause/game-over-only control) is a separate decision (§7 PD-4). |

**Header geometry when the control is removed — measured, layout-neutral.** Hiding the control's wrapper (`display: none`) in the live DOM:

| Viewport | Grid cell (`col-start-3`) | Status content block | Cluster `scrollWidth`/`clientWidth` |
|---|---|---|---|
| 1440×900 | `x 1239.7 → 1299.7`, `w 176.3 → 116.3`, right 1416 | **`x 1299.7, w 116.3, right 1416` — identical before and after** | `176 → 116` in both states |
| 390×844 | `x 211.8 → 263.8`, `w 157.2 → 105.2`, right 369 | **`x 263.8, w 105.2, right 369` — identical before and after** | `157 → 105`; `scrollWidth === clientWidth` in both states |

The grid cell shrinks by exactly the control (`44`) plus the inter-child gap (`gap-2` = 8, `sm:gap-4` = 16); the status block itself is right-anchored by `justify-end` and does not move. Header height (`90` Classic, `138` Time Attack) is unchanged. **Zero layout shift.**

> **Correction (2026-11-22 completion pass).** The earlier draft's "cluster `176.3 → 132.3` wide" was an arithmetic slip: it added the leftover `gap-4` to the remaining cell, but a gap does not render against a single child. Re-measured live: `176.3 → 116.3`. The status-block rect quoted separately was already correct and was measured again unchanged.

### 2.3 Home setup selection resets after a round

| | |
|---|---|
| **Observed state** | Selecting **Gaming → Player Count → Time Attack**, launching, and returning Home restores **Movies & Series → movie-series-rating → Classic**, and the canvas tint returns to Classic. |
| **Measured evidence** | Live sequence at 1440×900: initial `{domain:"movies-series", category:"movie-series-rating", mode:"classic", dataMode:"classic"}`; after clicking the three radios `{domain:"gaming", category:"player-count", mode:"time-attack", dataMode:"time-attack"}`, canvas sample `rgba(125,38,130,…)` (magenta wash); `go!` → `/game/time-attack?category=player-count`, `data-gameplay-mode="time-attack"`; `Back to game setup` → `/` → `{movies-series, movie-series-rating, classic, dataMode:"classic"}`, canvas sample `rgba(54,49,125,…)` (classic wash). `localStorage` keys present: only `higherlower.highscores.v1` and `hl:audio:v1` — **no setup key exists.** |
| **True root cause** | HomeSetup holds the selection in three component-local `useState`s initialised **only** from catalog defaults ([`HomeSetup.tsx:69-84`](../components/home/HomeSetup.tsx:69)); `INITIAL_DOMAIN_ID` is a module constant ([`:49`](../components/home/HomeSetup.tsx:49)). Navigating to `/game/*` unmounts `HomeSetup` (it is rendered by the Home page only, [`app/page.tsx:14`](../app/page.tsx:14)), so the state is destroyed. Nothing reads or writes browser storage for the selection, and `AtmosphereBackdrop` re-derives the Home preset from the checked radio on every pathname change ([`AtmosphereBackdrop.tsx:187`](../components/atmosphere/AtmosphereBackdrop.tsx:187)) — which is why the **tint also resets** rather than only the form. |
| **Recommended fix** | Persist the validated triple in browser storage and restore it on mount with catalog validation; let the existing `mode` emit ([`HomeSetup.tsx:150-152`](../components/home/HomeSetup.tsx:150)) carry the restored mode into `data-mode`, the canvas rebake, and LaunchDock. |
| **Tradeoffs** | A restore that runs after paint produces one frame where the defaults are visible before the stored selection applies (and a 180 ms category-list height interpolation if the domain changes). A pre-paint read cannot be done without breaking SSR hydration. Persisting *across sessions* means a returning visitor no longer sees the designed default (Movies & Series / Classic) — a product call (§7 PD-1). |

**Where the restore has to live, and what must not break.** The three values are interdependent (`category` must belong to `domain`; `mode` must be in `category.compatibleModes`), and `canPlay` ([`HomeSetup.tsx:168-173`](../components/home/HomeSetup.tsx:168)) and LaunchDock props ([`:399-406`](../components/home/HomeSetup.tsx:399)) derive from them. A stored value that is stale (category un-promoted, mode no longer compatible) must degrade to the existing defaults rather than produce an unplayable state — the same shape `selectDomain`/`selectCategory` already enforce at [`HomeSetup.tsx:175-198`](../components/home/HomeSetup.tsx:175).

### 2.4 Gameplay sprites read faint

| | |
|---|---|
| **Observed state** | The same sprite field is clearly present on Home and barely there in gameplay; the strongest gameplay moment is a hint of texture in the side gutters, and on mobile it is close to invisible. |
| **Measured evidence — composited field (canvas visible vs hidden)** | **Home** 1440×900: left gutter (`0–120 × y240–660`) mean **2.26**, max **37.3**; centre gap **11.41** (max 17.0); below cards **14.26** (max **53.3**). **Gameplay Classic** 1440×900: left gutter mean **3.72** (max **12.6**), right gutter **3.73** (max 5.4), centre gap **3.99** (max 9.2), below cards **7.66** (max 9.9). Full-height left gutter (`0–155 × 900`): **3.70** mean, 87.8 % of pixels > 2/255, max **13.3**; header band `0–116` **1.19**; control band `692–900` **5.84**. **Peak sprite contrast in gameplay is 34 % of Home's** (12.6 / 37.3). Mobile 390×844: gameplay left margin `0–16` mean **5.21** (max **6.7**) vs Home **6.95** (max 11.1); gameplay below cards **1.21** (max 5.6) vs Home **8.86** (max **29.8**). |
| **Measured evidence — which layer eats it** | Scrim-removal A/B on gameplay (inline `background-image` reduced to the two grid layers, nothing else changed): left gutter field mean rises by **Δ 8.98** (max Δ **37.3**), below-cards rises by **Δ 16.5** (max 24.7). The scrim is therefore the dominant attenuator, and it is worth ≈2.4× the current gutter field on its own. Canvas buffer at the gutter (Classic): `rgba(53,45,117, α96)`; centre `rgba(100,84,202, α82)`; below cards `rgba(98,80,205, α86)` — the field reaches the buffer and is then composited under the DOM scrim. |
| **Measured evidence — motion is present but sub-visual** | Idle 500 ms: **647 canvas pixels changed** (of 1 296 000), `requestAnimationFrame 101/500 ms`, max accumulated alpha 143. A composited frame pair 500 ms apart shows **mean Δ 0.00** in every sampled region — the motion exists in the buffer but is below the visible threshold at this amplitude (consistent with the accepted QA baseline of ≈371 changed pixels per 420 ms). |
| **True root cause (four layers, compounding)** | **(1) DOM scrim above the canvas.** `.gameplay-surface` paints a `radial-gradient(120% 90% at 50% 45%, rgba(21,18,43,.84) 0%, .66 55%, .10 100%)` over the whole viewport ([`globals.css:943-963`](../app/globals.css:943)). For a 1440×900 box the ellipse radii are ≈1728×810, so `x = 60` sits at **≈0.386 of the ellipse** — between the 0 and 55 % stops, i.e. **≈0.71 alpha**, not the 0.10 edge stop. Only **≈29 %** of the field survives there; the erase-band proof already recorded this geometry ([`visual-motion-calibration-final-2026-11-22.md:77`](./visual-motion-calibration-final-2026-11-22.md:77)). **(2) Canvas tint wash above the sprites.** The engine draws `sprites → chevrons → impulses → erase → wash → vignette` ([`canvasEngine.ts:976-992`](../lib/atmosphere/canvasEngine.ts:976)). Gameplay resolves the wash token to **0.26** inner and **0.156** outer (`0.26 × 0.6`, [`canvasEngine.ts:496-508`](../lib/atmosphere/canvasEngine.ts:496)) via [`globals.css:809`](../app/globals.css:809), vs Home **0.14 inner / 0 outer**; at the gutter the gameplay wash over the sprites is ≈**0.21**, roughly 6× Home's ≈0.036. **(3) Vignette above the sprites** peaks at `rgba(9,7,25,0.42)` at the corners ([`canvasEngine.ts:513-528`](../lib/atmosphere/canvasEngine.ts:513)) — exactly in the gutters where the scrim is weakest. **(4) Safe bands erase the field entirely** in the top `116 px` and bottom `min(24 %, 208) px` ([`canvasEngine.ts:564-569`](../lib/atmosphere/canvasEngine.ts:564)), so on 900 px only `y ≈ 116–692` carries sprites at all. On top of all four, the sprite amplitude itself is Home-tuned: near `0.18–0.26`, far `0.09–0.14` ([`canvasEngine.ts:361-366`](../lib/atmosphere/canvasEngine.ts:361)), `breathe 0.8–1.0` ([`:708`](../lib/atmosphere/canvasEngine.ts:708)), chevrons `0.22–0.32` / reserve `0.16–0.20` ([`:398`](../lib/atmosphere/canvasEngine.ts:398)). |
| **Recommended fix** | A **gameplay-only sprite gain** applied inside the canvas draw path (no scrim retune, no draw-order change, no size change), read from a token at bake time. Ships as `--atmo-sprite-gain: 1` / `--atmo-sprite-gain-gameplay: 2.2`, `Tuning.spriteGain`, one multiply in `drawSprites`. Chevrons stay at 1.0 by default (already the most legible field element, and their surge already peaks at 0.88). |
| **Tradeoffs** | The scrim is a contrast device for the card column and was **accepted as final by the owner** ([`visual-motion-calibration-final-2026-11-22.md:194-202`](./visual-motion-calibration-final-2026-11-22.md:194)); a sprite gain is the only lever that raises gameplay field presence without touching it. But the scrim still keeps only ≈29 % in the gutters, so **even 2.2× cannot reach Home parity** (parity needs ≈3×). Higher gains make the field visible behind the inter-card gap and near the OR badge — a perceptual call (§7 PD-3). A gameplay-only bake (larger glow radius) is possible but changes the approved sprite composition; scaling inside `drawImage` is **explicitly banned** by the sprite design ([`idle-sprites-transition-go-ux-design-2026-11-22.md:482`](./idle-sprites-transition-go-ux-design-2026-11-22.md:482)).

---

## 3. Exact proposed changes

### 3.1 Home audio control — icon-only ghost button

**File:** [`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx) (button `className`, [`:317`](../components/audio/AudioSurface.tsx:317))

```diff
- className="audio-surface relative inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[var(--surface-background)] shadow-[4px_4px_0_var(--atmo-accent)] focus-visible:outline-offset-4 disabled:opacity-60"
+ className="audio-surface relative inline-flex h-11 w-11 cursor-pointer items-center justify-center border border-transparent bg-transparent transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 focus-visible:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
```

The class string now mirrors the adjacent control ([`HomeSetup.tsx:251`](../components/home/HomeSetup.tsx:251)) minus the text padding and font sizing (the audio control is icon-only). `h-11 w-11` keeps the 44×44 target.

**File:** [`app/globals.css`](../app/globals.css)

```diff
 .audio-surface {
   color: var(--foreground-muted);
   transition:
-    color var(--motion-dur-quick) var(--motion-ease-out),
-    box-shadow var(--motion-dur-quick) var(--motion-ease-out);
+    color var(--motion-dur-quick) var(--motion-ease-out),
+    background-color var(--motion-dur-quick) var(--motion-ease-out),
+    border-color var(--motion-dur-quick) var(--motion-ease-out);
 }
```

```diff
-/* The offset shadow — not the glyph — reports whether the one audible channel
-   (action SFX) is live, so the header stays quiet until the visitor looks. */
-html[data-audio-sfx="on"] .audio-surface {
-  --atmo-accent: var(--accent-highlight);
-}
-
+/* State is carried by the glyph and its colour; the offset shadow is gone with
+   the icon-only treatment. `--atmo-accent` assignments below the control are
+   deliberately not re-pointed. */
 html[data-audio-sfx="off"] .audio-surface {
-  --atmo-accent: var(--border-mid);
   color: var(--text-muted);
 }
```

`--atmo-accent` / `--atmo-accent-off` declarations in `:root` ([`globals.css:817-819`](../app/globals.css:817)) become unused by the control. **Leave the token declarations in place** (removing declared tokens is a broader change than this task needs); record them as dead only if the owner wants a cleanup pass.

**Before / after target measurements (1440×900 and 390×844)**

| Property | Before (measured) | After (target) |
|---|---|---|
| `border` | `2px solid rgb(255,255,255)` | `1px solid rgba(0,0,0,0)` |
| `background-color` | `rgb(21,18,43)` | `rgba(0,0,0,0)` |
| `box-shadow` | `rgb(255,204,0) 4px 4px 0px` | `none` |
| `border-radius` | `3.35544e7px` | `0px` |
| `cursor` | `default` | `pointer` |
| hover | colour only | `background rgba(255,255,255,.10)` + `color #fff` |
| active | none | `background rgba(255,255,255,.15)` |
| focus-visible | `3px solid rgb(34,211,238)`, offset `4` | **unchanged** (global `:focus-visible` rule, [`globals.css:119`](../app/globals.css:119)) |
| rect | 44×44 @ `1195.2,20` / `185.2,20` | **identical** |
| header rect / gap | 183.8×44, gap 8 | **identical** |
| CLS | — | **0** (layout-neutral; measured with the chrome removed in place) |

### 3.2 Gameplay audio mount removal

**File:** [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx)

```diff
-import AudioSurface from "@/components/audio/AudioSurface";
 ...
           <div className="col-start-3 row-start-1 flex min-w-0 max-w-full items-center justify-end gap-2 overflow-hidden sm:gap-4">
-            <AudioSurface variant="gameplay" />
             {status}
           </div>
```

The `gap-2 sm:gap-4` utility is left in place (single child ⇒ no visual effect); removing it is optional cleanup, not required.

**File:** [`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx)

- `export interface AudioSurfaceProps { variant?: "home" }` (was `"home" | "gameplay"`).
- Rewrite the header comment [`:3-17`](../components/audio/AudioSurface.tsx:3): one visible Home control plus the headless layout owner; the engine/unlock/`data-*` wiring is unchanged and intentionally independent of `variant`.

**Global audio survival (source-verified + runtime-corroborated):** [`app/layout.tsx:42`](../app/layout.tsx:42) mounts `<AudioSurface />`; the engine start ([`:115`](../components/audio/AudioSurface.tsx:115)), the capture-phase unlock pair ([`:117-131`](../components/audio/AudioSurface.tsx:117)) and the `data-audio-*` writer ([`:133-138`](../components/audio/AudioSurface.tsx:133)) all run before the `if (!variant) return null` at [`:290`](../components/audio/AudioSurface.tsx:290). Runtime: two instances observed on a gameplay load, and a first-gesture SFX fires from a direct load today. **Removing the header control does not remove audio.**

**Before / after target measurements**

| Check | Before | After (target) |
|---|---|---|
| visible `[data-audio-control]` on `/game/*` | 1 | **0** |
| visible `[data-audio-control]` on `/` | 1 | 1 |
| window `once` unlock registrations on `/game/*` (dev) | 4 pointerdown + 4 keydown | **2 + 2** (layout instance × StrictMode double-effect) |
| `data-audio-state` after first gesture | `running` | `running` |
| first-gesture oscillators (direct load) | 3 in the interrupted pass (300→480, 880, 262); re-measured **6** on a different reveal outcome (§11.3) | **same cue set — context created by the first gesture, state `running`, action cue `300 → ramp 480` present** (count is reveal-outcome dependent, not a fixed target) |
| status cell rect | `1299.7/116.3/right 1416` · `263.8/105.2/right 369` | **identical** |
| header height | 90 / 138 | **unchanged** |

### 3.3 Home setup persistence

**New file:** `lib/home/selection.ts`

```ts
// Browser-storage persistence for the Home setup selection.
// SSR-safe: every read is guarded by `typeof window`, and no value ever
// reaches render before hydration.

export const HOME_SELECTION_STORAGE_KEY = "hl:setup:v1";

export interface HomeSelection {
  v: 1;
  domainId: string;
  categoryId: string;
  mode: "classic" | "time-attack";
}

export function readHomeSelection(): HomeSelection | null;   // try/catch + shape check
export function writeHomeSelection(selection: HomeSelection): void; // try/catch, silent
export function resolveHomeSelection(
  catalog: ProductionCatalogProjection,
  stored: HomeSelection | null,
): { domainId: SemanticDomainId; category: PublicProductionCategory; mode: PlayableModeId } | null;
```

`resolveHomeSelection` validation (catalog-driven, no hard-coded IDs):
1. `catalog.domains.find(d => d.id === stored.domainId)` — else `null`.
2. Within that domain, `categories.find(c => c.id === stored.categoryId && c.playable)` — else `null`.
3. `category.compatibleModes.includes(stored.mode)` — else `null`.
4. Return the resolved triple. Any failure returns `null` so the caller keeps today's defaults.

**File:** [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx) — additive effects only; the three `useState`s and their default initialisers stay exactly as they are (SSR-stable).

```diff
+  const [selectionRestored, setSelectionRestored] = useState(false);
+
+  // Restore once, after hydration, only from a catalog-valid stored triple.
+  useEffect(() => {
+    const resolved = resolveHomeSelection(catalog, readHomeSelection());
+    if (resolved) {
+      setSelectedDomainId(resolved.domainId);
+      setSelectedCategory(resolved.category);
+      setSelectedMode(resolved.mode);
+    }
+    setSelectionRestored(true);
+  }, [catalog]);
+
+  // Persist only after the restore attempt, so defaults can never overwrite a
+  // valid stored selection on the first commit.
+  useEffect(() => {
+    if (!selectionRestored || !selectedDomainId || !selectedCategory || !selectedMode) return;
+    writeHomeSelection({
+      v: 1,
+      domainId: selectedDomainId,
+      categoryId: selectedCategory.id,
+      mode: selectedMode,
+    });
+  }, [selectionRestored, selectedDomainId, selectedCategory, selectedMode]);
```

Effect ordering is what makes this safe: on the first commit the restore effect runs first and queues state, the persist effect then sees `selectionRestored === false` and skips; on the next render the restored values persist idempotently.

**Why this keeps SSR clean:** the read happens inside a passive effect, never during render, so the server markup and the first client render are both the catalog defaults — identical, no hydration mismatch. The existing `mode` emit ([`:150-152`](../components/home/HomeSetup.tsx:150)) then carries the restored mode into `data-mode` and a canvas rebake ([`AtmosphereBackdrop.tsx:111-119`](../components/atmosphere/AtmosphereBackdrop.tsx:111)), and LaunchDock reads the restored state through its existing props ([`:399-406`](../components/home/HomeSetup.tsx:399)) — no LaunchDock change needed.

**Storage schema and key**

```json
{ "v": 1, "domainId": "gaming", "categoryId": "player-count", "mode": "time-attack" }
```

Key `hl:setup:v1` (consistent with `hl:audio:v1` at [`settings.ts:15`](../lib/audio/settings.ts:15) and `hl:atmosphere:quality` at [`canvasEngine.ts:337`](../lib/atmosphere/canvasEngine.ts:337)); `v` mirrors the audio settings' versioned envelope and `sanitise()` posture ([`settings.ts:41-52`](../lib/audio/settings.ts:41)).

**Before / after target measurements**

| Check | Before (measured) | After (target) |
|---|---|---|
| Gaming / Player Count / Time Attack → round → Back | `movies-series / movie-series-rating / classic` | `gaming / player-count / time-attack` |
| `data-mode` after Back | `classic` | `time-attack` |
| canvas sample at the same pixel after Back | `rgba(54,49,125,…)` | magenta-family value ≈ the pre-launch `rgba(125,38,130,…)` |
| LaunchDock context line | "Select a category · No mode"→defaults | "Player Count · Time Attack" |
| `localStorage["hl:setup:v1"]` | absent | `{"v":1,"domainId":"gaming","categoryId":"player-count","mode":"time-attack"}` |
| corrupted / un-promoted stored value | — | defaults, no error, key rewritten with defaults |
| hydration errors | 0 | **0** |
| CLS | 0.0022 baseline | **no new shift** (one post-mount correction; height interpolation is possible and must be measured) |

### 3.4 Gameplay sprite gain

**File:** [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts)

```diff
 interface Tuning {
   ...
   recedeLow: number;
+  spriteGain: number;
 }
```

```diff
     return {
       ...
       recedeLow: num("--atmo-recede-low", 0.35),
+      spriteGain: num(
+        surface === "gameplay" ? "--atmo-sprite-gain-gameplay" : "--atmo-sprite-gain",
+        surface === "gameplay" ? SPRITE_GAIN_GAMEPLAY : 1,
+      ),
     };
```

(with `const SPRITE_GAIN_GAMEPLAY = 2.2;` and the Home fallback `1`; `readTuning()` runs inside `rebakeAll()`, which `setSurface()` already calls after assigning `surface` at [`:1399-1404`](../lib/atmosphere/canvasEngine.ts:1399), so the token resolves per surface without adding a per-frame read.)

```diff
       const breathe = 0.8 + 0.2 * Math.sin(time * 0.5 + mote.phase);
-      ctx.globalAlpha = mote.alpha * breathe * fieldAlpha;
+      // Gameplay-only gain, clamped before the recession multiplier so
+      // low-energy (0.35) and modal/game-over recessions still scale it.
+      const gain = Math.min(0.85, mote.alpha * breathe * tuning.spriteGain);
+      ctx.globalAlpha = gain * fieldAlpha;
```

Chevrons: **no change by default** (`tuning.spriteGain` is not applied to `drawChevrons`). If the owner wants them lifted too, apply `Math.min(1, alpha * tuning.spriteGain)` at [`:795`](../lib/atmosphere/canvasEngine.ts:795) with a **separate lower token** (`--atmo-chevron-gain-gameplay`, suggested `1.4`) so the 0.88 surge peak is not flattened against a 1.0 clamp.

**File:** [`app/globals.css`](../app/globals.css) — append to the same `:root` block as the other field tokens:

```css
  /* Surface-dependent sprite gain. Home keeps the calibrated amplitude; the
     gameplay field survives only ~29 % of the DOM scrim, so its sprites are
     drawn brighter rather than retuning the scrim (owner-accepted). */
  --atmo-sprite-gain: 1;
  --atmo-sprite-gain-gameplay: 2.2;
```

**Why not the other levers**

| Lever | Effect | Verdict |
|---|---|---|
| Retune `.gameplay-surface` stops / ellipse | Largest effect (scrim removal worth Δ 8.98–16.5) | **Rejected** — the owner accepted this scrim as final ([`visual-motion-calibration-final-2026-11-22.md:194-202`](./visual-motion-calibration-final-2026-11-22.md:194)) and the ≥18/≥12 targets were explicitly dropped |
| Raise `--atmo-tint-alpha-gameplay` | Raises the *wash* over the sprites as well | **Rejected** — it attenuates sprites more, not less |
| Draw sprites after the wash/vignette | Brighter field, no scrim change | **Rejected** — breaks the accepted composite, puts sprites over the text-safe bands and the mode carry |
| Increase sprite size in `drawImage` | More coverage | **Rejected** — banned by the sprite design ([`idle-sprites-transition-go-ux-design-2026-11-22.md:482`](./idle-sprites-transition-go-ux-design-2026-11-22.md:482)) |
| Bake a gameplay-specific sprite (bigger glow) | Softer bloom | Optional follow-up only; changes the approved sprite composition |

**Before / after target measurements** (after-values are **projections** from the linear alpha model — no code was changed in this stage)

| Metric (idle, composited canvas-on/off) | Before (measured) | After (projected target) |
|---|---|---|
| 1440×900 left gutter `0–120 × y240–660` max Δ | **12.6** | **24–28** (≈68–75 % of Home's 37.3) |
| 1440×900 left gutter mean | **3.72** | **≈6.5** |
| 1440×900 left gutter `0–155 × 900` max Δ | **13.3** | **≈27** |
| 1440×900 below-cards mean | **7.66** | **≈12** |
| 390×844 left margin max Δ | **6.7** | **≈12–13** (Home 11.1) |
| 390×844 left margin mean | **5.21** | **≈7.5** |
| Chevron peak alpha | 0.88 surge / 0.22–0.32 idle | **unchanged** |
| Canvas pixels changed per 500 ms | 647 | **≈1 100–1 400** (scales with alpha) |
| AA pairs (card/status/controls) | all pass, ≥4.83 : 1 | **unchanged** (text never sits on the field; header/status/control bands erase sprites; derived states run at `fieldAlpha 0.35` so boosted sprites stay ≤ Home's at-rest amplitude) |
| One canvas / one rAF / no per-frame shadow·filter·gradient | 1 / 202 per s / 0 / 0 / 0 | **unchanged** (one multiply added) |

### 3.5 Implementation plan (ordered; runs only after PD-1 … PD-6 are signed off)

Each step is a self-contained diff against the §4 allowlist, independently verifiable, and leaves the tree consistent. No step depends on a later one.

| Step | Change | Files | Gate before moving on |
|---|---|---|---|
| **I1** | Home audio control → icon-only ghost button; `.audio-surface` transition list + sfx-state rules | `AudioSurface.tsx`, `app/globals.css` | R1–R3 at 1440 and 390: computed chrome equals the §3.1 "after" column; audio/High Scores/header rects and the 8 px gap byte-identical to the values recorded in §2.1; popover still opens, stays in viewport, moves focus, no shift; CLS ≤ 0.0022 |
| **I2** | Remove the gameplay mount; narrow `variant` to `"home"`; update the header comment | `GameplayShell.tsx`, `AudioSurface.tsx` | R4–R7: 0 visible `[data-audio-control]` on `/game/*`, 1 on `/`; status block rect unchanged (`1299.7/116.3/1416` at 1440, `263.8/105.2/369` at 390); header 90/138; direct-load first-gesture SFX still fires |
| **I3** | Persistence helper + two additive effects | `lib/home/selection.ts` (new), `HomeSetup.tsx` | R8–R10 + PD-5: full Time Attack round → Back restores `gaming/player-count/time-attack`, `data-mode="time-attack"`, magenta-family tint, dock label; corrupted/un-promoted key falls back to defaults with the key rewritten; 0 hydration errors; measured CLS delta |
| **I4** | Gameplay sprite gain token + one clamped multiply | `canvasEngine.ts`, `app/globals.css` | R11–R16: gutter peaks inside the §3.4 projected ranges; AA pairs ≥ required; card art 0 px changed; 1 canvas, 1 rAF, 0 per-frame `shadowBlur`/`filter`/gradient; reduced-motion frame static |
| **I5** | Static gates, provenance, handoff | — | `npx tsc --noEmit` exit 0; `npm run lint` 0 errors and no new warning in a changed file; changed set ⊆ §4; nothing staged; pre-existing modifications intact |

**Ordering rationale.** I1 and I2 are independent. I3 precedes I4 because it is the only step that can emit a hydration error, so isolating it keeps a failing restore out of the canvas verification. I4 is last because its "after" values are compared against the same idle baseline captured here, which is cleanest to re-establish once header chrome has settled.

**Rollback.** Every step is a small diff inside the allowlist; reverting one file pair restores the prior behaviour without touching the others.

---

## 4. Minimal file allowlist

### Files to modify

| # | File | Change | Justification |
|---|---|---|---|
| 1 | [`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx) | Home control → icon-only ghost button; `variant` union → `"home"`; header comment | §3.1, §3.2 |
| 2 | [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx) | Remove the `AudioSurface` import and the gameplay control | §3.2 |
| 3 | [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx) | Two additive effects (restore + persist) and one `useState` flag | §3.3 |
| 4 | `lib/home/selection.ts` **(new)** | Storage key, schema, read/write, catalog validation | §3.3 |
| 5 | [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts) | `Tuning.spriteGain` + token read + one clamped multiply in `drawSprites` | §3.4 |
| 6 | [`app/globals.css`](../app/globals.css) | `--atmo-sprite-gain*` tokens; `.audio-surface` transition list and sfx-state rule cleanup | §3.1, §3.4 |
| 7 | `docs/home-audio-persistence-gameplay-sprites-analysis-plan-2026-11-22.md` | This document (already written) | deliverable |
| 8 | `docs/assets/ui-postfix/*.png` | Evidence screenshots (already captured) | evidence |

### Frozen (must not change)

`components/game/ClassicGame.tsx`, `TimeAttackGame.tsx`, `GameCard.tsx`, `ComparisonBoard.tsx`, `DecisionControls.tsx`, `GameplayStatus.tsx`, `DerivedGameState.tsx`, `GameplayEntrance.tsx`; `components/home/LaunchDock.tsx`, `CategorySelector.tsx`, `DomainSelector.tsx`; `components/ModeButton.tsx`, `components/CategoryCard.tsx`, `components/HighScoresModal.tsx`; `lib/atmosphere/sprites.ts`, `eventBus.ts`, `delegation.ts`, `types.ts`; `lib/audio/*`; `lib/catalog/*`; `lib/highScores/*`; `app/layout.tsx`, `app/page.tsx`, `app/game/layout.tsx`, `app/game/[mode]/page.tsx`; `types/*`; `next.config.ts`, `package.json`, `eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json`, `components.json`; `design-reference/**`; gameplay rules, deck, scoring, timing constants, storage formats.

### Expansion requests

None required. Two *optional* items are recorded rather than requested:
1. `lib/atmosphere/canvasEngine.ts:317` fallback `0.16` for `--atmo-tint-alpha-gameplay` is stale vs the token's `0.26` (carried from the calibration doc's item 4). Not needed for this task.
2. `--atmo-accent` / `--atmo-accent-off` become unused after §3.1. Not removed (token-removal is a separate decision).

---

## 5. Verification plan

### 5.1 Static

| Check | Command | Pass condition |
|---|---|---|
| Types | `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` | 0 errors; warning count unchanged from the 95-warning baseline; none in a changed file |
| Build | `npm run build` | `[Blocked]` — the owner's `next dev` owns `.next`/port 3000; not run |
| Provenance | `git diff --name-only`, `git status --porcelain`, `git diff --cached --stat` | changed set ⊆ §4 allowlist; nothing staged; all pre-existing modifications preserved |

### 5.2 Runtime (Playwright, 1440×900 and 390×844, foregrounded)

| # | Check | Method | Pass condition |
|---|---|---|---|
| R1 | **Home icon-only button** | computed styles of `[data-audio-control]` and `View High Scores`; hover, `active`, Tab focus | border `1px transparent`, background transparent, `box-shadow: none`, radius 0, `cursor: pointer`, hover `rgba(255,255,255,0.1)`, focus-visible `3px solid rgb(34,211,238)` offset 4; rects and header rect byte-identical to baseline; gap 8 |
| R2 | **Home control still functional** | click to mute / unmute; ArrowDown; toggle both rows; Escape | `aria-pressed` flips, `hl:audio:v1` rewrites, popover stays in viewport, focus returns, zero layout shift |
| R3 | **Home CLS** | `PerformanceObserver('layout-shift', buffered)` excluding `hadRecentInput`, first 5 s | ≤ baseline 0.0022 |
| R4 | **Gameplay header has no audio control** | `/game/classic?category=…` and `/game/time-attack?category=…` at both viewports | `[data-audio-control]` count 0; status rect and header height match §3.2 table; no clipping (`scrollWidth === clientWidth`) |
| R5 | **Direct-load first-gesture SFX** | fresh load `/game/classic?category=movie-series-rating` with `AudioContext` instrumented **before** navigation; at-rest read, then one `Higher` click | at rest `ctxCreated 0`, `armed`; first gesture `ctxCreated 1`, state `running`, ≥2 oscillators started/stopped (300→480 family), `data-audio-state="running"`; repeat on a **reload** |
| R6 | **Global audio survives the mount removal** | count `once` unlock registrations on `/game/*`; assert `data-audio-sfx`/`data-audio-state` still written | 2 pointerdown + 2 keydown (layout instance × StrictMode double-effect); attributes written; SFX fires on first gesture |
| R7 | **Bare-URL behaviour documented** | `goto /game/classic` | redirects to `/` (expected, unchanged) |
| R8 | **Full Time Attack round → Back** | select Gaming → Player Count → Time Attack, `go!`, play/end a round, `Back to game setup` | radio group reads `gaming / player-count / time-attack`; `data-mode="time-attack"`; canvas sample magenta-family; LaunchDock context "Player Count · Time Attack"; `hl:setup:v1` present and matching |
| R9 | **Invalid stored selection** | write `{"v":1,"domainId":"nope","categoryId":"nope","mode":"pvp"}`, reload | defaults restored, no console error, key rewritten with defaults |
| R10 | **Hydration** | fresh `/` and `/game/*` loads; console listener | **0 hydration errors**, 0 console errors/warnings |
| R11 | **Sprite visibility** | canvas visible vs `visibility:hidden` over the fixed regions of §3.4 at both viewports | after-values within the projected ranges; peak ≥ 24 in the desktop gutter; mobile max ≥ 11 |
| R12 | **AA contrast** | composited-backing method (glyph set transparent, element rect sampled, WCAG against mean and 5th/95th-percentile luminance) for: white mode header, muted 12 px, card title, "Higher or lower?", Higher/Lower labels, focus ring | every pair ≥ its required ratio; worst pair ≥ 4.5 : 1 |
| R13 | **Card cover art untouched** | canvas-on/off diff inside each `<img>` rect | 0 px changed, max Δ 0 |
| R14 | **One canvas / one rAF / no per-frame cost** | canvas count; rAF vs `clearRect` counts over 1000 ms; prototype counters for `shadowBlur`, `filter`, `createRadialGradient`, `set shadowBlur` | 1 canvas; 1:1 rAF↔clearRect; all counters 0 in idle and during a reveal |
| R15 | **Reduced motion** | `emulateMedia({ reducedMotion: 'reduce' })`, 600 ms frame pair | 0 px changed, max Δ 0; boost applies to the single static frame only |
| R16 | **Game-over overlay / LaunchDock unchanged** | overlay geometry, `data-open`/`inert`, `opacity`, `visibility` | identical to the accepted baseline |
| R17 | **Mobile geometry** | `scrollWidth === clientWidth` at 390, header heights, back control 44×44 | 385/385, 90 and 138, back at `x 22` |

### 5.3 Out of scope for verification

Perceptual acceptance of the new control weight and of the boosted field is **not** claimed by this stage; DPR 2/3, Safari and Firefox are not exercised.

---

## 6. Contradictions and prior decisions that this plan touches

1. **Owner-accepted gameplay field.** [`visual-motion-calibration-final-2026-11-22.md:194-202`](./visual-motion-calibration-final-2026-11-22.md:194) records the owner accepting desktop gameplay ΔR `+6.32…+6.64` and gutter visibility `8.40`, and dropping the ≥18 / ≥12 targets, with "no further code changes" made for that acceptance. The current request asks for a gameplay-specific sprite boost. **This request supersedes that acceptance for the sprite amplitude only**; the plan deliberately does **not** reopen the scrim stops or the ellipse, which is what that acceptance covered.
2. **Measurement discrepancy to carry forward.** The accepted document reports **8.40** mean "left gutter 0–155" field visibility. Re-measured today at the same viewport and nominal region with the stated method: **3.70** (luminance mean, 87.8 % of pixels > 2/255, max 13.3); channel-mean variant 5.07 (Classic) / 6.44 (Time Attack). The difference is method- and moment-dependent (metric definition, and whether the sample was taken during a reveal's `land`/`tier` impulses). Recorded as `Needs Verification [environment-specific]`; this plan's before-values are the ones measured today at HEAD `ea650b7`.
3. **Design ban on draw-time scaling.** [`idle-sprites-transition-go-ux-design-2026-11-22.md:482`](./idle-sprites-transition-go-ux-design-2026-11-22.md:482) bans "scaling a sprite inside `drawImage`". The plan therefore raises **alpha only**, never size.
4. **Global focus ring beats utility classes.** Measured on both Home controls: `outline: 3px solid rgb(34,211,238)`, `outline-offset: 4px`, despite the High Scores button declaring `outline-2 outline-offset-2`. Unlayered `:focus-visible` in [`globals.css:119`](../app/globals.css:119) wins over the layered Tailwind utilities. The new class list keeps outline utilities for intent/parity but **the visible ring is unchanged**; do not report a 2 px ring in QA.
5. **`HighScoresModal` namespace split** recorded in governance is untouched by this plan; the persistence helper uses its own `hl:setup:v1` key and does not read or write high-score storage.

---

## 7. Open product decisions (need sign-off)

| ID | Decision | Options | Recommendation |
|---|---|---|---|
| **PD-1** | **Storage type + lifetime for the Home selection** | **(a)** `localStorage` (`hl:setup:v1`, persists across sessions/tabs) · **(b)** `sessionStorage` (per tab session, reset on browser close) · **(c)** no persistence, URL params only (rejected: changes routing) | **(a)** — matches `hl:audio:v1` and the expectation that a returning player sees their last setup. Trade-off: the designed default (Movies & Series / Classic) is no longer what a returning visitor sees. |
| **PD-2** | **How much of the "SFX on/off" state survives the icon-only treatment** | **(a)** glyph + dimmed colour only · **(b)** keep a small accent dot for "on" in addition to the existing armed dot | **(a)** — one signal per state, no competing dots on a 44 px control. |
| **PD-3** | **Gameplay sprite-boost intensity** | **(a)** sparks ×2.2, chevrons 1.0 (proposed) · **(b)** sparks ×2.2, chevrons ×1.4 (separate token) · **(c)** sparks ×3.0 for Home-like presence · **(d)** sparks ×1.6 (quiet) | **(a)** — measured peak reaches ≈68–75 % of Home; the scrim ceiling means (c) buys only ≈35 % more for a much louder card gap. |
| **PD-4** | **Any fallback audio access on gameplay** | **(a)** none — audio is controlled on Home only (proposed) · **(b)** control only on the game-over overlay or via a pause surface · **(c)** keep a keyboard-only mute shortcut (no visible control) | **(a)** for this pass; if in-game mute proves necessary, **(b)** as a follow-up surface rather than re-adding header chrome. |
| **PD-5** | **Restore-frame flicker tolerance** | **(a)** accept the one post-mount correction and any 180 ms category-height interpolation · **(b)** suppress the interpolation on the restore render (extra ref in `CategorySelector`, currently frozen) | **(a)** — measurable as CLS and reported; **(b)** would expand the allowlist. |
| **PD-6** | **Dead tokens after the icon-only change** (`--atmo-accent`, `--atmo-accent-off`) | **(a)** leave declared-but-unused · **(b)** remove them | **(a)** for this pass; **(b)** only with an explicit cleanup task. |

---

## 8. Source verification log

| # | Claim | Evidence | Status |
|---|---|---|---|
| S1 | Home audio control is the only visible audio control on `/` | runtime `querySelectorAll('button[data-audio-control]').length === 1`; headless layout instance returns `null` at [`AudioSurface.tsx:290`](../components/audio/AudioSurface.tsx:290) | `[Pass]` |
| S2 | Home audio computed chrome (border/bg/shadow/radius/cursor) | runtime `getComputedStyle` (§2.1) | `[Pass]` |
| S3 | Adjacent control computed chrome | runtime `getComputedStyle` on `aria-label="View High Scores"` | `[Pass]` |
| S4 | Removing chrome is layout-neutral | in-place simulated removal; rects identical before/after at 1440 and 390 | `[Pass]` |
| S5 | Hover changes only colour today | `:hover` state measured with a real pointer | `[Pass]` |
| S6 | Focus ring is 3 px cyan / offset 4 on **both** controls | Tab focus on each; `:focus-visible` matches true | `[Pass]` |
| S7 | Gameplay header renders a second control | [`GameplayShell.tsx:74`](../components/game/GameplayShell.tsx:74); runtime count 1 on `/game/*` | `[Pass]` |
| S8 | Engine/unlock/`data-*` wiring is variant-independent | [`AudioSurface.tsx:114-138`](../components/audio/AudioSurface.tsx:114) before the `null` return at `:290` | `[Pass]` |
| S9 | Two AudioSurface instances mount on a gameplay load | 4 × `once` pointerdown + 4 × `once` keydown registrations, named handler, source string contains `audioEngine` import | `[Pass]` |
| S10 | Direct-load first gesture creates a `running` context and plays its own cue | instrumented `AudioContext`; `ctxCreated 1`, `["running","change:running"]`, freqs `300, ramp:480, 880, 262` | `[Pass]` |
| S11 | Bare `/game/classic` redirects Home | live navigation landed on `/`; source [`routeAuthorization.ts:60`](../lib/catalog/routeAuthorization.ts:60) → [`page.tsx:21`](../app/game/[mode]/page.tsx:21) | `[Pass]` |
| S12 | Gameplay control removal is geometry-neutral | simulated removal; status rect identical at both viewports; `scrollWidth === clientWidth` | `[Pass]` |
| S13 | Home selection resets after a round | live sequence, §2.3 | `[Pass]` |
| S14 | No setup persistence key exists | `Object.keys(localStorage)` → `higherlower.highscores.v1`, `hl:audio:v1` | `[Pass]` |
| S15 | Canvas tint follows `data-mode` and resets with it | canvas samples `rgba(125,38,130,…)` (TA) → `rgba(54,49,125,…)` (Classic after Back) | `[Pass]` |
| S16 | Gameplay field/sprite compositing values | §2.4 tables (composited canvas-on/off diffs, region-clipped PNGs decoded in-page) | `[Pass]` |
| S17 | Scrim is the dominant attenuator | scrim-removal A/B: Δ 8.98 gutter / 16.5 below-cards | `[Pass]` |
| S18 | Draw order puts the wash + vignette above sprites | [`canvasEngine.ts:976-992`](../lib/atmosphere/canvasEngine.ts:976) source-read | `[Pass]` |
| S19 | Gameplay tint token is 0.26 inner / 0.156 outer; Home 0.14 / 0 | [`globals.css:807-809`](../app/globals.css:807), [`canvasEngine.ts:496-508`](../lib/atmosphere/canvasEngine.ts:496) | `[Pass]` |
| S20 | Safe bands erase top 116 px and bottom `min(24 %, 208)` px | [`canvasEngine.ts:564-569`](../lib/atmosphere/canvasEngine.ts:564) | `[Pass]` |
| S21 | Sprite amplitude is low by construction | [`canvasEngine.ts:361-366`](../lib/atmosphere/canvasEngine.ts:361) (`0.18–0.26` / `0.09–0.14`), `breathe 0.8–1.0` at [`:708`](../lib/atmosphere/canvasEngine.ts:708), chevrons `0.22–0.32` / reserve `0.16–0.20` at [`:398`](../lib/atmosphere/canvasEngine.ts:398) | `[Pass]` |
| S22 | One canvas / one rAF / animation present | `canvasCount 1`; `rAF 101` per 500 ms; 647 canvas pixels changed per 500 ms | `[Pass]` |
| S23 | No text sits on the gameplay field while playing | [`ComparisonBoard.tsx:30-49`](../components/game/ComparisonBoard.tsx:30) (cards + OR badge only); prompt is in the erased control band | `[Pass]` (source) |
| S24 | Derived states are low-energy (field ×0.35) | [`AtmosphereBackdrop.tsx:216-224`](../components/atmosphere/AtmosphereBackdrop.tsx:216) → [`canvasEngine.ts:1037-1042`](../lib/atmosphere/canvasEngine.ts:1037) | `[Pass]` (source) |
| S25 | `--atmo-accent` is used only by the audio control | grep across `*.tsx|*.ts|*.css` → 4 hits, all audio-related | `[Pass]` |
| S26 | Accepted calibration document reports gutter visibility 8.40 | [`visual-motion-calibration-final-2026-11-22.md:89-94`](./visual-motion-calibration-final-2026-11-22.md:89) | `[Pass]` as a record; **not reproducible today** (3.70 / 5.07 / 6.44 by three metrics) → `Needs Verification [environment-specific]` |
| S27 | Design bans draw-time sprite scaling | [`idle-sprites-transition-go-ux-design-2026-11-22.md:482`](./idle-sprites-transition-go-ux-design-2026-11-22.md:482) | `[Pass]` |
| S28 | Gameplay `next.config` has no experimental flags; `reactStrictMode` not set (dev default `true`, which explains the doubled effects) | [`next.config.ts:1-57`](next.config.ts:1) | `[Pass]` (inferred for the StrictMode default: `[inferred-from-codebase]`) |
| S29 | DPR 2/3, Safari, Firefox behaviour | harness reports DPR 1, Chromium only | `[Not tested]` |
| S30 | Perceptual acceptance of the icon-only control and the boosted field | no human reviewer in this stage | `[Not tested]` |
| S31 | `npm run build` | owner's dev server holds `.next`/port 3000 | `[Blocked]` |
| S32 | Post-implementation runtime verification of R1–R17 | not run — no code changed in this stage | `[Not tested]` |

### 8.1 Citation read-back (completion pass, 2026-11-22)

Every `file:line` cited in §2–§7 was re-read from the working tree and the quoted content confirmed. One arithmetic label was wrong and is corrected (§2.2); nothing else required correction or removal.

| Cited location | Confirmed content | Status |
|---|---|---|
| [`AudioSurface.tsx:317`](../components/audio/AudioSurface.tsx:317) | button class: `h-11 w-11 … rounded-full border-2 border-white bg-[var(--surface-background)] shadow-[4px_4px_0_var(--atmo-accent)]` | `[Pass]` |
| [`AudioSurface.tsx:290`](../components/audio/AudioSurface.tsx:290) | `if (!variant) return null;` — after every hook | `[Pass]` |
| [`AudioSurface.tsx:114-138`](../components/audio/AudioSurface.tsx:114) | `startAudioEngine()` (:115); capture-phase `pointerdown`/`keydown` → `unlockAudio` (:117-131); `data-audio-*` writer (:133-138) | `[Pass]` |
| [`AudioSurface.tsx:3-17`](../components/audio/AudioSurface.tsx:3) | header comment states "Two mounts, one component" + the headless layout owner | `[Pass]` |
| [`AudioSurface.tsx:49-52`](../components/audio/AudioSurface.tsx:49) | `variant?: "home" \| "gameplay"` | `[Pass]` |
| [`HomeSetup.tsx:251`](../components/home/HomeSetup.tsx:251) | High Scores ghost-button class: `border-transparent px-3 … hover:bg-white/10 active:bg-white/15 cursor-pointer` | `[Pass]` |
| [`HomeSetup.tsx:244`](../components/home/HomeSetup.tsx:244) | header `absolute right-[var(--space-page)] top-5 … gap-2` | `[Pass]` |
| [`HomeSetup.tsx:49`](../components/home/HomeSetup.tsx:49), [`:69-84`](../components/home/HomeSetup.tsx:69) | `INITIAL_DOMAIN_ID` module constant; three `useState`s defaulted from the catalog only | `[Pass]` |
| [`HomeSetup.tsx:150-152`](../components/home/HomeSetup.tsx:150) | mode emit `{ type: "mode", mode: selectedMode, surface: "home" }` | `[Pass]` |
| [`HomeSetup.tsx:168-173`](../components/home/HomeSetup.tsx:168) | `canPlay` derives from category + mode compatibility | `[Pass]` |
| [`HomeSetup.tsx:175-198`](../components/home/HomeSetup.tsx:175) | `selectDomain` / `selectCategory` reset rules | `[Pass]` |
| [`HomeSetup.tsx:399-406`](../components/home/HomeSetup.tsx:399) | LaunchDock props (`categoryLabel`, `modeLabel`, `canPlay`) already read the selection | `[Pass]` |
| [`app/page.tsx:14`](../app/page.tsx:14) | `<HomeSetup catalog={catalog} />` — Home-only mount | `[Pass]` |
| [`GameplayShell.tsx:73-74`](../components/game/GameplayShell.tsx:73) | `col-start-3` status cluster + `<AudioSurface variant="gameplay" />` | `[Pass]` |
| [`app/layout.tsx:42`](../app/layout.tsx:42) | headless `<AudioSurface />` | `[Pass]` |
| [`routeAuthorization.ts:60-66`](../lib/catalog/routeAuthorization.ts:60) | empty/missing category → `{ status: "missing-category" }` | `[Pass]` |
| [`app/game/[mode]/page.tsx:21`](../app/game/[mode]/page.tsx:21) | `if (authorization.status === "missing-category") redirect("/")` | `[Pass]` |
| [`globals.css:119`](../app/globals.css:119) | unlayered `:focus-visible { outline: var(--focus-outline); outline-offset: var(--focus-outline-offset) }` | `[Pass]` |
| [`globals.css:807-809`](../app/globals.css:807) | `--atmo-tint-alpha: 0.14` (Home) / `--atmo-tint-alpha-gameplay: 0.26` | `[Pass]` |
| [`globals.css:817-819`](../app/globals.css:817) | `--atmo-accent` / `--atmo-accent-off` declarations | `[Pass]` |
| [`globals.css:871-880`](../app/globals.css:871) | sfx-on repoints `--atmo-accent` to `--accent-highlight`; sfx-off sets `--border-mid` + muted colour | `[Pass]` |
| [`globals.css:943-963`](../app/globals.css:943) | `.gameplay-surface` radial `120% 90% at 50% 45%`, stops `0.84 / 0.66 / 0.10` | `[Pass]` |
| [`settings.ts:15`](../lib/audio/settings.ts:15), [`:41-52`](../lib/audio/settings.ts:41) | `hl:audio:v1` key; `sanitise()` shape guard | `[Pass]` |
| [`canvasEngine.ts:317`](../lib/atmosphere/canvasEngine.ts:317) | `tintGameplay: num("--atmo-tint-alpha-gameplay", 0.16)` — stale fallback, as recorded | `[Pass]` |
| [`canvasEngine.ts:337`](../lib/atmosphere/canvasEngine.ts:337) | `hl:atmosphere:quality` localStorage key | `[Pass]` |
| [`canvasEngine.ts:361-366`](../lib/atmosphere/canvasEngine.ts:361) | mote alpha `0.18 + r*0.08` near / `0.09 + r*0.05` far | `[Pass]` |
| [`canvasEngine.ts:398`](../lib/atmosphere/canvasEngine.ts:398) | chevron alpha `0.22 + r*0.1`; reserve `0.16 + r*0.04` | `[Pass]` |
| [`canvasEngine.ts:496-508`](../lib/atmosphere/canvasEngine.ts:496) | surface-aware tint radius; `tintOuter = gameplayTint ? tintAlpha * 0.6 : 0` | `[Pass]` |
| [`canvasEngine.ts:513-528`](../lib/atmosphere/canvasEngine.ts:513) | vignette to `rgba(9,7,25,0.42)` | `[Pass]` |
| [`canvasEngine.ts:564-569`](../lib/atmosphere/canvasEngine.ts:564) | safe bands: header 116, status `min(16 %,140)`, control `min(24 %,208)` | `[Pass]` |
| [`canvasEngine.ts:588-590`](../lib/atmosphere/canvasEngine.ts:588) | `rebakeAll()` reassigns `palette` and `tuning = readTuning()` — confirms the §3.4 per-surface read | `[Pass]` |
| [`canvasEngine.ts:708`](../lib/atmosphere/canvasEngine.ts:708) | `breathe = 0.8 + 0.2 * sin(...)` | `[Pass]` |
| [`canvasEngine.ts:795`](../lib/atmosphere/canvasEngine.ts:795) | `ctx.globalAlpha = alpha * fieldAlpha` in `drawChevrons` | `[Pass]` |
| [`canvasEngine.ts:976-992`](../lib/atmosphere/canvasEngine.ts:976) | draw order sprites → chevrons → impulses → erase → wash → vignette | `[Pass]` |
| [`canvasEngine.ts:1037-1042`](../lib/atmosphere/canvasEngine.ts:1037) | `lowEnergy → targetAlpha = tuning.recedeLow` (0.35) | `[Pass]` |
| [`canvasEngine.ts:1399-1404`](../lib/atmosphere/canvasEngine.ts:1399) | `setSurface()` assigns surface/mode then `rebakeAll()` | `[Pass]` |
| [`ComparisonBoard.tsx:30-49`](../components/game/ComparisonBoard.tsx:30) | board = two card wrappers + OR badge only | `[Pass]` |
| [`AtmosphereBackdrop.tsx:111-119`](../components/atmosphere/AtmosphereBackdrop.tsx:111) | `case "mode"` sets `data-mode` and calls `engine.setSurface` (the rebake path the restore relies on) | `[Pass]` |
| [`AtmosphereBackdrop.tsx:187`](../components/atmosphere/AtmosphereBackdrop.tsx:187) | Home path re-derives the preset via `readPresetMode()` | `[Pass]` |
| [`AtmosphereBackdrop.tsx:216-224`](../components/atmosphere/AtmosphereBackdrop.tsx:216) | `syncLowEnergy()` from the board selector | `[Pass]` |
| [`next.config.ts:1-57`](next.config.ts:1) | image `remotePatterns` only; no `experimental`, no `reactStrictMode` | `[Pass]` |
| [`visual-motion-calibration-final-2026-11-22.md:77`](./visual-motion-calibration-final-2026-11-22.md:77) | ellipse `≈1728 × 810`, gutter between the 0 % and 55 % stops | `[Pass]` |
| [`visual-motion-calibration-final-2026-11-22.md:89`](./visual-motion-calibration-final-2026-11-22.md:89) | left gutter 0–155 = **8.40** | `[Pass]` |
| [`visual-motion-calibration-final-2026-11-22.md:194-202`](./visual-motion-calibration-final-2026-11-22.md:194) | owner acceptance; ≥18 / ≥12 targets dropped; no further code changes | `[Pass]` |
| [`idle-sprites-transition-go-ux-design-2026-11-22.md:482`](./idle-sprites-transition-go-ux-design-2026-11-22.md:482) | anti-pattern list includes "scaling a sprite inside `drawImage`" | `[Pass]` |
| `lib/audio/`, `lib/atmosphere/`, `components/audio/`, frozen component set | files present in the working tree | `[Pass]` |
| [`docs/assets/ui-postfix/`](./assets/ui-postfix) | the 10 screenshots named in §9 all exist | `[Pass]` |

### 8.2 Runtime corroboration re-measured in the completion pass

Same dev server (PID 17272), Chromium, `devicePixelRatio 1`, 1440×900 and 390×844.

| # | Check | Re-measured result | Status |
|---|---|---|---|
| S33 | Home audio vs High Scores computed chrome | audio `border 2px solid rgb(255,255,255)`, `background rgb(21,18,43)`, `box-shadow rgb(255,204,0) 4px 4px 0`, `border-radius 3.35544e7px`, `cursor default`, 44×44 at `1195.2,20`; High Scores `border 1px solid rgba(0,0,0,0)`, transparent, `box-shadow none`, radius 0, `cursor pointer`, `padding 0 12px`, 131.8×44 at `1247.2,20`; header 183.8×44; gap 8 | `[Pass]` |
| S34 | Hover behaviour | audio hover changes **colour only** (`rgb(255,255,255)`), background/border/shadow unchanged; High Scores hover adds `oklab(… / 0.1)` background | `[Pass]` |
| S35 | Keyboard focus | Tab focuses the audio control; `:focus-visible` true; `outline 3px solid rgb(34,211,238)`, `outline-offset 4px` | `[Pass]` |
| S36 | Popover | ArrowDown opens `position: fixed` panel 240×108 at `999,72`, fully in viewport, right-aligned to the control, rows 44 px tall, focus moved to the SFX row; audio/scores rects and CLS unchanged | `[Pass]` |
| S37 | Chrome removal is layout-neutral | audio border/background/shadow/radius stripped in place: audio, scores and header rects byte-identical; CLS 0; styles restored | `[Pass]` |
| S38 | Gameplay control count and removal geometry | 1 visible control on `/game/classic` and `/game/time-attack`; wrapper hidden → cell `1239.7→1299.7` / `176.3→116.3` (1440) and `211.8→263.8` / `157.2→105.2` (390); status block `1299.7/116.3/1416` and `263.8/105.2/369` fixed; header 90 / 138; `scrollWidth === clientWidth` (385) | `[Pass]` |
| S39 | Direct-load first gesture (instrumented `AudioContext`) | `/game/classic?category=movie-series-rating`: at rest `ctxCreated 0`, `oscCreated 0`, `data-audio-state="armed"`, `data-audio-sfx="on"`; first `Higher` click → `ctxCreated 1`, context state **`running` at construction**, `resumeCalls 1`, 6 oscillators started/stopped incl. `set:300` → `ramp:480` (action cue), `data-audio-state="running"`, `data-guess="higher"`. Count is reveal-outcome dependent (§11.3) | `[Pass]` |
| S40 | Selection loss reproduction | 390×844: selected `gaming / player-count / time-attack` (`data-mode="time-attack"`, dock "Peak Concurrent Players · Time Attack", tint `rgba(165,41,159,37)`); `go!` → `/game/time-attack?category=player-count`; Back → `movies-series / movie-series-rating / classic`, `data-mode="classic"`, dock "Movie/Series Rating · Classic", tint `rgba(76,69,159,37)`; `hl:setup:v1` absent throughout | `[Pass]` |
| S41 | Canvas-buffer field + motion | Gameplay Classic 1440: gutter `0–120 × 240–660` α mean **96.55** (max 144), centre gap mean 80.23, below-cards mean 95.35; Home 1440: gutter mean **60.65** (max 119); changed alpha pixels / 500 ms: **691** gameplay, 2336 Home; `requestAnimationFrame` **102 / 500 ms**; 1 canvas | `[Pass]` |
| S42 | Console | 0 errors; the only warnings observed were emitted by this pass's own `performance.getEntriesByType('layout-shift')` probe ("Deprecated API for given entry type"), not by the app | `[Pass]` |

---

## 9. Screenshots — `docs/assets/ui-postfix/`

| File | Content |
|---|---|
| `home-header-1440-before.png` | Home header, audio circle + High Scores, 1440 |
| `home-header-1440-icon-only-simulated.png` | same crop with border/background/shadow removed in place (simulation only) |
| `home-header-390-before.png` | Home header, 390 |
| `home-header-390-icon-only-simulated.png` | same crop, chrome removed in place |
| `gameplay-header-1440-before.png` | Classic header, audio control + status |
| `gameplay-header-1440-no-audio-control-simulated.png` | same crop with the control hidden in place |
| `gameplay-field-1440-baseline.png` | Classic gameplay, settled field |
| `gameplay-field-1440-scrim-removed-simulated.png` | same frame with the radial scrim reduced to the grid layers (evidence for §2.4) |
| `gameplay-field-390-baseline.png` | Classic gameplay field, 390 |
| `home-field-390-baseline.png` | Home field reference, 390 |

All "simulated" images are **transient DOM/CSS overrides in the browser**; nothing was persisted to disk or source.

---

## 10. Sign-off

**Task type:** investigation / analysis + plan (no application change).
**Delivered:** git baseline; four root causes with `file:line` and measured runtime evidence; exact proposed changes with before/after targets; an eight-file allowlist with an explicit frozen set; a verification matrix; six product decisions.

**Established by measurement:** the Home audio control is a bordered circular badge with a 4 px shadow and `cursor: default` beside a transparent text button with `cursor: pointer`; removing its chrome is layout-neutral (rects identical, CLS 0). The gameplay header control is a second mount of a component whose engine/unlock/`data-*` wiring already lives in the headless root-layout instance (two instances proven by four pairs of unlock registrations); a direct load of `/game/<mode>?category=<id>` unlocks audio and plays its own action cue on the **first** gesture (`ctxCreated 1`, state `running`; the oscillator *count* is reveal-outcome dependent — see §11.3). The Home selection is lost because it lives only in component state and no storage key exists, and the canvas tint resets with it. Gameplay sprite peaks reach **34 %** of Home's, and the DOM scrim alone accounts for **Δ 8.98–16.5** of the field — the scrim, the over-drawn 0.26 tint wash, the edge vignette and the safe bands all sit above the sprites.

**Not established:** the accepted report's `8.40` gutter figure is not reproducible today (3.70 / 5.07 / 6.44 by three metrics) — `Needs Verification [environment-specific]`; every after-value in §3.4 is a projection, not a measurement, because no code was changed; perceptual acceptance is unassessed; `npm run build` is blocked by the owner's dev server.

**Awaiting owner sign-off on PD-1 … PD-6 before any implementation.**

---

## 11. Completion status (2026-11-22)

**Task type:** investigation / analysis + plan — completion and verification of an interrupted deliverable. No application code was changed.

### 11.1 Document completeness

| Requirement | Where | Status |
|---|---|---|
| Current state with exact `file:line` evidence, per item | §2.1–§2.4 | `[Pass]` |
| Live Playwright / computed / pixel measurements where needed | §2.1–§2.4, §8.2 | `[Pass]` |
| True root cause, per item | §2.1 shared-row component-language mismatch; §2.2 duplicate mount of a component whose engine already lives in the layout; §2.3 component-local state destroyed on unmount with no storage; §2.4 scrim + tint wash + vignette + safe bands above a Home-tuned sprite amplitude | `[Pass]` |
| Exact proposed change + before/after target | §3.1–§3.4 | `[Pass]` |
| Tradeoffs | §2 rows, §3.4 lever table, §6 | `[Pass]` |
| Exact minimal allowlist (modify/create, frozen, expansion requests) | §4 | `[Pass]` |
| Implementation plan | §3.5 (I1–I5 with per-step gates) | `[Pass]` |
| Verification matrix (tsc, lint, Playwright desktop+mobile, direct `/game` SFX, full Time Attack round → Back, sprites + AA, zero CLS/hydration) | §5.1–§5.2, R1–R17 | `[Pass]` |
| Numbered product decisions (storage type/lifetime, sprite intensity, gameplay audio fallback) | §7 PD-1, PD-3, PD-4 (+ PD-2, PD-5, PD-6) | `[Pass]` |
| Source verification log | §8, §8.1 (citation read-back), §8.2 (runtime re-measurement) | `[Pass]` |

### 11.2 Verification performed in this completion pass

| Check | Status | Evidence |
|---|---|---|
| Every cited file exists; every cited line supports its claim | `[Pass]` | §8.1 (47 citation rows); one label corrected (§2.2) |
| Git baseline reproduced | `[Pass]` | `lj-branch` @ `ea650b7`; `git diff --cached --stat` empty; `git diff --stat app components` = 18 files, +1338 / −90 |
| Home control vs High Scores (computed, hover, focus, popover, layout, CLS) | `[Pass]` | S33–S37 |
| Gameplay control presence and removal geometry at both viewports | `[Pass]` | S38 |
| Direct `/game/<mode>?category=` load + first-gesture audio | `[Pass]` | S39 |
| Selection-loss reproduction and absent storage key | `[Pass]` | S40 |
| Canvas-buffer field presence and motion | `[Pass]` | S41 |
| Evidence screenshots present | `[Pass]` | 10 files match §9 |
| `npx tsc --noEmit` | `[Not tested]` | no application code changed in this pass; the gate applies after implementation (§3.5 I5) |
| `npm run lint` | `[Not tested]` | same reason |
| `npm run build` | `[Blocked]` | the owner's `next dev` (PID 17272) owns `.next`/port 3000 |
| Composited canvas-on/off luminance diffs (§2.4) | `[Partial]` | not re-decoded in this pass; the buffer-level equivalents reproduce (S41). `TODO:` re-run the in-page PNG decode as R11 after implementation |
| DPR 2/3, Safari, Firefox | `[Not tested]` | Chromium @ DPR 1 only |
| Perceptual acceptance | `[Not tested]` | no human reviewer |

### 11.3 Corrections and variances carried into the plan

1. **Corrected in place (§2.2).** The interrupted draft's "cluster `176.3 → 132.3` wide" was an arithmetic slip (it added the leftover `sm:gap-4` to a single-child row). Measured value: `176.3 → 116.3` at 1440 and `157.2 → 105.2` at 390. The status-block rect quoted separately (`1299.7 / 116.3 / 1416` · `263.8 / 105.2 / 369`) was correct and re-measured unchanged.
2. **Variance, not a defect (§3.2 / S39).** The first-gesture oscillator **count** depends on the reveal outcome: 6 were observed here (including the `300 → ramp 480` action cue and the reveal/tier voices) where the earlier pass recorded 3. The invariant the plan depends on is unchanged — on a direct load the first gesture creates the context (`running`) and the action cue plays. §3.2's target was therefore reworded to "same cue set", not a fixed count.
3. **Method difference (§2.4 / S41).** §2.4's composited luminance deltas came from hiding the canvas and decoding region PNGs in-page; this pass measured the canvas **buffer** (alpha means/peaks, changed-pixel counts). They agree at the level that matters — the field reaches the buffer at the quoted alphas (gameplay gutter α 96 vs the quoted α 96) and motion is present (691 vs 647 changed pixels / 500 ms) — but the composited numbers themselves were not re-derived. Recorded as `[Partial]` with a `TODO` in §11.2.

### 11.4 Final status

The deliverable is complete and source-backed: four root causes with measured evidence, exact changes with before/after targets, an eight-entry allowlist with a frozen set, an ordered five-step implementation plan, a seventeen-check verification matrix, and six numbered product decisions. Two issues in the interrupted draft were handled in place — one arithmetic label corrected, one measurement variance disclosed. Nothing in the plan has been implemented, so every "after" value remains a target or projection.

**Awaiting owner sign-off on PD-1 … PD-6 — in particular PD-1 (storage type and lifetime), PD-3 (gameplay sprite-boost intensity) and PD-4 (any fallback audio access on gameplay) — before implementation.**
