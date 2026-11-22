# Catalog Pool and Repeat Behavior — Implementation Plan

> **Status:** Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, and Phase 6 are complete for implementation and verification. Phase 6 final verification verdict: **PASS WITH NON-BLOCKING NEEDS VERIFICATION** (Section 36). Browser image delivery remains `Needs Verification [environment-specific]` (Sections 30, 33, and 36.10). Phase 3's expanded 251-item snapshot was generated after a generator-only client-timeout fix (Section 33). Phase 4 expanded Album Release Date from 120 to 220 items via a bounded target-fill generator (Section 34). Phase 5 expanded the bounded TMDB/IGDB pools and fixed a `movie-ratings` duplicate-ID defect (Section 35). Phase 6 re-measured every playable category, verified repeat invariants, generated-data integrity, fail-closed behavior, security, provider boundaries, and repository gates, and found no defect requiring a code change (Section 36).
> **Date:** 2026-10-15
> **Source of truth:** [`docs/catalog-pool-and-repeat-analysis.md`](docs/catalog-pool-and-repeat-analysis.md:1).
> All owner/product decisions in its Section 16 are APPROVED and are not
> reopened here.
> **Authority:** This plan does not authorize code changes by itself. It defines
> the approved modification allowlist and the verification matrix for the
> implementation phase.
> **Location rationale:** Placed in `docs/` alongside the analysis and the
> existing provider plan ([`docs/higher-lower-category-provider-plan.md`](docs/higher-lower-category-provider-plan.md:1)),
> the repository's established location for durable planning documents.

Every repository-derived claim below carries a `file:line` reference. Claims
are labelled **Confirmed**, **Inferred**, **Needs Verification**, or
**Product Decision**. Provider capability claims are reused from the analysis
(Section 16.2 live diagnostic pass, 2026-10-14) rather than re-researched.

---

## 1. Executive summary

The catalog is a fail-closed pipeline: a category is playable only when
semantic identity, availability gates, provider mapping, route authorization,
dispatcher registration, and a ≥ 2-item normalized pool all hold
([`lib/api/index.ts`](lib/api/index.ts:73),
[`lib/catalog/availability.ts`](lib/catalog/availability.ts:121)). Two
categories are small because their **identity pools are manually curated**:
`youtube-subscribers` (13 channels,
[`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:58)) and
`number-of-albums` (17 artists,
[`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:34)). All other playable
categories derive pools from provider list endpoints with fixed page counts or
limits ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:65),
[`lib/api/igdb.ts`](lib/api/igdb.ts:45),
[`lib/api/steamspy.ts`](lib/api/steamspy.ts:43),
[`lib/api/steamspy_ratings.ts`](lib/api/steamspy_ratings.ts:37)).

This plan delivers two independent workstreams:

1. **Repeat/deck behavior** — extract a narrowly scoped shared utility
   `lib/game/deck.ts` and migrate Classic and Time Attack to a remaining-pool
   model so an item ID cannot repeat until the pool is consumed. This is
   independently testable and does not depend on catalog scaling.
2. **Catalog scaling** — developer-run provider discovery for YouTube and
   MusicBrainz, bounded pagination for TMDB/IGDB, and a documented
   catalog-size/readiness policy. SteamSpy stays provider-limited.

The target pipeline (Product Decision, analysis Section 16.1 item 1) is:

```
external provider / discovery source
  -> candidate discovery
  -> validation / filtering
  -> normalized playable catalog (GameItem[])
  -> snapshot where provider latency or quota requires it
  -> runtime gameplay
```

**Key constraint:** ~50 valid items is the **minimum readiness target**, not a
cap and not a target final size. Categories are not normalized to the same
count. Larger validated pools are retained where the provider supports them.

---

## 2. Goals

- Prevent an item ID from repeating until the whole available pool has been
  consumed (Classic) or for the duration of the session (Time Attack).
- Extract the duplicated deck/refill helpers into `lib/game/deck.ts` so the
  repeat fix is applied once, not twice.
- Replace the manually curated YouTube and MusicBrainz identity pools with
  developer-run provider discovery feeding a generated catalog, while keeping
  curated lists as bootstrap/seed data.
- Document a catalog-size/readiness policy with per-category targets and
  provider-specific exceptions.
- Plan bounded, measured expansion for TMDB and IGDB categories.
- Preserve all existing security, provider-etiquette, and fail-closed
  behavior.

## 3. Non-goals

- No implementation in this document.
- No change to category availability or `productionPlayable` flags.
- No regeneration of production snapshots as part of planning.
- No database, Redis, queue, cron, worker, admin UI, or scraping.
- No `monthly-listeners` or `twitch-followers` work (Product Decision,
  analysis Section 16.1 item 11).
- No universal `MAX_ITEMS = 50` cap.
- No provider switch for SteamSpy.
- No unrelated gameplay, frontend, or backend refactor.
- No new UI framework or dependency.

## 4. Approved product decisions

These are APPROVED (analysis Section 16.1) and are not reopened. They are
restated here only as the plan's binding constraints.

| # | Decision | Plan impact |
| --- | --- | --- |
| 1 | Curated pools are bootstrap/seed data, not the long-term catalog | YouTube and MusicBrainz get developer-run discovery; curated lists retained as seeds |
| 2 | ~50 is the minimum readiness target, not a cap | No `MAX_ITEMS = 50`; per-category targets; retain larger valid pools |
| 3 | YouTube: developer-run discovery, live `channels.list` at runtime | Discovery is a generation step; subscriber values stay live |
| 4 | Number of Albums: MusicBrainz discovery, snapshot-backed runtime | Reuse existing snapshot architecture; do not grow `CURATED_ARTISTS` manually |
| 5 | Album Release Date: keep snapshot; 120 is already production-ready | Do not reduce to 50; allow expansion to 150–200+ |
| 6 | TMDB/IGDB: bounded, measured expansion; no unlimited pages | Raise bounds only where it materially improves gameplay |
| 7 | SteamSpy: provider-limited ~100; no fake pagination | No change to SteamSpy adapters |
| 8 | Classic: no ID repeat until pool consumed; new cycle on exhaustion; no immediate repeat at boundary | Remaining-pool model in `lib/game/deck.ts` |
| 9 | Time Attack: no ID repeat within a session; end cleanly on exhaustion | Session-scoped `seenIds`; exhaustion ends the run |
| 10 | Extract `lib/game/deck.ts`, narrowly scoped | Shared utility; not a game engine |
| 11 | `monthly-listeners` / `twitch-followers` out of scope | No work |
| 12 | No new infrastructure; developer-run scripts only | Generation via npm scripts + dev-only route |

## 5. Current-state constraints

- **Confirmed:** the technical minimum is 2 items
  ([`lib/api/index.ts`](lib/api/index.ts:110)).
- **Confirmed:** `fetchGameItems()` shuffles the pool per request
  ([`lib/api/index.ts`](lib/api/index.ts:77)); `fetchGameItemsRaw()` returns the
  unshuffled sanitized pool used by generators
  ([`lib/api/index.ts`](lib/api/index.ts:91)).
- **Confirmed:** `youtube-subscribers` iterates `CURATED_CHANNELS` and batches
  IDs at 50 per `channels.list` call
  ([`lib/api/youtube.ts`](lib/api/youtube.ts:68),
  [`lib/api/youtube.ts`](lib/api/youtube.ts:73)); hidden/absent subscriber
  counts are dropped ([`lib/api/youtube.ts`](lib/api/youtube.ts:96)).
- **Confirmed:** `number-of-albums` and `album-release-date` read pre-generated
  snapshots at runtime; live adapters are preserved for regeneration
  ([`lib/api/index.ts`](lib/api/index.ts:50),
  [`lib/api/index.ts`](lib/api/index.ts:54)).
- **Confirmed:** MusicBrainz requests are serialized at ≥ 1.1 s spacing with a
  `User-Agent` ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:65),
  [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:56)).
- **Confirmed:** `MAX_ALBUM_ITEMS = 120` caps album-release-date
  ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:77));
  `MAX_RELEASE_GROUPS_PER_ARTIST = 12` bounds per-artist cover-art lookups
  ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:75)).
- **Confirmed:** TMDB uses `PAGES_TO_FETCH = 5` and
  `DETAIL_BATCH_SIZE = 10` ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:65),
  [`lib/api/tmdb.ts`](lib/api/tmdb.ts:67)); IGDB uses `GAME_LIMIT = 100`
  ([`lib/api/igdb.ts`](lib/api/igdb.ts:45)).
- **Confirmed:** SteamSpy uses fixed `top100in2weeks` / `top100forever`
  endpoints ([`lib/api/steamspy.ts`](lib/api/steamspy.ts:43),
  [`lib/api/steamspy_ratings.ts`](lib/api/steamspy_ratings.ts:37)).
- **Confirmed:** Classic and Time Attack duplicate `shuffle`,
  `dedupeAdjacentEquals`, `buildDeck`, `shuffleDeck` verbatim
  ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:55),
  [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:59)).
- **Confirmed:** both modes use `deck` + `spent` and refill by reshuffling
  `spent` when fewer than 2 items remain
  ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:169),
  [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:254)).
- **Confirmed:** `dedupeAdjacentEquals()` prevents only adjacent equal values,
  not ID reappearance
  ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:71)).
- **Confirmed:** the dev-only `full=1` route is disabled in production
  ([`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:67)).
- **Confirmed:** snapshot generators are developer-run npm scripts
  ([`package.json`](package.json:10), [`package.json`](package.json:11)) that
  call the dev-only route; the artist generator hands discovered exact MBIDs
  to its POST endpoint
  ([`scripts/generate-artist-album-counts-snapshot.mjs`](scripts/generate-artist-album-counts-snapshot.mjs:15)).
- **Confirmed:** snapshots store only public `GameItem` fields and fail closed
  ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:16),
  [`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:110)).
- **Confirmed:** `GameItem` requires `id`, `name`, `imageUrl`, `value`,
  `displayValue`, with optional `attribution`
  ([`types/api.ts`](types/api.ts:6)).
- **Confirmed:** the game route authorizes before dispatching and renders
  `error`/`empty` states on failure
  ([`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:18),
  [`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:37)).

## 6. Target catalog architecture

```
provider / discovery source
  -> candidate discovery            (developer-run; YouTube search.list, MusicBrainz artist search)
  -> validation / filtering         (dedupe, hidden-count drop, image check, metric check)
  -> normalized playable catalog    (GameItem[]; generated identity/catalog file)
  -> snapshot where required        (MusicBrainz-derived categories; latency/quota bound)
  -> runtime gameplay               (dispatcher -> adapter -> client components)
```

- **YouTube:** discovery produces a generated **identity catalog** (channel
  IDs). Runtime still calls `channels.list` for live subscriber values
  (Product Decision 3).
- **Number of Albums:** discovery produces artist MBIDs; generation resolves
  album counts and Wikidata images; runtime reads the snapshot (Product
  Decision 4).
- **Album Release Date:** snapshot retained; discovery may expand the artist
  seed pool (Product Decision 5).
- **TMDB / IGDB:** live API-driven with bounded pagination (Product
  Decision 6).
- **SteamSpy:** live, provider-limited (Product Decision 7).

## 7. Catalog-size/readiness policy

Four-tier readiness model (documentation and review concept, not a hard
runtime gate). This is the approved interpretation recorded by Phase 0.

| Tier | Size | Meaning | Label |
| --- | --- | --- | --- |
| Unusable | `< 2` | Engine cannot start | Confirmed ([`lib/api/index.ts`](lib/api/index.ts:110)) |
| Technically playable only | `2–9` | Engine can start; not shippable | Approved |
| Limited / shallow | `10–49` | Playable but repetition is noticeable | Approved |
| Production-ready minimum candidate | `50+` | Enough depth that a normal session rarely repeats | Approved (minimum, not a cap) |

- **Product Decision:** `50` is a **minimum readiness guideline** for a normal
  category. It is **not** a catalog target, **not** a maximum, **not** a
  universal runtime constant, and **not** a reason to truncate larger
  provider-backed pools.
- **Product Decision:** a provider that legitimately supports 100 / 150 / 200 /
  250+ high-quality items should retain those items where practical. Once above
  the minimum, retain as many high-quality validated items as the provider
  reasonably supports (75 → keep 75; 100 → keep 100; 150 → keep 150; 200+ →
  keep if quality and provider constraints remain acceptable).
- **Product Decision:** do NOT introduce a universal `MAX_ITEMS = 50`.
- **Product Decision:** do NOT add a hard runtime `50` assertion. The only
  runtime floor remains the existing ≥ 2-item check
  ([`lib/api/index.ts`](lib/api/index.ts:110)). A 50-item assertion would break
  provider-limited or intentionally-small categories and would contradict
  Product Decision 2.
- **Product Decision:** provider-specific exceptions remain allowed. Final pool
  size is provider-specific, determined by valid item count, image
  availability, value diversity, tie frequency, provider quota/rate limits,
  latency, freshness, provider reliability, and gameplay usefulness. Quality
  takes priority over quantity.
- **Product Decision:** SteamSpy's ~100-item fixed endpoint is an accepted
  provider-specific constraint, not a defect.
- **Phase 0 scope:** documentation and gate evidence only. No application code
  changed. Category availability and `productionPlayable` flags are unchanged.

**How targets are chosen per category (plan):**

1. Measure the current validated pool size (Phase 6 baseline).
2. Determine the provider's practical ceiling from the analysis evidence
   (Section 16.2) and the adapter's own bound.
3. Set a target range, not a single number.
4. Record the target and its basis in the readiness policy section of this
   document (and, if the owner wants a durable record, in the availability
   evidence note — but that is a separate, explicitly-scoped change).
5. Do not assert 50 as a runtime check. Prefer documentation and gate evidence
   unless a runtime check is genuinely useful.

**Runtime assertion stance:** the only runtime floor remains the existing
≥ 2-item check ([`lib/api/index.ts`](lib/api/index.ts:110)). This plan does
**not** add a 50-item runtime assertion. A 50-item assertion would break
provider-limited or intentionally-small categories and would contradict
Product Decision 2.

## 8. Target repeat/deck architecture

**Model:** a remaining-pool model with a `seenIds` set.

- Maintain a `remaining` queue (unshown items) and a `seenIds` set.
- Draw `current` and `next` from `remaining`; on advance, move the consumed
  item into `seenIds`.
- **Classic:** when `remaining` has fewer than 2 items, reset `seenIds` and
  refill `remaining` from the full pool, excluding the currently displayed item
  so it cannot immediately reappear at the cycle boundary. Classic does not end
  because the pool was completed.
- **Time Attack:** `seenIds` persists for the whole session. If the pool is
  genuinely exhausted before the timer ends, end the run cleanly. Do not
  recycle items to keep the timer running.
- **Adjacent equal-value avoidance** remains a secondary rule applied when
  building/refilling the deck.

**Why this replaces `spent`:** the current `spent` array is cleared on refill
([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:174)), so
it is not a full-round memory. `seenIds` is the correct tracking primitive.

## 9. Category-by-category target strategy

| Category | Provider key | Current | Target range | Basis |
| --- | --- | --- | --- | --- |
| YouTube Subscribers | `youtube-subscribers` | 13 curated | 150–250+ | 250 valid from 5 `search.list` calls (Confirmed, analysis 16.2.1) |
| Number of Albums | `artist-album-counts` | 17 curated | 100–200+ | 185 unique MBIDs from 5 searches; 100% usable sample (Confirmed, analysis 16.2.2) |
| Album Release Date | `album-release-dates` | 220 snapshot | 120–200+ | Expanded in Phase 4 via bounded target-fill (Section 34) |
| Movie/Series Rating | `movie-ratings` | ~100 (5 pages) | 100–200+ | Application-chosen bound, not a provider ceiling (Inferred) |
| Release Date | `release-dates` | ~192 | 150–200+ | Application-chosen bound (Inferred) |
| Gross Revenue | `movie-gross-revenue` | ~65 | 65–150 | Bounded by detail-call cost; expand only if cost stays acceptable |
| Game Rating | `game-ratings` | ~100 | ~100 | Provider-limited `top100forever` (Confirmed) |
| Peak Concurrent Players | `game-playerbase` | ~97 | ~100 | Provider-limited `top100in2weeks` (Confirmed) |
| Game Release Date | `game-release-dates` | 100 | 100–200+ | Application-chosen `GAME_LIMIT` (Inferred) |

- **Confirmed:** current sizes for Release Date (~192) and Gross Revenue (~65)
  are recorded in the availability evidence notes
  ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:140),
  [`lib/catalog/availability.ts`](lib/catalog/availability.ts:149)).
- **Confirmed:** Game Release Date is 100 items
  ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:176)).
- **Confirmed:** Peak Concurrent Players is 97 items
  ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:167)).
- **Confirmed:** Number of Albums snapshot is 17 items; Album Release Date
  snapshot is 120 items
  ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:185),
  [`lib/catalog/availability.ts`](lib/catalog/availability.ts:194)).
- **Confirmed:** YouTube Subscribers is 13 items
  ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:211)).
- **Product Decision:** do not optimize every category toward the same
  numerical count. The goal is as many high-quality validated items as the
  provider reasonably supports.

**Expected growth:** YouTube Subscribers (13 → 150–250+), Number of Albums
(17 → 100–200+), Album Release Date (120 → 120–200+ if expanded), TMDB
categories (bounded, up to 100–200+ where practical), IGDB (100 → 100–200+).
SteamSpy stays ~100.

