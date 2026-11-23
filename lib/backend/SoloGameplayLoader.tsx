import BackendSoloGame from "@/components/game/BackendSoloGame";
import ClassicGame from "@/components/game/ClassicGame";
import TimeAttackGame from "@/components/game/TimeAttackGame";
import DerivedGameState from "@/components/game/DerivedGameState";
import { fetchGameItems } from "@/lib/api";
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
 * solo session starts. Monthly Listeners alone retains its approved legacy
 * snapshot path while the backend category is unavailable.
 */
export default async function SoloGameplayLoader({
  mode,
  categoryId,
  categoryLabel,
  providerCategory,
}: SoloGameplayLoaderProps) {
  let categoryPage;
  try {
    categoryPage = await fetchCategories();
  } catch {
    if (categoryId === "monthly-listeners") {
      return renderMonthlySnapshot(mode, categoryId, categoryLabel, providerCategory);
    }
    return <DerivedGameState kind="error" title="Game service is waking up" description="The backend catalog could not be reached. Return to setup and try again shortly." />;
  }

  const category = backendCategoryFor(categoryId, categoryPage);
  if (category?.playable && category.playsetId) {
    return (
      <BackendSoloGame
        playsetId={category.playsetId}
        categoryLabel={categoryLabel}
        mode={mode}
      />
    );
  }

  if (categoryId === "monthly-listeners") {
    return renderMonthlySnapshot(mode, categoryId, categoryLabel, providerCategory);
  }

  return (
    <DerivedGameState
      kind="unavailable"
      title={category?.title ? `${category.title} unavailable` : "Category unavailable"}
      description={category?.unavailableReason ?? "This category is not currently playable in the backend catalog."}
    />
  );
}

async function renderMonthlySnapshot(
  mode: GameplayMode,
  categoryId: SemanticCategoryId,
  categoryLabel: string,
  providerCategory: string,
) {
  let items;
  try {
    items = await fetchGameItems(providerCategory);
  } catch {
    return <DerivedGameState kind="error" title="Unable to load Monthly Listeners" description="The approved snapshot could not be loaded. Please try again shortly." />;
  }
  if (items.length < 2) return <DerivedGameState kind="empty" />;
  return mode === "classic" ? (
    <ClassicGame initialPool={items} categoryId={categoryId} categoryLabel={categoryLabel} />
  ) : (
    <TimeAttackGame initialPool={items} categoryId={categoryId} categoryLabel={categoryLabel} />
  );
}
