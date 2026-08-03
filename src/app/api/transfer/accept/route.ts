import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { generateContrato, type MercadoState } from "@/lib/world"

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const { offerId, action } = await req.json()

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const state = found.state as Record<string, unknown>
  const carrera = state.carrera as Record<string, unknown>
  const mercado = (carrera?.mercado as MercadoState | undefined) ?? { enLista: false, ofertasActivas: [], ultimaActualizacion: 0 }

  if (action === "reject") {
    const newMercado: MercadoState = {
      ...mercado,
      ofertasActivas: mercado.ofertasActivas.filter((o) => o.id !== offerId),
    }
    const newCarrera = { ...carrera, mercado: newMercado }
    await db.update(player).set({ state: { ...state, carrera: newCarrera }, updatedAt: new Date() }).where(eq(player.userId, session.user.id))
    return NextResponse.json({ success: true, action: "rejected" })
  }

  if (action === "accept") {
    const offer = mercado.ofertasActivas.find((o) => o.id === offerId)
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 })

    const newContrato = generateContrato(offer.division)

    const newCarrera = {
      ...carrera,
      club: offer.club,
      liga: offer.liga,
      divisionActual: offer.division,
      rol: offer.rolOfrecido,
      contrato: newContrato,
      mercado: { enLista: false, ofertasActivas: [], ultimaActualizacion: 0 },
    }
    await db.update(player).set({ state: { ...state, carrera: newCarrera }, updatedAt: new Date() }).where(eq(player.userId, session.user.id))
    return NextResponse.json({
      success: true,
      action: "accepted",
      transfer: { club: offer.club, liga: offer.liga, division: offer.division, rol: offer.rolOfrecido },
    })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
