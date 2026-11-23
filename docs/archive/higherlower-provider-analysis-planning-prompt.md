# Provider Availability Analysis + Planning Prompt

We are now starting the **provider/API availability phase** for HigherLower.

The visual redesign and MVP gameplay flows are considered complete for now. Do **not** make UI/UX changes, animation work, gameplay redesigns, or provider implementation changes in this task.

This task is **analysis and planning only**.

## Primary objective

Analyze the **current local codebase as it exists now**, then produce two repository Markdown files:

1. `category-provider-analysis.md`
2. `category-provider-plan.md`

Do not implement providers yet.

The purpose of these documents is to establish, for every remaining unavailable semantic category:

- the exact metric contract;
- the best API/provider candidate;
- how that provider would fit the existing codebase;
- what credentials, quotas, costs, rate limits, caching, and licensing constraints apply;
- what still needs runtime verification;
- what product decisions or owner approvals remain open;
- the exact implementation order and file-level plan.

## Source-of-truth order

Use this authority order:

1. **Current local repository code** — authoritative for the implementation that exists now.
2. Existing finalized product decisions and current semantic category contracts.
3. Official provider/API documentation.
4. **Context7** documentation for framework/API references where available.
5. Other reputable primary sources only when official docs or Context7 do not answer a question.

Important:

- Do not assume the public GitHub `main` branch is current if the local workspace is newer.
- Do not treat old provider adapters as proof that a semantic category is ready.
- Do not treat previous research notes as proof if the current official API documentation says otherwise.
- Do not use blogs, Reddit, Stack Overflow, or unofficial wrappers as the sole basis for an API contract.
- Context7 is supporting documentation, not a substitute for runtime verification.

## Scope

Analyze these currently unavailable semantic categories:

### Movies & Series
- Release Date
- Gross Revenue

### Gaming
- Player Count
- Game Release Date

### Music
- Number of Albums
- Album Release Date
- Monthly Listeners

### Social Media
- YouTube Subscribers
- Twitch Followers

The following two categories are already playable and must be treated as existing baseline behavior, not redesigned:

- Movie/Series Rating — currently movie-only
- Game Rating — Steam positive-review percentage

Do not change their current product semantics during this analysis.

## Phase 1 — Current codebase analysis

Before researching providers, inspect the actual local repository.

At minimum, locate and analyze the current equivalents of:

- semantic catalog definitions;
- category availability/release policy;
- semantic-to-provider mapping;
- shared route authorization;
- central provider dispatcher;
- every existing provider adapter;
- normalized `GameItem` contract;
- category/game types;
- environment-variable example/configuration;
- image host configuration;
- gameplay entry routes;
- any test/debug provider routes;
- any provider-readiness utilities/scripts already present.

Do not assume exact filenames from this prompt if the local repository differs.

### Record the existing provider architecture

Document the actual current flow, for example:

```text
SemanticCategoryId
        ↓
availability
        ↓
route authorization
        ↓
semantic → provider mapping
        ↓
dispatcher
        ↓
provider adapter
        ↓
GameItem[]
        ↓
Classic / Time Attack
```

If the real implementation differs, document the real flow instead.

### For the current codebase, answer

- Which modules own semantic category identity?
- Which modules own release/playability?
- Where does semantic → provider mapping live?
- How does `fetchGameItems()` or its current equivalent dispatch?
- Is `GameItem` sufficient for every remaining category?
- Which provider-specific identifiers are currently exposed outside adapters, if any?
- Which existing adapters can be reused or extended?
- Which legacy providers should be retired or kept only as candidate-discovery sources?
- Which environment variables already exist?
- Which new server-only environment variables would be required?
- Which existing image domains are allowed by Next.js configuration?
- Would any new provider require new image-host configuration?
- Are there current API test/debug routes that should be reused for runtime probes later?
- Are there current architectural inconsistencies that should be fixed before provider implementation?

Do not edit code while answering these.

## Phase 2 — Provider research

Use **Context7** for API/framework documentation where possible.

For each candidate provider, also verify against the provider's current official documentation.

