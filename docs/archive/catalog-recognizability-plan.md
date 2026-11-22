# Catalog Recognizability — Implementation Plan

**Task type:** data/content planning only. No application code, provider call, discovery, review, generation, or runtime change is authorized by this planning task.

**Plan owner:** HigherLower maintainers/developers. This plan is implementation-ready within the explicit future allowlist below; it does not begin implementation.

**Accepted analysis:** [`docs/api-capabilities-analysis.md`](./api-capabilities-analysis.md:1) is accepted as the evidence baseline. This plan resolves its product-direction items for these three pools and does not reopen broad analysis. Repository facts below cite the accepted analysis and current source. Existing production artifacts are replaceable/rollback baselines, not candidate-quality authority.

## 1. Executive plan and intended outcome

Rebuild candidate qualification for `number-of-albums`, `album-release-date`, and `youtube-subscribers` as three **reviewed identity pools**, separate from provider facts, artwork, and runtime outputs. Each pool should reach approximately **200–300 or more qualified items** where supportable. This is a desired production scale, not an exploratory-only target or an absolute cap. Do not pad: if a category has fewer qualified entries, its status remains incomplete and discovery/review continues. Do not loosen qualification, use comparison-metric magnitude as a proxy, or imply that a count proves all players recognize every item.

The pipeline will be:

```text
discovery leads -> canonical identity -> case-by-case qualification/review
  -> approved candidate source -> authoritative factual metric
  -> artwork validation -> fresh runtime artifact -> runtime validation
```

Discovery rank, album count/date/subscriber magnitude, channel subscriber count, art availability, and technical validity are each **not** qualification. Provider facts retain their existing semantics. Review is a lightweight, repository-native maintainer process, not a CMS or scientific recognition measurement.

### Pool transition summary

| Category | Current runtime baseline (accepted analysis) | Planned qualification boundary | Desired approved / generated usable scale |
|---|---|---|---|
| `number-of-albums` | 251 artist items; 17 curated seeds overlap | Reviewer approves artist-level familiarity; canonical MusicBrainz artist MBID; actual album count stays MusicBrainz `primary-type === Album`; truthful artist image remains required | ~200–300+ approved artists and generated usable items; image or metric gaps do not count as approved usable output |
| `album-release-date` | 220 album items | Reviewer approves the **specific album**; canonical artist MBID + release-group ID and type metadata; release-group first date is fetched from MusicBrainz; CAA art remains a technical requirement | ~200–300+ approved specific albums and generated usable items; never infer album familiarity from a familiar artist |
| `youtube-subscribers` | 263 channel IDs; 13 curated IDs overlap and 250 are non-seed IDs by arithmetic | Reviewer approves recognizable channel identity/type; canonical ID/handle; no secondary/support/archive/local corporate channel admitted solely for size; current `channels.list` remains subscriber metric authority | ~200–300+ approved identities and runtime-usable items; hidden/missing metrics are excluded at runtime and reported |

**No grandfathering:** every existing seed and generated identity must be requalified under the same criteria as newly discovered candidates. Existing artifact content is a review lead/comparison set and rollback copy only.

## 2. Approved operating decisions and recognition criteria

- Audience scope is broad global/general internet, with **no country quota**. Internationally prominent non-English artists, albums, and channels are eligible. Coverage is inspected and reported, not forced by quotas.
- Maintainers/developers review candidates case by case. A curated identity pool is accepted. Refresh is periodic/offline; exact cadence remains undecided and is not an implementation blocker.
- Candidate pools are content decisions distinct from comparison values. Do not manually maintain volatile factual metric values where the existing provider can supply them.
- `number-of-albums` qualification concerns artist familiarity. `album-release-date` qualification concerns familiarity with that particular album. `youtube-subscribers` includes recognizable creators, entertainment/media, major brands, and music channels. Exclude secondary, support, archive, or local corporate channels that are merely large; a famous inactive channel may qualify if the authoritative metric remains available.
- Keep explicit review outcomes: `discovered`, `pending`, `approved`, `rejected`, `invalid`, `stale`. Candidate entries default to pending; only approved candidates may feed production generation. Rejection reason is optional, but an explicit status is mandatory. Store `reviewedAt` and concise discovery provenance for approved/rejected decisions where known. Update review date on a substantive re-review; do not encode reviewer identity or personal data unless separately approved.
- No numeric recognizability score, player-recognition threshold, country weighting, subscriber cutoff, minimum album-count value, or popularity rank cutoff is introduced. Case-by-case review is the acceptance mechanism; player studies are out of scope.

