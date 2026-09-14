import { ImageResponse } from "next/og"
import { getPlayerById } from "@/lib/players"
import { POSITION_LABELS } from "@/lib/player-config"

export const alt = "Perfil de jugador de FutbolRPG"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

type OgPlayerState = {
  apodo?: string
  level?: number
  preferencias?: { perfilPublicoOculto?: boolean }
  carrera: {
    club: string
    reputacion?: number
    historialTemporadas?: { temporada: number; premios: string[] }[]
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const found = await getPlayerById(id)
  const state = (found?.state ?? {}) as OgPlayerState
  const oculto = !found || state.preferencias?.perfilPublicoOculto

  const nombre = oculto ? "Jugador de FutbolRPG" : (state.apodo ? `"${state.apodo}"` : found!.name)
  const posicion = oculto ? "" : (POSITION_LABELS[found!.position as keyof typeof POSITION_LABELS] ?? found!.position)
  const club = oculto ? "" : state.carrera.club
  const nivel = oculto ? 0 : (state.level ?? 1)
  const reputacion = oculto ? 0 : (state.carrera.reputacion ?? 0)
  const ultimoTrofeo = oculto
    ? undefined
    : [...(state.carrera.historialTemporadas ?? [])].reverse().find((t) => t.premios.length > 0)?.premios[0]

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#030712",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <span style={{ color: "#4ade80", fontSize: 36, fontWeight: 900 }}>Futbol</span>
          <span style={{ color: "#ffffff", fontSize: 36, fontWeight: 900 }}>RPG</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(34,197,94,0.15)",
              border: "4px solid #22c55e",
              color: "#4ade80",
              fontSize: 44,
              fontWeight: 900,
            }}
          >
            {posicion ? posicion.slice(0, 3).toUpperCase() : "⚽"}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#ffffff", fontSize: 64, fontWeight: 900, lineHeight: 1.1 }}>{nombre}</span>
            {club && (
              <span style={{ color: "#4ade80", fontSize: 32, fontWeight: 700, marginTop: 8 }}>
                {club}{posicion ? ` · ${posicion}` : ""}
              </span>
            )}
          </div>
        </div>

        {!oculto && (
          <div style={{ display: "flex", gap: 48, marginTop: 56 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#ffffff", fontSize: 48, fontWeight: 900 }}>{nivel}</span>
              <span style={{ color: "#6b7280", fontSize: 22 }}>Nivel</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#ffffff", fontSize: 48, fontWeight: 900 }}>{reputacion}</span>
              <span style={{ color: "#6b7280", fontSize: 22 }}>Reputación</span>
            </div>
            {ultimoTrofeo && (
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={{ color: "#facc15", fontSize: 28, fontWeight: 700 }}>🏆 {ultimoTrofeo}</span>
              </div>
            )}
          </div>
        )}
      </div>
    ),
    { ...size }
  )
}
