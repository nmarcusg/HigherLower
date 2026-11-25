"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  LoaderCircle,
  Trophy,
  Wifi,
} from "lucide-react";
import {
  BackendApiError,
  createRoom,
  fetchCategories,
  fetchPublicPlayset,
  fetchPublicPlaysets,
  joinRoom,
  type CategorySummary,
  type PublicPlaysetSummary,
  type RoomMode,
} from "@/lib/backend";
import {
  createSpectatorCredential,
  previewRoomByCode,
  readRoomCredential,
  storeRoomCredential,
  type MultiplayerSnapshot,
  type RoomPreview,
} from "@/lib/backend/multiplayer";
import { fetchPublicSettings } from "@/lib/backend/publicSettings";
import {
  PlaysetPickerField,
  buildPlaysetPickerOptions,
} from "@/components/multiplayer/PlaysetPickerModal";
import AdSlot from "@/components/ads/AdSlot";

const ROOM_MODES: ReadonlyArray<{ id: RoomMode; label: string; description: string }> = [
  { id: "PVP_SPEED", label: "Speed", description: "Shared rounds. Fastest correct answer wins." },
  { id: "PVP_SCORE_RACE", label: "Score Race", description: "Five minutes of independent questions." },
  { id: "PVP_SPEED_STREAK", label: "Streak", description: "Build a multiplier with correct answers." },
  { id: "PVP_SPEED_HP", label: "HP", description: "Protect your health and outlast the room." },
];

function modeDisplayName(mode: string): string {
  return ROOM_MODES.find((m) => m.id === mode)?.label ?? mode.replace(/^PVP_/, "").replaceAll("_", " ");
}

function previewStatusBadgeClass(status: string): string {
  if (status === "LOBBY") return "border-cyan-400/45 bg-cyan-500/15 text-cyan-200";
  if (status === "RUNNING" || status === "FINALIZING") {
    return "border-emerald-400/45 bg-emerald-500/15 text-emerald-200";
  }
  if (status === "CANCELLED") return "border-red-400/45 bg-red-500/20 text-red-200";
  return "border-white/25 bg-white/10 text-white/80";
}

const inputClass =
  "w-full rounded-sm border border-white/25 bg-[#15122b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/30";

const NICKNAME_KEY = "higher-lower:nickname:v1";

