/**
 * ClassicGame — client-side game logic for Classic Mode.
 *
 * Deck system (remaining-pool model):
 *   - `deck` is the ordered queue of items not yet shown this cycle.
 *   - `currentItem` and `nextItem` are always the first two from the deck.
 *   - On a correct guess the deck pointer advances by 1 (currentItem consumed)
 *     and the consumed item's ID is recorded in `seenIds`.
 *   - An item ID cannot repeat until the whole available pool has been
 *     consumed. When fewer than 2 items remain, a new shuffled cycle is built
 *     from the full original pool, excluding the currently displayed item so
 *     it cannot immediately reappear across the cycle boundary.
 *   - Classic never ends because the pool was completed; it is endless.
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
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { buildDeck, buildNextCycle, shuffleDeck } from "@/lib/game/deck";
import { emitAtmosphere } from "@/lib/atmosphere/eventBus";
import { gameplayStatusOrigin, originFor } from "@/lib/atmosphere/delegation";
import { shouldIgnoreGameplayShortcut } from "@/lib/game/keyboard";

// ─── Types ────────────────────────────────────────────────────────────────────

type GamePhase = "playing" | "revealing" | "game-over";
type GuessDirection = "higher" | "lower";
type ResultTint = "correct" | "incorrect" | null;

/**
 * Display-only reward ladder. Reads state that already exists (`score` and the
 * stored best) and never feeds back into gameplay. Rungs:
 *   1 = first correct · 2 = two · 3 = three or four · 4 = five or a new best.
 * Beating an existing best counts only once the run is already meaningful
 * (>= 3), and only when there is a best to beat — otherwise a first-ever run
 * (best 0) would read as a milestone on every answer.
 */
function resolveTier(score: number, isNewBest: boolean): IntensityTier {
  if (score >= 5 || (isNewBest && score >= 3)) return 4;
  if (score >= 3) return 3;
  if (score === 2) return 2;
  if (score === 1) return 1;
  return 0;
}

