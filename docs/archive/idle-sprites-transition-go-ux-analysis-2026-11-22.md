# Idle Sprites · Reactive Field · Loading & Entrance · Scroll-Free Go — Analysis

**Date:** 2026-11-22
**Stage:** Analysis only (no application code, config, asset or manifest change)
**Branch:** `lj-branch`
**Environment:** Owner's live `next dev` on `http://localhost:3000` (reused, never restarted). Playwright MCP (Chromium), viewports 1440×900 and 390×844, `devicePixelRatio` **1** in the test browser.
**Builds on:** [`procedural-canvas-audio-postfix3-handoff-2026-11-22.md`](./procedural-canvas-audio-postfix3-handoff-2026-11-22.md), [`procedural-canvas-audio-postfix2-qa-2026-11-22.md`](./procedural-canvas-audio-postfix2-qa-2026-11-22.md), the six `immersive-motion-redesign-*` documents, and the `procedural-canvas-audio-*` analysis/design/plan/QA set.

**Repository writes made by this stage:** this document plus screenshots under `docs/assets/visual-ux-upgrade/`. Nothing else.

---

## 1. Baseline

### 1.1 Git state (verbatim, 2026-11-22)

`git status --porcelain=v1`, `git branch --show-current`, `git diff --stat`, `git diff --cached --stat`:

- Branch: **`lj-branch`**
- Staged changes: **none** (`git diff --cached --stat` empty)
- **17 tracked modifications**, `976 insertions(+), 67 deletions(-)`:

| File | +/− |
|---|---|
| `app/game/[mode]/page.tsx` | 33 |
| `app/globals.css` | 521 |
| `app/layout.tsx` | 4 |
| `app/page.tsx` | 11 |
| `components/CategoryCard.tsx` | 19 |
| `components/HighScoresModal.tsx` | 25 |
| `components/ModeButton.tsx` | 8 |
| `components/game/ClassicGame.tsx` | 100 |
| `components/game/ComparisonBoard.tsx` | 11 |
| `components/game/DecisionControls.tsx` | 6 |
| `components/game/GameCard.tsx` | 51 |
| `components/game/GameplayShell.tsx` | 8 |
| `components/game/GameplayStatus.tsx` | 39 |
| `components/game/TimeAttackGame.tsx` | 117 |
| `components/home/CategorySelector.tsx` | 17 |
| `components/home/DomainSelector.tsx` | 8 |
| `components/home/HomeSetup.tsx` | 65 |

- **Untracked** (feature source + docs + tooling): `.agents/`, `.playwright-mcp/`, `components/atmosphere/`, `components/audio/`, `docs/`, `lib/atmosphere/`, `lib/audio/`, `skills-lock.json`, `types/view-transition.d.ts`.
- The entire atmosphere/audio feature lives in **untracked** directories, so `git diff` does not surface it. The local tree is authoritative.

No file was modified, reverted, or reformatted by this stage.

### 1.2 Confirmed structural facts

- **No `loading.tsx` / `loading.tsx`-equivalent exists anywhere under `app/`** — `Get-ChildItem -Recurse -Path app -Filter loading.*` returned nothing; the full `app/` tree is `app/api/test-fetch/route.ts`, `app/layout.tsx`, `app/page.tsx`, `app/game/layout.tsx`, `app/game/[mode]/page.tsx`, `app/game/classic/page.tsx`, `app/game/time-attack/page.tsx`, `app/globals.css`, `app/favicon.ico`.
- `app/globals.css` is **967 lines**. Three distinct regions:
  - **L1–453** — token block (`:root` L4–70, `@theme inline` L72–77), reset, scrollbar, `.bg-grid`, legacy keyframes (`home-dialog-in/out`, `pulse-ring`, `shimmer`, `fadeInUp`, `fadeInScale`, `orb-float`, `shake`, `timer-urgent`, `floatUp`) and the global `@media (prefers-reduced-motion: reduce)` hard-strip at **L188**.
  - **L455–793** — appended immersive-motion layer: motion tokens (L460–497), new keyframes (L499–561), variant/state classes (L563–662), ambient loops (L664–698), reduced-motion fidelity overrides (L700–735), **route transition `nav-forward`** (L737–793).
  - **L795–967** — appended atmosphere + audio layer: atmo tokens (L804–818), audio control presentation (L820–880), status↔tint (L882–893), `.gameplay-surface` (L895–902), card plate↔field lighting (L923–966).
- `next.config.ts` whitelists remote image hosts only; no experimental flags. `package.json` has **no test framework**, no `loading`-related dependency, `next@16.3.4`, `react@19.2.8`, `motion@^14.1.0`.

---

## 2. Runtime evidence

All numbers below are live Playwright readings against the owner's dev server on 2026-11-22.

### 2.1 Canvas

| Observation | Value |
|---|---|
| `<canvas>` elements in DOM | **1** (`document.querySelectorAll('canvas').length`) |
| Host node | `div[data-atmosphere-host]`, `position: fixed`, `z-0`, `pointer-events-none` ([`AtmosphereBackdrop.tsx:232`](../components/atmosphere/AtmosphereBackdrop.tsx:232)) |
| Canvas CSS size / backing size at 1440×900 | `1435×900` / `1435×900` (DPR 1 ⇒ 1:1) |
| Canvas CSS size at 390×844 | `385×844` |
| `data-atmosphere` / `data-surface` / `data-mode` | `on` / `home`→`gameplay` / `classic` or `time-attack` |
| Loop count | **one** `requestAnimationFrame` chain, self-scheduled in `step()` ([`canvasEngine.ts:664`](../lib/atmosphere/canvasEngine.ts:664)); engine created once and `start()`ed once ([`AtmosphereBackdrop.tsx:73`](../components/atmosphere/AtmosphereBackdrop.tsx:73), [`AtmosphereBackdrop.tsx:94`](../components/atmosphere/AtmosphereBackdrop.tsx:94)). *Source-derived; not instrumented at runtime.* |

**Current particles:** 28 desktop / 12 mobile ([`canvasEngine.ts:29`](../lib/atmosphere/canvasEngine.ts:29)–[`30`](../lib/atmosphere/canvasEngine.ts:30)), low-quality 12 ([`31`](../lib/atmosphere/canvasEngine.ts:31)), 20 % of cap under `lowEnergy` ([`canvasEngine.ts:271`](../lib/atmosphere/canvasEngine.ts:271)). They are **1–2.5 px `fillRect` squares** ([`canvasEngine.ts:257`](../lib/atmosphere/canvasEngine.ts:257)), alpha `0.05–0.18` ([`canvasEngine.ts:258`](../lib/atmosphere/canvasEngine.ts:258)), wrapping around the viewport ([`canvasEngine.ts:477`](../lib/atmosphere/canvasEngine.ts:477)–[`479`](../lib/atmosphere/canvasEngine.ts:479)).

**Draw order** ([`canvasEngine.ts:642`](../lib/atmosphere/canvasEngine.ts:642)–[`660`](../lib/atmosphere/canvasEngine.ts:660)): static tint layer → motes → impulses → vignette → `destination-out` safe bands.

**DPR:** `DPR_CAP = 2` ([`canvasEngine.ts:28`](../lib/atmosphere/canvasEngine.ts:28)); scale applied via `ctx.setTransform(scale,…)` ([`canvasEngine.ts:420`](../lib/atmosphere/canvasEngine.ts:420)). Test browser ran at DPR 1; **DPR 2/3 is `[Not tested]`**.

### 2.2 Text-safe / card-safe bands (measured)

`bakeSafeBands()` ([`canvasEngine.ts:387`](../lib/atmosphere/canvasEngine.ts:387)–[`398`](../lib/atmosphere/canvasEngine.ts:398)) erases three rectangles on the **gameplay** surface only:

- header band `0 … 116` px
- half of `statusBand` (`min(cssH*0.16, 140)`), i.e. `116 … 128` at 900 px height
- control band `cssH − min(cssH*0.24, 208) … cssH`, i.e. `692 … 900` at 900 px height

Confirmed by sampling canvas alpha at Time Attack 1440×900: `y=100 → alpha 0`, `y=126 → alpha 0`, `y=132 → alpha 25`, `y=690 → alpha 32`, `y=700 → alpha 0`.

