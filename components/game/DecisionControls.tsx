"use client";

import { useId } from "react";

interface DecisionControlsProps {
  onHigher: () => void;
  onLower: () => void;
  disabled?: boolean;
  higherLabel?: string;
  lowerLabel?: string;
  className?: string;
}

/**
 * Accessible decision buttons; callers own decision state and game transitions.
 *
 * Higher and Lower are stacked vertically (Higher above Lower) as a matched
 * pair of broad pill controls, centered beneath the next-item prompt.
 *
 * Hover lift and press settle come from the `.decision-lift` utility, which
 * gates hover behind `(hover: hover) and (pointer: fine)` so a touch tap never
 * leaves a stuck hover state, and drives press on the tap duration token.
 */
export default function DecisionControls({
  onHigher,
  onLower,
  disabled = false,
  higherLabel = "Higher",
  lowerLabel = "Lower",
  className = "",
}: DecisionControlsProps) {
  const hintId = useId();
  const sharedClassName =
    "decision-lift flex min-h-[3.375rem] w-full items-center justify-center gap-2 rounded-full border-2 border-white px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 sm:text-base";

  return (
    <div className={`flex w-full justify-center ${className}`}>
      <div className="flex w-full max-w-[17.6875rem] flex-col items-stretch gap-3">
        <button
          type="button"
          onClick={onHigher}
          disabled={disabled}
          aria-label={higherLabel}
          aria-keyshortcuts="ArrowUp H"
          aria-describedby={hintId}
          className={`${sharedClassName} bg-[var(--accent-action-higher)] text-[#15122b] shadow-[5px_5px_0_#ffffff]`}
        >
          <span aria-hidden="true">↑</span> {higherLabel}
        </button>
        <button
          type="button"
          onClick={onLower}
          disabled={disabled}
          aria-label={lowerLabel}
          aria-keyshortcuts="ArrowDown L"
          aria-describedby={hintId}
          className={`${sharedClassName} bg-[var(--accent-action-lower)] text-[#15122b] shadow-[5px_5px_0_#ffffff]`}
        >
          <span aria-hidden="true">↓</span> {lowerLabel}
        </button>
        <p
          id={hintId}
          className="text-center text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-muted)]"
        >
          Keys: ↑ {higherLabel} · ↓ {lowerLabel}
        </p>
      </div>
    </div>
  );
}
