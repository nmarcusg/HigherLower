const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";

type RouteContext = { params: Promise<{ segments?: string[] }> };

async function proxyNotifications(request: Request, context: RouteContext) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ message: "Sign in to view notifications." }, { status: 401 });
  }

  const { segments = [] } = await context.params;
  if (request.method === "GET" && segments.length !== 0) {
    return Response.json({ message: "Not found." }, { status: 404 });
  }
  if (request.method === "POST" && !(segments.length === 1 && segments[0] === "read")) {
    return Response.json({ message: "Not found." }, { status: 404 });
  }

  const headers = new Headers({
    Accept: "application/json",
    Authorization: authorization,
  });
  const deviceId = request.headers.get("x-device-id");
  if (deviceId) headers.set("X-Device-Id", deviceId);

  let body: string | undefined;
  if (request.method === "POST") {
    headers.set("Content-Type", "application/json");
    body = (await request.text()) || "{}";
  }

  const suffix = segments.length > 0 ? `/${segments.map(encodeURIComponent).join("/")}` : "";
  try {
    const response = await fetch(`${API_BASE_URL}/me/notifications${suffix}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    return new Response(
      text ||
        JSON.stringify({
          message: response.ok ? "OK" : `Notifications request failed (${response.status}).`,
        }),
      {
        status: response.status,
        headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
      },
    );
  } catch {
    return Response.json(
      { message: "Notification service could not be reached. Please try again." },
      { status: 503 },
    );
  }
}

export const GET = proxyNotifications;
export const POST = proxyNotifications;
