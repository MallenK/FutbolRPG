import { db } from "./db"
import { player, user } from "./schema"
import { eq } from "drizzle-orm"

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
