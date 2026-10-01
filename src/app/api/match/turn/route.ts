import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { readJson } from "@/lib/http"
import { activityLog } from "@/lib/schema"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { calcularGuardadoPartido } from "@/lib/match-save"
import {
  cuerpoDeGuardado,
  mapDbPlayer,
  partidoVigente,
  resolverTurno,
  type PartidoEnCurso,
  type RespuestaTurno,
} from "@/lib/match-server"

// Resuelve un turno del partido interactivo en el servidor. El cliente solo
// dice qué opción eligió; el dado, el resultado y, en el último turno, el
// guardado del partido se calculan aquí.
//
// `turno` hace la petición idempotente: si llega repetida (red caída al
// volver la respuesta) se devuelve la respuesta ya guardada, sin volver a
// tirar el dado.
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await readJson<{ matchId: string; turno: number; opcionId: string }>(req)
  const { matchId, turno, opcionId } = body ?? {}
  if (typeof matchId !== "string" || typeof turno !== "number" || typeof opcionId !== "string") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  return mutatePlayerOr404<Response>(session.user.id, async (row, tx) => {
    const state = row.state as Record<string, unknown>
    const carrera = (state.carrera ?? {}) as Record<string, unknown>

    const previa = carrera.ultimoTurno as RespuestaTurno | undefined
    if (previa && previa.matchId === matchId && previa.turno === turno) {
      return { result: NextResponse.json({ ...previa, duplicate: true }) }
    }

    const partido = carrera.partidoEnCurso as PartidoEnCurso | null | undefined
    if (!partidoVigente(partido, carrera) || partido.id !== matchId) {
      return { result: NextResponse.json({ error: "no_match_in_progress", message: "Este partido ya no está en curso." }, { status: 409 }) }
    }
    if (partido.matchState.turno !== turno) {
      return { result: NextResponse.json({ error: "turn_mismatch", turnoActual: partido.matchState.turno }, { status: 409 }) }
    }

    const jugador = mapDbPlayer(row)
    const r = resolverTurno(partido, jugador, opcionId)
    if ("error" in r) return { result: NextResponse.json({ error: r.error }, { status: 400 }) }

    if (!r.respuesta.finished) {
      const respuesta: RespuestaTurno = r.respuesta
      return {
        state: { ...state, carrera: { ...carrera, partidoEnCurso: r.partido, ultimoTurno: respuesta } },
        result: NextResponse.json(respuesta),
      }
    }

    // Último turno: se guarda el partido con las cifras del propio servidor.
    const guardado = calcularGuardadoPartido(row, cuerpoDeGuardado(r.partido, jugador))
    if (!guardado.state || !guardado.activity) {
      return { result: NextResponse.json(guardado.json, { status: guardado.status }) }
    }
    await tx.insert(activityLog).values(guardado.activity)

    const respuesta: RespuestaTurno = { ...r.respuesta, guardado: guardado.json }
    const carreraGuardada = guardado.state.carrera as Record<string, unknown>
    return {
      state: {
        ...guardado.state,
        carrera: { ...carreraGuardada, partidoEnCurso: null, ultimoTurno: respuesta },
      },
      result: NextResponse.json(respuesta),
    }
  })
}
