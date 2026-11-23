import { notFound } from "next/navigation";
import BackendSoloGame from "@/components/game/BackendSoloGame";
import { fetchPublicPlayset } from "@/lib/backend/client";

export default async function PublicPlaysetGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let playset: Awaited<ReturnType<typeof fetchPublicPlayset>>;
  try {
    playset = await fetchPublicPlayset(id);
  } catch {
    notFound();
  }

  return (
    <BackendSoloGame
      playsetId={playset.id}
      categoryLabel={playset.title}
      mode="classic"
    />
  );
}
