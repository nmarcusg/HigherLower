"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Database, Mail, Play, Search, Trash2, UserPlus, X } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminRefreshButton from "@/components/admin/AdminRefreshButton";
import AdminTable from "@/components/admin/AdminTable";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  fetchAdminCreators,
  fetchAdminStaff,
  fetchAdminSystem,
  grantAdminStaff,
  revokeAdminStaff,
  revokeAdminStaffInvite,
  runAdminRetentionCleanup,
  triggerAdminRollup,
  type AdminCreatorSummary,
  type AdminStaffInvite,
  type StaffRole,
} from "@/lib/backend/admin";

type SystemData = Awaited<ReturnType<typeof fetchAdminSystem>>;
type StaffData = Awaited<ReturnType<typeof fetchAdminStaff>>;
type CleanupPreview = Awaited<ReturnType<typeof runAdminRetentionCleanup>>;

export default function AdminSystemStaffPage() {
  const { token, identity } = useAdminAuth();
  const [sys, setSys] = useState<SystemData | null>(null);
  const [staff, setStaff] = useState<StaffData["staff"]>([]);
  const [invites, setInvites] = useState<AdminStaffInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanupDays, setCleanupDays] = useState("30");
  const [cleanupPreview, setCleanupPreview] = useState<CleanupPreview | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newProvider, setNewProvider] = useState<"" | "google" | "discord">("");
  const [newRole, setNewRole] = useState<StaffRole>("MODERATOR");
  const [newUserId, setNewUserId] = useState("");
  const [showManualUuid, setShowManualUuid] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminCreatorSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<AdminCreatorSummary | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (identity.role !== "SUPERADMIN") return;
    setLoading(true);
    try {
      const [sysRes, staffRes] = await Promise.all([
        fetchAdminSystem(token),
        fetchAdminStaff(token),
      ]);
      setSys(sysRes);
      setStaff(staffRes.staff);
      setInvites(staffRes.invites ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load system status.");
    } finally {
      setLoading(false);
    }
  }, [identity.role, token]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (identity.role !== "SUPERADMIN" || trimmed.length < 2) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetchAdminCreators(token, { q: trimmed, limit: 6 });
        if (active) setSearchResults(res.creators);
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [identity.role, searchQuery, token]);

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
    const resolvedUserId = selectedCreator?.userId ?? newUserId.trim();
    const resolvedEmail = (selectedCreator?.email ?? newEmail).trim();
    if (!resolvedEmail && !resolvedUserId) {
      setError("Enter an email address, pick an existing user, or specify a Supabase User ID.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await grantAdminStaff(token, {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
        ...(resolvedEmail ? { email: resolvedEmail } : {}),
        role: newRole,
        ...(newProvider ? { provider: newProvider } : {}),
      });
      setNewUserId("");
      setNewEmail("");
      setNewProvider("");
      setSelectedCreator(null);
      setSearchQuery("");
      setSearchResults([]);
      if (result.status === "PENDING_INVITE") {
        setNotice(
          `Invite queued for ${result.invite.email} (${result.invite.role}). Access unlocks automatically on their first verified sign-in.`,
        );
      } else {
        setNotice(
          `Granted ${result.role} access to ${result.email ?? result.username ?? result.userId}.`,
        );
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grant staff role.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(inviteId: string, email: string) {
    setBusy(true);
    setError("");
    try {
      await revokeAdminStaffInvite(token, inviteId, "Cancelled via Admin System console");
      setNotice(`Cancelled pending invite for ${email}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel invite.");
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">System, Retention &amp; Staff</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Database readiness, analytics rollup, safe 30-day session retention cleanup, and RBAC staff roster.
          </p>
        </div>
        <AdminRefreshButton tabKey="system" onRefresh={load} />
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

      <div className="grid gap-4 sm:grid-cols-4">
        {sys ? (
          <>
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
          </>
        ) : (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-md border border-white/10 bg-[#121628]" />
          ))
        )}
      </div>

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
            <UserPlus size={14} /> Grant / Invite Staff Member
          </h2>

          {selectedCreator && (
            <div className="flex items-center justify-between gap-2 rounded border border-emerald-400/40 bg-emerald-950/25 px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="font-bold text-white">
                  {selectedCreator.displayName}{" "}
                  <span className="font-normal text-[var(--text-muted)]">
                    (@{selectedCreator.handle} · {selectedCreator.authProvider.toUpperCase()})
                  </span>
                </p>
                <p className="truncate text-[11px] text-emerald-200">
                  {selectedCreator.email ?? selectedCreator.userId}
                </p>
              </div>
              <button
                type="button"
                aria-label="Clear selected user"
                onClick={() => {
                  setSelectedCreator(null);
                  setNewUserId("");
                }}
                className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {!selectedCreator && (
            <div className="space-y-2">
              <label className="block text-xs text-[var(--text-muted)]">
                Find Existing User (Discord username, handle, display name, or email)
                <div className="relative mt-1.5">
                  <Search
                    size={13}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      if (val.trim().length < 2) {
                        setSearchResults([]);
                      }
                    }}
                    placeholder="Type at least 2 characters to search users…"
                    className="w-full rounded-sm border border-white/20 bg-[#0b0d17] py-2 pl-8 pr-3 text-sm text-white"
                  />
                </div>
              </label>
              {searchQuery.trim().length >= 2 && (
                <div className="max-h-40 overflow-y-auto rounded-sm border border-white/15 bg-[#0b0d17] text-xs">
                  {searching ? (
                    <p className="p-2.5 text-[var(--text-muted)]">Searching…</p>
                  ) : searchResults.length === 0 ? (
                    <p className="p-2.5 text-[var(--text-muted)]">
                      No matching users yet — invite them by verified email below.
                    </p>
                  ) : (
                    searchResults.map((c) => (
                      <button
                        key={c.userId}
                        type="button"
                        onClick={() => {
                          setSelectedCreator(c);
                          setNewUserId(c.userId);
                          if (c.email) setNewEmail(c.email);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="flex w-full items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-left last:border-b-0 hover:bg-white/5"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">
                            {c.displayName}{" "}
                            <span className="font-normal text-[var(--text-muted)]">@{c.handle}</span>
                          </p>
                          <p className="truncate text-[11px] text-[var(--text-secondary)]">
                            {c.email ?? c.userId}
                          </p>
                        </div>
                        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--accent-action-higher)]">
                          {c.authProvider}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-[var(--text-muted)] sm:col-span-2">
              Google or Discord Email
              <input
                type="email"
                disabled={Boolean(selectedCreator)}
                value={selectedCreator?.email ?? newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="staff@gmail.com (works before their first sign-in)"
                className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white disabled:opacity-60"
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
              Allowed Login Provider
              <select
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value as "" | "google" | "discord")}
                className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
              >
                <option value="">Any verified (Google / Discord)</option>
                <option value="google">Google only</option>
                <option value="discord">Discord only</option>
              </select>
            </label>
          </div>

          {!selectedCreator && (
            <div>
              <button
                type="button"
                onClick={() => setShowManualUuid((v) => !v)}
                className="text-[11px] font-semibold text-[var(--text-muted)] underline hover:text-white"
              >
                {showManualUuid ? "Hide manual User ID field" : "Or enter Supabase User ID manually"}
              </button>
              {showManualUuid && (
                <input
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="Optional UUID from Supabase Auth or Denied screen"
                  className="mt-2 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 font-mono text-xs text-white"
                />
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase text-[#15122b] disabled:opacity-50"
          >
            <Mail size={13} /> {selectedCreator || newUserId.trim() ? "Grant Staff Access" : "Grant / Send Invite"}
          </button>
        </form>
      </div>

      {invites.length > 0 && (
        <AdminTable
          caption="Pending Email Invites (auto-claimed on first verified login)"
          loading={loading}
          rows={invites}
          rowKey={(inv) => inv.id}
          rowHeaderLabel="Email"
          rowHeader={(inv) => (
            <div>
              <p className="text-xs font-semibold text-white">{inv.email}</p>
              {inv.reason && (
                <p className="text-[11px] font-normal text-[var(--text-muted)]">{inv.reason}</p>
              )}
            </div>
          )}
          columns={[
            {
              key: "role",
              label: "Role",
              render: (inv) => <StatusBadge value={inv.role} />,
            },
            {
              key: "provider",
              label: "Provider",
              render: (inv) => (inv.provider ? inv.provider.toUpperCase() : "Google or Discord"),
            },
            {
              key: "created",
              label: "Invited",
              render: (inv) => new Date(inv.createdAt).toLocaleDateString(),
            },
            {
              key: "act",
              label: "Action",
              align: "right",
              render: (inv) => (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void revokeInvite(inv.id, inv.email)}
                  className="rounded border border-red-400/40 px-2.5 py-1 text-[10px] font-bold uppercase text-red-300 hover:bg-red-950/30"
                >
                  Cancel
                </button>
              ),
            },
          ]}
        />
      )}

      <AdminTable
        caption="Staff Roster"
        loading={loading}
        rows={staff}
        rowKey={(s) => s.userId}
        rowHeaderLabel="Staff Member"
        rowHeader={(s) => (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-white">
                {s.displayName || (s.username ? `@${s.username}` : s.email || s.userId)}
              </p>
              {s.username && (
                <span className="text-[11px] font-normal text-[var(--text-secondary)]">
                  @{s.username}
                </span>
              )}
              {s.authProvider && (
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--accent-action-higher)]">
                  {s.authProvider}
                </span>
              )}
              {s.protected && (
                <StatusBadge value="PROTECTED" label="Protected" lockIcon />
              )}
            </div>
            <p className="text-[11px] font-normal text-[var(--text-secondary)]">
              {s.email ?? "No verified email synced yet (never signed in)"}
            </p>
            <p className="font-mono text-[10px] font-normal text-[var(--text-muted)]">{s.userId}</p>
          </div>
        )}
        columns={[
          {
            key: "role",
            label: "Role",
            render: (s) => <StatusBadge value={s.role} />,
          },
          {
            key: "status",
            label: "Status",
            render: (s) =>
              s.revokedAt ? (
                <StatusBadge
                  value="REVOKED"
                  label={`Revoked (${new Date(s.revokedAt).toLocaleDateString()})`}
                />
              ) : (
                <StatusBadge value="ACTIVE" />
              ),
          },
          { key: "by", label: "Granted By", render: (s) => s.grantedBy ?? "CLI" },
          {
            key: "act",
            label: "Action",
            align: "right",
            render: (s) =>
              s.protected ? (
                <span className="text-[11px] font-semibold text-[var(--accent-highlight)]">
                  Unrevokable
                </span>
              ) : !s.revokedAt ? (
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