For every remaining semantic category, research:

```text
semantic category
↓
candidate provider(s)
↓
exact endpoint(s)
↓
exact field(s)
↓
semantic match
↓
auth requirements
↓
quota / rate limit
↓
cost / plan restrictions
↓
server/browser restrictions
↓
image source
↓
candidate-pool strategy
↓
caching needs
↓
licensing / commercial-use concerns
↓
runtime-verification requirements
```

Do not simply say an API "supports" a category.

Prove how the exact field satisfies the exact semantic metric.

## Required candidate investigations

The following are **research leads, not pre-approved implementation decisions**. Verify them independently against current documentation and the current codebase.

### Movie/Series Release Date

Investigate TMDB first.

Verify:

- movie initial release-date field;
- TV first-air-date field;
- whether movie and TV can safely coexist in one semantic pool;
- identifier collision handling between movie and TV;
- image availability;
- whether region/language parameters alter release-date semantics;
- best discovery endpoint/pool strategy.

Do not change the current Movie/Series Rating category's movie-only scope.

### Gross Revenue

Investigate TMDB movie details first.

Verify:

- exact `revenue` field semantics;
- currency definition;
- whether zero means unknown/unavailable;
- realistic survival rate after removing zero/missing values;
- whether TV must remain excluded;
- number of requests required to build a playable pool;
- caching strategy;
- whether another provider offers better gross-revenue coverage.

Do not invent TV revenue.

### Player Count

Investigate official Steam Web API first.

Verify:

- `GetNumberOfCurrentPlayers`;
- exact definition of `player_count`;
- whether an API key is required for the public method;
- practical request limits;
- candidate AppID discovery strategy;
- image strategy;
- whether SteamSpy should be retained only for discovery rather than as the metric source;
- cache duration appropriate for a live metric.

Explicitly compare this against the existing/legacy SteamSpy `ccu` implementation and explain why one should or should not replace the other.

### Game Release Date

Investigate IGDB first and RAWG as a fallback.

Verify:

- IGDB `first_release_date` semantics;
- authentication workflow;
- token expiration/refresh behavior;
- rate limits;
- image/cover fields;
- filtering out DLC, editions, bundles, ports, or duplicates;
- candidate-pool strategy;
- whether RAWG's `released` field is semantically equivalent enough to serve as fallback;
- licensing/commercial constraints for both.

### Number of Albums

Investigate MusicBrainz first.

Verify:

- release-group model;
- `Album` primary type;
- correct method for obtaining an artist's album count;
- whether pagination/count metadata can provide the count without downloading every release group;
- handling secondary types, live albums, compilations, soundtracks, etc.;
- MusicBrainz request-rate policy and User-Agent requirement;
- candidate artist pool;
- artist-image source.

Investigate Fanart.tv or another legitimate image source if needed.

Avoid fuzzy identity matching where a shared MusicBrainz ID can be used.

### Album Release Date

Investigate MusicBrainz + Cover Art Archive first.

Verify:

- release-group `first-release-date`;
- partial-date behavior;
- release-group type filtering;
- front-cover endpoints;
- missing-cover handling;
- whether MVP should accept only complete `YYYY-MM-DD` dates;
- candidate-pool strategy.

Do not manufacture missing month/day values.

### Monthly Listeners

Confirm whether Spotify's official Web API currently exposes Spotify monthly listeners.

If not, explicitly document that limitation.

Research commercial analytics providers, including:

- Soundcharts;
- Chartmetric;
- any other legitimate provider with documented Spotify monthly-listener data.

For each:

- exact field;
- exact endpoint;
- authentication;
- current pricing/access model;
- sandbox availability;
- request limits;
- candidate discovery;
- image strategy;
- licensing/use restrictions.

Do not recommend scraping `open.spotify.com`.

Do not recommend an unofficial endpoint unless the risk is explicitly documented and owner approval is required.

### YouTube Subscribers

Investigate YouTube Data API v3.

Verify:

- `channels.list`;
- `statistics.subscriberCount`;
- hidden-subscriber behavior;
- rounding behavior;
- quota cost;
- batching multiple channel IDs;
- image/thumbnail fields;
- candidate-channel strategy;
- whether curated channel IDs are preferable to search-based discovery.

Document the effect of rounded counts on possible ties.

### Twitch Followers

Investigate official Twitch Helix first.

Specifically resolve the ambiguity around `Get Channel Followers`:

- whether an arbitrary public broadcaster's total follower count can be obtained with a service/user token;
- which scope, broadcaster relationship, or moderator requirements apply;
- whether `total` remains available without detailed follower records;
- exact authentication flow;
- token lifecycle;
- rate limits.

If the docs remain ambiguous, mark this as requiring a **live OAuth/runtime experiment** before implementation.

Also research a legitimate paid fallback such as Streams Charts.

For fallback providers, document:

- exact follower field;
- endpoint;
- authentication;
- pricing;
- rate/credit model;
- image/source fields;
- candidate discovery.

Do not use scraping as the default solution.

## Phase 3 — Normalization and gameplay compatibility analysis

For each remaining category, define the proposed normalized shape:

```ts
{
  id: ...,
  name: ...,
  imageUrl: ...,
  value: ...,
  displayValue: ...
}
```

Confirm whether the current `GameItem` contract is sufficient.

For date metrics, explicitly define how dates become comparable numeric `value`s.

For large numeric metrics, define display formatting.

For counts, define tie behavior.

For mixed media, define stable ID namespacing where necessary.

For partial dates, do not invent precision.

If `GameItem` is not sufficient for any category, explain exactly why before proposing a type change.

## Phase 4 — Candidate-pool and image analysis

A correct metric is not enough.

For every category, define how the game gets a pool of recognizable items.

For each provider, answer:

- How are candidates discovered?
- Is the pool curated, dynamic, or hybrid?
- How many candidates are realistically available?
- How are obscure/noisy entities filtered?
- How are duplicates filtered?
- How are missing images handled?
- Does the provider itself supply images?
- If not, what legitimate image source will be used?
- Does image retrieval require a second provider?
- Does the current Next.js image config permit that host?

Prefer a curated pool when that materially improves recognizability or reduces API cost.

## Phase 5 — Runtime-readiness design

Do **not** run destructive implementation work yet.

Design the later runtime verification procedure for each category.

Every category must eventually prove:

- metric correctness;
- at least a meaningful playable pool;
- diverse values;
- acceptable tie frequency;
- acceptable missing/zero-value rate;
- duplicate control;
- image coverage;
- latency;
- cache behavior;
- provider failure handling;
- credential failure handling;
- quota/rate-limit behavior where testable.

Do not consider:

- adapter existence;
- successful TypeScript build;
- two returned items;
- fixtures;

as sufficient production-readiness evidence.

## Phase 6 — Environment, pricing, licensing, and attribution

For every recommended provider, record:

- authentication method;
- required environment variables;
- whether secrets are server-only;
- current free tier / paid tier relevant to this project;
- rate limits / quota;
- attribution requirements;
- non-commercial/commercial restrictions;
- anything relevant if HigherLower later uses ads or donations.

If licensing language is ambiguous, mark it as an open verification item instead of guessing.

## Open-question discipline

Create an explicit **Open Questions / Needs Verification** section in `category-provider-analysis.md`.

Label each unresolved issue using one of:

```text
[Needs Verification — runtime]
[Needs Verification — provider docs]
[Needs Verification — product decision]
[Needs Verification — licensing]
[Needs Verification — cost]
[Needs Verification — credentials]
```

For every open question, include:

- why it matters;
- what evidence would resolve it;
- whether it blocks implementation or only blocks production enablement;
- the recommended default if the owner does not decide immediately.

Do not silently decide ambiguous product/provider questions.

## Output file 1 — `category-provider-analysis.md`

This should be the evidence-heavy analysis.

Recommended structure:

