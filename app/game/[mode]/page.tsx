import { ViewTransition } from "react";
import { notFound, redirect } from "next/navigation";
import { authorizeBackendGameRoute } from "@/lib/catalog/routeAuthorization";
import DerivedGameState from "@/components/game/DerivedGameState";
import SoloGameplayLoader from "@/lib/backend/SoloGameplayLoader";

/**
 * /game/[mode] — route dispatcher
 *
 * Validates the dynamic route and sends the selected category to the backend
 * session flow, retaining the approved Monthly Listeners snapshot fallback.
 */
export default async function GameModePage(props: PageProps<"/game/[mode]">) {
  const { mode } = await props.params;
  const sp = await props.searchParams;
  const authorization = authorizeBackendGameRoute(mode, sp.category);

  if (authorization.status === "missing-category") redirect("/");
  if (
    authorization.status === "invalid-category" ||
    authorization.status === "unsupported-mode" ||
    authorization.status === "incompatible-mode"
  ) {
    notFound();
  }

  if (authorization.status === "unavailable") {
    return <DerivedGameState kind="unavailable" />;
  }

  const { mode: playableMode, category } = authorization;
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", default: "none" }}
      exit={{ "nav-forward": "nav-forward", default: "none" }}
      default="none"
    >
      <SoloGameplayLoader
        mode={playableMode}
        categoryId={category.id}
        categoryLabel={category.label}
        providerCategory={authorization.providerCategory}
      />
    </ViewTransition>
  );
}
