# Visual Redesign Convention & UI/UX Skill-Stack Audit

> Read-only assessment artifact. This file is the single authorized write target for the audit task. It records evidence-backed findings about the HigherLower frontend and evaluates the proposed UI/UX skill stack. It does not authorize any application change.

## 1. Audit Scope and Method

**Objective.** Inspect the HigherLower repository, understand how frontend work is already structured, evaluate whether the currently proposed UI/UX skill stack (Playwright MCP, Impeccable, UI UX Pro Max, Emil Kowalski motion skills, Taste Skill, optional accessibility tooling) is sufficient, and recommend only additional skills/tools genuinely justified by the codebase.

**Constraint.** Read-only assessment. No application source code, runtime configuration, package files, project rules, existing design documentation, or dependencies may be modified. The only authorized file change is this report.

**Method.** Staged inspection (10 steps) delegated to specialized modes, with findings recorded incrementally. External verification via Context7/Exa MCP where accuracy requires it.

**Evidence sources.** Repository files (rules, docs, design-reference, source, configs) and external primary sources.

**Limitations.** This is a dated, non-authoritative assessment, not a live inventory of all session tools. Evidence now available in the workspace includes project-local Impeccable and Emil skill files and Playwright MCP pilot artifacts; these do not establish that the same capabilities will be available in every future session. No app dependency installation is proposed here.

**Labeling convention.** Findings are labeled **Repository Fact**, **Externally Verified**, **Inference**, **Recommendation**, or **Needs Verification**.

---

## 2. Repository Evidence Summary

### 2.0 Frontend Stack (Inspection Step 2)

**Repository Fact** — Framework: Next.js `16.3.4` (exact pin) ([`package.json`](package.json:19)). React `19.2.8` / React DOM `19.2.8` (exact pins) ([`package.json`](package.json:21), [`package.json`](package.json:22)). TypeScript `^5` ([`package.json`](package.json:32)). App Router in use.

**Repository Fact** — Package manager: **npm** (`package-lock.json` lockfileVersion 3) ([`package-lock.json`](package-lock.json:4)).

**Repository Fact** — Styling: Tailwind CSS `^4` via `@tailwindcss/postcss` `^4` ([`package.json`](package.json:25), [`package.json`](package.json:31)); CSS-first, no `tailwind.config.*` ([`postcss.config.mjs`](postcss.config.mjs:1)); single entry `@import "tailwindcss";` with `:root` tokens and `@theme inline` ([`app/globals.css`](app/globals.css:1), [`app/globals.css`](app/globals.css:4), [`app/globals.css`](app/globals.css:72)).

**Repository Fact** — UI libraries: shadcn/ui (`new-york`, `rsc: true`, `tsx: true`, `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide`) ([`components.json`](components.json:3)); unified `radix-ui` `^1.7.0` ([`package.json`](package.json:20)); `class-variance-authority` `^0.7.1` ([`package.json`](package.json:15)); `cn` `^0.4.0` ([`package.json`](package.json:16)). Only one shadcn primitive exists: [`components/ui/button.tsx`](components/ui/button.tsx:1).

**Repository Fact (dated baseline; subsequently superseded by pilot evidence)** — Animation: `motion` `^14.1.0` is an app dependency ([`package.json`](package.json:18)). The original inspection found no `motion/react` imports; the current pilot source now imports `motion`, `useReducedMotion`, `useScroll`, and `useTransform` in [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:6). Therefore “installed but unused” is a historical finding, not a current stack recommendation. This is app-library usage, distinct from whether a motion specialist skill is installed or invoked.

**Repository Fact** — Icons: `lucide-react` `^1.46.0` ([`package.json`](package.json:17)).

**Repository Fact (app dependency inventory)** — No test framework, CI pipeline, Playwright/Puppeteer package, or axe dependency is listed in [`package.json`](package.json:1) or its scripts. This does not imply that an MCP server or browser automation cannot be available outside app dependencies. Pilot evidence includes `.playwright-mcp/` page snapshots, screenshots, and console logs; the current session also exposes Playwright MCP tools. Treat MCP/session availability separately from installed app packages and do not generalize the pilot to future sessions.

**Repository Fact** — npm scripts ([`package.json`](package.json:5)): `dev`, `build`, `start`, `lint`, `snapshot:album-release-date`, `snapshot:artist-album-counts`, `catalog:youtube-channels`.

**Repository Fact** — TypeScript: `strict: true` ([`tsconfig.json`](tsconfig.json:7)); `target: ES2017`, `moduleResolution: bundler`, `jsx: react-jsx`, `noEmit: true`; path alias `@/*` → `./*` ([`tsconfig.json`](tsconfig.json:21)). No `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes` overrides.

**Repository Fact** — Lint: ESLint 9 flat config with `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` ([`eslint.config.mjs`](eslint.config.mjs:2)); `eslint-config-next` pinned `16.3.4` ([`package.json`](package.json:30)).

**Repository Fact** — Next config: `images.remotePatterns` whitelists `image.tmdb.org`, `flagcdn.com`, `upload.wikimedia.org`, Steam CDN ([`next.config.ts`](next.config.ts:6)); `dangerouslyAllowSVG: true` ([`next.config.ts`](next.config.ts:45)).

**Needs Verification** `[inferred-from-codebase]` — `components.json` aliases `utils` to `@/lib/utils`, but no `lib/utils.ts` was observed in the workspace listing.


### 2.1 Source-of-Truth Precedence

**Repository Fact** — canonical authority ladder ([`.roo/rules/00-governance.md`](.roo/rules/00-governance.md:14)):
1. Explicit current owner instructions (including any stated file allowlist).
2. Always-on files in `.roo/rules/`.
3. `AGENTS.md` for Next.js implementation guidance.
4. Task documents (analysis, design, plan).
5. `.roo/rules/governance/reference/*` as session-visible descriptive context.
6. `governance/archive/*` as historical context only.

Lower items never override higher ones; archived material is never active policy; reference material is descriptive, not authorizing ([`.roo/rules/00-governance.md`](.roo/rules/00-governance.md:24)).

**Repository Fact** — conflict resolution order restated in [`.roo/rules/03-evidence-and-verification.md`](.roo/rules/03-evidence-and-verification.md:52): owner instruction → always-on rules → `AGENTS.md` → task plan → design → analysis → reference → archive. Contradictions must be flagged, not silently resolved.

**Repository Fact** — [`CLAUDE.md`](CLAUDE.md:1) contains only `@AGENTS.md` (delegates to `AGENTS.md`). `AGENTS.md` is a `next dev`-managed block requiring consultation of locally installed Next docs before writing code ([`AGENTS.md`](AGENTS.md:5)).

**Repository Fact** — a second, task-scoped authority order appears in the provider planning prompt ([`higherlower-provider-analysis-planning-prompt.md`](higherlower-provider-analysis-planning-prompt.md:28)): (1) current local repo code, (2) finalized product decisions/contracts, (3) official provider docs, (4) Context7, (5) other primary sources. It warns the public GitHub `main` may be stale vs. the local workspace ([`higherlower-provider-analysis-planning-prompt.md`](higherlower-provider-analysis-planning-prompt.md:40)).

**Repository Fact** — design evidence has its own priority order ([`design-reference/notes/source-provenance.md`](design-reference/notes/source-provenance.md:27)): (1) direct task/product decisions, (2) screenshots for appearance/composition, (3) Figma CSS for geometry/properties, (4) normalized extraction notes, (5) current implementation as baseline only, never target-visual authority.

**Contradiction (minor, non-blocking)** — governance ladder places `AGENTS.md` above task documents; the provider prompt's task-scoped order places "current local repository code" first. Different scopes; not a hard conflict, but two ladders exist.

### 2.2 Existing Workflows (Stages & Triggers)

**Repository Fact** — proportional pipeline ([`.roo/rules/02-workflow.md`](.roo/rules/02-workflow.md:24)): Analysis → Design → Plan → Code → QA → Postfix → Reconciliation → Documentation. Skipping a stage is allowed when it does not apply, but the skip must be recorded rather than implied as passed ([`.roo/rules/02-workflow.md`](.roo/rules/02-workflow.md:36)).

**Repository Fact** — classification-first ([`.roo/rules/02-workflow.md`](.roo/rules/02-workflow.md:10)): governance/docs-only, feature/bug fix, visual change, logic-only/refactor, verification/QA, post-fix correction, merge reconciliation.

**Repository Fact** — conditions self-gate; presence ≠ activation ([`.roo/rules/02-workflow.md`](.roo/rules/02-workflow.md:40)). Triggers:
- Analysis — when existing code must be understood before change; not for trivial edits or pure docs ([`.roo/rules/governance/conditions/analysis.md`](.roo/rules/governance/conditions/analysis.md:8)).
- Design — only when visual output changes ([`.roo/rules/governance/conditions/design.md`](.roo/rules/governance/conditions/design.md:8)).
- Plan — anything beyond a trivial edit ([`.roo/rules/governance/conditions/plan.md`](.roo/rules/governance/conditions/plan.md:8)).
- Code — when approved work requires edits ([`.roo/rules/governance/conditions/code.md`](.roo/rules/governance/conditions/code.md:8)).
- QA — when verification is proportional to risk/output ([`.roo/rules/governance/conditions/qa.md`](.roo/rules/governance/conditions/qa.md:8)).
- Postfix — only after QA/verification finds a defect requiring a fix ([`.roo/rules/governance/conditions/postfix.md`](.roo/rules/governance/conditions/postfix.md:8)).
- Reconciliation — only after a merge/pull produces conflicts ([`.roo/rules/governance/conditions/reconciliation.md`](.roo/rules/governance/conditions/reconciliation.md:8)).
- Documentation — after implementation/verification/postfix/reconciliation or a docs-only task, when a handoff is needed ([`.roo/rules/governance/conditions/documentation.md`](.roo/rules/governance/conditions/documentation.md:8)).

**Repository Fact** — postfix classification ([`.roo/rules/governance/conditions/postfix.md`](.roo/rules/governance/conditions/postfix.md:14)): implementation bug, spec gap, or verification gap; a spec gap must be flagged before touching code.

**Repository Fact** — reconciliation conflict classes ([`.roo/rules/governance/conditions/reconciliation.md`](.roo/rules/governance/conditions/reconciliation.md:24)): mechanical, main-wins, mine-wins, unclear. Unclear conflicts are never guessed.

