import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { STAT_BY_KEY, type StatKey } from "@/lib/player-config"

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const { stat } = await req.json()
  // Derivado de STAT_BY_KEY (los 25 stats reales) en vez de una lista aparte
  // mantenida a mano — una lista duplicada es justo lo que dejó 10 de los 25
  // stats (incluidos reflejos/colocacion/concentracion/salto, los principales
  // de portero) sin poder subirse nunca, en completo silencio para el jugador.
  const group = STAT_BY_KEY[stat as StatKey]?.group
  if (!group) return NextResponse.json({ error: "Invalid stat" }, { status: 400 })

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const state = found.state as Record<string, unknown>
  const attributePoints = (state.attributePoints as number) ?? 0
  if (attributePoints <= 0) return NextResponse.json({ error: "No attribute points" }, { status: 400 })

  const attrs = found.attributes as Record<string, Record<string, number>>
  const currentValue = attrs[group]?.[stat] ?? 0
  if (currentValue >= 99) return NextResponse.json({ error: "Stat at maximum" }, { status: 400 })

  const newAttrs = {
    ...attrs,
    [group]: { ...attrs[group], [stat]: currentValue + 1 },
  }

  await db.update(player)
    .set({
      attributes: newAttrs,
      state: { ...state, attributePoints: attributePoints - 1 },
      updatedAt: new Date(),
    })
    .where(eq(player.userId, session.user.id))

  return NextResponse.json({ success: true, stat, newValue: currentValue + 1 })
}
