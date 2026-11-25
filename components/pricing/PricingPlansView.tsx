"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  Check,
  CircleAlert,
  Copy,
  Crown,
  ExternalLink,
  Layers3,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  fetchCreatorProfile,
  fetchKofiIntent,
  getSupabaseBrowserClient,
  startXenditUpgrade,
  type CreatorProfile,
} from "@/lib/backend/creator";
import {
  DEFAULT_PUBLIC_SETTINGS,
  fetchPublicSettings,
  type PublicSettings,
} from "@/lib/backend/publicSettings";
import NativeModalDialog from "@/components/ui/NativeModalDialog";

interface ComparisonRow {
  feature: string;
  free: string;
  pro: string;
}

const SLOT_RULES = [
  {
    title: "What counts toward active slots",
    body: "Active drafts and published sets (including sets flagged by moderation) count toward your slot cap—3 on Free, or 25 on Creator Pro.",
    icon: Layers3,
  },
  {
    title: "Archive vs. Permanent Delete",
    body: "Neither archived nor permanently deleted playsets count toward active slots. Free accounts can archive 1 playset per 24 hours; permanent delete works anytime with zero cooldown.",
    icon: Trash2,
  },
  {
    title: "Device pool & One-Time Pro",
    body: "Free-tier sign-ins on the same browser/device share one 3-slot pool so alt accounts stay fair. Creator Pro gives your account 25 dedicated active slots permanently for one payment.",
    icon: ShieldCheck,
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "Do players need an account or plan to play?",
    a: "Never. Playing Solo Classic, Time Attack, custom playsets, and Multiplayer rooms (hosting or joining) is 100% free with no sign-in required.",
  },
  {
    q: "What happens when I hit the 3-playset Free limit?",
    a: "You can still edit and play your existing sets. To create a new set, either archive an unused set (read-only backup; 1 archive every 24h on Free), permanently delete an unwanted set (instant, no cooldown), or unlock Creator Pro for 25 active slots.",
  },
  {
    q: "Do archived or deleted playsets still take up slots?",
    a: "No. As soon as you archive or delete an active playset, your active slot count drops by 1 and creating new sets in Creator Studio is immediately re-enabled.",
  },
  {
    q: "Is Creator Pro a recurring subscription?",
    a: "No. Creator Pro is a single one-time lifetime unlock paid via Xendit (GCash, Maya, QR Ph, Cards in PHP) or Ko-fi (PayPal / international cards in USD).",
  },
] as const;

