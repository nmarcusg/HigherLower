const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/settings/public`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        maintenanceBanner: "",
        features: {
          roomsCreateEnabled: true,
          soloCreateEnabled: true,
          creatorPublishEnabled: true,
          creatorUploadEnabled: true,
        },
        payments: {
          xenditEnabled: false,
          kofiEnabled: false,
          pricePhp: 199,
          priceUsd: 4,
        },
        ads: {
          enabled: false,
          slots: { home_banner: false, lobby_sidebar: false, postgame_card: false },
          adsTxt: "",
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
