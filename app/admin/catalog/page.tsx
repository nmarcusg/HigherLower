"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { EyeOff, ImageDown, LoaderCircle, RotateCcw } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminRefreshButton from "@/components/admin/AdminRefreshButton";
import AdminTable from "@/components/admin/AdminTable";
import StatusBadge from "@/components/admin/StatusBadge";
import NativeModalDialog from "@/components/ui/NativeModalDialog";
import {
  fetchAdminCatalog,
  fetchAdminCatalogImageSyncStatus,
  hasMinRole,
  triggerAdminCatalogImageSync,
  updateAdminCatalogAccess,
  type CatalogImageSyncStatus,
} from "@/lib/backend/admin";

type CatalogData = Awaited<ReturnType<typeof fetchAdminCatalog>>;
type CatalogRow = CatalogData["categories"][number];

export default function AdminCatalogPage() {
  const { token, identity } = useAdminAuth();
  const isAdmin = hasMinRole(identity.role, "ADMIN");
  const [data, setData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CatalogImageSyncStatus | null>(null);
  const [startingSync, setStartingSync] = useState(false);

  const [accessTarget, setAccessTarget] = useState<{
    category: CatalogRow;
    action: "HIDE" | "RESTORE";
  } | null>(null);
  const [accessReason, setAccessReason] = useState("");
  const [allowStaleOverride, setAllowStaleOverride] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchAdminCatalog(token));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load catalog health.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    void fetchAdminCatalogImageSyncStatus(token)
      .then(setSyncStatus)
      .catch(() => undefined);
  }, [load, token]);

  useEffect(() => {
    if (!syncStatus?.running) return;
    const timer = window.setInterval(() => {
      void fetchAdminCatalogImageSyncStatus(token)
        .then((next) => {
          setSyncStatus(next);
          void load();
          if (!next.running) {
            setNotice(
              next.lastError
                ? `Image sync finished with error: ${next.lastError}`
                : `Synced ${next.updated} image(s) to Supabase Storage (${next.enriched} newly enriched, ${next.failed} failed).`,
            );
          }
        })
        .catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [load, syncStatus?.running, token]);

  async function startImageSync() {
    setStartingSync(true);
    setError("");
    try {
      const next = await triggerAdminCatalogImageSync(token);
      setSyncStatus(next);
      setNotice("Started mirroring and compressing catalog images to Supabase Storage…");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start catalog image sync.");
    } finally {
      setStartingSync(false);
    }
  }

  const categories = data?.categories ?? [];
  const supportedCount = categories.filter((c) => c.availability === "SUPPORTED").length;
  const degradedCount = categories.filter((c) => c.availability === "DEGRADED").length;
  const unavailableCount = categories.filter((c) => c.availability === "UNAVAILABLE").length;
  const totalItems = categories.reduce((s, c) => s + c.itemCount, 0);

  const latestRefreshedAt = categories
    .map((c) => c.freshness.lastRefreshedAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1) ?? null;

  async function submitAccessChange(event: FormEvent) {
    event.preventDefault();
    if (!accessTarget) return;
    if (accessReason.trim().length < 3) {
      setError("Enter an audit reason (min 3 characters).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updateAdminCatalogAccess(token, accessTarget.category.id, {
        action: accessTarget.action,
        allowStaleOverride: accessTarget.action === "RESTORE" ? allowStaleOverride : undefined,
        reason: accessReason.trim(),
      });
      setNotice(
        accessTarget.action === "HIDE"
          ? `Hidden “${accessTarget.category.title}” from gameplay.`
          : `Restored access to “${accessTarget.category.title}”.`,
      );
      setAccessTarget(null);
      setAccessReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update category access.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Official Catalog Health</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Provider status, refresh freshness, storage images, and admin hide/reinstate controls across official categories.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {isAdmin && (
            <button
              type="button"
              disabled={startingSync || Boolean(syncStatus?.running)}
              onClick={() => void startImageSync()}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-sm border border-[var(--accent-highlight)]/60 bg-[var(--accent-highlight)]/15 px-3 text-xs font-bold uppercase text-[var(--accent-highlight)] transition hover:bg-[var(--accent-highlight)] hover:text-[#15122b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncStatus?.running || startingSync ? (
                <LoaderCircle size={13} className="animate-spin" />
              ) : (
                <ImageDown size={13} />
              )}
              {syncStatus?.running
                ? `Syncing Images (${syncStatus.processed}/${syncStatus.totalPending || "…"})`
                : "Sync Storage Images"}
            </button>
          )}
          <AdminRefreshButton
            tabKey="catalog"
            onRefresh={load}
            serverUpdatedAt={latestRefreshedAt}
          />
        </div>
      </header>

      {/* Catalog Summary Strip */}
      <section aria-label="Catalog summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data ? (
          <>
            <div className="rounded-md border border-white/15 bg-[#121628] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Supported
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-300">
                {supportedCount}
              </p>
            </div>
            <div className="rounded-md border border-white/15 bg-[#121628] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Degraded / Reinstated
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-amber-300">
                {degradedCount}
              </p>
            </div>
            <div className="rounded-md border border-white/15 bg-[#121628] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Unavailable / Hidden
              </p>
              <p
                className={`mt-1.5 text-2xl font-bold tabular-nums ${
                  unavailableCount > 0 ? "text-red-300" : "text-white"
                }`}
              >
                {unavailableCount}
              </p>
            </div>
            <div className="rounded-md border border-white/15 bg-[#121628] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Official Items Total
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">{totalItems}</p>
            </div>
          </>
        ) : (
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-md border border-white/10 bg-[#121628]"
            />
          ))
        )}
      </section>

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

      <AdminTable
        caption={`Official Categories (${data?.total ?? 0})`}
        loading={loading}
        rows={categories}
        rowKey={(c) => c.id}
        rowHeaderLabel="Category"
        rowHeader={(c) => (
          <div>
            {c.playsetId ? (
              <Link
                href={`/admin/playsets/${encodeURIComponent(c.playsetId)}`}
                className="font-bold text-[var(--accent-action-higher)] hover:underline"
              >
                {c.title}
              </Link>
            ) : (
              <p className="font-bold text-white">{c.title}</p>
            )}
            <p className="text-[11px] font-normal text-[var(--text-muted)]">
              {c.domain} · {c.refreshSchedule}
            </p>
          </div>
        )}
        columns={[
          {
            key: "status",
            label: "Availability",
            render: (c) => (
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge value={c.availability} />
                {c.moderationState === "HIDDEN" && <StatusBadge value="HIDDEN" />}
                {c.allowStaleOverride && (
                  <StatusBadge value="DEGRADED" label="Stale Override" />
                )}
              </div>
            ),
          },
          { key: "items", label: "Items", align: "right", render: (c) => c.itemCount },
          {
            key: "age",
            label: "Freshness",
            render: (c) =>
              c.ageHours !== null
                ? `${c.ageHours}h ago (${c.freshness.lastRefreshStatus})`
                : c.freshness.lastRefreshStatus,
          },
          {
            key: "compressed",
            label: "Storage Images",
            render: (c) => `${c.compressedCoveragePct}% (${c.compressedImages})`,
          },
          {
            key: "err",
            label: "Last Error / Note",
            render: (c) => c.lastRefreshError ?? c.unavailableReason ?? "—",
          },
          ...(isAdmin
            ? [
                {
                  key: "access",
                  label: "Access",
                  align: "right" as const,
                  render: (c: CatalogRow) =>
                    c.moderationState === "HIDDEN" || c.availability === "UNAVAILABLE" ? (
                      <button
                        type="button"
                        disabled={!c.playsetId}
                        onClick={() => {
                          setAccessReason("Reinstated cached category by administrator");
                          setAllowStaleOverride(true);
                          setAccessTarget({ category: c, action: "RESTORE" });
                        }}
                        className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white hover:brightness-110 disabled:opacity-40"
                      >
                        <RotateCcw size={11} /> Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!c.playsetId}
                        onClick={() => {
                          setAccessReason("Temporarily hidden from catalog by administrator");
                          setAccessTarget({ category: c, action: "HIDE" });
                        }}
                        className="inline-flex items-center gap-1 rounded border border-amber-400/50 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-200 hover:bg-amber-950/30 disabled:opacity-40"
                      >
                        <EyeOff size={11} /> Hide
                      </button>
                    ),
                },
              ]
            : []),
        ]}
      />

      <NativeModalDialog
        open={Boolean(accessTarget)}
        onClose={() => setAccessTarget(null)}
        eyebrow="Official Catalog Access"
        title={
          accessTarget?.action === "HIDE"
            ? `Hide “${accessTarget.category.title}”?`
            : `Restore “${accessTarget?.category.title ?? ""}”?`
        }
      >
        <form onSubmit={(e) => void submitAccessChange(e)} className="space-y-4 text-xs">
          <p className="text-[var(--text-secondary)]">
            {accessTarget?.action === "HIDE"
              ? "Hiding immediately marks this official category unavailable across the Homepage, Solo setup, and Multiplayer rooms."
              : "Restoring makes this official category playable again across Homepage, Solo, and Multiplayer."}
          </p>
          {accessTarget?.action === "RESTORE" && (
            <label className="flex items-center gap-2.5 text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={allowStaleOverride}
                onChange={(e) => setAllowStaleOverride(e.target.checked)}
              />
              Allow cached items even if provider data is past the freshness window
            </label>
          )}
          <label className="block font-bold uppercase text-[var(--text-muted)]">
            Audit Reason
            <input
              required
              minLength={3}
              value={accessReason}
              onChange={(e) => setAccessReason(e.target.value)}
              className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAccessTarget(null)}
              className="min-h-9 rounded border border-white/25 px-3 font-bold uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`min-h-9 rounded px-4 font-bold uppercase ${
                accessTarget?.action === "HIDE"
                  ? "bg-amber-500 text-[#15122b]"
                  : "bg-emerald-600 text-white"
              }`}
            >
              Confirm
            </button>
          </div>
        </form>
      </NativeModalDialog>
    </div>
  );
}
