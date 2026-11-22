# Idle Sprites · Reactive Field · Loading & Entrance · Scroll-Free Go — Design

**Date:** 2026-11-22
**Stage:** Design only. No application code, config, asset or manifest change.
**Branch:** `lj-branch`
**Supersedes nothing.** Builds on [`idle-sprites-transition-go-ux-analysis-2026-11-22.md`](./idle-sprites-transition-go-ux-analysis-2026-11-22.md) (authoritative measurements), [`procedural-canvas-audio-postfix3-handoff-2026-11-22.md`](./procedural-canvas-audio-postfix3-handoff-2026-11-22.md), the postfix2 QA, the canvas/audio set, and the six `immersive-motion-redesign-*` documents.
**Repository writes made by this stage:** this document and `docs/idle-sprites-transition-go-ux-plan-2026-11-22.md`. Nothing else.

> Evidence rule for this document: every measured number is the analysis's Playwright reading (2026-11-22, Chromium, DPR 1). Numbers prefixed **`computed`** are this stage's arithmetic over those measurements and are **not** runtime observations. Anything unresolved carries a `Needs Verification` qualifier.

---

## 1. Decision log and visual authority

### 1.1 Binding owner decisions (D1–D9)

| # | Decision | Binding content adopted here | Design consequence |
|---|---|---|---|
| **D1** | Go UX | **Option 1 — sticky compact launch dock.** Option 2 (desktop 2-column) deferred. | §6 is the whole of the Go work. `design-reference/screens/home/home--desktop--dark--default.png` composition is **not** restructured. |
| **D2** | Sprite density / intensity | **28 sparks + 10 chevrons desktop, 12 + 6 mobile**, two depth planes; chevron alpha band `0.16–0.26`, surge peak `0.62`. | §2 counts and §3 amplitudes are fixed to these numbers; they are not tunable in implementation. |
| **D3** | Loading approach | **No `loading.tsx`.** `nav-forward` becomes an opacity crossfade; motion moves onto gameplay content. | §5.1, §5.2. `app/game/[mode]/loading.tsx` stays absent. |
| **D4** | Entrance timing | **380 ms** card → OR → tally → controls; last transform settles at 380 ms. | §5.3 re-times the analysis's step table to honour 380 ms exactly (see **C-1**). |
| **D5** | Allowlist | Approve the proposed allowlist **including** the flagged expansions. | Expansions are approved but, per §7.3, four of them turn out to be **unnecessary** and are recorded as not-touched. |
| **D6** | Mobile dock + software keyboard | Hide the dock when `visualViewport` height shrinks by **> 25 %**. | §6.6. |
| **D7** | Shell scrim | **Radial scrim ~86 % centre → 60 % gutters**; field visible while text stays AA. | §4.2 (with the `bg-grid` collision fix, **C-4**). |
| **D8** | Wrong answer | **Fixed** 180 ms recession + 80 ms 3 % lift, non-escalating. | §3.3. Identical on miss 1 and miss 20. |
| **D9** | Classic purple as text | **`#6355cb` is banned as text / background-for-text.** Lower-button contrast raised to AA. | §4.4, including the one live violation found in a frozen file (**C-2**). |

### 1.2 Visual authority (in order, per governance)

1. **These owner decisions.**
2. **`design-reference/`**: [`tokens/visual-patterns.md`](../design-reference/tokens/visual-patterns.md:3) — dark navy surfaces, white outlines, offset coloured backing/shadow layers, Space Mono, fine grid, mode accents (Classic purple / Time Attack magenta), Higher cyan with a white offset layer, Lower magenta with a white offset layer. Screens: [`screens/home/home--desktop--dark--default.png`](../design-reference/screens/home/home--desktop--dark--default.png), [`screens/gameplay/classic/classic--desktop--default-decision.png`](../design-reference/screens/gameplay/classic/classic--desktop--default-decision.png), [`components/home/ready-cta/ready-go--default.png`](../design-reference/components/home/ready-cta/ready-go--default.png).
3. **Current source conventions**: 2 px white borders on interactive faces, hard offset shadows (`shadow-[5px_5px_0_#ffffff]`), `rounded-full` pills, `--focus-ring: #22d3ee`, 2 px white `::after` ring on the main `go!` ([`app/globals.css`](../app/globals.css:170)).

### 1.3 Identity invariants that this pass must not break

- **Dark-neon arcade identity**: `--bg-base #15122b`, white 2 px outlines, hard offset shadows, no soft/blurred shadows.
- **Space Mono** for everything (already the only font via `--font-space-mono`, [`app/globals.css`](../app/globals.css:75)).
- **Noise overlay** (`.bg-noise::after`, fixed, `pointer-events: none`, [`app/globals.css`](../app/globals.css:200)) — must not be fought by the scrim opacity; it is a sibling layer, unaffected.
- **Cover art protection**: card imagery is a native `<img>` inside `game-card-face` with `overflow-hidden` and `border-4` ([`components/game/GameCard.tsx`](../components/game/GameCard.tsx:89)); **nothing in this pass paints over a card face**. Sprites are erased behind cards (§2.6), not tinted over them.
- **Focus-ring protection**: `:focus-visible` global outline `3px solid #22d3ee` ([`app/globals.css`](../app/globals.css:118)) must remain the only focus indicator. The dock and the entrance wrapper add **no** new outline treatment and never set `outline: none`.

---

## 2. Sprite system

### 2.1 Primitive choice

Pre-rendered offscreen sprites, one `drawImage` per sprite, baked **once per `resize()` / DPR change** and **once per surface/low-energy rebake**, never inside the loop. This extends the engine's stated discipline ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:13)): no per-frame `shadowBlur`, no `filter`, no gradient created in the loop, no allocation.

