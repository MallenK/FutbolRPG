import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { readJson } from "@/lib/http"
import { activityLog } from "@/lib/schema"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { completarEnCursoYCalcular, simularYCalcular } from "@/lib/match-save"

// Resuelve un partido entero de golpe con el simulador basado en atributos
// (src/engine/quick-sim.ts) en vez de jugarlo turno a turno. Usado por el
// modo de juego "decisivos" (ver season/page.tsx). Si ese mismo partido se
// había empezado por turnos, se termina desde donde estaba en vez de
// descartarlo: así no sirve para "repetir" un partido que iba mal.
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await readJson<{ tipo: string }>(req)
  const tipo = typeof body?.tipo === "string" ? body.tipo : "liga"

  return mutatePlayerOr404<Response>(session.user.id, async (row, tx) => {
    const carrera = ((row.state as Record<string, unknown>).carrera ?? {}) as Record<string, unknown>
    const enCurso = carrera.partidoEnCurso as { tipo?: string } | null | undefined
    const r = (enCurso?.tipo === tipo ? completarEnCursoYCalcular(row) : null) ?? simularYCalcular(row, tipo)
    if (!r.state || !r.activity) return { result: NextResponse.json(r.json, { status: r.status }) }
    await tx.insert(activityLog).values(r.activity)
    return { state: r.state, result: NextResponse.json(r.json, { status: r.status }) }
  })
}
