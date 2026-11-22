# HigherLower Redesign Implementation Plan

## 1. Executive Implementation Strategy

Deliver the redesign as a frontend and application-structure change that is deliberately independent of provider production readiness. The implementation establishes a provider-independent semantic catalog, release-gated availability, a validated server-side gameplay entry boundary, reusable dark-only presentation, and centralized browser-local High Score persistence before either game mode adopts it.

The delivery order is intentionally dependency-first: safety and catalog semantics precede route authorization; shared visual composition precedes mode integration; finalized High Score storage and legacy migration precede Classic and Time Attack integration. Provider adapters remain server-only and are not changed as part of the visual redesign. A category becomes production-playable only after its category-specific runtime release gate passes; the production Home is permitted to display zero domains and zero categories until then.

Development fixtures are a first-class implementation and verification aid, but never release evidence. They may populate otherwise unavailable UI states without changing production catalog availability, server route authorization, or provider readiness.

## 2. Scope and Locked Product Decisions

### In scope

- Redesign the Home flow as **Domain → Category → Mode → Go**.
- Establish semantic catalog, availability, route validation, presentation composition, centralized High Scores, derived-state handling, responsive behavior, and accessibility within the approved file allowlist.
- Preserve Classic and Time Attack mechanics while modernizing their composition, lifecycle safety, and accessibility.
- Replace the old Co-op presentation with a disabled PvP **Coming Soon** surface only.
- Maintain a dark-only initial release with semantic, future-theme-friendly CSS variables and no active theme control.

### Locked Home behavior

- Go requires a selected valid domain, category, and playable mode, and launches immediately once those inputs are valid.
- Changing the domain clears the category selection and preserves the selected mode.
- PvP remains visible but disabled, labelled Coming Soon, and is never selectable.
- [`app/page.tsx`](app/page.tsx) is the server Home boundary: it derives/obtains a safe public production-catalog projection and passes it to [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx). `HomeSetup` owns transient selected domain/category/mode state, High Scores dialog visibility, and Go interaction/navigation. Availability is never decided client-side. After Go, the route's mode and semantic category are the source of truth.
- A domain appears in the production catalog only when it contains at least one production-playable category. A valid production Home may therefore have no visible domains or categories.

### Locked gameplay behavior

- Classic and Time Attack retain their existing player-facing rules, progression, scoring, input behavior, and mode-local lifecycle ownership. Refactoring may improve reuse, lifecycle safety, presentation, and accessibility, but may not silently alter gameplay mechanics.
- Shared gameplay code remains presentation-focused. It must not become a universal rules engine or move mode-specific timers, sequence logic, score logic, or lifecycle ownership into global state.
- The conceptual gameplay route remains `/game/{mode}?category=...`; it must be authorized on the server before provider dispatch.
- No app-wide state library is introduced.

### Locked PvP and theme decisions

- PvP is disabled and Coming Soon: no gameplay, rooms, networking, team model, turn model, or score persistence.
- The initial release is dark-only. The active sun/theme control is removed or hidden. No light-mode implementation or theme-preference storage is added now.

### Locked High Score behavior

- Persistence is browser-local only; there is no account, database, cloud leaderboard, or server-side score storage.
- Score identity is **mode + semantic category**, with separate Classic and Time Attack leaderboards and semantic-category filtering.
- Storage is versioned, migration is idempotent, and only semantically proven legacy mappings are migrated.
- Hidden or unresolved legacy records are preserved during automatic migration rather than guessed into a target semantic category. Confirmed Clear All may remove recognized HigherLower score records as specified below.
- Users can clear the currently scoped leaderboard and can clear all High Scores only after confirmation.
- PvP scores do not exist.

### Target catalog and category contracts

The catalog structurally supports four domains and eleven semantic target categories. Semantic identity is independent of provider identity. The current target-category readiness is **not production-playable for any category** unless later category-specific runtime evidence establishes otherwise; listed contracts define intended semantics and do not promote production availability.

| Domain | Semantic category | Approved metric contract | Current release disposition |
| --- | --- | --- | --- |
| Movies & Series | Movie/Series Rating | TMDB `vote_average`, covering movies and TV series, normalized as 0–10 | Runtime-gated; not production-playable without evidence |
| Movies & Series | Release Date | Movie `release_date` or TV `first_air_date`; initial release in its medium and preserved source precision | Runtime-gated; not production-playable without evidence |
| Movies & Series | Gross Revenue | Movie-only; no TV approximation | Hidden pending provider-contract and runtime verification |
| Gaming | Game Rating | Initial metric is Steam positive-review percentage; UI transparently describes the metric. Provider may change later without changing semantic identity. | Runtime-gated; not production-playable without evidence |
| Gaming | Player Count | Current concurrent players; the current SteamSpy recent-activity/peak value is not acceptable | Hidden until a suitable provider is verified |
| Gaming | Game Release Date | IGDB first release date | Runtime-gated; not production-playable without evidence |
| Music | Number of Albums | MusicBrainz Album-primary release-group count | Runtime-gated; not production-playable without evidence |
| Music | Album Release Date | MusicBrainz release-group first release date with partial-date precision preserved | Runtime-gated; not production-playable without evidence |
| Music | Monthly Listeners | Approved commercial-provider metric only | Intentionally hidden pending approved commercial provider |
| Social Media | YouTube Subscribers | YouTube Data API `subscriberCount`, initially for curated verified channel IDs | Runtime-gated; not production-playable without evidence |
| Social Media | Twitch Followers | Legitimate scalable provider path required | Intentionally hidden until provider path exists |

Country Population remains internally supported for the existing product surface but is outside the redesigned target catalog and must not be added to its domain/category selectors.

### Design Reference Authority

- Locked owner/product decisions in this plan govern behavior. [`design-reference/`](design-reference/) is the authoritative target visual evidence and remains read-only. Current application code is the source of truth for existing mechanics and behavior that the redesign must preserve. Provider/runtime evidence—not design evidence or fixtures—determines production category readiness.
- Raw Figma CSS is reference only: never copy it literally. Do not copy raw CSS or coordinate values. Preserve the target typography; do not substitute the current application font merely because it is installed or imported. Desktop evidence is authoritative. Responsive behavior is implementation-derived and must preserve hierarchy rather than scale desktop coordinates.
- Before visual implementation, inspect the relevant design-reference README, design inventory, component map, responsiveness notes, open questions, color, typography, and layout tokens; relevant component/state exports; and Home, Classic, and Time Attack screenshots. Keep the reference assets and notes unchanged.
- Phase evidence mapping: Phase 4 uses color, typography, and layout tokens; Phase 5 uses Home and selector references; Phase 6 uses shared gameplay evidence; Phase 8 uses the Classic screen; Phase 9 uses the Time Attack screen; Phase 10 derives unspecified visual states while preserving behavior; Phase 11 follows the High Scores visual/product direction; Phase 13 derives responsive behavior because no mobile/tablet Figma evidence exists; Phase 15 performs final visual comparison against target screenshots.
- Within the visual evidence, selected mode follows the same selected/unselected grammar as domain and category. Keyboard focus is a separate accessible state from selection. Use only the primary gameplay back-button variant; the unexplained Variant2 is unused. Old Co-op, team-score, and turn-pass references are not PvP authority. Unspecified states are derived implementation states in the redesign visual language while preserving current functionality.

## 3. Target Frontend Architecture

### Catalog and route boundary

1. A semantic catalog defines stable domain and category identities, labels, descriptions, metric copy, target-catalog membership, and explicit category-to-playable-mode compatibility.
2. A separate availability/release policy resolves whether a semantic category is currently production-playable. It may resolve none of them as playable.
3. Server [`app/page.tsx`](app/page.tsx) derives/obtains the safe public production availability projection and passes it to client [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx); the client never decides availability.
4. [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts) is the common server authorization function used by [`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx), [`app/game/classic/page.tsx`](app/game/classic/page.tsx), and [`app/game/time-attack/page.tsx`](app/game/time-attack/page.tsx). No entry page may independently bypass it. It validates mode, semantic category, explicit category/mode compatibility, category production availability, and legacy/unsupported input before dispatch.
5. Only an authorized semantic category reaches the existing server-side dispatcher and produces normalized `GameItem` data for the selected client game component.

### Presentation and state ownership

- [`app/page.tsx`](app/page.tsx) is the server Home boundary and supplies the safe public production catalog; [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx) owns transient pre-navigation selections, High Scores dialog visibility, and Go navigation.
- The authorized route owns mode/category source-of-truth after navigation. All three gameplay entry pages call the common server authorization function; unauthorized routes never call a provider.
- [`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx) retains Classic lifecycle and mechanics; [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx) retains Time Attack timer and mechanics.
- Shared presentation components receive explicit state and callbacks. They do not own universal gameplay policy.
- A centralized client persistence module owns versioned High Score reads, writes, migration, scoping, and clear operations. Both playable modes use that API only after Phase 7 completes.
- High Scores opens from Home through `HomeSetup`; game screens may show local/best score, but no separate modal launcher is required unless needed to preserve existing behavior.

