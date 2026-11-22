# Catalog Pool and Repeat Behavior — Analysis

> **Status:** Analysis only. No implementation. No application code changed.
> **Date:** 2026-10-14
> **Scope:** Catalog architecture (curated pools vs. provider-driven discovery),
> catalog-size/readiness expectations, and Classic/Time Attack repeat behavior.
> **Authority:** This is an analysis document. It does not authorize code
> changes, category-availability changes, or curated-list expansion. The
> subsequent plan phase is separate and not created here.
> **Location rationale:** Placed in `docs/` alongside the existing
> implementation plan ([`docs/higher-lower-category-provider-plan.md`](docs/higher-lower-category-provider-plan.md:1))
> and handoff ([`docs/handoff-signoff.md`](docs/handoff-signoff.md:1)), which is
> the repository's established location for durable planning/analysis
> documents. Root-level `*-plan.md` files exist but are historical redesign
> artifacts; `docs/` is the current convention for provider/catalog work.

Every repository-derived claim below carries a `file:line` reference. Every
claim is labelled **Confirmed**, **Inferred**, **Needs Verification**, or
**Product Decision**. Provider capability claims were checked against
authoritative provider documentation (Google YouTube Data API quota docs and
search reference; MusicBrainz API, Search, and Rate Limiting docs) via Exa and
Context7 on 2026-10-14.

---

## 1. Executive summary

The current catalog is a **fail-closed pipeline** in which a category becomes
playable only when semantic identity, availability gates, provider mapping,
route authorization, dispatcher registration, and a ≥ 2-item normalized pool
all hold ([`lib/api/index.ts`](lib/api/index.ts:73),
[`lib/catalog/availability.ts`](lib/catalog/availability.ts:121)). Two
categories are small because their **identity pools are manually curated**:
`youtube-subscribers` (13 channels,
[`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:58)) and
`number-of-albums` (17 artists,
[`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:34)). All other playable
categories derive their pools from provider list endpoints with fixed page
counts or limits ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:65),
[`lib/api/igdb.ts`](lib/api/igdb.ts:45),
[`lib/api/steamspy.ts`](lib/api/steamspy.ts:43),
[`lib/api/steamspy_ratings.ts`](lib/api/steamspy_ratings.ts:37)).

**Recommended architecture (Confirmed as the direction, not yet implemented):**
treat curated pools as **bootstrap/seed data**, not the long-term design. The
target pipeline is:

```
external provider / discovery source
  -> candidate discovery
  -> validation / filtering
  -> normalized playable catalog (GameItem[])
  -> snapshot where provider latency or quota requires it
  -> runtime gameplay
```

Discovery is practical for **YouTube** (`search.list` with `type=channel`,
`order=videoCount`, paginated) and **MusicBrainz** (`artist` search with
`type:group` + `tag`/`country` filters, paginated; browse supports paging).
Both are constrained by provider etiquette (YouTube `search.list` has a
separate 100-calls/day bucket; MusicBrainz is 1 request/second). Where
discovery is weak or the metric is latency-bound, a **developer-run generated
snapshot** remains the right tool — the pattern already proven for
`number-of-albums` and `album-release-date`
([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:1),
[`lib/api/albumReleaseDateSnapshot.ts`](lib/api/albumReleaseDateSnapshot.ts:1)).

**Repeat behavior:** the current `spent` refill mechanism
([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:165),
[`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:248))
recycles consumed items and only prevents *adjacent equal values*
([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:71)). It
does **not** prevent an item ID from reappearing. The simplest correct rule is
a **remaining-pool model** (a `seenIds` set that excludes already-shown items
until the pool is exhausted), which is clearer than the current
spent-reshuffle and removes premature repetition.

**Owner decisions required before planning:** (a) whether curated pools become
seed-only with provider discovery, or stay curated; (b) the production-ready
catalog-size target and its exceptions; (c) whether YouTube becomes
snapshot-backed or stays live; (d) whether the duplicated deck logic is
extracted into a shared utility or patched in place.

> **Resolved (2026-10-14):** all four decisions above, plus the remaining open
> items, are now **APPROVED** by the owner and recorded in
> [Section 16](#16-owner-decisions-and-pre-plan-feasibility-verification).
> A live diagnostic feasibility pass confirmed both YouTube and MusicBrainz
> provider-driven discovery are viable. See Section 16 for the decisions,
> evidence, and realistic pool-size ranges.

---

## 2. Current-state architecture

### 2.1 Dispatcher and normalization

- **Confirmed:** [`fetchGameItems()`](lib/api/index.ts:73) calls
  [`fetchGameItemsRaw()`](lib/api/index.ts:91) then Fisher-Yates shuffles
  ([`lib/api/index.ts`](lib/api/index.ts:166)).
- **Confirmed:** [`fetchGameItemsRaw()`](lib/api/index.ts:91) resolves the
  fetcher from [`FETCHER_MAP`](lib/api/index.ts:39), filters items missing
  `name` or `imageUrl` ([`lib/api/index.ts`](lib/api/index.ts:106)), and throws
  when fewer than 2 items remain ([`lib/api/index.ts`](lib/api/index.ts:110)).
- **Confirmed:** the technical minimum is therefore **2 items**
  ([`lib/api/index.ts`](lib/api/index.ts:110)).
- **Confirmed:** `GameItem` requires `id`, `name`, `imageUrl` (absolute,
  required), `value`, `displayValue` (per the provider plan's normalized
  contract, [`docs/higher-lower-category-provider-plan.md`](docs/higher-lower-category-provider-plan.md:55)).

### 2.2 Provider adapters and their pool sizes

| Category | Provider key | Pool source | Fixed bound | Evidence |
| --- | --- | --- | --- | --- |
| Movie/Series Rating | `movie-ratings` | TMDB popular list | `PAGES_TO_FETCH = 5` (~100) | [`lib/api/tmdb.ts`](lib/api/tmdb.ts:65) |
| Release Date | `release-dates` | TMDB movie + TV popular | `PAGES_TO_FETCH = 5` | [`lib/api/tmdb.ts`](lib/api/tmdb.ts:65) |
| Gross Revenue | `movie-gross-revenue` | TMDB movie detail batches | `DETAIL_BATCH_SIZE = 10` | [`lib/api/tmdb.ts`](lib/api/tmdb.ts:67) |
| Game Rating | `game-ratings` | SteamSpy `top100forever` | endpoint-fixed 100 | [`lib/api/steamspy_ratings.ts`](lib/api/steamspy_ratings.ts:37) |
| Peak Concurrent Players | `game-playerbase` | SteamSpy `top100in2weeks` | endpoint-fixed 100 | [`lib/api/steamspy.ts`](lib/api/steamspy.ts:43) |
| Game Release Date | `game-release-dates` | IGDB games query | `GAME_LIMIT = 100` | [`lib/api/igdb.ts`](lib/api/igdb.ts:45) |
| Number of Albums | `artist-album-counts` | **Snapshot** (MusicBrainz + Wikidata) | curated 17 artists | [`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:34), [`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:66) |
| Album Release Date | `album-release-dates` | **Snapshot** (MusicBrainz + CAA) | curated 17 artists, `MAX_ALBUM_ITEMS = 120` | [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:77), [`lib/api/albumReleaseDateSnapshot.ts`](lib/api/albumReleaseDateSnapshot.ts:65) |
| YouTube Subscribers | `youtube-subscribers` | **Curated 13 channel IDs** | `ID_BATCH_SIZE = 50` | [`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:58), [`lib/api/youtube.ts`](lib/api/youtube.ts:52) |

- **Confirmed:** `youtube-subscribers` iterates `CURATED_CHANNELS` and batches
  IDs at 50 per `channels.list` call ([`lib/api/youtube.ts`](lib/api/youtube.ts:68),
  [`lib/api/youtube.ts`](lib/api/youtube.ts:73)).
- **Confirmed:** `number-of-albums` and `album-release-date` read pre-generated
  snapshots at runtime; the live adapters are preserved for regeneration
  ([`lib/api/index.ts`](lib/api/index.ts:50), [`lib/api/index.ts`](lib/api/index.ts:54)).
- **Confirmed:** the snapshot generators are developer-run Node scripts invoked
  via npm ([`package.json`](package.json:10), [`package.json`](package.json:11))
  that call the dev-only diagnostic route in `full=1` mode
  ([`scripts/generate-artist-album-counts-snapshot.mjs`](scripts/generate-artist-album-counts-snapshot.mjs:15),
  [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:65)).

### 2.3 Availability and semantic catalog

- **Confirmed:** `CATEGORY_AVAILABILITY` marks nine categories
  `productionPlayable: true` ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:121)),
  with `monthly-listeners` and `twitch-followers` `intentionally-hidden`
  ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:197),
  [`lib/catalog/availability.ts`](lib/catalog/availability.ts:214)).
