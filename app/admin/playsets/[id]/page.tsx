"use client";

import { use, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, EyeOff, RotateCcw } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminRefreshButton from "@/components/admin/AdminRefreshButton";
import AdminTable from "@/components/admin/AdminTable";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  blockAdminMedia,
  fetchAdminPlaysetDetail,
  hasMinRole,
  moderateAdminPlayset,
  type AdminPlaysetDetail,
} from "@/lib/backend/admin";

export default function AdminPlaysetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token, identity } = useAdminAuth();
  const [detail, setDetail] = useState<AdminPlaysetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [allowStaleOverride, setAllowStaleOverride] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const isSystem = id.startsWith("system-");
  const canModerateThisSet = !isSystem || hasMinRole(identity.role, "ADMIN");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminPlaysetDetail(token, id);
      setDetail(res);
      setAllowStaleOverride(Boolean(res.category?.allowStaleOverride));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load playset.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function moderate(action: "APPROVE" | "HIDE" | "REMOVE" | "RESTORE") {
    if (reason.trim().length < 3) {
      setError("Enter a moderation or access reason (min 3 characters).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await moderateAdminPlayset(token, id, {
        action,
        reason: reason.trim(),
        resolveOpenReports: true,
        ...(isSystem ? { allowStaleOverride } : {}),
      });
      setNotice(`Applied ${action} successfully.`);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update playset access.");
    } finally {
      setBusy(false);
    }
  }

  async function stripMedia(mediaId: string) {
    setBusy(true);
    try {
      await blockAdminMedia(token, mediaId, reason.trim() || "Blocked image from playset inspector");
      setNotice("Image deleted and SHA-256 hash blocked.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not block media.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/playsets"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[var(--text-secondary)] hover:text-white"
        >
          <ArrowLeft size={14} /> Back to playsets
        </Link>
        <AdminRefreshButton tabKey={`playset:${id}`} onRefresh={load} />
      </div>

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

      {!detail && loading && (
        <div className="h-48 animate-pulse rounded-md border border-white/10 bg-[#121628]" />
      )}

      {detail && (
        <>
          <section className="space-y-4 rounded-md border border-white/15 bg-[#121628] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">{detail.title}</h1>
                  {isSystem && <StatusBadge value="PUBLIC" label="Official System" />}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{detail.description}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <StatusBadge value={detail.status} />
                  <StatusBadge value={detail.visibility} />
                  <StatusBadge value={detail.moderationState} />
                  {detail.category?.allowStaleOverride && (
                    <StatusBadge value="DEGRADED" label="Stale Override Active" />
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Metric: {detail.metricName} ({detail.metricUnit}) · 30d plays:{" "}
                  {detail.stats.plays30d} ({detail.stats.finished30d} finished)
                  {detail.moderationReason ? ` · Reason: “${detail.moderationReason}”` : ""}
                </p>
                {detail.category && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Linked Catalog Category:{" "}
                    <Link
                      href="/admin/catalog"
                      className="font-mono text-[var(--accent-action-higher)] underline"
                    >
                      {detail.category.id}
                    </Link>{" "}
                    · Last refresh:{" "}
                    {detail.category.lastRefreshedAt
                      ? new Date(detail.category.lastRefreshedAt).toLocaleString()
                      : "Never"}{" "}
                    ({detail.category.lastRefreshStatus})
                  </p>
                )}
              </div>
              {detail.creator && (
                <Link
                  href={`/admin/creators/${encodeURIComponent(detail.creator.userId)}`}
                  className="rounded border border-white/20 px-3 py-2 text-xs font-bold text-[var(--accent-action-higher)] hover:bg-white/5"
                >
                  @{detail.creator.handle} · {detail.creator.tier}
                </Link>
              )}
            </div>

            {canModerateThisSet ? (
              <div className="space-y-3 border-t border-white/10 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                  {isSystem
                    ? "System Playset Visibility & Reinstatement Controls"
                    : "Moderation Controls"}
                </p>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    isSystem
                      ? "Reason for hiding, restoring, or reinstating (required for audit log)"
                      : "Moderation reason (required for audit log)"
                  }
                  className="w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
                />
                {isSystem && detail.category && (
                  <label className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={allowStaleOverride}
                      onChange={(e) => setAllowStaleOverride(e.target.checked)}
                    />
                    Reinstate despite stale provider data (allow players to play cached snapshot even past freshness window)
                  </label>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void moderate(isSystem ? "RESTORE" : "APPROVE")}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded bg-emerald-600 px-3 text-xs font-bold uppercase text-white hover:brightness-110"
                  >
                    {isSystem ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                    {isSystem ? "Restore Access" : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void moderate("HIDE")}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded bg-amber-500 px-3 text-xs font-bold uppercase text-[#15122b] hover:brightness-110"
                  >
                    <EyeOff size={14} /> Hide from Players
                  </button>
                  {!isSystem && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void moderate("REMOVE")}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded bg-red-600 px-3 text-xs font-bold uppercase text-white hover:brightness-110"
                    >
                      <Ban size={14} /> Remove
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="border-t border-white/10 pt-3 text-xs text-[var(--text-muted)]">
                Administrator or Superadmin access is required to hide or restore official system playsets.
              </p>
            )}
          </section>

          <AdminTable
            caption={`Playset Items (${detail.items.length})`}
            loading={loading}
            rows={detail.items}
            rowKey={(item) => item.id}
            rowHeaderLabel="Name"
            rowHeader={(item) => item.name}
            columns={[
              { key: "val", label: "Display Value", render: (i) => i.displayValue },
              { key: "source", label: "Source", render: (i) => i.sourceLabel },
              {
                key: "img",
                label: "Image",
                render: (i) =>
                  i.imageUrl ? (
                    <div className="flex items-center gap-2">
                      <div className="relative size-10 overflow-hidden rounded border border-white/15">
                        <Image src={i.imageUrl} alt="" fill unoptimized sizes="40px" className="object-cover" />
                      </div>
                      {i.mediaId && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void stripMedia(i.mediaId!)}
                          className="rounded border border-red-400/40 px-2 py-1 text-[10px] font-bold uppercase text-red-300"
                        >
                          Block hash
                        </button>
                      )}
                    </div>
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
