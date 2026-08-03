import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { type CareerEvent, type OpcionEvento, getEventById } from "@/engine/career-events"
import { getDivisionInfo } from "@/lib/world"

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const { opcionId } = await req.json()

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const state = found.state as Record<string, unknown>
  const carrera = state.carrera as Record<string, unknown>
  const evento = carrera?.eventoActual as CareerEvent | null

  if (!evento) return NextResponse.json({ error: "No pending event" }, { status: 400 })

  const opcion = evento.opciones.find((o: OpcionEvento) => o.id === opcionId)
  if (!opcion) return NextResponse.json({ error: "Invalid option" }, { status: 400 })

  const fx = opcion.efectos

  const clamp = (val: number, min = 0, max = 100) => Math.max(min, Math.min(max, val))

  const currentMoral = (state.moral as number) ?? 85
  const currentForma = (state.forma as number) ?? 80
  const currentFatiga = (state.fatiga as number) ?? 0
  const currentRiesgo = (state.riesgoLesion as number) ?? 5
  const currentRep = (carrera.reputacion as number) ?? 10
  const currentDivision = (carrera.divisionActual as number) ?? 3
  const currentAttrPoints = (state.attributePoints as number) ?? 0
  const currentTraits = (state.traits as string[]) ?? []

  const currentConfianza = (state.confianza as Record<string, number>) ?? {}

  const newConfianza = {
    ...currentConfianza,
    entrenador: clamp((currentConfianza.entrenador ?? 60) + (fx.confianza_entrenador ?? 0)),
    vestuario: clamp((currentConfianza.vestuario ?? 50) + (fx.confianza_vestuario ?? 0)),
  }

  // Handle transfer — resolve dynamic placeholders for "next division" transfers
  let newCarreraFields: Record<string, unknown> = {}
  if (fx.transferirA) {
    let { club, liga, rol, division } = fx.transferirA

    if (division === -1) division = Math.min(5, currentDivision + 1)

    if (club === "__NEXT_DIVISION_CLUB__" || liga === "__NEXT_DIVISION_NAME__") {
      const targetInfo = getDivisionInfo(division)
      club = targetInfo.clubes[Math.floor(Math.random() * targetInfo.clubes.length)]
      liga = targetInfo.nombre
    }

    newCarreraFields = { club, liga, rol, divisionActual: division }
  }

  // Handle selección nacional
  if (fx.seleccionConvocado) {
    newCarreraFields = { ...newCarreraFields, enSeleccion: true }
  }

  // Track resolved event ids to avoid repetition
  const resolvedIds = (carrera.eventosResueltos as string[]) ?? []
  const newResolvedIds = resolvedIds.includes(evento.id)
    ? resolvedIds
    : [...resolvedIds, evento.id]

  // Arc chaining: if option has seguimientoEventoId, queue that event next
  const arcEvento = opcion.seguimientoEventoId
    ? (getEventById(opcion.seguimientoEventoId) ?? null)
    : null

  const newCarrera = {
    ...carrera,
    ...newCarreraFields,
    reputacion: clamp(currentRep + (fx.reputacion ?? 0)),
    eventoActual: arcEvento,
    eventosResueltos: newResolvedIds,
  }

  // Trait mutations
  let newTraits = [...currentTraits]
  if (fx.addTrait && !newTraits.includes(fx.addTrait)) {
    newTraits = [...newTraits, fx.addTrait]
  }
  if (fx.removeTrait) {
    newTraits = newTraits.filter((t) => t !== fx.removeTrait)
  }

  const newState = {
    ...state,
    moral: clamp(currentMoral + (fx.moral ?? 0)),
    forma: clamp(currentForma + (fx.forma ?? 0)),
    fatiga: clamp(currentFatiga + (fx.fatiga ?? 0)),
    riesgoLesion: clamp(currentRiesgo + (fx.riesgoLesion ?? 0)),
    attributePoints: currentAttrPoints + (fx.attributePoints ?? 0),
    traits: newTraits,
    confianza: newConfianza,
    carrera: newCarrera,
  }

  await db.update(player)
    .set({ state: newState, updatedAt: new Date() })
    .where(eq(player.userId, session.user.id))

  return NextResponse.json({
    success: true,
    narrativo: opcion.narrativo,
    efectos: fx,
    transferred: !!fx.transferirA,
    arcEvent: arcEvento ? { id: arcEvento.id, titulo: arcEvento.titulo } : null,
  })
}