### Styling and dependencies

- Use semantic CSS custom properties and Tailwind CSS v4 utilities in [`app/globals.css`](app/globals.css), keeping color usage future-theme-friendly while shipping dark-only.
- [`app/layout.tsx`](app/layout.tsx) is allowlisted only for target font/root integration and dark-only root/document semantics; no unrelated metadata redesign. [`app/game/layout.tsx`](app/game/layout.tsx) is allowlisted for redesigned game canvas, overflow, and responsive integration.
- Retain existing dependency choices. Do not add a global state library, broad shadcn adoption, a UI-library migration, or any dependency without later owner approval.
- Use native radio semantics first and a native accessible dialog first for High Scores and confirmation. If browser support/testing proves native behavior insufficient, stop and request narrow dependency approval before Radix or another primitive.
- Native image behavior in [`components/game/GameCard.tsx`](components/game/GameCard.tsx) remains acceptable; image loading failure must be represented by the new derived-state presentation rather than hidden.

## 4. Directory and Module Changes

The following is the approved implementation modification allowlist. It authorizes future redesign implementation only; this documentation task changes only this plan.

### Existing Files to Modify

- [`app/globals.css`](app/globals.css) — semantic visual tokens, dark foundation, responsive helpers, focus and motion rules.
- [`app/layout.tsx`](app/layout.tsx) — target font/root integration and dark-only root/document semantics only; no unrelated metadata redesign.
- [`app/game/layout.tsx`](app/game/layout.tsx) — redesigned game canvas, overflow, and responsive integration.
- [`app/page.tsx`](app/page.tsx) — server Home boundary that derives/obtains a safe public production catalog and passes it to HomeSetup.
- [`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx), [`app/game/classic/page.tsx`](app/game/classic/page.tsx), and [`app/game/time-attack/page.tsx`](app/game/time-attack/page.tsx) — all use common `routeAuthorization.ts`; no independent route may bypass server authorization.
- [`components/CategoryCard.tsx`](components/CategoryCard.tsx) and [`components/ModeButton.tsx`](components/ModeButton.tsx) — Home selector composition and disabled PvP presentation.
- [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx) — scoped leaderboard tabs, semantic category filtering, clear actions, confirmation, populated/empty states.
- [`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx) — preserve mechanics while adopting shared presentation and finalized High Score API.
- [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx) — preserve mechanics while adopting shared presentation and finalized High Score API.
- [`components/game/GameCard.tsx`](components/game/GameCard.tsx) — visual card composition and image fallback state where needed.
- [`lib/api/index.ts`](lib/api/index.ts) — only the approved dispatch boundary integration needed to accept an already-authorized semantic category; no adapter-contract changes.
- [`types/game.ts`](types/game.ts) — only types necessary to express semantic category, authorized route data, and score identity.
- [`types/api.ts`](types/api.ts) — conditionally allowlisted only if implementation proves the existing normalized `GameItem` cannot represent an approved provider-neutral gameplay requirement. Prefer catalog-owned semantic/display metadata; otherwise keep the normalized item boundary stable and do not change this file.

### New Modules