### Category qualification and factual contracts

**Artist pool — `number-of-albums`**

1. Discover candidate artists from artist-focused discovery input(s), including a reviewed current-list lead set, assisted MusicBrainz search, and legitimate/free identity sources where appropriate. MusicBrainz identity and linked IDs aid resolution, not recognition.
2. Canonical identity is MusicBrainz artist MBID; preserve canonical display name/aliases and source references needed for review. Deduplicate by MBID; flag likely aliases/identity collisions for review rather than merging by name.
3. Maintainers approve only when the artist is broadly recognizable to the intended global/general audience based on their judgment. Non-English prominence is valid. Discovery rank, album-count size, image availability, and a linked ID do not qualify.
4. Existing factual metric remains the number of MusicBrainz release groups whose `primary-type === "Album"`, counted across all pages; do not alter count semantics. Existing artist image resolution/license checks remain downstream technical requirements. The adapter and its factual contract are in [`lib/api/musicbrainz.ts`](../lib/api/musicbrainz.ts:302) and [`lib/api/artistAlbumCountsSnapshot.ts`](../lib/api/artistAlbumCountsSnapshot.ts:34).

**Album pool — `album-release-date`**

1. Discover specific album candidates through album-specific chart/editorial identity leads **only when access/reuse is legitimate**, and/or candidate generation from reviewed artist discographies followed by explicit album-by-album review. A familiar artist does not confer album approval. Spotify/Luminate are not mandatory; unverified chart pages may be manual leads only after terms/reuse review.
2. Canonical item identity is MusicBrainz release-group ID; retain canonical artist MBID, release-group primary and secondary type metadata, candidate/source provenance, review state/date, and the MusicBrainz first-release-date used by generation/reporting. The metric date is fetched from MusicBrainz, not manually curated. Date precision remains verbatim; do not synthesize missing month/day.
3. Review primary and secondary types and title forms, including live, compilation, greatest hits, remix, soundtrack, box set, deluxe/expanded editions, reissues, remasters, mixtapes, and other borderline or near-duplicate variants. Apply no blanket automatic approval based only on `primary-type === Album`; ineligible/unclear variants are rejected or held pending, with exceptions requiring explicit maintainer review. Deduplicate exact release-group IDs; title similarity and same-artist editions are review flags, not identity equivalence. Preserve distinct albums where reviewers deem them meaningfully distinct and familiar.
4. Qualification is specific-album familiarity. Album title, recognition, and type are not inferred from artist fame, metric date, art, or provider rank. CAA art and a valid first-release-date are downstream usability facts, not qualification.
5. Current adapter deduplicates by release-group ID and obtains first date/CAA art, but its snapshot parser is generic and snapshot output lacks artist/type metadata; the planned source and generated manifest close that provenance gap without changing the public `GameItem` shape or date metric. Evidence: [`lib/api/musicbrainz.ts`](../lib/api/musicbrainz.ts:433), [`lib/api/albumReleaseDateSnapshot.ts`](../lib/api/albumReleaseDateSnapshot.ts:67), and [`scripts/generate-album-release-date-snapshot.mjs`](../scripts/generate-album-release-date-snapshot.mjs:331).

**YouTube channel pool — `youtube-subscribers`**

1. Treat current broad YouTube search queries strictly as candidate leads, never automatic production admissions. Discover through broader general-internet review leads and legitimate/free sources; official/user-facing charts may be leads only where access/reuse permits. Spotify/Luminate are not required, and third-party rankers/scrapers are not assumed permissible.
2. Canonical identity is a YouTube channel ID, with canonicalized handle retained when available. Store channel title, channel type (creator, entertainment/media, brand, music, or reviewed other), discovery source/provenance, review status/date, and optional rejection reason. Record enough provenance to reproduce/review the lead, not volatile metrics.
3. Review for channel identity, duplicates/aliases, primary vs secondary/support/archive status, and scope. Do not include secondary/support/archive channels or local corporate channels simply because they have high subscribers. Famous inactive channels remain eligible if `channels.list` still yields the authoritative subscriber metric and other required runtime fields.
4. Revalidate hidden, missing, deleted, private, or otherwise invalid channel IDs. These do not become approved through size; hidden/missing subscriber counts exclude an item from the current runtime pool and are reported. Do not silently substitute another channel or metric.
5. The runtime `channels.list` subscriber lookup remains authoritative; discovery search ranking and subscriber count are not recognition proof. Current search generator and runtime source are [`scripts/generate-youtube-channel-catalog.mjs`](../scripts/generate-youtube-channel-catalog.mjs:186) and [`lib/api/youtube.ts`](../lib/api/youtube.ts:54); identity reader is [`lib/api/youtubeChannelCatalog.ts`](../lib/api/youtubeChannelCatalog.ts:11).

