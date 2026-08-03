import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { transferListing, transferOffer } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { createId } from "@/lib/id"

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const { listingId } = await req.json()
  if (!listingId) return NextResponse.json({ error: "Missing listingId" }, { status: 400 })

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

  const listing = await db
    .select()
    .from(transferListing)
    .where(and(eq(transferListing.id, listingId), eq(transferListing.active, true)))
    .limit(1)

  if (listing.length === 0) return NextResponse.json({ error: "Listing not found" }, { status: 404 })
  if (listing[0].userId === session.user.id) {
    return NextResponse.json({ error: "Cannot offer on own listing" }, { status: 400 })
  }

  // Check for existing pending offer
  const existing = await db
    .select()
    .from(transferOffer)
    .where(and(
      eq(transferOffer.listingId, listingId),
      eq(transferOffer.fromUserId, session.user.id),
      eq(transferOffer.status, "pending"),
    ))
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json({ error: "Already offered" }, { status: 409 })
  }

  const state = found.state as Record<string, unknown>
  const carrera = (state?.carrera ?? {}) as Record<string, unknown>
  const fromClub = (carrera?.club as string) ?? "Equipo desconocido"

  await db.insert(transferOffer).values({
    id: createId(),
    listingId,
    fromUserId: session.user.id,
    fromPlayerName: found.name,
    fromClub,
    status: "pending",
  })

  return NextResponse.json({ success: true })
}
