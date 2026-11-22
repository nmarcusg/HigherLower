/**
 * Browser-storage persistence for the Home setup selection.
 *
 * The Home selection lives in component state that is destroyed whenever
 * `/game/*` unmounts `HomeSetup`, so it is mirrored into one versioned
 * `localStorage` envelope and restored on the next Home mount.
 *
 * SSR-safe by construction: every storage read is guarded by `typeof window`,
 * and nothing here is called during render — the caller restores from a passive
 * effect, so the server markup and the first client render both stay on the
 * catalog defaults and hydration cannot mismatch.
 *
 * Validation is catalog-driven, never a hard-coded id list: a stored triple is
 * only honoured when its domain exists, its category is playable inside that
 * domain, and its mode is compatible with that category. Anything else returns
 * `null` and the caller keeps the defaults.
 */

import type {
  ProductionCatalogProjection,
  PublicProductionCategory,
} from "@/lib/catalog/availability";
import type { PlayableModeId, SemanticDomainId } from "@/lib/catalog/semanticCatalog";

/** Versioned key, consistent with `hl:audio:v1`. */
export const HOME_SELECTION_STORAGE_KEY = "hl:setup:v1";

export interface HomeSelection {
  v: 1;
  domainId: string;
  categoryId: string;
  mode: PlayableModeId;
}

export interface ResolvedHomeSelection {
  domainId: SemanticDomainId;
  category: PublicProductionCategory;
  mode: PlayableModeId;
}

function isPlayableMode(value: unknown): value is PlayableModeId {
  return value === "classic" || value === "time-attack";
}

function isStoredSelection(value: unknown): value is HomeSelection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.v === 1 &&
    typeof candidate.domainId === "string" &&
    candidate.domainId.length > 0 &&
    typeof candidate.categoryId === "string" &&
    candidate.categoryId.length > 0 &&
    isPlayableMode(candidate.mode)
  );
}

/** Read the stored selection. Returns `null` when absent, unreadable or malformed. */
export function readHomeSelection(): HomeSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HOME_SELECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredSelection(parsed)) return null;
    return {
      v: 1,
      domainId: parsed.domainId,
      categoryId: parsed.categoryId,
      mode: parsed.mode,
    };
  } catch {
    // Private mode, quota, disabled storage or invalid JSON — all silent.
    return null;
  }
}

/** Persist the selection. Silent on failure: persistence is a convenience, not state. */
export function writeHomeSelection(selection: HomeSelection): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HOME_SELECTION_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Ignored on purpose.
  }
}

/**
 * Resolve a stored selection against the live catalog.
 *
 * Returns `null` for a missing, stale or un-promoted value so the caller keeps
 * today's defaults rather than producing an unplayable setup.
 */
export function resolveHomeSelection(
  catalog: ProductionCatalogProjection,
  stored: HomeSelection | null,
): ResolvedHomeSelection | null {
  if (!stored) return null;

  const domain = catalog.domains.find((item) => item.id === stored.domainId);
  if (!domain) return null;

  const category = domain.categories.find(
    (item) => item.id === stored.categoryId && item.playable,
  );
  if (!category) return null;

  if (!category.compatibleModes.includes(stored.mode)) return null;

  return {
    domainId: domain.id,
    category,
    mode: stored.mode,
  };
}