## 3. Source of truth and ownership model

### Proposed canonical source

Use one proposed new file: [`lib/api/data/recognizability-candidates.json`](../lib/api/data/recognizability-candidates.json). It is the sole canonical reviewed candidate source for these three categories. Do **not** establish separate production candidate lists or a second generator pipeline. Schema versioning and validation are proposed; the following fields are the minimum contract, with per-domain fields as relevant:

| Field | Purpose |
|---|---|
| `schemaVersion` | Explicit candidate-source schema version |
| `domain` | `number-of-albums`, `album-release-date`, or `youtube-subscribers` |
| `status` | One of the six review states above; production selection accepts only `approved` |
| `canonicalIdentity` | Artist MBID; album release-group ID plus artist MBID; or YouTube channel ID and optional handle |
| `displayName` | Human-readable candidate name used for review/identity display, not a factual metric |
| `channelType` | Required for YouTube; describes reviewed channel role |
| `releaseGroupTypes` | Album primary and secondary type metadata, retained for review and generation |
| `discovery` | One or more concise source labels/URLs or source identifiers, observed date, and query/reference context where safely reusable; no credentials or volatile metric values |
| `reviewedAt` | ISO date/time for last substantive review; absent for never-reviewed pending candidates |
| `rejectionReason` | Optional short controlled/free-text rationale for rejected/invalid entries; no player data |
| `notes` | Optional concise reviewer note where needed for borderline exception; no numerical familiarity score |

Album `firstReleaseDate` is **not** hand-maintained in the canonical candidate source: the source of truth is MusicBrainz on generation. The generated album artifact/manifest must retain provider-returned first date, canonical artist MBID, release-group ID, primary/secondary types and candidate provenance. Artist album count and YouTube subscriber count likewise remain provider-derived, not canonical-source fields. Keep this richer metadata outside public `GameItem` unless source inspection demonstrates it is required by existing runtime validation; no client exposure or public shape expansion is planned.

### Ownership by pipeline stage

| Concern | Owner/source of truth | Output / constraint |
|---|---|---|
| Discovery | Developer-run assisted discovery and recorded source references; existing items may be leads | Pending entries in canonical source; leads never enter runtime directly |
| Identity | MusicBrainz for artist/release-group IDs; YouTube for channel ID/handle; maintainer resolves ambiguous matches | Stable canonical IDs; names are labels, not dedupe keys |
| Qualification | Maintainer review in canonical source | Explicit status, reviewed date, rationale optional; only approved pass onward |
| Factual metric | MusicBrainz existing adapter for album count/date; YouTube `channels.list` at runtime for subscribers | No metric semantics or manual volatile metric maintenance changes |
| Artwork | Existing Wikidata/Commons artist image and CAA album art paths; YouTube channel thumbnails from current API path | Validate presence/format/license as current code requires; art does not approve a candidate |
| Provenance | Canonical source plus generated metadata/report | Preserve useful source and identity-to-output lineage without putting review fields in `GameItem` |
| Generated runtime output | Existing snapshot/catalog paths (replaceable generated outputs) | Derived only from approved source; deterministic, validated, atomic writes |
| Runtime | Existing dispatcher, snapshot readers, and provider adapter | Keep gameplay-facing `GameItem` shape and authoritative metric semantics; hidden/missing items fail closed |

## 4. Current-to-target plan and scale expansion loops

For each category, capture current artifact counts and hashes first, then import current entries and seeds as **pending review leads**. Nothing is grandfathered. Create discovery batches and source provenance, canonicalize and deduplicate, screen obvious invalid/duplicate candidates, then have maintainers case-review the queue. After qualification, generate factual values/artwork and separately report usable output. If approved count or usable output is below roughly 200–300, continue that domain's discovery/review loop; do not relax criteria or automatically promote. A shortfall means incomplete work, not a failed threshold to game.

