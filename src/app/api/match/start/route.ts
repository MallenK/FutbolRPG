import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { readJson } from "@/lib/http"
import { createId } from "@/lib/id"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { hayPartidoPendiente, TIPOS_PARTIDO, type TipoPartido } from "@/lib/match-validation"
import { iniciarPartido, mapDbPlayer, partidoVigente, type PartidoEnCurso } from "@/lib/match-server"

// Empieza (o retoma) un partido interactivo. Si ya hay uno a medias del mismo
// partido se devuelve tal cual: recargar la página no sirve para volver a
// tirar los dados de una situación que salió mal.
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await readJson<{ tipo: string; posicion: string }>(req)
  const tipo = (body?.tipo ?? "liga") as TipoPartido
  if (!TIPOS_PARTIDO.includes(tipo)) return NextResponse.json({ error: "Invalid match type" }, { status: 400 })

  return mutatePlayerOr404<Response>(session.user.id, (row) => {
    const state = row.state as Record<string, unknown>
    const carrera = (state.carrera ?? {}) as Record<string, unknown>
    const jugador = mapDbPlayer(row)
    const actual = carrera.partidoEnCurso as PartidoEnCurso | null | undefined

    const respuesta = (p: PartidoEnCurso, retomado: boolean) =>
      NextResponse.json({
        matchId: p.id,
        retomado,
        contexto: p.contexto,
        matchState: p.matchState,
        situacion: p.situacion,
        posicionEfectiva: p.posicionEfectiva ?? null,
        jugador,
      })

    if (partidoVigente(actual, carrera)) {
      if (actual.tipo !== tipo) {
        // Hay otro partido a medias: primero hay que terminar ese.
        return {
          result: NextResponse.json(
            { error: "match_in_progress", tipo: actual.tipo, message: "Tienes otro partido a medias." },
            { status: 409 },
          ),
        }
      }
      return { result: respuesta(actual, true) }
    }

    if (!hayPartidoPendiente(tipo, carrera)) {
      return { result: NextResponse.json({ error: "no_pending_match", message: "No hay ningún partido pendiente de ese tipo." }, { status: 409 }) }
    }

    const sancion = carrera.sancion as { partidosRestantes?: number } | undefined
    if (tipo === "liga" && (sancion?.partidosRestantes ?? 0) > 0) {
      return { result: NextResponse.json({ error: "sancionado", message: "Estás sancionado para este partido de liga." }, { status: 409 }) }
    }

    const partido = iniciarPartido(row, tipo, { id: createId(), jugarSecundaria: body?.posicion === "secundaria" })
    return {
      state: { ...state, carrera: { ...carrera, partidoEnCurso: partido } },
      result: respuesta(partido, false),
    }
  })
}
