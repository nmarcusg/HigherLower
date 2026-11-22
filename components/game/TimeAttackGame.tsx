/**
 * TimeAttackGame — client-side game logic for Time Attack Mode.
 *
 * Rules:
 *   - 60-second countdown that keeps running through reveals.
 *   - Correct guess → +1 score, +3 s bonus, 800 ms reveal then advance.
 *   - Wrong guess   → −5 s penalty (clamped ≥ 0), 400 ms shake+flash then
 *     advance immediately (game does NOT end on wrong answers).
 *   - Timer hits 0  → game over modal ("Time's Up!").
 *
 * Deck system (remaining-pool model):
 *   - `deck` is the ordered queue of items not yet shown this session.
 *   - `seenIds` persists for the entire timed run: an item ID cannot repeat
 *     during the same session.
 *   - If the entire available pool is genuinely exhausted before the timer
 *     reaches zero, the run ends cleanly via the existing game-over path.
 *     Items are never recycled merely to keep the timer running.
 */

"use client";

import {
  useEffect,
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { ArrowLeft, Timer } from "lucide-react";
import { GameItem } from "@/types/api";
import type { SemanticCategoryId } from "@/types/game";
import GameCard from "@/components/game/GameCard";
import GameplayShell from "@/components/game/GameplayShell";
import ComparisonBoard from "@/components/game/ComparisonBoard";
import GameplayDivider from "@/components/game/GameplayDivider";
import DecisionControls from "@/components/game/DecisionControls";
import GameplayStatus, {
  type IntensityTier,
} from "@/components/game/GameplayStatus";
import DerivedGameState from "@/components/game/DerivedGameState";
import { GameplayEntranceStatus } from "@/components/game/GameplayEntrance";
import {
  readHighScore,
  subscribeHighScores,
  writeHighScore,
} from "@/lib/highScores/storage";
import { buildDeck, shuffleDeck } from "@/lib/game/deck";
import { emitAtmosphere } from "@/lib/atmosphere/eventBus";
import { gameplayStatusOrigin, originFor } from "@/lib/atmosphere/delegation";

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_TIME = 60;
const BONUS_CORRECT = 3;
const PENALTY_WRONG = 5;
const REVEAL_MS_CORRECT = 800;
const REVEAL_MS_WRONG = 400;

// ─── Types ────────────────────────────────────────────────────────────────────

type GamePhase = "playing" | "revealing" | "game-over";
type ResultTint = "correct" | "incorrect" | null;

/**
 * Display-only reward ladder, identical thresholds to Classic but read from the
 * cumulative correct count. Deliberately NOT a consecutive-correct combo: that
 * would be new display state, which is out of scope for this pass.
 */
function resolveTier(score: number, isNewBest: boolean): IntensityTier {
  if (score >= 5 || (isNewBest && score >= 3)) return 4;
  if (score >= 3) return 3;
  if (score === 2) return 2;
  if (score === 1) return 1;
  return 0;
}

interface TimeAttackGameProps {
  initialPool: GameItem[];
  categoryId: SemanticCategoryId;
  categoryLabel: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Pad a number to 2 digits
const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

function shouldIgnoreShortcut(e: KeyboardEvent) {
  if (document.querySelector('[role="dialog"], dialog[open], [aria-modal="true"]')) {
    return true;
  }

  const target = e.target;
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable], button, a[href], summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="combobox"]',
    ),
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimeAttackGame({
  initialPool,
  categoryId,
  categoryLabel,
}: TimeAttackGameProps) {
  // ── Deck ───────────────────────────────────────────────────────────────────
  const [deck, setDeck] = useState<GameItem[]>(() => buildDeck(initialPool));
  // IDs consumed during this session. Persists for the whole timed run.
  const [seenIds, setSeenIds] = useState<Set<string | number>>(() => new Set());

  const currentItem = deck[0];
  const nextItem = deck[1];

  // ── Game state ─────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [score, setScore] = useState(0);
  const [tint, setTint] = useState<ResultTint>(null);
  const [shaking, setShaking] = useState(false);
  const gameOverActionRef = useRef<HTMLButtonElement>(null);
  const gameOverDialogRef = useRef<HTMLDivElement>(null);
  const gameOverOriginRef = useRef<HTMLElement | null>(null);
  const previousPhaseRef = useRef<GamePhase>(phase);

  // Handoff gate (see ClassicGame): captured once in state, never on first paint.
  const [openingItemId] = useState(() => currentItem?.id);
  const enterHandoff = currentItem?.id !== openingItemId;

  // ── Timer (ref = source of truth; state = display) ─────────────────────────
  const timerRef = useRef(INITIAL_TIME);
  const [displayTime, setDisplayTime] = useState(INITIAL_TIME);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<GamePhase>("playing");

  // Floating delta label (+3s / -5s)
  const [deltaLabel, setDeltaLabel] = useState<{
    key: number;
    text: string;
    color: string;
  } | null>(null);
  const deltaKeyRef = useRef(0);

  const guessLocked = useRef(false);
  // Set only around a keyboard-initiated guess, so the emitted `source` is
  // exact. Informational only: no gameplay state changes.
  const guessSourceRef = useRef<"pointer" | "keyboard" | null>(null);

  // Guards the one-time high-score write for a completed run. The write is a
  // side effect and must not run during render (see the game-over effect).
  const scoreWrittenRef = useRef(false);

  const getHighScoreSnapshot = useCallback(
    () => readHighScore({ mode: "time-attack", categoryId }),
    [categoryId],
  );
  const highScore = useSyncExternalStore(
    subscribeHighScores,
    getHighScoreSnapshot,
    () => 0,
  );

  // The tally is a reveal beat (design §4.3 t1), matching Classic. `score` is
  // still written only by the untouched 800 ms advance, so a correct reveal
  // reads the prospective count for display. Display-only: no timer or handler
  // change.
  const isRevealCorrect = phase === "revealing" && tint === "correct";
  const displayScore = isRevealCorrect ? score + 1 : score;

  // Display-only ladder position, read from the cumulative correct count. A new
  // best only counts when a best already exists to beat.
  const tier = resolveTier(
    displayScore,
    highScore > 0 && displayScore > highScore,
  );

  // ── Timer logic ────────────────────────────────────────────────────────────
  function startTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (phaseRef.current === "game-over") return;
      timerRef.current = Math.max(0, timerRef.current - 1);
      setDisplayTime(timerRef.current);
      // Owner brief: urgency (visual and audible) begins at ≤ 10 s; ticks stop
      // the moment the phase leaves `playing`.
      emitAtmosphere({
        type: "timer",
        secondsLeft: timerRef.current,
        urgent: timerRef.current <= 10,
        fromTick: true,
      });
      if (timerRef.current <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        phaseRef.current = "game-over";
        guessLocked.current = true;
        setPhase("game-over");
        setTint(null);
        emitAtmosphere({ type: "phase", phase: "game-over" });
      }
    }, 1000);
  }

  useEffect(() => {
    startTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Sync phaseRef whenever phase changes
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase === "game-over") {
      gameOverActionRef.current?.focus();
    } else if (previousPhaseRef.current === "game-over" && phase === "playing") {
      const origin = gameOverOriginRef.current;
      const nextAction = document.querySelector<HTMLButtonElement>(
        '[aria-label="Higher"]',
      );
      if (origin?.isConnected) origin.focus();
      else nextAction?.focus();
      gameOverOriginRef.current = null;
    }
    previousPhaseRef.current = phase;
  }, [phase]);

  // Persist the completed run's score exactly once, after the transition into
  // game-over. Writing here (an effect boundary) keeps the high-score store's
  // synchronous subscriber notification out of the render phase.
  useEffect(() => {
    if (phase !== "game-over" || scoreWrittenRef.current) return;
    scoreWrittenRef.current = true;
    if (score > highScore) {
      writeHighScore({ mode: "time-attack", categoryId }, score);
    }
  }, [phase, score, highScore, categoryId]);

  // ── Deck ref (mirrors deck state — avoids stale closure in setTimeout) ────
  const deckRef = useRef(deck);
  const seenIdsRef = useRef(seenIds);
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);
  useEffect(() => {
    seenIdsRef.current = seenIds;
  }, [seenIds]);

  // ── Guess handler ──────────────────────────────────────────────────────────
  const handleGuess = useCallback(
    (direction: "higher" | "lower") => {
      if (guessLocked.current || phaseRef.current !== "playing" || !nextItem)
        return;
      const activeElement = document.activeElement;
      gameOverOriginRef.current =
        activeElement instanceof HTMLElement &&
        activeElement !== document.body &&
        activeElement !== document.documentElement
          ? activeElement
          : null;
      guessLocked.current = true;

      const isCorrect =
        direction === "higher"
          ? nextItem.value > currentItem.value
          : nextItem.value < currentItem.value;

      const guessOrigin = originFor(
        activeElement,
        direction === "higher" ? '[aria-label="Higher"]' : '[aria-label="Lower"]',
      );
      emitAtmosphere({
        type: "guess",
        direction,
        source: guessSourceRef.current === "keyboard" ? "keyboard" : "pointer",
        x: guessOrigin.x,
        y: guessOrigin.y,
        w: guessOrigin.w,
        h: guessOrigin.h,
      });
      const prospectiveScore = score + (isCorrect ? 1 : 0);
      emitAtmosphere({
        type: "reveal",
        correct: isCorrect,
        tier: resolveTier(
          prospectiveScore,
          highScore > 0 && prospectiveScore > highScore,
        ),
        origin: gameplayStatusOrigin(),
      });
      const deltaOrigin = originFor(
        document.querySelector('[role="timer"]'),
        '[role="timer"]',
      );

      setPhase("revealing");
      setTint(isCorrect ? "correct" : "incorrect");
      emitAtmosphere({ type: "phase", phase: "revealing" });

      if (isCorrect) {
        timerRef.current = Math.min(timerRef.current + BONUS_CORRECT, 999);
        setDisplayTime(timerRef.current);
        deltaKeyRef.current += 1;
        setDeltaLabel({
          key: deltaKeyRef.current,
          text: `+${BONUS_CORRECT}s`,
          color: "text-emerald-400",
        });
        emitAtmosphere({ type: "delta", kind: "gain", origin: deltaOrigin });
      } else {
        timerRef.current = Math.max(0, timerRef.current - PENALTY_WRONG);
        setDisplayTime(timerRef.current);
        deltaKeyRef.current += 1;
        setDeltaLabel({
          key: deltaKeyRef.current,
          text: `-${PENALTY_WRONG}s`,
          color: "text-rose-400",
        });
        emitAtmosphere({ type: "delta", kind: "loss", origin: deltaOrigin });
        setShaking(true);
        setTimeout(() => setShaking(false), 460);
      }

      const delay = isCorrect ? REVEAL_MS_CORRECT : REVEAL_MS_WRONG;

      setTimeout(() => {
        setTint(null);
        if (isCorrect) setScore((prev) => prev + 1);

        // Advance deck using refs (no stale closure)
        const prevDeck = deckRef.current;
        const consumed = prevDeck[0];
        const remaining = prevDeck.slice(1);
        const newSeen = new Set(seenIdsRef.current);
        newSeen.add(consumed.id);

        if (remaining.length < 2) {
          // The available pool is genuinely exhausted for this session.
          // End the run cleanly via the existing game-over path; never
          // recycle already-seen items to keep the timer running.
          setSeenIds(newSeen);
          phaseRef.current = "game-over";
          guessLocked.current = true;
          setPhase("game-over");
          setTint(null);
          emitAtmosphere({ type: "phase", phase: "game-over" });
          return;
        }

        setDeck(remaining);
        setSeenIds(newSeen);

        if (phaseRef.current !== "game-over") {
          phaseRef.current = "playing";
          setPhase("playing");
          emitAtmosphere({ type: "phase", phase: "playing" });
        }
        guessLocked.current = false;
      }, delay);
    },
    [nextItem, currentItem, score, highScore],
  );

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (shouldIgnoreShortcut(e)) return;
      if (e.key === "ArrowUp" || e.key === "h") {
        guessSourceRef.current = "keyboard";
        handleGuess("higher");
        guessSourceRef.current = null;
      }
      if (e.key === "ArrowDown" || e.key === "l") {
        guessSourceRef.current = "keyboard";
        handleGuess("lower");
        guessSourceRef.current = null;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleGuess]);

  // ── Play again ─────────────────────────────────────────────────────────────
  function handlePlayAgain() {
    guessLocked.current = false;
    scoreWrittenRef.current = false;
    const newDeck = shuffleDeck(initialPool);
    setDeck(newDeck);
    setSeenIds(new Set());
    setScore(0);
    timerRef.current = INITIAL_TIME;
    setDisplayTime(INITIAL_TIME);
    setTint(null);
    setShaking(false);
    setDeltaLabel(null);
    phaseRef.current = "playing";
    setPhase("playing");
    emitAtmosphere({ type: "phase", phase: "playing" });
    startTimer();
  }

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!currentItem || !nextItem) {
    return (
      <GameplayShell
        mode="time-attack"
        title={`${categoryLabel} · Time Attack`}
      >
        <DerivedGameState kind="empty" />
      </GameplayShell>
    );
  }

  // ── Timer display helpers ──────────────────────────────────────────────────
  const isUrgent = displayTime <= 10 && phase !== "game-over";
  const timerPct = Math.min(100, (displayTime / INITIAL_TIME) * 100);

  return (
    <GameplayShell
      mode="time-attack"
      title={`${categoryLabel} · Time Attack`}
      subtitle="Race the clock"
      status={
        <GameplayEntranceStatus>
          <div className="flex items-center gap-11">
            <GameplayStatus
              value={displayScore}
              label="Score"
              bump={displayScore > 0}
              tier={tier}
            />
            {highScore > 0 && <GameplayStatus value={highScore} label="Best" />}
          </div>
        </GameplayEntranceStatus>
      }
      headerFooter={
        <div className="flex items-center gap-4">
          {/* Single numeric countdown — the redundant "second(s) left" copy is
              intentionally omitted; the progress bar conveys remaining time. */}
          <div className="relative shrink-0">
            <div
              role="timer"
              aria-label={`${displayTime} seconds remaining`}
              aria-live={isUrgent ? "assertive" : "off"}
              className={`text-3xl font-bold tabular-nums ${isUrgent ? "timer-urgent text-[var(--status-error)]" : "text-[var(--foreground-primary)]"}`}
            >
              {pad2(displayTime)}
            </div>
            {deltaLabel && (
              <span
                key={deltaLabel.key}
                aria-hidden="true"
                className={`${
                  deltaLabel.text.startsWith("-")
                    ? "float-up-brief"
                    : "float-up-reveal"
                } absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold ${deltaLabel.color}`}
              >
                {deltaLabel.text}
              </span>
            )}
          </div>
          <div
            role="progressbar"
            aria-label="Time remaining"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(timerPct)}
            className="h-3 flex-1 overflow-hidden rounded-full bg-white"
          >
            <div
              className="h-full rounded-full bg-[var(--status-success)] transition-[width] duration-1000 ease-linear"
              style={{ width: `${timerPct}%` }}
            />
          </div>
        </div>
      }
    >
      <div
        className={`relative flex min-h-0 flex-1 flex-col gameplay-entrance ${shaking ? "shake" : ""}`}
      >
        <GameplayDivider />

        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute inset-x-0 top-2 z-30 text-center text-xs font-bold uppercase tracking-[0.18em] transition-opacity ${tint !== null ? "opacity-100" : "opacity-0"}`}
        >
          {tint === "correct"
            ? "Correct · +3 seconds"
            : "Incorrect · −5 seconds"}
        </div>

        <ComparisonBoard
          phase={phase}
          current={
            <GameCard
              key={currentItem.id}
              item={currentItem}
              revealed
              side="current"
              resultTint={phase === "revealing" ? tint : null}
              mode="time-attack"
              enterHandoff={enterHandoff}
            />
          }
          next={
            <GameCard
              key={nextItem.id}
              item={nextItem}
              revealed={phase === "revealing"}
              side="next"
              resultTint={phase === "revealing" ? tint : null}
              mode="time-attack"
              enterHandoff={enterHandoff}
              enterDelay={0.04}
            />
          }
        />

        {phase !== "game-over" && (
          <DecisionControls
            onHigher={() => handleGuess("higher")}
            onLower={() => handleGuess("lower")}
            disabled={phase !== "playing"}
            className="gameplay-entrance-controls relative z-30 px-4 pb-8 md:ml-auto md:mr-0 md:w-1/2 md:px-0 md:pr-6 lg:pr-10"
          />
        )}
      </div>

      {phase === "game-over" && (
        <div
          ref={gameOverDialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="time-attack-game-over-title"
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const actions = gameOverDialogRef.current?.querySelectorAll<HTMLElement>(
              'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
            );
            if (!actions?.length) return;
            const first = actions[0];
            const last = actions[actions.length - 1];
            if (event.shiftKey && (document.activeElement === first || !gameOverDialogRef.current?.contains(document.activeElement))) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !gameOverDialogRef.current?.contains(document.activeElement))) {
              event.preventDefault();
              first.focus();
            }
          }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-[#15122b]/90 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md border-2 border-white bg-[var(--surface-raised)] p-7 text-center shadow-[8px_8px_0_var(--accent-time-attack)]">
            <div className="mb-2 flex items-center justify-center gap-2 text-[var(--accent-time-attack)]">
              <Timer size={22} strokeWidth={2} />
              <h2
                id="time-attack-game-over-title"
                className="text-2xl font-bold uppercase"
              >
                Time&apos;s up
              </h2>
            </div>
            <p className="mb-6 text-sm text-[var(--foreground-muted)]">
              {categoryLabel} · Time Attack
            </p>

            <div className="mb-6 flex justify-center gap-10">
              <GameplayStatus value={score} label="Correct" />
              <GameplayStatus
                value={Math.max(score, highScore)}
                label={score > highScore ? "New best" : "Best"}
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                ref={gameOverActionRef}
                id="btn-play-again"
                onClick={handlePlayAgain}
                className="min-h-12 border-2 border-white bg-[var(--accent-highlight)] px-5 py-3 font-bold uppercase text-[#15122b] shadow-[5px_5px_0_#ffffff] transition-transform hover:-translate-y-1"
              >
                Play again
              </button>
              <Link
                href="/"
                id="btn-back-to-menu"
                className="flex min-h-12 items-center justify-center gap-2 border-2 border-white px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white/10"
              >
                <ArrowLeft size={14} strokeWidth={2} />
                Back to setup
              </Link>
            </div>
          </div>
        </div>
      )}
    </GameplayShell>
  );
}