**Home has no safe bands** (`if (surface !== "gameplay") return` — [`canvasEngine.ts:390`](../lib/atmosphere/canvasEngine.ts:390)); alpha is non-zero across the entire Home viewport (grid sample: `792/792` probe points non-zero, `maxAlpha 79`).

There is **no card-safe rect**: the two comparison cards sit inside the painted band `128 … 692` and the field is painted behind them, i.e. only the card's own opacity hides it.

### 2.3 Gameplay recession

`fieldAlpha` targets: playing 1, revealing 0.8, modal 0.55, game-over 0.75, low-energy 0.35 ([`canvasEngine.ts:37`](../lib/atmosphere/canvasEngine.ts:37)–[`41`](../lib/atmosphere/canvasEngine.ts:41), [`704`](../lib/atmosphere/canvasEngine.ts:704)–[`713`](../lib/atmosphere/canvasEngine.ts:713)).

### 2.4 Geometry (measured)

**Home — 1440×900**

| Element | x, y | w×h |
|---|---|---|
| hero `<section>` | 56, 0 | 1323×**900** (exactly one viewport) |
| `#setup` (`scroll-mt-4`) | 56, **900** | 1323×516 |
| └ domain `<fieldset>` | 56, 900 | 1323×205 |
| └ category `<section>` | 56, 1105 | 1323×311 |
| mode `<section>` | 56, 1416 | 1323×329 |
| "Ready?" `<section>` | 56, 1745 | 1323×448 |
| `.home-go` (176×176) | 630, **1889** | 176×176 |
| `.audio-surface` | 1195, 20 | 44×44 |
| document | — | 1435×**2242** |
| `#setup`→"Ready?" bottom span | — | **1293 px (1.44 viewports)** |

**Home — 390×844**

| Element | y | w×h |
|---|---|---|
| hero | 0 | 353×**844** |
| `#setup` (offsetTop **844**) | 844 | 353×757 |
| └ domain group | 996 | 353×164 |
| └ category group | 1234 | 353×335 |
| "Ready?" section | 2105 | 353×336 |
| `.home-go` (144×144) | 2201 | 144×144 |
| `Start Comparing` CTA | 511 | 195×44 |
| document | — | 385×**2489** |

**The measured consequence that drives §6:** after clicking `Start Comparing` the page settles at `scrollY 828` (mobile) and the primary `go!` button is still **529 px below the fold** (`go.top 1373`). At desktop the same click lands `#setup` at the viewport top (`scrollY 884`) and `go!` sits at `y 1005`, i.e. **105 px below** a 900 px viewport. Start Comparing never reveals the action it promises.

**Gameplay — 1440×900**

| Case | header | board | doc |
|---|---|---|---|
| Classic | `0,0` 1440×**90** | 0,90 1440×634 | 1440×**900** |
| Time Attack | `0,0` 1435×**138** | 0,138 1435×664 | 1435×**954** |

Classic at 1440: cards `432×558` @ (156,194) and `432×542` @ (852,146); OR badge `88×88` @ (676,363); Higher `283×54` @ (919,724); Lower `283×54` @ (919,790); status cluster `116×40` @ (1300,24); audio control 44×44 @ (1240,22).

Time Attack at 1440: timer `37×36` @ (24,88); progress bar `1334×12` @ (77,100).

**Gameplay — 390×844 (Time Attack, animated, not urgent):** header 138; board `385×1030`; current card 353×481 @ y178; next card 353×453 @ y691; **Higher `283×54` @ y1168 and Lower @ y1234 — both below an 844 px viewport**; document `385×1320`; `scrollWidth === viewport` (no horizontal overflow). Classic at 390 measured `docH 1252` on a cold client navigation, matching the owner invariant recorded in postfix2/3.

### 2.5 Sticky / fixed inventory

Only **one** fixed element exists on Home: the atmosphere host ([`AtmosphereBackdrop.tsx:235`](../components/atmosphere/AtmosphereBackdrop.tsx:235)). No `position: sticky` anywhere. The Home header is `absolute` ([`HomeSetup.tsx:198`](../components/home/HomeSetup.tsx:198)), so it scrolls away with the hero — a new bottom dock cannot collide with it.

The gameplay audio popover is `position: fixed` while open ([`AudioSurface.tsx:196`](../components/audio/AudioSurface.tsx:196)) and the game-over overlay is `absolute inset-0` inside the shell ([`ClassicGame.tsx:404`](../components/game/ClassicGame.tsx:404)).

### 2.6 Route transition and double-animation surface

- Instrumented `document.startViewTransition`: **exactly 1 call** per Home→gameplay navigation (`counts.calls: 1`). Support `true`.
- `nav-forward` is the only transition type in play, applied at [`app/page.tsx:9`](../app/page.tsx:9)–[`16`](../app/page.tsx:16) and [`app/game/[mode]/page.tsx:49`](../app/game/[mode]/page.tsx:49)–[`75`](../app/game/[mode]/page.tsx:75), pushed from [`HomeSetup.tsx:168`](../components/home/HomeSetup.tsx:168).
- CSS: `::view-transition-old(.nav-forward)` = `route-fade-out` over `--motion-dur-quick` (140 ms); `::view-transition-new(.nav-forward)` = **`route-rise-in` 220 ms with `translateY(8px)`** ([`globals.css:745`](../app/globals.css:745)–[`751`](../app/globals.css:751)). So the **whole incoming page currently rises 8 px and fades**.
- `::view-transition { pointer-events: none }` is already present ([`globals.css:741`](../app/globals.css:741)), matching the Next guide's "Keeping the page interactive" recipe (`node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`, "Keeping the page interactive").
- **First-mount card animation is deliberately absent:** `enterHandoff` is `currentItem?.id !== openingItemId` — false on first paint ([`ClassicGame.tsx:112`](../components/game/ClassicGame.tsx:112)–[`113`](../components/game/ClassicGame.tsx:113); [`TimeAttackGame.tsx:129`](../components/game/TimeAttackGame.tsx:129)–[`130`](../components/game/TimeAttackGame.tsx:130); consumed at [`GameCard.tsx:66`](../components/game/GameCard.tsx:66)–[`77`](../components/game/GameCard.tsx:77)).
- **No `loading.tsx` ⇒ no Suspense fallback stage.** Measured locally: click `go!` → `[data-gameplay-mode]` present in **90 ms** (already-visited category) and **121 ms** (first visit to `category=release-date`), with the `_rsc` request itself taking **49 ms**. This is a warm local dev server; the figure is `[environment-specific]` and says nothing about a cold production hop.

### 2.7 Reduced motion

`emulateMedia({ reducedMotion: 'reduce' })` + fresh load at 390×844:

| Check | Result |
|---|---|
| `matchMedia` | `true` |
| `document.getAnimations()` | **0** |
| Canvas signature sampled twice 900 ms apart | **identical** (`sum 12864` both times) — static frame confirmed |
| Canvas tint | correct preselected Classic (`data-mode "classic"`) |
| Console | **1 error** — React hydration attribute mismatch |

The hydration error is the pre-existing postfix2 F-6 item, and this run identifies its cause precisely: under reduced motion `heroEntrance` becomes `initial: false` ([`HomeSetup.tsx:172`](../components/home/HomeSetup.tsx:172)–[`174`](../components/home/HomeSetup.tsx:174)), so the client renders `opacity: 1; translateY(0)` while the server markup carries `opacity: "0"; translateY(8px)`. **Any new entrance choreography must not introduce the same server/client branch.**

### 2.8 Event bus / reactive plumbing (source-confirmed)

