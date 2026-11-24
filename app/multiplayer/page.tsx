import type { Metadata } from "next";
import MultiplayerLobby from "@/components/multiplayer/MultiplayerLobby";

const DESCRIPTION =
  "Create a private party room for up to 35 players or join with a 6-character room code. Compete in Speed, Score Race, Streak, and HP modes across official and community playsets.";

export const metadata: Metadata = {
  title: "Multiplayer Party Mode",
  description: DESCRIPTION,
  alternates: {
    canonical: "/multiplayer",
  },
  openGraph: {
    title: "Multiplayer Party Mode — Higher or Lower",
    description: DESCRIPTION,
    url: "/multiplayer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Multiplayer Party Mode — Higher or Lower",
    description: DESCRIPTION,
  },
};

export default function MultiplayerPage() {
  return <MultiplayerLobby />;
}