---

## 10. YouTube discovery/generation design

**Goal:** replace the 13-item curated identity list with a developer-run
discovery pass that produces a generated channel identity catalog, while
runtime subscriber values stay live via `channels.list`.

**Evidence reused (Confirmed, analysis 16.2.1):** 5 `search.list` calls
(`type=channel`, `order=videoCount`, `maxResults=50`) → 250 results → 250
unique candidates → 0% duplicate rate → 250/250 usable subscriber counts and
thumbnails → 236 distinct subscriber values. Only 5 discovery calls consumed.

**Design:**

- **Discovery queries:** a small set of broad category queries (e.g. `music`,
  `gaming`, `news`, `sports`, `education`, plus additional topical queries as
  needed). Each query is paginated with `pageToken` up to a bounded page count.
- **Pagination:** bounded per query. The binding constraint is the
  `search.list` 100-calls/day bucket (Confirmed, provider docs). Discovery must
  be a developer-run generation step, never a request-time call.
- **Candidate deduplication:** dedupe channel IDs across all queries before
  validation. The observed cross-query duplicate rate was 0% for the sample,
  but dedupe is still required because queries can overlap.
- **`channels.list` batching:** batch candidate IDs at 50 per call
  (`ID_BATCH_SIZE`, [`lib/api/youtube.ts`](lib/api/youtube.ts:52)). This is
  cheap (1 unit/call from the 10,000/day general bucket).
- **Hidden subscriber filtering:** drop channels with
  `hiddenSubscriberCount === true` or absent `subscriberCount`
  ([`lib/api/youtube.ts`](lib/api/youtube.ts:96)). The sample dropped none, but
  the filter must remain.
- **Thumbnail validation:** require a resolvable thumbnail
  (`high` → `medium` → `default`)
  ([`lib/api/youtube.ts`](lib/api/youtube.ts:102)).
- **Metric validation:** require a finite parsed subscriber count
  ([`lib/api/youtube.ts`](lib/api/youtube.ts:99)).
- **Tie/value-diversity checks:** report distinct subscriber values and tie
  frequency. The sample had 236 distinct values of 250 (94.4%).
- **Generated identity/catalog file format:** a plain JSON file with
  `version`, `generatedAt`, `source`, and `channels` (each `{ channelId, name }`).
  Only public, gameplay-safe identity data — no credentials, no diagnostics.
- **Deterministic output:** sort channels by a stable key (e.g. channel ID)
  before writing so the file is reviewable and diff-friendly.
- **Target range:** 150–250+ valid channels, based on the live evidence.
- **Quota budget:** discovery consumes the `search.list` bucket (100/day);
  validation consumes the general bucket (10,000/day). A 250-candidate pass
  used 5 + 5 calls.
- **Failure behavior:** fail closed. A malformed or sub-minimum generated file
  must not silently produce a thin pool.
- **Runtime:** subscriber values remain live via `channels.list` unless
  implementation evidence later proves that impractical (Product Decision 3).
- **Curated seeds:** `CURATED_CHANNELS` may remain as bootstrap/fallback and
  for deterministic testing. It must not remain the authoritative long-term
  catalog.

**Needs Verification:** whether the generated identity catalog should be a new
file (e.g. `lib/api/data/youtube-channels.catalog.json`) or replace
`CURATED_CHANNELS` in place. This is an implementation-shape decision; the plan
recommends a new generated file plus a seed fallback, but the exact wiring is
`Needs Verification [inferred-from-codebase]`.

## 11. MusicBrainz discovery/generation design

**Goal:** replace the 17-item curated artist list with a developer-run
MusicBrainz artist discovery pass feeding the existing snapshot architecture.

**Evidence reused (Confirmed, analysis 16.2.2):** 5 `artist` search calls
(`type:group AND tag:<genre>`, `limit=50`) → 250 results → 185 unique MBIDs →
26% cross-query duplicate rate → 20/20 sampled artists had usable album counts
and Wikidata P18 images. Album-count range in sample: 237 → 1,402.

**Design:**

- **Discovery query strategy:** developer-run MusicBrainz `artist` searches
  using `type:group AND tag:<genre>`; use eight bounded tag queries
  (`rock`, `pop`, `jazz`, `electronic`, `metal`, `hip hop`, `country`,
  `classical`), one page of 50 results per query. Keep the query/page budget
  explicit and bounded; include all valid unique results and the 17 seed
  artists without a final-count cap.
- **Genre/tag diversity:** use multiple genre tags to broaden the candidate
  pool and reduce overlap. The 26% duplicate rate is expected because genre
  tags overlap; dedupe exact valid MBIDs. Preserve the descriptive adapter
  `User-Agent` and wait at least 1.1 seconds between every MusicBrainz request,
  including discovery searches.
- **Deduplication by MBID:** dedupe exact MusicBrainz artist MBIDs across all
  queries.
- **Candidate validation:** require an exact valid MBID and resolvable Wikidata
  `P434` → `P18` image
  and a usable album count. Items without a genuine artist image are dropped
  ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:303)).
- **Album-count retrieval:** for every discovered/seed artist, reuse
  `fetchAllAlbumReleaseGroups()` and count `primary-type === "Album"` release
  groups across every MusicBrainz browse page. This exact metric and exact MBID
  item identity are invariant; do not substitute a search count or page-limited
  count.
  ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:297)).
- **Wikidata P434 → P18 image resolution:** reuse `resolveArtistImages()`
  ([`lib/api/wikidataArtistImages.ts`](lib/api/wikidataArtistImages.ts:15)).
- **Commons attribution/license handling:** reuse the existing per-file license
  read ([`lib/api/wikidataArtistImages.ts`](lib/api/wikidataArtistImages.ts:188));
  surface `attribution` only when the license requires it
  ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:317)).
- **Snapshot generation:** reuse the existing snapshot architecture and
  generator pattern ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:1),
  [`scripts/generate-artist-album-counts-snapshot.mjs`](scripts/generate-artist-album-counts-snapshot.mjs:1)).
  Do not create a second system.
- **Deterministic selection/output:** sort items by a stable key before writing.
- **Expected generation time:** at 1 request/second, validating N artists costs
  roughly N seconds for album-count browse plus one batched SPARQL call for
  images. A 200-artist pass is on the order of a few minutes of paced requests
  (Confirmed, analysis 16.2.2).
- **Target pool size:** 100–200+ valid artists where provider evidence
  supports it.
- **Pacing:** preserve the descriptive `User-Agent` and ≥ 1.1 s MusicBrainz
  spacing
  ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:65)). Do not weaken it.

**Needs Verification:** the exact discovery-query set and page budget that
reliably yields 100–200+ validated artists. The sample proves viability at 185
unique MBIDs from 5 calls; the full query set is an implementation detail.

## 12. Snapshot strategy

- **Confirmed:** the established pattern is a plain JSON file under
  `lib/api/data/` with `version`, `generatedAt`, `source`, and `items`, read
  server-side and validated fail-closed
  ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:40),
  [`lib/api/albumReleaseDateSnapshot.ts`](lib/api/albumReleaseDateSnapshot.ts:39)).
- **Confirmed:** snapshots store only public, gameplay-safe `GameItem` fields
  ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:16)).
- **Confirmed:** generation is a developer-run npm script calling the dev-only
  route, disabled in production
  ([`package.json`](package.json:10),
  [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:67)).
- **Confirmed:** live adapters remain the authoritative source and are
  preserved for regeneration ([`lib/api/index.ts`](lib/api/index.ts:46)).

**When snapshots are appropriate (Inferred):** the metric is latency-bound by
provider etiquette (MusicBrainz 1 req/s), quota-bound (YouTube `search.list`),
or stable enough for periodic regeneration (album counts, release dates).

**When snapshots are not appropriate (Inferred):** the metric changes
frequently (SteamSpy CCU is a previous-day peak,
[`lib/api/steamspy.ts`](lib/api/steamspy.ts:11)) or the provider is fast and
cheap (TMDB, IGDB).

**Plan:** retain the snapshot architecture for `number-of-albums` and
`album-release-date`. YouTube stays live for subscriber values; only its
identity catalog is generated. No new snapshot system is introduced.

## 13. TMDB/IGDB bounded expansion strategy

**Goal:** measured expansion only where it materially improves gameplay. Do not
expand a category simply because another category has more items.

**TMDB:**

- **Current:** `PAGES_TO_FETCH = 5` (~100 candidates per list)
  ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:65)).
- **Proposed:** raise the page count toward a target where useful, bounded and
  measured. Do not fetch unlimited pages.
- **Gross Revenue:** must remain mindful of its additional detail-request cost
  (`DETAIL_BATCH_SIZE = 10`, [`lib/api/tmdb.ts`](lib/api/tmdb.ts:67)). Expand
  only if the detail-call cost stays acceptable.
- **Stop condition:** stop when the target range is reached or when latency or
  quota behavior degrades.
- **Filtering:** preserve existing filters (poster present, `vote_average > 0`,
  `vote_count >= 50` for ratings; `revenue > 0` for gross revenue)
  ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:134),
  [`lib/api/tmdb.ts`](lib/api/tmdb.ts:235)).
- **Caching:** preserve the existing `revalidate` windows
  ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:94),
  [`lib/api/tmdb.ts`](lib/api/tmdb.ts:219)).

**IGDB:**

- **Current:** `GAME_LIMIT = 100` ([`lib/api/igdb.ts`](lib/api/igdb.ts:45)).
- **Proposed:** raise the limit or use bounded offset pagination if increasing
  beyond 100 is worthwhile.
- **Preserve:** Twitch client-credentials auth, server-only secret handling,
  token reuse/caching ([`lib/api/igdb.ts`](lib/api/igdb.ts:53)), image/date
  filtering ([`lib/api/igdb.ts`](lib/api/igdb.ts:148)).
- **Stop condition:** stop when the target range is reached or provider
  behavior degrades (HTTP 429 risk at 4 req/s).

**Rollback criteria:** if expansion increases latency beyond an acceptable
threshold, produces duplicate IDs, or degrades image availability, revert the
bound to the previous value.

## 14. SteamSpy provider limitation

- **Confirmed:** SteamSpy exposes only fixed `top100*` lists
  ([`lib/api/steamspy.ts`](lib/api/steamspy.ts:43),
  [`lib/api/steamspy_ratings.ts`](lib/api/steamspy_ratings.ts:37)).
- **Product Decision:** do not invent pagination that does not exist. ~100
  valid records is acceptable.
- **Product Decision:** a different provider is a separate future
  product/provider decision, not required by this plan.
- **Plan:** no change to the SteamSpy adapters.

## 15. Shared deck utility design

**File:** `lib/game/deck.ts` (new).

**Scope (Product Decision 10):** narrowly scoped helpers only. Not a generic
game engine.

**Proposed exports:**

- `shuffle<T>(arr: T[]): T[]` — Fisher-Yates, returns a new array.
- `dedupeAdjacentEquals(arr: GameItem[]): GameItem[]` — adjacent equal-value
  avoidance.
- `buildDeck(pool: GameItem[]): GameItem[]` — filter usable items and apply
  adjacent-equal avoidance, preserving server order (hydration-safe).
- `shuffleDeck(pool: GameItem[]): GameItem[]` — shuffle then build (explicit
  restarts).
- A remaining-pool helper for Classic cycle reset and Time Attack exhaustion
  handling.

**State model (proposed):**

- `remaining: GameItem[]` — unshown queue.
- `seenIds: Set<string | number>` — consumed item IDs.
- `current` and `next` are `remaining[0]` and `remaining[1]`.

**Behavior:**

- On advance, move the consumed item's ID into `seenIds`.
- **Classic cycle reset:** when `remaining.length < 2`, reset `seenIds` and
  refill `remaining` from the full pool, excluding the currently displayed item
  so it cannot immediately reappear at the boundary.
- **Time Attack exhaustion:** when `remaining.length < 2` and `seenIds` covers
  the whole pool, signal exhaustion so the component ends the run cleanly.
- **Adjacent equal-value avoidance:** applied when building/refilling the deck.

**What must NOT change:** the visual rendering, the guess comparison logic, the
scoring, the timer, the high-score storage, and the keyboard handling.

**Needs Verification:** whether the remaining-pool helper should be a pure
function returning a new state object or a small class. The plan recommends a
pure function to keep it testable and avoid hidden state; the exact shape is
`Needs Verification [inferred-from-codebase]`.

## 16. Classic behavior plan

- **Product Decision 8:** an item ID must not repeat until the whole available
  pool has been consumed. After full-pool exhaustion, begin a new shuffled
  cycle. Classic must not end solely because the full catalog was seen. The
  currently displayed item must not immediately reappear at the cycle boundary.
  Preserve adjacent equal-value avoidance as a secondary rule.
- **Current:** `deck` + `spent`; on exhaustion `spent` is reshuffled and
  appended ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:169)).
- **Plan:** migrate to the remaining-pool model in `lib/game/deck.ts`. Replace
  the `spent` state with `seenIds`. On cycle reset, exclude the currently
  displayed item.
- **Play Again:** reset `seenIds`, rebuild the deck from `initialPool` via
  `shuffleDeck`, reset score and phase
  ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:206)).
- **What must NOT change:** the 1500 ms reveal, the strict comparison, the
  game-over modal, the high-score write, and the keyboard shortcuts.

## 17. Time Attack behavior plan

- **Product Decision 9:** an item ID must not repeat during the same Time
  Attack session. If the entire available pool is genuinely exhausted before
  the timer ends, end the run cleanly. Do not recycle items merely to keep the
  timer running.
- **Current:** identical deck/spent/refill structure to Classic
  ([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:254)).
- **Plan:** migrate to the remaining-pool model. `seenIds` persists for the
  whole session. On genuine exhaustion, transition to `game-over` cleanly
  (reuse the existing game-over path and high-score write,
  [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:186)).
- **Play Again:** reset `seenIds`, rebuild the deck, reset the timer and score
  ([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:285)).
- **What must NOT change:** the 60 s timer, the +3 s / −5 s deltas, the 800 ms
  / 400 ms reveals, the shake/flash, the delta labels, and the keyboard
  shortcuts.

---

## 18. Detailed phased implementation plan

Each phase below documents the 12 required items: exact goal; files expected to
change; existing code to reuse; proposed implementation behavior; what must NOT
change; provider/API considerations; security considerations; data-quality
checks; testing/verification; stop/go criteria; rollback/fail-closed behavior;
dependencies on later phases.

### Phase 0 — Catalog readiness policy

1. **Exact goal:** record the distinction between technical minimum, limited
   catalog, production-ready minimum, and provider-specific target/exception.
2. **Files expected to change:** `docs/catalog-pool-and-repeat-plan.md` (this
   document, Section 7). No application code.
3. **Existing code to reuse:** the ≥ 2-item floor
   ([`lib/api/index.ts`](lib/api/index.ts:110)) and the availability evidence
   notes ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:121)).
4. **Proposed implementation behavior:** documentation and gate evidence only.
   Do not add a 50-item runtime assertion.
5. **What must NOT change:** the ≥ 2-item runtime floor; category availability
   flags; `productionPlayable` values.
6. **Provider/API considerations:** none; this is a policy record.
7. **Security considerations:** none.
8. **Data-quality checks:** confirm the recorded current sizes match the
   availability evidence notes.
9. **Testing/verification:** source read-back of Section 7 against the
   availability notes.
10. **Stop/go criteria:** go when the policy is recorded and consistent with
    Product Decision 2.
11. **Rollback/fail-closed behavior:** documentation-only; no runtime effect.
12. **Dependencies on later phases:** none. Phase 0 is a prerequisite for
    interpreting Phase 2–5 targets.

### Phase 1 — Shared deck utility + repeat prevention

1. **Exact goal:** implement `lib/game/deck.ts` and migrate Classic and Time
   Attack to the remaining-pool model.
2. **Files expected to change:** `lib/game/deck.ts` (new),
   [`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:1),
   [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:1).
3. **Existing code to reuse:** the duplicated `shuffle`,
   `dedupeAdjacentEquals`, `buildDeck`, `shuffleDeck`
   ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:55),
   [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:59));
   the existing game-over and Play Again paths.
4. **Proposed implementation behavior:** remaining-pool model with `seenIds`;
   Classic cycle reset excluding the current item; Time Attack session-scoped
   `seenIds` with clean exhaustion.
5. **What must NOT change:** rendering, comparison logic, scoring, timer,
   high-score storage, keyboard handling, reveal timings.
6. **Provider/API considerations:** none; this is client-side only.
7. **Security considerations:** none; no credentials involved.
8. **Data-quality checks:** verify no ID repeats within a cycle/session; verify
   no adjacent equal values; verify the boundary item does not immediately
   reappear.
9. **Testing/verification:** `npx tsc --noEmit`, `npm run lint`,
   `npm run build`, and a Playwright smoke test that plays through a small pool
   and asserts no repeat before exhaustion.
10. **Stop/go criteria:** go when both modes pass the no-repeat checks and the
    build is clean.
11. **Rollback/fail-closed behavior:** revert to the previous `deck`/`spent`
    implementation if a regression is found. The change is isolated to three
    files.
12. **Dependencies on later phases:** none. Phase 1 is independently testable
    from catalog scaling.

### Phase 2 — YouTube catalog scaling

1. **Exact goal:** developer-run YouTube discovery producing a generated
   channel identity catalog; runtime subscriber values stay live.
2. **Files expected to change:** a new generator script under `scripts/`
   (e.g. `scripts/generate-youtube-channel-catalog.mjs`), a new generated data
   file under `lib/api/data/`, [`lib/api/youtube.ts`](lib/api/youtube.ts:1)
   (read the generated catalog instead of `CURATED_CHANNELS`),
   [`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:58) (retain as seed),
   [`package.json`](package.json:5) (new npm script),
   [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1) (a dev-only
   discovery mode, if needed).
