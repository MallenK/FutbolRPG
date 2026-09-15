// lib/calendar.ts
//
// Calendario unificado de temporada. Antes el motor decidía "qué toca jugar
// ahora" con una precedencia rígida por categoría (evento > parón selección >
// copa > europa > torneo selección > liga): Copa y la competición europea
// tenían que resolverse enteras (todas sus rondas) antes de poder jugar una
// sola jornada de Liga, aunque la propia vista de calendario mostraba la Liga
// empezando en Agosto, antes que Copa (Octubre) o Europa (Septiembre) — el
// orden de juego real contradecía al orden mostrado en pantalla.
//
// Ahora hay una única fuente de verdad: `buildEntriesSinProximo` construye
// TODOS los partidos de la temporada (Liga, Copa, Europa, parón de selección
// y torneo de selección) con un `orden` cronológico basado en su mes
// narrativo, y tanto `getProximoPartido` (qué se juega a continuación) como
// `buildCalendarioTemporada` (la vista de calendario completa) se derivan de
// esa misma lista — así que lo que se muestra y lo que realmente se juega a
// continuación son, por construcción, la misma cosa.
//
// Los meses son puramente narrativos/visuales (no hay fechas reales
// almacenadas en la carrera) — se derivan de la posición de cada partido
// dentro de su competición, siguiendo el calendario habitual del fútbol
// español/europeo: Liga de agosto a mayo, Copa del Rey de octubre a abril,
// competición europea de septiembre (grupos) a mayo (final), el parón de
// selección coincidiendo con la ventana FIFA de noviembre (se genera justo
// tras la jornada 8 de Liga, ver match-save.ts), y el torneo de selección
// (Eurocopa/Mundial) en verano (Junio grupos, Julio eliminatoria) — después
// de que termine la temporada de club, nunca antes.
//
// Excepción deliberada: mientras el parón de selección está activo, sí se
// impone como bloqueo absoluto sobre Liga/Copa/Europa (nadie juega con su
// club durante una ventana FIFA real), en vez de intercalarse por `orden`
// como el resto de competiciones de club.

import {
  COPA_RONDAS,
  EUROPA_COMPETICION_LABELS,
  EUROPA_COMPETICION_ABBR,
  type CopaState,
  type EuropaState,
  type SeleccionState,
} from "./world"

export type Fixture = {
  jornada: number
  rival: string
  esLocal: boolean
  jugado: boolean
  resultado: string | null
  golesJugador: number
  valoracion: number | null
}

type CarreraCalendario = {
  fixtures?: Fixture[]
  copa?: CopaState
  europa?: EuropaState
  seleccion?: SeleccionState
  liga?: string
}

export type CompeticionTipo = "liga" | "copa" | "europa" | "seleccion" | "seleccion_torneo"

export const COMPETICION_LABELS: Record<CompeticionTipo, string> = {
  liga: "Liga",
  copa: "Copa del Rey",
  europa: "Europa",
  seleccion: "Selección",
  seleccion_torneo: "Selección",
}

export const COMPETICION_COLORS: Record<CompeticionTipo, string> = {
  liga: "bg-green-500/20 text-green-400 border-green-500/40",
  copa: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  europa: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  seleccion: "bg-red-500/20 text-red-400 border-red-500/40",
  seleccion_torneo: "bg-red-500/20 text-red-400 border-red-500/40",
}

const TORNEO_LABEL: Record<"eurocopa" | "mundial", string> = { eurocopa: "Eurocopa", mundial: "Mundial" }
const TORNEO_ABBR: Record<"eurocopa" | "mundial", string> = { eurocopa: "EURO", mundial: "MUN" }
const TORNEO_ELIM_RONDAS = ["QF", "SF", "F"] as const

// ─── Meses por competición ──────────────────────────────────────────────────
// 16 jornadas de Liga repartidas de agosto a mayo (10 meses), con más
// densidad al principio y al final de temporada como en un calendario real.
const MESES_LIGA = [
  "Agosto", "Agosto", "Septiembre", "Septiembre", "Octubre", "Octubre",
  "Noviembre", "Noviembre", "Noviembre", "Diciembre", "Diciembre", "Enero",
  "Febrero", "Marzo", "Abril", "Mayo",
]
function mesLiga(jornada: number): string {
  return MESES_LIGA[Math.max(0, Math.min(MESES_LIGA.length - 1, jornada - 1))]
}

// Copa del Rey: rondas de octubre (R32) a abril (Final), como en la
// competición real.
const MESES_COPA = ["Octubre", "Diciembre", "Enero", "Febrero", "Abril"]
function mesCopa(rondaIdx: number): string {
  return MESES_COPA[Math.max(0, Math.min(MESES_COPA.length - 1, rondaIdx))]
}

