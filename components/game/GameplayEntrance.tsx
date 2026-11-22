"use client";

/**
 * First-mount entrance annotations for the gameplay surface (D4).
 *
 * The entrance is CSS-only: `app/globals.css` keys its beats off
 * `.gameplay-entrance` (on the existing gameplay body element) and
 * `.gameplay-entrance-status` / `.gameplay-entrance-controls` (on two elements
 * that already exist). Nothing new is added to the DOM and no layout moves.
 *
 * This module provides the tally annotation as a *cloner*, not a container: it
 * merges the class onto the single child it is given, so the DOM shape and the
 * server-rendered markup stay identical. The body and control classes are
 * applied as literal class strings in each game component, which is the
 * zero-node alternative the plan records for this file.
 *
 * No state, no motion library, no reduced-motion branch — reduced motion is a
 * pure CSS override, because a JS/SSR branch here is what produced the live
 * hero hydration mismatch.
 */

import { cloneElement, isValidElement, type ReactNode } from "react";

interface ClassableProps {
  className?: string;
}

/** Adds `gameplay-entrance-status` to the existing tally cluster. */
export function GameplayEntranceStatus({ children }: { children: ReactNode }) {
  if (!isValidElement<ClassableProps>(children)) return <>{children}</>;
  const merged = [children.props.className, "gameplay-entrance-status"]
    .filter(Boolean)
    .join(" ");
  return <>{cloneElement(children, { className: merged })}</>;
}
