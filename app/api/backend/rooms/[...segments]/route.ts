const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";
const ROOM_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const ALLOWED_ACTIONS = new Set(["start", "leave", "results", "rematch", "kick", "end"]);

type RouteContext = { params: Promise<{ segments: string[] }> };

async function proxy(request: Request, context: RouteContext) {
  const { segments } = await context.params;
  const [sessionId, action, extra] = segments;
  if (!sessionId || !ROOM_ID_PATTERN.test(sessionId) || extra || (action && !ALLOWED_ACTIONS.has(action))) {
    return Response.json({ message: "Invalid room endpoint." }, { status: 404 });
  }
  if (request.method === "GET" && action && action !== "results") {
    return Response.json({ message: "Method not allowed." }, { status: 405 });
  }
  if (request.method === "POST" && action === "results") {
    return Response.json({ message: "Method not allowed." }, { status: 405 });
  }

  const target = `${API_BASE_URL}/rooms/${encodeURIComponent(sessionId)}${action ? `/${action}` : ""}`;
  const headers = new Headers({ Accept: "application/json" });
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);
  let body: string | undefined;
  if (request.method === "POST") {
    headers.set("Content-Type", "application/json");
    body = await request.text();
  }

  try {
    const response = await fetch(target, {
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
      { message: "The game service is waking up. Please try again shortly." },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