3. **Existing code to reuse:** the `channels.list` batching and validation in
   [`lib/api/youtube.ts`](lib/api/youtube.ts:58); the generator pattern in
   [`scripts/generate-artist-album-counts-snapshot.mjs`](scripts/generate-artist-album-counts-snapshot.mjs:1).
4. **Proposed implementation behavior:** discovery via `search.list`
   (`type=channel`, `order=videoCount`, paginated), dedupe, `channels.list`
   validation, hidden-count/thumbnail/metric filtering, deterministic output.
5. **What must NOT change:** the runtime `channels.list` path, the hidden-count
   filter, the `GameItem` mapping, the 6-hour revalidate.
6. **Provider/API considerations:** `search.list` is limited to 100 calls/day
   in its own bucket; `channels.list` costs 1 unit from the 10,000/day bucket.
   Discovery must never run at request time.
7. **Security considerations:** `YOUTUBE_API_KEY` stays server-side; no
   `NEXT_PUBLIC_` prefix; the generated file contains only public channel IDs
   and names.
8. **Data-quality checks:** unique channel IDs; unique subscriber values and
   tie frequency; thumbnail availability; hidden-count drop rate.
9. **Testing/verification:** run the generator; validate the generated file
   against the snapshot validator pattern; `npx tsc --noEmit`, `npm run lint`,
   `npm run build`; a Playwright smoke test of the YouTube category.
10. **Stop/go criteria:** go when the generated catalog reaches the target
    range and passes validation. Stop if discovery yield drops below the
    minimum.
11. **Rollback/fail-closed behavior:** fall back to `CURATED_CHANNELS` if the
    generated file is missing or malformed. Fail closed on a sub-minimum pool.
12. **Dependencies on later phases:** none, but Phase 6 verifies the result.

### Phase 3 — Number of Albums catalog scaling

1. **Exact goal:** developer-run MusicBrainz artist discovery feeding the
   existing snapshot architecture.
2. **Approved modification allowlist:**
   [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:1) (accept exact discovered
   artist records while keeping the 17 records as seeds; expose generation
   rejection/summary counts without changing metric semantics),
   [`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:1)
   (fail-closed exact-MBID uniqueness validation),
   [`scripts/generate-artist-album-counts-snapshot.mjs`](scripts/generate-artist-album-counts-snapshot.mjs:1)
   (bounded discovery, POST handoff, snapshot generation/metrics),
   [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1) (dev-only
   discovered-MBID handoff; retain normal diagnostics and production `full=1`
   404/fail-closed behavior), and
   `lib/api/data/artist-album-counts.snapshot.json` (generated snapshot).
   [`docs/catalog-pool-and-repeat-plan.md`](docs/catalog-pool-and-repeat-plan.md:1)
   is updated for this Phase 3 plan and its separate implementation log.
   `package.json` and `lib/api/curatedPools.ts` are not expected to change
   unless source use requires a seed/reference-only edit; no other file may be
   added without stopping for owner direction.
3. **Existing code to reuse:** `fetchAllAlbumReleaseGroups()`
   ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:131)),
   `resolveArtistImages()` ([`lib/api/wikidataArtistImages.ts`](lib/api/wikidataArtistImages.ts:15)),
   the snapshot reader/validator
   ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:110)),
   and the generator pattern.
4. **Proposed implementation behavior:** eight single-page, 50-result
   `artist` searches with diverse `type:group AND tag:<genre>` queries; include
   the existing 17 seed artists, exact-MBID dedupe, and hand off the bounded
   artist list to the existing live album-count/image/licensing adapter through
   the dev-only route. Retain every quality-validated item, deterministically
   sort, and generate the existing snapshot schema.
5. **What must NOT change:** MusicBrainz as the album-count authority; exact
   MBIDs; the P434 → P18 mapping; Commons attribution handling; the
   snapshot-backed runtime; the ≥ 1.1 s pacing.
6. **Provider/API considerations:** MusicBrainz is 1 request/second with a
   required `User-Agent`; a 200-artist pass is a few minutes of paced requests.
   Runtime crawling is not viable.
7. **Security considerations:** no credentials; the snapshot contains only
   public `GameItem` fields; the generator never inspects `.env*`.
8. **Data-quality checks:** exact unique MBIDs; full-page album counts;
   distinct album-count values and tie frequency; image coverage; per-file
   license/attribution distribution; discovery duplicates and rejection reasons.
9. **Testing/verification:** run the generator; validate the snapshot;
   `npx tsc --noEmit`, `npm run lint`, `npm run build`; a Playwright smoke test
   of the Number of Albums category.
10. **Stop/go criteria:** go when the snapshot reaches the target range and
    passes validation. Stop if the usable rate drops materially.
11. **Rollback/fail-closed behavior:** retain the previous snapshot if
    generation fails; fail closed on a malformed or sub-minimum snapshot.
12. **Dependencies on later phases:** none, but Phase 6 verifies the result.

### Phase 4 — Album Release Date expansion

1. **Exact goal:** determine whether expanding beyond the current 120 items is
   worthwhile; if so, plan the expansion.
2. **Files expected to change:** [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:77)
   (`MAX_ALBUM_ITEMS`), the regenerated
   `lib/api/data/album-release-date.snapshot.json`, and possibly the artist
   seed pool.
3. **Existing code to reuse:** `fetchAlbumReleaseDates()`
   ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:334)), the CAA resolution
   ([`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:176)), and the snapshot
   reader/validator
   ([`lib/api/albumReleaseDateSnapshot.ts`](lib/api/albumReleaseDateSnapshot.ts:103)).
4. **Proposed implementation behavior:** raise `MAX_ALBUM_ITEMS` only if the
   artist seed pool expands and generation cost stays acceptable. Retain all
   valid high-quality items rather than stopping at 50.
5. **What must NOT change:** the snapshot architecture; the MusicBrainz pacing;
   the CAA bounded concurrency; the date-precision preservation.
6. **Provider/API considerations:** generation cost scales with the artist
   count and per-artist cover-art lookups; a cold run is roughly 2 minutes for
   the current pool.
7. **Security considerations:** no credentials; public fields only.
8. **Data-quality checks:** unique IDs; unique image URLs; date diversity; tie
   frequency; artwork availability.
9. **Testing/verification:** run the generator; validate the snapshot;
   `npx tsc --noEmit`, `npm run lint`, `npm run build`; a Playwright smoke test.
10. **Stop/go criteria:** go only if expansion materially improves gameplay and
    generation cost stays acceptable. Otherwise record "no change" and stop.
11. **Rollback/fail-closed behavior:** retain the 120-item snapshot if
    expansion fails.
12. **Dependencies on later phases:** none, but Phase 6 verifies the result.

### Phase 5 — TMDB / IGDB bounded expansion

1. **Exact goal:** evaluate current category sizes before changing anything;
   plan measured expansion only where it materially improves gameplay.
2. **Files expected to change:** [`lib/api/tmdb.ts`](lib/api/tmdb.ts:65)
   (`PAGES_TO_FETCH`), [`lib/api/igdb.ts`](lib/api/igdb.ts:45) (`GAME_LIMIT`),
   and possibly the availability evidence notes if the owner wants a durable
   record (separate, explicitly-scoped change).
3. **Existing code to reuse:** `fetchListPages()`
   ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:86)), the detail batching
   ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:213)), and the IGDB query
   ([`lib/api/igdb.ts`](lib/api/igdb.ts:120)).
4. **Proposed implementation behavior:** raise bounds toward a target range,
   bounded and measured. Do not fetch unlimited pages.
5. **What must NOT change:** the existing filters, the caching windows, the
   Twitch auth and token caching, the image/date filtering.
6. **Provider/API considerations:** TMDB list pages are cheap; detail calls are
   the dominant cost for Gross Revenue. IGDB is 4 req/s with HTTP 429 risk.
7. **Security considerations:** `TMDB_API_KEY`, `TWITCH_CLIENT_ID`, and
   `TWITCH_CLIENT_SECRET` stay server-side; no `NEXT_PUBLIC_` prefix.
8. **Data-quality checks:** unique IDs; unique metric values and tie frequency;
   image availability; latency.
9. **Testing/verification:** `npx tsc --noEmit`, `npm run lint`,
   `npm run build`; a Playwright smoke test per affected category; measure
   latency.
10. **Stop/go criteria:** go when the target range is reached without latency
    or quota degradation. Stop if any category degrades.
11. **Rollback/fail-closed behavior:** revert the bound to the previous value
    if latency, duplicates, or image availability degrade.
12. **Dependencies on later phases:** none, but Phase 6 verifies the result.

### Phase 6 — Final readiness / regression verification

1. **Exact goal:** verify catalog sizes, uniqueness, tie frequency, image
   availability, duplicate rate, latency, quota compliance, generated-file
   validation, credential exposure, and repeat behavior.
2. **Files expected to change:** none (verification only). Findings may open a
   postfix phase.
3. **Existing code to reuse:** the dev-only `full=1` route
   ([`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:65)) for pool
   inspection.
4. **Proposed implementation behavior:** run the verification matrix in
   Section 22.
5. **What must NOT change:** no code changes during verification.
6. **Provider/API considerations:** prefer reproducible or source-level
   evidence; call live providers only when safe and appropriate.
7. **Security considerations:** never copy secrets into QA notes; redact
   sensitive values.
8. **Data-quality checks:** the full Section 21 checklist.
9. **Testing/verification:** `npx tsc --noEmit`, `npm run lint`,
   `npm run build`, and Playwright smoke/regression tests.
10. **Stop/go criteria:** go when all applicable checks pass. Any failure opens
    a postfix phase.
11. **Rollback/fail-closed behavior:** report failures honestly; do not imply
    unrun checks passed.
12. **Dependencies on later phases:** none; this is the final phase.

## 19. Files expected to change

**New files:**

- `lib/game/deck.ts` — shared deck utility (Phase 1).
- `scripts/generate-youtube-channel-catalog.mjs` — YouTube discovery generator
  (Phase 2).
- `lib/api/data/youtube-channels.catalog.json` — generated channel identity
  catalog (Phase 2). Exact path `Needs Verification [inferred-from-codebase]`.
- A MusicBrainz discovery script or an extension of
  `scripts/generate-artist-album-counts-snapshot.mjs` (Phase 3).

**Modified files:**

- [`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:1) —
  migrate to `lib/game/deck.ts` (Phase 1).
- [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:1) —
  migrate to `lib/game/deck.ts` (Phase 1).
- [`lib/api/youtube.ts`](lib/api/youtube.ts:1) — read the generated catalog
  (Phase 2).
- [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:1) — accept a discovered
  artist list; possibly raise `MAX_ALBUM_ITEMS` (Phases 3–4).
- [`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:1) — retain as seed;
  possibly add a comment clarifying seed status (Phases 2–3).
- [`lib/api/tmdb.ts`](lib/api/tmdb.ts:65) — bounded page expansion (Phase 5).
- [`lib/api/igdb.ts`](lib/api/igdb.ts:45) — bounded limit expansion (Phase 5).
- [`package.json`](package.json:5) — new npm scripts (Phases 2–3).
- [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1) — a dev-only
  discovery mode, if needed (Phases 2–3).
- `lib/api/data/artist-album-counts.snapshot.json` — regenerated (Phase 3).
- `lib/api/data/album-release-date.snapshot.json` — regenerated if expanded
  (Phase 4).

**Explicitly NOT modified:** [`lib/catalog/availability.ts`](lib/catalog/availability.ts:1)
(no availability change), [`lib/catalog/semanticCatalog.ts`](lib/catalog/semanticCatalog.ts:1),
[`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts:1),
[`lib/api/steamspy.ts`](lib/api/steamspy.ts:1),
[`lib/api/steamspy_ratings.ts`](lib/api/steamspy_ratings.ts:1),
[`lib/api/worldbank.ts`](lib/api/worldbank.ts:1), and
[`docs/catalog-pool-and-repeat-analysis.md`](docs/catalog-pool-and-repeat-analysis.md:1).

## 20. Security/provider constraints

- Credentials remain server-side; no provider secret may use `NEXT_PUBLIC_`
  ([`lib/api/youtube.ts`](lib/api/youtube.ts:59),
  [`lib/api/tmdb.ts`](lib/api/tmdb.ts:74),
  [`lib/api/igdb.ts`](lib/api/igdb.ts:61)).
- No authenticated provider requests from client components.
- Generated files contain only public gameplay-safe data; no credentials in
  snapshots or catalog files
  ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:16)).
- MusicBrainz request pacing remains provider-compliant (≥ 1.1 s,
  [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:65)).
- Wikimedia `User-Agent` requirements respected
  ([`lib/api/wikidataArtistImages.ts`](lib/api/wikidataArtistImages.ts:52)).
- YouTube quota usage bounded; discovery is developer-run only.
- Generation routes remain unavailable in production
  ([`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:67)).
- Failure behavior remains fail-closed.
- Do not weaken existing provider/security behavior to increase catalog size.

## 21. Data-quality/readiness criteria

- **Catalog size:** each category meets or exceeds its target range, or records
  a provider-specific exception.
- **Unique IDs:** no duplicate `GameItem.id` within a category pool.
- **Unique metric values:** report distinct values and tie frequency.
- **Tie frequency:** ties are acceptable but must be measured and reported.
- **Image availability:** every item has a resolvable absolute `imageUrl`.
- **Duplicate rate:** report cross-query duplicate rates for discovery.
- **Runtime latency:** snapshot reads and live fetches stay within acceptable
  bounds.
- **Quota/rate-limit compliance:** discovery stays within provider buckets.
- **Generated-file validation:** generated files pass the snapshot validator
  pattern.
- **Credential exposure:** no secret appears in generated files, logs, or
  client-reachable code.
- **Repeat behavior:** Classic has no ID repeat before pool exhaustion; Time
  Attack has no ID repeat within a session.
- **Category availability consistency:** `assertAvailabilityConsistency()`
  still holds ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:284)).

## 22. Testing and verification matrix

| Check | Method | Status vocabulary |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | `[Pass]` / `[Fail]` |
| Lint | `npm run lint` | `[Pass]` / `[Fail]` |
| Build | `npm run build` | `[Pass]` / `[Fail]` |
| Catalog sizes | dev-only `full=1` route per category | `[Pass]` / `[Partial]` / `[Fail]` |
| Unique IDs | inspect `full=1` output | `[Pass]` / `[Fail]` |
| Unique metric values / ties | inspect `full=1` output | `[Pass]` / `[Partial]` |
| Image availability | sample `imageUrl` HTTP status | `[Pass]` / `[Partial]` |
| Duplicate rate | discovery output analysis | `[Pass]` / `[Partial]` |
| Runtime latency | measure snapshot read / live fetch | `[Pass]` / `[Partial]` |
| Quota/rate-limit compliance | provider call counts | `[Pass]` / `[Blocked]` |
| Generated-file validation | snapshot validator | `[Pass]` / `[Fail]` |
| Credential exposure | grep generated files and client code | `[Pass]` / `[Fail]` |
| Classic no-repeat | Playwright play-through | `[Pass]` / `[Fail]` |
| Time Attack no-repeat | Playwright play-through | `[Pass]` / `[Fail]` |
| Play Again behavior | Playwright restart | `[Pass]` / `[Fail]` |
| Category availability consistency | `assertAvailabilityConsistency()` | `[Pass]` / `[Fail]` |
| Browser console/network | Playwright console + network inspection | `[Pass]` / `[Partial]` |

- **Confirmed:** `package.json` exposes `dev`, `build`, `start`, and `lint`
  ([`package.json`](package.json:5)). `npx tsc --noEmit` uses the installed
  TypeScript ([`package.json`](package.json:31)).
- **Needs Verification:** whether Playwright is available in the environment.
  If not, record the browser checks as `[Blocked]` with the reason.

## 23. Compatibility/migration concerns

- **Hydration:** `buildDeck()` preserves server order to avoid a hydration
  mismatch ([`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:88)).
  The remaining-pool model must preserve this for the initial deck.
- **Snapshot versioning:** snapshots carry a `version` field; a shape change
  requires a version bump
  ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:52)).
  Regeneration must keep the version consistent with the reader.
- **Generated catalog wiring:** replacing `CURATED_CHANNELS` with a generated
  file changes the import in [`lib/api/youtube.ts`](lib/api/youtube.ts:24).
  Keep a seed fallback to avoid a hard dependency on generation.
- **High scores:** the high-score key namespaces are unchanged; no migration is
  required.
- **No database migration:** there is no database.

## 24. Rollback/fail-closed strategy

- **Phase 1:** revert the three files to the previous `deck`/`spent`
  implementation.
- **Phase 2:** fall back to `CURATED_CHANNELS` if the generated catalog is
  missing or malformed.