- **Confirmed:** the semantic catalog defines 11 category identities
  ([`lib/catalog/semanticCatalog.ts`](lib/catalog/semanticCatalog.ts:6)).

### 2.4 Deck / repeat behavior

- **Confirmed:** Classic keeps `deck` (unshown queue) and `spent` (consumed
  items) ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:111)).
  On a correct guess it consumes `deck[0]`; when fewer than 2 items remain it
  reshuffles `spent` and appends it ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:169)).
- **Confirmed:** Time Attack uses the identical deck/spent/refill structure
  ([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:110),
  [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:254)).
- **Confirmed:** `dedupeAdjacentEquals()` only prevents *adjacent equal values*,
  not item-ID reappearance ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:71),
  [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:68)).
- **Confirmed:** there is no persistent full-round `seenIds` mechanism; the
  `spent` array is the only memory of consumed items and is cleared on refill
  ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:174)).
- **Confirmed:** the deck helpers (`shuffle`, `dedupeAdjacentEquals`,
  `buildDeck`, `shuffleDeck`) are **duplicated verbatim** in both components
  ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:55),
  [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:59)).

---

## 3. Root causes

1. **Confirmed — identity pools are manually curated for two categories.**
   `youtube-subscribers` (13) and `number-of-albums` (17) are small because
   their *identity* lists are hand-maintained
   ([`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:34),
   [`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:58)). The *values* are
   fetched from providers; only the identities are limited.
2. **Confirmed — provider latency forces snapshots for MusicBrainz-derived
   categories.** The MusicBrainz 1-request/second contract makes a request-time
   crawl ~100 s ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:8),
   [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:65)). Snapshots are the
   established mitigation.
3. **Confirmed — fixed page/limit bounds cap the larger categories.** TMDB
   fetches 5 pages ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:65)); IGDB queries 100
   games ([`lib/api/igdb.ts`](lib/api/igdb.ts:45)); SteamSpy uses fixed
   `top100*` endpoints ([`lib/api/steamspy.ts`](lib/api/steamspy.ts:43)).
   These are deliberate bounds, not provider ceilings.
4. **Confirmed — repeat behavior recycles items.** The `spent` refill
   ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:169))
   makes an item eligible again as soon as the pool is exhausted, and
   `dedupeAdjacentEquals()` does not track IDs
   ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:71)).
   In a 13-item pool this is highly visible.
5. **Confirmed — deck logic is duplicated.** Two copies of the same helpers and
   refill logic ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:55),
   [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:59))
   mean any repeat-behavior fix must be applied twice.

---

## 4. Category-by-category classification

Classification vocabulary: **live API-driven**, **pagination/target-count**,
**developer-generated snapshot**, **provider-driven discovery**, **curated
seed**, **provider-limited**.

