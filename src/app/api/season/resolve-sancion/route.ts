import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { simularPartidoSancion } from "@/lib/world"
import type { Fixture } from "@/lib/fixtures"

// Resuelve el partido de liga de la jornada actual cuando el jugador está
// sancionado (roja o 5 amarillas acumuladas, ver api/match/save/route.ts) —
// el equipo juega sin él, con el mismo modelo de resultado fantasma que ya
// se usa para el resto de la liga. No toca goles/asistencias/valoración del
// jugador ni el motor de turnos: es puramente avance de calendario.
export async function POST() {
  const { session, error } = await requireSession()
  if (error) return error

  return mutatePlayerOr404<Response>(session.user.id, async (found, tx) => {

  const state = found.state as Record<string, unknown>
  const carrera = state.carrera as Record<string, unknown>
  const sancion = (carrera?.sancion as { partidosRestantes: number } | undefined) ?? { partidosRestantes: 0 }

  if (sancion.partidosRestantes <= 0) {
    return NextResponse.json({ error: "No hay sanción activa" }, { status: 400 })
  }

  const jornadaActual = (carrera?.jornadaActual as number) ?? 0
  let fixtures = (carrera?.fixtures as Fixture[]) ?? []
  const { resultado, marcador } = simularPartidoSancion()

  if (jornadaActual > 0 && jornadaActual <= 16) {
    fixtures = fixtures.map((f) =>
      f.jornada === jornadaActual
        ? { ...f, jugado: true, resultado: marcador, golesJugador: 0, valoracion: null }
        : f
    )
  }

  const newCarrera = {
    ...carrera,
    fixtures,
    jornadaActual: jornadaActual + 1,
    sancion: { partidosRestantes: sancion.partidosRestantes - 1 },
  }

  return { state: { ...state, carrera: newCarrera }, result: NextResponse.json({ success: true, resultado, marcador }) }
  })
}
