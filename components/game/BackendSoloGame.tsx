"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, TriangleAlert } from "lucide-react";
import GameCard from "@/components/game/GameCard";
import GameplayShell, { type GameplayMode } from "@/components/game/GameplayShell";
import ComparisonBoard from "@/components/game/ComparisonBoard";
import GameplayDivider from "@/components/game/GameplayDivider";
import DecisionControls from "@/components/game/DecisionControls";
import GameplayStatus from "@/components/game/GameplayStatus";
import type { GameItem } from "@/types/api";
import type { SemanticCategoryId } from "@/types/game";
import {
  answerSoloQuestion,
  createSoloSession,
  endSoloSession,
  getSoloResults,
  getSoloSession,
} from "@/lib/backend/client";
import { BackendApiError } from "@/lib/backend/types";
import { emitAtmosphere } from "@/lib/atmosphere/eventBus";
import { gameplayStatusOrigin, originFor } from "@/lib/atmosphere/delegation";
import type {
  SoloAnswerReceipt,
  SoloChoice,
  SoloMode,
  SoloResults,
  SoloSessionState,
} from "@/lib/backend/types";

interface BackendSoloGameProps {
  playsetId: string;
  categoryId?: SemanticCategoryId;
  categoryLabel: string;
  mode: GameplayMode;
}

interface Credential {
  sessionId: string;
  gameToken: string;
  playsetId: string;
  mode: SoloMode;
}

type GamePhase = "loading" | "playing" | "revealing" | "game-over" | "error";

function isCredential(value: unknown): value is Credential {
  return typeof value === "object" && value !== null &&
    typeof (value as Credential).sessionId === "string" &&
    typeof (value as Credential).gameToken === "string" &&
    typeof (value as Credential).playsetId === "string" &&
    ((value as Credential).mode === "CLASSIC" || (value as Credential).mode === "TIME_ATTACK");
}

function toGameItem(item: SoloSessionState["left"]): GameItem | null {
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl ?? "",
    value: 0,
    displayValue: item.displayValue ?? "",
    attribution: item.attribution ?? undefined,
  };
}

function requestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isIgnoredKeyTarget(event: KeyboardEvent): boolean {
  if (document.querySelector('[role="dialog"], dialog[open], [aria-modal="true"]')) return true;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("input, textarea, select, button, a[href], [contenteditable], [role='button']"));
}

import { writeHighScore } from "@/lib/highScores/storage";

