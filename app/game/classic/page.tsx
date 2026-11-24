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
  return buildSoloGameMetadata("classic", category);
}

// ─── Inner async component (reads and authorizes searchParams) ────────────────

async function ClassicGameLoader({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { category } = await searchParams;
  const authorization = authorizeBackendGameRoute("classic", category);

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
      mode="classic"
      categoryId={authorization.category.id}
      categoryLabel={authorization.category.label}
      providerCategory={authorization.providerCategory}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClassicPage(props: PageProps<"/game/classic">) {
  return <ClassicGameLoader searchParams={props.searchParams} />;
}
