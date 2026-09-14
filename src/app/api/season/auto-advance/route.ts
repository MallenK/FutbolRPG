import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { performMatchSave } from "@/lib/match-save"
import { simularResultadoPartido } from "@/engine/quick-sim"
import { type CareerEvent, getEventById, pickAutoOpcion } from "@/engine/career-events"
import type { CopaState, EuropaState, SeleccionState } from "@/lib/world"

type Fixture = { jornada: number; jugado: boolean }

// Modo de juego "simulado" (ver season/page.tsx): resuelve automáticamente
// LO SIGUIENTE que le tocaría a este jugador -- un evento pendiente, un
// partido de selección, copa, europa o liga -- una cosa por llamada. El
// cliente llama en bucle hasta recibir { done: true }, momento en el que ya
// puede llamar a /api/season/end. Un único punto de decisión evita
// duplicar en el cliente la lógica de precedencia que ya vive en season/page.tsx.
export async function POST() {
  const { session, error } = await requireSession()
  if (error) return error

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const state = found.state as Record<string, unknown>
  const carrera = state.carrera as Record<string, unknown>

  // 1) Evento de carrera pendiente
  const evento = carrera?.eventoActual as CareerEvent | null
  if (evento) {
    const attrs = found.attributes as Record<string, Record<string, number>>
    const flat = { ...attrs?.tecnicos, ...attrs?.fisicos, ...attrs?.tacticos, ...attrs?.mentales }
    // El evento de retiro nunca se decide al azar en modo "simulado" -- sería
    // muy raro que el jugador desaparezca a media simulación sin haberlo
    // pedido. Retirarse sigue siendo posible, pero solo a mano (Ajustes).
    const opcion = evento.id === "retiro_forzado"
      ? evento.opciones.find((o) => o.id === "una_mas") ?? evento.opciones[0]
      : pickAutoOpcion(evento, flat)
    const fx = opcion.efectos

    // Reutiliza el mismo cálculo que /api/season/event, simplificado: solo
    // los campos que ese endpoint también aplica están disponibles aquí.
    const clamp = (val: number, min = 0, max = 100) => Math.max(min, Math.min(max, val))
    const resolvedIds = (carrera.eventosResueltos as string[]) ?? []
    const newResolvedIds = resolvedIds.includes(evento.id) ? resolvedIds : [...resolvedIds, evento.id]
    const pendientes = (carrera.eventosPendientes as CareerEvent[]) ?? []
    const arcEvento = opcion.seguimientoEventoId ? (getEventById(opcion.seguimientoEventoId) ?? null) : null
    const nextEvento = arcEvento ?? pendientes[0] ?? null
    const remainingQueue = arcEvento ? pendientes : pendientes.slice(1)

    const newState = {
      ...state,
      moral: clamp(((state.moral as number) ?? 85) + (fx.moral ?? 0)),
      forma: clamp(((state.forma as number) ?? 80) + (fx.forma ?? 0)),
      fatiga: clamp(((state.fatiga as number) ?? 0) + (fx.fatiga ?? 0)),
      carrera: {
        ...carrera,
        reputacion: clamp(((carrera.reputacion as number) ?? 10) + (fx.reputacion ?? 0)),
        eventoActual: nextEvento,
        eventosPendientes: remainingQueue,
        eventosResueltos: newResolvedIds,
      },
    }
    await db.update(player).set({ state: newState, updatedAt: new Date() }).where(eq(player.userId, session.user.id))
    return NextResponse.json({ done: false, action: "event" })
  }

  // 2) Parón de selección activo
  const seleccion = carrera?.seleccion as SeleccionState | undefined
  if (seleccion?.paron?.activo) {
    await simulateOneMatch(session.user.id, found, "seleccion")
    return NextResponse.json({ done: false, action: "seleccion_paron" })
  }

  // 3) Copa del Rey sin terminar
  const copa = carrera?.copa as CopaState | undefined
  if (copa && !copa.eliminado && !copa.campeon) {
    await simulateOneMatch(session.user.id, found, "copa")
    return NextResponse.json({ done: false, action: "copa" })
  }

  // 4) Competición europea sin terminar
  const europa = carrera?.europa as EuropaState | undefined
  const europaPendiente = europa && (
    europa.grupoPartidos.some((p) => !p.jugado) ||
    (europa.eliminatoria && !europa.eliminatoria.jugado && !europa.eliminatoria.eliminado && !europa.eliminatoria.campeon)
  )
  if (europaPendiente) {
    await simulateOneMatch(session.user.id, found, "europa")
    return NextResponse.json({ done: false, action: "europa" })
  }

  // 5) Torneo de selección sin terminar
  if (seleccion?.torneo && seleccion.torneo.fase !== "finalizado") {
    await simulateOneMatch(session.user.id, found, "seleccion_torneo")
    return NextResponse.json({ done: false, action: "seleccion_torneo" })
  }

  // 6) Liga: jornada pendiente
  const jornadaActual = (carrera?.jornadaActual as number) ?? 0
  const fixtures = (carrera?.fixtures as Fixture[]) ?? []
  const hayPartidoEstaJornada = fixtures.some((f) => f.jornada === jornadaActual && !f.jugado)
  if (jornadaActual > 0 && jornadaActual <= 16 && hayPartidoEstaJornada) {
    await simulateOneMatch(session.user.id, found, "liga")
    return NextResponse.json({ done: false, action: "liga" })
  }

  // Nada pendiente: la temporada está lista para cerrarse (api/season/end).
  return NextResponse.json({ done: true })
}

async function simulateOneMatch(userId: string, found: Awaited<ReturnType<typeof getPlayerByUserId>>, tipo: string) {
  const state = found!.state as Record<string, unknown>
  const forma = (state.forma as number) ?? 80
  const fatiga = (state.fatiga as number) ?? 0
  const sim = simularResultadoPartido(found!.position, found!.attributes as Parameters<typeof simularResultadoPartido>[1], forma, fatiga)
  const traits = (state.traits as string[]) ?? []
  const fatigaGanada = traits.includes("fisico_excepcional") ? 20 * 0.75 : 20
  await performMatchSave(userId, {
    tipo,
    ganado: sim.ganado,
    golesRival: sim.golesRival,
    expulsado: sim.expulsado,
    matchStats: sim.matchStats,
    updatedState: { fatiga: Math.min(100, fatiga + fatigaGanada) },
  })
}