**Repository Fact** — artifacts stay lightweight ([`.roo/rules/02-workflow.md`](.roo/rules/02-workflow.md:52)): plans/analysis/handoffs live in task/chat/PR context by default.

### 2.3 Change-Control Rules

**Repository Fact** — scope discipline ([`.roo/rules/00-governance.md`](.roo/rules/00-governance.md:30)): change only what the task requires; no opportunistic cleanup/rename/reformat/refactor. Multi-file changes are normal and do not by themselves require approval.

**Repository Fact** — approval triggers ([`.roo/rules/00-governance.md`](.roo/rules/00-governance.md:36), [`.roo/rules/02-workflow.md`](.roo/rules/02-workflow.md:56)): scope expansion, unresolved product/design decisions, sensitive-boundary crossings, meaningful ambiguity. Escalation cases enumerated in [`.roo/rules/04-tools-and-escalation.md`](.roo/rules/04-tools-and-escalation.md:30).

**Repository Fact** — allowlists are explicit and binding ([`.roo/rules/governance/conditions/code.md`](.roo/rules/governance/conditions/code.md:20), [`.roo/rules/governance/conditions/plan.md`](.roo/rules/governance/conditions/plan.md:20)). Concrete example: [`high-low-redesign-plan.md`](high-low-redesign-plan.md:107).

**Repository Fact** — safety invariants ([`.roo/rules/00-governance.md`](.roo/rules/00-governance.md:42)): never expose/copy/move private server-side env values into client-reachable code, logs, plans, or handoffs.

**Repository Fact** — project boundaries ([`.roo/rules/01-project-boundaries.md`](.roo/rules/01-project-boundaries.md:60)): no test framework, no CI, no auth/accounts, no database, no payments, no production ops. If a task appears to need one, stop and confirm with the owner.

**Repository Fact** — observed discrepancies are facts, not defects to fix on sight ([`.roo/rules/01-project-boundaries.md`](.roo/rules/01-project-boundaries.md:78)): the high-score key namespace split is `Needs Verification [product-decision]`.

### 2.4 Design Authority

**Repository Fact** — design-reference is the authoritative target visual evidence and is read-only ([`high-low-redesign-plan.md`](high-low-redesign-plan.md:72)).

**Repository Fact** — design-reference evidence rules ([`design-reference/README.md`](design-reference/README.md:16)): (1) Figma/CSS measurements are the geometry source; (2) screenshots are the visual-composition source; (3) PNG export dimensions are not CSS dimensions; (4) current codebase is an implementation baseline, not target-design authority; (5) missing Figma evidence is not an instruction to remove behavior; (6) unspecified behavior stays `Needs Verification`; (7) responsive layouts were not designed.

**Repository Fact** — raw Figma CSS is reference only, never copied literally ([`high-low-redesign-plan.md`](high-low-redesign-plan.md:73)); only normalized notes exist ([`design-reference/notes/source-provenance.md`](design-reference/notes/source-provenance.md:17), [`design-reference/manifest.json`](design-reference/manifest.json:18)).

**Repository Fact** — design tokens/notes inventory: `tokens/colors.md`, `typography.md`, `layout.md`, `visual-patterns.md`, `foundational-components.md`; notes `component-map.md`, `design-inventory.md`, `figma-export.md`, `open-questions.md`, `reconciliation-rules.md`, `responsiveness.md`, `source-map.md`, `source-provenance.md`. Product typeface is **Space Mono** ([`design-reference/tokens/typography.md`](design-reference/tokens/typography.md:5)); `Inter` is documentation-board only.

**Repository Fact** — reconciliation vocabulary ([`design-reference/notes/reconciliation-rules.md`](design-reference/notes/reconciliation-rules.md:5)): Exists in both / Current-only / Target-only / Changed / Needs Verification.

**Repository Fact** — responsive authority ([`design-reference/notes/responsiveness.md`](design-reference/notes/responsiveness.md:7)): desktop Figma is authoritative; responsive behavior is implementation-defined using standard Tailwind mobile-first conventions; do not mechanically scale `1440px` coordinates; do not claim tablet/mobile is designer-approved.

**Repository Fact** — UI design system ([`.roo/rules/ui-design-system.md`](.roo/rules/ui-design-system.md:1)): Tailwind v4 CSS-first, no `tailwind.config.*`; tokens in `app/globals.css` `:root` + `@theme inline`; shadcn/ui primitives in `components/ui/`; unified `radix-ui` package is the approved primitive source; Lucide icons; Motion from `motion/react`; preserve existing theme and reduced-motion handling ([`.roo/rules/ui-design-system.md`](.roo/rules/ui-design-system.md:124)).

**Repository Fact** — design-reference commit status is unresolved: `Needs Verification [product-decision]` ([`docs/handoff-signoff.md`](docs/handoff-signoff.md:136)).

### 2.5 Verification Requirements

**Repository Fact** — evidence over assertion ([`.roo/rules/03-evidence-and-verification.md`](.roo/rules/03-evidence-and-verification.md:8)): each material claim must name its evidence.

**Repository Fact** — proportional verification ([`.roo/rules/03-evidence-and-verification.md`](.roo/rules/03-evidence-and-verification.md:16)): copy/docs → read-back; logic → exercise/reason against source; visual → check rendered result when a browser is available.

**Repository Fact** — status vocabulary: `[Pass]`, `[Partial]`, `[Fail]`, `[Blocked]`, `[Not tested]` ([`.roo/rules/governance/conditions/qa.md`](.roo/rules/governance/conditions/qa.md:40), [`.roo/rules/governance/conditions/documentation.md`](.roo/rules/governance/conditions/documentation.md:40)).

**Repository Fact** — uncertainty labels ([`.roo/rules/03-evidence-and-verification.md`](.roo/rules/03-evidence-and-verification.md:40)): `[product-decision]`, `[environment-specific]`, `[inferred-from-codebase]`, `[capability-unavailable]`.

**Repository Fact** — capability discovery per session ([`.roo/rules/04-tools-and-escalation.md`](.roo/rules/04-tools-and-escalation.md:8)): do not assume a tool/browser/integration is available.

**Repository Fact** — verification matrix example ([`docs/catalog-pool-and-repeat-plan.md`](docs/catalog-pool-and-repeat-plan.md:920)): TypeScript (`npx tsc --noEmit`), lint, build, catalog sizes, unique IDs, image availability, duplicate rate, latency, quota compliance, generated-file validation, credential exposure, no-repeat Playwright checks, availability consistency, browser console/network.

**Repository Fact** — no test framework confirmed ([`.roo/rules/01-project-boundaries.md`](.roo/rules/01-project-boundaries.md:60)). Playwright availability is `Needs Verification` in the plan ([`docs/catalog-pool-and-repeat-plan.md`](docs/catalog-pool-and-repeat-plan.md:945)), later resolved `[Pass]` in Phase 6 ([`docs/catalog-pool-and-repeat-plan.md`](docs/catalog-pool-and-repeat-plan.md:2346)); current pilot artifacts also confirm browser inspection in this pilot, not a permanent app dependency or future-session guarantee.

**Repository Fact** — dirty-file protection exists in [`.roo/rules/00-governance.md`](.roo/rules/00-governance.md:34); no open question remains on whether the rule exists.

### 2.6 Local Working-Tree / Dirty-File Handling

**Repository Fact** — explicit working-tree protection exists in [`.roo/rules/00-governance.md`](.roo/rules/00-governance.md:34): inspect status/relevant diffs before modification, preserve pre-existing user work, and treat the local tree as authoritative. The handoff also records status via `git status --porcelain` ([`docs/handoff-signoff.md`](docs/handoff-signoff.md:49)).

The earlier inference that there was no explicit dirty-file protection is superseded by the direct rule evidence above; no open verification item remains for whether the policy exists.

### 2.7 Documented UI/UX, Accessibility, Motion & Responsive Conventions

**Repository Fact** — accessibility strategy ([`high-low-redesign-plan.md`](high-low-redesign-plan.md:468)): native radio semantics first; native accessible dialog first; predictable keyboard order; visible focus independent of color; adequate target sizes; meaningful copy; text/icon status combinations; restrained live regions; dialog focus containment/restore; reduced-motion respect.

**Repository Fact** — responsive strategy ([`high-low-redesign-plan.md`](high-low-redesign-plan.md:479)): implementation-derived (no mobile/tablet Figma); preserve hierarchy rather than scale desktop coordinates; reflow without horizontal scrolling for core actions; preserve decision-control target size.

**Repository Fact** — motion conventions ([`.roo/rules/ui-design-system.md`](.roo/rules/ui-design-system.md:118)): import Motion from `motion/react`; Motion components must be client components; respect reduced motion; preserve existing `prefers-reduced-motion` handling in `app/globals.css` ([`.roo/rules/ui-design-system.md`](.roo/rules/ui-design-system.md:124)).

**Repository Fact** — [`ui-interaction-audit.md`](ui-interaction-audit.md:1) is a read-only, evidence-grounded audit (not authorization). It documents existing keyframes, dead CSS, per-area motion gaps, recommended shadcn additions (Tooltip/Skeleton/Dialog/Tabs/AlertDialog), components that must remain custom, and six open `Needs Verification [product-decision]` items ([`ui-interaction-audit.md`](ui-interaction-audit.md:297)). It explicitly states it does not authorize changes ([`ui-interaction-audit.md`](ui-interaction-audit.md:11)).

**Repository Fact** — design-reference open questions ([`design-reference/notes/open-questions.md`](design-reference/notes/open-questions.md:1)): unsupplied states include correct/incorrect reveal, score feedback, transitions, game-over, restart, loading/error, hover/focus/pressed/disabled; Time Attack urgent/timer states; Co-op Player 2 active appearance and turn rules.

### 2.8 Additional Files Found

**Repository Fact** — [`README.md`](README.md:1) is default `create-next-app` boilerplate referencing `next/font`/Geist, which contradicts the evidenced product typeface (Space Mono). Low impact (generic scaffold text).

**Repository Fact** — [`ui-interaction-audit.md`](ui-interaction-audit.md:1) is a root-level read-only UI/motion audit.