| Fact | Evidence |
|---|---|
| Single module-level bus, ≤ 8 subscribers, snapshot iteration, `emit` never throws | [`eventBus.ts:13`](../lib/atmosphere/eventBus.ts:13), [`37`](../lib/atmosphere/eventBus.ts:37)–[`48`](../lib/atmosphere/eventBus.ts:48) |
| Guess origin resolved from the real control, `.home-go` class ⇒ `target: "go"` | [`delegation.ts:120`](../lib/atmosphere/delegation.ts:120), [`originFor` L64–70](../lib/atmosphere/delegation.ts:64) |
| Only `Enter`/`Space` are treated as activation keys; arrows/`h`/`l` are emitted semantically, not by the classifier | [`delegation.ts:23`](../lib/atmosphere/delegation.ts:23) |
| Keyboard `ArrowUp`/`h` and `ArrowDown`/`l` go through the **same** `handleGuess` as the buttons | [`ClassicGame.tsx:276`](../components/game/ClassicGame.tsx:276)–[`292`](../components/game/ClassicGame.tsx:292); [`TimeAttackGame.tsx:370`](../components/game/TimeAttackGame.tsx:370)–[`386`](../components/game/TimeAttackGame.tsx:386) |
| `guess` event carries `direction` + origin rect, emitted before the phase change | [`ClassicGame.tsx:201`](../components/game/ClassicGame.tsx:201)–[`209`](../components/game/ClassicGame.tsx:209) |
| `reveal` event carries `correct`, **`tier`**, and the status-cluster origin | [`ClassicGame.tsx:211`](../components/game/ClassicGame.tsx:211)–[`219`](../components/game/ClassicGame.tsx:219); [`delegation.ts:46`](../lib/atmosphere/delegation.ts:46)–[`57`](../lib/atmosphere/delegation.ts:57) |
| Tier ladder t1–t4 resolver (display-only) | [`ClassicGame.tsx:61`](../components/game/ClassicGame.tsx:61)–[`67`](../components/game/ClassicGame.tsx:67); [`TimeAttackGame.tsx:69`](../components/game/TimeAttackGame.tsx:69)–[`75`](../components/game/TimeAttackGame.tsx:75) |
| Engine already maps guess direction → `updraft`/`downdraft`, correct → `land` + `tier`, wrong → `fracture` | [`canvasEngine.ts:868`](../lib/atmosphere/canvasEngine.ts:868)–[`881`](../lib/atmosphere/canvasEngine.ts:868), [`882`](../lib/atmosphere/canvasEngine.ts:882)–[`909`](../lib/atmosphere/canvasEngine.ts:882) |
| `data-guess`, `data-tier`, `data-phase`, `data-modal` written by the backdrop | [`AtmosphereBackdrop.tsx:121`](../components/atmosphere/AtmosphereBackdrop.tsx:121)–[`149`](../components/atmosphere/AtmosphereBackdrop.tsx:121) |
| `launch` cue exists (filtered-noise whoosh, 400→3000 Hz, peak 0.1) | [`soundMap.ts:167`](../lib/audio/soundMap.ts:167)–[`170`](../lib/audio/soundMap.ts:167) |
| `launch` impulse (contract → expand) already fires for `target: "go"` | [`canvasEngine.ts:756`](../lib/atmosphere/canvasEngine.ts:756)–[`769`](../lib/atmosphere/canvasEngine.ts:756) |

**Runtime confirmation of the guess path:** a click on `Higher` produced `data-guess "higher"`, `data-phase "game-over"` after the 1500 ms reveal ([`ClassicGame.tsx:259`](../components/game/ClassicGame.tsx:259)), `data-tier "0"`, decision buttons removed from the DOM (game-over), and `[role="status"]` text `Incorrect`.

---

## 3. Idle sprite architecture (proposal)

The goal is to replace 1–2.5 px `fillRect` dots with **pre-rendered, offscreen-cached sprites** that are visually readable but cost one `drawImage` each, and add a **stacked-chevron** motif that can later carry the reactive state.

### 3.1 Why offscreen caching is the correct primitive

- MDN, *Optimizing canvas*: "If you find yourself repeating some of the same drawing operations on each animation frame, consider offloading them to an offscreen canvas"; also "Avoid floating-point coordinates and use integers instead", "Don't scale images in `drawImage`" (cache the sizes), "Avoid the `shadowBlur` property whenever possible".
- web.dev, *Improving HTML5 Canvas performance*: pre-rendering gains collapse if the offscreen canvas is oversized — "it's important to make sure that your temporary canvas fits snugly around the image you are drawing".
- The current engine already obeys the "no `shadowBlur`, no `filter`, no per-frame gradient" discipline ([`canvasEngine.ts:13`](../lib/atmosphere/canvasEngine.ts:13)–[`15`](../lib/atmosphere/canvasEngine.ts:13)); sprite caching extends that contract rather than breaking it.

### 3.2 Sprite set (exact specification)

All sprites are baked **once at init and once per resize/DPR change** (outside the loop), at device resolution, with the same `scale` that `resize()` already computes ([`canvasEngine.ts:407`](../lib/atmosphere/canvasEngine.ts:407)–[`423`](../lib/atmosphere/canvasEngine.ts:423)).

**Spark sprites — 3 colours × 2 depth sizes = 6 canvases**

| Colour | Token | Hex | Purpose |
|---|---|---|---|
| white | `--border-strong` | `#ffffff` | neutral depth dust, highest luminance |
| cyan | `--accent-action-higher` | `#22d3ee` | "up" family, higher-correct surge |
| magenta | `--accent-time-attack` | `#d93fd0` | "down" family, lower-correct surge |

| Size class | Snug offscreen canvas | Drawn at |
|---|---|---|
| near (`z = 1`) | `14 × 14` CSS px → `14·scale` device px | `drawImage(sprite, x, y)` 1:1 |
| far (`z = 0.5`) | `8 × 8` CSS px → `8·scale` device px | `drawImage(sprite, x, y)` 1:1 |

Each spark is a 4-point star: a filled circle of radius `r` plus two 1-px crosshair arms at 60 % alpha of the body, anti-aliased by the bake, not per frame. No `shadowBlur` — the "glow" is a second, larger, low-alpha radial disc **baked into the same sprite** at ≤ 18 % alpha.

**Chevron sprites — 2 canvases (up = cyan, down = magenta)**

| Sprite | Snug canvas | Composition |
|---|---|---|
| `chevronUp` | `20 × 26` CSS px | **three** stacked chevrons, each a 2-px stroke `⌃`, vertical step 8 px, alphas `0.95 / 0.55 / 0.28` top→bottom so the stack reads as a directional smear |
| `chevronDown` | `20 × 26` CSS px | the same three strokes mirrored, alphas `0.95 / 0.55 / 0.28` |

Two extra **highlight variants** (`chevronUpHot`, `chevronDownHot`) are baked at 100 % stroke alpha with a 1-px white core, so the reactive surge (§4) is a sprite swap, not a per-frame alpha ramp over a path.

All coordinates are rounded with `Math.round` before `drawImage` (MDN, integer coordinates).

### 3.3 Counts, planes, drift, opacity

| Setting | Desktop | Mobile | Low-quality | `lowEnergy` |
|---|---|---|---|---|
| sprites (dust) | **28** | **12** | **12** | `max(4, 20 %)` |
| chevrons | **10** | **6** | **6** | `max(2, 40 %)` |
| chevron refresh | sampled every frame (free) | same | same | same |

- **Depth planes:** two, `near` (z = 1, larger sprite, alpha `0.10–0.18`, speed 3–6) and `far` (z = 0.5, small sprite, alpha `0.05–0.10`, speed 1–3). This preserves the existing `near = index % 2 === 1` distribution ([`canvasEngine.ts:251`](../lib/atmosphere/canvasEngine.ts:251)).
- **Drift:** keep the deterministic wrap already in `drawMotes` ([`canvasEngine.ts:477`](../lib/atmosphere/canvasEngine.ts:477)–[`479`](../lib/atmosphere/canvasEngine.ts:479)) — position is a pure function of `time`, so there is no state to update and nothing to allocate. Chevrons drift **up** (`-y`) at 4–9 px/s for `chevronUp`, **down** for `chevronDown`, wrapping at `-26` / `cssH + 26`.
- **Opacity:** `mote.alpha × breathe × fieldAlpha`, exactly as today ([`canvasEngine.ts:480`](../lib/atmosphere/canvasEngine.ts:480)–[`484`](../lib/atmosphere/canvasEngine.ts:480)); chevrons carry a static per-sprite alpha of `0.16–0.26` so they read as field texture rather than UI.
- **Spawn/respawn:** no object churn. A single seeded array (`makeRandom(20261122)`, [`canvasEngine.ts:142`](../lib/atmosphere/canvasEngine.ts:142)–[`148`](../lib/atmosphere/canvasEngine.ts:142)) sized to the desktop maximum; mobile/low-quality simply iterate fewer entries, as `activeMoteCount()` already does ([`canvasEngine.ts:269`](../lib/atmosphere/canvasEngine.ts:269)–[`272`](../lib/atmosphere/canvasEngine.ts:269)).
- **Parallax:** reuse `Math.max(-96, Math.min(96, scrollY * 0.06))` multiplied by `mote.z` ([`canvasEngine.ts:468`](../lib/atmosphere/canvasEngine.ts:468), [`478`](../lib/atmosphere/canvasEngine.ts:478)). Chevrons use `z = 1.15` so they lead the dust slightly on Home.

