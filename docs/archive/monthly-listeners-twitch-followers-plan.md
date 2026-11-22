# Monthly Listeners and Twitch Followers — Implementation Plan

**Task type:** Implementation plan and documentation-only closeout for two category integrations.  
**Status:** Implementation work is present in the repository; categories have separate release states. This document records source-backed disposition and reported historical evidence, not a new implementation or live-provider verification.  
**Primary source:** Approved [`monthly-listeners-twitch-followers-analysis.md`](monthly-listeners-twitch-followers-analysis.md:1). Its source findings are supplied analysis, not independent runtime/provider verification.  
**Scope of the 2026-11-02 closeout:** Reconcile this existing plan and the related Analysis with current source evidence. Only those two documentation files are changed; no application, provider, or snapshot code/data is changed.

## 1. Purpose, status, invariants, and architecture

This plan originally specified offline data pipelines for Music `monthly-listeners` and Social Media `twitch-followers`. The implementation and catalog now exist. The current release dispositions differ: `monthly-listeners` is `blocked` while its availability record says `productionPlayable: true` and describes owner approval; `twitch-followers` is `released` and `productionPlayable: true`. Current source evidence is in [`availability.ts`](../lib/catalog/availability.ts:197) and [`availability.ts`](../lib/catalog/availability.ts:242). This closeout reports those source states as observed and does not silently resolve their mismatch or change application behavior.

**Implemented architecture (source-observed):** server-side Metrika tooling populates local metric data; category-specific server-only readers provide local data through the common dispatcher as normalized `GameItem[]`. Twitch also joins provider metrics against an owner-reviewed roster. Normal gameplay uses no provider request. Home remains category-agnostic; category visibility/route authorization are controlled by existing catalog and availability machinery. **Superseded 2026-11-08 (owner decisions D1–D10):** Twitch imagery is URL-only, stored in the local artifact `lib/api/data/twitch-avatar-images.json` and populated offline by `scripts/enrich-twitch-profile-images.mjs` through Twitch Helix Get Users in batches of at most 100 identities (196 approved identities ⇒ 2 requests). Only verified `profile_image_url` CDN URLs are stored; no binaries, base64, or re-syndication are involved. The deterministic identicon remains a per-item fallback and no approved creator is dropped for a missing avatar. Avatar freshness is independent of the 14-day metric gate. Readers stay local-only; browser loading of a snapshotted `static-cdn.jtvnw.net` URL is outside the server no-request-time-provider-call boundary. Credentials are used only by the offline script and are never printed or persisted. Presentation is unchanged. Validation is `node scripts/validate-twitch-followers.mjs`. The derived runtime snapshot and its generator are retired, and Section 17 references to them are historical. No Spotify Web API runtime dependency is present in the described flow.

No Design artifact is required: owner explicitly overrode the separate Design stage. This plan does not choose new visual behavior.

## 2. Metrika client plan and security boundary

