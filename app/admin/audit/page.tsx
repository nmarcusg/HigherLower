"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminRefreshButton from "@/components/admin/AdminRefreshButton";
import AdminTable from "@/components/admin/AdminTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { fetchAdminAudit } from "@/lib/backend/admin";

type AuditData = Awaited<ReturnType<typeof fetchAdminAudit>>;

export default function AdminAuditPage() {
  const { token } = useAdminAuth();
  const [actionFilter, setActionFilter] = useState("");
  const [targetType, setTargetType] = useState("");
  const [logs, setLogs] = useState<AuditData["logs"]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminAudit(token, {
        action: actionFilter.trim() || undefined,
        targetType: targetType.trim() || undefined,
      });
      setLogs(res.logs);
      setTotal(res.total);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load audit log.");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, targetType, token]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Immutable Audit Log</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Every moderation decision, account restriction, Pro grant, payment link, catalog access override, and settings change.
          </p>
        </div>
        <div className="flex items-start gap-4">
          <span className="pt-2 text-xs text-[var(--text-muted)]">{total} event(s)</span>
          <AdminRefreshButton tabKey="audit" onRefresh={load} />
        </div>
      </header>

      <search>
        <form
          onSubmit={onSubmit}
          className="flex flex-wrap items-end gap-3 rounded-md border border-white/15 bg-[#121628] p-4"
        >
          <label className="min-w-48 flex-1 text-[11px] font-bold uppercase text-[var(--text-muted)]">
            Action filter
            <input
              type="search"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="e.g. PLAYSET_REMOVE or STAFF_"
              className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-[11px] font-bold uppercase text-[var(--text-muted)]">
            Target Type
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="mt-1.5 block rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
            >
              <option value="">All</option>
              <option value="playset">playset</option>
              <option value="category">category</option>
              <option value="creator">creator</option>
              <option value="uploaded_media">uploaded_media</option>
              <option value="payment">payment</option>
              <option value="app_settings">app_settings</option>
              <option value="game_session">game_session</option>
              <option value="staff_member">staff_member</option>
              <option value="staff_invite">staff_invite</option>
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase text-[#15122b]"
          >
            <Search size={14} /> Filter
          </button>
        </form>
      </search>

      {error && (
        <div role="alert" className="rounded-sm border border-red-400/40 bg-red-950/30 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      <AdminTable
        caption="Staff Actions History"
        loading={loading}
        rows={logs}
        rowKey={(l) => l.id}
        rowHeaderLabel="Action"
        rowHeader={(l) => (
          <div>
            <p className="font-mono text-xs text-[var(--accent-highlight)]">{l.action}</p>
            <p className="text-[10px] font-normal text-[var(--text-muted)]">
              {new Date(l.createdAt).toLocaleString()}
            </p>
          </div>
        )}
        columns={[
          {
            key: "actor",
            label: "Actor",
            render: (l) => (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px]">{l.actorUserId.slice(0, 12)}…</span>
                <StatusBadge value={l.actorRole} />
              </div>
            ),
          },
          {
            key: "target",
            label: "Target",
            render: (l) => (
              <span className="font-mono text-[11px]">
                {l.targetType}:{l.targetId}
              </span>
            ),
          },
          { key: "reason", label: "Reason", render: (l) => l.reason ?? "—" },
        ]}
      />
    </div>
  );
}
