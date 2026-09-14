import { ImageResponse } from "next/og"
import { getPlayerById } from "@/lib/players"
import type { SeasonHistoryEntry } from "@/lib/world"

export const alt = "Resumen de temporada de FutbolRPG"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

type OgPlayerState = {
  apodo?: string
  preferencias?: { perfilPublicoOculto?: boolean }
  carrera: { historialTemporadas?: SeasonHistoryEntry[] }
}

export default async function Image({ params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params
  const found = await getPlayerById(id)
  const state = (found?.state ?? {}) as OgPlayerState
  const entry = state.carrera?.historialTemporadas?.find((t) => t.temporada === Number(n))
  const oculto = !found || state.preferencias?.perfilPublicoOculto || !entry

  const nombre = oculto ? "Jugador de FutbolRPG" : (state.apodo ? `"${state.apodo}"` : found!.name)

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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <span style={{ color: "#4ade80", fontSize: 32, fontWeight: 900 }}>Futbol</span>
          <span style={{ color: "#ffffff", fontSize: 32, fontWeight: 900 }}>RPG</span>
        </div>

        {oculto || !entry ? (
          <span style={{ color: "#ffffff", fontSize: 56, fontWeight: 900 }}>{nombre}</span>
        ) : (
          // Satori (el motor detrás de ImageResponse) no reparte bien varios
          // hermanos sueltos dentro de un Fragment como flex items -- hay que
          // envolverlos en un único div flex-column real (ver bug visual
          // detectado en QA: los textos se solapaban con un Fragment aquí).
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#6b7280", fontSize: 26, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>
              Temporada {entry.temporada}
            </span>
            <span style={{ color: "#ffffff", fontSize: 60, fontWeight: 900, marginTop: 6 }}>{nombre}</span>
            <span style={{ color: "#4ade80", fontSize: 30, fontWeight: 700, marginTop: 6 }}>
              {entry.club} · {entry.posicionFinal}º de {entry.totalEquipos}
            </span>

            <div style={{ display: "flex", gap: 44, marginTop: 48 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#ffffff", fontSize: 44, fontWeight: 900 }}>{entry.stats.goles}</span>
                <span style={{ color: "#6b7280", fontSize: 20 }}>Goles</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#ffffff", fontSize: 44, fontWeight: 900 }}>{entry.stats.asistencias}</span>
                <span style={{ color: "#6b7280", fontSize: 20 }}>Asistencias</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#ffffff", fontSize: 44, fontWeight: 900 }}>{entry.stats.valoracionMedia.toFixed(1)}</span>
                <span style={{ color: "#6b7280", fontSize: 20 }}>Val. media</span>
              </div>
              {entry.premios[0] && (
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <span style={{ color: "#facc15", fontSize: 26, fontWeight: 700 }}>🏆 {entry.premios[0]}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    ),
    { ...size }
  )
}
