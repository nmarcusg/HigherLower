import { ViewTransition } from "react";
import { fetchCategories } from "@/lib/backend/client";
import { projectBackendCatalog } from "@/lib/backend/catalogProjection";
import { getProductionCatalogProjection } from "@/lib/catalog/availability";
import HomeSetup from "@/components/home/HomeSetup";
import { getSiteUrl, serializeJsonLd, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

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

  const siteOrigin = getSiteUrl().origin;
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteOrigin,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteOrigin}/playsets?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  const gameJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: SITE_NAME,
    url: siteOrigin,
    description: SITE_DESCRIPTION,
    applicationCategory: "Game",
    operatingSystem: "Any (Web Browser)",
    genre: ["Trivia", "Party Game", "Comparison Game"],
    playMode: ["SinglePlayer", "MultiPlayer"],
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(gameJsonLd) }}
      />
      <ViewTransition
        enter={{ "nav-forward": "nav-forward", default: "none" }}
        exit={{ "nav-forward": "nav-forward", default: "none" }}
        default="none"
      >
        <HomeSetup catalog={catalog} />
      </ViewTransition>
    </>
  );
}
