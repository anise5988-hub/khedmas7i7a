import { ImageResponse } from "next/og";

export const alt = "ProfySpace.tn";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#11233f",
          backgroundImage:
            "radial-gradient(circle at 15% 15%, rgba(114,214,191,0.25), transparent 45%), radial-gradient(circle at 85% 85%, rgba(13,141,120,0.35), transparent 50%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 72, fontWeight: 700, color: "#ffffff" }}>ProfySpace</span>
          <span
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: "#11233f",
              backgroundColor: "#72d6bf",
              borderRadius: 12,
              padding: "6px 16px",
            }}
          >
            .tn
          </span>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 32,
            color: "#72d6bf",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Trouve le professeur qui te correspond
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 22,
            color: "#cbd5e1",
            textAlign: "center",
          }}
        >
          Cours particuliers en ligne & présentiel en Tunisie
        </div>
      </div>
    ),
    { ...size }
  );
}
