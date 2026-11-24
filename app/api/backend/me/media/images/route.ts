const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ message: "Sign in to upload images." }, { status: 401 });
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await request.arrayBuffer();
  } catch {
    return Response.json({ message: "Could not read upload payload." }, { status: 400 });
  }

  if (bytes.byteLength === 0) {
    return Response.json({ message: "Select an image file to upload." }, { status: 400 });
  }
  if (bytes.byteLength > MAX_BYTES) {
    return Response.json({ message: "Image file must be 2 MB or smaller." }, { status: 413 });
  }

  const headers = new Headers({
    Accept: "application/json",
    Authorization: authorization,
    "Content-Type": request.headers.get("content-type") || "application/octet-stream",
  });
  const deviceId = request.headers.get("x-device-id");
  if (deviceId) headers.set("X-Device-Id", deviceId);

  try {
    const response = await fetch(`${API_BASE_URL}/me/media/images`, {
      method: "POST",
      headers,
      body: bytes,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const text = await response.text();
    return new Response(
      text ||
        JSON.stringify({
          message: response.ok ? "OK" : `Image upload failed (${response.status}).`,
        }),
      {
        status: response.status,
        headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
      },
    );
  } catch {
    return Response.json(
      { message: "Image upload service could not be reached. Please try again." },
      { status: 503 },
    );
  }
}
