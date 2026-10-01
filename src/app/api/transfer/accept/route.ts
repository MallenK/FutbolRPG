import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { readJson } from "@/lib/http"
import { generateContrato, type MercadoState } from "@/lib/world"

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await readJson<{ offerId: string; action: string }>(req)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  const { offerId, action } = body

  return mutatePlayerOr404<Response>(session.user.id, async (found, tx) => {

  const state = found.state as Record<string, unknown>
  const carrera = state.carrera as Record<string, unknown>
  const mercado = (carrera?.mercado as MercadoState | undefined) ?? { enLista: false, ofertasActivas: [], ultimaActualizacion: 0 }

  if (action === "reject") {
    const newMercado: MercadoState = {
      ...mercado,
      ofertasActivas: mercado.ofertasActivas.filter((o) => o.id !== offerId),
    }
    const newCarrera = { ...carrera, mercado: newMercado }
    return { state: { ...state, carrera: newCarrera }, result: NextResponse.json({ success: true, action: "rejected" }) }
  }

  if (action === "accept") {
    const offer = mercado.ofertasActivas.find((o) => o.id === offerId)
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 })
    // GET /api/transfer ya oculta las caducadas, pero la oferta seguía en el
    // estado y se podía aceptar igual (pestaña abierta o POST a mano).
    const jornadaActual = (carrera?.jornadaActual as number) ?? 1
    if (offer.expiraJornada < jornadaActual) {
      return NextResponse.json({ error: "offer_expired", message: "Esta oferta ya ha caducado." }, { status: 410 })
    }

    const newContrato = generateContrato(offer.division, (carrera?.reputacion as number) ?? 10)

    const newCarrera = {
      ...carrera,
      club: offer.club,
      liga: offer.liga,
      divisionActual: offer.division,
      rol: offer.rolOfrecido,
      contrato: newContrato,
      mercado: { enLista: false, ofertasActivas: [], ultimaActualizacion: 0 },
    }
    return { state: { ...state, carrera: newCarrera }, result: NextResponse.json({
      success: true,
      action: "accepted",
      transfer: { club: offer.club, liga: offer.liga, division: offer.division, rol: offer.rolOfrecido },
    }) }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  })
}
