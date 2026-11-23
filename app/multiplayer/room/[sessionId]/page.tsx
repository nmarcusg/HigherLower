import type { Metadata } from "next";
import RoomExperience from "@/components/multiplayer/RoomExperience";

export const metadata: Metadata = {
  title: "Live Room — Higher or Lower",
  description: "Play or spectate a Higher or Lower multiplayer room.",
};

export default async function MultiplayerRoomPage({ params, searchParams }: { params: Promise<{ sessionId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { sessionId } = await params;
  const { entry } = await searchParams;
  const initialEntry = entry === "create" || entry === "join" || entry === "spectate" ? entry : undefined;
  return <RoomExperience initialSessionId={sessionId} initialEntry={initialEntry} />;
}
