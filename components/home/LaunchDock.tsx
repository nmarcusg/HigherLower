"use client";

/**
 * Scroll-free Go dock (D1) — a compact, fixed summary of the current selection
 * plus the launch action, shown only while the real `go!` is off screen.
 *
 * Presentational only: no observer, no timer, no router, no atmosphere emits.
 * `HomeSetup` owns visibility and wires `onLaunch` to the *same* `startGame()`
 * the main control uses, so the launch path (route emit, `launch` SFX, warp
 * impulse, `nav-forward` transition) is byte-identical.
 *
 * The button carries `data-atmo-go`, which the delegation classifier resolves
 * to `target: "go"`. Its accessible name deliberately avoids "Start Comparing"
 * (that label classifies as `target: "start"`).
 */

interface LaunchDockProps {
  visible: boolean;
  keyboardOpen: boolean;
  categoryLabel: string;
  modeLabel: string;
  canPlay: boolean;
  onLaunch: () => void;
}

export default function LaunchDock({
  visible,
  keyboardOpen,
  categoryLabel,
  modeLabel,
  canPlay,
  onLaunch,
}: LaunchDockProps) {
  // `visible` drives the fade; `shown` is the state the control is actually
  // usable in. `inert` lands on the same commit that starts the fade, so the
  // closed dock is unreachable by pointer, keyboard and assistive tech
  // immediately — not 180 ms later, when the CSS `visibility` delay elapses.
  const shown = visible && !keyboardOpen;
  return (
    <div
      className="launch-dock"
      data-open={visible ? "true" : "false"}
      data-keyboard={keyboardOpen ? "open" : "closed"}
      aria-hidden={shown ? undefined : true}
      inert={!shown}
    >
      <div className="launch-dock-face">
        <p className="launch-dock-context">
          {categoryLabel}
          <span className="launch-dock-mode"> · {modeLabel}</span>
        </p>
        <button
          type="button"
          onClick={onLaunch}
          disabled={!canPlay}
          data-atmo-go
          aria-label={
            canPlay
              ? `Go! Start ${categoryLabel} on ${modeLabel}`
              : "Go! Select a playable category and mode first"
          }
          className="launch-dock-go"
        >
          GO!
        </button>
      </div>
    </div>
  );
}
