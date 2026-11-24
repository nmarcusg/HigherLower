"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Ban, CheckCircle2, Eye, EyeOff, LoaderCircle, ShieldAlert } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminTable from "@/components/admin/AdminTable";
import AdminTabs from "@/components/admin/AdminTabs";
import NativeModalDialog from "@/components/ui/NativeModalDialog";
import {
  blockAdminMedia,
  fetchAdminPlaysetDetail,
  fetchModerationQueue,
  moderateAdminPlayset,
  resolveAdminReport,
  type AdminPlaysetDetail,
  type ModerationQueueEntry,
} from "@/lib/backend/admin";

type QueueTab = "reports" | "flagged" | "recent";

export default function AdminModerationPage() {
  const { token } = useAdminAuth();
  const [tab, setTab] = useState<QueueTab>("reports");
  const [entries, setEntries] = useState<ModerationQueueEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const [reviewDetail, setReviewDetail] = useState<AdminPlaysetDetail | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [revealedImages, setRevealedImages] = useState<Set<string>>(new Set());
  const [actionReason, setActionReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchModerationQueue(token, tab);
      setEntries(res.entries);
      setTotal(res.total);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load moderation queue.");
    } finally {
      setLoading(false);
    }
  }, [tab, token]);

  useEffect(() => {
    void Promise.resolve().then(() => loadQueue());
  }, [loadQueue]);

  async function openReview(playsetId: string) {
    setReviewLoading(true);
    setRevealedImages(new Set());
    setActionReason("");
    setError("");
    try {
      const detail = await fetchAdminPlaysetDetail(token, playsetId);
      setReviewDetail(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load playset details.");
    } finally {
      setReviewLoading(false);
    }
  }

  async function runPlaysetModeration(action: "APPROVE" | "HIDE" | "REMOVE" | "RESTORE") {
    if (!reviewDetail) return;
    if (actionReason.trim().length < 3) {
      setError("Enter a moderation reason (min 3 characters).");
      return;
    }
    setActionBusy(true);
    setError("");
    try {
      await moderateAdminPlayset(token, reviewDetail.id, {
        action,
        reason: actionReason.trim(),
        resolveOpenReports: true,
      });
      setStatusMsg(`Applied ${action} to “${reviewDetail.title}”.`);
      setReviewDetail(null);
      await loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Moderation action failed.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDismissReport(reportId: string, status: "RESOLVED" | "DISMISSED") {
    const note = actionReason.trim() || "Reviewed by moderator";
    setActionBusy(true);
    try {
      await resolveAdminReport(token, reportId, { status, note });
      if (reviewDetail) {
        setReviewDetail(await fetchAdminPlaysetDetail(token, reviewDetail.id));
      }
      await loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update report.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleBlockMedia(mediaId: string) {
    const reason = actionReason.trim() || "Inappropriate uploaded image blocked by moderator";
    setActionBusy(true);
    try {
      await blockAdminMedia(token, mediaId, reason);
      setStatusMsg("Image removed and SHA-256 hash permanently blocked.");
      if (reviewDetail) {
        setReviewDetail(await fetchAdminPlaysetDetail(token, reviewDetail.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not block media.");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Content Moderation</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Review visitor reports, auto-flagged custom playsets, and recently published content.
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{total} item(s) in queue</span>
      </header>

      <AdminTabs
        label="Moderation queues"
        tabs={[
          { id: "reports", label: "Visitor Reports" },
          { id: "flagged", label: "Auto-Flagged" },
          { id: "recent", label: "Recently Published" },
        ]}
        activeId={tab}
        onChange={setTab}
      />

      {error && (
        <div role="alert" className="rounded-sm border border-red-400/40 bg-red-950/30 p-3 text-xs text-red-200">
          {error}
        </div>
      )}
      {statusMsg && (
        <div role="status" className="rounded-sm border border-emerald-400/40 bg-emerald-950/30 p-3 text-xs text-emerald-200">
          {statusMsg}
        </div>
      )}

      <AdminTable
        caption={`${tab.toUpperCase()} Queue`}
        rows={entries}
        rowKey={(e) => e.playsetId}
        rowHeaderLabel="Playset"
        emptyMessage={loading ? "Loading queue…" : "Queue is clean!"}
        rowHeader={(e) => (
          <div>
            <p className="font-bold text-white">{e.title}</p>
            <p className="text-[11px] font-normal text-[var(--text-muted)]">
              {e.creator ? `@${e.creator.handle}` : "Unknown creator"} · {e.itemCount} items
            </p>
          </div>
        )}
        columns={[
          {
            key: "state",
            label: "State",
            render: (e) => (
              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase">
                {e.moderationState}
              </span>
            ),
          },
          {
            key: "signals",
            label: "Reports / Flags",
            render: (e) => (
              <div className="space-y-1 text-xs">
                {e.openReportCount > 0 && (
                  <p className="font-bold text-red-300">{e.openReportCount} open report(s)</p>
                )}
                {(e.reasons.length > 0 || e.autoFlags.length > 0) && (
                  <p className="text-[11px] text-amber-200">
                    {[...e.reasons, ...e.autoFlags].join(", ")}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: "age",
            label: "Since",
            render: (e) =>
              e.oldestReportAt ? new Date(e.oldestReportAt).toLocaleDateString() : "—",
          },
          {
            key: "action",
            label: "Review",
            align: "right",
            render: (e) => (
              <button
                type="button"
                onClick={() => void openReview(e.playsetId)}
                className="rounded-sm bg-[var(--accent-highlight)] px-3 py-1.5 text-[11px] font-bold uppercase text-[#15122b] hover:brightness-110"
              >
                Inspect
              </button>
            ),
          },
        ]}
      />

      <NativeModalDialog
        open={Boolean(reviewDetail) || reviewLoading}
        onClose={() => setReviewDetail(null)}
        eyebrow="Moderation Inspector"
        title={reviewDetail?.title ?? "Loading playset…"}
        maxWidthClass="max-w-3xl"
      >
        {reviewLoading || !reviewDetail ? (
          <div className="flex items-center gap-2 py-8 text-sm text-[var(--text-muted)]">
            <LoaderCircle size={16} className="animate-spin" /> Loading playset details…
          </div>
        ) : (
          <div className="max-h-[72vh] space-y-5 overflow-y-auto pr-1 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-white/10 bg-black/25 p-3">
              <div>
                <p className="text-sm font-bold text-white">{reviewDetail.title}</p>
                <p className="text-[var(--text-muted)]">
                  State: <strong className="text-white">{reviewDetail.moderationState}</strong> · Visibility:{" "}
                  <strong className="text-white">{reviewDetail.visibility}</strong>
                </p>
                {reviewDetail.autoFlags.length > 0 && (
                  <p className="mt-1 text-amber-300">Auto-flags: {reviewDetail.autoFlags.join(", ")}</p>
                )}
              </div>
              {reviewDetail.creator && (
                <Link
                  href={`/admin/creators/${encodeURIComponent(reviewDetail.creator.userId)}`}
                  className="rounded border border-white/20 px-2.5 py-1.5 font-bold text-[var(--accent-action-higher)] hover:bg-white/5"
                >
                  @{reviewDetail.creator.handle} ({reviewDetail.creator.tier})
                </Link>
              )}
            </div>

            {reviewDetail.reports.length > 0 && (
              <div>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-red-300">
                  Visitor Reports ({reviewDetail.reports.length})
                </h2>
                <div className="space-y-1.5">
                  {reviewDetail.reports.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-white/10 bg-black/20 p-2.5"
                    >
                      <div>
                        <span className="font-bold text-amber-200">{r.reason}</span>{" "}
                        <span className="text-[10px] text-[var(--text-muted)]">({r.status})</span>
                        {r.details && <p className="mt-1 text-[var(--text-secondary)]">{r.details}</p>}
                      </div>
                      {r.status === "OPEN" && (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => void handleDismissReport(r.id, "DISMISSED")}
                            className="rounded border border-white/20 px-2 py-1 text-[10px] font-bold uppercase hover:bg-white/10"
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => void handleDismissReport(r.id, "RESOLVED")}
                            className="rounded border border-emerald-400/40 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300 hover:bg-emerald-950/40"
                          >
                            Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Items &amp; Uploaded Media ({reviewDetail.items.length}) — images blurred by default
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {reviewDetail.items.slice(0, 30).map((item) => {
                  const revealed = revealedImages.has(item.id);
                  return (
                    <div key={item.id} className="rounded-sm border border-white/10 bg-black/20 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">{item.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Value: {item.displayValue} · {item.sourceLabel}
                          </p>
                        </div>
                        {item.mediaId && (
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => void handleBlockMedia(item.mediaId!)}
                            className="shrink-0 rounded border border-red-400/40 px-2 py-1 text-[10px] font-bold uppercase text-red-300 hover:bg-red-950/40"
                          >
                            Block hash
                          </button>
                        )}
                      </div>
                      {item.imageUrl && (
                        <div className="mt-2">
                          <div className="relative h-28 w-full overflow-hidden rounded border border-white/10 bg-black/40">
                            <Image
                              src={item.imageUrl}
                              alt=""
                              fill
                              unoptimized
                              sizes="260px"
                              className={`object-cover transition ${revealed ? "" : "blur-xl brightness-50"}`}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedImages((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                })
                              }
                              className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-[10px] font-bold uppercase text-white"
                            >
                              {revealed ? <EyeOff size={11} /> : <Eye size={11} />}
                              {revealed ? "Hide" : "Reveal"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 border-t border-white/15 pt-4">
              <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                Required Moderation Reason (recorded in audit log)
                <input
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Confirmed spam/offensive content per report"
                  className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#10131f] px-3 py-2 text-sm text-white outline-none focus:border-[var(--focus-ring)]"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void runPlaysetModeration("APPROVE")}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-sm bg-emerald-600 px-3 text-[11px] font-bold uppercase text-white hover:brightness-110"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void runPlaysetModeration("HIDE")}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-sm bg-amber-500 px-3 text-[11px] font-bold uppercase text-[#15122b] hover:brightness-110"
                >
                  <EyeOff size={14} /> Hide from list
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void runPlaysetModeration("REMOVE")}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-sm bg-red-600 px-3 text-[11px] font-bold uppercase text-white hover:brightness-110"
                >
                  <Ban size={14} /> Remove (404 + Block Play)
                </button>
                {reviewDetail.moderationState !== "APPROVED" && (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void runPlaysetModeration("RESTORE")}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-white/25 px-3 text-[11px] font-bold uppercase text-white hover:bg-white/10"
                  >
                    <ShieldAlert size={14} /> Restore
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </NativeModalDialog>
    </div>
  );
}
