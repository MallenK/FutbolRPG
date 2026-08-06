import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activityLog, player } from "@/lib/schema"
import { desc, eq, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  const rows = await db
    .select({ activityLog })
    .from(activityLog)
    .innerJoin(player, eq(activityLog.userId, player.userId))
    .where(sql`(${player.state}->'preferencias'->>'ocultoEnActividad')::boolean IS NOT TRUE`)
    .orderBy(desc(activityLog.createdAt))
    .limit(50)

  const entries = rows.map((r) => r.activityLog)

  return NextResponse.json({ entries })
}
