# Contributor Onboarding & Setup

How to get HigherLower running locally, what the stack actually is, and which
environment variables each category needs. Every claim below was checked
against the repository source on 2026-11-22; anything unconfirmed is labelled
`Needs Verification`.

> Note: the root [`README.md`](../README.md:1) is unmodified `create-next-app`
> boilerplate and is stale — it claims the project loads [Geist](../README.md:21)
> via `next/font`, while the real app uses Space Mono. Treat this guide as the
> current setup reference; do not use the root README for setup facts.

---

## 1. What this project is

A small **Next.js App Router** higher/lower comparison game.

- **Data path.** Server-side provider adapters fetch provider payloads and
  normalize them into a single shared shape, `GameItem`, defined in
  [`types/api.ts`](../types/api.ts:6). Client game components only ever see
  that normalized shape.
- **Dispatch.** [`lib/api/index.ts`](../lib/api/index.ts:41) holds a
  `FETCHER_MAP` that maps a category key to one fetcher. Some entries are
  request-time provider adapters; others are local snapshot readers.
- **Persistence.** Browser storage only (high scores, Home selection, audio
  settings). There is no database, no accounts, and no server-side persistence.

See [`02-architecture.md`](02-architecture.md) for the full request path.

---

## 2. Tech stack

| Concern | Choice | Evidence |
| --- | --- | --- |
| Framework | Next.js `16.3.4` | [`package.json`](../package.json:21) |
| UI runtime | React / React DOM `19.2.8` | [`package.json`](../package.json:23) |
| Language | TypeScript `^5` | [`package.json`](../package.json:34) |
| Styling | Tailwind CSS `^4` via `@tailwindcss/postcss` `^4` | [`package.json`](../package.json:27), [`package.json`](../package.json:33) |
| Lint | ESLint `^9`, `eslint-config-next` `16.3.4` | [`package.json`](../package.json:31) |
| Icons | `lucide-react` `^1.46.0` | [`package.json`](../package.json:19) |
| Motion | `motion` `^14.1.0` | [`package.json`](../package.json:20) |
| Primitives | `radix-ui` `^1.7.0` (unified package), `class-variance-authority`, `cn` | [`package.json`](../package.json:17) |
| Font | `Space_Mono` from `next/font/google`, exposed as `--font-space-mono` | [`app/layout.tsx`](../app/layout.tsx:2), [`app/layout.tsx`](../app/layout.tsx:7) |

Tailwind v4 is CSS-first: there is no `tailwind.config.*`. The single entry
point is [`app/globals.css`](../app/globals.css:1), which begins with
`@import "tailwindcss";` and declares the design tokens in `:root`
([`app/globals.css`](../app/globals.css:4)).

---

## 3. Prerequisites

- **npm** (the repo pins dependencies with `package-lock.json`).
- **A modern Node.js.**

**The Node version is not pinned.** There is no `engines` field in
[`package.json`](../package.json:1) and no `.nvmrc` in the repo root. Use a
current LTS release; the exact supported floor is
`Needs Verification [environment-specific]` because nothing in the repository
declares it.

---

## 4. Install and run

```bash
npm install
npm run dev     # Next.js dev server, http://localhost:3000
```

Other core commands (exact script bodies in [`package.json`](../package.json:6)):

| Command | Runs | Purpose |
| --- | --- | --- |
| `npm run dev` | `next dev` | Dev server on port 3000. |
| `npm run build` | `next build` | Production build. |
| `npm run start` | `next start` | Serve a production build. |
| `npm run lint` | `eslint` | ESLint over the repo. |

---

## 5. All npm scripts

There are **nine** scripts in [`package.json`](../package.json:5). Five are
developer-run data generators — see
[`04-api-data-and-operations.md`](04-api-data-and-operations.md) for how to run
them safely.

| Script | Invocation | Purpose |
| --- | --- | --- |
| `dev` | `next dev` | Dev server. |
| `build` | `next build` | Production build. |
| `start` | `next start` | Serve the build. |
| `lint` | `eslint` | Static lint gate. |
| `snapshot:album-release-date` | `node scripts/generate-album-release-date-snapshot.mjs` | Regenerate `album-release-dates` local snapshot. |
| `snapshot:artist-album-counts` | `node scripts/generate-artist-album-counts-snapshot.mjs` | Regenerate `artist-album-counts` local snapshot. |
| `catalog:youtube-channels` | `node scripts/generate-youtube-channel-catalog.mjs` | Regenerate the curated YouTube channel catalog. |
| `snapshot:monthly-listeners` | `node --env-file=.env.local scripts/generate-monthly-listeners-snapshot.mjs` | Regenerate the Monthly Listeners snapshot. |
| `snapshot:twitch-followers` | `node --env-file=.env.local scripts/reread-twitch-metrika.mjs` | Re-read Twitch follower metrics from Metrika into the local snapshot. |