export default function BackendSoloGame({ playsetId, categoryId, categoryLabel, mode }: BackendSoloGameProps) {
  const router = useRouter();
  const apiMode: SoloMode = mode === "time-attack" ? "TIME_ATTACK" : "CLASSIC";
  const storageKey = useMemo(() => `higher-lower:solo:v1:${apiMode}:${playsetId}`, [apiMode, playsetId]);
  const [state, setState] = useState<SoloSessionState | null>(null);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [answerCorrect, setAnswerCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<SoloResults | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [now, setNow] = useState(0);
  const [enterHandoff, setEnterHandoff] = useState(false);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const restoreStarted = useRef(false);
  const answerLocked = useRef(false);
  const expiryRefreshPending = useRef(false);
  const modeTitle = mode === "classic" ? "Classic" : "Time Attack";
  const openingState = state;
  const leftItem = toGameItem(openingState?.left ?? null);
  const rightItem = toGameItem(openingState?.right ?? null);
  const displayedScore = openingState?.score ?? 0;
  const localNow = now || (openingState?.serverNow ?? 0) - serverOffsetMs;
  const timeRemaining = openingState?.expiresAt === null || openingState?.expiresAt === undefined
    ? null
    : Math.max(0, Math.ceil((openingState.expiresAt - (localNow + serverOffsetMs)) / 1000));

  const saveCredential = useCallback((next: Credential) => {
    sessionStorage.setItem(storageKey, JSON.stringify(next));
    setCredential(next);
  }, [storageKey]);

  const applyState = useCallback((next: SoloSessionState, receivedAt = Date.now()) => {
    setState((previous) => {
      // Keep the last revealed pair visible over the results panel when the
      // terminal state itself has no active question.
      if (next.phase === "FINISHED" && !next.left && !next.right && previous?.revealed) {
        return { ...next, left: previous.left, right: previous.right, revealed: true };
      }
      return next;
    });
    setServerOffsetMs(next.serverNow - receivedAt);
    setAnswerCorrect(null);
    if (next.phase === "AWAITING_ANSWER") setPhase("playing");
    else if (next.phase === "REVEAL") setPhase("revealing");
    else setPhase("game-over");
    setEnterHandoff((was) => was || next.stateVersion > 1);
  }, []);

  const createFreshSession = useCallback(async () => {
    setPhase("loading");
    setBusy(true);
    setError(null);
    try {
      const response = await createSoloSession({ playsetId, mode: apiMode });
      const nextCredential: Credential = {
        sessionId: response.sessionId,
        gameToken: response.gameToken,
        playsetId,
        mode: apiMode,
      };
      saveCredential(nextCredential);
      applyState(response.state);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start the game. Please try again.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [apiMode, applyState, playsetId, saveCredential]);

  useEffect(() => {
    if (restoreStarted.current) return;
    restoreStarted.current = true;
    const raw = sessionStorage.getItem(storageKey);
    let saved: unknown = null;
    try {
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      sessionStorage.removeItem(storageKey);
    }
    if (!isCredential(saved) || saved.playsetId !== playsetId || saved.mode !== apiMode) {
      void createFreshSession();
      return;
    }
    setCredential(saved);
    setBusy(true);
    getSoloSession(saved.sessionId, saved.gameToken)
      .then((restored) => {
        // A finished run must not be resumed as if it were a new game: pressing
        // Play again would otherwise replay the old score.
        if (restored.status !== "RUNNING") {
          sessionStorage.removeItem(storageKey);
          void createFreshSession();
          return;
        }
        applyState(restored);
      })
      .catch((cause: unknown) => {
        if (cause instanceof BackendApiError && [401, 403, 404].includes(cause.status ?? 0)) {
          sessionStorage.removeItem(storageKey);
          void createFreshSession();
          return;
        }
        setError(cause instanceof Error ? cause.message : "Could not restore the game.");
        setPhase("error");
      })
      .finally(() => setBusy(false));
  }, [apiMode, applyState, createFreshSession, playsetId, storageKey]);

  const refreshState = useCallback(async () => {
    if (!credential) return null;
    const next = await getSoloSession(credential.sessionId, credential.gameToken);
    applyState(next);
    return next;
  }, [applyState, credential]);

  const completeAnswer = useCallback(async (receipt: SoloAnswerReceipt) => {
    if (!credential) return;
    setState((previous) => previous ? {
      ...previous,
      questionId: receipt.questionId,
      stateVersion: receipt.stateVersion,
      serverNow: receipt.serverNow,
      phase: receipt.phase,
      status: receipt.status,
      score: receipt.score,
      expiresAt: receipt.expiresAt,
      revealEndsAt: receipt.revealEndsAt,
      revealed: true,
      left: receipt.left,
      right: receipt.right,
      runtimeStatus: receipt.runtimeStatus,
    } : previous);
    setServerOffsetMs(receipt.serverNow - Date.now());
    setAnswerCorrect(receipt.correct);
    setPhase("revealing");
    emitAtmosphere({ type: "phase", phase: "revealing" });
    emitAtmosphere({ type: "reveal", correct: receipt.correct, tier: receipt.correct ? 3 : 0, origin: gameplayStatusOrigin() });

    const remainingRevealMs = Math.max(0, (receipt.revealEndsAt ?? receipt.serverNow) - (Date.now() + (receipt.serverNow - Date.now())));
    await new Promise((resolve) => setTimeout(resolve, remainingRevealMs + 80));

    // The API advances only after its authoritative reveal deadline. Re-read
    // until the next question opens or the session is terminal.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const next = await getSoloSession(credential.sessionId, credential.gameToken);
        if (next.phase !== "REVEAL" || next.stateVersion !== receipt.stateVersion) {
          applyState(next);
          return;
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Connection interrupted while advancing.");
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!error) setError("The next question is taking longer than expected. Retry to reconnect.");
  }, [applyState, credential, error]);

  const submitAnswer = useCallback(async (choice: SoloChoice, source: "pointer" | "keyboard" = "pointer") => {
    if (!credential || !state?.questionId || state.phase !== "AWAITING_ANSWER" || answerLocked.current) return;
    answerLocked.current = true;
    setBusy(true);
    setError(null);
    const id = requestId();
    const input = { sessionId: credential.sessionId, gameToken: credential.gameToken, questionId: state.questionId, choice, requestId: id };
    emitAtmosphere({ type: "guess", direction: choice === "HIGHER" ? "higher" : "lower", source, ...originFor(document.activeElement, ".gameplay-entrance-controls") });
    try {
      let receipt: SoloAnswerReceipt;
      try {
        receipt = await answerSoloQuestion(input);
      } catch (firstError) {
        // A lost response is ambiguous. Read authoritative state first; if the
        // same question remains open, retry with the identical idempotency key.
        const latest = await getSoloSession(credential.sessionId, credential.gameToken);
        if (latest.questionId !== input.questionId || latest.phase !== "AWAITING_ANSWER") {
          if (latest.phase === "REVEAL" && latest.revealed) {
            const recovered: SoloAnswerReceipt = {
              questionId: latest.questionId ?? input.questionId,
              requestId: id,
              choice,
              correct: false,
              correctChoice: choice,
              score: latest.score,
              phase: latest.phase,
              status: latest.status,
              eliminated: false,
              stateVersion: latest.stateVersion,
              serverNow: latest.serverNow,
              expiresAt: latest.expiresAt,
              revealEndsAt: latest.revealEndsAt,
              left: latest.left!,
              right: latest.right!,
              runtimeStatus: latest.runtimeStatus,
            };
            await completeAnswer(recovered);
            return;
          }
          applyState(latest);
          throw firstError;
        }
        receipt = await answerSoloQuestion(input);
      }
      await completeAnswer(receipt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your answer was not confirmed. Retry safely.");
      setPhase("error");
    } finally {
      answerLocked.current = false;
      setBusy(false);
    }
  }, [applyState, completeAnswer, credential, state]);

  const retryConnection = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await refreshState();
      if (next?.phase === "REVEAL" && next.questionId && credential) {
        // The answer receipt may have been lost. State is already revealed, so
        // no numeric comparison is needed to continue the game.
        const revealReceipt: SoloAnswerReceipt = {
          questionId: next.questionId,
          requestId: "recovered",
          choice: "HIGHER",
          correct: false,
          correctChoice: "HIGHER",
          score: next.score,
          phase: next.phase,
          status: next.status,
          eliminated: false,
          stateVersion: next.stateVersion,
          serverNow: next.serverNow,
          expiresAt: next.expiresAt,
          revealEndsAt: next.revealEndsAt,
          left: next.left!,
          right: next.right!,
          runtimeStatus: next.runtimeStatus,
        };
        await completeAnswer(revealReceipt);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Still unable to reach the game service.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [completeAnswer, credential, refreshState]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mode !== "time-attack" || !credential || timeRemaining !== 0 || expiryRefreshPending.current || phase === "game-over") return;
    expiryRefreshPending.current = true;
    getSoloSession(credential.sessionId, credential.gameToken)
      .then((next) => applyState(next))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not confirm the timer result."))
      .finally(() => { expiryRefreshPending.current = false; });
  }, [applyState, credential, mode, phase, timeRemaining]);

  useEffect(() => {
    if (phase !== "game-over" || state?.status !== "FINISHED") return;
    if (!categoryId) return;
    const finalScore = Math.max(0, Math.trunc(Number(state.score) || 0));
    writeHighScore({ mode: apiMode === "TIME_ATTACK" ? "time-attack" : "classic", categoryId }, finalScore);
  }, [apiMode, categoryId, phase, playsetId, state?.score, state?.status]);

  useEffect(() => {
    if (phase !== "game-over" || !credential || state?.status !== "FINISHED") return;
    let cancelled = false;
    const fetchResults = async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          const finalResults = await getSoloResults(credential.sessionId, credential.gameToken);
          if (!cancelled) setResults(finalResults);
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
    };
    void fetchResults();
    return () => { cancelled = true; };
  }, [credential, phase, state?.status]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isIgnoredKeyTarget(event) || busy || phase !== "playing") return;
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "h") {
        event.preventDefault();
        void submitAnswer("HIGHER", "keyboard");
      } else if (event.key === "ArrowDown" || event.key.toLowerCase() === "l") {
        event.preventDefault();
        void submitAnswer("LOWER", "keyboard");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, phase, submitAnswer]);

  const backHref = "/";
  const abortGame = useCallback(async () => {
    if (credential && state?.status === "RUNNING") {
      try { await endSoloSession(credential.sessionId, credential.gameToken); } catch { /* local exit remains available */ }
    }
    sessionStorage.removeItem(storageKey);
    router.replace(backHref);
  }, [backHref, credential, router, state?.status, storageKey]);
  if (phase === "loading") {
    return (
      <GameplayShell mode={mode} title={`${categoryLabel} · ${modeTitle}`}>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center" aria-live="polite" aria-busy="true">
          <LoaderCircle className="animate-spin text-[var(--focus-ring)] motion-reduce:animate-none" size={32} />
          <h2 className="text-xl font-bold uppercase text-white">Connecting to game service</h2>
          <p className="max-w-md text-sm text-[var(--foreground-muted)]">The free service may be waking up. Your game will start as soon as it is ready.</p>
        </main>
      </GameplayShell>
    );
  }

    if (phase === "error" || !state || ((!leftItem || !rightItem) && phase !== "game-over")) {
    return (
      <GameplayShell mode={mode} title={`${categoryLabel} · ${modeTitle}`}>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center" aria-live="assertive">
          <TriangleAlert className="text-[var(--accent-highlight)]" size={30} />
          <h2 className="text-xl font-bold uppercase text-white">{phase === "error" && state ? "Reconnecting to your game" : "Unable to start this game"}</h2>
          <p className="max-w-lg text-sm text-[var(--foreground-muted)]">{error ?? "The game service did not return a playable comparison."}</p>
          <button onClick={() => void retryConnection()} disabled={busy} className="min-h-12 border-2 border-white bg-[var(--surface-background)] px-5 py-3 text-sm font-bold uppercase text-white shadow-[5px_5px_0_var(--accent-classic)] disabled:opacity-50">
            {busy ? "Reconnecting…" : "Retry"}
          </button>
          <Link href={backHref} className="text-sm font-bold uppercase text-white underline underline-offset-4">Back to setup</Link>
        </main>
      </GameplayShell>
    );
  }

  const tint = phase === "revealing" ? (answerCorrect ? "correct" : "incorrect") : null;
  const isTerminal = phase === "game-over";
  const score = results?.score ?? displayedScore;
  const timerPercent = timeRemaining === null ? null : Math.min(100, Math.max(0, (timeRemaining / 60) * 100));

  return (
    <GameplayShell
      mode={mode}
      title={`${categoryLabel} · ${modeTitle}`}
      subtitle={mode === "time-attack" ? "Race the clock" : "Higher or Lower"}
      status={<div className="flex items-center gap-5"><GameplayStatus value={displayedScore} label="Score" bump={displayedScore > 0} /></div>}
      headerFooter={mode === "time-attack" && timeRemaining !== null ? (
        <div className="flex items-center gap-4">
          <div role="timer" aria-label={`${timeRemaining} seconds remaining`} className={`text-3xl font-bold tabular-nums ${timeRemaining <= 10 ? "timer-urgent text-[var(--status-error)]" : "text-white"}`}>{String(timeRemaining).padStart(2, "0")}</div>
          <div role="progressbar" aria-label="Time remaining" aria-valuemin={0} aria-valuemax={60} aria-valuenow={timeRemaining} className="h-3 flex-1 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[var(--status-success)] transition-[width] duration-1000 ease-linear" style={{ width: `${timerPercent ?? 0}%` }} />
          </div>
        </div>
      ) : undefined}
      onBack={!isTerminal ? () => setConfirmAbort(true) : undefined}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gameplay-entrance">
        <GameplayDivider />
        <div role="status" aria-live="polite" className={`pointer-events-none absolute inset-x-0 top-3 z-30 text-center text-xs font-bold uppercase tracking-[0.18em] transition-opacity ${phase === "revealing" ? "opacity-100" : "opacity-0"}`}>
          {phase === "revealing" ? (answerCorrect ? "Correct" : "Incorrect") : ""}
        </div>
        {leftItem && rightItem && (
          <ComparisonBoard
            phase={phase === "revealing" ? "revealing" : phase === "game-over" ? "game-over" : "playing"}
            current={<GameCard key={leftItem.id} item={leftItem} revealed side="current" resultTint={tint} mode={mode} enterHandoff={enterHandoff} />}
            next={<GameCard key={rightItem.id} item={rightItem} revealed={state.revealed} side="next" resultTint={tint} mode={mode} enterHandoff={enterHandoff} enterDelay={0.04} />}
          />
        )}
        {!isTerminal && (
          <DecisionControls
            onHigher={() => void submitAnswer("HIGHER")}
            onLower={() => void submitAnswer("LOWER")}
            disabled={busy || state.phase !== "AWAITING_ANSWER"}
            className="gameplay-entrance-controls relative z-30 px-4 pb-8 md:ml-auto md:mr-0 md:w-1/2 md:px-0 md:pr-6 lg:pr-10"
          />
        )}
        {error && <p role="status" className="mx-auto mb-4 max-w-lg rounded border border-white/30 bg-black/50 px-4 py-2 text-center text-sm text-white">{error} <button className="ml-2 underline" onClick={() => void retryConnection()}>Reconnect</button></p>}
      </div>
      {isTerminal && (
        <div role="dialog" aria-modal="true" aria-labelledby="backend-game-over-title" className="absolute inset-0 z-50 flex items-center justify-center bg-[#15122b]/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border-2 border-white bg-[var(--surface-raised)] p-7 text-center shadow-[8px_8px_0_var(--gameplay-accent)]">
            <h2 id="backend-game-over-title" className="mb-3 text-2xl font-bold uppercase text-[var(--status-error)]">{mode === "time-attack" ? "Time's up!" : "Game over"}</h2>
            <p className="mb-6 text-sm text-[var(--foreground-muted)]">Your result has been saved by the game service.</p>
            <div className="mb-6 flex justify-center"><GameplayStatus value={score} label="Final score" /></div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { sessionStorage.removeItem(storageKey); setResults(null); setState(null); setCredential(null); restoreStarted.current = false; setPhase("loading"); void createFreshSession(); }} className="min-h-12 border-2 border-white bg-[var(--accent-highlight)] px-5 py-3 font-bold uppercase text-[#15122b] shadow-[5px_5px_0_#ffffff] transition-transform hover:-translate-y-1">Play again</button>
              <Link href="/" className="flex min-h-12 items-center justify-center gap-2 border-2 border-white px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white/10"><ArrowLeft size={14} />Back to setup</Link>
            </div>
          </div>
        </div>
      )}
      {confirmAbort && (
        <div role="dialog" aria-modal="true" aria-labelledby="abort-game-title" className="absolute inset-0 z-[60] flex items-center justify-center bg-[#15122b]/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border-2 border-white bg-[var(--surface-raised)] p-7 text-center shadow-[8px_8px_0_var(--gameplay-accent)]">
            <h2 id="abort-game-title" className="text-2xl font-bold uppercase">Abort this game?</h2>
            <p className="mt-3 text-sm text-[var(--foreground-muted)]">Your current run will end and cannot be resumed.</p>
            <div className="mt-6 flex gap-3"><button className="min-h-11 flex-1 border-2 border-white px-4 text-xs font-bold uppercase" onClick={() => setConfirmAbort(false)}>Keep playing</button><button className="min-h-11 flex-1 bg-[var(--status-error)] px-4 text-xs font-bold uppercase text-white" onClick={() => void abortGame()}>Abort game</button></div>
          </div>
        </div>
      )}
    </GameplayShell>
  );
}
