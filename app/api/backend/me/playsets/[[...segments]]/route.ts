const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";
const PLAYSET_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const ACTIONS = new Set(["publish", "unpublish", "archive"]);

async function proxy(request: Request, context: { params: Promise<{ segments?: string[] }> }) {
  const { segments = [] } = await context.params;
  const [id, action, extra] = segments;
  if (extra || (id && !PLAYSET_ID.test(id)) || (action && !ACTIONS.has(action))) {
    return Response.json({ message: "Invalid creator endpoint." }, { status: 404 });
  }
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ message: "Sign in to manage your playsets." }, { status: 401 });
  }
  if (request.method === "PUT" && (!id || action)) return Response.json({ message: "Invalid creator endpoint." }, { status: 404 });
  if (request.method === "DELETE" && (!id || action)) return Response.json({ message: "Invalid creator endpoint." }, { status: 404 });
  if (request.method === "GET" && action) return Response.json({ message: "Method not allowed." }, { status: 405 });
  if (request.method === "POST" && id && !action) return Response.json({ message: "Method not allowed." }, { status: 405 });

  const suffix = [id, action].filter(Boolean).map(encodeURIComponent).join("/");
  const target = `${API_BASE_URL}/me/playsets${suffix ? `/${suffix}` : ""}${new URL(request.url).search}`;
  const headers = new Headers({ Accept: "application/json", Authorization: authorization });
  const deviceId = request.headers.get("x-device-id");
  if (deviceId) headers.set("X-Device-Id", deviceId);
  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "DELETE") {
    headers.set("Content-Type", "application/json");
    body = await request.text();
  }
  try {
    const response = await fetch(target, { method: request.method, headers, body, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") || "application/json" } });
  } catch {
    return Response.json({ message: "The game service could not be reached. Please try again." }, { status: 503 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