The last two load environment values from `.env.local` through Node's
`--env-file` flag ([`package.json`](../package.json:13)). The others read
`process.env` from the ambient shell only.

Not every developer script is an npm script: the Spotify identity catalog
generator, the Twitch candidate discovery script, and the Twitch avatar
enrichment script live in `scripts/` and are run directly with `node`.

---

## 6. Environment variables

Names only — never commit values. Provider adapters run server-side
([`lib/api/index.ts`](../lib/api/index.ts:1)); nothing here is exposed to the
client.

### 6.1 Variables used by provider adapters

| Category (semantic id) | Adapter | Variable name(s) | Required |
| --- | --- | --- | --- |
| `movie-series-rating`, `release-date`, `gross-revenue` | [`lib/api/tmdb.ts`](../lib/api/tmdb.ts:90) | `TMDB_API_KEY` | Yes |
| `youtube-subscribers` | [`lib/api/youtube.ts`](../lib/api/youtube.ts:66) | `YOUTUBE_API_KEY` | Yes |
| `game-release-date` | [`lib/api/igdb.ts`](../lib/api/igdb.ts:70) | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | Yes (both) |
| — (inactive adapter) | [`lib/api/rawg.ts`](../lib/api/rawg.ts:47) | `RAWG_API_KEY` | No — adapter is not dispatched |
| — (Metrika client) | [`lib/api/metrika.ts`](../lib/api/metrika.ts:25) | `METRIKA_API_TOKEN` | Yes for the snapshot generators; not used at request time |

Notes:

- `rawg.ts` is present but **not** in `FETCHER_MAP` ([`lib/api/index.ts`](../lib/api/index.ts:41)),
  so it cannot be reached from gameplay.
- `metrika.ts` is a client used by developer-run snapshot generators. The
  request-time reader [`lib/api/monthlyListenersSnapshot.ts`](../lib/api/monthlyListenersSnapshot.ts:1)
  reads a local JSON file only and makes no provider call, so `METRIKA_API_TOKEN`
  is not needed to *serve* Monthly Listeners.

### 6.2 Variables used only by generator scripts

| Variable | Script | Purpose |
| --- | --- | --- |
| `METRIKA_AUTHORIZED` | [`scripts/generate-monthly-listeners-snapshot.mjs`](../scripts/generate-monthly-listeners-snapshot.mjs:63) | Explicit human gate; the script refuses to call Metrika unless set to `yes`. |
| `SNAPSHOT_BASE_URL` | [`scripts/generate-album-release-date-snapshot.mjs`](../scripts/generate-album-release-date-snapshot.mjs:111), [`scripts/generate-artist-album-counts-snapshot.mjs`](../scripts/generate-artist-album-counts-snapshot.mjs:90) | Base URL of the running dev server (defaults to `http://localhost:3000`). |
| `SNAPSHOT_TARGET_ITEMS` | [`scripts/generate-album-release-date-snapshot.mjs`](../scripts/generate-album-release-date-snapshot.mjs:83) | Target pool size for the album release-date snapshot. |
| `IDENTITY_CENSUS_CONTACT` | [`scripts/generate-music-spotify-identity-catalog.mjs`](../scripts/generate-music-spotify-identity-catalog.mjs:13) | Contact string for the census User-Agent. |
| `MUSIC_IDENTITY_CENSUS_FILE` | [`scripts/generate-music-spotify-identity-catalog.mjs`](../scripts/generate-music-spotify-identity-catalog.mjs:55) | Path to an alternate identity-census input file. |

The Twitch discovery and avatar-enrichment scripts also read optional
`TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`
([`scripts/discover-twitch-stream-candidates.mjs`](../scripts/discover-twitch-stream-candidates.mjs:12),
[`scripts/enrich-twitch-profile-images.mjs`](../scripts/enrich-twitch-profile-images.mjs:111)).

### 6.3 Categories that work with no environment variables

These read a local snapshot or a keyless provider at request time:

