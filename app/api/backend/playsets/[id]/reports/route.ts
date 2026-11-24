const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || id.length > 64 || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) {
    return Response.json({ message: "Invalid playset ID." }, { status: 400 });
  }
  try {
    const body = await request.text();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    const deviceId = request.headers.get("x-device-id");
    if (deviceId) headers.set("X-Device-Id", deviceId);

    const response = await fetch(`${API_BASE_URL}/playsets/${encodeURIComponent(id)}/reports`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return Response.json(
      { message: "Could not submit your report right now. Please try again." },
      { status: 503 },
    );
  }
}
