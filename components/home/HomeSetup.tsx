"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import type {
  ProductionCatalogProjection,
  PublicProductionCategory,
} from "@/lib/catalog/availability";
import type {
  PlayableModeId,
  SemanticDomainId,
} from "@/lib/catalog/semanticCatalog";
import CategorySelector from "@/components/home/CategorySelector";
import DomainSelector, {
  type DomainOption,
} from "@/components/home/DomainSelector";
import ModeButton, { type SelectableMode } from "@/components/ModeButton";
import HighScoresModal from "@/components/HighScoresModal";
import LaunchDock from "@/components/home/LaunchDock";
import AudioSurface from "@/components/audio/AudioSurface";
import { emitAtmosphere } from "@/lib/atmosphere/eventBus";
import {
  readHomeSelection,
  resolveHomeSelection,
  writeHomeSelection,
} from "@/lib/home/selection";

interface HomeSetupProps {
  catalog: ProductionCatalogProjection;
}

const MODES: readonly SelectableMode[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Survive as long as you can. No clock, just skill.",
  },
  {
    id: "time-attack",
    label: "Time Attack",
    description: "Race the clock. Every right answer buys more time.",
  },
];

/** Domain pre-selected on the initial visit so categories are visible immediately. */
const INITIAL_DOMAIN_ID: SemanticDomainId = "movies-series";

type AmbientHost = "none" | "hero" | "cta" | "both";

