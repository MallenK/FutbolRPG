import {
  getEventById,
  type CareerEvent,
  type OpcionEvento,
} from "@/engine/career-events"
import {
  calcularSalario,
  getDivisionInfo,
  generateTransferOffers,
  type ContratoState,
  type MercadoState,
} from "@/lib/world"

// Único sitio donde se aplican los efectos de una opción de evento de carrera
// sobre player.state. Antes esta lógica vivía copiada en /api/season/event y,
// recortada, en /api/season/auto-advance: en modo "simulado" se perdían en
// silencio los puntos de atributo, rasgos, confianza, riesgo de lesión,
// traspasos, renovaciones de contrato y la entrada al mercado que la misma
// decisión sí aplicaba en modo manual.

type State = Record<string, unknown>

const clamp = (val: number, min = 0, max = 100) => Math.max(min, Math.min(max, val))

// Opción que se usa como "retirarse" en el evento de retiro (ver season/end).
// Nunca se elige sola: retirarse borra al jugador, así que solo cuenta si el
// usuario la pulsa a mano.
export const OPCION_RETIRO = { eventoId: "retiro_forzado", opcionId: "retirarse" } as const

export function esOpcionDeRetiro(evento: CareerEvent, opcion: OpcionEvento): boolean {
  return evento.id === OPCION_RETIRO.eventoId && opcion.id === OPCION_RETIRO.opcionId
}

export function flattenAttributes(attributes: unknown): Record<string, number> {
  const attrs = (attributes ?? {}) as Record<string, Record<string, number> | undefined>
  return { ...attrs.tecnicos, ...attrs.fisicos, ...attrs.tacticos, ...attrs.mentales }
}

// Elección sin intervención del usuario (modo "simulado"). Mismo criterio que
// pickAutoOpcion (engine/career-events.ts): prefiere la opción cuyo requisito
// de stat cumple el jugador y, si no hay, elige al azar. La diferencia es que
// aquí nunca puede salir la opción de retirarse.
export function elegirOpcionAutomatica(
  evento: CareerEvent,
  flatStats: Record<string, number>,
  random: () => number = Math.random,
): OpcionEvento {
  const candidatas = evento.opciones.filter((o) => !esOpcionDeRetiro(evento, o))
  if (candidatas.length === 0) return evento.opciones[0]
  const conStat = candidatas.find(
    (o) => o.requiereStat && (flatStats[o.requiereStat.stat] ?? 0) >= o.requiereStat.minValue,
  )
  if (conStat) return conStat
  return candidatas[Math.floor(random() * candidatas.length)]
}

export function aplicarOpcionEvento(
  state: State,
  evento: CareerEvent,
  opcion: OpcionEvento,
  random: () => number = Math.random,
): State {
  const carrera = (state.carrera ?? {}) as State
  const fx = opcion.efectos

  const currentMoral = (state.moral as number) ?? 85
  const currentForma = (state.forma as number) ?? 80
  const currentFatiga = (state.fatiga as number) ?? 0
  const currentRiesgo = (state.riesgoLesion as number) ?? 5
  const currentRep = (carrera.reputacion as number) ?? 10
  const currentDivision = (carrera.divisionActual as number) ?? 3
  const currentAttrPoints = (state.attributePoints as number) ?? 0
  const currentTraits = (state.traits as string[]) ?? []
  const currentConfianza = (state.confianza as Record<string, number>) ?? {}

  // "Mentalidad de Acero": los eventos de prensa nunca bajan la moral.
  const inmuneAPrensaNegativa = evento.tipo === "PRENSA" && currentTraits.includes("mentalidad_acero")
  const moralDelta = inmuneAPrensaNegativa ? Math.max(0, fx.moral ?? 0) : (fx.moral ?? 0)

  const newConfianza = {
    ...currentConfianza,
    entrenador: clamp((currentConfianza.entrenador ?? 60) + (fx.confianza_entrenador ?? 0)),
    vestuario: clamp((currentConfianza.vestuario ?? 50) + (fx.confianza_vestuario ?? 0)),
  }

  let newCarreraFields: State = {}

  // Traspaso: resuelve los marcadores de "club de la división siguiente".
  if (fx.transferirA) {
    let { club, liga, division } = fx.transferirA
    const { rol } = fx.transferirA
    if (division === -1) division = Math.min(5, currentDivision + 1)
    if (club === "__NEXT_DIVISION_CLUB__" || liga === "__NEXT_DIVISION_NAME__") {
      const targetInfo = getDivisionInfo(division)
      club = targetInfo.clubes[Math.floor(random() * targetInfo.clubes.length)]
      liga = targetInfo.nombre
    }
    newCarreraFields = { club, liga, rol, divisionActual: division }
  }

  // Renegociación de contrato (informe-fallos.md, Ronda 6, M3).
  if (fx.contratoTemporadas != null) {
    // Renovar es renegociar: el salario se recalcula con la situación actual.
    const newContrato: ContratoState = {
      temporadasRestantes: fx.contratoTemporadas,
      salarioRelativo: calcularSalario(currentDivision, currentRep + (fx.reputacion ?? 0)),
    }
    newCarreraFields = { ...newCarreraFields, contrato: newContrato }
  }

  // "Explorar el mercado": entra de verdad en el mercado NPC con ofertas ya.
  if (fx.activarMercado) {
    const currentMercado = carrera.mercado as MercadoState | undefined
    const jornadaActual = (carrera.jornadaActual as number) ?? 1
    const currentClub = (carrera.club as string) ?? ""
    const newOffers = generateTransferOffers(currentRep, currentDivision, currentClub, jornadaActual)
    const newMercado: MercadoState = {
      enLista: true,
      ofertasActivas: [...(currentMercado?.ofertasActivas ?? []), ...newOffers],
      ultimaActualizacion: jornadaActual,
    }
    newCarreraFields = { ...newCarreraFields, mercado: newMercado }
  }

  const resolvedIds = (carrera.eventosResueltos as string[]) ?? []
  const newResolvedIds = resolvedIds.includes(evento.id) ? resolvedIds : [...resolvedIds, evento.id]

  // Encadenado: un evento de arco va primero; si no hay, sale el siguiente de
  // la cola de eventos pendientes (ráfaga generada en match-save).
  const arcEvento = opcion.seguimientoEventoId ? (getEventById(opcion.seguimientoEventoId) ?? null) : null
  const pendientes = (carrera.eventosPendientes as CareerEvent[]) ?? []
  const nextEvento = arcEvento ?? pendientes[0] ?? null

  const newCarrera = {
    ...carrera,
    ...newCarreraFields,
    reputacion: clamp(currentRep + (fx.reputacion ?? 0)),
    eventoActual: nextEvento,
    eventosPendientes: arcEvento ? pendientes : pendientes.slice(1),
    eventosResueltos: newResolvedIds,
  }

  let newTraits = [...currentTraits]
  if (fx.addTrait && !newTraits.includes(fx.addTrait)) newTraits = [...newTraits, fx.addTrait]
  if (fx.removeTrait) newTraits = newTraits.filter((t) => t !== fx.removeTrait)

  return {
    ...state,
    moral: clamp(currentMoral + moralDelta),
    forma: clamp(currentForma + (fx.forma ?? 0)),
    fatiga: clamp(currentFatiga + (fx.fatiga ?? 0)),
    riesgoLesion: clamp(currentRiesgo + (fx.riesgoLesion ?? 0)),
    attributePoints: Math.max(0, currentAttrPoints + (fx.attributePoints ?? 0)),
    traits: newTraits,
    confianza: newConfianza,
    carrera: newCarrera,
  }
}