| Category | Current | Recommended direction | Label |
| --- | --- | --- | --- |
| YouTube Subscribers | Curated 13 IDs, live `channels.list` | Provider-driven discovery (`search.list` `type=channel`) to build a larger candidate pool; keep `channels.list` for values; consider snapshot if quota-bound | **Confirmed** current; **Inferred** direction |
| Number of Albums | Snapshot, curated 17 artists | Provider-driven discovery (MusicBrainz `artist` search) to expand the seed pool; keep snapshot for runtime | **Confirmed** current; **Inferred** direction |
| Album Release Date | Snapshot, curated 17 artists | Keep snapshot; discovery can expand the artist seed pool | **Confirmed** |
| Movie & Series Rating | Live TMDB, 5 pages | Live API-driven; optionally raise page count toward a target | **Confirmed** |
| Release Date | Live TMDB, 5 pages | Live API-driven; optionally raise page count | **Confirmed** |
| Gross Revenue | Live TMDB detail batches | Live API-driven; bounded by detail-call cost | **Confirmed** |
| Game Release Date | Live IGDB, limit 100 | Live API-driven; optionally raise limit | **Confirmed** |
| Game Rating | Live SteamSpy `top100forever` | Provider-limited (endpoint-fixed 100) | **Confirmed** |
| Peak Concurrent Players | Live SteamSpy `top100in2weeks` | Provider-limited (endpoint-fixed 100) | **Confirmed** |

- **Confirmed:** SteamSpy's `top100*` endpoints are fixed-size lists, so those
  two categories are **provider-limited** to ~100 candidates
  ([`lib/api/steamspy.ts`](lib/api/steamspy.ts:43),
  [`lib/api/steamspy_ratings.ts`](lib/api/steamspy_ratings.ts:37)).
- **Inferred:** TMDB and IGDB bounds are application-chosen, not provider
  ceilings, so those categories can grow by raising the bound
  ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:65), [`lib/api/igdb.ts`](lib/api/igdb.ts:45)).
- **Resolved (2026-10-14):** `monthly-listeners` and `twitch-followers`
  (currently `intentionally-hidden`,
  [`lib/catalog/availability.ts`](lib/catalog/availability.ts:197),
  [`lib/catalog/availability.ts`](lib/catalog/availability.ts:214)) are **out of
  scope** for this catalog/repeat work (Section 16.1 item 11).

---

## 5. API-driven discovery feasibility

### 5.1 YouTube Data API — discovery is practical but quota-bounded

- **Confirmed (provider docs):** `search.list` supports `type=channel`,
  `order=videoCount`, `maxResults` (0–50), and `pageToken` pagination
  (Google YouTube Data API search reference, retrieved 2026-10-14).
- **Confirmed (provider docs):** `search.list` has its **own quota bucket of
  100 calls/day**, cost 1 per call, separate from the 10,000-unit/day general
  bucket; `channels.list` costs **1 unit** from the general bucket (Google
  YouTube Data API quota calculator, retrieved 2026-10-14).
- **Confirmed (repo):** the current adapter already batches `channels.list` at
  50 IDs per call ([`lib/api/youtube.ts`](lib/api/youtube.ts:52)).
- **Inferred:** a discovery pass using `search.list` (e.g. a handful of
  category queries, each paginated a few pages) can yield a candidate channel
  pool well above 13, then `channels.list` resolves subscriber counts in
  batches of 50. The 100-calls/day `search.list` bucket is the binding
  constraint, so discovery should be a **developer-run generation step**, not a
  request-time call.
- **Needs Verification:** whether `search.list` `type=channel` results reliably
  include channels with **public** (non-hidden) subscriber counts. The adapter
  already drops hidden counts ([`lib/api/youtube.ts`](lib/api/youtube.ts:96)),
  so a discovery pass may need to over-fetch candidates and filter.
- **Resolved (2026-10-14):** YouTube stays **live** via `channels.list`;
  discovery is developer-run and the seed is not manually grown (Section 16.1
  item 3). Live diagnostic confirmed 250/250 valid candidates (Section 16.2.1).

### 5.2 MusicBrainz — discovery is practical but rate-limited

- **Confirmed (provider docs):** the `artist` search index supports `type`
  (e.g. `group`), `tag`, `country`, and `arid` fields, with `limit` up to 100
  and `offset` paging (MusicBrainz Search docs, retrieved 2026-10-14).
- **Confirmed (provider docs):** browse requests are the only requests that
  support paging; `limit` default 25, max 100 (MusicBrainz API docs, retrieved
  2026-10-14).
- **Confirmed (provider docs):** the rate limit is **1 request/second per IP**,
  and a descriptive `User-Agent` is required; exceeding the rate returns 503
  (MusicBrainz Rate Limiting docs, retrieved 2026-10-14).
- **Confirmed (repo):** the adapter already serializes MusicBrainz calls at
  ≥ 1.1 s spacing and sets a `User-Agent`
  ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:65),
  [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:56)).
- **Inferred:** a discovery pass can search artists by `type:group` + `tag`
  (e.g. genre tags) to build a candidate MBID pool far larger than 17, then
  reuse the existing browse + Wikidata image resolution. Because of the 1 req/s
  limit, this must be a **developer-run generation step** feeding the snapshot,
  not a request-time call.
