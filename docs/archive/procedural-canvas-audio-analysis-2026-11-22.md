# Procedural Canvas Backdrop + Web Audio System — Analysis

**Date:** 2026-11-22
**Stage:** **Analysis only.** No application code, config, manifest, or existing document was edited.
**Task type:** Visual/interaction change (procedural canvas layer) + new interaction subsystem (procedural audio) — *refinement preserves*, not redesign replaces.
**Status:** Analysis complete. Design and Plan require owner sign-off. Code stage not started.

---

## 0. Correction log (integrity pass, 2026-11-22)

This section records what the integrity pass changed, in the order the work was
done. Only this document was edited; no screenshot was added or replaced.

### 0.1 Contamination status — as found

A token scan of this document was run at 11:33Z on 2026-11-22 for `Query C`,
`global discovery`, `Level 4.1`, `computeYield`, `lib/formulas`, `lib/hooks`,
`useCountdown`, `useClicker`, `lib/prestige`, `lib/save`, `lib/idle`, `S1`–`S5`,
`C1`–`C4`, `prestige layer`, and `save/migration`.

**Result: zero hits inside this document.** The described "Query C (global
discovery)" section, the ranked singles S1–S5, the clusters C1–C4, the
`lib/prestige` / `lib/save` / `lib/hooks` file references, the `computeYield`
"Level 4.1" chokepoint, and the "blocked: no repo, no test/type-check" statement
were **not present in the file as found**. Nothing of that kind was removed
because nothing of that kind existed at scan time.

Cross-document hits were unrelated and were left untouched:

- `S1`–`S5` appear as **QA step IDs** in
  `docs/immersive-motion-redesign-{qa,plan,handoff,postfix}-2026-11-22.md`.
- "global discovery" appears as a **Steam/SteamSpy ranking phrase** in
  `docs/api-capabilities-analysis.md:97`.

Whether this document was corrected before this pass, or whether the brief
described a different revision, is not determinable from the working tree
because `docs/` is untracked (no git history to diff against).
`Needs Verification [environment-specific]`.

### 0.2 Embedded instructions

The document was scanned for agent-directed imperatives. The only matches were
descriptive prose about the probe (`"Canvas frames were not visually reviewed by
the agent"`, §3.0). No instruction addressed to an executing agent was found, so
none was removed. External site content quoted in §3 remains treated as untrusted
data, not instruction.

### 0.3 What was re-verified in this pass (all live, 2026-11-22 ~11:33–11:35Z)

| Check | Method | Outcome |
|---|---|---|
| Git baseline | `git branch --show-current`, `git rev-parse --short HEAD`, `git status --porcelain=v1 -b`, `git diff --cached --stat`, `git diff --stat` | `lj-branch`, HEAD `ea650b7`, **15 modified**, **649 insertions / 55 deletions**, **0 staged**, untracked = `.agents/`, `.playwright-mcp/`, `docs/`, `skills-lock.json`, `types/view-transition.d.ts` — matches §2 exactly |
| Screenshot set | directory listing of `docs/assets/procedural-canvas-audio/` | **9 PNGs present**, names match §1.2 and §12 exactly |
| `app/layout.tsx` | read-back | 42 lines; `<body>` class string at `:37` is byte-for-byte `min-h-full flex flex-col bg-grid bg-noise antialiased` |
| Route wrappers | read-back `app/page.tsx`, `app/game/[mode]/page.tsx` | `<ViewTransition enter/exit keyed nav-forward default="none">` in both `page.tsx` files, **not** in a layout |
| `GameplayShell` opacity | read-back + computed style | `bg-[var(--surface-background)]` at `:45`, computed `rgb(21, 18, 43)`, `position: relative`, `isolation: isolate`; header at `:48` computed `backdrop-filter: blur(8px)` |
| Home desktop | Playwright 1440×900, DPR 1 | doc **2242 px**, scrollWidth **1435**, `h1` 152 px, **0** canvases, **2** animations (`ambient-bob`, `ambient-drift`), High Scores **132×44 at (1247,20)**, `go!` **176×176 at (630,1889)** |
| Home mobile | Playwright 390×844, DPR 1 | doc **2489 px**, scrollWidth **385**, `h1` **56 px**, High Scores **132×44 at (237,20)** (237–369), `go!` **144×144 at (121,2201)** |
| Classic desktop | Playwright 1440×900 | doc **900 px**, header **90 px**, back **44×44 at (24,22)**, status cluster **1300–1416**, Higher **283×54 at (919,724)**, Lower **(919,790)**, **0** canvases, **0** animations |
| Classic mobile | Playwright 390×844 | doc **1252 px**, back at **(16,22)**, status **264–369**, Higher **y 1100**, Lower **y 1166**, **x 51–334** |
| Time Attack desktop | Playwright 1440×900 | header **138 px** (88 grid + 48 footer), timer **37×36 at (24,88)**, progressbar **1334×12** ending at **1411**, **1** animation (`width`) |
| High Scores modal | Playwright 390×844 | dialog **347×450 at (19,197)**, `:modal` **true**, backdrop `rgba(9,7,25,0.78)`, `home-dialog-in` **180 ms**, focus `Close High Scores`, `elementFromPoint(300,40)` → `DIALOG` |
| Allowlist / frozen paths | `if exist` per path | every existing path in §8 confirmed present; proposed paths are non-existent by design |

### 0.4 Corrections applied by this pass

| # | Where | Was | Now |
|---|---|---|---|
| C1 | §2.1 baseline table | Time Attack doc height **924 px** | **954 px** measured; doc height is content-dependent (card art/text height varies per item), so the value is recorded as observed, not fixed |
| C2 | §4.1 noise row | selector `body::after`; "`opacity .025`" | selector **`.bg-noise::after`** (the class is on `<body>`); the `0.025` is the **SVG rect's fill opacity inside the data URI**, not a CSS `opacity` declaration; add `content: ""` |
| C3 | §4.1 dot-grid row | citation `:112` | `:112–:117` — `.bg-grid` opens at `:112`, `background-size: 3.375rem 3.375rem` is at **`:116`** |
| C4 | §4.2 body row | "`body::after` (fixed, `z-index: 0`)" | "**`.bg-noise::after`** on `<body>`" — same computed facts, correct selector |
| C5 | §4.4 keyframe citations | range `:502`–`:625` | add `fadeInUp` at **`:347`**, which the original range omitted |
| C6 | §4.4 modal row | `HighScoresModal.tsx:68–:95` | **`:68–:90`** (open/close effect) **+ `:131`** (`handleClose`); `:92–:95` is the unrelated legacy-migration effect |
| C7 | §5.1 H15/H16 | "click ×3" | **two presses** — one to open the inline confirm, one to confirm (source: `:351–:404`, `:406–:456`) |
| C8 | §5.1 H10 | (position only) | unchanged values, re-measured and confirmed at both viewports |
| C9 | §7.1 Home row | audio row would extend "to ≈193 at 390" | **≈185 at 390** (measured header left 237 − 44 control − 8 px `gap-2`); **≈1195 at 1440**. The original figure omitted the flex gap |
| C10 | §7.1 gameplay row | title width shrinks "~48 px" | **~52 px** (44 px control + 8 px `gap-2` at 390). Basis: measured grid columns `44 / 187.8 / 105.2` at 390 and `44 / 1199.7 / 116.3` at 1440 |
| C11 | §7.1 bottom-of-viewport row | "`elementFromPoint(bottom-left)` → `NEXTJS-PORTAL`, `(bottom-right)` → `IMG`" | **Not reproducible.** Measured at 1440×900 gameplay: both bottom corners hit the gameplay body `div.relative.flex.min-h-0.flex-1.flex-col`. At 390×844 both hit the comparison-board `<section>`, and the card plane spans **x 16–369**, so a 12 px-inset fixed chip still lands on card content. Conclusion (do not place a fixed bottom chip) is unchanged; the evidence is now the measured hit-test above |
| C12 | §5.2 G4/G5 | events "click, pointerdown, hover, focus-visible" | add **`keydown` Enter/Space** (native button activation → same `onClick` → same `handleGuess`), so pointer/keyboard parity is explicit in the matrix |
| C13 | §8.1 heading | (new files listed flat) | marked **PROPOSED — not present in the repository** so new paths cannot be mistaken for existing ones |
| C14 | §12 verification line | "all 13 components in scope" | **15** feature components (`components/*` 3, `components/game/*` 9, `components/home/*` 3) |
| C15 | §3.0 | present-tense claims | added the inherited-evidence note in §3.0: reference-site numbers were **not re-run** in this pass; the 9 screenshots exist on disk; the numbers remain prior-pass Playwright evidence, `[Not tested]` in this pass |

### 0.5 Remaining uncertainties (carried forward, unchanged in kind)

- Reference-site measurements (canvas buffers, `AudioContext` lifecycle,
  `localStorage` keys, `prefers-reduced-motion` counts) rest on the earlier
  Playwright pass. They were **not re-observed** in this correction pass and are
  not claimed as re-verified. `Needs Verification [capability-unavailable]` for
  this pass.
- Time Attack document height is content-dependent; the §2.1 value is one
  observed sample, not a constant.
- The view-transition-snapshot behaviour of a layout-mounted canvas remains
  `Needs Verification [inferred-from-codebase]` (§11.2).
- Product decisions D1–D14 remain open owner calls (§10).

### 0.6 Stage statement re-validated

**Analysis only.** This pass edited one document. No application code, config,
manifest, route, component, provider, or existing document was changed. Design
and Plan remain **not started** and await owner sign-off on §10. Code, QA,
Postfix, and Reconciliation remain not started. No build, type check, lint, or
test was run (the project has no test framework; the owner's dev server was only
read from, never stopped).

---

## 1. Task type, scope, and stage statement

### 1.1 What was asked

Two coupled features, analysed together because they share one trigger vocabulary:

1. A persistent, full-viewport **2D procedural `<canvas>` backdrop** with "deep bidirectional choreography" against every interactive control on Home, Gameplay, and Modals.
2. A **procedural Web Audio API sound system**: synthesized SFX, toggleable idle/theme BGM, and an unobtrusive audio-control UX.

Audiovisual *principles* are adopted from `krillion.io`, `noillirk.com`, and `fairways.world`. Nothing about their fiction, palette, typography, WebGL stack, or layout is adopted.

### 1.2 What this document is

| Item | Value |
|---|---|
| Pipeline stages used | Analysis (this document) |
| Stages explicitly **not** started | Design, Plan, Code, QA, Postfix, Reconciliation |
| Code changed | **None** |
| Config changed | **None** |
| Files created | This document + 9 screenshots under `docs/assets/procedural-canvas-audio/` |
| Preserved untouched | All 15 pre-existing modified files, all untracked paths, and all six `docs/immersive-motion-redesign-*.md` documents |

### 1.3 Inherited constraints carried forward verbatim

From the completed immersive-motion work (which this feature must not regress):

- Five-tier ladder, reveal-time tally, `<ViewTransition>` route transition, reduced-motion opacity crossfades, two Home-only ambient loops, unchanged game-over entrance, byte-identical legacy CSS blocks.
- No changes to gameplay rules, deck logic, scoring, providers, high-score storage, or timing constants (`1500`, `800`, `400`, `1000`, `460` ms).
- Keyboard shortcuts must produce the **same** canvas impulses and SFX as pointer actions.
- The pre-existing F4 reduced-motion hydration mismatch stays out of scope.

New constraints added by this brief:

- Preserve dark-neon arcade identity, tokens, Space Mono, offset-shadow geometry, noise overlay, and layout.
- Never compete with `GameCard` cover art; never reduce text or focus contrast.
- Zero heavy dependencies: native Canvas 2D + Web Audio only, **no MP3/WAV assets**.

---

## 2. Working-tree baseline (Step 1)

