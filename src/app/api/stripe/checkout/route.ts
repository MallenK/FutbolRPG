import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { stripe, PREMIUM_PRICE_EUR_CENTS } from "@/lib/stripe"

export async function POST() {
  const { session, error } = await requireSession()
  if (error) return error

  if (!stripe) {
    return NextResponse.json({ error: "Pagos no configurados" }, { status: 503 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000"

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.user.email,
    client_reference_id: session.user.id,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "FutbolRPG Premium — desbloqueo de por vida" },
          unit_amount: PREMIUM_PRICE_EUR_CENTS,
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/dashboard?premium=success`,
    cancel_url: `${baseUrl}/dashboard?premium=cancelled`,
    metadata: { userId: session.user.id },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
