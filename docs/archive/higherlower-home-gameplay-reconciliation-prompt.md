# Time Attack Gameplay — Runtime Bug Fix + Header Timer Reconciliation Pass

We are now reconciling the **Time Attack** gameplay screen against its Figma reference.

This pass has two parts:

1. fix a real React runtime bug that appears when the Time Attack timer reaches zero;
2. reconcile the Time Attack timer/progress-bar placement with the Figma header.

Do not reopen unrelated Classic layout work. Shared gameplay components may be touched only where necessary to preserve consistency.

---

# 1. Fix the React state-update-during-render bug

A runtime console error appears after Time Attack reaches zero:

```text
Cannot update a component (`TimeAttackGame`) while rendering a different component (`TimeAttackGame`).

To locate the bad setState() call inside `TimeAttackGame`, follow the stack trace as described in:
https://react.dev/link/setstate-in-render
```

Observed stack:

```text
lib/highScores/storage.ts
  notifyHighScoreChange()
  scoreListeners.forEach((listener) => listener())

writeHighScore()
  lib/highScores/storage.ts

TimeAttackGame
  components/game/TimeAttackGame.tsx
```

The relevant behavior happens when the timer expires.

The likely issue is that the Time Attack render path is calling `writeHighScore(...)`, which synchronously notifies the high-score store subscribers while React is still rendering `TimeAttackGame`.

That means this is not just a cosmetic warning. The high-score write is happening at the wrong lifecycle point.

## Required fix

Inspect the actual `TimeAttackGame` implementation and identify the exact render-time path that causes `writeHighScore(...)` to execute when time reaches zero.

Move that side effect out of render.

The fix should follow normal React lifecycle rules:

```text
render
  ↓
derive state/UI only

effect/event/transition boundary
  ↓
write high score
  ↓
notify subscribers
```

Not:

```text
render
  ↓
writeHighScore()
  ↓
notify subscribers
  ↓
state update during render
```

Possible valid approaches may include:

- a guarded `useEffect` reacting to the transition into the expired/game-over state;
- writing the score in the event/state-transition path that ends the run;
- another existing lifecycle-safe mechanism already used elsewhere in the project.

Do **not** blindly add `setTimeout`, suppress the warning, or remove subscriber notifications.

Do **not** weaken the centralized high-score store.

The score write must still happen exactly once for the completed run.

## Important correctness checks

After the fix:

- Time Attack reaching zero must not log the React warning;
- the game-over state must still appear correctly;
- final score must still persist;
- Best must still update correctly if the final score is higher;
- replay/restart must not duplicate the previous write;
- multiple re-renders after expiry must not write the same completed run repeatedly;
- canonical semantic-category high-score identity must remain unchanged.

---

# 2. Move the Time Attack timer/progress UI into the top bar

The current implementation places the Time Attack numeric timer and progress bar **below/outside the gameplay top bar**.

The Figma reference places the Time Attack timer treatment **inside the header/top-bar composition**.

Current structure roughly reads:

```text
HEADER
back              category • Time Attack             score / best
                  race the clock
──────────────────────────────────────────────────────────────

57      [ progress bar ]             SECONDS LEFT

GAMEPLAY BOARD
```

Desired structure should follow the Figma more closely:

```text
┌──────────────────────────────────────────────────────────────┐
│ back        category • Time Attack       timer      score/...│
│             higher or lower / race ...                       │
│                                                              │
│       [=========== timer progress bar =================]      │
└──────────────────────────────────────────────────────────────┘

GAMEPLAY BOARD
```

The timer information and progress bar should visually belong to the top bar, not float as a separate row in the gameplay body.

Use the real shared header structure and current Time Attack status components. Do not duplicate the entire header.

---

# 3. Keep only one numeric timer display

The Figma sample shows a timer value with copy such as:

```text
12
second(s) left
```

For this implementation, **do not render the redundant `second(s) left` text**.

We already have a clear numeric timer.

Desired Time Attack timer presentation:

```text
57
```

or the equivalent existing numeric countdown styling.

Do not show both:

```text
57
SECONDS LEFT
```

or:

```text
57
57
```

There should be one clear numeric countdown.

The progress bar communicates the remaining duration visually.

---

# 4. Timer progress bar behavior

Preserve the existing timing mechanics.

The progress bar should:

- represent remaining Time Attack duration;
- decrease continuously/appropriately with the timer;
- stay synchronized with the numeric countdown;
- preserve the current correct-answer time bonus behavior;
- preserve the current incorrect-answer penalty behavior;
- reset correctly on replay;
- reach its terminal state when time expires.

This is a layout reconciliation, not a timer-logic redesign.

