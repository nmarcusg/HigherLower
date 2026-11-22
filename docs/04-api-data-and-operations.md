# API, Data & Operations

How the catalog decides what is playable, how a provider adapter or local
snapshot becomes a `GameItem[]`, how the generated snapshots are refreshed, and
what to check when something breaks. Read from source on 2026-11-22. Environment
variable **names** appear here; no values do. Anything not confirmable from the
repository is labelled `Needs Verification` with a qualifier.

Related guides: [`01-contributor-onboarding.md`](01-contributor-onboarding.md),
[`02-architecture.md`](02-architecture.md),
[`03-ui-and-coding-conventions.md`](03-ui-and-coding-conventions.md).

---

## 1. Adding a category — checklist

A category is wired in four places, then authorized automatically. Categories
have a stable **semantic ID** that is independent of the provider key, so the
same product concept can change provider without changing scores or URLs.

1. **Semantic metadata** — add an entry to `SEMANTIC_CATEGORIES` in
   [`lib/catalog/semanticCatalog.ts`](../lib/catalog/semanticCatalog.ts:73) with
   a unique `id`, `domainId`, `label`, `description`, `metricDescription`,
   `sourceDescription`, `providerCandidate`, `displayFormat`,
   `targetCatalog: true`, and `compatibleModes`. Extend the
   `SemanticCategoryId` union at
   [`lib/catalog/semanticCatalog.ts`](../lib/catalog/semanticCatalog.ts:6).
2. **Provider mapping** — add the semantic ID → provider key pair to
   `SEMANTIC_PROVIDER_MAPPING` in
   [`lib/catalog/availability.ts`](../lib/catalog/availability.ts:393). The map is
   `Partial<Record<SemanticCategoryId, string>>`; an unmapped category fails
   closed at authorization
   ([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:425)).
3. **Availability record** — add a `CATEGORY_AVAILABILITY` entry
   ([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:121)) with:
   - `status` (descriptive only — see §2),
   - `productionPlayable` (the actual release decision),
   - `rationale`,
   - `gates` containing an evidence record for **all seven** `ReleaseGateId`
     values: `stable-semantic-identity`, `approved-metric-contract`,
     `valid-server-adapter`, `runtime-provider-evidence`,
     `server-route-authorization`, `public-catalog-eligibility`,
     `reversible-visibility`
     ([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:18)).
     Never mark a gate satisfied without concrete evidence; use
     `unverifiedGates(...)` for a category with none.
4. **Dispatcher entry** — add the provider key → fetcher pair to `FETCHER_MAP`
   in [`lib/api/index.ts`](../lib/api/index.ts:41), and extend the `CategoryId`
   union in [`types/game.ts`](../types/game.ts:6) because the map is typed
   `Record<CategoryId, FetcherFn>`.
5. **Route authorization is automatic.** No route edit is needed:
   [`authorizeGameRoute`](../lib/catalog/routeAuthorization.ts:49) resolves the
   semantic category, checks `compatibleModes`, then checks
   `productionPlayable`, then resolves the provider key. Any failure fails
   closed before dispatch.

**Consistency guard.** `getProductionCatalogProjection()` calls
`assertAvailabilityConsistency()`, which throws when a category is marked
`productionPlayable` while any release gate is unsatisfied
([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:340),
[`lib/catalog/availability.ts`](../lib/catalog/availability.ts:360)). That is a
startup/build-time tripwire against silent divergence — do not weaken it.

---

## 2. `status` vs `productionPlayable`

They are different facts and must not be conflated.

| Field | Meaning | Who reads it |
| --- | --- | --- |
| `status` | Descriptive readiness label: `released`, `blocked`, `runtime-verification-needed`, or `intentionally-hidden` ([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:10)) | Humans reviewing the record |
| `productionPlayable` | The explicit release decision | Route authorization ([`lib/catalog/routeAuthorization.ts`](../lib/catalog/routeAuthorization.ts:90)) and Home catalog projection ([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:384)) |

