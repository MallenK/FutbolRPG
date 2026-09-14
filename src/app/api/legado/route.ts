import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { getLegadoByUserId } from "@/lib/legado"

export async function GET() {
  const { session, error } = await requireSession()
  if (error) return error

  const rows = await getLegadoByUserId(session.user.id)
  return NextResponse.json({ legado: rows })
}
