import {
  initMatchState,
  getSituacionForTurn,
  resolveDecisionWithDice,
  type InteractiveMatchState,
  type Situacion,
  type TurnResult,
} from "@/engine/match-interactive"
import { resolveStatValue } from "@/engine/decision"
import {
  type Player,
  type StatsTecnicos,
  type StatsFisicos,
  type StatsTacticos,
  type StatsMentales,
  type Confianza,
  type Carrera,
  Posicion,
} from "@/engine/types"
import {
  COPA_RONDAS,
  EUROPA_COMPETICION_LABELS,
  formatRonda,
  type CopaState,
  type EuropaState,
  type SeleccionState,
} from "@/lib/world"
import type { Fixture } from "@/lib/fixtures"
import { hayPartidoPendiente, type TipoPartido } from "@/lib/match-validation"
import type { MatchSaveBody } from "@/lib/match-save"

// Partido interactivo resuelto en el servidor. Antes el navegador generaba
// las situaciones, tiraba el dado y calculaba el resultado, y al final
// enviaba las estadísticas: bastaba con editar el JavaScript para ganar
// siempre. Ahora el partido en curso vive en `carrera.partidoEnCurso`, el
// dado se tira aquí y el cliente solo elige la opción y anima.

type Row = { id: string; name: string; position: string; nationality: string; age: number; attributes: unknown; state: unknown }

export type MatchContext = {
  tipo: TipoPartido
  rival: string
  esLocal: boolean
  club: string
  competicion: string
  ronda: string
}

export type PartidoEnCurso = {
  id: string
  tipo: TipoPartido
  // Identifica QUÉ partido es (temporada + jornada/ronda). Si deja de
  // coincidir con el siguiente partido pendiente de ese tipo, el partido
  // guardado está obsoleto y se descarta.
  clave: string
  posicionEfectiva?: Posicion
  matchState: InteractiveMatchState
  situacion: Situacion
  contexto: MatchContext
}

// Respuesta de un turno, guardada para que un reintento (red caída) reciba
// exactamente lo mismo en vez de volver a tirar el dado.
export type RespuestaTurno = {
  matchId: string
  turno: number
  roll: number
  result: TurnResult
  matchState: InteractiveMatchState
  situacion: Situacion | null
  finished: boolean
  guardado?: Record<string, unknown>
}

// ─── Jugador del motor a partir de la fila de BD ─────────────────────────────

const DEF_TEC = { control: 50, pase: 50, tiro: 50, regate: 50, cabeceo: 50, centros: 50, entradas: 50, reflejos: 50 }
const DEF_FIS = { resistencia: 50, velocidad: 50, aceleracion: 50, fuerza: 50, salto: 50, agilidad: 50 }
const DEF_TAC = { posicionamiento: 50, vision: 50, decisiones: 50, presion_alta: 50, colocacion: 50 }
const DEF_MEN = { disciplina: 50, confianza: 50, presion: 50, liderazgo: 50, concentracion: 50, ambicion: 50 }