Consequences visible in current source:

- **Route authorization reads only `productionPlayable`.** `status` is not
  consulted anywhere in
  [`routeAuthorization.ts`](../lib/catalog/routeAuthorization.ts:1).
- **Several playable categories still carry `status: "blocked"`** while
  `productionPlayable: true` — e.g. `movie-series-rating`, `release-date`,
  `gross-revenue`, `player-count`, `game-release-date`, `number-of-albums`,
  `album-release-date`, `youtube-subscribers`
  ([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:121)).
  `game-rating` carries `runtime-verification-needed`
  ([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:153)).
- **`getProductionCatalogProjection()` renders every target category** and
  exposes a per-category `playable` flag copied from `productionPlayable`
  ([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:359)). An
  unplayable category therefore stays visible in Home but cannot launch.

### Monthly Listeners and Twitch Followers — intent is pending

Current source records both as `status: "released"` with
`productionPlayable: true`:

- `monthly-listeners` ([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:197))
- `twitch-followers` ([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:242))

The governance reference records that commit `6e0e3d8` deliberately changed
Monthly Listeners from `blocked` to `released`. **Whether `released` is the
intended final disposition remains `Needs Verification [product-decision]`.**
This guide presents the source state; it does not resolve the decision, and
neither should incidental work.

---

## 3. Provider inventory

Semantic category → provider dispatch key → adapter module → credential need →
data path. Provider keys are the values in `SEMANTIC_PROVIDER_MAPPING`
([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:393)) and the
keys of `FETCHER_MAP` ([`lib/api/index.ts`](../lib/api/index.ts:41)).

### Request-time adapters

