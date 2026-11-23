# Dev Deployment Runtime Verification — 2026-11-07

Read-only runtime verification and post-hoc source trace of the HigherLower dev deployment.
Task type: **read-only verification + failure diagnosis** (documentation only).

| Field | Value |
|---|---|
| Deployment under test | `https://higher-lower-dev.vercel.app/` |
| Evidence window | 2026-11-07T07:50Z (HTTP probes and source reads) |
| Report authored | 2026-11-07T08:02Z |
| Verification mode | HTTP GET header/body inspection + read-only source trace |
| Code changes made | None |
| Config changes made | None |
| Provider calls made by this task | None |
| Regeneration / redeploy performed | None |

Status vocabularies used in this report:

- Runtime category matrix: `PASS` / `FAIL` / `BLOCKED` / `NOT VERIFIED`.
- Verification items: `[Pass]` / `[Partial]` / `[Fail]` / `[Blocked]` / `[Not tested]`.

Capability discovery for this session:

| Capability | Status | Note |
|---|---|---|
| HTTP GET (headers + body) | Available | Used for all runtime observations |
| `git` | Available | Read-only use only |
| Playwright / browser | `[Blocked]` | Browser binary not installed (`chrome-for-testing` absent at the expected `ms-playwright` path). Installing it would mutate local state, so it was not installed. |
| Vercel CLI (`vercel`) | `[Blocked]` | Command not recognized |
| GitHub CLI (`gh`) | `[Blocked]` | Command not recognized |
| Vercel dashboard / function logs / API | `[Blocked]` | No surface reachable with available tooling |

---

## 1. Deployment identity

| Attribute | Observation | Status |
|---|---|---|
| URL | `https://higher-lower-dev.vercel.app/` | Confirmed |
| Homepage response | `200 OK`, no redirect | Confirmed |
| Hosting headers | `Server: Vercel`, `X-Vercel-Id`, `X-Vercel-Cache`, `X-Nextjs-Prerender: 1`, `X-Nextjs-Stale-Time: 300` | Confirmed |
| Homepage cache state | `X-Vercel-Cache: HIT`, `Age: 3618` | Confirmed |
| Category route cache state | `X-Vercel-Cache: MISS`, `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` (dynamic render) | Confirmed |
| Branch | **Not verifiable** | No deployment-metadata header and no build-info surface exposed |
| Commit SHA | **Not verifiable** | Same reason |
| Deployment status (Ready / Error) | **Not verifiable** | No dashboard or API access |
| Deployment timestamp | **Not verifiable** | `Age` reflects edge cache age only, not build time |
| Preview vs Production vs custom domain | **Not verifiable** | See note below |
| Environment scope drawn from | **Not verifiable** | Env settings were not reachable |

**Preview vs Production — weak circumstantial signals only:**

- The hostname is environment-suffixed (`-dev`) rather than following the deployment hash pattern typical of preview URLs.
- No `x-robots-tag: noindex` header was present on the responses.

Neither signal is conclusive. The deployment target is recorded as `Needs Verification [environment-specific]`.

**Whether this deployment predates recent environment-variable configuration:** `Not verifiable`. No build metadata, no `X-Vercel-Id`-to-commit mapping surface, and no function logs were available.

**Local repository context (explicitly not proof of deployment provenance):** branch `lj-branch`, HEAD `dca86fa`, 2026-11-03. This is local-only context and must not be read as the deployed revision.

---

## 2. Baseline application inspection

| Check | Observation | Status |
|---|---|---|
| Homepage renders non-blank | Prerendered HTML contains visible product copy | `PASS` |
| Aggregate copy | `4 domains, 11 categories, free` | `PASS` |
| Domain counts | `Movies & Series — 3`, `Gaming — 3`, `Music — 3`, `Social Media — 2` | `PASS` |
| Mode selector | `Classic`, `Time Attack`, `PvP — Coming Soon` presented | `PASS` |
| High Scores surface | Dialog markup present in the served document | `PASS` |
| `/game/classic` with no `?category=` | `307` redirect to `/` | `PASS` (matches [`app/game/classic/page.tsx`](app/game/classic/page.tsx:17)) |
| `?category=movie-ratings` (legacy provider id) | `404` | `PASS` (matches [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts:38) and [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts:74)) |
| Browser console errors | `[Blocked]` — no browser available | `BLOCKED` |
| Client network panel / failed client requests | `[Blocked]` — no browser available | `BLOCKED` |
| Error overlay | `[Blocked]` — no browser available | `BLOCKED` |

Source-level note supporting the `BLOCKED` console/network items: a search for `fetch(` / `axios` / `XMLHttpRequest` across `components/*.tsx` returned **0 results**. The category pool is fetched during the server render ([`app/game/classic/page.tsx`](app/game/classic/page.tsx:33)), so there is no `/api/...` XHR on the client that could fail. This is source-only reasoning (`[inferred-from-codebase]`), not a runtime observation.

**Baseline verdict:** `[Pass]` for shell, navigation, route authorization behaviour, and prerendered landing content. `[Blocked]` for all browser-level diagnostics.

---

## 3. Production-playable category status

One attempt per category, Classic mode, observed in the server-rendered response body (2026-11-07 ≈ 07:50Z).

| Category | Reachable | Initial data load | Game renders | Result |
|---|---|---|---|---|
| Movie/Series Rating (`movie-series-rating`) | Yes, 200 | Deck loaded — `The Matrix 8.3 / 10` | Yes | `PASS` |
| Release Date (`release-date`) | Yes, 200 | Deck loaded — `The Godfather 1972-03-14` | Yes | `PASS` |
| Gross Revenue (`gross-revenue`) | Yes, 200 | Deck loaded — `The Crow $93,722,164` | Yes | `PASS` |
| Game Rating (`game-rating`) | Yes, 200 | Deck loaded — `Battlefield V 71% positive` | Yes | `PASS` |
| Peak Concurrent Players (`player-count`) | Yes, 200 | Deck loaded — `War Robots: Frontiers 256 peak players` | Yes | `PASS` |
| Game Release Date (`game-release-date`) | Yes, 200 | No deck — error state | No | `FAIL` |
| Number of Albums (`number-of-albums`) | Yes, 200 | Deck loaded — `Die Fantastischen Vier 39 albums` + Commons credit | Yes | `PASS` |
| Album Release Date (`album-release-date`) | Yes, 200 | Deck loaded — `The Day Hell Broke Loose 1999-08-24` | Yes | `PASS` |
| Monthly Listeners (`monthly-listeners`) | Yes, 200 | Deck loaded — `The E Street Band 25,074 monthly listeners` | Yes | `PASS` |
| YouTube Subscribers (`youtube-subscribers`) | Yes, 200 | No deck — error state | No | `FAIL` |
| Twitch Followers (`twitch-followers`) | Yes, 200 | Deck loaded — `japabigodin 16,136 followers` | Yes | `PASS` |

Aggregate: **9 of 11 pass, 2 of 11 fail.**

Supporting observations:

| Observation | Value |
|---|---|
| Body size, passing decks | 34 KB – 509 KB |
| Body size, both failures | ≈ 12.9 KB (bare error shell, no deck markup) |
| `time-attack` sampling | `player-count` → `PASS`; both failing categories → identical failure |
| `time-attack` on the other 9 categories | `[Not tested]` |

