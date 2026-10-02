import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { seleccionLocked } from "@/lib/premium"
import { generateFixtures } from "@/lib/fixtures"
import {
  getRivales,
  generateCopaState,
  generateEuropaState,
  generateContrato,
  generateSeleccionTorneo,
  getTorneoTipo,
  type Division,
  type SeleccionState,
  type ContratoState,
} from "@/lib/world"

export async function POST() {
  const { session, error } = await requireSession()
  if (error) return error

  return mutatePlayerOr404<Response>(session.user.id, async (found, tx) => {

  const state = found.state as Record<string, unknown>
  const carrera = state.carrera as Record<string, unknown>

  // Already initialized — do not overwrite
  const jornadaActual = (carrera?.jornadaActual as number) ?? 0
  if (jornadaActual > 0) {
    return NextResponse.json({ success: true, alreadyInitialized: true })
  }

  const division = (carrera?.divisionActual as number) ?? 3
  const currentClub = (carrera?.club as string) ?? ""
  const rivals = getRivales(division, currentClub)

  const fixtures = generateFixtures(rivals)
  const copa = generateCopaState()
  const europa = generateEuropaState(division as Division)

  const temporada = (carrera?.temporada as number) ?? 1
  const reputacion = (carrera?.reputacion as number) ?? 10

  // Selección: bloqueada en el plan gratuito (ver lib/premium.ts) — el resto de
  // la lógica de elegibilidad (reputación/división) se mantiene sin tocar.
  const isPremium = (session.user as { isPremium?: boolean }).isPremium ?? false
  const existingSeleccion = (carrera?.seleccion as SeleccionState | undefined)
  const torneoTipo = getTorneoTipo(temporada)
  const torneoElegible = !seleccionLocked(isPremium) && reputacion >= 50 && division >= 3
  const newTorneo = torneoTipo && torneoElegible ? generateSeleccionTorneo(torneoTipo, found.nationality) : undefined
  const seleccion: SeleccionState = {
    convocado: !seleccionLocked(isPremium) && reputacion >= 35 && division >= 3,
    capas: existingSeleccion?.capas ?? 0,
    golesSeleccion: existingSeleccion?.golesSeleccion ?? 0,
    paron: undefined,
    ...(newTorneo ? { torneo: newTorneo } : { torneo: existingSeleccion?.torneo }),
  }

  // Contrato: keep existing or generate new
  const existingContrato = (carrera?.contrato as ContratoState | undefined)
  const contrato: ContratoState = existingContrato ?? generateContrato(division, reputacion)

  const newCarrera = {
    ...carrera,
    jornadaActual: 1,
    reputacion,
    fixtures,
    copa,
    europa,
    seleccion,
    contrato,
    eventoActual: null,
    eventosPendientes: [],
    premios: [],
    partidoEnCurso: null,
    ultimoTurno: null,
  }

  return { state: { ...state, carrera: newCarrera }, result: NextResponse.json({ success: true, fixtures }) }
  })
}
