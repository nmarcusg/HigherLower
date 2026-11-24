const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

async function proxy(
  request: Request,
  context: { params: Promise<{ segments: string[] }> },
) {
  const { segments } = await context.params;
  if (
    !Array.isArray(segments) ||
    segments.length === 0 ||
    segments.some((seg) => !SAFE_SEGMENT.test(seg) || seg === "." || seg === "..")
  ) {
    return Response.json({ message: "Invalid admin endpoint." }, { status: 404 });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ message: "Staff authentication required." }, { status: 401 });
  }

  const suffix = segments.map(encodeURIComponent).join("/");
  const search = new URL(request.url).search;
  const target = `${API_BASE_URL}/admin/${suffix}${search}`;

  const headers = new Headers({
    Accept: "application/json",
    Authorization: authorization,
  });
  const deviceId = request.headers.get("x-device-id");
  if (deviceId) headers.set("X-Device-Id", deviceId);

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    headers.set("Content-Type", request.headers.get("content-type") || "application/json");
    body = await request.text();
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
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
      { message: "Could not reach backend admin API." },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
