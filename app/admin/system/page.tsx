"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Database, Play, Trash2, UserPlus } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminTable from "@/components/admin/AdminTable";
import {
  fetchAdminStaff,
  fetchAdminSystem,
  grantAdminStaff,
  revokeAdminStaff,
  runAdminRetentionCleanup,
  triggerAdminRollup,
  type StaffRole,
} from "@/lib/backend/admin";

type SystemData = Awaited<ReturnType<typeof fetchAdminSystem>>;
type StaffData = Awaited<ReturnType<typeof fetchAdminStaff>>;
type CleanupPreview = Awaited<ReturnType<typeof runAdminRetentionCleanup>>;

export default function AdminSystemStaffPage() {
  const { token, identity } = useAdminAuth();
  const [sys, setSys] = useState<SystemData | null>(null);
  const [staff, setStaff] = useState<StaffData["staff"]>([]);
  const [cleanupDays, setCleanupDays] = useState("30");
  const [cleanupPreview, setCleanupPreview] = useState<CleanupPreview | null>(null);

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<StaffRole>("MODERATOR");
  const [newEmail, setNewEmail] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (identity.role !== "SUPERADMIN") return;
    try {
      const [sysRes, staffRes] = await Promise.all([
        fetchAdminSystem(token),
        fetchAdminStaff(token),
      ]);
      setSys(sysRes);
      setStaff(staffRes.staff);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load system status.");
    }
  }, [identity.role, token]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function runRollup() {
    setBusy(true);
    setError("");
    try {
      await triggerAdminRollup(token);
      setNotice("Daily metrics rollup completed for yesterday and today.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rollup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runCleanup(apply: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await runAdminRetentionCleanup(token, Number(cleanupDays) || 30, apply);
      setCleanupPreview(res);
      if (apply) {
        setNotice(
          `Cleanup applied: deleted ${res.deletedSessions} session(s), ${res.deletedResults} result(s), ${res.deletedVisitors} visitor row(s).`,
        );
        await load();
      } else {
        setNotice("Cleanup dry run complete. Review counts before applying.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleanup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addStaff(event: FormEvent) {
    event.preventDefault();
    if (!newUserId.trim()) return;
    setBusy(true);
    setError("");
    try {
      await grantAdminStaff(token, {
        userId: newUserId.trim(),
        role: newRole,
        ...(newEmail.trim() ? { email: newEmail.trim() } : {}),
      });
      setNewUserId("");
      setNewEmail("");
      setNotice("Staff access granted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grant staff role.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(userId: string) {
    setBusy(true);
    setError("");
    try {
      await revokeAdminStaff(token, userId, "Revoked via Admin System console");
      setNotice(`Revoked staff access for ${userId}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke staff member.");
    } finally {
      setBusy(false);
    }
  }

  if (identity.role !== "SUPERADMIN") {
    return (
      <p className="rounded border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">
        Superadmin role is required to view System &amp; Staff controls.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">System, Retention &amp; Staff</h1>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Database readiness, analytics rollup, safe 30-day session retention cleanup, and RBAC staff roster.
        </p>
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

      {sys && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-md border border-white/15 bg-[#121628] p-4">
            <p className="text-[11px] uppercase text-[var(--text-muted)]">Postgres DB</p>
            <p className="mt-1 text-xl font-bold">
              {sys.dbReady ? `Ready (${sys.dbLatencyMs}ms)` : "Unavailable"}
            </p>
          </div>
          <div className="rounded-md border border-white/15 bg-[#121628] p-4">
            <p className="text-[11px] uppercase text-[var(--text-muted)]">Process &amp; Memory</p>
            <p className="mt-1 text-xl font-bold">{sys.memoryMb.rss} MB RSS</p>
            <p className="text-[11px] text-[var(--text-muted)]">Uptime {Math.floor(sys.uptimeSeconds / 60)}m</p>
          </div>
          <div className="rounded-md border border-white/15 bg-[#121628] p-4">
            <p className="text-[11px] uppercase text-[var(--text-muted)]">Playset Uploads</p>
            <p className="mt-1 text-xl font-bold">{sys.storage.uploadedMediaCount} files</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {(sys.storage.uploadedMediaBytes / 1024).toFixed(1)} KB total
            </p>
          </div>
          <div className="rounded-md border border-white/15 bg-[#121628] p-4">
            <p className="text-[11px] uppercase text-[var(--text-muted)]">Latest Rollup</p>
            <p className="mt-1 text-xl font-bold">{sys.rollup.lastRolledDay ?? "Never"}</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {sys.rollup.dailyVisitorRows} daily visitor rows
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-md border border-white/15 bg-[#121628] p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              <Database size={14} /> Metrics Rollup &amp; Retention Cleanup
            </h2>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runRollup()}
              className="inline-flex min-h-8 items-center gap-1.5 rounded border border-white/25 px-3 text-[11px] font-bold uppercase text-white hover:bg-white/10"
            >
              <Play size={12} /> Run Rollup Now
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t border-white/10 pt-4">
            <label className="text-xs text-[var(--text-muted)]">
              Retention Window (days)
              <input
                type="number"
                min={1}
                max={3650}
                value={cleanupDays}
                onChange={(e) => setCleanupDays(e.target.value)}
                className="mt-1.5 block w-28 rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runCleanup(false)}
              className="min-h-10 rounded-sm border border-white/25 px-4 text-xs font-bold uppercase text-white hover:bg-white/10"
            >
              Dry Run
            </button>
            <button
              type="button"
              disabled={busy || !cleanupPreview || cleanupPreview.unrolledDays > 0}
              onClick={() => void runCleanup(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-sm bg-red-600 px-4 text-xs font-bold uppercase text-white disabled:opacity-45"
            >
              <Trash2 size={13} /> Apply Cleanup
            </button>
          </div>

          {cleanupPreview && (
            <div className="rounded border border-white/10 bg-black/25 p-3 text-xs text-[var(--text-secondary)]">
              <p>
                Eligible sessions: <strong>{cleanupPreview.sessionsCount}</strong> · Results:{" "}
                <strong>{cleanupPreview.resultsCount}</strong> · Old visitors (&gt;90d):{" "}
                <strong>{cleanupPreview.oldVisitorsCount}</strong>
              </p>
              {cleanupPreview.unrolledDays > 0 && (
                <p className="mt-1 font-bold text-amber-300">
                  Blocked: {cleanupPreview.unrolledDays} day(s) in window have not been rolled up into
                  daily_metrics yet. Click &ldquo;Run Rollup Now&rdquo; first.
                </p>
              )}
            </div>
          )}
        </section>

        <form
          onSubmit={(e) => void addStaff(e)}
          className="space-y-4 rounded-md border border-white/15 bg-[#121628] p-5"
        >
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            <UserPlus size={14} /> Grant / Update Staff Role
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-[var(--text-muted)] sm:col-span-2">
              Supabase User ID
              <input
                required
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="UUID from Supabase Auth or Denied screen"
                className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              Role
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as StaffRole)}
                className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
              >
                <option value="MODERATOR">MODERATOR</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPERADMIN">SUPERADMIN</option>
              </select>
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              Label / Email (optional)
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="staff@example.com"
                className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="min-h-10 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase text-[#15122b]"
          >
            Save Staff Member
          </button>
        </form>
      </div>

      <AdminTable
        caption="Staff Roster"
        rows={staff}
        rowKey={(s) => s.userId}
        rowHeaderLabel="User ID"
        rowHeader={(s) => (
          <div>
            <p className="font-mono text-xs">{s.userId}</p>
            <p className="text-[11px] font-normal text-[var(--text-muted)]">{s.email ?? "—"}</p>
          </div>
        )}
        columns={[
          { key: "role", label: "Role", render: (s) => s.role },
          {
            key: "status",
            label: "Status",
            render: (s) =>
              s.revokedAt ? (
                <span className="text-red-300">Revoked ({new Date(s.revokedAt).toLocaleDateString()})</span>
              ) : (
                <span className="text-emerald-300">Active</span>
              ),
          },
          { key: "by", label: "Granted By", render: (s) => s.grantedBy ?? "CLI" },
          {
            key: "act",
            label: "Action",
            align: "right",
            render: (s) =>
              !s.revokedAt ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void revoke(s.userId)}
                  className="rounded border border-red-400/40 px-2.5 py-1 text-[10px] font-bold uppercase text-red-300 hover:bg-red-950/30"
                >
                  Revoke
                </button>
              ) : (
                "—"
              ),
          },
        ]}
      />
    </div>
  );
}
