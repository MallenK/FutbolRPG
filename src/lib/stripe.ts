import Stripe from "stripe"

const secretKey = process.env.STRIPE_SECRET_KEY

export const stripe = secretKey ? new Stripe(secretKey) : null

// Precio del desbloqueo premium (pago único, de por vida). Cambiar aquí basta.
export const PREMIUM_PRICE_EUR_CENTS = 999 // 9,99 €