| Semantic category | Provider key | Adapter | Credential (name only) |
| --- | --- | --- | --- |
| Movie/Series Rating, Release Date, Gross Revenue | `movie-ratings`, `release-dates`, `movie-gross-revenue` | [`lib/api/tmdb.ts`](../lib/api/tmdb.ts:1) | `TMDB_API_KEY` ([line 91](../lib/api/tmdb.ts:91)) |
| Peak Concurrent Players | `game-playerbase` | [`lib/api/steamspy.ts`](../lib/api/steamspy.ts:1) | keyless |
| Game Rating | `game-ratings` | [`lib/api/steamspy_ratings.ts`](../lib/api/steamspy_ratings.ts:1) | keyless |
| (legacy) Country Populations | `country-populations` | [`lib/api/worldbank.ts`](../lib/api/worldbank.ts:1) | keyless |
| YouTube Subscribers | `youtube-subscribers` | [`lib/api/youtube.ts`](../lib/api/youtube.ts:1) | `YOUTUBE_API_KEY` ([line 66](../lib/api/youtube.ts:66)) |
| Game Release Date | `game-release-dates` | [`lib/api/igdb.ts`](../lib/api/igdb.ts:1) | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` ([line 70](../lib/api/igdb.ts:70)) |

`country-populations` remains registered in `FETCHER_MAP`
([`lib/api/index.ts`](../lib/api/index.ts:45)) for the legacy provider key even
though it has no semantic category.

### Local snapshot readers

| Semantic category | Provider key | Reader | Snapshot file |
| --- | --- | --- | --- |
| Album Release Date | `album-release-dates` | [`lib/api/albumReleaseDateSnapshot.ts`](../lib/api/albumReleaseDateSnapshot.ts:1) | `lib/api/data/album-release-date.snapshot.json` ([line 65](../lib/api/albumReleaseDateSnapshot.ts:65)) |
| Number of Albums | `artist-album-counts` | [`lib/api/artistAlbumCountsSnapshot.ts`](../lib/api/artistAlbumCountsSnapshot.ts:1) | `lib/api/data/artist-album-counts.snapshot.json` |
| Monthly Listeners | `monthly-listeners` | [`lib/api/monthlyListenersSnapshot.ts`](../lib/api/monthlyListenersSnapshot.ts:1) | `lib/api/data/monthly-listeners.snapshot.json` ([line 7](../lib/api/monthlyListenersSnapshot.ts:7)) |
| Twitch Followers | `twitch-followers` | [`lib/api/twitchFollowersSnapshot.ts`](../lib/api/twitchFollowersSnapshot.ts:1) | `lib/api/data/twitch-followers-metrika.snapshot.json`, plus roster and avatar artifacts ([lines 7–11](../lib/api/twitchFollowersSnapshot.ts:7)) |

### Present but not dispatched

These adapters exist in the tree but are absent from `FETCHER_MAP`, so no route
can reach them:

- [`lib/api/rawg.ts`](../lib/api/rawg.ts:1) (would use `RAWG_API_KEY`,
  [line 47](../lib/api/rawg.ts:47))
- [`lib/api/cheapshark.ts`](../lib/api/cheapshark.ts:1)
- [`lib/api/fakestoreapi.ts`](../lib/api/fakestoreapi.ts:1)

Do not assume they are live, and do not wire them without an owner decision and
a new semantic category.

### Dispatch pipeline

`fetchGameItemsRaw()` looks up the fetcher, throws on an unknown key, drops any
item missing `name` or `imageUrl`, and throws when fewer than 2 items remain
([`lib/api/index.ts`](../lib/api/index.ts:96),
[`lib/api/index.ts`](../lib/api/index.ts:111),
[`lib/api/index.ts`](../lib/api/index.ts:115)). `fetchGameItems()` then shuffles
with Fisher–Yates per call ([`lib/api/index.ts`](../lib/api/index.ts:78)).

---

## 4. Snapshot lifecycle

Snapshot generation is **developer-run**. The runtime readers never call a
provider.

### npm scripts

Commands and targets are from [`package.json`](../package.json:10).

| npm script | Command | Inputs / preconditions | Output |
| --- | --- | --- | --- |
| `snapshot:album-release-date` | `node scripts/generate-album-release-date-snapshot.mjs` | A running dev server reached via `SNAPSHOT_BASE_URL` (default `http://localhost:3000`); `GET /api/test-fetch?category=album-release-dates&full=1`; `SNAPSHOT_TARGET_ITEMS` (default `220`). Paced MusicBrainz crawl. | `lib/api/data/album-release-date.snapshot.json` |
| `snapshot:artist-album-counts` | `node scripts/generate-artist-album-counts-snapshot.mjs` | Dev server via `SNAPSHOT_BASE_URL` (default `http://localhost:3000`) ([line 90](../scripts/generate-artist-album-counts-snapshot.mjs:90)); live MusicBrainz + Wikidata path. | `lib/api/data/artist-album-counts.snapshot.json` |
| `catalog:youtube-channels` | `node scripts/generate-youtube-channel-catalog.mjs` | `YOUTUBE_API_KEY` ([line 109](../scripts/generate-youtube-channel-catalog.mjs:109)). | `lib/api/data/youtube-channel-catalog.json` |
| `snapshot:monthly-listeners` | `node --env-file=.env.local scripts/generate-monthly-listeners-snapshot.mjs` | `METRIKA_API_TOKEN`; `METRIKA_AUTHORIZED=yes` must be set or the run aborts on the first request ([line 63](../scripts/generate-monthly-listeners-snapshot.mjs:63)). Reads the approved Spotify identity catalog. | `lib/api/data/monthly-listeners.snapshot.json` |
| `snapshot:twitch-followers` | `node --env-file=.env.local scripts/reread-twitch-metrika.mjs` | `METRIKA_API_TOKEN` ([line 8](../scripts/reread-twitch-metrika.mjs:8)); reads `lib/api/data/twitch-stream-candidates.json` and requires exactly 200 shortlisted logins ([line 52](../scripts/reread-twitch-metrika.mjs:52)). | `lib/api/data/twitch-followers-metrika.snapshot.json` |

Request volume, derived from source:

