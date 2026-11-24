"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, Crown, ShieldOff, Sparkles } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminTable from "@/components/admin/AdminTable";
import {
  fetchAdminCreatorDetail,
  liftAdminRestriction,
  restrictAdminCreator,
  setCreatorCustomCaps,
  setCreatorProStatus,
  type AdminCreatorDetail,
} from "@/lib/backend/admin";

export default function AdminCreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token, identity } = useAdminAuth();
  const [detail, setDetail] = useState<AdminCreatorDetail | null>(null);
  const [reason, setReason] = useState("");
  const [maxSets, setMaxSets] = useState("25");
  const [maxItems, setMaxItems] = useState("200");
  const [unpublishAll, setUnpublishAll] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchAdminCreatorDetail(token, id);
      setDetail(res);
      setMaxSets(String(res.profile.maxPlaysets));
      setMaxItems(String(res.profile.maxItemsPerSet));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load creator details.");
    }
  }, [id, token]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function togglePro(action: "GRANT" | "REVOKE") {
    if (reason.trim().length < 3) {
      setError("Enter an audit reason (min 3 characters).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await setCreatorProStatus(token, id, { action, reason: reason.trim() });
      setNotice(`Creator Pro ${action === "GRANT" ? "granted" : "revoked"}.`);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update tier.");
    } finally {
      setBusy(false);
    }
  }

  async function updateCaps() {
    if (reason.trim().length < 3) {
      setError("Enter an audit reason (min 3 characters).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await setCreatorCustomCaps(token, id, {
        maxPlaysets: Number(maxSets),
        maxItemsPerSet: Number(maxItems),
        reason: reason.trim(),
      });
      setNotice("Custom caps updated.");
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update caps.");
    } finally {
      setBusy(false);
    }
  }

  async function applyRestriction(type: "PUBLISH_BAN" | "SUSPENDED") {
    if (reason.trim().length < 3) {
      setError("Enter a restriction reason (min 3 characters).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await restrictAdminCreator(token, id, {
        type,
        reason: reason.trim(),
        unpublishAllPublic: unpublishAll,
      });
      setNotice(`Applied ${type}.`);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply restriction.");
    } finally {
      setBusy(false);
    }
  }

  async function lift(restrictionId: string) {
    setBusy(true);
    try {
      await liftAdminRestriction(token, id, restrictionId, reason.trim() || "Restriction lifted by staff");
      setNotice("Restriction lifted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not lift restriction.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/creators"
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[var(--text-secondary)] hover:text-white"
      >
        <ArrowLeft size={14} /> Back to creators
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
                <h1 className="text-2xl font-bold">
                  @{detail.profile.handle}{" "}
                  <span className="text-sm font-normal text-[var(--text-muted)]">
                    ({detail.profile.displayName})
                  </span>
                </h1>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  User ID: <span className="font-mono">{detail.profile.userId}</span> ·{" "}
                  {detail.profile.email ?? "no email"} · OAuth: {detail.profile.authProvider}
                </p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Tier: <strong className="text-[var(--accent-highlight)]">{detail.profile.tier}</strong> ·
                  Caps: {detail.profile.maxPlaysets} sets / {detail.profile.maxItemsPerSet} items ·
                  Ko-fi Code: <span className="font-mono">{detail.profile.kofiClaimCode}</span> ·
                  Media: {detail.storage.files} files ({Math.round(detail.storage.bytes / 1024)} KB)
                </p>
              </div>
              {detail.linkedAccounts.length > 0 && (
                <div className="rounded border border-amber-300/35 bg-amber-950/25 p-3 text-xs">
                  <p className="font-bold text-amber-200">
                    Linked on same device ({detail.linkedAccounts.length}):
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {detail.linkedAccounts.map((l) => (
                      <Link
                        key={l.userId}
                        href={`/admin/creators/${encodeURIComponent(l.userId)}`}
                        className="underline hover:text-white"
                      >
                        @{l.handle} ({l.tier})
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-white/10 pt-4">
              <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Action Reason (required for audit log)
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Manual Ko-fi match / spam alt-farming / ban appeal"
                  className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                {identity.role === "ADMIN" && (
                  <>
                    {detail.profile.tier === "FREE" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void togglePro("GRANT")}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded bg-[var(--accent-highlight)] px-3 text-xs font-bold uppercase text-[#15122b]"
                      >
                        <Crown size={14} /> Grant Creator Pro
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void togglePro("REVOKE")}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded border border-amber-300/50 px-3 text-xs font-bold uppercase text-amber-200"
                      >
                        <Sparkles size={14} /> Revoke Creator Pro
                      </button>
                    )}

                    <div className="flex items-center gap-2 rounded border border-white/15 bg-black/25 px-3 py-1.5 text-xs">
                      <span>Sets:</span>
                      <input
                        value={maxSets}
                        onChange={(e) => setMaxSets(e.target.value)}
                        className="w-14 rounded border border-white/20 bg-[#0b0d17] px-2 py-0.5 text-white"
                      />
                      <span>Items:</span>
                      <input
                        value={maxItems}
                        onChange={(e) => setMaxItems(e.target.value)}
                        className="w-16 rounded border border-white/20 bg-[#0b0d17] px-2 py-0.5 text-white"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateCaps()}
                        className="rounded bg-white/15 px-2 py-1 text-[10px] font-bold uppercase hover:bg-white/25"
                      >
                        Set Caps
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={unpublishAll}
                    onChange={(e) => setUnpublishAll(e.target.checked)}
                  />
                  Also unpublish all active sets when applying restriction
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void applyRestriction("PUBLISH_BAN")}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded bg-amber-500 px-3 text-xs font-bold uppercase text-[#15122b]"
                >
                  <ShieldOff size={14} /> Apply Publish Ban
                </button>
                {identity.role === "ADMIN" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void applyRestriction("SUSPENDED")}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded bg-red-600 px-3 text-xs font-bold uppercase text-white"
                  >
                    <Ban size={14} /> Suspend Account
                  </button>
                )}
              </div>
            </div>
          </section>

          {detail.restrictions.length > 0 && (
            <AdminTable
              caption="Account Restrictions"
              rows={detail.restrictions}
              rowKey={(r) => r.id}
              rowHeaderLabel="Type"
              rowHeader={(r) => r.type}
              columns={[
                { key: "reason", label: "Reason", render: (r) => r.reason },
                {
                  key: "state",
                  label: "Status",
                  render: (r) => (r.liftedAt ? `Lifted (${new Date(r.liftedAt).toLocaleDateString()})` : "ACTIVE"),
                },
                {
                  key: "act",
                  label: "Action",
                  align: "right",
                  render: (r) =>
                    !r.liftedAt ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void lift(r.id)}
                        className="rounded border border-white/25 px-2.5 py-1 text-[10px] font-bold uppercase hover:bg-white/10"
                      >
                        Lift
                      </button>
                    ) : (
                      "—"
                    ),
                },
              ]}
            />
          )}

          <AdminTable
            caption={`Creator Playsets (${detail.playsets.length})`}
            rows={detail.playsets}
            rowKey={(p) => p.id}
            rowHeaderLabel="Title"
            rowHeader={(p) => (
              <Link
                href={`/admin/playsets/${encodeURIComponent(p.id)}`}
                className="text-[var(--accent-action-higher)] hover:underline"
              >
                {p.title}
              </Link>
            )}
            columns={[
              { key: "status", label: "Status", render: (p) => `${p.status} / ${p.visibility}` },
              { key: "mod", label: "Moderation", render: (p) => p.moderationState },
              { key: "items", label: "Items", align: "right", render: (p) => p.itemCount },
              { key: "reports", label: "Open Reports", align: "right", render: (p) => p.openReports },
            ]}
          />
        </>
      )}
    </div>
  );
}
