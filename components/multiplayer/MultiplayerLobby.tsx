"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, Copy, Crown, Users, Wifi } from "lucide-react";
import {
  BackendApiError,
  createRoom,
  fetchCategories,
  joinRoom,
  type CategorySummary,
  type RoomCredentialResponse,
  type RoomMode,
} from "@/lib/backend";

const ROOM_MODES: ReadonlyArray<{ id: RoomMode; label: string; description: string }> = [
  { id: "PVP_SPEED", label: "Speed", description: "Shared rounds. Fastest correct answer wins." },
  { id: "PVP_SCORE_RACE", label: "Score Race", description: "Five minutes of independent questions." },
  { id: "PVP_SPEED_STREAK", label: "Streak", description: "Build a multiplier with correct answers." },
  { id: "PVP_SPEED_HP", label: "HP", description: "Protect your health and outlast the room." },
];

const inputClass = "w-full rounded-sm border border-white/25 bg-[#15122b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/30";

export default function MultiplayerLobby() {
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<RoomMode>("PVP_SPEED");
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [playsetId, setPlaysetId] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [room, setRoom] = useState<RoomCredentialResponse | null>(null);

  const playableCategories = useMemo(
    () => categories.filter((category) => category.playable && category.playsetId),
    [categories],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories({ signal: controller.signal })
      .then((page) => {
        const available = page.categories.filter(
          (category) => category.playable && category.playsetId,
        );
        setCategories(page.categories);
        setPlaysetId((current) => current || available[0]?.playsetId || "");
      })
      .catch(() => setStatus("The game service is waking up. Try again in a moment."));
    return () => controller.abort();
  }, []);

  function storeRoomCredential(credential: RoomCredentialResponse) {
    window.localStorage.setItem(
      "higher-lower:room-credential:v1",
      JSON.stringify({ sessionId: credential.sessionId, roomCode: credential.roomCode, gameToken: credential.gameToken }),
    );
  }

  function reportError(error: unknown) {
    setStatus(error instanceof BackendApiError ? error.message : "Something went wrong. Please try again.");
  }

  async function handleCreate() {
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
      const credential = await createRoom({ playsetId, nickname, mode });
      storeRoomCredential(credential);
      setRoom(credential);
      setStatus(`Room ${credential.roomCode} is ready. Share the code, then start when your players arrive.`);
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!nickname.trim()) {
      setStatus("Add a nickname to continue.");
      return;
    }
    setBusy(true);
    try {
      const credential = await joinRoom({ code: roomCode, nickname });
      storeRoomCredential(credential);
      setRoom(credential);
      setStatus(`Joined room ${credential.roomCode}. Waiting for the host to start.`);
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(room?.roomCode || "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setStatus("Invite links will be available when rooms are online.");
    }
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:text-white">
          <ArrowLeft size={16} aria-hidden="true" /> Back to game
        </Link>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <span className="size-1.5 rounded-full bg-[var(--accent-highlight)]" /> Multiplayer beta
        </span>
      </header>

      <section className="mx-auto w-full max-w-4xl flex-1 py-12 sm:py-16">
        <div className="mb-9 text-center sm:mb-12">
          <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent-action-higher)]">
            <Users size={15} aria-hidden="true" /> Play together
          </div>
          <h1 className="text-4xl font-bold leading-none tracking-[-0.07em] text-white [text-shadow:4px_4px_0_var(--accent-time-attack)] sm:text-6xl">
            MULTIPLAYER
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Bring your friends. Compare your instincts. The room is yours.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-md border border-white/20 bg-[#1b1734]/90 p-5 shadow-[0_8px_0_var(--accent-classic)] sm:p-7" aria-labelledby="create-title">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-action-higher)]">Host a match</p>
                <h2 id="create-title" className="text-2xl font-bold">Create room</h2>
              </div>
              <span className="grid size-10 place-items-center rounded-sm border border-white/20 bg-white/[0.04] text-[var(--accent-highlight)]"><Crown size={18} aria-hidden="true" /></span>
            </div>

            <label className="mb-5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Your nickname
              <input className={`${inputClass} mt-2 normal-case tracking-normal`} maxLength={18} placeholder="e.g. Quiz captain" value={nickname} onChange={(event) => setNickname(event.target.value)} />
            </label>

            <label className="mb-5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Category
              <select
                className={`${inputClass} mt-2`}
                value={playsetId}
                onChange={(event) => setPlaysetId(event.target.value)}
                disabled={busy || playableCategories.length === 0}
              >
                {playableCategories.length === 0 ? (
                  <option value="">Loading available categories…</option>
                ) : (
                  playableCategories.map((category) => (
                    <option key={category.playsetId} value={category.playsetId ?? ""}>
                      {category.title}
                    </option>
                  ))
                )}
              </select>
            </label>

            <fieldset className="mb-5">
              <legend className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Game mode</legend>
              <div className="grid grid-cols-2 gap-2">
                {ROOM_MODES.map((value) => (
                  <button key={value.id} type="button" onClick={() => setMode(value.id)} aria-pressed={mode === value.id}
                    className={`rounded-sm border px-3 py-3 text-left transition ${mode === value.id ? "border-[var(--accent-time-attack)] bg-[var(--accent-time-attack)]/10 text-white" : "border-white/20 text-[var(--text-muted)] hover:border-white/50"}`}>
                    <span className="block text-sm font-bold">{value.label}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-[var(--text-muted)]">{value.description}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <button disabled={busy} type="button" onClick={handleCreate} className="group relative flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[var(--accent-time-attack)] px-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 active:translate-y-0.5 disabled:cursor-wait disabled:opacity-60">
              {busy ? "Connecting…" : "Create room"} <ArrowUpRight size={16} aria-hidden="true" />
            </button>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-[var(--text-muted)]">
              <span>Room status</span><span className="inline-flex items-center gap-2"><span className="size-1.5 rounded-full bg-[var(--accent-highlight)]" /> {room ? "Ready" : "Waiting to connect"}</span>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-sm border border-dashed border-white/15 px-3 py-2.5 text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-2"><Users size={14} /> {room ? `Room ${room.roomCode}` : "2–30 players"}</span>
              <button disabled={!room} type="button" onClick={copyInvite} className="inline-flex items-center gap-1.5 font-bold text-[var(--text-secondary)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label="Copy room code">
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Invite"}
              </button>
            </div>
          </section>

          <section className="flex flex-col rounded-md border border-white/20 bg-[#1b1734]/75 p-5 sm:p-7" aria-labelledby="join-title">
            <div className="mb-6">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-time-attack)]">Got an invite?</p>
              <h2 id="join-title" className="text-2xl font-bold">Join room</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Enter the room code shared by your host to take a seat.</p>
            </div>
            <label className="mb-5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Room code
              <input className={`${inputClass} mt-2 font-bold uppercase tracking-[0.22em]`} maxLength={8} placeholder="ABCD12" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
            </label>
            <div className="mb-6 flex min-h-28 flex-1 flex-col items-center justify-center rounded-sm border border-dashed border-white/15 bg-white/[0.02] px-4 text-center">
              <Wifi size={20} className="mb-2 text-[var(--text-muted)]" aria-hidden="true" />
              <p className="text-xs font-bold text-[var(--text-secondary)]">Room preview</p>
              <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">Room details and player list will appear here.</p>
            </div>
            <button disabled={busy} type="button" onClick={handleJoin} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-sm border border-white/80 bg-transparent px-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-[var(--bg-base)] disabled:cursor-wait disabled:opacity-60">
              {busy ? "Connecting…" : "Join room"} <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </section>
        </div>

        <div aria-live="polite" className="mx-auto mt-6 min-h-6 text-center text-xs font-bold text-[var(--accent-highlight)]">{status}</div>
        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Rooms are live · Match controls arrive in the next integration pass</p>
      </section>
      <footer className="pb-2 text-center text-[10px] uppercase tracking-[0.12em] text-white/35">Higher or Lower · Party mode</footer>
    </main>
  );
}