| Pool | Discovery and expansion loop | Per-pass stopping/reporting behavior |
|---|---|---|
| Artists | Current 251-item snapshot and 17 seeds -> requalification queue; expand with artist-focused discovery inputs across genre, era, language, and regions without quotas; resolve MusicBrainz/linked IDs; maintainers review artist familiarity; repeat discovery/source-coverage/review batches | Report discovered, deduped, invalid, pending, approved, rejected/stale, image/metric usable. Continue until ~200–300+ approved **and usable** if supportable; otherwise state qualified shortfall and continue. Album-count magnitude is not a filter. |
| Albums | Current 220-item snapshot -> derive canonical artist/release-group candidates and re-review; add album-specific chart/editorial leads where legitimate, plus reviewed artist discography candidate generation; resolve MusicBrainz type/IDs; review each album and variants individually; repeat coverage/review batches | Report candidate release groups, type/variant disposition, duplicate/near-duplicate review flags, approved and generated usable. Do not assume all albums of an approved artist are eligible. Continue until ~200–300+ approved **and usable** if supportable; otherwise incomplete, no type/familiarity relaxation. |
| YouTube | Current 263 IDs and 13 seeds -> pending review; preserve current search leads but do not treat search order as rank/approval; broaden general-internet candidate discovery using permissible reference/chart leads and channel types; canonicalize IDs/handles; review primary vs secondary identity; repeat source/query coverage and review batches | Report discovered, invalid/deleted/private, duplicate, pending, approved, rejected/stale, hidden/missing metric, and usable output. Continue until ~200–300+ approved **and currently usable** if supportable; hidden/missing metrics reduce output and do not cause substitute metrics or automatic replacements. |

Discovery coverage should preserve broad global/general-internet scope and make visible source/language/region/type coverage gaps without quotas. No single source must deliver the target. External paid Spotify/Luminate data is not required. Spotify/Luminate, official charts, and other external sources are leads only after rights, access, terms, retention, and reuse are confirmed; no live external discovery is part of planning.

## 5. Before/after reporting contract

Capture a baseline report before replacing runtime artifacts: source artifact path, item count, file hash, generator/version, and timestamp. Baseline counts from the accepted analysis are 251 artists, 220 albums, and 263 YouTube IDs; these are recorded artifact counts, not freshly remeasured in this planning pass. For each discovery/review/generation pass, record a deterministic aggregate report with:

- discovered raw observations and unique canonical candidates;
- automatic technical rejects/invalid identities, plus reason counts;
- duplicate canonical IDs and near-duplicate/alias review flags;
- pending review queue, approved, rejected, invalid, and stale counts;
- generated usable output and drop reasons (missing metric/date/art/image, hidden YouTube count, provider missing record);
- album primary/secondary type totals and review dispositions; variants/exceptions requiring human review;
- provenance/source coverage summary and overlap with prior baseline/seeds;
- artifact count and hash before/after.

Never report a recognition score, recognition percentage, player-recognition estimate, or numeric familiarity rank. Keep candidate-status and generation reports distinct: approval is a human/content judgment; generated usability is technical/provider readiness.

## 6. File-level implementation map and exact future allowlist

Only the paths below are in the proposed implementation allowlist. The planning artifact itself is the only file authorized to change in the current task. If implementation needs any unlisted path, stop and request owner approval before editing it. “Conditional” means the implementer must first establish that the specific responsibility is required by the approved design; it is not a blanket grant to refactor. No tests or test framework are assumed; a proposed focused validator is a developer script.

