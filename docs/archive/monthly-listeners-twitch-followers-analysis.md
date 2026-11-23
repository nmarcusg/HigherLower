# Monthly Listeners and Twitch Followers — Analysis

**Task type:** Historical read-only feature analysis for two catalog categories; current status is recorded in the implementation plan's 2026-11-02 closeout.  
**Scope:** The analysis below preserves the state and recommendations at its original analysis stage. It is superseded where current source and the later closeout show implementation has proceeded. It does not authorize provider calls or changes to runtime behavior.  
**Evidence basis:** Original task-provided findings plus the later source-backed closeout in [`monthly-listeners-twitch-followers-plan.md`](monthly-listeners-twitch-followers-plan.md:287). Current availability details must be read from [`availability.ts`](../lib/catalog/availability.ts:197); the Monthly Listeners `status`/`productionPlayable` mismatch is unresolved and is not characterized here as safely blocked.

## Executive summary — original analysis state (superseded)

At the time this analysis was written, `monthly-listeners` (Music) and `twitch-followers` (Social Media) were described as hidden and lacking provider mappings. That statement is historical, not current. The later source-backed closeout records both dispatcher mappings and different current availability states: Twitch Followers is marked `released` and playable; Monthly Listeners has `status: "blocked"` but `productionPlayable: true`. Route authorization checks the latter flag, not the status label, so the Monthly Listeners status/flag mismatch must not be summarized as safely blocked. See the later plan closeout for evidence and limitations.

At the time of the original analysis, the remaining work was data qualification and server-side provider integration, not new game mechanics. The analysis called for a validated artist-to-Spotify identity crosswalk and a separate Twitch identity pool, with offline snapshot generation and validation. Those were forward-looking recommendations, not current completion claims. For later implementation and release evidence, consult the plan's implementation closeout. The analysis does not establish that either category is currently safe to enable.

**Historical recommendation:** Analysis may proceed to Design after owner review of this analysis. This recommendation is superseded by the later implementation and release-state evidence in the plan closeout. No new Design work or runtime change is authorized by this historical analysis.

## Architecture and semantics — original analysis state (historical)

| Finding | Evidence / status |
|---|---|
| At the analysis stage, both categories were reported hidden, with unsatisfied availability gates and no dispatcher entries. This is superseded: current dispatcher mappings exist; Twitch is marked released, while Monthly Listeners has a conflicting `blocked` status and `productionPlayable: true`. | Historical state as supplied to the original analysis. Current source: [`lib/api/index.ts`](../lib/api/index.ts:30), [`lib/catalog/availability.ts`](../lib/catalog/availability.ts:197), [`lib/catalog/availability.ts`](../lib/catalog/availability.ts:242). Authorization checks `productionPlayable`: [`routeAuthorization.ts`](../lib/catalog/routeAuthorization.ts:90). |
| The existing generic data contract is normalized `GameItem[]`; the shared type is defined in [`types/api.ts`](../types/api.ts:6). Home selection and generic mode routing already lead into the shared Classic and Time Attack game surfaces. | [`app/page.tsx`](../app/page.tsx), [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx), [`app/game/[mode]/page.tsx`](../app/game/%5Bmode%5D/page.tsx), [`app/game/layout.tsx`](../app/game/layout.tsx), [`app/game/classic/page.tsx`](../app/game/classic/page.tsx), [`app/game/time-attack/page.tsx`](../app/game/time-attack/page.tsx), and shared components under [`components/game/`](../components/game/). |
| No evidence indicates a need for new frontend/gameplay behavior. High-score storage/modal, game-over handling, card rendering, and global styling are not implicated by the current category/provider gaps. | [`lib/highScores/storage.ts`](../lib/highScores/storage.ts), [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx), [`components/game/GameCard.tsx`](../components/game/GameCard.tsx), [`app/globals.css`](../app/globals.css). This is an architecture assessment, not runtime verification. |

The original analysis recommended retaining fail-closed authorization until readiness was established. This is not a statement of current category availability. Provider success alone remains insufficient for release qualification.

## Monthly-listeners: data and provider direction

### Existing artist data and identity gap