**Repository Fact** — `docs/` contains four files: `handoff-signoff.md`, `catalog-pool-and-repeat-analysis.md`, `catalog-pool-and-repeat-plan.md`, `higher-lower-category-provider-plan.md`.

**Repository Fact** — [`governance/archive/README.md`](governance/archive/README.md:3) is a non-operative historical index; currently contains no archived rule material.

### 2.9 Contradictions & Open Items

1. Two authority ladders (governance vs. provider prompt) — different scopes; not a hard conflict. **Repository Fact.**
2. README typeface (Geist) vs. design authority (Space Mono) — low impact. **Repository Fact.**
3. High-score namespace split — `Needs Verification [product-decision]`.
4. `design-reference/` commit status — `Needs Verification [product-decision]`.
5. Dirty-file protection — explicit policy confirmed in `.roo/rules/00-governance.md`; prior contrary inference withdrawn.
6. Playwright — app package absent, but pilot artifacts and current-session MCP tools confirm browser verification was available for this pilot; availability in a different/future session remains environment-specific.
7. `ui-interaction-audit.md` and `README.md` present at root but outside the stated scope list.

---

## 3. Entry-Point Dependency Map

**Repository Fact** — Entry points are server components. Root layout loads `Space_Mono` via `next/font/google`, imports global CSS, and sets `<html lang="en" class="... h-full dark">` ([`app/layout.tsx`](app/layout.tsx:1), [`app/layout.tsx`](app/layout.tsx:36)). Home page calls `getProductionCatalogProjection()` and renders `<HomeSetup catalog={catalog} />` ([`app/page.tsx`](app/page.tsx:1), [`app/page.tsx`](app/page.tsx:7)).

```
app/layout.tsx  [SERVER]
├── next/font/google (Space_Mono)
├── app/globals.css  [STYLING INFRASTRUCTURE]
│   ├── @import "tailwindcss"
│   ├── :root design tokens
│   └── @theme inline
└── app/page.tsx  [SERVER]
    ├── lib/catalog/availability.ts  [SHARED INFRA]
    │   └── lib/catalog/semanticCatalog.ts  [SHARED INFRA]
    └── components/home/HomeSetup.tsx  [CLIENT — page-specific]
        ├── react (useMemo, useState)
        ├── lucide-react (Trophy)
        ├── next/navigation (useRouter)
        ├── lib/catalog/availability.ts (types)
        ├── lib/catalog/semanticCatalog.ts (types)
        ├── components/home/CategorySelector.tsx  [CLIENT — page-specific]
        │   ├── lib/catalog/availability.ts (type)
        │   └── components/CategoryCard.tsx  [CLIENT — reusable domain]
        │       └── lib/catalog/availability.ts (type)
        ├── components/home/DomainSelector.tsx  [CLIENT — page-specific]
        │   └── lib/catalog/semanticCatalog.ts (type)
        ├── components/ModeButton.tsx  [CLIENT — reusable domain]
        │   └── lib/catalog/semanticCatalog.ts (type)
        └── components/HighScoresModal.tsx  [CLIENT — modal/dialog]
            ├── react (useEffect, useMemo, useRef, useState, useSyncExternalStore)
            ├── lucide-react (AlertTriangle, Trophy, X)
            ├── lib/catalog/semanticCatalog.ts (SEMANTIC_CATEGORIES)
            ├── lib/highScores/types.ts
            └── lib/highScores/storage.ts  [BEHAVIOR/PERSISTENCE INFRA]
                ├── lib/catalog/semanticCatalog.ts
                └── lib/highScores/types.ts

app/game/layout.tsx  [SERVER]
└── (shared dark canvas wrapper)

app/game/[mode]/page.tsx  [SERVER — async dispatcher]
├── next/navigation (notFound, redirect)
├── lib/catalog/routeAuthorization.ts  [SHARED INFRA]
│   ├── lib/catalog/availability.ts
│   └── lib/catalog/semanticCatalog.ts
├── lib/api/index.ts  [SERVER-ONLY DISPATCHER]
│   ├── types/game.ts (CategoryId)
│   ├── types/api.ts (GameItem)
│   ├── lib/api/tmdb.ts
│   ├── lib/api/steamspy.ts
│   ├── lib/api/steamspy_ratings.ts
│   ├── lib/api/worldbank.ts
│   ├── lib/api/musicbrainz.ts
│   ├── lib/api/albumReleaseDateSnapshot.ts
│   ├── lib/api/artistAlbumCountsSnapshot.ts
│   ├── lib/api/youtube.ts
│   └── lib/api/igdb.ts
├── components/game/DerivedGameState.tsx  [SERVER — reusable state UI]
│   └── lucide-react (ArrowLeft, LoaderCircle, TriangleAlert)
├── components/game/ClassicGame.tsx  [CLIENT — domain gameplay]
│   ├── react (useEffect, useCallback, useRef, useState, useSyncExternalStore)
│   ├── next/link
│   ├── lucide-react (ArrowLeft)
│   ├── types/api.ts (GameItem)
│   ├── types/game.ts (SemanticCategoryId)
│   ├── components/game/GameCard.tsx  [CLIENT — reusable domain]
│   │   ├── react (useState)
│   │   ├── types/api.ts
│   │   └── components/game/GameplayShell.tsx (type GameplayMode)
│   ├── components/game/GameplayShell.tsx  [SERVER — reusable chrome]
│   │   ├── next/link
│   │   └── lucide-react (ArrowLeft)
│   ├── components/game/ComparisonBoard.tsx  [SERVER — reusable layout]
│   ├── components/game/GameplayDivider.tsx  [SERVER — reusable layout]
│   ├── components/game/DecisionControls.tsx  [SERVER — reusable controls]
│   ├── components/game/GameplayStatus.tsx  [SERVER — reusable metric]
│   ├── components/game/DerivedGameState.tsx
│   ├── lib/highScores/storage.ts
│   └── lib/game/deck.ts  [SHARED PURE HELPERS]
│       └── types/api.ts
└── components/game/TimeAttackGame.tsx  [CLIENT — domain gameplay]
    ├── (same component set as ClassicGame)
    ├── lucide-react (ArrowLeft, Timer)
    ├── lib/highScores/storage.ts
    └── lib/game/deck.ts

app/game/classic/page.tsx  [SERVER]  → same graph as [mode] (ClassicGame branch)
app/game/time-attack/page.tsx  [SERVER]  → same graph as [mode] (TimeAttackGame branch)
```

### Module Classification