The sprites are `document.createElement("canvas")` nodes that are **never appended** — the same pattern as `staticLayer`/`vignetteLayer`/`safeLayer` ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:185)). `document.querySelectorAll("canvas").length` remains **1** (measured 1 today).

### 2.2 Offscreen sprite canvases — exact set

**Spark sprites: 3 colours × 2 depth sizes = 6 canvases**

| Colour | Token read at bake | Current value | Role |
|---|---|---|---|
| white | `--border-strong` | `#ffffff` | neutral depth dust |
| cyan | `--accent-action-higher` | `#22d3ee` | “up” family |
| magenta | `--accent-time-attack` | `#d93fd0` | “down” family |

| Size class | Snug canvas (CSS px) | Snug canvas (device px) | Drawn at |
|---|---|---|---|
| `near` (z = 1) | `14 × 14` | `round(14 × scale)` | dest CSS size `w/scale` ⇒ **1:1 device pixels** |
| `far` (z = 0.5) | `8 × 8` | `round(8 × scale)` | same |

**Composition of one spark (baked, not per frame):**
- one full-canvas radial glow disc, centre at canvas centre, α ramps `0.18 → 0` at the canvas edge (this *is* the glow; no `shadowBlur`);
- one filled circle body: r = `3.5` CSS px (`near`) / `2.0` CSS px (`far`), α `1.0`;
- two 1-device-pixel crosshair arms (vertical + horizontal) at α `0.60` of the body, length = canvas side × 0.86; `lineWidth = 1 / scale` so the arm stays exactly one device pixel at DPR 2.

**Chevron sprites: 2 base + 2 hot = 4 canvases**

| Sprite | Snug canvas | Composition |
|---|---|---|
| `chevronUp` | `20 × 26` CSS px | 3 stacked `⌃` strokes, `stroke-width 2`, span 12 px, apex step 8 px, alphas `0.95 / 0.55 / 0.28` top→bottom |
| `chevronDown` | `20 × 26` CSS px | same, mirrored, same alpha ladder top→bottom so the stack reads as a directional smear |
| `chevronUpHot` | `20 × 26` CSS px | same geometry, all three strokes α `1.0`, plus a 1 px **white** core stroke (white `stroke-width 3` at α 0.85 painted **under** the colour stroke at `stroke-width 2`) |
| `chevronDownHot` | `20 × 26` CSS px | mirrored hot variant |

The hot variant is a **sprite swap**, never a per-frame alpha ramp over a path.

**Why `Hot` is baked rather than derived:** under reduced motion the field is a single frozen frame (§2.8); “brighten” must therefore be a discrete image, not a temporal ramp.

### 2.3 DPR correctness (the one place DPR can bite)

`resize()` already computes `scale = min(devicePixelRatio, DPR_CAP = 2)` and applies `ctx.setTransform(scale, …)` ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:407)). Therefore:

- sprite canvases are sized in **device** pixels: `w = Math.round(14 * scale)`;
- `drawImage` is called with an explicit destination size of `sprite.width / scale` × `sprite.height / scale` in CSS units, which under the active transform is exactly `sprite.width` × `sprite.height` device pixels — a true 1:1 blit at every scale, with no re-sampling;
- destination coordinates are `Math.round(x)` / `Math.round(y)` in CSS space (integer device pixels at scale ∈ {1, 2}).

At `scale = 1.25` / `1.5` the destination size is fractional in CSS space but integer in device space; that is the correct trade-off and is `Needs Verification [capability-unavailable]` for crispness (§9.1).

### 2.4 Counts, quality path and pool sizing — fixed by D2

| Setting | Desktop | Mobile | Low-quality | `lowEnergy` |
|---|---|---|---|---|
| sparks | **28** | **12** | **12** | `max(4, 20 %)` → 6 / 4 |
| chevrons | **10** | **6** | **6** | `max(2, 40 %)` → 4 / 2 |
| chevron **base** (always drawn) | 6 | 6 | 6 | same ratio applied |
| chevron **reserve** (idle, low alpha) | 4 | 0 | 0 | — |

- Pools are seeded **once** with `makeRandom(20261122)` ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:142)) at the desktop maximum; mobile/low-quality iterate fewer entries, exactly as `activeMoteCount()` already does ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:269)). **No object churn, no respawn allocation.**
- Reserve size is derived from D2: 10 desktop chevrons − 6 base = 4 reserve = **2 pairs**. Mobile has 6 total, i.e. **no reserve** (see **C-3**).

### 2.5 Planes, drift, opacity, parallax

- **Sparks keep the existing two-plane split** `near = index % 2 === 1` ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:251)): `near` alpha `0.10–0.18`, speed 3–6; `far` alpha `0.05–0.10`, speed 1–3.
- **Chevrons** occupy a third, slightly-forward plane `z = 1.15` so they lead the dust on Home. Static per-sprite alpha `0.16–0.26` (D2), drift `chevronUp` at 4–9 px/s **upward**, `chevronDown` at 4–9 px/s **downward**, wrapping at `-26` and `cssH + 26`.
- **Position is a pure function of `elapsed`**, mirroring the existing wrap in `drawMotes` ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:477)). Nothing is stored or mutated per frame.
- **Opacity** = `spriteAlpha × breathe × fieldAlpha`, with `breathe = 0.62 + 0.38·sin(elapsed·0.5 + phase)` exactly as today ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:480)).
- **Parallax** reuses `clamp(scrollY × 0.06, −96, 96) × z` ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:468)). Chevrons therefore lead dust by 15 % on Home and stay put on gameplay (no scroll).

### 2.6 Text-safe and card-safe masking

Two protections, both **bake-time only** (no DOM read and no branch in the loop — the existing `destination-out` blit does the work; [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:657)):

