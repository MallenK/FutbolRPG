import { db } from "@/lib/db"
import { player, activityLog } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { getPlayerByUserId } from "@/lib/players"
import { pickRandomEvent, type PlayerContext, type CareerEvent } from "@/engine/career-events"
import { createId } from "@/lib/id"
import {
  advanceCopa,
  advanceEuropaGrupo,
  advanceEuropaEliminatoria,
  advanceSeleccionParon,
  advanceSeleccionTorneoGrupo,
  advanceSeleccionTorneoEliminatoria,
  generateSeleccionParon,
  SELECCION_MIN_REPUTACION,
  SELECCION_MIN_DIVISION,
  type CopaState,
  type EuropaState,
  type SeleccionState,
} from "@/lib/world"

type SimpleMatch = { valoracion: number; goles: number; asistencias: number; marcador: string }
type Fixture = {
  jornada: number; rival: string; esLocal: boolean; jugado: boolean
  resultado: string | null; golesJugador: number; valoracion: number | null
}

type MatchStats = {
  goles?: number
  asistencias?: number
  valoracion: number
  marcador?: string
  tarjetasAmarillas?: number
  tarjetasRojas?: number
}

export type MatchSaveBody = {
  matchStats: MatchStats
  updatedState?: Record<string, unknown>
  tipo?: string
  ganado?: boolean
  golesRival?: number
  expulsado?: boolean
}

const calculateMatchXP = (stats: MatchStats): number => {
  const base = 100
  const goalBonus = (stats.goles ?? 0) * 60
  const assistBonus = (stats.asistencias ?? 0) * 30
  const ratingBonus = Math.round(((stats.valoracion ?? 6.0) - 5.0) * 25)
  return Math.max(50, base + goalBonus + assistBonus + ratingBonus)
}

