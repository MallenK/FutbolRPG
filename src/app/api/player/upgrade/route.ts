import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { readJson } from "@/lib/http"
import { STAT_BY_KEY, type StatKey } from "@/lib/player-config"

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await readJson<{ stat: string }>(req)
  const stat = typeof body?.stat === "string" ? body.stat : ""
  // Derivado de STAT_BY_KEY (los 25 stats reales) en vez de una lista aparte
  // mantenida a mano — una lista duplicada es justo lo que dejó 10 de los 25
  // stats (incluidos reflejos/colocacion/concentracion/salto, los principales
  // de portero) sin poder subirse nunca, en completo silencio para el jugador.
  const group = STAT_BY_KEY[stat as StatKey]?.group
  if (!group) return NextResponse.json({ error: "Invalid stat" }, { status: 400 })

  return mutatePlayerOr404<Response>(session.user.id, async (found, tx) => {

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

  return {
    attributes: newAttrs,
    state: { ...state, attributePoints: attributePoints - 1 },
    result: NextResponse.json({ success: true, stat, newValue: currentValue + 1 }),
  }
  })
}