- **Needs Verification:** the practical yield of tag-based artist search for
  artists that (a) have a resolvable Wikidata `P18` image and (b) have a
  substantial album catalogue. The current pool was hand-picked for exactly
  these properties ([`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:31)).

### 5.3 Where discovery is weak or unnecessary

- **Confirmed:** SteamSpy exposes only fixed `top100*` lists, so discovery is
  not available there ([`lib/api/steamspy.ts`](lib/api/steamspy.ts:43)).
- **Confirmed:** TMDB and IGDB already return large candidate sets; the
  constraint is the application's own page/limit bound, not discovery
  ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:65), [`lib/api/igdb.ts`](lib/api/igdb.ts:45)).
- **Inferred:** for TMDB/IGDB, "discovery" is simply raising the bound or
  paging further; no new provider capability is required.

---

## 6. Snapshot strategy

- **Confirmed:** the established pattern is a plain JSON file under
  `lib/api/data/` with `version`, `generatedAt`, `source`, and `items`, read
  server-side and validated fail-closed
  ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:40),
  [`lib/api/albumReleaseDateSnapshot.ts`](lib/api/albumReleaseDateSnapshot.ts:39)).
- **Confirmed:** snapshots store only public, gameplay-safe `GameItem` fields;
  no credentials or diagnostics
  ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:16)).
- **Confirmed:** generation is a developer-run npm script that calls the
  dev-only `full=1` route, which is disabled in production
  ([`package.json`](package.json:10), [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:67)).
- **Confirmed:** the live adapters remain the authoritative source and are
  preserved for regeneration ([`lib/api/index.ts`](lib/api/index.ts:46)).

**When snapshots are appropriate (Inferred, grounded in the above):**

- The metric is **latency-bound** by provider etiquette (MusicBrainz 1 req/s).
- The metric is **quota-bound** and discovery would otherwise consume a scarce
  bucket (YouTube `search.list` 100/day).
- The metric is **stable** enough that a periodic regeneration is acceptable
  (album counts, release dates).

**When snapshots are not appropriate (Inferred):**

- The metric changes frequently and freshness matters (SteamSpy CCU is a
  previous-day peak, [`lib/api/steamspy.ts`](lib/api/steamspy.ts:11)); a
  snapshot would freeze a volatile metric.
- The provider is fast and cheap enough for request-time fetching (TMDB, IGDB).

**Freshness by metric (Inferred):**

| Metric | Volatility | Snapshot fit |
| --- | --- | --- |
| Album counts | Low | Good |
| Album release dates | None (historical) | Good |
| YouTube subscribers | Medium | Acceptable with a stated `generatedAt` |
| SteamSpy CCU | High (daily) | Poor — keep live |
| TMDB ratings/revenue | Low–medium | Keep live (already cached) |
| IGDB release dates | None (historical) | Keep live (already cached) |

- **Confirmed:** generated catalog files are currently committed under
  `lib/api/data/` ([`lib/api/data/artist-album-counts.snapshot.json`](lib/api/data/artist-album-counts.snapshot.json:1),
  [`lib/api/data/album-release-date.snapshot.json`](lib/api/data/album-release-date.snapshot.json:1)).
- **Resolved (2026-10-14):** YouTube should remain **live** via
  `channels.list`; discovery is developer-run and subscriber values stay live
  where quota/runtime measurements show it remains cheap and reliable
  (Section 16.1 item 3). This was the single largest snapshot decision in this
  analysis.

---

## 7. Recommended catalog-size/readiness model

The engine's technical minimum is **2 items**
([`lib/api/index.ts`](lib/api/index.ts:110)), which is insufficient for
replayability. Recommend a **three-tier readiness model** as a *documentation
and review* concept, not a hard runtime gate:

| Tier | Size | Meaning | Label |
| --- | --- | --- | --- |
| Technical minimum | ≥ 2 | Engine can start; not shippable | **Confirmed** ([`lib/api/index.ts`](lib/api/index.ts:110)) |
| Limited / playable | ≥ 10 | Playable but repetition is noticeable | **Inferred** |
| Production-ready target | ≥ 50 | Enough depth that a normal session rarely repeats | **Approved** (minimum, not a cap — Section 16.1 item 2) |

- **Inferred:** ~50 valid items is a reasonable production-ready target for
  normal categories because a Classic run and a 60-second Time Attack session
  both consume a modest number of cards, and 50 gives comfortable headroom
  before any repeat. This is a *justified heuristic*, not a provider fact.
- **Confirmed exceptions:** SteamSpy categories are provider-limited to ~100
  candidates ([`lib/api/steamspy.ts`](lib/api/steamspy.ts:43)), which already
  exceeds 50. MusicBrainz-derived categories are bounded by the curated seed
  and the 1 req/s generation cost ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:65)).
- **Confirmed:** current sizes are 13 (YouTube) and 17 (albums) — both below
  the proposed 50 target ([`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:34),
  [`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:58)).
- **Resolved (2026-10-14):** ~50 is the accepted **minimum readiness target**,
  not a cap. Categories are not normalized to the same size; final pool size is
  provider-specific, and larger validated pools are retained (Section 16.1
  item 2). SteamSpy's ~100-item endpoint is an accepted provider-specific
  constraint.

---

## 8. Classic repeat-behavior recommendation

**Current (Confirmed):** `deck` + `spent`; on exhaustion, `spent` is reshuffled
and appended ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:169)).
`dedupeAdjacentEquals()` prevents only adjacent equal values
([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:71)).

**Recommended rule (Inferred):** an item should remain unavailable until every
other item in the current pool has been seen. Concretely, a **remaining-pool
model**:

- Maintain a `remaining` queue and a `seenIds` set.
- Draw `current` and `next` from `remaining`; on advance, move `current` into
  `seenIds`.
- When `remaining` has fewer than 2 items, **reset** `seenIds` and refill
  `remaining` from the full pool (excluding the currently displayed item to
  avoid an immediate repeat).

**When the full pool is exhausted (Inferred):** reset the cycle. This is the
simplest correct behavior and matches the "no premature repetition" goal
without inventing a scoring or weighting scheme.

- **Confirmed:** the current mechanism already resets `spent` on refill
  ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:174)),
  so the reset semantics are not new — only the *tracking* changes from
  "adjacent value" to "item ID".
- **Resolved (2026-10-14):** Classic **begins a new shuffled cycle** on
  exhaustion; it does not end solely because the pool was completed. The
  currently displayed item must not immediately reappear at the cycle boundary
  (Section 16.1 item 8).

---

## 9. Time Attack repeat-behavior recommendation

**Current (Confirmed):** identical deck/spent/refill structure to Classic
([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:254)).

**Recommended rule (Inferred):** an item should simply **never repeat during
the current timed session**. A 60-second session
([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:40))
with an 800 ms correct-reveal ([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:43))
consumes far fewer than 50 cards, so a full-round refill is **not necessary**
during a normal session.

- **Inferred:** a `seenIds` set that excludes already-shown items for the
  duration of the session is sufficient; the refill path becomes a rare
  fallback rather than a routine event.
- **Confirmed:** the current refill triggers whenever fewer than 2 items remain
  ([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:254)),
  which in a 13-item pool can occur within a single session.
- **Resolved (2026-10-14):** Time Attack **ends the run/session cleanly** if the
  pool is genuinely exhausted before the timer expires; it does not recycle
  already-seen items (Section 16.1 item 9).

---

## 10. Minimal-refactor recommendation

- **Confirmed:** the deck helpers and refill logic are duplicated verbatim
  ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:55),
  [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:59)).
- **Inferred:** because the repeat-behavior fix must change the same logic in
  both components, extracting a **small shared deck utility** (e.g.
  `lib/game/deck.ts` exporting `shuffle`, `dedupeAdjacentEquals`, `buildDeck`,
  and a remaining-pool helper) meaningfully reduces the risk of the two copies
  diverging. This is a *targeted* extraction, not an architectural refactor.
- **Inferred:** if the owner prefers the smallest possible patch, the fix can be
  applied in place in both files; the duplication is a maintenance risk, not a
  correctness bug today.
- **Resolved (2026-10-14):** **extract** a small shared deck utility
  (`lib/game/deck.ts`), narrowly scoped to shuffle/build, adjacent equal-value
  avoidance, remaining/seen pool handling, and safe cycle/session exhaustion
  handling. Not a generic game-engine framework (Section 16.1 item 10).

---

## 11. Provider/security constraints

- **Confirmed:** provider adapters run server-side; private env values
  (`YOUTUBE_API_KEY`, `TMDB_API_KEY`, `TWITCH_CLIENT_ID`,
  `TWITCH_CLIENT_SECRET`) are read via `process.env` with no `NEXT_PUBLIC_`
  prefix ([`lib/api/youtube.ts`](lib/api/youtube.ts:59),
  [`lib/api/tmdb.ts`](lib/api/tmdb.ts:74), [`lib/api/igdb.ts`](lib/api/igdb.ts:61)).
- **Confirmed:** snapshots store only public `GameItem` fields and are
  server-only ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:16),
  [`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:25)).