export function mapDbPlayer(row: Row): Player {
  const attrs = (row.attributes ?? {}) as Record<string, Record<string, number> | undefined>
  const state = (row.state ?? {}) as {
    fatiga?: number; forma?: number; moral?: number; riesgoLesion?: number
    confianza?: Confianza; carrera: Carrera
    origen?: string; personalidad?: string; estiloJuego?: string
    traits?: string[]; potencial?: number
    piernaDominante?: string; altura?: number; peso?: number
    apodo?: string; dorsal?: number
    posicionesSecundarias?: string[]
  }
  return {
    id: row.id,
    personal: {
      nombre: row.name,
      apodo: state.apodo,
      edad: row.age,
      nacionalidad: row.nationality,
      genero: "M",
      piernaDominante: (state.piernaDominante as "derecho" | "izquierdo" | "ambidiestro") ?? "derecho",
      altura: state.altura ?? 180,
      peso: state.peso ?? 75,
      dorsal: state.dorsal ?? 10,
      fechaNacimiento: "",
      cantera: "Academia",
      representante: "",
    },
    posicionPrincipal: row.position as Posicion,
    posicionesSecundarias: (state.posicionesSecundarias as Posicion[] | undefined) ?? [],
    origen: state.origen ?? "academia",
    personalidad: state.personalidad ?? "profesional",
    estiloJuego: state.estiloJuego ?? "",
    traits: state.traits ?? [],
    potencial: state.potencial ?? 3,
    tecnicos: { ...DEF_TEC, ...attrs.tecnicos } as unknown as StatsTecnicos,
    fisicos: { ...DEF_FIS, ...attrs.fisicos } as unknown as StatsFisicos,
    tacticos: { ...DEF_TAC, ...attrs.tacticos } as unknown as StatsTacticos,
    mentales: { ...DEF_MEN, ...attrs.mentales } as unknown as StatsMentales,
    estado: {
      fatiga: state.fatiga ?? 0,
      forma: state.forma ?? 80,
      moral: state.moral ?? 85,
      riesgoLesion: state.riesgoLesion ?? 5,
    },
    confianza: state.confianza ?? { entrenador: 60, vestuario: 50, reputacion: 40 },
    carrera: state.carrera,
  }
}

// ─── Qué partido es y contra quién ───────────────────────────────────────────

export function claveDePartido(tipo: TipoPartido, carrera: Record<string, unknown>): string {
  const temporada = (carrera.temporada as number) ?? 1
  switch (tipo) {
    case "liga":
      return `${temporada}:liga:${(carrera.jornadaActual as number) ?? 0}`
    case "copa": {
      const copa = carrera.copa as CopaState | undefined
      return `${temporada}:copa:${copa?.rondaIdx ?? 0}`
    }
    case "europa": {
      const europa = carrera.europa as EuropaState | undefined
      const grupo = europa?.grupoPartidos.find((p) => !p.jugado)
      return grupo ? `${temporada}:europa:g${grupo.idx}` : `${temporada}:europa:e${europa?.eliminatoria?.rondaIdx ?? 0}`
    }
    case "seleccion": {
      const paron = (carrera.seleccion as SeleccionState | undefined)?.paron
      const idx = paron?.partidos.findIndex((p) => !p.jugado) ?? 0
      return `${temporada}:seleccion:${idx}`
    }
    case "seleccion_torneo": {
      const torneo = (carrera.seleccion as SeleccionState | undefined)?.torneo
      const grupo = torneo?.grupoPartidos.find((p) => !p.jugado)
      return grupo ? `${temporada}:torneo:g${grupo.idx}` : `${temporada}:torneo:e${torneo?.eliminatoria?.rondaIdx ?? 0}`
    }
  }
}