| Path | Current responsibility/evidence | Planned future reason and boundary |
|---|---|---|
| **New** `lib/api/data/recognizability-candidates.json` | No current file; proposal | Sole canonical source for pending and reviewed artist, album, and YouTube candidates, identity metadata and provenance. **Proposed new file.** |
| **New** `scripts/validate-recognizability-candidates.mjs` | No current validator for review decisions; no test framework confirmed | Validate schema/statuses/IDs/duplicates/provenance and report review counts; no provider calls and no writes to runtime artifacts. **Proposed new script**, not a test framework. |
| `lib/api/curatedPools.ts` | Current bootstrap artist and channel seed constants; YouTube generator currently reads IDs from here ([`lib/api/curatedPools.ts`](../lib/api/curatedPools.ts:33)) | Migrate seed identities into the canonical source or retain only a temporary import bridge if required; ensure seeds are pending until reviewed; remove live dual-source authority. |
| `scripts/generate-artist-album-counts-snapshot.mjs` | Current bounded discovery + curated seed ingestion, invokes dev route, atomically writes public items ([`scripts/generate-artist-album-counts-snapshot.mjs`](../scripts/generate-artist-album-counts-snapshot.mjs:183), [`scripts/generate-artist-album-counts-snapshot.mjs`](../scripts/generate-artist-album-counts-snapshot.mjs:404)) | Read approved artist IDs only from canonical source; no raw discovery candidate auto-admission; keep metric/image behavior and safe atomic output; report approved-to-usable drops. |
| `scripts/generate-album-release-date-snapshot.mjs` | Current bounded artist discovery and target-fill generation, writes public snapshot ([`scripts/generate-album-release-date-snapshot.mjs`](../scripts/generate-album-release-date-snapshot.mjs:204), [`scripts/generate-album-release-date-snapshot.mjs`](../scripts/generate-album-release-date-snapshot.mjs:394)) | Consume approved **album release-group IDs**, not only an artist list; validate required identity/type metadata; generate fresh provider dates/art and output metadata/report atomically. |
| `scripts/generate-youtube-channel-catalog.mjs` | Current bounded broad search plus seeds and validation; atomically writes ID/title identities ([`scripts/generate-youtube-channel-catalog.mjs`](../scripts/generate-youtube-channel-catalog.mjs:186)) | Split discovery leads from production generation: search results become pending only; generated catalog contains approved/revalidated channel identities only; retain type/provenance/report metadata and current runtime identity interface as needed. |
| `lib/api/musicbrainz.ts` | Existing authoritative album count and album release-group/date/CAA generation; album generator currently samples up to a per-artist limit ([`lib/api/musicbrainz.ts`](../lib/api/musicbrainz.ts:338), [`lib/api/musicbrainz.ts`](../lib/api/musicbrainz.ts:455)) | Make approved album release-group candidates addressable and retain type/artist/date metadata for the generated manifest; enforce album variant/type review inputs without changing album-count semantics, date precision, or authoritative provider. |
| `lib/api/artistAlbumCountsSnapshot.ts` | Reads and validates generated artist `GameItem` snapshot ([`lib/api/artistAlbumCountsSnapshot.ts`](../lib/api/artistAlbumCountsSnapshot.ts:34)) | Update only if snapshot envelope/metadata or generator validation requires it; continue projecting the unchanged public `GameItem` items. |
| `lib/api/albumReleaseDateSnapshot.ts` | Reads and validates generic album `GameItem` snapshot with no artist/release-type metadata ([`lib/api/albumReleaseDateSnapshot.ts`](../lib/api/albumReleaseDateSnapshot.ts:67)) | Validate generated provenance metadata as needed while exposing unchanged `GameItem[]`; no public UI metadata required. |
| `lib/api/youtubeChannelCatalog.ts` | Validates/reads runtime channel identity catalog ([`lib/api/youtubeChannelCatalog.ts`](../lib/api/youtubeChannelCatalog.ts:11)) | Keep required runtime identity fields compatible and validate richer generated metadata only if the runtime reader owns it; do not move review workflow into runtime. |
| `lib/api/youtube.ts` | Runtime `channels.list` subscriber authority and drops hidden/missing values ([`lib/api/youtube.ts`](../lib/api/youtube.ts:54)) | Change only if necessary to report invalid/hidden identities for validation while preserving live subscriber authority and existing normalized fields. No metric or gameplay change. |
| `lib/api/data/artist-album-counts.snapshot.json` | Current replaceable runtime baseline: 251 entries in accepted analysis | Regenerate only after approved source, pre-write baseline capture, and generation validation. **Output only**, never qualification authority. |
| `lib/api/data/album-release-date.snapshot.json` | Current replaceable runtime baseline: 220 entries in accepted analysis | Regenerate only after album-specific approvals and metadata/type gates. **Output only**, never qualification authority. |
| `lib/api/data/youtube-channel-catalog.json` | Current replaceable runtime baseline: 263 IDs in accepted analysis | Regenerate only from approved/revalidated canonical identities. **Output only**, never qualification authority. |
| `package.json` | Existing three developer generation scripts, no test script ([`package.json`](../package.json:5)) | Add/adjust only developer validator and generation script commands; no dependency or test-framework addition. |
| **Conditional:** `lib/api/index.ts` | Dispatcher routes category to existing snapshot/adapter and normalizes minimum pool ([`lib/api/index.ts`](../lib/api/index.ts:39)) | Modify only if a source/read adapter interface must change to keep runtime contracts stable; avoid dispatcher changes if current readers can retain `GameItem[]`. |
| **Conditional:** `types/api.ts` | Current normalized public `GameItem` contract, five core fields plus optional attribution ([`types/api.ts`](../types/api.ts:6)) | Expected to remain unchanged. Modify only if existing code cannot model a private/server-only generated manifest without it; prefer internal script/source shapes, and do not add client-facing review/provenance fields. |
| **Conditional:** `lib/catalog/availability.ts` | Existing readiness/availability projections | No change planned. Consider only if a concrete technical readiness check is shown necessary; no recognizability or count-based release gate is authorized by this plan. |

