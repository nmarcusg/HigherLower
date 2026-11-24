import type { Metadata } from "next";
import { authorizeBackendGameRoute } from "@/lib/catalog/routeAuthorization";

export const SITE_NAME = "Higher or Lower";
export const DEFAULT_SITE_URL = "https://higher-lower-mult.vercel.app";
export const SITE_DESCRIPTION =
  "Play Higher or Lower free online — compare movie ratings and box office, video games, music, YouTube subscribers, Twitch followers, and community playsets in Solo Classic, Time Attack, or 35-player Party Multiplayer.";

function normalizeOrigin(raw: string | undefined, defaultProtocol = "https://"): URL | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `${defaultProtocol}${trimmed}`;
  try {
    return new URL(withProtocol.replace(/\/+$/, ""));
  } catch {
    return null;
  }
}

/**
 * Resolve the canonical public origin for metadata, sitemaps, robots.txt, and JSON-LD.
 * Prefers explicit `NEXT_PUBLIC_SITE_URL`, then platform-provided deployment hosts,
 * and falls back to the deployed production domain.
 */
export function getSiteUrl(): URL {
  return (
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeOrigin(process.env.RENDER_EXTERNAL_URL) ??
    normalizeOrigin(
      process.env.VERCEL_URL
        ? process.env.VERCEL_URL
        : process.env.NODE_ENV === "development"
          ? "http://localhost:3000"
          : DEFAULT_SITE_URL,
    ) ??
    new URL(DEFAULT_SITE_URL)
  );
}

/** Collapse whitespace and truncate without slicing mid-word. */
export function truncateMetaDescription(text: string, maxLength = 158): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const sliced = normalized.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace > Math.floor(maxLength * 0.6) ? sliced.slice(0, lastSpace) : sliced;
  return `${cut.trimEnd()}…`;
}

/** Escape `<` so user-authored titles/descriptions cannot break out of JSON-LD script tags. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Build category-aware noindex metadata for active solo `/game/*` routes. */
export function buildSoloGameMetadata(modeInput: unknown, categoryInput: unknown): Metadata {
  const authorization = authorizeBackendGameRoute(modeInput, categoryInput);
  if (authorization.status !== "authorized") {
    return {
      title: "Game",
      description: "Play Higher or Lower online.",
      robots: { index: false, follow: true },
    };
  }
  const modeLabel = authorization.mode === "time-attack" ? "Time Attack" : "Classic";
  const title = `${authorization.category.label} · ${modeLabel}`;
  const description = truncateMetaDescription(
    `Play Higher or Lower ${modeLabel} mode with ${authorization.category.label}: ${authorization.category.description}`,
  );
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}
