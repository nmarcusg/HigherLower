export const dynamic = "force-dynamic";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";

export async function GET() {
  let adsTxt = "";
  try {
    const response = await fetch(`${API_BASE_URL}/settings/public`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (response.ok) {
      const payload = (await response.json()) as { ads?: { adsTxt?: unknown } };
      if (typeof payload?.ads?.adsTxt === "string") {
        adsTxt = payload.ads.adsTxt.trim();
      }
    }
  } catch {
    // Serve a valid empty-state comment cleanly when backend wakes up.
  }

  const body = adsTxt
    ? `${adsTxt}\n`
    : "# No authorized digital sellers configured.\n";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
