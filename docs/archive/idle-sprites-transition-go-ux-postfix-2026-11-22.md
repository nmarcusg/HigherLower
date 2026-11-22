# Idle Sprites · Reactive Field · Loading & Entrance · Scroll-Free Go — Minimal Postfix

**Date:** 2026-11-22
**Stage:** Postfix (implementation + verification) for QA findings **F1, F2, F3, F8** only.
**Source of findings:** [`idle-sprites-transition-go-ux-qa-2026-11-22.md`](./idle-sprites-transition-go-ux-qa-2026-11-22.md)
**Design/plan authority:** [`…-design-…`](./idle-sprites-transition-go-ux-design-2026-11-22.md) §3.1, §6.2, §6.6 · [`…-plan-…`](./idle-sprites-transition-go-ux-plan-2026-11-22.md)
**Branch:** `lj-branch` (no commit boundary; the tree also carries the still-uncommitted procedural-canvas/audio and immersive-motion work)

---

## 1. Files changed

| File | Finding | Change |
|---|---|---|
| [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:56) | F1, F2 | `SURGE_SPARK_BIAS = 0.35`; `near`-plane `dirY` bias on a correct reveal; `resize()` reduced-motion repaint now passes milliseconds |
| [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:106) | F3 | Dock trigger replaced the `ratio ≥ 0.25` gate with a viewport-relative geometric test on `#setup`'s top edge |
| [`components/home/LaunchDock.tsx`](../components/home/LaunchDock.tsx:34) | F8 | Closed/hidden dock is `inert` (plus `aria-hidden`) on the same commit that starts the fade |

**Not touched:** `app/globals.css`, `lib/atmosphere/sprites.ts`, `delegation.ts`, the sprite/chevron/scrim/entrance/HV-1 work, gameplay components, providers, routes, `package.json`, config. No new dependency, no BGM, no hydration branch, no layout change.

---

## 2. Findings, classification, root cause, fix

### F1 — Correct-reveal spark bias missing (implementation bug, Low)

- **Root cause.** `drawSprites()` had no surge/beat term at all: it read only `mote.dirY` and the scroll parallax, so the design's §3.1 `near`-plane `dirY` bias of `0.35` never existed in code. The chevron beat in `drawChevrons()` was implemented; the dust half of the beat was not.
- **Fix.** `SURGE_SPARK_BIAS = 0.35` added next to the other fixed surge constants. `drawSprites(time, nowMs)` now reads the surge window (`surgeAge`, `surgeActive`, `surgeDirection`) and adds, for `near`-plane motes only (`mote.z >= 0.9`, the same test that selects `sparkNear`), a displacement of
  `(surgeAge/1000) · speed · SURGE_SPARK_BIAS · 0.4 · sign · envelope`.
- **Why integrated rather than folded into `time`.** A literal `dirY += 0.35` multiplies the *absolute* `elapsed`, so it would displace the field by tens of pixels the instant the beat starts — a visible pop on every correct answer. Integrating the velocity change from `surgeStart` keeps the bias continuous (0 at the beat, back to 0 with the envelope), allocates nothing, stores nothing per sprite, and keeps position a pure function of `elapsed`, so the reduced-motion frozen frame is unaffected.
- **Architecture preserved.** One canvas, one rAF chain, one `drawImage` per spark, no per-frame `shadowBlur`/`filter`/gradient; the added work is four numbers per drawn spark.

### F2 — Reduced-motion repaint after `resize()` used seconds (implementation bug, Low)

- **Root cause.** `resize()` called `drawFrame(elapsed)` while every other call site passes milliseconds (`elapsed * 1000`). `drawFrame` divides by 1000 internally for sprite positions and uses the raw value for impulse timing, so the repaint was painted at `elapsed` *milliseconds* instead of `elapsed` *seconds*.
- **Fix.** `if (reducedMotion) drawFrame(elapsed * 1000);`
- **Latent, not live.** On the reduced-motion path `elapsed` only ever advances inside `step()`, which never runs (the loop is never started), so `elapsed` stays `0` and both units currently produce the same frame. The fix removes a stale-time repaint that would appear the moment `elapsed` had advanced before the media query flipped (motion → reduced), and makes the unit contract uniform across all five call sites.

