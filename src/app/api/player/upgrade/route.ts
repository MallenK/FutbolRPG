import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"

const STAT_GROUPS: Record<string, string> = {
  control: "tecnicos", pase: "tecnicos", tiro: "tecnicos", regate: "tecnicos", cabeceo: "tecnicos",
  resistencia: "fisicos", velocidad: "fisicos", aceleracion: "fisicos", fuerza: "fisicos",
  posicionamiento: "tacticos", vision: "tacticos", decisiones: "tacticos",
  disciplina: "mentales", confianza: "mentales", presion: "mentales",
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const { stat } = await req.json()
  const group = STAT_GROUPS[stat as string]
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
