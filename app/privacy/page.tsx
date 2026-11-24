import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Higher or Lower handles anonymous gameplay analytics, OAuth creator sign-in, uploaded images, payments, and advertising preferences.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
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
            Legal &amp; Privacy
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Last updated: November 24, 2026
          </p>
        </header>

        <section className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          <h2 className="text-base font-bold text-white">1. Playing without an account</h2>
          <p>
            Official and community Higher or Lower games (solo and multiplayer) are free to play
            without creating an account. Your browser generates a random local device identifier in{" "}
            <code>localStorage</code> so multiplayer rooms keep one seat per device, avoid
            double-counting aggregate daily reach, and rate-limit duplicate content reports. That
            identifier is one-way hashed server-side using a rotated cryptographic salt; we do not
            store raw IP addresses in analytics or report tables.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          <h2 className="text-base font-bold text-white">2. Creator accounts (Discord &amp; Google OAuth)</h2>
          <p>
            Signing into Creator Studio via Supabase Auth (Discord or Google OAuth) provides your
            authentication user ID, email address, display name, and provider name. We use this to
            associate your custom playsets, uploaded item images, tier entitlements (Free or Creator
            Pro), and Ko-fi payment claim code, as well as to prevent multi-account free-tier
            bypass across devices.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          <h2 className="text-base font-bold text-white">3. Uploaded playset images</h2>
          <p>
            Images uploaded in Creator Studio are decoded on our server, stripped of all EXIF/camera
            metadata, resized to at most 512px WebP files, hashed (SHA-256) for safety moderation,
            and stored on Supabase Storage so players never fetch arbitrary third-party URLs.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          <h2 className="text-base font-bold text-white">4. Payments</h2>
          <p>
            One-time Creator Pro purchases are processed externally by Xendit (for Philippine payment
            methods such as GCash, Maya, QR Ph, and cards) or Ko-fi / PayPal. Higher or Lower
            never receives or stores raw card numbers or bank credentials—only payment references,
            amount, currency, payer email (for receipt matching), and unlock status.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          <h2 className="text-base font-bold text-white">5. Advertising &amp; third-party cookies</h2>
          <p>
            When display advertising is enabled on public pages, third-party ad partners may place or
            read cookies/identifiers in your browser to deliver and measure non-intrusive ads.
            Signed-in Creator Pro members and staff see zero ads across browsing and gameplay. You
            can clear or block third-party cookies in your browser settings at any time, or manage ad
            personalization through your regional consent controls when shown.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
          <h2 className="text-base font-bold text-white">6. Data retention &amp; deletion</h2>
          <p>
            Finished and cancelled game session rows are purged automatically on a rolling 30-day
            schedule after anonymous aggregate metrics are rolled up. To request deletion of your
            creator profile or report harmful content, archive your playsets in Creator Studio or
            reach out via the support links provided on our homepage.
          </p>
        </section>
      </article>
    </main>
  );
}
