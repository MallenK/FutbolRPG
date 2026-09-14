import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId, getPlayerById, getComparableStats, isPerfilPublicoOculto } from "@/lib/players"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id } = await params

  const me = await getPlayerByUserId(session.user.id)
  if (!me) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const isSelf = me.id === id
  const other = await getPlayerById(id)
  if (!other) return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 })

  const otherHidden = !isSelf && isPerfilPublicoOculto(other)

  const state = me.state as Record<string, unknown>
  const isRival = state?.rivalId === id

  return NextResponse.json({
    me: getComparableStats(me),
    other: otherHidden ? null : getComparableStats(other),
    otherHidden,
    isSelf,
    isRival,
  })
}
