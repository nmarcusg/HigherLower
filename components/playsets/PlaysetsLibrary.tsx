"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, LoaderCircle, Play, Search, X } from "lucide-react";
import { fetchPublicPlaysets } from "@/lib/backend/client";
import type { PublicPlaysetSummary } from "@/lib/backend";

type KindFilter = "all" | "system" | "custom";

const PAGE_LIMIT = 24;

const KIND_OPTIONS: ReadonlyArray<{ value: KindFilter; label: string }> = [
  { value: "all", label: "All sets" },
  { value: "system", label: "Official" },
  { value: "custom", label: "Community" },
];

/** Backend-owned sets use the `system-` prefix; everything else is creator-owned. */
function isBuiltIn(playset: PublicPlaysetSummary): boolean {
  return playset.id.startsWith("system-");
}

function PlaysetCard({ playset, showBadge = true }: { playset: PublicPlaysetSummary; showBadge?: boolean }) {
  const builtIn = isBuiltIn(playset);
  return (
    <Link
      href={`/playsets/${encodeURIComponent(playset.id)}`}
      className="group rounded-md border border-white/20 bg-[#1b1734]/90 p-5 shadow-[0_6px_0_var(--accent-classic)] transition hover:-translate-y-0.5 hover:border-[var(--accent-highlight)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {showBadge && (
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  builtIn
                    ? "border-[var(--accent-action-higher)]/40 bg-[var(--accent-action-higher)]/10 text-[var(--accent-action-higher)]"
                    : "border-[var(--accent-highlight)]/40 bg-[var(--accent-highlight)]/10 text-[var(--accent-highlight)]"
                }`}
              >
                {builtIn ? "Official" : "Community"}
              </span>
            </div>
          )}
          <h3 className="text-xl font-bold text-white group-hover:[text-shadow:2px_2px_0_var(--accent-classic)]">
            {playset.title}
          </h3>
          <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
            {playset.description}
          </p>
        </div>
        <Play size={18} className="mt-1 shrink-0 text-[var(--accent-highlight)]" aria-hidden="true" />
      </div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {playset.itemCount} items · {playset.metricName} ({playset.metricUnit})
      </p>
    </Link>
  );
}

interface PlaysetsLibraryProps {
  initialPlaysets: PublicPlaysetSummary[];
  initialTotal: number;
  initialUnavailable: boolean;
  initialQuery?: string;
  initialKind?: KindFilter;
}

export default function PlaysetsLibrary({
  initialPlaysets,
  initialTotal,
  initialUnavailable,
  initialQuery = "",
  initialKind = "all",
}: PlaysetsLibraryProps) {
  const router = useRouter();
  const searchInputId = useId();
  const unlistedInputId = useId();

  const [queryInput, setQueryInput] = useState(initialQuery);
  const [appliedQuery, setAppliedQuery] = useState(initialQuery);
  const [kind, setKind] = useState<KindFilter>(initialKind);
  const [playsets, setPlaysets] = useState<PublicPlaysetSummary[]>(initialPlaysets);
  const [total, setTotal] = useState(initialTotal);
  const [unavailable, setUnavailable] = useState(initialUnavailable);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [unlistedId, setUnlistedId] = useState("");
  const [unlistedOpen, setUnlistedOpen] = useState(false);

  const activeRequestRef = useRef<AbortController | null>(null);
  const skipInitialFetchRef = useRef(true);

  async function runQuery(nextQuery: string, nextKind: KindFilter, offset = 0, append = false) {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setErrorMessage("");

    try {
      const page = await fetchPublicPlaysets({
        limit: PAGE_LIMIT,
        offset,
        q: nextQuery,
        kind: nextKind,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      setAppliedQuery(nextQuery);
      setTotal(page.total);
      setUnavailable(false);
      setPlaysets((current) => {
        if (!append) return page.playsets;
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.playsets.filter((item) => !seen.has(item.id))];
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Could not load playsets right now. Please try again.",
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  // Debounce live search/filter queries after initial SSR hydration.
  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }
    const trimmed = queryInput.trim();
    const timer = window.setTimeout(() => {
      void runQuery(trimmed, kind, 0, false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [kind, queryInput]);

  useEffect(() => () => activeRequestRef.current?.abort(), []);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runQuery(queryInput.trim(), kind, 0, false);
  }

  function handleKindSelect(nextKind: KindFilter) {
    setKind(nextKind);
  }

  function handleClearSearch() {
    setQueryInput("");
  }

  function handleOpenUnlisted(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = unlistedId.trim();
    if (!trimmed) return;
    router.push(`/playsets/${encodeURIComponent(trimmed)}`);
  }

  const hasMore = playsets.length < total;
  const builtIn = playsets.filter(isBuiltIn);
  const community = playsets.filter((item) => !isBuiltIn(item));
  const showGrouped = kind === "all" && !appliedQuery && builtIn.length > 0;

  return (
    <div className="space-y-8">
      <section className="rounded-md border border-white/15 bg-[#1b1734]/80 p-4 sm:p-5">
        <search>
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label
                  htmlFor={searchInputId}
                  className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]"
                >
                  Search playsets
                </label>
                <div className="relative flex items-center">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 text-[var(--text-muted)]"
                    aria-hidden="true"
                  />
                  <input
                    id={searchInputId}
                    name="q"
                    type="search"
                    value={queryInput}
                    onChange={(event) => setQueryInput(event.target.value)}
                    placeholder="Title, description, or metric…"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    enterKeyHint="search"
                    className="min-h-12 w-full rounded-sm border border-white/25 bg-[#15122b] py-2.5 pl-10 pr-10 text-base text-white outline-none transition placeholder:text-white/35 focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/30"
                  />
                  {queryInput && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                      className="absolute right-2 grid size-8 place-items-center rounded-sm text-[var(--text-muted)] transition hover:text-white"
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-sm bg-[var(--accent-time-attack)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Search size={14} aria-hidden="true" />}
                Search
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter playset source">
                {KIND_OPTIONS.map((option) => {
                  const selected = kind === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => handleKindSelect(option.value)}
                      className={`min-h-10 rounded-sm border px-3.5 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                        selected
                          ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/15 text-white"
                          : "border-white/20 text-[var(--text-secondary)] hover:border-white/40 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <p role="status" aria-live="polite" className="text-xs text-[var(--text-muted)]">
                {loading
                  ? "Searching…"
                  : unavailable
                    ? "Catalog temporarily unavailable"
                    : `Showing ${playsets.length} of ${total} playset${total === 1 ? "" : "s"}`}
              </p>
            </div>
          </form>
        </search>

        <div className="mt-4 border-t border-white/10 pt-3">
          <button
            type="button"
            aria-expanded={unlistedOpen}
            onClick={() => setUnlistedOpen((open) => !open)}
            className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] transition hover:text-white"
          >
            {unlistedOpen ? "Hide unlisted ID" : "Have an unlisted playset ID?"}
          </button>
          {unlistedOpen && (
            <form
              onSubmit={handleOpenUnlisted}
              className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <label htmlFor={unlistedInputId} className="sr-only">
                  Unlisted playset ID
                </label>
                <input
                  id={unlistedInputId}
                  name="unlistedId"
                  type="text"
                  value={unlistedId}
                  onChange={(event) => setUnlistedId(event.target.value)}
                  placeholder="Paste published playset ID…"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="go"
                  className="min-h-11 w-full rounded-sm border border-white/20 bg-[#15122b] px-3.5 py-2 text-base text-white outline-none transition placeholder:text-white/35 focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/30"
                />
              </div>
              <button
                type="submit"
                disabled={!unlistedId.trim()}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm border border-white/35 px-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-[#15122b] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Open set
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </section>

      {errorMessage && (
        <div role="status" className="rounded-md border border-amber-300/30 bg-amber-200/10 p-4 text-center text-sm text-amber-100">
          {errorMessage}
        </div>
      )}

      {unavailable && playsets.length === 0 ? (
        <div className="rounded-md border border-amber-300/30 bg-amber-200/10 p-6 text-center text-sm text-amber-100">
          The game service is waking up. Please return shortly.
        </div>
      ) : playsets.length === 0 ? (
        <div className="rounded-md border border-white/15 bg-white/[0.03] p-8 text-center text-sm text-[var(--text-secondary)]">
          {appliedQuery || kind !== "all"
            ? "No public playsets matched your filter. Try a different keyword or filter."
            : "No playsets are available yet."}
        </div>
      ) : showGrouped ? (
        <div className="space-y-12">
          <section aria-labelledby="built-in-heading">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 id="built-in-heading" className="text-xl font-bold text-white">Built-in sets</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {builtIn.length} shown
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {builtIn.map((playset) => <PlaysetCard key={playset.id} playset={playset} showBadge={false} />)}
            </div>
          </section>
          <section aria-labelledby="community-heading">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 id="community-heading" className="text-xl font-bold text-white">Community sets</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {community.length} shown
              </p>
            </div>
            {community.length === 0 ? (
              <div className="rounded-md border border-white/15 bg-white/[0.03] p-8 text-center text-sm text-[var(--text-secondary)]">
                No public custom playsets on this page yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {community.map((playset) => <PlaysetCard key={playset.id} playset={playset} showBadge={false} />)}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {playsets.map((playset) => <PlaysetCard key={playset.id} playset={playset} />)}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={loadingMore || loading}
            onClick={() => void runQuery(appliedQuery, kind, playsets.length, true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-white/40 px-6 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-white hover:text-[#15122b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                Loading more…
              </>
            ) : (
              `Load more (${total - playsets.length} remaining)`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
