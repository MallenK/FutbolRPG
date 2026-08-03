import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player, user } from "@/lib/schema"
import { eq, sql, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"

type LeaderboardEntry = {
  rank: number
  playerName: string
  userName: string
  position: string
  club: string
  level: number
  reputation: number
  seasons: number
  goals: number
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category") ?? "level"

  const orderExpr =
    category === "reputation"
      ? sql`(${player.state}->'carrera'->>'reputacion')::int DESC NULLS LAST`
      : category === "seasons"
        ? sql`(${player.state}->'carrera'->>'temporada')::int DESC NULLS LAST`
        : sql`(${player.state}->>'level')::int DESC NULLS LAST`

  const rows = await db
    .select({
      playerName: player.name,
      userName: user.name,
      position: player.position,
      state: player.state,
    })
    .from(player)
    .innerJoin(user, eq(player.userId, user.id))
    .orderBy(orderExpr)
    .limit(50)

  const entries: LeaderboardEntry[] = rows.map((r, i) => {
    const state = r.state as Record<string, unknown>
    const carrera = (state?.carrera ?? {}) as Record<string, unknown>
    const stats = (carrera?.estadisticasTemporada ?? {}) as Record<string, number>
    return {
      rank: i + 1,
      playerName: r.playerName,
      userName: r.userName,
      position: r.position,
      club: (carrera?.club as string) ?? "—",
      level: (state?.level as number) ?? 1,
      reputation: (carrera?.reputacion as number) ?? 0,
      seasons: (carrera?.temporada as number) ?? 1,
      goals: (stats?.goles as number) ?? 0,
    }
  })

  return NextResponse.json({ entries })
}