1. **Existing gameplay bands are kept unchanged** (header `0…116`, half of the status band, control band `cssH − min(cssH×0.24, 208) … cssH`; [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:387)). Sprites drawn before the `safeLayer` blit are erased automatically.
2. **New card-safe rects**, read at bake from live DOM, punched into `safeLayer` with the same `destination-out` path:
   - `section[aria-label="Higher or lower comparison"] article[aria-label]` → up to 2 rects (both cards, including their labels and metadata);
   - `section[aria-label="Higher or lower comparison"] > div[aria-hidden="true"]` → the OR badge.
3. **Home gains one band**: `[data-atmo-safe="hero"]` (a new data attribute on the hero container, §7) — the hero wordmark block plus the `Start Comparing` CTA. Home currently has zero bands and non-zero alpha everywhere (measured: `792/792` probe points, `maxAlpha 79`), so without this band sprites would sit behind the wordmark's offset text-shadow.

**Accepted consequence:** the mask is binary, so sprites are erased with a hard edge at a card border. Because the card face is `--surface-raised` with a 4 px white border and an opaque plate, letting sprites pass *behind* it is a visual no-op anyway — erasing is both cheaper and more honest. Perceptual judgement of the hard edge is `Needs Verification [product-decision]` (§9.2).

**Staleness:** rects are re-read on every `resize()` and every `setSurface()` / `setLowEnergy()` rebake. A deck swap does not change a board box, so a stale rect can only occur if a card's box changes without any of those events; the failure mode is a faint hard edge, never text illegibility. Accepted.

### 2.7 Reactive input contract (no new events)

| Need | Existing carrier | Source |
|---|---|---|
| direction acted on | `guess.direction` | [`ClassicGame.tsx`](../components/game/ClassicGame.tsx:201), [`TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:277) |
| correctness + rung | `reveal.correct`, `reveal.tier` | [`ClassicGame.tsx`](../components/game/ClassicGame.tsx:211), [`TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:287) |
| phase / recession | `phase.phase` | already handled ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:911)) |
| pointer vs keyboard parity | `guess.source` — **ignored on purpose** | analysis §4.4 |

The engine stores the last `guess.direction` and consumes it on the following `reveal`. `lib/atmosphere/types.ts` therefore **needs no change** (§7.3).

### 2.8 Reduced motion: one frozen composed frame

`start()` short-circuits to a single `drawFrame()` and `elapsed` never advances ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:687)). Provided every sprite position is a pure function of `elapsed`, reduced motion yields **one static composed frame** containing dust and chevrons at their seeded positions — no drift, no breathe, no surge.

Reactive brightness under reduced motion is a **discrete state change**, not an animation: on `reveal`, the engine stores `assertiveDirection` and repaints once, drawing `chevron*Hot` for the winning family at a fixed `0.62` and the losing family at `0.08`. Nothing moves, nothing pulses, `getAnimations()` stays empty on the canvas (it is a canvas). Acceptance of “brightness changes, position does not” is `Needs Verification [product-decision]` (§9.3).

### 2.9 One canvas / one rAF invariant

- Sprites are offscreen canvases, never in the DOM.
- No `setInterval`, no second `requestAnimationFrame`, no `IntersectionObserver` inside the engine.
- All sprite work lives inside `drawFrame(timeMs)` ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:642)), which is called by the single self-scheduled `step()` ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:662)).

### 2.10 Compositor budget

Per frame at desktop maximum: 28 `drawImage` (sparks) + 10 `drawImage` (chevrons) + 3 layer blits (`staticLayer`, `vignetteLayer`, `safeLayer`) + the existing 2 impulse slots. No path construction, no gradient creation, no shadow, no filter. `drawImage` of a snug cached sprite is the cheapest canvas primitive available; the low-quality path already halves counts and skips every second frame ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:226)).

---

## 3. Reactive behaviour

### 3.1 The three beats

| Beat | Trigger (existing) | Field response |
|---|---|---|
| **Higher-correct** | `guess.direction === "higher"` then `reveal.correct === true` | Up-chevrons swap to `chevronUpHot`, gain a **+6 px upward offset**, alpha target `0.20 → 0.62`; down-chevrons drop to `0.08` and do not move. `near`-plane sparks get `dirY` bias `0.35` upward. Window **360 ms**. |
| **Lower-correct** | symmetric | Down-chevrons hot, **−6 px** (downward) offset, `0.20 → 0.62`; up-chevrons recede to `0.08`. |
| **Wrong** | `reveal.correct === false` | **One** fixed pulse: every chevron to `0.05` for **180 ms**; the whole field takes a single `+3 %` white lift for **80 ms**. No direction, no scale, no repeat. |

Amplitude envelope is deterministic and allocation-free:

```
u          = (t − beatStart) / 360          // 0..1
peakAt     = 0.17                            // 60 ms in
env(u)     = u < peakAt ? u / peakAt : (1 − u) / (1 − peakAt)
alpha(u)   = 0.20 + 0.42 · env(u)            // 0.20 → 0.62 → 0.20
offsetY(u) = 6 · env(u) · familySign
```

### 3.2 Non-escalation is a hard rule (D8)

- The wrong beat is **byte-identical** on the 1st and the 20th miss: one 180 ms recession, one 80 ms lift. No accumulation, no scale, no shake (the existing `.shake-brief` on the board is unchanged and remains the only wrong-answer jolt; [`globals.css`](../app/globals.css:574)).
- The correct beat is a **constant** 360 ms regardless of tier. Tier only selects how many already-seeded reserve pairs join the surge — it never lengthens or intensifies the beat, so a long streak cannot compound into a strobe.

### 3.3 Tier mapping (display-only)

| Tier | Extra pairs joining the surge | Window |
|---|---|---|
| 0 | 0 | 360 ms |
| 1 | 1 (reserve indices 6,7) | 360 ms |
| 2 | 2 (reserve 6,7 + 8,9) | 360 ms |
| 3 | 2 + existing `tier` ring ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:448)) | ring 420 ms (unchanged) |
| 4 | 2 + ring + reserve pair 1 re-drawn at full hot alpha + existing 4 % lift ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:627)) | lift 520 ms (unchanged) |