// Fase de grupos europea: 6 jornadas de septiembre a diciembre.
const MESES_EUROPA_GRUPO = ["Septiembre", "Septiembre", "Octubre", "Noviembre", "Noviembre", "Diciembre"]
function mesEuropaGrupo(idx: number): string {
  return MESES_EUROPA_GRUPO[Math.max(0, Math.min(MESES_EUROPA_GRUPO.length - 1, idx))]
}

// Eliminatoria europea: de febrero (dieciseisavos) a mayo (final).
const MESES_EUROPA_ELIM = ["Febrero", "Marzo", "Abril", "Mayo"]
function mesEuropaEliminatoria(rondaIdx: number): string {
  return MESES_EUROPA_ELIM[Math.max(0, Math.min(MESES_EUROPA_ELIM.length - 1, rondaIdx))]
}

// Orden de los meses de una temporada real (agosto → julio del año siguiente).
export const ORDEN_MESES = [
  "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
]
function ordenMes(mes: string): number {
  const idx = ORDEN_MESES.indexOf(mes)
  return idx === -1 ? ORDEN_MESES.length : idx
}

// ─── Próximo partido unificado ─────────────────────────────────────────────

export type ProximoPartido = {
  key: string
  tipo: CompeticionTipo
  competicion: string
  ronda: string
  rival: string
  esLocal: boolean
  mes: string
  jornadaLiga?: number
}

// ─── Entradas del calendario (sin marcar cuál es la "próxima") ────────────
//
// Construye Liga + Copa + Europa + parón de selección + torneo de selección
// en una sola lista ordenada por `orden` (mes cronológico, y dentro de un
// mismo mes: Liga primero como el partido de fin de semana, luego Copa/Europa
// entre semana, luego Selección). Es la única función que sabe construir un
// partido de cada competición — tanto `getProximoPartido` como
// `buildCalendarioTemporada` se apoyan en ella para no poder desincronizarse.

export type CalendarioEntry = {
  key: string
  tipo: CompeticionTipo
  competicionLabel: string
  competicionAbbr: string
  ronda: string
  rival: string
  esLocal: boolean
  mes: string
  orden: number
  jugado: boolean
  resultado?: string | null
  golesJugador?: number
  valoracion?: number | null
  ganado?: boolean
  empate?: boolean
  jornadaLiga?: number
}

// Prioridad dentro de un mismo mes: la Liga marca el pulso del calendario
// (fin de semana), Copa/Europa son partidos entre semana, la selección
// ocupa el parón, y el torneo de selección (verano) siempre va al final.
const PRIORIDAD_TIPO: Record<CompeticionTipo, number> = {
  liga: 0,
  copa: 1,
  europa: 2,
  seleccion: 3,
  seleccion_torneo: 4,
}