export default function MultiplayerLobby() {
  const router = useRouter();
  const [nickname, setNickname] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(NICKNAME_KEY) ?? "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(NICKNAME_KEY, nickname.trim());
    } catch {
      /* storage may be blocked */
    }
  }, [nickname]);

  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<RoomMode>("PVP_SPEED");
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [customPlaysets, setCustomPlaysets] = useState<PublicPlaysetSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [playsetId, setPlaysetId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [roundCount, setRoundCount] = useState(5);
  const [answerTimeSeconds, setAnswerTimeSeconds] = useState<3 | 5 | 10 | 15>(15);
  const [matchDurationMinutes, setMatchDurationMinutes] = useState(5);
  const [recentRoom, setRecentRoom] = useState(false);
  const [roomsCreateEnabled, setRoomsCreateEnabled] = useState(true);

  const [preview, setPreview] = useState<RoomPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const playableCategories = useMemo(
    () => categories.filter((category) => category.playable && category.playsetId),
    [categories],
  );
  const pickerOptions = useMemo(
    () => buildPlaysetPickerOptions(playableCategories, customPlaysets),
    [playableCategories, customPlaysets],
  );

  useEffect(() => {
    const saved = readRoomCredential();
    const requestedPlayset =
      new URLSearchParams(window.location.search).get("playset")?.trim() || "";
    queueMicrotask(() => {
      setRecentRoom(Boolean(saved));
      if (requestedPlayset) setPlaysetId(requestedPlayset);
    });
    const controller = new AbortController();
    void fetchPublicSettings()
      .then((settings) => {
        if (!controller.signal.aborted) {
          setRoomsCreateEnabled(settings.features.roomsCreateEnabled);
        }
      })
      .catch(() => undefined);

    Promise.allSettled([
      fetchCategories({ signal: controller.signal }),
      fetchPublicPlaysets({ limit: 50, signal: controller.signal }),
    ])
      .then(([categoryResult, playsetResult]) => {
        const available =
          categoryResult.status === "fulfilled"
            ? categoryResult.value.categories.filter(
                (category) => category.playable && category.playsetId,
              )
            : [];
        const fetchedPlaysets =
          playsetResult.status === "fulfilled" ? playsetResult.value.playsets : [];

        if (categoryResult.status === "fulfilled") {
          setCategories(categoryResult.value.categories);
          setPlaysetId((current) => current || available[0]?.playsetId || "");
        }
        if (playsetResult.status === "fulfilled") {
          setCustomPlaysets(fetchedPlaysets);
          if (categoryResult.status !== "fulfilled" && fetchedPlaysets.length > 0) {
            setPlaysetId((current) => current || fetchedPlaysets[0].id);
          }
        }
        if (categoryResult.status === "rejected" && playsetResult.status === "rejected") {
          setStatus("The game service is waking up. Try again in a moment.");
        }

        if (requestedPlayset) {
          const alreadyKnown =
            available.some((category) => category.playsetId === requestedPlayset) ||
            fetchedPlaysets.some((playset) => playset.id === requestedPlayset);
          if (!alreadyKnown) {
            void fetchPublicPlayset(requestedPlayset, { signal: controller.signal })
              .then((playset) => {
                if (controller.signal.aborted) return;
                setCustomPlaysets((current) =>
                  current.some((item) => item.id === playset.id)
                    ? current
                    : [
                        ...current,
                        {
                          id: playset.id,
                          title: playset.title,
                          description: playset.description,
                          metricName: playset.metricName,
                          metricUnit: playset.metricUnit,
                          itemCount: playset.itemCount,
                          revision: playset.revision,
                        },
                      ],
                );
                setPlaysetId(playset.id);
              })
              .catch(() => undefined);
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });
    return () => controller.abort();
  }, []);

  // QA-27: live room stats lookup when typing a room code
  useEffect(() => {
    const clean = roomCode.trim();
    if (clean.length < 4) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void previewRoomByCode(clean, controller.signal)
        .then((res) => {
          if (controller.signal.aborted) return;
          setPreview(res);
          setPreviewError("");
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setPreview(null);
          setPreviewError(
            err instanceof Error ? err.message : `No room found with code ${clean}.`,
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setPreviewLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [roomCode]);

  function onRoomCodeChange(raw: string) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setRoomCode(clean);
    if (clean.trim().length < 4) {
      setPreview(null);
      setPreviewError("");
      setPreviewLoading(false);
    } else {
      setPreviewLoading(true);
      setPreviewError("");
    }
  }

  function reportError(error: unknown) {
    setStatus(
      error instanceof BackendApiError ? error.message : "Something went wrong. Please try again.",
    );
  }

  async function loadUnlistedPlayset(
    id: string,
  ): Promise<{ ok: boolean; message: string; id?: string }> {
    try {
      const playset = await fetchPublicPlayset(id);
      setCustomPlaysets((current) =>
        current.some((item) => item.id === playset.id)
          ? current
          : [
              ...current,
              {
                id: playset.id,
                title: playset.title,
                description: playset.description,
                metricName: playset.metricName,
                metricUnit: playset.metricUnit,
                itemCount: playset.itemCount,
                revision: playset.revision,
              },
            ],
      );
      setPlaysetId(playset.id);
      return {
        ok: true,
        id: playset.id,
        message: `Selected “${playset.title}” (${playset.itemCount} items).`,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "That published set could not be loaded.",
      };
    }
  }

  async function handleCreate() {
    if (!roomsCreateEnabled) {
      setStatus("Room creation is temporarily paused by administrators.");
      return;
    }
    if (!nickname.trim()) {
      setStatus("Add a nickname to continue.");
      return;
    }
    if (!playsetId) {
      setStatus("Choose an available category first.");
      return;
    }
    setBusy(true);
    try {
      const credential = await createRoom({
        playsetId,
        nickname,
        mode,
        ...(mode === "PVP_SCORE_RACE"
          ? { matchDurationMinutes }
          : { roundCount, answerTimeSeconds }),
      });
      storeRoomCredential({
        ...credential,
        state: credential.state as unknown as MultiplayerSnapshot,
        nickname,
        entry: "create",
      });
      setStatus(`Room ${credential.roomCode} is ready. Opening the room…`);
      router.push(`/multiplayer/room/${encodeURIComponent(credential.sessionId)}?entry=create`);
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }

  const isWatchOnly = Boolean(
    preview &&
      (preview.status === "RUNNING" ||
        preview.status === "FINALIZING" ||
        preview.status === "FINISHED" ||
        !preview.joinableAsPlayer),
  );

  async function handleJoin() {
    if (!nickname.trim()) {
      setStatus("Add a nickname to continue.");
      return;
    }
    if (roomCode.trim().length < 4) {
      setStatus("Enter the room code shared by your host.");
      return;
    }
    if (preview?.status === "CANCELLED") {
      setStatus("That room has already ended.");
      return;
    }
    setBusy(true);
    try {
      const credential = isWatchOnly
        ? await createSpectatorCredential(roomCode, nickname)
        : await joinRoom({ code: roomCode, nickname });
      storeRoomCredential({
        ...credential,
        state: credential.state as unknown as MultiplayerSnapshot,
        nickname,
        entry: isWatchOnly ? "spectate" : "join",
      });
      setStatus(`Joined room ${credential.roomCode}. Opening the room…`);
      router.push(
        `/multiplayer/room/${encodeURIComponent(credential.sessionId)}?entry=${
          isWatchOnly ? "spectate" : "join"
        }`,
      );
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }

  function rejoinRecentRoom() {
    const saved = readRoomCredential();
    if (!saved) {
      setRecentRoom(false);
      setStatus("No saved room access is available on this device.");
      return;
    }
    router.push(`/multiplayer/room/${encodeURIComponent(saved.sessionId)}`);
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:text-white"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to game
        </Link>
      </header>

      <section className="mx-auto w-full max-w-4xl flex-1 py-10 sm:py-14">
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="text-4xl font-bold leading-none tracking-[-0.07em] text-white [text-shadow:4px_4px_0_var(--accent-time-attack)] sm:text-6xl">
            MULTIPLAYER
          </h1>
        </div>

        <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
          <section
            className="rounded-md border border-white/20 bg-[#1b1734]/90 p-5 shadow-[0_8px_0_var(--accent-classic)] sm:p-7"
            aria-labelledby="create-title"
          >
            <div className="mb-5">
              <h2 id="create-title" className="text-2xl font-bold">
                Create room
              </h2>
            </div>

            {!roomsCreateEnabled && (
              <div
                role="status"
                className="mb-5 rounded-sm border border-amber-400/40 bg-amber-950/35 px-3.5 py-2.5 text-xs text-amber-100"
              >
                New room creation is temporarily paused by administrators.
              </div>
            )}

            <label className="mb-5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Your nickname
              <input
                className={`${inputClass} mt-2 normal-case tracking-normal`}
                maxLength={18}
                placeholder="e.g. Quiz captain"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
            </label>

            <PlaysetPickerField
              className="mb-5"
              label="Category or published playset"
              options={pickerOptions}
              selectedId={playsetId}
              onSelect={setPlaysetId}
              disabled={busy}
              loading={catalogLoading}
              onLoadUnlisted={loadUnlistedPlayset}
            />

            <fieldset className="mb-5">
              <legend className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                Game mode
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {ROOM_MODES.map((value) => (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => setMode(value.id)}
                    aria-pressed={mode === value.id}
                    className={`rounded-sm border px-3 py-3 text-left transition ${
                      mode === value.id
                        ? "border-[var(--accent-time-attack)] bg-[var(--accent-time-attack)]/10 text-white"
                        : "border-white/20 text-[var(--text-muted)] hover:border-white/50"
                    }`}
                  >
                    <span className="block text-sm font-bold">{value.label}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-[var(--text-muted)]">
                      {value.description}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {mode === "PVP_SCORE_RACE" ? (
              <label className="mb-5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                Match length
                <select
                  className={`${inputClass} mt-2`}
                  value={matchDurationMinutes}
                  onChange={(event) => setMatchDurationMinutes(Number(event.target.value))}
                >
                  {Array.from({ length: 15 }, (_, index) => index + 1).map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minute{minutes === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="mb-5 grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Rounds
                  <select
                    className={`${inputClass} mt-2`}
                    value={roundCount}
                    onChange={(event) => setRoundCount(Number(event.target.value))}
                  >
                    {[5, 10, 15, 20, 25, 30].map((count) => (
                      <option key={count} value={count}>
                        {count} rounds
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Answer timer
                  <select
                    className={`${inputClass} mt-2`}
                    value={answerTimeSeconds}
                    onChange={(event) =>
                      setAnswerTimeSeconds(Number(event.target.value) as 3 | 5 | 10 | 15)
                    }
                  >
                    {([3, 5, 10, 15] as const).map((seconds) => (
                      <option key={seconds} value={seconds}>
                        {seconds} seconds
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <button
              disabled={busy || !roomsCreateEnabled}
              type="button"
              onClick={handleCreate}
              className="group relative flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-[var(--accent-time-attack)] px-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy ? "Connecting…" : "Create room"} <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </section>

          <section
            className="flex flex-col rounded-md border border-white/20 bg-[#1b1734]/75 p-5 sm:p-7"
            aria-labelledby="join-title"
          >
            <div className="mb-5">
              <h2 id="join-title" className="text-2xl font-bold">
                Join room
              </h2>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                Enter the room code to preview live stats, then choose whether to play or spectate inside the lobby.
              </p>
            </div>
            <label className="mb-5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Room code
              <input
                className={`${inputClass} mt-2 font-bold uppercase tracking-[0.22em]`}
                maxLength={8}
                placeholder="ABCD12"
                value={roomCode}
                onChange={(event) => onRoomCodeChange(event.target.value)}
              />
            </label>

            {/* QA-27 Live Room Preview */}
            <div
              aria-live="polite"
              className="mb-6 flex min-h-40 flex-1 flex-col justify-center rounded-sm border border-dashed border-white/20 bg-white/[0.025] p-4"
            >
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 text-center text-xs text-[var(--text-secondary)]">
                  <LoaderCircle size={20} className="animate-spin text-[var(--accent-highlight)]" />
                  <span>Looking up room stats…</span>
                </div>
              ) : preview ? (
                <div className="space-y-3 text-left text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Room {preview.roomCode}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-white">
                        {preview.playsetTitle ?? "Custom Playset"}
                      </p>
                      {preview.metricName && (
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Metric: {preview.metricName}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${previewStatusBadgeClass(preview.status)}`}
                    >
                      {preview.status}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                    <div>
                      <dt className="text-[var(--text-muted)]">Mode</dt>
                      <dd className="font-bold text-white">{modeDisplayName(preview.mode)}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Host</dt>
                      <dd className="truncate font-bold text-white">
                        {preview.hostNickname ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Playing / Slots</dt>
                      <dd className="font-bold tabular-nums text-white">
                        {preview.playerCount} / {preview.maxPlayers}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Spectating</dt>
                      <dd className="font-bold tabular-nums text-[var(--text-secondary)]">
                        {preview.spectatorCount}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[var(--text-muted)]">Rules</dt>
                      <dd className="font-semibold text-[var(--text-secondary)]">
                        {preview.mode === "PVP_SCORE_RACE"
                          ? `${preview.settings.matchDurationMinutes ?? 5} min score race`
                          : `${preview.settings.roundCount ?? 5} rounds · ${preview.settings.answerTimeSeconds ?? 15}s per answer`}
                        {preview.currentRound > 0 && preview.totalRounds > 0
                          ? ` (Now on round ${preview.currentRound}/${preview.totalRounds})`
                          : ""}
                      </dd>
                    </div>
                  </dl>

                  {preview.leaders.length > 0 && (
                    <div className="border-t border-white/10 pt-2">
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--accent-highlight)]">
                        <Trophy size={11} aria-hidden="true" /> Live standings
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {preview.leaders.map((leader, idx) => (
                          <span
                            key={`${leader.nickname}-${idx}`}
                            className="rounded border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] text-white"
                          >
                            {idx + 1}. {leader.nickname} ({leader.score})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {preview.status === "CANCELLED" && (
                    <p className="rounded border border-red-400/35 bg-red-950/35 p-2 text-[11px] text-red-200">
                      {preview.endedBy === "ADMIN"
                        ? `Ended by an administrator${preview.endReason ? `: ${preview.endReason}` : "."}`
                        : preview.endedBy === "EXPIRED"
                          ? "This lobby expired due to inactivity."
                          : "The host ended this room."}
                    </p>
                  )}
                </div>
              ) : previewError ? (
                <div className="text-center">
                  <Wifi size={20} className="mx-auto mb-2 text-amber-300/80" aria-hidden="true" />
                  <p className="text-xs font-bold text-amber-200">{previewError}</p>
                  <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                    Double-check the 6-character code from your host.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Wifi size={20} className="mx-auto mb-2 text-[var(--text-muted)]" aria-hidden="true" />
                  <p className="text-xs font-bold text-[var(--text-secondary)]">Room preview</p>
                  <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                    Type a room code to inspect category, mode, players, and live scores before joining.
                  </p>
                </div>
              )}
            </div>

            <button
              disabled={busy || preview?.status === "CANCELLED"}
              type="button"
              onClick={handleJoin}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-sm border border-white/80 bg-transparent px-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-[var(--bg-base)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy
                ? "Connecting…"
                : preview?.status === "CANCELLED"
                  ? "Room ended"
                  : isWatchOnly
                    ? "Watch live match"
                    : "Join room"}{" "}
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
            {recentRoom && (
              <button
                type="button"
                onClick={rejoinRecentRoom}
                className="mt-3 min-h-10 w-full text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent-highlight)] hover:text-white"
              >
                Rejoin your recent room
              </button>
            )}
          </section>
        </div>

        <div
          aria-live="polite"
          className="mx-auto mt-6 min-h-6 text-center text-xs font-bold text-[var(--accent-highlight)]"
        >
          {status}
        </div>
        <AdSlot slot="lobby_sidebar" className="mt-6" />
      </section>
      <footer className="flex flex-wrap items-center justify-center gap-4 pb-2 text-[10px] uppercase tracking-[0.12em] text-white/35">
        <span>Higher or Lower · Party mode</span>
        <Link href="/privacy" className="hover:text-white">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-white">
          Terms
        </Link>
      </footer>
    </main>
  );
}
