import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { transferListing, player } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { createId } from "@/lib/id"
import { mercadoLocked } from "@/lib/premium"

export async function POST() {
  const { session, error } = await requireSession()
  if (error) return error

  const isPremium = (session.user as { isPremium?: boolean }).isPremium ?? false
  if (mercadoLocked(isPremium)) {
    return NextResponse.json({ error: "premium_required", message: "El mercado de fichajes entre usuarios es una función Premium." }, { status: 402 })
  }

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const existing = await db
    .select()
    .from(transferListing)
    .where(eq(transferListing.userId, session.user.id))
    .limit(1)

  if (existing.length === 0) {
    // Create listing
    await db.insert(transferListing).values({
      id: createId(),
      playerId: found.id,
      userId: session.user.id,
      active: true,
    })
    return NextResponse.json({ active: true })
  }

  // Toggle existing
  const newActive = !existing[0].active
  await db
    .update(transferListing)
    .set({ active: newActive })
    .where(eq(transferListing.userId, session.user.id))

  return NextResponse.json({ active: newActive })
}
