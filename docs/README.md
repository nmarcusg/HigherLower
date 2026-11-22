# HigherLower — Documentation

HigherLower is a small Next.js App Router "higher/lower" comparison game. Server-side
provider adapters fetch provider payloads and normalize them into a single shared
`GameItem` shape, which client game components consume; persistence is browser-only
(high scores, Home selection, audio settings), with no database or accounts.

---

## Start here

These four guides are the current, verified documentation. Read them in order.

| Guide | What it covers |
| --- | --- |
| [`01-contributor-onboarding.md`](01-contributor-onboarding.md) | Local setup, the real tech stack, prerequisites, and which environment variable **names** each category needs. |
| [`02-architecture.md`](02-architecture.md) | How a request becomes a playable deck: routing, catalog gating, provider dispatch, normalization, and where client state lives. |
| [`03-ui-and-coding-conventions.md`](03-ui-and-coding-conventions.md) | Styling (Tailwind v4 CSS-first), shadcn/ui primitives, icons, motion, the atmosphere/audio subsystems, naming, and the TypeScript/lint gates. |
| [`04-api-data-and-operations.md`](04-api-data-and-operations.md) | How the catalog decides what is playable, how adapters and local snapshots become `GameItem[]`, how snapshots are refreshed, and what to check when something breaks. |

---

## Archive

[`archive/`](archive/README.md) holds **frozen historical task records** — plans,
QA reports, handoffs, analyses, and prompts from past work. They are kept for
provenance only and are **not** current guidance. Some describe behaviour that
has since been superseded, for example a removed BGM audio system and
pre-2026-11 availability counts. See [`archive/README.md`](archive/README.md)
for the chronological index.

---

## Key repository reference files

Paths are relative to this `docs/` directory.

| File | Purpose |
| --- | --- |
| [`package.json`](../package.json) | Dependencies, pinned versions, and the `dev` / `build` / `start` / `lint` / generator scripts. |
| [`next.config.ts`](../next.config.ts) | Next.js configuration, including permitted remote image hosts. |
| [`components.json`](../components.json) | shadcn/ui configuration (`new-york`, `neutral`, CSS variables, aliases). |
| [`AGENTS.md`](../AGENTS.md) | Authoritative Next.js implementation guidance; requires consulting the locally installed Next docs before writing code. |
| [`CLAUDE.md`](../CLAUDE.md) | Delegates to `AGENTS.md`. |
| [`README.md`](../README.md) | Root README — still unmodified `create-next-app` boilerplate and stale; do not use it for setup facts. |
| [`app/globals.css`](../app/globals.css) | Tailwind v4 entry point plus the global design tokens and shared component classes. |
| [`lib/api/index.ts`](../lib/api/index.ts) | The single dispatcher; its `FETCHER_MAP` maps a category key to a fetcher. |
| [`lib/catalog/availability.ts`](../lib/catalog/availability.ts) | Category availability records, release gates, and semantic-ID → provider-key mapping. |
| [`lib/catalog/semanticCatalog.ts`](../lib/catalog/semanticCatalog.ts) | Provider-independent semantic category metadata. |
| [`lib/catalog/routeAuthorization.ts`](../lib/catalog/routeAuthorization.ts) | Route authorization that gates dispatch on `productionPlayable` and `compatibleModes`. |
| [`types/api.ts`](../types/api.ts) | The normalized `GameItem` and related shared types. |
| [`design-reference/README.md`](../design-reference/README.md) | Visual design reference material for the project. |

---

## Contributor rules

- [`AGENTS.md`](../AGENTS.md) owns Next.js implementation guidance — consult the
  locally installed Next documentation before writing code, since this version
  may differ from what you already know.
- [`CLAUDE.md`](../CLAUDE.md) delegates to `AGENTS.md`.

Everything in this directory is a **current guide**. Anything under
[`archive/`](archive/README.md) is historical and must not be treated as current
guidance.