All 11 categories are authorized and dispatchable in source: every entry carries `productionPlayable: true` in [`lib/catalog/availability.ts`](lib/catalog/availability.ts:121) — including [`game-release-date`](lib/catalog/availability.ts:170) and [`youtube-subscribers`](lib/catalog/availability.ts:233) — and all 11 appear in `SEMANTIC_PROVIDER_MAPPING` ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:393)) and in the dispatcher map ([`lib/api/index.ts`](lib/api/index.ts:41)). Route authorization therefore is **not** a candidate cause for either failure.

Note on the `status` field: `game-release-date` and `youtube-subscribers` both carry `status: "blocked"` alongside `productionPlayable: true` ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:171), [`lib/catalog/availability.ts`](lib/catalog/availability.ts:234)). Authorization reads `productionPlayable` only ([`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts:90)), never `status`, so the labels do not affect dispatch. The status/productionPlayable divergence is recorded, not resolved, here.

---

## 4. YouTube Subscribers trace

Path: UI → route authorization → dispatcher → adapter → environment → provider → response handling → game state.

| Step | Source location | Behaviour |
|---|---|---|
| UI | `?category=youtube-subscribers` on `/game/classic` | Category card exists on Home; route reachable (200) |
| Route authorization | [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts:74) → [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts:90) → [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts:102) | Not legacy id, category found, `productionPlayable: true`, mapping `youtube-subscribers → youtube-subscribers` ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:411)) → `authorized` |
| Server route / component | [`app/game/classic/page.tsx`](app/game/classic/page.tsx:33) | `fetchGameItems(...)` called inside a bare `try` |
| Dispatcher | [`lib/api/index.ts`](lib/api/index.ts:57) | `"youtube-subscribers": fetchYouTubeSubscribers`; also enforces `< 2` items as a thrown `Error` ([`lib/api/index.ts`](lib/api/index.ts:115)) |
| Adapter step 1 — catalog | [`lib/api/youtube.ts`](lib/api/youtube.ts:65) → [`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:48) | Synchronous `readFileSync` + full structural validation, **before** the credential check |
| Adapter step 2 — env gate | [`lib/api/youtube.ts`](lib/api/youtube.ts:66) | `process.env.YOUTUBE_API_KEY` read; if falsy → `ApiFetchError("YouTube", null, "YOUTUBE_API_KEY is not set…")` ([`lib/api/youtube.ts`](lib/api/youtube.ts:68)) |
| Adapter step 3 — provider call | [`lib/api/youtube.ts`](lib/api/youtube.ts:91) | `GET https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=…&key=<redacted>`, `ID_BATCH_SIZE = 50` ([`lib/api/youtube.ts`](lib/api/youtube.ts:56)), `revalidate` 6 h ([`lib/api/youtube.ts`](lib/api/youtube.ts:58)) |
| Adapter step 4 — response handling | [`lib/api/youtube.ts`](lib/api/youtube.ts:96) | Non-OK → `ApiFetchError("YouTube", res.status, "HTTP <status>: <statusText>")`; Google's JSON error body (`keyInvalid`, `quotaExceeded`, `accessNotConfigured`) is **never parsed**, so the reason is discarded |
| Adapter step 5 — JSON | [`lib/api/youtube.ts`](lib/api/youtube.ts:107) | Malformed JSON → `ApiFetchError` |
| Adapter step 6 — normalization | [`lib/api/youtube.ts`](lib/api/youtube.ts:111) | Silently skips hidden subscriber counts, non-integer counts, missing titles, missing https thumbnails |
| Adapter step 7 — floor | [`lib/api/youtube.ts`](lib/api/youtube.ts:150) | Fewer than `MIN_YOUTUBE_CATALOG_ITEMS` (50) usable channels → `ApiFetchError` |
| Failure handling | [`app/game/classic/page.tsx`](app/game/classic/page.tsx:34) | Bare `catch {}` — error class, `source`, `statusCode`, and provider message are all discarded; returns `<DerivedGameState kind="error" />` |
| Rendering | [`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx:37) | `error` copy: `Unable to load this comparison` / `The comparison could not be prepared. Return to setup and try another category.` + `Back to setup` link |
| Game state | — | No deck; no game instance created |

### Confirmed Evidence

1. **Authorization and mapping are functional.** `youtube-subscribers` is `productionPlayable: true` ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:235)) and mapped ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:411)); the route returned `200` with rendered content, not `404`/`307`.
2. **An exception escaped `fetchGameItems`.** The rendered copy is byte-for-byte the `kind="error"` copy at [`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx:37), which is distinct from `empty` — `Not enough comparison items` ([`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx:24)) — and from `unavailable` — `Category unavailable` ([`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx:28)). Only the `catch` branch at [`app/game/classic/page.tsx`](app/game/classic/page.tsx:34) produces that copy, so neither an authorization failure nor a `< 2` items `empty` result is possible.
3. **The catalog file is present and valid on disk.** `lib/api/data/youtube-channel-catalog.json` declares `version: 1`, `generatedAt: 2026-10-14T15:27:23.149Z`, and top-level keys exactly `version, generatedAt, source, items` — satisfying the key allowlist and version check ([`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:51), [`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:59)). Entry count is **≈263** (derived from uniform 4-line blocks in a 1060-line file; the count is `Needs Verification [inferred-from-codebase]`). That is above the 50-item floor ([`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:28), [`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:130)).
4. **No client-side request exists to fail.** Zero `fetch(` / `axios` / `XMLHttpRequest` occurrences in `components/*.tsx`; the pool is server-fetched.
5. **Latency samples and batch arithmetic recorded.** Observed `602 / 303 / 307 ms`. With ≈263 ids and `ID_BATCH_SIZE = 50`, a successful dispatch would require `ceil(263/50) = 6` sequential Google requests. Passing comparators measured `584 / 570 / 369 ms` (`movie-series-rating`) and `595 / 376 / 423 ms` (`number-of-albums`). These are the measurements only; the inference drawn from them is stated under Interpretation.
6. **No resilience mechanism could mask a slow provider.** The adapter implements no timeout, no retry, and no fallback ([`lib/api/youtube.ts`](lib/api/youtube.ts:80) onward).
7. **HTTP status of the failure is 200, never 5xx.** The exception is caught and rendered inside the server component, so no error status propagates.
8. **Provider-side HTTP status and error body are not observable** — no logs and no browser network panel.

### Interpretation

- The earliest layer that can produce this exact symptom is the **adapter, before any successful provider response**: either the credential gate at [`lib/api/youtube.ts`](lib/api/youtube.ts:66) throwing, or a first-batch rejection at [`lib/api/youtube.ts`](lib/api/youtube.ts:96) (invalid/restricted key, API not enabled, or quota exhausted).
- Because the catalog read precedes the credential gate and the catalog validates successfully, a catalog-side `ApiFetchError` is not supported by the evidence available — but it also cannot be fully excluded without the swallowed `err.source`.
- A normalization-floor failure (< 50 usable channels across all batches) would require all six batches to complete, which does not fit the ~300 ms observations.
- **Latency inference (inferential, not a confirmation):** the ~300 ms samples are not consistent with six sequential provider round-trips plus normalization, so a full multi-batch pipeline is excluded; equally, timing is **not** a discriminator between pass and fail on its own, because the passing comparators (`584 / 570 / 369 ms`, `595 / 376 / 423 ms`) overlap the failing range. The samples themselves are recorded under Confirmed Evidence.
- Most probable explanation: `YOUTUBE_API_KEY` absent from the deployed environment scope. Second candidate: a present-but-rejected key (restriction, disabled API, or quota). Source alone cannot distinguish the two, because the adapter discards `res.status` on the page and Google's error reason twice over.

---

## 5. Game Release Date / IGDB trace

Path: UI → route authorization → dispatcher → IGDB adapter → Twitch credentials → OAuth → IGDB → validation → rendering.

| Step | Source location | Behaviour |
|---|---|---|
| UI | `?category=game-release-date` on `/game/classic` | Category card exists on Home; route reachable (200) |
| Route authorization | [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts:90) → [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts:102) | `productionPlayable: true` ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:172)); mapping `game-release-date → game-release-dates` ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:413)) → `authorized` |
| Dispatcher | [`lib/api/index.ts`](lib/api/index.ts:58) | `"game-release-dates": fetchGameReleaseDates`; no other category shares this adapter |
| Adapter entry — env gate | [`lib/api/igdb.ts`](lib/api/igdb.ts:115) | `process.env.TWITCH_CLIENT_ID` read as the **first statement** of `fetchGameReleaseDates`; if absent → `ApiFetchError("IGDB", null, "TWITCH_CLIENT_ID is not set…")` before any token call, even when a token is cached |
| Twitch credentials (token path) | [`lib/api/igdb.ts`](lib/api/igdb.ts:70) | `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`; either missing on a token miss → `ApiFetchError` ([`lib/api/igdb.ts`](lib/api/igdb.ts:72)) |
| OAuth | [`lib/api/igdb.ts`](lib/api/igdb.ts:80) | `POST https://id.twitch.tv/oauth2/token?client_id=…&client_secret=<redacted>&grant_type=client_credentials`, `cache: "no-store"` ([`lib/api/igdb.ts`](lib/api/igdb.ts:84)); non-OK → `ApiFetchError("IGDB", res.status, "Token request failed: HTTP …")` ([`lib/api/igdb.ts`](lib/api/igdb.ts:85)); response body not read |
| Token cache | [`lib/api/igdb.ts`](lib/api/igdb.ts:62) | Module-scope cache, expiry minus `TOKEN_EXPIRY_SKEW_S = 3600` s ([`lib/api/igdb.ts`](lib/api/igdb.ts:58), [`lib/api/igdb.ts`](lib/api/igdb.ts:94)) |
| IGDB query | [`lib/api/igdb.ts`](lib/api/igdb.ts:135) | `POST https://api.igdb.com/v4/games`, headers `Client-ID`, `Authorization: Bearer <token>` (value never printed), `Content-Type: text/plain`; body `fields name,first_release_date,cover.url; where cover != null & first_release_date != null; sort total_rating_count desc; limit 200;`; `revalidate` 7 d |
| Response handling | [`lib/api/igdb.ts`](lib/api/igdb.ts:146) | Non-OK → `ApiFetchError("IGDB", res.status, "HTTP …")`; `res.json()` at [`lib/api/igdb.ts`](lib/api/igdb.ts:154) is **not** wrapped in try/catch |
| Validation | [`lib/api/igdb.ts`](lib/api/igdb.ts:156) | Filters games lacking numeric `first_release_date`, `cover.url`, or `name`; formats `YYYY-MM-DD`. No in-adapter minimum-item floor; no timeout/retry/fallback |
| Failure handling | [`app/game/classic/page.tsx`](app/game/classic/page.tsx:34) | Bare `catch {}` — identical to the YouTube path; `source`/`statusCode` discarded |
| Rendering | [`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx:37) | Same generic `error` copy |
| Game state | — | No deck |

### Confirmed Evidence

1. **Authorization and mapping are functional.** `game-release-date` is `productionPlayable: true` ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:172)) and mapped to `game-release-dates` ([`lib/catalog/availability.ts`](lib/catalog/availability.ts:413)); route returned `200`, not `404`/`307`.
2. **The failure shell is byte-identical to the YouTube failure** — same visible text, same ≈12.9 KB body. No structural distinction exists between the two failures in the UI.
3. **An exception escaped `fetchGameItems`** by the same copy-discrimination argument as §4 (error copy ≠ `empty` ≠ `unavailable`).
4. **No OAuth-shaped latency.** Samples `324 / 310 / 327 ms`, against passing comparators of `584 / 570 / 369 ms` and `595 / 376 / 423 ms`. A successful run would require a token request (on cache miss) plus a `limit 200` games query.
5. **The env gate is the first statement of the call** ([`lib/api/igdb.ts`](lib/api/igdb.ts:115)), so an absent `TWITCH_CLIENT_ID` reproduces this symptom with zero network activity — consistent with the observed sub-350 ms responses.
6. **An IGDB-side rejection requires more work than a gate failure.** Reaching an IGDB `4xx` requires a successful OAuth exchange ([`lib/api/igdb.ts`](lib/api/igdb.ts:80)) plus the games query ([`lib/api/igdb.ts`](lib/api/igdb.ts:135)) — at least two sequential provider round-trips. Whether that is compatible with the observed latency is an inference, stated under Interpretation.
7. **No resilience mechanism exists.** No timeout, no retry, no fallback in the adapter.
8. **HTTP status of the failure is 200, never 5xx** — the exception is caught and rendered.
9. **Provider-side HTTP status and error body are not observable.**

### Interpretation

- The earliest supported failing layer is the **adapter's Twitch credential gate or its OAuth token request** in [`lib/api/igdb.ts`](lib/api/igdb.ts:114).
- Authorization, dispatcher mapping, and provider-id resolution are positively excluded by evidence (items 1–3).
- Most probable explanation: `TWITCH_CLIENT_ID` (and/or `TWITCH_CLIENT_SECRET`) absent from the deployed environment scope, since that path throws before any network call and fits the observed latency. A present-but-invalid credential pair is the second candidate and would surface as a non-OK token response whose status is discarded by the page.
- **Latency inference (inferential, not a confirmation):** an IGDB-side rejection does not fit the observed ~300 ms, because it would require the token exchange plus the games query to complete first. This is latency-based reasoning, not an observation; the samples themselves are recorded under Confirmed Evidence.
- Distinguishing "missing" from "rejected" is impossible from the available evidence: the only runtime artefact is a generic error shell.

---

## 6. TMDB comparison

Which env-var pattern the deployment exhibits:

| Evidence | Observation |
|---|---|
| Categories driven by TMDB | `movie-series-rating`, `release-date`, `gross-revenue` — all `PASS` with real provider values (`The Matrix 8.3 / 10`, `The Godfather 1972-03-14`, `The Crow $93,722,164`) |
| Implication | A keyed server-side provider is **working** in this deployment. Server-side env-var injection into the Vercel runtime is therefore functional, not globally broken. |
| Env var involved | `TMDB_API_KEY` — presence inferred from runtime behaviour only, value never read or printed |

This is the key control result: it proves the failure mode is **per-variable**, not a systemic "server env vars do not reach the function" problem. Two *other* keyed providers (YouTube, IGDB/Twitch) fail while TMDB succeeds, which points at the specific credentials for those providers rather than at the runtime's env plumbing.

Residual limitation: TMDB success proves *at least one* keyed env var is present and valid. It says nothing about whether `YOUTUBE_API_KEY`, `TWITCH_CLIENT_ID`, or `TWITCH_CLIENT_SECRET` are configured.

**Cache caveat (the same limitation recorded for SteamSpy in §7):** whether these three TMDB categories were served from a fresh upstream call or from the Next data cache is not determinable without logs; the adapters declare `next: { revalidate }`, so an internal data-cache hit cannot be excluded, and the "egress works" half of this control is correspondingly weakened. The per-variable conclusion is **not** overturned: cached or not, the TMDB-backed categories return real values, whereas the two non-TMDB keyed categories fail at credential-shaped layers that precede any provider request (§4, §5) — a data-cache hit cannot explain that asymmetry.

---

## 7. Keyless providers (SteamSpy) — control result

| Category | Provider | Result |
|---|---|---|
| `game-rating` | SteamSpy review score (keyless) | `PASS` — `Battlefield V 71% positive` |
| `player-count` | SteamSpy ccu (keyless) | `PASS` — `War Robots: Frontiers 256 peak players` |

Control conclusion: the request-time **outbound network path from the deployed function to a third-party HTTPS API works**. Combined with §6, the failure boundary is narrowed to credential handling in the two failing adapters, not to egress, DNS, TLS, or the server-render pipeline.

`Needs Verification`: whether these two categories were served from a warm/edge cache rather than a fresh upstream call is not determinable without logs. `[inferred-from-codebase]` The category routes returned `X-Vercel-Cache: MISS` with `Cache-Control: private, no-cache, no-store`, which indicates dynamic rendering, but the adapters themselves declare `next: { revalidate }` so an internal data-cache hit remains possible.

---

## 8. Local snapshot categories

Four categories are served from local JSON snapshots rather than request-time provider crawls. All four `PASS` at runtime (§3).

### 8.1 Packaging and read path

| Aspect | Evidence |
|---|---|
| Read mechanism | All four readers use `readFileSync(join(process.cwd(), "lib/api/data/…"))` — e.g. [`lib/api/monthlyListenersSnapshot.ts`](lib/api/monthlyListenersSnapshot.ts:134), [`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:30) |
| Bundling config | [`next.config.ts`](next.config.ts:3) declares **no** `outputFileTracingIncludes`; the config contains only `images` settings |
| Observed result | Four sibling JSON reads demonstrably succeed on the deployment (§3), so the `cwd()`-relative read pattern is **inferred** to work for the YouTube catalog too. Status: `Needs Verification [environment-specific]` — the YouTube catalog read is inferred, not confirmed. |