- **Monthly Listeners:** the Metrika client batches 10 identities per HTTP
  request ([`scripts/monthly-listeners-provider.mjs`](../scripts/monthly-listeners-provider.mjs:2))
  and allows at most two delayed retries per unresolved batch
  ([line 5](../scripts/monthly-listeners-provider.mjs:5)). With 236 approved
  identities that is **24 requests minimum, 72 maximum**, well under the
  client's 350-request ceiling ([line 1](../scripts/monthly-listeners-provider.mjs:1)).
- **Twitch Followers:** 200 shortlisted logins in batches of 10
  ([line 5](../scripts/reread-twitch-metrika.mjs:5)) → **20 requests**.

### Developer-only scripts (not wired to npm)

| Script | Purpose | Environment |
| --- | --- | --- |
| [`enrich-twitch-profile-images.mjs`](../scripts/enrich-twitch-profile-images.mjs:1) | Offline avatar enrichment → `lib/api/data/twitch-avatar-images.json`; URL-only, capped at 100 identities per request. | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` ([line 111](../scripts/enrich-twitch-profile-images.mjs:111)) |
| [`discover-twitch-stream-candidates.mjs`](../scripts/discover-twitch-stream-candidates.mjs:1) | Rebuilds the Twitch candidate/roster inputs → `lib/api/data/twitch-stream-candidates.json`. | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` ([line 12](../scripts/discover-twitch-stream-candidates.mjs:12)) |
| [`generate-music-spotify-identity-catalog.mjs`](../scripts/generate-music-spotify-identity-catalog.mjs:1) | Builds `lib/api/data/music-spotify-identities.json` (MusicBrainz MBID → Spotify ID join). | Optional `IDENTITY_CENSUS_CONTACT` ([line 13](../scripts/generate-music-spotify-identity-catalog.mjs:13)), optional `MUSIC_IDENTITY_CENSUS_FILE` ([line 55](../scripts/generate-music-spotify-identity-catalog.mjs:55)) |
| [`monthly-listeners-provider.mjs`](../scripts/monthly-listeners-provider.mjs:1) | Shared Metrika client module used by the Monthly Listeners generator; not a standalone entry point. | `METRIKA_API_TOKEN` (passed in by caller) |
| [`twitch-metrika-persistence.mjs`](../scripts/twitch-metrika-persistence.mjs:1) | Persistence helper used by the Twitch reread script; writes the snapshot header/records atomically. | none directly |
| [`validate-monthly-listeners.mjs`](../scripts/validate-monthly-listeners.mjs:1) | Validator for the Monthly Listeners snapshot. | none confirmed |
| [`validate-twitch-followers.mjs`](../scripts/validate-twitch-followers.mjs:1) | Validator for the Twitch roster + snapshot. | none confirmed |
| [`test-monthly-listeners-freshness.mjs`](../scripts/test-monthly-listeners-freshness.mjs:1) | Freshness-warning check for the Monthly Listeners reader. | none confirmed |

### Measured committed pool sizes

Counted from the committed JSON on 2026-11-22 (not a runtime observation):

| Artifact | Shape | Count |
| --- | --- | --- |
| `album-release-date.snapshot.json` | `items[]` | **220** (generated 2026-10-15) |
| `artist-album-counts.snapshot.json` | `items[]` | **251** (generated 2026-10-14) |
| `monthly-listeners.snapshot.json` | `items[]` | **236** (generated 2026-11-02) |
| `twitch-followers-metrika.snapshot.json` | `records[]` (keyed map, not `items`) | **200** (generated 2026-11-02) |
| `youtube-channel-catalog.json` | `items[]` | **263** identities (identity catalog, not a gameplay pool) |

Older figures such as 17 and 120 are **stale** and must not be presented as
current. Note that the human-readable gate evidence strings in
[`lib/catalog/availability.ts`](../lib/catalog/availability.ts:185) still quote
the older pool sizes (17 for artist counts at line 185, 120 for album release
dates at line 194) even though the committed files now hold 251 and 220.
Whether to refresh those evidence strings is
`Needs Verification [product-decision]`.

