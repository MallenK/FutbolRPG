import { NextRequest, NextResponse } from "next/server"
import { transferListing, transferOffer, activityLog } from "@/lib/schema"
import { eq, and, ne } from "drizzle-orm"
import { requireRealAccount } from "@/lib/session"
import { readJson } from "@/lib/http"
import { createId } from "@/lib/id"
import { getPlayerByUserId, getUserContactByUserId } from "@/lib/players"
import { mutatePlayerOr404 } from "@/lib/player-store"
import { sendOfferAcceptedEmail, sendOfferRejectedEmail } from "@/lib/email"

type Aviso = { tipo: "accepted" | "rejected"; fromUserId: string; club?: string }

// Responder a una oferta del mercado entre usuarios. Todo lo que cambia
// (estado de la oferta, rechazo de las demás, anuncio, fichaje del jugador y
// entrada de actividad) va en una transacción con la fila del jugador
// bloqueada: dos clics seguidos, o aceptar dos ofertas a la vez, ya no pueden
// aplicar el fichaje dos veces ni dejar el mercado a medias.
export async function POST(req: NextRequest) {
  const { session, error } = await requireRealAccount()
  if (error) return error

  const body = await readJson<{ offerId: string; action: string }>(req)
  const { offerId, action } = body ?? {}
  if (typeof offerId !== "string" || (action !== "accept" && action !== "reject")) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  let aviso: Aviso | null = null

  const response = await mutatePlayerOr404<Response>(session.user.id, async (found, tx) => {
    const listing = await tx.select().from(transferListing).where(eq(transferListing.userId, session.user.id)).limit(1)
    if (listing.length === 0) return NextResponse.json({ error: "No listing found" }, { status: 404 })

    // Transición condicional pending → accepted/rejected: solo gana una petición.
    const claimed = await tx
      .update(transferOffer)
      .set({ status: action === "accept" ? "accepted" : "rejected" })
      .where(and(
        eq(transferOffer.id, offerId),
        eq(transferOffer.listingId, listing[0].id),
        eq(transferOffer.status, "pending"),
      ))
      .returning()
    const offer = claimed[0]
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 })

    if (action === "reject") {
      aviso = { tipo: "rejected", fromUserId: offer.fromUserId }
      return NextResponse.json({ success: true, action: "rejected" })
    }

    // ACCEPT: club, liga y división se leen en vivo del jugador que ofreció,
    // no del snapshot de la oferta (informe-fallos.md, Ronda 6, A3).
    const state = found.state as Record<string, unknown>
    const carrera = (state.carrera ?? {}) as Record<string, unknown>
    const previousClub = (carrera.club as string) ?? "—"
    const offererPlayer = await getPlayerByUserId(offer.fromUserId)
    const offererCarrera = (offererPlayer?.state as Record<string, unknown> | undefined)?.carrera as
      | Record<string, unknown>
      | undefined
    const newCarrera = {
      ...carrera,
      club: (offererCarrera?.club as string | undefined) ?? offer.fromClub,
      liga: (offererCarrera?.liga as string | undefined) ?? (carrera.liga as string | undefined),
      divisionActual: (offererCarrera?.divisionActual as number | undefined) ?? (carrera.divisionActual as number | undefined),
    }

    await tx.update(transferOffer)
      .set({ status: "rejected" })
      .where(and(
        eq(transferOffer.listingId, listing[0].id),
        eq(transferOffer.status, "pending"),
        ne(transferOffer.id, offerId),
      ))
    await tx.update(transferListing).set({ active: false }).where(eq(transferListing.id, listing[0].id))
    await tx.insert(activityLog).values({
      id: createId(),
      userId: session.user.id,
      playerName: found.name,
      playerPosition: found.position,
      clubName: newCarrera.club,
      eventType: "transfer",
      data: { fromClub: previousClub, toClub: newCarrera.club, offeredBy: offer.fromPlayerName },
    })

    aviso = { tipo: "accepted", fromUserId: offer.fromUserId, club: newCarrera.club }
    return {
      state: { ...state, carrera: newCarrera },
      result: NextResponse.json({ success: true, action: "accepted", newClub: newCarrera.club }),
    }
  })

  // Email fuera de la transacción: best-effort, un fallo no deshace el fichaje.
  const enviado = aviso as Aviso | null
  if (enviado) {
    try {
      const offerer = await getUserContactByUserId(enviado.fromUserId)
      if (offerer && !offerer.notificacionesOfertasDesactivadas) {
        const base = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000"
        if (enviado.tipo === "rejected") await sendOfferRejectedEmail(offerer.email, offerer.name, `${base}/mercado`)
        else await sendOfferAcceptedEmail(offerer.email, offerer.name, enviado.club ?? "", `${base}/dashboard`)
      }
    } catch (err) {
      console.error("[market/respond] fallo al enviar email de notificación", err)
    }
  }

  return response
}
