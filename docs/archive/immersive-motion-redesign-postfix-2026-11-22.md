# Immersive Motion Enhancement — Postfix (Finding F3)

**Date:** 2026-11-22
**Stage:** Postfix only (single QA finding F3)
**Task type:** Implementation bug fix — display/motion sequencing (no gameplay logic)
**Source of the finding:** `docs/immersive-motion-redesign-qa-2026-11-22.md` §4 F3
**Authoritative sequencing spec:** `docs/immersive-motion-redesign-design-2026-11-22.md` §4.3 (t1)
**Scope allowlist (owner):** `components/game/GameplayStatus.tsx`, `components/game/ClassicGame.tsx`, `components/game/TimeAttackGame.tsx` only

---

## 1. Finding and classification

| Item | Value |
|---|---|
| Finding | The score-tally bump fired at the deck advance (~1.5 s after the outcome), not during the reveal |
| QA classification | **Implementation bug** — code does not match design §4.3 sequencing |
| Severity | Low (QA) |
| Design expectation | §4.3 t1: `tint 140ms`, `value 180ms` starting at `120ms`, `tally 180ms`; sequencing "plate → (120 ms) → value; **tally overlaps**" — i.e. the tally is a reveal beat |
| QA observation | At `+150 ms` into the reveal only `value-land` ran; `tally-bump` first appeared at `+1600 ms`, when the next card mounted |
| Postfix finding type (§postfix condition) | Implementation bug, not a spec gap: the design already sequences the tally at the reveal, so only the code was corrected |

---

## 2. Traced root cause (source-level, before any edit)

The tally animation is keyed on the rendered **value**, and the value only changed with the deck advance:

1. `components/game/GameplayStatus.tsx:38` — `const tallyKey = bump ? `${label}:${value}` : undefined;`
   and `components/game/GameplayStatus.tsx:49` — `<p key={tallyKey} …>`. A change of `value`
   remounts the `<p>`, which restarts the CSS animation. Nothing else restarts it.
2. `components/game/ClassicGame.tsx:183–215` — `setScore(newScore)` runs **inside** the untouched
   `setTimeout(…, 1500)` reveal timer, in the same commit as the deck advance
   (`setDeck(remaining)`). At the moment the reveal begins (`setPhase("revealing")`, `:179`) the
   score state is still the pre-increment value.
3. Both call sites passed that state directly:
   `ClassicGame.tsx:269–274` — `value={score}`, `bump={score > 0}`, `tier` derived from `score`
   (`:131`); `TimeAttackGame.tsx:365–370` — the same shape, with `setScore` at `:279` inside the
   `REVEAL_MS_CORRECT`/`REVEAL_MS_WRONG` timer (`:277–308`).

Consequence: the `<p>` key stayed constant for the whole reveal and only changed at the advance, so
`tally-bump`/`tier-stamp` started ~1.5 s (Classic) or ~0.8 s (Time Attack) after the outcome.
The same defect existed in both modes; QA measured the Classic case at `+1600 ms`.

---

## 3. Minimal fix (display-only)

The fix makes the animation key a **display-only reveal beat**: during a correct reveal the tally
chip renders the prospective score, so the value-derived key changes at the reveal instead of at the
advance. The gameplay score state, timers, deck order and handlers are untouched, and the value the
state eventually reaches is identical, so the key does not change a second time at the advance.

No prop was added and `GameplayStatus.tsx` needed **no change**: its existing value-derived key
(`:38`) is exactly the display-only animation key the fix needs.

### `components/game/ClassicGame.tsx`

- `:129–142` — added `isRevealCorrect` (`phase === "revealing" && lastCorrect === true`) and
  `displayScore = isRevealCorrect ? score + 1 : score`; `tier` now derives from `displayScore`.
  `wrongBeat` is unchanged.
- `:279–283` — the header status now receives `value={displayScore}` and
  `bump={displayScore > 0}` instead of `value={score}` / `bump={score > 0}`.

### `components/game/TimeAttackGame.tsx`

