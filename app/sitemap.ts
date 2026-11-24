import type { MetadataRoute } from "next";
import { fetchPublicPlaysets } from "@/lib/backend/client";
import { getSiteUrl } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

const PAGE_BATCH_SIZE = 50;
const MAX_SITEMAP_PLAYSETS = 500;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteUrl().origin;
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: origin,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${origin}/playsets`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${origin}/multiplayer`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  try {
    let offset = 0;
    let total = Infinity;
    while (offset < total && offset < MAX_SITEMAP_PLAYSETS) {
      const page = await fetchPublicPlaysets({
        limit: PAGE_BATCH_SIZE,
        offset,
        signal: AbortSignal.timeout(5_000),
      });
      total = page.total;
      if (page.playsets.length === 0) break;

      for (const playset of page.playsets) {
        const official = playset.id.startsWith("system-");
        entries.push({
          url: `${origin}/playsets/${encodeURIComponent(playset.id)}`,
          lastModified: playset.updatedAt ? new Date(playset.updatedAt) : now,
          changeFrequency: official ? "weekly" : "monthly",
          priority: official ? 0.8 : 0.6,
        });
      }
      offset += page.playsets.length;
    }
  } catch {
    // Return core static routes cleanly if the backend is waking up during crawl/build.
  }

  return entries;
}
