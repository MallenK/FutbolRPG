import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { user } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { stripe } from "@/lib/stripe"
import Stripe from "stripe"

// Fuente de verdad de si un pago se completó: SOLO este webhook marca isPremium.
// Nunca confiar en el redirect de vuelta del cliente (success_url) para esto.
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Pagos no configurados" }, { status: 503 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 })
  }

  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", webhookSecret)
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session
    const userId = checkoutSession.metadata?.userId ?? checkoutSession.client_reference_id
    if (userId) {
      await db.update(user)
        .set({
          isPremium: true,
          stripeCustomerId: typeof checkoutSession.customer === "string" ? checkoutSession.customer : undefined,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId))
    }
  }

  return NextResponse.json({ received: true })
}
