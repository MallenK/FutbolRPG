import { ImageResponse } from "next/og"

// Ver pwa-icon-192/route.tsx -- misma idea, tamaño grande (icono principal
// de instalación en Android/escritorio).
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#030712",
        }}
      >
        <div
          style={{
            width: "62%",
            height: "62%",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(34,197,94,0.15)",
            border: "22px solid #22c55e",
          }}
        >
          <span style={{ color: "#4ade80", fontSize: 192, fontWeight: 900, fontFamily: "sans-serif" }}>F</span>
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  )
}
