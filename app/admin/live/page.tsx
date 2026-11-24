"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Save, Search, ShieldOff, UserX } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminRefreshButton from "@/components/admin/AdminRefreshButton";
import AdminTable from "@/components/admin/AdminTable";
import StatusBadge from "@/components/admin/StatusBadge";
import NativeModalDialog from "@/components/ui/NativeModalDialog";
import {
  fetchAdminLive,
  forceEndAdminRoom,
  hasMinRole,
  kickAdminParticipant,
  lookupAdminSession,
  updateAdminSettings,
} from "@/lib/backend/admin";

type LiveData = Awaited<ReturnType<typeof fetchAdminLive>>;
type LookupData = Awaited<ReturnType<typeof lookupAdminSession>>;

export default function AdminLiveOpsPage() {
  const { token, identity } = useAdminAuth();
  const isAdmin = hasMinRole(identity.role, "ADMIN");
  const isSuperAdmin = identity.role === "SUPERADMIN";
  const [live, setLive] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState("");
  const [roomsCreateEnabled, setRoomsCreateEnabled] = useState(true);
  const [soloCreateEnabled, setSoloCreateEnabled] = useState(true);
  const [creatorPublishEnabled, setCreatorPublishEnabled] = useState(true);
  const [creatorUploadEnabled, setCreatorUploadEnabled] = useState(true);

  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupData | null>(null);

  const [endTarget, setEndTarget] = useState<{ sessionId: string; roomCode: string | null } | null>(null);
  const [kickTarget, setKickTarget] = useState<{ sessionId: string; actorId: string; nickname: string } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminLive(token);
      setLive(res);
      setBanner(res.settings.maintenanceBanner);
      setRoomsCreateEnabled(res.settings.features.roomsCreateEnabled);
      setSoloCreateEnabled(res.settings.features.soloCreateEnabled);
      setCreatorPublishEnabled(res.settings.features.creatorPublishEnabled);
      setCreatorUploadEnabled(res.settings.features.creatorUploadEnabled);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load live ops view.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function saveKillSwitches(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateAdminSettings(
        token,
        isSuperAdmin
          ? {
              "maintenance.banner": banner,
              "rooms.create.enabled": roomsCreateEnabled,
              "solo.create.enabled": soloCreateEnabled,
              "creator.publish.enabled": creatorPublishEnabled,
              "creator.upload.enabled": creatorUploadEnabled,
            }
          : {
              "maintenance.banner": banner,
            },
        isSuperAdmin
          ? "Updated Live Ops kill-switches / maintenance banner"
          : "Updated maintenance banner",
      );
      setNotice(isSuperAdmin ? "Live switches and banner saved." : "Maintenance banner saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save controls.");
    } finally {
      setBusy(false);
    }
  }

  async function runLookup(event: FormEvent) {
    event.preventDefault();
    if (!lookupQuery.trim()) return;
    setError("");
    try {
      setLookupResult(await lookupAdminSession(token, lookupQuery.trim()));
    } catch (err) {
      setLookupResult(null);
      setError(err instanceof Error ? err.message : "Session not found.");
    }
  }

  async function confirmForceEnd() {
    if (!endTarget) return;
    const trimmed = actionReason.trim() || "Ended by staff";
    if (trimmed.length < 3) {
      setError("Enter a reason (min 3 characters).");
      return;
    }
    setBusy(true);
    try {
      await forceEndAdminRoom(token, endTarget.sessionId, trimmed);
      setNotice(`Room ${endTarget.roomCode ?? endTarget.sessionId} ended.`);
      setEndTarget(null);
      setActionReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end room.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmKick() {
    if (!kickTarget) return;
    const trimmed = actionReason.trim() || "Removed by staff";
    if (trimmed.length < 3) {
      setError("Enter a reason (min 3 characters).");
      return;
    }
    setBusy(true);
    try {
      await kickAdminParticipant(
        token,
        kickTarget.sessionId,
        kickTarget.actorId,
        trimmed,
      );
      setNotice(`Removed ${kickTarget.nickname} from room.`);
      setKickTarget(null);
      setActionReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not kick participant.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Live Ops &amp; Kill-Switches</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Monitor active multiplayer rooms, inspect sessions, toggle emergency switches, and set maintenance notices.
          </p>
        </div>
        <AdminRefreshButton tabKey="live" onRefresh={load} />
      </header>

      {error && (
        <div role="alert" className="rounded-sm border border-red-400/40 bg-red-950/30 p-3 text-xs text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-sm border border-emerald-400/40 bg-emerald-950/30 p-3 text-xs text-emerald-200">
          {notice}
        </div>
      )}

      {/* Fixed-height KPI Strip prevents layout shift while loading */}
      <div className="grid gap-4 sm:grid-cols-4">
        {live ? (
          <>
            <div className="h-[88px] rounded-md border border-white/15 bg-[#121628] p-4">
              <p className="text-[11px] uppercase text-[var(--text-muted)]">Active Matches</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{live.summary.activeRooms}</p>
            </div>
            <div className="h-[88px] rounded-md border border-white/15 bg-[#121628] p-4">
              <p className="text-[11px] uppercase text-[var(--text-muted)]">Lobby Rooms</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{live.summary.lobbyRooms}</p>
            </div>
            <div className="h-[88px] rounded-md border border-white/15 bg-[#121628] p-4">
              <p className="text-[11px] uppercase text-[var(--text-muted)]">Connected Sockets</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{live.summary.connectedSockets}</p>
            </div>
            <div className="h-[88px] rounded-md border border-white/15 bg-[#121628] p-4">
              <p className="text-[11px] uppercase text-[var(--text-muted)]">Live Solo Sessions</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{live.summary.liveSoloSessions}</p>
            </div>
          </>
        ) : (
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[88px] animate-pulse rounded-md border border-white/10 bg-[#121628]"
            />
          ))
        )}
      </div>

      {/* Always mounted to prevent layout shift */}
      <AdminTable
        caption="Active Multiplayer Rooms (Lobby & Running)"
        loading={!live || loading}
        loadingMessage="Loading active rooms…"
        emptyMessage="No active multiplayer rooms right now."
        rows={live?.rooms ?? []}
        rowKey={(r) => r.sessionId}
        rowHeaderLabel="Room"
        rowHeader={(r) => (
          <div>
            <p className="font-mono font-bold text-[var(--accent-highlight)]">{r.roomCode ?? "—"}</p>
            <p className="text-[11px] font-normal text-[var(--text-muted)]">{r.playsetTitle}</p>
          </div>
        )}
        columns={[
          { key: "mode", label: "Mode", render: (r) => r.mode },
          {
            key: "status",
            label: "Phase",
            render: (r) => (
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge value={r.status} />
                {r.phase !== r.status && <StatusBadge value={r.phase} />}
              </div>
            ),
          },
          {
            key: "players",
            label: "Players",
            render: (r) => `${r.playerCount}p / ${r.spectatorCount}w (${r.connectedPlayers} live)`,
          },
          {
            key: "participants",
            label: "Participants",
            render: (r) => (
              <div className="flex flex-wrap gap-1.5">
                {r.participants.map((p) => (
                  <button
                    key={p.actorId}
                    type="button"
                    onClick={() => setKickTarget({ sessionId: r.sessionId, actorId: p.actorId, nickname: p.nickname })}
                    className="inline-flex items-center gap-1 rounded border border-white/15 bg-black/25 px-1.5 py-0.5 text-[10px] hover:border-red-400/50 hover:text-red-200"
                  >
                    {p.nickname}
                    <UserX size={10} />
                  </button>
                ))}
              </div>
            ),
          },
          {
            key: "action",
            label: "Control",
            align: "right",
            render: (r) => (
              <button
                type="button"
                onClick={() => setEndTarget({ sessionId: r.sessionId, roomCode: r.roomCode })}
                className="inline-flex items-center gap-1 rounded bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white hover:brightness-110"
              >
                <ShieldOff size={11} /> Force-End
              </button>
            ),
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {isAdmin && (
          <form
            onSubmit={(e) => void saveKillSwitches(e)}
            className="space-y-4 rounded-md border border-white/15 bg-[#121628] p-5"
          >
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {isSuperAdmin
                ? "Maintenance Banner & Feature Kill-Switches"
                : "Maintenance Banner"}
            </h2>
            <label className="block text-xs text-[var(--text-muted)]">
              Maintenance Banner Text (empty to hide)
              <input
                value={banner}
                onChange={(e) => setBanner(e.target.value)}
                placeholder="e.g. Scheduled maintenance tonight at 02:00 UTC"
                className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
              />
            </label>
            {isSuperAdmin ? (
              <div className="grid gap-2 text-xs text-[var(--text-secondary)] sm:grid-cols-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={soloCreateEnabled}
                    onChange={(e) => setSoloCreateEnabled(e.target.checked)}
                  />
                  Solo sessions enabled
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={roomsCreateEnabled}
                    onChange={(e) => setRoomsCreateEnabled(e.target.checked)}
                  />
                  Room creation enabled
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={creatorPublishEnabled}
                    onChange={(e) => setCreatorPublishEnabled(e.target.checked)}
                  />
                  Creator publishing enabled
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={creatorUploadEnabled}
                    onChange={(e) => setCreatorUploadEnabled(e.target.checked)}
                  />
                  Creator uploads enabled
                </label>
              </div>
            ) : (
              <div className="rounded border border-white/10 bg-black/25 p-3 text-xs text-[var(--text-muted)]">
                Global feature kill-switches (Solo: {soloCreateEnabled ? "On" : "Off"} · Rooms:{" "}
                {roomsCreateEnabled ? "On" : "Off"} · Publish:{" "}
                {creatorPublishEnabled ? "On" : "Off"} · Uploads:{" "}
                {creatorUploadEnabled ? "On" : "Off"}) require{" "}
                <span className="text-[var(--text-secondary)]">SUPERADMIN</span> to toggle.
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase text-[#15122b]"
            >
              <Save size={13} /> {isSuperAdmin ? "Apply Controls" : "Save Banner"}
            </button>
          </form>
        )}

        <section className="space-y-4 rounded-md border border-white/15 bg-[#121628] p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Session / Room Code Lookup
          </h2>
          <form onSubmit={(e) => void runLookup(e)} className="flex gap-2">
            <input
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              placeholder="Session UUID or 6-char room code"
              className="flex-1 rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              className="inline-flex min-h-9 items-center gap-1 rounded-sm bg-[var(--accent-highlight)] px-3 text-xs font-bold uppercase text-[#15122b]"
            >
              <Search size={13} /> Find
            </button>
          </form>

          {lookupResult && (
            <div className="space-y-2 rounded border border-white/10 bg-black/25 p-3 text-xs">
              <div className="flex flex-wrap items-center gap-2 font-bold text-white">
                <span>{lookupResult.kind} · {lookupResult.mode}</span>
                <StatusBadge value={lookupResult.status} />
              </div>
              <p className="text-[var(--text-muted)]">
                Playset: {lookupResult.playsetTitle} · Code: {lookupResult.roomCode ?? "solo"}
              </p>
              <ul className="space-y-1 pt-1">
                {lookupResult.participants.map((p) => (
                  <li key={p.actorId} className="text-[var(--text-secondary)]">
                    {p.nickname} ({p.role}, {p.status}) — Score {p.score}
                    {p.eliminationReason ? ` · ${p.eliminationReason}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <NativeModalDialog
        open={Boolean(endTarget)}
        onClose={() => setEndTarget(null)}
        eyebrow="Live Room Intervention"
        title={`Force-end room ${endTarget?.roomCode ?? ""}?`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-[var(--text-secondary)]">
            Connected players will see that an administrator ended the room along with the reason you enter below.
          </p>
          <input
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="Reason shown to participants (required)"
            className="w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
          />
          <div className="flex justify-end gap-2">
            <button type="button" autoFocus onClick={() => setEndTarget(null)} className="min-h-9 rounded border border-white/25 px-3 font-bold uppercase">
              Cancel
            </button>
            <button type="button" disabled={busy} onClick={() => void confirmForceEnd()} className="min-h-9 rounded bg-red-600 px-3 font-bold uppercase text-white">
              Force-End Room
            </button>
          </div>
        </div>
      </NativeModalDialog>

      <NativeModalDialog
        open={Boolean(kickTarget)}
        onClose={() => setKickTarget(null)}
        eyebrow="Live Room Intervention"
        title={`Kick ${kickTarget?.nickname ?? "participant"}?`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-[var(--text-secondary)]">
            Immediately revokes their room credential, disconnects their WebSocket, and shows them the administrator removal reason.
          </p>
          <input
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="Reason shown to participant (required)"
            className="w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
          />
          <div className="flex justify-end gap-2">
            <button type="button" autoFocus onClick={() => setKickTarget(null)} className="min-h-9 rounded border border-white/25 px-3 font-bold uppercase">
              Cancel
            </button>
            <button type="button" disabled={busy} onClick={() => void confirmKick()} className="min-h-9 rounded bg-red-600 px-3 font-bold uppercase text-white">
              Kick Participant
            </button>
          </div>
        </div>
      </NativeModalDialog>
    </div>
  );
}