- **Phase 3:** retain the previous snapshot if generation fails.
- **Phase 4:** retain the 120-item snapshot if expansion fails.
- **Phase 5:** revert the bound to the previous value.
- **All phases:** fail closed on a malformed or sub-minimum pool; never render
  a thin or broken pool.

## 25. Deferred/future work

- `monthly-listeners` and `twitch-followers` (Product Decision 11).
- Database-backed catalogs, Redis, cron jobs, queues, background workers,
  admin catalog UI, automatic scheduled discovery, scraping (Product
  Decision 12).
- A different provider for SteamSpy categories (separate product/provider
  decision).
- Unrelated frontend redesign and unrelated backend architecture.

## 26. Remaining Needs Verification

- **Needs Verification [environment-specific]:** YouTube `search.list` quota
  headroom is per-project; the observed 5-call sample is well within the
  100/day bucket but the owner's project limits were not independently
  enumerated (analysis Section 16.5).
- **Needs Verification:** Commons licensing/attribution was not re-verified in
  the live pass; the existing per-file license read is unchanged (analysis
  Section 16.5).
- **Needs Verification [inferred-from-codebase]:** the exact generated YouTube
  catalog file path and whether it replaces or supplements `CURATED_CHANNELS`.
- **Needs Verification [inferred-from-codebase]:** whether the remaining-pool
  helper is a pure function or a small class.
- **Needs Verification:** whether Playwright is available for the browser
  checks in Section 22.
- **Needs Verification:** the exact MusicBrainz discovery-query set and page
  budget that reliably yields 100–200+ validated artists.
- **Needs Verification:** whether expanding Album Release Date beyond 120 is
  worthwhile; Phase 4 decides this from measured generation cost.
- **Needs Verification:** whether TMDB/IGDB expansion materially improves
  gameplay; Phase 5 decides this from measured latency and quality.

## 27. Final implementation order/checklist

- [x] Phase 0 — record the catalog readiness policy (Section 7).
- [x] Phase 1 — implement `lib/game/deck.ts`; migrate Classic and Time Attack.
- [x] Phase 2 — YouTube discovery generator + generated identity catalog.
- [x] Phase 3 — MusicBrainz artist discovery + regenerated album-counts
      snapshot (251 items; Section 33).
- [x] Phase 4 — Album Release Date expanded to 220 items via a bounded
      target-fill generator (Section 34).
- [x] Phase 5 — bounded TMDB/IGDB expansion where it materially helps
      (Section 35; all four categories expanded, ratings dedupe defect fixed).
- [x] Phase 6 — final readiness/regression verification (Section 36; verdict
      PASS WITH NON-BLOCKING NEEDS VERIFICATION).
- [x] Confirm no category availability change.
- [x] Confirm no credential exposure.
- [x] Confirm Classic and Time Attack no-repeat behavior.
- [x] Confirm `npx tsc --noEmit`, `npm run lint`, `npm run build` pass.

---

## 28. Phase 0 / Phase 1 implementation and verification log

> **Date:** 2026-10-14
> **Scope:** Phase 0 (catalog readiness policy) and Phase 1 (shared deck
> utility + repeat prevention) only. No catalog-scaling work (YouTube,
> MusicBrainz, snapshots, TMDB, IGDB) was performed.

### 28.1 Files created / modified

| File | Change |
| --- | --- |
| `lib/game/deck.ts` | **New.** Shared, narrowly scoped pure deck helpers. |
| [`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:1) | Migrated to `seenIds` + remaining-pool cycle model. |
| [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:1) | Migrated to session-scoped `seenIds` + clean exhaustion. |
| `docs/catalog-pool-and-repeat-plan.md` | Section 7 policy recorded; this log added. |

No provider adapter, curated pool, snapshot, `CATEGORY_AVAILABILITY`,
semantic catalog, route authorization, or deferred-category file was touched.

### 28.2 Shared deck API (`lib/game/deck.ts`)

Small pure functions only; no class, no game engine. React components keep
owning gameplay state.

- `shuffle<T>(arr: T[]): T[]` — Fisher-Yates, returns a new array.
- `dedupeAdjacentEquals(arr: GameItem[]): GameItem[]` — adjacent equal-value
  avoidance (reused verbatim from the duplicated component helpers).
- `filterUsable(pool: GameItem[]): GameItem[]` — drops items missing
  `imageUrl` or `name`.
- `buildDeck(pool: GameItem[]): GameItem[]` — initial deck; preserves server
  order (hydration-safe).
- `shuffleDeck(pool: GameItem[]): GameItem[]` — explicit reshuffle for
  restarts.
- `filterSeen(pool, seenIds): GameItem[]` — removes already-consumed IDs.
- `buildNextCycle(pool, carried, consumedId): GameItem[]` — Classic cycle
  reset: carries the unshown tail, reshuffles the rest, protects the boundary.

### 28.3 Classic — before vs after

- **Before:** `deck` + `spent`; on `remaining.length < 2` the `spent` array was
  reshuffled and appended, and `spent` was cleared. The last unshown item was
  discarded and could immediately reappear at the boundary.
- **After:** `deck` + `seenIds`. On `remaining.length < 2`, `buildNextCycle`
  carries the unshown tail (0 or 1 items) into a fresh shuffled cycle and
  resets `seenIds`. The currently displayed item cannot immediately reappear.
  Classic remains endless; score, 1500 ms reveal, strict comparison, game-over
  modal, high-score write, and keyboard shortcuts are unchanged.

### 28.4 Time Attack — before vs after

- **Before:** identical `deck` + `spent` refill structure to Classic; items
  were recycled when the pool ran low.
- **After:** `deck` + session-scoped `seenIds`. When `remaining.length < 2`,
  the run ends cleanly via the existing game-over path (no new cycle, no
  recycling). Play Again resets `seenIds`, rebuilds the deck, and resets the
  timer. The 60 s timer, +3 s / −5 s deltas, 800 ms / 400 ms reveals, shake,
  delta labels, and keyboard shortcuts are unchanged.

### 28.5 Tiny-pool / exhaustion behavior

- **Pool of 2:** after consuming the first item, the second is carried and the
  first is reshuffled back, giving a valid 2-item deck (`[carried, fresh]`).
  No empty state.
- **Pool of 3:** two correct answers are possible; the third item is carried
  into the next cycle (Classic) or the run ends cleanly (Time Attack).
- **All-equal values:** adjacent-equal avoidance is best-effort; item-ID
  uniqueness is preserved (the primary correctness rule).

### 28.6 Verification

| Check | Method | Status |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | `[Pass]` |
| Lint | `npm run lint` | `[Pass]` (0 errors; 2 pre-existing warnings) |
| Build | `npm run build` | `[Pass]` |
| Pure deck logic (edge cases 1–10) | compiled `lib/game/deck.ts` + Node harness | `[Pass]` |
| Classic no-repeat before exhaustion | Playwright, 82-item pool | `[Pass]` (82/82 unique in cycle 1) |
| Classic cycle boundary | Playwright | `[Pass]` (no immediate repeat) |
| Classic wrong-answer game-over | Playwright | `[Pass]` |
| Classic Play Again | Playwright | `[Pass]` (score reset, best retained) |
| Time Attack no-repeat in session | Playwright, 25 rounds | `[Pass]` (25/25 unique) |
| Time Attack +3 s bonus | Playwright | `[Pass]` |
| Time Attack −5 s penalty + continue | Playwright | `[Pass]` |
| Time Attack timer expiry | Playwright | `[Pass]` ("Time's up" modal) |
| Time Attack Play Again | Playwright | `[Pass]` (timer 60, score reset) |
| Regression: Game Rating (SteamSpy) | Playwright, 20 rounds | `[Pass]` (20/20 unique) |
| Browser console errors | Playwright | `[Pass]` (0 errors) |

- **Pre-existing lint warnings (not introduced by this pass):**
  `components/game/TimeAttackGame.tsx:145` unused `eslint-disable` directive
  (on the unchanged timer effect) and `lib/api/worldbank.ts:22` unused
  `WorldBankMeta`. Left untouched per scope discipline.
- **Temporary diagnostics:** a `.tmp-deck-verify/` directory (compiled
  `deck.js` + a Node harness) was created for pure-logic verification and
  **fully removed**. No diagnostic routes or test-only production behavior
  were added.

### 28.7 Remaining Needs Verification

- **Needs Verification [environment-specific]:** the Playwright checks ran
  against the local dev server at `http://localhost:3000`; results are
  environment-specific.
- **Needs Verification [inferred-from-codebase]:** the single-pass
  `dedupeAdjacentEquals` cannot fully resolve a run of three or more equal
  values (e.g. `[5,5,5,9]`). This is pre-existing behavior reused verbatim;
  item-ID uniqueness is unaffected.

### 28.8 Phase status

Phase 0 and Phase 1 are **complete**. Phase 2 implementation and its initial
verification are recorded below; its post-rotation security/runtime acceptance
is closed in Section 30. Browser image delivery remains a separately recorded
environment-specific limitation and does not block that acceptance.

## 29. Phase 2 YouTube catalog scaling implementation and verification log

> **Date:** 2026-10-14
> **Scope:** YouTube Subscribers identity catalog scaling only. No other
> provider, category availability, repeat behavior, or deferred category was changed.

### 29.1 Architecture and changed files

Developer-run bounded YouTube Data API v3 discovery collects channel IDs and
curated bootstrap seeds, deduplicates them, resolves public live channel fields
with `channels.list`, validates IDs/title/subscriber count/thumbnail, and writes
only sorted `{ channelId, title }` identities plus version/source/timestamp.
Normal runtime reads and validates that identity file, calls `channels.list`
in batches of at most 50, and creates `GameItem`s only from live title,
subscriber count, and thumbnail fields. Runtime never calls `search.list` and
does not fall back to `CURATED_CHANNELS`.

| File | Phase 2 change |
| --- | --- |
| `lib/api/youtubeChannelCatalog.ts` | New server-side reader/validator; identity-only schema, ID/order/duplicate checks, 50-record integrity minimum, fail-closed missing/malformed behavior. |
| `lib/api/data/youtube-channel-catalog.json` | New generated version-1 identity catalog; no subscriber counts, thumbnails, credentials, or run metrics. |
| `scripts/generate-youtube-channel-catalog.mjs` | New developer-run generator; bounded discovery, channel batch validation, metrics, atomic output, `--validate` mode. |
| `lib/api/youtube.ts` | Runtime loads generated identities and fetches fresh subscriber values/title/images; strict data validation and `ApiFetchError` propagation. |
| `lib/api/curatedPools.ts` | Clarified existing 13 YouTube IDs remain small bootstrap seeds only; no seed expansion. |
| `package.json` | Added `catalog:youtube-channels` script. |
| `docs/catalog-pool-and-repeat-plan.md` | This implementation/verification log. |

`app/api/test-fetch/route.ts` and `lib/api/index.ts` were not changed. Existing
normal diagnostic behavior and production `full=1` 404 guard remain intact; the
existing ≥2 dispatcher floor was not altered. The catalog reader uses 50 as
the approved YouTube identity-catalog integrity minimum, not a cap and not a
universal dispatcher runtime rule. Runtime also fails closed if stale/hidden
live data leaves fewer than 50 usable channels.

### 29.2 Generation and measured validation

The configured default generator run used five `search.list` calls (one page
each, at most 50 results each) and six `channels.list` calls (at most 50 IDs
per batch). It combined 13 bootstrap seeds with 250 search results and wrote
263 validated identities. No subscriber counts or thumbnails are snapshotted.

| Measure | Observed result |
| --- | ---: |
| `search.list` calls / results | 5 / 250 |
| Bootstrap seed identities | 13 |
| Raw valid-ID observations / unique IDs | 263 / 263 |
| Duplicate observations / rate | 0 / 0.00% |
| `channels.list` validation calls | 6 |
| Final identity count | 263 |
| Hidden / missing / non-numeric subscriber counts | 0 / 0 / 0 |
| Missing title / thumbnail / provider records | 0 / 0 / 0 |
| Subscriber range / median | 25–521,000,000 / 1,050,000 at generation; 25–521,000,000 / 736,000 in subsequent runtime diagnostic |
| Distinct values | 250 / 263 |
| Tie groups / items in ties | 13 / 26 |
| Seed identities retained in final catalog | 13 |
| Popularity cutoff | None; no approved threshold was applied |

The runtime diagnostic `GET /api/test-fetch?category=youtube-subscribers`
returned 263 normalized live items. It required six 50-ID-bounded
`channels.list` requests at this pool size and no runtime discovery calls.
The `full=1` route was also used for gameplay verification; it remains the
existing dev-only diagnostic behavior.

### 29.3 Verification status

| Check | Evidence | Status |
| --- | --- | --- |
| Generator syntax and `--validate` | Node syntax check; 263 sorted unique identity records | `[Pass]` |
| Catalog shape, IDs, uniqueness, order, secret-like patterns | JSON inspection and pattern scan; identity-only fields confirmed | `[Pass]` |
| Reader malformed metadata, malformed item, duplicate ID, below 50 | In-memory TypeScript-transpiled reader harness | `[Pass]` |
| Missing catalog / malformed JSON / duplicate IDs / below 50 through reader | Temporary OS-directory harness; all four fail closed; directory removed afterward | `[Pass]` |
| Mock runtime stale/hidden filtering, batch limit, no search, missing key, HTTP 403 | In-memory adapter harness; one hidden and one stale ID filtered; 261 remain; six mocked channels calls | `[Pass]` |
| Live diagnostic route | Browser request returned 263 normalized items, >13 | `[Pass]` |
| YouTube Classic gameplay and no-repeat sample | Playwright: 12 consecutive correct transitions, 12 distinct next-card names | `[Pass]` |
| Browser API/key exposure | Browser performance/network checks showed zero YouTube API/key requests | `[Pass]` |
| Thumbnail rendering | Later gameplay sample had a loaded provider image; two earlier image loads blocked by browser ORB | `[Partial]` — TODO: recheck broader image delivery in a browser/network environment that permits these image responses. |
| Unrelated category regression | SteamSpy Game Rating route rendered values and two cards | `[Pass]` |
| Browser console errors | 0 errors; one pre-existing smooth-scroll development warning | `[Pass]` |
| TypeScript | `npx tsc --noEmit` | `[Pass]` |
| Lint | `npm run lint` | `[Pass]` (0 errors; 2 existing warnings in TimeAttackGame and WorldBank) |
| Production build | `npm run build` | `[Pass]` |
| Invalid API credential live rejection | Deliberately invalid credential probe returned a provider rejection; value and body were omitted | `[Pass]` |
| Provider quota failure | Mocked HTTP 403 propagates as `ApiFetchError`; no quota was intentionally exhausted | `[Pass]` |
| Production client assets credential patterns | Scanned built `.next/static` JS/CSS/JSON asset sources; no key/credential pattern found | `[Pass]` |

No temporary verification files were created. Browser network/runtime inspection
showed no client-side YouTube API request or key. The live diagnostic server
performed only the expected six `channels.list` runtime calls; generator quota
usage was five `search.list` plus six `channels.list` calls.

### 29.4 Credential handling and remaining verification

The configured credential value was previously exposed by tooling during the
initial presence check. It was not repeated, logged, written into the catalog,
documentation, temporary files, responses, screenshots, or client code during
this implementation. Credential rotation is still recommended after this
scoped work is complete.

- **Needs Verification [environment-specific]:** project-specific YouTube API
  quota headroom is not independently known; observed run used five search
  calls and eleven total `channels.list` calls across generation/runtime.
- **Needs Verification [environment-specific]:** some channel thumbnails were
  blocked by the browser's ORB/network environment, though provider thumbnail
  URLs were present and other images loaded.
- **Needs Verification [environment-specific]:** browser gameplay was exercised
  against the local dev server and reflects that environment.

### 29.5 Phase status

Phase 2 implementation and its initial verification are complete. The later
post-rotation security closure and gate status are recorded in Section 30; that
section is authoritative for whether Phase 2 is fully closed. Phase 3 remains
unstarted pending the parent orchestrator's decision.

## 30. Phase 2 post-rotation security closure log

> **Date:** 2026-10-14
> **Scope:** Phase 2 post-rotation security/runtime acceptance — re-check the
> YouTube credential configuration, generated identity catalog, runtime, client
> exposure, and repository gates after the owner-reported key rotation. Browser
> image delivery is recorded as a non-blocking environment-specific limitation.

### 30.1 Credential and environment reload

- **Owner-reported:** the previously exposed [`YOUTUBE_API_KEY`](lib/api/youtube.ts:66) was revoked and
  a replacement was configured locally. The credential value was not recorded
  or displayed.
- **[Pass]** The prior Next dev process was stopped and [`.next`](.gitignore:17) was cleared before the replacement-authentication probe; the dev server was then restarted for runtime/browser verification.
- **[Pass]** [`.env.local`](.gitignore:35) and [`.next`](.gitignore:17) are ignored by Git. Environment-file
  contents were not included in output or documentation.
- **[Pass]** [`process.env.YOUTUBE_API_KEY`](lib/api/youtube.ts:66) is read on the
  server. The targeted source scan found no `NEXT_PUBLIC_` YouTube credential
  reference.

### 30.2 Replacement authentication and bounded generation

- **[Pass]** After stopping the dev server and clearing [`.next`](.gitignore:17), the replacement-authentication probe returned HTTP 200; it resolved live channel statistics, title, and HTTPS thumbnail metadata. The request URL and response body were suppressed.
- **[Pass]** The existing [`catalog:youtube-channels` script](package.json:12) ran once at its unchanged five-search-call
  budget and atomically replaced the generated identity catalog.

| Measure | Post-rotation result |
| --- | ---: |
| `search.list` calls / results | 5 / 250 |
| `channels.list` validation calls | 6 |
| Raw valid-ID observations / unique candidates | 263 / 263 |
| Duplicate observations / rate | 0 / 0.00% |
| Final generated identity count | 263 |
| Hidden / missing / non-numeric subscriber counts | 0 / 0 / 0 |
| Missing title / thumbnail / provider records | 0 / 0 / 0 |
| Live subscriber range | 25–521,000,000 |
| Distinct values / items | 249 / 263 |
| Tie groups / items in ties | 14 / 28 |
| Bootstrap seed identities retained | 13 |

- **[Pass]** [`npm run catalog:youtube-channels -- --validate`](package.json:12) accepted all 263
  unique, sorted records without making provider calls. Structural inspection
  confirmed only identity fields ([`channelId`](lib/api/youtubeChannelCatalog.ts:12),
  [`title`](lib/api/youtubeChannelCatalog.ts:13)) in records and no
  credential-, subscriber-, thumbnail-, or metric-like field names. The
  generator sorts identities before its atomic write; [`generatedAt`](scripts/generate-youtube-channel-catalog.mjs:339) is the
  time-varying catalog metadata. The generator was intentionally run once; a
  second live run to compare output equality was **[Not tested]**.
- **[Pass]** [`lib/api/youtube.ts`](lib/api/youtube.ts:65) loads the generated identities,
  reads the server-only credential, and calls only batched `channels.list` at
  runtime. [`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:61) remains the 13-ID seed list consumed
  by generation, not runtime authority.

### 30.3 Runtime and client/browser security

- **[Pass]** The normal diagnostic route ([`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:86)) returned 263 usable normalized live
  items (sampled records had name, integer value, and HTTPS image URL), well
  above the prior 13-item pool. At the 50-ID adapter batch size
  ([`ID_BATCH_SIZE`](lib/api/youtube.ts:56)), 263 identities require 6
  `channels.list` batches, calculated from the live item count and source batch
  bound; individual provider calls were not instrumented. Runtime discovery is absent from the
  adapter source; no runtime `search.list` is used.
