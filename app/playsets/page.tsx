import Link from "next/link";
import { ArrowLeft, Layers3 } from "lucide-react";
import { fetchPublicPlaysets } from "@/lib/backend/client";
import type { PublicPlaysetSummary } from "@/lib/backend";
import PlaysetsLibrary from "@/components/playsets/PlaysetsLibrary";

export default async function PublicPlaysetsPage() {
  let playsets: PublicPlaysetSummary[] = [];
  let total = 0;
  let unavailable = false;
  try {
    const page = await fetchPublicPlaysets({ limit: 24, offset: 0 });
    playsets = page.playsets;
    total = page.total;
  } catch {
    unavailable = true;
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <header>
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:text-white">
          <ArrowLeft size={16} /> Back to game
        </Link>
      </header>
      <section className="mx-auto w-full max-w-4xl flex-1 py-12 sm:py-16">
        <div className="mb-10 text-center">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent-action-higher)]">
            <Layers3 size={15} /> Playset library
          </p>
          <h1 className="text-4xl font-bold tracking-[-0.07em] text-white [text-shadow:4px_4px_0_var(--accent-time-attack)] sm:text-6xl">
            PLAYSETS
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
            Built-in sets ship with the platform; community sets are published by creators. Search, filter, or pick any set to play Classic, Time Attack, or Multiplayer.
          </p>
        </div>
        <PlaysetsLibrary
          initialPlaysets={playsets}
          initialTotal={total}
          initialUnavailable={unavailable}
        />
      </section>
    </main>
  );
}
