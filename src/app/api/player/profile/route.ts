import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { readJson } from "@/lib/http"

const MODOS_JUEGO = ["completo", "decisivos", "simulado"]

type PreferenciasPatch = Partial<{
  reducirMovimiento: boolean
  ocultarAvisoMercado: boolean
  ocultoEnRanking: boolean
  ocultoEnActividad: boolean
  perfilPublicoOculto: boolean
  notificacionesOfertasDesactivadas: boolean
  sonidoDesactivado: boolean
}>

const PREFERENCIAS_VALIDAS = [
  "reducirMovimiento",
  "ocultarAvisoMercado",
  "ocultoEnRanking",
  "ocultoEnActividad",
  "perfilPublicoOculto",
  "notificacionesOfertasDesactivadas",
  "sonidoDesactivado",
] as const satisfies readonly (keyof PreferenciasPatch)[]

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await readJson<{
    apodo: unknown
    dorsal: unknown
    preferencias: unknown
    modoJuego: unknown
  }>(req)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  const { apodo, dorsal, preferencias, modoJuego } = body

  return mutatePlayerOr404<Response>(session.user.id, async (existing, tx) => {

  const state = { ...(existing.state as Record<string, unknown>) }

  if (typeof apodo === "string") {
    state.apodo = apodo.trim().slice(0, 30) || undefined
  }
  if (typeof dorsal === "number" && Number.isFinite(dorsal)) {
    state.dorsal = Math.max(1, Math.min(99, Math.round(dorsal)))
  }
  if (typeof preferencias === "object" && preferencias !== null) {
    // Lista blanca: antes cualquier clave del body acababa guardada en
    // player.state.preferencias.
    const patch: PreferenciasPatch = {}
    for (const key of PREFERENCIAS_VALIDAS) {
      const v = (preferencias as Record<string, unknown>)[key]
      if (typeof v === "boolean") patch[key] = v
    }
    state.preferencias = {
      ...(state.preferencias as Record<string, unknown> | undefined),
      ...patch,
    }
  }
  if (typeof modoJuego === "string" && MODOS_JUEGO.includes(modoJuego)) {
    state.carrera = { ...(state.carrera as Record<string, unknown>), modoJuego }
  }

  return { state, result: NextResponse.json({ success: true, state }) }
  })
}