```text
# Category Provider Analysis

## Executive Summary

## Current Codebase Architecture

## Existing Provider Inventory

## Existing Environment / Config

## Category-by-Category Analysis
### Release Date
### Gross Revenue
### Player Count
### Game Release Date
### Number of Albums
### Album Release Date
### Monthly Listeners
### YouTube Subscribers
### Twitch Followers

## Provider Comparison Matrix

## GameItem Compatibility

## Candidate-Pool Strategy

## Image Strategy

## Caching Strategy

## Credentials / Environment Variables

## Cost / Quota / Rate Limits

## Licensing / Attribution

## Runtime Readiness Requirements

## Open Questions / Needs Verification

## Recommended Provider Decisions
```

For every factual API claim, cite or link the official documentation used.

Where Context7 was used, identify the relevant documentation/library source.

Clearly distinguish:

- verified documentation fact;
- current-code observation;
- inference;
- recommendation;
- unresolved issue.

## Output file 2 — `category-provider-plan.md`

This should translate the analysis into an implementation plan, but still make **no code changes**.

Recommended structure:

```text
# Category Provider Implementation Plan

## Goals

## Non-Goals

## Frozen Existing Behavior

## Target Architecture

## Provider Decisions

## Dependency / Credential Prerequisites

## Proposed New Provider Modules

## Existing Files Expected to Change

## Semantic-to-Provider Mapping Changes

## Availability-Gate Changes

## Environment / Config Changes

## Category Implementation Order

### Phase 1 — Release Date
### Phase 2 — Player Count
### Phase 3 — Game Release Date
### Phase 4 — YouTube Subscribers
### Phase 5 — Album Release Date
### Phase 6 — Number of Albums
### Phase 7 — Gross Revenue
### Phase 8 — Monthly Listeners
### Phase 9 — Twitch Followers

## Per-Category Runtime Verification Gates

## Rollback / Fail-Closed Behavior

## Testing Strategy

## Production Enablement Criteria

## Deferred / Blocked Categories

## Open Decisions Before Implementation

## Definition of Done
```

The phase order above is a starting hypothesis, not mandatory. Change it if the analysis supports a better order, and explain why.

## File-level implementation planning

For every future phase, identify:

- exact existing files expected to change;
- exact new files expected to be created;
- any conditional file changes;
- environment-variable additions;
- Next.js image-host config changes if needed;
- availability changes;
- semantic-to-provider mapping changes;
- dispatcher changes;
- test/probe scripts or routes;
- documentation changes.

Do not invent broad refactors.

Prefer one provider/category implementation at a time.

## Important architecture guardrails

Preserve:

```text
semantic category identity
≠
provider identity
```

A provider must be replaceable without changing:

- semantic category ID;
- route/query identity;
- High Score category identity;
- frontend selection identity.

Do not expose provider-specific IDs as the new canonical product category IDs.

Keep providers server-side.

Keep credentials server-only.

Do not bypass route authorization.

Do not enable a category merely because its provider adapter exists.

## Existing playable categories

Do not alter the current behavior of:

### Movie/Series Rating

Current implementation intentionally uses **movies only** for now.

TV-series rating support is a future feature.

Do not treat the lack of TV data as a blocker for this already-playable category.

### Game Rating

Current implementation intentionally uses **Steam positive-review percentage**.

Do not replace this metric during this provider-availability task.

## No implementation yet

This task ends after:

- current codebase analysis;
- provider/API research;
- open-question identification;
- `category-provider-analysis.md`;
- `category-provider-plan.md`.

Do **not**:

- add provider adapters;
- add credentials;
- change `.env`;
- change availability flags;
- change semantic-to-provider mappings;
- change `GameItem`;
- modify gameplay;
- change UI;
- make any category playable.

If a documentation claim cannot be confirmed, write it as an open question.

If a runtime test is required to prove something, plan that test but do not treat the question as already resolved.

## Final response after creating the documents

Report only:

1. files created;
2. categories with a strong recommended provider;
3. categories still blocked or requiring paid access;
4. count/list of open verification questions;
5. whether the existing provider architecture can support the plan without a redesign;
6. the recommended first implementation phase.

Do not start implementation until owner approval.
