import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = getSiteUrl().origin;
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/playsets", "/multiplayer"],
      disallow: ["/api/", "/admin/", "/studio", "/multiplayer/room/"],
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