export function buildMatchContext(tipo: TipoPartido, carrera: Record<string, unknown>, nationality: string): MatchContext {
  const club = (carrera.club as string) ?? "—"
  const liga = (carrera.liga as string) ?? "Liga"

  if (tipo === "copa") {
    const copa = carrera.copa as CopaState | undefined
    return {
      tipo, club,
      rival: copa?.rival ?? "Rival",
      esLocal: copa?.esLocal ?? true,
      competicion: "Copa del Rey",
      ronda: formatRonda(copa ? (COPA_RONDAS[copa.rondaIdx] ?? "R32") : "R32"),
    }
  }

  if (tipo === "europa") {
    const europa = carrera.europa as EuropaState | undefined
    const next = europa?.grupoPartidos.find((p) => !p.jugado)
    const elim = !next && europa?.eliminatoria && !europa.eliminatoria.jugado ? europa.eliminatoria : undefined
    return {
      tipo, club,
      rival: next?.rival ?? elim?.rival ?? "Rival",
      esLocal: next?.esLocal ?? elim?.esLocal ?? true,
      competicion: europa ? (EUROPA_COMPETICION_LABELS[europa.competicion] ?? "Europa") : "Europa",
      ronda: next ? "Fase de Grupos" : elim ? formatRonda(["R16", "QF", "SF", "F"][elim.rondaIdx] ?? "Eliminatoria") : "Europa",
    }
  }

  if (tipo === "seleccion") {
    const next = (carrera.seleccion as SeleccionState | undefined)?.paron?.partidos.find((p) => !p.jugado)
    return {
      tipo, club: nationality,
      rival: next?.rival ?? "Rival",
      esLocal: next?.esLocal ?? true,
      competicion: "Selección Nacional",
      ronda: next?.tipo === "clasificacion" ? "Clasificación" : "Amistoso",
    }
  }

  if (tipo === "seleccion_torneo") {
    const torneo = (carrera.seleccion as SeleccionState | undefined)?.torneo
    const label = torneo?.tipo === "eurocopa" ? "Eurocopa" : "Mundial"
    if (torneo?.fase === "grupos") {
      const next = torneo.grupoPartidos.find((p) => !p.jugado)
      return { tipo, club: nationality, rival: next?.rival ?? "Rival", esLocal: next?.esLocal ?? true, competicion: label, ronda: "Fase de Grupos" }
    }
    const el = torneo?.eliminatoria
    return {
      tipo, club: nationality,
      rival: el?.rival ?? "Rival",
      esLocal: el?.esLocal ?? true,
      competicion: label,
      ronda: ["Cuartos de Final", "Semifinales", "Gran Final"][el?.rondaIdx ?? 0] ?? "Eliminatoria",
    }
  }

  const jornada = (carrera.jornadaActual as number) ?? 1
  const fixture = ((carrera.fixtures as Fixture[]) ?? []).find((f) => f.jornada === jornada)
  return {
    tipo: "liga", club,
    rival: fixture?.rival ?? "Rival",
    esLocal: fixture?.esLocal ?? true,
    competicion: liga,
    ronda: `Jornada ${jornada}`,
  }
}

// ─── Ciclo de vida del partido ───────────────────────────────────────────────

// ¿Sigue siendo válido el partido guardado? Si ya no está pendiente (se
// simuló, se cerró la temporada, avanzó la jornada…) hay que descartarlo.
export function partidoVigente(partido: PartidoEnCurso | undefined | null, carrera: Record<string, unknown>): partido is PartidoEnCurso {
  return !!partido
    && hayPartidoPendiente(partido.tipo, carrera)
    && claveDePartido(partido.tipo, carrera) === partido.clave
}

export function iniciarPartido(
  row: Row,
  tipo: TipoPartido,
  opts: { jugarSecundaria?: boolean; id: string },
): PartidoEnCurso {
  const carrera = ((row.state ?? {}) as { carrera: Record<string, unknown> }).carrera
  const jugador = mapDbPlayer(row)
  // "Polivalente": jugar en la posición secundaria solo si el jugador tiene una.
  const posicionEfectiva = opts.jugarSecundaria ? jugador.posicionesSecundarias[0] : undefined
  const matchState = initMatchState()
  return {
    id: opts.id,
    tipo,
    clave: claveDePartido(tipo, carrera),
    ...(posicionEfectiva ? { posicionEfectiva } : {}),
    matchState,
    situacion: getSituacionForTurn(1, jugador, posicionEfectiva, matchState.totalTurnos, []),
    contexto: buildMatchContext(tipo, carrera, row.nationality),
  }
}