function buildEntriesSinProximo(carrera: CarreraCalendario): CalendarioEntry[] {
  const entries: CalendarioEntry[] = []

  // Liga
  for (const f of carrera.fixtures ?? []) {
    const mes = mesLiga(f.jornada)
    entries.push({
      key: `liga-${f.jornada}`,
      tipo: "liga",
      competicionLabel: carrera.liga ?? "Liga",
      competicionAbbr: "LIGA",
      ronda: `J${f.jornada}`,
      rival: f.rival,
      esLocal: f.esLocal,
      mes,
      orden: ordenMes(mes) * 10 + PRIORIDAD_TIPO.liga,
      jugado: f.jugado,
      resultado: f.resultado,
      golesJugador: f.golesJugador,
      valoracion: f.valoracion,
      jornadaLiga: f.jornada,
    })
  }

  // Copa del Rey: rondas ya jugadas (historial) + la ronda actual pendiente
  const copa = carrera.copa
  if (copa) {
    copa.historial.forEach((h, i) => {
      const mes = mesCopa(i)
      entries.push({
        key: `copa-${i}`,
        tipo: "copa",
        competicionLabel: "Copa del Rey",
        competicionAbbr: "COPA",
        ronda: h.ronda,
        rival: h.rival,
        esLocal: true,
        mes,
        orden: ordenMes(mes) * 10 + PRIORIDAD_TIPO.copa,
        jugado: true,
        resultado: h.resultado,
        ganado: h.ganado,
      })
    })
    if (!copa.eliminado && !copa.campeon) {
      const rondaIdx = Math.max(0, Math.min(COPA_RONDAS.length - 1, copa.rondaIdx))
      const mes = mesCopa(rondaIdx)
      entries.push({
        key: `copa-${rondaIdx}`,
        tipo: "copa",
        competicionLabel: "Copa del Rey",
        competicionAbbr: "COPA",
        ronda: COPA_RONDAS[rondaIdx] ?? "R32",
        rival: copa.rival,
        esLocal: copa.esLocal,
        mes,
        orden: ordenMes(mes) * 10 + PRIORIDAD_TIPO.copa,
        jugado: false,
      })
    }
  }

  // Europa: fase de grupos + eliminatoria
  const europa = carrera.europa
  if (europa) {
    const abbr = EUROPA_COMPETICION_ABBR[europa.competicion] ?? "UCL"
    const label = EUROPA_COMPETICION_LABELS[europa.competicion] ?? "Europa"
    europa.grupoPartidos.forEach((p) => {
      const mes = mesEuropaGrupo(p.idx)
      entries.push({
        key: `europa-grupo-${p.idx}`,
        tipo: "europa",
        competicionLabel: label,
        competicionAbbr: abbr,
        ronda: `Grupos J${p.idx + 1}`,
        rival: p.rival,
        esLocal: p.esLocal,
        mes,
        orden: ordenMes(mes) * 10 + PRIORIDAD_TIPO.europa,
        jugado: p.jugado,
        resultado: p.resultado,
        ganado: p.ganado,
        empate: p.empate,
      })
    })
    const el = europa.eliminatoria
    if (el) {
      const rondaNames = ["R16", "QF", "SF", "F"]
      el.historial.forEach((h, i) => {
        const mes = mesEuropaEliminatoria(i)
        entries.push({
          key: `europa-elim-${i}`,
          tipo: "europa",
          competicionLabel: label,
          competicionAbbr: abbr,
          ronda: h.ronda,
          rival: h.rival,
          esLocal: true,
          mes,
          orden: ordenMes(mes) * 10 + PRIORIDAD_TIPO.europa,
          jugado: true,
          resultado: h.resultado,
          ganado: h.ganado,
        })
      })
      if (!el.jugado && !el.eliminado && !el.campeon) {
        const mes = mesEuropaEliminatoria(el.rondaIdx)
        entries.push({
          key: `europa-elim-${el.rondaIdx}`,
          tipo: "europa",
          competicionLabel: label,
          competicionAbbr: abbr,
          ronda: rondaNames[el.rondaIdx] ?? "Eliminatoria",
          rival: el.rival,
          esLocal: el.esLocal,
          mes,
          orden: ordenMes(mes) * 10 + PRIORIDAD_TIPO.europa,
          jugado: false,
        })
      }
    }
  }

  // Parón de selección (solo si ya se generó, ver match-save.ts jornada 9)
  const paron = carrera.seleccion?.paron
  if (paron) {
    paron.partidos.forEach((p, i) => {
      entries.push({
        key: `seleccion-${i}`,
        tipo: "seleccion",
        competicionLabel: "Selección Nacional",
        competicionAbbr: "SEL",
        ronda: p.tipo === "clasificacion" ? "Clasificación" : "Amistoso",
        rival: p.rival,
        esLocal: p.esLocal,
        mes: "Noviembre",
        orden: ordenMes("Noviembre") * 10 + PRIORIDAD_TIPO.seleccion,
        jugado: p.jugado,
        resultado: p.resultado,
        ganado: p.ganado,
        empate: p.empate,
      })
    })
  }

  // Torneo de selección (Eurocopa/Mundial): evento de verano, después de que
  // termine la temporada de club (Junio grupos, Julio eliminatoria) — nunca
  // antes de la Liga, aunque no dependa de ninguna jornada suya.
  const torneo = carrera.seleccion?.torneo
  if (torneo) {
    const label = TORNEO_LABEL[torneo.tipo]
    const abbr = TORNEO_ABBR[torneo.tipo]
    torneo.grupoPartidos.forEach((p) => {
      entries.push({
        key: `torneo-grupo-${p.idx}`,
        tipo: "seleccion_torneo",
        competicionLabel: label,
        competicionAbbr: abbr,
        ronda: `Grupos J${p.idx + 1}`,
        rival: p.rival,
        esLocal: p.esLocal,
        mes: "Junio",
        orden: ordenMes("Junio") * 10 + PRIORIDAD_TIPO.seleccion_torneo,
        jugado: p.jugado,
        resultado: p.resultado,
        ganado: p.ganado,
        empate: p.empate,
      })
    })
    const el = torneo.eliminatoria
    if (el) {
      el.historial.forEach((h, i) => {
        entries.push({
          key: `torneo-elim-${i}`,
          tipo: "seleccion_torneo",
          competicionLabel: label,
          competicionAbbr: abbr,
          ronda: h.ronda,
          rival: h.rival,
          esLocal: false,
          mes: "Julio",
          orden: ordenMes("Julio") * 10 + PRIORIDAD_TIPO.seleccion_torneo,
          jugado: true,
          resultado: h.resultado,
          ganado: h.ganado,
        })
      })
      if (!el.jugado && !el.eliminado && !el.campeon) {
        entries.push({
          key: `torneo-elim-${el.rondaIdx}`,
          tipo: "seleccion_torneo",
          competicionLabel: label,
          competicionAbbr: abbr,
          ronda: TORNEO_ELIM_RONDAS[el.rondaIdx] ?? "Eliminatoria",
          rival: el.rival,
          esLocal: el.esLocal,
          mes: "Julio",
          orden: ordenMes("Julio") * 10 + PRIORIDAD_TIPO.seleccion_torneo,
          jugado: false,
        })
      }
    }
  }

  return entries.sort((a, b) => a.orden - b.orden)
}