### F3 — Dock dead zone at shorter viewports (spec gap, Medium)

- **Root cause.** The implementation added a `setup intersectionRatio ≥ 0.25` gate that the design did not ask for (design §6.2 says "`#setup` is intersecting"). At 390×700 (measured geometry this pass: `#setup` 700 → 1456.5, `.home-go` top 2056.5) the ratio fell below 0.25 at scrollY ≈ 1267 while the real `go!` only entered the viewport at scrollY ≈ 1356.5 — an ~90 px stretch with no launch affordance on screen.
- **Fix.** The trigger is now geometric and viewport-relative, still inside the *same* single `IntersectionObserver` callback (`threshold` ladder unchanged):

  ```ts
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const setupEngaged = setupEntry
    ? setupEntry.boundingClientRect.top < viewportHeight * 0.75
    : false;
  setDockVisible(setupEngaged && !cta);
  ```

- **Why this matches the intent.** A section whose top edge merely touches the fold (the hero viewport, `top === innerHeight` at load) is still excluded, so no second CTA competes with the hero. Once `#setup` has risen above the lower quarter of the viewport it counts as engaged, and — unlike a ratio — that stays true while the section scrolls past, so the mode-selector stretch between `#setup` and `.go!` is covered at any viewport height. It stops being true only when the user returns to the hero, which is the "setup no longer active" hide condition. `go!` visibility, the modal rule and the keyboard rule are unchanged.
- No second observer, no scroll listener, no rAF, no layout change.

### F8 — Closed dock stays focusable during the 180 ms `visibility` delay (implementation nuance, Low)

- **Root cause.** `visibility` is transitioned with a 180 ms delay on close, so for that window the button was still laid out, still in the tab order and still in the accessibility tree (`pointer-events: none` blocked clicks only).
- **Fix.** `LaunchDock` derives `shown = visible && !keyboardOpen` and applies it on the same render as `data-open`:

  ```tsx
  aria-hidden={shown ? undefined : true}
  inert={!shown}
  ```

  `inert` removes the subtree from focus, pointer hit-testing and the accessibility tree immediately, so the fade can still play while the control is already unreachable. Open-state behaviour is untouched: the button is a real `<button type="button">`, keeps the global `:focus-visible` ring, and still launches through the same `onLaunch` → `startGame()` the main `go!` uses.

---

## 3. Verification

Environment: the owner's `next dev` on `http://localhost:3000` (reused, never stopped), Playwright MCP, `devicePixelRatio 1`. The harness still throttles `requestAnimationFrame` to ~1–2 Hz, so IntersectionObserver delivery can lag ~0.3–1 s; every scroll sample below was taken after a settle of ≥ 0.9–1.6 s, and the earlier "closed at scrollY 300" readings were re-measured and were delivery lag, not trigger behaviour.

