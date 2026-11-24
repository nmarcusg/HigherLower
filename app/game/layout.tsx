import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game",
  description: "Play Higher or Lower",
  robots: {
    index: false,
    follow: true,
  },
};

/**
 * Shared layout wrapping all /game/* routes.
 * Keeps the dark canvas without repeating the landing-page hero chrome.
 */
export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Transparent on purpose: the fixed atmosphere canvas paints below this
    // wrapper, so an opaque background here would hide the whole field (S2).
    // The grid now lives only on `.gameplay-surface`, which re-declares it,
    // and the opaque fallback is the page body's `--bg-base`.
    <div className="relative min-h-dvh flex flex-col overflow-x-hidden">
      {children}
    </div>
  );
}
