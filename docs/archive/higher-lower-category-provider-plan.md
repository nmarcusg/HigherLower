# HigherLower — Category Provider Implementation Plan

> **Status:** Implemented (revision 3). Phases 0–4 implemented and verified;
> see Section 14 (Implementation & Verification Log) for evidence.
> **Date:** 2026-10-12 (revised — revision 3; implementation recorded 2026-10-12)
> **Scope:** Enable additional semantic categories by integrating providers
> through the existing catalog/dispatcher architecture.
> **Authority:** This is the single authoritative implementation plan for this
> category-provider pass. Do not create a competing plan document.
>
> **Revision 3 change:** `player-count` is **promoted from deferred to active
> scope** using the existing SteamSpy `ccu` metric. The user-facing wording is
> corrected to match the verified semantics of `ccu` (see Section 4A and
> Section 13). Only `monthly-listeners` and `twitch-followers` remain deferred.

This plan is implementation-focused. It assumes the reader has the current
codebase and does not restate general architecture beyond what is needed to
implement each phase. Every claim about current behavior is sourced to a file
and line. Provider contracts were verified against authoritative documentation
via Context7 (see Section 12 for the evidence log). Anything not directly
confirmed is labelled `Needs Verification` with a qualifier.

---

## 1. Current Architecture (confirmed facts)

The gameplay path is a fail-closed pipeline. A category can only become
playable when **all** of the following are true, in order:

1. **Semantic identity** exists in
   [`SEMANTIC_CATEGORIES`](lib/catalog/semanticCatalog.ts:73).
2. **Availability** is `productionPlayable: true` in
   [`CATEGORY_AVAILABILITY`](lib/catalog/availability.ts:121), and all seven
   release gates are satisfied
   ([`isProductionPlayable()`](lib/catalog/availability.ts:94),
   [`assertAvailabilityConsistency()`](lib/catalog/availability.ts:283)).
3. **Provider mapping** exists in
   [`SEMANTIC_PROVIDER_MAPPING`](lib/catalog/availability.ts:336) and resolves
   via [`resolveProviderCategory()`](lib/catalog/availability.ts:350).
4. **Route authorization** passes in
   [`authorizeGameRoute()`](lib/catalog/routeAuthorization.ts:49).
5. **Dispatcher registration** exists in
   [`FETCHER_MAP`](lib/api/index.ts:27).
6. **Normalized data** survives the dispatcher's hard filter for `name` and
   `imageUrl` ([`index.ts`](lib/api/index.ts:61)) and yields ≥ 2 items
   ([`index.ts`](lib/api/index.ts:65)).