- `game-playerbase` — SteamSpy, no key ([`lib/api/steamspy.ts`](../lib/api/steamspy.ts:4)).
- `game-ratings` — Steam review percentage, no key ([`lib/api/steamspy_ratings.ts`](../lib/api/steamspy_ratings.ts:1)).
- `country-populations` — World Bank, no key ([`lib/api/worldbank.ts`](../lib/api/worldbank.ts:1)).
- `artist-album-counts` — local snapshot ([`lib/api/artistAlbumCountsSnapshot.ts`](../lib/api/artistAlbumCountsSnapshot.ts:1)).
- `album-release-dates` — local snapshot ([`lib/api/albumReleaseDateSnapshot.ts`](../lib/api/albumReleaseDateSnapshot.ts:29)).
- `monthly-listeners` — local snapshot ([`lib/api/monthlyListenersSnapshot.ts`](../lib/api/monthlyListenersSnapshot.ts:3)).
- `twitch-followers` — local snapshot ([`lib/api/twitchFollowersSnapshot.ts`](../lib/api/twitchFollowersSnapshot.ts:3)).

Keyed categories at request time: `movie-series-rating` / `release-date` /
`gross-revenue` (TMDB), `youtube-subscribers` (YouTube), `game-release-date`
(IGDB via Twitch credentials).

`.env.local` is loaded by the two newest npm scripts through `node --env-file`
([`package.json`](../package.json:13)); the same file is the conventional place
for the keys listed above. `.env.local` itself must stay untracked and its
contents must never be copied into docs, logs, or handoffs.

---

## 7. Known local constraints

- **`npm run build` is blocked while a dev server owns `.next` and port 3000.**
  Stop `npm run dev` before building, or build in a separate checkout.
- **Static gates.** `npx tsc --noEmit` (type check) and `npm run lint` are the
  available pre-commit gates. The recorded lint baseline is 0 errors with a
  number of pre-existing warnings; treat new warnings as your responsibility
  and old ones as pre-existing.
- **No test framework exists.** There is no test runner, no test script, and no
  test directory in [`package.json`](../package.json:5).
  `Needs Verification [capability-unavailable]`: automated unit/integration
  tests cannot be run because none are configured.
- **No CI pipeline exists.** Nothing in the repository defines continuous
  integration. `Needs Verification [capability-unavailable]`: there is no
  CI status to consult for a pull request.

---

## 8. First-run smoke test

1. `npm run dev`, then open `http://localhost:3000`.
2. Home should render **four domains** and **eleven categories** in total. The
   domains are `movies-series`, `gaming`, `music`, and `social-media`
   ([`lib/catalog/semanticCatalog.ts`](../lib/catalog/semanticCatalog.ts:45)),
   and the categories are the eleven entries in `SEMANTIC_CATEGORIES`
   ([`lib/catalog/semanticCatalog.ts`](../lib/catalog/semanticCatalog.ts:73)).
3. Hit the diagnostic route to confirm the data layer:

   ```text
   GET /api/test-fetch?category=movie-ratings
   GET /api/test-fetch?category=movie-ratings&full=1
   ```

   Without `full`, the route returns a count plus a five-item `sample`
   ([`app/api/test-fetch/route.ts`](../app/api/test-fetch/route.ts:94)). With
   `full=1` it returns the **full, unshuffled, sanitized** pool
   ([`app/api/test-fetch/route.ts`](../app/api/test-fetch/route.ts:73)) — the
   deterministic view used by the snapshot generators. `full=1` is dev-only and
   returns 404 in a production build.

   Pass any dispatched provider key from `FETCHER_MAP`, e.g. `movie-ratings`,
   `release-dates`, `game-release-dates`, `artist-album-counts`,
   `album-release-dates`, `youtube-subscribers`, `monthly-listeners`,
   `twitch-followers` ([`app/api/test-fetch/route.ts`](../app/api/test-fetch/route.ts:50)).

4. Play a round: choose a domain, category, and mode, press `go`, and confirm
   cards, values, and the high-score write path work.

---

## 9. Where to go next

- [`02-architecture.md`](02-architecture.md) — request path, catalog layers, and
  data adapters.
- [`03-ui-and-coding-conventions.md`](03-ui-and-coding-conventions.md) — UI
  primitives, tokens, and coding conventions.
- [`04-api-data-and-operations.md`](04-api-data-and-operations.md) — provider
  adapters, snapshots, and safe generator runs.

---

## Open questions / Needs Verification

- **Supported Node.js range.** Not declared anywhere (no `engines`, no
  `.nvmrc`). `Needs Verification [environment-specific]`.
- **Lint warning count.** The exact current warning total is not asserted here;
  re-run `npm run lint` to get the live number.
  `Needs Verification [environment-specific]`.
- **`build` blocking.** The `.next` / port-3000 conflict is an observed local
  workflow constraint, not a documented project policy.
  `Needs Verification [environment-specific]`.
- **Guides 03 and 04.** Both are referenced above but are not present in `docs/`
  yet; they are planned as part of this documentation set.
  `Needs Verification [inferred-from-codebase]`.
