"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminRefreshButton from "@/components/admin/AdminRefreshButton";
import AdminTable from "@/components/admin/AdminTable";
import AdminTabs from "@/components/admin/AdminTabs";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  fetchAdminClusters,
  fetchAdminCreators,
  type AdminCreatorSummary,
  type StaffRole,
} from "@/lib/backend/admin";

type CreatorTab = "all" | "clusters";

export default function AdminCreatorsPage() {
  const { token } = useAdminAuth();
  const [tab, setTab] = useState<CreatorTab>("all");
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("");
  const [creators, setCreators] = useState<AdminCreatorSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [clusters, setClusters] = useState<
    Array<{
      deviceHashShort: string;
      accountCount: number;
      totalFreeSlots: number;
      accounts: Array<{
        userId: string;
        handle: string;
        displayName: string;
        email: string | null;
        authProvider: string;
        tier: "FREE" | "PRO";
        staffRole?: StaffRole | null;
        activeSlotsUsed: number;
        lastSeenAt: string;
      }>;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const requested = new URLSearchParams(window.location.search).get("tab");
      if (requested === "clusters" || requested === "all") {
        setTab(requested);
      }
    });
  }, []);

  const loadCreators = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminCreators(token, {
        q: q.trim() || undefined,
        tier: tier || undefined,
      });
      setCreators(res.creators);
      setTotal(res.total);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load creators.");
    } finally {
      setLoading(false);
    }
  }, [q, tier, token]);

  const loadClusters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminClusters(token);
      setClusters(res.clusters);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load device clusters.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (tab === "all") return loadCreators();
      return loadClusters();
    });
  }, [loadClusters, loadCreators, tab]);

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
    void loadCreators();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Creators &amp; Anti-Alt</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Manage Free (3 sets / 50 items) vs. Creator Pro (25 sets / 200 items) accounts, staff creators, and device clusters.
          </p>
        </div>
        <div className="flex items-start gap-4">
          <span className="pt-2 text-xs text-[var(--text-muted)]">
            {tab === "all" ? `${total} creator(s)` : `${clusters.length} device cluster(s)`}
          </span>
          <AdminRefreshButton
            tabKey={`creators:${tab}`}
            onRefresh={tab === "all" ? loadCreators : loadClusters}
          />
        </div>
      </header>

      <AdminTabs
        label="Creator views"
        tabs={[
          { id: "all", label: "All Creators", badge: total || undefined },
          { id: "clusters", label: "Suspected Multi-Account Clusters", badge: clusters.length || undefined },
        ]}
        activeId={tab}
        onChange={setTab}
      />

      {error && (
        <div role="alert" className="rounded-sm border border-red-400/40 bg-red-950/30 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {tab === "all" ? (
        <>
          <search>
            <form
              onSubmit={onSearchSubmit}
              className="flex flex-wrap items-end gap-3 rounded-md border border-white/15 bg-[#121628] p-4"
            >
              <label className="min-w-56 flex-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Search handle, email, or user ID
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="@handle or email…"
                  className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white outline-none focus:border-[var(--focus-ring)]"
                />
              </label>
              <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Tier
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="mt-1.5 block rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
                >
                  <option value="">All</option>
                  <option value="FREE">FREE</option>
                  <option value="PRO">PRO</option>
                </select>
              </label>
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase text-[#15122b]"
              >
                <Search size={14} /> Search
              </button>
            </form>
          </search>

          <AdminTable
            caption="Registered Creators"
            loading={loading}
            rows={creators}
            rowKey={(c) => c.userId}
            rowHeaderLabel="Creator"
            rowHeader={(c) => (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/creators/${encodeURIComponent(c.userId)}`}
                    className="font-bold text-[var(--accent-action-higher)] hover:underline"
                  >
                    @{c.handle}
                  </Link>
                  {c.staffRole && <StatusBadge value={c.staffRole} />}
                </div>
                <p className="text-[11px] font-normal text-[var(--text-muted)]">
                  {c.displayName} · {c.authProvider}
                </p>
              </div>
            )}
            columns={[
              {
                key: "tier",
                label: "Tier",
                render: (c) => (
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                      c.tier === "PRO"
                        ? "border-[var(--accent-highlight)]/50 bg-[var(--accent-highlight)]/15 text-[var(--accent-highlight)]"
                        : "border-white/20 bg-white/10 text-white/80"
                    }`}
                  >
                    {c.tier === "PRO" && <Sparkles size={10} />}
                    {c.tier}
                  </span>
                ),
              },
              {
                key: "slots",
                label: "Slots Used",
                render: (c) => `${c.activeSlotsUsed}/${c.maxPlaysets} (${c.maxItemsPerSet}/set)`,
              },
              {
                key: "storage",
                label: "Media",
                render: (c) => `${c.mediaCount} (${Math.round(c.storageBytes / 1024)} KB)`,
              },
              {
                key: "restrictions",
                label: "Restrictions",
                render: (c) =>
                  c.activeRestrictions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {c.activeRestrictions.map((r) => (
                        <StatusBadge key={r} value={r} />
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--text-muted)]">None</span>
                  ),
              },
              {
                key: "view",
                label: "Action",
                align: "right",
                render: (c) => (
                  <Link
                    href={`/admin/creators/${encodeURIComponent(c.userId)}`}
                    className="inline-flex items-center gap-1 rounded border border-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white hover:border-[var(--accent-highlight)] hover:text-[var(--accent-highlight)]"
                  >
                    View <ArrowUpRight size={11} aria-hidden="true" />
                  </Link>
                ),
              },
            ]}
          />
        </>
      ) : (
        <div className="space-y-4">
          {loading && clusters.length === 0 ? (
            <div className="rounded-md border border-white/15 bg-[#121628] p-8 text-center text-sm text-[var(--text-muted)]">
              Loading device clusters…
            </div>
          ) : clusters.length === 0 ? (
            <div className="rounded-md border border-white/15 bg-[#121628] p-8 text-center text-sm text-[var(--text-muted)]">
              No multi-account device clusters detected.
            </div>
          ) : (
            clusters.map((cluster) => (
              <section
                key={cluster.deviceHashShort}
                className="rounded-md border border-amber-300/30 bg-[#121628] p-5"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-mono text-xs font-bold text-amber-200">
                    Device cluster #{cluster.deviceHashShort}
                  </h2>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {cluster.accountCount} accounts · {cluster.totalFreeSlots} total free slots used
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {cluster.accounts.map((acc) => (
                    <Link
                      key={acc.userId}
                      href={`/admin/creators/${encodeURIComponent(acc.userId)}`}
                      className="rounded-sm border border-white/10 bg-black/25 p-3 hover:border-white/30"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-white">@{acc.handle}</p>
                        <StatusBadge value={acc.tier} />
                        {acc.staffRole && <StatusBadge value={acc.staffRole} />}
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {acc.email ?? acc.authProvider} · {acc.activeSlotsUsed} active set(s)
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}
    </div>
  );
}
