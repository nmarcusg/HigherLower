import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { authorizeBackendGameRoute } from "@/lib/catalog/routeAuthorization";
import SoloGameplayLoader from "@/lib/backend/SoloGameplayLoader";
import DerivedGameState from "@/components/game/DerivedGameState";
import { buildSoloGameMetadata } from "@/lib/seo/site";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { category } = await searchParams;
  return buildSoloGameMetadata("time-attack", category);
}

// ─── Inner async route authorization ─────────────────────────────────────────

async function TimeAttackLoader({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { category } = await searchParams;
  const authorization = authorizeBackendGameRoute("time-attack", category);

  if (authorization.status === "missing-category") redirect("/");
  if (
    authorization.status === "invalid-category" ||
    authorization.status === "unsupported-mode" ||
    authorization.status === "incompatible-mode"
  ) {
    notFound();
  }

  if (authorization.status === "unavailable") {
    return <DerivedGameState kind="unavailable" />;
  }

  return (
    <SoloGameplayLoader
      mode="time-attack"
      categoryId={authorization.category.id}
      categoryLabel={authorization.category.label}
      providerCategory={authorization.providerCategory}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimeAttackPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <TimeAttackLoader searchParams={props.searchParams} />;
}