| # | Check | Status | Evidence |
|---|---|---|---|
| V1 | `npx tsc --noEmit` | `[Pass]` | exit 0 |
| V2 | `npm run lint` | `[Pass]` | 0 errors, 95 warnings — identical count to QA S2 (all pre-existing, `.agents/`, `lib/api/worldbank.ts`, `lib/catalog/availability.ts`) |
| V3 | `npm run build` | `[Blocked]` | owner's dev server holds `.next`; not run, not stopped |
| V4 | F1 source verification | `[Pass]` | `SURGE_SPARK_BIAS = 0.35` [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:56); bias applied only when `sparkSurgeOn && near` [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:644); `drawSprites(timeMs / 1000, timeMs)` from the single `drawFrame` |
| V5 | F1 runtime near-plane bias | `[Not tested]` | Not measurable in this harness: the §3.1 velocity bias is sub-pixel inside the 360 ms window — peak ≈ 0.05 px at `speed 6` with the envelope (≈ 0.30 px if unwrapped) — and sprite destinations are `Math.round`ed. Source-verified only. |
| V6 | F2 source verification | `[Pass]` | `resize()` now calls `drawFrame(elapsed * 1000)` [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:560), matching the other four call sites |
| V7 | F2 reduced-motion resize repaint | `[Pass]` | `prefers-reduced-motion: reduce`, Home: 385×700 frame at checksum `1171535868` (186 898 inked px), stable across 5 samples / 2 s; resized to 1440×900 → repainted 1435×900, checksum `1595777505`, 1 036 154 inked px, **still identical 900 ms later**, `document.getAnimations() = 0`, 1 canvas. No new console output. The *unit* delta itself is unobservable while `elapsed === 0` (see F2 above). |
| V8 | F3 at 390×700 (previously dead-zoned) | `[Pass]` | closed at load (`setup top 700`, dock `inert`); open at scrollY 176 / 400 / 700 / 900 / 1267 / 1300 / 1340 / 1350; **open at scrollY 1300 with `#setup` top −600 and `go!` top 757 (0 px visible)**; closed at 1360 (`go!` top 697, visible). No dead zone between 176 and the `go!` intersection. |
| V9 | F3 at 390×844 | `[Pass]` | closed at 0 (`setup top 844`); open at 400 and 1200 (`setup top −356`); closed at 1400 (`go!` visible) |
| V10 | F3 at 1440×900 | `[Pass]` | closed at load (`setup top 900`); open at 300 / 660 / 900; closed at 995 (`go!` top 894, visible) |
| V11 | F8 closed dock immediately non-focusable | `[Pass]` | 45-sample poll across the close: 17 samples had `data-open="false"` **and** `visibility: visible` (opacity 0 — the fade window), all 17 had `inert`; 0 closed samples without `inert`; `button.focus()` while closed left `document.activeElement === BODY` |
| V12 | F8 open state unchanged | `[Pass]` | `inert` removed when open; `focus()` lands on the GO button; focus ring `3px solid rgb(34,211,238)`; name `Go! Start Movie/Series Rating on Classic` |
| V13 | Launch parity | `[Pass]` | `Enter` on the focused dock button → `/game/classic?category=movie-series-rating`, the identical path to the main `go!` (same `startGame()`, same route emit, same `data-atmo-go` → `target: "go"` classification) |
| V14 | CLS | `[Pass]` | `layout-shift` observer over a 0 → 400 → 900 → 1300 → 1370 → 1600 sweep: **0 shifts, CLS 0**; document height 2345 before/while/after open |
| V15 | Horizontal overflow / geometry | `[Pass]` | 390 Home `scrollWidth 385`, doc height 2345 — unchanged by dock state |
| V16 | Audio-control overlap | `[Pass]` | at scrollY 1300 the header/audio control is at `top −1280`; dock occupies 628–688 |
| V17 | Mobile gameplay geometry | `[Pass]` | fresh load at 390×844: `scrollHeight 1252`, `scrollWidth 385`, Higher `y 1100`, Lower `y 1166` — exact QA baseline. (An interim 1272/1120/1186 reading came from the same page instance after a client-side navigation at 390×700 followed by a resize; a fresh load at both 390×700 and 390×844 reproduces 1252. Content/instance-driven, not reproducible from source.) |
| V18 | One canvas / one rAF / sprite cache | `[Pass]` | `document.querySelectorAll('canvas').length === 1` at every viewport tested; no new `requestAnimationFrame`, no `setInterval`, no new observer; sprite draw path untouched (`drawImage` only) |
| V19 | Console, normal motion | `[Pass]` | 0 errors on Home and gameplay for this postfix's paths |
| V20 | Console, reduced motion | `[Partial]` | 1 error — the pre-existing hero hydration mismatch (QA F5, [`HomeSetup.tsx`](../components/home/HomeSetup.tsx:207) `heroEntrance`), unchanged and outside this postfix. Dock and canvas edits add no JS/SSR branch. |
| V21 | Perceptual acceptance (spark surge, dock feel, fade) | `[Not tested]` | no human reviewer this pass |