function entryToProximoPartido(entry: CalendarioEntry): ProximoPartido {
  return {
    key: entry.key,
    tipo: entry.tipo,
    competicion: entry.competicionLabel,
    ronda: entry.tipo === "liga" && entry.jornadaLiga != null ? `Jornada ${entry.jornadaLiga}` : entry.ronda,
    rival: entry.rival,
    esLocal: entry.esLocal,
    mes: entry.mes,
    ...(entry.jornadaLiga != null ? { jornadaLiga: entry.jornadaLiga } : {}),
  }
}

// getProximoPartido: el siguiente partido de la temporada, sin importar de
// qué competición sea. Solo dos casos se tratan como bloqueo absoluto en vez
// de intercalarse por orden cronológico:
//   1. El parón de selección activo (durante una ventana FIFA real no se
//      juega ningún partido de club, así que pausa Liga/Copa/Europa entero).
//   2. El torneo de selección de verano, que solo puede ser "lo próximo"
//      cuando Liga + Copa + Europa de esa temporada ya han terminado del
//      todo — es un evento posterior a la temporada de club, no paralelo.
// Todo lo demás (Liga, Copa, Europa) compite por el mismo hueco: gana quien
// tenga el partido pendiente más próximo en el calendario (mismo `orden` que
// pinta buildCalendarioTemporada), así que ya no hace falta terminar toda la
// Copa o toda la fase de grupos europea antes de tocar la Liga.
export function getProximoPartido(carrera: CarreraCalendario): ProximoPartido | null {
  const seleccion = carrera.seleccion

  // 1) Parón de selección activo — bloqueo absoluto
  if (seleccion?.paron?.activo) {
    const next = seleccion.paron.partidos.find((p) => !p.jugado)
    if (next) {
      return {
        key: `seleccion-${seleccion.paron.partidos.indexOf(next)}`,
        tipo: "seleccion",
        competicion: "Selección Nacional",
        ronda: next.tipo === "clasificacion" ? "Clasificación" : "Amistoso",
        rival: next.rival,
        esLocal: next.esLocal,
        mes: "Noviembre",
      }
    }
  }

  const entries = buildEntriesSinProximo(carrera)

  // 2) El partido de club (Liga/Copa/Europa) pendiente más próximo en el
  // calendario — ya ordenado cronológicamente por buildEntriesSinProximo.
  const proximoClub = entries.find((e) => !e.jugado && (e.tipo === "liga" || e.tipo === "copa" || e.tipo === "europa"))
  if (proximoClub) return entryToProximoPartido(proximoClub)

  // 3) Torneo de selección (Eurocopa/Mundial) — solo si ya no queda ningún
  // partido de club pendiente esta temporada.
  const proximoTorneo = entries.find((e) => !e.jugado && e.tipo === "seleccion_torneo")
  if (proximoTorneo) return entryToProximoPartido(proximoTorneo)

  return null
}

// ─── Calendario completo de la temporada (jugados + pendientes) ────────────
// Combina Liga + Copa + Europa + parón de selección + torneo de selección en
// una sola lista ordenada cronológicamente, para que el jugador vea de un
// vistazo cómo se entrelazan todas las competiciones en una sola temporada,
// en vez de mirar pantallas sueltas por competición.

export function buildCalendarioTemporada(
  carrera: CarreraCalendario
): (CalendarioEntry & { esProximo: boolean })[] {
  const entries = buildEntriesSinProximo(carrera)
  const proximo = getProximoPartido(carrera)
  return entries.map((e) => ({ ...e, esProximo: !!proximo && e.key === proximo.key }))
}

export function agruparPorMes<T extends { mes: string }>(entries: T[]): { mes: string; entries: T[] }[] {
  const grupos = new Map<string, T[]>()
  for (const e of entries) {
    if (!grupos.has(e.mes)) grupos.set(e.mes, [])
    grupos.get(e.mes)!.push(e)
  }
  return ORDEN_MESES
    .filter((m) => grupos.has(m))
    .map((mes) => ({ mes, entries: grupos.get(mes)! }))
}
