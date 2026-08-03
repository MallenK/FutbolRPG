import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { transferListing, transferOffer, player, user } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export async function GET() {
  const { session, error } = await requireSession()
  if (error) return error

  // All active listings with player + user data
  const listings = await db
    .select({
      listingId: transferListing.id,
      listingUserId: transferListing.userId,
      active: transferListing.active,
      playerName: player.name,
      playerPosition: player.position,
      playerAge: player.age,
      playerState: player.state,
      userName: user.name,
    })
    .from(transferListing)
    .innerJoin(player, eq(transferListing.playerId, player.id))
    .innerJoin(user, eq(transferListing.userId, user.id))
    .where(eq(transferListing.active, true))

  // Pending offers I made (to know if I already offered on a listing)
  const myOffers = await db
    .select({ listingId: transferOffer.listingId, status: transferOffer.status })
    .from(transferOffer)
    .where(eq(transferOffer.fromUserId, session.user.id))

  const myOfferedListings = new Set(
    myOffers.filter((o) => o.status === "pending").map((o) => o.listingId)
  )

  const result = listings
    .filter((l) => l.listingUserId !== session.user.id)
    .map((l) => {
      const state = l.playerState as Record<string, unknown>
      const carrera = (state?.carrera ?? {}) as Record<string, unknown>
      const stats = (carrera?.estadisticasTemporada ?? {}) as Record<string, number>
      return {
        listingId: l.listingId,
        playerName: l.playerName,
        playerPosition: l.playerPosition,
        playerAge: l.playerAge,
        userName: l.userName,
        club: (carrera?.club as string) ?? "—",
        rol: (carrera?.rol as string) ?? "Reserva",
        level: (state?.level as number) ?? 1,
        reputation: (carrera?.reputacion as number) ?? 0,
        seasons: (carrera?.temporada as number) ?? 1,
        goals: (stats?.goles as number) ?? 0,
        hasOffered: myOfferedListings.has(l.listingId),
      }
    })

  // My listing status + pending offers I received
  const myListing = await db
    .select()
    .from(transferListing)
    .where(eq(transferListing.userId, session.user.id))
    .limit(1)

  let myOfferCount = 0
  let pendingOffers: typeof transferOffer.$inferSelect[] = []
  if (myListing.length > 0 && myListing[0].active) {
    pendingOffers = await db
      .select()
      .from(transferOffer)
      .where(and(
        eq(transferOffer.listingId, myListing[0].id),
        eq(transferOffer.status, "pending"),
      ))
    myOfferCount = pendingOffers.length
  }

  return NextResponse.json({
    listings: result,
    myListing: myListing[0] ?? null,
    pendingOffers,
    myOfferCount,
  })
}
