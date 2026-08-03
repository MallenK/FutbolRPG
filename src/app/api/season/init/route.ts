import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { player } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
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

type Fixture = {
  jornada: number
  rival: string
  esLocal: boolean
  jugado: boolean
  resultado: string | null
  golesJugador: number
  valoracion: number | null
}

function generateFixtures(rivals: string[]): Fixture[] {
  // 8 opponents × 2 (home + away) = 16 jornadas
  const opponents = rivals.slice(0, 8)
  const raw: Omit<Fixture, "jornada">[] = []
  for (const rival of opponents) {
    raw.push({ rival, esLocal: true,  jugado: false, resultado: null, golesJugador: 0, valoracion: null })
    raw.push({ rival, esLocal: false, jugado: false, resultado: null, golesJugador: 0, valoracion: null })
  }
  // shuffle so home/away legs are spread across the calendar
  raw.sort(() => Math.random() - 0.5)
  return raw.map((f, i) => ({ ...f, jornada: i + 1 }))
}

export async function POST() {
  const { session, error } = await requireSession()
  if (error) return error

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

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

  // Selección: keep existing caps/goals, generate tournament if tournament year and eligible
  const existingSeleccion = (carrera?.seleccion as SeleccionState | undefined)
  const torneoTipo = getTorneoTipo(temporada)
  const torneoElegible = reputacion >= 50 && division >= 3
  const newTorneo = torneoTipo && torneoElegible ? generateSeleccionTorneo(torneoTipo) : undefined
  const seleccion: SeleccionState = {
    convocado: reputacion >= 35 && division >= 3,
    capas: existingSeleccion?.capas ?? 0,
    golesSeleccion: existingSeleccion?.golesSeleccion ?? 0,
    paron: undefined,
    ...(newTorneo ? { torneo: newTorneo } : { torneo: existingSeleccion?.torneo }),
  }

  // Contrato: keep existing or generate new
  const existingContrato = (carrera?.contrato as ContratoState | undefined)
  const contrato: ContratoState = existingContrato ?? generateContrato(division)

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
    premios: [],
  }

  await db.update(player)
    .set({ state: { ...state, carrera: newCarrera }, updatedAt: new Date() })
    .where(eq(player.userId, session.user.id))

  return NextResponse.json({ success: true, fixtures })
}