Command output recorded before any write, on 2026-11-22, and independently
re-run and confirmed during the 11:33Z integrity pass — identical output,
including HEAD `ea650b7`, 15 modified files, 649 insertions / 55 deletions,
nothing staged, and the same five untracked paths.

```
$ git branch --show-current        → lj-branch   (upstream: origin/lj-branch)
$ git status --porcelain=v1 -b     → ## lj-branch...origin/lj-branch
$ git diff --cached --stat         → (empty — nothing staged)
$ git log --oneline -5             → ea650b7 refactor(twitch): retire orphaned followers snapshot and generator …
```

`git diff --stat` — 15 modified files, 649 insertions / 55 deletions:

```
 app/game/[mode]/page.tsx             |  33 ++-
 app/globals.css                      | 348 ++++++++++++++++++++++++-
 app/page.tsx                         |  11 +-
 components/CategoryCard.tsx          |  19 +-
 components/HighScoresModal.tsx       |   3 +-
 components/ModeButton.tsx            |   8 +-
 components/game/ClassicGame.tsx      |  53 +++-
 components/game/ComparisonBoard.tsx  |  11 +-
 components/game/DecisionControls.tsx |   6 +-
 components/game/GameCard.tsx         | 47 +++-
 components/game/GameplayStatus.tsx   |  39 +++-
 components/game/TimeAttackGame.tsx   |  54 +++-
 components/home/CategorySelector.tsx |  17 +-
 components/home/DomainSelector.tsx   |   8 +-
 components/home/HomeSetup.tsx        |  47 ++++-
```

Untracked: `.agents/`, `.playwright-mcp/`, `docs/`, `skills-lock.json`, `types/view-transition.d.ts`.

These are the **completed immersive-motion change set** (handoff §2, QA §1). They are owner work and were not touched, reverted, reformatted, or absorbed by this analysis. This analysis added no tracked-file change: `git diff --stat` after writing this document is identical.

**Dev server:** the owner's `next dev` on `http://localhost:3000` was reused and never stopped. Reachability confirmed by a successful Playwright navigation to `/` (title `Higher or Lower — The Ultimate Comparison Game`). The PID (17272) is per owner statement, `Needs Verification [environment-specific]` — the PID was not independently re-read.

### 2.1 Runtime baseline of the incumbent app (measured, Playwright, 2026-11-22)

| Surface | 1440×900 | 390×844 | `canvas` elements | rAF loops | Animations at rest |
|---|---|---|---|---|---|
| Home `/` | doc **2242 px**, `scrollWidth` 1435 | doc **2489 px**, `scrollWidth` 385, `h1` **56 px** | **0** | none observed | **2** (`ambient-bob`, `ambient-drift`) |
| Classic `/game/classic?category=movie-series-rating` | doc **900 px** | doc **1252 px**, Higher y **1100**, Lower y **1166**, x **51–334** | **0** | none | **0** |
| Time Attack `/game/time-attack?category=movie-series-rating` | doc **954 px** (content-dependent — card art/text height varies per item; 954 observed in the integrity pass), header **138 px** (88 grid + 48 footer) | — | **0** | none | **1** (`width`, 1000 ms timer bar) |
| High Scores modal (390) | — | dialog **347×450** at (19,197), `:modal` top layer, focus on close button | — | — | dialog 180 ms in |

Confirmed: **there is no canvas anywhere in the app today, and no `requestAnimationFrame` loop.** The entire current motion layer is CSS keyframes + Motion transitions (analysis §3.3, QA V3/V4).

Baseline screenshots written this session:

- [`local-home-desktop-1440.png`](assets/procedural-canvas-audio/local-home-desktop-1440.png)
- [`local-home-mobile-390-modal.png`](assets/procedural-canvas-audio/local-home-mobile-390-modal.png)
- [`local-timeattack-desktop-1440.png`](assets/procedural-canvas-audio/local-timeattack-desktop-1440.png)

---

## 3. Reference-site audiovisual findings (Step 2)

### 3.0 Method and honesty statement

Playwright MCP, Chromium (Chrome for Testing 159 / revision 1255), DPR 1 in the harness, 2026-11-22. Every number below is a live DOM/computed-style/canvas read, not an estimate. Probe used: element enumeration (tag, id, class, `width`/`height` **attributes** vs `getBoundingClientRect`), computed `position`/`inset`/`z-index`/`pointer-events`/`opacity`, `document.getAnimations()`, script-source fetch + regex scan for Web Audio symbols, `localStorage` key dump, and a **canvas pixel fingerprint** (draw each canvas into a 32×32 offscreen 2D context, hash all sampled RGBA) taken twice ~650 ms apart to detect idle motion.

Explicitly **not** claimed:

- **Perceptual audio quality is `[Not tested]`.** Nothing was listened to. All audio findings are structural (DOM, code, `AudioContext` lifecycle, persisted state).
- Canvas *frames* were not visually reviewed by the agent; fingerprints prove "pixels changed", not "what changed".
- `animation-inspector` was not used (it is CAPTCHA-blocked externally and rejects `localhost`), per the brief.
- DPR behaviour at DPR ≠ 1 could not be observed in this harness — all three sites ran at DPR 1. `Needs Verification [environment-specific]`.

> **Inherited evidence (integrity pass, 2026-11-22).** The reference-site
> measurements in §3.1–§3.3 were **not re-run** during the correction pass. The
> nine screenshots they cite exist on disk and were verified. The numbers below
> remain the earlier Playwright observations and stand as such; they are
> `[Not tested]` in the correction pass rather than re-confirmed.

### 3.1 krillion.io — "the daily dive"

Screenshots: [`krillion-desktop-1440.png`](assets/procedural-canvas-audio/krillion-desktop-1440.png), [`krillion-mobile-390.png`](assets/procedural-canvas-audio/krillion-mobile-390.png).

**Canvas inventory (measured).**

| Property | `.ds-sea` | `.ds-fore` |
|---|---|---|
| Drawing buffer | **1440×900** | **1080×810** (0.75× of CSS box) |
| CSS box | 1440×900 @ (0,0) | 1080×810 @ (180,0) |
| `position` / `inset` | `absolute`, `0 0 0 **-180px**` (wider than viewport) | `absolute`, `0 0 0 0` |
| `z-index` | `0` | `2` |
| `pointer-events` | `auto` | **`none`** |
| aria | none | none |
| Idle motion | **fingerprint changed over 650 ms** | **fingerprint changed over 650 ms** |

Composition: two stacked full-bleed canvases — an opaque background sea and a transparent foreground layer, both inside one single-viewport stage (doc height **900** at 900 viewport; **844** at 390×844, no overflow). At 390×844 the buffers resize to **390×844** and **390×754**, i.e. the foreground layer becomes full-width on mobile.

**Reactive behaviour — what was measurable.** Idle ambience is a continuous rAF loop (pixel change at rest). The page also runs **11 simultaneous CSS animations** (`ds-title-flicker` 5000 ms `steps(1)` ∞, `ds-bob-l` 3200 ms ∞ ×8, `ds-swim` 2600 ms ∞, `ds-btn-bob` 1900 ms ∞). Event-driven reactions (`ds-score-slam`, `ds-card-in/gone`, `ds-shake`, `ds-reject-jolt`) exist in CSS but a scored round was **not** driven, so the **spatial origin** of event effects is `[Not tested]`. Structural inference only: both canvases are full-bleed and the fore layer is offset −180 px horizontally, which reads as a parallax pair rather than an element-anchored emitter.

**Audio UX (measured).** Lazy, gesture-created synthesis:

- `button.ds-mute` — **34×26 px**, `position: absolute`, `top: 84px; right: 10px`, `z-index: 12`, `opacity: .85`, glyph-only, `aria-label="turn sound off"`, `aria-pressed="false"`.
- **Zero `<audio>` elements. One chunk (`chunks/3itjc0tls3d-u.js`, 54,249 bytes) contains `AudioContext` ×2, `createOscillator` ×1, `createGain` ×3** → synthesized voices, not files.
- Instrumented `AudioContext` constructor **before** interaction → **0 contexts**. After a real click on `.ds-mute` → **1 context, `state: "running"`, `sampleRate: 48000`**, created *inside* the gesture. This is textbook lazy unlock (MDN "Best practices": create *or resume* inside a user gesture).
- Toggling flipped label → `"turn sound on"`, `aria-pressed="true"`, and persisted `localStorage["krillion-muted"] = "1"`.

**Accessibility.** 9 `prefers-reduced-motion` blocks at runtime (matches the prior analysis pass). Audio control is 34×26 px — **below the 44 px touch-target baseline** the project uses.

**Adoptable principles.** Two-layer canvas (opaque base + transparent live layer) with the live layer costing 0.75× resolution; `pointer-events: none` on the decorative layer; lazy `AudioContext` created inside the gesture; oscillator-based SFX (no assets); a single glyph mute button that persists to `localStorage`; canvas ambient loop continuous at rest.

**Anti-references.** 36 third-party `iframe`s, 3 `<video>` elements and ~45 ad-tech `localStorage` keys on a game page; a 34×26 px control; `aria-pressed` inverted against the label text (label describes the *action*, pressed describes the *state*) — pick one convention, not both; a 5 s `steps(1)` flicker on the primary title.

### 3.2 noillirk.com — "Crowdict / The Daily Dive"

Screenshots: [`noillirk-desktop-1440.png`](assets/procedural-canvas-audio/noillirk-desktop-1440.png), [`noillirk-mobile-390.png`](assets/procedural-canvas-audio/noillirk-mobile-390.png).

**Canvas inventory (measured).**

| Property | `canvas.climb-scene` | `canvas.climb-krill` |
|---|---|---|
| Drawing buffer | **357×225** desktop / **125×296** mobile | **15×22** |
| CSS box | **1428×900** desktop / **375×888** mobile | 60×88 desktop / 45×66 mobile |
| Resolution ratio | **0.25×** desktop, **0.33×** mobile | 4× upscale (sprite) |
| `position` | `relative` (in normal flow inside `.climb-board`) | `absolute`, inset `0 660px 893px 705px` |
| `pointer-events` | `auto` | `auto` |
| Idle motion | **fingerprint changed over 650 ms** | **changed** |

**This is a fixed low internal resolution, deliberately upscaled** — the single most transferable performance lesson in the set. It is not DPR-aware: the buffer is a constant pixel-art grid regardless of DPR.

**Reactive / lifecycle behaviour (measured, high value).** Scrolled to `y = 4000`, i.e. the canvas 4,000 px above the viewport:

- Element remains `display: block`, `visibility: visible`, `opacity: 1`, `content-visibility: visible` (nothing is CSS-hidden).
- **Canvas fingerprint stopped changing** (`offscreenStillAnimating: false`) while 13 unrelated CSS animations elsewhere in the document continued.
- Conclusion: the rAF loop is **explicitly paused via visibility state**, not via CSS. This is the exact behaviour the Higher/Lower backdrop needs, and it is the strongest available evidence that a professional implementation gates its own loop.

**Audio UX.** **None.** 0 `<audio>`, 0 `<video>`, 0 mute/volume controls, and **no `AudioContext` symbol in any of its 9 scripts** (inline scripts included). noillirk is silent. It is therefore an anti-reference for audio *and* evidence that a lively canvas does not require audio to feel alive.

**Motion preference (measured).** `<html data-motion="full" data-ui="v2" data-theme="dark">` — a **user-controlled** motion preference independent of the OS media query, plus 17 `prefers-reduced-motion` blocks. This is the existing precedent for a `data-*`-driven state machine, which is exactly the harmonisation channel proposed in §6.4.

**Adoptable principles.** Small fixed internal buffer + CSS upscale; **pause the loop when off-screen**; `data-motion` user preference alongside the media query; canvases scoped to the *game panel* rather than the whole page (relevant to the gameplay surface where cards must stay the focus).

**Anti-references.** A 12,309 px marketing page hosting the game in its first viewport; zero audio affordance whatsoever; 0.25× buffers on desktop are visibly pixel-art — copying that resolution ratio into a dark-neon UI would read as blurry, not stylised.

