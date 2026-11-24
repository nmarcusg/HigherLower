"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminRefreshButton from "@/components/admin/AdminRefreshButton";
import AdminTable from "@/components/admin/AdminTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { fetchAdminPlaysets, type AdminPlaysetSummary } from "@/lib/backend/admin";

export default function AdminPlaysetsPage() {
  const { token } = useAdminAuth();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [moderationState, setModerationState] = useState("");
  const [sortBy, setSortBy] = useState<string>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [playsets, setPlaysets] = useState<AdminPlaysetSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminPlaysets(token, {
        q: q.trim() || undefined,
        kind,
        moderationState: moderationState || undefined,
        sortBy,
        sortDir,
      });
      setPlaysets(res.playsets);
      setTotal(res.total);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load playsets.");
    } finally {
      setLoading(false);
    }
  }, [kind, moderationState, q, sortBy, sortDir, token]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void load();
  }

  function handleSort(columnKey: string) {
    if (sortBy === columnKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(columnKey);
      setSortDir("asc");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Playsets Inspector</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Search and sort across official system and community playsets, including hidden/removed items.
          </p>
        </div>
        <div className="flex items-start gap-4">
          <span className="pt-2 text-xs text-[var(--text-muted)]">{total} total match(es)</span>
          <AdminRefreshButton tabKey="playsets" onRefresh={load} />
        </div>
      </header>

      <search>
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded-md border border-white/15 bg-[#121628] p-4">
          <label className="min-w-56 flex-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Search title, ID, handle, or email
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. monthly, countries, or @handle"
              className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white outline-none focus:border-[var(--focus-ring)]"
            />
          </label>
          <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Source
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="mt-1.5 block rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
            >
              <option value="all">All</option>
              <option value="custom">Custom</option>
              <option value="system">Official</option>
            </select>
          </label>
          <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Moderation
            <select
              value={moderationState}
              onChange={(e) => setModerationState(e.target.value)}
              className="mt-1.5 block rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
            >
              <option value="">Any</option>
              <option value="UNREVIEWED">Unreviewed</option>
              <option value="APPROVED">Approved</option>
              <option value="HIDDEN">Hidden</option>
              <option value="REMOVED">Removed</option>
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
        caption="All Playsets"
        loading={loading}
        rows={playsets}
        rowKey={(r) => r.id}
        rowHeaderLabel="Playset"
        rowHeaderSortKey="title"
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        rowHeader={(r) => (
          <div>
            <Link
              href={`/admin/playsets/${encodeURIComponent(r.id)}`}
              className="font-bold text-[var(--accent-action-higher)] hover:underline"
            >
              {r.title}
            </Link>
            <p className="text-[11px] font-normal text-[var(--text-muted)]">
              {r.creator ? `@${r.creator.handle}` : "Official System"} · {r.itemCount} items
            </p>
          </div>
        )}
        columns={[
          {
            key: "status",
            label: "Status",
            sortKey: "status",
            render: (r) => (
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge value={r.status} />
                <StatusBadge value={r.visibility} />
              </div>
            ),
          },
          {
            key: "mod",
            label: "Moderation",
            sortKey: "moderationState",
            render: (r) => <StatusBadge value={r.moderationState} />,
          },
          {
            key: "reports",
            label: "Open Reports",
            align: "right",
            sortKey: "reports",
            render: (r) =>
              r.openReports > 0 ? (
                <span className="font-bold text-red-300 tabular-nums">{r.openReports}</span>
              ) : (
                <span className="text-[var(--text-muted)] tabular-nums">0</span>
              ),
          },
          {
            key: "plays",
            label: "30d Plays",
            align: "right",
            sortKey: "plays",
            render: (r) => <span className="font-bold tabular-nums">{r.plays30d}</span>,
          },
          {
            key: "updated",
            label: "Updated",
            sortKey: "updatedAt",
            render: (r) => (
              <span className="text-xs text-[var(--text-muted)]">
                {new Date(r.updatedAt).toLocaleDateString()}
              </span>
            ),
          },
          {
            key: "action",
            label: "Action",
            align: "right",
            render: (r) => (
              <Link
                href={`/admin/playsets/${encodeURIComponent(r.id)}`}
                className="inline-flex items-center gap-1 rounded border border-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white hover:border-[var(--accent-highlight)] hover:text-[var(--accent-highlight)]"
              >
                View <ArrowUpRight size={11} aria-hidden="true" />
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