- `:160–172` — the same derivation from `tint` (`phase === "revealing" && tint === "correct"`);
  `tier` now derives from `displayScore`.
- `:375–379` — `value={displayScore}`, `bump={displayScore > 0}`.

### Explicitly not changed

- `handleGuess` bodies, `1500` ms / `800` ms / `400` ms / `1000` ms / `460` ms values, deck logic,
  `seenIds`, high-score writes, keyboard handling, `guessLocked`, `aria-live`, focus management.
- Game-over panels still render un-bumped `GameplayStatus` (`ClassicGame.tsx:378`, `TimeAttackGame.tsx:508`).
- `GameplayStatus.tsx`, `app/globals.css`, and every other component — untouched.
- No layout, spacing, copy, dependency, or token change.

---

## 4. Pre-flight

- `git status --short` / `git diff --stat` recorded before editing: 15 pre-existing modified files and
  the untracked `docs/`, `.agents/`, `.playwright-mcp/`, `skills-lock.json`, `types/view-transition.d.ts`.
  `ClassicGame.tsx` and `TimeAttackGame.tsx` were already in that pre-existing modified set; this
  postfix edited only those two, additively, and preserved every other working-tree change.
- `.agents/skills/impeccable/scripts/impeccable.cmd context --target components/game/GameplayStatus.tsx`
  returned `NO_PRODUCT_MD` + `SCOPED_EXISTING_ALLOWED` (narrow refinement may use the incumbent
  implementation as authority). `reference/craft-floor.md` was read immediately before the edit.
- Owner's dev server (port 3000, PID 17272) was reused for runtime checks and never stopped.

---

## 5. Re-verification

Environment: owner's `next dev` on `http://localhost:3000`, Playwright MCP (Chromium), desktop
`1440×900` and mobile `390×844`. Measurement source: `document.getAnimations()` plus computed styles,
and a React-fiber read of the two card `item` props so the correct direction is known before the
hidden value is revealed. Pre-existing (finished, `fill: both`) animation objects were excluded from
every count so a finished beat is never mistaken for a new one.

| # | Check | Status | Evidence |
|---|---|---|---|
| P1 | Type check | `[Pass]` | `npx tsc --noEmit` → exit 0, no diagnostics |
| P2 | Lint | `[Pass]` | `npm run lint` → **0 errors**, 96 warnings — identical count and origin to QA S2 (no warning originates in a changed line) |
| P3 | Classic tally starts in the reveal, not at the advance | `[Pass]` | One correct answer, sampled every frame 0→1900 ms: single `tally-bump` start at **4 ms** (`currentTime` 0, `playState` running, duration 180 ms, 1 iteration); deck advance detected at **1506 ms**; **0** tally starts after the advance |
| P4 | Time Attack tally starts in the reveal | `[Pass]` | One correct answer: single `tally-bump` at **7 ms**; score chip already reads `1` at 300 ms, i.e. before the 800 ms advance |
| P5 | Exactly one fire per correct outcome | `[Pass]` | Five consecutive Classic correct answers (score 1→6): exactly **1** `tally-bump`/`tier-stamp` start per round (4/5/3/3/5 ms); no round produced two |
| P6 | No double fire on rapid input | `[Pass]` | Two synchronous clicks in the same task (Phase guard not yet applied): exactly **1** new `tally-bump`, score settles at `1` (no double increment) |
| P7 | Wrong answers have no tally beat | `[Pass]` | Classic wrong reveal: **0** new tally/stamp starts (score chip unchanged); Time Attack wrong reveal: **0** new starts |
| P8 | Tier ladder t0–t4 preserved | `[Pass]` | t1 (score 1): `tally-bump`, 0 accent nodes; t2 (2): `tally-bump`, 0 accents; t3 (3 and 4): `tally-bump` + 1 ring + 1 line, `pulse-ring` 400 ms ×1; t4 (5 and 6): `tier-stamp` 240 ms + ring + line. Premature-tier-4 guard still holds (score 3/4 → `tally-bump`) |
| P9 | Time Attack countdown never bumps | `[Pass]` | `role="timer"` subtree produced no animation entries during the sampled ticks |
| P10 | Game over unchanged | `[Pass]` | Normal motion and emulated reduce: panel `animation-name: none`, `transform: none`, `opacity: 1`, heading `Game over`, focus inside the dialog. (Normal-motion `transition-duration` still `0s`; under emulation Chromium reported `1e-05s`, the same effective zero QA recorded) |
| P11 | Console, normal motion | `[Pass]` | Fresh Classic and fresh Time Attack sessions: **0 errors / 0 warnings** (2 informational messages each) |
| P12 | Reduced motion still opacity-only | `[Pass]` | Emulated reduce (`matchMedia` true): tally chip computes `animation-name: none`, `transform: none`; the only animation in the reveal is `tint-in` (opacity crossfade); no `tally-bump`, `tier-stamp`, `shake-brief` or `pulse-ring` |
| P13 | Reduced-motion console | `[Partial]` | 1 warning: `[WARNING] You have Reduced Motion enabled…` from the Motion library — the pre-existing F7 observation, unrelated to this change. **0 errors** on gameplay |
| P14 | Mobile geometry unchanged | `[Pass]` | 390×844 Classic: `scrollHeight` **1252**, Higher y **1100**, Lower y **1166**, `scrollWidth` **385** (< 390) — exact QA/analysis baseline |
| P15 | Production build | `[Blocked]` | Owner's dev server owns `.next`; not run, not claimed |
| P16 | Impeccable mechanical detector | `[Pass]` (advisory) | `impeccable detect --json --changed` returned 3 findings, all in `app/globals.css` (`gradient-text` `:232`, bounce easing `:475`, `:476`) — pre-existing/owner-approved tokens outside the changed files. No finding in either edited file; no action taken (scope) |

