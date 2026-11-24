"use client";

import { use, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, EyeOff } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminTable from "@/components/admin/AdminTable";
import {
  blockAdminMedia,
  fetchAdminPlaysetDetail,
  moderateAdminPlayset,
  type AdminPlaysetDetail,
} from "@/lib/backend/admin";

export default function AdminPlaysetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAdminAuth();
  const [detail, setDetail] = useState<AdminPlaysetDetail | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setDetail(await fetchAdminPlaysetDetail(token, id));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load playset.");
    }
  }, [id, token]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function moderate(action: "APPROVE" | "HIDE" | "REMOVE" | "RESTORE") {
    if (reason.trim().length < 3) {
      setError("Enter a moderation reason (min 3 characters).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await moderateAdminPlayset(token, id, { action, reason: reason.trim(), resolveOpenReports: true });
      setNotice(`Moderation action ${action} applied.`);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to moderate playset.");
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
      <Link
        href="/admin/playsets"
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[var(--text-secondary)] hover:text-white"
      >
        <ArrowLeft size={14} /> Back to playsets
      </Link>

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

      {detail && (
        <>
          <section className="rounded-md border border-white/15 bg-[#121628] p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{detail.title}</h1>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{detail.description}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Metric: {detail.metricName} ({detail.metricUnit}) · Status: {detail.status} /{" "}
                  {detail.visibility} · Moderation: <strong>{detail.moderationState}</strong> · 30d plays:{" "}
                  {detail.stats.plays30d} ({detail.stats.finished30d} finished)
                </p>
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

            {!detail.id.startsWith("system-") && (
              <div className="space-y-3 border-t border-white/10 pt-4">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Moderation reason (required for audit log)"
                  className="w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void moderate("APPROVE")}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded bg-emerald-600 px-3 text-xs font-bold uppercase text-white"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void moderate("HIDE")}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded bg-amber-500 px-3 text-xs font-bold uppercase text-[#15122b]"
                  >
                    <EyeOff size={14} /> Hide
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void moderate("REMOVE")}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded bg-red-600 px-3 text-xs font-bold uppercase text-white"
                  >
                    <Ban size={14} /> Remove
                  </button>
                </div>
              </div>
            )}
          </section>

          <AdminTable
            caption={`Playset Items (${detail.items.length})`}
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
