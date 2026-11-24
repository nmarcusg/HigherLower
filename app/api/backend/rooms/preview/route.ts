const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://higherorlower-api.onrender.com/api/v1";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(code)) {
    return Response.json({ message: "Enter a valid room code." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/rooms/preview?code=${encodeURIComponent(code)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
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
