import type { Metadata } from "next";
import MultiplayerLobby from "@/components/multiplayer/MultiplayerLobby";

export const metadata: Metadata = {
  title: "Multiplayer — Higher or Lower",
  description: "Create a room or join a Higher or Lower match with friends.",
};

export default function MultiplayerPage() {
  return <MultiplayerLobby />;
}
