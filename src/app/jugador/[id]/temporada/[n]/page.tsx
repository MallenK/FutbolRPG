import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPlayerById } from "@/lib/players"
import type { SeasonHistoryEntry } from "@/lib/world"

type Params = { params: Promise<{ id: string; n: string }> }

type PublicPlayerState = {
  apodo?: string
  preferencias?: { perfilPublicoOculto?: boolean }
  carrera: {
    historialTemporadas?: SeasonHistoryEntry[]
  }
}

// Misma regla de visibilidad que /jugador/[id] (ver ese archivo): el resumen
// de una temporada concreta hereda la privacidad del perfil del jugador.
async function getVisibleSeasonEntry(id: string, temporada: number) {
  const found = await getPlayerById(id)
  if (!found) return null
  const state = found.state as PublicPlayerState
  if (state.preferencias?.perfilPublicoOculto) return null
  const entry = state.carrera.historialTemporadas?.find((t) => t.temporada === temporada)
  if (!entry) return null
  return { player: found, entry }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id, n } = await params
  const data = await getVisibleSeasonEntry(id, Number(n))
  if (!data) return { title: "Resumen de temporada no encontrado · FutbolRPG" }

  const { player, entry } = data
  const state = player.state as PublicPlayerState
  const nombre = state.apodo ? `"${state.apodo}"` : player.name
  const title = `${nombre} — Temporada ${entry.temporada} en ${entry.club} · FutbolRPG`
  const description = `${entry.stats.goles} goles, ${entry.stats.asistencias} asistencias, valoración media ${entry.stats.valoracionMedia.toFixed(1)}.`

  return { title, description, openGraph: { title, description } }
}

const CAMBIO_DIVISION_LABEL: Record<SeasonHistoryEntry["cambioDivision"], string> = {
  ascenso: "¡Ascenso!",
  descenso: "Descenso",
  ninguno: "Se mantiene",
}

export default async function PublicSeasonRecapPage({ params }: Params) {
  const { id, n } = await params
  const data = await getVisibleSeasonEntry(id, Number(n))
  if (!data) notFound()

  const { player, entry } = data
  const state = player.state as PublicPlayerState
  const nombre = state.apodo ? `"${state.apodo}"` : player.name

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Resumen de temporada</p>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
          <div>
            <h1 className="text-xl font-black">Temporada {entry.temporada} · {nombre}</h1>
            <p className="text-gray-400 text-sm">{entry.club} · {entry.liga}</p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Partidos", value: entry.stats.partidosJugados },
              { label: "Goles", value: entry.stats.goles },
              { label: "Asistencias", value: entry.stats.asistencias },
              { label: "Val. media", value: entry.stats.valoracionMedia.toFixed(1) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xl font-black">{value}</p>
                <p className="text-gray-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>

          {entry.premios.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Premios</p>
              <div className="flex flex-wrap gap-2">
                {entry.premios.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-semibold">
                    🏆 {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={`rounded-xl px-4 py-3 flex items-center gap-3 border ${
            entry.cambioDivision === "ascenso"
              ? "bg-green-500/10 border-green-500/30"
              : entry.cambioDivision === "descenso"
                ? "bg-red-500/10 border-red-500/30"
                : "bg-gray-800/60 border-gray-700"
          }`}>
            <span className="text-xl">
              {entry.cambioDivision === "ascenso" ? "🏆" : entry.cambioDivision === "descenso" ? "📉" : "📊"}
            </span>
            <p className={`font-bold text-sm ${
              entry.cambioDivision === "ascenso" ? "text-green-300"
              : entry.cambioDivision === "descenso" ? "text-red-300" : "text-gray-300"
            }`}>
              {entry.posicionFinal}º de {entry.totalEquipos} · {CAMBIO_DIVISION_LABEL[entry.cambioDivision]}
            </p>
          </div>

          {entry.rolNuevo !== entry.rolAnterior && (
            <p className="text-gray-400 text-xs">{entry.rolAnterior} → {entry.rolNuevo}</p>
          )}
        </div>

        <p className="text-gray-600 text-xs text-center pt-6">
          Creado en <span className="text-green-400 font-semibold">FutbolRPG</span> — simulador de carrera futbolística.
        </p>
      </div>
    </main>
  )
}