- The repository has 17 curated MusicBrainz artist seeds in [`lib/api/curatedPools.ts`](../lib/api/curatedPools.ts). The recorded analysis evidence reports 251 artist snapshot records in the current artifact. This is an observed artifact count, not a completed census or a judgment of quality.
- No Spotify crosswalk is confirmed in the repository. Existing Wikidata image resolution maps MusicBrainz MBID through Wikidata P434 to P18 (image), not to a verified Spotify identity mapping: [`lib/api/wikidataArtistImages.ts`](../lib/api/wikidataArtistImages.ts).
- The exact 251-record census was not performed. It is a later data/release qualification gate, not a blocker to this Analysis document.

### Provider documentation direction (not runtime-verified)

The task-provided summary of Metrika documentation at [`metrika.run`](https://metrika.run) says the monthly-listener integration uses a Spotify artist ID, a Monthly Listeners metric expressed through the provider's `views` semantic, a bearer token, up to 10 resources per request, a quota of 500 requests/month and 100 requests/60 seconds, and a daily refresh claim. It also describes resource states `pending`, `not_found`, `stale`, and `unavailable`. These are documentation claims only; no provider call or runtime verification was performed.

At 300 artists, a full refresh would require 30 batches; at 300 more, another 30, or 60 calls total per refresh. Four such refreshes would be approximately 240 calls before retries or diagnostics, subject to account-level quota sharing. This arithmetic is a planning estimate, not a confirmed account budget. **Needs Verification [environment-specific]:** actual quota allocation, account sharing, authorization/access, batching behavior, and observed response/error payloads. **Needs Verification [product-decision]:** whether the provider's `views` semantic is an acceptable and equivalent authority for monthly listeners, and whether its documented cadence/freshness is acceptable.

The planned secret name is `METRIKA_API_TOKEN`. No secret value was read or is included here. Its eventual use must remain server-only.

### Identity enrichment responsibilities (not a final schema)

Identity records should consider, without locking a schema at this stage: MusicBrainz MBID, canonical name, Spotify ID and URL, source or sources, cross-source agreement/outcome, review state, and timestamp. Candidate identity evidence includes a Spotify URL relationship from MusicBrainz and Wikidata P434 (MBID) → P1902 (Spotify artist ID); both sources should be cross-checked where available. Missing, conflicting, multiple, or invalid matches require manual resolution. Do not use fuzzy matching as automatic identity assignment; fail closed when identity is unresolved.

**Needs Verification [inferred-from-codebase]:** the availability and interpretation of these relationships for the actual artist set, including source coverage and redirect/alias behavior, must be confirmed during data qualification.

## Twitch-followers: pool and discovery gap

There is no dedicated Twitch candidate pool. The existing social identity data is YouTube-specific (13 seeds / 263 catalog entries, per the supplied findings); it must not be reused blindly as Twitch identities. The Metrika direction identifies a Twitch login/channel and a follower-total metric, but candidate discovery is a separate responsibility from Metrika's metric authority.

The later data workflow should be kept conceptually separate: **candidate discovery → identity normalization → human-recognizability qualification → metric refresh → snapshot**. Candidate records could consider login, display name, numeric user ID (if useful), source/rank evidence, language/region, review status, aliases/renames, and image source; these are fields to evaluate, not a final schema.

Building and qualifying a pool targeting approximately 200–300 candidates where quality permits is a later qualification gate. Do not pad to a target count. Review prominence, sustained/current/historical viewership, esports and mainstream representation, regional and language balance, organizations/events, inactivity (not an automatic exclusion), aliases, and suspicious or low-quality candidates. No recognizability formula has been selected. **Needs Verification [product-decision]:** qualification rubric and acceptable pool composition require owner review; **Needs Verification [inferred-from-codebase]:** discovery sources, rights/terms, and identity evidence require separate validation.

## Snapshot/runtime architecture assessment

The fitting architecture is an offline generator + validation + generated metric snapshot + reader + dispatcher. Gameplay should consume normalized snapshot-backed `GameItem[]` and must not issue Metrika requests. This matches the existing snapshot-reader pattern, while requiring category-specific validation and publication policy.

The existing artist snapshot reader validates basic schema, MBID uniqueness/order, and a minimum of two records, but does not enforce freshness or last-known-good fallback (supplied findings; reader at [`lib/api/artistAlbumCountsSnapshot.ts`](../lib/api/artistAlbumCountsSnapshot.ts)). These checks do not by themselves establish sufficient production readiness for new metric snapshots.

The future analysis/design/implementation work must explicitly decide how to handle last-known-good data, `pending`, stale and unavailable values, partial batches, malformed metric values, missing images, duplicate identities, and incomplete publication. Fail closed. A failed or incomplete generation should abort atomic publication and retain the previous artifact under an explicitly approved policy. Do not serve stale data without an owner-approved maximum age. **Needs Verification [product-decision]:** last-good retention and maximum acceptable age. **Needs Verification [inferred-from-codebase]:** the repository's current snapshot generation/publication mechanics must be checked before selecting the atomic-publish implementation. Do not invent a database, queue, or cron service.

## Security and diagnostic boundary

- Existing Twitch client ID/secret use is for IGDB in [`lib/api/igdb.ts`](../lib/api/igdb.ts); do not repurpose those credentials unless a demonstrated requirement makes it necessary.
- Keep `METRIKA_API_TOKEN` server-only. It must not enter client bundles, logs, generated snapshots, or API payloads. No environment values were read or reproduced.
- [`app/api/test-fetch/route.ts`](../app/api/test-fetch/route.ts) has a production guard for full/POST operation; the supplied findings say no authentication was observed in non-production. Deployment exposure is unknown. **Needs Verification [environment-specific]:** actual deployment visibility and access controls. Do not broaden diagnostics or expose provider credentials as part of this work.

## Original analysis scope boundary (historical)

Classification below is analytical and does not authorize implementation. “Required” means likely required if the owner later approves activation; it is not permission to edit now.

| Area | Classification | Analysis |
|---|---|---|
| [`lib/catalog/availability.ts`](../lib/catalog/availability.ts) | Required | The category availability gates currently remain unsatisfied; future release qualification must satisfy them explicitly. |
| Internal game/category types in [`types/game.ts`](../types/game.ts) | Likely | May need an internal representation change only if later implementation proves the existing category/type model cannot express the metric. No such change is evidenced now. |
| [`lib/api/index.ts`](../lib/api/index.ts) | Required | A semantic-provider mapping/dispatcher entry is currently absent and would be needed for an enabled category. |
| New adapters, generators/readers, identity artifacts | Required | Snapshot-backed provider integration and identity data are required capabilities, but filenames, shapes, and exact boundaries remain for later approved work. |
| Candidate validation and qualification | Required | Both artist identity and Twitch pool quality need explicit qualification before release; the 251-record census and Twitch pool build are later gates. |
| [`app/api/test-fetch/route.ts`](../app/api/test-fetch/route.ts) | Optional | No diagnostic-route change is established as necessary. Any exposure/access concern requires verification before an approved diagnostic change. |
| [`lib/catalog/semanticCatalog.ts`](../lib/catalog/semanticCatalog.ts) | Likely | Existing entries are present, but activation-related semantic metadata may need revisiting only if a later release plan establishes a concrete gap. |
| Route authorization, Home UI, gameplay components, [`components/game/GameCard.tsx`](../components/game/GameCard.tsx), high scores/game-over modal, [`types/api.ts`](../types/api.ts), [`app/globals.css`](../app/globals.css) | Unaffected on current evidence | Existing route/data/game architecture appears sufficient. Revisit only if contradictory implementation evidence emerges; no such evidence is established here. |

## Failure-mode responses

The responses below describe safe analysis recommendations, not an approved implementation contract. Exact policy and thresholds remain owner decisions where noted.

| Failure / condition | Recommended response |
|---|---|
| Artist identity missing, conflicting, multiple, or invalid | Reject from qualified snapshot; send for manual review; fail closed. |
| Twitch login rename or alias change | Reconcile by stable identity evidence where available; review alias/rename; do not silently treat a changed login as a new person or blindly merge. Keep unresolved candidate out. |
| Duplicate identity or duplicate alias | Reject/resolve before publication; retain prior valid snapshot if generation cannot establish uniqueness. |
| `pending`, `not_found`, `stale`, or `unavailable` provider state | Do not convert to a numeric value. Apply an explicitly approved last-good/freshness policy; otherwise reject affected item and fail closed. |
| Quota exhaustion or rate limit | Stop or defer refresh; do not publish a partial result as complete; retain prior artifact only under approved age policy. |
| Partial batches or malformed metric values | Mark generation incomplete, reject invalid records, abort publication, and retain prior artifact under approved policy. |
| Failed, incomplete, or outdated snapshot | Abort publication; keep previous artifact only if it passes the approved freshness policy; otherwise keep category hidden. |
| Too few qualified items | Keep category hidden; do not pad with unqualified candidates. |
| Obscure or low-quality pool | Return candidates for human review/reject; keep hidden until qualification passes. |
| Ties / tied metric values | Preserve valid values and confirm comparison behavior is acceptable before release; no tie distribution rule is selected here. **Needs Verification [product-decision].** |
| Missing image | Validate card fallback behavior and data acceptance; do not invent or misattribute imagery. Keep item only if approved fallback behavior is confirmed. **Needs Verification [inferred-from-codebase].** |
| Region/language imbalance | Flag for review; adjust only through qualified discovery, not arbitrary padding. |
| Unexpected organization/event in Twitch candidates | Review and reject or classify explicitly; do not silently mix channels, organizations, and events. |

## Proposed release gates (both categories; historical analysis recommendations)

Before either category is enabled, require evidence for all applicable gates:

1. **Deterministic identity:** reproducible source evidence, resolved conflicts/aliases, and no fuzzy auto-assignment.
2. **Quality-qualified pool:** adequate recognizable coverage without padding; category-specific candidate review completed.
3. **Data/value/image validation:** normalized values, valid bounds/semantics, image attribution/fallback behavior, and record uniqueness verified.
4. **Duplicate and alias handling:** stable identity and duplicate/rename policy exercised.
5. **Diversity and tie distribution:** representation and comparison distribution reviewed; thresholds/rubric are explicit rather than assumed.
6. **Freshness:** refresh cadence, stale behavior, maximum age, and last-good policy approved and validated.
7. **Provider failure/quota/auth:** account access, terms, metric interpretation, quotas, rate limits, partial failures, malformed responses, and retries validated without exposing credentials.
8. **Secret safety:** token remains server-side and absent from logs, client output, snapshots, and API payloads.
9. **Route authorization:** unavailable categories remain denied; only fully qualified categories become dispatchable.
10. **Production visibility and reversibility:** deployment diagnostic exposure is understood and rollout can be reversed by keeping the category hidden/disabled and preserving a valid prior artifact.

Provider success alone is insufficient to pass these gates.

## Original blocking versus later qualification assessment (historical)

### Blocking before provider integration/release

- Validate provider documentation, metric semantics/equivalence, terms, account access/authentication, quotas, actual response/error behavior, and refresh cadence. No live calls were made. **Needs Verification [environment-specific].**
- Resolve owner decisions as needed: acceptable metric authority, freshness/last-good policy, pool qualification rubric, tie handling, and release/rollback threshold. **Needs Verification [product-decision].**
- Confirm security/deployment boundaries for diagnostic routes before using them to exercise provider behavior. **Needs Verification [environment-specific].**

### Not blocking this Analysis; mandatory before release

- Complete the exact artist census and Spotify identity crosswalk validation.
- Construct and qualify the Twitch candidate pool, including identity normalization and recognizability review.
- Complete category-specific metric, image, duplicate/alias, diversity, freshness, provider-failure, and quota validation.

## Original verification status and stage boundary (historical)

- **Source review:** [Partial] This document is grounded in the task-provided read-only findings and citations; line references marked approximate are not independently recaptured here.
- **Provider/runtime behavior:** [Not tested] No provider calls, credential reads, or runtime checks were performed. Provider statements are documentation claims supplied for analysis.
- **Artist census / Twitch candidate-pool construction:** [Not tested] Explicitly out of scope for this task; both remain mandatory pre-release qualification gates.
- **Design / Plan / Implementation:** Not performed, as explicitly prohibited by scope.
- **Original changes:** The analysis task authorized its Analysis artifact only. This historical scope statement does not constrain the later implementation or documentation closeout.

## Needs Verification

- **[environment-specific]** Metrika terms, account access/authentication, actual monthly-listener metric equivalence, quota sharing, cadence, and runtime states/error payloads.
- **[product-decision]** Provider metric authority, freshness/last-good maximum age, pool quality rubric, tie treatment, and rollout criteria.
- **[inferred-from-codebase]** Artist identity source coverage, Twitch identity/discovery evidence, snapshot publication mechanics, image fallback acceptance, and deployment visibility of diagnostics.
- Full artist census and Twitch pool construction are not completed in this Analysis; they are out of scope here and mandatory before release.
- **Current availability:** Needs Verification [product-decision] for Monthly Listeners because current source sets `status: "blocked"` and `productionPlayable: true`; source route authorization gates on `productionPlayable`. Twitch Followers is marked released in source, but deployment state and historical signoff/test evidence were not independently verified by the documentation closeout.
