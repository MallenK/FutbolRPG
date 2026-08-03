import { db } from "./db"
import { player } from "./schema"
import { eq } from "drizzle-orm"

export async function getPlayerByUserId(userId: string) {
  const rows = await db.select().from(player).where(eq(player.userId, userId))
  return rows[0] ?? null
}