### 8.2 Validation and freshness rules

| Reader | Validation | Freshness rule |
|---|---|---|
| [`lib/api/monthlyListenersSnapshot.ts`](lib/api/monthlyListenersSnapshot.ts:21) | Schema, item shape, unique ids, `displayValue` must equal `${value} monthly listeners`, key allowlist, ≥ 2 items ([`lib/api/monthlyListenersSnapshot.ts`](lib/api/monthlyListenersSnapshot.ts:103)) | Warn at 7 d ([`lib/api/monthlyListenersSnapshot.ts`](lib/api/monthlyListenersSnapshot.ts:8)), hard-fail at 14 d ([`lib/api/monthlyListenersSnapshot.ts`](lib/api/monthlyListenersSnapshot.ts:9)); also rejects future timestamps and `collectedAt > generatedAt` ([`lib/api/monthlyListenersSnapshot.ts`](lib/api/monthlyListenersSnapshot.ts:42)) |
| [`lib/api/twitchFollowersSnapshot.ts`](lib/api/twitchFollowersSnapshot.ts:82) | Metrika record + roster schema, login pattern, `id === twitch:<login>`, uniqueness, integer counts, key allowlists | Hard-fail at 14 d on `generatedAt` only ([`lib/api/twitchFollowersSnapshot.ts`](lib/api/twitchFollowersSnapshot.ts:89)) |
| [`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:40) | Schema, MBID pattern, ≥ 2 items ([`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:59)) | **No age rule** |
| [`lib/api/albumReleaseDateSnapshot.ts`](lib/api/albumReleaseDateSnapshot.ts:39) | Schema, ≥ 2 items ([`lib/api/albumReleaseDateSnapshot.ts`](lib/api/albumReleaseDateSnapshot.ts:58)) | **No age rule** |
| [`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:48) | Strict key allowlist, `version === 1`, `channelId` regex `^UC[A-Za-z0-9_-]{22}$` ([`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:31)), duplicate + ascending-order checks ([`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:107), [`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:114)), ≥ 50 items ([`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:130)) | **No age rule** — `generatedAt` is only checked for parseability ([`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:67)) |

