# Immersive Motion Enhancement — Analysis

**Date:** 2026-11-22
**Stage:** Analysis only (no code changes)
**Task type:** Visual change + interaction enhancement (motion/animation layer)
**Status:** Analysis complete. Design stage applicable. Code stage not started.
**Revision:** Second pass, 2026-11-22 — browser tooling repaired (Chromium 1255), both MCPs verified, working tree confirmed clean, `impeccable context` run, and all three reference sites plus the local app re-inspected with measured runtime data. See §4.0, §4.5, §4.6 and the verification log in §9.

---

## 1. Task type and classification

| Field | Value |
|---|---|
| Classification | Visual change + interaction enhancement |
| Pipeline stages used | Analysis (this document) |
| Stages skipped | Design (applicable — deferred to next stage), Plan, Code, QA, Postfix, Reconciliation |
| Code changed | None |
| Config changed | None |
| Files created | This document only |

Owner request, restated: add immersive motion, animation and interactive elements to an existing higher/lower game, inspired by three reference sites, **without** overhauling the layout, **without** copying those designs, and **without** departing from the core higher/lower concept.

This is an **enhancement of an existing visual world**, not a replacement. Per `.roo/rules/ui-design-system.md` ("Theme Preservation", "Skill Recommendations Defer to Project Evidence"), incumbent visual truth is authoritative evidence and must be preserved. Per Improvement-skill guidance, this is *refinement preserves* rather than *redesign replaces*: keep identity, layout, copy and behaviour; add motion.

---

## 2. Scope statement and surfaces in scope

### In scope

1. **Home / setup** — hero, domain selector, category selector, mode selector, Ready/Go CTA, High Scores modal.
2. **Gameplay** — shared shell/header, comparison board, both game cards, OR badge, decision controls, score/status, Time Attack timer + delta label, correct/incorrect feedback, game-over panel.

### Explicitly out of scope

- Layout restructuring, new routes, new pages, new visual language.
- Gameplay rules, scoring, deck logic, timing constants, timer semantics.
- Provider adapters, catalog authorization, data shapes, high-score storage semantics.
- Copy changes (beyond state-feedback wording already rendered by the app).
- Theme/token replacement. Existing palette, Space Mono typography and offset-shadow language stay.

### Owner hard constraints (verbatim intent)

- Do not overhaul the entire layout.
- Do not copy the exact designs of the reference sites.
- Stay true to the core higher/lower game concept.
- Focus on motion, animation and interactive elements that make play more engaging.

### Constraint discovered during analysis (affects how motion may be applied)

On a 390×844 viewport the gameplay document is **1252 px tall**, and the decision controls sit at y≈1100 and y≈1166 — i.e. **256 px and 322 px below the fold**. Re-measured on the running dev server at `/game/classic?category=movie-series-rating` (Playwright MCP, Chromium 1255, 2026-11-22, second pass). The original first-pass reading was 1262 px with controls at y≈1110/1176 (266–332 px below fold); the 10 px delta is consistent across both readings and does not change the conclusion. Motion designs must therefore not assume a single-screen viewport, and revealing/moving content must not push the decision controls further down.

---

## 3. Incumbent visual and motion reality

### 3.1 Design tokens and global CSS

`app/globals.css` is the token and motion home.

| Fact | Evidence |
|---|---|
| Tailwind v4 CSS-first entry, tokens in `:root`, exposed via `@theme inline` | [`app/globals.css`](../app/globals.css:1), [`app/globals.css`](../app/globals.css:4), [`app/globals.css`](../app/globals.css:72) |
| Canvas tokens: `--bg-base #15122b`, `--bg-elevated #211d3a` | [`app/globals.css`](../app/globals.css:8), [`app/globals.css`](../app/globals.css:10) |
| Mode/action accents: `--accent-classic #6355cb`, `--accent-time-attack #d93fd0`, `--accent-action-higher #22d3ee`, `--accent-action-lower #d93fd0`, `--accent-highlight #ffcc00` | [`app/globals.css`](../app/globals.css:31), [`app/globals.css`](../app/globals.css:32), [`app/globals.css`](../app/globals.css:33), [`app/globals.css`](../app/globals.css:34), [`app/globals.css`](../app/globals.css:35) |
| Status colors: `--status-success #1da216`, `--status-error #f05ac7` | [`app/globals.css`](../app/globals.css:29), [`app/globals.css`](../app/globals.css:30) |
| Focus ring token + global `:focus-visible` outline | [`app/globals.css`](../app/globals.css:28), [`app/globals.css`](../app/globals.css:68), [`app/globals.css`](../app/globals.css:119) |
| Hero offset-shadow token `--hero-shadow-offset: 6px` | [`app/globals.css`](../app/globals.css:43) |
| **Global reduced-motion block** (scroll-behavior, animation-duration, iteration-count, transition-duration) | [`app/globals.css`](../app/globals.css:188) |
| Dot-grid background utility | [`app/globals.css`](../app/globals.css:112) |
| Noise grain overlay `bg-noise` (used by root body) | [`app/globals.css`](../app/globals.css:200), [`app/layout.tsx`](../app/layout.tsx:37) |

### 3.2 Existing keyframes and which are actually used

Registered keyframes at runtime (Chrome DevTools MCP, home page): `home-dialog-in`, `home-dialog-out`, `pulse-ring`, `shimmer`, `fadeInUp`, `fadeInScale`, `orb-float`, `shake`, `timer-urgent`, `floatUp`, `spin`.

**Actively used today:**

| Motion | Definition | Used at |
|---|---|---|
| High-scores dialog in/out, 200 ms `cubic-bezier(0.23, 1, 0.32, 1)` | [`app/globals.css`](../app/globals.css:124) | applied via `.high-scores-dialog[open]` [`app/globals.css`](../app/globals.css:134), dialog element [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:177) |
| Dialog close timer 200 ms, skipped under reduced motion | [`app/globals.css`](../app/globals.css:138) | [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:85), [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:136) |
| `.motion-reduce` variant forcing `animation-duration: 0.01ms` on the dialog | [`app/globals.css`](../app/globals.css:151) | [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:177) |
| Go CTA `:active` translate(4px,4px) + counter-translated offset layer | [`app/globals.css`](../app/globals.css:180), [`app/globals.css`](../app/globals.css:184) | [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:268), offset span [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:272) |
| Go CTA hover tint `#ef63df` | [`app/globals.css`](../app/globals.css:156) | same button |
| Time Attack wrong-answer `.shake` (450 ms, multi-step translateX) | [`app/globals.css`](../app/globals.css:394), [`app/globals.css`](../app/globals.css:420) | [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:386) toggled for 460 ms at [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:249) |
| Time Attack floating `+3s / −5s` `.float-up` (900 ms) | [`app/globals.css`](../app/globals.css:441), [`app/globals.css`](../app/globals.css:451) | [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:363) |
| Spinner `animate-spin` with `motion-reduce:animate-none` | Tailwind utility | [`components/game/DerivedGameState.tsx`](../components/game/DerivedGameState.tsx:64) |
| Time Attack timer bar `transition-[width] duration-1000 ease-linear` | — | [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:378) |

**Defined but unused anywhere in `.tsx`** (verified by repository search for `pulse-ring|shimmer|fade-in-up|fade-in-scale|orb-float|orb|glass-hover|stripe-accent|bg-noise|float-up|timer-urgent|shake`):

