const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";

const ALLOWED_PROVIDERS = new Set(["xendit", "kofi-intent"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return Response.json({ message: "Unsupported upgrade provider." }, { status: 404 });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ message: "Sign in to upgrade your account." }, { status: 401 });
  }

  const headers = new Headers({
    Accept: "application/json",
    Authorization: authorization,
    "Content-Type": "application/json",
  });
  const deviceId = request.headers.get("x-device-id");
  if (deviceId) headers.set("X-Device-Id", deviceId);
  const origin = request.headers.get("origin");
  if (origin) headers.set("Origin", origin);

  try {
    const response = await fetch(`${API_BASE_URL}/me/upgrade/${encodeURIComponent(provider)}`, {
      method: "POST",
      headers,
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return Response.json(
      { message: "Checkout service could not be reached. Please try again." },
      { status: 503 },
    );
  }
}