- **Confirmed:** the dev-only `full=1` route is disabled in production
  ([`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:67)).
- **Confirmed (provider docs):** MusicBrainz requires a descriptive
  `User-Agent` and ≤ 1 request/second; the adapter already complies
  ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:56),
  [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:65)).
- **Confirmed (provider docs):** YouTube `search.list` is limited to 100
  calls/day in its own bucket; `channels.list` costs 1 unit from the 10,000/day
  general bucket.
- **Inferred:** no new infrastructure (database, queue, cron, Redis, workers,
  admin UI) is required. Developer-run generation scripts are sufficient for
  this school project.
- **Confirmed:** no scraping-based dependency exists today; none should be
  introduced without explicit approval.

---

## 12. Alternatives considered and rejected

| Alternative | Why rejected | Label |
| --- | --- | --- |
| Manually expand curated lists to 50–100 IDs | Reintroduces the exact maintenance burden this analysis targets; brittle and unverifiable at scale | **Inferred** |
| Request-time provider discovery during gameplay | Violates provider etiquette (MusicBrainz 1 req/s; YouTube `search.list` 100/day) and adds latency | **Confirmed** (provider docs) |
| Database / persistent catalog store | Out of project boundaries; no database exists and none is needed | **Confirmed** ([`docs/higher-lower-category-provider-plan.md`](docs/higher-lower-category-provider-plan.md:1)) |
| Cron / queue / worker for snapshot refresh | Overengineered for a school project; developer-run scripts already work | **Inferred** |
| Scraping provider pages for discovery | Not approved; brittle and against provider terms | **Confirmed** (policy) |
| Snapshot for SteamSpy CCU | Metric is a volatile previous-day peak; a snapshot would freeze it | **Confirmed** ([`lib/api/steamspy.ts`](lib/api/steamspy.ts:11)) |
| Weighted/random repeat suppression | More complex than a remaining-pool model for no clear benefit | **Inferred** |

---

## 13. Open product decisions

> **Resolved (2026-10-14):** every decision below is now **APPROVED** by the
> owner and recorded in
> [Section 16.1](#161-approved-owner-decisions). The list is retained for
> traceability; it is no longer open.

1. **Curated pools: seed-only or permanent?** Should `CURATED_CHANNELS` and
   `CURATED_ARTISTS` become bootstrap seed data that provider discovery
   expands, or remain the authoritative identity lists?
   ([`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:34),
   [`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:58))
   → **Resolved: seed-only** (Section 16.1 item 1).
2. **Production-ready catalog size.** Is ~50 valid items the accepted target,
   and which categories are granted exceptions?
   → **Resolved: ~50 is a minimum readiness target, not a cap** (Section 16.1
   item 2).
3. **YouTube: live or snapshot?** Keep live `channels.list` with a larger seed,
   or generate a snapshot via `search.list` discovery?
   → **Resolved: live `channels.list` preferred; discovery is developer-run**
   (Section 16.1 item 3).
4. **Classic pool exhaustion.** Reset the cycle, or end the game?
   → **Resolved: begin a new shuffled cycle; no immediate repeat** (Section
   16.1 item 8).
5. **Time Attack pool exhaustion.** Reset, or end the session?
   → **Resolved: end the session cleanly** (Section 16.1 item 9).
6. **Deck utility extraction.** Extract a shared `lib/game/deck.ts`, or patch
   both components in place?
   → **Resolved: extract `lib/game/deck.ts`** (Section 16.1 item 10).
7. **Scope of `monthly-listeners` / `twitch-followers`.** In scope or out?
   ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:197),
   [`lib/catalog/availability.ts`](lib/catalog/availability.ts:214))
   → **Resolved: out of scope** (Section 16.1 item 11).

---

## 14. Needs Verification items

> **Resolved (2026-10-14):** the product-decision items and the two
> discovery-yield items below are now resolved by the owner decisions in
> [Section 16.1](#161-approved-owner-decisions) and the live diagnostic pass in
> [Section 16.2](#162-live-diagnostic-provider-feasibility-pass). The list is
> retained for traceability; only the environment-specific quota item remains
> open.

- **Resolved [product-decision]:** curated pools are **bootstrap-only**
  (Section 16.1 item 1).
- **Resolved [product-decision]:** the production-ready catalog size is a
  **~50 minimum, not a cap** (Section 16.1 item 2).
- **Resolved [product-decision]:** YouTube stays **live** via `channels.list`;
  discovery is developer-run (Section 16.1 item 3).
- **Resolved [product-decision]:** Classic **resets to a new cycle**; Time
  Attack **ends the session** on exhaustion (Section 16.1 items 8 and 9).
- **Resolved [product-decision]:** the duplicated deck logic is **extracted**
  into a shared utility (Section 16.1 item 10).
- **Resolved [product-decision]:** `monthly-listeners` and `twitch-followers`
  are **out of scope** (Section 16.1 item 11)
  ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:197),
  [`lib/catalog/availability.ts`](lib/catalog/availability.ts:214)).
- **Resolved:** the practical yield of YouTube `search.list` `type=channel`
  discovery for channels with **public** subscriber counts was **confirmed by a
  live call on 2026-10-14** — 250/250 candidates valid, 0 hidden
  (Section 16.2.1). The adapter's hidden-count filter
  ([`lib/api/youtube.ts`](lib/api/youtube.ts:96)) dropped none in this sample.
- **Resolved:** the practical yield of MusicBrainz tag-based artist search for
  artists with a resolvable Wikidata `P18` image and a substantial album
  catalogue was **confirmed by a live call on 2026-10-14** — 20/20 sampled
  artists usable (Section 16.2.2). The current pool was hand-picked for exactly
  these properties ([`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:31)).
