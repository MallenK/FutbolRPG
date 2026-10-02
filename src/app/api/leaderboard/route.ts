import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player, user } from "@/lib/schema"
import { and, eq, sql } from "drizzle-orm"
import { gloriaDeEstado } from "@/lib/gloria"
import { requireRealAccount } from "@/lib/session"
import type { SeasonHistoryEntry } from "@/lib/world"

export const dynamic = "force-dynamic"

type LeaderboardEntry = {
  rank: number
  playerId: string
  playerName: string
  userName: string
  position: string
  club: string
  level: number
  reputation: number
  seasons: number
  goals: number
  gloria: number
  trophies: number
}

const TOP = 50

// Cada categoría ordena en SQL sobre una expresión con índice propio (ver
// schema.ts). La gloria va precalculada en player.state.gloria desde
// lib/player-store.ts; antes se traían 500 filas sin orden y se ordenaban en
// memoria, así que con más de 500 jugadores el top 50 salía mal.
const ORDEN = {
  gloria: sql`(${player.state}->>'gloria')::int DESC NULLS LAST`,
  reputation: sql`(${player.state}->'carrera'->>'reputacion')::int DESC NULLS LAST`,
  seasons: sql`(${player.state}->'carrera'->>'temporada')::int DESC NULLS LAST`,
  level: sql`(${player.state}->>'level')::int DESC NULLS LAST`,
} as const

export async function GET(req: Request) {
  const { error } = await requireRealAccount()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const pedida = searchParams.get("category") ?? "gloria"
  const category = (pedida in ORDEN ? pedida : "gloria") as keyof typeof ORDEN

  // Los filtros van en SQL, antes del LIMIT: filtrar después (como antes)
  // dejaba el ranking con menos de 50 entradas si alguien del top estaba oculto.
  const rows = await db
    .select({
      playerId: player.id,
      playerName: player.name,
      userName: user.name,
      position: player.position,
      state: player.state,
    })
    .from(player)
    .innerJoin(user, eq(player.userId, user.id))
    .where(and(
      // Los invitados no pueden ver el ranking, así que tampoco aparecen en él.
      sql`${user.isAnonymous} IS NOT TRUE`,
      sql`(${player.state}->'preferencias'->>'ocultoEnRanking')::boolean IS NOT TRUE`,
    ))
    .orderBy(ORDEN[category], player.id)
    .limit(TOP)

  const entries = rows.map((r, i): LeaderboardEntry => {
    const state = r.state as Record<string, unknown>
    const carrera = (state?.carrera ?? {}) as Record<string, unknown>
    const statsTemporada = (carrera.estadisticasTemporada ?? {}) as Record<string, number>
    const statsCarrera = (carrera.estadisticasCarrera ?? {}) as Record<string, number>
    const historial = (carrera.historialTemporadas ?? []) as SeasonHistoryEntry[]
    return {
      rank: i + 1,
      playerId: r.playerId,
      playerName: r.playerName,
      userName: r.userName,
      position: r.position,
      club: (carrera.club as string) ?? "—",
      level: (state?.level as number) ?? 1,
      reputation: (carrera.reputacion as number) ?? 0,
      seasons: (carrera.temporada as number) ?? 1,
      // Goles de carrera = temporadas cerradas + la temporada en curso (B1).
      goals: (statsCarrera.goles ?? 0) + (statsTemporada.goles ?? 0),
      trophies: historial.reduce((n, t) => n + t.premios.length, 0),
      gloria: typeof state?.gloria === "number" ? state.gloria : gloriaDeEstado(state),
    }
  })

  return NextResponse.json({ entries })
}
