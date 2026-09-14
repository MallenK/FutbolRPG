import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { retirarJugador } from "@/lib/legado"

// Retiro manual (botón en Ajustes) -- a diferencia del retiro narrativo
// (season/event con evento "retiro_forzado"), este no exige ninguna edad
// mínima: el usuario puede cerrar su carrera actual cuando quiera y
// conservarla en su Legado antes de empezar una nueva.
export async function POST() {
  const { session, error } = await requireSession()
  if (error) return error

  const result = await retirarJugador(session.user.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })

  return NextResponse.json({ success: true })
}
