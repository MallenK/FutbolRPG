import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId, getPlayerById, getComparableStats, isPerfilPublicoOculto } from "@/lib/players"

export async function GET() {
  const { session, error } = await requireSession()
  if (error) return error

  const me = await getPlayerByUserId(session.user.id)
  if (!me) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const state = me.state as Record<string, unknown>
  const rivalId = state?.rivalId as string | undefined
  if (!rivalId) return NextResponse.json({ rivalId: null, rival: null })

  const rival = await getPlayerById(rivalId)
  if (!rival || isPerfilPublicoOculto(rival)) {
    return NextResponse.json({ rivalId, rival: null })
  }

  return NextResponse.json({
    rivalId,
    rival: getComparableStats(rival),
    me: getComparableStats(me),
  })
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const { rivalId } = await req.json() as { rivalId: string | null }

  const me = await getPlayerByUserId(session.user.id)
  if (!me) return NextResponse.json({ error: "No player found" }, { status: 404 })

  if (rivalId) {
    if (rivalId === me.id) {
      return NextResponse.json({ error: "No puedes marcarte a ti mismo como rival" }, { status: 400 })
    }
    const rival = await getPlayerById(rivalId)
    if (!rival) return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 })
  }

  const state = { ...(me.state as Record<string, unknown>), rivalId: rivalId ?? undefined }
  await db.update(player)
    .set({ state, updatedAt: new Date() })
    .where(eq(player.userId, session.user.id))

  return NextResponse.json({ success: true, rivalId: rivalId ?? null })
}
