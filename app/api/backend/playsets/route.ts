const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";

export async function GET(request: Request) {
  const incomingUrl = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of ["limit", "offset", "q", "kind"]) {
    const value = incomingUrl.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/playsets${query.size ? `?${query}` : ""}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return Response.json(
      { message: "The game service is waking up. Please try again shortly." },
      { status: 503 },
    );
  }
}