- [`lib/catalog/semanticCatalog.ts`](lib/catalog/semanticCatalog.ts) — semantic domains, categories, labels, metric descriptions, and target-catalog membership.
- [`lib/catalog/availability.ts`](lib/catalog/availability.ts) — separate release-policy projection from semantic identities; production visibility/revocation rules.
- [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts) — mode/category query parsing and server-authorized route result.
- [`lib/highScores/storage.ts`](lib/highScores/storage.ts) — browser-only versioned persistence, idempotent migration, scoped reads/writes, and clear operations.
- [`lib/highScores/types.ts`](lib/highScores/types.ts) — persistence schema, semantic score key, legacy-record representation, and migration result types.
- [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx) — client setup state, Home-launched High Scores visibility, and Go behavior.
- [`components/home/DomainSelector.tsx`](components/home/DomainSelector.tsx) and [`components/home/CategorySelector.tsx`](components/home/CategorySelector.tsx) — accessible selector composition if extraction is needed.
- [`components/game/GameplayShell.tsx`](components/game/GameplayShell.tsx), [`components/game/ComparisonBoard.tsx`](components/game/ComparisonBoard.tsx), [`components/game/DecisionControls.tsx`](components/game/DecisionControls.tsx), and [`components/game/GameplayStatus.tsx`](components/game/GameplayStatus.tsx) — presentation-only gameplay composition.
- [`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx) — loading, unavailable, image fallback, reveal, game-over, and recoverable error presentation.
- [`components/development/RedesignFixtures.tsx`](components/development/RedesignFixtures.tsx) — conditional development/test-boundary fixture factory only when an existing supported renderer is available or a narrowly scoped local-only rendering mechanism is approved; never a production route and always excluded from production catalog/release policy.

New modules may be consolidated only when the resulting responsibilities stay equivalent. No provider adapter is added or modified for the redesign without separate approval.

### Explicitly Out-of-Scope Files

- All provider adapters: [`lib/api/tmdb.ts`](lib/api/tmdb.ts), [`lib/api/steamspy.ts`](lib/api/steamspy.ts), [`lib/api/steamspy_ratings.ts`](lib/api/steamspy_ratings.ts), [`lib/api/worldbank.ts`](lib/api/worldbank.ts), [`lib/api/rawg.ts`](lib/api/rawg.ts), [`lib/api/cheapshark.ts`](lib/api/cheapshark.ts), and [`lib/api/fakestoreapi.ts`](lib/api/fakestoreapi.ts).
- [`design-reference/`](design-reference/) and every design reference asset or note.
- Configuration and dependency files, including [`package.json`](package.json), [`package-lock.json`](package-lock.json), [`next.config.ts`](next.config.ts), [`tsconfig.json`](tsconfig.json), [`eslint.config.mjs`](eslint.config.mjs), and [`postcss.config.mjs`](postcss.config.mjs).
- Unrelated routes, public assets, environment files, and all infrastructure not specifically included in the implementation allowlist.

## 5. Dependency Decisions

| Decision | Direction | Reason / constraint |
| --- | --- | --- |
| State | Existing component-local and mode-local state | Home needs local transient setup state; Classic and Time Attack retain independent lifecycles. No global state library. |
| Catalog | Semantic catalog separated from availability policy, with explicit playable-mode compatibility | Provider implementations and release readiness must not define user-facing category identity; valid category/mode pairs may still be incompatible. |
| Route validation | Common server authorization before provider dispatch | All three gameplay entry pages call `lib/catalog/routeAuthorization.ts`; no query input reaches a provider unless mode, semantic category, compatibility, availability, and legacy/unsupported-input checks succeed. |
| Persistence | One browser-only versioned High Score API | Prevents inconsistent mode keys, allows safe migration, scoped clearing, and shared UI behavior. |
| UI components | Focused presentation components plus existing client boundaries | Reuses visual composition without centralizing game rules or adding a broad component framework. Native radios and native accessible dialogs are first choice; dependency approval is required if evidence shows they are insufficient. |
| Styling | Semantic CSS variables plus Tailwind v4 | Dark-only release remains maintainable and future-theme-friendly without implementing light mode. |
| Fixtures | Explicit component/test/development injection through an existing supported renderer when available | Enables populated visual and interaction checks while preventing an accidental production-readiness bypass; otherwise stop for narrow approval of a local-only renderer. |

## 6. Catalog and Availability Model

Each category has a permanent semantic identifier, domain identifier, display content, metric contract, target-catalog flag, and explicit compatibility with playable modes (`classic` and/or `time-attack`). Do not add PvP compatibility; PvP remains disabled Coming Soon only. A valid category with a valid but unsupported mode is unauthorized. Provider mappings and release readiness are separate. The production catalog is a derived projection:

**semantic category → availability/release policy → provider mapping → normalized gameplay data**

This direction is mandatory. A provider adapter existing, a component rendering fixture data, a build completing, or one successful provider response does not make a category production-playable. A category can be hidden or revoked without changing its semantic identity or invalidating stored High Score identity.

Availability is evaluated on the server-side route boundary and reflected in the safe public Home catalog projection. The common `lib/catalog/routeAuthorization.ts` function validates compatibility and availability for each of the three entry pages; unauthorized routes never call a provider. The policy must preserve the ability to have zero production-playable target categories. Country Population is explicitly excluded from this redesigned projection despite remaining internally supported.

## 7. Development Fixture Policy

> **Isolated fixture rule — mandatory and not a release gate:** Development and test fixtures may render populated Home, gameplay, High Scores, and derived UI states during implementation and testing. Fixture data is completely isolated from production release policy.

- Fixture data must never promote a semantic category to playable, modify production availability, bypass server-side route gating, or display an unverified category in the production Home catalog.
- Prefer fixture injection through explicit component props, factories, or another existing repository-supported component/test/development renderer rather than weakening or bypassing catalog availability.
- **Fixture-rendering stop condition:** Before visual fixture work, first use an existing repository-supported component/test/development renderer if one is available. Do not assume Storybook or a test framework exists; do not create production-accessible fixture routes or add dependencies/configuration solely to render fixtures. If no safe browser renderer exists, stop and request approval for one narrowly scoped local-only rendering mechanism, explaining why it is needed, the exact files/configuration, how it remains inaccessible in production, and how fixture isolation/cleanup will work. This condition never weakens production availability or route gating.
- Fixtures must support visual and interaction verification for populated domain/category selectors; Classic and Time Attack gameplay; reveal and correct/incorrect states; image fallback; game-over; High Score records and empty states; loading/error states; Time Attack timer/urgency states; and responsive layouts.
- Fixture results are **fixture/UI verification only**. They are not provider runtime verification and never count as production category-readiness evidence.
- Production Home and production routes must consume only the real availability projection and server authorization path. No fixture flag, sample record, query parameter, or client-only switch may alter that behavior.

## 8. Ordered Implementation Phases

### Phase 1 — Baseline Safety and Prerequisites

- **Objective:** Establish a narrow baseline for the redesign without changing product behavior, adapters, dependencies, configuration, or design-reference assets.
- **Affected existing files:** None initially; inspect the approved allowlist in Section 4 before an implementation edit.
- **Proposed new modules:** None.
- **Preserve:** Existing Classic and Time Attack mechanics, browser-only storage, server-only adapters, and current route behavior until its dedicated phase.
- **Introduce:** A documented baseline of existing behavior and a file-by-file implementation checklist; no implementation code is introduced in this phase.
- **Dependencies:** None.
- **Out of scope:** Provider calls, provider adapter edits, installs, dependency changes, config changes, and catalog promotion.
- **Validation/testing:** Source-level baseline capture and existing behavior inventory only; do not treat a successful build or one provider response as release evidence.
- **Regression/rollback risk:** Baseline drift or accidental scope expansion. Roll back any change outside the allowlist before proceeding.

### Phase 2 — Semantic Catalog and Availability Model

- **Objective:** Define the stable four-domain, eleven-category semantic catalog independently from providers and separately model availability.
- **Affected existing files:** [`types/game.ts`](types/game.ts) only if shared semantic types are required. [`types/api.ts`](types/api.ts) remains conditional per Section 4 and is changed only if implementation proves normalized `GameItem` cannot represent an approved provider-neutral gameplay requirement; prefer catalog-owned semantic/display metadata.
- **Proposed new modules:** [`lib/catalog/semanticCatalog.ts`](lib/catalog/semanticCatalog.ts) and [`lib/catalog/availability.ts`](lib/catalog/availability.ts).
- **Preserve:** Country Population stays internally supported and outside the target catalog. No category is silently promoted; the production catalog may remain empty.
- **Introduce:** Semantic IDs, approved category metadata/metric copy, explicit semantic-category compatibility with playable modes, availability projection, domain derivation from playable children, and revocation without semantic-ID changes. PvP has no compatibility and remains disabled Coming Soon.
- **Dependencies:** Phase 1.
- **Out of scope:** Adapter modification, provider probing, Home visual work, client-side availability overrides, and fixture data wired into production availability.
- **Validation/testing:** Source-level checks that all eleven categories exist once with explicit mode compatibility, target catalog membership excludes Country Population, hidden categories are excluded from production projection, PvP is not compatible, and a zero-category projection is valid.
- **Regression/rollback risk:** Coupling semantic IDs to provider names would break future remapping and scores. Roll back to the prior stable semantic identifier rather than rename data.

### Phase 3 — Route Validation and Dispatcher Boundary

- **Objective:** Make the conceptual route `/game/{mode}?category=...` a common validated, server-authorized boundary before any provider dispatch.
- **Affected existing files:** [`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx), [`app/game/classic/page.tsx`](app/game/classic/page.tsx), [`app/game/time-attack/page.tsx`](app/game/time-attack/page.tsx), and minimally [`lib/api/index.ts`](lib/api/index.ts) if authorization must be represented at its call boundary.
- **Proposed new modules:** [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts).
- **Preserve:** Server-side provider fetching, normalized `GameItem` flow, and route-specific client game components.
- **Introduce:** Common use of [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts) from all three gameplay entry pages, validating mode, semantic category, explicit category/mode compatibility, production availability, and legacy/unsupported input. No entry page may independently bypass this function. Return a safe unavailable/invalid result and dispatch only after authorization succeeds; unauthorized routes never call a provider.
- **Dependencies:** Phase 2.
- **Out of scope:** Client-side route authorization as a substitute, fallback dispatch for hidden categories, adapter edits, and provider release promotion.
- **Validation/testing:** Exercise valid, missing, malformed, legacy/unsupported, unsupported-mode, valid-category/valid-but-incompatible-mode, hidden-category, and zero-availability outcomes through each entry page/common authorization path. Confirm every unauthorized request is rejected before provider dispatch and all three pages use the same function.
- **Regression/rollback risk:** An authorization gap could expose a hidden category; a too-strict parser could reject a valid category. Keep route parsing and availability policy explicit and independently reviewable.

### Phase 4 — Semantic Tokens and Visual Foundation

- **Objective:** Establish the dark-only redesign foundation before feature surfaces are composed.
- **Affected existing files:** [`app/globals.css`](app/globals.css), [`app/layout.tsx`](app/layout.tsx) only for target font/root integration and dark-only root/document semantics (no unrelated metadata redesign), and [`app/game/layout.tsx`](app/game/layout.tsx) for redesigned game canvas, overflow, and responsive integration.
- **Proposed new modules:** None.
- **Preserve:** Tailwind v4 usage and existing global behavior not involved in the redesign.
- **Introduce:** Semantic background, surface, foreground, muted, focus, status, border, spacing, target typography integration, radius, elevation, breakpoint, and reduced-motion variables; high-contrast focus treatment; no active light theme. Use target typography rather than substituting the current font merely because it is installed/imported.
- **Dependencies:** Phase 1.
- **Out of scope:** A light mode, a theme toggle, preference persistence, broad component-library adoption, and design-reference edits.
- **Design evidence:** Inspect relevant reference README, inventory, component map, responsiveness, open questions, colors, typography, layout, component/state exports, and Home/Classic/Time Attack screenshots before visual work. Phase 4 specifically uses color, typography, and layout tokens; raw Figma CSS and coordinates are never copied literally. Keep `design-reference/` read-only.
- **Validation/testing:** Review tokens against authoritative target evidence, keyboard focus visibility (separate from selection), text contrast intent, and motion-reduction paths. Validate at representative narrow and wide viewports later in Phase 13.
- **Regression/rollback risk:** Global token changes can affect retained UI. Introduce semantic aliases incrementally and retain values necessary for unaffected views until migrated.

### Phase 5 — Home Setup Redesign

- **Objective:** Implement the accessible Domain → Category → Mode → Go setup flow against the production availability projection.
- **Affected existing files:** [`app/page.tsx`](app/page.tsx) as the server Home boundary, [`components/CategoryCard.tsx`](components/CategoryCard.tsx), and [`components/ModeButton.tsx`](components/ModeButton.tsx).
- **Proposed new modules:** [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx) as the client setup/state boundary, plus [`components/home/DomainSelector.tsx`](components/home/DomainSelector.tsx) and [`components/home/CategorySelector.tsx`](components/home/CategorySelector.tsx) as warranted.
- **Preserve:** The server/client boundary: `app/page.tsx` derives/obtains and passes a safe public production catalog; `HomeSetup` owns transient domain/category/mode selection, High Scores dialog visibility, and Go interaction/navigation. Keep immediate Go for valid selections and no production visibility for categories that have not passed release gates.
- **Introduce:** Domain/category/mode selector composition, domain changes clearing category while preserving mode, domain/category/mode sharing the selected/unselected grammar, and visible non-selectable PvP Coming Soon state. The production Home must remain correct when the availability projection contains no domains; availability is not decided client-side.
- **Dependencies:** Phases 2, 3, and 4.
- **Design evidence:** Use Home and selector references, including state exports and desktop Home screenshots. Preserve target typography and hierarchy; keyboard focus is visually distinct from selected state. Do not copy raw Figma CSS/coordinates. `design-reference/` is read-only.
- **Fixture rule:** Fixtures may render populated domain and category selectors, valid/invalid Go states, and visual Home states through explicit component/development/test injection. Before visual fixture work, use an existing repository-supported renderer if available. Do not assume Storybook/test framework, add fixture routes accessible in production, or add dependencies/config solely to render fixtures. If no safe browser renderer exists, stop for approval of one narrowly scoped local-only mechanism with rationale, exact files/config, production-inaccessibility, and cleanup/isolation plan. Fixtures must not alter production availability, make a category playable, or cause an unverified category to appear in production Home.
- **Out of scope:** A client bypass for route authorization, fake production availability, theme toggle work, and provider adapter changes.
- **Validation/testing:** Verify server-provided safe catalog, domain-change reset/preserved-mode behavior, valid Go route construction, disabled Go states, disabled PvP, keyboard navigation/focus vs selection, empty-production-catalog rendering, and populated fixture rendering as separate evidence. Fixture rendering is subject to the renderer stop condition above and is never production-availability evidence.
- **Regression/rollback risk:** Selector state could drift from the route or an empty catalog could appear broken. Keep the Go payload derived from the selected semantic IDs and provide a deliberate empty state.