---

## 5. Freshness and staleness policy

- **Runtime readers use `node:fs` only.** All four snapshot readers are
  `server-only` and read committed files with `readFileSync`
  (e.g. [`lib/api/monthlyListenersSnapshot.ts`](../lib/api/monthlyListenersSnapshot.ts:3),
  [`lib/api/twitchFollowersSnapshot.ts`](../lib/api/twitchFollowersSnapshot.ts:3)).
  No request-time provider call occurs on the gameplay path.
- **Freshness is advisory.** Only two readers emit age warnings:
  - Monthly Listeners warns past **7 days** on `generatedAt` or `collectedAt`
    ([`lib/api/monthlyListenersSnapshot.ts`](../lib/api/monthlyListenersSnapshot.ts:8),
    [`lib/api/monthlyListenersSnapshot.ts`](../lib/api/monthlyListenersSnapshot.ts:111)).
  - Twitch Followers warns past **14 days** on the Metrika `generatedAt`
    ([`lib/api/twitchFollowersSnapshot.ts`](../lib/api/twitchFollowersSnapshot.ts:9),
    [`lib/api/twitchFollowersSnapshot.ts`](../lib/api/twitchFollowersSnapshot.ts:115)).
  - The album and artist readers apply **no age check at all**.
- **There is no hard cutoff at runtime, and no avatar freshness gate.** A stale
  snapshot is still served; a warning is logged and nothing else changes.
- Hard staleness *is* enforced when **publishing** a new Monthly Listeners
  snapshot: the generator rejects a `generatedAt` older than 14 days
  ([`scripts/generate-monthly-listeners-snapshot.mjs`](../scripts/generate-monthly-listeners-snapshot.mjs:32)).
  That is a generator-side rule, not a reader-side one.
- **Dated environment note:** on 2026-11-22 the Metrika quota was exhausted
  (171 / 100, resetting 2026-12-01), so the committed snapshots could not be
  refreshed. This is `Needs Verification [environment-specific]` and is not a
  permanent project limitation.

---

## 6. Attribution and licensing surfaces

- **`GameItem.attribution`** is an optional credit line for images whose licence
  requires attribution ([`types/api.ts`](../types/api.ts:23)). It is a truthful
  licensing surface, not a gameplay metric.
- **The UI renders it when present** — `Image: {item.attribution}` below the
  card metadata ([`components/game/GameCard.tsx`](../components/game/GameCard.tsx:146)).
  Absent for public-domain / CC0 images that need no credit.
- **Wikimedia Commons credit metadata** is collected during artist-image
  enrichment (MusicBrainz → Wikidata P434 → P18 → Commons licence lookup), as
  recorded in the availability evidence for `number-of-albums`
  ([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:185)) and
  `monthly-listeners` ([`lib/catalog/availability.ts`](../lib/catalog/availability.ts:217)).
- **Twitch avatars are URL-only.** `lib/api/data/twitch-avatar-images.json`
  stores verified `https://static-cdn.jtvnw.net` profile-image URLs keyed by
  lowercase login. The reader accepts an entry only if it parses as HTTPS on that
  host ([`lib/api/twitchFollowersSnapshot.ts`](../lib/api/twitchFollowersSnapshot.ts:163)),
  and otherwise falls back to a deterministic SVG identicon
  ([`lib/api/twitchFollowersSnapshot.ts`](../lib/api/twitchFollowersSnapshot.ts:30)).
  A missing or malformed artifact degrades to identicons with a warning instead
  of failing the category
  ([`lib/api/twitchFollowersSnapshot.ts`](../lib/api/twitchFollowersSnapshot.ts:200)).
  The server makes no provider request; the **browser** loads the CDN image,
  which is outside the server-side no-request-time-provider-call boundary.

---

## 7. Troubleshooting

