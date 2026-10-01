import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { readJson } from "@/lib/http"
import type { CareerEvent } from "@/engine/career-events"
import { retirarJugadorEnTx } from "@/lib/legado"
import {
  aplicarOpcionEvento,
  elegirOpcionAutomatica,
  esOpcionDeRetiro,
  flattenAttributes,
} from "@/lib/career-event-apply"

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await readJson<{ opcionId: string; auto: boolean }>(req)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  const { opcionId, auto } = body

  return mutatePlayerOr404<Response>(session.user.id, async (found, tx) => {

  const state = found.state as Record<string, unknown>
  const carrera = state.carrera as Record<string, unknown>
  const evento = carrera?.eventoActual as CareerEvent | null

  if (!evento) return NextResponse.json({ error: "No pending event" }, { status: 400 })

  const opcion = auto
    ? elegirOpcionAutomatica(evento, flattenAttributes(found.attributes))
    : evento.opciones.find((o) => o.id === opcionId)
  if (!opcion) return NextResponse.json({ error: "Invalid option" }, { status: 400 })

  // Retiro definitivo: en vez de aplicar los efectos normales, se archiva la
  // carrera entera en el Legado y se borra el jugador.
  if (esOpcionDeRetiro(evento, opcion)) {
    await retirarJugadorEnTx(tx, found)
    return NextResponse.json({ success: true, narrativo: opcion.narrativo, retirado: true })
  }

  const newState = aplicarOpcionEvento(state, evento, opcion)

  const arcEvento = opcion.seguimientoEventoId
    ? (newState.carrera as { eventoActual: CareerEvent | null }).eventoActual
    : null

  return { state: newState, result: NextResponse.json({
    success: true,
    narrativo: opcion.narrativo,
    efectos: opcion.efectos,
    transferred: !!opcion.efectos.transferirA,
    arcEvent: arcEvento ? { id: arcEvento.id, titulo: arcEvento.titulo } : null,
  }) }
  })
}