### 3.3 fairways.world — "The Daily Five"

Screenshots: [`fairways-desktop-1440.png`](assets/procedural-canvas-audio/fairways-desktop-1440.png), [`fairways-mobile-390.png`](assets/procedural-canvas-audio/fairways-mobile-390.png).

**Canvas inventory (measured).**

| Canvas | Buffer | CSS box | Notes |
|---|---|---|---|
| `#gl` | **480×300** desktop / **195×422** mobile | **1440×900** / **390×844** | WebGL; `aria-hidden="true"`; `position: absolute`; `pointer-events: auto`; 0.33× / 0.5× resolution |
| `#mini` | 96×220 | 0×0 | `display: none` until a shot; `z-index: 10`; `aria-hidden` |
| `#lockCv` | 84×112 | 0×0 (hidden panel) | `role="img"`, `aria-label="Your golfer"` |

`typeof window.THREE === "object"` and a live WebGL context confirm a Three.js scene. Doc height **900** at 1440×900 and **844** at 390×844 — single viewport, like krillion.

**Reactive behaviour.** Idle WebGL fingerprints were **identical across 700 ms** (both samples `820d6720`). Treat this as *weak* evidence: `drawImage` sampling of a WebGL canvas without `preserveDrawingBuffer` returns the last presented frame, so "identical" is consistent with both "static scene" and "sampling artefact". Recorded as **`[Not tested]` for true WebGL idle animation**. What *is* measurable is the **focus-mode dim**: `.app.shooting .dock { opacity: 0.35 }` and `.mini/.gauge/.side` fade to 0 over 250 ms during a shot — chrome recedes during the decisive beat, leaving the scene. 6 CSS animations at rest (`rise` ×4, `soon-shine`, `soon-blink`).

**Audio UX (measured).** The richest audio control of the three:

- `button#soundBtn` — **42×42 px**, `position: relative`, top-right at (1386,14) desktop and (336,14) mobile, glyph `♪`, `aria-pressed="true"` (**sound ON by default**), `aria-label="Sound"`.
- A second surface: a settings row `role="switch"`, `aria-checked="true"`, text `Sound On` — the quick toggle and the settings switch stay in sync.
- Click → `aria-pressed="false"`, glyph becomes `×`, row becomes `Sound Off` with `aria-checked="false"`, persisted to `localStorage["fw3:account:guest:sound"] = "false"`.
- **No `AudioContext` was created by the toggle** (instrumented constructor stayed empty). The only Web Audio reference in the scanned scripts is inside `three.min.js` (`AudioContext` ×3, `createGain` ×2 — Three's audio module); no `createOscillator`, no `new Audio(`, and no `<audio>` elements in the DOM. **The actual playback path is `[Not tested]`.**

**Accessibility.** 5 `prefers-reduced-motion` blocks (consistent across passes), including a rule that hard-zeroes `.stamp *`, `.banner span`, `.title *` and `display: none`s the shimmer.

**Adoptable principles.** A **sound-on-by-default** toggle that is discoverable, small, glyph-first and mirrored in settings; persistence of the mute state; a 42 px target that still clears out of content; an explicit bool `aria-pressed` whose semantics match the visible glyph; chrome dimming during the decisive beat.

**Anti-references.** WebGL/THREE (a rewrite, not a layer); 0.33× buffers where sharpness matters; a top-level ad redirect observed on a previous pass; sustained infinite loops on the top celebration tier.

### 3.4 Synthesis — the transferable core

| Dimension | Measured reality across all three | Adopt into Higher/Lower as |
|---|---|---|
| Canvas cost control | Internal buffers are **0.25×–0.75×** the CSS box, always decoupled from `devicePixelRatio` | Explicit `scale` (DPR clamp) with a documented low-quality mode; never 1:1 by default on mobile |
| Loop lifecycle | noillirk **pauses off-screen**; krillion loops continuously in a single viewport | Pause on `document.hidden` **and** off-screen; never run two loops |
| Stacking | 1–2 canvases, `pointer-events: none` on decorative layers, `aria-hidden` on decorative canvases | One canvas, `aria-hidden`, `pointer-events: none`, `position: fixed`, `z-index` below all content |
| Event reactions | Short, stepped, high-contrast; tier intensity by outcome (prior pass) | Impulse vocabulary keyed to the existing five-tier ladder |
| Chrome dimming | fairways `opacity: .35` dock during the shot | Canvas luminance recession during reveal (never on text) |
| Audio | krillion: lazy `AudioContext` in-gesture, oscillators, glyph mute, persisted. fairways: sound-on default, `aria-pressed`, persisted, mirrored in settings. noillirk: none | Lazy context, synthesized voices, one glyph control + compact popover, persisted, `aria-pressed` consistent with the glyph |
| Reduced motion | 5–17 explicit blocks; noillirk adds a `data-motion` user state | OS media query + `data-*` state machine; canvas draws **one static frame** |
| **Not adopted** | Ad iframes, 12k-px marketing pages, WebGL, pixel-art resolutions, CRT flicker, mascots, palettes, typefaces | — |

---

## 4. Incumbent architecture and constraints (Step 4)

### 4.1 Tokens and global CSS (must be preserved)

| Fact | Evidence |
|---|---|
| Tailwind v4 CSS-first entry; tokens in `:root`, exposed via `@theme inline` | [`app/globals.css:1`](../app/globals.css:1), [`app/globals.css:4`](../app/globals.css:4), [`app/globals.css:72`](../app/globals.css:72) |
| Base surfaces `--bg-base #15122b`, `--bg-elevated #211d3a` | [`app/globals.css:8`](../app/globals.css:8), [`:10`](../app/globals.css:10) |
| Accents: classic `#6355cb`, time-attack `#d93fd0`, higher `#22d3ee`, lower `#d93fd0`, highlight `#ffcc00` | [`app/globals.css:31`](../app/globals.css:31)–[`:35`](../app/globals.css:35) |
| Status: success `#1da216`, error `#f05ac7`; focus ring `#22d3ee` | [`:29`](../app/globals.css:29), [`:30`](../app/globals.css:30), [`:28`](../app/globals.css:28) |
| Global `:focus-visible` 3 px outline at 4 px offset | [`:119`](../app/globals.css:119) |
| Dot-grid utility `background-size: 3.375rem 3.375rem` | `:112`–`:117`; `.bg-grid` opens at [`:112`](../app/globals.css:112), the `background-size` declaration is at **`:116`** |
| Noise grain: selector `.bg-noise::after` (the `bg-noise` class is on `<body>`), `position: fixed`, `inset: 0`, `z-index: 0`, `pointer-events: none`, `content: ""`; the `0.025` is the **SVG rect's fill opacity inside the data URI**, not a CSS `opacity` | [`:200`](../app/globals.css:200)–[`:207`](../app/globals.css:207) |
| Global reduced-motion hard-strip (`0.01ms` durations) — **byte-identical, untouchable** | [`:188`](../app/globals.css:188) |
| Motion layer token block, keyframes, variants, ambient loops, reduced-motion fidelity, `::view-transition` rules | [`:455`](../app/globals.css:455)–[`:793`](../app/globals.css:793) |

### 4.2 Stacking / layering reality — the decisive constraint for a persistent canvas

Measured on the running app:

| Layer | Computed | Consequence for a canvas |
|---|---|---|
| `body` | `background-color: rgb(21,18,43)`, `position: static`, `isolation: auto`, `overflow-x: hidden`; classes `min-h-full flex flex-col bg-grid bg-noise antialiased` ([`app/layout.tsx:37`](../app/layout.tsx:37)) | A first-child `position: fixed` canvas paints **above** the body background and **below** later siblings. `.bg-noise::after` — the pseudo-element created by the `bg-noise` class on `<body>` (fixed, `z-index: 0`) — still paints on top → grain stays over the canvas, preserving the incumbent identity. |
| Home `main` | `position: relative`, `isolation: isolate`, `z-index: auto`, `background-color: rgba(0,0,0,0)` ([`components/home/HomeSetup.tsx:177`](../components/home/HomeSetup.tsx:177)) | **Transparent** — the canvas shows through. Home needs no background change. |
| Gameplay shell | `position: relative`, `isolation: isolate`, `background-color: **rgb(21,18,43)**` (opaque) ([`components/game/GameplayShell.tsx:45`](../components/game/GameplayShell.tsx:45)) | **Blocks the canvas completely.** Gameplay needs the shell surface to become transparent/translucent, or two canvases. |
| Gameplay header | `background-color: …/0.95`, `backdrop-filter: blur(8px)` ([`components/game/GameplayShell.tsx:48`](../components/game/GameplayShell.tsx:48)) | A **live canvas under a `backdrop-filter` re-blurs every frame** — a real, specific compositor cost. Mitigation required (see R3). |
| `GameCard` surfaces | opaque `bg-[var(--surface-raised)]`, `border-4`, offset plate ([`components/game/GameCard.tsx:87`](../components/game/GameCard.tsx:87)–[`:89`](../components/game/GameCard.tsx:89)) | Cover art stays dominant by construction; canvas must stay outside the card plane. |
| `dialog` (High Scores) | `:modal` top layer, `z-index: auto`, backdrop `rgb(9 7 25 / 78%)` | Canvas visible but heavily dimmed through the backdrop; page header is **not** hit-testable while open (measured: `elementFromPoint(300,40)` → `DIALOG`). |
| Game-over panel | `absolute inset-0 z-50`, `bg-[#15122b]/90`, `backdrop-blur-sm` ([`components/game/ClassicGame.tsx:361`](../components/game/ClassicGame.tsx:361)) | 90 % opaque scrim over the card plane; a canvas behind it appears at ~10 % luminance — acceptable and cheap. |

### 4.3 Route-transition interaction (must be respected)

- Both route files wrap their **page content** in `<ViewTransition enter/exit keyed "nav-forward" default="none">` — [`app/page.tsx:9`](../app/page.tsx:9), [`app/game/[mode]/page.tsx:49`](../app/game/[mode]/page.tsx:49), [`:64`](../app/game/[mode]/page.tsx:64).
- Wrappers live in `page.tsx`, **not** in a layout — Next's docs state enter/exit never fire in a layout because layouts persist (cited in design §5.2, `view-transitions.md:268`).
- Next layouts persist across navigation and shared segments are reused without a server request (Context7, `layout.mdx` / `render-tree.ts`); the prior work also established that the App Router ships React canary so `<ViewTransition>` works with no config.
- **Therefore `app/layout.tsx` is the correct and probably only mount point that survives navigation without remounting**, and it sits *outside* the transition wrappers.
- Consequence to verify at implementation: a fixed canvas outside the wrapper participates in the **root** group snapshot, so during the ~320 ms `nav-forward` crossfade the backdrop is a frozen snapshot rather than live. Recorded as `Needs Verification [inferred-from-codebase]` (§11.2).

### 4.4 Existing interaction hooks and timing invariants

| Hook | Where | Gameplay-must-not-change |
|---|---|---|
| `handleGuess(direction)` — single funnel for every guess | [`ClassicGame.tsx:170`](../components/game/ClassicGame.tsx:170), [`TimeAttackGame.tsx:242`](../components/game/TimeAttackGame.tsx:242) | Yes — the natural single emit point for SFX/impulses |
| Keyboard listener → `handleGuess` | [`ClassicGame.tsx:242`](../components/game/ClassicGame.tsx:242)–[`:250`](../components/game/ClassicGame.tsx:250), [`TimeAttackGame.tsx:324`](../components/game/TimeAttackGame.tsx:324)–[`:332`](../components/game/TimeAttackGame.tsx:332) | Keyboard already shares the handler → parity is achievable without touching handlers |
| `shouldIgnoreShortcut` (dialog/control guard) | [`ClassicGame.tsx:67`](../components/game/ClassicGame.tsx:67)–[`:80`](../components/game/ClassicGame.tsx:80) | Yes |
| Phase state machine `playing / revealing / game-over` | [`ClassicGame.tsx:47`](../components/game/ClassicGame.tsx:47), [`TimeAttackGame.tsx:59`](../components/game/TimeAttackGame.tsx:59) | Yes |
| Display-only `resolveTier` + `displayScore` | [`ClassicGame.tsx:59`](../components/game/ClassicGame.tsx:59), [`:133`](../components/game/ClassicGame.tsx:133), [`TimeAttackGame.tsx:67`](../components/game/TimeAttackGame.tsx:67), [`:164`](../components/game/TimeAttackGame.tsx:164) | Display-only; the canvas/audio tier derives from the same value |
| 1000 ms timer interval, `isUrgent = displayTime <= 10` | [`TimeAttackGame.tsx:177`](../components/game/TimeAttackGame.tsx:177), [`:365`](../components/game/TimeAttackGame.tsx:365) | Yes |
| Home ambient observer + `data-ambient` | [`HomeSetup.tsx:82`](../components/home/HomeSetup.tsx:82)–[`:99`](../components/home/HomeSetup.tsx:99), [`:178`](../components/home/HomeSetup.tsx:178) | Existing; the canvas must not become a second observer per element |
| `router.push(..., { transitionTypes: ["nav-forward"] })` | [`HomeSetup.tsx:149`](../components/home/HomeSetup.tsx:149) | Yes |
| Modal open/close incl. 200 ms JS close delay + reduced-motion branch | [`HighScoresModal.tsx:68`](../components/HighScoresModal.tsx:68)–[`:90`](../components/HighScoresModal.tsx:90) (open/close effect), [`:131`](../components/HighScoresModal.tsx:131) (`handleClose`); `:92`–`:95` is the unrelated legacy-migration effect | Yes |
| Game-over focus trap + `requestAnimationFrame` focus | [`ClassicGame.tsx:150`](../components/game/ClassicGame.tsx:150)–[`:166`](../components/game/ClassicGame.tsx:166), [`:345`](../components/game/ClassicGame.tsx:345) | Yes |
| Existing keyframes available for reuse | `pulse-ring` [`:301`](../app/globals.css:301), `fadeInUp` [`:347`](../app/globals.css:347), `shake` [`:394`](../app/globals.css:394), `timer-urgent` [`:425`](../app/globals.css:425), `floatUp` [`:441`](../app/globals.css:441), `tint-in` [`:593`](../app/globals.css:593), `value-land` [`:502`](../app/globals.css:502), `tally-bump` [`:514`](../app/globals.css:514), `tier-stamp` [`:527`](../app/globals.css:527), `row-cascade` [`:613`](../app/globals.css:613)–[`:625`](../app/globals.css:625) | Canvas motion is **not** CSS, so this is vocabulary alignment, not reuse |

### 4.5 Observed documentation inconsistency (recorded, not resolved)

Design §3.6 says the dialog keyframes are "**Keep, do not retime**"; plan item 13 authorised retiming to `--motion-dur-base`; the handoff §2.1(1b) retimed exactly four declarations; QA §1 recorded the four-line deviation as `[Pass]`. The code reflects the plan/handoff, not the design sentence. This is a **pre-existing, already-accepted deviation** and is *not* a defect to fix in this task. Flagged only so the Design stage does not re-derive the opposite conclusion from the design document.

### 4.6 Out of scope (carried forward)

- F4 reduced-motion hydration mismatch on Home (pre-existing; `useReducedMotion()` returns `null` on the server). Must not be touched or "fixed as a side effect".
- High-score key-namespace split (Classic vs Time Attack) — recorded project fact, product decision.
- Any change to providers, catalog authorization, deck logic, scoring, storage semantics.

---

## 5. Complete interactive component audit (Step 4/5)

Legend: **RTE** = reduced-motion equivalent. "Impulse" = a named canvas emission. Every row's canvas reaction must be **outside** the card image plane and must not alter layout.

**Matrix size and coverage (independently re-enumerated from source in the integrity pass): 36 rows.**

| Group | Rows | Coverage |
|---|---|---|
| Home (including its modal) | **19** | H1 scroll; H2 hero wordmark (non-interactive, entrance only); H3 `a[aria-label="Start Comparing"]`; H4 High Scores opener; H5 four domain radios; H5b domain-label hover; H6 category radios; H7 disabled category row; H8 mode radios; H9 disabled `pvp`; H10 `go!`; H11 footer (non-interactive); H12 dialog open; H13 tabs; H14 category-filter `select`; H15 clear-leaderboard two-step; H16 clear-all two-step; H17 close (X / Escape / backdrop); H18 proposed audio control |
| Gameplay (Classic + Time Attack) | **17** | G1 back link; G2 board (passive); G3 value reveal; G4 Higher; G5 Lower; G6 window `keydown`; G7 tally/status; G8 timer numeral; G9 progressbar; G10 delta label; G11 wrong-answer beat; G12 game-over panel; G13 Play again; G14 Back to setup; G15 focus trap; G16 derived-state link; G17 proposed audio control |
| Modals | counted above | High Scores dialog = H12–H17; game-over dialog = G12–G15. No other dialog exists |

Every interactive control found in source is represented: buttons (`View High Scores`, `go!`, Higher, Lower, Play again, clear / confirm / cancel, Close), links (`Start Comparing`, back, Back to setup, derived-state action), radio inputs (4 domains + category rows + 3 modes), the `select` filter, the two tab buttons, and the three keyboard surfaces (window `keydown` guess handler, tablist roving keys, game-over Tab trap). No control was invented beyond these.

### 5.1 Home surface

| # | Element / selector | Event(s) | Existing behaviour (evidence) | Proposed canvas reaction | Proposed audio cue | UI harmonisation | RTE |
|---|---|---|---|---|---|---|---|
| H1 | Page scroll (document) | scroll | No scroll-linked motion anywhere; `html { scroll-behavior: auto }` ([`:86`](../app/globals.css:86)); doc 2242 px desktop / 2489 px mobile | Slow vertical parallax of the depth field only (≤ 6 % of scroll delta, clamped); grid stays fixed. **Not** a scroll-jacker | None | Canvas drifts; no control changes | No parallax; field static |
| H2 | Hero wordmark `h1` (focal, not interactive) | none (entrance only) | Motion stagger 60 ms, children 240 ms `[0.23,1,0.32,1]` ([`HomeSetup.tsx:155`](../components/home/HomeSetup.tsx:155)–[`:174`](../components/home/HomeSetup.tsx:174)); 2 ambient loops at rest | One `swell` when the hero enters viewport: grid brightness +6 % for 600 ms at the wordmark's y-origin | Soft low pad swell (single 220 ms sine, −30 dB) | None | `swell` opacity-only |
| H3 | `a[aria-label="Start Comparing"]` | click, Enter | Prevents default, sets `setupArrived`, `scrollIntoView` smooth/instant ([`HomeSetup.tsx:217`](../components/home/HomeSetup.tsx:217)–[`:238`](../components/home/HomeSetup.tsx:238)); chevron hover `translate-y-2`; ambient `ambient-bob` | `ripple` from the anchor's box centre, radius 240 px, 700 ms; grid phase shift downward | "descend" blip: sawtooth 220→160 Hz, 120 ms | Existing hover/active untouched; canvas origin = element centre | Ripple → single 140 ms opacity flash, no radius growth |
| H4 | `button[aria-label="View High Scores"]` | click, Enter/Space, hover, focus-visible | Opens modal; `transition-colors`; 132×44 at (1247,20) desktop, (237,20) mobile | `ripple` (small, 160 px) + `dim` of the field to 70 % while modal open | "open" tick: triangle 660 Hz, 70 ms, −26 dB; modal body tone sustained under the dialog | Focus ring untouched; canvas dims behind backdrop | Dim to 85 % only, no ripple |
| H5 | `input[name="semantic-domain"]` ×4 (movies-series, gaming, music, social-media) | change (radio), click on label, Arrow keys inside `radiogroup`, focus-visible | `selectDomain` resets category + mode ([`HomeSetup.tsx:122`](../components/home/HomeSetup.tsx:122)); selection dot pop `@starting-style`; label shadow step; radio inputs are 1×1 `sr-only` (measured) | `shockwave` from the **label** box (not the 1×1 input), 500 ms; domain tint: movies→magenta, gaming→cyan, music→purple, social→amber, at 8 % alpha | "select" blip: square 520 Hz, 60 ms + 5th overtone; pitch rises per index | `.selection-dot`, `.selection-label` transitions already exist ([`:629`](../app/globals.css:629), [`:644`](../app/globals.css:644)) | No shockwave; tint change only, instant |
| H5b | Domain label hover | pointerenter (fine pointers) | `hover:-translate-y-0.5`, `group-hover:[text-shadow:3px_3px_0…]` | `glow` at 25 % strength following the pointer's x along the label baseline | Optional "hover" tick 40 ms at −34 dB (toggleable) | Existing lift untouched | No glow |
| H6 | `input[name="semantic-category"]` rows (`CategoryCard`) | change, click, focus | `selectCategory`; row cascade 32 ms × cap 6 (`row-cascade`); height interpolation 180 ms ([`CategorySelector.tsx:25`](../components/home/CategorySelector.tsx:25)–[`:76`](../components/home/CategorySelector.tsx:76)) | `column-pulse`: a vertical grid band lights under the selected row and decays 400 ms | "select" blip, higher pitch than H5 | Row hover lift + dot pop untouched | Band appears as a static 3 % tint |
| H7 | Unavailable category row (`disabled`) | none accepted | `opacity-55`, `cursor-not-allowed`, disabled input; **no motion** ([`CategoryCard.tsx:22`](../components/CategoryCard.tsx:22), [`:30`](../components/CategoryCard.tsx:30)) | **No impulse.** The field must not imply interactivity | None | Unchanged | None |
| H8 | `input[name="playable-mode"]` (classic, time-attack) | change, click, Arrow keys, focus | `setSelectedMode`; dot pop; `ModeButton` retimed to 140 ms ([`ModeButton.tsx:42`](../components/ModeButton.tsx:42)) | `mode-tint` lerp of the whole field to `--accent-classic` / `--accent-time-attack` over 500 ms | "mode" chord: two oscillators (root + fifth), 180 ms | Existing selection styling untouched | Instant tint, no lerp |
| H9 | `input[value="pvp"]` (disabled, "Coming Soon") | none accepted | `disabled`, `opacity-55`, no motion | **No impulse** | None | Unchanged | None |
| H10 | `button.home-go` ("go!") — 176×176 desktop, 144×144 mobile at (630,1889)/(121,2201) | click, Enter/Space, hover, press | Hover `#ef63df`, press `translate(4px,4px)` + counter-offset ([`:156`](../app/globals.css:156)–[`:186`](../app/globals.css:186)); `router.push` with `nav-forward` ([`HomeSetup.tsx:147`](../components/home/HomeSetup.tsx:147)); ambient `ambient-drift` pauses on hover/focus ([`:694`](../app/globals.css:694)) | `launch`: radial contraction then outward burst in the button's accent, 500 ms, followed by a 320 ms field fade that hands over to the route transition | "launch": noise whoosh 400 ms + rising triad, ends ≤ 320 ms (route duration) | Existing press geometry untouched; canvas burst must be behind the button | Burst suppressed; only the 140 ms field opacity fade |
| H11 | Footer © / "More categories coming soon" | none | Static, `text-[0.65rem]` muted | None | None | Unchanged | None |
| H12 | High Scores `dialog` open | `open` prop / `showModal()` | 180 ms `home-dialog-in`, backdrop fade, focus to close button ([`HighScoresModal.tsx:71`](../components/HighScoresModal.tsx:71)–[`:80`](../components/HighScoresModal.tsx:80)) | `vignette-in`: field dim to 55 %, extra depth blur-free darkening behind the dialog | "modal in": two-note down-then-up, 200 ms; BGM ducks to 30 % | Modal's own offset shadow untouched; no new UI | Immediate dim to 55 %, no transition |
| H13 | Modal tabs `role="tab"` ×2 (+ ArrowLeft/Right/Home/End) | click, keydown | Manual roving tabindex + keyboard handler ([`HighScoresModal.tsx:213`](../components/HighScoresModal.tsx:213)–[`:266`](../components/HighScoresModal.tsx:266)) | `ripple` from the tab's box; field tint nudges toward the mode accent of the selected tab | "tab" tick 480 Hz, 50 ms | Tab `aria-selected` styling untouched | Ripple → instant tint |
| H14 | Modal `select[aria-label="Filter by semantic category"]` | change, focus | Native select, `focus-visible` ring ([`HighScoresModal.tsx:277`](../components/HighScoresModal.tsx:277)–[`:289`](../components/HighScoresModal.tsx:289)) | Small `ripple` at the select's right edge | "filter" tick, 520 Hz, 50 ms | Unchanged | None |
| H15 | "Clear this leaderboard" → Cancel / Confirm clear | click, Enter/Space (**two** presses: one opens the inline confirm, one confirms) | Two-step confirm, writes announcement live region ([`HighScoresModal.tsx:351`](../components/HighScoresModal.tsx:351)–[`:404`](../components/HighScoresModal.tsx:404)) | `dim-pulse` (warning tone: `--status-error` at 6 % for 200 ms) on first press; `resolve` micro-flash on confirm | "warn" two low square notes; "confirm" single click | Unchanged | Instant tint |
| H16 | "Clear all High Scores" → Cancel / Confirm clear all | click, Enter/Space (**two** presses) | Same pattern ([`HighScoresModal.tsx:406`](../components/HighScoresModal.tsx:406)–[`:456`](../components/HighScoresModal.tsx:456)) | Same as H15 | Same as H15 | Unchanged | Instant |
| H17 | Modal close: X, `Escape` (via `onCancel`), backdrop click | click / keydown / pointerdown | 180 ms `home-dialog-out` + 200 ms JS delay, focus returns to opener ([`HighScoresModal.tsx:131`](../components/HighScoresModal.tsx:131), [`:160`](../components/HighScoresModal.tsx:160)) | `vignette-out` back to 100 % over 180 ms; field `settle` ripple centred on the opener button | "modal out": single descending note 180 ms; BGM restores over 400 ms | Focus return untouched | Immediate restore |
| H18 | **Audio control (new)** | click, Enter/Space, hover, focus-visible | None today | Field `ack`: the field's own audio glyph lights, 200 ms, at the button's origin | Tick, then the newly-set state (muted = silence; unmuted = a short confirmation chime) | Placed in the existing header cluster (§7); `aria-pressed` matches the glyph | Instant tick, no field reaction |

### 5.2 Gameplay surface (Classic + Time Attack)

| # | Element / selector | Event(s) | Existing behaviour (evidence) | Proposed canvas reaction | Proposed audio cue | UI harmonisation | RTE |
|---|---|---|---|---|---|---|---|
| G1 | `a[aria-label="Back to game setup"]` (44×44 at 24,22 desktop / 16,22 mobile) | click, Enter | `next/link` to `/`, `hover:-translate-y-0.5`, offset shadow ([`GameplayShell.tsx:53`](../components/game/GameplayShell.tsx:53)–[`:59`](../components/game/GameplayShell.tsx:59)) | `ripple` 160 px at the control origin + field fade begins before navigation | "back" blip 300→220 Hz | Existing hover/offset untouched | Instant flash |
| G2 | `section[aria-label="Higher or lower comparison"]` (board) | none (container) | Two cards, OR badge `opacity 1→.5` during `revealing` ([`ComparisonBoard.tsx:41`](../components/game/ComparisonBoard.tsx:41)–[`:48`](../components/game/ComparisonBoard.tsx:48)) | Passive only: field luminance **recedes to 80 %** during `revealing` and restores on the next `playing` | None | Matches the existing OR-badge focus mode | No recession (field stays at rest state) |
| G3 | `article[aria-label^="Next:"]` value reveal | `revealed` flips true | `value-land` 180 ms at +120 ms; `tint-step` 140 ms `steps(2)` ([`GameCard.tsx:109`](../components/game/GameCard.tsx:109)–[`:121`](../components/game/GameCard.tsx:121), [`:133`](../components/game/GameCard.tsx:133)) | `land` impulse at the **card's** x/y: a horizontal scan line crossing the card plane, 240 ms, masked **outside** the image rect so the cover art is never overlaid | "reveal" tick at reveal start (very quiet) | No change to card geometry, `<img>`, or `aria-live` | Opacity-only flash of the scan line, no travel |
| G4 | `button[aria-label="Higher"]` — 283×54 at (919,724) desktop, (51,1100) mobile | click, **keydown Enter/Space** (native activation → same `onClick`), pointerdown, hover, focus-visible | `.decision-lift` hover −4 px / press `scale(.985)` 90 ms ([`:651`](../app/globals.css:651)–[`:662`](../app/globals.css:662)); handler `handleGuess("higher")`; disabled during reveal (`disabled:opacity-45`) | `updraft`: upward convection lines from the button's box, 300 ms; on correct the field impulses **upward** | "higher": filtered noise + triangle sweep 300→480 Hz, 140 ms | Press/hover and focus ring untouched | Updraft suppressed; only a 140 ms field brightness step |
| G5 | `button[aria-label="Lower"]` — same geometry, y **790** desktop / **1166** mobile | click, **keydown Enter/Space**, pointerdown, hover, focus-visible | Same component, `onLower` → `handleGuess("lower")` | `downdraft`: mirror of G4 | "lower": triangle sweep 380→240 Hz, 140 ms | Same | Suppressed; brightness step |
| G6 | Keyboard `ArrowUp` / `h`, `ArrowDown` / `l` | keydown (window) | Same `handleGuess` funnel; ignored inside dialogs/controls ([`ClassicGame.tsx:242`](../components/game/ClassicGame.tsx:242), [`TimeAttackGame.tsx:324`](../components/game/TimeAttackGame.tsx:324)) | **Identical to G4/G5**, emitted from inside `handleGuess` so parity is structural rather than duplicated | **Identical SFX** | Press styling is `:active`-only today (QA V22 `[Partial]`); canvas/SFX parity does **not** require a handler change | Same as pointer |
| G7 | `GameplayStatus` score / best (tally) | value change | `tally-bump` 180 ms / `tier-stamp` 240 ms; ring + streak line at t3+ ([`GameplayStatus.tsx:37`](../components/game/GameplayStatus.tsx:37)–[`:66`](../components/game/GameplayStatus.tsx:66)) | Impulse intensity is a **function of tier**: t1 `pulse`, t2 `double-pulse`, t3 `ring + streak band`, t4 `slam` (field-wide single-frame invert at 4 % alpha) | Tier ladder: t1 fifth, t2 fifth+octave, t3 added major third, t4 full triad + sub thump | Existing tally classes untouched | Tier → brightness only (no scale, no ring) |
| G8 | Time Attack `role="timer"` numeral (37×36 at 24,88) | 1000 ms tick; urgent ≤ 10 s | `aria-live` flips to `assertive`; `.timer-urgent` pulse 600 ms ∞ ([`TimeAttackGame.tsx:388`](../components/game/TimeAttackGame.tsx:388)–[`:396`](../components/game/TimeAttackGame.tsx:396)) | At `isUrgent`: the field's grid lines contract 2 % and pulse at 1.67 Hz, phase-locked to the existing 600 ms CSS pulse | Tick **only** at ≤ 5 s, 1/s, 900 Hz 40 ms at −24 dB; no tick at 6–10 s (avoid fatigue) | Colour + `aria-live` unchanged | No contraction; no tick |
| G9 | TA `role="progressbar"` (1334×12) | width transition 1000 ms linear | Continuous ([`TimeAttackGame.tsx:411`](../components/game/TimeAttackGame.tsx:411)–[`:423`](../components/game/TimeAttackGame.tsx:423)) | The field's horizontal grid lines track remaining time as a subtle scan line (read-only mirror of the bar) | None | None | Static scan line |
| G10 | TA delta label `+3s / −5s` | guess | `float-up-brief` 380 ms / `float-up-reveal` 700 ms ([`TimeAttackGame.tsx:397`](../components/game/TimeAttackGame.tsx:397)–[`:409`](../components/game/TimeAttackGame.tsx:409)) | `gain` (correct: upward bright pulse) or `loss` (wrong: red-shifted dim pulse) at the label's y-origin | `+3s` = rising two-note; `−5s` = descending detuned two-note | Unchanged | Colour only |
| G11 | Wrong answer (Classic `shake-brief` 240 ms; TA `shake` 450 ms) | reveal, incorrect | Board jolt, `tint-step`, status text ([`ClassicGame.tsx:302`](../components/game/ClassicGame.tsx:302), [`TimeAttackGame.tsx:428`](../components/game/TimeAttackGame.tsx:428)) | `fracture`: 3 short-lived cracks from the board centre, decaying, **never** inside the card rects; magnitude fixed (no escalation) | "wrong": 90 Hz sine thud 220 ms + 1 semitone detune | Unchanged | Tint only |
| G12 | Game over panel appears (`phase === "game-over"`) | state change | **No entrance animation** (owner decision 5) | Field `settle`: all motion decays to a slow 12 s breathing loop behind the 90 % scrim; no burst | "game over": two-note cadence, 500 ms; BGM fades to 0 over 600 ms | Panel appearance unchanged | Field becomes a single static frame |
| G13 | `#btn-play-again` "Play again" | click, Enter | Focused on game-over (`requestAnimationFrame`), `hover:-translate-y-1` ([`ClassicGame.tsx:386`](../components/game/ClassicGame.tsx:386)–[`:393`](../components/game/ClassicGame.tsx:393)) | `reset`: field returns to mode tint over 500 ms, particles re-seeded | "restart": rising sweep 160→400 Hz, 300 ms | Unchanged | Instant restore |
| G14 | `#btn-back-to-menu` "Back to setup" | click, Enter | `Link` to `/` | Same as G1 | Same as G1 | Unchanged | Instant |
| G15 | Game-over Tab focus trap | keydown Tab/Shift+Tab | Manual cycle within the dialog ([`ClassicGame.tsx:345`](../components/game/ClassicGame.tsx:345)–[`:360`](../components/game/ClassicGame.tsx:360)) | None | None | Focus ring untouched | None |
| G16 | `DerivedGameState` empty/unavailable/error "Back to setup" link | click, Enter | Static panel + link ([`DerivedGameState.tsx:82`](../components/game/DerivedGameState.tsx:82)–[`:90`](../components/game/DerivedGameState.tsx:90)) | Field shows the **low-energy** state: 20 % density, no reactions | None (deliberately silent) | Unchanged | Static frame |
| G17 | **Audio control in gameplay** | click, hover, focus | None today; header status cluster occupies x **1300–1416** desktop / **264–369** mobile; TA header footer (24–1411) is fully occupied by the timer + bar | Field `ack` at the control origin | Tick + state change | Placed in the header's right cluster (§7) | Instant |

### 5.3 Cross-cutting interaction facts

- **Keyboard parity is structurally available**: both modes funnel keyboard and pointer into one `handleGuess`, so a single emit inside that function satisfies "same impulses and SFX" without touching handler semantics.
- **No interactive element currently carries a `data-*` cue attribute.** Two wiring options exist (§6.2): delegation or explicit attributes.
- **Scroll-linked motion is absent today**; introducing parallax is a new behaviour and is deliberately capped/ruled.
- **Focus rings are 3 px / 4 px offset everywhere** and must never be crossed by an animated layer; a `pointer-events: none`, `aria-hidden`, `z-index` below content canvas cannot steal focus or obscure a ring.

---

## 6. Architecture recommendation (Step 5)

### 6.1 Mount strategy — canonical mount at `app/layout.tsx`

**Recommendation: one persistent canvas + one audio engine, mounted once in `app/layout.tsx`, as client components rendered before `{children}`.**

Why layout, not per-surface:

1. Next layouts **persist across navigation** and are reused without a server request (Context7 `layout.mdx`, `render-tree.ts`). Per-page mounting would tear down and rebuild the canvas and — critically — the `AudioContext` on every route change. A suspended/recreated `AudioContext` is exactly the iOS failure mode documented in WebKit bug 231105/237878.
2. The `<ViewTransition>` wrappers must stay in `page.tsx` (docs: enter/exit never fire in a layout). Mounting the backdrop in the layout keeps it **outside** the transition boundary, so navigation does not unmount it.
3. A single canvas means a single rAF loop, a single `AudioContext`, a single settings store — no duplication, no fan-out.

Accepted costs (must be handled by Design/Plan):

- **Layering work on gameplay.** `GameplayShell` paints an opaque `--surface-background` at [`GameplayShell.tsx:45`](../components/game/GameplayShell.tsx:45). Seeing the canvas there requires that surface to become transparent/translucent (Tier B expansion, §8.3). Home needs nothing — its `main` is already transparent.
- **`backdrop-filter` cost.** The gameplay header blurs its backdrop ([`:48`](../components/game/GameplayShell.tsx:48)); a live canvas underneath re-blurs each frame. Mitigation options in R3.
- **View-transition snapshot.** The canvas participates in the root group during the ~320 ms route transition; the backdrop will be a still frame for that window (`Needs Verification [inferred-from-codebase]`).
- **Modals** are top-layer; the canvas stays visible but dimmed behind the 78 % backdrop. The audio control behind a modal is not clickable while it is open (measured) — acceptable, see D5.

**Minimal expansion set (one component tree):**

```
app/layout.tsx
  <body class="min-h-full flex flex-col bg-grid bg-noise antialiased">
    <AtmosphereBackdrop />        ← client, renders <canvas aria-hidden> only
    {children}
    <AudioSurface />              ← client, renders the audio control; engine is a module singleton
```

Both components are client boundaries; the **engine modules are plain TypeScript singletons** imported by them, so no React re-render happens per frame or per sound.

### 6.2 Event model — one imperative bus, two producers

**Recommendation: a typed module-level event bus, plus DOM delegation for generic cues, plus explicit semantic emits in three files.**

```ts
// lib/atmosphere/eventBus.ts  (shape only — not implemented in this stage)
type AtmosphereEvent =
  | { type: "pointer"; cue: "select" | "press" | "hover" | "open" | "close"; x: number; y: number; w: number; h: number; source: "pointer" | "keyboard" }
  | { type: "guess"; direction: "higher" | "lower"; source: "pointer" | "keyboard" }
  | { type: "reveal"; correct: boolean; tier: 0|1|2|3|4 }
  | { type: "phase"; phase: "playing" | "revealing" | "game-over" }
  | { type: "timer"; secondsLeft: number; urgent: boolean }
  | { type: "route"; to: "home" | "gameplay"; mode: "classic" | "time-attack" | null }
  | { type: "audio"; sfx: boolean; music: boolean };
```

Three producers, in order of preference:

1. **Generic cue delegation (no per-control edits).** A single capture-phase `pointerdown` + `keydown` + `focusin` listener owned by the backdrop component classifies the target with `closest('button, a[href], input, label, select, [role="tab"]')`, reads its `getBoundingClientRect()`, and emits `pointer` with the box. This gives *every* interactive control an origin-accurate reaction **without touching Home components at all** — the strongest argument against editing `DomainSelector`/`CategorySelector`/`CategoryCard`/`ModeButton`.
2. **Semantic emits at the existing funnels.** Only where meaning is required:
   - `handleGuess` in [`ClassicGame.tsx:170`](../components/game/ClassicGame.tsx:170) and [`TimeAttackGame.tsx:242`](../components/game/TimeAttackGame.tsx:242) → `guess` (one line each, inside the existing guard, so keyboard and pointer are identical).
   - the reveal commit (Classic's 1500 ms callback at [`ClassicGame.tsx:193`](../components/game/ClassicGame.tsx:193), TA's `REVEAL_MS_*` callback at [`TimeAttackGame.tsx:287`](../components/game/TimeAttackGame.tsx:287)) → `reveal` + `phase`, carrying `tier` (already computed as `resolveTier(displayScore, …)`).
   - `startGame` in [`HomeSetup.tsx:147`](../components/home/HomeSetup.tsx:147) → `route`.
   - `HighScoresModal`'s open/close effects ([`:68`](../components/HighScoresModal.tsx:68)) → `pointer`/`open`/`close` (or rely on delegation for the click and only emit `close` for Escape/backdrop).
3. **`data-*` state attributes for UI harmonisation (canvas → DOM, the "bidirectional" half).** The controller writes one attribute set on `<html>` imperatively:

```html
<html data-atmosphere="on" data-surface="home|gameplay"
      data-mode="classic|time-attack" data-phase="playing|revealing|game-over"
      data-tier="0..4" data-guess="idle|higher|lower" data-audio="sfx-on:music-off">
```

CSS can then tune accents without JS (e.g. `html[data-tier="3"]` brightening a ring), and the canvas reads **one** source of truth. Precedent: noillirk's measured `data-motion` / `data-theme` root state.

**Rejected alternative:** React context + state for every cue. It would re-render on every pointer event, violating "zero React re-renders per frame".

### 6.3 Canvas visual language

Identity-preserving, derived from the incumbent tokens — not from the references' fiction:

| Layer | Content | Cost strategy |
|---|---|---|
| **0. Base grid (static, pre-rendered)** | The incumbent dot/line grid re-expressed at `--grid-line` alpha, drawn **once** into an `OffscreenCanvas` at resize and blitted per frame | Zero per-frame path work |
| **1. Depth field** | 24–40 (desktop) / 10–16 (mobile) low-density particles on 2–3 depth planes, drift ≤ 6 px/s, alpha 0.05–0.18, colours from `--accent-*` only | Pooled objects, no allocation; `fillRect` only, **no `shadowBlur`** |
| **2. Route/mode tint** | Radial wash in the current mode accent: classic `#6355cb`, time-attack `#d93fd0`, Home mixes the three hero accents at 6–8 % | Pre-rendered gradient recreated only on mode change |
| **3. Impulses** | `ripple`, `shockwave`, `updraft`/`downdraft`, `land` scan, `fracture`, `swell`, `launch`, `reset`, `ack` | Short-lived (≤ 700 ms), max 2 concurrent, decay via `globalAlpha` |
| **4. Recession / focus** | Whole-field `globalAlpha` target: 1.0 playing, 0.8 revealing, 0.55 modal open, 1.0 game-over-behind-scrim | Single float lerp |
| **5. Vignette** | Static radial darkening at the viewport edges to protect text contrast at the margins | Pre-rendered once |

Hard rules: canvas is `aria-hidden="true"`, `pointer-events: none`, `position: fixed`, `inset: 0`, `z-index: 0`, **never** above `GameCard`, never above a focus ring, and the field's maximum luminance delta behind any text region is ≤ 8 % so `--text-primary`/`--foreground-muted` contrast is unaffected.

### 6.4 Canvas implementation guardrails

| Concern | Decision |
|---|---|
| Backing store | `canvas.width = round(cssW * scale)`; **`scale = min(devicePixelRatio \|\| 1, 2)`**, and a **low-quality mode** (`scale = 1`, half the particles, 30 fps cap) triggered by `navigator.hardwareConcurrency <= 4`, `matchMedia('(update: slow)')`, or a `hl:atmosphere:quality` override. References settle at 0.25×–0.75×; 1:1 DPR is never the default. |
| Resize | `ResizeObserver` on the viewport host + `visualViewport` change; recompute buffer, `ctx.setTransform(scale,0,0,scale,0,0)` (setting `width`/`height` resets the context), re-blit the static layer. Debounced to one frame. |
| Frame loop | `requestAnimationFrame`, `dt = min((now - last)/1000, 0.05)` (clamped — a backgrounded tab must not produce a jump); optional 30 fps cap by skipping alternate frames on low quality. |
| Lifecycle pause | Pause on `document.visibilitychange` **and** on an `IntersectionObserver` for the canvas host, and when `prefers-reduced-motion: reduce`. Reset `last` on resume. This mirrors noillirk's measured off-screen pause. |
| Reduced motion | **Draw exactly one frame** (static grid + a 12-particle frozen field) and never start rAF. No parallax, no impulses; state changes are conveyed by `data-*`-driven CSS opacity only. |
| Allocation | Pre-allocated particle pool; no array/object literals per frame; no string building per frame (batch by colour). |
| Cleanup | Cancel rAF, disconnect observers, remove listeners, drop the buffer on unmount. |
| SSR | The canvas element renders empty on the server (harmless); **no browser API is touched during render** — all work starts in `useEffect`. |
| Failure mode | If `getContext('2d')` returns `null`, the component renders the canvas and does nothing; the app is unchanged. |

### 6.5 Audio engine

**Graph**

```
voice(s) ─┐
          ├─► sfxBus (GainNode) ────┐
musicBus ─┘                         ├─► master (GainNode) ─► DynamicsCompressor ─► destination
                                    │
      (all buses start at 0 and ramp; master muted = gain 0, not suspend)
```

**Voice design (no samples):**

| Cue | Synthesis |
|---|---|
| `select` | square/triangle pair, base 480–620 Hz, 60 ms, gain ramp 0→0.08→0 in 6 ms attack / 54 ms decay |
| `press` / `higher` / `lower` | triangle sweep (LinearRamp on `frequency`) ±160 Hz, 120–140 ms, through a `BiquadFilterNode` lowpass at 2.4 kHz |
| `reveal` | short sine blip, 880 Hz, 50 ms at −26 dB |
| `wrong` | 90 Hz sine, 220 ms, exponential gain decay to 0.001, plus a +1 semitone detuned copy for beating |
| `tier t1..t4` | additive stack: t1 root, t2 root+octave, t3 + major third, t4 + fifth and a 60 Hz sub thump |
| `launch` | white-noise `AudioBufferSourceNode` (generated once into an `AudioBuffer` at init, ~0.4 s) through a bandpass swept 400→3 k Hz |
| `game over` | two-note cadence, 500 ms, triangle, low register |
| `tick` (urgent) | 900 Hz square, 40 ms, −24 dB, only at ≤ 5 s |
| BGM | generative: a slow pad (two detuned triangle oscillators on a fixed scale, lowpass LFO) + a pulse (scheduled with a lookahead scheduler at 25 ms interval / 100 ms horizon, per MDN's "A Tale of Two Clocks" pattern). Mode decides tempo and root: classic slower/darker, TA faster/brighter. No melody storage, no assets. |

**Lifecycle rules (all evidence-backed):**

1. **Lazy construction inside a gesture.** `new AudioContext()` is created on the first qualifying `pointerdown`/`keydown`, exactly like krillion (measured: 0 contexts before, 1 `running` after the click). MDN: create *or* resume inside the gesture; a context created outside a gesture is `suspended`.
2. **`resume()` before scheduling**, and `suspend()` when all buses are muted *and* the tab is hidden. Never `close()` on route change (the engine lives in the layout, so it should not need to).
3. **Autoplay refusal is expected, not exceptional**: catch `resume()` rejection, stay muted, and let the next gesture retry.
4. **Tab-hidden behaviour**: on `visibilitychange` → hidden: ramp master to 0 over 120 ms and suspend after the ramp; on visible: `resume()` (if a context exists and the user had sound enabled) and ramp back. WebKit suspends `AudioContext` when an iOS page is backgrounded (bug 231105 / 237878), so the return path must be resilient.
5. **iOS specifics**: `sampleRate` is device-chosen (48000 on the tested hardware path per the WebKit report; Firefox-only override per `standardized-audio-context` #489) — **never assume a rate**; derive all frequencies from `ctx.sampleRate` if any buffer is generated. Do **not** set `navigator.audioSession.type` to bypass the Ring/Silent switch — respecting device silent mode is the correct product posture (D9).
6. **Ducking**: BGM bus ramps to 0.3 on modal open / game-over / reveal beats and back over 400 ms. Implemented as `gain.setTargetAtTime`, not `setTimeout`.
7. **Dispose**: `osc.stop(t + dur)` per voice; disconnect on `ended`; cap concurrent voices (≥ 8) and drop the request rather than queue it.
8. **Rate-limit**: a per-cue minimum interval (e.g. 40 ms for ticks) so key-repeat cannot machine-gun the audio graph.

### 6.6 React boundary

- `AtmosphereBackdrop` and `AudioSurface` are the **only** new client components; both hold refs and effects, neither holds per-frame state.
- Audio settings live in a tiny module store with `subscribe`/`getSnapshot`; the control reads it with **`useSyncExternalStore`** and a **server snapshot of the default state**, so hydration matches and the button never flashes the wrong glyph (the pattern the project already uses for high scores at [`HighScoresModal.tsx:58`](../components/HighScoresModal.tsx:58), and the documented fix for browser-only values in SSR).
- Canvas/audio never call `setState`.

---

## 7. Audio-control UX recommendation

### 7.1 Placement — measured free space

| Surface | Occupied chrome | Free for a 44×44 control |
|---|---|---|
| Home header (`absolute right-[var(--space-page)] top-5`, measured 132×44) | High Scores button **237–369** at 390; **1247–1379** at 1440 (both measured) | Yes — the header is `flex items-center gap-2` anchored `right`: adding the audio button extends the row **leftwards**. With the existing `gap-2` (8 px) the new row left is **≈185 at 390** and **≈1195 at 1440**; the control occupies 185–229 / 1195–1239. Zero layout shift, and no collision with the `h1` (measured `h1` top = 321 at 390). |
| Gameplay header row (3-col grid, measured cols `44 / 187.8 / 105.2` at 390 and `44 / 1199.7 / 116.3` at 1440; back 16–60 / title flex / status **264–369** mobile, **1300–1416** desktop) | status cluster | Yes — insert the control as a sibling **before** the status cluster inside col-3; header height is fixed by `min-h-[5.5rem]`, so no vertical shift. Cost: the centred title's column shrinks by **~52 px** (44 px control + 8 px `gap-2`) — from 187.8 to ~135.8 at 390, a real truncation risk. |
| TA header footer | timer **24–61** + progress bar **77–1411** — **full** (measured) | No |
| Bottom of viewport | **Measured hit-test, not card art on desktop.** At 1440×900 gameplay both bottom corners resolve to the gameplay body `div` (`relative flex min-h-0 flex-1 flex-col`); at 390×844 both resolve to the comparison-board `<section>`, whose card plane spans **x 16–369**. | No — a fixed 12 px-inset chip still lands on the board/card region at mobile width and would compete with `GameCard` art. The earlier `NEXTJS-PORTAL`/`IMG` observation did not reproduce and has been replaced by the measurement above. |

**Recommendation: header-integrated, top-right on both surfaces, one 44×44 control placed immediately before the status cluster on gameplay and inside the existing Home header row.** This is also where all three references put theirs (krillion 84/1216, fairways 14/1386).

**Alternative (if the header must not change):** a fixed chip at `inset-inline-end: 12px; inset-block-end: 12px` — zero layout impact, but it overlays card art on mobile (measured) and sits behind modal backdrops. Not recommended.

### 7.2 Interaction pattern

- **One click = mute/unmute SFX+music together** (the emergency control every user reaches for).
- **Click-and-hold / secondary affordance = compact popover** with two rows: `SFX` and `Music` (44 px rows, `role="switch"` + `aria-checked`), plus an `Interface ticks` row (hover/select ticks). Keyboard: `Enter`/`Space` toggles; `ArrowDown` opens; `Escape` closes and returns focus. fairways ships exactly this two-surface pattern (quick ♪ button + settings switch, measured in sync).
- **Iconography:** Lucide (`Volume2` / `Volume1` / `VolumeX` / `Music`), 18–20 px, `text-[var(--foreground-muted)]` → `text-white` on hover; `aria-pressed={sfx && music}`; `aria-label` describes the **state** ("Sound on — mute") and the glyph matches it (krillion's inverted label/pressed pair is the anti-reference).
- **Focus:** inherits the global `:focus-visible` ring ([`:119`](../app/globals.css:119)); the control must never be under an animated layer.
- **Zero layout shift:** the control is `position: relative` inside existing flex rows with `min-h-11` sizing; the popover is `position: absolute` (not in flow). Evidence: Home header is `absolute`-anchored and gameplay header height is set by `min-h-[5.5rem]`, so neither surface reflows. `[Pass]` by construction; must be re-measured at implementation.
- **While a modal is open:** the control is not reachable (top layer). The popover is therefore **not** duplicated inside the modal. No layout or focus-trap change.

### 7.3 Defaults — recommendation and alternatives

**Recommended default:**

| Channel | Default | Rationale |
|---|---|---|
| **SFX** | **On, but silent until the first qualifying gesture creates the context.** First gesture of any kind (including the first card press) unlocks audio; nothing plays *before* a gesture because the context does not exist yet. | Matches krillion's measured behaviour and both browsers' autoplay contract; a game called "Higher or Lower" without feedback sounds broken. |
| **BGM** | **Off by default (opt-in via the popover).** | Continuous generative music in a quiz/skill game is fatiguing, competes with thinking, and is the classic "autoplay" complaint. An opt-in is one click and stays honest. |
| Interface ticks | On for fine pointers, off for touch | Touch users receive no hover events anyway; avoids stray taps making noise. |
| Persistence | `hl:audio:v1` → `{ sfx: boolean; music: boolean; ticks: boolean }` in `localStorage`; missing key = recommended defaults | Same pattern as `krillion-muted` / `fw3:…:sound` (both measured). |
| Honouring | Independently of `prefers-reduced-motion`: motion preference governs the canvas, not the mixer. | Sampled references treat them as separate preferences. |

**Alternatives, if the owner prefers otherwise:**

- **A. Everything off until explicit opt-in** (maximally polite, slower first feedback, highest chance a player never hears the game).
- **B. SFX on + BGM on at low volume after the first gesture** (closest to fairways' `aria-pressed="true"` default; risk of fatigue and of surprising a user in a quiet room).
- **C. SFX on, no BGM at all** (smallest surface, but the brief explicitly asks for toggleable theme/idle BGM).

---

## 8. Proposed file allowlist

### 8.1 Tier A — new files (**PROPOSED** — none of these exist in the repository yet)

| File | Purpose |
|---|---|
| `components/atmosphere/AtmosphereBackdrop.tsx` | Client component: `<canvas aria-hidden>`, delegation listeners, rAF lifecycle, `data-*` writer |
| `components/atmosphere/AudioSurface.tsx` | Client component: the audio control + popover; reads settings via `useSyncExternalStore` |
| `lib/atmosphere/eventBus.ts` | Typed emitter/subscriber singleton; zero React |
| `lib/atmosphere/canvasEngine.ts` | Grid pre-render, particle pool, impulse renderers, resize/visibility/reduced-motion handling |
| `lib/atmosphere/audioEngine.ts` | Context lifecycle, buses, voice factory, lookahead scheduler, ducking, visibility/suspend |
| `lib/atmosphere/soundMap.ts` | Cue → synthesis parameter table (the sound map) |
| `lib/atmosphere/settings.ts` | Versioned `localStorage` settings + `subscribe`/`getSnapshot`/server snapshot |
| `lib/atmosphere/types.ts` | Event union, tier type, surface/mode types |

### 8.2 Tier A — modified files

| File | Change (minimal) |
|---|---|
| [`app/layout.tsx:35`](../app/layout.tsx:35) | Render `<AtmosphereBackdrop />` before `{children}` and `<AudioSurface />` after. **`<html>`/`<body>` classes must stay byte-identical.** |
| [`app/globals.css`](../app/globals.css:1) | **Append only**: atmosphere tokens (`--atmo-*`), `data-atmosphere` / `data-tier` / `data-phase` harmonisation rules inside a `prefers-reduced-motion: no-preference` guard, and a `prefers-reduced-motion: reduce` block. The `:root` at `:4`, the motion `:root` at `:460`, the reduced-motion block at `:188`, and the view-transition rules at `:741` must remain byte-identical. |
| [`components/game/ClassicGame.tsx:170`](../components/game/ClassicGame.tsx:170) | Two emits: `guess` inside `handleGuess`; `reveal`/`phase` inside the untouched 1500 ms callback (carrying the existing `tier`). No timing, rule, storage, or handler change. |
| [`components/game/TimeAttackGame.tsx:242`](../components/game/TimeAttackGame.tsx:242) | Same two emits; plus `timer` emit from the existing 1000 ms tick reading `timerRef`. No constant change. |
| [`components/home/HomeSetup.tsx:147`](../components/home/HomeSetup.tsx:147) | One `route` emit in `startGame`; render `<AudioSurface variant="home" />` inside the existing header. Hero variants, ambient observer and `transitionTypes` untouched. |

### 8.3 Tier B — flagged, needs explicit approval

| File | Why it is probably necessary | Why it is flagged |
|---|---|---|
| [`components/game/GameplayShell.tsx:45`](../components/game/GameplayShell.tsx:45), [`:48`](../components/game/GameplayShell.tsx:48) | The shell's opaque background and the header's `backdrop-blur` both hide/cost against a live canvas | Making the shell transparent is a **visual change** to a shared surface; the header slot is where the gameplay audio control must live |
| [`components/game/DecisionControls.tsx:28`](../components/game/DecisionControls.tsx:28) | Only if keyboard-origin press styling is wanted (QA F2) | Not needed for canvas/SFX parity (that comes from `handleGuess`) |
| [`components/HighScoresModal.tsx:68`](../components/HighScoresModal.tsx:68) | Modal open/close/tab/filter emits for field dimming and ducking | Delegation can cover clicks; only `Escape`/backdrop close needs an explicit emit |
| [`components/home/DomainSelector.tsx`](../components/home/DomainSelector.tsx:1), [`CategorySelector.tsx`](../components/home/CategorySelector.tsx:1), [`CategoryCard.tsx`](../components/CategoryCard.tsx:1), [`ModeButton.tsx`](../components/ModeButton.tsx:1) | Would only be needed for `data-cue` attributes | **Delegation removes the need entirely** — recommended to leave all four untouched |

### 8.4 Frozen (must not change)

`lib/api/**`, `lib/catalog/**`, `lib/game/deck.ts`, `lib/highScores/**`, `types/**` (including `types/view-transition.d.ts`), `scripts/**`, `app/api/**`, `next.config.ts`, `components.json`, `package.json`, `package-lock.json`, `app/page.tsx`, `app/game/[mode]/page.tsx`, `app/game/classic/page.tsx`, `app/game/time-attack/page.tsx`, `app/game/layout.tsx`, `components/game/GameCard.tsx`, `components/game/ComparisonBoard.tsx`, `components/game/GameplayStatus.tsx`, `components/game/DerivedGameState.tsx`, `components/game/GameplayDivider.tsx`, `components/ui/button.tsx`, `public/**`, and all six `docs/immersive-motion-redesign-*.md`.

**Explicit expansion requests to the owner:** `app/layout.tsx`, `app/globals.css`, `components/game/ClassicGame.tsx`, `components/game/TimeAttackGame.tsx`, `components/home/HomeSetup.tsx`, plus Tier B `GameplayShell.tsx` (background + audio slot) and `HighScoresModal.tsx` (close emit).

---

## 9. Risk register

| # | Risk | Likelihood | Impact | Mitigation | Detection |
|---|---|---|---|---|---|
| **R1** | **Autoplay blocked / silent app.** Context created outside a gesture stays `suspended`; the user sees a mute icon that does nothing | Medium | High | Create the context only inside `pointerdown`/`keydown`; `resume()` before every schedule; catch rejection; state the mute glyph from actual state | Instrumented `AudioContext` construction + `state` reads in QA (the same probe used in §3.1) |
| **R2** | **iOS silent-switch "no sound" reports.** Web Audio is inaudible with the Ring/Silent switch on unless the audio session category is overridden | High (iOS) | Medium (support burden) | Do **not** override the silent switch; state it in the UI copy of the popover only if needed | Manual iOS check; `[Not tested]` here |
| **R3** | **`backdrop-filter` under a live canvas.** The gameplay header blurs its backdrop ([`GameplayShell.tsx:48`](../components/game/GameplayShell.tsx:48)); with a canvas beneath, the blur re-computes every frame | High | Medium | (a) start the canvas' below-header region as a static, non-animated band; (b) or replace the header's `blur(8px)` with an opaque bar once the canvas is live; (c) or cap the canvas at 30 fps. Choose in Design, measure with a trace | Performance trace while idle on gameplay; long-frame count |
| **R4** | **Opaque gameplay shell hides the canvas** — feature "doesn't work" on the surface that matters most | Certain if unaddressed | High | Tier B expansion to make the shell surface transparent; verify the card plane keeps full contrast | Visual + `getComputedStyle(shell).backgroundColor` check |
| **R5** | **Frame budget on mobile.** A full-viewport rAF loop alongside `backdrop-blur`, Motion transitions and image decoding | Medium | High | DPR clamp (2), low-quality mode, particle budget, 30 fps cap, no filters/shadows, pause off-screen; static frame under reduced motion | `performance_start_trace` long tasks / `requestAnimationFrame` interval sampling |
| **R6** | **Contrast regression over the canvas.** Text over a bright impulse loses contrast | Medium | High | Field luminance delta ≤ 8 % behind text; impulses masked out of text and card rects; vignette protects edges; verify with Lighthouse/contrast sampling | Contrast measurement at each impulse peak |
| **R7** | **Canvas competes with `GameCard` art** | Medium | High | Canvas `z-index` below all content; impulses clipped **outside** `article` rects; no impulse originates inside the card plane | Screenshot review + `data-*` origin assertions |
| **R8** | **Reduced-motion regression.** Someone starts rAF unconditionally | Medium | High | Single-frame draw path with an early return; `matchMedia` listener re-evaluates on change; global CSS block untouched | Emulated `prefers-reduced-motion: reduce` → assert `document.getAnimations()` count and zero rAF frames |
| **R9** | **Hydration mismatch** (the F4 class of bug) via settings read during render | Medium | High | `useSyncExternalStore` with a server snapshot equal to the default; all browser reads in effects | Console clean under both motion preferences |
| **R10** | **Keyboard/pointer divergence.** SFX fires on click but not on `h`/`l` | Medium | High (explicit requirement) | Emit inside `handleGuess`, not in the click handler; delegation emits `source: "keyboard"` for key events | Scripted: `ArrowUp` and a click produce identical event sequences |
| **R11** | **Audio spam.** Key repeat or rapid clicks flood voices | Medium | Medium | Per-cue rate limit + max-voice cap + `guessLocked`/`phase` guards already present | Hold `ArrowUp`; count `OscillatorNode` creations |
| **R12** | **View-transition freeze.** Backdrop is a still snapshot during `nav-forward` | High (behaviour, not a bug) | Low | Accept; keep the route window at 320 ms; optionally fade the canvas' own opacity to mask the swap | Observe `::view-transition` behaviour during `go!` |
| **R13** | **Scope creep into layout.** Canvas "fixes" tempt spacing/stacking edits | Medium | High | Any layout change is a stop condition; only `position: fixed` + `pointer-events: none` + `z-index` are permitted | Diff review limited to the allowlist |
| **R14** | **Two ambient systems fight.** Existing Home CSS ambient loops + new field motion double up | Medium | Medium | The field's Home density is reduced; the canvas must not animate the chevron or the `go!` offset (CSS owns those) | Visual check; `document.getAnimations()` unchanged at 2 on Home |
| **R15** | **Audio control unreachable in a modal**, read as a bug | Low | Low | Documented behaviour; the control is chrome, not a modal action | Product decision D5 |

---

## 10. Product decisions requiring owner sign-off

Each is a genuine product/design call, not a technical one. Recommended default first.

| # | Decision | Recommended default | Alternatives |
|---|---|---|---|
| **D1** | **Canvas scope** — where the backdrop is visible | Home + Gameplay, with modal dimming and game-over behind the 90 % scrim | Home only (lowest risk); Home + Gameplay + modal interior |
| **D2** | **Gameplay shell transparency** — authorise making `GameplayShell`'s surface transparent so one global canvas is visible | **Yes** — transparent shell surface, header stays a tinted bar | Two canvases (one inside the shell) — avoids the visual change but doubles the loops; or Home-only canvas |
| **D3** | **SFX default** | On after the first gesture (silent until the context exists) | Off until explicit opt-in |
| **D4** | **BGM default** | **Off**, opt-in from the popover | On at low volume after first gesture (fairways-like); no BGM at all |
| **D5** | **Audio-control placement** | Header-integrated, top-right on both surfaces | Fixed bottom-right chip (overlaps card art on mobile — measured); settings-only inside the High Scores modal |
| **D6** | **Control pattern** | One-click mute + compact SFX/Music popover | Single mute only; two separate buttons (breaks "one dominant control") |
| **D7** | **BGM character** | One shared generative theme with mode-specific tempo/root | Two distinct themes; ambient pad only (no pulse) |
| **D8** | **Interface ticks** (hover/select) | On for fine pointers, off for touch, toggleable | Off everywhere (quietest); always on |
| **D9** | **iOS silent switch** | Respect it — do not set `navigator.audioSession.type` | Override to `playback` (audio ignores the silent switch — surprising and hostile) |
| **D10** | **Reduced motion + canvas** | Draw one static frame (field visible, motionless) | Omit the canvas entirely under reduced motion; keep slow ambience (not recommended) |
| **D11** | **Urgent-timer audio** | Tick only at ≤ 5 s, 1/s | Tick from ≤ 10 s; no timer audio; a single warning chime at 10 s |
| **D12** | **Behaviour while the High Scores modal is open** | Canvas dims to 55 %, BGM ducks to 30 %, SFX still available for the controls inside the dialog | Full mute; BGM stops and restarts |
| **D13** | **Keyboard press styling parity (F2, inherited)** | Out of scope — canvas/SFX parity is delivered without it | Authorise the `data-pressed` handler beat QA F2 raised |
| **D14** | **Expose a user "reduce motion" toggle** (noillirk does) | No — OS preference only, unchanged from the current decision | Add a toggle alongside the audio popover |

---

## 11. Open questions / `Needs Verification`

1. `Needs Verification [product-decision]` — **D1–D14 above.** All are owner calls. D2 is the blocking one: without it the canvas cannot be seen on gameplay.
2. `Needs Verification [inferred-from-codebase]` — **View-transition interaction with a layout-mounted canvas.** The canvas sits outside the `<ViewTransition>` boundary, so it is expected to be a frozen snapshot during the ~320 ms `nav-forward` crossfade. Not measured; needs a runtime check during implementation.
3. `Needs Verification [environment-specific]` — **DPR behaviour.** All three reference sites and the local app ran at DPR 1 in this harness; a real 2×/3× device was not exercised, so blur cost and the `min(dpr, 2)` clamp are unverified at implementation time.
4. `Needs Verification [capability-unavailable]` — **Perceptual audio quality.** Nothing was listened to. Voice design, loudness balance and BGM fatigue are unassessed and must be judged by a human.
5. `Needs Verification [capability-unavailable]` — **Event-effect spatial origin on the references.** Rounds were not driven on krillion/noillirk, so "where on screen does a correct answer react" is inferred from canvas geometry, not observed.
6. `Needs Verification [capability-unavailable]` — **fairways audio playback path.** Toggling the sound button created no `AudioContext`; the only Web Audio symbols found live inside `three.min.js`. Whether playback is Three's audio module, an HTML media element created on demand, or something else is undetermined.
7. `Needs Verification [inferred-from-codebase]` — **fairways idle WebGL motion.** The two `drawImage` fingerprints were identical, but that sampling method cannot distinguish "static" from "not preserved"; recorded as unverified rather than "static".
8. `Needs Verification [environment-specific]` — **The dev server PID (17272)** is per the owner's brief; only reachability on port 3000 was independently confirmed.
9. `Needs Verification [inferred-from-codebase]` — **Delegation coverage.** A single capture-phase listener is expected to cover every Home control without editing the four selector components; atypical targets (native `<select>`, `dialog` backdrop, `:focus-visible`-only activation) need a runtime pass to confirm no interaction is double-fired.
10. `Needs Verification [product-decision]` — **Whether the pre-existing documentation inconsistency in §4.5** (design "do not retime" vs plan/handoff retiming) should be corrected in the design document. This analysis did not touch any of the six documents.
11. `Needs Verification [not tested]` — **Non-Chromium engines** for the canvas loop, `OffscreenCanvas`, and the audio graph.
12. `Needs Verification [not tested]` — **Production build**; the owner's dev server owns `.next`, so no build was run.

---

## 12. Stage statement and handoff trace

- **Analysis stage:** complete (this document).
- **Design stage:** applicable and **not started** — the canvas visual language and the audio-control visual specification require owner sign-off on §10 first.
- **Plan / Code / QA:** not started.
- **Files written by this stage:** `docs/procedural-canvas-audio-analysis-2026-11-22.md` and 9 screenshots in `docs/assets/procedural-canvas-audio/` (`krillion-desktop-1440.png`, `krillion-mobile-390.png`, `noillirk-desktop-1440.png`, `noillirk-mobile-390.png`, `fairways-desktop-1440.png`, `fairways-mobile-390.png`, `local-home-desktop-1440.png`, `local-home-mobile-390-modal.png`, `local-timeattack-desktop-1440.png`).
- **Files modified:** none. The 15 pre-existing modified files and every untracked path are untouched; `git diff --stat` is unchanged from §2.
- **Six immersive-motion documents:** unmodified.
- **Verification performed:** `git status`/`git diff --stat`/`git branch`; source read-back of `app/layout.tsx`, `app/page.tsx`, `app/game/[mode]/page.tsx`, `app/globals.css` (all 794 lines), **15** feature components in scope (`components/*` 3, `components/game/*` 9, `components/home/*` 3), `package.json`, `design-reference/tokens/*`, and all six immersive-motion documents; live Playwright inspection of three reference sites (canvas/DOM/script/`localStorage`/`AudioContext` probes) and of the local app at 1440×900 and 390×844 including a keyboard-driven guess; research via Context7 (`/vercel/next.js` layout persistence) and Exa (MDN Web Audio best practices, MDN/Web.dev canvas optimisation + HiDPI, MDN advanced scheduling, WebKit bugs 231105/323104, `standardized-audio-context` #489, React `useSyncExternalStore`).
- **Integrity pass re-verification (2026-11-22):** git baseline re-run (identical); every `file:line` citation re-checked against source; local geometry re-measured at 1440×900 and 390×844 (Home, Classic, Time Attack, High Scores modal); all 9 screenshots confirmed present; every allowlist/frozen path confirmed to exist; reference-site numbers **not** re-run (§3.0 note). Corrections are itemised in §0.4.
- **Verification not performed:** no perceptual audio review, no DPR≠1 device, no WebGL idle-motion determination, no reference-site scored-round driving, no production build.
- **Open `Needs Verification` items:** twelve, listed in §11 with qualifiers, all carried forward to the Design/Plan stage.