### Phase 6 — Shared Gameplay Composition

- **Objective:** Build reusable presentation components for the shared gameplay shell while retaining all mode-specific game rules and lifecycle state locally.
- **Affected existing files:** [`components/game/GameCard.tsx`](components/game/GameCard.tsx), [`app/game/layout.tsx`](app/game/layout.tsx) for the redesigned canvas/overflow/responsive integration, and, only to adopt presentation boundaries later, [`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx) and [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx).
- **Proposed new modules:** [`components/game/GameplayShell.tsx`](components/game/GameplayShell.tsx), [`components/game/ComparisonBoard.tsx`](components/game/ComparisonBoard.tsx), [`components/game/DecisionControls.tsx`](components/game/DecisionControls.tsx), and [`components/game/GameplayStatus.tsx`](components/game/GameplayStatus.tsx).
- **Preserve:** Native image usage where present, Classic mechanics, Time Attack mechanics, timer ownership, keyboard behavior, and mode-local state.
- **Introduce:** Shared top navigation, primary gameplay back-button variant only (the unexplained Variant2 remains unused), metric/status region, comparison board, decision controls, semantic category/metric copy, and presentational state contracts only. Unspecified states are derived in the redesign visual language while preserving current functionality.
- **Dependencies:** Phases 3 and 4.
- **Design evidence:** Use shared gameplay component/state exports and gameplay references. Old Co-op/team-score/turn-pass evidence is not PvP authority. Keep `design-reference/` read-only and do not copy raw CSS/coordinates.
- **Fixture rule:** Use isolated fixture injection to render populated Classic and Time Attack shells, reveal states, correct/incorrect decisions, image failure/fallback, and responsive layouts without calling providers or changing availability/route policy. Before visual fixture work, use an existing repository-supported renderer; do not assume Storybook/test framework, create production-accessible fixture routes, or add dependencies/config solely for rendering. If no safe browser renderer exists, stop for narrow local-only renderer approval describing rationale, exact files/config, production inaccessibility, and cleanup/isolation. This never weakens release policy or route gates.
- **Out of scope:** A universal rules engine, global state, a provider data mock wired into production routes, High Score storage integration, and gameplay-rule changes.
- **Validation/testing:** Compare composition across both modes using controlled inputs; verify labels, focus order, keyboard-accessible decisions, image fallback contract, and that presentation props do not create a route/provider bypass.
- **Regression/rollback risk:** Shared components can accidentally absorb divergent mode rules. Keep each component input-oriented and retain mode-specific transition logic in its owning game component.

### Phase 7 — High Score Storage Normalization and Legacy Migration

- **Objective:** Finalize centralized browser-only High Score persistence and migration **before** either Classic or Time Attack integrates with it.
- **Affected existing files:** [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx) only for temporary compatibility boundaries if required; [`types/game.ts`](types/game.ts) if score identity types belong there. Keep [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx) as the Home modal entry point; its implementation scope is Phase 5.
- **Proposed new modules:** [`lib/highScores/types.ts`](lib/highScores/types.ts) and [`lib/highScores/storage.ts`](lib/highScores/storage.ts).
- **Preserve:** Browser-local persistence, existing stored records where safely interpretable, no PvP records, and no server-side storage.
- **Introduce:** A versioned schema; canonical mode + semantic-category keys; idempotent migration; read/write/list APIs; scoped clear for the selected leaderboard; confirmed global clear; preservation of hidden/unmapped legacy records during automatic migration; and a migration report safe for UI handling. After explicit confirmation, Clear All removes all recognized HigherLower score persistence capable of repopulating the app: canonical records, all recognized legacy score records (including unresolved semantic mappings), and migration metadata that could recreate scores. It must preserve unrelated browser storage and arbitrary unknown/non-score data in old namespaces.
- **Dependencies:** Phases 1 and 2. The finalized semantic catalog must provide stable category identity before mapping any record.
- **Out of scope:** Cloud migration, accounts, server storage, inferred mappings, deleting unresolved legacy records during automatic migration, or a High Scores visual redesign (Phase 11). Confirmed Clear All is the explicit user-authorized exception for removing recognized HigherLower score records, even when a legacy record's semantic mapping was unresolved.
- **Validation/testing:** Test first run, repeated migration, already-versioned records, proven legacy mappings, unresolved/ambiguous/hidden legacy preservation during automatic migration, per-mode/per-category isolation, scoped clear without deleting unrelated or ambiguous records, cancelled global clear, and confirmed Clear All removing canonical records, all recognized legacy HigherLower score records (including records with unresolved semantic mapping), and score-recreating migration metadata while preserving unrelated browser storage and arbitrary unknown/non-score data; also test malformed storage recovery and absence of PvP score paths.
- **Regression/rollback risk:** Incorrect migration can lose scores or misclassify them. Automatic migration must be append/preserve-oriented, idempotent, version-marked only after safe completion, and retain unresolved/ambiguous source records. Explicitly confirmed Clear All intentionally removes only recognized HigherLower score persistence and metadata that could recreate scores; unrelated/unknown browser data remains untouched.

### Phase 8 — Classic Redesign Integration

- **Objective:** Integrate Classic with the shared gameplay presentation and the finalized Phase 7 High Score persistence API without changing Classic mechanics.
- **Affected existing files:** [`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx), [`app/game/classic/page.tsx`](app/game/classic/page.tsx) (common route authorization remains mandatory), and [`components/game/GameCard.tsx`](components/game/GameCard.tsx) as needed for the adopted composition.
- **Proposed new modules:** None beyond Phase 6 and Phase 7 modules.
- **Preserve:** Classic rules, score timing, progression, restart behavior, keyboard behavior, browser-local score semantics, and authorized server data flow.
- **Introduce:** Redesigned Classic composition, semantic metric/context copy, derived-state handoffs, and score persistence exclusively through the finalized shared Phase 7 API using `classic + semanticCategory` identity.
- **Dependencies:** Phases 3, 4, 6, and **7**. Classic must not write legacy keys or use a temporary/old persistence path.
- **Out of scope:** Rule changes, provider contract changes, PvP, Time Attack lifecycle changes, and custom data routes.
- **Design evidence:** Use the Classic target screen and relevant component/state exports. Preserve behavior, target typography, and hierarchy; do not copy raw Figma CSS/coordinates. `design-reference/` remains read-only.
- **Fixture rule:** Isolated fixtures may validate populated Classic cards, reveal/correct/incorrect states, image fallback, game-over, score records, and responsive behavior. Before visual fixture work, use an existing repository-supported renderer if available; do not assume Storybook/test framework, create production-accessible fixture routes, or add dependencies/config solely for rendering. If no safe browser renderer exists, stop for narrow local-only renderer approval with rationale, exact files/config, production-inaccessibility, and cleanup/isolation plan. Fixtures must not authorize an unavailable category or count as provider readiness.
- **Validation/testing:** Regression-check Classic transitions against the baseline, common authorization and compatibility before dispatch, one score write per completed run through the shared API, scoped leaderboard visibility, and keyboard/touch behavior through controlled fixtures.
- **Regression/rollback risk:** Presentation extraction can change decision timing or duplicate score writes. Keep the existing rules/lifecycle owner intact and make persistence writes explicit, terminal-state guarded, and testable.

### Phase 9 — Time Attack Redesign Integration