| Symptom | Likely cause | Check |
| --- | --- | --- |
| `Unknown categoryId: "…"` | Key absent from `FETCHER_MAP` | [`lib/api/index.ts`](../lib/api/index.ts:99); compare against `CategoryId` in [`types/game.ts`](../types/game.ts:6) |
| `returned fewer than 2 items — cannot play` | Pool emptied by the `name`/`imageUrl` sanitize step, or the provider returned almost nothing | [`lib/api/index.ts`](../lib/api/index.ts:111), then inspect the raw pool via `/api/test-fetch?category=<key>&full=1` |
| `ApiFetchError` with `[Source]` and a status code | Provider HTTP failure, missing key, or malformed provider payload | [`types/api.ts`](../types/api.ts:28); check the named environment variable is set |
| Malformed snapshot surfaces as **502** | Reader threw `ApiFetchError` | [`app/api/test-fetch/route.ts`](../app/api/test-fetch/route.ts:103); validate the snapshot's `version`, `category`, and item schema |
| Route renders `unavailable` | `productionPlayable` is `false`, **or** no provider mapping resolves | [`lib/catalog/routeAuthorization.ts`](../lib/catalog/routeAuthorization.ts:90), [`lib/catalog/routeAuthorization.ts`](../lib/catalog/routeAuthorization.ts:102) |
| Route renders `incompatible-mode` | Mode not in the category's `compatibleModes` | [`lib/catalog/routeAuthorization.ts`](../lib/catalog/routeAuthorization.ts:86) |
| Category visible on Home but `Go` inert | Visible and playable are separate; `playable` comes from `productionPlayable` | [`lib/catalog/availability.ts`](../lib/catalog/availability.ts:384) |
| `npm run build` fails or hangs | A running `next dev` owns `.next` and port 3000 | Stop the dev server, or use `npx tsc --noEmit` and `npm run lint` as the static gates |
| Vercel environment variables change nothing | Snapshot readers read local files with `node:fs`; they never consult runtime env | Regenerate with the scripts in §4 and commit the artifact |
| Snapshot freshness warning in logs | Age threshold exceeded (7 days monthly / 14 days Twitch) | Regenerate; the warning alone does not block gameplay |

---

## 8. Operational guardrails

- **Never move private server-side environment values into client-reachable
  code, logs, plans, or handoffs.** Provider adapters are server-only; that
  boundary is the reason the app can hold keys at all.
- **Treat `.env*`, tokens, and credentials as read-only**, and redact them from
  logs, screenshots, and documentation. This guide names variables only.
- **Runtime readers make no provider calls.** If a change would introduce one,
  it is a provider-path change and needs an owner decision.
- **Refresh and validation tooling lives under `scripts/` and is developer-run.**
  It is not part of the request path and is not invoked by the app.
- **Do not resolve the Monthly Listeners / Twitch Followers disposition, or
  refresh stale gate evidence, as incidental cleanup.** Both are open product
  decisions (see §2 and §4).

---

## Open questions / Needs Verification

- `Needs Verification [product-decision]` — intended final disposition of
  Monthly Listeners and Twitch Followers. Source says `status: "released"` with
  `productionPlayable: true`; intent is unresolved and must not be resolved
  silently.
- `Needs Verification [product-decision]` — whether the stale pool counts inside
  the `number-of-albums` and `album-release-date` gate evidence strings should be
  refreshed to 251 / 220.
- `Needs Verification [product-decision]` — whether any expiry policy should
  exist for snapshots. Today freshness is advisory only, with no hard cutoff.
- `Needs Verification [environment-specific]` — Metrika quota state. The
  2026-11-22 exhaustion (171 / 100, resetting 2026-12-01) is a dated note, not a
  standing limit.
- `Needs Verification [capability-unavailable]` — no live provider call was made
  while writing this guide. Provider behaviour is described from adapter source,
  not from runtime observation.
- `Needs Verification [inferred-from-codebase]` — the request counts in §4 are
  derived arithmetic from batch size, identity count, and retry allowance; they
  were not observed in a live run.