// Resuelve un turno: dado en el servidor, escalada de tarjetas y siguiente
// situación. Devuelve el partido actualizado (o terminado).
export function resolverTurno(
  partido: PartidoEnCurso,
  jugador: Player,
  opcionId: string,
  random: () => number = Math.random,
): { partido: PartidoEnCurso; respuesta: Omit<RespuestaTurno, "guardado"> } | { error: string } {
  const { situacion, matchState } = partido
  const opcion = situacion.opciones.find((o) => o.id === opcionId)
  if (!opcion) return { error: "invalid_option" }

  const roll = Math.floor(random() * 20) + 1
  const raw = resolveDecisionWithDice(opcion, jugador, situacion, roll, matchState.marcador, partido.posicionEfectiva)

  // Segunda amarilla del partido = roja (regla real del fútbol).
  let tarjeta = raw.tarjeta
  let tarjetasAmarillas = matchState.tarjetasAmarillas
  let expulsado = matchState.expulsado
  if (tarjeta === "amarilla") {
    if (tarjetasAmarillas >= 1) {
      tarjeta = "roja"
      expulsado = true
    } else {
      tarjetasAmarillas += 1
    }
  } else if (tarjeta === "roja") {
    expulsado = true
  }
  const result: TurnResult = { ...raw, tarjeta }

  const recientes = [...matchState.situacionesRecientes, situacion.id].slice(-3)
  const finished = matchState.turno >= matchState.totalTurnos
  const nuevoEstado: InteractiveMatchState = {
    ...matchState,
    turno: finished ? matchState.turno : matchState.turno + 1,
    marcador: result.marcador,
    valoracion: parseFloat(Math.max(1, Math.min(10, matchState.valoracion + result.valoracionDelta)).toFixed(1)),
    goles: matchState.goles + (result.gol ? 1 : 0),
    asistencias: matchState.asistencias + (result.asistencia ? 1 : 0),
    tiros: matchState.tiros + (situacion.esOportunidadGol ? 1 : 0),
    log: [...matchState.log, result],
    tarjetasAmarillas,
    expulsado,
    situacionesRecientes: recientes,
  }

  const siguiente = finished
    ? null
    : getSituacionForTurn(nuevoEstado.turno, jugador, partido.posicionEfectiva, nuevoEstado.totalTurnos, recientes)

  return {
    partido: { ...partido, matchState: nuevoEstado, situacion: siguiente ?? situacion },
    respuesta: {
      matchId: partido.id,
      turno: matchState.turno,
      roll,
      result,
      matchState: nuevoEstado,
      situacion: siguiente,
      finished,
    },
  }
}

// Juega los turnos que falten eligiendo la opción con mejor stat. Lo usa el
// modo "Simulado" cuando se encuentra un partido interactivo a medias.
export function completarAutomatico(partido: PartidoEnCurso, jugador: Player): PartidoEnCurso {
  let actual = partido
  for (let i = 0; i < 20; i++) {
    const mejor = [...actual.situacion.opciones].sort(
      (a, b) => resolveStatValue(b.statPrincipal, jugador) * b.pesoStat - resolveStatValue(a.statPrincipal, jugador) * a.pesoStat,
    )[0]
    const r = resolverTurno(actual, jugador, mejor.id)
    if ("error" in r) break
    actual = r.partido
    if (r.respuesta.finished) break
  }
  return actual
}

// Cuerpo de guardado a partir del partido terminado. Todo sale del estado
// del servidor: el cliente no aporta ninguna cifra.
export function cuerpoDeGuardado(partido: PartidoEnCurso, jugador: Player): MatchSaveBody {
  const m = partido.matchState
  const fatigaGanada = jugador.traits.includes("fisico_excepcional") ? 20 * 0.75 : 20
  return {
    tipo: partido.tipo,
    matchId: partido.id,
    matchStats: {
      goles: m.goles,
      asistencias: m.asistencias,
      valoracion: m.valoracion,
      marcador: `${m.marcador.local}-${m.marcador.visitante}`,
      tarjetasAmarillas: m.tarjetasAmarillas,
      tarjetasRojas: m.log.filter((r) => r.tarjeta === "roja").length,
    },
    expulsado: m.expulsado,
    updatedState: { fatiga: Math.min(100, jugador.estado.fatiga + fatigaGanada) },
  }
}
