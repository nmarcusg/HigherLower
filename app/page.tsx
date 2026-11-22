import { ViewTransition } from "react";
import { getProductionCatalogProjection } from "@/lib/catalog/availability";
import HomeSetup from "@/components/home/HomeSetup";

export default function HomePage() {
  const catalog = getProductionCatalogProjection();

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
