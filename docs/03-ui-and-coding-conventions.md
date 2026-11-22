# UI & Coding Conventions

The conventions this codebase actually follows today: styling, primitives, icons,
motion, the atmosphere/audio subsystems, naming, and the TypeScript/lint gates.
Every claim was read from source on 2026-11-22; anything that could not be
confirmed from the repository is labelled `Needs Verification` with a qualifier.

Related guides: [`01-contributor-onboarding.md`](01-contributor-onboarding.md) for
setup, [`02-architecture.md`](02-architecture.md) for how a request becomes a
playable deck, [`04-api-data-and-operations.md`](04-api-data-and-operations.md) for
catalog/provider operations.

---

## 1. Styling foundation

Tailwind CSS v4 is **CSS-first**. There is no configuration file to edit.

| Rule | Evidence |
| --- | --- |
| The single stylesheet entry begins with `@import "tailwindcss";` | [`app/globals.css`](../app/globals.css:1) |
| Design tokens are declared in `:root` | [`app/globals.css`](../app/globals.css:4) |
| A subset is exposed to Tailwind via `@theme inline` | [`app/globals.css`](../app/globals.css:72) |
| **No `tailwind.config.*` exists, and none may be added** | `components.json` sets `tailwind.config` to `""` ([`components.json`](../components.json:7)) |

`@theme inline` currently maps only `--color-background`, `--color-foreground`,
`--font-sans`, and `--font-display` ([`app/globals.css`](../app/globals.css:73)).
The full palette lives in `:root` and is consumed either through Tailwind's
arbitrary-value syntax (`bg-[var(--surface-raised)]`) or through the shared
component classes in the same file.

Representative token families (names only — read the file for values):

- Surfaces and text: `--bg-base`, `--bg-elevated`, `--text-primary`,
  `--text-secondary`, `--border-subtle`, `--border-strong`
  ([`app/globals.css`](../app/globals.css:8)).
- Semantic accents: `--accent-classic`, `--accent-time-attack`,
  `--accent-action-higher`, `--accent-action-lower`, `--accent-highlight`,
  `--status-success`, `--status-error`
  ([`app/globals.css`](../app/globals.css:29)).
- Motion vocabulary: `--motion-dur-*`, `--motion-ease-*`, `--motion-dist-*`
  ([`app/globals.css`](../app/globals.css:455)).
- Atmosphere tuning: `--atmo-*`
  ([`app/globals.css`](../app/globals.css:803)).

