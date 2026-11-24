"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, TrendingUp, Users } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminTable from "@/components/admin/AdminTable";
import { fetchAdminDashboard, type AdminDashboardData } from "@/lib/backend/admin";

function formatMinor(amountMinor: number, currency: string) {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: major % 1 === 0 ? 0 : 2,
    }).format(major);
  } catch {
    return `${major} ${currency}`;
  }
}

export default function AdminDashboardPage() {
  const { token } = useAdminAuth();
  const [days, setDays] = useState<7 | 30>(7);
  const [windowTab, setWindowTab] = useState<"today" | "range7d" | "range30d">("today");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchAdminDashboard(token, days);
      setData(res);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }, [days, token]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const audienceWindow = data ? data.audience[windowTab] : null;
  const maxReach = Math.max(1, ...(data?.series.map((d) => d.totalReach) ?? [1]));
  const maxGames = Math.max(1, ...(data?.series.map((d) => d.gamesStarted) ?? [1]));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard &amp; Audience</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Deduplicated reach (Visitors + Creators = Total Reach), 30d gameplay, and live runtime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-sm border border-white/15 bg-[#121628] p-0.5 text-xs">
            {(["today", "range7d", "range30d"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindowTab(w)}
                className={`rounded-sm px-2.5 py-1.5 font-bold uppercase tracking-[0.08em] ${
                  windowTab === w
                    ? "bg-[var(--accent-highlight)] text-[#15122b]"
                    : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                {w === "today" ? "Today" : w === "range7d" ? "7d" : "30d"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-white/20 px-3 text-xs font-bold uppercase text-[var(--text-secondary)] hover:text-white"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-sm border border-red-400/40 bg-red-950/30 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {data && audienceWindow && (
        <>
          {/* Live strip (10s poll) */}
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-white/15 bg-[#121628] px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-5">
              <span className="inline-flex items-center gap-2 font-bold uppercase tracking-[0.12em] text-emerald-300">
                <span className="size-2 rounded-full bg-emerald-400" />
                Live Runtime
              </span>
              <span>
                Active rooms: <strong className="text-white">{data.live.activeRooms}</strong>{" "}
                <span className="text-[var(--text-muted)]">({data.live.lobbyRooms} lobby)</span>
              </span>
              <span>
                Sockets: <strong className="text-white">{data.live.connectedSockets}</strong>
              </span>
              <span>
                Solo sessions: <strong className="text-white">{data.live.liveSoloSessions}</strong>
              </span>
            </div>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              v{data.live.build.version} · {data.live.build.commitShort ?? "local"} ({data.live.build.environment})
            </span>
          </section>

          {/* Audience Headline Cards */}
          <section aria-labelledby="audience-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="audience-heading" className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                <Users size={14} /> Audience Breakdown ({windowTab === "today" ? "Today UTC" : windowTab === "range7d" ? "Last 7 days" : "Last 30 days"})
              </h2>
              <span className="text-xs text-[var(--text-muted)]">
                Registered creators: <strong className="text-white">{data.audience.creatorsTotal}</strong> ({data.audience.proCreators} Pro)
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-md border border-white/15 bg-[#121628] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Anonymous Visitors
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-white">
                  {audienceWindow.visitorsAnonymous.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  No account required · hashed device reach
                </p>
              </div>
              <div className="rounded-md border border-white/15 bg-[#121628] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Creators Active
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--accent-action-higher)]">
                  {audienceWindow.creatorsActive.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Linked devices never double-counted as visitors
                </p>
              </div>
              <div className="rounded-md border border-[var(--accent-highlight)]/45 bg-[#18162b] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent-highlight)]">
                  Total Reach (Visitors + Creators)
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-white">
                  {audienceWindow.totalReach.toLocaleString()}
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Deduplicated unique reach in window
                </p>
              </div>
            </div>
          </section>

          {/* Gameplay & Monetization KPIs + Attention */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section className="rounded-md border border-white/15 bg-[#121628] p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                30-Day Gameplay &amp; Monetization
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">Games Started</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{data.gameplay.gamesStarted}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">Completion Rate</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{data.gameplay.completionRate}%</p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">Solo / Rooms</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {data.gameplay.soloCount} / {data.gameplay.roomCount}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">Custom Share</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{data.gameplay.customShare}%</p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">Creator Pro Unlocks</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-[var(--accent-highlight)]">
                    {data.monetization.proUnlocks} ({data.monetization.conversionRate}%)
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[var(--text-muted)]">Ads Status</p>
                  <p className="mt-1 text-sm font-bold uppercase">
                    {data.monetization.adsEnabled ? (
                      <span className="text-emerald-300">Enabled</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">Paused</span>
                    )}
                  </p>
                </div>
              </div>
              {data.monetization.revenueByCurrency.length > 0 && (
                <div className="border-t border-white/10 pt-3 text-xs text-[var(--text-secondary)]">
                  Revenue:{" "}
                  {data.monetization.revenueByCurrency
                    .map((r) => `${r.provider}: ${formatMinor(r.amountMinor, r.currency)} (${r.count})`)
                    .join(" · ")}
                </div>
              )}
            </section>

            <section className="rounded-md border border-white/15 bg-[#121628] p-5">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-highlight)]">
                <AlertCircle size={14} /> Needs Attention
              </h2>
              <ul className="mt-4 space-y-2.5 text-xs">
                <li className="flex items-center justify-between">
                  <Link href="/admin/moderation" className="text-[var(--text-secondary)] hover:text-white">
                    Open visitor reports
                  </Link>
                  <span className={`font-bold ${data.attention.openReports > 0 ? "text-red-300" : "text-white/60"}`}>
                    {data.attention.openReports}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <Link href="/admin/moderation?tab=flagged" className="text-[var(--text-secondary)] hover:text-white">
                    Auto-flagged custom sets
                  </Link>
                  <span className={`font-bold ${data.attention.autoFlaggedCount > 0 ? "text-amber-300" : "text-white/60"}`}>
                    {data.attention.autoFlaggedCount}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <Link href="/admin/creators?tab=clusters" className="text-[var(--text-secondary)] hover:text-white">
                    Multi-account device clusters
                  </Link>
                  <span className={`font-bold ${data.attention.suspectedClustersCount > 0 ? "text-amber-300" : "text-white/60"}`}>
                    {data.attention.suspectedClustersCount}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <Link href="/admin/payments" className="text-[var(--text-secondary)] hover:text-white">
                    Unmatched Ko-fi payments
                  </Link>
                  <span className={`font-bold ${data.attention.unmatchedPaymentsCount > 0 ? "text-amber-300" : "text-white/60"}`}>
                    {data.attention.unmatchedPaymentsCount}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <Link href="/admin/catalog" className="text-[var(--text-secondary)] hover:text-white">
                    Failing catalog providers
                  </Link>
                  <span className={`font-bold ${data.attention.failingCategories > 0 ? "text-red-300" : "text-white/60"}`}>
                    {data.attention.failingCategories}
                  </span>
                </li>
              </ul>
            </section>
          </div>

          {/* Daily Trend Charts (inline SVG) */}
          <section className="rounded-md border border-white/15 bg-[#121628] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                <TrendingUp size={14} /> Daily Trend ({days} days)
              </h2>
              <div className="inline-flex rounded-sm border border-white/15 bg-[#0b0d17] p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDays(7)}
                  className={`rounded-sm px-2.5 py-1 font-bold ${days === 7 ? "bg-white/15 text-white" : "text-[var(--text-muted)]"}`}
                >
                  7d
                </button>
                <button
                  type="button"
                  onClick={() => setDays(30)}
                  className={`rounded-sm px-2.5 py-1 font-bold ${days === 30 ? "bg-white/15 text-white" : "text-[var(--text-muted)]"}`}
                >
                  30d
                </button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-[11px] text-[var(--text-muted)]">Total Reach / day</p>
                <svg viewBox="0 0 320 96" className="h-28 w-full rounded bg-[#0c0f1b] p-2" role="img" aria-label="Total daily reach bar chart">
                  {data.series.map((d, idx) => {
                    const barW = Math.max(4, 300 / Math.max(1, data.series.length) - 2);
                    const x = 10 + idx * (300 / Math.max(1, data.series.length));
                    const h = Math.max(2, (d.totalReach / maxReach) * 76);
                    return (
                      <rect
                        key={d.day}
                        x={x}
                        y={86 - h}
                        width={barW}
                        height={h}
                        rx={2}
                        fill="#22d3ee"
                      >
                        <title>{`${d.day}: ${d.totalReach} reach (${d.visitorsAnonymous} visitors, ${d.creatorsActive} creators)`}</title>
                      </rect>
                    );
                  })}
                </svg>
              </div>

              <div>
                <p className="mb-2 text-[11px] text-[var(--text-muted)]">Games Started / day</p>
                <svg viewBox="0 0 320 96" className="h-28 w-full rounded bg-[#0c0f1b] p-2" role="img" aria-label="Games started bar chart">
                  {data.series.map((d, idx) => {
                    const barW = Math.max(4, 300 / Math.max(1, data.series.length) - 2);
                    const x = 10 + idx * (300 / Math.max(1, data.series.length));
                    const h = Math.max(2, (d.gamesStarted / maxGames) * 76);
                    return (
                      <rect
                        key={d.day}
                        x={x}
                        y={86 - h}
                        width={barW}
                        height={h}
                        rx={2}
                        fill="#ffcc00"
                      >
                        <title>{`${d.day}: ${d.gamesStarted} started (${d.gamesFinished} finished)`}</title>
                      </rect>
                    );
                  })}
                </svg>
              </div>
            </div>
          </section>

          {/* Top Playsets Table */}
          <AdminTable
            caption="Top 10 Playsets (Last 30 Days)"
            rows={data.topPlaysets}
            rowKey={(r) => r.playsetId}
            rowHeaderLabel="Playset"
            rowHeader={(r) => (
              <Link
                href={`/admin/playsets/${encodeURIComponent(r.playsetId)}`}
                className="text-[var(--accent-action-higher)] hover:underline"
              >
                {r.title}
              </Link>
            )}
            columns={[
              { key: "metric", label: "Metric", render: (r) => r.metricName || "—" },
              { key: "visibility", label: "Visibility", render: (r) => r.visibility },
              { key: "mod", label: "Moderation", render: (r) => r.moderationState },
              { key: "plays", label: "30d Plays", align: "right", render: (r) => r.plays30d },
            ]}
          />
        </>
      )}

      {loading && !data && (
        <p className="text-sm text-[var(--text-muted)]">Loading analytics…</p>
      )}
    </div>
  );
}
