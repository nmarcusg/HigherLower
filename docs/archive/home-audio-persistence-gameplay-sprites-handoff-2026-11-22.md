# Home Audio Control · Gameplay Audio Mount · Home Setup Persistence · Gameplay Sprite Visibility — Handoff

**Task type:** feature/visual postfix (four-part, owner-approved).
**Date:** 2026-11-22
**Branch:** `lj-branch`, HEAD `ea650b7` (unchanged; nothing staged, nothing committed)
**Source of truth:** [`home-audio-persistence-gameplay-sprites-analysis-plan-2026-11-22.md`](./home-audio-persistence-gameplay-sprites-analysis-plan-2026-11-22.md) with the owner's PD-3 override.
**Runtime used:** the owner's existing `next dev` on `http://localhost:3000` (PID 17272) — reused only, never stopped, restarted or rebuilt. Playwright MCP (Chromium), `devicePixelRatio = 1`, viewports **1440×900** and **390×844**.

---

## 1. Changed files (allowlist respected — 5 modified, 1 created, no others)

| File | Change |
|---|---|
| [`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx) | Home control is now an icon-only ghost button (`border border-transparent bg-transparent`, no shadow, no pill radius, `cursor-pointer`, `hover:bg-white/10`, `active:bg-white/15`, focus utilities mirroring the peer). `variant` union narrowed to `"home"`; header comment and popover comments rewritten for the single visible control. Engine wiring, unlock listeners, `data-audio-*` writer, armed dot, popover and keyboard model untouched. |
| [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx) | Removed the `AudioSurface` import and the `<AudioSurface variant="gameplay" />` mount. Status cell geometry untouched (`gap-2 sm:gap-4` left in place, inert with one child). |
| [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx) | Two additive effects: a post-mount restore from `hl:setup:v1` validated against the live catalog, and a write on selection change gated by a `selectionRestored` flag. The three `useState`s and their default initialisers are unchanged. |
| `lib/home/selection.ts` **(new)** | Versioned key `hl:setup:v1`, `HomeSelection` envelope (`v: 1`), `readHomeSelection`, `writeHomeSelection`, `resolveHomeSelection` (catalog-driven: domain exists → category playable inside that domain → mode in `compatibleModes`). `typeof window` guards; every read/write silent on failure. |
| [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts) | `Tuning.spriteGain` / `Tuning.chevronGain` read per surface at (re)bake; one clamped multiply in `drawSprites` applied **before** `fieldAlpha`; idle-only chevron gain in `drawChevrons`. `surface` declaration moved above the first `readTuning()` call so the per-surface token resolves on the initial bake. |
| [`app/globals.css`](../app/globals.css) | Added `--atmo-sprite-gain: 1`, `--atmo-sprite-gain-gameplay: 3`, `--atmo-chevron-gain: 1`, `--atmo-chevron-gain-gameplay: 2`; `.audio-surface` transition list switched from `box-shadow` to `background-color`/`border-color`; the `data-audio-sfx="on"` `--atmo-accent` repoint removed, `sfx-off` keeps only the dimmed colour. `--atmo-accent` / `--atmo-accent-off` left declared (PD-6). |

Frozen set untouched: `ClassicGame`, `TimeAttackGame`, `GameCard`, `ComparisonBoard`, `DecisionControls`, `GameplayStatus`, `GameplayEntrance`, `LaunchDock`, `CategorySelector`, `DomainSelector`, `ModeButton`, `CategoryCard`, `HighScoresModal`, `lib/atmosphere/sprites.ts|eventBus.ts|delegation.ts|types.ts`, `lib/audio/*`, `lib/catalog/*`, `lib/highScores/*`, `app/layout.tsx`, `app/page.tsx`, `app/game/**`, `types/*`, configs, `design-reference/**`.

---

## 2. Root-cause fixes

1. **Home audio control read as a different component language.** It was a bordered `rounded-full` badge with an opaque `#15122b` face plus a `4px 4px 0` accent offset shadow and `cursor: default`, sitting 8 px from a borderless text button with `cursor: pointer`. Root cause: the control was designed around its offset shadow (which doubled as the SFX state tell). Fix: same ghost-button treatment as its neighbour; state now reads from the glyph (`Volume2`/`VolumeX`) plus the `sfx-off` dimmed colour (PD-2), which is exactly what the measured hover/state matrix confirms.
2. **Duplicate gameplay audio control.** `GameplayShell` mounted a second `AudioSurface`; the engine, capture-phase unlock pair and `data-audio-*` writer already live in the headless root-layout instance and run before `if (!variant) return null`. The gameplay control was pure chrome. Removing it is geometry-neutral and audio survives on a direct load (measured below).
3. **Home selection destroyed on route change.** The triple lived only in `HomeSetup` component state, which unmounts when `/game/*` renders, and no storage key existed. Fix: versioned storage + catalog-validated restore in a passive effect, so SSR markup and the first client render stay on the catalog defaults (no hydration mismatch) and one post-mount correction is accepted (PD-5).
4. **Gameplay sprites read faint under the accepted scrim.** The field is Home-tuned while the gameplay DOM scrim keeps ≈29 % in the gutters. Fix: a surface-dependent gain applied inside the draw path only — no scrim retune, no draw-order change, no size change (draw-time sprite scaling stays banned).

---

## 3. PD-3 numbers as shipped (owner override)

| Token | Value | Where it is applied |
|---|---|---|
| `--atmo-sprite-gain` | `1` | Home, unchanged amplitude |
| `--atmo-sprite-gain-gameplay` | `3` | `ctx.globalAlpha = Math.min(0.85, mote.alpha * breathe * tuning.spriteGain) * fieldAlpha` — **clamped before `fieldAlpha`** |
| `--atmo-chevron-gain` | `1` | Home idle chevrons, unchanged |
| `--atmo-chevron-gain-gameplay` | `2` | Idle gameplay chevrons only (`Math.min(1, alpha * tuning.chevronGain)`) |

The reactive Higher/Lower surge is **not** multiplied: `SURGE_ALPHA_PEAK` stays at `0.88` absolute, as do `SURGE_ALPHA_BASE`, `SURGE_RECEDE_ALPHA`, `WRONG_ALPHA` and the reduced-motion assertive alphas. Measured idle vs surge draw alpha: **0.6774 idle** → **0.8736 during a correct reveal**, so the answer flash still pops above idle (a 2.0× multiplier would have pushed it past 1.0).

Sprite size, the accepted scrim/tint values, one canvas, one rAF, offscreen sprites and the no-per-frame-`shadowBlur`/`filter`/gradient rule are all unchanged (measured: 1 canvas, 201 rAF : 201 clearRect in 1 s, 0/0/0).

---

## 4. Verification matrix

Environment: dev server PID 17272, Chromium, DPR 1, 1440×900 and 390×844, 2026-11-22.

| # | Check | Result | Evidence |
|---|---|---|---|
| R1 | Home control computed chrome | `[Pass]` | `border: 1px solid rgba(0,0,0,0)`, `background: rgba(0,0,0,0)`, `box-shadow: none`, `border-radius: 0px`, `cursor: pointer`; 44×44 at `1195.2,20` (1440) and `185.2,20` (390) |
| R2 | Hover / active / focus / state | `[Pass]` | hover `oklab(…/0.1)` + `color rgb(255,255,255)`; active `oklab(…/0.15)`; `:focus-visible` `outline: 3px solid rgb(34,211,238)`, offset `4px`; muted state `aria-pressed="true"`, `color rgb(170,163,213)`, `data-audio-sfx="off"` |
| R3 | Labels / popover / keyboard | `[Pass]` | `aria-label` flips ("Sound on — mute all audio" / "Sound off — unmute all audio"), `aria-pressed`, `aria-expanded`, `aria-controls`; ArrowDown opens a 240×108 `position: fixed` panel at `999,72` (identical to the pre-change baseline), fully in viewport, focus moved to the SFX row, Enter toggles `hl:audio:v1` and `data-audio-sfx`, Escape closes and returns focus |
| R4 | Header row geometry / CLS | `[Pass]` | audio `1195.2/44`, scores `1247.2/131.8`, header `1195.2/183.8×44`, gap `8` — byte-identical to the analysis baseline at both viewports; CLS **0.0000** over 3 s (baseline 0.0022); no horizontal overflow (385 = 385 at 390) |
| R5 | Gameplay header has zero audio controls | `[Pass]` | `document.querySelectorAll('[data-audio-control]').length === 0` on `/game/classic` and `/game/time-attack` at both viewports |
| R6 | Gameplay header/status geometry | `[Pass]` | 1440: cell `x 1299.7, w 116.3, right 1416`, header `90`; 390 classic: cell `263.8 / 105.2 / right 369`, header `90`; 390 time-attack: cell `34 / 34`, header `138`; `scrollWidth === clientWidth` in every state |
| R7 | Direct-load first-gesture SFX | `[Pass]` | Fresh `/game/classic?category=movie-series-rating` with `AudioContext` instrumented **before** navigation: at rest `ctxCreated 0`, `oscCreated 0`, `data-audio-state="armed"`, `data-audio-sfx="on"`, 0 visible controls. First `Higher` click → `ctxCreated 1`, context state **`running` at construction** (`["running","change:running"]`), `resumeCalls 1`, 4 oscillators started/stopped with `set:300` (action cue), `880` (reveal tick), `90`/`96` (tier/land), `data-audio-state="running"`, `data-guess="higher"` |
| R8 | Bare `/game/classic` | `[Pass]` | redirects to `/` (unchanged; `missing-category` → `redirect("/")`) |
| R9 | Full Time Attack round → Back | `[Pass]` | Selected Gaming → Player Count → Time Attack, `data-mode="time-attack"`, dock "Peak Concurrent Players · Time Attack", canvas sample `rgba(212,58,207,53)`, `hl:setup:v1` written; `go!` → `/game/time-attack?category=player-count`; timer ran 60 → 0 ("Time's up" overlay, 0 controls in the header); `Back to setup` → `/` with radios `gaming / player-count / time-attack`, `data-mode="time-attack"`, dock "Peak Concurrent Players · Time Attack", canvas sample `rgba(212,58,207,53)` **identical to pre-launch**, stored triple unchanged |
| R10 | Invalid / corrupt stored values | `[Pass]` | Unknown ids + `mode:"pvp"` → defaults, no error, key rewritten; malformed JSON (`{not json`) → defaults, key rewritten; `v: 2` → defaults, key rewritten; cross-domain triple (`gaming` + `movie-series-rating`) → defaults; a well-formed but *compatible* pair is correctly honoured |
| R11 | Hydration / console | `[Pass]` | 0 console errors across the whole session (182 messages); the only 3 warnings were emitted by this pass's own probes (two `getImageData` readback advisories, one `motion.dev` reduced-motion notice during a deliberate `emulateMedia` run). No hydration warnings |
| R12 | Sprite gain reaches the draw path | `[Pass]` | Sampled `ctx.globalAlpha` over 400 ms per configuration: sparks ×1 → max **0.2559**; sparks ×3 → max **0.7436** (≈2.9×, clamp not hit); idle chevrons ×1 → **0.3166**; ×2 → **0.6332**; shipped combined → max **0.6759**, median **0.4168** vs **0.1348** at ×1 |
| R13 | Composited visibility (canvas on/off luminance) | `[Partial]` | Desktop left gutter `0–120 × y240–660`: peak Δ **13.2 → 21.2** (+61 %), mean 3.72 → 3.72. Sparks isolated (chevrons disabled) over `y116–692`: peak Δ **8.4 → 11.9** (+42 %). The mean is unchanged because the gameplay tint wash (α 0.26) and the accepted DOM scrim dominate the composite. `TODO:` the plan's projected 24–28 / mean ≈6.5 is not reached — see open items |
| R14 | Card cover art | `[Pass]` | Canvas-on/off inside the two `article img` rects: control (canvas hidden for both captures) **0 px changed**; shipped **max Δ 11 on 226 of 179 776 px (0.13 %)** and *identical* at gain 1 and gain 3, i.e. the residual is the pre-existing constant tint wash leaking through the card's translucent plate, not the boost |
| R15 | Reactive surge ceiling | `[Pass]` | Draw alpha never exceeded **0.8736** during a full reveal window (a 2.0× idle multiplier would have exceeded 1.0) |
| R16 | One canvas / one rAF / no per-frame cost | `[Pass]` | `canvasCount 1`; 201 rAF ↔ 201 `clearRect` in 1 s; `shadowBlur` 0, `filter` 0, `createRadialGradient` 0 in idle |
| R17 | Reduced motion | `[Pass]` | `emulateMedia({ reducedMotion: 'reduce' })` → two frames 650 ms apart: **0 px changed, max Δ 0**; the boosted field is present in the single static frame (buffer peak α 189) |
| R18 | AA contrast (composited backdrop, text hidden) | `[Pass]` | Gameplay header title 17.86:1, subtitle 11.97:1, status 11.81:1; card title 11.35:1; Higher control 10.07:1; Lower control **4.84:1** (tightest, pre-existing magenta face, untouched); Home audio glyph 11.05:1 (p95 10.85), dimmed state 6.99:1, hover white 12.43:1; High Scores label 11.39:1. All ≥ 4.5:1 |
| R19 | Static gates | `[Pass]` | `npx tsc --noEmit` exit 0; `npm run lint` **0 errors / 95 warnings** (identical to the 95-warning baseline, none in a changed file) |
| R20 | Build | `[Blocked]` | `npm run build` not run — the owner's `next dev` owns `.next` and port 3000 |
| R21 | Perceptual acceptance | `[Not tested]` | no human reviewer in this pass |
| R22 | DPR 2/3, Safari, Firefox | `[Not tested]` | Chromium @ DPR 1 only |

---

## 5. Screenshots — `docs/assets/ui-postfix/after/`

| File | Content |
|---|---|
| `home-header-1440-icon-only.png` | Home header crop, icon-only audio control + High Scores (1440) |
| `home-header-390-icon-only.png` | same crop at 390 |
| `home-1440-icon-only.png` | full Home viewport (1440) |
| `home-390-icon-only.png` | full Home viewport (390) |
| `gameplay-header-1440-no-audio.png` | Classic header crop with zero audio controls (1440) |
| `gameplay-header-390-no-audio.png` | Classic header crop (390) |
| `gameplay-timeattack-header-390-no-audio.png` | Time Attack header crop with the timer row (390) |
| `gameplay-field-1440-gain-3x.png` | Classic field at the shipped 3.0 / 2.0 gains (1440) |
| `gameplay-field-390-gain-3x.png` | same field (390) |
| `home-1440-gaming-time-attack.png` | Home with Gaming / Player Count / Time Attack selected before launch |
| `home-1440-restored-gaming-time-attack.png` | Home **after** the full round and `Back to setup` — restored selection, magenta tint, dock label |
| `gameplay-timeattack-1440-game-over.png` | "Time's up" overlay at the end of the round (unchanged component) |

---

## 6. Deviations from the plan (both minimal, both flagged)

1. **`/* eslint-disable react-hooks/set-state-in-effect */` around the restore effect** in [`HomeSetup.tsx`](../components/home/HomeSetup.tsx). The plan's literal diff (setState inside an effect) trips this repo's error-level `react-hooks` rule, and I5 requires 0 errors. The behaviour is exactly the approved one — one post-mount correction, no render loop — so the rule is disabled for that single effect with the reason stated inline, matching the existing precedent in [`GameCard.tsx`](../components/game/GameCard.tsx:91). No state shape changed.
2. **`surface` declaration reordered** above the first `readTuning()` call in [`canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts) so the per-surface gain token resolves on the initial bake. Without the move the initialiser would read `surface` in its TDZ. No behaviour change beyond intent.

