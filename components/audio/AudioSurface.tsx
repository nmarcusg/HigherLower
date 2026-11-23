"use client";

/**
 * AudioSurface — the 44×44 audio control plus its popover.
 *
 * Two mounts, one component:
 *  - `variant="home"` in the Home header row — the only visible audio control
 *    anywhere in the app;
 *  - no `variant` in the root layout, where it renders nothing and acts as the
 *    headless owner of the engine wiring, the `data-audio-*` writer and the
 *    first-gesture unlock — so the engine survives route changes with the
 *    layout and gameplay carries no audio chrome of its own.
 *
 * The Home control is an icon-only ghost button in the same language as the
 * `View High Scores` button beside it: transparent face, no offset shadow,
 * square hover/active wash. State reads from the glyph (`Volume2`/`VolumeX`)
 * and the dimmed `sfx-off` colour, not from chrome.
 *
 * State comes from `useSyncExternalStore` with a server snapshot equal to the
 * defaults, so the glyph cannot flip during hydration and no `data-*` attribute
 * exists in server markup.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Volume2, VolumeX } from "lucide-react";
import { emitAtmosphere } from "@/lib/atmosphere/eventBus";
import { rectOf } from "@/lib/atmosphere/delegation";
import {
  applySettings,
  getAudioStateSnapshot,
  isAudioSupported,
  playCue,
  startAudioEngine,
  subscribeAudioState,
  type AudioState,
} from "@/lib/audio/audioEngine";
import {
  getAudioSettingsSnapshot,
  getServerAudioSettingsSnapshot,
  isAudioMuted,
  resolveTicks,
  subscribeAudioSettings,
  updateAudioSettings,
} from "@/lib/audio/settings";

export interface AudioSurfaceProps {
  /** Omit entirely for the headless layout instance. */
  variant?: "home";
}

/** Two switches under the one-click master: SFX and Interface ticks. */
const ROWS = 2;

/** Space kept between the popover and the viewport edge, in px. */
const POPOVER_INSET = 8;

/** A stable store for client-only capability facts (no subscribe events). */
const subscribeNoop = () => () => {};