Recorded asymmetries (observations only, not defects to fix here):

- The Monthly Listeners 7-day warning only calls `console.warn` and still serves the snapshot ([`lib/api/monthlyListenersSnapshot.ts`](lib/api/monthlyListenersSnapshot.ts:149)).
- The Twitch reader validates only `generatedAt` age and not `collectedAt` age ([`lib/api/twitchFollowersSnapshot.ts`](lib/api/twitchFollowersSnapshot.ts:89)).
- The Twitch reader has no minimum item count; an empty roster/metrics join falls through to the dispatcher's `< 2` throw ([`lib/api/index.ts`](lib/api/index.ts:115)).

**Configured limits — age only, no item-count cap** (stated explicitly to close the checklist ambiguity):

- **Monthly Listeners:** the only configured thresholds are ages — a 7-day warning (`MONTHLY_LISTENERS_WARNING_AGE_MS`, [`lib/api/monthlyListenersSnapshot.ts`](lib/api/monthlyListenersSnapshot.ts:8)) and a 14-day hard fail (`MONTHLY_LISTENERS_MAX_AGE_MS`, [`lib/api/monthlyListenersSnapshot.ts`](lib/api/monthlyListenersSnapshot.ts:9)). There is **no item-count cap**; the reader's only count rule is a ≥ 2-item minimum ([`lib/api/monthlyListenersSnapshot.ts`](lib/api/monthlyListenersSnapshot.ts:103)).
- **Twitch Followers:** the only configured threshold is the 14-day `MAX_AGE_MS` age ([`lib/api/twitchFollowersSnapshot.ts`](lib/api/twitchFollowersSnapshot.ts:9)), applied to `generatedAt` only ([`lib/api/twitchFollowersSnapshot.ts`](lib/api/twitchFollowersSnapshot.ts:89)). There is **no item-count cap** and no in-reader minimum; a short or empty roster/metrics join is caught only by the dispatcher's `< 2` throw ([`lib/api/index.ts`](lib/api/index.ts:115)).

**Present-but-malformed files — the parsing step.** For the snapshot readers, a present file whose text fails `JSON.parse` does **not** surface as a raw `SyntaxError`: the parse is wrapped and re-thrown as an `ApiFetchError` carrying the reader's own `source` and a `null` status code — [`lib/api/monthlyListenersSnapshot.ts`](lib/api/monthlyListenersSnapshot.ts:139), [`lib/api/twitchFollowersSnapshot.ts`](lib/api/twitchFollowersSnapshot.ts:167) (file read and parse share one `try`; `fail()` at [`lib/api/twitchFollowersSnapshot.ts`](lib/api/twitchFollowersSnapshot.ts:74) throws the `ApiFetchError`), [`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:243), [`lib/api/albumReleaseDateSnapshot.ts`](lib/api/albumReleaseDateSnapshot.ts:210), and [`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:162). Schema-validation failure on a successfully parsed file likewise throws `ApiFetchError` rather than a plain `Error` — e.g. [`lib/api/monthlyListenersSnapshot.ts`](lib/api/monthlyListenersSnapshot.ts:25), [`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:52), [`lib/api/artistAlbumCountsSnapshot.ts`](lib/api/artistAlbumCountsSnapshot.ts:114). **All five readers listed in §8.2 wrap the parse**, so this behaviour is uniform; the non-wrapping response parse recorded in this report is the IGDB adapter's `res.json()` (§5), which is a provider adapter, not a snapshot reader.

### 8.3 Freshness arithmetic (as of 2026-11-07T07:50Z)

