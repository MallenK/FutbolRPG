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
