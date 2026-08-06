import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"

type PreferenciasPatch = Partial<{
  reducirMovimiento: boolean
  ocultarAvisoMercado: boolean
  ocultoEnRanking: boolean
  ocultoEnActividad: boolean
}>

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await req.json()
  const { apodo, dorsal, preferencias } = body as {
    apodo?: string
    dorsal?: number
    preferencias?: PreferenciasPatch
  }

  const existing = await getPlayerByUserId(session.user.id)
  if (!existing) {
    return NextResponse.json({ error: "No player found" }, { status: 404 })
  }

  const state = { ...(existing.state as Record<string, unknown>) }

  if (apodo !== undefined) {
    state.apodo = apodo.trim() || undefined
  }
  if (dorsal !== undefined) {
    state.dorsal = Math.max(1, Math.min(99, Math.round(dorsal)))
  }
  if (preferencias !== undefined) {
    state.preferencias = {
      ...(state.preferencias as Record<string, unknown> | undefined),
      ...preferencias,
    }
  }

  await db.update(player)
    .set({ state, updatedAt: new Date() })
    .where(eq(player.userId, session.user.id))

  return NextResponse.json({ success: true, state })
}
