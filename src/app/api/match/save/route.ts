import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player, activityLog } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { pickRandomEvent, type PlayerContext } from "@/engine/career-events"
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

const calculateMatchXP = (stats: { goles: number; asistencias: number; valoracion: number }): number => {
  const base = 100
  const goalBonus = (stats.goles ?? 0) * 60
  const assistBonus = (stats.asistencias ?? 0) * 30
  const ratingBonus = Math.round(((stats.valoracion ?? 6.0) - 5.0) * 25)
  return Math.max(50, base + goalBonus + assistBonus + ratingBonus)
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await req.json()
  const { matchStats, updatedState } = body
  const tipo: string = body.tipo ?? "liga"
  const ganado: boolean = body.ganado ?? false
  const golesRival: number = body.golesRival ?? 0

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const currentState = found.state as Record<string, unknown>
  const carrera = currentState.carrera as Record<string, unknown>
  const statsTemporada = carrera?.estadisticasTemporada as Record<string, number>

  if (!statsTemporada || typeof statsTemporada.partidosJugados !== "number") {
    return NextResponse.json({ error: "Invalid player state" }, { status: 500 })
  }

  const newStats = {
    ...statsTemporada,
    partidosJugados: statsTemporada.partidosJugados + 1,
    goles: statsTemporada.goles + (matchStats.goles ?? 0),
    asistencias: statsTemporada.asistencias + (matchStats.asistencias ?? 0),
    valoracionMedia:
      statsTemporada.partidosJugados > 0
        ? ((statsTemporada.valoracionMedia * statsTemporada.partidosJugados) + matchStats.valoracion) /
          (statsTemporada.partidosJugados + 1)
        : matchStats.valoracion,
  }

  // XP and level
  const currentXP = (currentState.xp as number) ?? 0
  const currentLevel = (currentState.level as number) ?? 1
  const currentAttrPoints = (currentState.attributePoints as number) ?? 0
  const earned = calculateMatchXP(matchStats)
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
  const currentTraits = (currentState.traits as string[]) ?? []
  const currentMoral = (currentState.moral as number) ?? 85
  const moralBonus = ganado && currentTraits.includes("lider_vestuario") ? 8 : 0
  const newMoral = Math.max(0, Math.min(100, currentMoral + moralBonus))

  // ── Liga: advance jornada and possibly generate an event ──────────────────
  let jornadaActual = (carrera?.jornadaActual as number) ?? 0
  let fixtures = (carrera?.fixtures as Fixture[]) ?? []
  let eventoActual = (carrera?.eventoActual as object | null) ?? null
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
        const paron = generateSeleccionParon(temporada)
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
      eventoActual = pickRandomEvent(jornadaActual, division, resolvedIds, ctx)
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
          torneo, nextMatch.idx, ganado, empate, marcador, golesJugador,
        )
        seleccion = {
          ...seleccion, torneo: newTorneo,
          capas: seleccion.capas + 1,
          golesSeleccion: seleccion.golesSeleccion + golesJugador,
        }
      }
    } else if (torneo.fase === "eliminatoria" && torneo.eliminatoria && !torneo.eliminatoria.jugado) {
      const newTorneo = advanceSeleccionTorneoEliminatoria(torneo, ganado, marcador)
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
    reputacion: newRep,
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
    .where(eq(player.userId, session.user.id))

  const fixturaActual = tipo === "liga"
    ? (fixtures.find((f: Fixture) => f.jornada === (jornadaActual - 1)))
    : undefined
  const rival = fixturaActual?.rival ?? (tipo === "copa" ? (carrera?.copa as CopaState)?.rival : "Desconocido") ?? "Desconocido"

  await db.insert(activityLog).values({
    id: createId(),
    userId: session.user.id,
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

  return NextResponse.json({
    success: true,
    stats: newStats,
    xp: { earned, total: newXP, level: newLevel, leveled: newLevel > currentLevel },
    eventoGenerado: !!eventoActual,
  })
}
