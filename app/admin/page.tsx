"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, TrendingUp, Users } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminRefreshButton from "@/components/admin/AdminRefreshButton";
import AdminTable from "@/components/admin/AdminTable";
import StatusBadge from "@/components/admin/StatusBadge";
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

function shortDate(dayIso: string): string {
  return dayIso.length >= 10 ? dayIso.slice(5, 10) : dayIso;
}

export default function AdminDashboardPage() {
  const { token } = useAdminAuth();
  const [days, setDays] = useState<7 | 30>(7);
  const [windowTab, setWindowTab] = useState<"today" | "range7d" | "range30d">("today");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<AdminDashboardData["series"][number] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
  const series = data?.series ?? [];
  const maxReach = Math.max(1, ...series.map((d) => d.totalReach));
  const maxGames = Math.max(1, ...series.map((d) => d.gamesStarted));
  const totalSeriesReach = series.reduce((s, d) => s + d.totalReach, 0);
  const totalSeriesGames = series.reduce((s, d) => s + d.gamesStarted, 0);
  const peakSeriesReach = Math.max(0, ...series.map((d) => d.totalReach));
  const peakSeriesGames = Math.max(0, ...series.map((d) => d.gamesStarted));
  const latestDay = series.length > 0 ? series[series.length - 1] : null;
  const inspectedDay = hoveredDay ?? latestDay;

  const attentionItems = data
    ? [
        {
          href: "/admin/moderation?tab=reports",
          label: "Open visitor reports",
          count: data.attention.openReports,
          severity: data.attention.openReports > 0 ? "danger" : "neutral",
        },
        {
          href: "/admin/moderation?tab=flagged",
          label: "Auto-flagged custom sets",
          count: data.attention.autoFlaggedCount,
          severity: data.attention.autoFlaggedCount > 0 ? "warn" : "neutral",
        },
        {
          href: "/admin/creators?tab=clusters",
          label: "Multi-account device clusters",
          count: data.attention.suspectedClustersCount,
          severity: data.attention.suspectedClustersCount > 0 ? "warn" : "neutral",
        },
        {
          href: "/admin/payments",
          label: "Unmatched Ko-fi payments",
          count: data.attention.unmatchedPaymentsCount,
          severity: data.attention.unmatchedPaymentsCount > 0 ? "warn" : "neutral",
        },
        {
          href: "/admin/catalog",
          label: "Failing catalog providers",
          count: data.attention.failingCategories,
          severity: data.attention.failingCategories > 0 ? "danger" : "neutral",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard &amp; Audience</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Deduplicated reach (Visitors + Creators = Total Reach), 30d gameplay, and live runtime.
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-3">
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
          <AdminRefreshButton tabKey="dashboard" onRefresh={load} />
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-sm border border-red-400/40 bg-red-950/30 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {!data || !audienceWindow ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
          <div className="h-12 animate-pulse rounded-md border border-white/10 bg-[#121628]" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-md border border-white/10 bg-[#121628]" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="h-56 animate-pulse rounded-md border border-white/10 bg-[#121628]" />
            <div className="h-56 animate-pulse rounded-md border border-white/10 bg-[#121628]" />
          </div>
          <p className="text-xs text-[var(--text-muted)]">Loading analytics…</p>
        </div>
      ) : (
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
            <div className="flex flex-wrap items-center justify-between gap-2">
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
            <section className="space-y-4 rounded-md border border-white/15 bg-[#121628] p-5">
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
                  <p className="mt-1">
                    <StatusBadge
                      value={data.monetization.adsEnabled ? "ENABLED" : "PAUSED"}
                    />
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
              <ul className="mt-4 space-y-2 text-xs">
                {attentionItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex items-center justify-between gap-3 rounded-sm border border-white/10 bg-black/25 px-3 py-2 transition hover:border-white/35 hover:bg-white/[0.06]"
                    >
                      <span className="font-semibold text-[var(--text-secondary)] group-hover:text-white">
                        {item.label}
                      </span>
                      <span className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`rounded px-2 py-0.5 font-bold tabular-nums ${
                            item.severity === "danger"
                              ? "bg-red-500/20 text-red-200"
                              : item.severity === "warn"
                                ? "bg-amber-500/20 text-amber-200"
                                : "bg-white/10 text-white/70"
                          }`}
                        >
                          {item.count}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded border border-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white group-hover:border-[var(--accent-highlight)] group-hover:text-[var(--accent-highlight)]">
                          View <ArrowUpRight size={11} aria-hidden="true" />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Daily Trend Charts (inline SVG with explicit numeric labels) */}
          <section className="rounded-md border border-white/15 bg-[#121628] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  <TrendingUp size={14} /> Daily Trend ({days} days)
                </h2>
                {inspectedDay && (
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    <strong className="text-white">{inspectedDay.day}</strong> · Reach:{" "}
                    <strong className="text-cyan-300 tabular-nums">{inspectedDay.totalReach}</strong>{" "}
                    ({inspectedDay.visitorsAnonymous} visitors, {inspectedDay.creatorsActive} creators) · Games:{" "}
                    <strong className="text-[var(--accent-highlight)] tabular-nums">
                      {inspectedDay.gamesStarted}
                    </strong>{" "}
                    ({inspectedDay.gamesFinished} finished)
                  </p>
                )}
              </div>
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
              <div className="rounded bg-[#0c0f1b] p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold uppercase tracking-[0.08em] text-cyan-300">
                    Total Reach / day
                  </span>
                  <span className="text-[var(--text-muted)] tabular-nums">
                    Total <strong className="text-white">{totalSeriesReach}</strong> · Peak{" "}
                    <strong className="text-white">{peakSeriesReach}</strong> · Today{" "}
                    <strong className="text-cyan-300">{latestDay?.totalReach ?? 0}</strong>
                  </span>
                </div>
                <svg
                  viewBox="0 0 360 132"
                  className="h-36 w-full"
                  role="img"
                  aria-label="Total daily reach bar chart"
                >
                  {series.map((d, idx) => {
                    const slotW = 340 / Math.max(1, series.length);
                    const barW = Math.max(5, slotW - 3);
                    const x = 10 + idx * slotW;
                    const cx = x + barW / 2;
                    const h = d.totalReach > 0 ? Math.max(4, (d.totalReach / maxReach) * 78) : 2;
                    const y = 104 - h;
                    const showValue =
                      days === 7 || (d.totalReach > 0 && (d.totalReach === peakSeriesReach || idx === series.length - 1));
                    const showDate =
                      days === 7 || idx === 0 || idx === Math.floor(series.length / 2) || idx === series.length - 1;
                    return (
                      <g
                        key={d.day}
                        onMouseEnter={() => setHoveredDay(d)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className="cursor-pointer"
                      >
                        {showValue && (
                          <text
                            x={cx}
                            y={Math.max(11, y - 4)}
                            textAnchor="middle"
                            fontSize={days === 7 ? 10 : 9}
                            fontWeight="700"
                            fill={d.totalReach > 0 ? "#67e8f9" : "#64748b"}
                          >
                            {d.totalReach}
                          </text>
                        )}
                        <rect
                          x={x}
                          y={y}
                          width={barW}
                          height={h}
                          rx={2}
                          fill={d.totalReach > 0 ? "#22d3ee" : "#1e293b"}
                        >
                          <title>{`${d.day}: ${d.totalReach} reach (${d.visitorsAnonymous} visitors, ${d.creatorsActive} creators)`}</title>
                        </rect>
                        {showDate && (
                          <text
                            x={cx}
                            y={122}
                            textAnchor="middle"
                            fontSize={9}
                            fill="#94a3b8"
                          >
                            {shortDate(d.day)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="rounded bg-[#0c0f1b] p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold uppercase tracking-[0.08em] text-[var(--accent-highlight)]">
                    Games Started / day
                  </span>
                  <span className="text-[var(--text-muted)] tabular-nums">
                    Total <strong className="text-white">{totalSeriesGames}</strong> · Peak{" "}
                    <strong className="text-white">{peakSeriesGames}</strong> · Today{" "}
                    <strong className="text-[var(--accent-highlight)]">{latestDay?.gamesStarted ?? 0}</strong>
                  </span>
                </div>
                <svg
                  viewBox="0 0 360 132"
                  className="h-36 w-full"
                  role="img"
                  aria-label="Games started bar chart"
                >
                  {series.map((d, idx) => {
                    const slotW = 340 / Math.max(1, series.length);
                    const barW = Math.max(5, slotW - 3);
                    const x = 10 + idx * slotW;
                    const cx = x + barW / 2;
                    const h = d.gamesStarted > 0 ? Math.max(4, (d.gamesStarted / maxGames) * 78) : 2;
                    const y = 104 - h;
                    const showValue =
                      days === 7 || (d.gamesStarted > 0 && (d.gamesStarted === peakSeriesGames || idx === series.length - 1));
                    const showDate =
                      days === 7 || idx === 0 || idx === Math.floor(series.length / 2) || idx === series.length - 1;
                    return (
                      <g
                        key={d.day}
                        onMouseEnter={() => setHoveredDay(d)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className="cursor-pointer"
                      >
                        {showValue && (
                          <text
                            x={cx}
                            y={Math.max(11, y - 4)}
                            textAnchor="middle"
                            fontSize={days === 7 ? 10 : 9}
                            fontWeight="700"
                            fill={d.gamesStarted > 0 ? "#fde047" : "#64748b"}
                          >
                            {d.gamesStarted}
                          </text>
                        )}
                        <rect
                          x={x}
                          y={y}
                          width={barW}
                          height={h}
                          rx={2}
                          fill={d.gamesStarted > 0 ? "#ffcc00" : "#1e293b"}
                        >
                          <title>{`${d.day}: ${d.gamesStarted} started (${d.gamesFinished} finished)`}</title>
                        </rect>
                        {showDate && (
                          <text
                            x={cx}
                            y={122}
                            textAnchor="middle"
                            fontSize={9}
                            fill="#94a3b8"
                          >
                            {shortDate(d.day)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </section>

          {/* Top Playsets Table */}
          <AdminTable
            caption="Top 10 Playsets (Last 30 Days)"
            loading={loading}
            rows={data.topPlaysets}
            rowKey={(r) => r.playsetId}
            rowHeaderLabel="Playset"
            rowHeader={(r) => (
              <Link
                href={`/admin/playsets/${encodeURIComponent(r.playsetId)}`}
                className="font-bold text-[var(--accent-action-higher)] hover:underline"
              >
                {r.title}
              </Link>
            )}
            columns={[
              { key: "metric", label: "Metric", render: (r) => r.metricName || "—" },
              {
                key: "visibility",
                label: "Visibility",
                render: (r) => <StatusBadge value={r.visibility} />,
              },
              {
                key: "mod",
                label: "Moderation",
                render: (r) => <StatusBadge value={r.moderationState} />,
              },
              {
                key: "plays",
                label: "30d Plays",
                align: "right",
                render: (r) => <span className="font-bold tabular-nums">{r.plays30d}</span>,
              },
              {
                key: "inspect",
                label: "Action",
                align: "right",
                render: (r) => (
                  <Link
                    href={`/admin/playsets/${encodeURIComponent(r.playsetId)}`}
                    className="inline-flex items-center gap-1 rounded border border-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white hover:border-[var(--accent-highlight)] hover:text-[var(--accent-highlight)]"
                  >
                    View <ArrowUpRight size={11} aria-hidden="true" />
                  </Link>
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
