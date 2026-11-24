import { ImageResponse } from "next/og";
import { fetchPublicPlayset } from "@/lib/backend/client";

export const alt = "Playset preview card — Higher or Lower";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export default async function PlaysetOpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let playset: Awaited<ReturnType<typeof fetchPublicPlayset>> | null = null;
  try {
    playset = await fetchPublicPlayset(id, { signal: AbortSignal.timeout(6_000) });
  } catch {
    playset = null;
  }

  const badge = !playset
    ? "HIGHER OR LOWER"
    : playset.visibility === "UNLISTED"
      ? "UNLISTED PLAYSET"
      : playset.id.startsWith("system-")
        ? "OFFICIAL PLAYSET"
        : "COMMUNITY PLAYSET";

  const title = playset ? clip(playset.title, 48) : "Higher or Lower";
  const subtitle = playset
    ? `${playset.itemCount} items · ${clip(playset.metricName, 36)} (${clip(playset.metricUnit, 20)})`
    : "Compare rankings, ratings, subscribers, and custom trivia sets";

  const firstItem = playset?.items[0]?.name ? clip(playset.items[0].name, 26) : null;
  const secondItem = playset?.items[1]?.name ? clip(playset.items[1].name, 26) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 68px",
          backgroundColor: "#15122b",
          backgroundImage:
            "radial-gradient(circle at 82% 20%, rgba(255, 42, 109, 0.22) 0%, transparent 46%), radial-gradient(circle at 18% 84%, rgba(5, 217, 232, 0.18) 0%, transparent 46%)",
          color: "#ffffff",
          border: "8px solid rgba(255, 255, 255, 0.14)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: "6px",
              backgroundColor: "rgba(249, 248, 113, 0.14)",
              border: "2px solid rgba(249, 248, 113, 0.55)",
              color: "#f9f871",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.14em",
            }}
          >
            {badge}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              color: "#05d9e8",
              letterSpacing: "0.08em",
            }}
          >
            HIGHER OR LOWER
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 28 ? 60 : 74,
              fontWeight: 800,
              lineHeight: 1.08,
              color: "#ffffff",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#cbd5e1",
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 26px",
            borderRadius: "8px",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "2px solid rgba(255, 255, 255, 0.14)",
          }}
        >
          {firstItem && secondItem ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              <span style={{ color: "#ffffff" }}>{firstItem}</span>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  backgroundColor: "#ff2a6d",
                  color: "#ffffff",
                  fontSize: 18,
                }}
              >
                VS
              </span>
              <span style={{ color: "#ffffff" }}>{secondItem}</span>
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 24, color: "#cbd5e1" }}>
              Solo Classic · Time Attack · Multiplayer
            </div>
          )}
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: "#f9f871" }}>
            Which is higher? →
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