- **[Pass]** Browser network inspection during YouTube Classic showed no
  client-side Google/YouTube API request or key-bearing API URL. A production
  `.next/static` scan of 16 client assets found zero `YOUTUBE_API_KEY` name,
  YouTube Data API URL, Google API-key-pattern, or `NEXT_PUBLIC_` credential
  matches.
- **[Pass]** Playwright exercised Classic; sampled visible thumbnail checkpoints rendered 1/1 and later 2/2 images. Browser network inspection showed no client-side `googleapis.com` or key-bearing API requests, and no direct provider calls were made during the browser retry.
- **[Partial]** Other image requests were blocked by browser ORB behavior, and localhost refusal was intermittent. No browser console errors or warnings were observed. These environment effects prevent a broad image-delivery conclusion despite successful sampled renders.
  TODO: recheck broader thumbnail loading in a browser/network environment that permits all provider image responses. **Needs Verification [environment-specific]**.

### 30.4 Repository checks and gate status

| Check | Result |
| --- | --- |
| [`npx tsc --noEmit`](package.json:31) | `[Pass]` |
| [`npm run lint`](package.json:9) | `[Pass]` — 0 errors; 2 existing warnings in [`TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:145) and [`worldbank.ts`](lib/api/worldbank.ts:22) |
| [`npm run build`](package.json:7) | `[Pass]` |
| Generated catalog validator | `[Pass]` — 263 unique, sorted identities |
| Credential/client exposure checks | `[Pass]` — no exposure observed in generated data, source references, browser requests, or production client assets |
| Browser thumbnail rendering | `[Partial]` — sampled visible images rendered (1/1 and later 2/2 checkpoints), while other requests were blocked by ORB; broader delivery remains `Needs Verification [environment-specific]` (see TODO above) |
| Repeated-run determinism comparison | `[Not tested]` — generator was run only once as requested |

**Post-rotation security and runtime acceptance:** **complete**. The owner
reported revocation of the old credential and server-side configuration of the
replacement; no credential values were recorded or inspected. Authentication,
runtime, client-boundary, asset-scan, and repository checks passed, with no
credential exposure observed. The browser image limitation is non-blocking for
this security/runtime acceptance: **Needs Verification [environment-specific]**
for broader image delivery because ORB blocked some requests despite successful
sampled renders. Phase 2 is complete; Phase 3 is handled separately below.

### 30.5 Files changed in this closure

- [`lib/api/data/youtube-channel-catalog.json`](lib/api/data/youtube-channel-catalog.json) — regenerated by the approved
  bounded generator; 263 identity-only records.
- [`docs/catalog-pool-and-repeat-plan.md`](docs/catalog-pool-and-repeat-plan.md:1226) — this post-rotation verification log.

No provider, runtime, client, route, or Phase 3 implementation files were
modified.

## 31. Phase 3 Number of Albums catalog scaling implementation log

> **Date:** 2026-10-14
> **Scope:** developer-run MusicBrainz artist discovery and regeneration of the
> existing Number of Albums snapshot only. No Phase 4 work is authorized here.

### 31.1 Approved implementation and metric invariants

This phase implements the Section 16.1 approved approach: diverse, bounded
MusicBrainz group-tag searches; exact MBID identity and deduplication; existing
17 curated artists as seeds, not a final cap; and only validated artists in the
existing offline runtime snapshot. Album values remain the number of
release-group records whose `primary-type` is exactly `Album`, counted across
all pages for the exact artist MBID. Artist imagery remains the exact Wikidata
`P434` → `P18` mapping, with the existing deterministic selection and per-file
Commons license/attribution path; records without usable images are rejected.

| File | Phase 3 change |
| --- | --- |
| `lib/api/musicbrainz.ts` | Accept a generation-time exact artist list, keep seed defaults, preserve all-pages Album release-group counting and existing image resolution; report internal rejection/metric aggregates for generation. |
| `lib/api/artistAlbumCountsSnapshot.ts` | Fail closed on malformed/duplicate/non-exact MBID identities and non-deterministic ordering while retaining minimum-pool validation. |
| `lib/api/wikidataArtistImages.ts` | Expose safe diagnostic image/license aggregates for generation; resolve the exact MBID mapping in bounded 50-MBID SPARQL batches with pacing and bounded 503 retry; retain exact join, deterministic selection, and per-file licensing behavior. |
| `scripts/generate-artist-album-counts-snapshot.mjs` | Bounded eight-query MusicBrainz discovery, 50 results/query; include seeds; exact dedupe; >=1.1s pacing and descriptive User-Agent; post discovered MBIDs to the dev route; write public-only deterministic snapshot and safe aggregate metrics. |
| `app/api/test-fetch/route.ts` | Add discovered-MBID POST handoff, dev-only with a production 404; preserve existing GET diagnostics and GET `full=1` production 404 guard. |
| `lib/api/data/artist-album-counts.snapshot.json` | Intended regenerated output; unchanged because the live generator call failed before atomic write. |
| `docs/catalog-pool-and-repeat-plan.md` | Phase 3 implementation and verification log. |

No `package.json` dependency/script change is required; the existing snapshot
script is extended. No Phase 4 files or Album Release Date settings are in
scope.

### 31.2 Generation measurements

| Measure | Observed result |
| --- | ---: |
| Discovery queries / search pages / requests | One observed successful discovery pass: 8 queries/pages, 8 MusicBrainz search requests |
| Raw valid MBID observations / unique discovered MBIDs / duplicates | Latest successful discovery log: 400 raw observations, 301 unique discovered MBIDs, 110 duplicate observations, 0 invalid records |
| Seeds included / final candidate list | 17 seeds; 11 overlaps; 307 exact unique candidates in the generation attempt |
| Rejections by reason (invalid/duplicate, count failure, no P18 image, Commons metadata/image failure, malformed) | Discovery: 110 duplicates and 0 invalid records. The route later completed in 5.1 minutes, but the generator did not receive a successful payload; per-candidate count/image/Commons rejection totals are unavailable. No snapshot write occurred. |
| Album-count range / distinct values / tie groups and tied items | Expanded catalog: unavailable. Retained prior snapshot: 15–1,285; 16 distinct values; 1 tie group / 2 tied items. |
| Wikidata image coverage | Expanded catalog: unavailable. The previous snapshot has 17/17 image URLs. |
| Commons license/attribution distribution | Expanded catalog: unavailable. Previous snapshot: 10 attribution fields, 7 without attribution; unknown licensing was not recalculated for this handoff. |
| Generation duration / minimum and observed request spacing | Dev route completed in 5.1 minutes; generator received no successful result/write. Discovery is configured for a minimum 1,150 ms between MusicBrainz requests; observed spacing metrics for this failed run were not returned. |

**Generation outcome:** the dev server recorded `POST /api/test-fetch 200` after 5.1 minutes, but the generator process exited without replacing the file or reporting final success metrics. The live MusicBrainz/Wikidata/Commons adapter therefore cannot be treated as a successful expanded-catalog generation. A later file read confirmed the snapshot remained its prior 17-item version (`generatedAt` `2026-10-13T21:46:16.083Z`, 5,745 bytes). The provider-side failure detail was not preserved in terminal output; do not infer a specific provider or rejection cause from the HTTP status alone.

The discovery-only portion did complete: eight bounded tag searches produced 400 raw observations; exact-MBID dedupe retained 301 discovered MBIDs, with 110 duplicate observations and no invalid records. The 17 seeds had 11 overlaps, yielding 307 candidates. This is discovery evidence only, not a generated snapshot.

No catalog-size cap is applied after validation. If Commons metadata cannot
determine the licensing/attribution treatment for a material share, or a new
policy choice is needed, generation must stop without replacing the prior
snapshot.

### 31.3 Runtime and verification

The runtime dispatcher continues to read only
`lib/api/data/artist-album-counts.snapshot.json`; MusicBrainz search/browse,
Wikidata SPARQL, and Commons metadata APIs are generator/dev-route-only. The
browser and diagnostic checks below used the retained 17-item snapshot, not an
expanded catalog.

| Check | Evidence | Status |
| --- | --- | --- |
| Retained snapshot schema, exact unique MBIDs, stable sort, public-only fields | JSON/source inspection: 17 items, 17 unique valid MBIDs, sorted, required fields valid, no extra item fields; range 15–1,285, 16 distinct values, one 2-item tie group, 10 attribution lines | `[Pass]` for retained snapshot only; not evidence for expansion |
| Missing/malformed/duplicate/subminimum snapshot behavior | Transpiled reader harness: valid data accepted; malformed item, duplicate MBID, unsorted data, and one-item pool rejected | `[Pass]` for tested parser cases; missing-file and malformed-JSON cases not tested |
| Runtime source trace: local snapshot only; no MusicBrainz/Wikidata/Commons | Dispatcher maps `artist-album-counts` to `fetchArtistAlbumCountsFromSnapshot`; browser loaded Commons image resources only, no MusicBrainz, Wikidata, Commons API, or test-fetch resources | `[Pass]` source/runtime observation for sampled gameplay |
| Runtime snapshot load time | `GET /api/test-fetch?category=artist-album-counts` returned 200 with 17 items; local command measured 137.7 ms end-to-end | `[Pass]` for local dev diagnostic; environment-specific, not a production latency claim |
| Browser Number of Albums gameplay | Classic route rendered the retained snapshot; two cards and image-attribution text were visible; both sampled Commons images loaded | `[Pass]` for retained snapshot only |
| Browser unrelated-category regression and network/console | Semantic `game-rating` route rendered two Steam game cards/images; zero MusicBrainz/Wikidata/Commons API/test-fetch resources; zero browser console errors | `[Pass]` |
| TypeScript / lint / build | `npx tsc --noEmit`; `npm run lint` (0 errors, 2 existing warnings); fresh `npm run build` completed successfully | `[Pass]` |

### 31.4 Remaining Needs Verification

- Expanded snapshot generation and per-candidate album/image/license metrics
  remain unavailable after the route returned 200 but no generated payload was
  written. **Needs Verification [capability-unavailable]** for expanded
  provider-generation evidence. TODO: diagnose the failed generator response
  and complete one bounded generation before marking Phase 3 done.
- The generator was not re-run after that attempt. Actual observed request
  spacing for the failed run is **[Not tested]**; configured pacing was source
  inspected.
- Browser image delivery is **[Pass]** for two sampled Commons images in this
  session. Broader delivery remains **Needs Verification [environment-specific]**
  because previous runs encountered ORB/network blocks.
- Missing-file and malformed-JSON reader behavior remains **[Not tested]**.

### 31.5 Phase status

Phase 3 is **incomplete**: bounded discovery, implementation, retained-snapshot
validation, source trace, browser smoke/regression, and repository checks have
evidence above, but no expanded snapshot was successfully written. Keep the
previous 17-item snapshot in place. Phase 4 remains unstarted and must not begin
as part of this task.

## 32. Phase 3 diagnostic-validation fix and bounded rerun addendum

> **Date:** 2026-10-14
> **Scope:** generator-only diagnostic-validation fix plus one bounded,
> provider-compliant generation attempt. No Phase 4 work. The analysis document
> was not modified.

### 32.1 Generator fix (diagnostic validation before write)

Only [`scripts/generate-artist-album-counts-snapshot.mjs`](scripts/generate-artist-album-counts-snapshot.mjs:1)
changed. Two helpers were added and the write path was reordered:

- `validateGenerationDiagnostics(payload)` validates the required response
  diagnostics **before** any snapshot write/rename: the integer counts
  `candidates`, `countedArtists`, `missingP18`, `commonsMetadataFailures`,
  `missingImages`, and the `licenseAttribution` object with its four integer
  counters (`attributionRequired`, `attributionNotRequired`, `unknownLicense`,
  `requiredButNoCredit`). A missing or malformed field fails closed with an
  error naming only the offending field.
- `formatSafeAggregates(diagnostics)` renders the fail-closed licensing error
  with safe aggregate counters only (candidate total, counted total, Commons
  metadata failure count, missing-P18/missing-image counts, and the four
  license counters). It never prints artist names, MBIDs, image URLs, response
  bodies, or credentials.
- The licensing gate now runs **before** `mkdirSync`/`writeFileSync`/`renameSync`
  and reads the validated `diagnostics` object, so a licensing failure can no
  longer bypass the guard or fail after the atomic write attempt. No existing
  validation gate or threshold was weakened; album-count semantics, pacing,
  discovery queries, and the route/adapter were not changed.

### 32.2 Local mocked regression (no provider calls, no real write)

A temporary harness (since removed) redirected `SNAPSHOT_PATH` to a temp file,
stubbed discovery, and served controlled payloads from a local HTTP server.

| Case | Result | Status |
| --- | --- | --- |
| Valid payload reaches the intercepted write | exit 0; temp snapshot written | `[Pass]` |
| Missing `licenseAttribution` fails before write | exit 1; no write; error names `licenseAttribution` | `[Pass]` |
| Malformed `commonsMetadataFailures` fails before write | exit 1; no write; error names `commonsMetadataFailures` | `[Pass]` |
| Malformed `licenseAttribution.unknownLicense` fails before write | exit 1; no write; error names `unknownLicense` | `[Pass]` |
| Licensing-threshold failure reports safe aggregates, no write | exit 1; no write; aggregates printed; no names/URLs leaked | `[Pass]` |

The committed snapshot was byte-identical before and after the mocked run
(`committedUnchanged: true`). The temporary harness and its output file were
removed; `scripts/` contains only the three committed generators.

### 32.3 Bounded live attempt outcome

One bounded attempt was run with the existing approved budget and pacing
(8 discovery queries, 50 results/query, ≥1,150 ms MusicBrainz spacing,
descriptive User-Agent). Discovery completed: 8 queries/pages, 400 raw
observations, 300 unique discovered MBIDs, 111 duplicate observations, 0
invalid records, 17 seeds (11 overlaps), 306 total candidates. The generator
then POSTed the 306 exact MBIDs to the dev route.

The dev server logged `POST /api/test-fetch 200 in 5.1min`, but the generator's
client `fetch` failed with `fetch failed` before receiving the response body.
The route completed successfully; the generator's HTTP client gave up first.
This is consistent with Node's undici default 5-minute body timeout being
exceeded by the 5.1-minute route duration. **No snapshot was written**; the
committed snapshot remains the prior 17-item version (`generatedAt`
`2026-10-13T21:46:16.083Z`).

Because the generator never received a response payload, no route-side
aggregate diagnostics (album-count range, image coverage, license/attribution
distribution) were captured for this attempt. The failure is a client-side
fetch-timeout condition, not a diagnostic-validation or licensing-gate failure;
the diagnostic-validation fix was not exercised by this live attempt.

### 32.4 Repository checks

| Check | Evidence | Status |
| --- | --- | --- |
| `npx tsc --noEmit` | exit 0 | `[Pass]` |
| `npm run lint` | 0 errors, 2 pre-existing warnings (`TimeAttackGame.tsx`, `worldbank.ts`); unrelated to this change | `[Pass]` |
| `npm run build` | Next.js 16.3.4 production build completed successfully | `[Pass]` |

### 32.5 Remaining Needs Verification

- Expanded snapshot generation remains **Needs Verification
  [capability-unavailable]**. The bounded attempt failed at the generator's
  client fetch (5-minute undici body timeout vs a 5.1-minute route), so no
  expanded snapshot or per-candidate metrics were produced. TODO: address the
  generator's client-side fetch timeout (a separate, out-of-scope change) and
  re-run one bounded attempt.
- The diagnostic-validation fix is verified by local mocks only; it was not
  exercised by the live attempt because no response payload was received.
- Browser smoke checks for an expanded snapshot are **[Not tested]** (no
  expanded snapshot exists). The retained 17-item snapshot's runtime
  snapshot-only path is unchanged and was verified in Section 31.3.

### 32.6 Phase status

Phase 3 remains **incomplete**. The generator diagnostic-validation fix is
implemented and locally verified, and repository checks pass, but no expanded
snapshot was written. Keep the previous 17-item snapshot in place. Phase 4
remains unstarted and must not begin as part of this task.

## 33. Phase 3 client-timeout fix and successful bounded rerun addendum

> **Date:** 2026-10-14
> **Scope:** generator-only client-timeout fix plus one bounded,
> provider-compliant generation attempt that produced the expanded snapshot.
> No Phase 4 work. The analysis document was not modified.

### 33.1 Root cause and generator fix (client timeout)

The Section 32.3 failure was reproduced and diagnosed. The dev route completed
successfully (`POST /api/test-fetch 200 in 5.1min`), but the generator's client
`fetch` failed with `fetch failed` before receiving the body. An isolated probe
against a deliberately slow local server confirmed the cause:

- Node 24.13.1 bundles undici 7.18.2. Its default `headersTimeout`/`bodyTimeout`
  is 300 s and fires **independently** of any `AbortSignal`.
- A first fix attempt using `AbortSignal.timeout(15 min)` did **not** help: the
  bounded rerun still failed at ~5.1 min with `fetch failed`, because undici's
  300 s `headersTimeout` aborted the request regardless of the signal.
- The probe reproduced this exactly: `RESULT error after 305870ms: TypeError:
  fetch failed / CAUSE: HeadersTimeoutError: Headers Timeout Error`.

Only [`scripts/generate-artist-album-counts-snapshot.mjs`](scripts/generate-artist-album-counts-snapshot.mjs:1)
changed. The generation POST no longer uses global `fetch`; it uses a small
`postJson()` helper built on `node:http` with an explicit
`GENERATION_REQUEST_TIMEOUT_MS = 15 * 60 * 1000` request timeout. `node:http`
has no undici-style implicit 300 s body/headers timeout, so the client wait is
bounded only by the explicit finite timeout, which is comfortably above the
observed route duration. The route, adapter, discovery queries, pacing,
validation gates, thresholds, and album-count semantics were not changed.

### 33.2 Local mocked regression (no provider calls, no real write)

A temporary harness (since removed) copied the generator verbatim into a
throwaway temp project whose `lib/api/data/` held a sentinel snapshot, stubbed
MusicBrainz discovery via a `--import` preload that patched global `fetch`, and
served the generation POST from a local HTTP server. The generator source was
not modified.

| Case | Result | Status |
| --- | --- | --- |
| Valid payload reaches the intercepted write | exit 0; sentinel replaced | `[Pass]` |
| Missing `licenseAttribution` fails before write | exit 1; no write; error names `licenseAttribution` | `[Pass]` |
| Malformed `commonsMetadataFailures` fails before write | exit 1; no write; error names `commonsMetadataFailures` | `[Pass]` |
| Malformed `licenseAttribution.unknownLicense` fails before write | exit 1; no write; error names `unknownLicense` | `[Pass]` |
| Licensing-threshold failure reports safe aggregates, no write | exit 1; no write; aggregates printed; no names/URLs leaked | `[Pass]` |

The committed snapshot was byte-identical before and after the mocked run
(`committedUnchanged: true`). The new `node:http` timeout did not break the
normal mocked path. The temporary harness and probe were removed; `scripts/`
contains only the three committed generators.

### 33.3 Bounded live attempt outcome (success)

One bounded attempt was run with the existing approved budget and pacing
(8 discovery queries, 50 results/query, ≥1,150 ms MusicBrainz spacing,
descriptive User-Agent). Discovery completed: 8 queries/pages, 400 raw
observations, 300 unique discovered MBIDs, 111 duplicate observations, 0
invalid records, 17 seeds (11 overlaps), 306 total candidates. The generator
POSTed the 306 exact MBIDs to the dev route.

The dev server logged `POST /api/test-fetch 200 in 10.8min`. The route took
longer than the earlier 5.1 min run because MusicBrainz returned HTTP 503 and
the adapter's bounded retry/backoff added time; the 15-minute `node:http`
timeout comfortably outlasted it. The generator received the payload and wrote
the expanded snapshot atomically.

| Measure | Observed result |
| --- | ---: |
| Discovery queries / pages / MusicBrainz requests | 8 / 8 / 10 (2 retries) |
| Raw observations / unique discovered MBIDs / duplicates / invalid | 400 / 300 / 111 / 0 |
| Seeds / overlaps / total candidates | 17 / 11 / 306 |
| Counted artists | 306 |
| Final valid items written | 251 |
| Rejected: missing P18 image / Commons metadata / no resolved image | 55 / 0 / 55 |
| Album-count range | 7–1,402 |
| Distinct album-count values | 154 |
| Tie groups / items in ties | 65 / 162 |
| Image coverage | 251/306 |
| Attribution present / absent | 199 / 52 |
| License: attribution required / not required / unknown / required-without-credit | 199 / 52 / 0 / 0 |
| Generation duration | 675,367 ms (~11.3 min) |
| Observed MusicBrainz spacing | 1,150–15,212 ms (minimum required 1,150 ms) |

The licensing gate passed (unknown license 0, required-without-credit 0), so the
atomic write proceeded. The snapshot `generatedAt` is `2026-10-14T18:36:49.393Z`.

### 33.4 Snapshot and runtime verification

| Check | Evidence | Status |
| --- | --- | --- |
| Snapshot schema | `version: 1`, `generatedAt`, `source`, `items` present | `[Pass]` |
| Unique exact MBIDs | 251 items, 251 unique IDs, 0 non-MBID IDs | `[Pass]` |
| Deterministic ordering | items sorted ascending by MBID | `[Pass]` |
| Public-only content | no extra item fields; only `id`, `name`, `imageUrl`, `value`, `displayValue`, optional `attribution`; all image URLs HTTPS | `[Pass]` |
| Secret scan | no `api_key`/`token`/`secret`/`password`/`bearer`/`authorization` patterns in the snapshot | `[Pass]` |
| Runtime snapshot-only path (source trace) | [`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:30) imports only `node:fs`, `node:path`, `@/types/api`; dispatcher maps `artist-album-counts` to `fetchArtistAlbumCountsFromSnapshot` ([`lib/api/index.ts`](lib/api/index.ts:50)) | `[Pass]` |
| Runtime snapshot load | `GET /api/test-fetch?category=artist-album-counts` returned `totalItems: 251` in ~14–19 ms application time | `[Pass]` (local dev; environment-specific) |
| Rendered gameplay HTML | `/game/classic?category=number-of-albums` returned HTTP 200 with 256 `albums` mentions and Commons image URLs; **no** MusicBrainz/Wikidata API URLs | `[Pass]` |
| Browser Number of Albums gameplay | Chrome DevTools MCP: Classic rendered expanded-snapshot items (e.g. "The Sugarhill Gang" 22 albums vs "K.I.Z") with Commons images and attribution lines | `[Pass]` |
| Browser network (snapshot-only) | Chrome DevTools MCP: zero XHR/fetch requests on the Number of Albums page; no MusicBrainz/Wikidata/Commons API calls | `[Pass]` |
| Unrelated category regression | Chrome DevTools MCP: `/game/classic?category=game-rating` rendered Steam items (Last Epoch vs Brawlhalla) | `[Pass]` |
| Browser console errors | Chrome DevTools MCP: zero console errors/warnings on both categories | `[Pass]` |

