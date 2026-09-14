import { db } from "./db"
import { player, legado } from "./schema"
import { eq, desc } from "drizzle-orm"
import { createId } from "./id"
import { getPlayerByUserId } from "./players"
import type { SeasonHistoryEntry } from "./world"

// Retira permanentemente al jugador actual del usuario: archiva un resumen
// de la carrera completa en `legado` (sobrevive a que se borre `player`) y
// borra la fila de `player` para que pueda crear una carrera nueva desde
// /create-player. Se llama tanto desde el evento narrativo de retiro
// ("retiro_forzado" → opción "retirarse", ver season/event/route.ts) como
// desde el botón manual de Ajustes (api/legado/retirar).
export async function retirarJugador(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const found = await getPlayerByUserId(userId)
  if (!found) return { ok: false, error: "No player found" }

  const state = found.state as Record<string, unknown>
  const carrera = (state.carrera ?? {}) as Record<string, unknown>
  const statsTemporada = (carrera.estadisticasTemporada ?? {}) as Record<string, number>
  const statsCarrera = (carrera.estadisticasCarrera ?? {}) as Record<string, number>
  const historial = (carrera.historialTemporadas ?? []) as SeasonHistoryEntry[]

  const estadisticas = {
    partidosJugados: (statsCarrera.partidosJugados ?? 0) + (statsTemporada.partidosJugados ?? 0),
    goles: (statsCarrera.goles ?? 0) + (statsTemporada.goles ?? 0),
    asistencias: (statsCarrera.asistencias ?? 0) + (statsTemporada.asistencias ?? 0),
  }
  const premios = historial.flatMap((h) => h.premios)

  await db.insert(legado).values({
    id: createId(),
    userId,
    playerName: found.name,
    apodo: (state.apodo as string | undefined) ?? null,
    position: found.position,
    nationality: found.nationality,
    edadRetiro: found.age,
    temporadas: (carrera.temporada as number) ?? 1,
    clubFinal: (carrera.club as string) ?? "—",
    divisionFinal: (carrera.divisionActual as number) ?? 3,
    nivelFinal: (state.level as number) ?? 1,
    reputacionFinal: (carrera.reputacion as number) ?? 0,
    estadisticas,
    premios,
    historialTemporadas: historial,
  })

  await db.delete(player).where(eq(player.userId, userId))

  return { ok: true }
}

export async function getLegadoByUserId(userId: string) {
  return db.select().from(legado).where(eq(legado.userId, userId)).orderBy(desc(legado.retiradoEn))
}