### Explicitly excluded paths and scope

No UI/gameplay/client changes, route authorization, provider dispatcher redesign, category availability or semantic metric changes, other provider categories, monthly listeners/Twitch followers, database/CMS/telemetry/ML/geo-personalization, new dependencies, new test framework, production operations, recurring automation/cron, or changes to `GameItem` unless the condition above is evidenced and approved. No manual volatile metric values. No Spotify/Luminate dependency. No edits to analysis or prior plans.

## 7. Granular implementation sequence

Each pass is gated on successful read-back and review of its output; generation and provider calls happen only during approved implementation, with safe credentials/environment and terms confirmed.

1. **Contracts and baseline.** Inspect working-tree state and relevant diffs first; preserve unrelated owner work. Record counts, hashes, copies/version references, generator versions, and current aggregate diagnostics for all three runtime outputs. Define/version the shared source schema, status transitions, required provenance, source terms gate, and validator behavior. No output overwrite in this pass.
2. **Canonical source and reviewer workflow.** Add the proposed candidate JSON and pure local validator. Define pending-by-default import; enforce only approved entries feed generation. Record evidence/source and reviewed dates; optional reason; support stale re-review. Import current pools/seeds as pending, not approved. Validate status transitions and uniqueness. Avoid candidate source writes based on a live provider-only payload.
3. **Artist qualification pool.** Expand artist-focused discovery leads, resolve MBIDs/linked IDs, record provenance, deduplicate, and manually review artist familiarity and coverage. Requalify all 17 seeds and all baseline artist entries. Do not use album-count or image results as qualification. Continue review/discovery passes toward ~200–300+ qualified candidates without changing criteria.
4. **Artist artifact generation.** Update the artist generator to consume approved MBIDs only. Fetch authoritative primary-type Album count and existing image/license inputs; report failures/drops and source lineage; validate complete output and thresholds separately. Generate fresh snapshot to a temp path and atomically replace only after validation. Confirm its existing reader/runtime `GameItem` contract remains unchanged.
5. **Album-specific metadata and qualification.** Extend canonical candidate records to release-group identity with artist MBID, primary/secondary type, source/provenance, and review status. Generate candidate leads from reviewed artist discographies plus legitimate album-specific leads; individually review albums, variants and borderline exceptions. Requalify all 220 baseline items; no seed grandfathering. Add metadata-preserving MusicBrainz generation and album snapshot manifest/reader validation. Preserve canonical IDs/type/date/provenance in private/generated metadata; continue emitting only public gameplay fields at runtime.
6. **Album fresh regeneration.** Generate date and CAA art for approved release-group IDs, retaining MusicBrainz first date and exact precision. Check release-group IDs, artist link, types, duplicate/near-duplicate review disposition, valid dates, art, and projection. Do not reinterpret missing data or substitute release types. Repeat album-specific discovery/review to ~200–300+ usable approved items; report genuine shortfall.
7. **YouTube pending discovery and approval split.** Reclassify all current search results/seeds as pending; retain query/source provenance where recoverable, mark unknown provenance honestly, and do not invent historical query details. Expand broad leads across creator, entertainment/media, major brands, music and permissible editorial references; canonicalize IDs/handles. Maintainers review duplicates, secondary/support/archive/local corporate identity, and inactive famous cases. Search rank and channel stats never auto-approve.
8. **YouTube fresh catalog.** Generate only approved canonical IDs after identity/current record validation. Preserve channel type/provenance and aggregate validation report in generated metadata; keep runtime identity contract compatible. Runtime continues `channels.list` for subscriber values. Hidden/missing/deleted/private or otherwise invalid records are excluded and reported; do not write subscriber values into the candidate source or silently replace the metric.
9. **Scale expansion loop.** For each category independently, compare approved and generated usable totals with the desired ~200–300+ range, inspect global/language/era/source/type coverage, and add discovery/review batches. If under target, mark incomplete and continue discovery/review. Never lower qualification standards or treat the number itself as a hard runtime gate.
10. **Validation/report and handoff.** Run candidate validator; inspect generation reports, artifact diffs/hashes, and provenance/metric/artwork drops. Run applicable lint/typecheck/build and existing YouTube catalog validation. If provider credentials/environment/terms are not confirmed, do not make provider calls; record blocked generation and preserve baselines. Once fresh artifacts are accepted, exercise Classic and Time Attack for relevant categories. Separate maintainer gameplay review from technical validation; no scientific recognition claim.

## 8. Validation matrix and acceptance evidence

There is no configured automated test framework. Existing project scripts are documented in [`package.json`](../package.json:5). Verification shall report actual status and evidence, never infer pass from plan completion.

