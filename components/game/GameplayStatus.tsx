export type IntensityTier = 0 | 1 | 2 | 3 | 4;

interface GameplayStatusProps {
  value: string | number;
  label: string;
  /**
   * Opt-in tally acknowledgement. Default `false` so the Time Attack countdown
   * (which re-renders every second) never bumps.
   */
  bump?: boolean;
  /** Display-only intensity rung; picks the tally beat and the streak accents. */
  tier?: IntensityTier;
  progress?: {
    value: number;
    max: number;
    label?: string;
  };
  className?: string;
}

/** Compact, presentational score/timer metric for a mode-owned header. */
export default function GameplayStatus({
  value,
  label,
  bump = false,
  tier = 0,
  progress,
  className = "",
}: GameplayStatusProps) {
  const progressValue = progress
    ? Math.min(Math.max(progress.value, 0), progress.max)
    : 0;
  const progressPercent = progress?.max
    ? (progressValue / progress.max) * 100
    : 0;

  // A value-derived key restarts the tally animation on every change.
  const tallyKey = bump ? `${label}:${value}` : undefined;
  const tallyClass = bump
    ? tier >= 4
      ? "tier-stamp"
      : "tally-bump"
    : "";
  const showAccents = tier >= 3;

  return (
    <div className={`grid justify-items-center gap-1 text-center ${className}`}>
      <p
        key={tallyKey}
        className={`relative text-base font-bold leading-none text-[var(--accent-highlight)] sm:text-xl ${tallyClass}`}
      >
        {value}
        {showAccents && (
          <span
            aria-hidden="true"
            data-streak-ring=""
            className="pulse-ring-once pointer-events-none absolute inset-0 rounded-full border-2 border-[var(--accent-highlight)]"
          />
        )}
        {showAccents && (
          <span
            aria-hidden="true"
            data-streak-line=""
            className="pointer-events-none absolute inset-x-2 -bottom-1 h-0.5 bg-[var(--accent-highlight)]"
          />
        )}
      </p>
      <p className="text-[0.55rem] uppercase tracking-[0.16em] text-[var(--foreground-muted)] sm:text-[0.65rem]">
        {label}
      </p>
      {progress && (
        <div
          role="progressbar"
          aria-label={progress.label ?? label}
          aria-valuemin={0}
          aria-valuemax={progress.max}
          aria-valuenow={progressValue}
          className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-white sm:w-32"
        >
          <div
            className="h-full bg-[var(--status-success)] transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
