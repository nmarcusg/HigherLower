import { ViewTransition } from "react";
import { fetchCategories } from "@/lib/backend/client";
import { projectBackendCatalog } from "@/lib/backend/catalogProjection";
import { getProductionCatalogProjection } from "@/lib/catalog/availability";
import HomeSetup from "@/components/home/HomeSetup";

export default async function HomePage() {
  // The backend controls live availability. A bounded fallback keeps the
  // preserved standalone UI usable during a Render cold start or outage.
  // Gameplay conversion follows in the next integration step.
  let catalog = getProductionCatalogProjection();
  try {
    catalog = projectBackendCatalog(await fetchCategories());
  } catch {
    // The preserved standalone catalog is intentionally available while the
    // free backend wakes. The next page request will retry the safe read.
  }

  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", default: "none" }}
      exit={{ "nav-forward": "nav-forward", default: "none" }}
      default="none"
    >
      <HomeSetup catalog={catalog} />
    </ViewTransition>
  );
}
