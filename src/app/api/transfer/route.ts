import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { readJson } from "@/lib/http"
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

  const body = await readJson<{ action: string }>(req)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  const { action } = body

  return mutatePlayerOr404<Response>(session.user.id, async (found, tx) => {

  const state = found.state as Record<string, unknown>
  const carrera = state.carrera as Record<string, unknown>
  const mercado = (carrera?.mercado as MercadoState | undefined) ?? { enLista: false, ofertasActivas: [], ultimaActualizacion: 0 }

  const reputacion = (carrera?.reputacion as number) ?? 10
  const divisionActual = (carrera?.divisionActual as number) ?? 3
  const currentClub = (carrera?.club as string) ?? ""
  const jornadaActual = (carrera?.jornadaActual as number) ?? 1
  const temporada = (carrera?.temporada as number) ?? 1

  // Una tanda de ofertas nuevas por jornada. Antes "Actualizar ofertas" se
  // podía pulsar sin límite hasta que saliera una oferta de primera división.
  const marca = `${temporada}-${jornadaActual}`
  if ((action === "requestTransfer" || action === "refreshOffers") && carrera?.mercadoRefrescadoEn === marca) {
    return NextResponse.json({
      success: false,
      limitado: true,
      message: "Ya has recibido las ofertas de esta jornada. Juega el siguiente partido para recibir nuevas.",
      mercado,
    }, { status: 429 })
  }

  if (action === "requestTransfer") {
    const newOffers = generateTransferOffers(reputacion, divisionActual, currentClub, jornadaActual)
    const newMercado: MercadoState = {
      enLista: true,
      ofertasActivas: [...mercado.ofertasActivas, ...newOffers],
      ultimaActualizacion: jornadaActual,
    }
    // Una tanda vacía (reputación baja) no gasta el refresco de la jornada.
    const newCarrera = { ...carrera, mercado: newMercado, ...(newOffers.length > 0 ? { mercadoRefrescadoEn: marca } : {}) }
    return { state: { ...state, carrera: newCarrera }, result: NextResponse.json({ success: true, mercado: newMercado }) }
  }

  if (action === "refreshOffers") {
    const newOffers = generateTransferOffers(reputacion, divisionActual, currentClub, jornadaActual)
    const newMercado: MercadoState = {
      ...mercado,
      ofertasActivas: newOffers,
      ultimaActualizacion: jornadaActual,
    }
    const newCarrera = { ...carrera, mercado: newMercado, ...(newOffers.length > 0 ? { mercadoRefrescadoEn: marca } : {}) }
    return { state: { ...state, carrera: newCarrera }, result: NextResponse.json({ success: true, mercado: newMercado }) }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  })
}