interface ClassicGameProps {
  initialPool: GameItem[];
  categoryId: SemanticCategoryId;
  categoryLabel: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassicGame({
  initialPool,
  categoryId,
  categoryLabel,
}: ClassicGameProps) {
  const router = useRouter();
  const [deck, setDeck] = useState<GameItem[]>(() => buildDeck(initialPool));
  // IDs consumed during the current cycle. Reset when a new cycle begins.
  const [seenIds, setSeenIds] = useState<Set<string | number>>(() => new Set());

  const currentItem = deck[0];
  const nextItem = deck[1];

  const [phase, setPhase] = useState<GamePhase>("playing");
  const [score, setScore] = useState(0);
  const [tint, setTint] = useState<ResultTint>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [confirmAbort, setConfirmAbort] = useState(false);

  // The handoff plays on every deck swap but never on the first paint. The
  // opening item is captured in state once, so the flag is already correct in
  // the same commit that swaps the cards — no effect round-trip needed.
  const [openingItemId] = useState(() => currentItem?.id);
  const enterHandoff = currentItem?.id !== openingItemId;

  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set only around a keyboard-initiated guess, so the emitted `source` is
  // exact. Purely informational: it changes no gameplay state.
  const guessSourceRef = useRef<"pointer" | "keyboard" | null>(null);
  const gameOverActionRef = useRef<HTMLButtonElement>(null);
  const gameOverDialogRef = useRef<HTMLDivElement>(null);
  const gameOverOriginRef = useRef<HTMLElement | null>(null);
  const previousPhaseRef = useRef<GamePhase>(phase);

  const getHighScoreSnapshot = useCallback(
    () => readHighScore({ mode: "classic", categoryId }),
    [categoryId],
  );
  const highScore = useSyncExternalStore(
    subscribeHighScores,
    getHighScoreSnapshot,
    () => 0,
  );

  // The tally is a reveal beat (design §4.3 t1), not an advance beat. The score
  // state itself still lands inside the untouched 1500 ms reveal timer, so a
  // correct reveal reads the prospective score for display. Display-only: no
  // gameplay state, timer, deck, or handler is changed.
  const isRevealCorrect = phase === "revealing" && lastCorrect === true;
  const displayScore = isRevealCorrect ? score + 1 : score;

  // Display-only ladder position and the fixed off-ladder wrong beat. A new
  // best only counts when a best already exists to beat.
  const tier = resolveTier(
    displayScore,
    highScore > 0 && displayScore > highScore,
  );
  const wrongBeat = phase === "revealing" && lastCorrect === false;

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === "game-over") {
      const focusTimer = requestAnimationFrame(() => {
        gameOverActionRef.current?.focus();
      });
      return () => cancelAnimationFrame(focusTimer);
    } else if (previousPhaseRef.current === "game-over" && phase === "playing") {
      const origin = gameOverOriginRef.current;
      const nextAction = document.querySelector<HTMLButtonElement>(
        '[aria-keyshortcuts="ArrowUp H"]',
      );
      if (origin?.isConnected) origin.focus();
      else nextAction?.focus();
      gameOverOriginRef.current = null;
    }
    previousPhaseRef.current = phase;
  }, [phase]);

  // ── Guess handler ──────────────────────────────────────────────────────────

  const handleGuess = useCallback(
    (direction: GuessDirection) => {
      if (phase !== "playing" || !nextItem) return;
      const activeElement = document.activeElement;
      gameOverOriginRef.current =
        activeElement instanceof HTMLElement &&
        activeElement !== document.body &&
        activeElement !== document.documentElement
          ? activeElement
          : null;

      // Strict comparison: equal values are treated as wrong for both directions.
      // dedupeAdjacentEquals() prevents equal pairs from appearing, so this is
      // a safety net for any edge case that slips through.
      const isCorrect =
        direction === "higher"
          ? nextItem.value > currentItem.value
          : nextItem.value < currentItem.value;

      // Semantic emits: the guess origin is the control the player acted on,
      // and the reveal is emitted on the beat it actually happens. Both are
      // display-only; no gameplay state, timing or scoring value is touched.
      const guessOrigin = originFor(
        activeElement,
        direction === "higher" ? '[aria-keyshortcuts="ArrowUp H"]' : '[aria-keyshortcuts="ArrowDown L"]',
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

      setPhase("revealing");
      setTint(isCorrect ? "correct" : "incorrect");
      setLastCorrect(isCorrect);
      emitAtmosphere({ type: "phase", phase: "revealing" });

      revealTimerRef.current = setTimeout(() => {
        setTint(null);
        emitAtmosphere({ type: "phase", phase: isCorrect ? "playing" : "game-over" });

        if (isCorrect) {
          const newScore = score + 1;
          setScore(newScore);

          const consumed = deck[0];
          const remaining = deck.slice(1);
          const newSeen = new Set(seenIds);
          newSeen.add(consumed.id);

          if (remaining.length < 2) {
            // Cycle nearly exhausted: carry the unshown tail (0 or 1 items)
            // into a fresh shuffled cycle so no item is skipped and the
            // currently displayed item cannot immediately reappear at the
            // boundary. `seenIds` resets for the new cycle.
            setDeck(buildNextCycle(initialPool, remaining, consumed.id));
            setSeenIds(new Set());
          } else {
            setDeck(remaining);
            setSeenIds(newSeen);
          }

          setPhase("playing");
          setLastCorrect(null);
        } else {
          if (score > highScore) {
            writeHighScore({ mode: "classic", categoryId }, score);
          }
          setPhase("game-over");
        }
      }, 1500);
    },
    [
      phase,
      nextItem,
      currentItem,
      score,
      highScore,
      deck,
      seenIds,
      categoryId,
      initialPool,
    ],
  );

  // ── Keyboard support ───────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (shouldIgnoreGameplayShortcut(e)) return;
      const key = e.key.toLowerCase();
      if (e.key === "ArrowUp" || key === "h") {
        e.preventDefault();
        guessSourceRef.current = "keyboard";
        handleGuess("higher");
        guessSourceRef.current = null;
      } else if (e.key === "ArrowDown" || key === "l") {
        e.preventDefault();
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
    setDeck(shuffleDeck(initialPool));
    setSeenIds(new Set());
    setScore(0);
    setPhase("playing");
    setTint(null);
    setLastCorrect(null);
    emitAtmosphere({ type: "phase", phase: "playing" });
  }

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (!currentItem || !nextItem) {
    return (
      <GameplayShell mode="classic" title={`${categoryLabel} · Classic`}>
        <DerivedGameState kind="empty" />
      </GameplayShell>
    );
  }

  return (
    <GameplayShell
      mode="classic"
      title={`${categoryLabel} · Classic`}
      onBack={phase !== "game-over" ? () => setConfirmAbort(true) : undefined}
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
    >
      <div className="relative flex min-h-0 flex-1 flex-col gameplay-entrance">
        <GameplayDivider />

        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {phase === "playing" && currentItem && nextItem
            ? `Compare: ${currentItem.name}, ${currentItem.displayValue}. Is ${nextItem.name} higher or lower? Score: ${displayScore}. Press Up arrow for higher or Down arrow for lower.`
            : phase === "revealing" && lastCorrect !== null && nextItem
              ? `${lastCorrect ? "Correct" : "Incorrect"}! ${nextItem.name} is ${nextItem.displayValue}. Score: ${displayScore}.`
              : phase === "game-over"
                ? `Game over. Final score: ${score}.`
                : ""}
        </div>

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-3 z-30 text-center text-xs font-bold uppercase tracking-[0.18em] transition-opacity ${phase === "revealing" && lastCorrect !== null ? "opacity-100" : "opacity-0"}`}
        >
          {phase === "revealing" && lastCorrect !== null ? (lastCorrect ? "Correct" : "Incorrect") : ""}
        </div>

        <ComparisonBoard
          phase={phase}
          className={wrongBeat ? "shake-brief" : undefined}
          current={
            <GameCard
              key={currentItem.id}
              item={currentItem}
              revealed
              side="current"
              resultTint={phase === "revealing" ? tint : null}
              mode="classic"
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
              mode="classic"
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

      {/* ── Game Over modal ─────────────────────────────────────────────── */}
      {phase === "game-over" && (
        <div
          ref={gameOverDialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="classic-game-over-title"
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
          <div className="w-full max-w-md border-2 border-white bg-[var(--surface-raised)] p-7 text-center shadow-[8px_8px_0_var(--accent-classic)]">
            <h2
              id="classic-game-over-title"
              className="mb-3 text-2xl font-bold uppercase text-[var(--status-error)]"
            >
              Game over
            </h2>
            <p className="mb-6 text-sm text-[var(--foreground-muted)]">
              <span className="font-bold text-white">{nextItem.name}</span> was{" "}
              <span className="font-bold text-[var(--accent-highlight)]">
                {nextItem.displayValue}
              </span>
            </p>

            <div className="mb-6 flex justify-center gap-10">
              <GameplayStatus value={score} label="Score" />
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
      {confirmAbort && phase !== "game-over" && (
        <div role="dialog" aria-modal="true" aria-labelledby="classic-abort-title" className="absolute inset-0 z-[60] flex items-center justify-center bg-[#15122b]/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border-2 border-white bg-[var(--surface-raised)] p-7 text-center shadow-[8px_8px_0_var(--accent-classic)]">
            <h2 id="classic-abort-title" className="text-2xl font-bold uppercase">Abort this game?</h2>
            <p className="mt-3 text-sm text-[var(--foreground-muted)]">Your current run and score will be lost.</p>
            <div className="mt-6 flex gap-3"><button autoFocus className="min-h-11 flex-1 border-2 border-white px-4 text-xs font-bold uppercase" onClick={() => setConfirmAbort(false)}>Keep playing</button><button className="min-h-11 flex-1 bg-[var(--status-error)] px-4 text-xs font-bold uppercase text-white" onClick={() => router.push("/")}>Abort game</button></div>
          </div>
        </div>
      )}
    </GameplayShell>
  );
}