### 5.1 Not assessable here

| Item | Status |
|---|---|
| Perceptual / feel acceptance of the reveal-time tally | `[Not tested]` — requires a human reviewer |
| Non-Chromium engines | `[Not tested]` |
| Time Attack mid-reveal timer expiry interaction | `[Not tested]` — see §7 |

---

## 6. Changed-file set

| File | Lines | Change |
|---|---|---|
| `components/game/ClassicGame.tsx` | `129–142`, `279–283` | Display-only `isRevealCorrect` / `displayScore`; tier from `displayScore`; status receives `displayScore` |
| `components/game/TimeAttackGame.tsx` | `160–172`, `375–379` | Same derivation from `tint`; tier from `displayScore`; status receives `displayScore` |
| `docs/immersive-motion-redesign-postfix-2026-11-22.md` | whole file | This handoff |

No other file was modified. `GameplayStatus.tsx` was in the allowlist but was not needed.

---

## 7. Remaining `Needs Verification`

1. `Needs Verification [inferred-from-codebase]` — **Time Attack timer expiry during a correct reveal.**
   If the 1000 ms tick reaches 0 inside the 800 ms reveal, the game-over transition clears `tint`,
   so `displayScore` steps from `score + 1` back to `score` (and returns to `score + 1` when the
   reveal timer still writes the score). That remounts the tally chip behind the dialog.
   The pre-existing behaviour — Time Attack still increments `score` after the modal appears — is
   unchanged; only the invisible chip remount is new. No gameplay, layout, focus or console effect
   was observed or tested. `TODO:` exercise it deliberately if it ever matters.
2. `Needs Verification [product-decision]` — perceptual acceptance of the reveal-time tally (no human
   review in this pass).
3. `Needs Verification [capability-unavailable]` — production build (`[Blocked]`, owner's dev server).
4. `Needs Verification [not tested]` — non-Chromium engines.
5. Carried forward unchanged from QA and out of this finding's scope: **F1** (wrong-jolt amplitude),
   **F2** (keyboard press-scale), **F4** (pre-existing reduced-motion hydration mismatch on Home),
   **F5/F6** (verification gaps). This postfix does not address or alter them.
