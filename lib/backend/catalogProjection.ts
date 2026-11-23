import type {
  ProductionCatalogProjection,
  PublicProductionCategory,
} from "@/lib/catalog/availability";
import {
  SEMANTIC_CATEGORIES,
  SEMANTIC_DOMAINS,
  type SemanticCategoryId,
} from "@/lib/catalog/semanticCatalog";
import type { CategoryPage, CategorySummary } from "@/lib/backend/types";

/**
 * The visual catalog keeps its established semantic IDs while the backend owns
 * data availability and the playset IDs used to start a game. Never send these
 * frontend IDs to the API; callers must use the backend category's playsetId.
 */
const BACKEND_CATEGORY_BY_SEMANTIC_ID: Record<SemanticCategoryId, string> = {
  "movie-series-rating": "movie-rating",
  "release-date": "movie-release-date",
  "gross-revenue": "movie-gross-revenue",
  "game-rating": "game-rating",
  "player-count": "game-player-count",
  "game-release-date": "game-release-date",
  "number-of-albums": "music-album-count",
  "album-release-date": "music-album-release-date",
  "monthly-listeners": "music-monthly-listeners",
  "youtube-subscribers": "youtube-subscribers",
  "twitch-followers": "twitch-followers",
};

export function backendCategoryIdFor(
  categoryId: SemanticCategoryId,
): string {
  return BACKEND_CATEGORY_BY_SEMANTIC_ID[categoryId];
}

/** Reverse lookup: backend playset id -> semantic category id (null for custom sets). */
export function semanticCategoryIdForBackend(
  backendId: string,
): SemanticCategoryId | null {
  const match = (Object.entries(BACKEND_CATEGORY_BY_SEMANTIC_ID) as Array<
    [SemanticCategoryId, string]
  >).find(([, id]) => id === backendId);
  return match?.[0] ?? null;
}

export function backendCategoryFor(
  categoryId: SemanticCategoryId,
  catalog: CategoryPage,
): CategorySummary | null {
  const backendId = backendCategoryIdFor(categoryId);
  return catalog.categories.find((category) => category.id === backendId) ?? null;
}

/**
 * The owner approved using the existing checked-in Monthly Listeners snapshot
 * while fresh Metrika data waits for its quota reset. This stays deliberately
 * narrow; no other unavailable backend category is made playable by the UI.
 */
function canUseTemporarySnapshot(category: CategorySummary): boolean {
  return category.id === "music-monthly-listeners";
}

export function projectBackendCatalog(
  catalog: CategoryPage,
): ProductionCatalogProjection {
  return {
    domains: SEMANTIC_DOMAINS.map((domain) => ({
      ...domain,
      categories: SEMANTIC_CATEGORIES
        .filter((category) => category.domainId === domain.id)
        .map((category): PublicProductionCategory => {
          const backend = backendCategoryFor(category.id, catalog);
          const playable = Boolean(
            backend && (backend.playable || canUseTemporarySnapshot(backend)),
          );
          return {
            id: category.id,
            domainId: category.domainId,
            label: category.label,
            description: category.description,
            metricDescription: backend
              ? `${backend.metric.name} (${backend.metric.unit})`
              : category.metricDescription,
            displayFormat: category.displayFormat,
            compatibleModes: category.compatibleModes,
            playable,
          };
        }),
    })),
  };
}