| Check | Planned evidence / acceptance condition |
|---|---|
| Source contract | Validator rejects malformed IDs, duplicate canonical identities, invalid status/type fields, missing provenance/review fields where required, and non-approved runtime selection. Pending/discovered/rejected/invalid/stale never enter generated production artifacts. |
| Qualification | Maintainer review recorded for every generated identity; no metric/rank/art validity auto-approval; artist and album recognition are separate; all current seeds/baseline identities requalified. No numeric recognition score. |
| Factual metrics | Album count uses only MusicBrainz release groups with `primary-type === Album`; release date uses canonical release group `first-release-date` and preserves precision; YouTube subscriber values continue from runtime `channels.list`. No metric substitutions. |
| Album identity/type | Generated album records retain release-group ID, artist MBID, primary/secondary types and returned first date; duplicate IDs fail; potential title/edition variants appear in review report; unresolved type/exception fails closed. |
| Artwork/technical output | Artist image, album CAA art, YouTube thumbnail/name and existing runtime field requirements validate; gaps are reported and cannot qualify/approve. Output retains valid baseline if generation fails. |
| Before/after report | Baseline hashes/counts are captured before writes. Per-pool report includes discovered, invalid/auto-rejected, pending, approved, rejected/stale, generated usable, duplicate, missing/hidden provider facts/art, reason counts, and album type breakdown. |
| Desired scale | Report counts toward desired ~200–300+ qualified **and generated usable** per category. Below target is explicitly incomplete and triggers more discovery/review, not a relaxed gate. No recognition percentages are asserted. |
| Existing focused check | `npm run catalog:youtube-channels -- --validate` validates generated YouTube identity catalog without provider calls. Adapt only if new metadata contract requires updated validation. |
| Static quality | `npm run lint`, `npx tsc --noEmit`, and `npm run build` after source/code changes; no automated `npm test` claim because no test script/framework is configured. |
| Provider-backed generation | Only after explicit implementation approval, safe environment and source terms check. Snapshot/catalog generators make live provider calls and must not be run as an incidental test. No credentials or private values in source, reports, plans, or logs. |
| Runtime | After fresh outputs and technical checks, verify relevant categories in both Classic and Time Attack: items load, displayed values reflect unchanged source metrics, image/empty/error behavior remains correct, and no malformed output. Runtime behavior is not proven by static validation. |
| Human gameplay acceptance | Maintainers manually inspect candidate appropriateness and play representative pairs after implementation. Qualitative acceptance only; no scientific recognition telemetry or population-wide claim. Later player research is separate work. |

`number-of-albums` and `album-release-date` generation may use the existing developer generation route/adapter; do not assume credentials or provider availability. Confirm local Next guidance in [`AGENTS.md`](../AGENTS.md:1) and its locally installed documentation before any future code changes. This is a plan-stage note; no code is written here.

## 9. Fail-closed, output safety, and rollback

- Never auto-relax review criteria, album type handling, technical checks, or the desired scale interpretation to fill a pool. A provider error or rejected identity does not silently substitute another source or metric.
- Approval is not output usability. Missing image, date, artist/release identity, required type metadata, title, or metric keeps the item out of runtime and is counted with a reason. Hidden YouTube subscriber values remove the runtime item and are reported; do not copy cached/third-party counts.
- Invalid candidate source/schema or unresolved album type/identity fails generation before output replacement. Preserve existing temp-file/atomic-write patterns and ensure write/rename failures leave the prior artifact intact. Validate the complete output and report before final rename.
- Before each replacement capture baseline count, SHA-256 (or equivalent stable hash), file path, and version-control state. Keep rollback in version control; do not create a second production pipeline or commit duplicate “old” catalogs as live outputs. Inspect exact diffs after generation.
- If output/runtime verification fails, restore prior generated artifact(s) from the captured version-control baseline and report failure. Restoration is operational rollback only: old content does **not** regain candidate approval status or become new source-of-truth. Canonical approved source remains separate; repair/review before another attempt.
- Preserve existing API metric contracts, public `GameItem` shape, license handling, private environment boundaries, and provider request etiquette. No live call is required during planning.

## 10. Risks, mitigations, and boundaries