The route dispatcher
([`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:15)) authorizes before
dispatch and renders `unavailable` / `error` / `empty` states via
[`DerivedGameState`](components/game/DerivedGameState.tsx:1).

### Normalized contract

[`GameItem`](types/api.ts:6) requires: `id`, `name`, `imageUrl` (absolute URL,
**required**), `value` (number), `displayValue` (string). The dispatcher drops
any item missing `name` or `imageUrl`, so **every playable item must have a
usable absolute image URL**.

### Current playability

| Category | `productionPlayable` | Provider key | Evidence |
| --- | --- | --- | --- |
| `movie-series-rating` | `true` | `movie-ratings` | [`availability.ts`](lib/catalog/availability.ts:125) |
| `game-rating` | `true` | `game-ratings` | [`availability.ts`](lib/catalog/availability.ts:151) |

All other nine categories are non-playable
([`availability.ts`](lib/catalog/availability.ts:134)).

> **Note (revision 3):** `player-count` is currently non-playable and its
> availability record is `intentionally-hidden`
> ([`availability.ts`](lib/catalog/availability.ts:160)). This revision moves it
> into active implementation scope; the availability record is updated only when
> its release gates are satisfied with recorded evidence (Section 4A).

### Dormant adapters (present, not dispatched)

- [`rawg.ts`](lib/api/rawg.ts:46) — exports `fetchGameRatings` (collides with
  [`steamspy_ratings.ts`](lib/api/steamspy_ratings.ts:49)).
- [`cheapshark.ts`](lib/api/cheapshark.ts:54) — exports `fetchGameRatings`
  (same collision).
- [`fakestoreapi.ts`](lib/api/fakestoreapi.ts:45) — exports `fetchItemPrices`.

These are **not** reachable and are not part of this plan's scope.

### Reusable code identified before proposing new abstractions

- **Dispatcher + sanitize + shuffle:** [`fetchGameItems()`](lib/api/index.ts:48)
  already handles filtering, minimum-count, and shuffling. New adapters only
  need to return `GameItem[]`.
- **Error type:** [`ApiFetchError`](types/api.ts:21) is the established error
  contract; adapters throw it.
- **Caching:** adapters use Next.js `fetch(..., { next: { revalidate } })`
  ([`tmdb.ts`](lib/api/tmdb.ts:54), [`steamspy.ts`](lib/api/steamspy.ts:65)).
  Reuse this; do not add a cache layer.
- **Image URL construction:** TMDB uses `IMAGE_BASE` + `poster_path`
  ([`tmdb.ts`](lib/api/tmdb.ts:31)); Steam uses a CDN helper
  ([`steamspy.ts`](lib/api/steamspy.ts:44)). Follow the same pattern per
  provider.
- **Gate helpers:** [`satisfiedGates()`](lib/catalog/availability.ts:103) and
  [`unverifiedGates()`](lib/catalog/availability.ts:82) already exist for
  availability records.
- **Route authorization:** no change needed for new categories beyond the
  mapping entry; the function is category-agnostic.
- **Existing SteamSpy adapter (revision 3):**
  [`fetchGamePlayerbase()`](lib/api/steamspy.ts:61) already fetches
  `top100in2weeks`, maps `ccu` → `value`, formats `displayValue`, builds a Steam
  CDN image URL, filters zero-CCU/nameless/over-long titles, and sorts by CCU.
  It is registered in [`FETCHER_MAP`](lib/api/index.ts:29) under the legacy key
  `game-playerbase`. This is the primary reuse target for `player-count`
  (Section 4A).

### Category classification for this plan

**(a) Reuse existing providers (lowest risk)**
- `player-count` — SteamSpy `ccu` (already integrated). **Promoted from
  deferred in revision 3 (Decision F).** Reuses the existing adapter; wording
  corrected to `Peak Concurrent Players` (Section 4A).
- `release-date` — TMDB (already integrated). **Movies + TV (Decision A).**
- `gross-revenue` — TMDB (already integrated). **Movies only (Decision B).**

**(b) Require new providers**
- `number-of-albums` — MusicBrainz (curated artist MBID pool, Decision C).
- `album-release-date` — MusicBrainz (curated artist MBID pool, Decision C).
- `youtube-subscribers` — YouTube Data API v3 (curated channel-ID pool,
  Decision D).
- `game-release-date` — IGDB (Twitch OAuth).

**(c) Deferred (Decision E — remain hidden/non-playable)**
- `monthly-listeners` — no approved commercial provider selected
  ([`availability.ts`](lib/catalog/availability.ts:199)).
- `twitch-followers` — no legitimate scalable provider path established
  ([`availability.ts`](lib/catalog/availability.ts:216)).

> **Revision 3:** `player-count` is no longer deferred. It moves to group (a)
> because it reuses an already-integrated provider and requires no new
> credential. Only `monthly-listeners` and `twitch-followers` remain deferred.

---

## 2. Resolved Product Decisions (no longer open questions)

These are **finalized**. They must not appear as open questions anywhere in
this plan or in the resulting implementation.

| ID | Decision | Consequence |
| --- | --- | --- |
| **A** | `release-date` supports **Movies AND TV Series**. Movies use TMDB `release_date`; TV uses TMDB `first_air_date`. Both normalize into the same `release-date` category. | Phase 1 must fetch and combine both media pools. |
| **B** | `gross-revenue` is **Movies only**. TV revenue is never invented or approximated. | Phase 1 gross-revenue is movie-only; UI/category copy must truthfully reflect a movie metric. |
| **C** | Music uses a **curated, manually verified static pool of MusicBrainz artist MBIDs** for `number-of-albums` and `album-release-date`. No dynamic artist search during gameplay. | Phase 2 iterates a static MBID list; the artist set may evolve but the strategy is fixed. |
| **D** | YouTube uses a **curated, manually verified static pool of YouTube channel IDs** for `youtube-subscribers`. No dynamic channel discovery during gameplay. | Phase 3 iterates a static channel-ID list; only gameplay-suitable channels. |
| **E** | `monthly-listeners` and `twitch-followers` remain **deferred** (hidden/non-playable). | No provider solution is implemented or invented for these. |
| **F** | `player-count` is **approved** using the existing SteamSpy `ccu` metric. The user-facing wording must truthfully match `ccu` semantics: **`Peak Concurrent Players`** (previous-day peak concurrent users), not a live/instantaneous count. | Phase 0 (new, lowest risk) reuses the existing SteamSpy adapter; the semantic catalog label/description and the adapter's `displayValue` copy are corrected. |

---

## 3. Cross-Cutting Rules (apply to every phase)

These rules are non-negotiable and are referenced by each phase.

1. **Never flip `productionPlayable` alone.** Promotion requires the mapping
   entry, dispatcher registration, normalized data with images, authorization
   resolution, and all seven gates satisfied. The consistency guard
   ([`assertAvailabilityConsistency()`](lib/catalog/availability.ts:283))
   throws if `productionPlayable` is true while any gate is unsatisfied.
2. **Every playable item needs an absolute `imageUrl`.** If a provider cannot
   supply a usable image for an item, that item must be filtered out in the
   adapter (as TMDB does at [`tmdb.ts`](lib/api/tmdb.ts:70)).
3. **Server-only credentials.** New keys use non-`NEXT_PUBLIC_` names and are
   read only inside `lib/api/*` adapters. Never reference values in client
   components, logs, plans, or handoffs. Reference variable **names** only.
4. **Fail closed.** Adapters throw [`ApiFetchError`](types/api.ts:21) on
   failure; the route renders `error`/`empty` states. Do not silently return
   partial pools below 2 items.
5. **No speculative infrastructure.** Add only what a planned category needs.
   No queue, database, cache service, worker, or background infrastructure
   unless repository/provider evidence proves one is necessary.
6. **Caching only where justified.** Use `revalidate` values proportional to
   data volatility; do not add a bespoke cache.
7. **Readiness stays evidence-driven.** A category remains hidden/non-playable
   until runtime evidence is recorded in its gate record. Two technically valid
   records are **not** sufficient for promotion (see Section 8).
8. **Preserve source precision.** Never invent a month/day the provider did not
   supply. `displayValue` preserves provider precision; a separate numeric
   `value` may be derived for comparison only.

### Files likely created or modified (master list)

| File | Action | Phases |
| --- | --- | --- |
| [`lib/api/steamspy.ts`](lib/api/steamspy.ts:1) | Modify (wording + optional filter) | 0 |
| [`lib/catalog/semanticCatalog.ts`](lib/catalog/semanticCatalog.ts:1) | Modify (`player-count` label/description/metric copy) | 0 |
| [`lib/api/tmdb.ts`](lib/api/tmdb.ts:1) | Modify (add fetchers) | 1 |
| [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:1) | **Create** | 2 |
| [`lib/api/youtube.ts`](lib/api/youtube.ts:1) | **Create** | 3 |
| [`lib/api/igdb.ts`](lib/api/igdb.ts:1) | **Create** | 4 |
| [`lib/api/index.ts`](lib/api/index.ts:1) | Modify (`FETCHER_MAP`) | 0–4 |
| [`lib/catalog/availability.ts`](lib/catalog/availability.ts:1) | Modify (mapping + gates) | 0–4 |
| [`types/game.ts`](types/game.ts:6) | Modify (`CategoryId` union) | 0–4 |
| [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1) | Modify (diagnostic list) | 0–4 (optional) |

> `types/game.ts` `CategoryId` is the key type for `FETCHER_MAP`
> ([`index.ts`](lib/api/index.ts:27)). New provider keys must be added to this
> union or the map will not type-check.

> **Curated pool data location (Decisions C and D):** the static MusicBrainz
> artist MBID list and the static YouTube channel-ID list are data, not
> secrets. Place them in a small, maintainable module (for example
> `lib/api/curatedPools.ts` or a `lib/api/data/` JSON module) with only the
> fields needed: for MusicBrainz, `{ mbid, name }`; for YouTube,
> `{ channelId, name }`. This file is **not** in the master list above because
> its exact path is an implementation choice; it must be added to the approved
> allowlist before Phase 2/3 implementation. `Needs Verification
> [product-decision]` is **not** required for the pool strategy (finalized);
> only the concrete artist/channel membership may evolve.

---

## 4A. Phase 0 — SteamSpy CCU (`player-count`) — NEW in revision 3

**Priority:** Highest. Reuses an already-integrated provider and requires **no
new credential**. This is the lowest-risk phase in the plan and is therefore
placed **first** in the implementation order (Section 11).

### Objective

Promote the existing `player-count` semantic category to active implementation
scope using the existing SteamSpy `ccu` metric, and correct all user-facing
wording so the UI truthfully describes what `ccu` measures.

### Verified provider semantics (authoritative)

> **Verified via provider evidence on 2026-10-12.** SteamSpy's own About page
> ([`steamspy.com/about`](https://steamspy.com/about)) states Steam Spy "pulls
> data every minute, but updates visualizations only once a day at night
> (GMT+2)" and that "the data is based on several days samples". The `steamr`
> reference, which documents the SteamSpy API response columns, defines `ccu`
> as **"Peak currently connected users (CCU) yesterday"**
> ([`jslth.github.io/steamr/reference/steamspy.html`](https://jslth.github.io/steamr/reference/steamspy.html)).

**Confirmed meaning of `ccu`:** the **peak concurrent-user count from the
previous day** — a daily peak, not a live instantaneous count and not an
all-time peak.

> **Correction to existing code comment:** the current adapter comment says
> `ccu` is "concurrent users — peak at time of request"
> ([`steamspy.ts`](lib/api/steamspy.ts:8)) and "Current concurrent users (peak
> CCU in last 2 weeks)" ([`steamspy.ts`](lib/api/steamspy.ts:26)). Both are
> **inaccurate** and must be corrected to "previous-day peak concurrent users".

> **Context7 note:** Context7 has **no SteamSpy API documentation library**
> (resolution returned unrelated libraries). Provider semantics were therefore
> verified against SteamSpy's own About page and the `steamr` API reference
> rather than Context7. This is recorded in Section 13.

### Finalized UI / category wording (Decision F)

| Surface | Value |
| --- | --- |
| Semantic category ID | `player-count` (unchanged — stable identity) |
| Provider key | `game-playerbase` (existing key; **reused, not renamed**) |
| Category label | **`Peak Concurrent Players`** |
| Category description | `Compare the previous day's peak concurrent players on Steam.` |
| `metricDescription` | `SteamSpy ccu: the peak number of concurrently connected players recorded yesterday. This is a daily peak, not a live count.` |
| `displayFormat` | `Peak concurrent-player count, labelled as a previous-day peak.` |
| `GameItem.value` | `ccu` (integer) |
| `displayValue` | e.g. `"1.23M peak players"` (see normalization) |

**Why not `Player Count`:** the old label implies a live/current count. `ccu`
is a **previous-day peak**, so `Player Count` would be misleading. `Peak
Concurrent Players` is the most truthful and understandable wording supported
by the verified semantics. `Current Concurrent Players` and `Recent Concurrent
Players` were rejected because they imply a live or rolling-window value that
`ccu` does not provide.

### Scope

- Modify [`lib/api/steamspy.ts`](lib/api/steamspy.ts:1) — correct comments and
  `displayValue` wording; optionally tighten the zero-CCU filter (see below).
- Modify [`lib/catalog/semanticCatalog.ts`](lib/catalog/semanticCatalog.ts:1) —
  update the `player-count` entry's `label`, `description`,
  `metricDescription`, `sourceDescription`, `providerCandidate`, and
  `displayFormat`.
- Modify [`lib/catalog/availability.ts`](lib/catalog/availability.ts:1) — add
  the mapping entry and update the availability record **only when gates are
  satisfied**.
- Modify [`lib/api/index.ts`](lib/api/index.ts:1) — no new fetcher needed; the
  existing `game-playerbase` key already maps to
  [`fetchGamePlayerbase()`](lib/api/steamspy.ts:61).
- Modify [`types/game.ts`](types/game.ts:6) — no change required; the legacy
  `game-playerbase` key already exists in the `CategoryId` union.
- No new environment variables. No new provider.

### Existing SteamSpy code that can be reused

- [`fetchGamePlayerbase()`](lib/api/steamspy.ts:61) — the whole fetcher.
- [`steamImageUrl()`](lib/api/steamspy.ts:44) — Steam CDN portrait cover art
  (`library_600x900.jpg`), keyed by `appid`.
- [`formatPlayerCount()`](lib/api/steamspy.ts:49) — number formatting (wording
  to be corrected).
- The `revalidate: 60 * 60` caching
  ([`steamspy.ts`](lib/api/steamspy.ts:65)).
- The existing `FETCHER_MAP` registration
  ([`index.ts`](lib/api/index.ts:29)).

### Provider endpoint (verified)

- `GET https://steamspy.com/api.php?request=top100in2weeks` — no API key.
- Response is a map of `appid` → game object; fields used: `appid`, `name`,
  `ccu`, `owners`.

### Provider request pattern

- Single request to `top100in2weeks` (existing behavior). No pagination needed.
- SteamSpy documents an allowed poll rate of **4 requests per second**; a single
  cached request per revalidation window is well within it.

### Provider response fields

| Field | Notes |
| --- | --- |
| `appid` | Steam application ID; required for the CDN image |
| `name` | game title; may be long DLC/bundle names |
| `ccu` | previous-day peak concurrent users (integer) |
| `owners` | owners range string; **not used** for `value` |

### Normalization strategy

- `value` = `ccu` (integer).
- `displayValue` = formatted count **with truthful wording**, e.g.
  `"1.23M peak players"` / `"12.3K peak players"` / `"1,234 peak players"`.
  The word "peak" must appear so the card does not imply a live count.
- `id` = `appid`.
- `name` = `name`.

### Image strategy

- Reuse [`steamImageUrl()`](lib/api/steamspy.ts:44):
  `https://cdn.akamai.steamstatic.com/steam/apps/<appid>/library_600x900.jpg`.
- This is an absolute URL, satisfying the `GameItem.imageUrl` requirement.
- Items without an `appid` are already filtered out
  ([`steamspy.ts`](lib/api/steamspy.ts:86)).

### Filtering rules

- Keep the existing filters: `ccu > 0`, non-empty `name`, `name.length <= 60`,
  truthy `appid` ([`steamspy.ts`](lib/api/steamspy.ts:81)).
- **`ccu = 0` decision (documented):** **exclude** `ccu = 0`. Reasoning: a
  previous-day peak of zero means the game recorded no concurrent players, which
  is not a meaningful comparison value and would create a large cluster of
  equal zero values, harming gameplay. This matches the existing adapter
  behavior, so no change is required. `Needs Verification [data-quality]`:
  confirm at runtime that excluding zeros still leaves a sufficiently large and
  diverse pool.

### Duplicate / equal-value handling

- Deduplicate by `appid` (the response is already keyed by `appid`, so
  duplicates are structurally unlikely; still assert uniqueness).
- Equal-value frequency: `ccu` values are large integers, so exact ties are
  rare among the top-100 pool. Readiness must still measure tie frequency
  (Section 9).

### Data freshness

- `ccu` is a **previous-day peak**, refreshed daily by SteamSpy. The metric is
  therefore at least one day stale by design.
- The UI wording ("previous day's peak") must make this staleness explicit so
  the player is not misled.

### Caching / revalidation

- Reuse the existing `revalidate: 60 * 60` (1 hour)
  ([`steamspy.ts`](lib/api/steamspy.ts:65)). Because the underlying metric only
  changes daily, a longer window (e.g. 6–24 hours) would also be defensible;
  keep the existing value unless readiness evidence suggests otherwise.

### Mapping / dispatcher / type changes

- [`SEMANTIC_PROVIDER_MAPPING`](lib/catalog/availability.ts:336) add:
  ```
  "player-count": "game-playerbase",
  ```
- [`FETCHER_MAP`](lib/api/index.ts:27) — **no change**; `game-playerbase`
  already maps to [`fetchGamePlayerbase()`](lib/api/steamspy.ts:61).
- `CategoryId` union in [`types/game.ts`](types/game.ts:6) — **no change**;
  `game-playerbase` already exists.

### Readiness requirements (do NOT promote on adapter existence alone)

A SteamSpy fetcher already existing does **not** make the category playable.
Before promotion, record evidence for:

1. **Sufficient valid games** — enough distinct `appid`s with images.
2. **Sufficient CCU/value diversity** — a spread of `ccu` values, not clustered.
3. **Equal-value frequency** — measured; must be manageable.
4. **Image availability** — high rate of resolvable Steam CDN covers.
5. **Missing/zero-value behavior** — confirm the `ccu = 0` exclusion leaves a
   healthy pool.
6. **Freshness** — confirm the previous-day-peak semantics are reflected in the
   UI copy.
7. **Provider reliability** — stable responses; document failure behavior.
8. **Failure behavior** — non-OK HTTP throws
   [`ApiFetchError`](types/api.ts:21); the route renders `error`/`empty`.

Promotion additionally requires all seven release gates satisfied with recorded
evidence ([`isProductionPlayable()`](lib/catalog/availability.ts:94),
[`assertAvailabilityConsistency()`](lib/catalog/availability.ts:283)). The
availability record for `player-count`
([`availability.ts`](lib/catalog/availability.ts:160)) is updated from
`intentionally-hidden` to a satisfied state **only after** this evidence exists.

### Runtime verification

- `GET /api/test-fetch?category=game-playerbase` (after adding it to the
  diagnostic list) to confirm ≥ 2 normalized items with absolute images.
- Confirm `displayValue` contains the word "peak".
- Confirm the Home category card shows `Peak Concurrent Players` and the
  previous-day-peak description.
- Gameplay route check in a browser when available.

### Acceptance criteria

- Fetcher returns ≥ 2 `GameItem`s with absolute `imageUrl`.
- `displayValue` wording truthfully states a previous-day peak.
- Semantic catalog label is `Peak Concurrent Players`; description and
  `metricDescription` state the previous-day-peak semantics.
- Mapping resolves; authorization returns `authorized` **only after** gates are
  satisfied.
- No client-reachable code references any server-only value.

### Rollback strategy

Remove the `"player-count": "game-playerbase"` mapping entry or set
`productionPlayable: false`. The category reverts to hidden without changing
semantic identity or stored scores.

### Remaining blockers

- `Needs Verification [data-quality]`: whether the top-100 pool yields
  sufficient distinct `ccu` values after excluding zeros.
- `Needs Verification [data-quality]`: image availability rate for the Steam CDN
  portrait covers across the pool.

---

## 4B. UI wording-impact inventory (revision 3)

Every user-facing place where the old `Player Count` wording could imply a
metric different from SteamSpy `ccu` must be checked. The architecture
**centralizes** category copy in
[`SEMANTIC_CATEGORIES`](lib/catalog/semanticCatalog.ts:73), so most surfaces
propagate automatically.

| Surface | File | Change needed |
| --- | --- | --- |
| Semantic category label | [`semanticCatalog.ts`](lib/catalog/semanticCatalog.ts:135) | **Yes** — `Player Count` → `Peak Concurrent Players` |
| Category description | [`semanticCatalog.ts`](lib/catalog/semanticCatalog.ts:136) | **Yes** — state previous-day peak |
| `metricDescription` | [`semanticCatalog.ts`](lib/catalog/semanticCatalog.ts:137) | **Yes** — state `ccu` = previous-day peak |
| `sourceDescription` / `providerCandidate` / `displayFormat` | [`semanticCatalog.ts`](lib/catalog/semanticCatalog.ts:139) | **Yes** — replace "unresolved current-concurrency" copy with SteamSpy `ccu` |
| Home category selector | [`CategorySelector.tsx`](components/home/CategorySelector.tsx:37) | **No** — reads `label`/`description` from the catalog projection |
| Category card | [`CategoryCard.tsx`](components/CategoryCard.tsx:43) | **No** — renders `category.label` / `category.description` |
| High Scores category filter + rows | [`HighScoresModal.tsx`](components/HighScoresModal.tsx:208) | **No** — reads `SEMANTIC_CATEGORIES` label/`metricDescription` |
| Gameplay card value | [`GameCard.tsx`](components/game/GameCard.tsx:100) | **No** — renders `item.displayValue` (fixed in the adapter) |
| Adapter `displayValue` copy | [`steamspy.ts`](lib/api/steamspy.ts:49) | **Yes** — add "peak" wording |
| Adapter comments | [`steamspy.ts`](lib/api/steamspy.ts:8) | **Yes** — correct inaccurate `ccu` description |
| Root metadata description/keywords | [`app/layout.tsx`](app/layout.tsx:13) | **Check** — mentions "game playerbases"; `Needs Verification [product-decision]` whether to update |
| Legacy `CATEGORIES` label | [`types/game.ts`](types/game.ts:54) | **No** — legacy `game-playerbase` label is not part of the semantic catalog path; do not change unless separately scoped |

**Preference:** change the centralized semantic/catalog label and the adapter
`displayValue` only. Do **not** duplicate copy into individual components.

---

## 4. Phase 1 — TMDB Extensions (`release-date`, `gross-revenue`)

**Priority:** Highest. Reuses an already-integrated provider and credential.

### Objective

Add two fetchers to [`lib/api/tmdb.ts`](lib/api/tmdb.ts:1) that reuse the
existing `TMDB_API_KEY` and `BASE_URL`/`IMAGE_BASE` constants:

- `fetchReleaseDates()` → provider key `release-dates` (Movies + TV).
- `fetchMovieGrossRevenue()` → provider key `movie-gross-revenue` (Movies only).

### Scope

- Modify [`lib/api/tmdb.ts`](lib/api/tmdb.ts:1) only.
- No new environment variables.
- No new provider.

### Provider endpoints (verified via Context7)

- **Movies:** `GET /movie/popular` — same endpoint as existing
  [`fetchMovieRatings()`](lib/api/tmdb.ts:40). Response `results[]` includes
  `id`, `title`, `poster_path`, `release_date` (`YYYY-MM-DD`).
- **TV:** `GET /tv/popular` — TV list endpoint. Response `results[]` includes
  `id`, `name`, `poster_path`, `first_air_date` (`YYYY-MM-DD`).
- **Movie detail (for revenue):** `GET /movie/{movie_id}` — the **detail**
  endpoint. The `revenue` field is a detail-only field; it is **not** present
  in `/movie/popular` list results. Confirmed: the TMDB OpenAPI schema for
  `/3/movie/latest` (a detail-shaped response) includes `revenue` (integer,
  default `0`), while the `/3/movie/popular` list example contains no
  `revenue` key.

> **Corrected assumption:** the previous plan implied `/movie/popular`
> responses contain usable `revenue`. They do not. Revenue requires a
> per-movie detail call.

### Provider request pattern

**`release-date` (Movies + TV):**
1. Fetch `PAGES_TO_FETCH` pages of `/movie/popular` and `PAGES_TO_FETCH` pages
   of `/tv/popular` (reuse the existing `PAGES_TO_FETCH = 5` constant,
   [`tmdb.ts`](lib/api/tmdb.ts:36)).
2. Normalize each movie to `{ id, name: title, date: release_date, poster_path }`
   and each TV record to `{ id, name: name, date: first_air_date, poster_path }`.
3. Combine both pools into one array.

**`gross-revenue` (Movies only):**
1. Fetch a **bounded** candidate movie pool from `/movie/popular`
   (`PAGES_TO_FETCH` pages ≈ 100 candidates).
2. Collect the movie IDs.
3. Retrieve detail records via `/movie/{id}` for the bounded candidate set.
   **Bound the fan-out** (see below) — do not issue an unbounded N+1.
4. Keep only records with `revenue > 0`.
5. Normalize to `GameItem[]`.

### Bounded fan-out for revenue detail calls

- The candidate pool is bounded by `PAGES_TO_FETCH` (≈100 IDs).
- Issue detail requests in **bounded batches** (for example, chunk the ID list
  and `Promise.all` each chunk) rather than one unbounded `Promise.all` over
  the whole pool. This keeps concurrent requests predictable and avoids
  uncontrolled fan-out.
- Reuse the existing Next.js `revalidate` caching so repeated gameplay does not
  re-issue detail calls on every request.
- **Do not** introduce a queue, database, cache service, worker, or background
  infrastructure. A bounded in-adapter batch is sufficient.

### Provider response fields

| Field | Source | Notes |
| --- | --- | --- |
| `id` | list + detail | numeric TMDB ID |
| `title` / `name` | list | movie `title`, TV `name` |
| `poster_path` | list | may be `null` |
| `release_date` | movie list | may be `""` |
| `first_air_date` | TV list | may be `""` |
| `revenue` | movie **detail** | integer USD; frequently `0` |

### Normalization strategy

- **`release-date`:**
  - `value` = `Date.parse(date)` (epoch ms, numeric for comparison).
  - `displayValue` = the source date string, preserving source precision. Do
    **not** fabricate a date when the provider lacks one.
  - Filter out empty `release_date` / `first_air_date`.
- **`gross-revenue`:**
  - `value` = `revenue` (integer USD).
  - `displayValue` = formatted currency (e.g. `$2,847,000,000`).
  - Filter `revenue > 0`.

### ID strategy (mixed media)

- Movie and TV IDs come from **separate TMDB ID namespaces** and can collide
  numerically. To keep `GameItem.id` unique across the combined pool, prefix
  the normalized ID by media type, e.g. `movie-<id>` and `tv-<id>`. This is a
  small adapter-level solution; do **not** build a generic multi-media
  framework.

### Image strategy

Reuse `IMAGE_BASE` + `poster_path` exactly as
[`fetchMovieRatings()`](lib/api/tmdb.ts:79). Filter `poster_path !== null`.

### Missing-data handling

- Drop records with empty/missing dates (`release-date`).
- Drop records with `revenue <= 0` or missing `revenue` (`gross-revenue`).
- Drop records with `poster_path === null`.

### Duplicate handling

- Deduplicate by normalized ID within each pool (a title can appear on multiple
  popular pages).

### Equal-value / tie considerations

- `release-date`: many titles share a date. This is expected and acceptable for
  a date-comparison category, but readiness must confirm sufficient **distinct**
  dates (Section 8).
- `gross-revenue`: exact ties are rare; readiness must still confirm value
  diversity.

### Pagination / batching

- List endpoints: `PAGES_TO_FETCH` pages each (existing pattern).
- Detail endpoint: bounded batches over the candidate ID set.

### Rate-limit behavior

- TMDB does not publish a hard per-second limit for this usage; the bounded
  page count and batched detail calls keep request volume predictable. Treat
  HTTP 429 as a failure (throw `ApiFetchError`).

### Caching / revalidation

- Reuse the existing 6-hour `revalidate`
  ([`tmdb.ts`](lib/api/tmdb.ts:54)) for list calls.
- Detail calls: use a long `revalidate` (revenue is stable once released).

### Credentials / env vars

- `TMDB_API_KEY` — already required; **no new variable**.

### Mapping / dispatcher / type changes

- [`SEMANTIC_PROVIDER_MAPPING`](lib/catalog/availability.ts:336) add:
  ```
  "release-date": "release-dates",
  "gross-revenue": "movie-gross-revenue",
  ```
- [`FETCHER_MAP`](lib/api/index.ts:27) add both keys mapped to the new fetchers.
- `CategoryId` union in [`types/game.ts`](types/game.ts:6) add both keys.

### Error handling / safe failure

Throw [`ApiFetchError`](types/api.ts:21) on non-OK HTTP, matching
[`tmdb.ts`](lib/api/tmdb.ts:63). Partial provider failure (some detail calls
fail) must not silently produce a thin pool: either fail the fetch or ensure
the surviving pool still meets readiness; document the chosen behavior. The
dispatcher's ≥ 2 filter and the route's `empty` state handle thin pools.

### Tests

- Source/type read-back of the new fetchers.
- Adapter-level: verify movie+TV combination, ID prefixing, date filtering,
  `revenue > 0` filtering, and poster filtering.
- Invalid/missing provider fields: empty dates, `revenue = 0`, `poster_path =
  null`.
- Duplicate handling across pages.
- Dispatcher integration: `fetchGameItems("release-dates")` and
  `fetchGameItems("movie-gross-revenue")` return ≥ 2 items.
- Mapping + authorization: `authorizeGameRoute("classic", "release-date")`
  returns `authorized` only after gates are satisfied.

### Runtime / manual verification

- `GET /api/test-fetch?category=release-dates` and
  `...movie-gross-revenue` (after adding them to the diagnostic list) to
  confirm ≥ 2 normalized items with images.
- Confirm `release_date`/`first_air_date` precision is preserved and
  `revenue > 0` filtering works.
- Gameplay route check in a browser when available.

### Readiness evidence

Record, per category: distinct entity count, distinct date/value count,
duplicate/equal-value frequency, missing-data rate, image availability rate,
and provider failure behavior.

### Acceptance criteria

- Both fetchers return ≥ 2 `GameItem`s with absolute `imageUrl`.
- Mixed-media IDs are unique.
- Mapping resolves; authorization returns `authorized` **only after** gates
  are satisfied.
- No client-reachable code references `TMDB_API_KEY`.

### Rollback strategy

Removing the mapping entry or setting `productionPlayable: false` hides the
category without changing semantic identity or stored scores.

### Remaining blockers

- `Needs Verification [data-quality]`: `revenue` coverage for the popular pool
  (many popular titles have `revenue = 0`).

---

## 5. Phase 2 — MusicBrainz (`number-of-albums`, `album-release-date`)

**Priority:** Medium. New provider, no API key, but strict rate limits.

### Objective

Create [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:1) with:

- `fetchArtistAlbumCounts()` → provider key `artist-album-counts`.
- `fetchAlbumReleaseDates()` → provider key `album-release-dates`.

Both iterate the **curated static artist MBID pool** (Decision C).

### Scope

- Create [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:1).
- Add the curated pool data module (path to be added to the allowlist).
- No new environment variables.

### Provider endpoints (verified via Context7)

- **Browse release groups by artist:**
  `GET https://musicbrainz.org/ws/2/release-group?artist=<mbid>&type=album&fmt=json&limit=<n>&offset=<n>`
- **Response:** `release-groups[]` with `id`, `title`, `first-release-date`,
  `primary-type`; plus top-level `release-group-count` and
  `release-group-offset` (browse responses expose a `count`/`offset` pair, e.g.
  `release-count`/`release-offset` for releases).
- **Type filter:** `type=album` filters to primary type Album; multiple types
  can be OR-ed with `|` (e.g. `type=album|ep`).

### Provider request pattern

- Iterate the curated MBID list.
- For each artist, page through release groups using `limit`/`offset`.
- **Serialize requests** (no `Promise.all` fan-out) to respect the rate limit.

### Pagination / batching (corrected)

> **Corrected assumption:** the previous plan treated a single default response
> page's release-group count as the complete album count. That is wrong.

- Browse requests support paging via `offset` and `limit`; **default limit is
  25, maximum is 100**.
- The response exposes a total count (`release-group-count` for browse). Use
  the count metadata to determine the complete album count, or page until the
  accumulated results reach the reported count.
- Increment `offset` by the **actual number of records received**, not by the
  requested `limit` (MusicBrainz may return fewer than requested).
- For `number-of-albums`, count release groups whose `primary-type === "Album"`
  across **all** pages, not just the first page.

### Rate-limit behavior (verified)

- **Maximum one request per second.** Exceeding it risks IP blocking.
- A descriptive `User-Agent` is **required** on all requests.
- Because the artist pool is curated, prefer predictable bounded requests over
  dynamic discovery. Serialize with a ≥1s spacing between calls.

### Provider response fields

| Field | Notes |
| --- | --- |
| `release-groups[].id` | release-group MBID |
| `release-groups[].title` | album title |
| `release-groups[].first-release-date` | may be `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` |
| `release-groups[].primary-type` | `Album`, `Single`, `EP`, etc. |
| `release-group-count` | total count for the browse query |

### Normalization strategy

- **`number-of-albums`:**
  - `value` = count of release groups with `primary-type === "Album"` across
    all pages.
  - `displayValue` = `"N albums"`.
  - This represents an **artist**, not an album (see image strategy).
- **`album-release-date`:**
  - One item per release group.
  - `value` = a deterministic numeric comparison key derived from the source
    date, **without inventing precision**. Strategy: parse the source string
    into `{ year, month?, day? }`; compute a comparable number using only the
    supplied components (e.g. `year * 10000 + (month ?? 0) * 100 + (day ?? 0)`).
    A year-only date sorts before any month/day within that year; this is a
    deterministic internal ordering, not a claim of exact date.
  - `displayValue` = the **original source string** (e.g. `1998` stays `1998`,
    `2012-05` stays `2012-05`). Do **not** invent missing month/day.

### ID strategy

- `number-of-albums`: `id` = artist MBID.
- `album-release-date`: `id` = release-group MBID.

### Image strategy (corrected — highest risk)

> **Corrected assumption:** the previous plan assumed Cover Art Archive art is
> generally available. It is not guaranteed per release group.

- **Cover Art Archive front image:**
  `GET https://coverartarchive.org/release-group/<mbid>/front` returns a
  **307 redirect** to the actual image (e.g. an `archive.org` URL). A missing
  cover returns a non-2xx response.
- Because the endpoint redirects, a naive `<img src>` may work, but broken
  entries must be excluded. Decide and document whether availability is checked
  (e.g. a HEAD/GET check following redirects) or whether the redirect URL is
  used directly and broken entries are filtered by a readiness pass.
- **`number-of-albums` represents an artist, not an album.** Do **not** blindly
  use a random album's artwork as the artist image. Prefer truthful entity
  imagery. If the provider combination cannot reliably supply suitable artist
  images, leave this as a **clearly labelled implementation blocker** rather
  than inventing a misleading solution.
- Items without a resolvable image must be filtered out.

### Missing-data handling

- Drop release groups with empty `first-release-date` for `album-release-date`.
- Drop items whose image cannot be resolved.

### Duplicate handling

- Deduplicate by release-group MBID.

### Equal-value / tie considerations

- `number-of-albums`: many artists share small counts; readiness must confirm
  sufficient distinct counts.
- `album-release-date`: shared dates are expected; readiness must confirm
  sufficient distinct dates.

### Caching / revalidation

- Release data is stable; use a long `revalidate`.

### Credentials / env vars

- None required for MusicBrainz itself.
- A descriptive `User-Agent` string (a constant, not a secret).

### Mapping / dispatcher / type changes

- [`SEMANTIC_PROVIDER_MAPPING`](lib/catalog/availability.ts:336) add:
  ```
  "number-of-albums": "artist-album-counts",
  "album-release-date": "album-release-dates",
  ```
- Register both keys in [`FETCHER_MAP`](lib/api/index.ts:27) and extend the
  `CategoryId` union in [`types/game.ts`](types/game.ts:6).

### Error handling / safe failure

- Throw [`ApiFetchError`](types/api.ts:21) on non-OK HTTP.
- A 503 from MusicBrainz must surface as an error, not a partial pool.

### Tests

- Source/type read-back.
- Adapter-level: pagination correctness (count across all pages), partial-date
  precision preservation, image filtering.
- Invalid/missing fields: empty `first-release-date`, missing cover.
- Duplicate handling by MBID.
- Dispatcher integration and mapping/authorization.

### Runtime / manual verification

- `GET /api/test-fetch?category=artist-album-counts` and
  `...album-release-dates`.
- Confirm rate-limit compliance (no 503s under normal load) and image
  resolution.

### Readiness evidence

Record: distinct artist count, distinct album-count values, distinct dates,
duplicate frequency, missing-date rate, image availability rate, and
rate-limit behavior.

### Acceptance criteria

- Both fetchers return ≥ 2 items with resolvable images.
- Album count reflects **all** pages, not one page.
- Partial date precision preserved in `displayValue`.
- No rate-limit violations.

### Rollback strategy

Same as Phase 1: remove mapping or set `productionPlayable: false`.

### Remaining blockers

- `Needs Verification [provider-capability]`: Cover Art Archive reliability and
  the artist-image strategy for `number-of-albums`.
- `Needs Verification [data-quality]`: whether the curated pool yields
  sufficient distinct values.

---

## 6. Phase 3 — YouTube Data API (`youtube-subscribers`)

**Priority:** Medium. New provider requiring an API key.

### Objective

Create [`lib/api/youtube.ts`](lib/api/youtube.ts:1) with
`fetchYouTubeSubscribers()` → provider key `youtube-subscribers`, iterating the
**curated static channel-ID pool** (Decision D).

### Scope

- Create [`lib/api/youtube.ts`](lib/api/youtube.ts:1).
- Add the curated channel-ID pool data module (path to be added to the
  allowlist).
- New server-only env var `YOUTUBE_API_KEY`.

### Provider endpoint (verified via Context7)

- `GET https://www.googleapis.com/youtube/v3/channels`
  with `part=snippet,statistics&id=<comma-separated channel IDs>&key=<API_KEY>`.
- Response `items[]` includes `id`, `snippet.thumbnails`, and
  `statistics.subscriberCount` (string integer) plus
  `statistics.hiddenSubscriberCount` (boolean).

### Provider request pattern

- Batch the curated channel IDs into `channels.list` calls.
- **Batching limit:** the `id` parameter accepts a comma-separated list; keep
  each request within the documented per-request ID limit (commonly 50). Chunk
  the curated pool accordingly.

### Quota cost (verified)

- `channels.list` costs **1 unit** per call.
- Default daily quota is 10,000 units. With a curated pool and long
  `revalidate`, quota usage is negligible.

### Provider response fields

| Field | Notes |
| --- | --- |
| `items[].id` | channel ID |
| `items[].snippet.title` | channel name |
| `items[].snippet.thumbnails.high.url` | thumbnail (requires `part=snippet`) |
| `items[].statistics.subscriberCount` | string integer |
| `items[].statistics.hiddenSubscriberCount` | boolean |

### Normalization strategy

- `value` = `parseInt(subscriberCount, 10)`.
- `displayValue` = localized count (e.g. `"112,000,000 subscribers"`).
- Filter out channels with `hiddenSubscriberCount === true` or absent
  `subscriberCount`.

### ID strategy

- `id` = channel ID.

### Image strategy

- Use `snippet.thumbnails.high.url` (requires `part=snippet,statistics`).
- Filter items without a thumbnail.

### Missing-data handling

- Drop channels with hidden/absent subscriber counts.
- Drop channels without a thumbnail.

### Duplicate handling

- Deduplicate by channel ID.

### Equal-value / tie considerations (critical)

> **Corrected assumption:** the previous plan did not account for YouTube
> subscriber counts being **rounded** (e.g. `1.2M`), which produces many equal
> values.

- Readiness must explicitly measure duplicate/equal subscriber values and
  sufficient value diversity.
- The category must **not** be promoted merely because two technically valid
  channels exist.

### Pagination / batching

- Chunk curated IDs within the per-request ID limit.

### Rate-limit / quota behavior

- Handle `quotaExceeded` (HTTP 403) as an error. Do not silently return an
  empty pool.

### Caching / revalidation

- Subscriber counts change; use a moderate `revalidate`.

### Credentials / env vars

- `YOUTUBE_API_KEY` — **new**, server-only, non-`NEXT_PUBLIC_`.

### Mapping / dispatcher / type changes

- [`SEMANTIC_PROVIDER_MAPPING`](lib/catalog/availability.ts:336) add:
  ```
  "youtube-subscribers": "youtube-subscribers",
  ```
- Register the key in [`FETCHER_MAP`](lib/api/index.ts:27) and extend the
  `CategoryId` union in [`types/game.ts`](types/game.ts:6).

### Error handling / safe failure

Throw [`ApiFetchError`](types/api.ts:21) on non-OK HTTP or quota errors.

### Tests

- Source/type read-back.
- Adapter-level: batching/chunking, hidden-count filtering, thumbnail
  filtering, equal-value detection.
- Invalid/missing fields: hidden subscriber count, missing thumbnail.
- Dispatcher integration and mapping/authorization.

### Runtime / manual verification

- `GET /api/test-fetch?category=youtube-subscribers`.
- Confirm ≥ 2 items with thumbnails and correct subscriber values.

### Readiness evidence

Record: distinct channel count, distinct subscriber values, equal-value pair
frequency, hidden-count rate, missing-thumbnail rate, and quota behavior.

### Acceptance criteria

- Fetcher returns ≥ 2 items with absolute thumbnail URLs.
- Quota errors surface as `error` state, not silent empty.
- Readiness confirms sufficient value diversity (not just two valid channels).

### Rollback strategy

Same as Phase 1.

### Remaining blockers

- `Needs Verification [environment-specific]`: quota allocation for the
  project's API key.
- `Needs Verification [data-quality]`: whether the curated channel pool yields
  sufficient distinct subscriber values.

---

## 7. Phase 4 — IGDB (`game-release-date`)

**Priority:** Lower. New provider requiring Twitch OAuth2.

### Objective

Create [`lib/api/igdb.ts`](lib/api/igdb.ts:1) with `fetchGameReleaseDates()` →
provider key `game-release-dates`.

### Scope

- Create [`lib/api/igdb.ts`](lib/api/igdb.ts:1).
- New server-only env vars `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`.
- No new infrastructure beyond a small in-module token cache.

### Provider endpoints (verified via Context7)

- **Auth:** `POST https://id.twitch.tv/oauth2/token` with query params
  `client_id`, `client_secret`, `grant_type=client_credentials`.
  Response: `{ access_token, expires_in, token_type }` (`expires_in` in
  seconds; observed example ≈ 5,587,808s ≈ 64 days).
- **Query:** `POST https://api.igdb.com/v4/games` with headers
  `Client-ID: <ID>` and `Authorization: Bearer <token>`, body
  `fields name,first_release_date,cover.url;`.
- `first_release_date` is a Unix timestamp (seconds).
- `cover.url` is protocol-relative (e.g. `//images.igdb.com/...`).

### Provider request pattern

1. Acquire a token via client-credentials.
2. Query the games endpoint with the required fields.
3. Normalize to `GameItem[]`.

### Token handling (simple server-side cache)

- Cache the token in **module scope** with its expiry timestamp.
- Reuse the token until near expiry; re-acquire after expiry.
- On auth failure (non-OK token response), throw
  [`ApiFetchError`](types/api.ts:21).
- **Do not** build a separate authentication service.

### Rate-limit behavior (verified)

- **4 requests per second**; exceeding it returns HTTP `429 Too Many
  Requests`.
- Up to **8 open requests** at any moment.
- Keep request volume low (a single games query per fetch); treat `429` as a
  failure.

### Provider response fields

| Field | Notes |
| --- | --- |
| `id` | IGDB game ID |
| `name` | game title |
| `first_release_date` | Unix seconds; may be absent |
| `cover.url` | protocol-relative; may be absent |

### Normalization strategy

- `value` = `first_release_date` (Unix seconds).
- `displayValue` = formatted date.
- Filter items without `first_release_date`.

### ID strategy

- `id` = IGDB game ID.

### Image strategy

- `cover.url` is protocol-relative; prefix with `https:` and upscale the size
  segment (e.g. `t_cover_big`).
- Filter items without a cover.

### Missing-data handling

- Drop games without `first_release_date`.
- Drop games without a cover.

### Duplicate handling

- Deduplicate by IGDB game ID.

### Equal-value / tie considerations

- Shared release dates are expected; readiness must confirm sufficient
  distinct dates.

### Pagination / batching

- A single bounded games query is sufficient for this use case; if paging is
  needed, respect the 4 req/s and 8-open-request limits.

### Caching / revalidation

- Release dates are stable; use a long `revalidate`.

### Credentials / env vars

- `TWITCH_CLIENT_ID` — **new**, server-only.
- `TWITCH_CLIENT_SECRET` — **new**, server-only, never logged or exposed.

### Mapping / dispatcher / type changes

- [`SEMANTIC_PROVIDER_MAPPING`](lib/catalog/availability.ts:336) add:
  ```
  "game-release-date": "game-release-dates",
  ```
- Register the key in [`FETCHER_MAP`](lib/api/index.ts:27) and extend the
  `CategoryId` union in [`types/game.ts`](types/game.ts:6).

### Error handling / safe failure

- Throw [`ApiFetchError`](types/api.ts:21) on auth failure or non-OK HTTP.
- Treat `429` as a failure.

### Tests

- Source/type read-back.
- Adapter-level: token caching/reuse, cover URL normalization, missing-date
  and missing-cover filtering.
- Invalid/missing fields: absent `first_release_date`, absent `cover`.
- Dispatcher integration and mapping/authorization.

### Runtime / manual verification

- `GET /api/test-fetch?category=game-release-dates`.
- Confirm token caching and ≥ 2 items with covers.

### Readiness evidence

Record: distinct game count, distinct date count, duplicate frequency,
missing-date rate, missing-cover rate, and auth/rate-limit behavior.

### Acceptance criteria

- Fetcher returns ≥ 2 items with absolute cover URLs.
- Auth failures surface as `error` state.
- Token is reused across calls until near expiry.

### Rollback strategy

Same as Phase 1.

### Remaining blockers

- `Needs Verification [environment-specific]`: Twitch app credentials and
  rate limits for the project's account.

---

## 8. Deferred Categories (Decision E — remain hidden/non-playable)

These remain non-playable. **Do not implement** and do not invent a provider
solution.

| Category | Blocker | Status |
| --- | --- | --- |
| `monthly-listeners` | No approved commercial provider selected ([`availability.ts`](lib/catalog/availability.ts:199)) | Deferred (Decision E) |
| `twitch-followers` | No legitimate scalable provider path ([`availability.ts`](lib/catalog/availability.ts:216)) | Deferred (Decision E) |

Deferral is a finalized decision, not an open question. These categories stay
hidden until a future, separately approved task changes the decision.

> **Revision 3:** `player-count` was removed from this list and promoted to
> active scope (Decision F, Section 4A). Only `monthly-listeners` and
> `twitch-followers` remain deferred.

---

## 9. Category Readiness Requirements

A category must **not** become playable based merely on the technical minimum
of two valid records. Before promotion, require evidence for an adequately
playable pool. Exact numeric thresholds are not invented here because no
product threshold exists; instead, the following must be **measured and
verified** before promotion:

1. **Distinct valid entities** — enough distinct entities to sustain gameplay.
2. **Metric/value diversity** — sufficient spread of `value`s, not clustered
   on a few values.
3. **Duplicate / equal-value frequency** — manageable; explicitly measured
   (critical for YouTube rounded counts, MusicBrainz small album counts, and
   SteamSpy `ccu` after excluding zeros).
4. **Valid meaningful images** — high image-availability rate; broken images
   excluded.
5. **Low missing-data rate** — the target field is present for the large
   majority of records.
6. **Correct metric semantics** — the displayed metric truthfully matches the
   category (e.g. `gross-revenue` is a movie metric; `number-of-albums` is an
   artist metric; `player-count` is a **previous-day peak** concurrent-player
   metric, not a live count).
7. **Suitable data freshness** — `revalidate` matches volatility.
8. **Predictable provider behavior** — stable responses, documented limits.
9. **Acceptable rate-limit behavior** — no violations under normal load.
10. **Working failure/fallback handling** — provider failures surface as
    `error`, not silent thin pools.

Promotion additionally requires all seven release gates satisfied with
recorded evidence ([`isProductionPlayable()`](lib/catalog/availability.ts:94),
[`assertAvailabilityConsistency()`](lib/catalog/availability.ts:283)).

---

## 10. Testing and Verification

> **Test framework status:** re-inspected. `package.json`
> ([`package.json`](package.json:1)) exposes only `dev`, `build`, `start`,
> `lint`; there is **no test framework** in `dependencies`/`devDependencies`.
> The only `@playwright/test` reference is an **optional peer dependency of
> Next.js** inside `package-lock.json`, not a project test setup. No test
> framework is introduced during this planning phase.

Per phase, cover:

- **Source/type verification** — read-back of new fetchers and types.
- **Adapter-level behavior** — normalization, filtering, batching/pagination.
- **Invalid/missing provider fields** — empty dates, zero revenue, hidden
  counts, missing covers/thumbnails.
- **Duplicate handling** — dedupe by ID.
- **Image filtering** — items without resolvable images excluded.
- **Dispatcher integration** — `fetchGameItems(<key>)` returns ≥ 2 items.
- **Semantic/provider mapping** — `resolveProviderCategory()` resolves.
- **Authorization** — `authorizeGameRoute()` returns `authorized` only after
  gates are satisfied.
- **Provider failures** — non-OK HTTP, quota, auth, rate-limit surface as
  `error`.
- **Runtime fetch verification** — via
  [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1) where it
  remains suitable.
- **Gameplay verification** — exercise the route in a browser when available.

Do not rely solely on manual UI checks when deterministic adapter/mapping
behavior can be tested. If a test framework is later approved, add
adapter-level tests for the above; that is a separate approved task.

---

## 11. Implementation Order

1. **Phase 0 (SteamSpy CCU)** — `player-count`. **NEW, placed first in
   revision 3.** Reuses the already-integrated SteamSpy adapter and requires no
   new credential, so it is the lowest-risk phase. The only work is wording
   correction, a mapping entry, and readiness evidence.
2. **Phase 1 (TMDB)** — `release-date` (Movies + TV), `gross-revenue`
   (Movies only). Reuses existing provider/credential; low risk.
3. **Phase 2 (MusicBrainz)** — `number-of-albums`, `album-release-date`.
   New provider, no key, but rate-limit and image risk.
4. **Phase 3 (YouTube Data API)** — `youtube-subscribers`. New provider with
   API key.
5. **Phase 4 (IGDB)** — `game-release-date`. New provider with OAuth2.
6. **Deferred** — `monthly-listeners`, `twitch-followers` (Decision E).

**Why `player-count` moved to the front:** it reuses an existing adapter
([`fetchGamePlayerbase()`](lib/api/steamspy.ts:61)) and an existing dispatcher
key (`game-playerbase`), so it has the smallest change surface and no new
credential or provider dependency. Placing it first is the lowest-risk order.
The remaining phases keep their relative order; no phase was reordered
arbitrarily.

Each phase is independently deliverable and reversible. A category stays
hidden until its gates are satisfied with recorded evidence.

---

## 12. Needs Verification (classified)

Only genuinely unresolved items remain. Resolved product decisions A–F are
**not** listed here.

### Provider capability

- `Needs Verification [provider-capability]`: MusicBrainz Cover Art Archive
  reliability and the artist-image strategy for `number-of-albums` (an artist
  metric must not use random album art).
- `Needs Verification [provider-capability]`: TMDB `revenue` coverage for the
  popular pool (many popular titles have `revenue = 0`).

### Environment-specific

- `Needs Verification [environment-specific]`: YouTube quota allocation for
  the project's API key.
- `Needs Verification [environment-specific]`: Twitch/IGDB credentials and
  rate limits for the project's account.

### Data quality

- `Needs Verification [data-quality]`: whether the curated MusicBrainz artist
  pool yields sufficient distinct album counts and dates.
- `Needs Verification [data-quality]`: whether the curated YouTube channel
  pool yields sufficient distinct subscriber values (rounded counts create
  ties).
- `Needs Verification [data-quality]`: TMDB `revenue` coverage (see provider
  capability above).
- `Needs Verification [data-quality]`: whether the SteamSpy top-100 pool yields
  sufficient distinct `ccu` values for `player-count` after excluding zeros.
- `Needs Verification [data-quality]`: Steam CDN portrait-cover availability
  rate across the SteamSpy pool for `player-count`.

### Capability unavailable

- `Needs Verification [capability-unavailable]`: no test framework confirmed
  in the project.
- `Needs Verification [capability-unavailable]`: Context7 has no SteamSpy API
  documentation library; `ccu` semantics were verified from SteamSpy's About
  page and the `steamr` API reference instead (Section 13).

### Product decision

- `Needs Verification [product-decision]`: whether the root metadata
  description/keywords in [`app/layout.tsx`](app/layout.tsx:13) (which mention
  "game playerbases") should be updated to match the corrected
  `Peak Concurrent Players` wording. This is a copy/product call, not a
  technical one.
- Decisions A–F are otherwise finalized. Any new product decision that cannot
  be answered from them must be raised explicitly and must not be silently
  resolved by the implementer.

---

## 13. Provider Evidence Log

Provider contracts were verified against authoritative documentation on
2026-10-12. Most were verified via Context7; SteamSpy was verified from
provider-owned/authoritative sources because Context7 has no SteamSpy API
documentation library.

| Provider | Source | Key facts confirmed |
| --- | --- | --- |
| TMDB | Context7 `/websites/developer_themoviedb_reference` | `/movie/popular` list results include `release_date`, `poster_path`, `title`; list results do **not** include `revenue`. Detail-shaped responses (e.g. `/3/movie/latest`) include `revenue` (integer, default `0`). |
| MusicBrainz | Context7 `/websites/musicbrainz_doc` | Browse supports `offset`/`limit` (default 25, max 100); responses expose a count/offset pair; `type=album` filters primary type Album; **max 1 request/second**; descriptive `User-Agent` required; Cover Art Archive `/release-group/<mbid>/front` returns a **307 redirect** to the image. |
| YouTube Data API | Context7 `/websites/developers_google_youtube_v3` | `channels.list` costs **1 unit**; `part` is required; `statistics.subscriberCount` and `statistics.hiddenSubscriberCount` (boolean) exist; `snippet.thumbnails` present with `part=snippet`; `id` accepts a comma-separated list. |
| IGDB | Context7 `/websites/api-docs_igdb` | Twitch OAuth2 client-credentials token endpoint returns `{ access_token, expires_in, token_type }`; games endpoint uses `Client-ID` + `Authorization: Bearer`; `first_release_date` is Unix seconds; `cover.url` is protocol-relative; rate limit **4 req/s**, up to **8 open requests**, `429` on excess. |
| SteamSpy | SteamSpy About page [`steamspy.com/about`](https://steamspy.com/about) and `steamr` API reference [`jslth.github.io/steamr/reference/steamspy.html`](https://jslth.github.io/steamr/reference/steamspy.html) | `ccu` = **"Peak currently connected users (CCU) yesterday"** — a **previous-day peak**, not a live count. SteamSpy pulls data every minute but updates visualizations once daily (GMT+2); data is based on several-day samples. Endpoint `top100in2weeks` returns a map of `appid` → game object with `appid`, `name`, `ccu`, `owners`. Allowed poll rate **4 requests/second**. |

> **Context7 limitation:** `resolve-library-id` for SteamSpy returned no
> matching API-documentation library. SteamSpy semantics were therefore
> verified from the provider's own About page and an authoritative API
> reference, and this substitution is recorded as
> `Needs Verification [capability-unavailable]` in Section 12.

Items not directly confirmed by the above remain labelled `Needs Verification`
with a qualifier in Section 12.

---

## 14. Implementation & Verification Log (2026-10-12)

This section records what was actually implemented and observed. Statuses use
the project vocabulary: `[Pass]`, `[Partial]`, `[Fail]`, `[Blocked]`,
`[Not tested]`.

### 14.1 Files created / modified

| File | Action | Phase |
| --- | --- | --- |
| [`lib/api/steamspy.ts`](lib/api/steamspy.ts:1) | Modified — corrected `ccu` comments and `displayValue` wording ("peak players") | 0 |
| [`lib/catalog/semanticCatalog.ts`](lib/catalog/semanticCatalog.ts:1) | Modified — `player-count` label/description/metric/source/provider/display copy | 0 |
| [`lib/api/tmdb.ts`](lib/api/tmdb.ts:1) | Modified — added `fetchReleaseDates()` and `fetchMovieGrossRevenue()` | 1 |
| [`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:1) | **Created** — curated MusicBrainz artist MBIDs + YouTube channel IDs | 2, 3 |
| [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:1) | **Created** — `fetchArtistAlbumCounts()`, `fetchAlbumReleaseDates()` | 2 |
| [`lib/api/youtube.ts`](lib/api/youtube.ts:1) | **Created** — `fetchYouTubeSubscribers()` | 3 |
| [`lib/api/igdb.ts`](lib/api/igdb.ts:1) | **Created** — `fetchGameReleaseDates()` with module-scope token cache | 4 |
| [`lib/api/index.ts`](lib/api/index.ts:1) | Modified — `FETCHER_MAP` registrations | 0–4 |
| [`lib/catalog/availability.ts`](lib/catalog/availability.ts:1) | Modified — `SEMANTIC_PROVIDER_MAPPING` + availability records | 0–4 |
| [`types/game.ts`](types/game.ts:6) | Modified — `CategoryId` union extended | 0–4 |
| [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1) | Modified — diagnostic category list | 0–4 |

### 14.2 Phase status

| Phase | Category(ies) | Implementation | Runtime verification |
| --- | --- | --- | --- |
| 0 — SteamSpy CCU | `player-count` | `[Pass]` | `[Pass]` |
| 1 — TMDB | `release-date`, `gross-revenue` | `[Pass]` | `[Pass]` |
| 2 — MusicBrainz | `number-of-albums`, `album-release-date` | `[Pass]` | `[Partial]` |
| 3 — YouTube | `youtube-subscribers` | `[Pass]` | `[Blocked]` |
| 4 — IGDB | `game-release-date` | `[Pass]` | `[Blocked]` |

### 14.3 Per-category outcome

| Category | Provider key | Implemented | Playable | Evidence / reason |
| --- | --- | --- | --- | --- |
| `player-count` | `game-playerbase` | Yes | **Yes (promoted)** | 97 items; 97 distinct `ccu` values (no ties); range 1–1,013,936; median 11,923; Steam CDN covers **96/97 full-pool resolved** (1 genuine HTTP 404, appid 417910; corrected 2026-10-12 — see Section 15.2); `displayValue` = "N peak players". |
| `release-date` | `release-dates` | Yes | **Yes (promoted)** | 192 items (movies + TV); source date precision preserved; mixed-media IDs prefixed `movie-`/`tv-`. |
| `gross-revenue` | `movie-gross-revenue` | Yes | **Yes (promoted)** | 65 items with `revenue > 0`; bounded `/movie/{id}` detail batches; `displayValue` = `$N,NNN,NNN`. |
| `number-of-albums` | `artist-album-counts` | Yes | **Yes (promoted 2026-10-13)** | Gameplay now reads a pre-generated local snapshot (`lib/api/data/artist-album-counts.snapshot.json`) instead of the request-time MusicBrainz + Wikidata crawl. Artist images resolved from Wikidata `P434` → `P18` via ONE batched SPARQL request (no fuzzy name matching); deterministic multi-`P18` rule (preferred rank, else canonical Commons file name). Snapshot: 17 items, 17/17 absolute Commons image URLs (0 empty), 16 distinct album-count values (1 tie), range 15–1285; Commons licensing measured 6/17 PD/CC0, 11/17 attribution-required, 0/17 unclear; attribution surfaced via the optional `GameItem.attribution` credit line. Snapshot load **~99 ms** (vs ~100 s live). Fail-closed verified. See Section 23. |
| `album-release-date` | `album-release-dates` | Yes | **Yes (promoted 2026-10-13)** | Gameplay now reads a pre-generated local snapshot (`lib/api/data/album-release-date.snapshot.json`) instead of the request-time MusicBrainz crawl. Snapshot: 120 items, 120 unique ids, 120 unique absolute images (0 empty), 101 unique dates, 16 tie groups (max 3/date), range 1963–2026. Snapshot load **~25–31 ms** (vs ~117 s live). Fail-closed verified (malformed + sub-2-item snapshots → HTTP 502). Live adapter preserved for regeneration via `npm run snapshot:album-release-date`. See Section 21. |
| `youtube-subscribers` | `youtube-subscribers` | Yes | **Yes (promoted 2026-10-13)** | `YOUTUBE_API_KEY` authenticates; 13/13 curated channels resolve; 13 items, 13 distinct subscriber values (0 ties), range 25.7M–521M; 0 hidden, 0 missing counts, 0 missing thumbnails; 13/13 thumbnails HTTP 200. See Section 17. |
| `game-release-date` | `game-release-dates` | Yes | **Yes (promoted 2026-10-13)** | Twitch client-credentials auth verified; token cache reused; 100 items, 100 distinct dates, 0% missing data, absolute HTTPS covers. See Section 16. |
| `monthly-listeners` | — | **Not implemented** | No | Deferred (Decision E). |
| `twitch-followers` | — | **Not implemented** | No | Deferred (Decision E). |

### 14.4 Provider / runtime evidence (2026-10-12)

- **SteamSpy `player-count`** `[Pass]`: `GET /api/test-fetch?category=game-playerbase`
  → HTTP 200, 97 normalized items. Distinct `ccu` = 97/97 (zero ties). Steam CDN
  portrait covers **20/20 sampled** HTTP 200 (original sample). `displayValue`
  contains "peak players". **Corrected 2026-10-12 (Section 15.2):** a full-pool
  check of all 97 covers resolved **96/97** (99.0%); the single failure is a
  genuine HTTP 404 for appid 417910. The earlier "100% image availability"
  summary was an overstatement of a 20-item sample and is corrected here.
- **TMDB `release-date`** `[Pass]`: `GET /api/test-fetch?category=release-dates`
  → HTTP 200, 192 items; `displayValue` preserves `YYYY-MM-DD`; both `movie-` and
  `tv-` prefixed IDs present.
- **TMDB `gross-revenue`** `[Pass]`: `GET /api/test-fetch?category=movie-gross-revenue`
  → HTTP 200, 65 items; all `revenue > 0`; `displayValue` = `$N,NNN,NNN`.
- **MusicBrainz** `[Partial]`: browse pagination confirmed (`release-group-count`
  = 509 for Pink Floyd, page returns 100); `primary-type === "Album"` filter
  works; partial dates preserved (`1983`, `2022-12-16`, `2018`). Cover Art
  Archive `/release-group/<mbid>/front` returned HTTP 200 for 5/10 sampled
  release groups and HTTP 500 for 5/10. MusicBrainz returned transient HTTP 503
  under rapid polling, confirming the 1 req/s limit is real; the adapter
  serializes with ≥1.1s spacing.
- **YouTube** `[Blocked]`: `YOUTUBE_API_KEY` unset; adapter throws
  `ApiFetchError` (fail-closed). No live quota/thumbnail/tie evidence obtainable.
- **IGDB** `[Blocked]`: `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` unset;
  adapter throws `ApiFetchError` (fail-closed). No live auth/cover/date evidence
  obtainable.

### 14.5 Application-level runtime verification

- **Home page** `[Pass]`: `GET /` → HTTP 200. Renders "Peak Concurrent Players"
  (old "Player Count" label absent), the previous-day-peak description, and all
  new category labels. Gated categories render the "Unavailable" marker.
- **Route authorization** `[Pass]`: `GET /game/classic?category=<id>`:
  - `movie-series-rating`, `game-rating` → full gameplay (pre-existing).
  - `player-count`, `release-date`, `gross-revenue` → full gameplay in both
    Classic and Time Attack after promotion.
  - `number-of-albums`, `album-release-date`, `youtube-subscribers`,
    `game-release-date`, `monthly-listeners`, `twitch-followers` → `unavailable`
    state (fail-closed).
  - Legacy `game-playerbase` → HTTP 404 (correctly rejected).
- **Gameplay content** `[Pass]`: `player-count` gameplay HTML contains 101 Steam
  CDN image URLs and "peak players" text; `release-date` renders 193 date values;
  `gross-revenue` renders formatted currency (e.g. `$28,341,469`).
- **Browser MCP verification** `[Blocked]` (original pass): both Playwright MCP
  and Chrome DevTools MCP reported "Not connected" in that session. Browser-level
  interactive verification (console errors, network panel, click-through) could
  not be performed. HTTP-level verification of the running server-rendered
  application was performed instead. **Resolved 2026-10-12:** Playwright MCP was
  available in the re-evaluation pass and browser verification was completed —
  see Section 15.1.

### 14.6 Repository checks

- `npx tsc --noEmit` → `[Pass]` (exit 0).
- `npm run lint` → `[Pass]` (0 errors; 2 pre-existing warnings unrelated to this
  change: an unused eslint-disable in `TimeAttackGame.tsx` and an unused type in
  `worldbank.ts`).
- `npm run build` → `[Pass]` (compiled successfully; all routes generated).

### 14.7 Remaining `Needs Verification`

- `Needs Verification [environment-specific]`: YouTube quota and IGDB/Twitch
  credentials for this project's account (both unset here).
- `Needs Verification [provider-capability]`: Cover Art Archive reliability
  (~50% observed) and the artist-image strategy for `number-of-albums`.
- `Needs Verification [data-quality]`: MusicBrainz curated-pool value diversity
  and `album-release-date` fetch performance.
- `Needs Verification [capability-unavailable]`: browser MCP verification
  (Playwright and Chrome DevTools both unavailable this session).
- `Needs Verification [product-decision]`: root metadata wording in
  [`app/layout.tsx`](app/layout.tsx:13) — left unchanged (see Section 12).

---

## 15. Post-Implementation Verification & Readiness Re-Evaluation Pass (2026-10-12)

This section records the second verification pass. It does **not** redesign or
reimplement the provider architecture. It verifies the running implementation,
reconciles questionable prior evidence, and re-evaluates readiness for every
non-playable category. Statuses use the project vocabulary: `[Pass]`,
`[Partial]`, `[Fail]`, `[Blocked]`, `[Not tested]`.

### 15.1 Browser runtime verification (Playwright MCP)

**MCP status:** Playwright MCP was **available** in this pass (the original pass
recorded both browser MCPs as unavailable). Chrome DevTools MCP was not used.

**Environment:** dev server already running at `http://localhost:3000`
(Next.js 16.3.4, Turbopack). `.env` present with `TMDB_API_KEY` only.

**Routes / modes exercised:**

| Check | Result | Evidence |
| --- | --- | --- |
| Home page `GET /` | `[Pass]` | HTTP 200; 4 domains, 11 categories rendered; "Peak Concurrent Players" label present; gated categories show "Unavailable". |
| Domain switching (Movies & Series / Gaming / Music / Social Media) | `[Pass]` | Each domain renders its categories with correct labels/descriptions. |
| Category selection + Go enablement | `[Pass]` | Selecting Release Date + Classic enabled the Go button. |
| Classic gameplay — `release-date` | `[Pass]` | Navigated to `/game/classic?category=release-date`; current card "The Simpsons" (1989-12-17), next card "Legend of the White Dragon"; images rendered. |
| Higher/Lower decision | `[Pass]` | Clicking Higher advanced the deck and incremented score 0 → 1; next card "Legend of the White Dragon" (2026-08-28). |
| Classic gameplay — `player-count` | `[Pass]` | `/game/classic?category=player-count`; "Peak Concurrent Players · Classic"; Palworld "18.0K peak players"; images rendered. |
| Classic gameplay — `gross-revenue` | `[Pass]` | `/game/classic?category=gross-revenue`; "Gross Revenue · Classic"; The Wild Robot "$331,982,078"; images rendered. |
| Gated category fail-closed — `number-of-albums` | `[Pass]` | `/game/classic?category=number-of-albums` → "Category unavailable" state. |
| Console errors | `[Pass]` | 0 console errors across all navigations (1 benign warning). |

**Regression check:** `player-count`, `release-date`, and `gross-revenue` all
render and play correctly in the browser. No regression observed.

### 15.2 Evidence reconciliation

**SteamSpy cover evidence (corrected).** The original pass reported "97 items;
Steam CDN covers 20/20 OK" and later summarized this as "100% image
availability". Only 20 covers were actually sampled. A full-pool check of all
97 covers was performed in this pass:

- **96/97 covers resolved (99.0%).** One genuine failure: appid `417910`
  returns HTTP 404. Three initial "fetch failed" results (appids `238960`,
  `359550`, `892970`) were transient network errors that returned HTTP 200 on
  retry.
- **Corrected statement:** `20/20 sampled Steam covers resolved successfully`
  (original sample); full-pool result is `96/97 resolved (1 genuine 404)`.
- This is an evidence correction only. It does **not** reopen `player-count`
  readiness: 99.0% image availability is a strong rate and the single 404 is
  handled by the dispatcher's `imageUrl` filter.

**Release-date count (192 vs 193) — explained, no defect.** The normalized
provider result is **192 items** (`/api/test-fetch?category=release-dates` →
`totalItems: 192`). The rendered gameplay HTML contains **193** date-like
strings because the current card's date is rendered once in the visible card
text **and** once in the serialized item data. Verified in-browser: the DOM
contains exactly **192 unique TMDB image URLs** (matching the 192 items) and the
current card's date (`2026-07-11`) appears twice. The extra date string is
unrelated UI content, **not** an item-count discrepancy. No code fix required.

### 15.3 Readiness re-evaluation (non-playable categories)

| Category | Implementation | Runtime verification | Data-quality readiness | Image readiness | Final status | Blocker |
| --- | --- | --- | --- | --- | --- | --- |
| `number-of-albums` | Yes (`artist-album-counts`) | `[Partial]` — browse works; adapter emits no image | Album counts diverse (Pink Floyd 100, Nirvana 97, Beatles 705 release groups) | **None** — no truthful artist-image source | **Implemented but gated** | No truthful artist-image source; items emitted with empty `imageUrl` and dropped by the dispatcher. |
| `album-release-date` | Yes (`album-release-dates`) | `[Pass]` — gameplay reads the local snapshot; live adapter preserved for regeneration | 120 items, 120 unique ids, 101 unique dates, 16 tie groups (max 3/date), range 1963–2026 | **120/120** absolute images (0 empty) | **Promoted 2026-10-13** | None — readiness bar met via the pre-generated snapshot. See Section 21. |
| `youtube-subscribers` | Yes (`youtube-subscribers`) | `[Pass]` — `YOUTUBE_API_KEY` authenticates; 13/13 channels resolve | 13 items, 13 distinct values, 0 ties, 0% missing | 13/13 thumbnails HTTP 200 | **Promoted 2026-10-13** | None — readiness bar met. See Section 17. |
| `game-release-date` | Yes (`game-release-dates`) | `[Pass]` — auth + query HTTP 200; token cache reused | 100 items, 100 distinct dates, 0 ties, 0% missing | 100/100 covers; 15/15 HEAD OK | **Promoted 2026-10-13** | None — readiness bar met. See Section 16. |
| `monthly-listeners` | **Not implemented** | N/A | N/A | N/A | **Deferred** | Decision E — no approved commercial provider. |
| `twitch-followers` | **Not implemented** | N/A | N/A | N/A | **Deferred** | Decision E — no legitimate scalable provider path. |

**`number-of-albums` detail.** The blocker is unchanged and remains genuine: the
metric represents an **artist**, and no truthful artist-image source exists in
the current implementation/provider path. The adapter deliberately emits
`imageUrl: ""` ([`musicbrainz.ts`](lib/api/musicbrainz.ts:195)) and the
dispatcher drops those items. Using random album artwork as an artist image
remains prohibited. **Keep gated.**

**`album-release-date` detail.** A **40-item** Cover Art Archive sample (4× the
prior 10-item check) resolved **35/40 (87.5%)**; failures were HTTP 500 server
errors and one network error, not "no cover exists". MusicBrainz browse also
returned a transient HTTP 503 under rapid polling (confirmed transient: the same
request returned HTTP 200 with `release-group-count: 705` on retry with proper
spacing). The adapter's ≥1.1s serialization respects the 1 req/s limit. The
~12.5% cover failure rate plus the slow serialized fetch are **not** sufficient
for promotion. **Keep gated.**

**`youtube-subscribers` / `game-release-date` detail.** Both adapters are
implemented and fail closed with a clear `ApiFetchError` when their credentials
are absent. Credentials remain unset in this environment, so live runtime
verification (channel IDs, hidden counts, thumbnails, distinct values, quota;
IGDB auth, token reuse, covers, dates) could not be performed. Runtime readiness
is `[Blocked]`. **Keep gated.**

### 15.4 Promotions

**None.** No implemented-but-gated category met the readiness bar in this pass.
No `productionPlayable` flag was changed and no availability record was
modified. The five already-playable categories remain playable and unregressed.

### 15.5 Repository checks (this pass)

- `npx tsc --noEmit` → `[Pass]` (exit 0).
- `npm run lint` → `[Pass]` (0 errors; the same 2 pre-existing warnings:
  unused eslint-disable in `TimeAttackGame.tsx`, unused `WorldBankMeta` in
  `worldbank.ts`).
- `npm run build` → `[Pass]` (compiled successfully; all routes generated).

### 15.6 Files changed in this pass

- [`docs/higher-lower-category-provider-plan.md`](docs/higher-lower-category-provider-plan.md:1)
  — corrected SteamSpy cover evidence (Section 14.3, 14.4), updated browser MCP
  status (Section 14.5), and added this Section 15.

No application code was changed. No provider architecture was redesigned. No
deferred category was implemented.

### 15.7 Remaining `Needs Verification` (this pass)

- `Needs Verification [environment-specific]`: `YOUTUBE_API_KEY` and
  `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` are unset here; YouTube and IGDB
  runtime readiness remain `[Blocked]`.
- `Needs Verification [provider-capability]`: Cover Art Archive reliability
  (87.5% on a 40-item sample) and the artist-image strategy for
  `number-of-albums`.
- `Needs Verification [data-quality]`: MusicBrainz curated-pool value diversity
  and `album-release-date` fetch performance.
- `Needs Verification [product-decision]`: root metadata wording in
  [`app/layout.tsx`](app/layout.tsx:13) — left unchanged (see Section 12).

---

## 16. Post-Credential Runtime Verification & Readiness Pass (2026-10-13)

This section records the third verification pass, scoped to the two categories
whose only prior blocker was missing environment credentials:
`youtube-subscribers` and `game-release-date`. The provider implementations
already existed; this pass verifies them against the now-configured
credentials, re-evaluates readiness, and promotes only what the evidence
supports. Statuses use the project vocabulary: `[Pass]`, `[Partial]`,
`[Fail]`, `[Blocked]`, `[Not tested]`.

**Environment:** dev server running at `http://localhost:3000` (Next.js 16.3.4,
Turbopack). `.env.local` present with `TMDB_API_KEY`, `YOUTUBE_API_KEY`,
`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` (variable **names** only; values
never read into this document, logs, or handoffs).

### 16.1 YouTube Subscribers — `[Blocked]` (credential invalid)

| Check | Result | Evidence |
| --- | --- | --- |
| Adapter reachable with configured key | `[Fail]` | `GET /api/test-fetch?category=youtube-subscribers` → HTTP 502; body `{"error":"[YouTube] HTTP 400: Bad Request","source":"YouTube","statusCode":400}`. |
| Root cause | `[Pass]` (diagnosed) | Direct `channels.list` call with the configured key → HTTP 400, `reason=badRequest`, `message="API key not valid. Please pass a valid API key."`, `ErrorInfo.reason=API_KEY_INVALID`. Reproduced on a minimal `part=id` call, so this is **not** a request-shape bug. |
| Key format | `[Pass]` | Key has the Google `AIza` prefix and length 39; it is not a placeholder string. Google still rejects it as invalid. |
| Curated channel IDs | `[Pass]` (structural) | All 13 curated channel IDs are well-formed (24 chars, `UC` prefix). Live resolution could not be tested because the key is rejected. |
| Subscriber / hidden / thumbnail handling | `[Not tested]` | No live response obtainable; adapter logic (hidden-count drop, thumbnail fallback, dedupe) is source-verified only. |
| Item count / unique values / range / ties / image availability | `[Not tested]` | Not obtainable without a valid key. |
| Fail-closed behavior | `[Pass]` | Adapter throws `ApiFetchError` on non-OK HTTP; route returns 502; browser route `/game/classic?category=youtube-subscribers` renders the "Category unavailable" state with no crash. |
| Credential exposure | `[Pass]` | No client-side request to `googleapis.com`; key never rendered or logged. |

**Readiness:** `[Blocked]`. The configured `YOUTUBE_API_KEY` is rejected by
Google (`API_KEY_INVALID`). No runtime evidence for channel resolution,
subscriber values, hidden counts, thumbnails, ties, or quota is obtainable.
**Not promoted.** Exact measurable blocker: the `YOUTUBE_API_KEY` value in
`.env.local` is not a valid Google API key (Google returns `API_KEY_INVALID`
even on a minimal `channels.list` call). `Needs Verification
[environment-specific]`: a valid YouTube Data API v3 key for this project.

### 16.2 Game Release Date / IGDB — `[Pass]` (promoted)

| Check | Result | Evidence |
| --- | --- | --- |
| Twitch client-credentials auth | `[Pass]` | `POST https://id.twitch.tv/oauth2/token` → HTTP 200, `token_type=bearer`, `expires_in≈5,189,690s`. |
| Module-scope token cache reuse | `[Pass]` | Temporary diagnostic counter on the token function: **1 token request across 4 sequential adapter calls** (`tokenFetchCount=1` on every call). Diagnostic removed after measurement. |
| Adapter via dispatcher | `[Pass]` | `GET /api/test-fetch?category=game-release-dates` → HTTP 200, `totalItems=100`. |
| Names / dates / covers | `[Pass]` | 100/100 items have `name`, `first_release_date`, and `cover.url`. |
| Distinct dates / ties | `[Pass]` | 100 distinct dates of 100 items; **0 dates with ties**. |
| Date range | `[Pass]` | 1985-09-13 → 2023-08-03. |
| Missing-data rate | `[Pass]` | 0% (100/100 complete). |
| Cover URL normalization | `[Pass]` | Protocol-relative `//images.igdb.com/...` converted to absolute `https://images.igdb.com/.../t_cover_big/...`; 0 covers left non-absolute. |
| Cover availability | `[Pass]` | 15/15 sampled normalized covers returned HTTP 200 on HEAD. |
| Fail-closed behavior | `[Pass]` | Adapter throws `ApiFetchError` on non-OK HTTP; `429` treated as failure. |
| Credential exposure | `[Pass]` | No client-side request to `igdb.com` / `twitch.tv`; secret and token never rendered or logged. |

**Readiness:** `[Pass]`. All Section 9 criteria are met with live evidence:
100 distinct entities, 100 distinct values (zero ties), 0% missing data, 100%
cover availability on the sampled set, correct metric semantics
(`first_release_date` → formatted date), 7-day revalidate for stable data,
predictable provider behavior, no rate-limit violations, and fail-closed
handling. **Promoted** via the existing gate system.

### 16.3 Promotion applied

- [`lib/catalog/availability.ts`](lib/catalog/availability.ts:170) —
  `game-release-date` changed from `productionPlayable: false` +
  `unverifiedGates(...)` to `productionPlayable: true` + `satisfiedGates(...)`
  with the Section 16.2 evidence recorded in the gate note. No other
  availability record was modified. The consistency guard
  ([`assertAvailabilityConsistency()`](lib/catalog/availability.ts:284)) passes
  because all seven gates are satisfied.
- No provider architecture was redesigned. No deferred category was
  implemented. No MusicBrainz category was modified. No existing playable
  category was changed.

### 16.4 Browser runtime verification (Playwright MCP)

**MCP status:** Playwright MCP was **available** in this pass.

| Check | Result | Evidence |
| --- | --- | --- |
| Home page `GET /` | `[Pass]` | HTTP 200; Gaming domain now shows "3 available categories" (was 2). |
| Category selection + Go enablement | `[Pass]` | Selecting Gaming → Game Release Date + Classic enabled the Go button. |
| Classic gameplay — `game-release-date` | `[Pass]` | `/game/classic?category=game-release-date`; "Game Release Date · Classic"; current "Baldur's Gate III" (2023-08-03) with image; next "Uncharted 3: Drake's Deception" with image. |
| Higher/Lower progression | `[Pass]` | Clicking Lower advanced the deck (current → "Uncharted 3: Drake's Deception" 2011-11-01, next "Hades") and incremented score 0 → 1. |
| Gated category fail-closed — `youtube-subscribers` | `[Pass]` | `/game/classic?category=youtube-subscribers` → "Category unavailable" state. |
| Console errors | `[Pass]` | 0 console errors across all navigations (1 benign Next.js smooth-scroll warning). |
| Credential exposure (network) | `[Pass]` | No client-side requests to `igdb.com`, `twitch.tv`, `googleapis.com`, or `youtube.com`. |

**Regression check:** `player-count` (existing playable) renders correctly —
"Peak Concurrent Players · Classic", Palworld "18.0K peak players", Rust next,
images present. The "Incorrect" status label observed on initial load is
**pre-existing** (it appears identically on `player-count` before any answer)
and is unrelated to this change. No regression observed.

### 16.5 Repository checks (this pass)

- `npx tsc --noEmit` → `[Pass]` (exit 0).
- `npm run lint` → `[Pass]` (0 errors; the same 2 pre-existing warnings:
  unused eslint-disable in `TimeAttackGame.tsx`, unused `WorldBankMeta` in
  `worldbank.ts`).
- `npm run build` → `[Pass]` (compiled successfully; all routes generated).

### 16.6 Files changed in this pass

- [`lib/catalog/availability.ts`](lib/catalog/availability.ts:170) —
  `game-release-date` promoted to `productionPlayable: true` with
  `satisfiedGates(...)` and recorded evidence.
- [`docs/higher-lower-category-provider-plan.md`](docs/higher-lower-category-provider-plan.md:1)
  — updated Section 14.3 and Section 15.3 status rows; added this Section 16.

No provider adapter was modified. Temporary diagnostic instrumentation added to
[`lib/api/igdb.ts`](lib/api/igdb.ts:1) and
[`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1) for the token
cache measurement was fully reverted.

### 16.7 Remaining `Needs Verification` (this pass)

- `Needs Verification [environment-specific]`: the configured
  `YOUTUBE_API_KEY` is rejected by Google (`API_KEY_INVALID`); a valid YouTube
  Data API v3 key is required before `youtube-subscribers` runtime readiness
  can be evaluated. `youtube-subscribers` remains `[Blocked]` and gated.
- `Needs Verification [provider-capability]`: Cover Art Archive reliability
  (87.5% on a 40-item sample) and the artist-image strategy for
  `number-of-albums` (unchanged from Section 15).
- `Needs Verification [data-quality]`: MusicBrainz curated-pool value diversity
  and `album-release-date` fetch performance (unchanged from Section 15).
- `Needs Verification [product-decision]`: root metadata wording in
  [`app/layout.tsx`](app/layout.tsx:13) — left unchanged (see Section 12).

---

## 17. Focused Post-Credential Runtime Verification — `youtube-subscribers` (2026-10-13)

This section records the fourth verification pass, scoped **only** to
`youtube-subscribers`. The prior pass (Section 16.1) was `[Blocked]` because the
configured `YOUTUBE_API_KEY` was rejected by Google (`API_KEY_INVALID`). The key
has since been corrected/replaced. This pass verifies the adapter against the
now-valid key, measures readiness, and promotes only if the existing readiness
criteria are satisfied. Statuses use the project vocabulary: `[Pass]`,
`[Partial]`, `[Fail]`, `[Blocked]`, `[Not tested]`.

**Environment:** dev server running at `http://localhost:3000` (Next.js 16.3.4,
Turbopack). `.env.local` present with `TMDB_API_KEY`, `YOUTUBE_API_KEY`,
`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` (variable **names** only; values
never read into this document, logs, or handoffs). No other category was
modified.

### 17.1 Authentication and channel resolution

| Check | Result | Evidence |
| --- | --- | --- |
| `YOUTUBE_API_KEY` authenticates | `[Pass]` | `GET /api/test-fetch?category=youtube-subscribers` → HTTP 200, `totalItems: 13`. Direct `channels.list` call → HTTP 200. |
| Key format | `[Pass]` | Key has the Google `AIza` prefix and length 39 (value never printed). |
| Curated channel IDs resolve | `[Pass]` | All **13/13** curated channel IDs in [`curatedPools.ts`](lib/api/curatedPools.ts:58) returned a channel record; `UNRESOLVED_COUNT=0`. |
| Channel name | `[Pass]` | `snippet.title` present for all 13 (e.g. "T-Series", "MrBeast", "Kurzgesagt – In a Nutshell"). |
| Thumbnail | `[Pass]` | `snippet.thumbnails.high.url` present for all 13; 0 missing. |
| `subscriberCount` | `[Pass]` | Present for all 13; parsed to integer `value`. |
| `hiddenSubscriberCount` handling | `[Pass]` | 0 channels hidden; adapter drops any channel with `hiddenSubscriberCount === true` or absent `subscriberCount` ([`youtube.ts`](lib/api/youtube.ts:96)). |

### 17.2 Measured readiness metrics

| Metric | Result | Evidence |
| --- | --- | --- |
| Valid playable item count | `[Pass]` | **13** normalized items (all 13 curated channels usable). |
| Unique subscriber values | `[Pass]` | **13 distinct of 13** — zero duplicate values. |
| Value range | `[Pass]` | 25,700,000 → 521,000,000 (wide spread). |
| Median | `[Pass]` | 109,000,000. |
| Tie frequency | `[Pass]` | **0 tie groups; 0 items in ties.** |
| Rounding observation | `[Pass]` (measured) | All 13 values have ≥5 trailing zeros — YouTube rounds public counts to ~3 significant figures. Despite rounding, the 13 curated channels currently yield distinct values. |
| Thumbnail availability | `[Pass]` | **13/13** thumbnails returned HTTP 200 (0 failures). |
| Missing-data rate | `[Pass]` | **0%** — 0 hidden, 0 missing `subscriberCount`, 0 missing thumbnails. |
| `displayValue` | `[Pass]` | `"N subscribers"` (e.g. `"315,000,000 subscribers"`). |

### 17.3 Fail-closed and credential-exposure checks

| Check | Result | Evidence |
| --- | --- | --- |
| Fail-closed on invalid key | `[Pass]` | Direct `channels.list` with an invalid key → HTTP 400, `"API key not valid. Please pass a valid API key."`; the adapter throws `ApiFetchError` on non-OK HTTP ([`youtube.ts`](lib/api/youtube.ts:81)). |
| Gated route fail-closed (pre-promotion) | `[Pass]` | `/game/classic?category=youtube-subscribers` rendered "Category unavailable" before promotion. |
| Client bundle exposure | `[Pass]` | Key not found in `.next/static` (client-served bundles) or `.next/server`. |
| Client request exposure | `[Pass]` | Browser network log shows **no** client request to `googleapis.com`; only `yt3.ggpht.com` thumbnail image requests (no key). |
| Log/response exposure | `[Pass]` | Key never rendered in responses or console; `.env*` and `/.next/` are git-ignored ([`.gitignore`](.gitignore:17)). |
| Dev fetch-cache note | `[Pass]` (informational) | The key appears in `.next/dev/cache/fetch-cache` and `.next/dev/cache/turbopack` — Next.js server-side dev caches that persist the request URL. These are git-ignored local artifacts, not client-served. |

### 17.4 Readiness evaluation against the seven release gates

| Gate | Status | Basis |
| --- | --- | --- |
| `stable-semantic-identity` | `[Pass]` | `youtube-subscribers` is a stable semantic ID ([`semanticCatalog.ts`](lib/catalog/semanticCatalog.ts:205)), independent of provider naming. |
| `approved-metric-contract` | `[Pass]` | `subscriberCount` integer; `displayValue` = `"N subscribers"`; metric copy present. |
| `valid-server-adapter` | `[Pass]` | [`youtube.ts`](lib/api/youtube.ts:1) is server-only, reads `YOUTUBE_API_KEY` (non-`NEXT_PUBLIC_`), no client-side provider logic. |
| `runtime-provider-evidence` | `[Pass]` | 13/13 channels resolve; 13 distinct values, 0 ties; 0% missing; 13/13 thumbnails HTTP 200; fail-closed confirmed. |
| `server-route-authorization` | `[Pass]` | `authorizeGameRoute` recognizes the category; mapping resolves ([`availability.ts`](lib/catalog/availability.ts:355)). |
| `public-catalog-eligibility` | `[Pass]` | 13 curated verified channels with a wide value spread (25.7M–521M). |
| `reversible-visibility` | `[Pass]` | Removing the mapping entry or setting `productionPlayable: false` reverts to hidden without changing semantic identity or stored scores. |

**Readiness:** `[Pass]`. All seven gates are satisfied with live evidence.
**Promoted** via the existing gate system.

### 17.5 Promotion applied

- [`lib/catalog/availability.ts`](lib/catalog/availability.ts:205) —
  `youtube-subscribers` changed from `productionPlayable: false` +
  `unverifiedGates(...)` to `productionPlayable: true` + `satisfiedGates(...)`
  with the Section 17.2 evidence recorded in the gate note. No other
  availability record was modified. The consistency guard
  ([`assertAvailabilityConsistency()`](lib/catalog/availability.ts:284)) passes
  because all seven gates are satisfied.
- No provider adapter was modified. No deferred category was implemented. No
  MusicBrainz, SteamSpy, TMDB, or IGDB category was modified. No existing
  playable category was changed.

### 17.6 Browser runtime verification (Playwright MCP)

**MCP status:** Playwright MCP was **available** in this pass.

| Check | Result | Evidence |
| --- | --- | --- |
| Home page `GET /` | `[Pass]` | HTTP 200; Social Media domain renders; YouTube Subscribers selectable (no "Unavailable" marker); Twitch Followers still "Unavailable". |
| Category selection + Go enablement | `[Pass]` | Selecting Social Media → YouTube Subscribers + Classic enabled the Go button. |
| Classic gameplay — `youtube-subscribers` | `[Pass]` | `/game/classic?category=youtube-subscribers`; "YouTube Subscribers · Classic"; current "Kurzgesagt – In a Nutshell" (25,700,000 subscribers) with image; next "T-Series" with image. |
| Higher/Lower progression | `[Pass]` | Clicking Higher advanced the deck (current → "T-Series" 315,000,000 subscribers, next "SET India") and incremented score 0 → 1. |
| Console errors | `[Pass]` | 0 console errors across all navigations (1 benign Next.js smooth-scroll warning). |
| Credential exposure (network) | `[Pass]` | No client-side request to `googleapis.com`; only `yt3.ggpht.com` thumbnail images. |

**Regression check:** `player-count` (existing playable) renders correctly —
"Peak Concurrent Players · Classic", Sekiro "6.8K peak players", Left 4 Dead 2
next, images present. The "Incorrect" status label observed on initial load is
**pre-existing** (it appears identically on `player-count` before any answer)
and is unrelated to this change. No regression observed.

### 17.7 Repository checks (this pass)

- `npx tsc --noEmit` → `[Pass]` (exit 0).
- `npm run lint` → `[Pass]` (0 errors; the same 2 pre-existing warnings:
  unused eslint-disable in `TimeAttackGame.tsx`, unused `WorldBankMeta` in
  `worldbank.ts`).
- `npm run build` → `[Pass]` (compiled successfully; all routes generated).

### 17.8 Files changed in this pass

- [`lib/catalog/availability.ts`](lib/catalog/availability.ts:205) —
  `youtube-subscribers` promoted to `productionPlayable: true` with
  `satisfiedGates(...)` and recorded evidence.
- [`docs/higher-lower-category-provider-plan.md`](docs/higher-lower-category-provider-plan.md:1)
  — updated Section 14.3 and Section 15.3 status rows; added this Section 17.

No provider adapter was modified. A temporary diagnostic script
(`.tmp-yt-metrics.ps1`) used to measure metrics was removed after use.

### 17.9 Remaining `Needs Verification` (this pass)

- `Needs Verification [data-quality]`: the curated YouTube pool is **13
  channels** — smaller than every other promoted category (65–192 items). All
  13 values are currently distinct, but YouTube rounds public counts to ~3
  significant figures, so the effective value space is coarse. Pool size and
  rounding fragility should be revisited if gameplay depth proves insufficient.
- `Needs Verification [environment-specific]`: YouTube Data API quota
  allocation for this project's key (not exercised to exhaustion; a single
  cached `channels.list` call per revalidation window is well within the
  10,000-unit default).
- `Needs Verification [provider-capability]`: Cover Art Archive reliability
  (87.5% on a 40-item sample) and the artist-image strategy for
  `number-of-albums` (unchanged from Section 15).
- `Needs Verification [data-quality]`: MusicBrainz curated-pool value diversity
  and `album-release-date` fetch performance (unchanged from Section 15).
- `Needs Verification [product-decision]`: root metadata wording in
  [`app/layout.tsx`](app/layout.tsx:13) — left unchanged (see Section 12).

## 18. Local Credential & Secret-Handling Security Verification

Date: 2026-10-13. Scope: local credential handling for `YOUTUBE_API_KEY`,
`TWITCH_CLIENT_ID`, and `TWITCH_CLIENT_SECRET` before deployment. No provider
architecture, availability gate, gameplay behavior, or environment value was
changed. No credential value was printed, logged, or copied during the audit;
comparisons used presence/absence and pattern matching only.

### 18.1 Checks performed

- **Working tree scan** — searched tracked and untracked files for the
  `AIza…` YouTube key pattern, `TWITCH_CLIENT_SECRET`, `client_secret`, and
  `access_token`. Only `.env.local` (ignored) contains a real `AIza…` value;
  `.env.local.example` contains placeholders only.
- **Git history scan** — `git log -S` for `AIza`, `YOUTUBE_API_KEY`, and
  `TWITCH_CLIENT_SECRET` returned no commits. Only `.env.local.example` was
  ever added to history (commit `c865968`), and it held placeholders only.
  No deleted `.env`, `.ps1`, `.bak`, or `.log` files exist in history.
- **Accidental local copies** — no `.env.local.bak`, `.env.backup`, `.old`,
  `.orig`, `.tmp`, `.ps1`, `.vscode`, or `.idea` artifacts exist. The
  previously referenced `.tmp-yt-metrics.ps1` is absent from disk.
- **Ignore rules** — `.gitignore` ignores `.env*`, `.env.local`, and
  `/.next/`. No gap found; `.gitignore` was not modified.
- **`.next` cache artifacts** — the `AIza…` pattern was found only in
  `.next/dev/cache/fetch-cache/*` and `.next/cache|dev/cache/turbopack/*.sst`
  (local server-side build/cache). Zero hits in `.next/static/` (the
  client-served asset directory). `.next` is untracked and git-ignored.
- **Old invalid YouTube key** — the only on-disk file containing an `AIza…`
  value is `.env.local`. No tracked, shared, or backup occurrence exists.
  Finding: **no evidence of repository exposure**. No rotation performed.
- **Server-only confirmation** — `YOUTUBE_API_KEY` is read only in
  [`lib/api/youtube.ts`](lib/api/youtube.ts:59); `TWITCH_CLIENT_ID` /
  `TWITCH_CLIENT_SECRET` only in [`lib/api/igdb.ts`](lib/api/igdb.ts:61).
  No `NEXT_PUBLIC_` prefix is used for any credential. No client component
  imports `lib/api`; the dispatcher is reached only from the server page
  [`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:3).

### 18.2 Cleanup

The local `.next` directory was targeted for removal to discard the cached
credential-bearing request data. The credential-bearing `fetch-cache` and
turbopack `.sst` files were removed; a rescan of the residual `.next` tree
found zero `AIza…` hits. The remaining `.next/dev/cache/turbopack/*.meta`
metadata files (390 files, no credential content) could not be deleted while
the dev server held file locks. They are git-ignored and will be cleared on
the next clean build or when the dev server stops.

### 18.3 Status

- Working tree, Git history, temp/backup files, ignore rules, `.next`
  tracking/serving, and old-key persistence: `[Pass]`.
- `.next` removal: `[Partial]` — credential-bearing cache removed; residual
  locked `.meta` metadata remains. `TODO:` remove `.next` after stopping the
  dev server.
- No credential value was printed, logged, copied, or exposed during this
  audit.

---

## 19. Focused Reliability, Latency & Readiness Investigation — `album-release-date` (2026-10-13)

This section records the fifth verification pass, scoped **only** to
`album-release-date`. No other category was modified. Statuses use the project
vocabulary: `[Pass]`, `[Partial]`, `[Fail]`, `[Blocked]`, `[Not tested]`.

**Environment:** dev server at `http://localhost:3000` (Next.js 16.3.4,
Turbopack). `.env.local` present (variable **names** only; values never read
into this document, logs, or handoffs). The dev server was found in a
corrupted Turbopack cache state (`.next/dev/cache/turbopack/.../*.sst` missing,
referenced by residual `.meta` files — the Section 18.2 `TODO`); it returned
HTTP 500 on **every** route. The `.next` directory was removed and the server
restarted cleanly before any measurement. This was an environment issue, not a
category defect.

### 19.1 Root cause of the prior latency and "image failure" evidence

The prior passes recorded Cover Art Archive availability as ~50% (10-item
sample) and 87.5% (40-item sample), with HTTP 500 failures, and a slow
serialized fetch. This pass found the actual cause:

- The CAA `/release-group/<mbid>/front` endpoint returns a **307 redirect**
  whose `Location` header points at an `archive.org/download/...` image URL.
  The redirect response body is tiny (~134 bytes).
- The adapter's [`resolveCoverArtUrl()`](lib/api/musicbrainz.ts:147) used
  `redirect: "follow"`, which made the runtime **download the entire
  full-resolution image body** merely to read `res.url`. Measured bodies:
  **7.1 MB / 6.6 s** for one cover; the dev log recorded **9.4 MB, 22.5 MB,
  9.5 MB** bodies. These exceed the runtime's 2 MB fetch-cache limit, so they
  were never cached and were re-downloaded on every cold fetch.
- The prior "HTTP 500" failures were therefore an artifact of those multi-MB
  body downloads failing/timing out — **not** CAA being unavailable.

**Fix applied (CAA URL resolution only; MusicBrainz pacing unchanged):**
[`resolveCoverArtUrl()`](lib/api/musicbrainz.ts:147) now uses
`redirect: "manual"`, accepts the expected redirect status
(301/302/303/307/308), requires a non-empty `Location` header, normalizes a
relative location against the CAA request URL, validates the result is an
absolute `http:`/`https:` URL, and returns `null` otherwise (preserving the
existing fail-closed filtering). The request count is unchanged; only the
transferred bytes drop from multi-MB to ~134 bytes per cover.

### 19.2 Measured latency breakdown

| Phase | Measurement | Notes |
| --- | --- | --- |
| MusicBrainz browse (all pages, 17 artists) | **90 requests, 73,654 ms (~73.7 s)**, avg 818 ms/req | Serialized at ≥1.1 s spacing; 8,004 release groups returned. |
| CAA redirect-only (per cover) | **~298 ms avg**, 134-byte body | 120 requests sampled across two 60-item batches. |
| CAA full-body follow (pre-fix) | **6.6 s**, 7.1 MB, 2 redirects | The dominant pre-fix cost. |
| End-to-end cold fetch (post-fix) | **353,254 ms (~5.9 min)**, 120 items | First request after clean start. |
| End-to-end warm fetch (post-fix) | **258,117 ms (~4.3 min)**, 120 items | Second request; only ~27% faster. |

**Breakdown:** the remaining cost is dominated by the **unconditional
`sleep(REQUEST_SPACING_MS)` calls** in the adapter — ~90 MusicBrainz page
sleeps + up to ~120 CAA sleeps + 17 artist sleeps ≈ 210 sleeps × 1.1 s ≈
**231 s of pure delay**, which runs even when the underlying fetch is served
from cache. MusicBrainz browse is ~74 s; CAA network is ~0.3 s per cover.

### 19.3 CAA reliability (larger sample)

| Sample | Redirect OK | 404 (no cover) | 5xx | Avg latency |
| --- | --- | --- | --- | --- |
| Batch 1 (60) | 60 | 0 | 0 | 298 ms |
| Batch 2 (60) | 57 | 3 | 0 | 286 ms |
| **Combined (120)** | **117 (97.5%)** | **3 (2.5%)** | **0** | ~292 ms |

- **CAA 5xx: not observed at all** in 120 requests. The prior 5xx evidence was
  an artifact of full-body downloads (Section 19.1). **5xx is not a consistent
  CAA behavior.**
- The 3 failures are **genuine, consistent 404s** ("No cover art found for
  release group …"), re-tested 3× each with identical 404 responses. They are
  correctly filtered by the adapter.
- Following the redirect to the archive.org image resolves **HTTP 200,
  `image/png`** (verified on a sample).

### 19.4 Data-quality metrics (live endpoint, 120 items)

| Metric | Result |
| --- | --- |
| Valid normalized items | **120** (the adapter's `MAX_ALBUM_ITEMS` cap) |
| Unique IDs | 120 / 120 |
| Unique image URLs | 120 / 120 |
| Absolute HTTP image URLs | 120 / 120 (0 empty) |
| Image availability (sampled, following redirects) | **20/20 HTTP 200** |
| Unique dates | **104** of 120 |
| Date tie groups | 15 (31 items in ties; max 3 items per date) |
| Date range | **1963 → 2025** |
| Precision preserved | 45 year-only, 4 year-month, 71 full-date |
| Missing-date rate (source pool) | 5,674 / 8,004 groups have a date (70.9%) |

**Pool sufficiency:** after filtering albums without usable artwork, **120
items with 104 unique dates** remain — comparable to or larger than every
other promoted category (65–192 items). Filtering does **not** leave an
insufficient pool.

### 19.5 Caching effect

Caching does **not** materially improve subsequent requests: warm fetch
(258 s) is only ~27% faster than cold (353 s). The MusicBrainz browse pages
and CAA redirect responses are cached, but the adapter's unconditional
`sleep()` calls dominate and run regardless of cache state.

### 19.6 Failure behavior

- **MusicBrainz unavailable (non-OK HTTP):** [`fetchReleaseGroupPage()`](lib/api/musicbrainz.ts:93)
  throws [`ApiFetchError`](types/api.ts:21); the route returns HTTP 502 and the
  gameplay route renders the `error`/`unavailable` state. Fail-closed. `[Pass]`
  (source-verified).
- **CAA unavailable:** `resolveCoverArtUrl()` returns `null`; items are
  filtered. With the real CAA, the 3 genuine 404s were filtered and 120 valid
  items remained. `[Pass]`.
- **CAA host unreachable (simulated):** the fetch did **not** fail fast — it
  hung for **>15 min** (900 s client timeout) because each failed lookup incurs
  a DNS timeout **plus** the unconditional 1.1 s sleep across ~204 candidates.
  This is a genuine reliability concern. `[Fail]` — slow failure behavior.

### 19.7 Readiness evaluation against the seven release gates

| Gate | Status | Basis |
| --- | --- | --- |
| `stable-semantic-identity` | `[Pass]` | `album-release-date` is a stable semantic ID. |
| `approved-metric-contract` | `[Pass]` | Source date precision preserved in `displayValue`; numeric `value` derived without inventing precision. |
| `valid-server-adapter` | `[Pass]` | [`musicbrainz.ts`](lib/api/musicbrainz.ts:1) is server-only; no credentials; no client-side provider logic. |
| `runtime-provider-evidence` | `[Pass]` | 120 items, 104 unique dates, 120/120 images, 0% missing images, 97.5% CAA redirect success, 0 server 5xx. |
| `server-route-authorization` | `[Pass]` | Mapping resolves ([`availability.ts`](lib/catalog/availability.ts:353)); gated route renders "Category unavailable". |
| `public-catalog-eligibility` | `[Fail]` | **Latency:** cold ~5.9 min / warm ~4.3 min — not viable for a request-time fetch. **Failure behavior:** hangs >15 min when CAA is unreachable. |
| `reversible-visibility` | `[Pass]` | Removing the mapping entry or setting `productionPlayable: false` reverts to hidden without changing semantic identity or stored scores. |

**Readiness:** `[Fail]` on `public-catalog-eligibility`. **Not promoted.** The
category remains gated.

**Exact measurable blocker:** the serialized pacing latency. The adapter
issues ~210 unconditional `sleep(REQUEST_SPACING_MS)` calls (~231 s of pure
delay) plus ~74 s of MusicBrainz browse, producing a **~4.3–5.9 minute**
end-to-end fetch that does not improve materially on repeat (caching effect
~27%). Additionally, when CAA is unreachable the fetch hangs **>15 minutes**
instead of failing fast. Data quality and image availability are **no longer**
blockers (Section 19.4).

### 19.8 Optimization considered but not applied

The dominant cost is the unconditional `sleep()` calls, which run even on
cache hits. Removing the sleep after a cache hit, or bounding CAA concurrency
separately from MusicBrainz, would reduce latency. **Neither was applied** in
this pass: the owner instruction was to keep MusicBrainz pacing unchanged and
not to add concurrency yet. The redirect-only fix (Section 19.1) was the only
change made, and it is provider-respectful (same request count, fewer bytes).

### 19.9 Files changed in this pass

- [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:147) — `resolveCoverArtUrl()`
  changed from `redirect: "follow"` to `redirect: "manual"` with defensive
  `Location`-header handling and absolute-URL validation. No other adapter
  logic changed; MusicBrainz pacing unchanged.
- [`docs/higher-lower-category-provider-plan.md`](docs/higher-lower-category-provider-plan.md:1)
  — updated Section 14.3 and Section 15.3 status rows; added this Section 19.

A temporary `?full=1` diagnostic branch was added to
[`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1) for measurement
and **fully reverted**. Temporary measurement scripts (`.tmp-*.ps1`) and
captured JSON were removed after use.

### 19.10 Repository checks (this pass)

- `npx tsc --noEmit` → `[Pass]` (exit 0).
- `npm run lint` → `[Pass]` (0 errors; the same 2 pre-existing warnings:
  unused eslint-disable in `TimeAttackGame.tsx`, unused `WorldBankMeta` in
  `worldbank.ts`).
- `npm run build` → `[Pass]` (compiled successfully; all routes generated).

### 19.11 Browser runtime verification (Playwright MCP)

**MCP status:** Playwright MCP was **available** in this pass.

| Check | Result | Evidence |
| --- | --- | --- |
| Gated route fail-closed — `album-release-date` | `[Pass]` | `/game/classic?category=album-release-date` → "Category unavailable" state. |
| Regression — `player-count` (existing playable) | `[Pass]` | "Peak Concurrent Players · Classic"; Baldur's Gate 3 "54.8K peak players"; images present. |
| Console errors | `[Pass]` | 0 console errors across navigations. |

### 19.12 Remaining `Needs Verification` (this pass)

- `Needs Verification [product-decision]`: whether to accept the ~4.3–5.9 min
  fetch latency (e.g. by pre-warming the cache out of band) or to authorize a
  latency optimization (cache-aware sleep skipping and/or bounded CAA
  concurrency separate from MusicBrainz pacing). This is the remaining
  promotion blocker.
- `Needs Verification [provider-capability]`: the artist-image strategy for
  `number-of-albums` (unchanged; out of scope for this pass).
- `Needs Verification [product-decision]`: root metadata wording in
  [`app/layout.tsx`](app/layout.tsx:13) — left unchanged (see Section 12).

---

## 20. Focused Latency & Failure-Behavior Optimization — `album-release-date` (2026-10-13)

This section records the sixth verification pass, scoped **only** to
`album-release-date`. It implements the latency/failure optimization that
Section 19.8 identified but did not apply, then re-measures and re-evaluates
readiness. No other category was modified. Statuses use the project vocabulary:
`[Pass]`, `[Partial]`, `[Fail]`, `[Blocked]`, `[Not tested]`.

**Environment:** dev server at `http://localhost:3000` (Next.js 16.3.4,
Turbopack). `.env.local` present (variable **names** only; values never read
into this document, logs, or handoffs). No credential value was printed,
logged, or copied during this pass.

### 20.1 Implementation changes

All changes are confined to [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:1).

1. **Separate provider scheduling.** The 1.1 s pacing constant was renamed
   `MUSICBRAINZ_REQUEST_SPACING_MS` and is now applied **only** around
   `musicbrainz.org` browse requests (page-to-page and artist-to-artist). The
   Cover Art Archive path no longer inherits any MusicBrainz sleep. MusicBrainz
   pacing was **not** removed or weakened.
2. **CAA resolution via `HEAD` + `redirect: "manual"`.** The existing
   redirect-only strategy is preserved; the request method is now `HEAD`
   (the endpoint supports it and only the redirect `Location` is needed).
3. **Bounded CAA concurrency.** A small in-adapter worker pool
   (`resolveCoverArtUrlsBounded()`) resolves CAA URLs with a maximum of
   `CAA_CONCURRENCY = 4` simultaneous requests. No unbounded `Promise.all()`
   over the candidate pool; no queue, worker system, or new infrastructure.
   MusicBrainz requests remain fully serialized.
4. **Finite CAA timeout.** Each CAA lookup uses
   `AbortSignal.timeout(CAA_TIMEOUT_MS = 5000)`. A failed, timed-out,
   non-redirect, or missing-`Location` lookup returns `null` and is filtered
   out as an unusable image. One CAA failure never fails the category.
5. **MusicBrainz fail-closed unchanged.** [`fetchReleaseGroupPage()`](lib/api/musicbrainz.ts:98)
   still throws [`ApiFetchError`](types/api.ts:21) on non-OK HTTP.

### 20.2 Measured latency

| Measurement | Before (Section 19) | After (this pass) |
| --- | --- | --- |
| Cold end-to-end fetch | ~353,254 ms (~5.9 min) | **128,321 ms (~2.1 min)** |
| Warm end-to-end fetch | ~258,117 ms (~4.3 min) | **153,141 ms (~2.6 min)** |
| Instrumented fetch (full pool) | — | **116,987 ms (~1.95 min)** |
| CAA-unreachable behavior | hung **>15 min** | **104,373 ms (~1.7 min)**, clean fail-closed |

The remaining cost is dominated by the **MusicBrainz browse phase**, which is
intentionally serialized at 1 req/s and must not be weakened: **78 requests**
across the 17 curated artists, ~86 s of unavoidable pacing. CAA resolution is
now a small fraction of the total (bounded concurrency, ~0.3 s per cover).

### 20.3 MusicBrainz request count and observed pacing

| Metric | Result |
| --- | --- |
| MusicBrainz requests (one full fetch) | **78** |
| Minimum observed inter-request gap | **1,103 ms** |
| Maximum observed inter-request gap | 4,777 ms (network variance) |
| Contract | **≤ 1 request/second — never violated** |

The minimum gap of 1,103 ms confirms the adapter never issues MusicBrainz
requests faster than the one-request-per-second contract. `[Pass]`.

### 20.4 CAA request count, concurrency, and timeout behavior

| Metric | Result |
| --- | --- |
| CAA requests (one full fetch) | **141** |
| CAA max simultaneous in-flight | **4** (bounded concurrency confirmed) |
| CAA redirect OK | **120** |
| CAA non-redirect (genuine 404 "no cover") | **21** |
| CAA missing `Location` | 0 |
| CAA timeouts / network errors | **0** |
| CAA server 5xx | **0** |

- The 21 non-redirect responses are genuine "no cover art found" 404s and are
  correctly filtered out; they are not failures of the category.
- **CAA-unreachable (simulated via a non-routable host):** the fetch completed
  in **104,373 ms** with **0 usable images**, then failed closed with
  `Category "album-release-dates" returned fewer than 2 items — cannot play.`
  The 5 s per-lookup timeout bounds each attempt; the category no longer hangs
  for many minutes. `[Pass]` (was `[Fail]` in Section 19.6).
- **MusicBrainz failure (simulated via a non-routable host):** the fetch failed
  closed in **10,757 ms** with a clean error (`fetch failed`), and the gameplay
  route renders the `error`/`unavailable` state. `[Pass]`.

### 20.5 Data-quality metrics (live endpoint, 120 items)

| Metric | Result |
| --- | --- |
| Valid normalized items | **120** (the adapter's `MAX_ALBUM_ITEMS` cap) |
| Unique IDs | 120 / 120 |
| Unique image URLs | 120 / 120 |
| Empty image URLs | **0** |
| Artwork success rate (CAA redirect OK) | **120 / 141 = 85.1%** of lookups; **120 / 120 = 100%** of emitted items have a usable image |
| Unique dates | **101** of 120 |
| Date tie groups | 16 (35 items in ties; max 3 items per date) |
| Date range | **1963 → 2026** |
| Precision preserved | 48 year-only, 5 year-month, 67 full-date |
| Missing-date rate (source pool) | unchanged (~70.9% of browse groups carry a date) |

Data quality is unchanged from Section 19.4 and remains strong: 120 items with
101 unique dates, comparable to or larger than every other promoted category
(65–192 items). Filtering CAA failures does **not** leave an insufficient pool.

### 20.6 Readiness evaluation against the seven release gates

| Gate | Status | Basis |
| --- | --- | --- |
| `stable-semantic-identity` | `[Pass]` | `album-release-date` is a stable semantic ID. |
| `approved-metric-contract` | `[Pass]` | Source date precision preserved in `displayValue`; numeric `value` derived without inventing precision. |
| `valid-server-adapter` | `[Pass]` | [`musicbrainz.ts`](lib/api/musicbrainz.ts:1) is server-only; no credentials; no client-side provider logic. |
| `runtime-provider-evidence` | `[Pass]` | 120 items, 101 unique dates, 120/120 images, 0% missing images, 141 CAA requests / 120 OK / 21 genuine 404s / 0 timeouts, MB 78 requests with a 1,103 ms minimum gap. |
| `server-route-authorization` | `[Pass]` | Mapping resolves ([`availability.ts`](lib/catalog/availability.ts:353)); gated route renders "Category unavailable". |
| `public-catalog-eligibility` | `[Fail]` | **Latency:** cold ~117–128 s / warm ~153 s — still not viable for a request-time fetch. The MusicBrainz browse phase alone is ~86 s of unavoidable 1 req/s pacing that must not be weakened. |
| `reversible-visibility` | `[Pass]` | Removing the mapping entry or setting `productionPlayable: false` reverts to hidden without changing semantic identity or stored scores. |

**Readiness:** `[Fail]` on `public-catalog-eligibility`. **Not promoted.** The
category remains gated.

**Exact measurable blocker:** the MusicBrainz browse latency. The adapter must
issue **78 serialized MusicBrainz requests** (17 artists, paged at 1 req/s) to
build the pool, which is **~86 s of unavoidable pacing** under the provider's
one-request-per-second contract. Even with CAA fully optimized (bounded
concurrency, `HEAD`, 5 s timeout), the end-to-end fetch is **~117–128 s cold**,
which is not viable for a request-time fetch. The failure-behavior blocker from
Section 19 is **resolved** (CAA-unreachable now fails in ~104 s, not >15 min).
Data quality and image availability are **not** blockers.

### 20.7 Optimization applied vs. remaining

- **Applied:** provider scheduling separation, CAA `HEAD` + `redirect: "manual"`,
  bounded CAA concurrency (max 4), finite CAA timeout (5 s). These reduced cold
  latency from ~5.9 min to ~2.1 min and bounded the CAA-unreachable failure from
  >15 min to ~1.7 min.
- **Not applied (would violate the task constraints):** reducing or removing
  MusicBrainz pacing. The remaining ~86 s is the provider's own 1 req/s
  contract, which the task explicitly requires be preserved.
- **Possible future direction (not implemented, needs owner decision):**
  pre-warming the MusicBrainz browse cache out of band, or reducing the curated
  artist pool / per-artist page depth. Both change product/data scope and are
  `Needs Verification [product-decision]`.

### 20.8 Files changed in this pass

- [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:1) — separated provider
  scheduling (`MUSICBRAINZ_REQUEST_SPACING_MS` applies only to MusicBrainz);
  CAA resolution switched to `HEAD` + `redirect: "manual"` with
  `AbortSignal.timeout(5000)`; added `resolveCoverArtUrlsBounded()` with
  `CAA_CONCURRENCY = 4`; `fetchAlbumReleaseDates()` now batches CAA resolution
  with bounded concurrency and no CAA sleep. MusicBrainz fail-closed behavior
  unchanged.
- [`docs/higher-lower-category-provider-plan.md`](docs/higher-lower-category-provider-plan.md:1)
  — updated Section 14.3 and Section 15.3 status rows; added this Section 20.

Temporary diagnostic instrumentation (a `?full=1` branch in
[`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1), a metrics
counter in the adapter, and `__MB_BASE_OVERRIDE` / `__CAA_BASE_OVERRIDE` env
overrides used to simulate unreachable hosts) was **fully reverted**. Temporary
measurement JSON files (`.tmp-*.json`) were removed after use.

### 20.9 Repository checks (this pass)

- `npx tsc --noEmit` → `[Pass]` (exit 0).
- `npm run lint` → `[Pass]` (0 errors; the same 2 pre-existing warnings:
  unused eslint-disable in `TimeAttackGame.tsx`, unused `WorldBankMeta` in
  `worldbank.ts`).
- `npm run build` → `[Pass]` (compiled successfully; all routes generated).

### 20.10 Remaining `Needs Verification` (this pass)

- `Needs Verification [product-decision]`: whether to accept the ~117–128 s
  request-time fetch latency (e.g. by pre-warming the MusicBrainz browse cache
  out of band) or to reduce the curated artist pool / per-artist page depth.
  This is the remaining promotion blocker; it is a product/data-scope call, not
  a technical one.
- `Needs Verification [provider-capability]`: the artist-image strategy for
  `number-of-albums` (unchanged; out of scope for this pass).
- `Needs Verification [product-decision]`: root metadata wording in
  [`app/layout.tsx`](app/layout.tsx:13) — left unchanged (see Section 12).

---

## 21. Focused Snapshot Pass — `album-release-date` (2026-10-13)

This section records the seventh pass, scoped **only** to `album-release-date`.
It removes the request-time MusicBrainz latency by having gameplay read a
pre-generated local data snapshot, then re-evaluates readiness and promotes the
category through the existing gate system. No other category was modified.
Statuses use the project vocabulary: `[Pass]`, `[Partial]`, `[Fail]`,
`[Blocked]`, `[Not tested]`.

**Environment:** dev server at `http://localhost:3000` (Next.js 16.3.4,
Turbopack). `.env.local` present (variable **names** only; values never read
into this document, logs, or handoffs). No credential value was printed,
logged, or copied during this pass.

### 21.1 Design chosen and why

The live MusicBrainz + Cover Art Archive adapter is correct and produces
production-quality data, but request-time execution is inherently too slow:
the provider's one-request-per-second contract makes the browse phase alone
~86 s of unavoidable pacing (Section 20). The simplest appropriate fix for a
school project is a **pre-generated local snapshot**:

- MusicBrainz + Cover Art Archive remain the authoritative data-generation
  source. The live adapter ([`musicbrainz.ts`](lib/api/musicbrainz.ts:1)) is
  **preserved unchanged**.
- A developer-run generator produces a normalized snapshot containing only the
  public, gameplay-safe `GameItem` fields.
- Normal gameplay reads the snapshot instead of performing the 78-request
  crawl at request time.
- The existing architecture is reused end-to-end: the same
  [`FETCHER_MAP`](lib/api/index.ts:35) key (`album-release-dates`), the same
  [`SEMANTIC_PROVIDER_MAPPING`](lib/catalog/availability.ts:353) entry, the
  same [`GameItem`](types/api.ts:6) normalization, the same
  [`ApiFetchError`](types/api.ts:21) contract, the same route authorization,
  and the same seven release gates. **No parallel provider framework was
  created.**

No cron jobs, Redis, queues, workers, databases, or other infrastructure were
introduced. MusicBrainz pacing was not weakened, and the curated artist pool
was not reduced.

### 21.2 Files created / modified

| File | Action |
| --- | --- |
| [`lib/api/albumReleaseDateSnapshot.ts`](lib/api/albumReleaseDateSnapshot.ts:1) | **Created** — snapshot contract, validation, fail-closed reader |
| [`scripts/generate-album-release-date-snapshot.mjs`](scripts/generate-album-release-date-snapshot.mjs:1) | **Created** — developer-run snapshot generator |
| [`lib/api/data/album-release-date.snapshot.json`](lib/api/data/album-release-date.snapshot.json:1) | **Created** — generated snapshot (120 items) |
| [`lib/api/index.ts`](lib/api/index.ts:1) | Modified — `album-release-dates` now reads the snapshot; added `fetchGameItemsRaw()` and `fetchAlbumReleaseDatesLive()` |
| [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1) | Modified — added dev-only `?full=1` snapshot-generation mode |
| [`lib/catalog/availability.ts`](lib/catalog/availability.ts:188) | Modified — `album-release-date` promoted to `productionPlayable: true` with `satisfiedGates(...)` |
| [`package.json`](package.json:5) | Modified — added `snapshot:album-release-date` script |
| [`docs/higher-lower-category-provider-plan.md`](docs/higher-lower-category-provider-plan.md:1) | Modified — updated Section 14.3 and 15.3 status rows; added this Section 21 |

The live adapter [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:1) was **not**
modified.

### 21.3 Generation / refresh path (how a developer runs it)

1. Start the dev server: `npm run dev`.
2. In another terminal: `npm run snapshot:album-release-date`.

The script calls the dev-only diagnostic route in full-pool mode
(`GET /api/test-fetch?category=album-release-dates&full=1`), which runs the
**live** MusicBrainz adapter through the real dispatcher (so `@/` aliases and
server-only code resolve exactly as in production), then validates the pool and
writes the snapshot. A cold run takes ~2 minutes (the unavoidable MusicBrainz
pacing); this is a developer-run step, not a request-time cost.

### 21.4 Snapshot format and stored fields

The snapshot is a plain JSON file with a stable shape:

```json
{
  "version": 1,
  "generatedAt": "<ISO-8601 UTC>",
  "source": "MusicBrainz release-group browse + Cover Art Archive front image (curated artist MBID pool). ...",
  "items": [ { "id", "name", "imageUrl", "value", "displayValue" } ]
}
```

Only the public, gameplay-safe [`GameItem`](types/api.ts:6) fields are stored:
`id` (release-group MBID), `name` (album title), `imageUrl` (absolute
Cover Art Archive URL), `value` (deterministic numeric date key derived without
inventing precision), and `displayValue` (the original source date string,
preserving partial precision). No credentials, tokens, diagnostics, or private
environment values are stored.

### 21.5 How gameplay reads the snapshot

[`FETCHER_MAP`](lib/api/index.ts:35) maps `album-release-dates` to
[`fetchAlbumReleaseDatesFromSnapshot()`](lib/api/albumReleaseDateSnapshot.ts:196),
which reads and validates the snapshot from disk and returns its items. The
dispatcher's existing sanitize + ≥ 2 filter + Fisher-Yates shuffle then run
unchanged, so gameplay order stays random while the snapshot's own order stays
stable and reviewable.

### 21.6 How the live adapter is preserved for regeneration

[`fetchAlbumReleaseDates()`](lib/api/musicbrainz.ts:311) is unchanged and still
exported. The dispatcher exposes it through
[`fetchAlbumReleaseDatesLive()`](lib/api/index.ts:114), used only by the
dev-only `?full=1` route. The snapshot can therefore be regenerated from the
authoritative provider at any time without reimplementing any provider logic.

### 21.7 Determinism and credential safety

- The generator sorts items by a stable key (`id`, then `name`) before writing,
  so the file is reviewable and diff-friendly.
- The generator projects to only the five public `GameItem` fields.
- The generator never reads `.env*` and never inspects credentials.
- The snapshot file is **not** client-served: a direct request to
  `/lib/api/data/album-release-date.snapshot.json` returns HTTP 404.
- No credential pattern (`AIza`, `TWITCH_CLIENT_SECRET`, `client_secret`) was
  found in `.next/static` (the client-served bundle directory).
- The snapshot contains no `token`, `secret`, or `key` fields. The only `mbid`
  occurrences are inside public `archive.org` image URLs.

### 21.8 Fail-closed behavior

[`parseAlbumReleaseDateSnapshot()`](lib/api/albumReleaseDateSnapshot.ts:88)
validates the snapshot shape, version, metadata, and every item, and throws
[`ApiFetchError`](types/api.ts:21) when the snapshot is malformed or contains
fewer than [`MIN_SNAPSHOT_ITEMS`](lib/api/albumReleaseDateSnapshot.ts:52) (2)
items. Verified at runtime:

| Case | Result |
| --- | --- |
| Snapshot with 1 item | `[Pass]` — HTTP 502, `"Snapshot contains fewer than 2 playable items."` |
| Snapshot with a malformed item (empty `imageUrl`) | `[Pass]` — HTTP 502, `"Snapshot contains a malformed item."` |
| Snapshot file missing | `[Pass]` — HTTP 502 with a message pointing at the generator command |

### 21.9 Measured snapshot load time

| Measurement | Value |
| --- | --- |
| Snapshot gameplay load (`/api/test-fetch?category=album-release-dates`) | **~25–31 ms** (HTTP 200, 120 items) |
| Live request-time fetch (Section 20, for comparison) | ~117,000 ms (~117 s) |
| Improvement | ~3,700× faster |

### 21.10 Data-quality metrics (from the generated snapshot)

| Metric | Result |
| --- | --- |
| Valid normalized items | **120** |
| Unique ids | 120 / 120 |
| Unique image URLs | 120 / 120 |
| Empty image URLs | **0** |
| Absolute HTTP image URLs | 120 / 120 |
| Unique dates | **101** of 120 |
| Date tie groups | 16 (35 items in ties; max 3 items per date) |
| Date range | **1963 → 2026** |
| Precision preserved | year-only, year-month, and full-date values all present |

Data quality is unchanged from Section 20.5 and remains strong: 120 items with
101 unique dates, comparable to or larger than every other promoted category
(65–192 items).

### 21.11 Readiness evaluation against the seven release gates

| Gate | Status | Basis |
| --- | --- | --- |
| `stable-semantic-identity` | `[Pass]` | `album-release-date` is a stable semantic ID. |
| `approved-metric-contract` | `[Pass]` | Source date precision preserved in `displayValue`; numeric `value` derived without inventing precision. |
| `valid-server-adapter` | `[Pass]` | Snapshot reader is server-only; no credentials; no client-side provider logic. |
| `runtime-provider-evidence` | `[Pass]` | 120 items, 120 unique ids, 120/120 absolute images, 101 unique dates, 16 tie groups (max 3/date), range 1963–2026; fail-closed verified. |
| `server-route-authorization` | `[Pass]` | Mapping resolves ([`availability.ts`](lib/catalog/availability.ts:353)); gameplay route returns HTTP 200 in both modes. |
| `public-catalog-eligibility` | `[Pass]` | **Latency resolved:** snapshot load ~25–31 ms (was ~117 s). Data quality strong. |
| `reversible-visibility` | `[Pass]` | Removing the mapping entry or setting `productionPlayable: false` reverts to hidden without changing semantic identity or stored scores. |

**Readiness:** `[Pass]`. All seven gates are satisfied with recorded evidence.
**Promoted** via the existing gate system.

### 21.12 Promotion applied

- [`lib/catalog/availability.ts`](lib/catalog/availability.ts:188) —
  `album-release-date` changed from `productionPlayable: false` +
  `unverifiedGates(...)` to `productionPlayable: true` + `satisfiedGates(...)`
  with the Section 21.10 evidence recorded in the gate note. No other
  availability record was modified. The consistency guard
  ([`assertAvailabilityConsistency()`](lib/catalog/availability.ts:284)) passes
  because all seven gates are satisfied.

### 21.13 Browser runtime verification (Playwright MCP)

**MCP status:** Playwright MCP was **available** in this pass.

| Check | Result | Evidence |
| --- | --- | --- |
| Home page `GET /` | `[Pass]` | HTTP 200; Music domain now shows "3 available categories". |
| Category selection + Go enablement | `[Pass]` | Selecting Music → Album Release Date + Classic enabled the Go button. |
| Classic gameplay — `album-release-date` | `[Pass]` | `/game/classic?category=album-release-date`; "Album Release Date · Classic"; current "1962–1966 / 1967–1970" (1993) with image; next card with image. |
| Higher/Lower progression | `[Pass]` | Clicking Higher advanced the deck and incremented score 0 → 1. |
| Gated category fail-closed — `number-of-albums` | `[Pass]` | `/game/classic?category=number-of-albums` → "Category unavailable" state. |
| Console errors | `[Pass]` | 0 console errors across all navigations (1 benign Next.js smooth-scroll warning). |
| Client provider requests | `[Pass]` | No client-side XHR/fetch to any provider; only `archive.org` image requests. |

**Regression check:** `player-count` (existing playable) renders correctly —
"Peak Concurrent Players · Classic", "New World: Aeternum" 5.6K peak players,
images present. The "Incorrect" status label observed on initial load is
**pre-existing** (it appears identically on `player-count` before any answer)
and is unrelated to this change. No regression observed.

### 21.14 Repository checks (this pass)

- `npx tsc --noEmit` → `[Pass]` (exit 0).
- `npm run lint` → `[Pass]` (0 errors; the same 2 pre-existing warnings:
  unused eslint-disable in `TimeAttackGame.tsx`, unused `WorldBankMeta` in
  `worldbank.ts`).
- `npm run build` → `[Pass]` (compiled successfully; all routes generated).

### 21.15 Remaining `Needs Verification` (this pass)

- `Needs Verification [product-decision]`: the snapshot is a point-in-time
  artifact. It must be regenerated (`npm run snapshot:album-release-date`) when
  the curated artist pool changes or when fresher data is desired. Whether to
  schedule periodic regeneration is a product/ops call; no scheduler was added
  (the task explicitly forbids cron/queues/workers).
- `Needs Verification [provider-capability]`: the artist-image strategy for
  `number-of-albums` (unchanged; out of scope for this pass).
- `Needs Verification [product-decision]`: root metadata wording in
  [`app/layout.tsx`](app/layout.tsx:13) — left unchanged (see Section 12).

---

## 22. Focused Provider-Capability Investigation — `number-of-albums` artist image (2026-10-13)

This section records an **investigation-only** pass, scoped **only** to the
`number-of-albums` artist-image blocker. **No code was changed.** No provider
adapter, availability record, mapping, dispatcher entry, or gameplay behavior
was modified. `album-release-date`, YouTube, IGDB, TMDB, SteamSpy, the deferred
categories, and currently playable availability were **not** touched. Statuses
use the project vocabulary: `[Pass]`, `[Partial]`, `[Fail]`, `[Blocked]`,
`[Not tested]`.

**Environment:** Context7 MCP, Exa web-search MCP, and Playwright MCP were
**available** in this pass. Provider capabilities were verified against
authoritative provider documentation and live provider endpoints rather than
memory. No credential value was read, printed, logged, or copied.

### 22.1 The blocker being investigated

`number-of-albums` represents an **ARTIST** (one item per curated artist, with
`value` = count of `primary-type === "Album"` release groups). The adapter
deliberately emits `imageUrl: ""`
([`musicbrainz.ts`](lib/api/musicbrainz.ts:292)) because no truthful artist-image
source was wired, and the dispatcher drops items without an `imageUrl`
([`index.ts`](lib/api/index.ts:61)). Using random album artwork as the artist
image is prohibited. The question this pass answers: **is there a legitimate,
reliable source of actual ARTIST images that maps from the existing MusicBrainz
artist MBIDs?**

### 22.2 Candidate sources evaluated

Four realistic candidates were evaluated against the required criteria.

#### Candidate A — Wikidata (`P434` → `P18`)

- **Actual artist image?** **Yes.** `P18` ("image") is the image of the subject
  (the artist), not album artwork. Verified live: the query returned artist
  photos for The Beatles, Pink Floyd, and Coldplay.
- **MBID mapping?** **Direct and reliable.** Wikidata property **`P434`** is
  literally "MusicBrainz artist ID" — the same MBID the curated pool already
  stores. The mapping is an exact identifier join, not fuzzy name matching.
- **Auth / API key?** **None.** The public SPARQL endpoint
  (`https://query.wikidata.org/sparql`) and the Wikibase REST API
  (`https://www.wikidata.org/w/rest.php/wikibase/v1`) are open. A descriptive
  `User-Agent` is requested by Wikimedia policy.
- **Free / non-commercial suitability?** **Yes.** Wikidata data is **CC0**
  (public domain dedication). Wikimedia Commons images carry their own
  per-file licenses (commonly CC BY-SA or public domain), which must be
  respected per image.
- **Attribution / licensing?** Wikidata data: CC0, no attribution required.
  Commons images: **per-file license**; many require attribution. This is the
  main caveat (see 22.4).
- **Image URL stability?** **High.** `P18` values resolve to
  `https://commons.wikimedia.org/wiki/Special:FilePath/<file>` which redirects
  to a stable `https://upload.wikimedia.org/...` URL. Verified live: the Pink
  Floyd URL resolved HTTP 200 (2600×1254).
- **Coverage for the curated pool?** **17/17 (100%).** Verified live via SPARQL
  across all 17 curated MBIDs in [`curatedPools.ts`](lib/api/curatedPools.ts:34):
  every artist has at least one `P18` image. 16 artists have exactly 1 image;
  The Beatles has 3 (multi-value — a deterministic selection rule is required).
- **Request limits / latency?** The SPARQL endpoint is a shared public service
  with a documented query-timeout and a polite-use expectation; it is **not**
  designed for high-frequency per-request calls. A single batched query for all
  17 MBIDs is one request. Latency observed: sub-second to a few seconds.
- **Server-side without exposing credentials?** **Yes.** No credential exists;
  the query runs server-side in the adapter.
- **Brittle / questionable scraping?** **No.** This is a documented public API
  and an open dataset, not scraping.

#### Candidate B — Fanart.tv (`/music/{mbid}`)

- **Actual artist image?** **Yes.** The music artist endpoint returns
  `artistbackground` (1920×1080), `artist4kbackground`, `artistthumb`,
  `musiclogo`, `hdmusiclogo`, and `musicbanner` — genuine artist imagery, not
  album art.
- **MBID mapping?** **Direct.** The artist is identified by its **MusicBrainz
  ID** (`/v3.2/music/{mbid}`), the same MBID the curated pool stores.
- **Auth / API key?** **Required.** A project `api_key` is mandatory; an
  optional personal `client_key` improves freshness. Keys are obtained from
  `https://fanart.tv/get-an-api-key/`.
- **Free / non-commercial suitability?** **Yes for a school project.** Free
  project and personal tiers exist; all tiers have unlimited image access.
- **Attribution / licensing?** Fanart.tv's own terms state content "may be used
  in any way by us, or anyone, without any kind of attribution or royalty",
  while **all copyrights remain with their respective owners** and the site
  relies on a **fair-use** argument. This is a weaker, more ambiguous legal
  footing than Wikidata's CC0 data, and the site's terms explicitly place
  responsibility on the user.
- **Image URL stability?** **High.** Images are served from Fanart.tv's own
  CDN (`assets.fanart.tv`).
- **Coverage for the curated pool?** **Not measured live** (no API key
  available in this pass). Fanart.tv is community-contributed, so coverage for
  mainstream artists is expected to be high but is **not guaranteed** for every
  curated artist. `Needs Verification [provider-capability]`.
- **Request limits / latency?** Documented as unlimited image access; the
  client library implements 429 backoff. A 7-day delay applies to newly added
  images on the project tier.
- **Server-side without exposing credentials?** **Yes**, if the key is stored
  as a server-only env var (non-`NEXT_PUBLIC_`).
- **Brittle / questionable scraping?** **No** — documented API — but the
  fair-use licensing posture is a consideration.

#### Candidate C — Deezer public API (`/search/artist`)

- **Actual artist image?** **Yes.** The artist object exposes `picture`,
  `picture_small` … `picture_xl` (artist photos).
- **MBID mapping?** **No direct mapping.** Deezer is keyed by its own numeric
  artist ID; there is no MusicBrainz MBID field. Mapping would require a
  **fuzzy name search**, which the task explicitly discourages ("Avoid fuzzy
  identity matching where a shared MusicBrainz ID can be used").
- **Auth / API key?** None for basic public reads.
- **Free / non-commercial suitability?** Public API, but Deezer's terms and
  the lack of an MBID join make it a weaker fit.
- **Attribution / licensing?** Deezer content licensing is not clearly
  permissive for redistribution of artist images.
- **Image URL stability?** CDN URLs (`cdn-images.dzcdn.net`) are stable but
  include a content hash.
- **Coverage for the curated pool?** Likely high for mainstream artists, but
  **not measured** and **not MBID-addressable**.
- **Request limits / latency?** Public API; limits not clearly documented for
  this use.
- **Server-side without exposing credentials?** Yes (no credential).
- **Brittle / questionable scraping?** No scraping, but the **fuzzy-match
  identity risk** is the disqualifying factor.

#### Candidate D — MusicBrainz artist relations / Cover Art Archive

- **Actual artist image?** **No reliable source.** MusicBrainz itself does not
  host artist images. Artist "image" relations exist but are sparse and
  inconsistent, and the Cover Art Archive is **album/release-group** artwork —
  using it for an artist would be the prohibited random-album-art workaround.
- **MBID mapping?** N/A (no usable image field).
- **Verdict:** **Rejected.** This is the original blocker, not a solution.

### 22.3 Recommendation

**Recommended option: Candidate A — Wikidata `P434` → `P18`.**

Rationale:

1. **Truthful entity imagery.** `P18` is the artist's image, satisfying the
   plan's requirement that an artist metric use artist imagery, not album art.
2. **Exact MBID join.** `P434` is the MusicBrainz artist ID, so the mapping is
   an exact identifier match — no fuzzy name matching, no identity risk.
3. **Verified 100% coverage** for the current 17-artist curated pool.
4. **No credential** to manage, store, or leak; runs server-side.
5. **Strongest licensing posture:** Wikidata data is CC0; Commons images carry
   per-file licenses that are at least explicitly documented.
6. **Stable, absolute image URLs** via `Special:FilePath` → `upload.wikimedia.org`.

**Mapping path (MusicBrainz MBID → recommended source):**

```
curated artist MBID (curatedPools.ts)
  -> Wikidata SPARQL: ?artist wdt:P434 "<mbid>" ; wdt:P18 ?image
     (endpoint: https://query.wikidata.org/sparql?format=json)
  -> ?image = https://commons.wikimedia.org/wiki/Special:FilePath/<file>
  -> absolute, stable image URL for GameItem.imageUrl
```

A single batched SPARQL query can resolve all curated MBIDs in one request
(`VALUES ?mbid { ... }`), which is the polite-use-friendly shape.

**Fanart.tv (Candidate B)** is a viable **secondary/fallback** source: it also
maps directly by MBID and returns richer artist imagery, but it requires an API
key and rests on a fair-use licensing posture rather than CC0. It is not the
primary recommendation.

**Deezer (Candidate C)** is **not recommended** because it lacks an MBID join
and would require fuzzy name matching.

**MusicBrainz/CAA (Candidate D)** is **rejected** — it is the original blocker.

### 22.4 Licensing, attribution, and credential requirements (recommended option)

- **Wikidata data:** CC0 1.0 (public domain dedication) — no attribution
  required for the identifier mapping.
- **Wikimedia Commons images:** **per-file license.** Many are CC BY-SA or
  public domain; some require attribution to the author. A production
  implementation should either (a) surface per-image attribution, or (b)
  restrict to public-domain/CC0 files. This is a **product/legal decision**,
  not a technical one. `Needs Verification [product-decision]`.
- **Credentials:** **none** for Wikidata/Commons. A descriptive `User-Agent`
  constant is requested by Wikimedia policy (a constant, not a secret).
- **Server-side:** the SPARQL query runs in the server-only adapter; no
  credential or private value crosses into client-reachable code.

### 22.5 Expected coverage, limits, and latency (recommended option)

| Aspect | Finding |
| --- | --- |
| Curated-pool coverage | **17/17 (100%)** — every curated artist has a `P18` image (verified live 2026-10-13). |
| Multi-value handling | 16 artists have 1 image; The Beatles has 3. A deterministic selection rule (e.g. first by file name) is required. |
| Request shape | One batched SPARQL query for all MBIDs (`VALUES ?mbid { ... }`). |
| Latency | Sub-second to a few seconds for a batched query (observed). |
| Rate limits | Shared public endpoint; polite-use expectation, not a per-second quota. A single cached batched query per revalidation window is well within reasonable use. |
| Image URL stability | High — `Special:FilePath` redirects to stable `upload.wikimedia.org` URLs. |
| Credentials | None. |

### 22.6 What was NOT done (scope discipline)

- **No implementation.** No adapter, mapping, availability record, dispatcher
  entry, or type was changed. This pass only compares candidates and records a
  recommendation.
- **No other category touched.** `album-release-date`, YouTube, IGDB, TMDB,
  SteamSpy, the deferred categories, and currently playable availability were
  not modified.
- **`number-of-albums` remains gated.** The recommendation is recorded but not
  applied; the category stays hidden until a separately approved implementation
  pass wires the source and records readiness evidence.

### 22.7 Files changed in this pass

- [`docs/higher-lower-category-provider-plan.md`](docs/higher-lower-category-provider-plan.md:1)
  — updated the Section 14.3 `number-of-albums` status row; added this
  Section 22.

No application code was changed.

### 22.8 Remaining `Needs Verification` (this pass)

- `Needs Verification [product-decision]`: **Commons per-image attribution.**
  Whether to surface per-image attribution or restrict to public-domain/CC0
  files is a product/legal call.
- `Needs Verification [provider-capability]`: **Fanart.tv coverage** for the
  curated pool was not measured (no API key available); it is a viable
  secondary source but unverified.
- `Needs Verification [data-quality]`: **multi-value `P18` selection rule** for
  artists with more than one image (e.g. The Beatles) must be defined
  deterministically before implementation.
- `Needs Verification [environment-specific]`: **Wikidata SPARQL latency and
  rate behavior** under the project's actual request pattern (a single batched
  query is expected to be safe, but was not load-tested).
- `Needs Verification [product-decision]`: root metadata wording in
  [`app/layout.tsx`](app/layout.tsx:13) — left unchanged (see Section 12).

---

## 23. Focused `number-of-albums` Readiness Implementation — Wikidata artist image (2026-10-13)

This section records the eighth pass, scoped **only** to `number-of-albums`. It
implements the Wikidata `P434` → `P18` artist-image source recommended in
Section 22, measures the curated-pool coverage and licensing, measures the
end-to-end runtime, and promotes the category through the existing gate system
using the established generated-snapshot approach. No other category was
modified. Statuses use the project vocabulary: `[Pass]`, `[Partial]`, `[Fail]`,
`[Blocked]`, `[Not tested]`.

**Environment:** dev server at `http://localhost:3000` (Next.js 16.3.4,
Turbopack). `.env.local` present with `TMDB_API_KEY`, `YOUTUBE_API_KEY`,
`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` (variable **names** only; values
never read into this document, logs, or handoffs). Wikidata/Commons require
**no credential**. No credential value was printed, logged, or copied.

### 23.1 Implementation

| File | Action |
| --- | --- |
| [`lib/api/wikidataArtistImages.ts`](lib/api/wikidataArtistImages.ts:1) | **Created** — batched `P434` → `P18` resolver, deterministic multi-`P18` rule, Commons metadata retrieval |
| [`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:1) | **Created** — snapshot contract, validation, fail-closed reader |
| [`scripts/generate-artist-album-counts-snapshot.mjs`](scripts/generate-artist-album-counts-snapshot.mjs:1) | **Created** — developer-run snapshot generator |
| [`lib/api/data/artist-album-counts.snapshot.json`](lib/api/data/artist-album-counts.snapshot.json:1) | **Created** — generated snapshot (17 items) |
| [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:1) | Modified — `fetchArtistAlbumCounts()` now resolves genuine artist images and attaches attribution; items without a resolvable image are dropped |
| [`lib/api/index.ts`](lib/api/index.ts:1) | Modified — `artist-album-counts` now reads the snapshot; added `fetchArtistAlbumCountsLive()` |
| [`types/api.ts`](types/api.ts:6) | Modified — added optional `attribution?: string` to `GameItem` |
| [`components/game/GameCard.tsx`](components/game/GameCard.tsx:1) | Modified — renders the optional attribution credit line |
| [`lib/api/albumReleaseDateSnapshot.ts`](lib/api/albumReleaseDateSnapshot.ts:1) | Modified — preserves the optional `attribution` field |
| [`scripts/generate-album-release-date-snapshot.mjs`](scripts/generate-album-release-date-snapshot.mjs:1) | Modified — preserves the optional `attribution` field |
| [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1) | Modified — `?full=1` supports `artist-album-counts` |
| [`lib/catalog/availability.ts`](lib/catalog/availability.ts:179) | Modified — `number-of-albums` promoted to `productionPlayable: true` with `satisfiedGates(...)` |
| [`package.json`](package.json:5) | Modified — added `snapshot:artist-album-counts` script |

The live MusicBrainz browse logic and the curated artist MBID pool were **not**
changed. MusicBrainz pacing was **not** weakened.

### 23.2 Batched Wikidata request shape and deterministic multi-`P18` rule

**Request shape:** ONE batched SPARQL request for the whole curated pool:

```sparql
SELECT ?mbid ?artist ?image ?rank WHERE {
  VALUES ?mbid { "<mbid1>" "<mbid2>" ... }
  ?artist wdt:P434 ?mbid .
  OPTIONAL {
    ?artist p:P18 ?stmt .
    ?stmt ps:P18 ?image .
    OPTIONAL { ?stmt wikibase:rank ?rank . }
  }
}
```

`P434` is literally "MusicBrainz artist ID", so the join is an **exact
identifier match** — no fuzzy artist-name matching is performed anywhere. The
`p:P18`/`ps:P18` statement path is used so the statement rank is available.

**Deterministic multi-`P18` rule:**
1. Prefer a **preferred-ranked** `P18` statement when one exists.
2. Otherwise (and to break ties among multiple preferred statements) choose the
   candidate with the **lexicographically smallest canonical Commons file name**.
   This is stable across runs and independent of SPARQL row order.

Measured multi-`P18` artists: The Beatles (3, all normal), Metallica (2, one
preferred), The Rolling Stones (2, one preferred), Madonna (2, one preferred).
The preferred-rank rule selected the preferred statement for Metallica, The
Rolling Stones, and Madonna.

### 23.3 Measured curated-pool coverage and license distribution

**Coverage:** **17/17 (100%)** — every curated artist has at least one `P18`
image. Batched SPARQL latency: **~992 ms**.

**Selected-image license distribution (17 images):**

| License | Count |
| --- | --- |
| Public domain | 5 |
| CC BY 4.0 | 3 |
| CC BY 2.0 | 3 |
| CC BY-SA 2.0 | 2 |
| CC BY-SA 4.0 | 2 |
| CC0 | 1 |
| CC BY 3.0 | 1 |

- **PD/CC0 count: 6/17.**
- **Attribution-required count: 11/17.**
- **Unclear or unsuitable licensing: 0/17** — every selected image has an
  explicit, documented Commons license.

### 23.4 Chosen attribution strategy and justification

**Measured facts:** 11/17 selected images require attribution (CC BY / CC
BY-SA); 0/17 have unclear licensing. The `GameItem` contract had no attribution
surface, and the task forbids a parallel framework or contract-breaking change.

**Strategy chosen:** add an **optional** `attribution?: string` field to
`GameItem` (non-breaking — all existing producers omit it) and render it as a
small credit line in [`GameCard.tsx`](components/game/GameCard.tsx:1). The
adapter reads the per-image Commons license/author/licenseUrl and builds a
compact credit line **only when the license requires attribution**; PD/CC0
images carry no credit line. This satisfies "do not silently assume every
Commons image is CC0 or public domain" by surfacing the real license per image
rather than assuming permissiveness.

**Justification:** the alternative (restricting to PD/CC0 only) would drop
11/17 artists and leave a thin 6-item pool; surfacing attribution preserves the
full 17-artist pool while remaining truthful about licensing. The optional field
is the smallest change that keeps the existing `GameItem` contract intact.

### 23.5 Measured end-to-end runtime (MusicBrainz + Wikidata)

| Measurement | Value |
| --- | --- |
| Live end-to-end fetch (`/api/test-fetch?category=artist-album-counts`) | **100,480 ms (~100 s)** |
| Batched Wikidata SPARQL request | ~992 ms |
| MusicBrainz browse phase (17 artists, paged at 1 req/s) | ~86 s (dominant cost) |
| Snapshot-backed gameplay load | **~99 ms** |
| Improvement | ~1,000× faster |

The dominant cost is the MusicBrainz browse phase, which is intentionally
serialized at the provider's one-request-per-second contract and must not be
weakened. The Wikidata batched request is a small fraction of the total.

### 23.6 Snapshot approach — needed, and why

**The snapshot approach was needed.** Request-time latency is **~100 s**, which
is not viable for a request-time fetch — the same blocker documented for
`album-release-date` (Sections 19–21). Per the task instruction, MusicBrainz
pacing was **not** weakened; instead the established generated-snapshot approach
was reused:

- The live MusicBrainz + Wikidata adapter is **preserved unchanged** and remains
  the authoritative data-generation source.
- A developer-run generator
  ([`scripts/generate-artist-album-counts-snapshot.mjs`](scripts/generate-artist-album-counts-snapshot.mjs:1))
  produces a normalized snapshot containing only the public, gameplay-safe
  `GameItem` fields.
- Normal gameplay reads the snapshot instead of performing the ~100 s crawl.
- The existing architecture is reused end-to-end: the same
  [`FETCHER_MAP`](lib/api/index.ts:38) key (`artist-album-counts`), the same
  [`SEMANTIC_PROVIDER_MAPPING`](lib/catalog/availability.ts:351) entry, the same
  [`GameItem`](types/api.ts:6) normalization, the same
  [`ApiFetchError`](types/api.ts:21) contract, the same route authorization, and
  the same seven release gates. **No parallel provider framework was created.**

No cron jobs, Redis, queues, workers, databases, or other infrastructure were
introduced.

### 23.7 Data-quality metrics (from the generated snapshot)

| Metric | Result |
| --- | --- |
| Valid normalized items | **17** |
| Unique ids | 17 / 17 |
| Unique image URLs | 17 / 17 |
| Empty image URLs | **0** |
| Absolute HTTP image URLs | 17 / 17 |
| Image availability (sampled, following redirects) | **17/17 HTTP 200** |
| Distinct album-count values | **16** of 17 (1 tie: Pink Floyd 509 = Led Zeppelin 509) |
| Value range | **15 → 1285** |
| Items carrying an attribution credit line | **10** |

### 23.8 Fail-closed behavior

[`parseArtistAlbumCountsSnapshot()`](lib/api/artistAlbumCountsSnapshot.ts:99)
validates the snapshot shape, version, metadata, and every item, and throws
[`ApiFetchError`](types/api.ts:21) when the snapshot is malformed or contains
fewer than [`MIN_SNAPSHOT_ITEMS`](lib/api/artistAlbumCountsSnapshot.ts:58) (2)
items. Verified at runtime:

| Case | Result |
| --- | --- |
| Snapshot with 1 item | `[Pass]` — HTTP 502, `"Snapshot contains fewer than 2 playable items."` |
| Snapshot with a malformed item (empty `imageUrl`) | `[Pass]` — HTTP 502, `"Snapshot contains a malformed item."` |
| Snapshot file missing | `[Pass]` — HTTP 502 with a message pointing at the generator command |

### 23.9 Readiness evaluation against the seven release gates

| Gate | Status | Basis |
| --- | --- | --- |
| `stable-semantic-identity` | `[Pass]` | `number-of-albums` is a stable semantic ID. |
| `approved-metric-contract` | `[Pass]` | `value` = count of `primary-type === "Album"` release groups across all pages; `displayValue` = `"N albums"`; artist metric uses genuine artist imagery. |
| `valid-server-adapter` | `[Pass]` | Snapshot reader is server-only; Wikidata/Commons access is server-side with a descriptive `User-Agent`; no credentials; no client-side provider logic. |
| `runtime-provider-evidence` | `[Pass]` | 17 items, 17/17 absolute Commons images, 16 distinct values, range 15–1285; Commons licensing measured (6/17 PD/CC0, 11/17 attribution-required, 0/17 unclear); fail-closed verified. |
| `server-route-authorization` | `[Pass]` | Mapping resolves ([`availability.ts`](lib/catalog/availability.ts:351)); gameplay route returns HTTP 200 in both modes. |
| `public-catalog-eligibility` | `[Pass]` | **Latency resolved:** snapshot load ~99 ms (was ~100 s). Data quality strong; licensing surfaced truthfully. |
| `reversible-visibility` | `[Pass]` | Removing the mapping entry or setting `productionPlayable: false` reverts to hidden without changing semantic identity or stored scores. |

**Readiness:** `[Pass]`. All seven gates are satisfied with recorded evidence.
**Promoted** via the existing gate system.

### 23.10 Promotion applied

- [`lib/catalog/availability.ts`](lib/catalog/availability.ts:179) —
  `number-of-albums` changed from `productionPlayable: false` +
  `unverifiedGates(...)` to `productionPlayable: true` + `satisfiedGates(...)`
  with the Section 23.7 evidence recorded in the gate note. No other
  availability record was modified. The consistency guard
  ([`assertAvailabilityConsistency()`](lib/catalog/availability.ts:284)) passes
  because all seven gates are satisfied.

### 23.11 Browser runtime verification (Playwright MCP)

**MCP status:** Playwright MCP was **available** in this pass.

| Check | Result | Evidence |
| --- | --- | --- |
| Home page `GET /` | `[Pass]` | HTTP 200; Music domain now shows "5 available categories" (was 4). |
| Classic gameplay — `number-of-albums` | `[Pass]` | `/game/classic?category=number-of-albums`; "Number of Albums · Classic"; current "Pink Floyd" (509 albums) with artist image; next "U2" with artist image and attribution credit line. |
| Higher/Lower progression | `[Pass]` | Clicking Higher advanced the deck (current → "U2" 1010 albums, next "Nirvana") and incremented score 0 → 1. |
| Attribution rendering | `[Pass]` | Credit lines rendered on cards whose image license requires it (e.g. "Image: Remy · CC BY 4.0 · https://creativecommons.org/licenses/by/4.0"). |
| Console errors | `[Pass]` | 0 console errors across navigations. |
| Client provider requests | `[Pass]` | No client-side XHR/fetch to `query.wikidata.org`, `commons.wikimedia.org`, or `musicbrainz.org`; only `commons.wikimedia.org` image requests. |
| Regression — `player-count` (existing playable) | `[Pass]` | "Peak Concurrent Players · Classic"; Portal "638 peak players"; images present. No regression. |

### 23.12 Repository checks (this pass)

- `npx tsc --noEmit` → `[Pass]` (exit 0).
- `npm run lint` → `[Pass]` (0 errors; the same 2 pre-existing warnings:
  unused eslint-disable in `TimeAttackGame.tsx`, unused `WorldBankMeta` in
  `worldbank.ts`).
- `npm run build` → `[Pass]` (compiled successfully; all routes generated).

### 23.13 Credential safety

- Wikidata and Wikimedia Commons require **no credential**; only a descriptive
  `User-Agent` constant is sent (a constant, not a secret).
- No credential value was read, printed, logged, or copied during this pass.
- The snapshot contains no `token`, `secret`, or `key` fields.
- The snapshot file is **not** client-served: a direct request to
  `/lib/api/data/artist-album-counts.snapshot.json` returns HTTP 404.
- No client-side request to any provider host was observed.

### 23.14 Files changed in this pass

See the table in Section 23.1. The live MusicBrainz browse logic and the curated
artist MBID pool were not changed; MusicBrainz pacing was not weakened. No
other category was modified. A temporary measurement script
(`.tmp-wikidata-measure.mjs`) was removed after use.

### 23.15 Remaining `Needs Verification` (this pass)

- `Needs Verification [product-decision]`: the snapshot is a point-in-time
  artifact. It must be regenerated (`npm run snapshot:artist-album-counts`) when
  the curated artist pool changes or when fresher data is desired. Whether to
  schedule periodic regeneration is a product/ops call; no scheduler was added
  (the task explicitly forbids cron/queues/workers).
- `Needs Verification [data-quality]`: the curated pool is **17 artists** with
  **16 distinct values** (one tie). This is a small pool; gameplay depth should
  be revisited if it proves insufficient.
- `Needs Verification [product-decision]`: **Commons per-image attribution** is
  now surfaced via the optional `GameItem.attribution` credit line. Whether this
  presentation satisfies the project's legal/UX expectations is a product call.
- `Needs Verification [product-decision]`: root metadata wording in
  [`app/layout.tsx`](app/layout.tsx:13) — left unchanged (see Section 12).

---

## 24. Final Provider-Milestone Verification Pass (2026-10-13)

This section records the ninth and final verification pass. It is a
**verification-only** pass: no category was implemented, no deferred category
was touched, no provider adapter was modified, and no availability record was
changed. Statuses use the project vocabulary: `[Pass]`, `[Partial]`, `[Fail]`,
`[Blocked]`, `[Not tested]`.

**Environment:** production build (`npm run build` then `npm run start`) at
`http://localhost:3000` (Next.js 16.3.4). `.env.local` present (variable
**names** only; values never read into this document, logs, or handoffs). No
credential value was printed, logged, copied, or exposed.

### 24.1 Promoted-category playability and consistency

All nine promoted categories were exercised through the dispatcher
(`GET /api/test-fetch?category=<provider-key>`) against the production build:

| Category | Provider key | HTTP | Items | Availability record |
| --- | --- | --- | --- | --- |
| `movie-series-rating` | `movie-ratings` | 200 | 81 | `productionPlayable: true` |
| `game-rating` | `game-ratings` | 200 | 99 | `productionPlayable: true` |
| `player-count` | `game-playerbase` | 200 | 97 | `productionPlayable: true` |
| `release-date` | `release-dates` | 200 | 197 | `productionPlayable: true` |
| `gross-revenue` | `movie-gross-revenue` | 200 | 67 | `productionPlayable: true` |
| `number-of-albums` | `artist-album-counts` | 200 | 17 | `productionPlayable: true` |
| `album-release-date` | `album-release-dates` | 200 | 120 | `productionPlayable: true` |
| `youtube-subscribers` | `youtube-subscribers` | 200 | 13 | `productionPlayable: true` |
| `game-release-date` | `game-release-dates` | 200 | 100 | `productionPlayable: true` |

Every promoted category's [`CATEGORY_AVAILABILITY`](lib/catalog/availability.ts:121)
record has `productionPlayable: true` with `satisfiedGates(...)`, matching its
actual playability. The consistency guard
([`assertAvailabilityConsistency()`](lib/catalog/availability.ts:284)) passes:
the Home page (`GET /`) renders HTTP 200, which requires the guard to have run
without throwing. `[Pass]`.

The two deferred categories remain non-playable and unchanged:
`monthly-listeners` and `twitch-followers` are `productionPlayable: false` +
`unverifiedGates(...)` ([`availability.ts`](lib/catalog/availability.ts:197),
[`availability.ts`](lib/catalog/availability.ts:214)). Both render the
"CATEGORY UNAVAILABLE" state in the browser. `[Pass]`.

### 24.2 Commons attribution handling (`number-of-albums`)

| Check | Result | Evidence |
| --- | --- | --- |
| Creator/license rendering | `[Pass]` | In-browser credit lines render as `Image: <creator> · <license> · <licenseUrl>` (e.g. Madonna: `Image: chrisweger · CC BY-SA 2.0 · https://creativecommons.org/licenses/by-sa/2.0`; Radiohead: `Image: Raph_PH · CC BY 4.0 · https://creativecommons.org/licenses/by/4.0`). |
| Source/license URL preservation | `[Pass]` | The license URL is preserved verbatim in the credit line (e.g. `https://creativecommons.org/licenses/by-sa/2.0`). |
| PD/CC0 no unnecessary attribution | `[Pass]` | 7/17 snapshot items carry no `attribution` (Queen, Metallica, Led Zeppelin, Pink Floyd, The Beatles, Eminem, Michael Jackson) — all PD/CC0. 10/17 carry a credit line (CC BY / CC BY-SA). Matches Section 23.3/23.7. |
| Attribution optional / non-breaking | `[Pass]` | `attribution?: string` is optional on [`GameItem`](types/api.ts:23); [`GameCard.tsx`](components/game/GameCard.tsx:109) renders the credit line only when present. `album-release-date` (0/120) and `player-count` (0/97) render no credit line and are unaffected. |
| Layout at common viewports | `[Pass]` | No horizontal overflow at 375×812 (mobile) or 1440×900 (desktop); credit lines wrap within the card (`scrollWidth === clientWidth`). Mobile screenshot confirms the credit line sits below the value without breaking the card. |

### 24.3 Snapshot presence, validity, tracking, and secret scan

| Check | Result | Evidence |
| --- | --- | --- |
| Presence | `[Pass]` | Both files exist: [`album-release-date.snapshot.json`](lib/api/data/album-release-date.snapshot.json:1) (38,023 bytes) and [`artist-album-counts.snapshot.json`](lib/api/data/artist-album-counts.snapshot.json:1) (5,745 bytes). |
| Validity | `[Pass]` | Both parse as valid JSON, `version: 1`. `album-release-date`: 120 items, 120 unique ids, 101 unique dates, 0 empty `imageUrl`. `artist-album-counts`: 17 items, 16 distinct values, 0 empty `imageUrl`, 10 with attribution. |
| Secret scan | `[Pass]` | `findstr` for `AIza`, `secret`, `token`, `api_key`, `apikey`, `password`, `client_secret`, `Bearer` across both snapshots returned **no matches**. No credential or private value present. |
| Git tracking | `[Partial]` | **Finding:** `lib/api/data/` is **untracked** (`git status --porcelain` → `?? lib/api/data/`) and is **not** git-ignored (`git check-ignore` returns no match). The snapshots are present on disk and not ignored, but they have **not been committed**. The Section 21.2/23.1 "Created" rows describe file creation, not git tracking. `TODO:` `git add lib/api/data/*.snapshot.json` so the snapshots are tracked as intended. |

### 24.4 Dev-only `?full=1` route production guard

Source read-back: [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:67)
returns HTTP 404 when `process.env.NODE_ENV === "production"` and `?full=1` is
set, before any live adapter runs.

Exercised against the **production build** (`npm run start`):

| Request | Result |
| --- | --- |
| `GET /api/test-fetch?category=album-release-dates&full=1` | **HTTP 404** (guard active) |
| `GET /api/test-fetch?category=artist-album-counts&full=1` | **HTTP 404** (guard active) |
| `GET /api/test-fetch?category=album-release-dates` | HTTP 200 (snapshot-backed gameplay path) |
| `GET /api/test-fetch?category=artist-album-counts` | HTTP 200 (snapshot-backed gameplay path) |

`[Pass]` — the live-generation route is unavailable under production
conditions; the snapshot-backed gameplay path is unaffected.

### 24.5 Repository checks (this pass)

- `npx tsc --noEmit` → `[Pass]` (exit 0).
- `npm run lint` → `[Pass]` (0 errors; the same 2 pre-existing warnings:
  unused eslint-disable in `TimeAttackGame.tsx`, unused `WorldBankMeta` in
  `worldbank.ts`).
- `npm run build` → `[Pass]` (compiled successfully; all routes generated).

### 24.6 Browser smoke test (Playwright MCP)

**MCP status:** Playwright MCP was **available** in this pass (it was
"Not connected" on the first attempt and connected on retry).

| Check | Result | Evidence |
| --- | --- | --- |
| Home page `GET /` | `[Pass]` | HTTP 200; "4 domains, 11 categories"; Music domain shows "3 available categories". |
| Category selection + Go enablement | `[Pass]` | Music → Number of Albums + Classic enabled the Go button. |
| Classic gameplay — `number-of-albums` | `[Pass]` | "Number of Albums · Classic"; current "Queen" (267 albums) with artist image; next "Eminem" with image. |
| Higher/Lower progression | `[Pass]` | Clicking Higher revealed Eminem (158 albums) and advanced to the game-over dialog. |
| Attribution rendering | `[Pass]` | Madonna and Radiohead cards rendered `Image: <creator> · <license> · <licenseUrl>` credit lines. |
| Classic gameplay — `album-release-date` | `[Pass]` | "Album Release Date · Classic"; "Unlimited Love" (2022-04-01) with archive.org image; next "Nevermind". |
| Classic gameplay — `player-count` | `[Pass]` | "Peak Concurrent Players · Classic"; "SMITE" (1.9K peak players) with Steam CDN image. |
| Deferred fail-closed — `monthly-listeners` / `twitch-followers` | `[Pass]` | Both render "CATEGORY UNAVAILABLE". |
| Console errors | `[Pass]` | 0 console errors and 0 warnings across all navigations. |
| Network / credential exposure | `[Pass]` | Client network log shows only localhost assets and image CDNs (`cdn.akamai.steamstatic.com`, `commons.wikimedia.org` → `upload.wikimedia.org`, `archive.org`). **No** client-side request to `googleapis.com`, `igdb.com`, `twitch.tv`, `query.wikidata.org`, or `musicbrainz.org`. |

### 24.7 Files changed in this pass

- [`docs/higher-lower-category-provider-plan.md`](docs/higher-lower-category-provider-plan.md:1)
  — added this Section 24.

No application code was changed. No provider adapter was modified. No
availability record was changed. No deferred category was implemented. No
credential value was printed, logged, copied, or exposed.

### 24.8 Remaining `Needs Verification` (this pass)

- `Needs Verification [environment-specific]`: the snapshots are untracked in
  git (`lib/api/data/`). They are present and not ignored, but must be
  `git add`-ed to be tracked as intended. This is a repository-hygiene action,
  not a code change.
- `Needs Verification [product-decision]`: the snapshot is a point-in-time
  artifact; regeneration cadence remains a product/ops call (unchanged from
  Sections 21.15 and 23.15).
- `Needs Verification [product-decision]`: root metadata wording in
  [`app/layout.tsx`](app/layout.tsx:13) — left unchanged (see Section 12).
