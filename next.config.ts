import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // ── Whitelisted CDNs for next/image optimisation ──────────────────────────
    remotePatterns: [
      // TMDB movie posters
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      // flagcdn.com — country flag PNGs (Country Populations category)
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
      // Wikimedia Commons — flag assets and artist photos. `Special:FilePath`
      // lives on the wiki host, not the upload CDN.
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
        pathname: "/wiki/Special:FilePath/**",
      },
      // Steam CDN variants (SteamSpy game headers)
      {
        protocol: "https",
        hostname: "cdn.akamai.steamstatic.com",
        pathname: "/steam/apps/**",
      },
      {
        protocol: "https",
        hostname: "shared.akamai.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "cdn.cloudflare.steamstatic.com",
        pathname: "/steam/apps/**",
      },
      {
        protocol: "https",
        hostname: "shared.fastly.steamstatic.com",
      },
      // Backend-owned catalog imagery used by multiplayer cards.
      {
        protocol: "https",
        hostname: "images.igdb.com",
      },
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
      },
      {
        protocol: "https",
        hostname: "static-cdn.jtvnw.net",
      },
      {
        protocol: "https",
        hostname: "archive.org",
      },
      // Cover Art Archive thumbnails (album release dates)
      {
        protocol: "https",
        hostname: "coverartarchive.org",
      },
      // Supabase Storage — losslessly compressed catalog imagery
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],

    // Allow SVG images (e.g. flag SVGs from flagcdn / wikimedia)
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",

    // ─────────────────────────────────────────────────────────────────────────
    // GameCard uses a plain <img> tag (unoptimized) for Steam game thumbnails.
    // Steam CDN edge hostnames rotate (fastly, akamai, cloudflare) so we
    // whitelist the known stable variants above, but the <img> tag handles
    // unknown edge variations without crashing.
    // ─────────────────────────────────────────────────────────────────────────
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Allows Google Identity Services sign-in popups to communicate back while isolating third-party openers.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