Mobile has no reserve (§2.4), so tiers 1–2 add no sprite there; the ladder is still fully legible through the tally, the ring and the lift. This is **C-3** and is a deliberate consequence of D2's fixed counts rather than a silent deviation.

### 3.4 Sync to the reveal beat

`reveal` is already emitted on the display beat with the tier resolved before the emit ([`ClassicGame.tsx`](../components/game/ClassicGame.tsx:211), [`TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:287)); the phase becomes `revealing` on the same commit. The surge therefore starts on the reveal, not on the click.

The surge window (360 ms) is shorter than the shortest reveal window by construction (Time Attack `400 ms`, Classic `1500 ms`), so it always resolves before the next beat.

### 3.5 Pointer + keyboard parity

Both paths reach the **same** `handleGuess` and emit the same `guess`/`reveal` events ([`ClassicGame.tsx`](../components/game/ClassicGame.tsx:276), [`TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:370)). The engine ignores `source` entirely: identical response, no reduced response for keyboard, no extra flourish for pointer.

### 3.6 No gameplay timing change

Every value above is render-only. Untouched: reveal windows (Classic `1500 ms`, Time Attack `800/400 ms`), timer cadence, deck order, scoring, tier resolver, storage.

---

## 4. Mode gradient and contrast

### 4.1 Mode accents (unchanged values, new visibility)

- Classic field tint `#6355cb`, Time Attack `#d93fd0`, both baked at `--atmo-tint-alpha 0.08` into the P0 horizon and P2 wash ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:328)). **No per-mode CSS is added** — under the scrim of §4.2 the accent difference becomes visible in the gutters for the first time.
- Accent is applied to **backgrounds, borders and shadows only**: card plate and 9 px face shadow ([`GameCard.tsx`](../components/game/GameCard.tsx:87)), back-control offset ([`GameplayShell.tsx`](../components/game/GameplayShell.tsx:57)), OR badge offset, dock edge. Never to text (D9).

### 4.2 Gameplay shell scrim (D7)

**Today:** one flat `color-mix(… 84 %)` background ([`app/globals.css`](../app/globals.css:899)). Measured consequence: only ≈ 1 % of the field survives behind gameplay — the “16 % show-through” reads as a flat navy panel (analysis §5.1).

**Design:** replace the flat fill with a **three-layer background** on the same `.gameplay-surface` element, ordered grid-on-top so the existing dot grid keeps its current appearance:

```css
.gameplay-surface {
  background-color: var(--surface-background);           /* opaque fallback */
  background-image:
    linear-gradient(to right,  var(--grid-line) 1px, transparent 1px),   /* grid x — top */
    linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px),   /* grid y */
    radial-gradient(120% 90% at 50% 45%,
      rgba(21, 18, 43, 0.86) 0%,        /* centre column: ≥ today's 84 % */
      rgba(21, 18, 43, 0.80) 55%,
      rgba(21, 18, 43, 0.60) 100%);     /* gutters: field becomes perceptible */
  background-size: 3.375rem 3.375rem, 3.375rem 3.375rem, 100% 100%;
  background-repeat: repeat, repeat, no-repeat;
}
```

- The **centre stop is 86 %**, i.e. **more** opaque than today's 84 %, so every text/card surface is at least as legible as measured.
- Gutters fall to 60 %, where the design has no text.
- Because `.gameplay-surface` overrides `background-image`, the `.bg-grid` layers must be **re-declared here** — otherwise the grid disappears on gameplay (**C-4**). This also removes the `color-mix()` dependency from this rule, widening support rather than narrowing it.
- The header keeps its own opaque `bg-[var(--surface-background)]` ([`GameplayShell.tsx`](../components/game/GameplayShell.tsx:49)), so the scrim never sits behind header text.

### 4.3 Contrast — measured before, computed after

Measured on `#15122b` (analysis §5.3). “After” values are **computed** by compositing the canvas sample over `#15122b` and then the new scrim stop; they are the design targets the QA stage must re-measure.

| Pair | Before (measured) | After, centre 86 % (computed) | After, gutter 60 % (computed) | AA normal 4.5 |
|---|---|---|---|---|
| `#ffffff` on shell | 18.21 | ≈ 18.0 | ≈ 17.8 | pass |
| `#d4ceff` `--text-secondary` | 12.20 | ≈ 12.1 | ≈ 11.9 | pass |
| `#aaa3d5` `--text-muted` | 7.72 | ≈ 7.85 | ≈ 7.73 | pass |
| `#22d3ee` focus ring | 10.08 | ≈ 9.9 | ≈ 9.8 | pass |
| `#ffcc00` highlight | 12.04 | ≈ 11.9 | ≈ 11.7 | pass |
| `#d93fd0` Time Attack accent | 4.83 | ≈ 4.8 | ≈ 4.7 | pass |

Net: **no pair loses AA**, and the centre column is marginally *safer* than today.

### 4.4 D9 — `#6355cb` and the Lower button

**Rule adopted:** `#6355cb` may be used **only** as a background/accent/sprite/shadow colour. It is forbidden as a text colour and as the background behind text.

| Current use | Verdict |
|---|---|
| card plate, face shadow, back-control offset, OR badge offset, dock edge, canvas tint | **allowed** (non-text) |
| hover `text-shadow` on selection labels ([`CategoryCard.tsx`](../components/CategoryCard.tsx:52), [`ModeButton.tsx`](../components/ModeButton.tsx:62), [`DomainSelector.tsx`](../components/home/DomainSelector.tsx:81)) | **allowed** (shadow, not text fill) |
| `components/HighScoresModal.tsx` selected score tab: `bg-[var(--accent-classic)] text-white` ([`HighScoresModal.tsx`](../components/HighScoresModal.tsx:281)) | **VIOLATION — white on `#6355cb` = 3.20 : 1 (measured).** File is frozen ⇒ flagged as **C-2 / expansion request HV-1**, not fixed silently |