function subscribePointerType(callback: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia("(hover: hover) and (pointer: fine)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getFinePointer(): boolean {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

const getServerFinePointer = () => true;
const getServerSupported = () => true;

export default function AudioSurface({ variant }: AudioSurfaceProps) {
  const settings = useSyncExternalStore(
    subscribeAudioSettings,
    getAudioSettingsSnapshot,
    getServerAudioSettingsSnapshot,
  );
  const audioState = useSyncExternalStore(
    subscribeAudioState,
    getAudioStateSnapshot,
    () => "armed" as AudioState,
  );
  const popoverId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(0);

  // Client-only capability facts. The server snapshot is the same boolean the
  // server markup assumed, so hydration cannot flip the control.
  const supported = useSyncExternalStore(
    subscribeNoop,
    isAudioSupported,
    getServerSupported,
  );
  const finePointer = useSyncExternalStore(
    subscribePointerType,
    getFinePointer,
    getServerFinePointer,
  );
  const coarsePointer = !finePointer;

  const muted = isAudioMuted(settings);
  const ticksEffective = resolveTicks(settings);

  // ── Engine wiring (idempotent across every mount) ─────────────────────────
  useEffect(() => startAudioEngine(), []);

  // `data-audio-*` — written only on a real settings or lifecycle change.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-audio-sfx", settings.sfx && !settings.muted ? "on" : "off");
    root.setAttribute("data-audio-state", audioState);
  }, [settings.sfx, settings.muted, audioState]);

  // ── Popover dismissal ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const raw = event.target;
      if (raw instanceof Node && wrapperRef.current?.contains(raw)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // `preventScroll` keeps focus from scrolling an ancestor scroll container
    // (the Home page column is `overflow-x-clip`), which would otherwise shift
    // the trigger away from the panel positioned against the viewport.
    rowRefs.current[0]?.focus({ preventScroll: true });
  }, [open]);

  /**
   * Position the panel against the viewport with `position: fixed`, so it
   * escapes any ancestor `overflow` clipping, can never shift layout, and
   * always lands fully on screen.
   *
   * It opens just below the control's parent row (the Home header), so it never
   * covers the content beside it, then flips above only when the viewport
   * bottom leaves no room. Horizontal alignment is right-aligned to the control
   * and clamped inside the viewport. Runs from the panel's ref callback (commit
   * phase, before paint) and again on resize or scroll while open.
   */
  const positionPopover = useCallback(() => {
    const panel = popoverRef.current;
    const button = buttonRef.current;
    if (!panel || !button) return;
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = button.getBoundingClientRect();
    // The row that owns the control (the Home header) — clear its bottom edge
    // so the panel never overlaps the row it belongs to.
    const cluster = wrapperRef.current?.parentElement?.getBoundingClientRect() ?? rect;
    const panelW = panel.offsetWidth;
    const panelH = panel.offsetHeight;

    // Horizontal: right-align to the control, then clamp fully in viewport.
    const maxLeft = Math.max(POPOVER_INSET, vw - panelW - POPOVER_INSET);
    const left = Math.min(Math.max(rect.right - panelW, POPOVER_INSET), maxLeft);

    // Vertical: below the cluster by default; flip above only if no room below.
    let top = Math.max(rect.bottom, cluster.bottom) + gap;
    if (top + panelH > vh - POPOVER_INSET) {
      const above = Math.min(rect.top, cluster.top) - gap - panelH;
      top = above >= POPOVER_INSET ? above : Math.max(POPOVER_INSET, vh - panelH - POPOVER_INSET);
    }

    panel.style.position = "fixed";
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }, []);

  useEffect(() => {
    if (!open) return;
    positionPopover();
    window.addEventListener("resize", positionPopover);
    // Capture-phase scroll so nested scroll containers reposition the panel too.
    window.addEventListener("scroll", positionPopover, true);
    return () => {
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
    };
  }, [open, positionPopover]);

  const announce = useCallback(() => {
    const next = getAudioSettingsSnapshot();
    emitAtmosphere({
      type: "audio",
      sfx: next.sfx && !next.muted,
      ticks: resolveTicks(next),
    });
  }, []);

  const toggleMaster = useCallback(() => {
    if (isAudioMuted(getAudioSettingsSnapshot())) {
      updateAudioSettings({ muted: false, sfx: true });
      applySettings();
      playCue("audio-on");
    } else {
      updateAudioSettings({ muted: true });
      applySettings();
      // Muting is silent by design; only the visual `ack` confirms.
    }
    announce();
    const rect = rectOf(buttonRef.current);
    emitAtmosphere({
      type: "pointer",
      cue: "audio",
      target: "audio",
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      source: "pointer",
    });
  }, [announce]);

  const toggleSfx = useCallback(() => {
    const next = !getAudioSettingsSnapshot().sfx;
    updateAudioSettings({ sfx: next, muted: false });
    applySettings();
    if (next) playCue("select");
    announce();
  }, [announce]);

  const toggleTicks = useCallback(() => {
    const next = !resolveTicks(getAudioSettingsSnapshot());
    updateAudioSettings({ ticks: next });
    if (next) playCue("hover-tick");
    announce();
  }, [announce]);

  const onButtonKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveRow(0);
      setOpen(true);
    }
  }, []);

  const onPopoverKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus({ preventScroll: true });
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const next = (activeRow + delta + ROWS) % ROWS;
        setActiveRow(next);
        rowRefs.current[next]?.focus({ preventScroll: true });
      }
    },
    [activeRow],
  );

  if (!variant) return null;

  const label = muted ? "Sound off — unmute all audio" : "Sound on — mute all audio";
  const rows: Array<{ id: string; name: string; checked: boolean; onToggle: () => void }> = [
    { id: "sfx", name: "SFX", checked: settings.sfx && !settings.muted, onToggle: toggleSfx },
    {
      id: "ticks",
      name: `Interface ticks${coarsePointer && settings.ticks === "auto" ? " · touch" : ""}`,
      checked: ticksEffective,
      onToggle: toggleTicks,
    },
  ];

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        data-audio-control
        type="button"
        aria-label={label}
        aria-pressed={muted}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-disabled={!supported}
        disabled={!supported}
        onClick={toggleMaster}
        onKeyDown={onButtonKeyDown}
        className="audio-surface relative inline-flex h-11 w-11 cursor-pointer items-center justify-center border border-transparent bg-transparent transition-colors hover:bg-white/10 active:bg-white/15 focus-visible:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {muted ? (
          <VolumeX aria-hidden="true" size={18} strokeWidth={2} />
        ) : (
          <Volume2 aria-hidden="true" size={18} strokeWidth={2} />
        )}
      </button>

      {open && (
        <div
          ref={(node) => {
            popoverRef.current = node;
            if (node) positionPopover();
          }}
          id={popoverId}
          role="group"
          aria-label="Audio settings"
          onKeyDown={onPopoverKeyDown}
          className="audio-surface-popover fixed z-50 w-60 border-2 border-white bg-[var(--surface-background)] p-2 shadow-[6px_6px_0_var(--accent-classic)]"
        >
          {rows.map((row, index) => (
            <button
              key={row.id}
              ref={(node) => {
                rowRefs.current[index] = node;
              }}
              data-audio-control
              data-audio-row={row.id}
              type="button"
              role="switch"
              aria-checked={row.checked}
              onClick={row.onToggle}
              className="audio-row flex min-h-11 w-full items-center justify-between gap-3 px-2 text-left text-xs uppercase tracking-[0.12em] text-[var(--foreground-muted)] transition-colors hover:text-white"
            >
              <span>{row.name}</span>
              <span aria-hidden="true" className="font-bold text-[var(--foreground-primary)]">
                {row.checked ? "On" : "Off"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