- **Shared application infrastructure**: [`lib/catalog/semanticCatalog.ts`](lib/catalog/semanticCatalog.ts:1), [`lib/catalog/availability.ts`](lib/catalog/availability.ts:1), [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts:1), [`lib/api/index.ts`](lib/api/index.ts:1), [`types/api.ts`](types/api.ts:1), [`types/game.ts`](types/game.ts:1).
- **Page-specific implementation**: [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:1), [`components/home/CategorySelector.tsx`](components/home/CategorySelector.tsx:1), [`components/home/DomainSelector.tsx`](components/home/DomainSelector.tsx:1).
- **Reusable UI primitives**: [`components/ui/button.tsx`](components/ui/button.tsx:1) (shadcn). **Repository Fact** — `Button` is **not imported by any traced page/component**; it is currently unused in the rendered graph.
- **Domain-specific components**: [`components/CategoryCard.tsx`](components/CategoryCard.tsx:1), [`components/ModeButton.tsx`](components/ModeButton.tsx:1), [`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:1), [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:1), [`components/game/GameCard.tsx`](components/game/GameCard.tsx:1), [`components/game/ComparisonBoard.tsx`](components/game/ComparisonBoard.tsx:1), [`components/game/DecisionControls.tsx`](components/game/DecisionControls.tsx:1), [`components/game/GameplayShell.tsx`](components/game/GameplayShell.tsx:1), [`components/game/GameplayStatus.tsx`](components/game/GameplayStatus.tsx:1), [`components/game/GameplayDivider.tsx`](components/game/GameplayDivider.tsx:1), [`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx:1).
- **Styling infrastructure**: [`app/globals.css`](app/globals.css:1) (tokens, `@theme inline`, utility classes, keyframes).
- **Behavior/interaction infrastructure**: [`lib/highScores/storage.ts`](lib/highScores/storage.ts:1) (localStorage + `useSyncExternalStore` subscription), [`lib/game/deck.ts`](lib/game/deck.ts:1) (pure deck helpers), [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:1) (native `<dialog>` modal).
- **Modal/dialog dependencies**: [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:1) uses a native `<dialog>` element with `showModal()`/`close()` ([`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:41), [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:63)). Game-over overlays in both games are custom `role="dialog"` divs, not native dialogs ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:246), [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:392)).

### Client vs. Server Boundaries

**Repository Fact** — `"use client"` directives found in exactly 9 files: [`components/CategoryCard.tsx`](components/CategoryCard.tsx:1), [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:1), [`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:16), [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:20), [`components/game/GameCard.tsx`](components/game/GameCard.tsx:1), [`components/home/CategorySelector.tsx`](components/home/CategorySelector.tsx:1), [`components/home/DomainSelector.tsx`](components/home/DomainSelector.tsx:1), [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:1), [`components/ModeButton.tsx`](components/ModeButton.tsx:1).

**Repository Fact** — Server components (no directive): [`app/layout.tsx`](app/layout.tsx:1), [`app/page.tsx`](app/page.tsx:1), [`app/game/layout.tsx`](app/game/layout.tsx:1), [`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:1), [`app/game/classic/page.tsx`](app/game/classic/page.tsx:1), [`app/game/time-attack/page.tsx`](app/game/time-attack/page.tsx:1), [`components/game/GameplayShell.tsx`](components/game/GameplayShell.tsx:1), [`components/game/ComparisonBoard.tsx`](components/game/ComparisonBoard.tsx:1), [`components/game/DecisionControls.tsx`](components/game/DecisionControls.tsx:1), [`components/game/GameplayStatus.tsx`](components/game/GameplayStatus.tsx:1), [`components/game/GameplayDivider.tsx`](components/game/GameplayDivider.tsx:1), [`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx:1), [`components/ui/button.tsx`](components/ui/button.tsx:1).

**Repository Fact** — `lib/highScores/storage.ts` is imported by client components but has no `"use client"` directive; it guards browser access with `typeof window === "undefined"` ([`lib/highScores/storage.ts`](lib/highScores/storage.ts:43), [`lib/highScores/storage.ts`](lib/highScores/storage.ts:84)).

**Repository Fact** — `lib/api/index.ts` is server-only (imports provider adapters that read private env values) and is imported only by server route pages ([`lib/api/index.ts`](lib/api/index.ts:1), [`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:3)).

---

## 4. Route and Layout Map

| Route | File | Type | Client/Server | Notes |
|-------|------|------|---------------|-------|
| `/` | [`app/page.tsx`](app/page.tsx:1) | page | Server | Renders client `HomeSetup` |
| (root) | [`app/layout.tsx`](app/layout.tsx:1) | layout | Server | Font, metadata, `<html class="dark">` |
| `/game/*` | [`app/game/layout.tsx`](app/game/layout.tsx:1) | nested layout | Server | Dark canvas wrapper |
| `/game/[mode]` | [`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:1) | dynamic page | Server (async) | Dispatcher; `notFound()`/`redirect()` |
| `/game/classic` | [`app/game/classic/page.tsx`](app/game/classic/page.tsx:1) | static page | Server | Concrete Classic route |
| `/game/time-attack` | [`app/game/time-attack/page.tsx`](app/game/time-attack/page.tsx:1) | static page | Server | Concrete Time Attack route |
| `/api/test-fetch` | [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1) | route handler | Server | Diagnostic |

**Repository Fact** — No route groups (no `(group)` directories) observed.

**Repository Fact** — No `loading.tsx`, `error.tsx`, or `not-found.tsx` files observed. **Inference**: loading/error/not-found states are handled in-component via [`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx:1) (`loading`, `empty`, `unavailable`, `setup-incomplete`, `error` kinds) and Next.js defaults, not route-level files.

**Repository Fact** — No modal routes (no intercepting/parallel routes) observed. The only modal is the in-page native `<dialog>` in [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:1).

**Repository Fact** — Dynamic route uses typed `PageProps<"/game/[mode]">` ([`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:15)).

### Route Authorization Flow

**Repository Fact** — All three game routes call `authorizeGameRoute(mode, category)` before any provider dispatch; `missing-category` → `redirect("/")`; `invalid-category`/`unsupported-mode`/`incompatible-mode` → `notFound()`; `unavailable` → `DerivedGameState kind="unavailable"` ([`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:18), [`app/game/classic/page.tsx`](app/game/classic/page.tsx:15), [`app/game/time-attack/page.tsx`](app/game/time-attack/page.tsx:15)).

**Repository Fact** — Provider fetch is wrapped in try/catch → `DerivedGameState kind="error"`; `< 2` items → `kind="empty"` ([`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:35)).

### UI Convention Consistency

**Repository Fact** — Two distinct UI conventions coexist:
1. **Home setup** ([`components/home/*`](components/home/HomeSetup.tsx:1), [`components/CategoryCard.tsx`](components/CategoryCard.tsx:1), [`components/ModeButton.tsx`](components/ModeButton.tsx:1)): custom radio-group patterns using `sr-only` inputs + `peer` styling, `role="radiogroup"`, `fieldset`/`legend`, and CSS-variable-driven accent colors.
2. **Gameplay** ([`components/game/*`](components/game/GameplayShell.tsx:1)): a shared `GameplayShell` chrome with `data-gameplay-mode` attribute and a `--gameplay-accent` inline CSS variable ([`components/game/GameplayShell.tsx`](components/game/GameplayShell.tsx:45)).

**Repository Fact** — The shadcn `Button` primitive ([`components/ui/button.tsx`](components/ui/button.tsx:1)) uses shadcn token classes (`bg-primary`, `text-primary-foreground`, `ring-ring`) that are **not defined** in [`app/globals.css`](app/globals.css:1) (which defines `--surface-background`, `--accent-*`, etc.). **Inference**: the shadcn primitive is stylistically disconnected from the app's custom token system and is unused.

**Repository Fact** — Inline `style` with CSS custom properties is used in [`components/game/GameplayShell.tsx`](components/game/GameplayShell.tsx:47) and [`components/game/GameCard.tsx`](components/game/GameCard.tsx:43).

**Repository Fact** — Native `<img>` is used intentionally in [`components/game/GameCard.tsx`](components/game/GameCard.tsx:59) with an eslint-disable comment.

### Observed Discrepancies (recorded, not defects to fix)

**Repository Fact** — [`types/game.ts`](types/game.ts:6) still defines a legacy `CategoryId` union (`movie-ratings`, `game-playerbase`, etc.) and legacy `CATEGORIES`/`GAME_MODES` arrays ([`types/game.ts`](types/game.ts:54), [`types/game.ts`](types/game.ts:86)) separate from the semantic catalog in [`lib/catalog/semanticCatalog.ts`](lib/catalog/semanticCatalog.ts:1). The dispatcher [`lib/api/index.ts`](lib/api/index.ts:39) keys off the legacy `CategoryId` while routes authorize against semantic IDs and map via `resolveProviderCategory`.

**Repository Fact** — [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:1) reads/clears via the unified `higherlower.highscores.v1` envelope ([`lib/highScores/storage.ts`](lib/highScores/storage.ts:12)) and migrates legacy namespaces ([`lib/highScores/storage.ts`](lib/highScores/storage.ts:16)); this differs from the older governance note describing a Classic-only namespace split. **Needs Verification** `[inferred-from-codebase]` — the current storage layer appears to have unified the namespaces, but the governance reference still records the split.

---

## 5. Current UI/UX Architecture

### 5.1 Shared UI & Interaction Patterns (Step 5)

**Repository Fact** — Only one shadcn primitive exists ([`components/ui/button.tsx`](components/ui/button.tsx:1)) and it is **not imported by any feature component** — effectively unused. Every interactive control is hand-rolled `<button>`/`<label>`+radio with inline Tailwind (e.g. Go CTA [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:201), decision buttons [`components/game/DecisionControls.tsx`](components/game/DecisionControls.tsx:30), modal controls [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:161)).

**Repository Fact** — Legacy CSS button classes `.btn-primary`/`.btn-gold` exist ([`app/globals.css`](app/globals.css:182), [`app/globals.css`](app/globals.css:206)) but are referenced by no component (dead).

**Repository Fact** — Three selector systems share one visual grammar (native `sr-only` radio + `peer` ring + magenta dot + text-shadow): domain [`components/home/DomainSelector.tsx`](components/home/DomainSelector.tsx:64), category [`components/CategoryCard.tsx`](components/CategoryCard.tsx:22), mode [`components/ModeButton.tsx`](components/ModeButton.tsx:44). Classification: **partially standardized** (repeated by copy, not extracted).

**Repository Fact** — Two divergent dialog implementations: native `<dialog>` with `showModal()`/focus-to-close/Escape ([`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:125), [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:59)) vs. hand-rolled `role="dialog" aria-modal="true"` div with **no focus trap and no Escape** ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:246), [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:392)). Classification: **inconsistent**.

**Repository Fact** — Navigation is framework-native (`next/link` + `useRouter().push`) ([`components/game/GameplayShell.tsx`](components/game/GameplayShell.tsx:54), [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:95)). Classification: **centralized**.

**Repository Fact** — No `<form>` elements; selection is radio-group state. Destructive clears use inline two-step confirmation panels styled with `--status-error` ([`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:269), [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:320)). Classification: **intentionally custom / partially standardized**.

**Repository Fact** — No tooltips exist; disabled modes/categories convey state via inline text ("Coming Soon" [`components/ModeButton.tsx`](components/ModeButton.tsx:66), "Unavailable" [`components/CategoryCard.tsx`](components/CategoryCard.tsx:45)). Classification: **undocumented (gap)**.

**Repository Fact** — A single shared state component covers loading/empty/unavailable/setup-incomplete/error ([`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx:4)). Classification: **centralized**. However `kind="loading"` is **never rendered** and no `loading.tsx` exists — **undocumented gap**.

**Repository Fact** — Success feedback is inline via `role="status" aria-live="polite"` ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:204), [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:373)). No toast/snackbar system. Classification: **partially standardized / intentionally custom**.

### 5.2 Styling & Design System (Step 6)

**Repository Fact** — `design-reference/` is the visual authority; evidence priority is task decisions → screenshots → Figma CSS → normalized notes → current implementation as baseline only ([`design-reference/notes/source-provenance.md`](design-reference/notes/source-provenance.md:27)). "Do not use the current codebase to infer target visuals" ([`design-reference/notes/reconciliation-rules.md`](design-reference/notes/reconciliation-rules.md:15)).

**Repository Fact** — Single CSS-first entry [`app/globals.css`](app/globals.css:1); tokens in `:root` ([`app/globals.css`](app/globals.css:4)) exposed via `@theme inline` ([`app/globals.css`](app/globals.css:72)). No `tailwind.config.*`.

**Repository Fact** — Three token layers coexist: semantic redesign tokens ([`app/globals.css`](app/globals.css:8)), compatibility aliases marked "to be removed when the old surfaces are migrated" ([`app/globals.css`](app/globals.css:45)), and a semantic-role alias layer ([`app/globals.css`](app/globals.css:22)). Components consume a mix of all three. Classification: **partially standardized / mid-migration**.

**Repository Fact** — Implementation-defined tokens are explicitly labeled: spacing/radius/focus ([`app/globals.css`](app/globals.css:58)); `--space-section` derived from Figma frame gaps as a clamp ([`app/globals.css`](app/globals.css:60)).

**Repository Fact** — Space Mono is the product typeface via `next/font/google` ([`app/layout.tsx`](app/layout.tsx:5)), wired into `--font-sans`/`--font-display` ([`app/globals.css`](app/globals.css:75)); confirmed by [`design-reference/tokens/typography.md`](design-reference/tokens/typography.md:5). The Figma type scale is **not** tokenized; components use ad-hoc Tailwind sizes. Classification: **implementation-defined**.

**Repository Fact** — Palette matches [`design-reference/tokens/colors.md`](design-reference/tokens/colors.md:7). The signature "offset backing layer" is implemented two ways: `box-shadow` ([`components/game/GameCard.tsx`](components/game/GameCard.tsx:56)) vs. translated sibling div ([`components/game/GameCard.tsx`](components/game/GameCard.tsx:52), [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:208)). Classification: **inconsistent**.

**Repository Fact** — Radii hard-coded in places (`rounded-[2.25rem]` [`components/game/GameCard.tsx`](components/game/GameCard.tsx:54) duplicates `--radius-card`). `--elevation-card` is defined ([`app/globals.css`](app/globals.css:38)) but unreferenced (dead token).

**Repository Fact** — Dark-only: `color-scheme: dark` ([`app/globals.css`](app/globals.css:5)) and hard-coded `dark` class ([`app/layout.tsx`](app/layout.tsx:36)). No theme toggle despite a theme-control icon in the design. **Needs Verification [product-decision]** ([`design-reference/notes/open-questions.md`](design-reference/notes/open-questions.md:9)).

**Repository Fact** — Native `<img>` with `object-cover`, `loading="eager"`, `onError` fallback ([`components/game/GameCard.tsx`](components/game/GameCard.tsx:57)). Classification: **intentionally custom**.

### 5.3 Accessibility & Interaction States (Step 7)

**Repository Fact** — Good semantic coverage: `<dialog>`, `<fieldset>/<legend>`, `<article>`, `<section aria-label>`, `<ol>/<li>` ([`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:125), [`components/home/DomainSelector.tsx`](components/home/DomainSelector.tsx:45), [`components/game/GameCard.tsx`](components/game/GameCard.tsx:40), [`components/game/ComparisonBoard.tsx`](components/game/ComparisonBoard.tsx:23)).

**Repository Fact** — ARIA: `role="radiogroup"`+`aria-labelledby` ([`components/home/CategorySelector.tsx`](components/home/CategorySelector.tsx:32)); `role="tablist"/"tab"/"tabpanel"` ([`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:174)); `role="progressbar"` with `aria-valuemin/max/now` ([`components/game/GameplayStatus.tsx`](components/game/GameplayStatus.tsx:36)); `role="timer"` with dynamic `aria-live` ([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:310)). Decorative visuals correctly `aria-hidden="true"`.

**Repository Fact** — Global window-level `keydown` listeners for ArrowUp/h/ArrowDown/l in both modes ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:159), [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:250)); not scoped to a focused region.

**Repository Fact** — Escape closes the HighScores modal via `onCancel` ([`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:129)); game-over overlays have **no Escape handler**. Classification: **inconsistent**.

**Repository Fact** — Visible focus: global `:focus-visible` outline ([`app/globals.css`](app/globals.css:119)) plus per-component `focus-within`/`peer-focus-visible` rings. Classification: **centralized + partially standardized**.

**Repository Fact** — Focus management: HighScores modal moves focus to close button on open ([`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:64)); game-over overlays do **not** move or trap focus. Classification: **inconsistent (gap)**.

**Repository Fact** — Disabled states use `disabled` + `disabled:opacity-*`/`cursor-not-allowed` ([`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:205), [`components/game/DecisionControls.tsx`](components/game/DecisionControls.tsx:25)). Hover/active/selected states exist but category cards have **no hover feedback on the card body**. Classification: **partially standardized / inconsistent**.

**Repository Fact** — Touch targets `min-h-11`/`min-h-12` (44–48px) on most controls. Classification: **partially standardized**.

**Repository Fact** — Reduced motion: global CSS kill-switch ([`app/globals.css`](app/globals.css:124)) plus one `motion-reduce:animate-none` ([`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx:64)). Classification: **centralized (CSS-only)**.

**Repository Fact (source findings; pilot browser evidence available)** — Genuine gaps: game-over focus trap/Escape; no `loading.tsx`; no tooltip for disabled reasons. Browser inspection artifacts exist for the pilot, but these source findings were not thereby proven fixed or comprehensively runtime-verified.

### 5.4 Motion & Transition Architecture (Step 8)

**Repository Fact (historical baseline; superseded by pilot)** — `motion@^14.1.0` is an app dependency ([`package.json`](package.json:18)) and is now imported by the home pilot ([`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:6)). The earlier search found no imports before that pilot. Classification: **installed and used in the pilot**, not evidence of a product-wide motion language or mandatory animation direction.

**Repository Fact** — Eight keyframes defined ([`app/globals.css`](app/globals.css:237)): `pulse-ring`, `shimmer`, `fadeInUp`, `fadeInScale`, `orb-float`, `shake`, `timer-urgent`, `floatUp`. Only **two** are applied: `.shake` ([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:344)) and `.float-up` ([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:321)). The other six are **dead utilities**.

**Repository Fact** — `.timer-urgent` is purpose-built for the ≤10s urgent state but is **not applied**; the urgent state only changes text color ([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:313)). Classification: **inconsistent (dead utility + unused intent)**.

**Repository Fact** — Transitions are inline/ad-hoc (`transition-transform`, `transition-[width]`, `transition-opacity`, `transition-[text-shadow,color]`). Legacy `.glass-hover` transition is dead ([`app/globals.css`](app/globals.css:153)).

**Repository Fact** — No entrance/exit/layout animation. Card swap is a hard remount via `key={currentItem.id}` ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:214)). Classification: **intentionally absent** (no design reference supplied — [`design-reference/notes/open-questions.md`](design-reference/notes/open-questions.md:16)).

**Repository Fact** — Feedback animation is mode-specific: Time Attack wrong-answer `shake` (460ms) + floating `+3s`/`−5s`; Classic has **no** equivalent. Classification: **inconsistent**.

**Repository Fact** — Timing constants are explicit and mode-owned: Classic reveal `1500ms` ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:142)); Time Attack `REVEAL_MS_CORRECT=800`, `REVEAL_MS_WRONG=400`, `BONUS_CORRECT=3`, `PENALTY_WRONG=5` ([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:49)).

**Inference** — The pre-pilot assessment found no coherent motion language and described motion as implementation-defined. The pilot now uses the app's `motion` library for a reduced-motion-aware, scroll-linked home-hero transform ([`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:6)); this establishes actual use, not a product-wide motion language or a motion mandate. Keep the broader language assessment as an inference, not a finding that the library is unused. **Needs Verification [product-decision]** — whether card-swap animation may consume part of the reveal window ([`ui-interaction-audit.md`](ui-interaction-audit.md:303)).

### 5.5 Responsiveness (Step 9)

**Repository Fact** — Standard Tailwind mobile-first breakpoints (`sm:`/`md:`/`lg:`); no custom breakpoints. Classification: **centralized (framework defaults)**.

**Repository Fact** — Mobile-first: base single-column, enhanced upward (mode grid `grid gap-2 sm:grid-cols-2 lg:grid-cols-3` [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:174); comparison board `grid-cols-1 ... md:grid-cols-2` [`components/game/ComparisonBoard.tsx`](components/game/ComparisonBoard.tsx:25)).

**Repository Fact** — Layout transformations: decision controls shift `md:ml-auto md:mr-0 md:w-1/2` ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:239)); category card splits at `sm` ([`components/CategoryCard.tsx`](components/CategoryCard.tsx:39)). Classification: **implementation-defined**.

**Repository Fact** — No mobile-specific navigation; gameplay header is a single responsive bar ([`components/game/GameplayShell.tsx`](components/game/GameplayShell.tsx:49)).

**Repository Fact** — Touch sizing `min-h-11`/`min-h-12`; overflow handled via `overflow-x-hidden` + `truncate` + `break-words` ([`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:101), [`components/game/GameplayShell.tsx`](components/game/GameplayShell.tsx:64), [`components/game/GameCard.tsx`](components/game/GameCard.tsx:94)). Classification: **partially standardized**.

**Repository Fact** — Fluid type via `clamp()` for hero ([`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:123)) and section spacing ([`app/globals.css`](app/globals.css:64)). Classification: **implementation-defined**.

**Repository Fact** — OR badge and divider are desktop-only (`hidden ... md:flex`/`md:block`) ([`components/game/ComparisonBoard.tsx`](components/game/ComparisonBoard.tsx:36), [`components/game/GameplayDivider.tsx`](components/game/GameplayDivider.tsx:13)). Modal is fluid `w-[min(94vw,48rem)]` ([`components/HighScoresModal.tsx`](components/HighScoresModal.tsx:136)). Gameplay uses `min-h-dvh` shells.

**Repository Fact** — No responsive layouts were supplied by the designer; desktop Figma is authoritative and responsive is explicitly implementation-defined ([`design-reference/notes/responsiveness.md`](design-reference/notes/responsiveness.md:3)). **Needs Verification [product-decision]** — whether any tablet composition is designer-approved ([`design-reference/notes/responsiveness.md`](design-reference/notes/responsiveness.md:13)).

### 5.6 Cross-cutting Notes

**Repository Fact** — `ui-interaction-audit.md` claims (dead CSS list, `home-go` dead class, motion installed-but-unused, no `loading.tsx`, game-over lacks focus trap) were independently re-verified against source at the time and confirmed. The motion-installed-but-unused item is historical and superseded by the pilot import in [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:6); the audit remains descriptive context only, not authorization.

**Repository Fact** — `home-go` class on the Go button ([`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:205)) has no CSS definition (dead class).

**Repository Fact (pilot evidence)** — Rendered-browser inspection was performed in the current pilot: `.playwright-mcp/` contains page snapshots, viewport screenshots, and console logs. The stored snapshot is evidence of rendered accessibility-tree output, not by itself proof of human perceptual acceptance or comprehensive error-free runtime behavior. Build/lint status is not established by these artifacts.

---

## 6. Existing Workflow Assessment

### Confirmed Rules

**Repository Fact** — Proportional pipeline: Analysis → Design → Plan → Code → QA → Postfix → Reconciliation → Documentation; stages skipped when not applicable but the skip must be recorded ([`.roo/rules/02-workflow.md`](.roo/rules/02-workflow.md:24)).

**Repository Fact** — Conditions self-gate by trigger ([`.roo/rules/governance/conditions/*`](.roo/rules/governance/conditions/analysis.md:8)):

| Stage | Classification | Trigger |
|-------|---------------|---------|
| Analysis | Conditionally required | Non-trivial code understanding needed before changing it |
| Design | Conditionally required | **Only when visual output changes** |
| Plan | Conditionally required | Anything beyond a trivial edit |
| Code | Conditionally required | Edits are required |
| QA | Conditionally required | Proportional to risk |
| Postfix | Optional (event-driven) | Only after QA/verification finds a defect |
| Reconciliation | Optional (event-driven) | Only after a merge/pull produces conflicts |
| Documentation | Conditionally required | After implementation/verification/postfix/reconciliation, or a docs-only task, when a handoff is needed |

**Repository Fact** — Cross-cutting always-on requirements: authority ladder ([`.roo/rules/00-governance.md`](.roo/rules/00-governance.md:14)); evidence-over-assertion with status vocabulary and uncertainty labels ([`.roo/rules/03-evidence-and-verification.md`](.roo/rules/03-evidence-and-verification.md:8)); per-session capability discovery ([`.roo/rules/04-tools-and-escalation.md`](.roo/rules/04-tools-and-escalation.md:8)); UI design-system constraints ([`.roo/rules/ui-design-system.md`](.roo/rules/ui-design-system.md:1)).

**Repository Fact** — Stages unnecessary for a small localized UI fix: Reconciliation and Postfix (self-gating, event-driven). Design applies whenever visual output changes; Plan applies unless the edit is genuinely trivial.

**Inference** — Minimum viable pipeline for a small localized UI fix: Analysis (brief) → Design (if a new visual decision exists) → Code → QA (read-back or rendered check) → Documentation (concise handoff). Plan/Postfix/Reconciliation skipped, each skip recorded.

### Inferred Conventions

The earlier inference that no explicit dirty-file protection policy exists is superseded by [`.roo/rules/00-governance.md`](.roo/rules/00-governance.md:34) (see §2.6).

**Repository Fact** — Browser verification for visual changes is expected when a browser is available ([`.roo/rules/03-evidence-and-verification.md`](.roo/rules/03-evidence-and-verification.md:16)). The app has no Playwright package, but the pilot's Playwright MCP tools and `.playwright-mcp/` artifacts demonstrate browser verification was available and used in that pilot. Availability remains capability-gated per session; do not infer absence from the app manifest or guaranteed availability from this pilot.

### Missing Guidance

**Repository Fact** — No dedicated rule for skill/tool routing, design-authority precedence as an explicit always-on rule (it lives in task docs and design-reference notes), or accessibility/motion/responsive requirements as standalone always-on rules (they are embedded in [`high-low-redesign-plan.md`](high-low-redesign-plan.md:468) and [`ui-design-system.md`](.roo/rules/ui-design-system.md:1)). Dirty-file protection is explicitly covered by [`.roo/rules/00-governance.md`](.roo/rules/00-governance.md:34) and is not a gap.

### Conflicting Guidance

**Repository Fact** — Two authority ladders (governance vs. provider prompt) — different scopes, not a hard conflict (see §2.9).

**Repository Fact** — README typeface (Geist) vs. design authority (Space Mono) — low impact (see §2.9).

---

## 7. Proposed Skill Stack Assessment

### 7.1 Playwright MCP

- **Role:** Rendered-interface inspection, responsive viewport testing, interaction verification, navigation verification, hover/focus/pressed-state inspection, modal/dialog behavior, console/runtime issue detection, post-implementation browser verification.
- **Codebase fit:** **Strong as a session/tool capability, not an app dependency.** No Playwright package is listed in `package.json`; however, current pilot evidence (`.playwright-mcp/` page snapshots, screenshots, console logs) and available session tools establish that Playwright MCP browser inspection was available and used in this pilot. It directly supports rendered checks required when a browser is available ([`.roo/rules/03-evidence-and-verification.md`](.roo/rules/03-evidence-and-verification.md:16)). Future-session availability is not implied.
- **Externally Verified** — Official Microsoft MCP server `@playwright/mcp` (Apache-2.0, latest observed 0.0.83, updated 2026-09-28). Operates on the accessibility tree / structured snapshots, not pixel screenshots by default. Core tools include `browser_snapshot`, `browser_find`, `browser_take_screenshot`, `browser_resize`, `browser_console_messages`, `browser_network_requests`, `browser_hover`. Install: `npx @playwright/mcp@latest`.
- **Overlap:** None with the other proposed skills; it is the only browser-verification tool.
- **Pilot evidence:** Snapshot and viewport artifacts confirm rendered page/viewport inspection. The session's Playwright tools include viewport resize, snapshot, screenshot, hover, and browser evaluation; focus can be inspected through keyboard interaction/evaluation, though no single dedicated focus-state tool is evidenced here.
- **Capability gaps:** **Needs Verification [environment-specific]** — whether equivalent MCP/browser capabilities will be available in future sessions. Full device emulation beyond resizing and exact focus-state coverage should be confirmed when a task specifically depends on them.
- **Risks:** Accessibility-tree-first design means pixel/visual-regression comparison is not its strength; screenshot-based visual diffing would need a separate tool.
- **Recommendation:** **Keep as an available session capability, not a guaranteed core installation.** Discover availability for each task/session; current pilot evidence supports its use here.

### 7.2 Impeccable

- **Role:** UI/UX critique, technical frontend audit, visual polish, responsive adaptation, frontend hardening, interaction-state quality, accessibility-aware design guidance.
- **Codebase fit:** **Strong as the primary general-purpose UI/UX skill.** The repo has real, documented UI gaps (dead CSS utilities, inconsistent dialog implementations, missing focus trap, no tooltips, mid-migration token layers) that a critique/audit/polish workflow targets directly.
- **Externally Verified** — Source [github.com/pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0). "1 skill, 24 commands, live browser iteration, 59 deterministic detector rules." Commands confirmed: `critique`, `audit`, `polish`, `harden`, `adapt`, `animate` (plus `craft`, `shape`, `bolder`, `quieter`, `distill`, `colorize`, `typeset`, `layout`, `delight`, `overdrive`, `clarify`, `optimize`, `live`, `generate`, `init`, `document`, `extract`, `onboard`). Install: `npx impeccable install` then `/impeccable init`.
- **Overlap:** Partial overlap with UI UX Pro Max in the review/audit space; overlaps with Emil Kowalski `animate`/`review-animations` on motion.
- **Capability gaps:** **Needs Verification** — detector-rule quality and live-mode behavior were not runtime-exercised.
- **Risks:** Its design opinions could conflict with the authoritative `design-reference/` if applied without the project's design-authority precedence. Must be constrained to implement against existing design evidence, not generate a new direction.
- **Recommendation:** **Keep** (core), with an explicit constraint to defer to `design-reference/` authority. Local skill presence is evidenced in this workspace; future sessions must still discover whether it is available.

### 7.3 UI UX Pro Max

- **Role:** Advisory UI/UX design knowledge, accessibility guidance, responsive design guidance, framework-specific UI recommendations, layout/interaction patterns, design-system guidance.
- **Codebase fit:** **Moderate.** It is a searchable knowledge database (styles, palettes, font pairings, UX guidelines, stack guidance). Much of its value (style/palette/font exploration) is **not needed** here because the project has an authoritative design reference and a locked theme. Its UX-guideline and stack-guidance portions are the useful subset.
- **Externally Verified** — Source [github.com/nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill). 79 searchable styles, 192 palettes, 74 font pairings, 119 UX guidelines, 105 icons, 17 GSAP presets, 25 chart types, 22 stacks; Python search script. Install: `npm install -g ui-ux-pro-max-cli` then `uipro init --ai <platform>`. Latest observed v2.15.0 (2026-08-13).
- **Overlap:** **Partial overlap confirmed** with Impeccable in review/audit/accessibility/responsive/typography/color/motion. UI UX Pro Max is a knowledge database; Impeccable is a command-driven workflow.
- **Capability gaps:** **Inference** — the exact overlap boundary is based on documented capability lists, not side-by-side testing.
- **Risks:** Its style/palette/font exploration could conflict with the locked theme and `design-reference/` authority. Its GSAP presets are irrelevant (the project uses CSS plus the `motion` library in the home pilot).
- **Recommendation:** **Optional** (advisory only), invoked for UX-guideline/stack questions, not for visual direction.

### 7.4 Emil Kowalski Motion Skills

- **Role:** Specialist motion expertise.
- **Externally Verified** — Source [github.com/emilkowalski/skills](https://github.com/emilkowalski/skills) (MIT). Install: `npx skills@latest add emilkowalski/skills`. All five requested skills confirmed distinct:
  - `animate` — builds an animation from scratch (curve, duration, properties).
  - `review-animations` — strict read-only review of a motion diff against a high craft bar.
  - `improve-animations` — codebase-wide audit producing prioritized, self-contained plans (read-only on source).
  - `find-animation-opportunities` — searches the UI for places that would benefit from motion, and what not to animate.
  - `animation-performance` — fixes animations that drop frames.
- **Codebase fit:** **Moderate-to-strong, but selective.** The repo has a small, partly-dead CSS motion layer (8 keyframes, 2 live), and the current pilot imports app dependency `motion` for reduced-motion-aware home-hero parallax ([`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:6)). This shows library use, but does not establish a coherent product-wide motion language. The design reference does not cover reveal/transition/game-over animation ([`design-reference/notes/open-questions.md`](design-reference/notes/open-questions.md:16)).
- **Overlap:** `animate`/`review-animations` overlap with Impeccable's `animate` command; `review-animations` remains user-invoked only per local skill metadata.
- **Capability gaps:** None identified for motion specifically.
- **Risks:** `improve-animations` and `find-animation-opportunities` are codebase-wide and disproportionate for small changes. Motion work must respect the existing reduced-motion kill-switch ([`app/globals.css`](app/globals.css:124)) and the project's `motion/react` convention ([`.roo/rules/ui-design-system.md`](.roo/rules/ui-design-system.md:118)).
- **Recommendation:** **Keep selectively** — `animate` for explicitly requested motion; `review-animations` only when the user invokes it (its installed skill declares `disable-model-invocation: true`); `animation-performance` optional (specialized); `improve-animations` and `find-animation-opportunities` optional (invoked only for explicit motion-discovery/audit tasks). The installed app package `motion` is separate from all these agent skills.

### 7.5 Taste Skill

- **Role:** Intentional visual redesign, stronger stylistic exploration, interfaces deliberately being reconceived.
- **Codebase fit:** **Weak / conflicting.** HigherLower is an app with an authoritative `design-reference/` (desktop Figma authoritative). Taste Skill is oriented toward greenfield public-facing pages and explicitly states it is "Not for dashboards or app screens."
- **Externally Verified (with ambiguity)** — Multiple repos share the name. Most prominent: [github.com/leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill). Default skill `design-taste-frontend` deals an art direction and runs a browser inspector at 1440/768/390px. Install: `/plugin marketplace add Leonxlnx/taste-skill` then `/plugin install taste-skill@taste-skill`.
- **Overlap:** Overlaps with Impeccable + UI UX Pro Max on visual polish.
- **Capability gaps:** **Needs Verification** — which "Taste Skill" repository is intended.
- **Risks:** Its "deal a direction and pick one" art-direction model would **conflict with the existing authoritative design reference** and the theme-preservation rule ([`.roo/rules/ui-design-system.md`](.roo/rules/ui-design-system.md:1)).
- **Recommendation:** **Do Not Install** for the normal workflow. **Needs Verification [product-decision]** if the owner ever intends a deliberate, design-authority-superseding redesign.

### 7.6 Accessibility Tooling (axe-core / @axe-core/playwright)

- **Role:** Automated accessibility verification.
- **Codebase fit:** **Moderate.** The repo has real a11y gaps (game-over focus trap/Escape, no tooltips for disabled reasons) but no test framework and no CI. axe-core detects only automatically detectable issues and does not replace manual review.
- **Externally Verified** — `axe-core` (MPL-2.0, latest observed 4.14.0, Deque Systems) and `@axe-core/playwright` (peer dep `playwright >= 1.0.0`). Playwright docs document `new AxeBuilder({ page }).analyze()` with `.withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])`. Install: `npm install axe-core --save-dev` / `npm install @axe-core/playwright`.
- **Overlap:** Complements Playwright MCP (which inspects the accessibility tree but does not run WCAG rule checks).
- **Capability gaps:** None for automated checks; manual/visual review still required.
- **Risks:** Introducing a test framework/CI is out of scope for this project ([`.roo/rules/01-project-boundaries.md`](.roo/rules/01-project-boundaries.md:60)); axe would be a dev dependency used ad hoc, not a CI gate.
- **Recommendation:** **Optional / defer** — a development dependency, not an agent skill; install only when an accessibility-sensitive task calls for it.

---

## 8. Skill Coverage Matrix

| Capability | Skill/tool | Coverage | Remaining gap |
|---|---|---|---|
| Broad UI/UX audit | Impeccable (`audit`/`critique`) | Mostly Covered | Detector-rule quality not runtime-verified; must defer to `design-reference/` authority |
| Visual polish | Impeccable (`polish`) + UI UX Pro Max (advisory) | Mostly Covered | UI UX Pro Max style/palette exploration conflicts with locked theme; use UX-guidance subset only |
| Accessibility guidance | Impeccable + UI UX Pro Max | Mostly Covered | Guidance only; no automated enforcement |
| Automated accessibility verification | axe-core / @axe-core/playwright (optional) | Partially Covered | Not installed; no test framework/CI; detects only automatically detectable issues |
| Interaction states | Impeccable (`harden`) + Playwright MCP if available | Mostly covered in pilot | No dedicated focus-state tool evidenced; future MCP availability is session-gated |
| Loading/error/success feedback | Impeccable (`audit`) + Playwright MCP | Mostly Covered | `loading` state never rendered; no `loading.tsx` (repo gap, not tool gap) |
| Responsive guidance | Impeccable (`adapt`) + UI UX Pro Max | Mostly Covered | Responsive is implementation-defined; no designer-approved spec |
| Responsive verification | Playwright MCP (`browser_resize`) if available | Viewport checks evidenced in pilot | Full device emulation beyond viewport resizing remains unverified |
| Design-system consistency | Impeccable (`audit`) | Mostly Covered | Mid-migration token layers; dead tokens/utilities are repo facts |
| Animation discovery | Emil `find-animation-opportunities` | Fully Covered | Codebase-wide; disproportionate for small changes |
| Animation implementation | Emil `animate` (+ Impeccable `animate`) | Fully Covered | Overlap between the two; pick one per task |
| Animation review | Emil `review-animations` (user-invoked only) | Covered by available skill | Skill metadata disables autonomous model invocation |
| Animation performance | Emil `animation-performance` | Fully Covered | Specialized; only for frame-drop/scroll-linked work |
| Browser verification | Playwright MCP (pilot session capability) | Covered in pilot; future availability is session-gated | Accessibility-tree snapshots and viewport screenshots exist; not evidence of pixel-diff tooling or perceptual acceptance |

---

## 9. Skill Sufficiency Verdict

### Is the proposed stack already sufficient?

**Yes — sufficient with minor additions, subject to session capability discovery.**

**Reasoning:**

- **Playwright MCP** supports browser-level verification (rendered inspection, console/network, resize, hover). Although the app manifest has no browser-automation package, pilot artifacts and current-session tools prove this capability was available and used in the pilot. Its future availability remains session/environment-specific; it is not a package gap to solve by adding an app dependency.
- **Impeccable** covers broad UI/UX audit, visual polish, hardening, adaptation, and interaction-state quality — matching the repo's documented UI gaps (dead CSS utilities, inconsistent dialogs, missing focus trap, mid-migration tokens).
- **UI UX Pro Max** adds advisory UX-guideline/stack knowledge but is largely redundant with Impeccable for this project, and its style/palette/font exploration conflicts with the locked theme and `design-reference/` authority. It is optional, not core.
- **Emil Kowalski motion skills** cover motion discovery, implementation, review, and performance. The app's `motion` package is now used in the home pilot, while a coherent product-wide motion language is still not established. App-library use does not replace specialist skills; only a subset is needed routinely.
- **Taste Skill** is not needed and would conflict with the authoritative design reference.
- **axe-core / @axe-core/playwright** would fill a real automated-a11y gap, but the project has no test framework or CI, so it is a deferred dev dependency rather than an immediate need.

**Minor additions justified:** (1) use Playwright MCP for browser verification when available (pilot use is evidenced; no app package addition); (2) a selective subset of the Emil motion skills; (3) axe-core as an optional, deferred dev dependency for accessibility-sensitive tasks. No additional UI/UX *skill* beyond the proposed set is required.

**Genuine remaining capability gaps (not tool gaps):** the repo's own UI inconsistencies (dead utilities/tokens, divergent dialogs, missing focus trap, no `loading.tsx`) are implementation gaps that the proposed skills can *find and fix*, not coverage gaps in the stack itself. Human perceptual/UX acceptance remains separate from technical browser verification and must be marked not assessed unless a human review is actually recorded.

---

## 10. Recommended Final Skill Stack

| Skill / Tool | Role | Core / Optional | Trigger | Avoid When | Recommendation |
|---|---|---|---|---|---|
| Playwright MCP | Browser verification (MCP/session capability; not app dependency) | Use when available | Visual/interaction change needing a rendered check | Pure logic/docs changes; do not assume future-session availability | Keep as session tool |
| Impeccable | Primary UI/UX audit/polish/harden/adapt | Core | Broad UI audit, visual polish, hardening, responsive adaptation | Trivial localized fix with a known value | Keep |
| UI UX Pro Max | Advisory UX/stack knowledge | Optional | UX-guideline or stack-specific questions | Visual direction / style exploration | Optional |
| Emil `animate` | Motion implementation | Optional specialist | Task explicitly requests motion | No motion requested | Keep selectively |
| Emil `review-animations` | Motion review | User-invoked only | User explicitly requests this specialist review | Autonomous routing; no motion review requested | Keep available, do not auto-route |
| Emil `improve-animations` | Codebase-wide motion audit + plans | Optional | Explicit motion-system audit | Small localized change | Optional |
| Emil `find-animation-opportunities` | Motion discovery | Optional | "Make this feel more alive" style requests | Motion already specified | Optional |
| Emil `animation-performance` | Frame-drop/scroll-linked perf | Optional (specialized) | Continuous/expensive/scroll-linked animation | Simple one-shot transitions | Optional |
| Taste Skill | Visual redesign exploration | Do Not Install | — | — | Do Not Install |
| axe-core / @axe-core/playwright | Automated a11y checks | Optional (dev dep) | Accessibility-sensitive task | Normal UI changes | Optional / defer |

**Smallest complementary stack:** Impeccable (core) plus Playwright MCP when available; Emil `animate` selectively for requested motion and `review-animations` only on user invocation. UI UX Pro Max / axe-core / the remaining Emil skills stay optional.

---

## 11. Task-to-Skill Routing Matrix

| Task type | Preferred skill/tool | Supporting tool | Verification |
|---|---|---|---|
| Localized UI fix | None (direct edit) | Impeccable `polish` only if polish is the goal | Read-back; Playwright MCP if available and rendered check needed |
| Broad UI audit | Impeccable `audit`/`critique` | UI UX Pro Max (advisory) | Playwright MCP rendered inspection if available |
| Visual polish | Impeccable `polish` | UI UX Pro Max (advisory) | Playwright MCP if available; record perceptual acceptance separately |
| Responsive work | Impeccable `adapt` | UI UX Pro Max (advisory) | Playwright MCP resize if available; capability is session-specific |
| Explicit animation request | Emil `animate` | Impeccable `animate` (alternative) | Browser check if available; perceptual acceptance by human reviewer when available |
| Motion discovery | Emil `find-animation-opportunities` | — | Browser inspection if available |
| Motion audit | Emil `improve-animations` | Impeccable `audit` | Source read-back; browser if behavior/perception matters and available |
| Animation review | Emil `review-animations` (only when user invokes) | — | Source read-back; human perceptual acceptance is separate |
| Accessibility audit | Impeccable `audit` + `harden` | axe-core (optional) | Playwright MCP + axe-core if available; manual checks remain necessary |
| Exact design implementation | None (implement against `design-reference/`) | Impeccable `audit` for consistency check | Playwright MCP if available vs. design-reference screens |
| Intentional redesign | **Needs Verification [product-decision]** | — | — |

---

## 12. Proposed Workflow Integration

The recommended skills slot into the repository's existing proportional pipeline ([`.roo/rules/02-workflow.md`](.roo/rules/02-workflow.md:24)) without imposing a new workflow. Skills are invoked *within* existing stages, not as new stages.

- **Trivial/local change:** Analysis (brief) → Code → QA (read-back). No specialist skill required. Playwright MCP only if available and a rendered check is warranted.
- **Normal feature:** Analysis → Plan → Code → QA. Impeccable `audit`/`polish` optional; Playwright MCP for rendered verification when available.
- **Ambiguous design change:** Analysis → Design (per design condition) → Plan → Code → QA. Impeccable `audit` for consistency; defer to `design-reference/` authority; flag unresolved visual decisions as `Needs Verification [product-decision]`.
- **Large redesign:** Analysis → Design → Plan → Code → QA → Documentation. Impeccable `audit`/`polish`/`harden`/`adapt`; Playwright MCP across viewports if available. Taste Skill remains out unless the owner explicitly supersedes design authority.
- **Motion-specific work:** Analysis → (motion design) → Code → QA. Emil `animate` for implementation; `review-animations` only when user-invoked; `animation-performance` only for expensive/scroll-linked motion. Respect the reduced-motion kill-switch ([`app/globals.css`](app/globals.css:124)).
- **Responsive work:** Analysis → Design (implementation-defined) → Code → QA. Impeccable `adapt` + Playwright MCP `browser_resize` if available.
- **Audit-only work:** Read-only. Impeccable `audit`/`critique`; Emil `improve-animations` for motion; no code changes (QA condition: QA does not modify code).

**Constraint:** every skill invocation must still honor the always-on rules — scope discipline, allowlists, evidence-over-assertion, and design-authority precedence. Skills do not override governance.

---

## 13. Recommended Installation Procedure

> **Not executed during this task.** Commands below were verified externally (Exa MCP, primary sources, 2026-10-15) but were NOT run. Do not install without owner approval.

### Agent Skills

| Skill | Verified install command | Scope | Rationale |
|---|---|---|---|
| Impeccable | `npx impeccable install` then `/impeccable init` | Project-local | UI conventions are project-specific; keeps the skill aligned with `design-reference/` |
| Emil motion skills | `npx skills@latest add emilkowalski/skills` | Project-local | Motion conventions are project-specific |
| UI UX Pro Max (optional) | `npm install -g ui-ux-pro-max-cli` then `uipro init --ai <platform>` | Project-local | Advisory only; avoid global unless reused across projects |

### MCPs

| MCP | Verified install command | Rationale |
|---|---|---|
| Playwright MCP | `npx @playwright/mcp@latest` (or `claude mcp add playwright npx @playwright/mcp@latest`) | Optional setup guidance only; pilot already demonstrates session capability. Not an app dependency and not a claim that future sessions require installation. |

### Development Dependencies

| Package | Verified install command | Rationale |
|---|---|---|
| axe-core (optional) | `npm install axe-core --save-dev` | Automated a11y checks for accessibility-sensitive tasks |
| @axe-core/playwright (optional) | `npm install @axe-core/playwright` | Playwright integration for axe |

> **Do not modify `package.json` during this task.** These are proposals only.

### Runtime Dependencies

**None.** No application capability gap was identified that requires a new runtime dependency. `motion` is already installed and used by the home pilot ([`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx:6)); no additional animation library is justified.

---

## 14. Rules Worth Considering Later

Only rule concepts that fill actual repository gaps are listed. **These are not created during this task.**

- **Design-authority precedence (always-on):** currently design authority lives in task docs and `design-reference/notes/source-provenance.md`; promoting it to an always-on rule would prevent skills from generating a new visual direction over the authoritative reference.
- **Skill/tool routing:** a lightweight routing rule (which skill for which task class) would prevent every installed UI skill from running on every task.
- **Dirty-file protection / local-working-tree precedence:** explicit protection already exists in [`.roo/rules/00-governance.md`](.roo/rules/00-governance.md:34); no additional rule is indicated by this audit.
- **Accessibility requirements:** a11y expectations are embedded in [`high-low-redesign-plan.md`](high-low-redesign-plan.md:468) but not always-on; a concise rule could make them durable.
- **Motion requirements:** motion conventions live in [`ui-design-system.md`](.roo/rules/ui-design-system.md:118); a rule could codify "no motion without a design reference or explicit request."
- **Responsive requirements:** responsive is implementation-defined ([`design-reference/notes/responsiveness.md`](design-reference/notes/responsiveness.md:3)); a rule could state the mobile-first + preserve-hierarchy expectation.
- **Browser verification:** capability discovery is already required per session ([`.roo/rules/04-tools-and-escalation.md`](.roo/rules/04-tools-and-escalation.md:8)); the pilot confirms browser inspection happened, not that Playwright MCP is permanently available.

---

## 15. Additional Skills Worth Considering

**No additional UI/UX skills are currently necessary.**

The proposed stack (Impeccable, Playwright MCP when available, and a selective subset of Emil Kowalski motion skills, with UI UX Pro Max and axe-core optional) covers the evidenced workflow. Pilot browser use does not guarantee future-session access, and technical capture does not establish perceptual acceptance. The remaining gaps are implementation gaps in the repo itself (dead CSS utilities/tokens, divergent dialog implementations, missing focus trap, no `loading.tsx`), which the proposed skills can find and fix — they are not coverage gaps in the skill stack.

---

## 16. Needs Verification

- **Future-session Playwright MCP/browser availability** — pilot capability is evidenced; future availability is not guaranteed. **Needs Verification [environment-specific]**.
- **Full Playwright device emulation beyond viewport resizing** — not established by the pilot artifacts. **Needs Verification [environment-specific]** only if a task depends on device emulation.
- **Impeccable detector-rule quality / live-mode behavior** — source-only, not runtime-exercised. **Needs Verification**.
- **Which "Taste Skill" repository is intended** — multiple repos share the name. **Needs Verification**.
- **Taste Skill suitability for HigherLower's authoritative design reference** — likely conflicts with app-UI design authority. **Needs Verification [product-decision]**.
- **UI UX Pro Max vs. Impeccable exact overlap boundary** — based on documented capability lists, not side-by-side testing. **Needs Verification**.
- **Theme-toggle behavior** — design shows a theme-control icon but no toggle exists; dark-only. **Needs Verification [product-decision]** ([`design-reference/notes/open-questions.md`](design-reference/notes/open-questions.md:9)).
- **Game-over overlay dialog semantics** — whether it should adopt native `<dialog>`. **Needs Verification [product-decision]** ([`ui-interaction-audit.md`](ui-interaction-audit.md:301)).
- **Card-swap animation vs. reveal window** — whether animation may consume part of the 1500/800ms reveal. **Needs Verification [product-decision]** ([`ui-interaction-audit.md`](ui-interaction-audit.md:303)).
- **Tablet/intermediate responsive composition** — whether any is designer-approved. **Needs Verification [product-decision]** ([`design-reference/notes/responsiveness.md`](design-reference/notes/responsiveness.md:13)).
- **High-score namespace split** — governance reference records a Classic-only split; current storage layer appears unified. **Needs Verification [inferred-from-codebase]**.
- **`design-reference/` commit status** — whether it should be committed. **Needs Verification [product-decision]** ([`docs/handoff-signoff.md`](docs/handoff-signoff.md:136)).
- **Human perceptual/UX acceptance of the pilot** — owner-provided task evidence records that the initial 0→40px motion was hard to perceive, while the revised 0→56px motion is noticeable with attention and subtle in ordinary use; the manual motion review recommended no further changes. This is task-provided human-review evidence, not independently reproduced in this pass. Technical screenshots/snapshots remain distinct from that perceptual observation.
- **Build/lint for the pilot** — not established by the browser artifacts. **Needs Verification [environment-specific]** if those checks are required for a later implementation handoff.

---

## 17. Final Recommendation

**Minimum recommended skill stack:**
- **Impeccable** (core) — primary UI/UX audit/polish/harden/adapt skill, constrained to defer to `design-reference/` authority.
- **Playwright MCP** (use when available; not an app dependency) — browser verification demonstrated by pilot evidence; discover capability per session rather than treating it as a guaranteed installed tool.
- **Emil `animate`** (selective) — specialist implementation when motion is explicitly requested.
- **Emil `review-animations`** (user-invoked only) — its local skill disables model invocation; do not route autonomously.

**Optional skills:**
- **UI UX Pro Max** — advisory UX-guideline/stack knowledge only; not for visual direction.
- **Emil `improve-animations`, `find-animation-opportunities`, `animation-performance`** — invoked only for explicit motion-audit/discovery/performance tasks.
- **axe-core / @axe-core/playwright** — deferred dev dependency for accessibility-sensitive tasks.

**Skills that should not be installed:**
- **Taste Skill** — conflicts with the authoritative `design-reference/` and the theme-preservation rule; oriented at greenfield pages, not this app.

**Is the proposed stack sufficient?** **Yes, as a conditional toolkit.** Impeccable is the core UI/UX specialist; use Playwright MCP for rendered verification when present (pilot use confirmed, future availability not guaranteed); route Emil motion skills selectively and respect user-only invocation for `review-animations`. No Playwright app dependency is justified by the pilot. The app's existing `motion` dependency is now used in the home pilot, but remains distinct from agent skill recommendations. axe-core remains optional/deferred.

**Genuine remaining capability gaps:** none in the skill stack. The remaining gaps are implementation gaps in the repository itself (dead CSS utilities/tokens, divergent dialog implementations, missing focus trap, no `loading.tsx`, mid-migration token layers), which the recommended skills can find and fix.

**Why this fits this repository:** HigherLower is a small, dark-only Next.js 16 / React 19 / Tailwind v4 app with an authoritative `design-reference/`, a proportional governance pipeline, no test framework or CI, and no Playwright package in app dependencies. Browser inspection is evidenced in this pilot through Playwright MCP artifacts, but remains session-gated. The recommended stack is deliberately small: Impeccable, available-session browser verification, and a selective motion subset — matching the project's proportionality principle ([`.roo/rules/00-governance.md`](.roo/rules/00-governance.md:48)) and avoiding enterprise ceremony.

**What should happen next before installing or changing anything:**
1. Owner review of this audit and approval of the recommended stack.
2. Resolve the open `Needs Verification [product-decision]` items (theme toggle, game-over dialog semantics, card-swap animation, tablet composition, `design-reference/` commit status). Other open items are listed in §16.
3. Discover Playwright MCP/browser capabilities per session; confirm device emulation if a task needs more than viewport resizing. Do not treat pilot availability as a future-session guarantee.
4. Only then install the approved skills/MCP, and do so project-locally where the conventions are project-specific.
