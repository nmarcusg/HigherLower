"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Link2, Save } from "lucide-react";
import { useAdminAuth } from "@/components/admin/AdminShell";
import AdminRefreshButton from "@/components/admin/AdminRefreshButton";
import AdminTable from "@/components/admin/AdminTable";
import AdminTabs from "@/components/admin/AdminTabs";
import StatusBadge from "@/components/admin/StatusBadge";
import NativeModalDialog from "@/components/ui/NativeModalDialog";
import {
  fetchAdminPayments,
  fetchAdminSettings,
  hasMinRole,
  linkAdminPayment,
  updateAdminSettings,
  type AdminPaymentRow,
  type AdminPaymentsSummary,
  type AdminPlatformSettings,
} from "@/lib/backend/admin";

type PayTab = "transactions" | "pricing" | "ads";

function formatMinor(amountMinor: number, currency: string) {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: major % 1 === 0 ? 0 : 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}

export default function AdminPaymentsAdsPage() {
  const { token, identity } = useAdminAuth();
  const isAdmin = hasMinRole(identity.role, "ADMIN");
  const isSuperAdmin = identity.role === "SUPERADMIN";
  const [tab, setTab] = useState<PayTab>("transactions");
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [summary, setSummary] = useState<AdminPaymentsSummary | null>(null);
  const [settings, setSettings] = useState<AdminPlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Link unmatched Ko-fi state
  const [linkTarget, setLinkTarget] = useState<AdminPaymentRow | null>(null);
  const [linkUserId, setLinkUserId] = useState("");
  const [linkReason, setLinkReason] = useState("");

  // Settings form state
  const [xenditEnabled, setXenditEnabled] = useState(false);
  const [kofiEnabled, setKofiEnabled] = useState(false);
  const [pricePhp, setPricePhp] = useState("199");
  const [priceUsd, setPriceUsd] = useState("4");
  const [kofiUrl, setKofiUrl] = useState("");

  const [adsEnabled, setAdsEnabled] = useState(false);
  const [slotHome, setSlotHome] = useState(false);
  const [slotLobby, setSlotLobby] = useState(false);
  const [slotPostgame, setSlotPostgame] = useState(false);
  const [adsTxt, setAdsTxt] = useState("");

  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [payRes, setRes] = await Promise.all([
        fetchAdminPayments(token),
        isSuperAdmin ? fetchAdminSettings(token) : Promise.resolve(null),
      ]);
      setPayments(payRes.payments);
      if (payRes.summary) setSummary(payRes.summary);
      if (setRes) {
        setSettings(setRes);
        setXenditEnabled(setRes.payments.xenditEnabled);
        setKofiEnabled(setRes.payments.kofiEnabled);
        setPricePhp(String(setRes.payments.pricePhp));
        setPriceUsd(String(setRes.payments.priceUsd));
        setKofiUrl(setRes.payments.kofiUrl);
        setAdsEnabled(setRes.ads.enabled);
        setSlotHome(setRes.ads.slots.home_banner);
        setSlotLobby(setRes.ads.slots.lobby_sidebar);
        setSlotPostgame(setRes.ads.slots.postgame_card);
        setAdsTxt(setRes.ads.adsTxt);
      }
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payments & settings.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isSuperAdmin, token]);

  useEffect(() => {
    void Promise.resolve().then(() => loadAll());
  }, [loadAll]);

  async function savePricing(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateAdminSettings(
        token,
        {
          "payments.xendit.enabled": xenditEnabled,
          "payments.kofi.enabled": kofiEnabled,
          "payments.price_php": Number(pricePhp),
          "payments.price_usd": Number(priceUsd),
          "payments.kofi_url": kofiUrl.trim(),
        },
        "Updated payment providers & pricing",
      );
      setNotice("Payment configuration saved.");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save payment settings.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAds(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateAdminSettings(
        token,
        {
          "ads.enabled": adsEnabled,
          "ads.slots.home_banner": slotHome,
          "ads.slots.lobby_sidebar": slotLobby,
          "ads.slots.postgame_card": slotPostgame,
          "ads.txt": adsTxt,
        },
        "Updated ad slots & ads.txt",
      );
      setNotice("Ad controls and /ads.txt updated.");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save ad settings.");
    } finally {
      setBusy(false);
    }
  }

  async function submitLink(event: FormEvent) {
    event.preventDefault();
    if (!linkTarget) return;
    setBusy(true);
    setError("");
    try {
      await linkAdminPayment(token, linkTarget.id, {
        userId: linkUserId.trim(),
        reason: linkReason.trim() || "Manual Ko-fi receipt link",
      });
      setNotice("Unmatched Ko-fi payment linked and Creator Pro unlocked.");
      setLinkTarget(null);
      setLinkUserId("");
      setLinkReason("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link payment.");
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return (
      <p className="rounded border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">
        Administrator role is required to view Payments &amp; Ads controls.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payments, Pricing &amp; Ads</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Manage Xendit &amp; Ko-fi unlocks, link unmatched receipts, and control ad slots + dynamic /ads.txt.
          </p>
          {!isSuperAdmin && (
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              Pricing, payment provider switches, and Ads &amp; /ads.txt settings require SUPERADMIN access.
            </p>
          )}
        </div>
        <AdminRefreshButton tabKey="payments" onRefresh={loadAll} />
      </header>

      {/* Payments & Ads Summary Overview Strip */}
      <section aria-label="Payments and ads summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary ? (
          <>
            <div className="rounded-md border border-white/15 bg-[#121628] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Transactions
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">
                {summary.totalCount}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {summary.pendingCount} pending · {summary.failedOrRefundedCount} failed/refunded
              </p>
            </div>
            <div className="rounded-md border border-white/15 bg-[#121628] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Completed &amp; Grants
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-300">
                {summary.completedCount}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                Includes {summary.adminGrantCount} admin Pro grant(s)
              </p>
            </div>
            <div className="rounded-md border border-white/15 bg-[#121628] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Unmatched Ko-fi
              </p>
              <p
                className={`mt-1.5 text-2xl font-bold tabular-nums ${
                  summary.unmatchedCount > 0 ? "text-amber-300" : "text-white"
                }`}
              >
                {summary.unmatchedCount}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {summary.unmatchedCount > 0 ? "Needs manual creator link" : "All receipts matched"}
              </p>
            </div>
            <div className="rounded-md border border-white/15 bg-[#121628] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Paid Revenue &amp; Status
              </p>
              <p className="mt-1.5 text-sm font-bold text-[var(--accent-highlight)]">
                {summary.revenueByCurrency.length > 0
                  ? summary.revenueByCurrency
                      .map((r) => formatMinor(r.amountMinor, r.currency))
                      .join(" · ")
                  : "0 paid receipts"}
              </p>
              {settings && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <StatusBadge
                    value={settings.ads.enabled ? "ENABLED" : "PAUSED"}
                    label={`Ads ${settings.ads.enabled ? "On" : "Paused"}`}
                  />
                  {(settings.payments.xenditEnabled || settings.payments.kofiEnabled) && (
                    <StatusBadge value="ACTIVE" label="Checkout Active" />
                  )}
                </div>
              )}
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

      <AdminTabs
        label="Payments & Ads sections"
        tabs={[
          { id: "transactions", label: "Transactions", badge: payments.length },
          ...(isSuperAdmin
            ? [
                { id: "pricing" as const, label: "Pricing & Providers" },
                { id: "ads" as const, label: "Ads & ads.txt" },
              ]
            : []),
        ]}
        activeId={isSuperAdmin ? tab : "transactions"}
        onChange={setTab}
      />

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

      {tab === "transactions" && (
        <AdminTable
          caption="Payment Ledger (Xendit · Ko-fi · Admin Grants)"
          loading={loading}
          rows={payments}
          rowKey={(p) => p.id}
          rowHeaderLabel="Reference"
          rowHeader={(p) => (
            <div>
              <p className="font-mono text-xs">{p.providerRef}</p>
              <p className="text-[11px] font-normal text-[var(--text-muted)]">{p.provider}</p>
            </div>
          )}
          columns={[
            {
              key: "status",
              label: "Status",
              render: (p) => <StatusBadge value={p.status} />,
            },
            {
              key: "creator",
              label: "Creator",
              render: (p) =>
                p.creator ? (
                  <Link
                    href={`/admin/creators/${encodeURIComponent(p.creator.userId)}`}
                    className="text-[var(--accent-action-higher)] hover:underline"
                  >
                    @{p.creator.handle}
                  </Link>
                ) : (
                  <span className="text-[var(--text-muted)]">{p.payerEmail ?? "Unlinked"}</span>
                ),
            },
            {
              key: "amount",
              label: "Amount",
              render: (p) => formatMinor(p.amountMinor, p.currency),
            },
            {
              key: "date",
              label: "Created",
              render: (p) => new Date(p.createdAt).toLocaleString(),
            },
            {
              key: "action",
              label: "Action",
              align: "right",
              render: (p) =>
                p.status === "UNMATCHED" ? (
                  <button
                    type="button"
                    onClick={() => setLinkTarget(p)}
                    className="inline-flex items-center gap-1 rounded bg-[var(--accent-highlight)] px-2.5 py-1 text-[10px] font-bold uppercase text-[#15122b]"
                  >
                    <Link2 size={11} /> Link creator
                  </button>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      )}

      {isSuperAdmin && tab === "pricing" && settings && (
        <form onSubmit={(e) => void savePricing(e)} className="max-w-2xl space-y-5 rounded-md border border-white/15 bg-[#121628] p-6">
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={xenditEnabled}
                onChange={(e) => setXenditEnabled(e.target.checked)}
              />
              <span>
                <strong>Enable Xendit Checkout</strong> (GCash, Maya, QR Ph, Cards — PHP)
              </span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={kofiEnabled}
                onChange={(e) => setKofiEnabled(e.target.checked)}
              />
              <span>
                <strong>Enable Ko-fi / PayPal Unlock</strong> (International — USD)
              </span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Creator Pro Price (PHP)
              <input
                type="number"
                value={pricePhp}
                onChange={(e) => setPricePhp(e.target.value)}
                className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Creator Pro Price (USD)
              <input
                type="number"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
                className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
              />
            </label>
          </div>

          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Ko-fi Page URL
            <input
              type="url"
              value={kofiUrl}
              onChange={(e) => setKofiUrl(e.target.value)}
              placeholder="https://ko-fi.com/yourhandle"
              className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase text-[#15122b]"
          >
            <Save size={14} /> Save Payment Settings
          </button>
        </form>
      )}

      {isSuperAdmin && tab === "ads" && settings && (
        <form onSubmit={(e) => void saveAds(e)} className="max-w-2xl space-y-5 rounded-md border border-white/15 bg-[#121628] p-6">
          <div className="rounded border border-amber-300/30 bg-amber-950/20 p-3 text-xs text-amber-100">
            Keep ads paused while hosted on a free vercel.app preview domain. Enable after attaching a
            custom domain and publisher verification. Signed-in Creator Pro and Staff never see ads.
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm font-bold text-white">
              <input
                type="checkbox"
                checked={adsEnabled}
                onChange={(e) => setAdsEnabled(e.target.checked)}
              />
              Global Ads Master Switch (ads.enabled)
            </label>
            <div className="space-y-2 pl-6 text-xs text-[var(--text-secondary)]">
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={slotHome}
                  onChange={(e) => setSlotHome(e.target.checked)}
                />
                Home Setup Banner (home_banner)
              </label>
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={slotLobby}
                  onChange={(e) => setSlotLobby(e.target.checked)}
                />
                Multiplayer Lobby Card (lobby_sidebar)
              </label>
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={slotPostgame}
                  onChange={(e) => setSlotPostgame(e.target.checked)}
                />
                Solo Game-Over Modal Footer (postgame_card)
              </label>
            </div>
          </div>

          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            /ads.txt Contents (served live at{" "}
            <a href="/ads.txt" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-action-higher)] underline">
              /ads.txt
            </a>
            )
            <textarea
              rows={5}
              value={adsTxt}
              onChange={(e) => setAdsTxt(e.target.value)}
              placeholder="google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0"
              className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] p-3 font-mono text-xs text-white"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase text-[#15122b]"
          >
            <Save size={14} /> Save Ad Controls &amp; ads.txt
          </button>
        </form>
      )}

      <NativeModalDialog
        open={Boolean(linkTarget)}
        onClose={() => setLinkTarget(null)}
        eyebrow="Unmatched Ko-fi Receipt"
        title="Link Payment to Creator"
      >
        <form onSubmit={(e) => void submitLink(e)} className="space-y-4 text-xs">
          <p className="text-[var(--text-secondary)]">
            Receipt <strong>{linkTarget?.providerRef}</strong> from{" "}
            <strong>{linkTarget?.payerEmail ?? "unknown payer"}</strong>. Enter the target
            creator&apos;s Supabase User ID to unlock Creator Pro immediately:
          </p>
          <label className="block font-bold uppercase text-[var(--text-muted)]">
            Target Creator User ID
            <input
              required
              value={linkUserId}
              onChange={(e) => setLinkUserId(e.target.value)}
              placeholder="e.g. a1b2c3d4-..."
              className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block font-bold uppercase text-[var(--text-muted)]">
            Reason (audit log)
            <input
              required
              minLength={3}
              value={linkReason}
              onChange={(e) => setLinkReason(e.target.value)}
              placeholder="Verified supporter email in Discord"
              className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#0b0d17] px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setLinkTarget(null)}
              className="min-h-9 rounded border border-white/25 px-3 font-bold uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-9 rounded bg-[var(--accent-highlight)] px-4 font-bold uppercase text-[#15122b]"
            >
              Link &amp; Unlock Pro
            </button>
          </div>
        </form>
      </NativeModalDialog>
    </div>
  );
}
