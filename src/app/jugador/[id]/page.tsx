import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPlayerById } from "@/lib/players"
import { getDivisionInfo } from "@/lib/world"
import { POSITION_LABELS } from "@/lib/player-config"
import TrophyShowcase from "@/components/TrophyShowcase"

type Params = { params: Promise<{ id: string }> }

type PublicPlayerState = {
  apodo?: string
  dorsal?: number
  level?: number
  preferencias?: { perfilPublicoOculto?: boolean }
  carrera: {
    club: string
    divisionActual?: number
    rol: string
    temporada: number
    reputacion?: number
    estadisticasTemporada?: { partidosJugados: number; goles: number; asistencias: number; valoracionMedia: number }
    estadisticasCarrera?: { partidosJugados: number; goles: number; asistencias: number }
    historialTemporadas?: { temporada: number; club: string; premios: string[] }[]
  }
}

// Un jugador de este id, visible sin sesión, salvo que su dueño lo haya
// ocultado desde Ajustes → Privacidad y actividad. Mismo criterio de
// visibilidad por defecto que el leaderboard público (api/leaderboard).
async function getVisiblePlayer(id: string) {
  const found = await getPlayerById(id)
  if (!found) return null
  const state = found.state as PublicPlayerState
  if (state.preferencias?.perfilPublicoOculto) return null
  return { ...found, state }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const player = await getVisiblePlayer(id)
  if (!player) return { title: "Jugador no encontrado · FutbolRPG" }

  const nombre = player.state.apodo ? `"${player.state.apodo}"` : player.name
  const title = `${nombre} — ${player.state.carrera.club} · FutbolRPG`
  const description = `${POSITION_LABELS[player.position as keyof typeof POSITION_LABELS] ?? player.position} · Nivel ${player.state.level ?? 1} · ${player.state.carrera.estadisticasCarrera?.goles ?? 0} goles en su carrera.`

  return { title, description, openGraph: { title, description } }
}

export default async function PublicPlayerPage({ params }: Params) {
  const { id } = await params
  const player = await getVisiblePlayer(id)
  if (!player) notFound()

  const { state } = player
  const divInfo = getDivisionInfo(state.carrera.divisionActual ?? 3)
  const golesTotales =
    (state.carrera.estadisticasCarrera?.goles ?? 0) + (state.carrera.estadisticasTemporada?.goles ?? 0)
  const asistenciasTotales =
    (state.carrera.estadisticasCarrera?.asistencias ?? 0) + (state.carrera.estadisticasTemporada?.asistencias ?? 0)
  const partidosTotales =
    (state.carrera.estadisticasCarrera?.partidosJugados ?? 0) + (state.carrera.estadisticasTemporada?.partidosJugados ?? 0)

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Perfil público</p>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center shrink-0">
              <span className="text-xl font-black text-green-400">{player.position}</span>
            </div>
            <div>
              <h1 className="text-2xl font-black">
                {state.apodo ? `"${state.apodo}"` : player.name}
                {state.dorsal && <span className="text-gray-500 text-base font-mono ml-2">#{state.dorsal}</span>}
              </h1>
              {state.apodo && <p className="text-gray-500 text-xs -mt-0.5">{player.name}</p>}
              <p className="text-gray-400 text-sm">
                {POSITION_LABELS[player.position as keyof typeof POSITION_LABELS] ?? player.position} · {player.nationality}
              </p>
              <p className="text-green-400 text-sm mt-0.5 font-semibold">
                {state.carrera.club} · {divInfo.nombreCorto} · {state.carrera.rol}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Nivel", value: state.level ?? 1 },
            { label: "Reputación", value: state.carrera.reputacion ?? 0 },
            { label: "Partidos", value: partidosTotales },
            { label: "Goles", value: golesTotales },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-gray-500 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {asistenciasTotales > 0 && (
          <p className="text-gray-500 text-xs text-center">{asistenciasTotales} asistencias en su carrera</p>
        )}

        <TrophyShowcase historial={state.carrera.historialTemporadas ?? []} />

        <p className="text-gray-600 text-xs text-center pt-6">
          Creado en <span className="text-green-400 font-semibold">FutbolRPG</span> — simulador de carrera futbolística.
        </p>
      </div>
    </main>
  )
}