### 33.5 Repository checks

| Check | Evidence | Status |
| --- | --- | --- |
| `npx tsc --noEmit` | exit 0 | `[Pass]` |
| `npm run lint` | 0 errors, 2 pre-existing warnings (`TimeAttackGame.tsx:145`, `worldbank.ts:22`); unrelated to this change | `[Pass]` |
| `npm run build` | Next.js 16.3.4 production build compiled successfully | `[Pass]` |

### 33.6 Remaining Needs Verification

- Broader Commons image delivery remains **Needs Verification
  [environment-specific]**: sampled Commons images rendered in this session, but
  previous runs encountered ORB/network blocks.
- The generator was run once; a second live run to compare output equality was
  **[Not tested]**.
- Browser gameplay was exercised against the local dev server and reflects that
  environment. **Needs Verification [environment-specific]**.

### 33.7 Phase status

Phase 3 is **complete**: the generator client-timeout fix is implemented and
locally verified, one bounded provider-compliant attempt produced the expanded
251-item snapshot, and snapshot/runtime/repository checks pass. Phase 4 remains
unstarted and must not begin as part of this task.

## 34. Phase 4 Album Release Date expansion implementation log

> **Date:** 2026-10-15
> **Scope:** measure the current album-release-date generation cost, decide
> whether expansion is worthwhile, and — if justified — expand the snapshot via
> a bounded target-fill generator. No Phase 5 work. The analysis document was
> not modified.

### 34.1 Decision: expansion accepted

Expansion was judged **worthwhile and practical** from measured evidence, not
assumption. The snapshot was expanded from **120 → 220 items**.

The key measured finding: the current pipeline iterated only the 17
`CURATED_ARTISTS` and stopped at `MAX_ALBUM_ITEMS = 120`; it did not consume the
Phase 3 discovery pool at all. A bounded diagnostic sample of just **12**
discovered artists already yielded **123** valid albums — more than the entire
existing snapshot — because the per-artist cap (12), not provider yield, is the
binding constraint. Reaching ~200–250 albums therefore needs only ~20–25
artists, not an exhaustive crawl of all ~300 discovered artists.

### 34.2 Phase 4A — measured generation-cost drivers (before)

| Driver | Before | Evidence |
| --- | ---: | --- |
| Artist input count | 17 (`CURATED_ARTISTS`) | [`lib/api/curatedPools.ts`](lib/api/curatedPools.ts:37) |
| `MAX_RELEASE_GROUPS_PER_ARTIST` | 12 | [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:76) |
| `MAX_ALBUM_ITEMS` | 120 | [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:78) |
| MusicBrainz browse requests | ~17–34 (1–2 pages/artist) | [`fetchAllAlbumReleaseGroups()`](lib/api/musicbrainz.ts:138) |
| CAA lookups | ≤ 204 (17 × 12) | [`resolveCoverArtUrlsBounded()`](lib/api/musicbrainz.ts:241) |
| Snapshot | 120 items, 120 unique IDs, 101 unique dates | measured |
| Runtime load | ~32 ms | measured (`GET /api/test-fetch?category=album-release-dates`) |

### 34.3 Bounded diagnostic sample (12 artists, no snapshot write)

A temporary diagnostic (since removed) ran the same 8-tag discovery and crawled
a deterministic MBID-sorted head of 12 artists.

| Measure | Observed |
| --- | ---: |
| Discovery | 8 pages, 400 raw, 307 total candidates (matches Phase 3) |
| Release groups inspected | 1,019 |
| Candidates with usable date | 144 (8 no-date, 0 bad-date) |
| CAA requests / redirect success / 404 / network error | 144 / 123 / 15 / 6 |
| Emitted unique albums | 123 |
| Unique artists represented | 12 / 12 |
| MusicBrainz requests / retries | 27 / 3 |
| Duration | 104.6 s (~8.7 s/artist) |

Projection: ~8.7 s/artist × ~25 artists ≈ 3.6 min — within the "several-minute
generator is acceptable" bound. A full 251-artist crawl (~36 min) was rejected
as an unnecessarily long exhaustive crawl.

### 34.4 Implementation (bounded target-fill)

| File | Phase 4 change |
| --- | --- |
| [`lib/api/musicbrainz.ts`](lib/api/musicbrainz.ts:1) | Added `generateAlbumReleaseDates(artists, { targetItems })` — deterministic MBID-sorted artist ordering, per-artist cap, bounded target-fill stop, and generation diagnostics. `fetchAlbumReleaseDates()` now delegates to it with the historical 120 bound so the live seed-only path is unchanged. |
| [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:1) | POST handoff now accepts `category: "album-release-dates"` plus an optional `targetItems` budget; shared `parseArtistList()` validation. Production 404 guard and existing `artist-album-counts` behavior preserved. |
| [`scripts/generate-album-release-date-snapshot.mjs`](scripts/generate-album-release-date-snapshot.mjs:1) | Added bounded 8-tag discovery (same config as Phase 3), POST handoff, fail-closed diagnostics validation, and atomic temp-file + rename write. |
| `lib/api/data/album-release-date.snapshot.json` | Regenerated: 220 items. |
| [`docs/catalog-pool-and-repeat-plan.md`](docs/catalog-pool-and-repeat-plan.md:1) | This Phase 4 log. |

No `package.json` change was required. `lib/catalog/availability.ts` was **not**
modified (the category was already promoted; a count change is not a promotion
event). No shared discovery helper was extracted: the discovery block is small
and the album generator reuses the identical 8-tag configuration; extracting a
generic provider framework was explicitly out of scope.

### 34.5 Generation measurements (accepted run)

| Measure | Observed |
| --- | ---: |
| Discovery | 8 queries/pages, 400 raw, 301 unique discovered MBIDs, 110 duplicates, 0 invalid, 17 seeds (11 overlaps), 307 candidates |
| Artists actually crawled | 22 |
| MusicBrainz requests / retries | 11 / 3 |
| Observed MusicBrainz spacing | 1,155–15,261 ms (minimum required 1,150 ms) |
| Release groups inspected | 1,707 |
| Records with dates / missing date | 253 / 12 |
| CAA requests / success / genuine missing / failures | 253 / 220 / 33 / 0 |
| Final valid items written | 220 |
| Generation duration | 127,751 ms (~2.1 min) |

### 34.6 Catalog quality (before → after)

| Metric | Before | After |
| --- | ---: | ---: |
| Items | 120 | 220 |
| Unique release-group IDs | 120 | 220 |
| Unique date values | 101 | 179 |
| Tie groups / largest tie | 16 / 3 | 23 / 8 |
| Date range | 1963–2026 | 1956–2026 |
| Precision: year-only / year-month / full-date | 48 / 5 / 67 | 75 / 12 / 133 |
| Artists represented | 17 | 22 |
| Max albums by one artist | 12 | 12 |
| Image coverage | 120/120 | 220/220 |
| Deterministic MBID sort | yes | yes |
| Extra item fields / secret patterns | none | none |

Expansion **materially improved gameplay diversity**: +100 items, +78 unique
dates, a wider date range, and more artists represented, while the per-artist
cap kept any single artist from dominating (max 12, unchanged). Partial-date
precision is preserved (no fabricated month/day).

### 34.7 Runtime and fail-closed verification

| Check | Evidence | Status |
| --- | --- | --- |
| Runtime snapshot load | `GET /api/test-fetch?category=album-release-dates` returned `totalItems: 220` in ~19 ms | `[Pass]` (local dev; environment-specific) |
| Runtime snapshot-only path | Dispatcher maps `album-release-dates` to `fetchAlbumReleaseDatesFromSnapshot`; reader imports only `node:fs`, `node:path`, `@/types/api` | `[Pass]` |
| Zero runtime discovery | Browser network: only archive.org image CDN requests; **no** MusicBrainz/CAA metadata or test-fetch XHR/fetch | `[Pass]` |
| Fail-closed validation | 11/11 cases: valid accepted; missing/malformed/unsupported-version/duplicate-shape/subminimum rejected | `[Pass]` |
| Atomic write | Generator writes temp file + `renameSync`; `unlinkSync` on failure; prior snapshot retained on any gate failure | `[Pass]` (source-verified) |
| Browser Album Release Date gameplay | Classic rendered album titles, dates (incl. full-date `2015-10-22`), and covers; multiple rounds advanced with distinct items | `[Pass]` |
| Browser Number of Albums regression | Rendered expanded-snapshot items (Genesis 316 albums) with Commons images/attribution | `[Pass]` |
| Browser unrelated category regression | `game-rating` rendered Steam items (Sekiro 95% positive) | `[Pass]` |
| Browser console | Zero errors/warnings on all three categories | `[Pass]` |

### 34.8 Repository checks

| Check | Evidence | Status |
| --- | --- | --- |
| `npx tsc --noEmit` | exit 0 | `[Pass]` |
| `npm run lint` | 0 errors, 2 pre-existing warnings (`TimeAttackGame.tsx:145`, `worldbank.ts:22`); unrelated | `[Pass]` |
| `npm run build` | Next.js 16.3.4 production build compiled successfully | `[Pass]` |

### 34.9 Remaining Needs Verification

- Broader Commons/archive.org image delivery remains **Needs Verification
  [environment-specific]**: sampled covers rendered in this session, but
  previous runs encountered ORB/network blocks.