export default function HomeSetup({ catalog }: HomeSetupProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const setupRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const heroAnchorRef = useRef<HTMLAnchorElement>(null);
  const goButtonRef = useRef<HTMLButtonElement>(null);
  const [setupArrived, setSetupArrived] = useState(false);
  // Which ambient host is on screen. Starts as "hero" so the first viewport is
  // alive immediately; the observer corrects it as soon as it reports.
  const [ambient, setAmbient] = useState<AmbientHost>("hero");
  // Scroll-free Go dock: shown while `#setup` is on screen but the real `go!`
  // is not. Closed on the first frame, so it never competes with the hero.
  const [dockVisible, setDockVisible] = useState(false);
  // Software-keyboard heuristic (D6). False until `visualViewport` reports.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const initialDomain = catalog.domains.find((domain) => domain.id === INITIAL_DOMAIN_ID)
    ?? catalog.domains[0];
  const [selectedDomainId, setSelectedDomainId] = useState<SemanticDomainId | null>(
    () => initialDomain?.id ?? null,
  );
  const [selectedCategory, setSelectedCategory] =
    useState<PublicProductionCategory | null>(() =>
      initialDomain?.categories.find((category) => category.playable) ?? null,
    );
  const [selectedMode, setSelectedMode] = useState<PlayableModeId | null>(() => {
    const category = initialDomain?.categories.find((item) => item.playable);
    if (!category) return null;
    return category.compatibleModes.includes("classic")
      ? "classic"
      : category.compatibleModes[0] ?? null;
  });
  const [showScores, setShowScores] = useState(false);
  // False until the post-mount restore attempt has run, so the default triple
  // can never overwrite a valid stored selection on the first commit.
  const [selectionRestored, setSelectionRestored] = useState(false);

  // Single shared observer for both ambient hosts — no per-element observers,
  // no requestAnimationFrame. Offscreen hosts simply stay paused. Reduced motion
  // needs no branch here: the loops only exist inside `no-preference` CSS.
  useEffect(() => {
    const seen = new Map<Element, IntersectionObserverEntry>();
    // Explicit thresholds matter here. `#setup` starts with its top edge exactly
    // on the fold, which reports `isIntersecting: true` with ratio 0; with the
    // default `[0]` threshold that 0 → 1 growth never crosses a threshold and
    // the entry is never updated again, freezing the dock closed. A ladder of
    // thresholds guarantees a fresh entry as the section scrolls in.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          seen.set(entry.target, entry);
        }
        const isVisible = (element: Element | null) =>
          element ? seen.get(element)?.isIntersecting === true : false;
        const hero = isVisible(heroAnchorRef.current);
        const cta = isVisible(goButtonRef.current);
        const setupEntry = setupRef.current ? seen.get(setupRef.current) : undefined;
        // Geometric, viewport-relative "the setup region has taken over":
        // `#setup`'s top edge must have risen above the lower quarter of the
        // viewport. That excludes the hero viewport, where the section merely
        // touches the fold, and — unlike a ratio gate — it stays true once the
        // section scrolls past, so the mode-selector stretch between `#setup`
        // and the real `.go!` is covered instead of leaving the dock closed
        // with no launch affordance on screen.
        const viewportHeight = window.innerHeight
          || document.documentElement.clientHeight;
        const setupEngaged = setupEntry
          ? setupEntry.boundingClientRect.top < viewportHeight * 0.75
          : false;
        setAmbient(hero && cta ? "both" : hero ? "hero" : cta ? "cta" : "none");
        // One observer, one callback, two booleans: the dock exists exactly
        // while the setup region is in use and the real action is not on screen
        // (never two launch CTAs at once).
        setDockVisible(setupEngaged && !cta);
      },
      { threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] },
    );
    if (heroAnchorRef.current) observer.observe(heroAnchorRef.current);
    if (goButtonRef.current) observer.observe(goButtonRef.current);
    if (setupRef.current) observer.observe(setupRef.current);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  // D6: hide the dock while the software keyboard is open. One `resize`
  // listener, no rAF and no polling; removed on unmount.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const onViewportResize = () => {
      setKeyboardOpen(viewport.height < window.innerHeight * 0.75);
    };
    onViewportResize();
    viewport.addEventListener("resize", onViewportResize);
    return () => viewport.removeEventListener("resize", onViewportResize);
  }, []);

  // Restore the last valid Home selection once, after hydration. The read lives
  // in a passive effect, so the server markup and the first client render stay
  // on the catalog defaults and hydration cannot mismatch; one post-mount
  // correction is accepted (PD-5). A stale or un-promoted stored triple resolves
  // to `null` and the defaults above simply stand.
  //
  // `set-state-in-effect` is disabled for this block on purpose. This is the one
  // sanctioned external-store → React-state sync in the component: browser
  // storage is not readable during render without breaking hydration, and the
  // single follow-up render is the accepted restore frame, not a render loop.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const resolved = resolveHomeSelection(catalog, readHomeSelection());
    if (resolved) {
      setSelectedDomainId(resolved.domainId);
      setSelectedCategory(resolved.category);
      setSelectedMode(resolved.mode);
    }
    setSelectionRestored(true);
  }, [catalog]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist only after the restore attempt above, so the defaults can never
  // overwrite a valid stored selection on the first commit.
  useEffect(() => {
    if (!selectionRestored || !selectedDomainId || !selectedCategory || !selectedMode) return;
    writeHomeSelection({
      v: 1,
      domainId: selectedDomainId,
      categoryId: selectedCategory.id,
      mode: selectedMode,
    });
  }, [selectionRestored, selectedDomainId, selectedCategory, selectedMode]);

  // The field is baked from the mode that is actually selected. Every path that
  // can change it — a mode click, a domain switch, a category switch that
  // forces a reset — lands in this state, so one passive emit keeps the P0
  // horizon and the P2 tint aligned with what the form says.
  useEffect(() => {
    emitAtmosphere({ type: "mode", mode: selectedMode, surface: "home" });
  }, [selectedMode]);

  const domains = useMemo<DomainOption[]>(
    () =>
      catalog.domains.map((domain) => ({
        id: domain.id,
        label: domain.label,
        description: domain.description,
        categoryCount: domain.categories.length,
      })),
    [catalog.domains],
  );

  const activeDomain = catalog.domains.find(
    (domain) => domain.id === selectedDomainId,
  );
  const canPlay = Boolean(
    selectedCategory &&
    selectedCategory.playable &&
    selectedMode &&
    selectedCategory.compatibleModes.includes(selectedMode),
  );

  function selectDomain(domainId: SemanticDomainId) {
    const nextDomain = catalog.domains.find((domain) => domain.id === domainId);
    const nextCategory = nextDomain?.categories.find((category) => category.playable) ?? null;
    setSelectedDomainId(domainId);
    setSelectedCategory(nextCategory);
    if (!nextCategory || (selectedMode && !nextCategory.compatibleModes.includes(selectedMode))) {
      setSelectedMode(
        nextCategory?.compatibleModes.includes("classic")
          ? "classic"
          : nextCategory?.compatibleModes[0] ?? null,
      );
    }
  }

  function selectCategory(category: PublicProductionCategory) {
    setSelectedCategory(category);
    if (!selectedMode || !category.compatibleModes.includes(selectedMode)) {
      setSelectedMode(
        category.compatibleModes.includes("classic")
          ? "classic"
          : category.compatibleModes[0] ?? null,
      );
    }
  }

  function startGame() {
    if (!canPlay || !selectedCategory || !selectedMode) return;
    emitAtmosphere({
      type: "route",
      from: "home",
      to: "gameplay",
      mode: selectedMode === "time-attack" ? "time-attack" : "classic",
      intent: "forward",
    });
    router.push(
      `/game/${selectedMode}?category=${encodeURIComponent(selectedCategory.id)}`,
      { transitionTypes: ["nav-forward"] },
    );
  }

  // SSR-stable: the server and the client render the same `initial`/`animate`,
  // so the inline `opacity`/`transform` the hero children get match on both
  // sides. Reduced motion is handled entirely in CSS (the `[data-atmo-safe="hero"]`
  // rule in globals.css forces the settled state), never by branching render
  // output on `useReducedMotion()` — that branch was the hydration mismatch.
  const heroEntrance = { initial: "hidden" as const, animate: "visible" as const };
  const heroVariants = {
    hidden: {},
    visible: {
      transition: {
        when: "beforeChildren" as const,
        staggerChildren: 0.06,
      },
    },
  };
  const heroChildVariants = {
    hidden: { opacity: 0, transform: "translateY(8px)" },
    visible: {
      opacity: 1,
      transform: "translateY(0px)",
      transition: { duration: prefersReducedMotion ? 0.01 : 0.24, ease: [0.23, 1, 0.32, 1] as const },
    },
  };

  return (
    <main
      data-ambient={ambient}
      className="relative isolate flex min-h-dvh flex-col overflow-x-clip bg-grid px-[var(--space-page)]"
    >
      <header className="absolute right-[var(--space-page)] top-5 z-10 flex items-center gap-2">
        <AudioSurface variant="home" />
        <Link
          href="/studio"
          className="inline-flex min-h-11 items-center gap-2 border border-transparent px-3 text-xs text-[var(--foreground-muted)] transition-colors hover:bg-white/10 hover:text-white focus-visible:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <span>Create</span>
        </Link>
        <Link
          href="/playsets"
          className="inline-flex min-h-11 items-center gap-2 border border-transparent px-3 text-xs text-[var(--foreground-muted)] transition-colors hover:bg-white/10 hover:text-white focus-visible:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <span>Custom sets</span>
        </Link>
        <Link
          href="/multiplayer"
          className="inline-flex min-h-11 items-center gap-2 border border-transparent px-3 text-xs text-[var(--foreground-muted)] transition-colors hover:bg-white/10 hover:text-white focus-visible:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <span className="size-1.5 rounded-full bg-[var(--accent-highlight)]" aria-hidden="true" />
          <span>Multiplayer</span>
        </Link>
        <button
          ref={openerRef}
          type="button"
          onClick={() => setShowScores(true)}
          aria-label="View High Scores"
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-transparent px-3 text-xs text-[var(--foreground-muted)] transition-colors hover:bg-white/10 hover:text-white active:bg-white/15 focus-visible:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <Trophy size={17} aria-hidden="true" />
          <span>High Scores</span>
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-[92rem] flex-col">
        {/* Hero — full-screen on load; setup remains a separate long-form section. */}
        <section className="flex min-h-dvh flex-col justify-center pt-24 pb-16 sm:pt-28 sm:pb-24">
          <motion.div
            data-atmo-safe="hero"
            className="flex flex-col items-center"
            variants={heroVariants}
            {...heroEntrance}
          >
            <motion.h1
              aria-label="Higher or lower?"
              className="font-bold leading-[0.92] tracking-[-0.09em] text-[clamp(3.5rem,11.5vw,9.5rem)]"
              variants={heroChildVariants}
            >
              <span className="block md:whitespace-nowrap">
                <span className="text-[var(--foreground-inverse)] [-webkit-text-stroke:2px_var(--border-strong)] [text-shadow:var(--hero-shadow-offset)_var(--hero-shadow-offset)_0_var(--accent-time-attack)]">higher</span><wbr />
                <span className="mx-[0.12em] text-[var(--foreground-inverse)] [-webkit-text-stroke:2px_var(--border-strong)] [text-shadow:var(--hero-shadow-offset)_var(--hero-shadow-offset)_0_var(--accent-action-higher)]">or</span><wbr />
                <span className="text-[var(--foreground-inverse)] [-webkit-text-stroke:2px_var(--border-strong)] [text-shadow:var(--hero-shadow-offset)_var(--hero-shadow-offset)_0_var(--accent-classic)]">lower?</span>
              </span>
            </motion.h1>
            <motion.p
              className="mt-4 w-full max-w-xs self-end text-right text-xs leading-relaxed text-[var(--foreground-muted)] sm:text-sm"
              variants={heroChildVariants}
            >
              the comparison game for students
              <br />
              {domains.length} domains, {domains.reduce((sum, domain) => sum + domain.categoryCount, 0)} categories, free
            </motion.p>
            <motion.a
              ref={heroAnchorRef}
              href="#setup"
              onClick={(event) => {
                event.preventDefault();
                setSetupArrived(true);
                setupRef.current?.scrollIntoView({
                  behavior: prefersReducedMotion ? "instant" : "smooth",
                  block: "start",
                });
              }}
              aria-label="Start Comparing"
              className="group mt-8 inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--accent-time-attack)]/70 bg-[var(--accent-time-attack)]/10 px-5 py-2 text-sm font-bold text-white transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-[var(--accent-time-attack)] hover:bg-[var(--accent-time-attack)]/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]"
              variants={heroChildVariants}
            >
              <span>Start Comparing</span>
              <ArrowDown
                aria-hidden="true"
                size={16}
                className="ambient-chevron transition-transform duration-150 ease-out group-hover:translate-y-2"
              />
            </motion.a>
          </motion.div>
        </section>

        <section
          aria-labelledby="mode-selector-heading"
          className="pt-[var(--space-section-tight)]"
        >
          <h2
            id="mode-selector-heading"
            className="font-bold text-4xl sm:text-5xl mb-8"
          >
            How do you want to play?
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.map((mode) => {
              const compatible =
                !selectedCategory || selectedCategory.compatibleModes.includes(mode.id);
              return (
                <ModeButton
                  key={mode.id}
                  mode={mode}
                  selected={selectedMode === mode.id}
                  disabled={!compatible}
                  onSelect={() => setSelectedMode(mode.id)}
                />
              );
            })}
            <Link
              href="/multiplayer"
              className="group relative grid min-h-28 w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-2 p-3 text-left transition-transform duration-[140ms] ease-out hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)] sm:min-h-32 sm:p-4"
            >
              <span
                aria-hidden="true"
                className="col-start-1 row-start-1 flex size-4 shrink-0 items-center justify-center self-center rounded-full border-2 border-white transition-colors duration-[140ms] group-hover:border-[var(--accent-classic)]"
              />
              <span className="col-start-2 row-start-1 text-2xl font-bold leading-tight text-white transition-[text-shadow] sm:text-4xl group-hover:[text-shadow:3px_3px_0_var(--accent-classic)] group-focus-visible:[text-shadow:2px_2px_0_var(--accent-classic)]">
                Multiplayer
              </span>
              <span className="col-start-2 row-start-2 text-sm leading-relaxed text-[var(--foreground-muted)] sm:text-base">
                Create a room or join a match with friends.
              </span>
            </Link>
          </div>
        </section>

        {/* Setup — the only explicit in-page navigation destination. */}
        <div ref={setupRef} id="setup" className="scroll-mt-4">
          <motion.div
            initial={false}
            animate={setupArrived && !prefersReducedMotion
              ? { opacity: [0.88, 1], transform: ["translateY(6px)", "translateY(0px)"] }
              : { opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <DomainSelector
              domains={domains}
              selectedDomainId={selectedDomainId}
              onSelect={selectDomain}
            />
          </motion.div>

          <CategorySelector
            categories={activeDomain?.categories ?? []}
            selectedCategoryId={selectedCategory?.id ?? null}
            onSelect={selectCategory}
          />
        </div>


        <section
          aria-labelledby="ready-heading"
          className="flex flex-col items-center gap-4 pt-[clamp(2.5rem,6vw,5rem)] pb-24 text-center sm:pb-32"
        >
          <h2 id="ready-heading" className="text-4xl font-bold sm:text-5xl">
            Ready?
          </h2>
          <button
            ref={goButtonRef}
            type="button"
            onClick={startGame}
            disabled={!canPlay}
            className="home-go relative isolate grid size-36 cursor-pointer place-items-center rounded-full bg-[var(--accent-time-attack)] text-2xl font-bold text-[#121212] transition-[background-color,transform,border-color] duration-150 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)] sm:size-44 sm:text-3xl"
          >
            <span
              aria-hidden="true"
              className="home-go-offset ambient-go-offset absolute -bottom-2 -right-2 -z-10 size-full rounded-full bg-[#838cf3] transition-transform duration-150 ease-out"
            />
            <span className="relative z-10">go!</span>
          </button>
          {!canPlay && (
            <p className="max-w-sm text-xs text-[var(--foreground-muted)]">
              {domains.length === 0
                ? "Comparison categories are temporarily unavailable while their data sources are being verified."
                : "Select an available category and game mode to play. Categories marked Unavailable are not playable yet."}
            </p>
          )}
        </section>
      </div>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] py-4 text-[0.65rem] text-[var(--foreground-muted)]">
        <span>© {new Date().getFullYear()} Higher or Lower</span>
        <span>More categories coming soon</span>
      </footer>

      <LaunchDock
        visible={dockVisible}
        keyboardOpen={keyboardOpen}
        categoryLabel={selectedCategory?.label ?? "Select a category"}
        modeLabel={MODES.find((mode) => mode.id === selectedMode)?.label ?? "No mode"}
        canPlay={canPlay}
        onLaunch={startGame}
      />

      <HighScoresModal
        open={showScores}
        onClose={() => setShowScores(false)}
        openerRef={openerRef}
      />
    </main>
  );
}