- **Needs Verification [environment-specific]:** whether the YouTube
  `search.list` 100-calls/day bucket is sufficient for the intended discovery
  cadence in the owner's Google Cloud project. Quota is per-project. The
  observed 5-call sample is well within the bucket, but the project's limits
  were not independently enumerated.
- **Resolved [capability-unavailable]:** a live provider call **was** made on
  2026-10-14 for both YouTube and MusicBrainz; the earlier
  capability-unavailable note no longer applies (Section 16.2).

---

## 15. Recommended direction for the subsequent plan phase

The subsequent plan phase (not created here) should, in order:

1. **Resolve the open product decisions in Section 13** before any code change.
   These are owner calls, not technical ones.
2. **Adopt the target pipeline** (Section 1) as the architectural direction:
   provider/discovery source -> candidate discovery -> validation/filtering ->
   normalized playable catalog -> snapshot where required -> runtime gameplay.
3. **Reclassify curated pools as bootstrap seed data** (pending decision 1),
   and design a developer-run discovery + generation step for YouTube and
   MusicBrainz that reuses the existing adapters and the established snapshot
   pattern ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:1),
   [`scripts/generate-artist-album-counts-snapshot.mjs`](scripts/generate-artist-album-counts-snapshot.mjs:1)).
4. **Define the catalog-size/readiness model** (Section 7) as documentation and
   review guidance, with explicit per-category exceptions.
5. **Implement the remaining-pool repeat model** (Sections 8 and 9) for both
   modes, deciding on shared-utility extraction vs. in-place patching
   (Section 10).
6. **Preserve all security and provider-etiquette constraints** (Section 11):
   server-only secrets, no `NEXT_PUBLIC_` credentials, public-only snapshot
   fields, no new infrastructure, no scraping.

**Blockers requiring provider research before planning can finalize:**

> **Resolved (2026-10-14):** the first two blockers below were cleared by the
> live diagnostic pass in
> [Section 16.2](#162-live-diagnostic-provider-feasibility-pass). The third
> remains `Needs Verification [environment-specific]` but is not a blocker for
> planning, because the observed 5-call sample is well within the 100/day
> bucket.

- **Resolved:** the practical YouTube `search.list` discovery yield and the
  public-subscriber-count filter rate — 250/250 valid, 0 hidden
  (Section 16.2.1).
- **Resolved:** the practical MusicBrainz tag-search yield for artists with
  resolvable images and substantial catalogues — 20/20 sampled usable
  (Section 16.2.2).
- **Needs Verification [environment-specific]:** the owner's YouTube quota
  bucket headroom for the intended discovery cadence (Section 14). Not a
  planning blocker at the observed scale.

**Explicitly out of scope for this analysis (and the subsequent plan unless the
owner expands it):** `monthly-listeners`, `twitch-followers`, any database,
queue, cron, worker, admin UI, or scraping-based dependency.

---

## 16. Owner Decisions and Pre-Plan Feasibility Verification

> **Status:** Owner decisions recorded; live diagnostic feasibility pass
> performed. No production code, category availability, snapshots, or curated
> pools were modified. No final catalog was built and no final snapshot was
> generated. This section resolves the open product decisions in Section 13 and
> the corresponding `Needs Verification [product-decision]` items in Section 14
> where the owner has now decided.
> **Date:** 2026-10-14
> **Authority:** Owner-approved decisions recorded verbatim in intent. Live
> diagnostic evidence recorded with the date it was observed. Credentials were
> used server-side only and are redacted from all evidence below.

### 16.1 Approved owner decisions

The following decisions are **APPROVED** by the owner. They supersede the
corresponding open items in Sections 13 and 14.

1. **Curated pools — APPROVED.** Existing curated artist/channel lists are
   **bootstrap/seed data**, not the long-term authoritative catalog. Long-term
   direction: provider/discovery source → candidate discovery →
   validation/filtering → normalized playable catalog → generated snapshot
   where latency/quota makes it appropriate → runtime gameplay. Do **not** solve
   catalog growth by manually hardcoding 50–100+ IDs into application source.
   Curated seeds may remain for bootstrap/fallback, deterministic testing,
   provider verification, and categories where legitimate discovery is
   genuinely weak — but must **not** artificially cap a category if legitimate
   provider-driven discovery can produce a larger validated pool.
   ([`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:34),
   [`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:58))

2. **Catalog-size/readiness policy — APPROVED WITH CLARIFICATION.** ~50 valid
   playable items is the default **MINIMUM production-readiness target** for a
   normal category. It is **NOT** a target final size, **NOT** a hard cap, and
   **NOT** a reason to truncate a larger valid provider-backed catalog.
   Interpretation: fewer than 2 = cannot run; 2–9 = technically playable only;
   10–49 = limited/shallow catalog; 50+ = candidate for production-ready
   catalog depth. Once above the minimum, retain as many high-quality validated
   items as the provider reasonably supports (75 → keep 75; 100 → keep 100;
   150 → keep 150; 200+ → keep if quality and provider constraints remain
   acceptable). Do **NOT** introduce a universal `MAX_ITEMS = 50`. Final pool
   size is provider-specific, determined by: valid item count, image
   availability, value diversity, tie frequency, provider quota/rate limits,
   latency, freshness requirements, provider reliability, and gameplay
   usefulness. Quality takes priority over quantity. Document provider-specific
   exceptions. SteamSpy's ~100-item fixed endpoint behavior is an acceptable
   provider-specific constraint, not a defect.

3. **YouTube Subscribers — APPROVED DIRECTION.** Use developer-run provider
   discovery to build a larger validated channel identity catalog. Do **not**
   manually grow `CURATED_CHANNELS` into a large permanent list. Preferred
   model: YouTube discovery → candidate channel IDs → `channels.list` → remove
   hidden/unusable subscriber counts → validate thumbnails, duplicates, value
   diversity → generated approved identity/catalog data → runtime subscriber
   values. Subscriber counts should preferably remain **live** through
   `channels.list` if quota/runtime measurements show it remains cheap and
   reliable. The expensive/scarce discovery step must **NOT** run during
   gameplay. Do not snapshot subscriber values solely for architectural
   convenience if live `channels.list` remains practical. Subject to the
   feasibility verification in Section 16.2.

4. **Number of Albums — APPROVED DIRECTION.** Use provider-driven/developer-run
   artist discovery to expand beyond the current 17 bootstrap artists. Do
   **not** manually grow `CURATED_ARTISTS` into a permanent 50–100+ identity
   list. Preserve: MusicBrainz as the album-count source; exact MusicBrainz
   MBIDs; Wikidata P434 → P18 artist-image mapping; Commons licensing/
   attribution handling; generated snapshot-backed runtime gameplay because
   MusicBrainz request-time crawling is too slow. The generator should be able
   to retain substantially more than 50 artists if discovery and validation
   produce them.

5. **Album Release Date — APPROVED.** Keep the generated snapshot
   architecture. The existing 120-item catalog is already above the minimum. Do
   **not** reduce it to 50. If legitimate provider-driven expansion can later
   produce 150, 200, or more high-quality items without unreasonable generation
   cost, the architecture should allow that.
   ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:77))