- The generator was run once; a second live run to compare output equality is
  **[Not tested]**.
- Browser gameplay reflects the local dev server. **Needs Verification
  [environment-specific]**.
- The `targetItems` default (220) is a generation budget chosen from measured
  yield; whether a different budget is preferable is a **Needs Verification
  [product-decision]**.

### 34.10 Phase status

Phase 4 is **complete**: measured evidence showed expansion is worthwhile and
practical, a bounded target-fill generator produced a verified 220-item
snapshot, and snapshot/runtime/repository/browser checks pass. Phase 5 remains
unstarted and must not begin as part of this task.

## 35. Phase 5 TMDB / IGDB bounded expansion implementation log

> **Date:** 2026-10-15
> **Scope:** evaluate the application-imposed bounds for TMDB
> `movie-series-rating`, `release-date`, `gross-revenue`, and IGDB
> `game-release-date`, and expand only where measured provider cost, latency,
> data quality, and gameplay depth justify it. No Phase 6 work. SteamSpy,
> deferred categories, YouTube, Number of Albums, and Album Release Date
> snapshots were not touched. The analysis document was not modified.

### 35.1 Method

Each category was evaluated independently. The question per category was:
"Does a larger bounded provider request produce meaningfully more
high-quality playable items at acceptable cost?" Valid outcomes were expand,
keep, or expand modestly. ~50 remained only the minimum readiness guideline.

Baseline (5A) and diagnostics (5B) were measured against the running dev
server and direct bounded provider probes on 2026-10-15. All provider calls
were server-side; no credential value was printed. The metric contracts were
preserved exactly:

- `movie-series-rating`: TMDB `vote_average` → numeric `GameItem.value` →
  existing `"x.x / 10"` `displayValue`. Media scope unchanged (movie-only
  path; TV-series support remains deferred per the approved availability
  decision).
- `release-date`: Movies → `release_date`; TV → `first_air_date`;
  media-prefixed IDs; source precision preserved; no invented dates.
- `gross-revenue`: movies only; TMDB reported revenue; `revenue > 0`; USD
  formatting; no TV approximation.
- `game-release-date`: IGDB `first_release_date`; IGDB covers; Twitch
  client-credentials auth; server-only credentials; module-scope token reuse;
  fail-closed behavior.

### 35.2 Baseline (5A) — exact pre-change measurements

| Category | Provider bound | Items | Unique IDs | Dup IDs | Unique values | Latency |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Movie/Series Rating | `PAGES_TO_FETCH = 5` | 82–85 | 71–84 | **1** | 28 | ~150 ms |
| Release Date | `PAGES_TO_FETCH = 5` (movies + TV) | 177 | 177 | 0 | 167 | ~92 ms |
| Gross Revenue | `PAGES_TO_FETCH = 5` + `DETAIL_BATCH_SIZE = 10` | 59–71 | 59–71 | 0 | 59–71 | ~3.8 s |
| Game Release Date | `GAME_LIMIT = 100` | 100 | 100 | 0 | 100 | ~1.5 s |

**Confirmed defect found during baseline:** `fetchMovieRatings()` did **not**
deduplicate by id, unlike `fetchReleaseDates()` and `fetchMovieGrossRevenue()`.
TMDB `/movie/popular` pages overlap between requests, so the same movie could
appear on more than one page and produce a duplicate `GameItem.id` (observed:
`1514026` "Buddy" twice). The item count also varied between calls (82 vs 85)
for the same reason. This is a genuine correctness issue in the ratings path,
not a size question, and is fixed in 5D.

### 35.3 Diagnostics (5B) — bounded larger-request measurements

Direct bounded provider probes (server-side, no credential output):

| Category | Current bound | Expanded bound | Raw | Unique IDs | Valid items | Unique values | Requests | Latency |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Movie/Series Rating | 5 pages | 10 pages | 200 | 186 | 166 | — | 10 list | ~0.3 s |
| Release Date | 5 pages | 10 pages | 400 | 380 | 380 | 356 | 20 list | ~3.5 s |
| Gross Revenue | 5 pages | 10 pages | 186 cand. | 186 | 146 | 146 | 10 list + 186 detail | ~7.1 s |
| Game Release Date | limit 100 | limit 200 | 200 | 200 | 200 | 193 | **1** | ~0.3–0.8 s |

Gross Revenue detail-call cost (the dominant cost):

| Candidate pages | List calls | Detail calls | Valid revenue | Rejected (`revenue <= 0`) | Latency |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 5 | 99 | 71 | 28 | ~4.1 s |
| 10 | 10 | 186 | 146 | 40 | ~7.1 s |

IGDB pagination behavior: `limit 200` returned 200 unique games with 0 missing
dates and 0 missing covers in a **single** request; `offset 100` also worked
(100 more unique games). No HTTP 429 was observed.

### 35.4 Decisions (5C) and implementation (5D)

| Category | Decision | Basis |
| --- | --- | --- |
| Movie/Series Rating | **Expand** (5 → 10 pages) + **fix duplicate-ID bug** | List pages are cheap; 10 pages ≈ 166 unique valid items vs ~82 with a duplicate ID. Dedupe added. |
| Release Date | **Expand** (5 → 10 pages) | 177 → 380 items, 167 → 356 unique dates, ~3.5 s for 20 list calls. Materially better diversity at low cost. |
| Gross Revenue | **Expand modestly** (5 → 10 pages) | 71 → 146 valid revenue items (+106%) at +87 detail calls and +2.9 s. Rejection rate stayed low (~21%). Detail fan-out remains bounded by `DETAIL_BATCH_SIZE`. |
| Game Release Date | **Expand** (100 → 200) | 200 unique games, 0 missing data, in a single bounded request at ~0.3–0.8 s — same request count as 100. |

Implementation (provider-specific bounded request budgets, no universal cap):

| File | Phase 5 change |
| --- | --- |
| [`lib/api/tmdb.ts`](lib/api/tmdb.ts:1) | Replaced the single `PAGES_TO_FETCH` with provider-operation-named budgets `RATING_PAGES = 10`, `RELEASE_DATE_PAGES = 10`, `GROSS_REVENUE_CANDIDATE_PAGES = 10`; `fetchListPages()` now takes an explicit page count; `fetchMovieRatings()` now calls `dedupeById()` before mapping. `DETAIL_BATCH_SIZE = 10` and the existing revalidate windows are unchanged. |
| [`lib/api/igdb.ts`](lib/api/igdb.ts:1) | Raised `GAME_LIMIT` from 100 to 200 with a documented bounded-budget comment. The query remains a single bounded request; auth, token caching, filtering, and fail-closed behavior are unchanged. |
| [`docs/catalog-pool-and-repeat-plan.md`](docs/catalog-pool-and-repeat-plan.md:1) | This Phase 5 log. |

No universal `MAX_CATALOG_ITEMS` / `TARGET_ITEMS = 200` was introduced. No
other provider adapter, dispatcher entry, availability flag, snapshot, or
deferred category was modified. `lib/catalog/availability.ts` was **not**
changed (all four categories were already playable; a count change is not a
promotion event).

### 35.5 Final pools (5E) — before → after

| Category | Before | After | Unique IDs | Dup IDs | Unique values | Tie groups / tied items | Latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Movie/Series Rating | 82–85 | **166** | 166 | **0** | 37 | 30 / 159 | ~0.65 s |
| Release Date | 177 | **380** | 380 | 0 | 356 | 18 / 42 | ~0.23 s |
| Gross Revenue | 59–71 | **146** | 146 | 0 | 146 | 0 / 0 | ~4.5 s |
| Game Release Date | 100 | **200** | 200 | 0 | 193 | 7 / 14 | ~1.4 s |

- **Missing target-field rate:** 0 for all four categories (every item has a
  name and a value/date).
- **Missing-image rate:** 0 for all four categories.
- **Duplicate rate:** 0 for all four categories after the ratings dedupe fix.
- **Movie/Series Rating ties:** 30 tie groups / 159 tied items is inherent to
  the metric — `vote_average` is rounded to one decimal on a 0–10 scale, so
  only 37 distinct values exist across 166 items. This is expected and is not
  a defect; the metric contract was preserved.
- **Gross Revenue:** 146 unique revenue values, 0 ties.

### 35.6 Fail-closed and security verification

| Check | Evidence | Status |
| --- | --- | --- |
| Unknown category | `GET /api/test-fetch?category=unknown-cat` → HTTP 400 with the valid-value list | `[Pass]` |
| Missing category | `GET /api/test-fetch` → HTTP 400 | `[Pass]` |
| Provider non-OK / 429 | Existing `ApiFetchError` throw paths in both adapters are unchanged; no 429 was observed during diagnostics | `[Pass]` (source-verified; no live 429 induced) |
| Missing API key / credentials | `requireApiKey()` (TMDB) and the Twitch credential check (IGDB) are unchanged and still throw `ApiFetchError` | `[Pass]` (source-verified) |
| `NEXT_PUBLIC_` provider secrets | Source scan for `NEXT_PUBLIC_TMDB` / `NEXT_PUBLIC_TWITCH` / `NEXT_PUBLIC_IGDB` found none | `[Pass]` |
| Client-side provider calls | Browser network log showed only localhost assets and image CDN requests; no TMDB/IGDB API call and no Twitch OAuth call from the client | `[Pass]` |
| Credential values in output | No credential value was printed during baseline, diagnostics, or verification | `[Pass]` |

### 35.7 Browser verification

| Category | Result | Status |
| --- | --- | --- |
| Movie/Series Rating (Classic) | 2 TMDB images loaded; "Resident Evil 7.3 / 10" vs "Coraline"; game-over modal and Play Again work | `[Pass]` |
| Release Date (Classic) | 2 TMDB images loaded; "The Social Reckoning 2026-10-07" vs "Demon Slayer…" | `[Pass]` |
| Gross Revenue (Classic) | 2 TMDB images loaded; "Coyote vs. Acme $98,338,086" vs "Hacksaw Ridge" | `[Pass]` |
| Game Release Date (Classic) | 2 IGDB covers loaded; "Bloodborne 2015-03-24" vs "Resident Evil 4" | `[Pass]` |
| Regression: Game Rating (SteamSpy, unmodified) | 2 Steam images loaded; "Don't Starve Together 95% positive" vs "Life is Strange 2" | `[Pass]` |
| Browser console | 0 errors / 0 warnings across all checked categories | `[Pass]` |
| Phase 1 no-repeat | Deck logic in `lib/game/deck.ts` is unchanged by Phase 5; the larger pools only increase the remaining-pool depth. The no-repeat behavior was verified in Phase 1 (Section 28.6) and is not affected by provider pool size. | `[Pass]` (logic unchanged; Phase 1 evidence retained) |

### 35.8 Repository checks

| Check | Evidence | Status |
| --- | --- | --- |
| `npx tsc --noEmit` | exit 0 | `[Pass]` |
| `npm run lint` | 0 errors, 2 pre-existing warnings (`TimeAttackGame.tsx:145`, `worldbank.ts:22`); unrelated | `[Pass]` |
| `npm run build` | Next.js 16.3.4 production build compiled successfully | `[Pass]` |

### 35.9 Remaining Needs Verification

- Browser gameplay was exercised against the local dev server and reflects
  that environment. **Needs Verification [environment-specific]**.
- The `movie-series-rating` category identity is "Movie/Series Rating" but the
  implemented path is movie-only; TV-series support remains deferred per the
  approved availability decision. This is an intentional transitional state,
  not a Phase 5 change. **Needs Verification [product-decision]** for when TV
  series are added.
- No live HTTP 429 was induced for either provider; rate-limit behavior is
  source-verified only. **Needs Verification [capability-unavailable]** for a
  live 429 path.
- The chosen page budgets (10 / 10 / 10) and IGDB limit (200) are bounded
  request budgets chosen from measured yield; whether a different budget is
  preferable is a **Needs Verification [product-decision]**.

### 35.10 Phase status

Phase 5 is **complete**: every application-bounded TMDB/IGDB category was
evaluated independently, all four justified bounded expansions were
implemented and verified, the `movie-ratings` duplicate-ID defect was fixed,
and repository/browser checks pass. Phase 6 has not begun.

## 36. Phase 6 — Final Verification & Acceptance

> **Date:** 2026-10-15
> **Scope:** verification / reconciliation only. No catalog scaling, no new
> providers, no gameplay redesign, no deferred-category promotion, and no
> provider-budget changes were performed. No application code was changed.
> The analysis document was not modified.
> **Verdict:** **PASS WITH NON-BLOCKING NEEDS VERIFICATION**.

### 36.1 Method and evidence sources

- Source read-back of every playable adapter, snapshot reader, the shared deck
  utility, both game components, the dispatcher, availability/authorization,
  and the dev-only diagnostic route.
- Runtime re-measurement of every playable category through the dev-only
  `full=1` diagnostic route and the normal (snapshot-backed) route on the
  running local dev server (`http://localhost:3000`).
- Pure helper-level deck verification against the compiled
  [`lib/game/deck.ts`](lib/game/deck.ts:1) (temporary harness, removed).
- Browser regression via Playwright MCP across all nine playable categories
  plus both deferred categories.
- Repository gates: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Fail-closed verification via a temporary isolated harness that manipulated
  the generated data files and restored them byte-identically (verified).

All temporary harnesses were removed after use; `git status` confirms no
verification artifacts remain.

### 36.2 Final catalog matrix (re-measured 2026-10-15)

| Category (semantic ID) | Provider key | Runtime source | Items | Unique IDs | Dup IDs | Distinct values | Tie groups / tied items | Images | Latency | Playable |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Movie/Series Rating (`movie-series-rating`) | `movie-ratings` | Live TMDB (10 pages) | 166 | 166 | 0 | 37 | 30 / 159 | 0 missing | ~0.1 s | Yes |
| Release Date (`release-date`) | `release-dates` | Live TMDB (10 pages × 2 media) | 380 | 380 | 0 | 356 | 18 / 42 | 0 missing | ~0.03 s | Yes |
| Gross Revenue (`gross-revenue`) | `movie-gross-revenue` | Live TMDB + bounded detail calls | 146 | 146 | 0 | 146 | 0 / 0 | 0 missing | ~0.08 s (cached) | Yes |
| Game Rating (`game-rating`) | `game-ratings` | Live/cached SteamSpy `top100forever` | 99 | 99 | 0 | 38 | 24 / 85 | 0 missing | ~0.02 s | Yes |
| Peak Concurrent Players (`player-count`) | `game-playerbase` | Live/cached SteamSpy `top100in2weeks` | 97 | 97 | 0 | 97 | 0 / 0 | 0 missing | ~0.04 s | Yes |
| Number of Albums (`number-of-albums`) | `artist-album-counts` | Local generated snapshot | 251 | 251 | 0 | 154 | 65 / 162 | 0 missing | ~0.03 s | Yes |
| Album Release Date (`album-release-date`) | `album-release-dates` | Local generated snapshot | 220 | 220 | 0 | 179 | 23 / 58 | 0 missing | ~0.03 s | Yes |
| YouTube Subscribers (`youtube-subscribers`) | `youtube-subscribers` | Generated identity catalog + live `channels.list` | 263 | 263 | 0 | 252 | 11 / 22 | 0 missing | ~0.05 s | Yes |
| Game Release Date (`game-release-date`) | `game-release-dates` | Live IGDB (single bounded request, limit 200) | 200 | 200 | 0 | 193 | 7 / 14 | 0 missing | ~0.04 s | Yes |

- **Every playable category has 0 duplicate IDs and 0 missing images/names/
  values/display values.** Every returned item satisfies the normalized
  `GameItem` contract.
- **Ties are metric-inherent, not defects.** Movie/Series Rating ties (30
  groups / 159 items) come from `vote_average` rounding to one decimal on a
  0–10 scale (only 37 distinct values across 166 items). Game Rating ties come
  from integer review percentages. Album-count and date ties are expected.
  Gross Revenue and Peak Concurrent Players have zero ties.
- **Latency** is measured against the local dev server and is
  environment-specific. Snapshot categories are very fast (~0.03 s). Gross
  Revenue is the slowest live category because of bounded detail fan-out, but
  the cached path measured ~0.08 s. No category is potentially problematic.
- **Provider-specific depth is intentional** and is not normalized across
  categories (Product Decision 2).

### 36.3 Category-specific final checks

- **Movie/Series Rating:** 10-page bounded TMDB rating fetch active
  ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:80)); `dedupeById()` runs before mapping
  ([`lib/api/tmdb.ts`](lib/api/tmdb.ts:158)); 0 duplicate IDs; `vote_average`
  remains the metric; formatting `x.x / 10` verified on all 166 items;
  movie-only implementation unchanged. The semantic label is
  `Movie/Series Rating` while implementation is movie-only — recorded as
  non-blocking `Needs Verification [product-decision]`; TV support was **not**
  added.
- **Release Date:** 186 movie-prefixed + 194 TV-prefixed identities = 380, no
  cross-media ID collision; truthful source dates (earliest is
  `tv-94722 Tagesschau 1952-12-26`, a real TV premiere); no invented dates;
  bounded 10-page behavior works.
- **Gross Revenue:** movies only; all 146 emitted records have `revenue > 0`;
  truthful USD formatting (`$N,NNN`); detail calls bounded by
  `DETAIL_BATCH_SIZE = 10`; no unbounded fan-out; 0 duplicate IDs. The
  candidate page budget was **not** increased.
