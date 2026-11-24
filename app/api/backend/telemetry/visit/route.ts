const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    const deviceId = request.headers.get("x-device-id");
    if (deviceId) headers.set("X-Device-Id", deviceId);

    const response = await fetch(`${API_BASE_URL}/telemetry/visit`, {
      method: "POST",
      headers,
      body: body || "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return Response.json({ recorded: false }, { status: 200 });
  }
}