6. **TMDB / IGDB categories — APPROVED.** Do **not** normalize all categories
   to the same size. TMDB and IGDB may use larger bounded pagination/
   target-count strategies where practical. If a category can safely provide
   100–200+ validated items with acceptable latency/quota behavior, keep the
   larger pool. Do **not** fetch unlimited pages. Use bounded, measured
   expansion. ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:65),
   [`lib/api/igdb.ts`](lib/api/igdb.ts:45))

7. **SteamSpy — APPROVED.** Treat the current ~100-item SteamSpy categories as
   **provider-limited** under the current provider contract. Do **not** invent
   fake pagination or switch providers merely to make the count numerically
   match another category. A different provider is a separate future decision
   if substantially larger Steam catalogs are ever needed.
   ([`lib/api/steamspy.ts`](lib/api/steamspy.ts:43),
   [`lib/api/steamspy_ratings.ts`](lib/api/steamspy_ratings.ts:37))

8. **Classic repeat behavior — APPROVED.** An item ID must **not** repeat until
   the entire available pool has been consumed. After the full pool is
   exhausted: begin a new shuffled cycle; do **not** end Classic solely because
   the pool was completed; ensure the currently displayed item cannot
   immediately reappear at the cycle boundary; preserve adjacent-equal-value
   avoidance as a secondary rule. Classic remains effectively endless, but
   repetitions only happen after a complete cycle.

9. **Time Attack repeat behavior — APPROVED.** An item ID must **not** repeat
   during the same Time Attack session. At the intended catalog sizes,
   exhaustion should be rare. If the entire available pool is genuinely
   exhausted before the timer expires: end the run/session cleanly rather than
   recycle already-seen items. Do **not** violate the no-repeat-within-session
   rule merely to keep the timer running.

10. **Shared deck utility — APPROVED.** Extract a small shared deck utility,
    e.g. `lib/game/deck.ts`, because Classic and Time Attack currently
    duplicate the same deck/refill helpers
    ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:55),
    [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:59)).
    Keep it narrowly scoped. Do **NOT** turn this into a generic game-engine
    framework or unrelated gameplay refactor. The shared utility should support
    only: shuffle/build; adjacent equal-value avoidance; remaining/seen pool
    handling; safe cycle/session exhaustion handling.

11. **Deferred categories — APPROVED.** `monthly-listeners` and
    `twitch-followers` remain **OUT OF SCOPE**. Do not implement them and do
    not reopen their provider decisions as part of this catalog/repeat work.
    ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:197),
    [`lib/catalog/availability.ts`](lib/catalog/availability.ts:214))

12. **Infrastructure constraints — APPROVED.** Do **not** introduce
    database-backed catalog management, Redis, queues, background workers,
    cron/scheduled refresh, admin catalog UI, or scraping-based discovery.
    Developer-run generation scripts remain the preferred approach. Existing
    security/provider rules remain unchanged: credentials server-side only; no
    `NEXT_PUBLIC_` secrets; generated files contain public gameplay-safe data
    only; no credentials in snapshots; provider rate limits and etiquette must
    be respected.

### 16.2 Live diagnostic provider-feasibility pass

A small, quota-conscious, **READ-ONLY** diagnostic pass was performed on
2026-10-14 using the existing configured development credentials (server-side
only). No final catalog was built and no final snapshot was generated. All
credential values are redacted from this record.

#### 16.2.1 YouTube — provider-driven discovery is viable

**Method (Confirmed, observed 2026-10-14):** five `search.list` calls with
`type=channel`, `order=videoCount`, `maxResults=50`, one per broad query
(`music`, `gaming`, `news`, `sports`, `education`), followed by five
`channels.list` calls (`part=snippet,statistics`) batched at 50 IDs each.

| Metric | Observed value |
| --- | --- |
| `search.list` calls consumed | 5 (of the 100/day `search.list` bucket) |
| `channels.list` calls consumed | 5 (of the 10,000-unit/day general bucket) |
| Total search results | 250 |
| Unique channel candidates | 250 |
| Duplicate rate across queries | 0.000 (0%) |
| `channels.list` items returned | 250 |
| Valid playable items (public count + thumbnail) | 250 |
| Hidden subscriber counts | 0 |
| Missing subscriber counts | 0 |
| Missing thumbnails | 0 |
| Subscriber value range | 25 → 54,600,000 |
| Distinct subscriber values | 236 of 250 |

