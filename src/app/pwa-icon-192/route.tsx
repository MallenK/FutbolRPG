import { ImageResponse } from "next/og"

// Icono de la PWA (192x192, referenciado desde public/manifest.json). Se
// genera con next/og (mismo mecanismo que jugador/[id]/opengraph-image.tsx)
// en vez de un PNG estático -- así no hace falta ningún archivo de imagen
// binario en el repo y el diseño se queda coherente con el resto de la app
// con solo tocar código. Diseñado con margen generoso alrededor del
// contenido para que también sirva como icono "maskable" (el sistema
// operativo puede recortarlo a un círculo/superelipse sin cortar nada).
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
            border: "8px solid #22c55e",
          }}
        >
          <span style={{ color: "#4ade80", fontSize: 72, fontWeight: 900, fontFamily: "sans-serif" }}>F</span>
        </div>
      </div>
    ),
    { width: 192, height: 192 },
  )
}
