import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";
import PublicChrome from "@/components/layout/PublicChrome";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

const DEFAULT_TITLE = "Higher or Lower — Free Trivia & Party Comparison Game";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: DEFAULT_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "higher or lower",
    "higher or lower game",
    "trivia game",
    "comparison game",
    "party multiplayer trivia",
    "movie ratings game",
    "box office trivia",
    "steam player count game",
    "youtube subscribers higher or lower",
    "twitch followers higher or lower",
    "custom playsets",
  ],
  authors: [{ name: SITE_NAME }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceMono.variable} h-full dark`}>
      <body className="min-h-full flex flex-col bg-grid bg-noise antialiased">
        <noscript>
          <style>{`[data-atmo-safe="hero"] * { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        <PublicChrome>{children}</PublicChrome>
      </body>
    </html>
  );
}
