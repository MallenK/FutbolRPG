import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player, user } from "@/lib/schema"
import { eq, sql } from "drizzle-orm"
import { calcularGloria, type SeasonHistoryEntry } from "@/lib/world"
import { requireRealAccount } from "@/lib/session"

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

// "gloria" no es un campo escalar simple del jsonb (hay que reducir el array
// historialTemporadas con pesos), así que para esa categoría no se puede
// ordenar en SQL como las demás: se trae un lote más amplio, se calcula y
// ordena en JS, y se recorta a 50 después. Para las demás categorías se sigue
// ordenando en SQL como antes (más barato, y no hace falta cambiarlo).
const GLORIA_FETCH_LIMIT = 500

export async function GET(req: Request) {
  const { error } = await requireRealAccount()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category") ?? "gloria"

  const baseQuery = db
    .select({
      playerId: player.id,
      playerName: player.name,
      userName: user.name,
      position: player.position,
      state: player.state,
    })
    .from(player)
    .innerJoin(user, eq(player.userId, user.id))

  const rows = category === "gloria"
    ? await baseQuery.limit(GLORIA_FETCH_LIMIT)
    : await baseQuery
        .orderBy(
          category === "reputation"
            ? sql`(${player.state}->'carrera'->>'reputacion')::int DESC NULLS LAST`
            : category === "seasons"
              ? sql`(${player.state}->'carrera'->>'temporada')::int DESC NULLS LAST`
              : sql`(${player.state}->>'level')::int DESC NULLS LAST`,
        )
        .limit(50)

  let entries: Omit<LeaderboardEntry, "rank">[] = rows
    .filter((r) => {
      const state = r.state as Record<string, unknown>
      const preferencias = (state?.preferencias ?? {}) as Record<string, unknown>
      return preferencias.ocultoEnRanking !== true
    })
    .map((r) => {
      const state = r.state as Record<string, unknown>
      const carrera = (state?.carrera ?? {}) as Record<string, unknown>
      const statsTemporada = (carrera?.estadisticasTemporada ?? {}) as Record<string, number>
      const statsCarrera = (carrera?.estadisticasCarrera ?? {}) as Record<string, number>
      const historial = (carrera?.historialTemporadas ?? []) as SeasonHistoryEntry[]
      const reputacion = (carrera?.reputacion as number) ?? 0
      const seleccion = carrera?.seleccion as { capas?: number; golesSeleccion?: number } | undefined
      // Goles de carrera = temporadas ya cerradas (acumulado) + la temporada en curso
      // (todavía no volcada al acumulado) — ver informe-fallos.md B1.
      const golesCarrera = (statsCarrera?.goles ?? 0) + (statsTemporada?.goles ?? 0)
      return {
        playerId: r.playerId,
        playerName: r.playerName,
        userName: r.userName,
        position: r.position,
        club: (carrera?.club as string) ?? "—",
        level: (state?.level as number) ?? 1,
        reputation: reputacion,
        seasons: (carrera?.temporada as number) ?? 1,
        goals: golesCarrera,
        trophies: historial.reduce((n, t) => n + t.premios.length, 0),
        gloria: calcularGloria({
          historialTemporadas: historial,
          reputacion,
          seleccionCapas: seleccion?.capas ?? 0,
          seleccionGoles: seleccion?.golesSeleccion ?? 0,
        }),
      }
    })

  if (category === "gloria") {
    entries = entries.sort((a, b) => b.gloria - a.gloria).slice(0, 50)
  }

  return NextResponse.json({
    entries: entries.map((e, i): LeaderboardEntry => ({ ...e, rank: i + 1 })),
  })
}
