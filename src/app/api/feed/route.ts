import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activityLog, player, user } from "@/lib/schema"
import { and, desc, eq, sql } from "drizzle-orm"
import { requireRealAccount } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET() {
  const { error } = await requireRealAccount()
  if (error) return error

  const rows = await db
    .select({ activityLog })
    .from(activityLog)
    .innerJoin(player, eq(activityLog.userId, player.userId))
    .innerJoin(user, eq(activityLog.userId, user.id))
    // Invitados fuera: no pueden ver la actividad, tampoco aparecen en ella.
    .where(and(
      sql`${user.isAnonymous} IS NOT TRUE`,
      sql`(${player.state}->'preferencias'->>'ocultoEnActividad')::boolean IS NOT TRUE`,
    ))
    .orderBy(desc(activityLog.createdAt))
    .limit(50)

  const entries = rows.map((r) => r.activityLog)

  return NextResponse.json({ entries })
}
