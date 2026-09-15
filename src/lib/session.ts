import { auth } from "./auth"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

type SessionResult =
  | { session: Awaited<ReturnType<typeof auth.api.getSession>> & object; error: null }
  | { session: null; error: NextResponse }

export async function requireSession(): Promise<SessionResult> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  return { session, error: null }
}

// Como requireSession, pero además rechaza sesiones de invitado (plugin
// `anonymous`, ver auth.ts) -- para endpoints como ranking/actividad que
// solo deben ser visibles con una cuenta real creada.
export async function requireRealAccount(): Promise<SessionResult> {
  const { session, error } = await requireSession()
  if (error) return { session: null, error }
  if (session.user.isAnonymous) {
    return { session: null, error: NextResponse.json({ error: "Account required" }, { status: 401 }) }
  }
  return { session, error: null }
}