### Screenshots

Captured with transitions disabled by an injected style (the frame-starved harness otherwise freezes transitions at their start value, the same limitation QA recorded). No source edit produced these states.

- [`postfix/home-1440x900-hero-dock-closed.png`](./assets/visual-ux-upgrade/postfix/home-1440x900-hero-dock-closed.png)
- [`postfix/home-1440x900-dock-open-mode-stretch.png`](./assets/visual-ux-upgrade/postfix/home-1440x900-dock-open-mode-stretch.png)
- [`postfix/home-390x700-hero-dock-closed.png`](./assets/visual-ux-upgrade/postfix/home-390x700-hero-dock-closed.png)
- [`postfix/home-390x700-dock-open-scroll1300.png`](./assets/visual-ux-upgrade/postfix/home-390x700-dock-open-scroll1300.png)
- [`postfix/home-390x700-go-visible-dock-closed.png`](./assets/visual-ux-upgrade/postfix/home-390x700-go-visible-dock-closed.png)

---

## 4. Behaviour changes worth naming

1. **Dock coverage window widened at the top end too.** The dock now appears as soon as `#setup`'s top edge clears the lower quarter of the viewport (≈ 25 % of the viewport height scrolled in) rather than at a 25 % *section-ratio*. At 390×700 that is scrollY ≈ 175; at 1440×900 ≈ 225. The hero viewport itself still shows no dock.
2. **The "Start Comparing" link can remain partly visible for a short stretch while the dock is already shown.** The hero CTA scrolls to `#setup`; it is not a launch action, so this is not two launch CTAs. The design's "never two CTAs" rule (§6.2) is about the launch action and remains satisfied.
3. **Closing the dock now drops focus to `<body>` if focus was inside it.** That is `inert`'s defined behaviour and is strictly better than an invisible focusable button; no focus-management work was added (it would be new scope).
4. **While the high-scores dialog is open the dock is hidden by CSS but not `inert`** (its React `visible` prop is still true). `dialog.showModal()` already makes the page inert — measured: not focusable during the dialog, restored after close. Unchanged from prior behaviour.

---

## 5. Open items (`Needs Verification`)

1. **F1 perceptual value** — the specified `0.35` `dirY` bias produces ≈ 0.05 px of displacement at peak inside the 360 ms window. If the owner wants the near plane to read as a legible response, that needs a *px-denominated* amplitude (like the chevrons' 6 px), which is a design change, not a postfix. `[product-decision]`
2. **Dock visibility upper bound** — `viewportHeight * 0.75` is a chosen fraction, not an owner-stated constant. It is the one number in F3 that is a judgement call; every measured viewport is covered by it. `[product-decision]`
3. **Software-keyboard hide** — still unemulated in this harness (no `visualViewport` shrink). `[capability-unavailable]`
4. **`npm run build`** — `[Blocked]` by the owner's dev server holding `.next`. `TODO:` run a production build when the dev server is stopped.
5. **Reduced-motion hydration mismatch (F5)** — pre-existing, untouched, still one console error under `reduce`. `TODO:` owns its own task.
6. **DPR 2/3 sprite crispness** — harness is DPR 1. `[capability-unavailable]`
7. **Exact per-task allowlist provenance** — no commit boundary in this tree. `[environment-specific]`
8. **Perceptual acceptance** of the dock appearance at the new trigger points and of the spark surge. `[product-decision]`