- **Objective:** Integrate Time Attack with shared presentation and the finalized Phase 7 High Score persistence API while preserving timer-driven mechanics.
- **Affected existing files:** [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx), [`app/game/time-attack/page.tsx`](app/game/time-attack/page.tsx) (common route authorization remains mandatory), and [`components/game/GameCard.tsx`](components/game/GameCard.tsx) as needed.
- **Proposed new modules:** None beyond Phase 6 and Phase 7 modules.
- **Preserve:** Time Attack rules, timer ownership, urgency behavior, score timing, restart/cleanup mechanics, and keyboard behavior.
- **Introduce:** Redesigned Time Attack composition, accessible timer/urgency presentation, derived-state handoffs, and score persistence exclusively through the finalized shared Phase 7 API using `time-attack + semanticCategory` identity.
- **Dependencies:** Phases 3, 4, 6, and **7**. Time Attack must not write its separate legacy namespace or use a temporary/old persistence path.
- **Out of scope:** Timer rule changes, shared lifecycle ownership, provider changes, PvP, and Classic mechanics.
- **Design evidence:** Use the Time Attack target screen and relevant component/state exports. Preserve behavior, target typography, and hierarchy; do not copy raw Figma CSS/coordinates. `design-reference/` remains read-only.
- **Fixture rule:** Isolated fixtures may validate populated Time Attack gameplay, controlled timer/urgency states, reveal/correct/incorrect states, image fallback, game-over, High Score records, and responsive layouts. Before visual fixture work, use an existing repository-supported renderer if available; do not assume Storybook/test framework, create production-accessible fixture routes, or add dependencies/config solely for rendering. If no safe browser renderer exists, stop for narrow local-only renderer approval with rationale, exact files/config, production-inaccessibility, and cleanup/isolation plan. Such validation is not provider/runtime readiness evidence and never weakens production gates.
- **Validation/testing:** Regression-check common authorization and compatibility before dispatch, timer start/cleanup, decision behavior, game-over, terminal score write deduplication, semantic category scoping, keyboard/touch interaction, and screen-reader status behavior using controlled inputs.
- **Regression/rollback risk:** Refactoring can leak timers, alter urgency thresholds, or double-save scores. Preserve local lifecycle cleanup and route every terminal record through the Phase 7 API.

### Phase 10 — Derived States and Safe Fallbacks

- **Objective:** Provide coherent, accessible derived presentation for loading, unavailable, errors, image failure, reveal, and game-over without broadening production availability.
- **Affected existing files:** [`components/game/GameCard.tsx`](components/game/GameCard.tsx), [`components/game/ClassicGame.tsx`](components/game/ClassicGame.tsx), [`components/game/TimeAttackGame.tsx`](components/game/TimeAttackGame.tsx), and route pages only where server-authorized unavailable output requires it.
- **Proposed new modules:** [`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx).
- **Preserve:** Server route gating precedes dispatch; failures do not fall through to an unverified category; mode-local rules still control when reveal and game-over occur.
- **Introduce:** Explicit loading, empty/unavailable, recoverable error, image fallback, decision reveal, and end-of-run states with action affordances appropriate to each owner.
- **Dependencies:** Phases 3, 6, 8, and 9.
- **Design evidence:** Use Phase 10 to derive unspecified loading, unavailable, error, reveal, image-fallback, and game-over visuals from the approved visual language while preserving existing functionality/mechanics. Do not copy raw Figma CSS/coordinates; `design-reference/` remains read-only.
- **Fixture rule:** Fixtures may render every derived state, including loading/error/image fallback/game-over, to verify UI without pretending a provider passed runtime gates or making a category visible in production. Before visual fixture work, use an existing repository-supported renderer if available; do not assume Storybook/test framework, create production-accessible fixture routes, or add dependencies/config solely for rendering. If none is safe, stop for narrow local-only renderer approval with rationale, exact files/config, production-inaccessibility, and cleanup/isolation plan.
- **Out of scope:** Provider retry policy redesign, availability promotion, adapter edits, and alternative gameplay rules.
- **Validation/testing:** Verify no state blocks keyboard focus unexpectedly, images have meaningful fallback behavior, every unauthorized route is rejected by common authorization before provider dispatch, and terminal controls do not trigger duplicate persistence. Fixture state rendering follows the isolated-renderer stop condition.
- **Regression/rollback risk:** Generic fallback can conceal actionable problems or accidentally allow retry loops. Keep operational errors distinct from release-gated unavailability and retain mode-specific actions.

### Phase 11 — High Scores Dialog Redesign

- **Objective:** Redesign High Scores around finalized centralized storage, semantic categories, separate mode tabs, and safe destructive actions.
- **Affected existing files:** [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx). **Affected new module:** [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx) for Home entry-point/open state.
- **Proposed new modules:** None required beyond Phase 7 types/storage.
- **Preserve:** Browser-only storage, no PvP scores, automatic-migration preservation of hidden/unmapped/unresolved/ambiguous legacy records, and confirmed Clear All behavior that removes all recognized HigherLower score persistence capable of repopulating the app (including recognized records with unresolved semantic mappings) without deleting unrelated browser storage or arbitrary unknown/non-score data in old namespaces.
- **Introduce:** High Scores entry point opened from Home via `HomeSetup`; Classic/Time Attack tabs; semantic category filter; populated and empty states; **Clear this leaderboard** scoped to mode + semantic category and protecting unrelated/ambiguous records; **Clear all High Scores** with confirmation that removes canonical records, all recognized legacy score records (including unresolved semantic mappings), and score-recreating migration metadata; accessible native-dialog-first behavior, focus management, and announcements. Game screens may show local/best score; no separate modal launchers are required unless needed to preserve existing behavior. No PvP tab.
- **Dependencies:** Phases 4, 7, and 10. The dialog must use only the final Phase 7 API, never direct legacy-key reads/writes.
- **Design evidence:** Use approved High Scores visual/product direction; maintain separate mode tabs/filtering and confirmed destructive action. `design-reference/` is read-only; no raw Figma CSS/coordinates copying.
- **Fixture rule:** Fixtures may inject populated and empty records, clear-confirmation states, and responsive dialog layouts. Before visual fixture work, use an existing repository-supported renderer if available; do not assume Storybook/test framework, create production-accessible fixture routes, or add dependencies/config solely for rendering. If no safe browser renderer exists, stop for narrow local-only renderer approval with rationale, exact files/config, production-inaccessibility, and cleanup/isolation plan. Fixture records remain isolated and cannot affect production availability/provider readiness.
- **Out of scope:** Server leaderboards, accounts, PvP tabs, cloud synchronization, and global destructive actions without confirmation.
- **Validation/testing:** Verify Home-only modal entry point, mode/category isolation, scoped clear does not delete unrelated/ambiguous records, automatic migration retains unresolved/ambiguous records, confirmed Clear All removes canonical and all recognized legacy HigherLower score records (including unresolved semantic mappings) plus score-recreating migration metadata but leaves unrelated/unknown/non-score data intact, confirmation cancel/accept paths, migration-result display where applicable, empty state, native accessible dialog behavior, focus trap/return, escape behavior, and safe malformed-record handling. If native dialog behavior proves insufficient by browser support/testing, stop for narrow dependency approval before adopting Radix/another primitive.
- **Regression/rollback risk:** A broad clear action could remove unrelated records, while a too-narrow Clear All could allow recognized legacy scores to resurface. Route scoped clears through exact mode/category scope; after explicit confirmation remove only canonical/recognized legacy score data and score-recreating metadata, preserving unrelated/unknown/non-score data.

### Phase 12 — PvP Coming Soon Conversion

- **Objective:** Convert any old Co-op presentation into a clear, disabled PvP Coming Soon product surface.
- **Affected existing files:** [`components/ModeButton.tsx`](components/ModeButton.tsx), [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx), and shared presentation modules only where labels are rendered. [`app/page.tsx`](app/page.tsx) remains the server Home/catalog boundary and is changed only if server catalog projection integration requires it.
- **Proposed new modules:** None.
- **Preserve:** Classic and Time Attack selectability; no existing provider or score behavior is changed.
- **Introduce:** PvP naming, disabled state, Coming Soon copy, and non-selectable accessible semantics.
- **Dependencies:** Phases 4 and 5.
- **Out of scope:** PvP gameplay, rooms, networking, teams, turns, matchmaking, multiplayer infrastructure, and PvP score persistence.
- **Validation/testing:** Verify disabled control semantics, non-navigation, keyboard behavior, screen-reader label, visual distinction, absence of PvP catalog compatibility and High Score/PvP persistence, and rejection through common route authorization before dispatch.
- **Regression/rollback risk:** Disabled styling alone may still permit activation. Prevent interaction at the semantic control level and reject unsupported mode routes in Phase 3.

### Phase 13 — Responsive and Accessibility Hardening

- **Objective:** Harden the completed redesign across supported viewport classes and input/assistive-technology paths.
- **Affected existing files:** [`app/globals.css`](app/globals.css), [`app/game/layout.tsx`](app/game/layout.tsx) for canvas/overflow/responsive integration, and all approved Home, gameplay, High Scores, and shared presentation components where focused fixes are required. [`app/layout.tsx`](app/layout.tsx) remains limited to target font/root integration and dark-only root/document semantics, with no unrelated metadata redesign.
- **Proposed new modules:** None expected.
- **Preserve:** Dark-only policy, game mechanics, release gating, and component ownership boundaries.
- **Introduce:** Implementation-derived responsive layout refinements (no mobile/tablet Figma is available) that preserve target hierarchy rather than scale desktop coordinates, plus target-size consistency, keyboard focus order, visible focus distinct from selection, semantic labels, live-region restraint, reduced-motion support, and color-independent decision/status communication.
- **Dependencies:** Phases 5 through 12.
- **Fixture rule:** Use isolated fixtures for narrow/wide responsive Home, gameplay, High Scores, empty/error/reveal/game-over, and populated selector states only through an existing repository-supported renderer if available. Do not assume Storybook/test framework, create production-accessible fixture routes, or add dependencies/config solely to render fixtures. If no safe browser renderer exists, stop and request narrow approval for a local-only rendering mechanism with rationale, files/configuration, production inaccessibility, and cleanup/isolation plan. Responsive fixture success remains UI evidence only, never a provider release gate.
- **Out of scope:** Light mode, a new design-system dependency, device-specific provider behavior, and gameplay-rule adjustments for layout.
- **Validation/testing:** Perform keyboard-only and screen-reader-oriented source/interactive checks where the capability is available; verify zoom/reflow, hierarchy-preserving responsive behavior, contrast intent, motion reduction, and touch target layout at representative viewport widths. Keep responsive design implementation-derived; no mobile/tablet Figma is treated as authority.
- **Regression/rollback risk:** Layout fixes can disturb mode controls and dialog behavior. Validate each affected surface in both populated fixture and empty production-availability states.

### Phase 14 — Provider / Readiness Release Gates

- **Objective:** Apply category-specific evidence gates without conflating frontend completion, fixtures, adapter presence, or isolated successful responses with production readiness.
- **Affected existing files:** [`lib/catalog/availability.ts`](lib/catalog/availability.ts) and any configuration-free release-policy data within the approved catalog modules only.
- **Proposed new modules:** None required.
- **Preserve:** Server-only adapters, semantic IDs, zero-availability production support, and revoked-category capability.
- **Introduce:** Evidence-backed availability promotion/revocation workflow and auditably explicit category gate status.
- **Dependencies:** Phases 2, 3, and 13. This phase is intentionally after frontend composition; it is not a prerequisite for implementing fixtures or redesign UI.
- **Fixture rule:** Fixture success, mocked provider values, visual screenshots, or client-only route simulation cannot satisfy a release gate or modify the production availability projection. Any visual fixture rendering still follows the existing-renderer-first stop condition in Section 7; no fixture mechanism weakens production route gating.
- **Out of scope:** Altering provider adapters, treating a one-off API response as readiness, bypassing server authorization, or promoting a category solely to populate Home.
- **Validation/testing:** Apply the category gate checklist in Section 15 with actual provider/runtime evidence only when separately safe and approved. Record absent evidence as not ready rather than guess.
- **Regression/rollback risk:** Premature promotion can expose broken or misleading gameplay. Make release policy reversible and retain the semantic category when hiding it again.

### Phase 15 — Final Regression and Release Review

- **Objective:** Review the redesign as an integrated release candidate while separately reporting implementation completion and category production readiness.
- **Affected existing files:** No new product files expected; only focused remediation within the approved allowlist if a verified finding requires it.
- **Proposed new modules:** None.
- **Preserve:** All locked decisions, persistence safeguards, server gating, provider separation, dark-only policy, disabled PvP, and fixture isolation.
- **Introduce:** Final traceability matrix connecting each delivered surface to its implementation evidence, isolated fixture/UI evidence, provider integration evidence where available, and independent production-readiness status; perform final visual comparison against authoritative target Home, Classic, and Time Attack screenshots and applicable component/state evidence.
- **Dependencies:** Phases 1 through 14.
- **Fixture rule:** Final fixture coverage may demonstrate populated UI and interactions only through an existing supported renderer or explicitly approved safe local-only mechanism; report it separately from provider/runtime evidence and never use it to assert production category readiness. Do not assume a renderer, create production-accessible fixture routes, or add dependencies/config without narrow approval.
- **Out of scope:** Unapproved category promotion, provider work, light mode, multiplayer, broad UI-library adoption, or a post-implementation UI/UX skill audit.
- **Validation/testing:** Execute applicable checks in Section 12, then compare final rendered Home/gameplay visuals to target screenshots, review release gates, migration/Clear All outcomes, compatibility and common route rejection before provider dispatch, gameplay regressions, destructive-action safeguards, responsive/accessibility findings, fixture isolation, and the changed-file set. Do not treat visual fixtures as provider evidence.
- **Regression/rollback risk:** Conflating “redesign complete” with “categories ready” risks an incorrect release claim. Roll back availability independently of UI implementation and preserve category semantic identities and stored scores.

## 9. State and Data Flow

### Home to authorized gameplay

1. The server Home boundary [`app/page.tsx`](app/page.tsx) derives/obtains the safe public production-availability projection and passes it to [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx). Only server/provider runtime evidence can establish category availability.
2. `HomeSetup` keeps transient selected domain, category, and mode, High Scores visibility, and Go interaction/navigation. Domain changes clear category and retain mode; availability is not decided client-side.
3. Go creates `/game/{mode}?category={semanticCategoryId}` only for selected playable mode/category inputs.
4. Each entry page—[`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx), [`app/game/classic/page.tsx`](app/game/classic/page.tsx), and [`app/game/time-attack/page.tsx`](app/game/time-attack/page.tsx)—calls common [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts). No page independently bypasses it. It validates mode, semantic category, explicit category/mode compatibility, production availability, and legacy/unsupported input before dispatch.
5. A valid category paired with a valid but incompatible mode is unauthorized. PvP has no compatibility entry. Any unauthorized route renders a safe unavailable/invalid state and never calls a provider or reaches [`lib/api/index.ts`](lib/api/index.ts).
6. An authorized semantic category is resolved to the server-side provider mapping and normalized `GameItem` data.
7. The selected mode component receives only the authorized route/category context and normalized items. It owns its own gameplay lifecycle.

