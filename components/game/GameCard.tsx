"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { GameItem } from "@/types/api";
import type { GameplayMode } from "@/components/game/GameplayShell";

interface GameCardProps {
  item: GameItem;
  revealed: boolean;
  side: "current" | "next";
  resultTint?: "correct" | "incorrect" | null;
  /** Optional legacy action slot; decision behavior remains caller-owned. */
  children?: ReactNode;
  mode?: GameplayMode;
  /**
   * Enables the in-round card handoff enter. Callers pass `true` only from the
   * second round onward, so the first paint of the board never animates.
   */
  enterHandoff?: boolean;
  /** Handoff stagger offset, in seconds. */
  enterDelay?: number;
}

const MODE_ACCENTS: Record<GameplayMode, string> = {
  classic: "var(--accent-classic)",
  "time-attack": "var(--accent-time-attack)",
};

/**
 * Comparison card. The image is a near-square panel; the CURRENT / NEXT UP
 * label and the item metadata live *outside* the image, below it, as part of
 * the page layout rather than as an image overlay.
 *
 * Motion is enter-only: the card handoff plays when the deck advances, the
 * value lands after the plate has reacted, and the tint/border flip is stepped.
 * Nothing here is hidden by default, so a JS failure leaves the card readable.
 */
export default function GameCard({
  item,
  revealed,
  side,
  resultTint,
  children,
  mode = "classic",
  enterHandoff = false,
  enterDelay = 0,
}: GameCardProps) {
  const [imageError, setImageError] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const showValue = side === "current" || revealed;

  // The incoming current card settles downward, the incoming next card rises.
  const handoffOffset = side === "current" ? -10 : 10;
  // Only the next card's value arrives after a reveal; the current card's value
  // is already on screen from the moment it mounts.
  const animateValueLand = side === "next" && revealed;

  return (
    <motion.article
      aria-label={`${side === "current" ? "Current" : "Next"}: ${item.name}`}
      className="flex w-full max-w-[27rem] min-w-0 flex-col items-center"
      data-result={resultTint ?? undefined}
      style={{ "--card-accent": MODE_ACCENTS[mode] } as React.CSSProperties}
      initial={
        enterHandoff
          ? { opacity: 0, y: prefersReducedMotion ? 0 : handoffOffset }
          : false
      }
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0.14 : 0.24,
        ease: [0.77, 0, 0.175, 1],
        delay: enterHandoff ? enterDelay : 0,
      }}
    >
      {/* External label — part of the page layout, above the image. */}
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
        {side === "current" ? "Current" : "Next up"}
      </p>

      {/* Near-square image panel with offset accent backing. */}
      <div className="relative w-full">
        <div
          aria-hidden="true"
          className="game-card-plate absolute inset-0 translate-x-2 translate-y-2 rounded-[2.25rem] bg-[var(--card-accent)]"
        />
        <div className="game-card-face relative aspect-square w-full overflow-hidden rounded-[2.25rem] border-4 border-white bg-[var(--surface-raised)] shadow-[0_9px_0_var(--card-accent)]">
          {!imageError && item.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover object-center"
              loading="eager"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              role="img"
              aria-label={`${item.name} image unavailable`}
              className="flex h-full w-full items-center justify-center bg-[var(--surface-raised)] text-5xl text-white/50"
            >
              ?
            </div>
          )}

          {resultTint && (
            <div
              aria-hidden="true"
              className={`tint-step absolute inset-0 z-10 ${resultTint === "correct" ? "bg-[var(--status-success)]/25" : "bg-[var(--status-error)]/25"}`}
            />
          )}

          {resultTint && (
            <div
              aria-hidden="true"
              className={`tint-step pointer-events-none absolute inset-0 z-30 border-4 ${resultTint === "correct" ? "border-[var(--status-success)]" : "border-[var(--status-error)]"}`}
            />
          )}
        </div>
      </div>

      {/* Metadata — below the image, not overlaid. */}
      <div className="mt-5 flex w-full flex-col items-center px-2 text-center">
        <h2 className="max-w-full break-words text-balance text-base font-bold uppercase leading-tight text-white sm:text-2xl">
          {item.name}
        </h2>
        <div aria-live="polite" className="mt-3">
          {showValue ? (
            <p
              className={`break-words text-lg font-bold text-[var(--accent-highlight)] sm:text-3xl ${
                animateValueLand ? "value-land" : ""
              }`}
            >
              {item.displayValue}
            </p>
          ) : (
            <p className="text-sm uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Higher or lower?
            </p>
          )}
        </div>
        {/* Image credit — shown only when the image's license requires it. */}
        {item.attribution && (
          <p className="mt-2 max-w-full break-words text-[0.65rem] leading-snug text-[var(--text-secondary)]">
            Image: {item.attribution}
          </p>
        )}
        {children && (
          <div className="mt-5 hidden w-full max-w-xs flex-col gap-3 md:flex">
            {children}
          </div>
        )}
      </div>
    </motion.article>
  );
}