| Risk | Mitigation / plan treatment |
|---|---|
| 200–300+ scale may not be supportable without weakening familiarity | Treat as desired scale; iterative discovery/review; explicitly report incomplete shortfall, never pad or relax. |
| Manual review burden grows | Lightweight JSON statuses, batch review, optional concise reason, reusable identity/source provenance; periodic/offline cadence left flexible. No CMS. |
| Global discovery and English/source bias | Broad source discovery and coverage reporting across language/region/type; no country quota; non-English prominence allowed; no false claim of global representativeness. |
| Nonstandard album types and variants | Retain type metadata; case-by-case primary/secondary type and title review; explicit review for exceptions; reject/hold ambiguity; dedupe IDs and flag near-duplicates without unsafe title merges. |
| MusicBrainz identity mismatch or missing artist relation | Resolve canonical MBID/release-group relation and validate before output; do not merge on names; fail closed and report. |
| Artist fame becomes album approval by proxy | Separate category queues and approval rationale; specific album review required. |
| Prominence changes/stale decisions | Status `stale`, review dates, periodic offline refresh with cadence undecided; stale requires re-review before production. |
| YouTube duplicate, secondary, or outdated channels | Canonical ID/handle checks, reviewed channel type/role, duplicate and secondary-channel checks, revalidation of deleted/private/hidden state; no subscriber-only qualification. |
| Search/chart discovery bias or provenance gaps | Treat search/chart rank as leads, not admission; preserve source/query provenance and unknown provenance labels; use multiple legitimate sources. |
| API terms, quotas, retention, attribution, or reuse | Verify current official provider terms and retention assumptions before implementation/provider use. Spotify/Luminate are optional/non-mandatory; chart pages are leads only when reuse is permitted. YouTube API terms/retention are an explicit pre-generation check. No scraping or assumed bulk rights. |
| Provider field/schema/freshness differs from documentation | Revalidate through approved provider path in implementation; maintain current metric authority; errors remain visible and fail closed. |
| Baseline artifact mistaken for approved content after rollback | Explicit baseline-only status, hashes and version-control rollback; canonical source remains authoritative and old entries still require review. |

**Out of scope:** UI, gameplay or deck policy; CMS; telemetry; ML; geo-personalization; monthly listeners/Twitch; TMDB or major game-domain changes; database/infrastructure; scientific player-recognition measurement; monthly automated refresh; paid Spotify/Luminate as prerequisites.

## 11. Verification and approval boundary

Planning-only verification performed for this artifact: accepted analysis and existing catalog-pool plan read; current package scripts and relevant generators/adapters/readers inspected; no source edited except this new plan file. No lint/build/typecheck, provider call, generator, live application, runtime session, candidate review, or fresh artifact inspection was performed for this plan.

Implementation approval is limited to the future allowlist in Section 6. It does not authorize provider calls before legal/terms/environment checks, nor automatic changes to unrelated files. Existing snapshots remain rollback baselines until an approved and verified replacement is intentionally accepted. No second production pipeline is to be maintained.

### Open questions / Needs Verification

- **Needs Verification [official/legal/provider]:** before implementation uses an external chart/catalog or retains YouTube API-derived information, verify current provider/API terms, quota/compliance, reuse, retention, attribution, and commercial access. Spotify and Luminate remain optional discovery leads only; neither is mandatory. This is a required implementation safety check, not a blocker to the repository-native plan.
- **Needs Verification [environment-specific]:** availability of provider credentials, current live schemas/responses, generated artwork, current per-channel subscriber visibility, and safe local generation environment. Do not run provider-backed regeneration until confirmed.
- **Needs Verification [player testing]:** no representative player recognition rates, pair/session recognizability, or obscure-vs-obscure frequency are established. This plan deliberately uses maintainer case review plus manual post-implementation gameplay review and makes no population-wide/scientific claim; later player testing is separate.
- **Needs Verification [product-decision]:** exact periodic/offline refresh cadence remains undecided; no cadence is required to implement the manual review/source model.
- **Needs Verification [inferred-from-codebase]:** exact future album generated-manifest envelope and whether the existing album reader requires a narrow metadata-parser update should be confirmed during implementation against current reader contracts; the requirement to preserve canonical artist/release IDs, type metadata, first date, and provenance is fixed, while public `GameItem` remains unchanged.

## Plan Gate

**PASS — ready for implementation review, not implementation authorization.** The desired pools, qualification distinctions, source of truth, target scale and shortfall behavior, exact proposed file allowlist, ordered implementation passes, validation/reporting, failure handling, and rollback are specified. Legal/provider, environment, and player-recognition evidence remain explicit nonblocking verification boundaries: legal/terms confirmation gates external-source use, environment confirmation gates live generation, and player research is not required for this maintainer-reviewed plan. The exact refresh cadence is intentionally unresolved and nonblocking. No code or generated artifact was changed by this plan.