| Artifact | Freshness rule | `generatedAt` | Age now | Stale now? | Becomes stale |
|---|---|---|---|---|---|
| `lib/api/data/monthly-listeners.snapshot.json` | warn 7 d, hard 14 d (fail-closed throw) | `2026-11-02T12:36:10.145Z` (collectedAt `2026-11-02T00:00:38Z`) | ≈ 4.80 d | No (warning not yet reached) | ≈ `2026-11-16T00:00:38Z` (earliest bound: `collectedAt` + 14 d) |
| `lib/api/data/twitch-followers-metrika.snapshot.json` | hard 14 d (fail-closed throw) | `2026-11-02T14:30:09.871Z` | ≈ 4.72 d | No | `2026-11-16T14:30:09.871Z` |
| `lib/api/data/artist-album-counts.snapshot.json` | **no age rule** | `2026-10-14T18:36:49.393Z` | ≈ 23.6 d | N/A | N/A |
| `lib/api/data/album-release-date.snapshot.json` | **no age rule** | `2026-10-15T04:14:58.452Z` | ≈ 23.2 d | N/A | N/A |

Related, not age-gated: `lib/api/data/youtube-channel-catalog.json` `generatedAt: 2026-10-14T15:27:23.149Z` → ≈ 23.7 d old with **no** freshness rule in its reader.

Snapshot verdict: `[Pass]` for all four snapshot-served categories at runtime; all four are within any applicable bound. Item counts inside the JSON files were **deliberately not parsed**, so all in-file item counts remain `Needs Verification [inferred-from-codebase]`. Scheduled staleness is a dated risk, not a current failure: Monthly Listeners and Twitch Followers become hard-stale on ≈ 2026-11-16 unless regenerated.

---

## 9. Vercel environment scope (presence only)

Values were never read, printed, or inferred beyond the stated basis. Vercel env settings were not reachable with the available tooling.

| Variable | Production | Preview | Development | Used by tested deployment |
|---|---|---|---|---|
| `TMDB_API_KEY` | Not verifiable | Not verifiable | Not verifiable | **Present (inferred from runtime)** — three TMDB categories returned real values |
| `YOUTUBE_API_KEY` | Not verifiable | Not verifiable | Not verifiable | **Not verifiable** |
| `TWITCH_CLIENT_ID` | Not verifiable | Not verifiable | Not verifiable | **Not verifiable** |
| `TWITCH_CLIENT_SECRET` | Not verifiable | Not verifiable | Not verifiable | **Not verifiable** |

"Not verifiable" for scope columns means: the per-scope matrix cannot be inspected without dashboard or API access. It does not mean "absent".

---

## 10. Runtime logs

Status: `[Blocked]`.

| Aspect | Status |
|---|---|
| Vercel CLI | `[Blocked]` — `vercel` not recognized |
| GitHub CLI | `[Blocked]` — `gh` not recognized |
| Dashboard / log drain / function-log reader | `[Blocked]` — no accessible surface |
| Function log lines obtained | **None** |
| Provider HTTP status for either failure | **Unavailable** — follows directly from the absence of logs |
| Log settings changed | No |
| Log lines fabricated | None |

Sanitization rule (stated, not exercised): had logs been available, only non-sensitive fields — timestamp, route, adapter `source`, `statusCode`, and error message class — would have been quoted; `Authorization` headers, tokens, query-string `key=` values, cookies, and credential values would have been redacted.

Consequence: the swallow at [`app/game/classic/page.tsx`](app/game/classic/page.tsx:34) is currently the **only** place where `err.source` / `err.statusCode` would have been recorded, and it discards them. With no log surface and no error propagation, the failing layer is reconstructable only from source plus latency reasoning.

---

## 11. `/api/test-fetch` — source and configuration analysis

Analysis is **from source only**. The endpoint was **not invoked** (read-only constraint; a live call would consume keyed-provider quota).

