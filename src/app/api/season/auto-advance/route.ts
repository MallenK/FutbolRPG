import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { activityLog } from "@/lib/schema"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { completarEnCursoYCalcular, simularYCalcular, type GuardadoPartido } from "@/lib/match-save"
import type { CareerEvent } from "@/engine/career-events"
import type { Fixture } from "@/lib/fixtures"
import { aplicarOpcionEvento, elegirOpcionAutomatica, flattenAttributes } from "@/lib/career-event-apply"
import type { CopaState, EuropaState, SeleccionState } from "@/lib/world"

// Modo de juego "simulado" (ver season/page.tsx): resuelve automáticamente
// LO SIGUIENTE que le tocaría a este jugador -- un partido interactivo a
// medias, un evento pendiente, un partido de selección, copa, europa o liga --
// una cosa por llamada. El cliente llama en bucle hasta recibir { done: true },
// momento en el que ya puede llamar a /api/season/end. Cada paso es una
// transacción: dos llamadas solapadas del bucle no pueden pisarse.
export async function POST() {
  const { session, error } = await requireSession()
  if (error) return error

  return mutatePlayerOr404<Response>(session.user.id, async (row, tx) => {
    const state = row.state as Record<string, unknown>
    const carrera = (state.carrera ?? {}) as Record<string, unknown>

    const guardar = async (r: GuardadoPartido, action: string) => {
      if (!r.state || !r.activity) {
        return { result: NextResponse.json({ ...r.json, done: false, action }, { status: r.status }) }
      }
      await tx.insert(activityLog).values(r.activity)
      return { state: r.state, result: NextResponse.json({ done: false, action }) }
    }

    // 0) Partido interactivo empezado y sin terminar.
    const enCurso = completarEnCursoYCalcular(row)
    if (enCurso) return guardar(enCurso, "partido_en_curso")

    // 1) Evento de carrera pendiente: mismos efectos que si el usuario hubiera
    // elegido a mano (lib/career-event-apply.ts), nunca la opción de retirarse.
    const evento = carrera.eventoActual as CareerEvent | null
    if (evento) {
      const opcion = elegirOpcionAutomatica(evento, flattenAttributes(row.attributes))
      return { state: aplicarOpcionEvento(state, evento, opcion), result: NextResponse.json({ done: false, action: "event" }) }
    }

    // 2) Parón de selección activo
    const seleccion = carrera.seleccion as SeleccionState | undefined
    if (seleccion?.paron?.activo) return guardar(simularYCalcular(row, "seleccion"), "seleccion_paron")

    // 3) Copa del Rey sin terminar
    const copa = carrera.copa as CopaState | undefined
    if (copa && !copa.eliminado && !copa.campeon) return guardar(simularYCalcular(row, "copa"), "copa")

    // 4) Competición europea sin terminar
    const europa = carrera.europa as EuropaState | undefined
    const europaPendiente = europa && (
      europa.grupoPartidos.some((p) => !p.jugado) ||
      (europa.eliminatoria && !europa.eliminatoria.jugado && !europa.eliminatoria.eliminado && !europa.eliminatoria.campeon)
    )
    if (europaPendiente) return guardar(simularYCalcular(row, "europa"), "europa")

    // 5) Torneo de selección sin terminar
    if (seleccion?.torneo && seleccion.torneo.fase !== "finalizado") {
      return guardar(simularYCalcular(row, "seleccion_torneo"), "seleccion_torneo")
    }

    // 6) Liga: jornada pendiente
    const jornadaActual = (carrera.jornadaActual as number) ?? 0
    const fixtures = (carrera.fixtures as Fixture[]) ?? []
    if (fixtures.some((f) => f.jornada === jornadaActual && !f.jugado)) {
      return guardar(simularYCalcular(row, "liga"), "liga")
    }

    // Nada pendiente: la temporada está lista para cerrarse (api/season/end).
    return { result: NextResponse.json({ done: true }) }
  })
}