- **Game Rating:** SteamSpy behavior unchanged; not expanded beyond the
  provider endpoint; 99 valid items, 38 distinct values.
- **Peak Concurrent Players:** metric remains SteamSpy `ccu`; wording is
  `N peak players` on all 97 items; semantics remain previous-day peak;
  zero/unusable CCU filtered; provider-limited, not artificially scaled.
- **Number of Albums:** runtime reads the 251-item snapshot; no request-time
  MusicBrainz crawling; no request-time Wikidata SPARQL; exact MusicBrainz
  MBIDs remain identities (251/251 valid); artist images are actual artist
  images; attribution present on 199 items; snapshot count and unique IDs
  correct. The snapshot was **not** regenerated.
- **Album Release Date:** runtime reads the 220-item snapshot; no runtime
  MusicBrainz discovery; release-group IDs unique (220/220); actual album
  artwork; partial-date precision preserved (year-only / year-month /
  full-date all present); no fabricated month/day; per-artist contribution
  bound respected. The snapshot was **not** regenerated.
- **YouTube Subscribers:** generated identity catalog contains 263 identities;
  runtime source is the generated catalog, not the original 13 seeds; curated
  list remains bootstrap only; runtime performs `channels.list`; runtime
  performs **no** `search.list`; subscriber statistics live; titles/thumbnails
  live; hidden subscriber counts filtered; runtime batching bounded at 50.
  The discovery generator was **not** run for Phase 6. The old leaked key was
  revoked and replaced; no credential value was inspected, printed, or
  searched.
- **Game Release Date:** IGDB limit remains the approved bounded 200; 200 valid
  items; IDs unique; release dates and covers valid; Twitch token reuse works
  (module-scope cache); auth server-side; a single bounded request provides the
  pool (no unnecessary offset pagination).

### 36.4 Cross-category provider/runtime boundary map

| Category | Runtime mode | Confirmed |
| --- | --- | --- |
| Movie/Series Rating | Live TMDB | Yes |
| Release Date | Live TMDB | Yes |
| Gross Revenue | Live TMDB + bounded detail calls | Yes |
| Game Rating | Live/cached SteamSpy | Yes |
| Peak Concurrent Players | Live/cached SteamSpy | Yes |
| YouTube Subscribers | Generated identity catalog + live `channels.list` | Yes |
| Number of Albums | Local generated snapshot | Yes |
| Album Release Date | Local generated snapshot | Yes |
| Game Release Date | Live IGDB | Yes |

- **MusicBrainz and Wikidata are NOT runtime dependencies for gameplay.**
  Source trace: [`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:30)
  and [`lib/api/albumReleaseDateSnapshot.ts`](lib/api/albumReleaseDateSnapshot.ts:29)
  import only `node:fs`, `node:path`, and `@/types/api`.
- **YouTube discovery is NOT a runtime dependency.** The runtime adapter
  ([`lib/api/youtube.ts`](lib/api/youtube.ts:62)) reads the generated catalog
  and calls only `channels.list`.
- **TMDB/IGDB were NOT unnecessarily snapshot-backed.** They remain live.
- No provider accidentally moved into the wrong runtime mode.

### 36.5 Repeat-behavior final verification

Pure helper-level verification against the compiled
[`lib/game/deck.ts`](lib/game/deck.ts:1) (10 cases, all `[Pass]`):

- Classic no-repeat before full pool consumed (pool of 50 → 49 unique).
- Classic full-cycle exhaustion + boundary (pool of 10, 30 rounds): no
  immediate same-ID repeat across the cycle boundary; first cycle fully unique.
- Classic tiny pools (2 and 3): no immediate repeat.
- Time Attack no-repeat within a session (pool of 40 → 39 unique, clean
  exhaustion).
- Time Attack clean exhaustion (pool of 5 → 4 shown, then ends).
- `shuffle` returns a new array without mutating input.
- `filterSeen` removes seen IDs.
- `buildDeck` drops unusable items.
- `dedupeAdjacentEquals` separates adjacent equal values where possible.

Browser gameplay (Playwright MCP):

- **Classic (Movie/Series Rating):** answer action advances; score increments;
  no immediate repeated ID; wrong answer ends the run; Play Again resets to a
  fresh run with 2 cards and the modal dismissed.
- **Time Attack (Number of Albums):** 25 rounds → 25 unique items, 0
  duplicates; timer expiry shows the "Time's up" modal; Play Again resets the
  timer to 60 and the score.
- **Score/timer regression:** Classic score increments on correct; Time Attack
  +3 s correct / −5 s wrong deltas and the 999-second cap are unchanged in
  source ([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:190)).

### 36.6 Shared deck source audit

[`lib/game/deck.ts`](lib/game/deck.ts:1) remains narrowly scoped: pure helpers
only (`shuffle`, `dedupeAdjacentEquals`, `filterUsable`, `buildDeck`,
`shuffleDeck`, `filterSeen`, `buildNextCycle`). It contains **no** provider
logic, category-specific logic, scoring logic, timer logic, UI state, or
generic game-engine abstraction. React components continue to own all gameplay
state.

### 36.7 Generated-data integrity

| File | Version | Items | Unique IDs | Sorted | Extra fields | Secrets | Status |
| --- | ---: | ---: | ---: | --- | ---: | ---: | --- |
| [`lib/api/data/youtube-channel-catalog.json`](lib/api/data/youtube-channel-catalog.json:1) | 1 | 263 | 263 | Yes | 0 | 0 | `[Pass]` |
| [`lib/api/data/artist-album-counts.snapshot.json`](lib/api/data/artist-album-counts.snapshot.json:1) | 1 | 251 | 251 | Yes | 0 | 0 | `[Pass]` |
| [`lib/api/data/album-release-date.snapshot.json`](lib/api/data/album-release-date.snapshot.json:1) | 1 | 220 | 220 | Yes | 0 | 0 | `[Pass]` |

- YouTube catalog: valid supported version, generated metadata, unique channel
  IDs, deterministic structure, no subscriber-value snapshot authority, no
  secrets, no credential-like fields.
- Number of Albums snapshot: 251 items, 251 unique valid MBIDs, valid values,
  valid absolute HTTPS images, attribution integrity (199 with attribution),
  no secrets/private diagnostic fields.
- Album Release Date snapshot: 220 items, 220 unique release-group IDs, valid
  date comparison values, precision-preserving display values, valid images,
  no secrets/private diagnostic fields.
- No file was regenerated to change timestamps.

### 36.8 Fail-closed verification

Temporary isolated harness (removed; files restored byte-identically and
verified):

| Case | Result | Status |
| --- | --- | --- |
| Missing Number of Albums snapshot | HTTP 502, clear error | `[Pass]` |
| Malformed Number of Albums JSON | HTTP 502, clear error | `[Pass]` |
| Unsupported Number of Albums version | HTTP 502, clear error | `[Pass]` |
| Sub-minimum Number of Albums snapshot | HTTP 502, clear error | `[Pass]` |
| Missing Album Release Date snapshot | HTTP 502, clear error | `[Pass]` |
| Malformed Album Release Date JSON | HTTP 502, clear error | `[Pass]` |
| Missing YouTube catalog | HTTP 502, clear error | `[Pass]` |
| Duplicate YouTube channel IDs | HTTP 502, clear error | `[Pass]` |
| Sub-minimum YouTube catalog | HTTP 502, clear error | `[Pass]` |
| Unknown category | HTTP 400 with valid-value list | `[Pass]` |
| Missing category | HTTP 400 | `[Pass]` |
| Deferred categories (`monthly-listeners`, `twitch-followers`) | HTTP 400 unknown category | `[Pass]` |

- Provider authentication failure, provider non-OK response, missing
  credentials, and invalid provider item filtering are source-verified in the
  adapters (`requireApiKey()`, Twitch credential check, `ApiFetchError` throw
  paths, item filters). No real provider quota was exhausted and no real 429
  was induced. Real 429 behavior is `[Not deliberately tested]`.

### 36.9 Security verification

- Env variable names confirmed only: `TMDB_API_KEY`, `YOUTUBE_API_KEY`,
  `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`. No credential value was read,
  printed, or searched.
- No provider secret uses `NEXT_PUBLIC_` (scan found 0 matches).
- Provider adapters are server-side; no client component imports `@/lib/api`
  (scan found 0 matches).
- No generated catalog/snapshot contains secrets (scan found 0 matches).
- No credential appears in browser-visible request URLs; no client-side
  provider API request occurs (browser network inspection showed only local
  assets and image CDN hosts).
- `.env.local` and `.next` are both ignored by Git; no `.next` files are
  tracked; no temp env copies exist (only `.env.local` and
  `.env.local.example`).
- Generated data contains public gameplay-safe information only.

### 36.10 Browser regression matrix

| Category | Route loads | Title correct | Cards render | Images | Display values | Advance | No immediate repeat | Console |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Movie/Series Rating | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | 0 errors |
| Release Date | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | — | — | 0 errors |
| Gross Revenue | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | — | — | 0 errors |
| Game Rating | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | — | — | 0 errors |
| Peak Concurrent Players | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | — | — | 0 errors |
| Number of Albums | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | 0 errors |
| Album Release Date | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | — | — | 0 errors |
| YouTube Subscribers | `[Pass]` | `[Pass]` | `[Pass]` | `[Partial]` | `[Pass]` | — | — | 0 errors |
| Game Release Date | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | `[Pass]` | — | — | 0 errors |
| `monthly-listeners` (deferred) | `[Pass]` unavailable | — | 0 cards | — | — | — | — | 0 errors |
| `twitch-followers` (deferred) | `[Pass]` unavailable | — | 0 cards | — | — | — | — | 0 errors |

- **YouTube image delivery `[Partial]`:** one channel thumbnail was blocked by
  browser ORB (`net::ERR_BLOCKED_BY_ORB`) while another loaded. This is the
  known non-blocking `Needs Verification [environment-specific]` image-delivery
  limitation; provider thumbnail URLs are valid and representative images
  render. It does not fail Phase 6.
- Deeper repeat tests were performed on Movie/Series Rating (Classic) and
  Number of Albums (Time Attack).

### 36.11 Network verification

- Client-visible network during browser checks: local Next.js assets/routes and
  image CDN requests only (`image.tmdb.org`, `yt3.ggpht.com`,
  `images.igdb.com`, `commons.wikimedia.org`, `archive.org`).
- **No** client-side `api.themoviedb.org`, `googleapis.com`,
  `musicbrainz.org`, `query.wikidata.org`, IGDB API, Twitch OAuth, or SteamSpy
  API request was observed. Provider data fetching remains server-side.
- Image CDN traffic is expected and is not provider API leakage.

### 36.12 Runtime performance summary

| Category | Approx. latency | Classification |
| --- | ---: | --- |
| Movie/Series Rating | ~0.1 s | Fast |
| Release Date | ~0.03 s | Fast |
| Gross Revenue | ~0.08 s cached (slowest live uncached) | Acceptable |
| Game Rating | ~0.02 s | Fast |
| Peak Concurrent Players | ~0.04 s | Fast |
| Number of Albums | ~0.03 s | Fast (snapshot) |
| Album Release Date | ~0.03 s | Fast (snapshot) |
| YouTube Subscribers | ~0.05 s | Fast |
| Game Release Date | ~0.04 s | Fast |

- Snapshot categories remain very fast. Gross Revenue is the slowest due to
  detail fan-out but remains acceptable. No category is potentially
  problematic. No new performance SLA was invented.

### 36.13 Repository hygiene

- No temporary harnesses remain (all removed and verified).
- No stale generated diagnostic JSON remains.
- No accidental env copies exist.
- No test-only routes left enabled; the dev-only `full=1` and POST discovery
  paths remain production-guarded (404).
- No production-exposed generation path.
- No `.next` files tracked.
- No snapshot temporary files.
- No unrelated source changes introduced by verification.
- **Pre-existing stray artifacts (not created by Phase 6, not deleted):**
  `$null` (0 bytes), `x` (71-byte env-check script), and `.playwright-mcp/`
  (Playwright MCP output). These predate this pass and are recorded as a
  hygiene observation rather than removed, since deleting them is a scope
  decision outside verification.

### 36.14 Repository checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | `[Pass]` (exit 0) |
| `npm run lint` | `[Pass]` — 0 errors; 2 pre-existing warnings ([`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:145), [`lib/api/worldbank.ts`](lib/api/worldbank.ts:22)) |
| `npm run build` | `[Pass]` — Next.js 16.3.4 production build compiled successfully |

No new warning or error was introduced by this work.

### 36.15 Scope reconciliation

Final diff relative to the pre-feature baseline, grouped by phase:

- **Phase 1 (gameplay):** `lib/game/deck.ts` (new),
  [`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx:1),
  [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx:1).
- **Phase 2 (YouTube):** `lib/api/youtube.ts`,
  `lib/api/youtubeChannelCatalog.ts` (new),
  `lib/api/data/youtube-channel-catalog.json` (new),
  `scripts/generate-youtube-channel-catalog.mjs` (new),
  `lib/api/curatedPools.ts` (seed clarification), `package.json`.
- **Phase 3 (Number of Albums):** `lib/api/musicbrainz.ts`,
  `lib/api/artistAlbumCountsSnapshot.ts` (new),
  `lib/api/wikidataArtistImages.ts` (new),
  `scripts/generate-artist-album-counts-snapshot.mjs` (new),
  `app/api/test-fetch/route.ts`,
  `lib/api/data/artist-album-counts.snapshot.json`.
- **Phase 4 (Album Release Date):** `lib/api/musicbrainz.ts`,
  `lib/api/albumReleaseDateSnapshot.ts` (new),
  `scripts/generate-album-release-date-snapshot.mjs` (new),
  `app/api/test-fetch/route.ts`,
  `lib/api/data/album-release-date.snapshot.json`.
- **Phase 5 (TMDB/IGDB):** `lib/api/tmdb.ts`, `lib/api/igdb.ts` (new).
- **Documentation/generated data:** `docs/`, `governance/`, `AGENTS.md`,
  `CLAUDE.md`, `components.json`, `types/`, `lib/catalog/`,
  `lib/api/index.ts`, `lib/api/steamspy.ts`, `components/game/GameCard.tsx`,
  `.gitignore`, `.env.local.example`.

No unexplained unrelated change was found. Git history was not rewritten and
nothing was committed.

### 36.16 Needs Verification reconciliation

| Item | Classification |
| --- | --- |
| YouTube catalog depth | `Resolved [Pass]` — 263 identities |
| YouTube provider discovery viability | `Resolved [Pass]` — 263 from bounded discovery |
| Number of Albums catalog depth | `Resolved [Pass]` — 251 items |
| MusicBrainz artist-image coverage | `Resolved [Pass]` — 251/251 valid images |
| Commons licensing handling | `Resolved [Pass]` — 199 attribution lines, 0 unknown license |
| Album Release Date runtime latency | `Resolved [Pass]` — ~0.03 s snapshot |
| Album Release Date catalog depth | `Resolved [Pass]` — 220 items |
| TMDB category expansion bounds | `Resolved [Pass]` — 166 / 380 / 146 |
| IGDB 100-item application bound | `Resolved [Pass]` — raised to 200, 200 valid |
| Playwright availability | `Resolved [Pass]` — browser matrix executed |
| Movie/Series Rating adding TV series | `Still Needs Verification [product-decision]` |
| Exact future optimal provider budgets | `Still Needs Verification [product-decision]` |
| Target deployment/browser-specific image delivery | `Still Needs Verification [environment-specific]` |
| Deliberately induced provider 429 behavior | `Not deliberately tested` |
| YouTube `search.list` per-project quota headroom | `Still Needs Verification [environment-specific]` |

### 36.17 Final acceptance criteria

| Criterion | Status |
| --- | --- |
| All intended playable categories load | `[Pass]` |
| Deferred categories remain unavailable | `[Pass]` |
| No category has duplicate IDs in its final usable pool | `[Pass]` |
| Generated/snapshot data validates | `[Pass]` |
| No secret is exposed | `[Pass]` |
| Provider/runtime boundaries match the approved architecture | `[Pass]` |
| Classic no-repeat invariant holds | `[Pass]` |
| Time Attack no-repeat invariant holds | `[Pass]` |
| Snapshot categories do not perform runtime provider discovery | `[Pass]` |
| YouTube does not perform runtime search discovery | `[Pass]` |
| All provider credentials remain server-side | `[Pass]` |
| No serious browser regression exists | `[Pass]` |
| Typecheck passes | `[Pass]` |
| Lint has no new errors | `[Pass]` |
| Production build passes | `[Pass]` |
| No temporary diagnostics remain | `[Pass]` |

### 36.18 Defects found/fixed

**None.** No correctness, security, or regression defect was identified during
Phase 6. No code change was required. The only non-blocking items are the
environment-specific YouTube image-delivery limitation and the open
product-decision items recorded in Section 36.16.

### 36.19 Phase status

Phase 6 is **complete**. Verdict: **PASS WITH NON-BLOCKING NEEDS
VERIFICATION**. The "Catalog Pool Scaling & Repeat Prevention" feature is
implementation-complete and ready to close. The remaining items are
non-blocking: an environment-specific image-delivery limitation and future
product decisions (TV-series support, optimal provider budgets, deployment
image delivery, and deliberately induced 429 behavior).
