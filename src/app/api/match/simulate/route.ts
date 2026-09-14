import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { performMatchSave } from "@/lib/match-save"
import { simularResultadoPartido } from "@/engine/quick-sim"

// Resuelve un partido entero de golpe con el simulador basado en atributos
// (src/engine/quick-sim.ts) en vez de jugarlo turno a turno en /match. Usado
// por los modos de juego "decisivos" y "simulado" (ver season/page.tsx).
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const { tipo } = (await req.json()) as { tipo?: string }

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const state = found.state as Record<string, unknown>
  const forma = (state.forma as number) ?? 80
  const fatiga = (state.fatiga as number) ?? 0

  const sim = simularResultadoPartido(
    found.position,
    found.attributes as Parameters<typeof simularResultadoPartido>[1],
    forma,
    fatiga,
  )

  // "Físico Excepcional": misma reducción de fatiga acumulada que en /match/page.tsx.
  const traits = (state.traits as string[]) ?? []
  const fatigaGanada = traits.includes("fisico_excepcional") ? 20 * 0.75 : 20
  const newFatiga = Math.min(100, fatiga + fatigaGanada)

  const result = await performMatchSave(session.user.id, {
    tipo: tipo ?? "liga",
    ganado: sim.ganado,
    golesRival: sim.golesRival,
    expulsado: sim.expulsado,
    matchStats: sim.matchStats,
    updatedState: { fatiga: newFatiga },
  })

  return NextResponse.json(
    { ...result.json, simulado: true, matchStats: sim.matchStats, ganado: sim.ganado },
    { status: result.status },
  )
}
