import Link from "next/link";
import { ArrowLeft, Layers3, Play } from "lucide-react";
import { fetchPublicPlaysets } from "@/lib/backend/client";

type Playset = Awaited<ReturnType<typeof fetchPublicPlaysets>>["playsets"][number];

/** Backend-owned sets use the `system-` prefix; everything else is creator-owned. */
function isBuiltIn(playset: Playset): boolean {
  return playset.id.startsWith("system-");
}

function PlaysetCard({ playset, kind }: { playset: Playset; kind: "built-in" | "community" }) {
  return (
    <Link href={`/playsets/${encodeURIComponent(playset.id)}`} className="group rounded-md border border-white/20 bg-[#1b1734]/90 p-5 shadow-[0_6px_0_var(--accent-classic)] transition hover:-translate-y-0.5 hover:border-[var(--accent-highlight)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white group-hover:[text-shadow:2px_2px_0_var(--accent-classic)]">{playset.title}</h3>
          <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">{playset.description}</p>
        </div>
        <Play size={18} className="shrink-0 text-[var(--accent-highlight)]" />
      </div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {playset.itemCount} items · {playset.metricName} ({playset.metricUnit}) · {kind}
      </p>
    </Link>
  );
}

export default async function PublicPlaysetsPage() {
  let playsets: Playset[] = [];
  let unavailable = false;
  try {
    playsets = (await fetchPublicPlaysets({ limit: 50 })).playsets;
  } catch {
    unavailable = true;
  }

  const builtIn = playsets.filter(isBuiltIn);
  const community = playsets.filter((playset) => !isBuiltIn(playset));

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <header>
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:text-white">
          <ArrowLeft size={16} /> Back to game
        </Link>
      </header>
      <section className="mx-auto w-full max-w-4xl flex-1 py-12 sm:py-16">
        <div className="mb-10 text-center">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent-action-higher)]"><Layers3 size={15} /> Playset library</p>
          <h1 className="text-4xl font-bold tracking-[-0.07em] text-white [text-shadow:4px_4px_0_var(--accent-time-attack)] sm:text-6xl">PLAYSETS</h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">Built-in sets ship with the platform; community sets are published by creators. Both run on the same backend-owned rules as every solo game.</p>
        </div>
        {unavailable ? (
          <div className="rounded-md border border-amber-300/30 bg-amber-200/10 p-6 text-center text-sm text-amber-100">The game service is waking up. Please return shortly.</div>
        ) : playsets.length === 0 ? (
          <div className="rounded-md border border-white/15 bg-white/[0.03] p-8 text-center text-sm text-[var(--text-secondary)]">No playsets are available yet.</div>
        ) : (
          <div className="space-y-12">
            {builtIn.length > 0 && (
              <section aria-labelledby="built-in-heading">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <h2 id="built-in-heading" className="text-xl font-bold text-white">Built-in sets</h2>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{builtIn.length} available</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {builtIn.map((playset) => <PlaysetCard key={playset.id} playset={playset} kind="built-in" />)}
                </div>
              </section>
            )}
            <section aria-labelledby="community-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <h2 id="community-heading" className="text-xl font-bold text-white">Community sets</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{community.length} published</p>
              </div>
              {community.length === 0 ? (
                <div className="rounded-md border border-white/15 bg-white/[0.03] p-8 text-center text-sm text-[var(--text-secondary)]">No public custom playsets have been published yet.</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {community.map((playset) => <PlaysetCard key={playset.id} playset={playset} kind="community" />)}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
