import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { transferListing, transferOffer, player, activityLog } from "@/lib/schema"
import { eq, and, ne } from "drizzle-orm"
import { requireSession } from "@/lib/session"
import { getPlayerByUserId } from "@/lib/players"
import { createId } from "@/lib/id"

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const { offerId, action } = await req.json() as { offerId: string; action: "accept" | "reject" }
  if (!offerId || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const found = await getPlayerByUserId(session.user.id)
  if (!found) return NextResponse.json({ error: "No player found" }, { status: 404 })

  // Verify the offer belongs to MY listing
  const listing = await db
    .select()
    .from(transferListing)
    .where(eq(transferListing.userId, session.user.id))
    .limit(1)

  if (listing.length === 0) return NextResponse.json({ error: "No listing found" }, { status: 404 })

  const offer = await db
    .select()
    .from(transferOffer)
    .where(and(
      eq(transferOffer.id, offerId),
      eq(transferOffer.listingId, listing[0].id),
      eq(transferOffer.status, "pending"),
    ))
    .limit(1)

  if (offer.length === 0) return NextResponse.json({ error: "Offer not found" }, { status: 404 })

  if (action === "reject") {
    await db
      .update(transferOffer)
      .set({ status: "rejected" })
      .where(eq(transferOffer.id, offerId))

    return NextResponse.json({ success: true, action: "rejected" })
  }

  // ACCEPT: change club, close listing, reject all other offers
  const state = found.state as Record<string, unknown>
  const carrera = (state?.carrera ?? {}) as Record<string, unknown>
  const previousClub = (carrera?.club as string) ?? "—"

  const newCarrera = {
    ...carrera,
    club: offer[0].fromClub,
  }
  const newState = { ...state, carrera: newCarrera }

  await db.update(player)
    .set({ state: newState, updatedAt: new Date() })
    .where(eq(player.userId, session.user.id))

  await db.update(transferOffer)
    .set({ status: "accepted" })
    .where(eq(transferOffer.id, offerId))

  // Reject all other pending offers on this listing
  await db.update(transferOffer)
    .set({ status: "rejected" })
    .where(and(
      eq(transferOffer.listingId, listing[0].id),
      eq(transferOffer.status, "pending"),
      ne(transferOffer.id, offerId),
    ))

  // Deactivate listing
  await db.update(transferListing)
    .set({ active: false })
    .where(eq(transferListing.id, listing[0].id))

  // Log the transfer
  await db.insert(activityLog).values({
    id: createId(),
    userId: session.user.id,
    playerName: found.name,
    playerPosition: found.position,
    clubName: offer[0].fromClub,
    eventType: "transfer",
    data: {
      fromClub: previousClub,
      toClub: offer[0].fromClub,
      offeredBy: offer[0].fromPlayerName,
    },
  })

  return NextResponse.json({
    success: true,
    action: "accepted",
    newClub: offer[0].fromClub,
  })
}
