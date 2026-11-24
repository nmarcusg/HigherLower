import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers3, Play, Timer, Users } from "lucide-react";
import BackendSoloGame from "@/components/game/BackendSoloGame";
import { fetchPublicPlayset } from "@/lib/backend/client";

export default async function PublicPlaysetGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const rawMode = Array.isArray(sp.mode) ? sp.mode[0] : sp.mode;

  let playset: Awaited<ReturnType<typeof fetchPublicPlayset>>;
  try {
    playset = await fetchPublicPlayset(id);
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
  const previewItems = playset.items.slice(0, 8);

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <Link
          href="/playsets"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition hover:text-white"
        >
          <ArrowLeft size={16} /> Back to playsets
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-highlight)]">
          <Layers3 size={12} aria-hidden="true" />
          {builtIn ? "Official set" : "Community set"}
        </span>
      </header>

      <section className="mx-auto w-full max-w-4xl flex-1 py-10 sm:py-14">
        <div className="rounded-md border border-white/20 bg-[#1b1734]/90 p-6 shadow-[0_8px_0_var(--accent-classic)] sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-action-higher)]">
            {playset.itemCount} items · {playset.metricName} ({playset.metricUnit})
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
            {playset.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {playset.description}
          </p>

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
                    <div className="relative h-28 w-full">
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 50vw, 220px"
                        className="object-cover opacity-85"
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
    </main>
  );
}