**Lower decision button** — measured `white on #d93fd0 = 3.77 : 1` at `text-sm`/`text-base` bold ([`DecisionControls.tsx`](../components/game/DecisionControls.tsx:48)). Design fix (D9):

- Change the Lower label to the **same dark ink the Higher button already uses**, `text-[#15122b]` ([`DecisionControls.tsx`](../components/game/DecisionControls.tsx:39)).
- `computed`: `#15122b` on `#d93fd0` = **4.83 : 1** ⇒ **AA normal pass** (≥ 4.5).
- This makes the button pair symmetric (dark ink on both saturated faces), keeps the reference's white **offset layer** untouched (`shadow-[5px_5px_0_#ffffff]`), and changes no colour token.
- Rejected alternative: darkening `--accent-action-lower` — it would silently repaint the decision control, the down-chevron sprite family, and the hero's per-word shadow; that is a brand change, not a contrast fix. Retained only as an owner option (§9.6).

**New UI under this rule:** the dock (§6) and the entrance wrapper never place text on `#6355cb`. The dock's Classic cue is an `#6355cb` **edge/offset shadow** with white/`#d4ceff` text on its own `#211d3a` face (`white on #211d3a = 16.14` measured pass).

---

## 5. Transition and first-mount entrance

### 5.1 Route transition (D3)

**Today:** `::view-transition-new(.nav-forward)` runs `route-rise-in 220 ms` = fade **plus `translateY(8px)`** ([`app/globals.css`](../app/globals.css:749)). The movement is on the *whole incoming page*, which is exactly what would stack with a content entrance.

**Design:** retarget that one rule to the already-defined `route-fade-in` at `--motion-dur-quick` (140 ms), matching the outgoing fade:

```css
::view-transition-new(.nav-forward) {
  animation: route-fade-in var(--motion-dur-quick) var(--motion-ease-out) both;
}
```

- `route-rise-in` stays defined but unused (minimal diff; deleting it is not required).
- `::view-transition { pointer-events: none }` is already present ([`app/globals.css`](../app/globals.css:741)) and stays.
- The route's `<ViewTransition>` already passes `enter={{ "nav-forward": "nav-forward", default: "none" }}` and `default="none"` ([`app/game/[mode]/page.tsx`](../app/game/[mode]/page.tsx:49)), so a future `loading.tsx` could not double-fire without an explicit change. No page-file edit is needed (**§7.3**).
- Reduced motion already overrides this pair to a linear 140 ms fade with `animation-duration: 0s` elsewhere ([`app/globals.css`](../app/globals.css:780)); unchanged.

### 5.2 No `loading.tsx` (D3)

Framework truth, from the locally installed guide (authoritative per `AGENTS.md`): *“If the destination suspends into a fallback first, no pair forms, and the content animates with its enter animation instead when it arrives.”* A `loading.tsx` would therefore introduce a **second transition stage** (fallback enter + content enter). Measured click→shell is **90–121 ms** warm (`[environment-specific]`); a skeleton that flashes for < 120 ms is a perceived-quality regression. Default and only path: **entrance, no skeleton.**

### 5.3 Entrance choreography — 380 ms, transform + opacity only (D4)