Owner-accepted gameplay tint value, confirmed in source:
`--atmo-tint-alpha-gameplay: 0.26`
([`app/globals.css`](../app/globals.css:809)). The engine reads it at bake time
and falls back to `0.16` only if the token is missing
([`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:332)) — the
token is authoritative whenever it is present.

**Application style.** Utilities are applied inline via `className`, with a small
amount of runtime inline styling for per-instance custom properties, e.g.
`style={{ "--card-accent": MODE_ACCENTS[mode] }}`
([`components/game/GameCard.tsx`](../components/game/GameCard.tsx:65)).

---

## 2. Component primitives (shadcn/ui)

Configuration is authoritative in [`components.json`](../components.json:1):

| Setting | Value | Line |
| --- | --- | --- |
| `style` | `new-york` | [`components.json`](../components.json:3) |
| `rsc` | `true` | [`components.json`](../components.json:4) |
| `tsx` | `true` | [`components.json`](../components.json:5) |
| `tailwind.config` | `""` (none) | [`components.json`](../components.json:7) |
| `tailwind.css` | `app/globals.css` | [`components.json`](../components.json:8) |
| `tailwind.baseColor` | `neutral` | [`components.json`](../components.json:9) |
| `tailwind.cssVariables` | `true` | [`components.json`](../components.json:10) |
| `iconLibrary` | `lucide` | [`components.json`](../components.json:13) |
| aliases | `@/components`, `@/components/ui`, `@/lib`, `@/hooks`, `@/lib/utils` | [`components.json`](../components.json:14) |

- **Primitive source is the unified `radix-ui` package** (`^1.7.0`,
  [`package.json`](../package.json:22)). Do not replace it with individual
  `@radix-ui/react-*` packages. [`components/ui/button.tsx`](../components/ui/button.tsx:4)
  imports `Slot` from `radix-ui`.
- **Class utility is `cn` from the `cn` package**, not a local `clsx` +
  `tailwind-merge` helper ([`components/ui/button.tsx`](../components/ui/button.tsx:3),
  [`package.json`](../package.json:18)). Variants use `class-variance-authority`
  ([`components/ui/button.tsx`](../components/ui/button.tsx:6)).
- **Primitives live in `components/ui/`.** Today that directory contains only
  [`button.tsx`](../components/ui/button.tsx:1).
- **Add new shadcn primitives with the registry**, not by hand:
  `npx shadcn@latest add <component>`.
- **Prefer a registry component over a hand-rolled primitive** when one exists.
- **Do not convert game-specific components** (`components/game/*`,
  `components/home/*`) into shadcn primitives. They are bespoke game chrome.

---

## 3. Icons

Lucide via `lucide-react` (`^1.46.0`,
[`package.json`](../package.json:19); `iconLibrary: "lucide"`,
[`components.json`](../components.json:13)). Example:
[`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx:3)
imports `ArrowLeft` from `lucide-react`.

---

## 4. Motion rules

- **Animation library is `motion`**, imported from `motion/react`
  ([`package.json`](../package.json:20)). Components using it are client
  components — [`components/game/GameCard.tsx`](../components/game/GameCard.tsx:1)
  declares `"use client"` and imports `motion` / `useReducedMotion`
  ([`components/game/GameCard.tsx`](../components/game/GameCard.tsx:5)).
- **Gameplay entrance settles at 380 ms.** The last transform beat is the
  controls animation: 220 ms delay + 160 ms duration
  ([`app/globals.css`](../app/globals.css:1116), documented as "settles at
  exactly 380 ms" at [`app/globals.css`](../app/globals.css:1043)).
- **Route transition is an opacity-only crossfade.** `::view-transition-new(.nav-forward)`
  runs `route-fade-in` ([`app/globals.css`](../app/globals.css:746)); an appended
  override shortens both sides to 100 ms
  ([`app/globals.css`](../app/globals.css:859)). There is no translate on the
  incoming page.
- **Reduced motion must be preserved.** The global media block that strips
  animation/transition durations is at
  [`app/globals.css`](../app/globals.css:183); later appended blocks re-admit
  opacity-only crossfades and suppress positional movement
  ([`app/globals.css`](../app/globals.css:700),
  [`app/globals.css`](../app/globals.css:1122)). Do not remove or weaken these.
- **Visual animation must not alter gameplay or business timing** (timers,
  round resolution, scoring).
- **Adding another animation library requires a demonstrated capability gap and
  explicit owner approval.**
- **Do not add motion merely because the tooling exists.**

---

## 5. Atmosphere constraints

The atmosphere field is a single 2D canvas, not a React-rendered effect.

- **One canvas, mounted once.** [`app/layout.tsx`](../app/layout.tsx:40) mounts
  [`AtmosphereBackdrop`](../components/atmosphere/AtmosphereBackdrop.tsx:1);
  the engine is created per canvas and draws one frame per
  `requestAnimationFrame` tick
  ([`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:2)).
- **Sprites are baked offscreen and composited with `drawImage`.** The baker
  creates detached canvases (`document.createElement("canvas")`, never appended)
  at device resolution ([`lib/atmosphere/sprites.ts`](../lib/atmosphere/sprites.ts:93)),
  and gradients are created at bake time only
  ([`lib/atmosphere/sprites.ts`](../lib/atmosphere/sprites.ts:113)).
- **Tuning tokens are read at (re)bake time**, never per frame: `readTuning()`
  runs on init/resize/mode/surface changes
  ([`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:322)).
- **Reduced motion draws a single static frame** and skips the loop (engine
  contract, [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:182)
  `setReducedMotion`).
- **Gameplay sprite gains:** sparks 3.0 and idle chevrons 2.0
  ([`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:76),
  tokens at [`app/globals.css`](../app/globals.css:823)). They are applied inside
  the draw path **before** the field-alpha multiplier. The reactive
  Higher/Lower surge is **not** multiplied and keeps its absolute peak
  (`SURGE_ALPHA_PEAK 0.88`,
  [`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:57)).

### Accepted calibration limitation — do not re-open

Owner-accepted and recorded as a limitation, not a defect:

- Desktop gameplay Classic → Time Attack mode carry is accepted at
  **ΔR +6.32 … +6.64**; side-gutter field visibility is **8.40**.
- The ≥ 18 ΔR and ≥ 12 side-gutter concept targets are **not pursued**. Reaching
  them would require retuning the `.gameplay-surface` scrim stops or ellipse
  geometry ([`app/globals.css`](../app/globals.css:950)); the accepted scrim
  values were not exceeded.

### Recorded observation (do not fix as part of unrelated work)

The engine's module docstring states "no gradients created inside the loop"
([`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:19)), but
the impulse draw path does allocate radial gradients per active impulse
([`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:929),
[`lib/atmosphere/canvasEngine.ts`](../lib/atmosphere/canvasEngine.ts:961)).
This is recorded as an observation, not a defect to fix on sight. Changing it is
out of scope unless a task asks for it.

---

## 6. Audio constraints

Audio is **SFX-only**. The generative BGM system described in older dated docs no
longer exists.

- `lib/audio/` contains exactly `audioEngine.ts`, `settings.ts`, and `soundMap.ts`
  — there is **no BGM module**.
- **No BGM, no loop, no scheduler, no mount-time sound.** The engine creates no
  context at rest and runs no continuous oscillator
  ([`lib/audio/audioEngine.ts`](../lib/audio/audioEngine.ts:3)).
- **The `AudioContext` is unlocked lazily on the first qualifying gesture**
  ([`lib/audio/audioEngine.ts`](../lib/audio/audioEngine.ts:108)). Cues are
  one-shot oscillator voices that stop themselves
  ([`lib/audio/audioEngine.ts`](../lib/audio/audioEngine.ts:193)).
- **The headless `AudioSurface` in the root layout owns the global engine**
  ([`app/layout.tsx`](../app/layout.tsx:42)), so a direct `/game/*` load still
  receives SFX.
- **The visible control is Home-only**, an icon-only **44×44** (`h-11 w-11`)
  ghost button matching the `View High Scores` treatment
  ([`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx:322),
  documented at [`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx:14)).
  Its popover has two switches: `SFX` and `Interface ticks`
  ([`components/audio/AudioSurface.tsx`](../components/audio/AudioSurface.tsx:298)).
- **Settings persist under `hl:audio:v1`** with a versioned envelope and a shape
  guard ([`lib/audio/settings.ts`](../lib/audio/settings.ts:15)).

---

## 7. Naming and file placement

| Kind | Convention | Example |
| --- | --- | --- |
| Components | `PascalCase.tsx` | [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx:1) |
| Route files | App Router names: `page.tsx`, `layout.tsx`, `route.ts` | [`app/layout.tsx`](../app/layout.tsx:1), [`app/api/test-fetch/route.ts`](../app/api/test-fetch/route.ts:1) |
| Provider adapters | lowercase, provider-named | [`lib/api/tmdb.ts`](../lib/api/tmdb.ts:1), [`lib/api/steamspy.ts`](../lib/api/steamspy.ts:1) |
| Shared pure game helpers | `lib/game/` | [`lib/game/deck.ts`](../lib/game/deck.ts:1) |
| Game feature components | `components/game/` | [`components/game/GameCard.tsx`](../components/game/GameCard.tsx:1) |
| Home feature components | `components/home/` | [`components/home/LaunchDock.tsx`](../components/home/LaunchDock.tsx:1) |
| shadcn primitives | `components/ui/` | [`components/ui/button.tsx`](../components/ui/button.tsx:1) |

Feature components are not moved or refactored into other folders as incidental
cleanup.

---

## 8. TypeScript and ESLint

- **`strict: true`** and the `@/*` → repository-root path alias
  ([`tsconfig.json`](../tsconfig.json:7),
  [`tsconfig.json`](../tsconfig.json:21)).
- **ESLint flat config** composing `eslint-config-next` core-web-vitals and
  TypeScript presets, with the framework's default ignores
  ([`eslint.config.mjs`](../eslint.config.mjs:5)).
- **Baseline:** lint passes with 0 errors and pre-existing warnings. The exact
  warning count is `Needs Verification [environment-specific]` — it drifts as
  files change, so re-measure with `npm run lint` rather than trusting a number
  copied into this guide.
- `npx tsc --noEmit` is the type gate. `npm run build` is `[Blocked]` while a
  `next dev` server owns `.next` and port 3000 (see guide 04, §7).

---

## 9. Remote images

[`next.config.ts`](../next.config.ts:6) whitelists specific remote hosts for the
framework image loader: `image.tmdb.org`, `flagcdn.com`, `upload.wikimedia.org`,
and the Steam CDN hostnames (`cdn.akamai.steamstatic.com`,
`shared.akamai.steamstatic.com`, `cdn.cloudflare.steamstatic.com`,
`shared.fastly.steamstatic.com`). SVG is permitted with
`dangerouslyAllowSVG: true` and `contentDispositionType: "attachment"`
([`next.config.ts`](../next.config.ts:45)).

[`components/game/GameCard.tsx`](../components/game/GameCard.tsx:92)
**intentionally uses a native `<img>`** with an explicit
`eslint-disable-next-line @next/next/no-img-element`
([`components/game/GameCard.tsx`](../components/game/GameCard.tsx:91)). Steam CDN
edge hostnames rotate, so the plain tag tolerates unknown variants that the
whitelist would not. Do not "fix" this to `next/image` or remove the disable
comment without an owner decision.

---

## 10. Exemplar files

| Exemplar | Why it is the model |
| --- | --- |
| [`components/ui/button.tsx`](../components/ui/button.tsx:1) | shadcn primitive shape: `cva` variants, `cn` from `cn`, `Slot` from `radix-ui`, `data-slot`/`data-variant` attributes. |
| [`components/game/GameCard.tsx`](../components/game/GameCard.tsx:1) | Presentation-only game component: native `<img>` with error fallback, per-card accent supplied through a CSS custom property, optional `attribution` credit line ([line 146](../components/game/GameCard.tsx:146)). |
| [`components/game/GameplayShell.tsx`](../components/game/GameplayShell.tsx:1) | Gameplay feature composition: shared chrome, mode accent via inline custom property, rules/lifecycle left to each mode ([line 27](../components/game/GameplayShell.tsx:27)). |
| [`lib/atmosphere/sprites.ts`](../lib/atmosphere/sprites.ts:1) | Offscreen bake discipline: detached canvases, device-pixel sizing, gradients only at bake time, no React/state/timers ([line 14](../lib/atmosphere/sprites.ts:14)). |
| [`lib/audio/settings.ts`](../lib/audio/settings.ts:1) | Versioned `localStorage` persistence with a shape guard, try/catch reads, and a stable server snapshot ([line 41](../lib/audio/settings.ts:41)). |
| [`lib/home/selection.ts`](../lib/home/selection.ts:1) | SSR-safe restore: every storage read is `typeof window`-guarded and the caller restores from an effect; stored triples are validated against the live catalog ([line 94](../lib/home/selection.ts:94)). |

---

## 11. Do not

- Do not add a **second atmosphere canvas** or a **second `requestAnimationFrame`
  loop**.
- Do not add another animation library without a demonstrated gap and owner
  approval.
- Do not reintroduce **BGM**, a background loop, or a scheduler.
- Do not move or refactor existing feature components.
- Do not add a `tailwind.config.*`.
- Do not paste the default shadcn theme over the HigherLower tokens in
  [`app/globals.css`](../app/globals.css:4).
- Do not introduce another UI framework (MUI, Chakra, Bootstrap, …) without
  explicit owner approval.
- Do not weaken the `prefers-reduced-motion` rules.

---

## Open questions / Needs Verification

- `Needs Verification [environment-specific]` — the exact ESLint warning count.
  Re-measure with `npm run lint`; do not treat any number in prose as current.
- `Needs Verification [inferred-from-codebase]` — the token families listed in §1
  are illustrative, not an exhaustive inventory. `app/globals.css` is the
  authority.
- `Needs Verification [product-decision]` — whether the impulse gradient
  allocation in §5 should ever be refactored. It is recorded, not scheduled.
- `Needs Verification [capability-unavailable]` — perceptual/UX acceptance of the
  accepted calibration limitation in §5 was an owner call recorded on
  2026-11-22; this guide reproduces it and does not re-assess it.