`pulse-ring` ([`app/globals.css`](../app/globals.css:301)), `shimmer` ([`app/globals.css`](../app/globals.css:315)), `fade-in-up` ([`app/globals.css`](../app/globals.css:346)), `fade-in-scale` ([`app/globals.css`](../app/globals.css:361)), `orb` / `orb-float` ([`app/globals.css`](../app/globals.css:375)), `glass` / `glass-hover` ([`app/globals.css`](../app/globals.css:210), [`app/globals.css`](../app/globals.css:217)), `stripe-accent` ([`app/globals.css`](../app/globals.css:335)), `btn-primary` / `btn-gold` ([`app/globals.css`](../app/globals.css:246), [`app/globals.css`](../app/globals.css:270)), `section-label` ([`app/globals.css`](../app/globals.css:291)), `text-gradient` ([`app/globals.css`](../app/globals.css:230)), `card-selected` ([`app/globals.css`](../app/globals.css:238)), `.timer-urgent` ([`app/globals.css`](../app/globals.css:436)) — notably the urgent-timer keyframe exists but Time Attack only changes colour, not class ([`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:355)).

### 3.3 Currently implemented Motion-library usage

Motion `^14.1.0` is a direct dependency ([`package.json`](../package.json:18)); `package-lock.json` resolves the bundled engine to `framer-motion@14.1.0` ([`package-lock.json`](../package-lock.json:6776)). Imported as `motion/react` in three client components.

| Surface | What exists | Evidence |
|---|---|---|
| Hero entrance | `heroVariants` with `when: "beforeChildren"`, `staggerChildren: 0.06`; children fade+`translateY(8px)`→0 over `0.24 s` with `[0.23, 1, 0.32, 1]`; `useReducedMotion` collapses to `initial: false` and `0.01 s` | [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:125), [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:128), [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:137), [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:164) |
| Setup arrival | one-shot opacity/translate pulse `0.22 s` when the "Start Comparing" anchor is used | [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:206) |
| Category swap | `key={domainKey}` remount fade+1 px rise, `0.18 s` | [`components/home/CategorySelector.tsx`](../components/home/CategorySelector.tsx:87) |
| Category list height | imperative `element.animate()` height interpolation, `180 ms`, `cubic-bezier(0.23, 1, 0.32, 1)`, reduced-motion aware | [`components/home/CategorySelector.tsx`](../components/home/CategorySelector.tsx:65) |
| Modal | `useReducedMotion` gates the 200 ms CSS close delay | [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:11), [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:84) |

**Runtime confirmation (home, 1920×893):** hero `<h1>` settled at `opacity: 1; transform: translateY(0px)` with `152 px` type and `-13.68 px` tracking; per-word offsets render as `#d93fd0 6px 6px 0` / `#22d3ee 6px 6px 0` / `#6355cb 6px 6px 0` with a `2 px` text stroke. **Zero animations were running at rest** — the home surface has entrance choreography only, no ambient motion.

**Re-verified independently (Playwright MCP, 1440×900, 2026-11-22 second pass):** `document.getAnimations().length === 0` at rest on the home surface; the computed `h1` is `font-size: 152px` with `letter-spacing: -13.68px`, `opacity: 1`, `transform: matrix(1,0,0,1,0,0)`. Eleven keyframes are registered (`fadeInScale`, `fadeInUp`, `floatUp`, `home-dialog-in`, `home-dialog-out`, `orb-float`, `pulse-ring`, `shake`, `shimmer`, `spin`, `timer-urgent`) and exactly **one** `prefers-reduced-motion` block exists in the loaded stylesheets. Home document height at 1440×900 is 2242 px; at 390×844 it is 2489 px with the `h1` fluidly reduced to `56 px` and no horizontal overflow. Home screenshots: [`local-home-desktop-1440.png`](assets/immersive-motion/local-home-desktop-1440.png), [`local-home-mobile-390.png`](assets/immersive-motion/local-home-mobile-390.png).

### 3.4 Gameplay surface: where interaction happens, and how little motion exists

| Element | Measured reality (desktop 1920×893) | Evidence |
|---|---|---|
| Shell header | 90 px tall; back control `hover:-translate-y-0.5`, `shadow-[4px_4px_0_var(--gameplay-accent)]` | [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx:48), [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx:56) |
| Comparison board | 634 px; two cards 432 px wide at y=194 and y=146 (48 px intentional stagger) | [`components/game/ComparisonBoard.tsx`](../components/game/ComparisonBoard.tsx:25), [`components/game/ComparisonBoard.tsx`](../components/game/ComparisonBoard.tsx:27) |
| OR badge | 88×88, `shadow-[5px_5px_0_var(--gameplay-accent)]` | [`components/game/ComparisonBoard.tsx`](../components/game/ComparisonBoard.tsx:36) |
| Cards | `article` with offset plate `translate-x-2 translate-y-2` and `shadow-[0_9px_0_var(--card-accent)]`; no entrance or reveal transition | [`components/game/GameCard.tsx`](../components/game/GameCard.tsx:54), [`components/game/GameCard.tsx`](../components/game/GameCard.tsx:56) |
| Result tint | instant conditional overlay + border, **no animation** | [`components/game/GameCard.tsx`](../components/game/GameCard.tsx:76), [`components/game/GameCard.tsx`](../components/game/GameCard.tsx:83) |
| Nav/guard controls | `Link` back button, `DecisionControls` disabled during reveal | [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx:53), [`components/game/DecisionControls.tsx`](../components/game/DecisionControls.tsx:33) |
| Decision buttons | 283×54 stacked; `transition-transform hover:-translate-y-1 active:translate-y-0` at Tailwind default `0.15 s cubic-bezier(0.4,0,0.2,1)` | [`components/game/DecisionControls.tsx`](../components/game/DecisionControls.tsx:25) |

**Runtime confirmation of a decision:** clicking *Higher* produced an `Incorrect` status, the correct/incorrect tint layers and a 4 px border — all appearing **instantly**. The only animation during reveal was one 150 ms WAAPI opacity transition on the status text (`transition-opacity`, [`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:251)). `document.getAnimations()` at rest: **0**.

**Quantified re-measurement (Playwright MCP, 2026-11-22 second pass).** Sampling `document.getAnimations()` every 16 ms for 500 ms after a real click on *Higher* captured **exactly two** animations and nothing else:

| Captured | Target | Property | Duration | Easing |
|---|---|---|---|---|
| status fade | the `role="status"` overlay `div` | `opacity` | 150 ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| press release | the clicked `button` | `translate` | 150 ms | `cubic-bezier(0.4, 0, 0.2, 1)` |

This run resolved to `Correct`; the first pass resolved to `Incorrect`. Both outcome states have now been exercised and both are motionless apart from those two 150 ms transitions — the card tint, border and value change are instant in both. Hover feedback was also exercised: on hover the button computes `translate: 0px -4px` with a `5px 5px 0` white offset ring, and there are **0** running animations after the 150 ms transition settles. Gameplay at 1440×900 is 900 px tall (single viewport) with 0 animations at rest; at 390×844 it is 1252 px. Screenshots: [`local-gameplay-desktop-1440.png`](assets/immersive-motion/local-gameplay-desktop-1440.png), [`local-gameplay-mobile-390.png`](assets/immersive-motion/local-gameplay-mobile-390.png), [`local-gameplay-outcome-mobile-390.png`](assets/immersive-motion/local-gameplay-outcome-mobile-390.png).

**Game-over panel** is presentational markup with no enter/exit animation, focus-trapped inline ([`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:290), [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:433)).

### 3.5 Timing invariants that motion must not alter

| Invariant | Value | Evidence |
|---|---|---|
| Classic reveal hold before advance/game-over | `1500 ms` | [`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:186) |
| Time Attack reveal after correct / wrong | `800 ms` / `400 ms` | [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:52), [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:53) |
| Time Attack tick | `1000 ms` interval; timer runs through reveals | [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:156) |
| Time Attack wrong-answer shake window | `460 ms` (must stay ≤ 400 ms reveal + tolerance) | [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:249) |
| Guess lock during reveal | `guessLocked` ref | [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:220) |
| Keyboard shortcuts | `ArrowUp`/`h`, `ArrowDown`/`l`, ignored inside dialogs and interactive targets | [`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:203), [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:291) |

### 3.6 Accessibility baseline that must be preserved

- Global `:focus-visible` outline token ([`app/globals.css`](../app/globals.css:119)) and per-component `focus-visible` rings ([`components/game/DecisionControls.tsx`](../components/game/DecisionControls.tsx:25), [`components/home/DomainSelector.tsx`](../components/home/DomainSelector.tsx:62)).
- Global `prefers-reduced-motion` block ([`app/globals.css`](../app/globals.css:188)) — **must not be removed, weakened or reordered**.
- `useReducedMotion` already consulted on home, category selector, modal ([`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:50), [`components/home/CategorySelector.tsx`](../components/home/CategorySelector.tsx:19), [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:47)).
- Live regions: gameplay `role="status" aria-live="polite"` ([`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:249)), card value `aria-live="polite"` ([`components/game/GameCard.tsx`](../components/game/GameCard.tsx:97)), Time Attack timer `aria-live={isUrgent ? "assertive" : "off"}` ([`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:354)).
- Reduced-motion is honoured *structurally* today (no info is conveyed by motion alone).

### 3.7 Framework constraints (Next.js 16.3.4 / React 19.2.8)

`AGENTS.md` requires consulting the locally installed Next docs before writing code ([`AGENTS.md`](AGENTS.md:5)). Relevant finding for this task:

- App Router ships React canary with React's `<ViewTransition>` from `react`; **route navigations are React transitions**, so `<ViewTransition>` animations activate automatically on navigation with no configuration. Source: `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md:49-61`.
- `setState` alone does **not** trigger `<ViewTransition>` — only Transitions, `<Suspense>`, `useDeferredValue` (`view-transitions.md:61`). Therefore in-round choreography (card reveal, score) must use Motion, not ViewTransition.
- While a transition runs the `::view-transition` overlay captures pointer events; the docs recommend `::view-transition { pointer-events: none; }` and warn to keep transitions short and avoid naming elements users click rapidly (`view-transitions.md:360-370`).
- Reduced-motion guidance for view transitions, including a `prefers-reduced-motion` block that zeroes `::view-transition-*` durations (`view-transitions.md:372-389`).
- Remote image hosts are whitelisted (`next.config.ts`); `GameCard` intentionally uses a native `<img>` ([`components/game/GameCard.tsx`](../components/game/GameCard.tsx:58), [`next.config.ts`](next.config.ts:49)) — motion must not swap it for `next/image` as a side effect.

---

## 4. Reference-site inventory

### 4.0 Tooling actually used (and what was blocked)

| Capability | Status | Detail |
|---|---|---|
| `impeccable context` launcher | **Worked** (2026-11-22 second pass) | `.agents/skills/impeccable/scripts/impeccable.cmd context` ran to exit 0 with cwd at the project root. Directives returned: `NO_PRODUCT_MD` (no PRODUCT.md; incumbent visual implementation exists), `SCOPED_EXISTING_ALLOWED` (a narrow refinement may treat the incumbent implementation as authority without blocking on context setup, but must preserve it and offer `init` afterward), `EXISTING_VISUAL_SYSTEM` (code and assets are incumbent design authority; a missing DESIGN.md is a documentation gap), `MANUAL_DETECTOR_REQUIRED` (no design hook active; run `detect` over the changed UI after implementation, not during concept selection), plus a `CONTEXT_STALE` route-severity finding that no `.codex/hooks.json` design hook is installed. `ACCOUNT: not signed in`. These confirm — rather than contradict — this document's "refinement preserves" framing. No context was invented. |
| `git status` / working-tree diff inspection | **Worked** (2026-11-22 second pass) | Branch `lj-branch`. `git diff --stat` and `git diff --cached --stat` are both empty — **no tracked file has been modified**. Untracked paths are `.agents/`, `docs/` and `skills-lock.json` (pre-existing; this task's only write is this document). Nothing was reverted, absorbed or overwritten. |
| Playwright MCP | **Worked** (2026-11-22 second pass) | Cause was a missing browser revision. `@playwright/mcp@0.0.86` bundles `playwright-core@1.66.0-alpha-2026-11-18`, whose `browsers.json` maps `chromium → 1255`; `mcp-animation-inspector@0.3.0` resolves `playwright-core@1.65.1`, which also maps `chromium → 1255`. Only revision **1237** was installed. Installed revision 1255 via the bundled CLI, then verified `https://example.com` → title `Example Domain` and a full live-DOM navigation on all three reference sites plus the local dev server. |
| animation-inspector MCP | **Worked** (2026-11-22 second pass) | Launches and returns real diagnostics: `discover_animations("https://example.com")` → "No animations detected". On the reference sites its own fresh headless context is **CAPTCHA-blocked** ("Site blocked by CAPTCHA — cannot inspect animations") — recorded as `[Blocked]` for those URLs only. Per-site animation data below was therefore captured through Playwright MCP `page.evaluate` against the live DOM (`document.getAnimations()`, `@keyframes` enumeration, computed `animation-*`/`transition-*`), which is measured runtime data, not inference. |
| design-extract MCP | **Worked** | Three jobs completed (krillion `43e15ee5`, fairways `b0285eb9`, noillirk `449369da`). |
| Chrome DevTools MCP | **Worked** (substitute for Playwright and for the animation inspector's job) | Used for navigation, desktop/mobile emulation, computed-style extraction, `document.getAnimations()` sampling, stylesheet `@keyframes`/`@media` extraction, and interaction exercise on all three sites plus the local dev server. |
| Context7 | **Worked** | Motion docs: transitions/orchestration, `useReducedMotion`, compositor guidance. |
| Exa | **Worked** | Motion docs: transitions/spring semantics, `useScroll`, scroll-triggered vs scroll-linked, tween-vs-spring defaults. |

**Tooling repair evidence (2026-11-22 second pass).** Browser cache `%LOCALAPPDATA%\ms-playwright` now contains `chromium-1255` and `chromium_headless_shell-1255` (plus the pre-existing `-1237` pair). Executable paths verified to exist:

- `C:\Users\Luke\AppData\Local\ms-playwright\chromium-1255\chrome-win64\chrome.exe`
- `C:\Users\Luke\AppData\Local\ms-playwright\chromium_headless_shell-1255\chrome-headless-shell-win64\chrome-headless-shell.exe`

Both report `Google Chrome for Testing 159.0.8154.6`, and both revision directories carry an `INSTALLATION_COMPLETE` marker. The two MCP servers live in npx caches `9833c18b2d85bc59` (`@playwright/mcp@0.0.86`) and `58a1a66a13b7ddf5` (`mcp-animation-inspector@0.3.0`); both resolve a `playwright-core` whose `browsers.json` pins chromium revision 1255, which is why the expected paths named 1255.

Per-site motion data below is measured runtime data from the live DOM via Playwright MCP (Chromium 1255). Durations, easings, delays and iteration counts are reported as measured, not inferred. Where the animation-inspector's own context was CAPTCHA-blocked, the Playwright DOM reading is stated as the evidence source rather than implying inspector coverage.

### 4.1 krillion.io — "the daily dive"

**Structure.** A single-viewport game screen, not a scrolling site: document height 895 px at 893–895 px viewport; no scroll container; two full-bleed `<canvas>` layers (`ds-sea`, `ds-fore`) filling the stage plus a text layer of depth-zone labels. Content: `KRILLION / THE DAILY DIVE`, rule line `7 prompts · 25 seconds each · rarer answers sink deeper`, a DEPTH meter (`0m SURFACE`), `SCORE 0`, `HOW TO PLAY`, live count (`5,302 playing`), primary CTA `▼ BEGIN DESCENT ▼`, secondary row `DIVE #130 / ARCHIVE ⟲ / THEMED PACKS / UNLIMITED ∞`.

**Framework / typography / palette.** Next.js (Turbopack chunks under `/_next/static/chunks/`), VT323 only, `body 16–17 px`, `h2 34 px`. No GSAP/Lenis/THREE/Framer markers; motion is **CSS keyframes plus canvas**, with no third-party animation runtime. design-extract: primary `#4de3ff`, 14 colors, spacing base 2 px, radii 5/8/15 px, accessibility score 100.

**Signature motion (measured).**

| Motion | Measured properties |
|---|---|
| `ds-title-flicker` on `.ds-title` | `5 s`, `steps(1)`, infinite — CRT flicker at 93–95 % of the timeline |
| `ds-bob-l` ambient layers | `3.2 s`, `ease-in-out`, infinite, 9 instances — slow vertical drift |
| `ds-swim` | `2.6 s`, `cubic-bezier(0.65, 0, 0.35, 1)`, infinite |
| `ds-btn-bob` on `.ds-begin-btn` | `1.9 s`, `cubic-bezier(0.65, 0, 0.35, 1)`, infinite, ±5 px |
| Nav/button/links | `transition: transform 0.1s steps(2)` — deliberately stepped, not smooth |
| Ambient depth layers `.ds-amb` | `opacity 0.6 s ease-out` |
| `ds-score-slam` | `scale(1) → scale(1.4) rotate(-2deg)` at 35 % with gold glow, then back |
| `ds-card-in` | `opacity 0 → 1`, `translateY(46px) scale(0.92)` |
| `ds-card-gone` | `opacity → 0`, `blur(2px)`, `translateY(-28px) scale(0.9)` |
| `ds-shake` | decaying `translate` + `rotate(-0.6deg → -0.1deg)` over 5 steps |
| `ds-reject-jolt` | `−8 → +7 → −4 → +2 px` decelerating jolt |
| `ds-gold-pulse` | box-shadow ring/glow ping-pong |
| `ds-dot-pulse`, `ds-icon-bob`, `ds-crank-jolt`, `ds-boot-bob` | short idle loops, 1.9–3.2 s class |

**Accessibility.** Five `prefers-reduced-motion` blocks neutralise panel transitions, settings thumbs, key controls, history-modal animations and archive calendar transitions.

**Re-measurement (Playwright MCP, Chromium 1255, 1440×900, 2026-11-22 second pass).** Single-viewport confirmed: `document.documentElement.scrollHeight === 900` at a 900 px viewport, and **844** at 390×844 with no horizontal overflow. `document.getAnimations()` at rest returns **11** running animations: `ds-title-flicker` 5000 ms `steps(1)` ∞ on `.ds-title`; `ds-bob-l` 3200 ms ∞ on **8** spans with `ease-in-out` and delays 0 → 1260 ms in 180 ms steps (the earlier note said 9 instances — the live node count is 8); `ds-swim` 2600 ms `cubic-bezier(0.65,0,0.35,1)` ∞; `ds-btn-bob` 1900 ms `cubic-bezier(0.65,0,0.35,1)` ∞ on `.ds-begin-btn`. **49** `@keyframes` are defined across the loaded sheets. Interaction transitions measured on live elements: `transform 0.1s steps(2)` on 10 nav/menu buttons (the stepped feel is confirmed as a deliberate pattern, not a one-off), and `.ds-begin-btn` uses `transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s cubic-bezier(0.22,1,0.36,1)` — an overshoot transform paired with a softer shadow. View-transition usage: `document.startViewTransition` exists, exactly **one** element carries a `view-transition-name` and it is the default `root` (no custom `::view-transition-*` rules, no per-element naming). **Reduced-motion block count differs from the earlier pass:** the runtime count across loaded stylesheets is **9**, not 5. The higher number is the measured value; the set of neutralised targets described above is unchanged. Screenshots: [`krillion-desktop-1440.png`](assets/immersive-motion/krillion-desktop-1440.png), [`krillion-mobile-390.png`](assets/immersive-motion/krillion-mobile-390.png).

**Why it feels immersive (principle).** A single scene owns the whole viewport; motion is *environmental* (water drift, CRT flicker) at very low amplitude and long durations, while *event* feedback (score slam, jolt, card in/out) is short, stepped and high-contrast. Nothing waits for the user; the world is alive at rest.

**Copyable as principle:** ambient low-amplitude loops behind static UI; stepped easing for retro/pixel feedback; slam/jolt for scoring; card enter/exit pairs; per-element state-neutralising reduced-motion rules.

**Must NOT copy:** the underwater dive fiction and depth-zone copy, the two full-screen canvas scenes, VT323-only typography, CRT flicker on primary text, and the single-screen "game owns the viewport" structure (out of scope: no layout overhaul).

### 4.2 noillirk.com — "Crowdict" / The Daily Dive

**Structure.** A long-form page: 12,304 px document at 1920×895, with a viewport-fitted game panel (`#play .home-game`, 895 px) followed by 11 explainer sections of ~1176 px each (`#browser-play`, `#how-to-play`, `#rare-answers`, `#scoring`, `#win-the-crowd`, `#rarer-answers`, `#modes`, `#share-challenge`, `#faq`, `.hr-last`). Two canvases. Same family as krillion (cross-link `Krillion ↗`) but a different game: crowd-answer guessing with stages (`Sky Climb`, `Tabletop`, `Frozen Peak`, `Haunted Manor`).

**Typography / palette.** DM Sans for UI, a dedicated `Climb Digits` face, Times fallback present; body colour `rgb(244,235,215)` (cream); design-extract primary `#ffd34d`, 24 colors, accessibility 100.

**Signature motion (measured).**

| Motion | Measured properties |
|---|---|
| `hr-walk` on three `.hr-walker` elements | `1.4 s`, infinite, staggered `0 / 350 ms / 700 ms` — a queue of mascots walking |
| `hr-bob` on `.hr-hero` | `2.4 s`, infinite |
| `hr-hop` (press feedback) | `0.5 s` once, `translateY(-14px)` at 30 %, via `animation: hr-hop .5s var(--ease-out)` on the pressed option |
| `hr-pop` (pill/bar entrance) | `340 ms` once, `fill: both`, `scaleY(0) → 1`, staggered in `40 ms` increments across items |
| `hr-caret` | `1 s` blink |
| `og-bump` | `0.3 s ease`, `scale(1.35)` at 40 % on count change |
| `og-digit-in` | `0.28 s var(--ease-out)`, `translateY(0.35em)` + fade per digit |
| `og-sheet-in` | `0.5 s var(--ease-drawer)` from `translateY(100%)` (bottom sheet) |
| `og-toast` | `2.2 s ease`, `both` — fade in at 10 %, hold to 85 %, out |
| `climb-result` | `0.2 s steps(4)` — stepped result pop |
| `climb-burst` / `-again` | `0.64 s steps(6)` (second wave `+0.12 s delay`), box-shadow particle burst to 44 px |
| `climb-clock.is-warn` | `0.8 s ease-in-out infinite` `scale(1.1)` pulse |
| `climb-crowd-bars li` | `0.36 s cubic-bezier(0.2, 0.8, 0.2, 1)`, `fill: both`, `scaleY` growth from bottom |
| `climb-crowd-you` | `0.24 s ease-out 0.56 s both` — the label lands *after* the bars |
| `climb-banner` | `4.5 s linear both` with a hold window (8 %–89 %) |
| Section demos | `transform 0.35 s cubic-bezier(0.22, 1, 0.36, 1)` on `.hr-people` |
| `swipe-out-left/right/up/down` | directional dismissal driven by `--swipe-amount-*` custom properties |

**Accessibility.** 17 `prefers-reduced-motion` blocks. Notably also a **user-controlled** motion setting: `:root[data-motion="full"|"reduce"]` gates `climb-clock`, `climb-result`, `climb-burst`, bottom-sheet and toast animations (`:where(:root[data-motion="reduce"]) …`).

**Re-measurement (Playwright MCP, Chromium 1255, 1440×900, 2026-11-22 second pass).** Document height **12,309 px** (earlier pass: 12,304 — trivial variance). **17** reduced-motion blocks confirmed at runtime, and the user-controlled setting is verified live: `document.documentElement.getAttribute('data-motion') === "full"` on load, i.e. the app ships a real `data-motion` state rather than only a media query. **34** keyframes registered. Measured at rest: `hr-caret` 1000 ms ∞, `hr-walk` 1400 ms ∞ on 3 `.hr-walker` images with delays **0 / 350 / 700 ms**, `hr-bob` 2400 ms ∞ on `.hr-hero`, plus 8 completed `hr-pop` runs at 340 ms with 40 ms stagger. Two easing values are more specific than the earlier note: `hr-pop` computes to `cubic-bezier(0.2, 1.25, 0.3, 1)` (an overshoot, not a plain `ease-out` variable) and `hr-walk`/`hr-bob`/`hr-hop` share `cubic-bezier(0.22, 1, 0.36, 1)`. Screenshots: [`noillirk-desktop-1440.png`](assets/immersive-motion/noillirk-desktop-1440.png), [`noillirk-mobile-390.png`](assets/immersive-motion/noillirk-mobile-390.png).

**Scroll behaviour (measured, negative result).** Scrolling `#rare-answers` into view produced **no** entrance transforms — elements were already at final transform. Immersion here comes from illustration density and micro-interaction, not scroll reveals.

**Mobile (390×844).** Game panel 390×886, document 16,801 px, no horizontal overflow; sections grow 1176 → 1570 px; suggestion chips become 103×46 buttons; primary CTA 358×64.

**Re-measurement (2026-11-22 second pass).** Panel height **886 px** and no horizontal overflow both hold. Document height measured **17,468 px** rather than 16,801 — the page is taller than recorded in the first pass, most plausibly because daily content/leaderboard rows differ between the two visits; recorded as measured rather than reconciled.

**Copyable as principle:** staggered list entrance (40 ms × 340 ms); result pop as a stepped scale; particle/burst confirmation reserved for "good" outcomes; bar-grow followed by label-land (sequenced); numeric digit roll for counters; urgent-state pulse tied to a real state change; a bottom-sheet/panel slide-in for modals; directional swipe-out for content being replaced.

**Must NOT copy:** the mascot/character art, the stage/course metaphor, the paper-cream palette and DM Sans, the 12k-px marketing page structure, and its specific stage names.

### 4.3 fairways.world — "Fairway / The Daily Five"

**Structure.** Single-viewport game landing: 895 px document, three canvases (`#gl` WebGL at 480×224 internal, `#mini` course minimap 116×260, `#lockCv` locker preview), `THREE` present (`typeof window.THREE === "object"`). Text: `FAIRWAY`, `THE DAILY FIVE`, `HOW TO PLAY`, `NEW MODE · LIVE NOW / MULTIPLAYER`, `Create or join a race ▸`, `TEE OFF ▸`, `FREE PLAY ∞`, nav `How to play / Strategy / Rarity / Courses / Locker / FAQ / About / Privacy`. Sections: `title`, `chat`, `holedone`, `sheet ×3`.

**Typography / palette.** `Silkscreen` display (h1 `120 px`, weight 700, `+7.2 px` tracking, `108 px` line-height), `Space Mono` for mono/body (44 instances — **same family as HigherLower**), `Pixelify Sans` for prompts, `VT323` for digits. 15 fluid `clamp()` rules (`.logo clamp(46px, 11vw, 120px)`, `.st-tier clamp(34px, 9vw, 86px)`), ratio 1.067. design-extract primary `#ff5a4e`, 14 colors, accessibility 100. Tier tokens: `--t1 #3fd6c3`, `--t2 #6f9bff`, `--t3 #ffc93c`, `--t4 #ff5d7a`; `--good #7be08f`, `--bad #ff8a7e`.

**Signature motion — the tiered result system (measured).**

| Tier | Composition |
|---|---|
| `t0` | `thud 0.55 s cubic-bezier(0.5, 0, 0.75, 0) both` — heavy drop from `translateY(-50px)` with a 5 px overshoot at 70 % |
| `t1` | `popin 0.45 s cubic-bezier(0.3, 1.7, 0.5, 1) both` — overshoot spring-in from `scale(0.2)` |
| `t2` | `zoomin 0.45 s ease-out both` — from `scale(2.6)` |
| `t3` | `popin 0.45 s …` **plus** `glint 0.3 s steps(2) 0.5 s ×6` |
| `t4` | `slam 0.55 s cubic-bezier(0.2, 1.8, 0.4, 1) both` **plus** `jolt 0.4 s steps(4) 0.55 s ×2` |
| Secondary line | `.st-sub, .st-line`: `rise 0.35 s ease-out 0.25 s both` — consequence text trails the stamp by 250 ms |

**Other measured motion.** Hero stagger `rise 0.6 s` at `+0.15 s` (subtitle), `+0.3 s` (line), `+0.45 s` (CTA stack). `.bar` height `0.3 s steps(5)`. `.clock .arc` `stroke-dashoffset 0.1 s linear`. `.dock` `opacity 0.25 s`; during a shot `.mini`, `.gauge`, `.side` fade to 0 over `0.25 s` (focus mode). `#gl` canvas fades in over `0.35 s`. `.soon::after` shimmer sweep `5 s`. Nav/chevron glyphs `transform 0.15 s`.

**Gameplay layout (measured after TEE OFF).** Play card 600×189 top-centre, dock 640×63 bottom-centre containing a 56 px ring clock and a single 119×63 `SWING` button, left club gauge 90×226, right minimap 116×260. One dominant action per state.

**Accessibility.** `prefers-reduced-motion` blocks disable `#gl` transition, all `.stamp/.banner/.title/.soon` animations, race-live pulses, trophies and chat toasts.

**Re-measurement (Playwright MCP, Chromium 1255, 1440×900, 2026-11-22 second pass).** The tier system is confirmed verbatim from live CSS: `.stamp.t0 .st-tier` → `thud 0.55s cubic-bezier(0.5,0,0.75,0) both`; `t1` → `popin 0.45s cubic-bezier(0.3,1.7,0.5,1) both`; `t2` → `zoomin 0.45s ease-out both`; `t3` → the same `popin` **plus** `glint 0.3s steps(2) 0.5s ×6`; `t4` → `slam 0.55s cubic-bezier(0.2,1.8,0.4,1) both` **plus** `jolt 0.4s steps(4) 0.55s ×2`. New detail: `.stamp.t4 .st-tier i` carries **two additional infinite loops** (`0.9s steps(5)` and `0.8s ease-in-out`), so the top tier is the only one with sustained secondary motion. `.stamp .st-sub, .stamp .st-line` → `rise 0.35s ease-out 0.25s both`, confirming the 250 ms consequence-text trail. Also confirmed: `.bar` `height 0.3s steps(5)`; `.clock .arc` `stroke-dashoffset 0.1s linear`; `.dock` `opacity 0.25s` with `.app.shooting .dock { opacity: 0.35 }` (the chrome-dim focus mode); `.soon::after` shimmer `soon-shine 5s steps(20) 1.2s infinite`; and a reduced-motion rule that hard-zeroes `.stamp *, .banner span, .title *, .soon, .soon *` and sets `.soon::after { display: none }`. At rest the page runs **6** animations: `rise` 0.6 s `ease-out` staggered 0/150/300/450 ms (hero), `rise` 0.35 s at +250 ms (secondary line), `soon-blink` 1.2 s `steps(2)` ∞, `chat-pop` 0.2 s `steps(4)`, `popin` 0.45 s `steps(5)`, `race-prize` 0.7 s `steps(8)`. **5** reduced-motion blocks. Canvas internal sizes measured `gl 480×300`, `mini 96×220`, `lockCv 84×112` (the earlier note recorded 480×224 and 116×260 — the buffers scale with device pixel ratio, so these are environment-dependent, not a design change). `typeof window.THREE === "object"` confirmed.

**Availability caveat `[environment-specific]`.** On the first navigation in this pass, `https://fairways.world/` performed a **top-level redirect** to an unrelated ad landing page (`velvetcairns.com`, title "Download Ad Block Ghost"); the single browser tab left the game entirely. A second navigation served the real game correctly and all measurements above come from that load. Whether this is an intermittent ad interstitial or domain-level behavior is `Needs Verification [environment-specific]`; nothing was clicked on the redirect target. Screenshots: [`fairways-desktop-1440.png`](assets/immersive-motion/fairways-desktop-1440.png), [`fairways-mobile-390.png`](assets/immersive-motion/fairways-mobile-390.png).

**Copyable as principle:** *intensity scales with outcome quality*; primary feedback first, explanatory text second; one dominant action per state; chrome dims during the decisive beat; fluid `clamp()` type so motion distances scale with the surface; `Space Mono` already in the incumbent identity.

**Must NOT copy:** golf/course fiction, WebGL scene, Silkscreen/Pixelify typefaces, and the bright pink/green palette.

### 4.4 What the three sites share (the transferable core)

1. Motion is **event-driven and short** (0.1–0.65 s) for feedback, and **slow and low-amplitude** (1.9–5 s) for ambience.
2. **Stepped easing (`steps()`) is used deliberately** as a period-correct, "handmade" feel — not as a performance hack.
3. Feedback is **sequenced**: primary stamp → secondary explanation; bars grow → label lands.
4. **Intensity is proportional to outcome** (fairway's five tiers; noillirk's pop-only vs burst).
5. **One dominant action** per state, with the rest of the chrome de-emphasised.
6. All three ship **explicit reduced-motion neutralisation**, and two of three expose a **user-controlled** motion preference in addition to the media query.
7. **None of the three depends on a bespoke route-transition system.** krillion exposes only the default `root` view-transition name with no custom `::view-transition-*` rules; noillirk and fairways are single-viewport-first and rely on in-page state swaps. The "immersive" impression comes from in-page motion, not from page transitions.

### 4.5 Local app runtime verification

Executed against the already-running dev server (`http://localhost:3000`, HTTP 200, PID 17272) with Playwright MCP on Chromium 1255, 2026-11-22. Read-only: no application file was touched. Screenshots are stored under `docs/assets/immersive-motion/` and referenced inline above and below.

| Surface | Desktop 1440×900 | Mobile 390×844 | Animations at rest |
|---|---|---|---|
| Home | 2242 px doc, `h1` 152 px / −13.68 px | 2489 px doc, `h1` 56 px, no overflow | **0** |
| Classic gameplay | 900 px doc (single viewport) | 1252 px doc, 0 overflow | **0** |
| Time Attack gameplay | — | 1300 px doc | **1** (`width` 1 s linear — timer bar only) |

**Measured transitions (not inferred):**

| Event | What actually animates | Measured |
|---|---|---|
| Decision button hover | `translate` | settles to `0px -4px`; `5px 5px 0` offset ring; 0 animations once settled |
| Decision button press | `translate` | 150 ms `cubic-bezier(0.4, 0, 0.2, 1)` |
| Correct/incorrect reveal | `opacity` on the `role="status"` overlay | 150 ms `cubic-bezier(0.4, 0, 0.2, 1)` |
| Card tint / border / value on reveal | **nothing** | instant; no `animation-name`, no transition captured |
| Time Attack timer bar | `width` | 1 s `linear`, continuous |
| Time Attack urgency at 6 s remaining | colour only | text flips to `rgb(240, 90, 199)` (`--status-error`), `aria-live` becomes `assertive`, **`.timer-urgent` class absent**, **0 keyframes** applied |
| Game-over panel entrance | **nothing** | `animation-name: none`, `transition: all 0s`, `opacity 1`, `transform none` |
| Route Home → gameplay | **nothing bespoke** | no `view-transition-name` on any app element |

**Reduced-motion behaviour (empirically emulated, `prefers-reduced-motion: reduce`):** media query matches, **0** concurrent animations, hero `h1` arrives at its final state immediately (`opacity 1`, identity transform), and **0** elements retain a non-zero effective `animation-duration`. The project therefore currently implements the **hard-strip** strategy (everything collapses to `0.01 ms` via [`app/globals.css`](../app/globals.css:188)), not "keep opacity, drop movement".

**Console:** 0 errors and 0 warnings on the local app across the whole session (only 2 informational messages).

**Prior claims confirmed:** zero animations at rest on home and gameplay; 150 ms status-text fade as the only reveal animation; no card/tint animation; `timer-urgent` keyframe existing but unused; game-over panel with no entrance; decision controls below the fold on mobile; `0.15 s cubic-bezier(0.4,0,0.2,1)` on decision buttons.

**Prior claims corrected or refined:** mobile gameplay height is 1252 px (not 1262) with controls 256/322 px below the fold (not 266/332) — consistent −10 px offset; Time Attack adds one continuous `width` transition that was previously described qualitatively; krillion runs 8 `ds-bob-l` instances (not 9) and exposes 9 reduced-motion blocks (not 5); noillirk's `hr-pop` easing is the overshoot `cubic-bezier(0.2, 1.25, 0.3, 1)`; fairways `.stamp.t4` carries two extra infinite loops; krillion does use a (default-only) view transition.

**Not verified:** perceptual/UX acceptance of any motion — no human review was performed. Frame-by-frame keyframe interpolation (per-percent offsets) was not captured for the reference sites, because the animation-inspector's independent context is CAPTCHA-blocked there; `@keyframes` names, durations, delays, easings, iteration counts and live running instances were measured instead.

### 4.6 Do the six product decisions change based on this inspection data?

Answering each with evidence. None of these is decided here — they remain owner calls.

| # | Decision | Changed by new evidence? | Evidence |
|---|---|---|---|
| 1 | Route-level `ViewTransition` (principle 10) | **No — decision unchanged; risk profile softened.** | krillion, the most produced reference, ships only the default `root` view-transition name with zero custom `::view-transition-*` rules, and noillirk/fairways use none. This lowers the "novel, bespoke navigation choreography" framing — a short default cross-fade is what a reference actually does — but it does not decide whether Higher/Lower wants one. Still `Needs Verification [product-decision]`. |
| 2 | Intensity ceiling (correct always vs streaks only) | **No — reinforced, not changed.** | fairways' measured tier ladder `t0 thud → t4 slam+jolt` is intact and `t4` alone adds two infinite secondary loops. The reference does tier intensity, exactly as previously analysed. Which tier Higher/Lower adopts is still a feel call. |
| 3 | Ambient motion budget | **No — the reference does not justify a high budget for us.** | krillion runs **11** infinite animations at rest inside a single viewport; Higher/Lower runs **0** on home and **0** on gameplay. Both facts were already known. The prior proposal (max two, sub-8 px, ≥2 s, none on gameplay) is neither confirmed nor refuted. |
| 4 | `prefers-reduced-motion` fidelity (strip all vs keep opacity crossfades) | **No — but it now has a measured baseline.** | Today reduced motion is a hard strip: 0 animations, instant final state, 0 non-zero durations. Preserving opacity crossfades would therefore be **net-new work and a behaviour change**, not preservation of status quo. That sharpens the cost side of the decision without making it. |
| 5 | Game-over panel entrance (in-place fade vs heavier drop) | **No — gap confirmed, choice still open.** | Measured `animation-name: none`, `transition: all 0s` on the reached game-over panel ("Time's up", 0 Correct). The absence is real; whether to add a fairway-`t0`-style drop or a restrained fade remains a product/punish-feel call. |
| 6 | Mobile below-the-fold decision controls | **No — confirmed and slightly re-quantified.** | 390×844 puts Higher at y=1100 (256 px below fold) and Lower at y=1166 (322 px below fold), doc 1252 px, no horizontal overflow. Any auto-reveal or nudge remains a layout change and therefore still out of scope without approval. |

---

## 5. Synthesis — candidate motion principles mapped to Higher/Lower surfaces

Each row: principle → Higher/Lower surface → trigger → purpose → risk.

| # | Principle | Surface | Trigger | Purpose | Risk / guardrail |
|---|---|---|---|---|---|
| 1 | **Stepped micro-feedback** — `steps(2–4)` at 100–200 ms on press/tint, matching the offset-shadow identity | `DecisionControls` Higher/Lower press; `GameCard` result border | pointer down / guess commit | Make the decision feel physical and immediate inside an already-stepped visual language | Must not delay commit; apply to visual layer only, never to the guess handler |
| 2 | **Outcome-intensity tiers** — correct = subtle scale/offset snap; wrong = decay jolt; streak ≥ 3 = accent glow/burst; game-over = heavy drop | `GameCard` + `GameplayStatus` + game-over panel | reveal phase | Reward skill without punishing speed; gives 1 streak read a "good run" moment | No new gameplay state; derive tier from existing `score`/`lastCorrect` only; no burst on every correct (fatigue) |
| 3 | **Sequenced reveal** — card/plate reacts first, numeric value lands second (~150–250 ms later) | `GameCard` (value block, [`components/game/GameCard.tsx`](../components/game/GameCard.tsx:97)) | `revealed` flips true | Directs the eye: "what happened" then "how much" | Must finish inside the 1500 ms Classic / 800 ms Time Attack windows |
| 4 | **Card enter/exit pair** — outgoing card leaves along the compare axis (up/down), incoming card settles in | `ComparisonBoard` / `GameCard` keyed remount | deck advance | Communicates that the "next" card became the "current" card — spatial continuity for the core loop | Must not animate layout height (causes reflow of decision controls); use transform/opacity only; must not run on wrong-answer game-over |
| 5 | **Staggered list entrance** — 30–40 ms per item, ≤ 400 ms total | `CategorySelector` list, `ModeButton` grid, High Scores rows | domain/category change, modal open | Turns flat lists into a readable cascade; reinforces "this set changed" | Cap item count; skip on repeat renders; `CategorySelector` already animates height — coordinate, do not double-animate |
| 6 | **Ambient idle breathing** — one or two long loops (2–6 s), ±4–8 px or ±2–3 % opacity | Hero wordmark offset layers; OR badge; grid accent | page idle (not gameplay input) | The surface feels alive while the player thinks | Hard cap on loop count; must not run during reveal windows; must be disabled under reduced motion; no CPU-heavy filters |
| 7 | **State-bound urgency pulse** — pulse only when a real state threshold is crossed | Time Attack timer when `displayTime ≤ 10` ([`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:332)) | timer crossing threshold | Makes the existing colour change legible at a glance | Keyframe `.timer-urgent` already exists but is unused; adding it must not shift layout (transform only); must respect `aria-live` behaviour already set at `:354` |
| 8 | **Delta label continuity** — the `+3s / −5s` label rides the timer, not a detached corner | Time Attack header footer ([`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:359)) | correct/wrong guess | Connects cause (answer) with effect (time) | Existing `.float-up` is 900 ms while the wrong-answer advance is 400 ms — retiming needed but must not change the 400 ms gameplay delay |
| 9 | **Focus mode during the decisive beat** — dim/chill non-essential chrome (back control, subtitle, secondary status) for ~250 ms | `GameplayShell` header | reveal window | Directs attention to the comparison; reads as "the game is thinking with you" | Must not hide the score or the timer; must not obscure focus rings; must not fight `aria-live` |
| 10 | **Route-level continuity** — Home → gameplay as a React `<ViewTransition>`, e.g. the selected mode label morphing into the header title, or a short directional slide | `HomeSetup` → `app/game/[mode]/page.tsx` | "go!" / mode start navigation ([`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:118)) | Makes starting a run feel like entering the board rather than a page swap | Next docs warn the overlay swallows pointer events and that named participants skip hit-testing (`view-transitions.md:360-370`) — keep it short (< 400 ms), name nothing the user clicks, and add the reduced-motion block from `view-transitions.md:378-386` |
| 11 | **Selection physics** — radio/option select gets a snap (offset shadow pops out then settles) instead of a colour swap | `DomainSelector`, `CategoryCard`, `ModeButton` | option select | Selection is the home screen's main verb; today it is a 150 ms colour/translate change | Reuse `useReducedMotion`; do not animate the `sr-only` input; keep `focus-visible` outlines intact |
| 12 | **Modal/panel choreography** — tighten and unify the existing 200 ms dialog in/out, and give the game-over panel the same language | `HighScoresModal`, game-over panels | open/close, game-over | Consistency: two modal systems should not behave differently | `HighScoresModal` already has asymmetric open/close + reduced-motion handling — extend, do not rewrite; game-over is inside the gameplay flex column (fade/scale, not slide from off-canvas) |
| 13 | **Numeric counter motion** — score/best digits bump on change (`scale` ~1.35, ~300 ms) and settle | `GameplayStatus` | score/high-score change | Makes the score read as earned rather than printed | Must not animate the timer digits on every tick (1 s cadence would jitter); transform-only |

**Selection note for the Design stage.** The strongest, lowest-risk cluster is **#1, #2, #3, #4, #7 and #11** — all inside existing components, all transform/opacity, all bounded by existing reveal windows. **#10** is the highest-impact/ highest-risk item and should be explicitly accepted or rejected by the owner before Design proceeds, because it touches routes and a framework feature the project has not used yet.

---

## 6. Accessibility constraints

1. **Reduced motion is a hard requirement, not a polish item.** The global block at [`app/globals.css`](../app/globals.css:188) must remain and must keep covering new work. New motion should additionally gate per-element with `useReducedMotion` (already the project pattern: [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:50), [`components/home/CategorySelector.tsx`](../components/home/CategorySelector.tsx:19)) so it degrades to an opacity change rather than a jump — the approach Motion documents at `motion.dev/docs/react-accessibility`.
2. **Prefer transform and opacity.** Motion's docs state `<motion />` animates transform/opacity on the compositor and recommends against animating `width`/`top` (`motion.dev/docs/react-motion-component`). `CategorySelector`'s existing height animation is the single acknowledged exception ([`components/home/CategorySelector.tsx`](../components/home/CategorySelector.tsx:65)) — do not add more layout animations.
3. **No information may be carried by motion alone.** Correct/incorrect must remain encoded by colour, border and the polite live region ([`components/game/GameCard.tsx`](../components/game/GameCard.tsx:76), [`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:249)).
4. **Focus visibility must survive.** Do not animate `outline` away, and do not trap focus behind an animated overlay. Focus management already exists for game-over and the modal ([`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:111), [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:80)).
5. **No timing changes** to Classic (1500 ms), Time Attack (800/400 ms), the 1000 ms tick, or the 460 ms shake window. Motion must fit inside these budgets or be trimmed.
6. **Keyboard parity.** `ArrowUp/h` and `ArrowDown/l` must trigger the same visual feedback as pointer input ([`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:203)).
7. **No motion-only streak/urgency signalling.** If a streak tier changes colour/shape temporarily, the steady state and the live region must still convey it.
8. **View-transition specifics, if approved:** add `::view-transition { pointer-events: none; }` and a `prefers-reduced-motion` block zeroing `::view-transition-*` durations, per `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md:360-389`.
9. **User-controlled motion preference** (optional, recommended): two reference sites expose an explicit setting beyond the OS media query (`.climb-clock` gating via `:root[data-motion]`). This is a product decision, not a technical one — recorded as `Needs Verification [product-decision]`.

---

## 7. Proposed file allowlist for Design / Plan / Code

### Tier A — expected to change (each justified by the analysis above)

| File | Why it is needed |
|---|---|
| [`app/globals.css`](../app/globals.css:1) | Motion tokens (durations/easings), any new keyframes, view-transition CSS if approved. Must preserve the reduced-motion block at `:188` and existing tokens. |
| [`components/game/GameCard.tsx`](../components/game/GameCard.tsx:1) | Card reveal, plate/tint choreography, value-land sequencing (principles 2, 3). |
| [`components/game/ComparisonBoard.tsx`](../components/game/ComparisonBoard.tsx:1) | Choreography container for the two cards + OR badge (principles 4, 6). |
| [`components/game/DecisionControls.tsx`](../components/game/DecisionControls.tsx:1) | Press/hover feedback (principle 1). |
| [`components/game/GameplayStatus.tsx`](../components/game/GameplayStatus.tsx:1) | Score/best counter motion (principle 13). |
| [`components/game/ClassicGame.tsx`](../components/game/ClassicGame.tsx:1) | Wire existing phase/tint state into motion; game-over panel enter (principles 2, 12). No rule/timing edits. |
| [`components/game/TimeAttackGame.tsx`](../components/game/TimeAttackGame.tsx:1) | Urgency pulse, delta-label continuity, reveal choreography (principles 7, 8). No rule/timing edits. |
| [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx:1) | Optional header/focus-mode treatment (principle 9). |
| [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:1) | Hero ambience, Go CTA, mode-section entrance (principles 6, 11). |
| [`components/home/CategorySelector.tsx`](../components/home/CategorySelector.tsx:1) | Staggered list entrance; coordinate with existing height animation (principle 5). |
| [`components/home/DomainSelector.tsx`](../components/home/DomainSelector.tsx:1) | Selection physics (principle 11). |
| [`components/CategoryCard.tsx`](../components/CategoryCard.tsx:1) | Selection physics for a category row (principle 11). |
| [`components/ModeButton.tsx`](../components/ModeButton.tsx:1) | Selection physics for a mode (principle 11). |
| [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:1) | Unify modal choreography with the rest (principle 12); keep existing reduced-motion paths. |

### Tier B — suspected but not yet justified (flag before touching)

| File | Why it is suspected | Why it is not yet justified |
|---|---|---|
| [`app/game/[mode]/page.tsx`](../app/game/[mode]/page.tsx:1), [`app/game/classic/page.tsx`](../app/game/classic/page.tsx:1), [`app/game/time-attack/page.tsx`](../app/game/time-attack/page.tsx:1) | Only needed if route-level `<ViewTransition>` is approved (principle 10). | Owner decision on view transitions is open; these are server dispatchers with authorization logic that must not be disturbed. |
| [`app/layout.tsx`](../app/layout.tsx:1) | Only if a view-transition name or a global motion provider is needed. | Root layout currently holds only fonts/metadata/background classes. |
| [`components/game/DerivedGameState.tsx`](../components/game/DerivedGameState.tsx:1) | Loading/error states could gain a calmer entrance. | Not requested; not required for "make play more engaging". |
| [`components/game/GameplayDivider.tsx`](../components/game/GameplayDivider.tsx:1) | Could host a subtle draw-in. | Decorative only; low value; risk of noise. |

### Must-not-touch (for the record)

`lib/game/deck.ts`, `lib/api/**`, `lib/catalog/**`, `lib/highScores/**`, `types/**`, `scripts/**`, `app/api/**`, `next.config.ts`, `components.json`. Gameplay logic, data, persistence and framework config are outside this task.

### Allowlist status after runtime verification

The second-pass evidence **does not add any file** to this allowlist. Every measured gap — no card reveal animation, no tint/value transition, unused `timer-urgent`, a motionless game-over panel — resolves inside components already listed in Tier A. Tier B stays unjustified: krillion's default-only `root` view transition is evidence that route-level `<ViewTransition>` is *optional*, not required, so [`app/game/[mode]/page.tsx`](../app/game/[mode]/page.tsx:1) and [`app/layout.tsx`](../app/layout.tsx:1) remain frozen unless the owner approves principle 10. One clarification, not an expansion: [`components/game/GameplayStatus.tsx`](../components/game/GameplayStatus.tsx:1) is in Tier A on the score-counter requirement (principle 13); gameplay did read 0 animations at rest, so its inclusion does not rest on an observed motion defect.

---

## 8. Open questions / `Needs Verification`

1. `Needs Verification [product-decision]` — **Route-level motion.** Is a Home → gameplay transition (React `<ViewTransition>`, principle 10) wanted? It is the single highest-impact item and the only one that touches routes and a framework feature unused so far ("no layout overhaul" does not forbid it, but it changes navigation feel).
2. `Needs Verification [product-decision]` — **Motion intensity ceiling.** Should correct answers always give feedback, or only streaks/high-value outcomes? All three references tier intensity; choosing "subtle everywhere" vs "escalating on streaks" is a feel decision the owner must make.
3. `Needs Verification [product-decision]` — **User-facing motion setting.** Should a persistent "reduce motion" toggle be added (as noillirk does via `data-motion`), or is OS-level `prefers-reduced-motion` sufficient?
4. `Needs Verification [product-decision]` — **Ambient motion budget.** How many continuously-animating elements are acceptable on the home screen? Proposal for Design: maximum two, both sub-8 px and ≥ 2 s, and none on gameplay.
5. **RESOLVED (2026-11-22 second pass)** — Working tree state verified: branch `lj-branch`; `git diff --stat` empty; `git diff --cached --stat` empty; **no tracked file modified**. Untracked paths: `.agents/`, `docs/`, `skills-lock.json`. The next stage should still re-check before editing, but there is no hidden uncommitted application work.
6. **RESOLVED (2026-11-22 second pass)** — Both browser-dependent MCPs work. Chromium revision 1255 and `chromium-headless-shell` 1255 are installed at `%LOCALAPPDATA%\ms-playwright\chromium-1255\chrome-win64\chrome.exe` and `...\chromium_headless_shell-1255\chrome-headless-shell-win64\chrome-headless-shell.exe` (both Chrome for Testing 159.0.8154.6, both with `INSTALLATION_COMPLETE` markers). Playwright MCP and animation-inspector MCP both launch and return real results; see §4.0. One residual limitation remains: the animation-inspector's own headless context is CAPTCHA-blocked on the reference sites, so per-site motion data was measured through Playwright DOM reads instead.
7. `Needs Verification [product-decision]` — **Mobile scroll-to-act.** Re-measured 2026-11-22: at 390×844 the decision controls sit at y=1100 and y=1166 (256 px and 322 px below the fold) in a 1252 px document. The below-fold fact is now confirmed measurement, not inference; whether it is intended, and whether motion should include any nudge/auto-reveal, remains a product call. Fixing it would be a layout change and is out of scope unless approved.
8. `Needs Verification [inferred-from-codebase]` — **Unused motion utilities.** `pulse-ring`, `shimmer`, `orb`, `float-up`-adjacent helpers, `timer-urgent`, `glass-hover` exist but are unused. Design should decide reuse-vs-ignore explicitly rather than leaving two parallel motion vocabularies. `timer-urgent` in particular is already the right keyframe for principle 7.
9. `Needs Verification [product-decision]` — **`prefers-reduced-motion` fidelity.** Should reduced motion strip all movement (current global behaviour: `animation-duration: 0.01ms`, `transition-duration: 0.01ms`) or preserve opacity crossfades while removing positional movement (the more refined option Motion and the Next docs both describe)?
10. `Needs Verification [capability-unavailable]` — **Perceptual acceptance could not be assessed.** No human review was performed. Desktop and mobile screenshots of all three references and of home / gameplay / outcome / game-over were captured to `docs/assets/immersive-motion/`, but feel and hierarchy acceptance is not claimed. Separately, frame-level keyframe interpolation on the reference sites is `Needs Verification [capability-unavailable]` (animation-inspector CAPTCHA-blocked there); measured values come from live DOM and computed-style reads.
11. `Needs Verification [inferred-from-codebase]` — **`components/ui/button.tsx` is unused by the game surfaces** (game and home use hand-rolled buttons). Motion should therefore live in feature components, not the shadcn primitive, unless the owner wants the primitive upgraded.
12. `Needs Verification [product-decision]` — **Game-over panel treatment.** Should it stay an in-place overlay (fade/scale, as today) or gain a heavier "drop" entrance (fairway `t0` style)? Heavier risks feeling punitive on a loss.

---

## 9. Stage applicability statement

- **Design stage: APPLICABLE.** This task changes visual output and interaction feel; per the design condition it requires a defined intended result before code.
- **Code stage: NOT STARTED.** No application code, config, token, or asset was created or modified in this analysis. The only file written is this document.
- **Analysis-stage rule honoured:** documentation only.
- **Evidence discipline:** every confirmed claim above cites a file+line, a command/MCP observation, or an owner statement. Anything unconfirmed is labelled `Needs Verification` with a qualifier. No environment values, tokens or credentials were read, copied, or reproduced.

### Verification log (2026-11-22 second pass)

| Check | Status | Evidence |
|---|---|---|
| Working-tree baseline | `[Pass]` | `git status --porcelain`; `git branch --show-current` → `lj-branch`; both diffs empty |
| Browser revision installed at expected paths | `[Pass]` | `chromium-1255\chrome-win64\chrome.exe`, `chromium_headless_shell-1255\chrome-headless-shell-win64\chrome-headless-shell.exe`; both `--version` → Chrome for Testing 159.0.8154.6 |
| Playwright MCP launch | `[Pass]` | `https://example.com` → title `Example Domain`; full navigation on 3 reference sites + local app |
| animation-inspector MCP launch | `[Pass]` | `discover_animations(example.com)` → "No animations detected" |
| animation-inspector on reference sites | `[Blocked]` | "Site blocked by CAPTCHA — cannot inspect animations"; per-site data taken from Playwright DOM reads instead |
| `impeccable context` launcher | `[Pass]` | exit 0; directives recorded in §4.0 |
| Motion version | `[Pass]` | `package.json` → `motion: ^14.1.0` |
| `prefers-reduced-motion` block present | `[Pass]` | [`app/globals.css`](../app/globals.css:188) — `animation-duration/iteration-count/transition-duration/scroll-behavior` |
| Local dev server reachable | `[Pass]` | `curl -I http://localhost:3000` → `HTTP/1.1 200 OK` (pre-existing server, PID 17272) |
| Local home / gameplay / outcome / game-over captured | `[Pass]` | 13 screenshots under `docs/assets/immersive-motion/` |
| Local console errors | `[Pass]` | 0 errors, 0 warnings |
| Reduced-motion behaviour | `[Pass]` | emulated `reduce` → 0 animations, final state immediate, 0 non-zero durations |
| Perceptual / feel acceptance | `[Not tested]` | no human reviewer; not claimed |
| Frame-level keyframe interpolation on references | `[Blocked]` | inspector CAPTCHA; `@keyframes` metadata measured instead |