### 3.4 Text-safe and card-safe clipping

The sprites must never sit behind readable text or behind a card *unless that is the intent*. Two layers of protection:

1. **Keep the existing `destination-out` safe bands** for gameplay ([`canvasEngine.ts:387`](../lib/atmosphere/canvasEngine.ts:387)–[`398`](../lib/atmosphere/canvasEngine.ts:387)). Because the bands are baked into `safeLayer` and blitted at ([`658`](../lib/atmosphere/canvasEngine.ts:658)), sprites drawn *before* that blit are erased by it automatically — no per-sprite branch.
2. **Add a card-safe rect set**, populated once per surface change and on resize from `[data-atmo-safe]` elements rather than per frame:
   - `section[aria-label="Higher or lower comparison"] article[aria-label]` → 2 rects (both cards)
   - the OR badge (the `div` whose text is `OR`, [`ComparisonBoard.tsx:41`](../components/game/ComparisonBoard.tsx:41))
   - header, status cluster, decision row (already covered by the bands)

   The engine receives these as a `Rect[]` and punches them into `safeLayer` with the same `destination-out` path. **The DOM read happens at bake time only** — consistent with the file's stated discipline "no `getComputedStyle`, no DOM reads" inside the loop ([`canvasEngine.ts:13`](../lib/atmosphere/canvasEngine.ts:13)).

   > Consequence to accept: sprites are *erased* behind the cards (a hard edge at the card border). The alternative — letting sprites pass behind the 84 %-opaque shell and the card's solid face — is a no-op visually (§5), so erasing is both cheaper and more honest.

**Home** keeps zero bands but gains one: the hero wordmark block and the `Start Comparing` CTA. Measured alpha is non-zero everywhere on Home today (§2.2), so adding sprites without a Home band would put texture behind the wordmark's `text-shadow` offsets, hurting the hero. Recommend a single Home band around the hero `motion.div` (measured `1323×~330` at 1440, `353×~430` at 390).

### 3.5 Reduced motion

`start()` already short-circuits to a single `drawFrame()` when `reducedMotion` is true ([`canvasEngine.ts:689`](../lib/atmosphere/canvasEngine.ts:689)–[`692`](../lib/atmosphere/canvasEngine.ts:689)), and `resize`/`setSurface`/`setLowEnergy` each repaint once ([`422`](../lib/atmosphere/canvasEngine.ts:422), [`1035`](../lib/atmosphere/canvasEngine.ts:1035), [`1053`](../lib/atmosphere/canvasEngine.ts:1053)).

With sprites this stays correct **if and only if** every sprite position is a pure function of `time`, and under reduced motion `time` is frozen (it already is — the loop never advances `elapsed`). Result: a **single static composed frame** containing dust and chevrons at their seeded positions, no drift, no breathe. Reactive highlights must then be expressed as **static** brightness steps (draw the `Hot` sprite for the winning direction and the base sprite for the losing one, both frozen) rather than a ramp.

### 3.6 One canvas / one rAF invariant

- Sprites are `HTMLCanvasElement`s created with `document.createElement("canvas")` and never appended — same pattern as `staticLayer`/`vignetteLayer`/`safeLayer` ([`canvasEngine.ts:185`](../lib/atmosphere/canvasEngine.ts:185)–[`187`](../lib/atmosphere/canvasEngine.ts:185)). `document.querySelectorAll('canvas').length` stays **1** (measured today).
- No second `requestAnimationFrame`, no timer, no `IntersectionObserver` inside the engine.

---

## 4. Reactive gameplay behaviour (proposal)

### 4.1 The three beats

| Beat | Trigger (existing, no new wiring) | Field response |
|---|---|---|
| **Higher-correct** | `guess` with `direction: "higher"` ([`ClassicGame.tsx:205`](../components/game/ClassicGame.tsx:205)), then `reveal` with `correct: true` | Up-chevrons switch to `chevronUpHot` for **360 ms**, get a **+6 px upward offset** for the same window, and their alpha target rises from `0.20` to `0.62`; down-chevrons drop to `0.08` alpha and are *not* offset. Dust on the `near` plane inherits a `0.35` upward `dirY` bias for the same 360 ms. |
| **Lower-correct** | symmetric | Down-chevrons to `chevronDownHot`, −6 px downward offset, alpha `0.20 → 0.62`; up-chevrons recede to `0.08`. |
| **Wrong** | `reveal` with `correct: false` | **One** fixed pulse: all chevrons drop to `0.05` for **180 ms** and the whole field takes a single `+3 %` white lift for **80 ms**, then returns. Direction is not signalled. |

### 4.2 Non-escalation is a hard rule

The wrong beat is **identical on the 1st and the 20th miss** — one 180 ms recession, one 80 ms lift, no scale, no repeat, no accumulation. The correct beat is also a **constant** 360 ms; the tier does **not** lengthen or intensify it. Tier only selects an already-existing discrete accent (see 4.3), so a long streak cannot compound into a strobe.

### 4.3 Sync to the reveal beat and t1–t4

The reveal already lands on the display beat, and the tier is already computed before the emit:

- Classic: `reveal` is emitted inside `handleGuess` with `tier: resolveTier(prospectiveScore, …)` ([`ClassicGame.tsx:211`](../components/game/ClassicGame.tsx:211)–[`219`](../components/game/ClassicGame.tsx:219)); the phase becomes `revealing` on the same commit ([`221`](../components/game/ClassicGame.tsx:221)).
- Time Attack: same shape ([`TimeAttackGame.tsx:287`](../components/game/TimeAttackGame.tsx:287)–[`295`](../components/game/TimeAttackGame.tsx:295)).

Proposed mapping (display-only, no gameplay timing touched):

| Tier | Extra field accent | Duration |
|---|---|---|
| 0 | none (just the 360 ms directional surge) | 360 ms |
| 1 | 1 extra chevron pair joins the surge (sprite pool, pre-seeded) | 360 ms |
| 2 | 2 extra pairs | 360 ms |
| 3 | 2 pairs + the existing `tier` ring ([`canvasEngine.ts:448`](../lib/atmosphere/canvasEngine.ts:448)–[`462`](../lib/atmosphere/canvasEngine.ts:448)) | 420 ms (existing) |
| 4 | 3 pairs + ring + the existing single-frame 4 % lift ([`canvasEngine.ts:627`](../lib/atmosphere/canvasEngine.ts:627)–[`632`](../lib/atmosphere/canvasEngine.ts:627)) | 520 ms (existing) |

Because the extra pairs are *pre-seeded sprites* that were already drifting at low alpha, "joining the surge" is a sprite swap plus an alpha target on existing entries — **zero allocation**, and the pool never grows.

### 4.4 Pointer + keyboard parity

Both the pointer path (`onClick` → `handleGuess`, [`DecisionControls.tsx:36`](../components/game/DecisionControls.tsx:36)) and the keyboard path (`keydown` → `handleGuess`, [`ClassicGame.tsx:279`](../components/game/ClassicGame.tsx:279)–[`288`](../components/game/ClassicGame.tsx:279)) emit the *same* `guess`/`reveal` events. The engine therefore reacts identically; the only difference is the `source` field, which the proposal **ignores** (no reduced response for keyboard, no extra flourish for pointer). This matches the existing parity contract in the delegation header ([`delegation.ts:9`](../lib/atmosphere/delegation.ts:9)–[`13`](../lib/atmosphere/delegation.ts:9)).