### Score flow

1. A mode-local terminal run produces a score candidate with a fixed mode and authorized semantic category ID.
2. The mode invokes the centralized Phase 7 browser persistence API once per terminal run.
3. The API reads/writes the current versioned schema and scopes records by mode + semantic category.
4. `HomeSetup` opens [`components/HighScoresModal.tsx`](components/HighScoresModal.tsx), which reads the same API for filtered display and destructive operations. Game screens may show local/best score; separate modal launchers are unnecessary unless needed to preserve existing behavior.
5. No route, adapter, provider response, server code, or PvP branch reads or writes scores.

## 10. Provider and Readiness Flow

Provider capability and visual implementation are intentionally separate:

1. A semantic category receives a stable identity and approved metric contract.
2. A release-policy entry remains unavailable until its category-specific criteria are evidenced.
3. The server authorizes a requested category against that policy before dispatching an adapter.
4. The provider adapter, still server-only, returns data that is normalized into the existing shared shape.
5. Runtime/provider evidence determines promotion or revocation; it is not inferred from frontend implementation, a fixture, an adapter file, a build, or one response.

This separation allows implementation to proceed while production availability is zero. Fixtures inject data after catalog/route decisions at component, test, or development boundaries; they do not modify the policy, route authorization, provider mapping, or production Home catalog.

## 11. High Scores Migration Strategy

### Canonical storage model

- Use a versioned browser-storage envelope containing the schema version, canonical records, and preserved legacy/unresolved material where required.
- Canonical identity comprises a supported mode (`classic` or `time-attack`) plus a semantic category ID. It does not use provider names, display labels, raw routes, or PvP.
- Records retain the fields necessary for existing score display/order and safely ignore unknown optional legacy fields.
- Catalog-owned semantic/display metadata is preferred. Keep the normalized `GameItem` boundary in [`types/api.ts`](types/api.ts) stable unless implementation proves it cannot represent an approved provider-neutral gameplay requirement; any such change requires conditional approval within Section 4's allowlist rule.

### Idempotent migration procedure

