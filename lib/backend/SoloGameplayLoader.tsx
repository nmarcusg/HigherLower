import BackendSoloGame from "@/components/game/BackendSoloGame";
import DerivedGameState from "@/components/game/DerivedGameState";
import { backendCategoryFor } from "@/lib/backend/catalogProjection";
import { fetchCategories } from "@/lib/backend/client";
import type { SemanticCategoryId } from "@/types/game";
import type { GameplayMode } from "@/components/game/GameplayShell";

interface SoloGameplayLoaderProps {
  mode: GameplayMode;
  categoryId: SemanticCategoryId;
  categoryLabel: string;
  providerCategory: string;
}

/**
 * Resolve the selected visual category to its backend-owned playset before a
 * server-authoritative solo session starts.
 */
export default async function SoloGameplayLoader({
  mode,
  categoryId,
  categoryLabel,
}: SoloGameplayLoaderProps) {
  let categoryPage;
  try {
    categoryPage = await fetchCategories();
  } catch {
    return <DerivedGameState kind="error" title="Game service is waking up" description="The backend catalog could not be reached. Return to setup and try again shortly." />;
  }

  const category = backendCategoryFor(categoryId, categoryPage);
  if (category?.playable && category.playsetId) {
    return (
      <BackendSoloGame
        playsetId={category.playsetId}
        categoryId={categoryId}
        categoryLabel={categoryLabel}
        mode={mode}
      />
    );
  }

  return (
    <DerivedGameState
      kind="unavailable"
      title={category?.title ? `${category.title} unavailable` : "Category unavailable"}
      description={category?.unavailableReason ?? "This category is not currently playable in the backend catalog."}
    />
  );
}
