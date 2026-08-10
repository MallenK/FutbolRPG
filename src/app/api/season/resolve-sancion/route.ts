import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { simularPartidoSancion } from "@/lib/world"

type Fixture = {
  jornada: number; rival: string; esLocal: boolean; jugado: boolean
  resultado: string | null; golesJugador: number; valoracion: number | null
}

// Resuelve el partido de liga de la jornada actual cuando el jugador está
// sancionado (roja o 5 amarillas acumuladas, ver api/match/save/route.ts) —
// el equipo juega sin él, con el mismo modelo de resultado fantasma que ya
// se usa para el resto de la liga. No toca goles/asistencias/valoración del
// jugador ni el motor de turnos: es puramente avance de calendario.
export async function POST() {
  const { session, error } = await requireSession()
  if (error) return error

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

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

  await db.update(player)
    .set({ state: { ...state, carrera: newCarrera }, updatedAt: new Date() })
    .where(eq(player.userId, session.user.id))

  return NextResponse.json({ success: true, resultado, marcador })
}