| Property | Finding | Label |
|---|---|---|
| Exported handlers | `GET` and `POST` ([`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:39)) | Confirmed from source |
| `GET ?category=` gating | **No** production gate on the plain path; it calls `fetchGameItems(category)` directly ([`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:90)) | Confirmed from source |
| Quota consequence | The route **can** consume keyed-provider quota from a production deployment: TMDB detail batches, 6 Google batches for `youtube-subscribers`, and IGDB via Twitch OAuth | Confirmed from source (quota impact) / `Needs Verification [environment-specific]` (actual deployed quota state) |
| `?full=1` | Returns `404` with `"?full=1 is dev-only and is disabled in production"` when `process.env.NODE_ENV === "production"` ([`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:71)) | Confirmed from source |
| `POST` | Returns `404` in production (`"Discovery is dev-only"`) | Confirmed from source |
| Missing `?category=` | `400` with a `validValues` list ([`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:44), [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:48)) | Confirmed from source |
| Unknown category | `400` | Confirmed from source |
| Error surface | `ApiFetchError` → `502` with `{ error, source, statusCode }` ([`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:99)) | Confirmed from source |
| `validValues` completeness | The advertised list is a **subset** of the dispatcher map: 9 of 12 entries. It omits `country-populations`, `monthly-listeners`, and `twitch-followers` | Confirmed from source |

The under-advertised `validValues` list is recorded as an observation only. It is under-reported, not incorrect, and no fix is prescribed here.

**Why this matters for the diagnosis:** `GET /api/test-fetch?category=<failing-id>` is production-reachable and would return the swallowed `source` and `statusCode`. It is therefore the shortest path to the missing-vs-rejected distinction — and it was **not called**, per the read-only constraint. See §15.

---

## 12. Failure-layer classification

Earliest supported failing layer per failing category, using precise layer names.

### 12.1 YouTube Subscribers

| Layer | Status | Basis |
|---|---|---|
| browser/client | Not reached by failure | No client fetch exists (0 `fetch(`/`axios` in `components/*.tsx`) |
| route authorization | Excluded | `productionPlayable: true` + mapping present; route returned `200` deck-shell, not `404`/`307` |
| server route/component | Wrapper only | Authorizes, dispatches, then swallows the error ([`app/game/classic/page.tsx`](app/game/classic/page.tsx:34)) |
| dispatcher | Excluded | Correct handler resolved ([`lib/api/index.ts`](lib/api/index.ts:57)); `< 2` floor would produce `empty`, not `error` |
| local file packaging | Not supported | Catalog file present, valid, ≈263 entries > 50 floor; sibling `cwd()`-relative reads succeed on the deployment |
| snapshot freshness | N/A | The catalog has no age rule |
| **adapter — pre-network credential gate (or first-batch provider rejection)** | **Earliest supported failing layer** | [`lib/api/youtube.ts`](lib/api/youtube.ts:66) throws before any request; [`lib/api/youtube.ts`](lib/api/youtube.ts:96) throws on first non-OK batch |
| environment configuration | Candidate cause of the above | `YOUTUBE_API_KEY` presence **Not verifiable** |
| Vercel runtime | Excluded | TMDB + SteamSpy succeed in the same runtime |
| external provider | Possible but unconfirmed | Provider status never observed; no logs |
| response validation | Possible but unsupported | Would require all 6 batches to complete, contradicting ~300 ms |
| rendering/game state | Consequence, not cause | `kind="error"` shell rendered correctly |

### 12.2 Game Release Date

| Layer | Status | Basis |
|---|---|---|
| browser/client | Not reached by failure | No client fetch exists |
| route authorization | Excluded | `productionPlayable: true` + mapping present; route returned `200` |
| server route/component | Wrapper only | Swallows the error ([`app/game/classic/page.tsx`](app/game/classic/page.tsx:34)) |
| dispatcher | Excluded | Correct handler resolved ([`lib/api/index.ts`](lib/api/index.ts:58)); no other category shares it |
| **adapter — Twitch credential gate / OAuth token request** | **Earliest supported failing layer** | Env gate at [`lib/api/igdb.ts`](lib/api/igdb.ts:115) runs before any network call; token request at [`lib/api/igdb.ts`](lib/api/igdb.ts:80) is the first outbound step |
| environment configuration | Candidate cause of the above | `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` presence **Not verifiable** |
| Vercel runtime | Excluded | TMDB + SteamSpy succeed in the same runtime |
| external provider (IGDB) | Unlikely | Would require a successful OAuth first; does not fit ~300 ms |
| response validation | Unsupported | Filter at [`lib/api/igdb.ts`](lib/api/igdb.ts:156) runs only after a successful query |
| rendering/game state | Consequence, not cause | Identical `kind="error"` shell |

Cross-cutting layer (applies to both): **response-handling observability** — the page-level bare `catch {}` ([`app/game/classic/page.tsx`](app/game/classic/page.tsx:34), duplicated at [`app/game/time-attack/page.tsx`](app/game/time-attack/page.tsx:34) and [`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:37)) destroys `source`/`statusCode`, which is why both failures present identically and why the layer cannot be confirmed at runtime.

---

## 13. Required diagnosis

### 13.1 YouTube Subscribers

**First confirmed failing layer:** adapter — pre-network credential gate (or first-batch provider rejection), inside [`lib/api/youtube.ts`](lib/api/youtube.ts:62); surfaced through the dispatcher and swallowed by the page.

#### Confirmed Evidence

| # | Evidence | Source |
|---|---|---|
| 1 | Category authorized and mapped (`productionPlayable: true`, `youtube-subscribers → youtube-subscribers`) | [`lib/catalog/availability.ts`](lib/catalog/availability.ts:235), [`lib/catalog/availability.ts`](lib/catalog/availability.ts:411) |
| 2 | Rendered error copy proves an exception escaped `fetchGameItems`; it is the distinct `kind="error"` copy, not `empty` or `unavailable` | [`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx:37) vs `:24` and `:28`; [`app/game/classic/page.tsx`](app/game/classic/page.tsx:34) |
| 3 | Catalog file on disk is valid and above the 50-item floor | [`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:51), [`lib/api/youtubeChannelCatalog.ts`](lib/api/youtubeChannelCatalog.ts:130); `lib/api/data/youtube-channel-catalog.json` |
| 4 | No `/api` XHR exists on the client, so no client-side failure is possible | 0 `fetch(`/`axios`/`XMLHttpRequest` in `components/*.tsx` |
| 5 | Latency ≈300 ms excludes a 6-request multi-batch pipeline | Observed `602 / 303 / 307 ms`; `ceil(263/50) = 6` |
| 6 | No timeout, retry, or fallback that could mask or reshape the failure | [`lib/api/youtube.ts`](lib/api/youtube.ts:80) onward |
| 7 | Failure renders at HTTP `200`; never a `5xx` | Runtime observation |

#### Interpretation

- Most likely `YOUTUBE_API_KEY` is absent from the deployed environment scope, since the gate at [`lib/api/youtube.ts`](lib/api/youtube.ts:66) throws before any request and matches the observed latency.
- Second candidate: the key is present but the first batch is rejected (invalid/restricted key, API not enabled, or quota exhausted) at [`lib/api/youtube.ts`](lib/api/youtube.ts:96). Google's `keyInvalid` / `quotaExceeded` / `accessNotConfigured` reason is discarded twice over: the adapter never parses the error body, and the page never surfaces `statusCode`.
- These two candidates cannot be distinguished from source alone.

| Field | Value |
|---|---|
| Root cause | **Likely** (not Confirmed) — credential/provider availability at the adapter |
| Confidence | **Medium** (finer gradation: leaning high on the failing *layer* — credential/provider availability in the adapter; ≈60% on the narrower missing-vs-rejected question, i.e. whether it is specifically a *missing* variable rather than a *rejected* credential) |
| Corrective action (described only, **not performed**) | 1) Confirm `YOUTUBE_API_KEY` presence in the deployment's env scope. 2) If present, obtain `err.source` / `err.statusCode` by reading the swallowed error (a log-only change) and then check Google-side key restrictions, API enablement, and quota. 3) Do not change adapter logic before the status is known. |

### 13.2 Game Release Date

**First confirmed failing layer:** adapter — Twitch credential gate / OAuth token request in [`lib/api/igdb.ts`](lib/api/igdb.ts:114).

#### Confirmed Evidence

| # | Evidence | Source |
|---|---|---|
| 1 | Category authorized and mapped (`productionPlayable: true`, `game-release-date → game-release-dates`) | [`lib/catalog/availability.ts`](lib/catalog/availability.ts:172), [`lib/catalog/availability.ts`](lib/catalog/availability.ts:413) |
| 2 | Identical error shell to the YouTube failure (same copy, same ≈12.9 KB body) | [`components/game/DerivedGameState.tsx`](components/game/DerivedGameState.tsx:37) |
| 3 | The env gate is the **first statement** of the adapter call, before any token request | [`lib/api/igdb.ts`](lib/api/igdb.ts:115) |
| 4 | No OAuth-shaped delay: `324 / 310 / 327 ms` vs passing `584 / 570 / 369 ms` and `595 / 376 / 423 ms` | Runtime observation |
| 5 | An IGDB-side rejection would require a successful OAuth exchange plus the full `limit 200` query first — at least two sequential provider round-trips | [`lib/api/igdb.ts`](lib/api/igdb.ts:80), [`lib/api/igdb.ts`](lib/api/igdb.ts:135) |
| 6 | No timeout, retry, or fallback in the adapter | [`lib/api/igdb.ts`](lib/api/igdb.ts:114) onward |
| 7 | Failure renders at HTTP `200`; never a `5xx` | Runtime observation |

#### Interpretation

- Most likely the Twitch credential env gate or the token request fails, i.e. `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` absent or not valid for the deployed scope.
- Authorization, provider mapping, and dispatcher resolution are positively excluded.
- Reaching IGDB with a bad query would require a working token; that path implies successful credential handling, which the evidence does not support.

| Field | Value |
|---|---|
| Root cause | **Likely** (not Confirmed) — credential/OAuth layer in the adapter |
| Confidence | **Medium** (finer gradation: leaning high on the failing *layer* — credential/OAuth in the adapter; **Medium** on missing-vs-rejected) |
| Corrective action (described only, **not performed**) | 1) Verify `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` presence **and** validity for the deployment's env scope. 2) Surface the swallowed `ApiFetchError.statusCode` from both call sites in [`lib/api/igdb.ts`](lib/api/igdb.ts:85) and [`lib/api/igdb.ts`](lib/api/igdb.ts:146) before changing anything else. 3) Only after status is known, evaluate token-scope/credential correctness. |

### 13.3 Shared observation for both diagnoses

Every claim above about the failing layer is `[inferred-from-codebase]` plus latency reasoning. No provider HTTP status, error body, or function log was observed for either failure. The diagnoses identify a layer and a leading hypothesis; they do not confirm a specific configuration defect.

---

## 14. Deployment assessment

**`PARTIALLY FUNCTIONAL`**

Basis, from runtime evidence only:

- All shell, navigation, authorization, and keyless-provider paths work (§2, §7).
- All four local-snapshot categories work, within freshness bounds (§3, §8).
- A keyed provider (TMDB) returns real values, so the runtime env plumbing is functional — subject to the §6 cache caveat, which limits the "fresh upstream egress" reading of that control but not the per-variable conclusion (§6).
- **9 of 11** advertised production-playable categories play end-to-end.
- **2 of 11** advertised production-playable categories fail, and the UI provides no actionable distinction between them or between error and configuration causes (§3, §4, §5).
- Deployment provenance (branch, commit, status, timestamp, target) and runtime logs could not be verified (§1, §10).

Why not `READY WITH MINOR ISSUES`: two advertised, authorized, Home-visible categories are non-functional for every visitor, and their failure is indistinguishable from a transient error.

Why not `NOT PRODUCTION READY`: no systemic breakage exists; the majority of the product surface is verifiably functional, including a keyed-provider path (§6 cache caveat applies), keyless providers (§7 cache caveat applies), and local-snapshot paths.

---

## 15. Final findings table

### Findings by required area

| Area | Result | Evidence / Cause |
|---|---|---|
| Deployment | `[Blocked]` | Branch, commit, status, timestamp, preview-vs-production target, and environment scope are all unverifiable — no deployment-metadata header, no dashboard, no API, and no function logs (§1, §10). |
| Client application | `[Partial]` | Shell, navigation, route authorization, and prerendered landing content pass, and **9 of 11** production-playable categories play end-to-end while 2 fail with the same shell (§2, §3). Browser console, client network panel, and error overlay are `[Blocked]` — no browser binary (§2). |
| TMDB | `[Pass]` | `movie-series-rating`, `release-date`, and `gross-revenue` return real provider values (`The Matrix 8.3 / 10`, `The Godfather 1972-03-14`, `The Crow $93,722,164`), so a keyed server-side provider works in this deployment — subject to the §6 data-cache caveat (§3, §6). |
| YouTube | `[Fail]` | `youtube-subscribers` renders the generic `kind="error"` shell at HTTP `200`; an exception escapes `fetchGameItems`, and the earliest supported failing layer is the adapter's pre-network credential gate or a first-batch rejection (§4, §13.1). |
| Twitch OAuth | `[Blocked]` | The token exchange itself cannot be isolated: a non-OK token response becomes an `ApiFetchError` whose status is discarded and whose body is never read ([`lib/api/igdb.ts`](lib/api/igdb.ts:80)), and no log surface exists. The gate at [`lib/api/igdb.ts`](lib/api/igdb.ts:115) closes before OAuth is attempted, so "OAuth failed" is not distinguishable from "OAuth never ran" (§5, §12.2). |
| IGDB | `[Fail]` | `game-release-date` fails with a byte-identical error shell at HTTP `200`; the supported failing layer is the Twitch credential gate / token request, not the IGDB query or its validation (§5, §13.2). |
| SteamSpy | `[Pass]` | `game-rating` (`Battlefield V 71% positive`) and `player-count` (`War Robots: Frontiers 256 peak players`) pass on keyless calls — subject to the §7 data-cache caveat (§7). |
| Snapshot packaging | `[Pass]` | All four snapshot-served categories play at runtime, so the `cwd()`-relative `readFileSync` pattern works on the deployment even with no `outputFileTracingIncludes` (§8.1, §8.3). The YouTube catalog read itself is inferred rather than confirmed — `Needs Verification [environment-specific]` (V9). |
| Monthly Listeners | `[Pass]` | `monthly-listeners` plays (`The E Street Band 25,074 monthly listeners`); snapshot ≈ 4.80 d old, hard-stale ≈ 2026-11-16 (§3, §8.3). |
| Twitch Followers | `[Pass]` | `twitch-followers` plays (`japabigodin 16,136 followers`); snapshot ≈ 4.72 d old, hard-stale ≈ 2026-11-16 (§3, §8.3). |
| Environment scope | `[Blocked]` | The per-scope Vercel env matrix is not reachable. `TMDB_API_KEY` presence is inferred from runtime behaviour only; `YOUTUBE_API_KEY`, `TWITCH_CLIENT_ID`, and `TWITCH_CLIENT_SECRET` presence is **Not verifiable**; no value was read, printed, or copied (§9). |
| `/api/test-fetch` | `[Not tested]` | Endpoint **not invoked** (read-only constraint; a call would consume keyed-provider quota). Source-only findings: no production gate on plain `GET ?category=`, and `validValues` advertises 9 of the 12 dispatcher keys (§11). |

### Supporting findings detail (F1–F16)

| ID | Finding | Status | Basis | Evidence | Layer |
|---|---|---|---|---|---|
| F1 | Homepage prerenders with all 11 categories and 4 domains | `[Pass]` | Confirmed from runtime | §2 | rendering |
| F2 | Route authorization behaves as designed (307 on missing category, 404 on legacy ids) | `[Pass]` | Confirmed from runtime | §2; [`lib/catalog/routeAuthorization.ts`](lib/catalog/routeAuthorization.ts:38) | route authorization |
| F3 | 5 TMDB/SteamSpy categories play with real values | `[Pass]` | Confirmed from runtime | §3 | adapter + external provider |
| F4 | 4 local-snapshot categories play and are within freshness bounds | `[Pass]` | Confirmed from runtime | §3, §8.3 | local file packaging |
| F5 | YouTube Subscribers fails with the generic error shell at HTTP 200 | `[Fail]` | Confirmed from runtime | §4 | adapter (credential gate / first batch) |
| F6 | Game Release Date fails with the identical error shell at HTTP 200 | `[Fail]` | Confirmed from runtime | §5 | adapter (Twitch credential / OAuth) |
| F7 | Bare `catch {}` in three route files discards `source`, `statusCode`, and provider message | `[Pass]` | Confirmed from source | [`app/game/classic/page.tsx`](app/game/classic/page.tsx:34), [`app/game/time-attack/page.tsx`](app/game/time-attack/page.tsx:34), [`app/game/[mode]/page.tsx`](app/game/[mode]/page.tsx:37) | server route/component |
| F8 | YouTube adapter discards Google's error reason (never parses error body) | `[Pass]` | Confirmed from source | [`lib/api/youtube.ts`](lib/api/youtube.ts:96) | adapter |
| F9 | Deployment provenance (branch/commit/status/timestamp/target) unverifiable | `[Blocked]` | Confirmed from runtime | §1 | Vercel runtime / metadata |
| F10 | Function logs and provider HTTP statuses unavailable | `[Blocked]` | Confirmed from runtime | §10 | Vercel runtime |
| F11 | Browser-level console/network verification unavailable | `[Blocked]` | Confirmed from runtime | §2 | browser/client |
| F12 | Monthly Listeners and Twitch Followers become hard-stale ≈ 2026-11-16 | `[Pass]` | Confirmed from source | §8.3 | snapshot freshness |
| F13 | `/api/test-fetch` has no production gate on plain `GET ?category=` and can consume keyed quota (6 Google batches) | `[Pass]` | Confirmed from source | §11; [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:90) | server route/component |
| F14 | `/api/test-fetch` `validValues` advertises 9 of 12 dispatcher keys | `[Pass]` | Confirmed from source (observation only) | §11; [`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:48) | server route/component |
| F15 | `time-attack` verified on 3 of 11 categories only | `[Not tested]` | Confirmed from runtime | §3 | rendering |
| F16 | YouTube catalog entry count ≈263 (not parsed from metadata) | `[Partial]` — derived | Inferred | §4 item 3 | local file packaging |

### Confirmed Findings

1. **F1, F2, F3, F4, F7, F8, F12, F13, F14** — each backed by either a runtime observation or a directly read source line.
2. Both failing categories are **authorized, mapped, and dispatchable**; the failure occurs inside the adapter call, not in authorization or dispatch.
3. Both failures render the **same** `kind="error"` shell at HTTP `200`, and the underlying error metadata is destroyed at the page boundary in all three route files.
4. Two independent keyed-provider control results hold: TMDB succeeds, SteamSpy (keyless) succeeds. The runtime's env plumbing works, and outbound egress is supported — subject to the cache caveats in §6 and §7, since a fresh-vs-cached upstream call is not determinable without logs.
5. Two snapshot-backed categories carry an imminent, dated hard-staleness boundary (≈ 2026-11-16).

### Likely Findings

1. **`YOUTUBE_API_KEY` is missing or rejected for the deployed environment.** Confidence **Medium** (finer gradation: leaning high on the layer; missing-vs-rejected ≈ 60/40). Basis: env gate precedes all network activity; ~300 ms latency is incompatible with six provider round-trips; no timeout/retry/fallback.
2. **`TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` are missing or rejected for the deployed environment.** Confidence **Medium** (finer gradation: leaning high on the layer; missing-vs-rejected itself **Medium**). Basis: env gate is the first statement of the call; no OAuth-shaped latency; IGDB rejection would need a working token first.
3. **The three route files duplicate the same swallower**, so any future adapter error will present identically across both modes and all categories. Confirmed as code duplication (F7); the *consequence* is the Likely part.

### Needs Verification

| # | Item | Qualifier |
|---|---|---|
| V1 | Branch / commit SHA of the tested deployment | `[environment-specific]` — no metadata surface |
| V2 | Deployment status and timestamp | `[environment-specific]` |
| V3 | Preview vs Production vs custom-domain classification | `[environment-specific]` — only weak signals (`-dev` hostname, absent `x-robots-tag`) |
| V4 | Which Vercel env scope the deployment draws from | `[environment-specific]` |
| V5 | Whether the deployment predates recent env-var configuration | `[environment-specific]` |
| V6 | `YOUTUBE_API_KEY` presence in the deployment | `[environment-specific]` |
| V7 | `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` presence in the deployment | `[environment-specific]` |
| V8 | Whether the failing creds are missing vs. rejected (and, if rejected, the provider reason) | `[environment-specific]` — requires a log surface or `/api/test-fetch` |
| V9 | Whether the YouTube catalog `cwd()`-relative read succeeds on the deployment | `[environment-specific]` — inferred from four sibling snapshot reads succeeding |
| V10 | Item counts inside `lib/api/data/*.json` (including YouTube ≈263) | `[inferred-from-codebase]` — deliberately not parsed |
| V11 | Whether SteamSpy categories were served from internal data cache rather than fresh upstream calls | `[inferred-from-codebase]` |
| V12 | Behaviour of the 9 untested `time-attack` categories | `[capability-unavailable]` — not attempted |
| V13 | Browser console, client network panel, error overlay | `[capability-unavailable]` — Playwright binary absent |
| V14 | `game-release-date` / `youtube-subscribers` `status: "blocked"` alongside `productionPlayable: true` | `[product-decision]` — recorded, not resolved |
| V15 | Intent of the `validValues` subset (9 of 12) in `/api/test-fetch` | `[product-decision]` — observation only |
| V16 | Whether either failure would also occur in the Production deployment | `[environment-specific]` — only `-dev` was tested |

**V8 is the highest-value open item.** A single `GET /api/test-fetch?category=youtube-subscribers` (or `game-release-dates`) against the deployment is production-reachable and returns `502` with `{ error, source, statusCode }` ([`app/api/test-fetch/route.ts`](app/api/test-fetch/route.ts:99)), which would resolve the missing-vs-rejected ambiguity for both categories. **It was not called**, per this task's read-only constraint, and it would consume keyed-provider quota.

### Recommended Next Actions

All items below are **recommendations only**. None was performed — no code, config, env, regeneration, or redeploy action was taken.

1. Inspect the deployment's env scope for `YOUTUBE_API_KEY`, `TWITCH_CLIENT_ID`, and `TWITCH_CLIENT_SECRET` (presence first, validity second).
2. Resolve V8 by obtaining the swallowed `ApiFetchError.source` / `statusCode` — minimally by the diagnostic endpoint above, or by a log-only change at the three `catch` sites.
3. If the credentials are present, check provider-side enablement/restrictions/quota for the Google API key and the Twitch application.
4. Plan snapshot regeneration before ≈ 2026-11-16 for Monthly Listeners and Twitch Followers.
5. Consider (as a separate, explicitly approved task) preserving `source`/`statusCode` in the error path and distinguishing config failures from transient provider failures in the UI copy. Not implemented.
6. Consider (separately) whether `/api/test-fetch`'s plain `GET` should be gated in production, given its keyed-quota reach. Not implemented.

---

## 16. Sign-off / handoff trace

| Field | Value |
|---|---|
| Task type | Read-only runtime verification + failure diagnosis (documentation only) |
| Files changed | `docs/dev-runtime-verification-2026-11-07.md` — **this file only** (this report lives in the untracked `docs/` directory, so `git status` reports `?? docs/` rather than a modified tracked file — see the working-tree evidence below) |
| Evidence sources | HTTP GET header/body inspection of `https://higher-lower-dev.vercel.app/` (2026-11-07 ≈ 07:50Z); read-only source reads of the files cited inline; `git` (read-only) for local branch/HEAD context |
| Evidence date | 2026-11-07 |
| Code changes | None |
| Config changes | None |
| Environment-variable changes | None |
| Provider calls made by this task | None |
| Snapshot regeneration | None |
| Redeploy | None |
| Commit / push / branch | None |

**Working-tree evidence for the "this file only" claim** — read-only `git`, captured 2026-11-07T08:07Z:

```text
$ git status --porcelain
 M .gitignore
 M lib/api/data/artist-album-counts.snapshot.json
?? docs/
?? governance/

$ git diff --stat
 .gitignore | 8 +++++++-
 1 file changed, 7 insertions(+), 1 deletion(-)
```

Pre-existing and **not** produced by this task: `M .gitignore`, `M lib/api/data/artist-album-counts.snapshot.json`, untracked `governance/`, and untracked `docs/`. Because `docs/` is untracked as a whole, this report appears in `git status` as part of `?? docs/` rather than as a modification, and `git diff --stat` — which covers tracked files only — does not list it. No tracked file was created, edited, or deleted by this task; the only write was to this report inside the pre-existing untracked `docs/` directory.

Verification status:

| Item | Status |
|---|---|
| Deployment identity | `[Blocked]` — no metadata surface or dashboard access |
| Baseline shell + routing | `[Pass]` |
| Category matrix (Classic mode) | `[Partial]` — 9 `PASS`, 2 `FAIL` |
| Category matrix (Time Attack) | `[Not tested]` for 9 of 11 categories |
| Browser-level checks | `[Blocked]` — Playwright binary absent |
| Runtime logs / provider status | `[Blocked]` — no log surface |
| Source trace | `[Pass]` — every cited line read directly |
| Failure-layer classification | `[Partial]` — layer identified, specific credential defect unresolved (V8) |
| Perceptual / UX acceptance | `[Not tested]` — not assessed: no human reviewer and no browser available |

**Verification limits:** all failure-layer conclusions are source-derived plus latency-reasoning; no provider status, error body, or function log was observed. All runtime observations come from HTTP response bodies and headers, not from a rendering browser.

**Open `Needs Verification` items:** V1–V16 in §15, each carried with its qualifier.

**Stop point:** This task **stopped at diagnosis**. No fix was implemented, no configuration was changed, no snapshot was regenerated, and no deployment action was taken. The next step requires an owner decision on scope (env inspection and/or an approved observability change), which is outside this task's read-only boundary.
