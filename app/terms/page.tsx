import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service covering free Higher or Lower gameplay, Creator Studio community playset rules, moderation, Creator Pro unlocks, and catalog data attribution.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-8 sm:px-8">
      <header className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:text-white"
        >
          <ArrowLeft size={16} /> Back to game
        </Link>
      </header>

      <article className="space-y-7 rounded-md border border-white/15 bg-[#1b1734]/90 p-6 sm:p-9">
        <header className="border-b border-white/10 pb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-highlight)]">
            Legal &amp; Rules
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Last updated: November 24, 2026
          </p>
        </header>

        <section className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          <h2 className="text-base font-bold text-white">1. Free gameplay</h2>
          <p>
            Higher or Lower is provided free for personal and party entertainment across official
            built-in categories and community playsets. Automated scraping, match manipulation, or
            denial-of-service attempts against the game service or WebSocket rooms are prohibited.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          <h2 className="text-base font-bold text-white">2. Creator Studio content guidelines</h2>
          <p>
            Creators are responsible for all text and uploaded images in custom playsets. You must
            not upload sexually explicit imagery, hate speech, harassment, malware, misleading spam,
            or copyrighted assets without permission. We reserve the right to hide, remove, or
            permanently block image hashes and restrict accounts (including publish bans or account
            suspensions) that violate these rules.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          <h2 className="text-base font-bold text-white">3. Free &amp; Creator Pro tiers</h2>
          <p>
            Free creator accounts allow up to 3 active playsets (50 items per set) and share that
            free slot limit per device to prevent spam alt-farming. Creator Pro is a one-time upgrade
            unlocking up to 25 active playsets, up to 200 items per set, Creator Studio analytics, a
            Creator Pro profile badge, and ad-free browsing/gameplay while signed in. Creator Pro
            does not grant immunity from content moderation or account suspension for abuse.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          <h2 className="text-base font-bold text-white">4. Official data sources</h2>
          <p>
            Official category statistics use public or licensed APIs and snapshots attributed directly
            on each item and category card (including TMDB, SteamSpy, IGDB, YouTube, TwitchTracker,
            and curated public datasets). Statistics are refreshed periodically and provided on an
            &ldquo;as-is&rdquo; informational basis.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          <h2 className="text-base font-bold text-white">5. Changes to these terms</h2>
          <p>
            We may update these Terms of Service and our{" "}
            <Link href="/privacy" className="underline hover:text-white">
              Privacy Policy
            </Link>{" "}
            as platform features evolve. Continued use of the site constitutes acceptance of updated
            terms.
          </p>
        </section>
      </article>
    </main>
  );
}