### 4.5 No gameplay timing change

Every item above is render-only. The reveal windows (`1500 ms` Classic [`ClassicGame.tsx:259`](../components/game/ClassicGame.tsx:259); `800/400 ms` Time Attack [`TimeAttackGame.tsx:56`](../components/game/TimeAttackGame.tsx:56)–[`57`](../components/game/TimeAttackGame.tsx:57)) and the timer cadence ([`TimeAttackGame.tsx:203`](../components/game/TimeAttackGame.tsx:203)) are untouched. The reactive window (360 ms) is shorter than the shortest reveal (400 ms) by construction, so it always resolves before the next beat.

---

## 5. Mode gradient / show-through audit

### 5.1 The measurement that matters

`.gameplay-surface` is `color-mix(in srgb, var(--surface-background) 84%, transparent)` ([`globals.css:899`](../app/globals.css:899)–[`902`](../app/globals.css:899)). Computed at runtime: `color(srgb 0.0823529 0.0705882 0.168627 / 0.84)`.

Compositing the canvas through it (canvas → body `#15122b` → 84 % shell):

| Probe (Classic 1440) | canvas RGBA | after canvas over body | after 84 % shell | **delta vs plain `#15122b`** |
|---|---|---|---|---|
| centre of board | `106, 85, 212, 24` | `29, 24, 59` | `22, 19, 46` | **+1.3, +1.0, +2.5 / 255** |
| near board edge | `70, 58, 174, 22` | `25, 21, 54` | `22, 19, 45` | **+0.7, +0.6, +1.8 / 255** |

Time Attack centre tint is `208, 57, 208` at alpha 25–32 — the same arithmetic applies.

**Conclusion:** at 84 % the field is, for practical purposes, **not visible behind gameplay**. Roughly 1 % of the tint survives. The current "16 % show-through" reads as a flat navy panel; any sprite that is not dramatically brighter than today's motes will be invisible there too. This is the single most important finding for the sprite work: **raising sprite luminance inside a 84 % shell is not enough — the shell has to change, or the sprites must be drawn *outside* the shell.**

### 5.2 Recommended scrim strategy

Two changes, in order of preference:

1. **Radial scrim instead of a flat 84 % fill.** Replace the single `background-color` with a `background-image` that is 84 %-opaque in the centre column (behind cards + text) and fades to ~62 % in the outer gutters:
   `radial-gradient(120% 90% at 50% 45%, rgba(21,18,43,0.86) 0%, rgba(21,18,43,0.78) 55%, rgba(21,18,43,0.60) 100%)` over the solid `var(--surface-background)` fallback. At 62 % the composite delta becomes ≈ **+4 %, +3 %, +8 %/255** — still subtle, but the chevrons become *perceptible* in the gutters where the design has no text. Keep 84 %+ in the card column so card contrast is unchanged.
2. **Keep the mode accent as a *tint*, not a wash.** Classic `#6355cb` and Time Attack `#d93fd0` are already baked into the field at `--atmo-tint-alpha` 0.08 ([`canvasEngine.ts:328`](../lib/atmosphere/canvasEngine.ts:328)). Under a radial scrim the accent difference between modes becomes visible in the gutters for the first time; no additional per-mode CSS is needed.

> Perceptual acceptance of either setting is `Needs Verification [product-decision]` — it must be judged in a browser by the owner, not inferred from the numbers.

### 5.3 WCAG contrast (measured against `#15122b`)

| Pair | Ratio | AA normal (4.5) | AA large (3.0) |
|---|---|---|---|
| `#ffffff` on base | **18.21** | pass | pass |
| `#d4ceff` (`--text-secondary`) on base | **12.20** | pass | pass |
| `#aaa3d5` (`--text-muted`) on base | **7.72** | pass | pass |
| `#22d3ee` (focus ring) on base | **10.08** | pass | pass |
| `#ffcc00` (highlight) on base | **12.04** | pass | pass |
| `#f05ac7` (status-error) on base | **6.06** | pass | pass |
| `#d93fd0` (Time Attack accent) on base | **4.83** | pass | pass |
| **`#6355cb` (Classic accent) on base** | **3.20** | **FAIL** | pass |
| **white on `#d93fd0`** (Lower button, 14–16 px bold) | **3.77** | **FAIL** | pass |
| `#15122b` on `#22d3ee` (Higher button) | 10.08 | pass | pass |
| `#121212` on `#d93fd0` (`go!`) | 4.97 | pass | pass |
| white on `#211d3a` (raised) | 16.14 | pass | pass |

**Findings (pre-existing, recorded not repaired):**

