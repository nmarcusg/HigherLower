import type { Metadata } from "next";
import RoomExperience from "@/components/multiplayer/RoomExperience";

export const metadata: Metadata = {
  title: "Live Room — Higher or Lower",
  description: "Play or spectate a Higher or Lower multiplayer room.",
};

export default async function MultiplayerRoomPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <RoomExperience initialSessionId={sessionId} />;
}
