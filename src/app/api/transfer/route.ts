import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { generateTransferOffers, type MercadoState } from "@/lib/world"

// GET: return current transfer market state
export async function GET() {
  const { session, error } = await requireSession()
  if (error) return error

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const state = found.state as Record<string, unknown>
  const carrera = state.carrera as Record<string, unknown>
  const mercado = (carrera?.mercado as MercadoState | undefined) ?? { enLista: false, ofertasActivas: [], ultimaActualizacion: 0 }
  const jornadaActual = (carrera?.jornadaActual as number) ?? 1

  // Remove expired offers
  const validOffers = mercado.ofertasActivas.filter((o) => o.expiraJornada >= jornadaActual)

  return NextResponse.json({
    mercado: { ...mercado, ofertasActivas: validOffers },
    division: (carrera?.divisionActual as number) ?? 3,
    club: (carrera?.club as string) ?? "—",
    reputacion: (carrera?.reputacion as number) ?? 10,
  })
}

// POST: request transfer listing or refresh offers
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const { action } = await req.json()

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const state = found.state as Record<string, unknown>
  const carrera = state.carrera as Record<string, unknown>
  const mercado = (carrera?.mercado as MercadoState | undefined) ?? { enLista: false, ofertasActivas: [], ultimaActualizacion: 0 }

  const reputacion = (carrera?.reputacion as number) ?? 10
  const divisionActual = (carrera?.divisionActual as number) ?? 3
  const currentClub = (carrera?.club as string) ?? ""
  const jornadaActual = (carrera?.jornadaActual as number) ?? 1

  if (action === "requestTransfer") {
    const newOffers = generateTransferOffers(reputacion, divisionActual, currentClub, jornadaActual)
    const newMercado: MercadoState = {
      enLista: true,
      ofertasActivas: [...mercado.ofertasActivas, ...newOffers],
      ultimaActualizacion: jornadaActual,
    }
    const newCarrera = { ...carrera, mercado: newMercado }
    await db.update(player).set({ state: { ...state, carrera: newCarrera }, updatedAt: new Date() }).where(eq(player.userId, session.user.id))
    return NextResponse.json({ success: true, mercado: newMercado })
  }

  if (action === "refreshOffers") {
    const newOffers = generateTransferOffers(reputacion, divisionActual, currentClub, jornadaActual)
    const newMercado: MercadoState = {
      ...mercado,
      ofertasActivas: newOffers,
      ultimaActualizacion: jornadaActual,
    }
    const newCarrera = { ...carrera, mercado: newMercado }
    await db.update(player).set({ state: { ...state, carrera: newCarrera }, updatedAt: new Date() }).where(eq(player.userId, session.user.id))
    return NextResponse.json({ success: true, mercado: newMercado })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