- Use only `METRIKA_API_TOKEN`, read by server-only code; no imports from client-reachable modules. Do not read, reuse, or disclose IGDB Twitch client credentials/secrets. Existing IGDB use is separate: [`igdb.ts`](../lib/api/igdb.ts).
- Implement a shared Metrika HTTP client in a new server-side module under `lib/api/` (exact filename conditional on Pass 0 conventions). Use bearer authentication and batches of at most 10 resources, subject to pre-call revalidation of provider docs.
- Track request accounting across both categories: count each HTTP request and retries, pace below documented limits, honor `Retry-After` if documented, and bound retries with backoff for transient failures only. Do not retry permanent auth/validation errors indefinitely. Stop/defer on quota exhaustion or rate limit; never publish a partial run as complete.
- Model provider outcomes distinctly, including documented `pending`, `not_found`, `stale`, and `unavailable`, plus HTTP/rate/quota/malformed/partial outcomes. Sanitize errors: no bearer header, token, raw sensitive response, or credential-bearing URL in logs or output. Persist no raw provider payloads.
- Prior documentation research summarized at [`metrika.run`](https://metrika.run) claims 500 requests/month/account, 100 requests per 60 seconds, daily known-resource refresh, batches up to 10, bearer auth, and the states above. These are documentation claims only, not runtime-tested; revalidate exact endpoint, terms, metric semantics, limits, response schema, and token/account access at Pass 0 immediately before any approved provider call.
- Security checks in implementation: source grep for token references/import boundaries; production build and client-bundle inspection; source audit for server-only markers/import graph; capture/log redaction checks using mocked responses; snapshot/API payload scan for token-like strings and raw payloads. No secret values in tests, logs, fixtures, plans, snapshots, or handoff. Never use IGDB Twitch secrets for this client.

## 3. Proposed data contracts (not existing schemas)

All contracts below are proposals and require schema review before implementation. Keep identity/candidate evidence separate from metric snapshots. Do not retain raw provider payloads or secrets.

**Music identity-only catalog:** version/schema version; canonical MusicBrainz MBID; canonical artist name; Spotify artist ID and deterministic artist profile URL when resolved; resolution source(s) and source evidence/relationship; cross-source classification; review status and reviewer decision where applicable; resolved/collected timestamp; optional approved alias evidence. No metric values in this catalog.

**Twitch candidate catalog:** version/schema version; canonical numeric Twitch user ID when available; current login (mutable); display name; provenance/source identifiers and source ranking/evidence; language and region where evidenced; objective prominence/viewership evidence kept separate from human recognizability/qualification decision; review status; aliases/rename history; image URL/source and approval evidence; timestamps. No metric value in this catalog. Candidate-source terms/license review precedes intake.

**Separate metric snapshots per category:** schema version; generation timestamp (`generatedAt`); collection timestamp(s) (`collectedAt`/per-record collection time); source/provider and semantic category; validated records with canonical identity and only the public `GameItem` fields needed at runtime (name, image, metric value, and stable identity if supported by existing contract); no raw payload, private enrichment, token, or debugging secrets. The shared current contract is [`types/api.ts`](../types/api.ts:6); do not assume its exact fields are sufficient until Pass 0 verifies it. Metric snapshots do not become identity catalogs.

## 4. Music identity-resolution algorithm and deferred census

1. Load existing MusicBrainz artist records by exact MBID and reject invalid identifiers; deduplicate exact MBIDs deterministically. Current seed/snapshot observations are in the approved analysis: [`curatedPools.ts`](../lib/api/curatedPools.ts) and the reported 251-record snapshot, but that count is not a completed census.
2. For each exact MBID, inspect MusicBrainz artist URL relationships for a deterministic Spotify artist profile URL; parse/validate Spotify artist IDs from accepted profile URL forms only.
3. For unresolved identities, query Wikidata by exact P434=MBID and read P1902 (Spotify artist ID); cross-check against the MusicBrainz relationship when both exist. Do not fuzzy-match names automatically.
4. Classify each record: `both_agree`, `musicbrainz_only`, `wikidata_only`, `conflict`, `missing`, `ambiguous`, `invalid`, or `manual_review` (final enum names are proposed). Multiple matches, conflicting sources, redirects/aliases not deterministically resolved, and malformed IDs are held for manual review and excluded from metric publication until approved.
5. Keep the identity catalog distinct from the monthly metric snapshot. Only approved, deterministic records enter a metric-refresh batch.
6. A later implementation pass performs the full census of the total artist catalog and current population, reconciles counts and identities, and reports source coverage, duplicates, unresolved records, and approved records. **No census or provider call is part of this Plan task.**

## 5. Twitch candidate intake and qualification

- Discover candidates from multiple independently reviewed sources; do not treat the YouTube pool/catalog as a Twitch pool. The approved analysis identifies the current social catalog as YouTube-specific and not a safe substitute.
- Normalize candidates using stable numeric Twitch user ID when available; login is mutable and must be updated only on verified identity continuity. Preserve old login/display-name aliases and source evidence. If no stable ID is available, require additional review and do not silently merge identities.
- Record source ranking/provenance, language/region evidence, objective prominence/current or sustained/historical evidence, and human recognizability decision as separate facts. Review organizations, events, inactive channels, aliases/renames, and suspicious candidates explicitly; classification may include keep, reject, hold, organization/event, inactive, alias, suspicious, or needs-review.
- Target 200–300 qualified channels only if quality permits. No formula and no padding. Do not count unreviewed candidates as qualified. Candidate-source terms, attribution, and permitted reuse must be checked before intake or publication.

## 6. Image strategy

- Music may reuse the existing MBID → Wikidata P434 → P18 image resolver in [`wikidataArtistImages.ts`](../lib/api/wikidataArtistImages.ts), but implementation must first confirm coverage, source behavior, attribution/rights, and current image validity. Reuse is not assumed.
- Twitch should prefer an exact profile image tied to verified Twitch identity or another specifically approved source. Metrika is not an image authority unless current provider documentation explicitly establishes that capability.
- Never exclude an item or fail the snapshot for a missing image (owner decisions D3/D8): use the verified Twitch `profile_image_url` URL when the local avatar artifact supplies one, otherwise use the deterministic per-item identicon. No other fallback source is permitted, and [`GameCard.tsx`](../components/game/GameCard.tsx) presentation is unchanged.
- Do not add OAuth solely to obtain images. Any concrete evidence that OAuth is required is an owner checkpoint and scope change.

## 7. Snapshot generators, readers, and failure policy

- Use developer-run Node scripts consistent with existing snapshot generators (conventions to verify in [`scripts/`](../scripts/) at Pass 0). No cron, database, queue, or request-time provider crawl.
- Use separate category-specific generated files and pure local readers. Readers return `GameItem[]` only and must not make network calls. Reader authorization/availability remains fail-closed while hidden.
- Generator stages: validate inputs → resolve approved identities/candidates → request bounded batches → classify every provider result → validate full completeness → write sibling temporary file → read back and validate serialized artifact → atomically replace destination. If any stage fails, leave the prior known-good artifact untouched. Confirm filesystem atomic-replace semantics on the target environment before implementation.
- `pending`, `not_found`, `stale`, `unavailable`, partial response, rate limit, quota, auth failure, malformed payload, or failed validation must never become zero. No partial publish. Preserve last-good artifact, but the reader must hard-fail if the artifact exceeds the approved hard-stale threshold; the category remains disabled rather than serving hard-stale data. Any allowed per-record omission requires owner-approved completeness policy; default is abort whole publish.
- Verify reader behavior is deterministic and local-only; snapshots contain normalized public runtime fields only.

## 8. Freshness and quota proposal

Initial proposal: weekly snapshot generation; retain distinct `collectedAt` and `generatedAt`; warn at 7 days and hard-stale at 14 days. Do not serve beyond the hard threshold. Owner approval is required before activation; thresholds/cadence are not confirmed policy.

At 300 Music identities plus 300 Twitch candidates, batching by 10 is approximately 60 requests per refresh; four refreshes are approximately 240 calls before retries, diagnostics, or other consumers. The account quota is shared. Recommend an operational cap of 350 of the claimed 500 monthly calls, reserving at least 150 for retries, diagnostics, newly approved identities, and other consumers; alternatively owner must explicitly approve a different budget/reserve. Track actual request count and stop before budget exhaustion. Recalculate after final pool size, batching semantics, quota sharing, and provider docs are verified. Never assume the free tier or current quota is permanent.

## 9. Snapshot validation and release floor

Validate Music and Twitch independently before publication:

- schema/version and source/category correctness; generation and collection timestamps; freshness;
- unique canonical identity (MBID/Spotify mapping for Music; numeric Twitch identity where available), no duplicate IDs, aliases, or conflicting logins; tie distribution and candidate diversity reviewed;
- non-empty, canonical display names and valid approved images; image coverage and invalid-image checks;
- metric is numeric, finite, nonnegative, integer-valued if provider documentation confirms integer counts; verify provider value type and monthly-listener/follower semantics before accepting. No zero substitution;
- completeness and provider state accounting; no unresolved identity, partial batch, malformed record, or unapproved source;
- display wording is category-correct (monthly listeners vs Twitch followers), with no implication that metrics are live;
- proposed minimum release floor: 100 approved items per category, with target 200–300 where quality permits. This is a proposal, not an approved product threshold. Release-floor review is an owner checkpoint.

Include duplicate/alias audit, tie/diversity review, source provenance audit, and image-coverage report. Provider success is not release approval.

## 10. Dispatcher/catalog touchpoint classification

This is a planned conditional scope, not authorization to modify files in the current Plan-only task.

| Touchpoint | Classification | Planned treatment / evidence |
|---|---|---|
| [`availability.ts`](../lib/catalog/availability.ts:13) | Required for activation; likely edits | Keep both hidden until all seven gates are satisfied independently; confirm exact gate semantics and prove all gate values before change. |
| [`semanticCatalog.ts`](../lib/catalog/semanticCatalog.ts:189) | Likely / conditional | Existing semantic entries are reported; only change wording/metadata if a concrete gap is verified. Avoid activating here prematurely. |
| [`types/game.ts`](../types/game.ts) internal `CategoryId` | Conditional | May need keys only if source confirms internal type cannot represent categories; verify before editing. |
| [`index.ts`](../lib/api/index.ts:39) | Required for activation; likely edits | Add category-to-reader mapping only after validated snapshots exist; keep dispatcher inaccessible while availability is hidden. |
| New Metrika client, identity/candidate validators, readers, generators, metric snapshots | Required; exact paths conditional | Create category-specific modules/artifacts after Pass 0 confirms conventions; never claim those files already exist. |
| [`routeAuthorization.ts`](../lib/catalog/routeAuthorization.ts:45) | Unaffected by default; conditional | Generic fail-closed authorization already rejects unavailable categories. Change only if implementation evidence identifies a concrete authorization gap. |
| [`app/api/test-fetch/route.ts`](../app/api/test-fetch/route.ts) | Unaffected by default | Leave unchanged; route is guarded for full/POST per analysis, but no raw/token output or diagnostic expansion. Verify deployment exposure before any separately approved diagnostic work. |
| [`types/api.ts`](../types/api.ts:6), Home UI, routes, game components, [`GameCard.tsx`](../components/game/GameCard.tsx), high scores, CSS, IGDB, YouTube | Unaffected absent concrete new evidence | Generic `GameItem[]` architecture appears sufficient; revisit only if implementation evidence contradicts analysis and owner approves scope. No current change proposed. |

## 11. Testing and verification proposal

The project analysis reports no test framework/script. Do not introduce a test dependency/framework. At Pass 0 inspect [`package.json`](../package.json) and local conventions. Use existing lint/build/type-check scripts when proportionate; use lightweight Node scripts/fixtures only if compatible with established module conventions, otherwise use a narrowly scoped verification harness approved by owner.

Use mocked `fetch` only; automated checks must not call real providers. Cover:

- Metrika request batching (≤10), bearer header, pacing/accounting/retry bounds, status mapping, sanitized errors, absence of secret/raw payload in logs/snapshots/client bundles;
- Music Spotify URL parsing, exact Wikidata P434/P1902 matching, source agreement/conflict, missing/ambiguous/invalid identities, deterministic dedupe;
- Twitch stable-ID/login rename and alias behavior, candidate provenance and separate human-review state;
- snapshot schema, uniqueness, numeric validation, image checks, freshness warning/hard stop, provider partial/state handling, and atomic failure preserving last-good;
- local-only reader behavior, dispatcher mapping and unavailable-category denial while hidden, all seven availability gates, and regressions for existing categories;
- category-specific Classic and Time Attack smoke tests only after controlled activation, with no runtime provider request.

## 12. Eight implementation passes (future work only)

The exact names/paths below are proposed. Any path explicitly conditional must be confirmed at its pass; do not invent that an unlisted artifact exists. Every pass preserves unrelated work and the hidden state until release.

### Pass 0 — Source, docs, account, and local framework verification

- **Objective:** Reconfirm source facts, Metrika docs/terms/quota/semantics, account access prerequisites, repository conventions, and applicable locally installed Next server-only guidance before code or any provider call.
- **Likely files:** read-only [`AGENTS.md`](../AGENTS.md), `node_modules/next/dist/docs/` (exact relevant local guide conditional), [`package.json`](../package.json), [`scripts/`](../scripts/), catalog/API/type files cited above, current snapshot readers; no files created/modified.
- **Untouched:** all source/data/credential files; all production code and snapshots.
- **Inputs:** approved analysis, current source, public provider docs/terms, owner-approved access status without disclosing token; no secret reads in this planning pass.
- **Actions:** verify exact Metrika endpoint, metric semantics, states, request limits, terms, refresh rules and auth; verify identity source coverage, snapshot conventions, category types/gates and module format. Do not make calls until docs/terms/access approved.
- **Validation:** source/doc citations refreshed; local Next server-only guidance read; git status and target file allowlist confirmed.
- **Output:** verification notes for implementation checkpoints; no data generated.
- **Completion criteria:** unresolved critical docs/terms/access facts and conditional paths are explicitly listed; no assumption promoted to fact.
- **Rollback:** none (read-only).
- **Dependencies:** owner approval to proceed to implementation; access/terms review.
- **Owner checkpoint:** approve provider/metric authority and any terms/access implications before any live request.

### Pass 1 — Shared Metrika client and tests

- **Objective:** Implement the server-only shared HTTP boundary, bounded batching, accounting, pacing/retries, state mapping, and redaction.
- **Likely files:** new `lib/api/` client module (filename conditional); new compatible test/fixture files only if feasible; possibly test script only if existing tooling supports it (no framework/dependency addition).
- **Untouched:** client UI, IGDB credentials/adapter, snapshots, category availability/dispatcher, env files.
- **Inputs:** Pass 0 verified docs and owner-approved token provisioning; mocked fetch fixtures.
- **Actions:** bearer auth from `METRIKA_API_TOKEN`; batches ≤10; centralized request count and limits; bounded retry rules; sanitized typed outcomes; server-only import boundary.
- **Validation:** mocked batching/auth/status/rate/quota/retry/redaction tests; grep/source boundary and build/client-bundle checks as available; no real provider calls in tests.
- **Output:** reusable client and test evidence; no snapshot.
- **Completion criteria:** contract matches revalidated docs, secrets/raw payload excluded, failure states distinguishable.
- **Rollback:** remove new client/test files and revert only targeted changes; no categories enabled.
- **Dependencies:** Pass 0 and owner approval.
- **Owner checkpoint:** approve client API/error/retry policy before pipeline consumers.

### Pass 2 — Music resolver, identity catalog validator, census/report

- **Objective:** Deterministically resolve exact MBID-to-Spotify identities and perform the full 251/current-population census during implementation, not earlier.
- **Likely files:** new Music identity resolver/catalog validator under `lib/api/` or established data tooling (exact paths conditional); new generated identity artifact/report only after validation; test fixtures.
- **Untouched:** existing artist snapshot/seeds unless an explicitly approved targeted input change is required; metric snapshots, dispatcher, availability, UI.
- **Inputs:** existing artist records, MusicBrainz URL relations, exact Wikidata P434/P1902 evidence; approved source access/terms.
- **Actions:** dedupe exact MBID; classify source results; no fuzzy matching; manual-review conflicts; census total/current population and report coverage/approved/unresolved counts.
- **Validation:** deterministic fixtures, duplicates/conflicts/aliases, report reconciles source counts, approved-only catalog, no secret/raw provider payload.
- **Output:** identity-only catalog plus census/quality report; not metric values.
- **Completion criteria:** owner-approved identity policy; only deterministic reviewed identities marked approved; unresolved records excluded.
- **Rollback:** remove/regenerate only newly produced identity artifact; preserve source snapshots and any last-good outputs.
- **Dependencies:** Pass 0; Pass 1 only if approved evidence gathering needs Metrika later (identity resolution itself should not depend on metric calls).
- **Owner checkpoint:** approve identity conflict classifications and accepted coverage before monthly metric pipeline.

### Pass 3 — Monthly snapshot generator and reader

- **Objective:** Produce validated offline monthly-listener snapshots from approved Music identities and implement a pure local reader.
- **Likely files:** new Music generator under `scripts/`; new Music snapshot reader/module under `lib/api/`; new category-specific snapshot under `lib/api/data/`; tests. Exact paths conditional.
- **Untouched:** Twitch candidate/catalog/snapshot, availability/dispatcher activation, existing source snapshots, UI.
- **Inputs:** approved identity catalog from Pass 2, Pass 1 client, approved quota/freshness policy, approved image source policy.
- **Actions:** refresh in batches, classify all states, validate metrics/images/uniqueness/freshness, atomically write and read back, preserve prior good snapshot on any failure; reader hard-fails beyond hard-stale age and returns normalized `GameItem[]` only.
- **Validation:** mocked responses for pending/not_found/stale/unavailable/rate/quota/malformed/partial; atomicity and reader tests; category-specific snapshot checks.
- **Output:** accepted monthly snapshot and pure local reader.
- **Completion criteria:** complete valid artifact, policy-compliant freshness and quota, no partial publication.
- **Rollback:** keep last-good artifact; remove new artifact only if no prior known-good existed and category remains hidden.
- **Dependencies:** Passes 0–2, Pass 1, owner choices on metric semantics/images/freshness/quota.
- **Owner checkpoint:** review census, metric interpretation, image coverage, and proposed release floor.

### Pass 4 — Twitch candidate intake, validator, and human pool build

- **Objective:** Discover, normalize, and human-qualify a Twitch-only candidate pool without metric calls.
- **Likely files:** new Twitch candidate intake/validator and candidate catalog/data artifact under established `lib/api/`/`scripts/` conventions (exact paths conditional); review report and fixtures.
- **Untouched:** YouTube catalog/seeds, IGDB, monthly identity/metric artifacts, dispatcher/availability/UI.
- **Inputs:** independently reviewed discovery sources and their terms; candidate evidence and owner-approved qualification rubric.
- **Actions:** normalize by numeric ID where available; retain mutable logins and aliases; record provenance/rank/language/region/objective evidence separately from human decisions; classify org/event/inactive/alias/suspicious; target 200–300 only if quality permits.
- **Validation:** duplicate/rename/alias fixtures; terms/provenance audit; independent pool review and diversity report; no padding.
- **Output:** reviewed candidate catalog and qualification report; no metric values.
- **Completion criteria:** owner accepts candidate rubric and pool; adequate approved count under explicit floor or category remains hidden.
- **Rollback:** remove/revert only new candidate artifacts; do not modify YouTube artifacts.
- **Dependencies:** Pass 0; owner approval of sources, terms, rubric, image policy.
- **Owner checkpoint:** approve candidate composition and any source/license concerns.

### Pass 5 — Twitch metric snapshot and reader

- **Objective:** Refresh approved Twitch candidates into an offline follower snapshot and pure local reader.
- **Likely files:** new Twitch generator under `scripts/`; Twitch reader under `lib/api/`; Twitch snapshot under `lib/api/data/`; tests. Exact paths conditional.
- **Untouched:** candidate identity catalog except approved corrections; Music artifacts; availability/dispatcher activation; IGDB/YouTube/UI.
- **Inputs:** Pass 4 approved catalog, shared Pass 1 client, approved provider semantics/quota/freshness/images.
- **Actions:** batch verified identities, map follower metric states, validate image and identity stability, atomically publish complete snapshot only, preserve last-good; reader returns normalized `GameItem[]` locally.
- **Validation:** mocked provider states, rename/alias handling, numeric/image/schema/freshness checks, atomicity, no network from reader.
- **Output:** validated Twitch snapshot and reader.
- **Completion criteria:** complete qualified snapshot within approved quota/freshness; otherwise hidden with last-good preserved if valid.
- **Rollback:** preserve prior artifact; remove only newly published artifact if invalid and keep category disabled.
- **Dependencies:** Passes 0, 1, and 4; owner decision on metric semantics/images/quota.
- **Owner checkpoint:** approve pool, follower semantics, and snapshot quality before dispatch integration.

### Pass 6 — Dispatch, types/mapping, diagnostics remain unchanged by default

- **Objective:** Wire validated local readers in code while both categories remain unavailable/hidden; make only evidence-required internal type/semantic changes.
- **Likely files:** [`lib/api/index.ts`](../lib/api/index.ts), [`lib/catalog/availability.ts`](../lib/catalog/availability.ts), conditional [`types/game.ts`](../types/game.ts), conditional [`lib/catalog/semanticCatalog.ts`](../lib/catalog/semanticCatalog.ts); exact edits depend on verified model.
- **Untouched:** [`app/api/test-fetch/route.ts`](../app/api/test-fetch/route.ts) by default, route authorization unless a demonstrated gap exists, all UI/routes/gameplay/GameItem/high-score/CSS/IGDB/YouTube modules.
- **Inputs:** both validated local readers/snapshots, exact type/catalog mapping evidence, all gates still disabled.
- **Actions:** add internal mapping and dispatcher entries only in a way that preserves denial while hidden; avoid public diagnostic/token output. Leave `test-fetch` alone by default.
- **Validation:** types/lint/build; route authorization denial before dispatch while hidden; existing categories dispatch regressions; grep for accidental activation and runtime network calls.
- **Output:** integrated but unplayable category readers, still disabled.
- **Completion criteria:** mappings compile, unavailable categories remain denied, existing categories unchanged, no provider call in gameplay path.
- **Rollback:** revert only targeted mapping/type/catalog hunks, retain validated data artifacts, keep categories hidden.
- **Dependencies:** Passes 0–5 and owner scope approval for exact conditional files.
- **Owner checkpoint:** review diff and verify hidden state before any release qualification/activation.

### Pass 7 — Release qualification and controlled per-category activation

- **Objective:** Evaluate all release gates and, only with owner approval, activate Music and Twitch independently and reversibly.
- **Likely files:** availability/semantic/dispatcher files only if gated changes were not already staged in Pass 6; potentially refreshed category snapshot; no other files by default.
- **Untouched:** unrelated categories, diagnostics by default, UI/gameplay, credentials, other category artifacts.
- **Inputs:** release dossier for each category, approved snapshots, all test and security evidence, source terms, owner decisions.
- **Actions:** run each gate independently; obtain owner approval per category; enable only the category passing every gate; retain separate rollback/disable path and last-good data. No simultaneous activation required.
- **Validation:** identities/provenance/qualification, adequate count, metric correctness and diversity/ties, valid images, no duplicates, freshness/atomicity, provider failure behavior, secret safety, all seven availability gates, route authorization, Classic and Time Attack smoke tests; confirm disabled category still rejects.
- **Output:** either category-specific release decision and enabled state, or documented hold with category remaining hidden.
- **Completion criteria:** every applicable gate passes and owner explicitly approves that category; provider success alone is insufficient.
- **Rollback:** immediately re-hide/disable the affected category, retain last-good snapshot, revert only activation hunks; verify route denial after rollback.
- **Dependencies:** all prior passes and owner sign-off.
- **Owner checkpoint:** explicit independent release approval for each category.

## 13. Repository hygiene and execution discipline

- Check `git status` before work and before each checkpoint; preserve unrelated changes. At plan creation, working tree already showed pre-existing modifications to `.gitignore` and `lib/api/data/artist-album-counts.snapshot.json`, plus untracked `docs/` and `governance/`; these are not part of the plan-task change and must not be overwritten or staged implicitly.
- Work only within approved targeted files/blocks for each future pass; read before edit; make incremental changes; run the pass-specific check; review diff; checkpoint before proceeding. If a necessary file falls outside the approved list, stop and obtain owner approval.
- No commits unless owner requests. No secrets in logs or artifacts. Keep temporary response data untracked and redacted; generated snapshots are intended repository outputs only after accepted validation. Preserve the known-good snapshot before refresh and make rollback availability the first consideration.
- For this task, create exactly this one Plan artifact and read it back. Do not run build/tests or provider calls.

## 14. Independent release gates for each category

For **each category separately**, keep it disabled until all applicable gates below pass and owner approves:

1. Deterministic identities; conflicts, aliases and duplicates resolved with traceable evidence.
2. Candidate/source provenance and terms reviewed; Twitch human qualification complete; Music identity census/report complete.
3. Adequate approved count without padding; proposed floor 100 and target 200–300 are subject to owner approval.
4. Metric semantics/value correctness, numeric bounds, ties and diversity reviewed; category wording correct.
5. Approved valid image for every published record; rights/source/coverage confirmed.
6. Snapshot schema, completeness, uniqueness, freshness, atomic publication and last-good/hard-stale behavior verified.
7. Provider auth, quota/rate limits, failure states, partial/malformed behavior, retries, and no-runtime-call boundary verified.
8. Token server-only and absent from source client graph/bundle, logs, snapshots, diagnostics, and payloads.
9. All seven availability gates satisfied for that category; route authorization denies before dispatch while disabled and permits only after approved activation.
10. Classic and Time Attack smoke tests pass for the category; unrelated-category regression checks pass; rollback by re-hiding is demonstrated.

No release occurs automatically from provider success or snapshot generation.

## 15. Open items and blockers

### Implementation-time verification

- **Needs Verification [environment-specific]:** exact Metrika docs/schema/endpoint, terms, auth, account quota/sharing, limits, statuses, daily refresh claim, and metric semantics; revalidate at Pass 0 before provider calls.
- **Needs Verification [environment-specific]:** token/account provisioning and access; no token was read or used for this plan.
- **Needs Verification [inferred-from-codebase]:** actual MusicBrainz/Wikidata identity and image coverage; Twitch verified profile-image availability; accepted image rights/attribution.
- **Needs Verification [environment-specific]:** applicable locally installed Next server-only guidance and bundling/source verification procedure.
- **Needs Verification [environment-specific]:** target filesystem atomic replacement semantics and existing generator/module/test conventions.

### Owner decisions

- **Needs Verification [product-decision]:** provider terms and metric authority/equivalence, including use of Metrika `views` for monthly listeners.
- **Needs Verification [product-decision]:** refresh cadence and 7-day warning/14-day hard-stale proposal; zero serving beyond hard stale.
- **Needs Verification [product-decision]:** proposed 100-item minimum and 200–300 target; release floor and completeness/omission policy.
- **Needs Verification [product-decision]:** Twitch candidate qualification rubric, acceptable image policy, tie/diversity expectations, and candidate-source policy.
- **Needs Verification [product-decision]:** shared quota reserve and recommended 350/500 operational cap; quota may change and is shared.
- **Needs Verification [product-decision]:** separate category activation/rollback approval and all availability gate evidence.

### True blockers only after execution begins

Concrete inability to obtain approved provider access/terms, a provider contract that cannot support the required metrics safely, or an insufficient qualified candidate pool after the planned identity/census and human qualification passes may block implementation/release. The deferred Music census and Twitch pool build are planned implementation passes, **not current blockers to approving this Plan**.

## 16. Plan-phase verification status

- **Analysis source:** [Pass] Read the approved analysis at [`monthly-listeners-twitch-followers-analysis.md`](monthly-listeners-twitch-followers-analysis.md:1); claims are explicitly distinguished as supplied analysis versus proposals.
- **Original planning-phase working-tree status:** [Pass] This historical claim pertains to the plan-creation task only.
- **Original plan artifact read-back:** [Pass] Completed during the original planning phase; this does not verify Section 17.
- **Provider/runtime/build/tests:** [Not tested] Documentation-only task; no provider calls, credentials, build, or tests were used or permitted.
- **Design:** not applicable by explicit owner override; no separate Design artifact.

SUPERSEDED: implementation has proceeded; see Section 17 for current dispositions. This closeout does not authorize provider calls, credential use, data refresh, or application changes.

## 17. Implementation closeout and final disposition (2026-11-02)

This section supersedes prospective language above where it conflicts with current repository evidence. The related Analysis is historical and was updated to label its earlier hidden/no-dispatch claims as superseded. This section records the repository state, not authorship by this closeout task. The `git status` inventory contains many modified/untracked artifacts in addition to the two documentation files changed here; their authorship and whether they predate the implementation work are **unknown**. Preserve them; this task did not stage, delete, or commit anything.

### Final architecture and data flows

- **Common production flow:** Home's generic catalog selection → shared mode route and authorization → `FETCHER_MAP` → local category reader → normalized `GameItem[]` → shared game surfaces. There is no category-specific Home logic. The dispatcher has snapshot-backed mappings for both categories in [`index.ts`](../lib/api/index.ts:30).
- **Monthly Listeners:** curated MusicBrainz identities → Spotify identity catalog → Metrika tooling and generated metric snapshot → server-only local reader validates schema, unique identities, values, image URLs, and freshness → dispatcher. Production image attribution is preserved where supplied by the data.
- **Twitch Followers:** candidate discovery and owner review → approved roster + Metrika metrics snapshot → server-only reader joins approved logins/IDs and metrics, creates normalized items and neutral generated avatar data URIs → dispatcher. Creator-photo fidelity work remains deferred, explicitly not a release blocker. *(Superseded 2026-11-08 — see §1 decisions D1–D10: imagery now uses a URL-only local artifact with identicon fallback; creator-photo enhancement shipped 2026-11-08.)*
- Both runtime readers are local-file paths. The integration retains separate offline developer tooling; there are **no normal runtime provider calls** from gameplay.

### Pass dispositions

| Pass | Disposition | Evidence / limitation |
|---|---|---|
| 0 — source, docs, access, conventions | **Complete for documented scope; runtime provider/account checks not asserted.** | Current source/artifact paths and worktree status inspected for closeout. No `.env.local` contents read. Historical documentation and verification claims are not independently reproducible here. |
| 1 — shared Metrika client | **Implemented.** | [`metrika.ts`](../lib/api/metrika.ts) and [`monthly-listeners-provider.mjs`](../scripts/monthly-listeners-provider.mjs) exist. Provider behavior/security test coverage is not asserted by file presence. |
| 2 — Music resolver/census | **Implemented, with reported qualification evidence.** | [`musicSpotifyIdentity.ts`](../lib/api/musicSpotifyIdentity.ts) and [`music-spotify-identities.json`](../lib/api/data/music-spotify-identities.json) exist. The current availability evidence records 236 approved exact-MBID identity joins; no live census/provider call was made for this closeout. |
| 3 — Monthly snapshot/reader | **Implemented; availability is internally contradictory.** | [`monthlyListenersSnapshot.ts`](../lib/api/monthlyListenersSnapshot.ts), [`monthly-listeners.snapshot.json`](../lib/api/data/monthly-listeners.snapshot.json), and [`generate-monthly-listeners-snapshot.mjs`](../scripts/generate-monthly-listeners-snapshot.mjs) exist. Availability records `status: "blocked"` and `productionPlayable: true`, while its rationale/gates describe owner approval and a validated 236-item snapshot. Do not infer that route authorization blocks the category: the guard checks `productionPlayable`. Owner reconciliation is required; this closeout does not assert a final release state. |
| 4 — Twitch discovery/qualification | **Implemented, with reported human-review evidence.** | [`twitch-stream-candidates.json`](../lib/api/data/twitch-stream-candidates.json), [`twitch-owner-review-roster.json`](../lib/api/data/twitch-owner-review-roster.json), [`twitch-owner-review-report.json`](../lib/api/data/twitch-owner-review-report.json), [`discover-twitch-stream-candidates.mjs`](../scripts/discover-twitch-stream-candidates.mjs). Current availability reports 196 approved and 4 rejected identities; this closeout did not rerun discovery/review. |
| 5 — Twitch snapshot/reader | **Implemented; released per current availability source.** | [`twitchFollowersSnapshot.ts`](../lib/api/twitchFollowersSnapshot.ts) reads [`twitch-followers-metrika.snapshot.json`](../lib/api/data/twitch-followers-metrika.snapshot.json) and the owner roster. The derived [`twitch-followers.snapshot.json`](../lib/api/data/twitch-followers.snapshot.json) exists but its role as authoritative generated/production data is not established from inspected source. *(Superseded 2026-11-08 — the derived snapshot is retired.)* Current availability describes 196 unique approved records, valid metrics and neutral imagery. |
| 6 — dispatch/types/authorization | **Implemented; Monthly Listeners source state is inconsistent.** | [`index.ts`](../lib/api/index.ts:30) maps both readers. [`availability.ts`](../lib/catalog/availability.ts:197) records Monthly Listeners as `status: "blocked"` and `productionPlayable: true`; Twitch is `released`/playable at lines 242–246. [`routeAuthorization.ts`](../lib/catalog/routeAuthorization.ts:90) authorizes according to `productionPlayable`, not `status`. Therefore describing Monthly Listeners as effectively blocked based only on the status field would be incorrect. No runtime behavior changed in this documentation closeout. |
| 7 — independent release qualification | **Twitch: marked released in current source. Monthly Listeners: unresolved conflicting availability fields.** | Source records Twitch gates satisfied and owner-approval evidence; monthly source records favorable gates but conflicting status/playable fields. This closeout does not resolve that inconsistency or infer actual runtime/deployment behavior. Historical test/signoff claims are source-recorded and were not rerun here. |

### Artifact authority, freshness, refresh, and rollback

| Category | Production/runtime authority | Tooling, review, or historical artifacts (not themselves runtime authority unless stated) |
|---|---|---|
| Monthly Listeners | [`monthly-listeners.snapshot.json`](../lib/api/data/monthly-listeners.snapshot.json), read by [`monthlyListenersSnapshot.ts`](../lib/api/monthlyListenersSnapshot.ts). | [`music-spotify-identities.json`](../lib/api/data/music-spotify-identities.json) is identity input; [`generate-monthly-listeners-snapshot.mjs`](../scripts/generate-monthly-listeners-snapshot.mjs), [`validate-monthly-listeners.mjs`](../scripts/validate-monthly-listeners.mjs), and shared Metrika tooling are refresh/validation paths. |
| Twitch Followers | The reader currently builds its runtime output from [`twitch-followers-metrika.snapshot.json`](../lib/api/data/twitch-followers-metrika.snapshot.json) plus [`twitch-owner-review-roster.json`](../lib/api/data/twitch-owner-review-roster.json), rather than reading the separate [`twitch-followers.snapshot.json`](../lib/api/data/twitch-followers.snapshot.json). | [`twitch-stream-candidates.json`](../lib/api/data/twitch-stream-candidates.json), [`twitch-owner-review-report.json`](../lib/api/data/twitch-owner-review-report.json), [`twitch-metrika-run-summary.json`](../lib/api/data/twitch-metrika-run-summary.json), and [`twitch-followers.snapshot.json`](../lib/api/data/twitch-followers.snapshot.json) are discovery/review/run/derived artifacts. Generator and validator paths include [`generate-twitch-followers-snapshot.mjs`](../scripts/generate-twitch-followers-snapshot.mjs), [`twitch-metrika-persistence.mjs`](../scripts/twitch-metrika-persistence.mjs), and [`validate-twitch-followers.mjs`](../scripts/validate-twitch-followers.mjs). *(Superseded 2026-11-08 — the derived artifact and its generator are retired.)* |

Monthly reader enforces a 7-day warning and 14-day hard-stale limit across generated/collected timestamps; Twitch reader enforces a 14-day hard-stale limit for its Metrika data. Refresh must remain an explicit developer-run process: validate inputs and complete results, preserve last-good data on failure, validate the candidate output before replacing the authoritative artifact, and never publish partial results. To roll back a release, set that category unavailable/hidden through its existing availability control, confirm authorization denial, and retain the last known-good local artifacts. The exact atomic-replacement guarantee and a reproducible release rollback test were not established in this closeout.

### Release signoff

- **Monthly Listeners — RELEASE DISPOSITION UNRESOLVED.** The availability record's status is `blocked` while `productionPlayable` is `true` and gate descriptions claim approval/readiness. Since route authorization checks `productionPlayable`, calling this category blocked as an effective runtime state would be unsupported. This documentation change does not authorize enabling/disabling it. **Needs Verification [product-decision]:** owner must reconcile the conflicting source fields and explicitly confirm release disposition. The current 236-item evidence in availability is source-recorded, not independently rerun here.
- **Twitch Followers — SIGNED OFF AS `released` IN CURRENT SOURCE.** [`availability.ts`](../lib/catalog/availability.ts:242) records `released`, `productionPlayable: true`, all gate evidence satisfied, and owner approval. This is the exact repository disposition; this closeout did not conduct a new human/product signoff or rerun historical checks. Runtime state in an actual deployment is **Needs Verification [environment-specific]**.

No normal runtime provider calls are part of either flow. Twitch actual creator-photo enhancement is deferred and is not a release blocker under the recorded current disposition. *(Superseded 2026-11-08 — creator-photo enhancement shipped 2026-11-08.)*

### Repository/status and verification trace

Initial `git status --short` reported modified tracked paths `.env.local.example`, `.gitignore`, `lib/api/data/artist-album-counts.snapshot.json`, `lib/api/index.ts`, `lib/catalog/availability.ts`, and `types/game.ts`; it reported numerous untracked documents, source/data artifacts, and scripts. The first status/diff command's exclusion syntax failed after printing status; therefore no conclusion is drawn from that command about staged changes. Status cannot establish authorship or whether these changes predate implementation work, so preserve them as unrelated/pre-existing-or-unknown. This task edited only the existing Analysis and Plan documents; no attempt was made to attribute or clean up other paths. No `.env.local` contents were read or exposed. No files were staged, deleted, or committed.

- **Closeout document read-back:** [Pass] Both changed documents were read back after edits; final status mismatch descriptions match inspected availability and route-authorization source.
- **`git diff --check`:** [Pass] Command completed with exit code 0; a pre-existing LF-to-CRLF warning appeared for unrelated `types/game.ts`, with no reported whitespace errors.
- **Runtime/build/tests/provider calls:** [Not tested] not run; this is documentation-only and no live provider call was made.
- **Historical evidence:** status and validation narratives embedded in current source/artifacts are reported as recorded, not reproducible verification from this task.
- **Closeout files:** [`monthly-listeners-twitch-followers-plan.md`](monthly-listeners-twitch-followers-plan.md) and [`monthly-listeners-twitch-followers-analysis.md`](monthly-listeners-twitch-followers-analysis.md). No UI, application, provider, or snapshot artifact changed as part of the closeout edits.

**Needs Verification:** Monthly Listeners release disposition [product-decision] due to contradictory `status`/`productionPlayable` fields; current route decision follows `productionPlayable` per source. Twitch deployment state [environment-specific]. Historical validations/signoffs [inferred-from-codebase] are source-recorded, not rerun. No separate user-provided release evidence was independently verified in this closeout.