// Toda la lógica de estado de "guardar un partido" (liga/copa/europa/selección):
// actualiza estadísticas, XP/nivel, sanciones, reputación, moral, y hace avanzar
// el bracket/grupo/torneo correspondiente. Se extrajo de api/match/save/route.ts
// para poder reutilizarla también desde api/match/simulate/route.ts (modo de
// juego "decisivos"/"simulado", ver ROADMAP) sin duplicar ~300 líneas.
export async function performMatchSave(userId: string, body: MatchSaveBody): Promise<{ status: number; json: Record<string, unknown> }> {
  const { matchStats, updatedState } = body
  const tipo: string = body.tipo ?? "liga"
  const ganado: boolean = body.ganado ?? false
  const expulsado: boolean = body.expulsado ?? false

  const found = await getPlayerByUserId(userId)
  if (!found) return { status: 404, json: { error: "No player found" } }

  const currentState = found.state as Record<string, unknown>
  const carrera = currentState.carrera as Record<string, unknown>
  const statsTemporada = carrera?.estadisticasTemporada as Record<string, number>

  if (!statsTemporada || typeof statsTemporada.partidosJugados !== "number") {
    return { status: 500, json: { error: "Invalid player state" } }
  }

  const newStats = {
    ...statsTemporada,
    partidosJugados: statsTemporada.partidosJugados + 1,
    goles: statsTemporada.goles + (matchStats.goles ?? 0),
    asistencias: statsTemporada.asistencias + (matchStats.asistencias ?? 0),
    tarjetasAmarillas: (statsTemporada.tarjetasAmarillas ?? 0) + (matchStats.tarjetasAmarillas ?? 0),
    tarjetasRojas: (statsTemporada.tarjetasRojas ?? 0) + (matchStats.tarjetasRojas ?? 0),
    valoracionMedia:
      statsTemporada.partidosJugados > 0
        ? ((statsTemporada.valoracionMedia * statsTemporada.partidosJugados) + matchStats.valoracion) /
          (statsTemporada.partidosJugados + 1)
        : matchStats.valoracion,
  }

  // Roja directa/segunda amarilla o 5 amarillas acumuladas en la temporada
  // (regla real de LaLiga) → sanción para el siguiente partido de liga. No se
  // interrumpe el partido en curso (el motor de turnos no tiene corte
  // anticipado) — ver FASE D en context.md. matchStats.tarjetasAmarillas es
  // 0 o 1 por partido (una segunda amarilla en el mismo partido ya se
  // convierte en roja antes de llegar aquí, ver match/page.tsx), así que el
  // total de temporada sube como mucho de 1 en 1 y nunca se salta un múltiplo de 5.
  const currentSancion = (carrera?.sancion as { partidosRestantes: number } | undefined) ?? { partidosRestantes: 0 }
  const cincoAmarillas = (matchStats.tarjetasAmarillas ?? 0) > 0 && newStats.tarjetasAmarillas % 5 === 0
  const newSancion = {
    partidosRestantes: currentSancion.partidosRestantes + (expulsado || cincoAmarillas ? 1 : 0),
  }

  const currentTraits = (currentState.traits as string[]) ?? []

  // XP and level. "Alto Potencial": +20% XP ganado por partido.
  const currentXP = (currentState.xp as number) ?? 0
  const currentLevel = (currentState.level as number) ?? 1
  const currentAttrPoints = (currentState.attributePoints as number) ?? 0
  const baseEarned = calculateMatchXP(matchStats)
  const earned = currentTraits.includes("alto_potencial") ? Math.round(baseEarned * 1.2) : baseEarned
  let newXP = currentXP + earned
  let newLevel = currentLevel
  let newAttrPoints = currentAttrPoints
  while (newXP >= newLevel * 400) {
    newXP -= newLevel * 400
    newLevel++
    newAttrPoints += 3
  }

  // Match history
  const ultimosPartidos = (carrera?.ultimosPartidos as SimpleMatch[]) ?? []
  const newMatch: SimpleMatch = {
    valoracion: matchStats.valoracion ?? 6.0,
    goles: matchStats.goles ?? 0,
    asistencias: matchStats.asistencias ?? 0,
    marcador: matchStats.marcador ?? "0-0",
  }
  const newUltimosPartidos = [...ultimosPartidos, newMatch].slice(-10)

  // Reputation bump
  const currentRep = (carrera?.reputacion as number) ?? 10
  const repGain = Math.round((matchStats.valoracion - 6.0) * 2)
  const newRep = Math.max(0, Math.min(100, currentRep + repGain))

  const updatedCarrera = ((updatedState as Record<string, unknown>)?.carrera as Record<string, unknown>) ?? {}

  // "Líder del Vestuario": +8 moral after every win
  const currentMoral = (currentState.moral as number) ?? 85
  const moralBonus = ganado && currentTraits.includes("lider_vestuario") ? 8 : 0
  const newMoral = Math.max(0, Math.min(100, currentMoral + moralBonus))

  // ── Liga: advance jornada and possibly generate an event ──────────────────
  let jornadaActual = (carrera?.jornadaActual as number) ?? 0
  let fixtures = (carrera?.fixtures as Fixture[]) ?? []
  let eventoActual = (carrera?.eventoActual as object | null) ?? null
  let eventosPendientes = (carrera?.eventosPendientes as object[]) ?? []
  let seleccion = (carrera?.seleccion as SeleccionState | undefined) ?? undefined

  if (tipo === "liga" && jornadaActual > 0 && jornadaActual <= 16) {
    fixtures = fixtures.map((f) =>
      f.jornada === jornadaActual
        ? {
            ...f,
            jugado: true,
            resultado: matchStats.marcador ?? "0-0",
            golesJugador: matchStats.goles ?? 0,
            valoracion: matchStats.valoracion ?? 6.0,
          }
        : f
    )
    jornadaActual = jornadaActual + 1

    // Parón internacional tras jornada 8
    if (jornadaActual === 9) {
      const division = (carrera?.divisionActual as number) ?? 3
      const rep = (carrera?.reputacion as number) ?? 0
      const existingSel = (carrera?.seleccion as SeleccionState | undefined)
      if (
        rep >= SELECCION_MIN_REPUTACION &&
        division >= SELECCION_MIN_DIVISION &&
        existingSel?.convocado &&
        !existingSel?.paron?.activo
      ) {
        const temporada = (carrera?.temporada as number) ?? 1
        const paron = generateSeleccionParon(temporada, found.nationality)
        seleccion = { ...(existingSel ?? { convocado: true, capas: 0, golesSeleccion: 0 }), paron }
      }
    }

    if (jornadaActual <= 16 && Math.random() < 0.55) {
      const division = (carrera?.divisionActual as number) ?? 3
      const resolvedIds = (carrera?.eventosResueltos as string[]) ?? []
      const ctx: PlayerContext = {
        position: found.position ?? undefined,
        role: (carrera?.rol as string) ?? undefined,
        reputacion: (carrera?.reputacion as number) ?? undefined,
        stats: (found.state as Record<string, unknown>)?.attributes as Record<string, number> | undefined,
      }

      // Ráfaga de eventos de carrera fuera del partido: en vez de uno solo,
      // se genera un lote de 2 a 6 eventos únicos que se irán mostrando uno
      // tras otro (ver eventosPendientes en season/event/route.ts) sin tener
      // que esperar al siguiente partido para ver el próximo.
      const burstSize = 2 + Math.floor(Math.random() * 5) // 2..6
      const excluded = [...resolvedIds]
      const burst: CareerEvent[] = []
      for (let i = 0; i < burstSize; i++) {
        const evento = pickRandomEvent(jornadaActual, division, excluded, ctx)
        if (burst.some((e) => e.id === evento.id)) break // pool agotado, no seguir repitiendo
        burst.push(evento)
        excluded.push(evento.id)
      }

      eventoActual = burst[0] ?? null
      eventosPendientes = burst.slice(1)
    }
  }

  // ── Copa del Rey: advance bracket ─────────────────────────────────────────
  let copa = (carrera?.copa as CopaState | undefined) ?? undefined
  if (tipo === "copa" && copa && !copa.eliminado && !copa.campeon) {
    copa = advanceCopa(copa, ganado, matchStats.marcador ?? "0-0")
  }

  // ── European competitions: advance group or knockout ──────────────────────
  let europa = (carrera?.europa as EuropaState | undefined) ?? undefined
  if (tipo === "europa" && europa) {
    const nextGroupMatch = europa.grupoPartidos.find((p) => !p.jugado)
    if (nextGroupMatch) {
      // matchStats.marcador siempre viene como "misGoles-golesRival" (ver match/page.tsx),
      // nunca depende de si jugabas en casa o fuera — no reordenar con esLocal aquí.
      const golesEquipo = parseInt((matchStats.marcador ?? "0-0").split("-")[0]) || 0
      const rivalGolesFromMarcador = parseInt((matchStats.marcador ?? "0-0").split("-")[1]) || 0
      const isEmpate = golesEquipo === rivalGolesFromMarcador
      europa = advanceEuropaGrupo(
        europa, nextGroupMatch.idx, ganado, isEmpate,
        golesEquipo, rivalGolesFromMarcador,
        matchStats.marcador ?? "0-0", matchStats.valoracion ?? 6.0,
      )
    } else if (europa.eliminatoria && !europa.eliminatoria.jugado) {
      europa = advanceEuropaEliminatoria(europa, ganado, matchStats.marcador ?? "0-0")
    }
  }

  // ── Selección Nacional ────────────────────────────────────────────────────
  const marcador = matchStats.marcador ?? "0-0"
  const golesJugador = matchStats.goles ?? 0
  const golesEquipoSel = parseInt(marcador.split("-")[0]) || 0
  const golesRivalSel = parseInt(marcador.split("-")[1]) || 0
  const empate = golesEquipoSel === golesRivalSel

  if (tipo === "seleccion" && seleccion?.paron?.activo) {
    const paron = advanceSeleccionParon(seleccion.paron, ganado, empate, marcador, golesJugador)
    seleccion = {
      ...seleccion,
      paron,
      capas: seleccion.capas + 1,
      golesSeleccion: seleccion.golesSeleccion + golesJugador,
    }
  } else if (tipo === "seleccion_torneo" && seleccion?.torneo) {
    const torneo = seleccion.torneo
    if (torneo.fase === "grupos") {
      const nextMatch = torneo.grupoPartidos.find((p) => !p.jugado)
      if (nextMatch) {
        const newTorneo = advanceSeleccionTorneoGrupo(
          torneo, nextMatch.idx, ganado, empate, marcador, golesJugador, found.nationality,
        )
        seleccion = {
          ...seleccion, torneo: newTorneo,
          capas: seleccion.capas + 1,
          golesSeleccion: seleccion.golesSeleccion + golesJugador,
        }
      }
    } else if (torneo.fase === "eliminatoria" && torneo.eliminatoria && !torneo.eliminatoria.jugado) {
      const newTorneo = advanceSeleccionTorneoEliminatoria(torneo, ganado, marcador, found.nationality)
      seleccion = {
        ...seleccion, torneo: newTorneo,
        capas: seleccion.capas + 1,
        golesSeleccion: seleccion.golesSeleccion + golesJugador,
      }
    }
  }

  const newCarrera = {
    ...carrera,
    ...updatedCarrera,
    estadisticasTemporada: newStats,
    ultimosPartidos: newUltimosPartidos,
    jornadaActual,
    fixtures,
    eventoActual,
    eventosPendientes,
    reputacion: newRep,
    sancion: newSancion,
    ...(copa !== undefined ? { copa } : {}),
    ...(europa !== undefined ? { europa } : {}),
    ...(seleccion !== undefined ? { seleccion } : {}),
  }

  const newState = {
    ...currentState,
    ...updatedState,
    xp: newXP,
    level: newLevel,
    attributePoints: newAttrPoints,
    moral: newMoral,
    carrera: newCarrera,
  }

  await db.update(player)
    .set({ state: newState, updatedAt: new Date() })
    .where(eq(player.userId, userId))

  const fixturaActual = tipo === "liga"
    ? (fixtures.find((f: Fixture) => f.jornada === (jornadaActual - 1)))
    : undefined
  const rival = fixturaActual?.rival ?? (tipo === "copa" ? (carrera?.copa as CopaState)?.rival : "Desconocido") ?? "Desconocido"

  await db.insert(activityLog).values({
    id: createId(),
    userId,
    playerName: found.name,
    playerPosition: found.position,
    clubName: (carrera?.club as string) ?? "—",
    eventType: "match",
    data: {
      goles: matchStats.goles ?? 0,
      asistencias: matchStats.asistencias ?? 0,
      valoracion: matchStats.valoracion ?? 6.0,
      marcador: matchStats.marcador ?? "0-0",
      rival,
      tipo,
      leveled: newLevel > currentLevel,
      newLevel,
    },
  })

  return {
    status: 200,
    json: {
      success: true,
      stats: newStats,
      xp: { earned, total: newXP, level: newLevel, leveled: newLevel > currentLevel },
      eventoGenerado: !!eventoActual,
    },
  }
}
