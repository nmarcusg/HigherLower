"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Crown, LoaderCircle, LogOut, RotateCcw, Trophy, Users, UserX, Wifi, WifiOff } from "lucide-react";
import type { Socket } from "socket.io-client";
import {
  clearRoomCredential,
  connectRoom,
  getRoomResults,
  getRoomState,
  kickRoomPlayer,
  readRoomCredential,
  roomAction,
  setLobbyRole,
  storeRoomCredential,
  transferRoomHost,
  updateRoomSettings,
  type MultiplayerSnapshot,
  type StoredRoomCredential,
} from "@/lib/backend/multiplayer";
import { emitAtmosphere } from "@/lib/atmosphere/eventBus";
import { originFor } from "@/lib/atmosphere/delegation";
import { fetchCategories, fetchPublicPlayset, fetchPublicPlaysets } from "@/lib/backend/client";
import type { CategorySummary, PublicPlaysetSummary } from "@/lib/backend";
import {
  PlaysetPickerField,
  buildPlaysetPickerOptions,
  type PlaysetPickerOption,
} from "@/components/multiplayer/PlaysetPickerModal";
import ReportPlaysetDialog from "@/components/playsets/ReportPlaysetDialog";

type Ack = { ok?: boolean; error?: { code?: string; message?: string }; submitted?: boolean };
const CARD = "rounded-md border border-white/20 bg-[#1b1734]/90 p-5 shadow-[0_8px_0_var(--accent-classic)] sm:p-7";
const BUTTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-[var(--accent-time-attack)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const OUTLINE = "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-white/45 px-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-[#15122b] disabled:cursor-not-allowed disabled:opacity-50";

function asText(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
function asNumber(value: unknown, fallback = 0): number { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function object(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null ? value as Record<string, unknown> : {}; }
function readableError(error: unknown): string { return error instanceof Error ? error.message : "The room could not be reached. Reconnecting…"; }
function formatSeconds(milliseconds: number): string { return `${Math.max(0, Math.ceil(milliseconds / 1000))}s`; }
function formatFallbackPlaysetId(id: string): string {
  if (!id) return "";
  const cleaned = id.replace(/^system-/, "").trim();
  if (!cleaned) return id;
  return cleaned
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const LIVE_ENGINE_PHASES = new Set(["COUNTDOWN", "QUESTION", "REVEAL", "FINISHED"]);
const OPTIMIZABLE_IMAGE_HOSTS = new Set([
  "image.tmdb.org",
  "flagcdn.com",
  "upload.wikimedia.org",
  "commons.wikimedia.org",
  "cdn.akamai.steamstatic.com",
  "shared.akamai.steamstatic.com",
  "cdn.cloudflare.steamstatic.com",
  "shared.fastly.steamstatic.com",
  "images.igdb.com",
  "yt3.ggpht.com",
  "static-cdn.jtvnw.net",
  "archive.org",
  "coverartarchive.org",
]);

function isOptimizableImageUrl(src: string): boolean {
  try {
    const parsed = new URL(src);
    if (parsed.protocol !== "https:") return false;
    return OPTIMIZABLE_IMAGE_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

/**
 * Merge an incoming room snapshot without allowing an HTTP RoomStateView
 * (which has `phase: "RUNNING"` and no `question`) to clobber a live Socket.IO
 * engine snapshot, or allowing an out-of-order stateVersion to regress gameplay.
 */
function mergeRoomSnapshot(
  current: MultiplayerSnapshot | null,
  incoming: MultiplayerSnapshot,
): MultiplayerSnapshot {
  if (!current || current.sessionId !== incoming.sessionId) return incoming;

  const preservedRoomCode = incoming.roomCode || current.roomCode;
  const preservedSettings = incoming.settings ?? current.settings;
  const preservedPlaysetId = incoming.playsetId || current.playsetId;
  const preservedPlaysetTitle = incoming.playsetTitle ?? current.playsetTitle;

  // Terminal states always win, preserving room metadata for post-match actions.
  if (incoming.status === "CANCELLED" || incoming.status === "FINISHED") {
    return {
      ...incoming,
      roomCode: preservedRoomCode,
      settings: preservedSettings,
      playsetId: preservedPlaysetId,
      playsetTitle: preservedPlaysetTitle,
      hostActorId: incoming.hostActorId || current.hostActorId,
      you: incoming.you ? { ...current.you, ...incoming.you } : current.you,
    };
  }

  // HTTP lifecycle reads during an active match carry `phase: "RUNNING"` and no
  // `stateVersion` or `question`. Merge only authoritative room/host/forfeit
  // metadata so the host's live countdown or question cards never flash away.
  const currentHasLiveEngine =
    current.status === "RUNNING" &&
    typeof current.phase === "string" &&
    LIVE_ENGINE_PHASES.has(current.phase);
  const incomingIsHttpStub =
    incoming.status === "RUNNING" &&
    (!incoming.phase || incoming.phase === "RUNNING") &&
    !incoming.question &&
    incoming.stateVersion === undefined;

  if (currentHasLiveEngine && incomingIsHttpStub) {
    const nextHostActorId = incoming.hostActorId || current.hostActorId;
    const incomingYou = object(incoming.you);
    return {
      ...current,
      roomCode: preservedRoomCode,
      settings: preservedSettings,
      playsetId: preservedPlaysetId,
      playsetTitle: preservedPlaysetTitle,
      hostActorId: nextHostActorId,
      you: current.you
        ? {
            ...current.you,
            ...(typeof incomingYou.isHost === "boolean" ? { isHost: incomingYou.isHost } : {}),
            ...(typeof incomingYou.eliminated === "boolean" ? { eliminated: incomingYou.eliminated } : {}),
            ...(typeof incomingYou.forfeited === "boolean" ? { forfeited: incomingYou.forfeited } : {}),
            ...(incomingYou.forfeitReason !== undefined ? { forfeitReason: incomingYou.forfeitReason as string | null } : {}),
          }
        : incoming.you,
    };
  }

  // Never regress live engine state to an older stateVersion.
  if (
    current.status === incoming.status &&
    typeof current.stateVersion === "number" &&
    typeof incoming.stateVersion === "number" &&
    current.stateVersion > 0 &&
    incoming.stateVersion > 0 &&
    incoming.stateVersion < current.stateVersion
  ) {
    return current;
  }

  return {
    ...incoming,
    roomCode: preservedRoomCode,
    settings: preservedSettings,
    playsetId: preservedPlaysetId,
    playsetTitle: preservedPlaysetTitle,
    hostActorId: incoming.hostActorId || current.hostActorId,
  };
}

function computeTimers(snap: MultiplayerSnapshot | null, clockOffsetMs: number): [number, number] {
  if (!snap) return [0, 0];
  const adjustedNow = Date.now() + clockOffsetMs;
  const question = object(snap.question);
  const target = snap.phase === "COUNTDOWN"
    ? asNumber(snap.phaseEndsAt, asNumber(snap.startsAt))
    : asNumber(question.closesAt, asNumber(snap.roundClosesAt, asNumber(snap.phaseEndsAt, asNumber(snap.matchEndsAt))));
  const remaining = target ? target - adjustedNow : 0;
  const matchEnd = asNumber(snap.matchEndsAt);
  const matchRemaining = matchEnd ? matchEnd - adjustedNow : 0;
  return [remaining, matchRemaining];
}

export default function RoomExperience({ initialSessionId, initialEntry }: { initialSessionId: string; initialEntry?: StoredRoomCredential["entry"] }) {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const closedRef = useRef(false);
  const clockOffsetRef = useRef(0);
  const myActorIdRef = useRef("");
  const wasHostRef = useRef<boolean | null>(null);
  const [credential, setCredential] = useState<StoredRoomCredential | null>(null);
  const [snapshot, setSnapshot] = useState<MultiplayerSnapshot | null>(null);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [connection, setConnection] = useState<"connecting" | "connected" | "reconnecting" | "closed">("connecting");
  const [message, setMessage] = useState("");
  const [hostNotice, setHostNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [startingMatch, setStartingMatch] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [matchRemainingMs, setMatchRemainingMs] = useState(0);
  const [answering, setAnswering] = useState(false);
  const [entry, setEntry] = useState<StoredRoomCredential["entry"]>(initialEntry);
  const [copiedCode, setCopiedCode] = useState(false);
  const [lastStandings, setLastStandings] = useState<Array<Record<string, unknown>>>([]);
  const [confirmLeaveMatch, setConfirmLeaveMatch] = useState(false);
  const [confirmHostLeaveRoom, setConfirmHostLeaveRoom] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ actorId: string; nickname: string } | null>(null);
  const [transferHostTarget, setTransferHostTarget] = useState<{ actorId: string; nickname: string } | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [publicPlaysets, setPublicPlaysets] = useState<PublicPlaysetSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const applySnapshot = useCallback((incoming: MultiplayerSnapshot) => {
    if (typeof incoming.serverNow === "number" && Number.isFinite(incoming.serverNow)) {
      clockOffsetRef.current = incoming.serverNow - Date.now();
    }
    const incomingYou = object(incoming.you);
    if (typeof incomingYou.actorId === "string" && incomingYou.actorId) {
      myActorIdRef.current = incomingYou.actorId;
    }
    setSnapshot((current) => {
      const merged = mergeRoomSnapshot(current, incoming);
      const [nextRemaining, nextMatchRemaining] = computeTimers(merged, clockOffsetRef.current);
      queueMicrotask(() => {
        setRemainingMs(nextRemaining);
        setMatchRemainingMs(nextMatchRemaining);
        if (merged.status !== "LOBBY" && merged.phase && LIVE_ENGINE_PHASES.has(merged.phase)) {
          setStartingMatch(false);
        }
      });
      return merged;
    });
  }, []);

  const refreshRoom = useCallback(async (activeCredential: StoredRoomCredential, options?: { keepMessage?: boolean }) => {
    try {
      const state = await getRoomState(activeCredential);
      if (state.sessionId !== activeCredential.sessionId) return;
      applySnapshot(state);
      if (!options?.keepMessage) setMessage("");
      if (state.status === "FINISHED") {
        void getRoomResults(activeCredential).then(setResults).catch(() => undefined);
      }
    } catch (error) {
      setMessage(readableError(error));
    }
  }, [applySnapshot]);

  useEffect(() => {
    const saved = readRoomCredential(initialSessionId);
    if (!saved || saved.sessionId !== initialSessionId) {
      // Browser-only bootstrap; defer so the effect never writes state synchronously.
      queueMicrotask(() => {
        setConnection("closed");
        setMessage("This room link is no longer available on this device. Rejoin with the room code.");
      });
      return;
    }
    // Same browser-only bootstrap; keep the effect free of synchronous writes.
    queueMicrotask(() => {
      setCredential(saved);
      setEntry(saved.entry);
      if (saved.state?.sessionId === saved.sessionId) applySnapshot(saved.state);
    });
    // Skip redundant initial HTTP fetch when we already have the room state
    // from create/join — Socket.IO `room:attached` delivers fresh state immediately.
    if (!saved.state || saved.state.sessionId !== saved.sessionId) {
      queueMicrotask(() => { void refreshRoom(saved); });
    }

    const socket = connectRoom(saved);
    socketRef.current = socket;
    closedRef.current = false;
    socket.on("connect", () => {
      if (closedRef.current) return;
      setConnection("connected");
      setMessage("");
      socket.timeout(5000).emit("room:resync", {}, (error: Error | null, response: Ack & { state?: MultiplayerSnapshot }) => {
        if (!error && response?.ok && response.state) applySnapshot(response.state);
      });
    });
    socket.on("disconnect", () => {
      if (!closedRef.current) setConnection("reconnecting");
    });
    socket.on("connect_error", (error: Error) => {
      if (closedRef.current) return;
      setConnection("reconnecting");
      setMessage(error.message === "UNAUTHORIZED" ? "Room access expired. Rejoin from the lobby." : "Connection interrupted. Reconnecting…");
    });
    socket.on("room:attached", (event: { state?: MultiplayerSnapshot }) => {
      if (event?.state) applySnapshot(event.state);
    });
    socket.on("room:state", (state: MultiplayerSnapshot) => {
      if (state?.sessionId) applySnapshot(state);
    });
    socket.on("round:opened", (state: MultiplayerSnapshot) => applySnapshot(state));
    socket.on("question:advanced", (state: MultiplayerSnapshot) => applySnapshot(state));
    socket.on("standings:updated", (event: { sessionId?: string; standings?: Array<Record<string, unknown>> }) => {
      if (event.sessionId === saved.sessionId && Array.isArray(event.standings)) {
        setSnapshot((current) => current ? { ...current, standings: event.standings } : current);
      }
    });
    socket.on("round:reveal", (state: MultiplayerSnapshot) => {
      applySnapshot(state);
      const you = object(state.you);
      const question = object(state.question);
      const correct = typeof you.choice === "string" && you.choice === question.correctChoice;
      emitAtmosphere({ type: "reveal", correct, tier: correct ? 3 : 0, origin: originFor(document.activeElement, ".gameplay-entrance-controls") });
    });
    socket.on("answer:accepted", () => setAnswering(false));
    socket.on("room:error", (error: { code?: string; message?: string }) => {
      setAnswering(false);
      if (error?.code === "REMOVED_FROM_ROOM") {
        closedRef.current = true;
        clearRoomCredential(saved.sessionId);
        socket.disconnect();
        setConnection("closed");
        setSnapshot(null);
        setMessage(error?.message || "You were removed from the room by the host.");
        return;
      }
      setMessage(error?.message || "The room rejected that action.");
    });
    socket.on("room:host:transferred", (event: { hostActorId?: string; hostNickname?: string | null }) => {
      const nextHostActorId = event?.hostActorId;
      if (!nextHostActorId) return;
      setSnapshot((current) => {
        if (!current) return current;
        const currentYou = object(current.you);
        const actorId = asText(currentYou.actorId, myActorIdRef.current);
        const isNowHost = currentYou.role !== "SPECTATOR" && Boolean(actorId) && actorId === nextHostActorId;
        if (isNowHost) {
          setHostNotice(
            current.status === "LOBBY"
              ? "You are now the host of this room. You can update match settings, manage players, and start the match."
              : "You are now the host of this room. You can manage the room and start the rematch when the match ends.",
          );
        } else {
          setHostNotice("");
          setKickTarget(null);
          setTransferHostTarget(null);
          setConfirmHostLeaveRoom(false);
          if (event.hostNickname) {
            setMessage(`${event.hostNickname} is now the host of this room.`);
          }
        }
        return {
          ...current,
          hostActorId: nextHostActorId,
          ...(current.you
            ? { you: { ...current.you, isHost: isNowHost } }
            : {}),
          ...(Array.isArray(current.players)
            ? {
                players: current.players.map((player) => ({
                  ...player,
                  isHost: player.role !== "SPECTATOR" && player.actorId === nextHostActorId,
                })),
              }
            : {}),
        };
      });
    });
    socket.on(
      "room:ended",
      (event: {
        state?: MultiplayerSnapshot;
        status?: string;
        endedBy?: MultiplayerSnapshot["endedBy"];
        endReason?: string | null;
      }) => {
        if (event?.state) {
          applySnapshot({
            ...event.state,
            endedBy: event.endedBy ?? event.state.endedBy ?? null,
            endReason: event.endReason ?? event.state.endReason ?? null,
          });
        } else if (event?.endedBy !== undefined || event?.endReason !== undefined) {
          setSnapshot((current) =>
            current
              ? {
                  ...current,
                  status: event.status ?? current.status,
                  endedBy: event.endedBy ?? current.endedBy ?? null,
                  endReason: event.endReason ?? current.endReason ?? null,
                }
              : current,
          );
        }
        if (event?.status === "FINISHED") void getRoomResults(saved).then(setResults).catch(() => undefined);
      },
    );
    socket.on("room:postmatch", (event?: { hostActorId?: string; nextSessionId?: string | null }) => {
      if (event?.hostActorId) {
        const nextHostActorId = event.hostActorId;
        setSnapshot((current) => {
          if (!current) return current;
          const currentYou = object(current.you);
          const actorId = asText(currentYou.actorId, myActorIdRef.current);
          const isNowHost = currentYou.role !== "SPECTATOR" && Boolean(actorId) && actorId === nextHostActorId;
          if (isNowHost && currentYou.isHost !== true) {
            setHostNotice("You are now the host of this room. Start a rematch whenever you’re ready.");
          }
          return {
            ...current,
            hostActorId: nextHostActorId,
            ...(current.you ? { you: { ...current.you, isHost: isNowHost } } : {}),
            ...(event.nextSessionId
              ? { settings: { ...object(current.settings), nextSessionId: event.nextSessionId } }
              : {}),
          };
        });
      }
      void refreshRoom(saved, { keepMessage: true });
    });
    socket.on("room:rematch", (event: { nextSessionId?: string }) => {
      if (event.nextSessionId) {
        const nextCredential = { ...saved, sessionId: event.nextSessionId, state: undefined };
        storeRoomCredential(nextCredential);
        setCredential(nextCredential);
        setResults(null);
        setHostNotice("");
        router.replace(`/multiplayer/room/${encodeURIComponent(event.nextSessionId)}`);
      }
    });
    socket.on("room:closed", () => {
      closedRef.current = true;
      setConnection("closed");
      setMessage("This room has closed.");
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [applySnapshot, initialSessionId, refreshRoom, router]);

  // Shared-round state intentionally withholds standings until reveal. Keep the
  // last disclosed standings visible during the next question instead of
  // blanking the leaderboard between rounds.
  useEffect(() => {
    const standings = snapshot?.standings;
    if (Array.isArray(standings)) queueMicrotask(() => setLastStandings(standings));
  }, [snapshot?.standings]);

  // Fallback lobby poll only when Socket.IO is disconnected; when connected,
  // `notifyLobbyChanged` pushes joins, leaves, and settings in real time.
  useEffect(() => {
    if (!credential || snapshot?.status !== "LOBBY" || connection === "connected") return;
    const interval = window.setInterval(() => void refreshRoom(credential, { keepMessage: true }), 6_000);
    return () => window.clearInterval(interval);
  }, [connection, credential, refreshRoom, snapshot?.status]);

  // Fetch catalog categories and public playsets once (cached 60s on client) so
  // all participants can see human-readable playset titles and the host can
  // pick from the searchable modal.
  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      fetchCategories({ signal: controller.signal }),
      fetchPublicPlaysets({ limit: 50, signal: controller.signal }),
    ]).then(([categoryResult, playsetResult]) => {
      if (categoryResult.status === "fulfilled") {
        setCategories(categoryResult.value.categories);
      }
      if (playsetResult.status === "fulfilled") {
        setPublicPlaysets(playsetResult.value.playsets);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setCatalogLoading(false);
    });
    return () => controller.abort();
  }, []);

  const pickerOptions = useMemo(
    () => buildPlaysetPickerOptions(categories, publicPlaysets),
    [categories, publicPlaysets],
  );

  useEffect(() => {
    if (!snapshot) return;
    const ticker = window.setInterval(() => {
      const [nextRemaining, nextMatchRemaining] = computeTimers(snapshot, clockOffsetRef.current);
      setRemainingMs(nextRemaining);
      setMatchRemainingMs(nextMatchRemaining);
    }, 150);
    return () => window.clearInterval(ticker);
  }, [snapshot]);

  const status = asText(snapshot?.status, "CONNECTING");
  const phase = asText(snapshot?.phase, status);
  const mode = asText(snapshot?.mode, "PVP_SPEED");
  const you = object(snapshot?.you);
  const isTrueSpectator = you.role === "SPECTATOR";
  const leftMatch =
    !isTrueSpectator &&
    (you.forfeitReason === "MATCH_LEFT" ||
      (you.role === "PLAYER" && (you.forfeited === true || snapshot?.readOnly === true)));
  const isSpectator = isTrueSpectator || leftMatch || snapshot?.readOnly === true;
  const canControlAsHost = status === "LOBBY" || status === "FINISHED";
  const isHost =
    (you.isHost === true || (Boolean(snapshot?.hostActorId) && you.actorId === snapshot?.hostActorId)) &&
    (!isTrueSpectator || canControlAsHost);

  // Notify the player if host privilege was transferred to them (even via HTTP refresh/resync).
  useEffect(() => {
    if (!snapshot) return;
    if (wasHostRef.current === false && isHost) {
      queueMicrotask(() => {
        setHostNotice((current) =>
          current ||
          (status === "LOBBY"
            ? "You are now the host of this room. You can update match settings, manage players, and start the match."
            : "You are now the host of this room. You can manage the room and start the rematch when the match ends."),
        );
      });
    } else if (wasHostRef.current === true && !isHost) {
      queueMicrotask(() => {
        setHostNotice("");
        setKickTarget(null);
        setTransferHostTarget(null);
        setConfirmHostLeaveRoom(false);
      });
    }
    wasHostRef.current = isHost;
  }, [isHost, snapshot, status]);
  const playerCount = Array.isArray(snapshot?.players) ? snapshot.players.filter((player) => player.role !== "SPECTATOR").length : 0;
  const spectatorCount = Array.isArray(snapshot?.players) ? snapshot.players.filter((player) => player.role === "SPECTATOR").length : 0;
  const maxPlayers = typeof snapshot?.capacity?.maxPlayers === "number" ? snapshot.capacity.maxPlayers : null;
  const lobbyFullForPlayer = isTrueSpectator && maxPlayers !== null && playerCount >= maxPlayers;
  const currentPlaysetId = asText(snapshot?.playsetId, "");
  const resolvedPlaysetTitle = useMemo(() => {
    const directTitle = asText(snapshot?.playsetTitle, "").trim();
    if (directTitle) return directTitle;
    const option = pickerOptions.find((entry) => entry.id === currentPlaysetId);
    if (option?.title) return option.title;
    return currentPlaysetId ? formatFallbackPlaysetId(currentPlaysetId) : null;
  }, [currentPlaysetId, pickerOptions, snapshot?.playsetTitle]);

  async function loadUnlistedPlayset(id: string): Promise<{ ok: boolean; message: string; id?: string }> {
    try {
      const playset = await fetchPublicPlayset(id);
      setPublicPlaysets((current) => current.some((item) => item.id === playset.id)
        ? current
        : [...current, {
            id: playset.id,
            title: playset.title,
            description: playset.description,
            metricName: playset.metricName,
            metricUnit: playset.metricUnit,
            itemCount: playset.itemCount,
            revision: playset.revision,
          }]);
      return {
        ok: true,
        id: playset.id,
        message: `Selected “${playset.title}” (${playset.itemCount} items).`,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "That published set could not be loaded.",
      };
    }
  }
  const leaderboard = useMemo(() => {
    const standings = Array.isArray(snapshot?.standings) ? snapshot.standings : [];
    if (standings.length) return standings;
    if (lastStandings.length) return lastStandings;
    const players = Array.isArray(snapshot?.players) ? snapshot.players : [];
    return [...players].sort((a, b) => asNumber(a.score) < asNumber(b.score) ? 1 : -1);
  }, [lastStandings, snapshot]);
  const question = object(snapshot?.question);
  const left = object(question.left);
  const right = object(question.right);
  const currentRound = asNumber(snapshot?.roundNumber, asNumber(question.roundNumber));
  const totalRounds = asNumber(snapshot?.totalRounds, asNumber(object(snapshot?.settings).roundCount, 0));
  const submitted = you.submitted === true;
  const revealed = phase === "REVEAL" || phase === "FINISHED";
  const isScoreRace = mode === "PVP_SCORE_RACE";
  const score = asNumber(you.score);
  const submittedChoice = asText(you.choice);
  const answerIsCorrect = Boolean(submittedChoice && question.correctChoice && submittedChoice === question.correctChoice);
  const savedPlayer = Array.isArray(results?.players)
    ? results.players.find((player) => object(player).actorId === you.actorId)
    : undefined;
  const persistedPlayer = Array.isArray(snapshot?.players)
    ? snapshot.players.find((player) => player.actorId === you.actorId)
    : undefined;
  // Terminal HTTP room views intentionally expose the score in `players`, not
  // `you`. Prefer that durable source so a post-match refresh cannot turn a
  // previously displayed final score into zero.
  const finalScore = asNumber(object(savedPlayer).score, asNumber(object(persistedPlayer).score, score));
  const hp = Math.max(0, Math.min(100, asNumber(you.hp)));

  async function copyRoomCode() {
    const code = asText(snapshot?.roomCode, credential?.roomCode ?? "");
    if (!code) {
      setMessage("Room code is not available yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      // The button itself shows "Copied"; no banner, so the layout never shifts.
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      setCopiedCode(false);
      setMessage(`Copy was blocked. Room code: ${code}`);
    }
  }

  async function startRoom() {
    if (!credential) return;
    setBusy(true);
    setStartingMatch(true);
    try {
      const started = await roomAction<MultiplayerSnapshot>(credential, "start");
      applySnapshot(started);
      setMessage("");
    } catch (error) {
      setStartingMatch(false);
      setMessage(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  async function exitRoom() {
    if (!credential) { router.replace("/multiplayer"); return; }
    setBusy(true);
    setConfirmLeaveMatch(false);
    setConfirmHostLeaveRoom(false);
    try {
      await roomAction(credential, "leave");
    } catch (error) {
      // An expired or revoked token cannot accept a leave call. Drop the local
      // credential and go back anyway, otherwise the button loops in place.
      const status = (error as { status?: number }).status;
      if (status !== 401 && status !== 403) {
        setMessage(readableError(error));
        setBusy(false);
        return;
      }
    }
    clearRoomCredential(credential.sessionId);
    router.replace("/multiplayer");
  }

  function requestExitRoom() {
    const needsHostConfirm =
      isHost &&
      (status === "RUNNING" || (status === "LOBBY" && (playerCount > 1 || spectatorCount > 0)));
    if (needsHostConfirm) {
      setConfirmHostLeaveRoom(true);
      return;
    }
    void exitRoom();
  }

  async function toggleLobbyRole(nextRole: "PLAYER" | "SPECTATOR") {
    if (!credential || status !== "LOBBY") return;
    const currentRole = isTrueSpectator ? "SPECTATOR" : "PLAYER";
    if (currentRole === nextRole) return;
    setBusy(true);
    setMessage("");
    try {
      const next = await setLobbyRole(credential, nextRole);
      applySnapshot(next);
      setMessage(
        nextRole === "SPECTATOR"
          ? "Switched to Spectating. You can watch this match without competing on the scoreboard."
          : "Switched to Playing. You are ready to compete when the host starts.",
      );
    } catch (error) {
      setMessage(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  async function leaveCurrentMatch() {
    if (!credential) return;
    setBusy(true);
    setConfirmLeaveMatch(false);
    try {
      const result = await roomAction<{
        sessionId: string;
        status: "LEFT_MATCH";
        isHost?: boolean;
      }>(credential, "leave-match");
      await refreshRoom(credential, { keepMessage: true });
      setMessage(
        result.isHost
          ? "You forfeited the current match. You kept your host privileges and can start the rematch once this match finishes."
          : "You forfeited the current match. Waiting in this room for the next match.",
      );
    } catch (error) {
      setMessage(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  async function rematch() {
    if (!credential) return;
    setBusy(true);
    try {
      const next = await roomAction<MultiplayerSnapshot>(credential, "rematch");
      const nextCredential = { ...credential, sessionId: next.sessionId, state: next };
      // Write every slot: a stale sessionStorage entry for the old room would
      // otherwise shadow the new session and strand this tab on "unavailable".
      storeRoomCredential(nextCredential);
      setCredential(nextCredential);
      applySnapshot(next);
      setResults(null);
      setHostNotice("");
      router.replace(`/multiplayer/room/${encodeURIComponent(next.sessionId)}`);
    } catch (error) { setMessage(readableError(error)); }
    finally { setBusy(false); }
  }

  async function waitForHostRematch() {
    if (!credential) return;
    setBusy(true);
    try {
      await refreshRoom(credential, { keepMessage: true });
      setMessage("You’re in the room. Waiting for the host to start a rematch…");
    } finally {
      setBusy(false);
    }
  }

  async function confirmKickPlayer() {
    if (!credential || !kickTarget) return;
    const target = kickTarget;
    setBusy(true);
    try {
      const next = await kickRoomPlayer(credential, target.actorId);
      applySnapshot(next);
      setKickTarget(null);
      setMessage(`Removed ${target.nickname} from the room.`);
    } catch (error) {
      setMessage(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  async function confirmTransferHost() {
    if (!credential || !transferHostTarget) return;
    const target = transferHostTarget;
    setBusy(true);
    try {
      const next = await transferRoomHost(credential, target.actorId);
      applySnapshot(next);
      setTransferHostTarget(null);
      setHostNotice("");
      setMessage(`Transferred host privileges to ${target.nickname}.`);
    } catch (error) {
      setMessage(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  function answer(choice: "HIGHER" | "LOWER") {
    const socket = socketRef.current;
    if (!socket || !question.id || submitted || answering || isSpectator || phase !== "QUESTION") return;
    setAnswering(true);
    setMessage("");
    emitAtmosphere({ type: "guess", direction: choice === "HIGHER" ? "higher" : "lower", source: "pointer", ...originFor(document.activeElement, ".gameplay-entrance-controls") });
    const requestId = crypto.randomUUID();
    socket.timeout(5000).emit("room:answer", { questionId: question.id, choice, requestId }, (timeoutError: Error | null, ack: Ack) => {
      if (timeoutError) {
        setMessage("Answer confirmation is taking a moment. Reconnecting to check your answer…");
        socket.emit("room:resync", {}, (_error: Error | null, response: Ack & { state?: MultiplayerSnapshot }) => {
          if (response?.state) applySnapshot(response.state);
        });
      } else if (ack?.ok) {
        setSnapshot((current) => current ? { ...current, you: { ...object(current.you), submitted: true } } : current);
      } else {
        setMessage(ack?.error?.message || "Your answer could not be submitted.");
      }
      setAnswering(false);
    });
  }

  const successorSessionId = asText(object(snapshot?.settings).nextSessionId);
  useEffect(() => {
    if (!credential || !successorSessionId || successorSessionId === credential.sessionId) return;
    const nextCredential = { ...credential, sessionId: successorSessionId, state: undefined };
    storeRoomCredential(nextCredential);
    router.replace(`/multiplayer/room/${encodeURIComponent(successorSessionId)}`);
  }, [credential, router, successorSessionId]);

  if (!credential || !snapshot) {
    return (
      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <Link href="/multiplayer" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] hover:text-white"><ArrowLeft size={16} /> Multiplayer lobby</Link>
        <section className={`${CARD} mx-auto mt-16 w-full max-w-xl text-center`}>
          {connection === "connecting" ? <LoaderCircle className="mx-auto mb-4 animate-spin text-[var(--accent-highlight)]" /> : <WifiOff className="mx-auto mb-4 text-[var(--accent-highlight)]" />}
          <h1 className="text-2xl font-bold text-white">{connection === "closed" ? "Room unavailable" : entry === "create" ? "Opening your room…" : entry === "join" ? "Joining room…" : entry === "spectate" ? "Joining as spectator…" : "Connecting to the room…"}</h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">{message || (connection === "closed" ? "This room is no longer available on this device." : "Connecting you to the room. We’ll keep trying automatically.")}</p>
          {connection === "closed" && <Link href="/multiplayer" className={`${BUTTON} mt-6`}>Return to multiplayer</Link>}
        </section>
      </main>
    );
  }

  const playersForList = Array.isArray(snapshot.players) ? snapshot.players : [];
  const connected = connection === "connected";
  const cancelled = status === "CANCELLED";
  const finished = status === "FINISHED" || phase === "FINISHED";
  const countdownSeconds = Math.ceil(remainingMs / 1000);
  const showMatchLoadingSpinner =
    !leftMatch &&
    !isTrueSpectator &&
    (startingMatch ||
      (status === "RUNNING" &&
        (phase === "RUNNING" ||
          (phase === "COUNTDOWN" && countdownSeconds <= 0) ||
          (phase === "QUESTION" && !question.id))));
  const showActiveCountdown =
    !leftMatch && !isTrueSpectator && status === "RUNNING" && phase === "COUNTDOWN" && countdownSeconds > 0;

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        {!finished && <Link href="/multiplayer" onClick={(event) => { event.preventDefault(); requestExitRoom(); }} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:text-white"><ArrowLeft size={16} /> Leave room</Link>}
        <div className="flex flex-wrap items-center gap-2">
          {typeof snapshot.playsetId === "string" &&
            snapshot.playsetId.length > 0 &&
            !snapshot.playsetId.startsWith("system-") && (
              <ReportPlaysetDialog
                playsetId={snapshot.playsetId}
                playsetTitle={resolvedPlaysetTitle}
                compact
              />
            )}
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {connected ? <Wifi size={12} className="text-[var(--accent-highlight)]" /> : <WifiOff size={12} className="text-amber-300" />}
            {connected ? "Connected" : "Reconnecting"}
          </span>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl flex-1 py-9 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-action-higher)]">{leftMatch ? (isHost ? "Waiting in room · Host" : "Waiting in room") : isTrueSpectator ? "Spectator view" : isHost ? "You are hosting" : "You're in"}</p>
            <h1 className="text-4xl font-bold leading-none tracking-[-0.07em] text-white [text-shadow:4px_4px_0_var(--accent-time-attack)] sm:text-6xl">ROOM <span className="text-[var(--accent-highlight)]">{asText(snapshot.roomCode, credential.roomCode)}</span></h1>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">{modeLabel(mode)}{resolvedPlaysetTitle ? ` · ${resolvedPlaysetTitle}` : ""} · {status.toLowerCase()}</p>
          </div>
          {status === "RUNNING" && !isTrueSpectator && !leftMatch && (
            <button
              className={OUTLINE}
              type="button"
              onClick={() => setConfirmLeaveMatch(true)}
              disabled={busy}
            >
              <LogOut size={14} /> Leave match
            </button>
          )}
        </div>

        {confirmLeaveMatch && status === "RUNNING" && !isTrueSpectator && !leftMatch && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-match-dialog-title"
            className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-xs"
          >
            <section className={`${CARD} w-full max-w-md border-amber-300/40 bg-[#1b1734]`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-highlight)]">Forfeit confirmation</p>
              <h2 id="leave-match-dialog-title" className="mt-2 text-2xl font-bold text-white">Forfeit and leave this match?</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Leaving this match will forfeit your current run while the match continues. You will stay in room <strong className="tracking-[0.12em] text-white">{asText(snapshot.roomCode, credential.roomCode)}</strong> and wait for the next match.
                {isHost ? " You will keep your host privileges for the next match." : ""}
              </p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button className={OUTLINE} type="button" disabled={busy} onClick={() => setConfirmLeaveMatch(false)}>
                  Stay in match
                </button>
                <button className={BUTTON} type="button" disabled={busy} onClick={() => void leaveCurrentMatch()}>
                  {busy ? "Leaving…" : "Forfeit match"}
                </button>
              </div>
            </section>
          </div>
        )}

        {confirmHostLeaveRoom && isHost && !isTrueSpectator && !finished && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-room-dialog-title"
            className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-xs"
          >
            <section className={`${CARD} w-full max-w-md border-amber-300/40 bg-[#1b1734]`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-highlight)]">Host confirmation</p>
              <h2 id="leave-room-dialog-title" className="mt-2 text-2xl font-bold text-white">Leave room and transfer host?</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {status === "RUNNING"
                  ? "Leaving this room will remove your host privilege and transfer it to another active player. The current match will continue to run without you."
                  : "Leaving this room will remove your host privilege and transfer it to another player in the lobby."}
              </p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button className={OUTLINE} type="button" disabled={busy} onClick={() => setConfirmHostLeaveRoom(false)}>
                  Stay in room
                </button>
                <button className={BUTTON} type="button" disabled={busy} onClick={() => void exitRoom()}>
                  {busy ? "Leaving…" : "Leave room"}
                </button>
              </div>
            </section>
          </div>
        )}

        {hostNotice && (
          <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-sm border border-[var(--accent-highlight)]/50 bg-[var(--accent-highlight)]/15 px-4 py-3 text-xs text-white">
            <span className="inline-flex items-center gap-2 font-semibold">
              <Crown size={15} className="shrink-0 text-[var(--accent-highlight)]" aria-hidden="true" />
              {hostNotice}
            </span>
            <button type="button" onClick={() => setHostNotice("")} className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-highlight)] hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {message && <div role="status" className="mb-5 rounded-sm border border-amber-300/30 bg-amber-200/10 px-4 py-3 text-xs text-amber-100">{message}</div>}

        {status === "LOBBY" && (
          <div className="grid gap-5 md:grid-cols-[1fr_0.8fr]">
            <section className={CARD}>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-action-higher)]">
                    Players
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">Waiting room</h2>
                </div>
                <span className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Users size={16} /> {playerCount} playing
                  {maxPlayers ? ` / ${maxPlayers}` : ""}
                  {spectatorCount > 0 ? ` · ${spectatorCount} spectating` : ""}
                </span>
              </div>

              <div className="mb-5 rounded-sm border border-white/15 bg-white/[0.03] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-primary)]">
                      Your lobby role
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      {lobbyFullForPlayer
                        ? `All ${maxPlayers} player seats are taken right now.`
                        : isTrueSpectator
                          ? "Watching the scoreboard and live rounds as a spectator."
                          : "Ready to compete when the match starts."}
                    </p>
                  </div>
                  <div
                    role="group"
                    aria-label="Lobby role toggle"
                    className="inline-flex rounded-sm border border-white/20 bg-[#120f24] p-0.5"
                  >
                    <button
                      type="button"
                      aria-pressed={!isTrueSpectator}
                      disabled={busy || lobbyFullForPlayer}
                      onClick={() => void toggleLobbyRole("PLAYER")}
                      className={`cursor-pointer rounded-sm px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        !isTrueSpectator
                          ? "bg-[var(--accent-action-higher)] text-[#15122b]"
                          : "text-[var(--text-secondary)] hover:text-white"
                      }`}
                    >
                      Playing
                    </button>
                    <button
                      type="button"
                      aria-pressed={isTrueSpectator}
                      disabled={busy}
                      onClick={() => void toggleLobbyRole("SPECTATOR")}
                      className={`cursor-pointer rounded-sm px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isTrueSpectator
                          ? "bg-[var(--accent-time-attack)] text-white"
                          : "text-[var(--text-secondary)] hover:text-white"
                      }`}
                    >
                      Spectating
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {playersForList.map((player) => {
                  const actorId = asText(player.actorId);
                  const nickname = asText(player.nickname, "Player");
                  const isPlayerRole = player.role !== "SPECTATOR";
                  const isOtherParticipant =
                    Boolean(actorId) &&
                    actorId !== asText(you.actorId) &&
                    player.isHost !== true;
                  const canKick = isHost && isOtherParticipant;
                  const canTransferHost = isHost && isOtherParticipant && isPlayerRole;
                  return (
                    <PlayerRow
                      key={actorId}
                      player={player}
                      canKick={canKick}
                      canTransferHost={canTransferHost}
                      disabled={busy}
                      onKick={() => setKickTarget({ actorId, nickname })}
                      onTransferHost={() => setTransferHostTarget({ actorId, nickname })}
                    />
                  );
                })}
                {playersForList.length === 0 && <p className="text-sm text-[var(--text-muted)]">Loading players…</p>}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><p className="text-xs leading-5 text-[var(--text-muted)]">Share room code <strong className="tracking-[0.2em] text-white">{snapshot.roomCode || credential.roomCode}</strong> with players joining this match.</p><button type="button" className={OUTLINE} onClick={() => void copyRoomCode()}><Copy size={14} />{copiedCode ? "Copied" : "Copy code"}</button></div>
            </section>
            <section className={`${CARD} flex flex-col justify-between`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-time-attack)]">Match settings</p>
                <h2 className="mt-1 text-2xl font-bold">{modeLabel(mode)}</h2>
                <SettingsSummary snapshot={snapshot} playsetTitle={resolvedPlaysetTitle} isHost={isHost} />
                {isHost && (
                  <RoomSettingsEditor
                    snapshot={snapshot}
                    credential={credential}
                    pickerOptions={pickerOptions}
                    resolvedPlaysetTitle={resolvedPlaysetTitle}
                    catalogLoading={catalogLoading}
                    onLoadUnlisted={loadUnlistedPlayset}
                    onSaved={(next) => {
                      applySnapshot(next);
                      setMessage("Room settings updated.");
                    }}
                  />
                )}
              </div>
              <div className="mt-8">
                {isHost ? <button className={`${BUTTON} w-full`} type="button" disabled={busy || playerCount < 2} onClick={() => void startRoom()}>{busy ? "Starting…" : playerCount < 2 ? "Waiting for 2 playing" : "Start match"}</button> : <p className="rounded-sm border border-white/15 bg-white/[0.03] px-4 py-3 text-center text-xs text-[var(--text-secondary)]">Waiting for the host to start the match…</p>}
                {isHost && playerCount < 2 && <p className="mt-3 text-center text-[10px] text-[var(--text-muted)]">At least 2 participants must be set to Playing to start.</p>}
              </div>
            </section>
          </div>
        )}

        {(status === "RUNNING" || status === "FINALIZING") && (
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <section className={CARD}>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-action-higher)]">{isSpectator ? "Live leaderboard" : isScoreRace ? "Race clock" : currentRound > 0 ? `Round ${currentRound}${totalRounds ? ` of ${totalRounds}` : ""}` : "Starting match"}</p><h2 className="mt-1 text-2xl font-bold">{showMatchLoadingSpinner ? "Loading match" : phaseLabel(phase)}</h2>{!isSpectator && !isScoreRace && (phase === "QUESTION" || phase === "REVEAL") && <p className="mt-1 text-xs text-[var(--text-secondary)]">{asNumber(snapshot.answeredCount)} of {asNumber(snapshot.totalAnswerers, playerCount)} players answered</p>}</div><div className="flex items-center gap-3">{mode.includes("HP") && !isSpectator && <div className="min-w-32"><div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]"><span>Health</span><span>{hp}/100</span></div><div className="h-2 overflow-hidden rounded-full border border-white/20 bg-white/10"><div className="h-full bg-[var(--status-success)] transition-[width] duration-300" style={{ width: `${hp}%` }} /></div></div>}<div className="grid min-w-16 place-items-center rounded-sm border border-white/20 bg-white/[0.04] px-4 py-2 text-lg font-bold tabular-nums text-[var(--accent-highlight)]">{showMatchLoadingSpinner ? <LoaderCircle size={18} className="animate-spin" aria-label="Loading" /> : formatSeconds(remainingMs)}</div></div></div>
              {leftMatch ? (
                <div className="rounded-sm border border-dashed border-white/20 bg-white/[0.02] p-6 text-center">
                  <Users className="mx-auto mb-3 text-[var(--accent-highlight)]" size={24} />
                  <h3 className="text-lg font-bold text-white">Waiting for the next match</h3>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                    You forfeited the current match and are waiting in room <strong className="tracking-[0.16em] text-white">{asText(snapshot.roomCode, credential.roomCode)}</strong>.
                    {isHost
                      ? " You are still the host — once this match ends, you can start a rematch for everyone."
                      : " Stay here to join the host’s next match automatically, or use Leave room above to exit."}
                  </p>
                </div>
              ) : isSpectator ? (
                question.id ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <QuestionCard item={left} label="Current" revealed />
                      <QuestionCard item={right} label="Next" revealed={revealed} />
                    </div>
                    {revealed ? (
                      <div className="mt-5 rounded-sm border border-[var(--accent-highlight)]/30 bg-[var(--accent-highlight)]/10 p-4 text-center"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-highlight)]">{question.correctChoice ? `Correct answer: ${question.correctChoice}` : "Answer revealed"}</p><p className="mt-1 text-sm text-white">{asText(right.displayValue, "The comparison has been revealed")}</p></div>
                    ) : (
                      <p className="mt-4 text-center text-[11px] leading-5 text-[var(--text-muted)]">Watching live. The next value and the correct answer appear at the round reveal.</p>
                    )}
                  </>
                ) : (
                  <div className="rounded-sm border border-dashed border-white/20 bg-white/[0.02] p-6 text-center"><Trophy className="mx-auto mb-3 text-[var(--accent-highlight)]" size={24} /><h3 className="text-lg font-bold">Watching the match</h3><p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">The next question appears as soon as the round opens.</p></div>
                )
              ) : (
                <>
                  {showMatchLoadingSpinner && (
                    <div className="grid min-h-52 place-items-center rounded-sm border border-white/15 bg-white/[0.03] text-center">
                      <div>
                        <LoaderCircle className="mx-auto mb-3 animate-spin text-[var(--accent-highlight)]" size={34} />
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white">
                          {phase === "COUNTDOWN" ? "Opening round…" : "Preparing match…"}
                        </p>
                        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">Syncing gameplay with the room</p>
                      </div>
                    </div>
                  )}
                  {showActiveCountdown && (
                    <div className="grid min-h-52 place-items-center rounded-sm border border-white/15 bg-white/[0.03] text-center">
                      <div>
                        <p className="text-7xl font-black tabular-nums text-white">{countdownSeconds}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">Get ready</p>
                      </div>
                    </div>
                  )}
                  {(phase === "QUESTION" || phase === "REVEAL" || phase === "FINISHED") && question.id && <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <QuestionCard item={left} label="Current" revealed />
                      <QuestionCard item={right} label="Next" revealed={revealed} />
                    </div>
                    {phase === "QUESTION" && !isScoreRace && <div className="mt-5 grid grid-cols-2 gap-3"><button className={OUTLINE} type="button" disabled={submitted || answering || !connected} onClick={() => answer("LOWER")}><ArrowDown size={16} /> Lower</button><button className={BUTTON} type="button" disabled={submitted || answering || !connected} onClick={() => answer("HIGHER")}>{answering ? "Sending…" : submitted ? <><Check size={15} /> Answer locked</> : <><ArrowUp size={16} /> Higher</>}</button></div>}
                    {phase === "QUESTION" && isScoreRace && <div className="mt-5 grid grid-cols-2 gap-3"><button className={OUTLINE} type="button" disabled={submitted || answering || !connected} onClick={() => answer("LOWER")}><ArrowDown size={16} /> Lower</button><button className={BUTTON} type="button" disabled={submitted || answering || !connected} onClick={() => answer("HIGHER")}>{answering ? "Sending…" : submitted ? <><Check size={15} /> Answer locked</> : <><ArrowUp size={16} /> Higher</>}</button></div>}
                    {revealed && <div className="mt-5 rounded-sm border border-[var(--accent-highlight)]/30 bg-[var(--accent-highlight)]/10 p-4 text-center"><p className={`text-xs font-bold uppercase tracking-[0.16em] ${submittedChoice ? answerIsCorrect ? "text-[var(--status-success)] animate-[fadeInScale_0.35s_ease-out]" : "text-[var(--status-error)] animate-[shake_0.4s_ease-out]" : "text-[var(--accent-highlight)] animate-[fadeInUp_0.3s_ease-out]"}`}>{submittedChoice ? answerIsCorrect ? "Correct!" : "Wrong!" : question.correctChoice ? `Correct answer: ${question.correctChoice}` : "Answer revealed"}</p><p className="mt-1 text-sm text-white">{question.correctChoice ? `Correct answer: ${question.correctChoice} · ` : ""}{asText(right.displayValue, "The comparison has been revealed")}</p></div>}
                  </>}
                </>
              )}
              {!isSpectator && <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-xs text-[var(--text-secondary)]"><span>Score <strong className="text-white">{score}</strong></span>{mode.includes("STREAK") && <span>Streak <strong className="text-white">{asNumber(you.streak)}</strong></span>}{mode.includes("HP") && <span>Health <strong className="text-white">{asNumber(you.hp)}/100</strong></span>}</div>}
            </section>
            <Leaderboard snapshot={snapshot} entries={leaderboard} isSpectator={isSpectator} matchRemainingMs={matchRemainingMs} />
          </div>
        )}

        {finished && (
          <div className="grid gap-5 md:grid-cols-[0.8fr_1fr]">
            <section className={`${CARD} text-center`}>
              <Trophy className="mx-auto mb-4 text-[var(--accent-highlight)]" size={30} />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-action-higher)]">Match complete</p>
              <h2 className="mt-2 text-3xl font-bold">{isTrueSpectator ? "Final leaderboard" : "Your final score"}</h2>
              {!isTrueSpectator && <p className="mt-3 text-5xl font-black text-[var(--accent-highlight)]">{finalScore}</p>}
              <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
                {isHost
                  ? "You are the host. Start a rematch to open the next room, or leave for multiplayer."
                  : "Stay in this room to follow the host’s rematch, or leave for multiplayer."}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                {isHost ? (
                  <button className={BUTTON} disabled={busy} onClick={() => void rematch()}>
                    <RotateCcw size={14} /> Rematch
                  </button>
                ) : (
                  <button className={OUTLINE} disabled={busy} onClick={() => void waitForHostRematch()}>
                    {busy ? "Checking room…" : "Wait for host rematch"}
                  </button>
                )}
                <button className={OUTLINE} disabled={busy} onClick={() => void exitRoom()}>
                  <LogOut size={14} /> Leave to multiplayer
                </button>
              </div>
            </section>
            <Leaderboard snapshot={snapshot} entries={leaderboard} isSpectator={isTrueSpectator} results={results} matchRemainingMs={matchRemainingMs} />
          </div>
        )}
        {cancelled && (
          <section className={`${CARD} mx-auto max-w-xl text-center`}>
            <h2 className="text-2xl font-bold">
              {snapshot?.endedBy === "ADMIN"
                ? "Room ended by an administrator"
                : snapshot?.endedBy === "EXPIRED"
                  ? "Room expired"
                  : "Room ended"}
            </h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {snapshot?.endedBy === "ADMIN"
                ? snapshot.endReason
                  ? `An administrator ended this room: ${snapshot.endReason}`
                  : "An administrator ended this room for policy or moderation reasons."
                : snapshot?.endedBy === "EXPIRED"
                  ? snapshot.endReason || "This room expired due to inactivity."
                  : snapshot?.endReason || "The host ended this room. You can return to multiplayer or join another room."}
            </p>
            <Link className={`${BUTTON} mt-6`} href="/multiplayer">
              Return to multiplayer
            </Link>
          </section>
        )}
      </section>
      <KickPlayerConfirmDialog
        target={kickTarget}
        busy={busy}
        onCancel={() => setKickTarget(null)}
        onConfirm={() => void confirmKickPlayer()}
      />
      <TransferHostConfirmDialog
        target={transferHostTarget}
        busy={busy}
        onCancel={() => setTransferHostTarget(null)}
        onConfirm={() => void confirmTransferHost()}
      />
      <footer className="pb-2 text-center text-[10px] uppercase tracking-[0.12em] text-white/35">Higher or Lower · Party mode</footer>
    </main>
  );
}

function PlayerRow({
  player,
  canKick = false,
  canTransferHost = false,
  disabled = false,
  onKick,
  onTransferHost,
}: {
  player: Record<string, unknown>;
  canKick?: boolean;
  canTransferHost?: boolean;
  disabled?: boolean;
  onKick?: () => void;
  onTransferHost?: () => void;
}) {
  const spectator = player.role === "SPECTATOR";
  const nickname = asText(player.nickname, "Player");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-white/10 bg-white/[0.025] px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-white/10 text-xs font-bold text-[var(--accent-highlight)]">
          {asText(player.nickname, "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{nickname}</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {spectator ? "Spectator" : player.isHost === true ? "Host" : "Player"}
            {typeof player.connected === "boolean" ? ` · ${player.connected ? "Connected" : "Disconnected"}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {player.isHost === true && <Crown size={15} className="text-[var(--accent-highlight)]" aria-label="Host" />}
        {canTransferHost && onTransferHost && (
          <button
            type="button"
            disabled={disabled}
            onClick={onTransferHost}
            aria-label={`Make ${nickname} host`}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-[var(--accent-highlight)]/45 bg-[var(--accent-highlight)]/10 px-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--accent-highlight)] transition hover:bg-[var(--accent-highlight)] hover:text-[#15122b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Crown size={12} aria-hidden="true" />
            Make host
          </button>
        )}
        {canKick && onKick && (
          <button
            type="button"
            disabled={disabled}
            onClick={onKick}
            aria-label={`Kick ${nickname}`}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-[var(--status-error)]/45 bg-[var(--status-error)]/10 px-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--status-error)] transition hover:bg-[var(--status-error)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserX size={12} aria-hidden="true" />
            Kick
          </button>
        )}
      </div>
    </div>
  );
}

/** Shared accessible native `<dialog>` confirmation modal with light-dismiss fallback. */
function NativeConfirmDialog({
  open,
  eyebrow,
  title,
  description,
  confirmButton,
  busy,
  onCancel,
}: {
  open: boolean;
  eyebrow: string;
  title: string;
  description: string;
  confirmButton: ReactNode;
  busy: boolean;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      queueMicrotask(() => {
        cancelButtonRef.current?.focus();
      });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Safari fallback for closedby="any"
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const isOutside = (event: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };
    const handlePointerDown = (event: PointerEvent) => {
      pressedOutside = isOutside(event);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (pressedOutside && isOutside(event)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  function handleClose() {
    const dialog = dialogRef.current;
    if (dialog) dialog.returnValue = "";
    onCancel();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleClose}
      {...({ closedby: "any" } as Record<string, string>)}
      className="m-auto w-[min(92vw,28rem)] rounded-md border border-amber-300/40 bg-[#1b1734] p-5 text-white shadow-[0_10px_0_var(--accent-classic)] backdrop:bg-black/75 backdrop:backdrop-blur-xs open:block sm:p-7"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-highlight)]">{eyebrow}</p>
      <h1 id={titleId} className="mt-2 text-2xl font-bold text-white">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          ref={cancelButtonRef}
          type="button"
          autoFocus
          disabled={busy}
          onClick={() => dialogRef.current?.close()}
          className={OUTLINE}
        >
          Cancel
        </button>
        {confirmButton}
      </div>
    </dialog>
  );
}

function KickPlayerConfirmDialog({
  target,
  busy,
  onCancel,
  onConfirm,
}: {
  target: { actorId: string; nickname: string } | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <NativeConfirmDialog
      open={target !== null}
      eyebrow="Host action"
      title={`Kick ${target?.nickname ?? "player"}?`}
      description="They will be removed from the waiting room immediately and their room access will be revoked."
      busy={busy}
      onCancel={onCancel}
      confirmButton={
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-[var(--status-error)] bg-[var(--status-error)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserX size={14} aria-hidden="true" />
          {busy ? "Removing…" : "Kick player"}
        </button>
      }
    />
  );
}

function TransferHostConfirmDialog({
  target,
  busy,
  onCancel,
  onConfirm,
}: {
  target: { actorId: string; nickname: string } | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <NativeConfirmDialog
      open={target !== null}
      eyebrow="Host action"
      title={`Transfer host to ${target?.nickname ?? "player"}?`}
      description="You will remain in the waiting room as a regular player, while they take over match settings, player management, and starting the match."
      busy={busy}
      onCancel={onCancel}
      confirmButton={
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={BUTTON}
        >
          <Crown size={14} aria-hidden="true" />
          {busy ? "Transferring…" : "Transfer host"}
        </button>
      }
    />
  );
}


type RoomModeId = "PVP_SPEED" | "PVP_SCORE_RACE" | "PVP_SPEED_STREAK" | "PVP_SPEED_HP";
type AnswerTimeSeconds = 3 | 5 | 10 | 15;
const ROUND_COUNT_OPTIONS = [5, 7, 10, 15, 20, 30] as const;
const ANSWER_TIME_OPTIONS: readonly AnswerTimeSeconds[] = [3, 5, 10, 15];
const MATCH_MINUTE_OPTIONS = [1, 2, 3, 5, 10, 15] as const;

function normalizeRoundCount(value: unknown, fallback = 5): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : NaN;
  return Number.isInteger(parsed) && parsed >= 5 && parsed <= 30 ? parsed : fallback;
}

function normalizeAnswerSeconds(msValue: unknown, fallback: AnswerTimeSeconds = 15): AnswerTimeSeconds {
  const parsed = typeof msValue === "number" && Number.isFinite(msValue) ? Math.round(msValue / 1_000) : NaN;
  return (ANSWER_TIME_OPTIONS as readonly number[]).includes(parsed) ? (parsed as AnswerTimeSeconds) : fallback;
}

function normalizeMatchMinutes(msValue: unknown, fallback = 5): number {
  const parsed = typeof msValue === "number" && Number.isFinite(msValue) ? Math.round(msValue / 60_000) : NaN;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 15 ? parsed : fallback;
}

const ROOM_MODE_OPTIONS: Array<{ id: RoomModeId; label: string }> = [
  { id: "PVP_SPEED", label: "Speed" },
  { id: "PVP_SCORE_RACE", label: "Score Race" },
  { id: "PVP_SPEED_STREAK", label: "Streak" },
  { id: "PVP_SPEED_HP", label: "HP" },
];

/** Host-only lobby controls; the backend rejects edits once the match starts. */
function RoomSettingsEditor({
  snapshot,
  credential,
  pickerOptions,
  resolvedPlaysetTitle,
  catalogLoading,
  onLoadUnlisted,
  onSaved,
}: {
  snapshot: MultiplayerSnapshot;
  credential: StoredRoomCredential | null;
  pickerOptions: readonly PlaysetPickerOption[];
  resolvedPlaysetTitle: string | null;
  catalogLoading: boolean;
  onLoadUnlisted: (playsetId: string) => Promise<{ ok: boolean; message: string; id?: string }>;
  onSaved: (next: MultiplayerSnapshot) => void;
}) {
  const settings = object(snapshot.settings);
  const currentMode = asText(snapshot.mode, "PVP_SPEED") as RoomModeId;
  const currentPlayset = asText(snapshot.playsetId, "");
  const currentRounds = normalizeRoundCount(settings.roundCount, 5);
  const currentSeconds = normalizeAnswerSeconds(settings.roundDurationMs, 15);
  const currentMinutes = normalizeMatchMinutes(settings.matchDurationMs, 5);

  const [mode, setMode] = useState<RoomModeId>(currentMode);
  const [playsetId, setPlaysetId] = useState(currentPlayset);
  const [rounds, setRounds] = useState(currentRounds);
  const [seconds, setSeconds] = useState<AnswerTimeSeconds>(currentSeconds);
  const [minutes, setMinutes] = useState(currentMinutes);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const scoreRace = mode === "PVP_SCORE_RACE";
  const roundOptions = ROUND_COUNT_OPTIONS.includes(rounds as (typeof ROUND_COUNT_OPTIONS)[number])
    ? [...ROUND_COUNT_OPTIONS]
    : [...ROUND_COUNT_OPTIONS, rounds].sort((a, b) => a - b);
  const minuteOptions = MATCH_MINUTE_OPTIONS.includes(minutes as (typeof MATCH_MINUTE_OPTIONS)[number])
    ? [...MATCH_MINUTE_OPTIONS]
    : [...MATCH_MINUTE_OPTIONS, minutes].sort((a, b) => a - b);

  // Keep local controls synchronized only when the incoming room snapshot changes
  // externally (e.g., host transfer), without discarding unsaved local edits.
  const prevSynced = useRef({
    mode: currentMode,
    playsetId: currentPlayset,
    rounds: currentRounds,
    seconds: currentSeconds,
    minutes: currentMinutes,
  });
  useEffect(() => {
    const prev = prevSynced.current;
    queueMicrotask(() => {
      if (prev.mode !== currentMode) setMode(currentMode);
      if (prev.playsetId !== currentPlayset) setPlaysetId(currentPlayset);
      if (prev.rounds !== currentRounds) setRounds(currentRounds);
      if (prev.seconds !== currentSeconds) setSeconds(currentSeconds);
      if (prev.minutes !== currentMinutes) setMinutes(currentMinutes);
      prevSynced.current = {
        mode: currentMode,
        playsetId: currentPlayset,
        rounds: currentRounds,
        seconds: currentSeconds,
        minutes: currentMinutes,
      };
    });
  }, [currentMinutes, currentMode, currentPlayset, currentRounds, currentSeconds]);

  async function save() {
    if (!credential) return;
    setBusy(true);
    setNote("");
    try {
      const next = await updateRoomSettings(credential, {
        mode,
        ...(playsetId && playsetId !== currentPlayset ? { playsetId } : {}),
        ...(scoreRace
          ? { matchDurationMinutes: normalizeMatchMinutes(minutes * 60_000) }
          : {
              roundCount: normalizeRoundCount(rounds),
              answerTimeSeconds: normalizeAnswerSeconds(seconds * 1_000),
            }),
      });
      onSaved(next);
      setNote("Saved.");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not save room settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-xs text-[var(--text-secondary)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-highlight)]">Host controls</p>
      <div className="flex flex-wrap gap-2">
        {ROOM_MODE_OPTIONS.map((option) => (
          <button key={option.id} type="button" onClick={() => setMode(option.id)} className={`min-h-9 rounded-sm border px-3 text-[11px] font-bold uppercase tracking-[0.1em] ${mode === option.id ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/15 text-white" : "border-white/20 text-[var(--text-secondary)] hover:border-white/40"}`}>{option.label}</button>
        ))}
      </div>
      <PlaysetPickerField
        options={pickerOptions}
        selectedId={playsetId}
        selectedTitleFallback={resolvedPlaysetTitle}
        onSelect={setPlaysetId}
        disabled={busy}
        loading={catalogLoading}
        onLoadUnlisted={onLoadUnlisted}
      />
      {scoreRace ? (
        <label className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">Match length
          <select className="rounded-sm border border-white/20 bg-[#15122b] px-3 py-1.5 text-sm text-white" value={minutes} onChange={(event) => setMinutes(normalizeMatchMinutes(Number(event.target.value) * 60_000))}>
            {minuteOptions.map((value) => <option key={value} value={value}>{value} min</option>)}
          </select>
        </label>
      ) : (
        <>
          <label className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">Rounds
            <select className="rounded-sm border border-white/20 bg-[#15122b] px-3 py-1.5 text-sm text-white" value={rounds} onChange={(event) => setRounds(normalizeRoundCount(Number(event.target.value)))}>
              {roundOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="flex items-center justify-between gap-3">Answer time
            <select className="rounded-sm border border-white/20 bg-[#15122b] px-3 py-1.5 text-sm text-white" value={seconds} onChange={(event) => setSeconds(normalizeAnswerSeconds(Number(event.target.value) * 1_000))}>
              {ANSWER_TIME_OPTIONS.map((value) => <option key={value} value={value}>{value} sec</option>)}
            </select>
          </label>
        </>
      )}
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy} onClick={() => void save()} className={`${BUTTON} min-h-9 px-3 text-[11px]`}>{busy ? "Saving…" : "Apply settings"}</button>
        {note && <span aria-live="polite" className="text-[11px] text-[var(--accent-highlight)]">{note}</span>}
      </div>
    </div>
  );
}

function SettingsSummary({ snapshot, playsetTitle, isHost }: { snapshot: MultiplayerSnapshot; playsetTitle: string | null; isHost: boolean }) {
  const settings = object(snapshot.settings);
  const scoreRace = snapshot.mode === "PVP_SCORE_RACE";
  return (
    <div className="mt-5 space-y-3 text-sm text-[var(--text-secondary)]">
      <p>{isHost ? "Change the playset, mode, or match rules below before starting." : "The host can adjust the playset, mode, and rules before starting."}</p>
      <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
        <span>Category / playset</span>
        <strong className="text-right text-white">{playsetTitle || "Loading…"}</strong>
      </div>
      <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
        <span>Game mode</span>
        <strong className="text-white">{modeLabel(asText(snapshot.mode, "PVP_SPEED"))}</strong>
      </div>
      <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
        <span>{scoreRace ? "Match length" : "Rounds"}</span>
        <strong className="text-white">{scoreRace ? `${Math.round(asNumber(settings.matchDurationMs, 300_000) / 60_000)} min` : asNumber(settings.roundCount, 5)}</strong>
      </div>
      {!scoreRace && (
        <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
          <span>Answer time</span>
          <strong className="text-white">{Math.round(asNumber(settings.roundDurationMs, 15_000) / 1000)} sec</strong>
        </div>
      )}
    </div>
  );
}

function QuestionCard({ item, label, revealed }: { item: Record<string, unknown>; label: string; revealed: boolean }) {
  const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl : null;
  const attribution = typeof item.attribution === "string" ? item.attribution : null;
  const optimizable = imageUrl ? isOptimizableImageUrl(imageUrl) : false;
  return <div className="relative flex min-h-52 flex-col justify-end overflow-hidden rounded-sm border border-white/15 bg-[#15122b] p-4 sm:min-h-64">{imageUrl && <Image src={imageUrl} alt="" fill priority unoptimized={!optimizable} className="object-cover opacity-25" sizes="(max-width: 640px) 100vw, 480px" />}
    <div className="relative z-10"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-action-higher)]">{label}</p><h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">{asText(item.name, "Loading comparison…")}</h3>{revealed && <p className="mt-3 text-2xl font-black text-[var(--accent-highlight)]">{asText(item.displayValue, "")}</p>}{attribution && <p className="mt-2 text-[10px] leading-snug text-white/75">Image: {attribution}</p>}</div>
  </div>;
}

function Leaderboard({ snapshot, entries, isSpectator, results, matchRemainingMs }: { snapshot: MultiplayerSnapshot; entries: Array<Record<string, unknown>>; isSpectator: boolean; results?: Record<string, unknown> | null; matchRemainingMs: number }) {
  const mode = asText(snapshot.mode);
  const statsByActor = new Map<string, Record<string, unknown>>();
  const presenceByActor = new Map<string, Record<string, unknown>>();
  if (Array.isArray(snapshot.players)) for (const player of snapshot.players) if (typeof player.actorId === "string") presenceByActor.set(player.actorId, player);
  if (Array.isArray(results?.players)) for (const player of results.players) if (typeof player.actorId === "string") statsByActor.set(player.actorId, player);
  return <aside className={CARD} aria-label="Leaderboard"><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-time-attack)]">{isSpectator ? "Tournament view" : "Standings"}</p><h2 className="mt-1 text-xl font-bold">Leaderboard</h2></div><Trophy size={19} className="text-[var(--accent-highlight)]" /></div><ol className="space-y-2">{entries.map((entry, index) => {
    const actorId = asText(entry.actorId);
    const stats = statsByActor.get(actorId) ?? entry;
    const presence = presenceByActor.get(actorId) ?? {};
    const connected = typeof presence.connected === "boolean" ? presence.connected : typeof entry.connected === "boolean" ? entry.connected : stats.connected;
    const answered = typeof presence.answered === "boolean" ? presence.answered : typeof entry.answered === "boolean" ? entry.answered : stats.answered;
    const forfeitReason = asText(presence.forfeitReason, asText(entry.forfeitReason, asText(stats.eliminationReason)));
    return <li key={actorId || index} className={`rounded-sm border border-white/10 bg-white/[0.025] px-3 py-3 ${stats.eliminated === true || connected === false ? "opacity-45 grayscale" : ""}`}><div className="flex items-center gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-sm text-xs font-black ${index === 0 ? "bg-[var(--accent-highlight)] text-[#201b3b]" : "bg-white/10 text-white"}`}>{asNumber(entry.rank, index + 1)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{asText(entry.nickname, "Player")}</p><p className="text-[10px] text-[var(--text-muted)]">{forfeitReason === "MATCH_LEFT" ? "Left match" : stats.eliminated === true ? "Eliminated" : connected === false ? "Disconnected" : asText(snapshot.status) === "FINISHED" ? "Match finished" : asText(snapshot.phase) === "QUESTION" || asText(snapshot.phase) === "REVEAL" ? answered === true ? "Answered" : "Choosing…" : "In match"}</p></div><strong className="text-sm tabular-nums text-[var(--accent-highlight)]">{asNumber(entry.score)}</strong></div><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-11 text-[10px] text-[var(--text-muted)]">{mode.includes("HP") && <span>HP {asNumber(entry.hp, asNumber(stats.finalHp, 0))}</span>}{mode.includes("STREAK") && <span>Streak {asNumber(entry.streak, asNumber(stats.maxStreak, 0))}</span>}{(entry.roundNumber !== undefined || snapshot.roundNumber !== undefined) && <span>Round {asNumber(entry.roundNumber, asNumber(snapshot.roundNumber))}{snapshot.totalRounds ? `/${snapshot.totalRounds}` : ""}</span>}{snapshot.matchEndsAt && <span>Time {formatSeconds(matchRemainingMs)}</span>}</div></li>;
  })}</ol>{entries.length === 0 && <div className="rounded-sm border border-dashed border-white/15 p-5 text-center text-xs text-[var(--text-muted)]"><Users className="mx-auto mb-2" size={17} />Scores will appear once play begins.</div>}<p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-4 text-[var(--text-muted)]">{isSpectator ? mode === "PVP_SCORE_RACE" ? "Read-only score and mode stats. Score Race questions and answers are not shared with spectators." : "Read-only shared question view and leaderboard. Player answers and choices are never exposed." : "Scores update after each shared reveal or as players progress through Score Race."}</p></aside>;
}

function modeLabel(mode: string): string { return mode.replace(/^PVP_/, "").replaceAll("_", " "); }
function phaseLabel(phase: string): string { return ({ COUNTDOWN: "Get ready", QUESTION: "Make your call", REVEAL: "Round reveal", FINISHED: "Match complete", FINALIZING: "Saving results" } as Record<string, string>)[phase] ?? phase; }