1. Read legacy namespaces defensively; unavailable or malformed browser storage is treated as recoverable, not as a reason to create server state.
2. For each record, migrate only when the legacy source can be proven to represent a current mode and a known semantic category according to an explicit mapping table.
3. Retain records belonging to hidden categories where their semantic identity is proven; hiding production availability must not erase historical local scores.
4. Preserve unresolved, ambiguous, malformed, or no-longer-target records in a legacy-preservation area during automatic migration instead of guessing a category or deleting them.
5. Deduplicate deterministically, write the versioned envelope atomically as browser storage permits, and record migration completion so a second run produces the same result.
6. Do not delete source legacy material until the migration policy explicitly establishes safe preservation; repeated migration must not duplicate canonical records.

### Clear behavior

- **Clear this leaderboard** receives explicit mode + semantic category scope and cannot remove another leaderboard; it must not accidentally delete unrelated or unresolved/ambiguous records.
- **Clear all High Scores** removes, only after explicit user confirmation, all recognized HigherLower score persistence capable of repopulating the app: canonical records, all recognized legacy score records (even if semantic migration mapping was unresolved), and migration metadata that could recreate scores. Confirmation states this scope.
- Automatic migration preserves unresolved/ambiguous legacy records. Confirmed Clear All does not delete unrelated browser storage or arbitrary unknown/non-score data in old namespaces.

## 12. Testing Strategy

The project has no confirmed test framework. Select a proportionate existing capability only when implementation begins and record unavailable checks honestly. Before visual fixture work, use an existing repository-supported component/test/development renderer if available. Do not assume Storybook/test framework, create production-accessible fixture routes, or add dependencies/config solely to render fixtures. If no safe browser renderer exists, stop and request approval for a narrowly scoped local-only renderer with rationale, exact files/config, production inaccessibility, and cleanup/isolation details. This does not weaken production availability or route gating. The three evidence levels below remain distinct.

### Fixture / Frontend Testing

Use isolated fixtures and controlled component inputs to validate UI and interaction without provider calls or release-policy changes:

- production-catalog projection behavior, including zero available domains/categories;
- populated domain/category selectors, Home state transitions, valid/invalid Go, and disabled PvP;
- all three gameplay entry pages using the same common server authorization function; mode, semantic category, explicit category/mode compatibility (including valid-category/valid-but-unsupported-mode), production availability, legacy/unsupported input; and provider non-dispatch for every unauthorized route;
- populated Classic and Time Attack presentation, including reveal, correct/incorrect, image fallback, game-over, timer/urgency, and restart states;
- Classic and Time Attack regression against their existing mechanics through controlled items and transitions;
- versioned High Score records; automatic migration preserving unresolved/ambiguous records; scoped clear limited to selected mode/category without deleting unrelated/ambiguous records; cancelled Clear All; confirmed Clear All removing canonical records, all recognized legacy HigherLower score records (including unresolved semantic mappings), and score-recreating metadata while preserving unrelated browser storage and arbitrary unknown/non-score legacy data; Home-launched populated/empty dialog states; and no-PvP persistence;
- loading/error/unavailable derived states, responsive narrow/wide layouts, keyboard behavior, focus, labels, and motion preferences.

Fixture success is evidence of presentation and local interaction only. Fixture data must be injected at component/test/development boundaries, stay isolated from production availability and server route gating, and never count as production-readiness evidence. If no safe existing browser renderer is available, visual fixture work stops pending narrow approval for a local-only mechanism; no production-accessible fixture route or dependency/config solely for fixtures is assumed.

### Provider Integration Testing

When a category is separately eligible for safe provider validation, test the actual server-side provider path for:

- approved metric values and unit/precision handling;
- normalization to the shared item shape;
- usable pool size, duplicate prevention, missing-value behavior, and image behavior;
- freshness/cache behavior where applicable;
- failure responses, rate/availability conditions, and safe fallback behavior.

This level validates an adapter/provider path, not public production readiness by itself. Do not run live provider calls as part of this documentation-only task.

### Production Readiness Evidence

Promotion requires category-specific evidence sufficient to satisfy every release gate in Section 15. A mocked provider, fixture, implemented adapter, successful build, or single successful API response cannot meet this level. Evidence must support that the category's metric contract, route authorization, data quality, and public catalog eligibility are safe for production visibility and can be revoked without changing semantic identity.

## 13. Accessibility Strategy

- Model selector and mode controls with native radio semantics first; expose disabled PvP as unavailable rather than silently ignoring activation. Use a native accessible dialog first for High Scores and confirmation; if browser support/testing proves it insufficient, stop and request narrow dependency approval before Radix/another primitive.
- Maintain predictable keyboard order from domain through category, mode, Go, gameplay decisions, and High Scores actions.
- Provide visible focus independent of color, adequate target sizes, meaningful category/metric copy, and text/icon status combinations for correct/incorrect states.
- Announce only meaningful gameplay changes, timer urgency, validation, migration outcomes, and destructive-action confirmation results without excessive live-region chatter.
- Use dialog focus containment, initial focus, escape support where appropriate, and focus restoration for High Scores.
- Respect reduced-motion preferences; avoid timing-dependent visual-only communication.
- Treat fixture-based accessibility checks as UI verification, not a route or provider readiness override.
- Keep keyboard focus visibly separate from selection; selected mode follows the same selected/unselected grammar as domain/category.

## 14. Responsive Strategy

- Keep Home selection and Go controls readable and reachable from narrow mobile widths through desktop layouts. Responsive behavior is implementation-derived because no mobile/tablet Figma exists; preserve target hierarchy rather than scaling desktop coordinates.
- Reflow comparison cards, status metrics, action controls, and High Scores tables/lists without requiring horizontal scrolling for core actions; `app/game/layout.tsx` owns redesigned canvas/overflow/responsive integration.
- Preserve decision-control target size and visual hierarchy at all supported widths; timer/urgency must remain legible without obscuring gameplay cards.
- Exercise populated fixture and empty production-availability layouts at representative narrow, intermediate, and wide viewport classes, subject to Section 7's existing-renderer-first stop condition and local-only approval requirement.
- Do not create device-specific catalog availability or bypass server route gating for responsive demonstrations.

## 15. Runtime Category Release Gates

Every semantic target category must pass all of the following before production Home visibility or gameplay authorization. Current disposition remains hidden/not production-playable unless later verified runtime evidence says otherwise.

1. **Stable semantic identity:** The category has a durable semantic ID, domain assignment, and target-catalog contract independent of provider naming.
2. **Approved metric contract:** Unit, comparison semantics, precision, content eligibility, and user-facing metric copy are approved for that category.
3. **Valid server-side adapter:** An approved adapter path can produce normalized data without exposing secrets or moving provider logic client-side.
4. **Runtime/provider evidence:** Actual data validates values, pool quality, duplicates, missing data, images, freshness/cache behavior as applicable, and failure handling.
5. **Server route authorization:** The route recognizes the category and rejects it before dispatch when the release policy is unavailable or invalid.
6. **Public catalog eligibility:** The category's product, legal/contract, data-quality, and UX readiness conditions support public visibility in Home.
7. **Reversible visibility:** The availability policy can hide/revoke the category without changing semantic identity, breaking stored High Scores, or requiring a frontend catalog rewrite.

## 16. Risk Register and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| A rendered fixture is mistaken for provider readiness | Premature production category visibility | Maintain explicit fixture/provider/readiness evidence levels; fixtures cannot write availability or bypass routes. |
| Fixture work assumes an unavailable renderer or leaks a fixture route | Production availability/gating compromised or scope expands | Existing repository-supported renderer first; otherwise stop for approval of a narrowly scoped local-only mechanism with rationale, file/config scope, production-inaccessibility, and cleanup/isolation plan. No assumed Storybook/test framework, production-accessible fixture route, or fixture-only dependency/config. |
| Provider identity leaks into semantic IDs | Future provider swap breaks routes, scores, or labels | Define semantic IDs first; isolate mapping and availability. |
| Unauthorized or incompatible category/mode query reaches dispatch | Hidden category/provider path exposure | All three gameplay entry pages call common routeAuthorization; validate explicit compatibility and availability before dispatcher; no entry-page bypass. |
| Empty production catalog looks like a defect | Pressure to weaken release policy | Build a deliberate empty Home state and use isolated fixtures for populated design verification. |
| Shared composition changes mode mechanics | Classic/Time Attack regression | Keep presentation props-only; retain rules, timers, and lifecycle in each mode component. |
| High Score migration loses or mislabels data | Local user history loss | Use versioning, proven mappings only, idempotence, preserve unresolved/ambiguous records during automatic migration, deterministic dedupe, and scoped writes. |
| Clear action removes unrelated records or allows recognized legacy scores to resurface | Data loss or unexpected restored scores | Scope single-leaderboard clears to mode/category. Confirmed Clear All removes canonical records, all recognized legacy score records (including unresolved semantic mappings), and score-recreating migration metadata only; preserve unrelated browser storage and arbitrary unknown/non-score legacy data. |
| Time Attack refactor leaks intervals or double-saves | Incorrect game behavior and scores | Keep lifecycle local, guard terminal state, and regression-check cleanup/write count. |
| PvP appears available | User expectation mismatch | Render disabled semantic control and reject unsupported mode server-side; do not create PvP scores. |
| Dark foundation harms accessibility at breakpoints | Usability barriers | Apply tokenized contrast/focus/motion rules and verify keyboard/reflow using populated fixtures and empty states. |