One client wrapper, `.gameplay-entrance`, applied to the **existing** gameplay body `<div className="relative flex min-h-0 flex-1 flex-col">` ([`ClassicGame.tsx`](../components/game/ClassicGame.tsx:332), [`TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:482)) — one class, **no new DOM node**, so layout is untouched.

Re-timed from the analysis's step table to satisfy D4's 380 ms exactly (**C-1**):

| # | Beat | Element (CSS target, read-only descendant of `.gameplay-entrance`) | From → to | Duration | Delay | Ends |
|---|---|---|---|---|---|---|
| 1a | card pair | `> section[aria-label="Higher or lower comparison"] > div:nth-child(1)` | `opacity 0→1`, `translateY(10px)→0` | 240 ms | 0 ms | 240 |
| 1b | card pair | `> … > div:nth-child(2)` | `opacity 0→1`, `translateY(-10px)→0` | 240 ms | 32 ms | 272 |
| 2 | OR badge | `> … > div[aria-hidden="true"]` | `opacity 0→1`, `scale(.96)→1` | 180 ms | 96 ms | 276 |
| 3 | tally | `.gameplay-entrance-status` | `opacity 0→1` | 140 ms | 168 ms | 308 |
| 4 | controls | `.gameplay-entrance-controls` | `opacity 0→1`, `translateY(6px)→0` | 160 ms | 220 ms | **380** |

- **Beat order is preserved by start time** (0 < 32 < 96 < 168 < 220); the eight-millisecond stagger overlap between 1a and 1b is intentional and matches the existing `enterDelay={0.04}` handoff rhythm.
- Easing `--motion-ease-out`; `animation-fill-mode: backwards` so each element holds its “from” state before its delay and simply reverts to its natural state afterwards (no sticky inline style).
- The OR badge is `hidden md:flex` ([`ComparisonBoard.tsx`](../components/game/ComparisonBoard.tsx:43)), so beat 2 is a desktop beat by construction. `ComparisonBoard.tsx` stays frozen — the selector reads it, it is not edited.
- Card wrappers are plain `div`s ([`ComparisonBoard.tsx`](../components/game/ComparisonBoard.tsx:34)), **not** the Motion `article`s, so there is no competition with `GameCard`'s own inline `initial`/`animate` (which is `false` on first paint anyway; [`GameCard.tsx`](../components/game/GameCard.tsx:66)).

### 5.4 Zero layout shift, zero input blocking

- Every animated element already occupies its final box at first paint; only `opacity` and `transform` change. No `height`, `margin`, `filter`, `box-shadow`, or `top`.
- `pointer-events` is never disabled; `opacity` does not affect hit-testing. The buttons are real, enabled `<button>`s from frame 1 — the player can guess before the entrance finishes.
- Baseline CLS from postfix2's Classic playthrough was **0.00053**; the entrance must not change it (verification **V7**).

### 5.5 Reduced motion: CSS-gated, no SSR/JS branch

Rendered markup is **identical** in both modes. The gate is a pure CSS media override, following the file's existing pattern for `.value-land` / `.row-cascade` ([`app/globals.css`](../app/globals.css:705)):

```css
@media (prefers-reduced-motion: reduce) {
  .gameplay-entrance > section[aria-label="Higher or lower comparison"] > div,
  .gameplay-entrance-status,
  .gameplay-entrance-controls {
    animation: tint-in 120ms linear 0ms backwards !important;
  }
}
```

This is the direct lesson from the live hydration mismatch: `heroEntrance` branches on `useReducedMotion()` and the client renders `opacity:1` while the server marked up `opacity:"0"`, producing React’s one console error ([`HomeSetup.tsx`](../components/home/HomeSetup.tsx:172)). **The entrance introduces no such branch.** This pass does **not** fix that pre-existing hero bug (outside scope; §9.5).

### 5.6 No double animation

| Risk | Status in this design |
|---|---|
| route rise (8 px) stacking with the card entrance (10 px) | **removed** — route is opacity-only (§5.1) |
| `loading.tsx` fallback enter + content enter | **impossible** — no `loading.tsx` (§5.2) |
| entrance wrapper + `GameCard` handoff on the same node | **impossible** — wrapper animates the parent `div`, `GameCard` untouched (§5.3) |
| entrance + reveal tint on the same node | entrance ends at 380 ms; a guess cannot land before the cards are read; the tint is inside the card face, not on the wrapper |
| reduced-motion JS branch re-creating the hydration mismatch | **avoided** — CSS-only gate (§5.5) |

### 5.7 Game-over overlay unchanged

The overlay is a **sibling** of the gameplay body inside `GameplayShell` ([`ClassicGame.tsx`](../components/game/ClassicGame.tsx:382), [`TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:534)). Because the entrance is a class on the body div only, the overlay — including its focus trap, its `8px 8px 0` accent shadow and its `role="dialog"` — is structurally outside the entrance and stays byte-identical.

---

## 6. Scroll-free Go dock

### 6.1 The problem, restated from measurement

After `Start Comparing`, the primary `go!` is **529 px below the fold** at 390×844 and **105 px below** at 1440×900. The CTA never reveals the action it promises.

### 6.2 Behaviour

A compact bar fixed to the bottom of the viewport.

- **Shows** when `#setup` is intersecting the viewport **and** the real `.home-go` is **not** intersecting.
- **Hides** as soon as `.home-go` enters view (never two CTAs on screen at once) and when `#setup` leaves view upward (hero region).
- **Content:** current Category name · current Mode name · `GO!`.
- **Height:** ≈ 64 px content + `env(safe-area-inset-bottom)`.

### 6.3 One observer, no second one

`HomeSetup` already runs a single `IntersectionObserver` over `heroAnchorRef` and `goButtonRef` ([`HomeSetup.tsx`](../components/home/HomeSetup.tsx:84)). The design **adds one `observe(setupRef)`** to that same observer and one boolean state (`dockVisible`) computed in the same callback. No second observer, no scroll listener, no rAF.

### 6.4 Same launch path, no new plumbing

The dock button calls the existing `startGame()` ([`HomeSetup.tsx`](../components/home/HomeSetup.tsx:157)) passed down as `onLaunch`, inheriting:

- the `route` event with `intent: "forward"` → canvas reset + `launch` impulse + the `launch` SFX;
- `router.push(..., { transitionTypes: ["nav-forward"] })` → exactly one `startViewTransition` (measured 1 today);
- the `canPlay` disabled semantics.

**`target: "go"` classification.** `audioEngine.ts` maps `target === "go"` to the `launch` SFX ([`audioEngine.ts`](../lib/audio/audioEngine.ts:302)) and the canvas maps it to the `launch` warp ([`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:756)). The only current route to that target is `classList.contains("home-go")` ([`delegation.ts`](../lib/atmosphere/delegation.ts:120)).

The dock therefore carries a **dedicated semantic attribute `data-atmo-go`**, and `delegation.ts` gains one additive branch resolving it to `{ target: "go", cue: "press" }`.

Why not reuse the `home-go` class (the analysis's “zero-change path”)? Because `.home-go` is not a semantic class — it also paints a magenta `::before` plate, a 2 px white `::after` ring, a magenta hover fill, and a `translate(4px,4px)` press ([`app/globals.css`](../app/globals.css:156)–[`186`](../app/globals.css:186)). Putting it on a compact pill would import four unwanted presentations and force counter-overrides. **C-7** records this; the expansion is already approved by D5.

Because the origin rect comes from the button itself, the warp ring starts **at the dock**, which is the point of the dock.

### 6.5 Placement, layering, no CLS

| Property | Design |
|---|---|
| positioning | `position: fixed`; `left: 50%; transform: translateX(-50%)` |
| vertical | `bottom: max(0.75rem, env(safe-area-inset-bottom))` |
| width | `width: min(92vw, 26rem)` — no horizontal overflow at 390 or 1440 (measured `scrollWidth === innerWidth` today) |
| layers | `z-index: 40` — above page content, below the `<dialog>` (native top layer) |
| CLS | **zero by construction** — out of flow (web.dev, *Optimize CLS*: overlay rather than flow) |
| overlap | audio control is in an `absolute` header that scrolls away ([`HomeSetup.tsx`](../components/home/HomeSetup.tsx:198)); no decision row exists on Home; the footer's last 49 px stay reachable by scroll |
| modal | additionally hidden when `html[data-modal="open"]` ([`AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx:140)); belt-and-braces, since `dialog.showModal()` already makes the page inert ([`HighScoresModal.tsx`](../components/HighScoresModal.tsx:78)) |
| ancestor clipping | `position: fixed` escapes `<main class="overflow-x-clip">` because main does not establish a containing block for fixed descendants; confirmed by runtime check **V9** |