- **Confirmed:** `search.list` with `type=channel` returned 50 usable channel
  IDs per call, and `channels.list` resolved **all 250** with public subscriber
  counts and thumbnails. The adapter's hidden-count filter
  ([`lib/api/youtube.ts`](lib/api/youtube.ts:96)) did not drop any candidate in
  this sample.
- **Confirmed:** the 100-calls/day `search.list` bucket is the binding
  constraint. Five calls yielded 250 candidates, so a developer-run generation
  workflow is practical within a single day's bucket.
- **Inferred:** a path to **at least 50 valid items is realistic** (achieved
  with 5 calls). **100, 150, and 200+ valid items also appear feasible** —
  250 valid items were obtained from 5 calls, and additional queries/pages
  would add more within the same daily bucket.
- **Needs Verification [environment-specific]:** the observed quota headroom is
  specific to the owner's Google Cloud project. Quota is per-project.

#### 16.2.2 MusicBrainz — provider-driven artist discovery is viable

**Method (Confirmed, observed 2026-10-14):** five `artist` search calls
(`type:group AND tag:<genre>`, `limit=50`) paced at ≥ 1.1 s with the required
`User-Agent`, then a 20-artist sample validated for album counts
(`release-group` browse) and Wikidata `P18` images (one batched SPARQL query).

| Metric | Observed value |
| --- | --- |
| Artist search calls consumed | 5 |
| Total search results | 250 |
| Unique MBIDs | 185 |
| Duplicate rate across tags | 0.260 (26%) |
| Sampled artists validated | 20 |
| Sampled artists with album counts | 20 (100%) |
| Sampled artists with Wikidata P18 image | 20 (100%) |
| Sampled artists usable (count + image) | 20 (100%) |
| Album-count range in sample | 237 → 1,402 |

- **Confirmed:** tag-based `artist` search produced a useful variety of exact
  MusicBrainz MBIDs (185 unique from 250 results). The 26% duplicate rate is
  expected because genre tags overlap; deduplication by MBID is required.
- **Confirmed:** all 20 sampled artists had usable album counts and resolved to
  truthful Wikidata `P18` artist images via the existing `P434` → `P18` join
  ([`lib/api/wikidataArtistImages.ts`](lib/api/wikidataArtistImages.ts:15)).
- **Inferred:** reaching **at least 50 valid artists is realistic** (185 unique
  candidates from 5 calls, with a 100% usable rate in the sample). **100, 150,
  and 200+ appear practical** with additional tag queries and pages.
- **Confirmed (cost):** at 1 request/second, validating N artists costs roughly
  N seconds for album-count browse plus one batched SPARQL call for images.
  A 200-artist generation pass is therefore on the order of a few minutes of
  paced requests — acceptable for a developer-run script, not for request-time
  gameplay.
- **Needs Verification:** Commons licensing/attribution handling was not
  re-verified in this pass; the existing per-file license read
  ([`lib/api/wikidataArtistImages.ts`](lib/api/wikidataArtistImages.ts:188))
  remains the mechanism and is unchanged.

### 16.3 Realistic expected pool-size ranges

| Category | Realistic validated pool | Basis |
| --- | --- | --- |
| YouTube Subscribers | 50 minimum; 100–250+ feasible | 250 valid from 5 `search.list` calls (Confirmed) |
| Number of Albums | 50 minimum; 100–200+ feasible | 185 unique MBIDs from 5 searches; 100% usable sample (Confirmed) |
| Album Release Date | Keep existing 120; 150–200+ feasible | Existing snapshot above minimum; expansion allowed (Approved) |
| TMDB / IGDB | 100–200+ where bounded expansion is safe | Application-chosen bounds, not provider ceilings (Inferred) |
| SteamSpy | ~100 (provider-limited) | Fixed `top100*` endpoints (Confirmed) |

### 16.4 Quota / rate-limit implications

- **YouTube:** `search.list` is the scarce resource (100 calls/day, separate
  bucket). Discovery must be a developer-run generation step, never a
  request-time call. `channels.list` is cheap (1 unit/call, 10,000/day), so
  keeping subscriber values **live** at runtime remains practical.
- **MusicBrainz:** 1 request/second per IP with a required `User-Agent`. A
  generation pass for 200 artists is a few minutes of paced requests; runtime
  crawling is not viable, so the snapshot architecture is retained.
- **No new infrastructure** is required; developer-run scripts remain the
  approach (Approved, Section 16.1 item 12).

### 16.5 Remaining Needs Verification

- **Needs Verification [environment-specific]:** YouTube `search.list` quota
  headroom is per-project; the observed 5-call sample is well within the
  100/day bucket but the owner's project limits were not independently
  enumerated.
- **Needs Verification:** Commons licensing/attribution was not re-verified in
  this pass; the existing per-file license read is unchanged.
- **Needs Verification [product-decision]:** none outstanding for the catalog/
  repeat scope — the Section 13 decisions are now resolved by Section 16.1.
  `monthly-listeners` and `twitch-followers` remain explicitly out of scope.

### 16.6 Resolution of earlier open items

The following Section 13 / Section 14 items are now **resolved** by the owner
decisions in Section 16.1 and are no longer open:

- Curated pools: **seed-only** (decision 1).
- Production-ready catalog size: **~50 minimum, not a cap** (decision 2).
- YouTube live vs. snapshot: **live `channels.list` preferred; discovery is
  developer-run** (decision 3).
- Classic pool exhaustion: **new shuffled cycle, no immediate repeat**
  (decision 8).
- Time Attack pool exhaustion: **end the session cleanly** (decision 9).
- Deck utility extraction: **extract `lib/game/deck.ts`** (decision 10).
- `monthly-listeners` / `twitch-followers`: **out of scope** (decision 11).
- YouTube discovery yield: **confirmed viable** (Section 16.2.1).
- MusicBrainz discovery yield: **confirmed viable** (Section 16.2.2).