Do not change:

- initial timer duration;
- +time bonus;
- -time penalty;
- countdown cadence;
- expiry semantics.

---

# 5. Header composition

Reconcile the Time Attack top bar while preserving the shared gameplay shell.

The header should still include:

- Back control on the left;
- semantic category + `Time Attack` title centered;
- subtitle beneath the title;
- timer/status information in the appropriate header region;
- Score / Best status as currently required by the product;
- header bottom border.

Do not let the Time Attack additions shift the center title off the true viewport center.

If Score/Best and timer share the right-side status area, maintain clear grouping and spacing.

If the Figma arrangement requires the progress bar to span the lower portion of the header, implement it as part of the header layout rather than as a gameplay-body element.

---

# 6. Preserve shared gameplay fixes

Do not regress the already-corrected shared gameplay visuals:

- centered split layout;
- square/near-square comparison cards;
- CURRENT / NEXT UP external labels;
- centered OR control;
- center dashed divider;
- vertically stacked Higher/Lower controls;
- current button sizing;
- score/best header containment;
- semantic category naming;
- no horizontal overflow.

Do not perform a broad Classic restyle in this task.

---

# 7. Preserve Time Attack gameplay mechanics

Do not change:

- Higher/Lower comparison logic;
- score progression;
- correct-answer time bonus;
- incorrect-answer time penalty;
- timer countdown rules;
- deck advancement;
- reveal behavior;
- restart behavior;
- keyboard controls;
- provider fetching;
- route authorization;
- High Score key structure.

The only non-visual logic change in this pass should be the lifecycle-safe fix for the high-score write on expiry.

---

# Before editing

Inspect the current implementation and report:

1. the exact render path that calls `writeHighScore(...)` when Time Attack expires;
2. why that path triggers `notifyHighScoreChange()` during render;
3. the lifecycle-safe place where the high-score write should move;
4. how duplicate writes will be prevented;
5. the current component that renders the numeric timer;
6. the current component that renders the timer progress bar;
7. the current DOM/layout location of both relative to `GameplayShell`;
8. the exact files you intend to modify.

Then implement the smallest coherent fix.

---

# Browser / runtime verification

Use the running app with Chrome DevTools and Playwright where available.

## Time Attack runtime bug

Let a Time Attack run reach zero naturally.

Verify:

- no `Cannot update a component while rendering a different component` warning;
- no new React console errors;
- game-over state appears;
- score is correct;
- Best updates when appropriate;
- completed score persists;
- restart works;
- no duplicate high-score write occurs after rerenders.

Also test at least one guess before expiry so the final score is non-zero.

---

## Time Attack header visual verification

At the reference desktop viewport, verify:

- numeric timer is inside the top bar;
- timer progress bar is inside the top-bar composition;
- neither floats as an isolated gameplay-body row;
- redundant `second(s) left` copy is absent;
- there is only one numeric countdown;
- progress bar remains synchronized with countdown;
- title block remains centered;
- Score/Best remain contained and readable;
- header bottom border still separates header from gameplay;
- gameplay cards begin below the header without overlap;
- no horizontal overflow.

---

## Shared regression

Open Classic after the shared/header changes.

Verify:

- Classic header still renders correctly;
- Classic has no timer/progress UI;
- score/best layout remains intact;
- Back still works;
- comparison board layout is unchanged;
- no console errors.

Do not visually redesign Classic in this pass.

---

# Visual comparison priority

Compare Time Attack against the Figma in this order:

1. timer/progress bar belongs to the top bar;
2. only one numeric countdown remains;
3. title/status/header hierarchy;
4. gameplay starts cleanly below the header;
5. shared comparison composition remains intact.

---

# Stop conditions

Stop and report if:

- fixing the render-time score write would require changing the high-score storage contract;
- the score write cannot be made idempotent without changing broader game-state architecture;
- moving timer/progress into the header requires breaking Classic's shared header;
- a new dependency is required;
- timer semantics would need to change.

Do not suppress the React error without fixing the lifecycle cause.

---

# Completion report

After implementation, report:

- exact root cause of the React warning;
- exact files changed;
- high-score write lifecycle before/after;
- duplicate-write prevention approach;
- console result after natural timer expiry;
- final-score persistence result;
- Best-score result;
- timer location before/after;
- progress-bar location before/after;
- confirmation that `second(s) left` copy was removed;
- desktop viewport tested;
- Time Attack regression result;
- Classic shared-regression result;
- screenshots captured;
- any remaining Time Attack differences from the Figma.

This pass is complete when Time Attack expires cleanly with no render-time state-update warning and its timer/progress treatment visually belongs to the gameplay top bar.