### 6.6 Show/hide mechanics and D6 keyboard behaviour

- Always mounted, never unmounted: `data-open="true|false"` toggles `opacity`, `translateY(8px)`, `visibility`.
- `visibility: hidden` (not `display:none`) keeps the transition alive **and** removes the dock from the tab order and the accessibility tree while closed — so there is never a second focusable “go” behind the page.
- **D6:** one `visualViewport` `resize` listener sets `data-keyboard="open"` when `visualViewport.height < window.innerHeight * 0.75`, which applies `visibility: hidden`. No rAF, no polling; the listener is removed on unmount.
- Reduced motion: the show/hide becomes a pure opacity swap with `animation-duration: 0s` (the global hard-strip already guarantees this; no extra rule needed beyond declaring the transition inside `prefers-reduced-motion: no-preference`).

### 6.7 Accessibility

| Requirement | Design |
|---|---|
| name | `aria-label="Go! Start the selected game"` — deliberately **not** “Start Comparing”, which the classifier maps to `target: "start"` ([`delegation.ts`](../lib/atmosphere/delegation.ts:114)) |
| role | real `<button type="button">`, `disabled` when `!canPlay` |
| keyboard | native `Enter`/`Space`; focus ring from the global `:focus-visible` (`3px solid #22d3ee`), `outline-offset: 4px`; ring contrast `10.08` measured on base (`computed ≈ 9.8` on the gutter scrim) |
| discovery | context line is `<p>` text (“Movies & Series · Classic”), not a placeholder — the dock is a real summary of the current selection |
| state | no `aria-live`; the dock is a control, not a status. Selection changes are already announced by the radio group itself |
| truncation | category name `truncate` with the full name in `aria-label` of the GO! button so a long label never hides meaning |
| reduced motion | no motion-only information; the shown/hidden state is not encoded in motion |

### 6.8 Visual treatment

Dark navy face `--surface-raised #211d3a`, `border-2 border-white`, `shadow-[5px_5px_0_var(--accent-classic)]` (Classic cue as a *shadow* only, D9-compliant), `rounded-full`, Space Mono, `text-white` for the category and `text-[var(--text-secondary)] #d4ceff` for the mode. `GO!` is a magenta pill with `text-[#121212]` — the exact pairing already measured at **4.97 : 1** on the main `go!` ([`HomeSetup.tsx`](../components/home/HomeSetup.tsx:325)).

---

## 7. Accessibility, performance, and the file set this design implies

### 7.1 Accessibility summary

- **Focus:** no new outline styles, no `outline: none`; global `:focus-visible` is the single indicator. The closed dock is `visibility: hidden` ⇒ not tabbable (no second “go” in the tab order).
- **Contrast:** every pair in §4.3 passes AA; the Lower button moves from 3.77 (fail) to 4.83 (pass); `#6355cb` is never text.
- **Reduced motion:** identical markup, CSS-gated; the canvas stays one frozen frame; the routing fade survives; the entrance becomes opacity-only; the dock swap loses its translate.
- **No motion-only information:** correctness is carried by `role="status"` text, the card tint and the tally — the field is always decorative.
- **No new dependencies:** zero `package.json` change.

### 7.2 Performance budget

- One canvas, one rAF, one `IntersectionObserver` (Home), one `visualViewport` listener (Home), one `resize` listener (engine, existing).
- Zero DOM reads in the frame: all rect reads happen at bake.
- Zero allocation in the frame: seeded pools, no per-frame closures, no gradient creation.
- Sprite caps are fixed numbers (§2.4), not adaptive, so the worst case is bounded and testable.
- Compositor-only CSS in the entrance and the dock (`opacity`, `transform`).

### 7.3 Files — what this design requires, verified against source

**Required new:** `lib/atmosphere/sprites.ts`; `components/home/LaunchDock.tsx`; `components/game/GameplayEntrance.tsx`.

**Required modified:** `lib/atmosphere/canvasEngine.ts`; `lib/atmosphere/delegation.ts`; `components/home/HomeSetup.tsx`; `components/game/ClassicGame.tsx`; `components/game/TimeAttackGame.tsx`; `components/game/DecisionControls.tsx`; `app/globals.css`.

**Approved expansions verified as NOT required** (recorded so the implementer does not touch them):

| File | Why it is not needed |
|---|---|
| `components/atmosphere/AtmosphereBackdrop.tsx` | `guess`/`reveal`/`phase` already reach `engine.handleEvent` ([`AtmosphereBackdrop.tsx`](../components/atmosphere/AtmosphereBackdrop.tsx:98)); `setSurface` on pathname change already triggers the rebake that re-reads card rects |
| `lib/atmosphere/types.ts` | `guess.direction` + `reveal.tier` + `phase` cover every reactive need (§2.7) |
| `app/game/[mode]/page.tsx` | `enter` map and `default="none"` are already correct; the fade is a CSS retarget (§5.1) |
| `components/game/GameplayShell.tsx` | the scrim lives on `.gameplay-surface` on the shell's own root element, changeable in CSS alone; the tally is animated through the `status` prop React node, not the shell |
| `components/game/ComparisonBoard.tsx` (frozen) | entrance targets its existing `div`s by selector; the OR beat adds nothing to it |

