"use client";

/**
 * AtmosphereBackdrop — the only canvas client component.
 *
 * Owns exactly one engine instance, the delegation listeners, the
 * `usePathname()`-driven surface/mode detection and the `data-*` writer on
 * `<html>`. It renders an empty canvas on the server and writes nothing until
 * its effect runs, so there is no pre-hydration flicker and no hydration
 * mismatch.
 *
 * Mounted from the root layout, which Next caches across navigation — so the
 * canvas node and the draw loop survive Home → gameplay without a remount.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  createAtmosphereEngine,
  type AtmosphereEngine,
} from "@/lib/atmosphere/canvasEngine";
import { attachAtmosphereDelegation } from "@/lib/atmosphere/delegation";
import { subscribeAtmosphere } from "@/lib/atmosphere/eventBus";
import type { AtmosphereEvent, GameplayModeId, SurfaceId } from "@/lib/atmosphere/types";

interface SurfaceResolution {
  surface: SurfaceId;
  mode: GameplayModeId | null;
}

function resolveSurface(pathname: string): SurfaceResolution {
  if (pathname.startsWith("/game/time-attack")) {
    return { surface: "gameplay", mode: "time-attack" };
  }
  if (pathname.startsWith("/game/classic")) {
    return { surface: "gameplay", mode: "classic" };
  }
  if (pathname.startsWith("/game")) {
    return { surface: "gameplay", mode: null };
  }
  return { surface: "home", mode: null };
}

const BOARD_SELECTOR = 'section[aria-label="Higher or lower comparison"]';

/**
 * The mode the setup form already has selected. Home preselects Classic, so the
 * field must be baked from that — not from an unresolved `null` — before the
 * engine's first paint. Client-only: read inside effects, never during render,
 * so the server markup is untouched and hydration cannot mismatch.
 */
function readPresetMode(): GameplayModeId | null {
  const el = document.querySelector<HTMLInputElement>('input[name="playable-mode"]:checked');
  const value = el?.value;
  return value === "time-attack" ? "time-attack" : value === "classic" ? "classic" : null;
}

export default function AtmosphereBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AtmosphereEngine | null>(null);
  const surfaceRef = useRef<SurfaceResolution>({ surface: "home", mode: null });
  const pathname = usePathname();
  const resolved = resolveSurface(pathname ?? "/");
  const surface = resolved.surface;
  const mode = resolved.mode;

  // ── Mount once: engine + delegation + bus + scroll ────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const root = document.documentElement;

    const created = createAtmosphereEngine(canvas);
    engineRef.current = created;

    if (!created) {
      // No 2D context (or an unsupported engine): leave the page untouched.
      root.setAttribute("data-atmosphere", "off");
      return () => {
        root.removeAttribute("data-atmosphere");
        engineRef.current = null;
      };
    }

    const engine: AtmosphereEngine = created;

    root.setAttribute("data-atmosphere", "on");
    // Sync to the real preset *before* the first paint, so frame one is already
    // the active mode's accent.
    if (surfaceRef.current.surface === "home") {
      surfaceRef.current = { surface: "home", mode: readPresetMode() };
    }
    engine.setSurface(surfaceRef.current.surface, surfaceRef.current.mode);
    engine.start();

    const detachDelegation = attachAtmosphereDelegation();

    const unsubscribe = subscribeAtmosphere((event: AtmosphereEvent) => {
      switch (event.type) {
        case "pointer": {
          if (event.cue === "mode" && event.target.startsWith("mode-")) {
            const next = event.target.slice(5) as GameplayModeId;
            surfaceRef.current = { ...surfaceRef.current, mode: next };
            engine.setSurface(surfaceRef.current.surface, next);
            if (surfaceRef.current.surface === "home") {
              root.setAttribute("data-mode", next);
            }
          }
          break;
        }
        case "mode": {
          // The Home surface's real selection, including domain/category resets.
          surfaceRef.current = { surface: event.surface, mode: event.mode };
          engine.setSurface(event.surface, event.mode);
          if (event.surface === "home") {
            if (event.mode) root.setAttribute("data-mode", event.mode);
            else root.removeAttribute("data-mode");
          }
          break;
        }
        case "phase": {
          const previousPhase = root.getAttribute("data-phase");
          root.setAttribute("data-phase", event.phase);
          if (event.phase === "playing") {
            root.setAttribute("data-guess", "idle");
            // Only a restart out of game-over starts a fresh run. A mid-run
            // "playing" that follows a reveal keeps its tier.
            if (previousPhase === "game-over") root.removeAttribute("data-tier");
          }
          break;
        }
        case "reveal": {
          root.setAttribute("data-tier", String(event.tier));
          break;
        }
        case "guess": {
          root.setAttribute("data-guess", event.direction);
          break;
        }
        case "modal": {
          if (event.state === "open") root.setAttribute("data-modal", "open");
          else root.removeAttribute("data-modal");
          break;
        }
        case "route": {
          root.setAttribute("data-guess", "idle");
          root.setAttribute("data-tier", "0");
          break;
        }
        case "scroll": {
          break;
        }
        default:
          break;
      }
      engine.handleEvent(event);
    });

    function onScroll() {
      engine.setScroll(window.scrollY);
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      unsubscribe();
      detachDelegation();
      engine.destroy();
      root.removeAttribute("data-atmosphere");
      engineRef.current = null;
    };
  }, []);

  // ── Surface/mode on every pathname change ─────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    const engine = engineRef.current;
    const previousSurface = surfaceRef.current.surface;

    if (surface === "gameplay") {
      surfaceRef.current = { surface, mode };
      root.setAttribute("data-surface", "gameplay");
      if (mode) root.setAttribute("data-mode", mode);
      else root.removeAttribute("data-mode");
    } else {
      // Home resolves to the form's real preset, never an unresolved mode.
      const preset = readPresetMode();
      surfaceRef.current = { surface: "home", mode: preset };
      root.setAttribute("data-surface", "home");
      if (preset) root.setAttribute("data-mode", preset);
      else root.removeAttribute("data-mode");
    }

    if (!engine) return;
    engine.setSurface(surfaceRef.current.surface, surfaceRef.current.mode);

    if (surface === "home") {
      // Coming back leaves the finished run's phase attributes behind; clear
      // them and reset the engine's recession so Home is a full field again.
      root.removeAttribute("data-phase");
      root.removeAttribute("data-tier");
      root.removeAttribute("data-guess");
      if (previousSurface === "gameplay") {
        engine.handleEvent({
          type: "route",
          from: "gameplay",
          to: "home",
          mode: surfaceRef.current.mode,
          intent: "back",
        });
      }
    }

    // The board only exists once the deck resolved. Absence of the frozen
    // board selector is the derived-state (empty/unavailable/error) signal.
    let cancelled = false;
    const syncLowEnergy = () => {
      if (cancelled) return;
      const lowEnergy =
        surface === "gameplay" && document.querySelector(BOARD_SELECTOR) === null;
      engine.setLowEnergy(lowEnergy);
    };
    syncLowEnergy();
    const settleTimer = window.setTimeout(syncLowEnergy, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(settleTimer);
    };
  }, [surface, mode]);

  return (
    <div
      data-atmosphere-host
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block h-full w-full"
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
}
