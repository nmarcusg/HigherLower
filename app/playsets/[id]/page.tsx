import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers3, Play, Sparkles, Timer, Users } from "lucide-react";
import BackendSoloGame from "@/components/game/BackendSoloGame";
import ReportPlaysetDialog from "@/components/playsets/ReportPlaysetDialog";
import { fetchPublicPlayset } from "@/lib/backend/client";
import { decimalPrecisionLabel, formatPlaysetDisplayValue } from "@/lib/playsets/format";
import { getSiteUrl, serializeJsonLd, truncateMetaDescription } from "@/lib/seo/site";

const loadPublicPlayset = cache((id: string) => fetchPublicPlayset(id));

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
}): Promise<Metadata> {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const rawMode = Array.isArray(sp.mode) ? sp.mode[0] : sp.mode;

  let playset: Awaited<ReturnType<typeof loadPublicPlayset>>;
  try {
    playset = await loadPublicPlayset(id);
  } catch {
    return {
      title: "Playset Not Found",
      robots: { index: false, follow: false },
    };
  }

  const canonical = `/playsets/${encodeURIComponent(playset.id)}`;
  const isPendingApproval =
    !playset.id.startsWith("system-") &&
    playset.visibility === "PUBLIC" &&
    playset.moderationState === "UNREVIEWED";
  const isUnlistedOrHidden =
    playset.visibility === "UNLISTED" ||
    playset.moderationState === "HIDDEN" ||
    isPendingApproval;
  const isPlayMode = rawMode === "classic" || rawMode === "time-attack";
  const modeSuffix = rawMode === "time-attack" ? "Time Attack" : "Classic";
  const title = isPlayMode
    ? `${playset.title} · ${modeSuffix}`
    : `${playset.title} (${playset.metricName})`;
  const description = truncateMetaDescription(
    `Play Higher or Lower with ${playset.title}: compare ${playset.itemCount} items by ${playset.metricName} (${playset.metricUnit}) in Classic, Time Attack, or Multiplayer. ${playset.description}`,
  );

  return {
    title,
    description,
    alternates: { canonical },
    robots: isUnlistedOrHidden
      ? { index: false, follow: false, nocache: true }
      : isPlayMode
        ? { index: false, follow: true }
        : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicPlaysetGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const rawMode = Array.isArray(sp.mode) ? sp.mode[0] : sp.mode;

  let playset: Awaited<ReturnType<typeof loadPublicPlayset>>;
  try {
    playset = await loadPublicPlayset(id);
  } catch {
    notFound();
  }

  if (rawMode === "classic" || rawMode === "time-attack") {
    return (
      <BackendSoloGame
        playsetId={playset.id}
        categoryLabel={playset.title}
        mode={rawMode}
      />
    );
  }

  const builtIn = playset.id.startsWith("system-");
  const isUnlisted = playset.visibility === "UNLISTED";
  const isHidden = playset.moderationState === "HIDDEN";
  const isPendingApproval =
    !builtIn && playset.visibility === "PUBLIC" && playset.moderationState === "UNREVIEWED";
  const previewItems = playset.items.slice(0, 8);
  const siteOrigin = getSiteUrl().origin;
  const canonicalUrl = `${siteOrigin}/playsets/${encodeURIComponent(playset.id)}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteOrigin },
      { "@type": "ListItem", position: 2, name: "Playsets", item: `${siteOrigin}/playsets` },
      { "@type": "ListItem", position: 3, name: playset.title, item: canonicalUrl },
    ],
  };

  const playsetGameJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: `${playset.title} — Higher or Lower`,
    url: canonicalUrl,
    description: playset.description,
    applicationCategory: "Game",
    operatingSystem: "Any (Web Browser)",
    playMode: ["SinglePlayer", "MultiPlayer"],
    isAccessibleForFree: true,
    numberOfItems: playset.itemCount,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      {!isUnlisted && !isHidden && !isPendingApproval && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(playsetGameJsonLd) }}
          />
        </>
      )}
      <div className="ui-scale-120">
        <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/playsets"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:text-white"
          >
            <ArrowLeft size={16} /> Back to playsets
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {!builtIn && <ReportPlaysetDialog playsetId={playset.id} playsetTitle={playset.title} />}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-highlight)]">
              <Layers3 size={12} aria-hidden="true" />
              {isPendingApproval
                ? "Pending approval · Unlisted"
                : isUnlisted
                  ? "Unlisted set"
                  : builtIn
                    ? "Official set"
                    : "Community set"}
            </span>
          </div>
        </header>

        <section className="mx-auto w-full max-w-4xl flex-1 py-10 sm:py-14">
          <div className="rounded-md border border-white/20 bg-[#1b1734]/90 p-6 shadow-[0_8px_0_var(--accent-classic)] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-action-higher)]">
                  {playset.itemCount} items · {playset.metricName} ({playset.metricUnit})
                </p>
                {!builtIn && (
                  <span className="rounded-sm border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                    Display format:{" "}
                    <strong className="text-[var(--accent-highlight)]">
                      {formatPlaysetDisplayValue(1234.56, playset.metricUnit, playset.decimalPlaces ?? null)}
                    </strong>{" "}
                    ({decimalPrecisionLabel(playset.decimalPlaces)})
                  </span>
                )}
              </div>
              {playset.creator && (
                <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  @{playset.creator.handle}
                  {playset.creator.tier === "PRO" && (
                    <span className="inline-flex items-center gap-1 text-[var(--accent-highlight)]">
                      <Sparkles size={11} aria-hidden="true" /> Pro
                    </span>
                  )}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
              {playset.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {playset.description}
            </p>
            {isPendingApproval && (
              <div
                role="status"
                className="mt-5 rounded-sm border border-amber-400/35 bg-amber-950/35 p-3.5 text-xs leading-5 text-amber-100"
              >
                This playset is currently unlisted while waiting for moderator approval. Anyone with
                this link can play it now; it will appear in Community once approved.
              </div>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Link
                href={`/playsets/${encodeURIComponent(playset.id)}?mode=classic`}
                className="group flex flex-col justify-between rounded-sm border border-white/25 bg-white/[0.04] p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent-action-higher)] hover:bg-[var(--accent-action-higher)]/10"
              >
                <div>
                  <Play size={20} className="text-[var(--accent-action-higher)]" aria-hidden="true" />
                  <h2 className="mt-3 text-base font-bold text-white">Play Classic</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    Untimed survival run on this playset.
                  </p>
                </div>
                <span className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-action-higher)] group-hover:underline">
                  Start Classic →
                </span>
              </Link>

              <Link
                href={`/playsets/${encodeURIComponent(playset.id)}?mode=time-attack`}
                className="group flex flex-col justify-between rounded-sm border border-white/25 bg-white/[0.04] p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent-time-attack)] hover:bg-[var(--accent-time-attack)]/10"
              >
                <div>
                  <Timer size={20} className="text-[var(--accent-time-attack)]" aria-hidden="true" />
                  <h2 className="mt-3 text-base font-bold text-white">Play Time Attack</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    Beat the clock with time bonuses and penalties.
                  </p>
                </div>
                <span className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-time-attack)] group-hover:underline">
                  Start Time Attack →
                </span>
              </Link>

              <Link
                href={`/multiplayer?playset=${encodeURIComponent(playset.id)}`}
                className="group flex flex-col justify-between rounded-sm border border-[var(--accent-highlight)]/45 bg-[var(--accent-highlight)]/10 p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent-highlight)]"
              >
                <div>
                  <Users size={20} className="text-[var(--accent-highlight)]" aria-hidden="true" />
                  <h2 className="mt-3 text-base font-bold text-white">Host Multiplayer Room</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    Create a party room preloaded with this playset.
                  </p>
                </div>
                <span className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-highlight)] group-hover:underline">
                  Open Multiplayer →
                </span>
              </Link>
            </div>
          </div>

          {previewItems.length > 0 && (
            <section aria-labelledby="preview-items-heading" className="mt-10">
              <div className="mb-4 flex items-end justify-between gap-4">
                <h2 id="preview-items-heading" className="text-lg font-bold text-white">
                  Sample items in this set
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Showing {previewItems.length} of {playset.itemCount}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {previewItems.map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-sm border border-white/15 bg-[#1b1734]/80"
                  >
                    {item.imageUrl ? (
                      <div className="relative h-28 w-full overflow-hidden bg-black/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          loading="lazy"
                          className="h-full w-full object-cover opacity-90"
                        />
                      </div>
                    ) : (
                      <div className="grid h-28 place-items-center bg-white/[0.03] text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                        No image
                      </div>
                    )}
                    <div className="p-3">
                      <p className="truncate text-xs font-bold text-white">{item.name}</p>
                      <p className="mt-1 truncate text-[10px] text-[var(--text-muted)]">
                        {item.sourceLabel}
                        {item.sourceYear ? ` · ${item.sourceYear}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
        <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[11px] text-[var(--text-muted)]">
          <span>Higher or Lower</span>
          <nav aria-label="Legal links" className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </nav>
        </footer>
        </main>
      </div>
    </>
  );
}