## 17. Explicitly Deferred Work

- Production promotion of currently unverified categories and unresolved provider integrations.
- Provider adapter changes, provider-contract changes, or new provider integrations unless separately approved.
- Light mode, theme preference storage, and an active theme toggle.
- PvP gameplay, multiplayer infrastructure, rooms, networking, team/turn systems, matchmaking, and PvP score persistence.
- Accounts, custom playsets, cloud leaderboards, server-side scores, or any database/authentication layer.
- Broad UI-library adoption, shadcn rollout, global state-management libraries, or unapproved dependencies.
- Country Population inclusion in the redesigned target catalog.
- Any post-implementation UI/UX skill audit or unconfigured skill workflow.

## 18. Suggested Implementation / PR Slicing

1. **PR 1 — Baseline, semantic catalog, and availability:** Phase 1 plus Phase 2. Establish stable semantics and zero-availability-safe projection without provider promotion.
2. **PR 2 — Server route boundary:** Phase 3. Add explicit mode/category validation and authorization before dispatcher access.
3. **PR 3 — Visual foundation and Home:** Phases 4 and 5. Implement dark semantic tokens and release-gated Home setup, with isolated populated fixtures.
4. **PR 4 — Shared gameplay presentation:** Phase 6. Introduce presentation-only gameplay shell/components and isolated gameplay state fixtures.
5. **PR 5 — High Score normalization:** Phase 7. Deliver browser-only versioned storage, migration, preservation, and clear APIs before mode adoption.
6. **PR 6 — Classic integration:** Phase 8. Adopt shared composition and finalized High Score API while regression-protecting Classic rules.
7. **PR 7 — Time Attack integration:** Phase 9. Adopt shared composition and finalized High Score API while regression-protecting timer lifecycle and mechanics.
8. **PR 8 — Derived states and High Scores dialog:** Phases 10 and 11. Complete safe fallback/reveal/game-over presentation and the scoped/confirmed High Scores UI.
9. **PR 9 — PvP and hardening:** Phases 12 and 13. Finish disabled PvP conversion, responsive work, and accessibility hardening.
10. **PR 10 — Readiness review and release regression:** Phases 14 and 15. Apply only evidence-backed availability changes; report frontend completion separately from category readiness.

Each PR remains within the Section 4 allowlist. `types/api.ts` is conditional only under its stated proof requirement. A file outside the allowlist requires explicit approval before modification; no PR is permitted to modify providers, dependencies, configuration, or [`design-reference/`](design-reference/) under this plan. Visual fixture work obeys Section 7's renderer stop condition; do not assume fixture tooling.

## 19. Definition of Done

### Redesign implementation complete

- [ ] All fifteen phases are implemented in the stated order and numbering, with Phase 7 High Score normalization completed before Phase 8 Classic and Phase 9 Time Attack integration.
- [ ] Semantic catalog and availability policy are separate; all eleven target semantic categories have explicit playable-mode compatibility, Country Population is outside the redesigned catalog, PvP has no compatibility, and zero production availability is supported.
- [ ] [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts) is the common server authorization function called by [`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx), [`app/game/classic/page.tsx`](app/game/classic/page.tsx), and [`app/game/time-attack/page.tsx`](app/game/time-attack/page.tsx). It validates mode, semantic category, explicit compatibility, production availability, and legacy/unsupported inputs before dispatch; unauthorized requests, including valid category + valid but incompatible mode, never call providers.
- [ ] Home ownership is correct: server [`app/page.tsx`](app/page.tsx) supplies a safe public production catalog to client [`components/home/HomeSetup.tsx`](components/home/HomeSetup.tsx), which owns transient selection, Home-launched High Scores visibility, and Go. Availability is not decided client-side; domain change clears category and preserves mode.
- [ ] [`app/layout.tsx`](app/layout.tsx) changes are limited to target font/root integration and dark-only root/document semantics (no unrelated metadata redesign); [`app/game/layout.tsx`](app/game/layout.tsx) handles redesigned canvas, overflow, and responsive integration.
- [ ] Classic mechanics and Time Attack mechanics remain unchanged; both use presentation-focused shared components without a global rules engine.
- [ ] Phase 7's centralized browser-only High Score API is the only persistence path for Classic and Time Attack. It is versioned, mode + semantic-category scoped, idempotently migrates proven records, and preserves unresolved/ambiguous records during automatic migration.
- [ ] Scoped clear removes only selected mode + semantic category and cannot delete unrelated/unresolved/ambiguous records. After explicit confirmation, Clear All removes canonical records, all recognized legacy HigherLower score records (including unresolved semantic mappings), and migration metadata that could recreate scores, but preserves unrelated browser storage and arbitrary unknown/non-score data in old namespaces; recognized legacy scores cannot resurface afterward.
- [ ] High Scores opens from Home via `HomeSetup`; supports Classic/Time Attack tabs, semantic category filtering, populated/empty states, scoped clear, confirmed clear-all behavior, and no PvP tab. Game screens may show local/best scores without separate modal launchers unless preserving existing behavior requires them.
- [ ] Derived loading, unavailable, error, image-fallback, reveal, correct/incorrect, game-over, and Time Attack urgency states are rendered safely and accessibly.
- [ ] Dark-only semantic styling, responsive layouts, keyboard navigation, focus management, reduced-motion handling, and accessible labels/status communication are covered by applicable frontend checks.
- [ ] Isolated development/test fixtures cover populated Home, gameplay, High Scores, and derived states—including selectors, both modes, reveal, correct/incorrect, image fallback, game-over, records, empty states, and responsive layouts—without changing production availability, bypassing server-side route gating, or claiming provider readiness. Before visual fixture work, use an existing supported renderer; if unavailable, stop for narrow approval of a local-only renderer covering why, files/config, production inaccessibility, and cleanup/isolation. No assumed Storybook/test framework, production-accessible fixture route, or fixture-only dependency/config.
- [ ] Design authority and phase links are followed: locked product decisions govern behavior; `design-reference/` is authoritative visual evidence and read-only; existing code governs mechanics; runtime evidence governs category readiness. Relevant README/inventory/component-map/responsiveness/open-questions/color/type/layout notes, component/state exports, and Home/Classic/Time Attack screenshots are inspected before visual implementation; phase-specific references in Section 2 are used and Phase 15 compares final visuals against target screenshots. Target typography is preserved; raw Figma CSS/coordinates are never copied. Responsive behavior is implementation-derived and hierarchy-preserving, with no mobile/tablet Figma assumed.
- [ ] Selected mode follows the selected/unselected grammar; keyboard focus remains separate from selection; only primary gameplay back-button variant is used; Variant2 remains unused; old Co-op/team-score/turn-pass evidence is not PvP authority; unspecified states preserve functionality in redesign language.
- [ ] Native radio semantics and native accessible dialogs are used first; if browser support/testing proves native behavior insufficient, stop for narrow dependency approval before Radix/another primitive. No broad shadcn/UI system, global state, or new dependencies are approved.
- [ ] `types/api.ts` remains unchanged unless implementation proves normalized `GameItem` cannot represent an approved provider-neutral gameplay requirement; catalog-owned semantic/display metadata is preferred.
- [ ] No UI/UX skill audit requirement, unconfigured skill workflow, broad UI library, global state library, unapproved dependency, provider promotion without evidence, provider adapter change, configuration change, or [`design-reference/`](design-reference/) change has been introduced by this redesign plan.

### Category production-ready

- [ ] The category independently passes every runtime release gate in Section 15 with category-specific evidence.
- [ ] Provider integration evidence validates its approved metric contract, normalized data quality, usable pool, images, missing/duplicate handling, freshness/cache behavior where relevant, and failure behavior.
- [ ] The server authorization policy is updated only after evidence supports public catalog eligibility and can revoke visibility without semantic-ID or High Score breakage.
- [ ] Production Home visibility is enabled only for that proven category; the redesign being complete, a fixture rendering successfully, an adapter existing, a build passing, or one provider response succeeding is not sufficient.

The redesign may be implementation-complete while some or all provider-backed categories remain hidden. No target category becomes production-visible merely because the frontend redesign is finished.
