import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { performMatchSave, type MatchSaveBody } from "@/lib/match-save"

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = (await req.json()) as MatchSaveBody
  const result = await performMatchSave(session.user.id, body)
  return NextResponse.json(result.json, { status: result.status })
}