**New expansion requests raised by this design** (not silently absorbed):

- **HV-1 / C-2** — `components/HighScoresModal.tsx:281` is the one live `#6355cb`-as-text violation (3.20 : 1). Frozen; needs an owner decision to reopen the file or to accept the instance.
- **HV-2 / C-5** — none: no additional file is required beyond HV-1.

---

## 8. Anti-patterns and anti-references

**Rejected for this pass**

- A `loading.tsx` skeleton — measured 90–121 ms warm makes it a flash, and it introduces a second transition stage (§5.2).
- Option 2's desktop 2-column `#setup` — invalidates the pinned home composition and needs its own design pass (D1).
- Escalating wrong-answer feedback (repeating shake, scale, lengthening or intensifying with streak) — the anti-pattern that turns a game into a strobe (§3.2).
- Per-frame `shadowBlur`, per-frame `filter`, per-frame `createRadialGradient` for glow, scaling a sprite inside `drawImage`, non-integer coordinates.
- A second `<canvas>`, a second `requestAnimationFrame`, an `IntersectionObserver` inside the engine, or a `setInterval` for the dock.
- Reusing `.home-go` on the dock for delegation convenience (§6.4 / **C-7**).
- Any reduced-motion branch expressed in JS/SSR (the live hydration bug, §5.5).
- Animating `height`, `margin`, `filter`, or `box-shadow` in the entrance or the dock.
- Using `#6355cb` as text, or lightening the Classic accent token inside this pass (D9, §4.4).
- Converting game components to shadcn primitives, or adding an animation library.

**Anti-references (explicitly not the target)**

- The generic “shimmer sweep” skeleton.
- Soft/blurred glow behind cards; the identity uses hard offset shadows.
- A floating action button that duplicates a visible primary CTA on screen.

---

## 9. Open questions / `Needs Verification`

1. **DPR 2/3 sprite crispness** — the bake is specified device-first (§2.3) but the test browser reported `devicePixelRatio 1`. `[Not tested]`.
2. **Perceptual acceptance** of sprite density, surge amplitude, the hot-chevron white core, the 60 % gutter, and the hard card-mask edge. `[product-decision]` — requires the owner's eyes.
3. **Reduced-motion reactive brightness** (discrete hot/base swap on reveal, no motion). `[product-decision]` — alternative is to suppress reactive field changes entirely under reduced motion.
4. **Cold production navigation latency** — the 90–121 ms figure is a warm local dev server. `[environment-specific]`.
5. **Pre-existing reduced-motion hero hydration mismatch** (`HomeSetup.tsx:172`, measured 1 console error) — traced, **not** fixed here; the entrance deliberately does not repeat the pattern. Whether to fix it in this pass is `[product-decision]`.
6. **Lower-button fix shape** — dark ink `#15122b` (4.83 : 1, chosen) vs darkening `--accent-action-lower` (brand change). `[product-decision]`.
7. **HV-1** — the `HighScoresModal` selected-tab instance of `#6355cb`-as-text lives in a frozen file; needs an owner decision to reopen it. `[product-decision]`.
8. **Chevron tier reserve on mobile** — D2's 6 mobile chevrons leave no reserve, so tiers 1–2 add no sprite on mobile (**C-3**). `[product-decision]` if parity is required.
9. **Card-safe rect staleness** when a card's box changes without resize/surface/low-energy (§2.6). `[inferred-from-codebase]` — failure mode is cosmetic only.
10. **Whether the dock should appear at all on desktop** — measured need is real (105 px) but shareable with mobile. Folded into D1/D6; `[product-decision]` only if the owner wants a desktop-only variant.
11. **`html[data-modal="open"]` × card combined state** — carried from postfix2, still unreachable in practice. `[Not tested]`.

### Contradictions flagged rather than resolved silently

- **C-1 — entrance timing.** The analysis's §6.3 step table (durations 260/200/160/220 ms at delays 0–40/120/200/240) sums to **460 ms**, while the same table's footnote and D4 both require the last transform to settle at **380 ms**. This design re-times to 240/180/140/160 ms at 0/32/96/168/220 ms so the four beats land in the required order and the last transform ends at exactly 380 ms. The analysis's own numbers cannot both be satisfied; D4 wins.
- **C-2 — D9 vs a frozen file.** A live `#6355cb`-as-text instance exists in `components/HighScoresModal.tsx` (3.20 : 1), which D5's allowlist frozen-lists. Flagged as HV-1; not fixed.
- **C-3 — D2 vs the tier ladder.** 10 desktop chevrons = 6 base + 4 reserve = 2 usable extra pairs, but tier 4 asks for a third pair. Specified as “reuse reserve pair 1 at full hot alpha”, so the pool never grows; mobile has no reserve at all.
- **C-4 — D7 vs the dot grid.** `.gameplay-surface` and `.bg-grid` share one element and both want `background-image`; a naive scrim would delete the gameplay grid. The scrim is therefore specified as a three-layer background with the grid re-declared on top.
- **C-5 — masked sprites have a hard edge at the card border.** Accepted with rationale (§2.6); perceptual call remains open (§9.2).
- **C-6 — “frozen frame” vs “reactive brightness”.** Analysis §3.5 asks for static brightness steps under reduced motion; a frozen frame cannot animate. Resolved as a single discrete repaint per reveal (no motion, no loop); acceptance is open (§9.3).
- **C-7 — the analysis's “zero-change” `home-go` reuse.** `.home-go` carries four presentations beyond semantics ([`app/globals.css`](../app/globals.css:156)); the dock uses a new `data-atmo-go` attribute plus a one-line delegation branch instead. This contradicts the analysis's §7.2 recommendation but is within D5's approved expansion.