export default function PricingPlansView() {
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [publicSettings, setPublicSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");
  const [kofiInfo, setKofiInfo] = useState<{ kofiUrl: string; claimCode: string; amountUsd: number } | null>(null);
  const [copiedClaim, setCopiedClaim] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchPublicSettings().then((settings) => {
      if (active) setPublicSettings(settings);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setToken(data.session?.access_token ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
      if (!session) setProfile(null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void fetchCreatorProfile(token)
      .then((next) => {
        if (active) setProfile(next);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function openUpgradeModal() {
    setUpgradeError("");
    setUpgradeBusy(false);
    setUpgradeOpen(true);
    setKofiInfo(null);
    if (token && publicSettings.payments.kofiEnabled) {
      try {
        setKofiInfo(await fetchKofiIntent(token));
      } catch {
        // Handled cleanly if Ko-fi URL/intent is unavailable.
      }
    }
  }

  async function launchXenditCheckout() {
    if (!token) return;
    setUpgradeBusy(true);
    setUpgradeError("");
    try {
      const { invoiceUrl } = await startXenditUpgrade(token);
      window.location.href = invoiceUrl;
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : "Could not start Xendit checkout.");
      setUpgradeBusy(false);
    }
  }

  const isPro = profile?.tier === "PRO";
  const effectiveSlotsUsed = profile
    ? isPro
      ? profile.activeSlotsUsed
      : Math.max(profile.activeSlotsUsed, profile.devicePoolSlotsUsed)
    : 0;

  const comparisonRows: ComparisonRow[] = [
    {
      feature: "Solo Classic, Time Attack & Multiplayer",
      free: "Unlimited · Free forever",
      pro: "Unlimited · Free forever",
    },
    {
      feature: "Active Custom Playset Slots",
      free: "Up to 3 active sets (shared per device)",
      pro: "Up to 25 active sets (account-wide)",
    },
    {
      feature: "Items per Custom Playset",
      free: "5 to 50 items",
      pro: "5 to 200 items",
    },
    {
      feature: "Archived & Deleted Playsets",
      free: "Do not count toward the 3-slot limit",
      pro: "Do not count toward the 25-slot limit",
    },
    {
      feature: "Freeing Full Slots",
      free: "Archive (1 / 24h) or Permanent Delete (instant)",
      pro: "Archive or Permanent Delete (no cooldown)",
    },
    {
      feature: "WebP Image Uploads, Units & Decimals",
      free: "Included",
      pro: "Included",
    },
    {
      feature: "Creator Studio 30-Day Analytics",
      free: "—",
      pro: "Plays, completion rate & avg score",
    },
    {
      feature: "Creator Pro Badge on Community Sets",
      free: "—",
      pro: "Displayed on public set cards",
    },
    {
      feature: "Ad-Free Browsing & Gameplay",
      free: "Standard ad slots (when enabled)",
      pro: "Zero ads while signed in",
    },
    {
      feature: "Billing Model",
      free: "No card required",
      pro: `One-time ₱${publicSettings.payments.pricePhp} or $${publicSettings.payments.priceUsd} USD`,
    },
  ];

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:text-white"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to game
        </Link>

        <nav aria-label="Primary" className="flex flex-wrap items-center gap-2 text-xs">
          <Link
            href="/playsets"
            className="rounded-sm border border-transparent px-2.5 py-1.5 uppercase tracking-[0.1em] text-[var(--text-secondary)] transition hover:bg-white/10 hover:text-white"
          >
            Custom sets
          </Link>
          <Link
            href="/studio"
            className="rounded-sm border border-transparent px-2.5 py-1.5 uppercase tracking-[0.1em] text-[var(--text-secondary)] transition hover:bg-white/10 hover:text-white"
          >
            Create
          </Link>
          <Link
            href="/multiplayer"
            className="rounded-sm border border-transparent px-2.5 py-1.5 uppercase tracking-[0.1em] text-[var(--text-secondary)] transition hover:bg-white/10 hover:text-white"
          >
            Multiplayer
          </Link>
          <Link
            href="/pricing"
            aria-current="page"
            className="rounded-sm border border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/12 px-2.5 py-1.5 font-bold uppercase tracking-[0.1em] text-white"
          >
            Plans
          </Link>
        </nav>
      </header>

      <section className="mx-auto w-full flex-1 py-10 sm:py-14">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent-highlight)]">
            <Crown size={14} aria-hidden="true" />
            Creator Plans &amp; Slot Limits
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.06em] text-white [text-shadow:4px_4px_0_var(--accent-time-attack)] sm:text-6xl">
            PLANS &amp; PRICING
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Playing Solo or Multiplayer is always free. Creator plans govern how many active custom
            playsets and items per set you can maintain in Creator Studio.
          </p>
        </div>

        {profile && (
          <section
            aria-label="Your current plan status"
            className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-md border border-white/20 bg-[#1b1734]/90 px-5 py-4"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                  isPro
                    ? "border border-[var(--accent-highlight)]/50 bg-[var(--accent-highlight)]/15 text-[var(--accent-highlight)]"
                    : "border border-white/25 bg-white/5 text-white"
                }`}
              >
                {isPro && <Sparkles size={11} aria-hidden="true" />}
                Current Plan: {isPro ? "Creator Pro" : "Free Tier"}
              </span>
              <span className="text-[var(--text-secondary)]">
                Signed in as <strong className="text-white">@{profile.handle}</strong>
              </span>
              <span className="text-[var(--text-secondary)]">
                Active slots:{" "}
                <strong
                  className={
                    effectiveSlotsUsed >= profile.maxPlaysets ? "text-amber-300" : "text-white"
                  }
                >
                  {profile.activeSlotsUsed}/{profile.maxPlaysets}
                </strong>
                {!isPro && profile.devicePoolSlotsUsed > profile.activeSlotsUsed
                  ? ` (${profile.devicePoolSlotsUsed}/${profile.maxPlaysets} on this device)`
                  : ""}
              </span>
              <span className="text-[var(--text-secondary)]">
                Max items/set: <strong className="text-white">{profile.maxItemsPerSet}</strong>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/studio"
                className="rounded-sm border border-white/25 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:border-white hover:bg-white/5"
              >
                Open Studio
              </Link>
              {!isPro && (
                <button
                  type="button"
                  onClick={() => void openUpgradeModal()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-[var(--accent-highlight)] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#15122b] transition hover:brightness-110"
                >
                  <Crown size={14} aria-hidden="true" />
                  Upgrade to Pro
                </button>
              )}
            </div>
          </section>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Free Tier Card */}
          <article className="flex flex-col rounded-md border border-white/20 bg-[#1b1734]/90 p-6 shadow-[0_8px_0_var(--accent-classic)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Default Account
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white">Free Tier</h2>
              </div>
              <span className="rounded-sm border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                Included
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2 border-b border-white/10 pb-4">
              <span className="text-4xl font-bold text-white">₱0 / $0</span>
              <span className="text-xs text-[var(--text-muted)]">Free forever · No card required</span>
            </div>

            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2.5">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                <span>Unlimited Solo Classic, Time Attack &amp; Multiplayer rooms</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                <span>
                  <strong className="text-white">3 active custom playset slots</strong> (drafts &amp;
                  published sets combined)
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                <span>
                  Up to <strong className="text-white">50 items</strong> per playset with custom WebP
                  image uploads
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Archive size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
                <span>
                  Archive (1 per 24h) or <strong className="text-white">permanently delete</strong>{" "}
                  sets anytime to free slots—neither counts toward your 3-slot limit
                </span>
              </li>
            </ul>

            <div className="mt-6">
              <Link
                href="/studio"
                className="flex min-h-11 w-full items-center justify-center rounded-sm border border-white/30 px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:border-white hover:bg-white/10"
              >
                {profile ? "Manage Sets in Studio" : "Start Building Free"}
              </Link>
            </div>
          </article>

          {/* Creator Pro Card */}
          <article className="flex flex-col rounded-md border-2 border-[var(--accent-highlight)]/75 bg-[#20193f] p-6 shadow-[0_8px_0_var(--accent-time-attack)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-highlight)]">
                  Lifetime Creator Unlock
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white">Creator Pro</h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-sm bg-[var(--accent-highlight)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#15122b]">
                <Crown size={11} aria-hidden="true" />
                One-Time
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-2 border-b border-white/10 pb-4">
              <span className="text-4xl font-bold text-[var(--accent-highlight)]">
                ₱{publicSettings.payments.pricePhp}
              </span>
              <span className="text-sm font-bold text-white">
                / ${publicSettings.payments.priceUsd} USD
              </span>
              <span className="text-xs text-[var(--text-muted)]">One-time · No subscription</span>
            </div>

            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2.5">
                <Check size={16} className="mt-0.5 shrink-0 text-[var(--accent-highlight)]" aria-hidden="true" />
                <span>
                  <strong className="text-white">25 active custom playset slots</strong> (dedicated
                  to your account, separate from device pools)
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={16} className="mt-0.5 shrink-0 text-[var(--accent-highlight)]" aria-hidden="true" />
                <span>
                  Up to <strong className="text-white">200 items per playset</strong> for deep trivia
                  &amp; marathon decks
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={16} className="mt-0.5 shrink-0 text-[var(--accent-highlight)]" aria-hidden="true" />
                <span>
                  Creator Studio 30-day plays, completion rate, and average score analytics
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={16} className="mt-0.5 shrink-0 text-[var(--accent-highlight)]" aria-hidden="true" />
                <span>
                  Creator Pro supporter badge on public playsets &amp; zero ads while signed in
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={16} className="mt-0.5 shrink-0 text-[var(--accent-highlight)]" aria-hidden="true" />
                <span>Instant archive &amp; delete anytime with zero archive cooldown</span>
              </li>
            </ul>

            <div className="mt-6">
              {isPro ? (
                <Link
                  href="/studio"
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-emerald-400/50 bg-emerald-950/35 px-4 text-xs font-bold uppercase tracking-[0.1em] text-emerald-200 transition hover:bg-emerald-900/40"
                >
                  <Sparkles size={14} aria-hidden="true" />
                  Creator Pro Active · Open Studio
                </Link>
              ) : token ? (
                <button
                  type="button"
                  onClick={() => void openUpgradeModal()}
                  className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[#15122b] transition hover:brightness-110"
                >
                  <Crown size={15} aria-hidden="true" />
                  Unlock Creator Pro
                </button>
              ) : (
                <Link
                  href="/studio"
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[#15122b] transition hover:brightness-110"
                >
                  <Crown size={15} aria-hidden="true" />
                  Sign in on Studio to Upgrade
                </Link>
              )}
            </div>
          </article>
        </div>

        {/* How Slots Work */}
        <section className="mt-12" aria-labelledby="how-slots-work-heading">
          <h2 id="how-slots-work-heading" className="text-xl font-bold text-white sm:text-2xl">
            How Active Playset Slots Work
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Only live drafts and published playsets use up your active slots. Archiving a set keeps a
            read-only snapshot in your library, while deleting removes it permanently—either action
            frees a slot right away.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {SLOT_RULES.map((rule) => {
              const Icon = rule.icon;
              return (
                <article
                  key={rule.title}
                  className="rounded-md border border-white/15 bg-[#1b1734]/80 p-5"
                >
                  <Icon
                    size={18}
                    className="text-[var(--accent-highlight)]"
                    aria-hidden="true"
                  />
                  <h3 className="mt-3 text-base font-bold text-white">{rule.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{rule.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Responsive Plan Comparison Table */}
        <section className="mt-12" aria-labelledby="plan-comparison-heading">
          <h2 id="plan-comparison-heading" className="mb-4 text-xl font-bold text-white sm:text-2xl">
            Full Tier Breakdown
          </h2>
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="plan-comparison-caption"
            className="pricing-table-wrapper"
          >
            <table>
              <caption id="plan-comparison-caption">
                Higher or Lower — Free Tier vs. Creator Pro Comparison
              </caption>
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">Free Tier</th>
                  <th scope="col">Creator Pro</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row">{row.feature}</th>
                    <td data-label="Free Tier" className="text-[var(--text-secondary)]">
                      {row.free}
                    </td>
                    <td data-label="Creator Pro" className="text-white">
                      {row.pro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12" aria-labelledby="pricing-faq-heading">
          <h2 id="pricing-faq-heading" className="text-xl font-bold text-white sm:text-2xl">
            Frequently Asked Questions
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {FAQ_ITEMS.map((item) => (
              <article
                key={item.q}
                className="rounded-md border border-white/15 bg-[#1b1734]/80 p-5"
              >
                <h3 className="text-sm font-bold text-white">{item.q}</h3>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{item.a}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[11px] text-[var(--text-muted)]">
        <span>Higher or Lower · Plans &amp; Pricing</span>
        <nav aria-label="Footer links" className="flex flex-wrap gap-4">
          <Link href="/playsets" className="hover:text-white">
            Playsets
          </Link>
          <Link href="/studio" className="hover:text-white">
            Creator Studio
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
        </nav>
      </footer>

      <NativeModalDialog
        open={upgradeOpen}
        onClose={() => {
          setUpgradeOpen(false);
          setUpgradeError("");
        }}
        eyebrow="One-Time Creator Unlock"
        title="Upgrade to Creator Pro"
      >
        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <ul className="space-y-1.5 rounded-sm border border-white/15 bg-black/20 p-3.5 text-xs">
            <li>
              • Up to <strong>25 active playsets</strong> (up from 3)
            </li>
            <li>
              • Up to <strong>200 items per playset</strong> (up from 50)
            </li>
            <li>• Studio 30-day plays, completion rate, and average score</li>
            <li>• Creator Pro supporter badge on public playset cards</li>
            <li>• Zero ads across browsing and gameplay while signed in</li>
          </ul>

          {upgradeError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-sm border border-rose-400/40 bg-rose-950/50 px-3 py-2.5 text-xs text-rose-100"
            >
              <CircleAlert size={15} className="mt-0.5 shrink-0 text-rose-300" aria-hidden="true" />
              <span>{upgradeError}</span>
            </div>
          )}

          {publicSettings.payments.xenditEnabled && (
            <button
              type="button"
              disabled={upgradeBusy}
              onClick={() => void launchXenditCheckout()}
              className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[#15122b] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Crown size={15} aria-hidden="true" />
              {upgradeBusy
                ? "Redirecting to Xendit…"
                : `Unlock via GCash / Maya / Card (₱${publicSettings.payments.pricePhp})`}
            </button>
          )}

          {publicSettings.payments.kofiEnabled && (
            <div className="space-y-2 rounded-sm border border-white/15 bg-white/[0.03] p-3.5">
              <p className="text-xs font-bold text-white">
                International / PayPal via Ko-fi (${publicSettings.payments.priceUsd})
              </p>
              <p className="text-[11px] leading-5 text-[var(--text-muted)]">
                Include your personal claim code in the Ko-fi message so Creator Pro unlocks
                automatically:
              </p>
              <div className="flex items-center justify-between gap-2 rounded bg-black/35 px-3 py-2 font-mono text-xs text-[var(--accent-highlight)]">
                <span>{kofiInfo?.claimCode ?? profile?.kofiClaimCode ?? "…"}</span>
                <button
                  type="button"
                  onClick={() => {
                    const code = kofiInfo?.claimCode ?? profile?.kofiClaimCode ?? "";
                    if (code) {
                      void navigator.clipboard?.writeText(code);
                      setCopiedClaim(true);
                      window.setTimeout(() => setCopiedClaim(false), 2000);
                    }
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold uppercase text-white"
                >
                  {copiedClaim ? <Check size={12} /> : <Copy size={12} />}
                  {copiedClaim ? "Copied" : "Copy"}
                </button>
              </div>
              {kofiInfo?.kofiUrl && (
                <a
                  href={kofiInfo.kofiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm border border-white/30 px-4 text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-white/10"
                >
                  Open Ko-fi Checkout <ExternalLink size={13} aria-hidden="true" />
                </a>
              )}
            </div>
          )}

          {!publicSettings.payments.xenditEnabled && !publicSettings.payments.kofiEnabled && (
            <p className="rounded-sm border border-amber-300/30 bg-amber-950/25 p-3 text-xs text-amber-100">
              Online payments are not enabled yet. Administrators can activate Xendit or Ko-fi (or grant
              Creator Pro directly) from the Admin Console.
            </p>
          )}
        </div>
      </NativeModalDialog>
    </main>
  );
}
