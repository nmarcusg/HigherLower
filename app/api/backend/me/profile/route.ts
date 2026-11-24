const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";

async function proxy(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ message: "Sign in to view your creator profile." }, { status: 401 });
  }

  const headers = new Headers({ Accept: "application/json", Authorization: authorization });
  const deviceId = request.headers.get("x-device-id");
  if (deviceId) headers.set("X-Device-Id", deviceId);

  let body: string | undefined;
  if (request.method === "PATCH") {
    headers.set("Content-Type", "application/json");
    body = await request.text();
  }

  try {
    const response = await fetch(`${API_BASE_URL}/me/profile`, {
      method: request.method,
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
      { message: "The game service could not be reached. Please try again." },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const PATCH = proxy;