---

## 7. Open items / `Needs Verification`

1. **Sprite-boost strength vs the plan's projection** — `Needs Verification [product-decision]`. The multiply is exact (draw alpha 0.2559 → 0.7436), but the composited gain is smaller than §3.4 projected: gutter peak Δ **13.2 → 21.2** (+61 %) rather than 24–28, with the mean unchanged at 3.72. Cause: §3.4's projection attributed the gutter's peak pixel to a spark; measured isolation shows that peak is a **chevron**, and sparks alone move peak Δ 8.4 → 11.9 over the full field band. The numbers shipped are the owner's PD-3 override (3.0 / 2.0); whether the perceived presence is now sufficient is an owner call (perceptual acceptance not assessed).
2. **Analysis baseline variance** — the analysis recorded the mobile back control at `x 22`; measured today at 390 it is `x 16` with a 44×44 box (`px-4` = 16 px). The back control is untouched by this task, so this is a measurement variance, not a regression. `Needs Verification [environment-specific]`.
3. **Card-art residual** — 226 px per card differ by ≤ 11/255 between canvas-on and canvas-off, *identically* at gain 1 and gain 3, with a 0-px control. That is a pre-existing constant wash leak through the card plate, not the boost. Not changed here; worth a separate look only if the owner wants pixel-exact art isolation.
4. **Pre-existing design-detector findings** — `impeccable detect` over the changed UI files reports the hero's `background-clip: text` gradient ([`globals.css:227`](../app/globals.css:227)) and two bounce easings ([`globals.css:470-471`](../app/globals.css:470)). All three are part of the committed visual world and outside this task; left untouched.
5. **Dead tokens** — `--atmo-accent` / `--atmo-accent-off` remain declared and unused (PD-6). A cleanup pass is a separate decision.
6. **Not exercised** — `npm run build` (`[Blocked]`), DPR 2/3, Safari, Firefox, and perceptual acceptance of the icon-only control and the boosted field (`[Not tested]`).

---

## 8. Sign-off

All four adjustments are implemented inside the six-file allowlist, `tsc` and `lint` are clean, and every runtime check that could run passed except R13, which is reported as `[Partial]` with the measured numbers and the reason it differs from the plan's projection. Nothing was staged or committed; all pre-existing uncommitted work in the tree is untouched.
