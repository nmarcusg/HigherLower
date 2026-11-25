import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Higher or Lower — Free Trivia & Party Comparison Game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function getLogoDataUri(): string {
  const bytes = readFileSync(join(process.cwd(), "public", "logo.png"));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export default function OpenGraphImage() {
  const logoSrc = getLogoDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 68px",
          backgroundColor: "#15122b",
          backgroundImage:
            "radial-gradient(circle at 18% 18%, rgba(255, 42, 109, 0.24) 0%, transparent 45%), radial-gradient(circle at 84% 82%, rgba(5, 217, 232, 0.2) 0%, transparent 48%)",
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
              alignItems: "center",
              padding: "10px 20px",
              borderRadius: "6px",
              backgroundColor: "rgba(5, 217, 232, 0.14)",
              border: "2px solid rgba(5, 217, 232, 0.55)",
              color: "#05d9e8",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.14em",
            }}
          >
            FREE TRIVIA & PARTY GAME
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
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
            UP TO 35 PLAYERS
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <img
              src={logoSrc}
              alt=""
              width={108}
              height={108}
              style={{ borderRadius: "9999px", flexShrink: 0 }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "20px",
                fontSize: 88,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              <span style={{ color: "#ffffff" }}>HIGHER</span>
              <span style={{ color: "#05d9e8" }}>OR</span>
              <span style={{ color: "#ff2a6d" }}>LOWER</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#cbd5e1",
              lineHeight: 1.35,
            }}
          >
            Movies · Video Games · Music · YouTube · Twitch · Custom Playsets
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "24px",
            borderTop: "2px solid rgba(255, 255, 255, 0.14)",
            fontSize: 22,
            color: "#94a3b8",
          }}
        >
          <div style={{ display: "flex", gap: "18px" }}>
            <span style={{ color: "#05d9e8", fontWeight: 700 }}>SOLO CLASSIC</span>
            <span>·</span>
            <span style={{ color: "#ff2a6d", fontWeight: 700 }}>TIME ATTACK</span>
            <span>·</span>
            <span style={{ color: "#f9f871", fontWeight: 700 }}>PARTY ROOMS</span>
          </div>
          <span style={{ color: "#ffffff", fontWeight: 700 }}>Play Free Online</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
