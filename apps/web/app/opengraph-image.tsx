import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Stratos — Cloud Cost Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0A0A0F",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#10B981",
            }}
          />
          <span style={{ color: "#F9FAFB", fontSize: 24, fontWeight: 600 }}>
            Stratos
          </span>
        </div>

        {/* Main headline */}
        <div
          style={{
            color: "#F9FAFB",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 24,
            maxWidth: 900,
          }}
        >
          Your cloud,{" "}
          <span style={{ color: "#10B981" }}>optimized.</span>
        </div>

        {/* Sub-headline */}
        <div
          style={{
            color: "#9CA3AF",
            fontSize: 28,
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Find wasted cloud spend automatically.
          Real AWS data · Real savings · Plain English.
        </div>

        {/* Bottom stat strip */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 80,
            display: "flex",
            gap: "48px",
          }}
        >
          {[
            ["$230B", "global cloud waste/yr"],
            ["32%", "average wasted spend"],
            ["5 algorithms", "idle · rightsize · zombie · anomaly · commitment"],
          ].map(([stat, label]) => (
            <div key={stat} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "#10B981", fontSize: 32, fontWeight: 700 }}>{stat}</span>
              <span style={{ color: "#6B7280", fontSize: 14 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
