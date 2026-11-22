/**
 * Atmosphere event bus — a framework-free, module-level emitter.
 *
 * Deliberately tiny: no React state, no queues, no per-frame work. A bounded
 * subscriber list keeps a leaked listener from becoming a leak of listeners.
 * `emit` never throws to its caller: one broken subscriber must not break an
 * interaction handler or the canvas loop.
 */

import type { AtmosphereEvent, AtmosphereListener } from "./types";

/** Two consumers are expected (canvas, audio). The cap leaves headroom only. */
const MAX_SUBSCRIBERS = 8;

const subscribers: AtmosphereListener[] = [];

export function subscribeAtmosphere(listener: AtmosphereListener): () => void {
  if (subscribers.includes(listener)) {
    return () => {
      /* already subscribed; keep the unsubscribe idempotent */
      unsubscribe(listener);
    };
  }
  if (subscribers.length >= MAX_SUBSCRIBERS) {
    // Drop the oldest consumer rather than growing without bound.
    subscribers.shift();
  }
  subscribers.push(listener);
  return () => unsubscribe(listener);
}

function unsubscribe(listener: AtmosphereListener): void {
  const index = subscribers.indexOf(listener);
  if (index >= 0) subscribers.splice(index, 1);
}

export function emitAtmosphere(event: AtmosphereEvent): void {
  // Snapshot the list so a subscriber that unsubscribes mid-emit cannot
  // disturb iteration order.
  const current = subscribers.slice();
  for (const listener of current) {
    try {
      listener(event);
    } catch {
      // A decorative subsystem must never break a real interaction.
    }
  }
}

/** Subscriber count — used by the verification sweep, not by the app. */
export function atmosphereSubscriberCount(): number {
  return subscribers.length;
}
