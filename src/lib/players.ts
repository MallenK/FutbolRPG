import { db } from "./db"
import { player, user } from "./schema"
import { eq } from "drizzle-orm"
import { calcularGloria, type SeasonHistoryEntry } from "./world"

export type ComparableStats = {
  playerId: string
  playerName: string
  apodo?: string
  position: string
  club: string
  level: number
  reputacion: number
  temporada: number
  golesTotales: number
  asistenciasTotales: number
  partidosTotales: number
  trofeos: number
  gloria: number
}

type PlayerRow = { id: string; name: string; position: string; state: unknown }

// Estadísticas "públicas" de un jugador, usadas tanto en /jugador/[id] como
// en la comparativa de rivalidades -- un único sitio para no repetir esta
// extracción cada vez que se necesita comparar a dos jugadores.
export function getComparableStats(row: PlayerRow): ComparableStats {
  const state = row.state as Record<string, unknown>
  const carrera = (state?.carrera ?? {}) as Record<string, unknown>
  const statsTemporada = (carrera?.estadisticasTemporada ?? {}) as Record<string, number>
  const statsCarrera = (carrera?.estadisticasCarrera ?? {}) as Record<string, number>
  const historial = (carrera?.historialTemporadas ?? []) as SeasonHistoryEntry[]
  const reputacion = (carrera?.reputacion as number) ?? 0
  const seleccion = carrera?.seleccion as { capas?: number; golesSeleccion?: number } | undefined

  return {
    playerId: row.id,
    playerName: row.name,
    apodo: state?.apodo as string | undefined,
    position: row.position,
    club: (carrera?.club as string) ?? "—",
    level: (state?.level as number) ?? 1,
    reputacion,
    temporada: (carrera?.temporada as number) ?? 1,
    golesTotales: (statsCarrera?.goles ?? 0) + (statsTemporada?.goles ?? 0),
    asistenciasTotales: (statsCarrera?.asistencias ?? 0) + (statsTemporada?.asistencias ?? 0),
    partidosTotales: (statsCarrera?.partidosJugados ?? 0) + (statsTemporada?.partidosJugados ?? 0),
    trofeos: historial.reduce((n, t) => n + t.premios.length, 0),
    gloria: calcularGloria({
      historialTemporadas: historial,
      reputacion,
      seleccionCapas: seleccion?.capas ?? 0,
      seleccionGoles: seleccion?.golesSeleccion ?? 0,
    }),
  }
}

export function isPerfilPublicoOculto(row: PlayerRow): boolean {
  const state = row.state as Record<string, unknown>
  const preferencias = (state?.preferencias ?? {}) as Record<string, unknown>
  return preferencias.perfilPublicoOculto === true
}

export async function getPlayerByUserId(userId: string) {
  const rows = await db.select().from(player).where(eq(player.userId, userId))
  return rows[0] ?? null
}

export async function getPlayerById(id: string) {
  const rows = await db.select().from(player).where(eq(player.id, id))
  return rows[0] ?? null
}

// Email + nombre + preferencias de notificación de un usuario, para las
// notificaciones de mercado (market/offer, market/respond). `preferencias`
// vive en player.state, no en la tabla user, de ahí el join.
export async function getUserContactByUserId(userId: string) {
  const rows = await db
    .select({ email: user.email, name: user.name, state: player.state })
    .from(user)
    .innerJoin(player, eq(player.userId, user.id))
    .where(eq(user.id, userId))
  const row = rows[0]
  if (!row) return null
  const preferencias = (row.state as Record<string, unknown> | null)?.preferencias as
    | { notificacionesOfertasDesactivadas?: boolean }
    | undefined
  return { email: row.email, name: row.name, notificacionesOfertasDesactivadas: preferencias?.notificacionesOfertasDesactivadas ?? false }
}
