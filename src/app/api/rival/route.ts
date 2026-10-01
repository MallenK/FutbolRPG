import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { getPlayerByUserId, getPlayerById, getComparableStats, isPerfilPublicoOculto } from "@/lib/players"
import { readJson } from "@/lib/http"

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

  const body = await readJson<{ rivalId: string | null }>(req)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  const rivalId = typeof body.rivalId === "string" ? body.rivalId : null

  return mutatePlayerOr404<Response>(session.user.id, async (me, tx) => {

  if (rivalId) {
    if (rivalId === me.id) {
      return NextResponse.json({ error: "No puedes marcarte a ti mismo como rival" }, { status: 400 })
    }
    const rival = await getPlayerById(rivalId)
    if (!rival) return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 })
  }

  const state = { ...(me.state as Record<string, unknown>), rivalId: rivalId ?? undefined }
  return { state, result: NextResponse.json({ success: true, rivalId: rivalId ?? null }) }
  })
}
