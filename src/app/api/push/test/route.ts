import { NextResponse } from "next/server"
import webpush from "web-push"
import { requireSession } from "@/lib/session"

// Prueba de notificaciones push: envía una notificación a la suscripción que
// manda el propio cliente. No se guarda nada en la BD (solo es una prueba).
export async function POST(req: Request) {
  const { error } = await requireSession()
  if (error) return error

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID no configurado" }, { status: 500 })
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", publicKey, privateKey)

  const { subscription } = await req.json().catch(() => ({}))
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 })
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: "FutbolRPG ⚽", body: "¡Las notificaciones push funcionan!", url: "/dashboard" })
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode ?? 500
    return NextResponse.json({ error: "Fallo al enviar", status }, { status: 502 })
  }
}