- **Classic `#6355cb` cannot carry normal-size text.** Any new UI in Classic tint (a loading skeleton's title, a dock accent line, a chip) must not use `#6355cb` as a text/background-on-text colour at < 18.66 px bold.
- **The Lower decision button (`white` on `#d93fd0`, `text-sm`→`text-base` bold) measures 3.77:1**, i.e. it fails AA normal text but clears AA large by a margin that depends on the effective rendered size ([`DecisionControls.tsx:48`](../components/game/DecisionControls.tsx:48)). This is an existing condition, not introduced here; flagged for the owner.
- **Focus rings:** `#22d3ee` on `#15122b` is 10.08:1 (pass). The ring's contrast **against the surface it sits on** (`#d93fd0` button faces, white card borders) was **not measured** — `[Not tested]`.

---

## 6. Loading state and first-mount entrance

### 6.1 What the framework actually does here

From the locally installed Next 16 docs (`node_modules/next/dist/docs/`), which AGENTS.md makes authoritative:

- `01-app/03-api-reference/03-file-conventions/loading.md` — the fallback is **prefetched**, navigation becomes immediate, navigation stays interruptible, and shared layouts remain interactive.
- `01-app/02-guides/view-transitions.md` — "*If the destination suspends into a fallback first, no pair forms, and the content animates with its enter animation instead when it arrives*", and the loading-state recipe wraps the **fallback** in one `ViewTransition` (exit) and the **content** in another (enter), with `default="none"` on both.
- Same guide, "Keeping the page interactive": the `::view-transition` overlay captures pointer events unless `pointer-events: none` — already applied ([`globals.css:741`](../app/globals.css:741)).
- Same guide, "Respecting reduced motion": disabling `animation-duration` on `::view-transition-old/new/group` is the simple correct default; the project already implements the refined variant (fade kept, rise dropped) at [`globals.css:780`](../app/globals.css:780)–[`793`](../app/globals.css:793).

**Implication:** adding `app/game/[mode]/loading.tsx` introduces a *second* transition stage. The page's `<ViewTransition enter={{ "nav-forward": "nav-forward" }}>` ([`app/game/[mode]/page.tsx:49`](../app/game/[mode]/page.tsx:49)) would then run once for the fallback and again for the real content unless the fallback is explicitly `default="none"` and the content's enter class is scoped.

### 6.2 Recommendation

**Default: ship the entrance, not the skeleton.**

1. **Do not add `loading.tsx` in this pass.** Measured click→shell is 90–121 ms warm (`[environment-specific]`); a skeleton that flashes for < 120 ms is a *regression* in perceived quality (a flash of placeholder), and it adds a second transition stage whose coordination cost is higher than its benefit at current latency.
2. **Remove the 8 px rise from the route transition** and keep it as an opacity crossfade: `::view-transition-new(.nav-forward)` → `route-fade-in` 140 ms instead of `route-rise-in` 220 ms ([`globals.css:749`](../app/globals.css:749)–[`751`](../app/globals.css:749)). Rationale: the route already moves the *whole page*; a content entrance underneath it would double the vertical displacement (see 6.3).
3. **Add the first-mount entrance as content motion** (`components/game/GameplayEntrance.tsx`, one client wrapper used by both modes), because the content is what the player is waiting to read.

**Alternative (only if the owner wants a skeleton): `app/game/[mode]/loading.tsx` that renders *only* the shell silhouette** — opaque header bar (90 px Classic / 138 px Time Attack), two `aspect-square` card plates with the offset-shadow language ([`GameCard.tsx:85`](../components/game/GameCard.tsx:85)–[`89`](../components/game/GameCard.tsx:89)), the OR badge, and two pill controls — with **no** `ViewTransition` enter class on the fallback, so `nav-forward` fires once. Its own entrance is opacity-only. It also has to reserve exact height or it becomes a CLS source.

### 6.3 Entrance choreography (≤ 380 ms, transform + opacity only)

| Order | Element | From → to | Duration | Delay |
|---|---|---|---|---|
| 0 | shell / header | **no motion** (already visible) | — | — |
| 1 | current + next card pair | `opacity 0→1`, `translateY 10px→0` (current) / `-10px→0` (next) | 260 ms | `0 ms` / `40 ms` |
| 2 | OR badge | `opacity 0→1`, `scale 0.96→1` | 200 ms | `120 ms` |
| 3 | status tally | `opacity 0→1` only | 160 ms | `200 ms` |
| 4 | decision row | `opacity 0→1`, `translateY 6px→0` | 220 ms | `240 ms` |
| — | **total** | | | **≤ 460 ms wall clock; last transform settles at 380 ms** |

Constraints, all evidence-backed:

- **Transform + opacity only** — no `height`, `margin`, `filter`, no `shadowBlur`; the guide's own recipes animate `opacity`/`transform` only.
- **Zero layout shift:** every animated element already occupies its final box at first paint; only compositor properties change. Baseline CLS from postfix2's full Classic playthrough was **0.00053** ([`procedural-canvas-audio-postfix2-qa-2026-11-22.md`](./procedural-canvas-audio-postfix2-qa-2026-11-22.md) §6/G4); the entrance must not add flow changes, so this figure must hold.
- **No input blocking:** buttons are real, enabled `<button>`s from frame 1; `opacity` does not affect hit-testing, and `pointer-events` is never disabled.
- **Reduced motion: opacity-only, no movement** — and critically **no server/client branch**. The current reduced-motion hero bug (§2.7) is caused by exactly that branch ([`HomeSetup.tsx:172`](../components/home/HomeSetup.tsx:172)). The safe pattern is a CSS-only gate: render identical markup, and let `@media (prefers-reduced-motion: reduce)` override the keyframes to `opacity` only (the file already does this for `.value-land`/`.row-cascade` at [`globals.css:705`](../app/globals.css:705)–[`735`](../app/globals.css:705)).
- **Do not alter the game-over entrance.** The game-over path is a separate overlay with its own focus trap ([`ClassicGame.tsx:382`](../components/game/ClassicGame.tsx:382)–[`404`](../components/game/ClassicGame.tsx:404)); the entrance wrapper must exclude it (mount it around the board/status/controls, not around the dialog).
- **Must not collide with the in-round handoff.** `enterHandoff` already suppresses first-paint card animation ([`GameCard.tsx:66`](../components/game/GameCard.tsx:66)); the new entrance is a *container* animation, so `GameCard`'s own `initial`/`animate` must be left exactly as-is to avoid two motions on the same node.

### 6.4 Double-animation risks (enumerated)

| # | Risk | Evidence | Mitigation |
|---|---|---|---|
| D1 | Route `route-rise-in` (8 px, 220 ms) **stacks** with the new card entrance (10 px, 260 ms) on the same first frame | [`globals.css:749`](../app/globals.css:749) + proposed §6.3 | Change the route-new animation to opacity-only (6.2 step 2) |
| D2 | `loading.tsx` fallback enter + content enter = two `nav-forward` runs | Next guide, "Animate loading states" (fallback suspends ⇒ content uses its own enter) | Only ship `loading.tsx` with `default="none"` fallback and a single scoped enter |
| D3 | Entrance wrapper + `GameCard` handoff both animate the card node | [`GameCard.tsx:66`](../components/game/GameCard.tsx:66)–[`77`](../components/game/GameCard.tsx:77) | Animate a parent wrapper; leave `GameCard` untouched; gate on `enterHandoff` |
| D4 | Entrance + reveal tint on the same node | [`GameCard.tsx:109`](../components/game/GameCard.tsx:109)–[`121`](../components/game/GameCard.tsx:121) | Entrance completes ≤ 380 ms; a guess cannot land before the player has read the cards |
| D5 | Reduced-motion branch re-creates the hydration mismatch | [`HomeSetup.tsx:172`](../components/home/HomeSetup.tsx:172); measured console error §2.7 | CSS-only gate, identical SSR markup |

---

## 7. Scroll-free Go comparison

### 7.1 The problem, quantified

| Viewport | After `Start Comparing` | `go!` position | Gap to fold |
|---|---|---|---|
| 390×844 | `scrollY 828` | `top 1373` | **529 px below** |
| 1440×900 | `scrollY 884` | `y 1005` | **105 px below** |

Additionally on mobile gameplay the decision controls are already below the fold (`y 1168`/`1234` in an 844 px viewport), so *vertical reachability* is an existing, systemic issue — not new to Home.

### 7.2 Option 1 — sticky compact launch dock

**Behaviour:** a fixed bottom bar, shown when `#setup` is intersecting the viewport **and** the real `.home-go` is not. Content: current Category name, current Mode name, and a `GO!` button. Hides as soon as `.home-go` becomes visible (no duplicate CTA on screen). Height ≈ 72 px + `env(safe-area-inset-bottom)`.

**Implementation cost:** low and additive.
- The single `IntersectionObserver` already observes `goButtonRef` ([`HomeSetup.tsx:98`](../components/home/HomeSetup.tsx:98)–[`99`](../components/home/HomeSetup.tsx:99)) and already computes a tri-state `ambient` value from `hero`/`cta` visibility ([`HomeSetup.tsx:86`](../components/home/HomeSetup.tsx:86)–[`97`](../components/home/HomeSetup.tsx:86)). Extending it to also track `setupRef` is a matter of one more `observe()` call and one more boolean; **no second observer**.
- The dock's button calls the **existing** `startGame()` ([`HomeSetup.tsx:157`](../components/home/HomeSetup.tsx:157)–[`170`](../components/home/HomeSetup.tsx:170)), so it inherits for free:
  - the same `route` event with `intent: "forward"` (canvas reset + launch impulse),
  - `transitionTypes: ["nav-forward"]` (one ViewTransition, verified count = 1),
  - the same `launch` SFX.
- To get the canvas `launch` impulse anchored on the *dock* rather than nowhere, the dock button must be classified as `target: "go"`. Today that requires the `home-go` class ([`delegation.ts:120`](../lib/atmosphere/delegation.ts:120)) or a `resolveTarget` extension. **Reusing `className="… home-go"` is the zero-change path**; it also keeps [`canvasEngine.ts:756`](../lib/atmosphere/canvasEngine.ts:756) working unchanged.

**Geometry:** out of flow ⇒ **zero CLS** (web.dev, *Optimize CLS*: "ensure the element is not part of the document flow by overlaying the content where this makes sense"). It does not overlap the audio control (that header is `absolute` and scrolls away, §2.5) and there is no decision row on Home. On mobile it will overlap the bottom ~72 px of the viewport; the footer's last 49 px are reachable by scroll, so nothing becomes permanently unreachable.

**Risks:** duplicate CTA (one visible at a time by construction), a second focusable "go" in the tab order, and an `aria-label` collision if the dock copies `Start Comparing` (the delegation map resolves that label to `target: "start"`, [`delegation.ts:114`](../lib/atmosphere/delegation.ts:114)).

### 7.3 Option 2 — desktop 2-column `#setup` + sticky Mode/GO column

**Behaviour:** at ≥ 1024 px, `#setup` becomes a 2-column grid: Domains + Categories left; "How do you want to play?" + the circular `go!` right (sticky within the grid). Below 1024 px it collapses and needs the Option-1 dock anyway.

**Geometry check (measured, 1440×900):**

| Column | Content | Height |
|---|---|---|
| left | domain fieldset 205 + category section 311 | **516** |
| right | mode section 329 + `go!` 176 + heading ≈ 60 | **≈ 565** |
| available | 900 − hero-less viewport, header row 64 | **836** |

Two columns of ≤ 565 px **fit one 900 px viewport with 270 px to spare** — the setup, the mode choice and the action would be visible simultaneously with no scrolling at all on desktop. Subtract the current in-flow duplication (mode section 329 + ready section 448 = 777 px) and the page also gets ~260 px shorter.

**Cost:** high. It restructures the Home composition that `design-reference/screens/home/home--desktop--dark--default.png` and `design-reference/tokens/layout.md` pin (hero → setup → modes → ready, stacked). It changes DOM order, which changes the tab order and the delegation `radioIndex` assumptions for nothing (those are name-based, so they survive), and it requires a design pass — not an implementation detail.

### 7.4 Recommendation

**Option 1 as the default, Option 2 deferred to a design decision.**

- Option 1 is **additive** (one new component + ~6 lines in `HomeSetup`), **zero CLS** by construction, works at every breakpoint including the 529 px mobile gap, and reuses the existing observer, `startGame()`, `launch` cue and `nav-forward` transition with no new plumbing.
- Option 2 is the *better end state* on desktop (measured 565 px fits 836 px available) but it invalidates the pinned home composition and needs a design deliverable. If the owner prefers it, it should be designed as its own pass and Option 1's dock is still required below 1024 px.

**Shared requirements for either option** (both must share the same launch path):

| Requirement | Source |
|---|---|
| Same canvas `launch` warp | `target: "go"` → [`canvasEngine.ts:756`](../lib/atmosphere/canvasEngine.ts:756)–[`769`](../lib/atmosphere/canvasEngine.ts:756) |
| Same `launch` SFX | [`soundMap.ts:167`](../lib/audio/soundMap.ts:167) |
| Same `nav-forward` `<ViewTransition>` | [`HomeSetup.tsx:166`](../components/home/HomeSetup.tsx:166)–[`169`](../components/home/HomeSetup.tsx:166) |
| Same `route` emit before `router.push` | [`HomeSetup.tsx:159`](../components/home/HomeSetup.tsx:159)–[`165`](../components/home/HomeSetup.tsx:159) |
| Same disabled semantics when `!canPlay` | [`HomeSetup.tsx:125`](../components/home/HomeSetup.tsx:125)–[`130`](../components/home/HomeSetup.tsx:125), [`324`](../components/home/HomeSetup.tsx:324) |
| Keyboard: focusable, `Enter`/`Space` activation, visible ring at `#22d3ee` (10.08:1) | §5.3 |

---

## 8. Proposed file allowlist

### 8.1 New files

| File | Purpose | Confidence |
|---|---|---|
| `lib/atmosphere/sprites.ts` | Offscreen sprite baking (6 spark + 4 chevron canvases), pure functions, no DOM reads | Required |
| `components/home/LaunchDock.tsx` | Option-1 dock (Category + Mode + GO!) | Required for §7 |
| `components/game/GameplayEntrance.tsx` | First-mount choreography wrapper (board / badge / status / controls) | Required for §6 |
| `app/game/[mode]/loading.tsx` | Shell silhouette fallback | **Only if decision D3 adopts the skeleton** |
| `docs/idle-sprites-transition-go-ux-analysis-2026-11-22.md` | This document | Done |
| `docs/assets/visual-ux-upgrade/*.png` | Evidence screenshots | Done |

### 8.2 Modified files

| File | Change | Flag |
|---|---|---|
| `lib/atmosphere/canvasEngine.ts` | Sprite draw path, chevron pool, surge window, card-safe rects, Home hero band | Expected |
| `components/home/HomeSetup.tsx` | Mount `LaunchDock`, extend the existing observer with `setupRef` | Expected |
| `components/game/ClassicGame.tsx` | Wrap board/status/controls in `GameplayEntrance` | Expected |
| `components/game/TimeAttackGame.tsx` | Same wrap | Expected |
| `app/globals.css` | **Append-only**: entrance keyframes, dock classes, radial scrim, reduced-motion overrides | Expected |
| `components/game/GameplayShell.tsx` | Only if the scrim moves from `.gameplay-surface` to the shell element | **Expansion — flag before touching** |
| `lib/atmosphere/delegation.ts` | Only if the dock cannot reuse `home-go` for `target: "go"` | **Expansion — flag before touching** |
| `lib/atmosphere/types.ts` | Only if a *new* event field is needed (none expected — `guess.direction` + `reveal.tier` already suffice) | **Expansion — flag before touching** |
| `app/game/[mode]/page.tsx` | Only if the route-new animation is retargeted per-route instead of in CSS | **Expansion — flag before touching** |

### 8.3 Frozen

`lib/api/**` (all providers, snapshots, dispatcher), `lib/catalog/**`, `lib/highScores/**`, `lib/game/deck.ts`, `lib/audio/audioEngine.ts`, `lib/audio/settings.ts`, `lib/audio/soundMap.ts`, `components/audio/AudioSurface.tsx`, `components/game/GameCard.tsx`, `components/game/ComparisonBoard.tsx`, `components/game/GameplayStatus.tsx`, `components/game/DecisionControls.tsx`, `components/home/DomainSelector.tsx`, `components/home/CategorySelector.tsx`, `components/CategoryCard.tsx`, `components/ModeButton.tsx`, `components/HighScoresModal.tsx`, `app/layout.tsx`, `app/page.tsx`, `app/game/layout.tsx`, `app/game/classic/page.tsx`, `app/game/time-attack/page.tsx`, `app/api/**`, `next.config.ts`, `package.json`, `package-lock.json`, `components.json`, `design-reference/**`.

---

## 9. Risk register

| # | Risk | Severity | Evidence / mitigation |
|---|---|---|---|
| R1 | **Performance:** 38 sprite blits + 28 dust entries per frame at DPR 2 on a low-core machine | Med | `drawImage` of a snug cached sprite is the cheapest primitive (MDN, web.dev); existing quality path already drops to 12 motes + `frameSkip 2` ([`canvasEngine.ts:241`](../lib/atmosphere/canvasEngine.ts:241)–[`242`](../lib/atmosphere/canvasEngine.ts:241)). Must not introduce a second canvas or a second loop. |
| R2 | **Sprite brightness inside the 84 % shell** | High | §5.1: only ~1 % of the field survives. Sprites alone cannot fix this; the scrim must change (§5.2). |
| R3 | **Text-safe masking** puts a hard edge at the card border | Med | `destination-out` is binary (§3.4). Accept, or feather the mask with a soft-edged baked rect. Perceptual: `Needs Verification [product-decision]`. |
| R4 | **Reduced motion** must stay a single static frame with frozen sprites | High | Verified static today (§2.7). Any sprite layer that reads `performance.now()` directly would break it; positions must derive from `elapsed`. |
| R5 | **Double ViewTransition / mount animation** | High | §6.4 D1–D3. Verified today: exactly **1** `startViewTransition` per nav. |
| R6 | **CLS** from the dock or the entrance | Low | Dock is out of flow (web.dev *Optimize CLS*); entrance animates compositor props only. Baseline **0.00053** must be re-measured after the change. |
| R7 | **Sticky overlap** with the audio control / decision controls | Low | Audio header is `absolute` and scrolls away (§2.5); no decision row on Home. Runtime-verify at both viewports. |
| R8 | **Focus / keyboard:** a second `go`-like control in the tab order | Med | Distinct `aria-label` (not `Start Comparing`) so the classifier does not mis-map it ([`delegation.ts:114`](../lib/atmosphere/delegation.ts:114)); keep `home-go` only if we *want* the launch impulse. |
| R9 | **Loading flash** if `loading.tsx` is added | Med | 90–121 ms warm means a skeleton flashes; hence §6.2 default = no skeleton. |
| R10 | **Route prefetch** — a `<Link>`-based dock would prefetch and *skip* the loading state, unlike `router.push` | Low | Current launch uses `router.push` ([`HomeSetup.tsx:166`](../components/home/HomeSetup.tsx:166)); keep the dock on `startGame()` so behaviour is identical. |
| R11 | **Mobile overflow** from the dock | Low | Measured `scrollWidth === innerWidth` today (§2.4); the dock must not add horizontal padding without `max-w`. |
| R12 | **One-loop invariant** | High | Any sprite work must live inside `drawFrame` ([`canvasEngine.ts:642`](../lib/atmosphere/canvasEngine.ts:642)); no `setInterval`, no second rAF. |
| R13 | **Hydration** from a reduced-motion JS branch | High | Already a live bug (§2.7). Gate with CSS only. |
| R14 | **Tier accent compounding** into a strobe on long streaks | Med | §4.2 non-escalation rule; tier selects pre-seeded sprites only. |

---

## 10. Product decisions needing owner sign-off

| # | Decision | Recommended default | Alternatives |
|---|---|---|---|
| **D1** | **Go UX** — which option ships | **Option 1 (sticky launch dock)**; Option 2 deferred to a design pass | Option 2 desktop 2-column + mobile dock; Option 1 only; no change |
| **D2** | **Sprite density / intensity** | 28 dust + 10 chevrons desktop, 12 + 6 mobile; chevron alpha band `0.16–0.26`, surge peak `0.62` | Halve density for a quieter field; or keep counts and raise surge to `0.8` |
| **D3** | **Loading approach** | **No `loading.tsx`**; entrance only, and drop the route's 8 px rise | Ship `app/game/[mode]/loading.tsx` shell silhouette with `default="none"` |
| **D4** | **Entrance timing / sequence** | 4 steps, ≤ 460 ms wall clock, last transform at 380 ms (card pair → OR → tally → controls) | Single fade of the whole board at 220 ms; or no entrance (current) |
| **D5** | **Allowlist expansions** | Approve the 4 new + 5 modified files in §8.1–8.2 | Deny any of: `GameplayShell.tsx`, `delegation.ts`, `types.ts`, `app/game/[mode]/page.tsx` |
| **D6** | **Mobile dock while the software keyboard is open** | **Hide the dock when `visualViewport` height shrinks by > 25 %** (keyboard heuristic) | Always show (dock may sit over the keyboard); never show on mobile |
| **D7** | **Shell scrim change** (prerequisite for visible sprites) | Radial scrim: 86 % centre → 60 % gutters | Keep 84 % flat and accept an invisible field; or 72 % flat (raises contrast risk on card edges) |
| **D8** | **Wrong-answer response** | One fixed 180 ms recession + 80 ms lift, never escalating | Escalating shake (rejected: §4.2) |
| **D9** | **`#6355cb` as text** | **Forbidden** for normal-size text; use `#d4ceff`/white with a classic-tinted *surface* instead | Owner may prefer to lighten the Classic accent token (would touch `globals.css` tokens — outside this allowlist) |

---

## 11. Source verification log

### 11.1 Files read (line-cited above)

`lib/atmosphere/{canvasEngine,eventBus,delegation,types}.ts` · `components/atmosphere/AtmosphereBackdrop.tsx` · `components/home/{HomeSetup,DomainSelector,CategorySelector}.tsx` · `components/{CategoryCard,ModeButton}.tsx` · `components/game/{GameplayShell,ComparisonBoard,GameCard,GameplayStatus,DecisionControls,ClassicGame,TimeAttackGame}.tsx` · `components/audio/AudioSurface.tsx` · `lib/audio/soundMap.ts` · `app/{page,layout}.tsx` · `app/game/{layout.tsx,[mode]/page.tsx,classic/page.tsx,time-attack/page.tsx}` · `app/globals.css` (full, 967 lines) · `next.config.ts` · `package.json` · `docs/procedural-canvas-audio-postfix3-handoff-2026-11-22.md` · `docs/procedural-canvas-audio-postfix2-qa-2026-11-22.md`.

### 11.2 Commands run

| Command | Purpose | Result |
|---|---|---|
| `git status --porcelain=v1`, `git branch --show-current`, `git diff --stat`, `git diff --cached --stat`, `git ls-files --others --exclude-standard` | Baseline | §1.1 |
| `Get-ChildItem -Recurse -Path app` | Prove no `loading.tsx` | none found |
| `Get-ChildItem -Recurse design-reference` | Confirm the pinned home reference exists | `screens/home/home--desktop--dark--default.png`, `tokens/layout.md` present |
| `Invoke-WebRequest http://localhost:3000` | Confirm the owner's dev server is up | `STATUS 200`, 43 019 bytes |
| `Get-Content node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` | Framework truth for `ViewTransition` + loading + reduced motion | quoted in §6.1 |
| `Get-Content node_modules/next/dist/docs/…` index of `loading.md` | Framework truth for prefetch/streaming | cited §6.1 |

### 11.3 Playwright runs

Home 1440×900 (geometry + canvas sample + screenshot) · Home 390×844 (geometry) · `Start Comparing` click + settle at 390 (**529 px gap**) · `go!` click → Classic 1440 (geometry, tint, contrast, composite) · `Higher` guess (attributes `game-over`/`higher`/`tier 0`) · Time Attack 1440 (header 138, doc 954, safe-band probe) · Time Attack 390 (doc 1320, decisions below fold) · `startViewTransition` instrumentation (**1 call**) · cold-category navigation timing (**121 ms**) · `reducedMotion: reduce` fresh load (static canvas, 0 animations, render trace of the hydration mismatch).

Screenshots written (evidence only, no product asset added):
`docs/assets/visual-ux-upgrade/current-home-1440-top.png`, `current-home-1440-setup.png`, `current-classic-1440.png`, `current-time-attack-390.png`, `current-home-390-after-start-comparing.png`, `current-home-390-reduced.png`.

### 11.4 Documentation consulted

| Source | Used for |
|---|---|
| Next 16 local docs `01-app/02-guides/view-transitions.md` ("Animate loading states", "Keeping the page interactive", "Respecting reduced motion") | §6.1, §6.4 D2, §6.3 |
| Next 16 local docs `01-app/03-api-reference/03-file-conventions/loading.md`, `04-linking-and-navigating.md` (via Context7 mirror of v16.3.6) | §6.1 prefetch/streaming behaviour |
| React docs `<ViewTransition>` + `addTransitionType` (Context7 `/reactjs/react.dev`) | transition types mapping to classes (§6.1) |
| MDN *Optimizing canvas* | §3.1 offscreen pre-render, integer coords, no scaling in `drawImage`, avoid `shadowBlur` |
| web.dev *Improving HTML5 Canvas performance* | §3.1 snug offscreen canvas, avoid `shadowBlur` |
| web.dev *Optimize CLS* | §7.2 overlay instead of flow |
| developer.chrome.com *sticky headers* | sticky leaves layout when fixed; sentinel-based observation (§7.2) |

### 11.5 `Needs Verification`

1. **DPR 2/3 behaviour** of the sprite bake (snug canvas must be `size × scale`, blitted 1:1 at `scale`). `[Not tested]` — the test browser reported `devicePixelRatio 1`.
2. **Perceptual acceptance** of sprite density, surge amplitude, and scrim ratio. `[product-decision]` — requires the owner's eyes; no human reviewer this pass.
3. **Focus-ring contrast on non-base surfaces** (`#22d3ee` on `#d93fd0`, on white card borders). `[Not tested]`.
4. **Cold production navigation latency** (the 90–121 ms figure is a warm local dev server). `[environment-specific]`.
5. **`npm run build`** — `[Blocked]`: the owner's live `next dev` holds `.next`; not run, per standing instruction.
6. **Reduced-motion hydration mismatch** — measured and traced to [`HomeSetup.tsx:172`](../components/home/HomeSetup.tsx:172), but whether the owner wants it fixed in this feature pass is `[product-decision]` (it is a pre-existing item, postfix2 F-6).
7. **Lower button contrast** (white on `#d93fd0`, 3.77:1) — an existing AA failure at normal text size; fixing it is `[product-decision]` and outside this allowlist.
8. **Time Attack mobile document height** (`1320` this run) — content/deck dependent, consistent with postfix2 F-8 `[product-decision]`.
9. **Whether the dock should appear on desktop** as well as mobile (measured: it is needed at both, 105 px / 529 px). `[product-decision]` — folded into D1/D6.
10. **`html[data-modal="open"]` × card** combined state remains unreachable today (carried from postfix2 open item 5). `[Not tested]`.
