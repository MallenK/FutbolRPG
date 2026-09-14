import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Sin dominio propio verificado en Resend, este remitente de sandbox funciona
// igual, solo que Resend puede limitar a quién se le puede enviar. Cambiar por
// un remitente en tu dominio (@futbolrpg.com...) en cuanto lo verifiques.
const FROM = process.env.EMAIL_FROM ?? "FutbolRPG <onboarding@resend.dev>"

function wrapper(title: string, bodyHtml: string, ctaText: string, ctaUrl: string) {
  return `
  <div style="background:#030712;padding:40px 20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;">
      <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 4px;">
        Futbol<span style="color:#4ade80;">RPG</span>
      </h1>
      <h2 style="color:#fff;font-size:18px;margin:24px 0 12px;">${title}</h2>
      <div style="color:#9ca3af;font-size:14px;line-height:1.6;">${bodyHtml}</div>
      <a href="${ctaUrl}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#22c55e;color:#000;font-weight:700;text-decoration:none;border-radius:10px;font-size:14px;">
        ${ctaText}
      </a>
      <p style="color:#4b5563;font-size:12px;margin-top:24px;">
        Si el botón no funciona, copia este enlace en tu navegador:<br/>
        <span style="word-break:break-all;">${ctaUrl}</span>
      </p>
    </div>
  </div>`
}

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY no configurada — no se envía "${subject}" a ${to}`)
    return
  }
  await resend.emails.send({ from: FROM, to, subject, html })
}

export async function sendVerificationEmail(to: string, name: string, url: string) {
  const html = wrapper(
    "Bienvenido a FutbolRPG ⚽",
    `Hola ${name}, gracias por crear tu cuenta. Confirma tu email para activarla del todo y empezar tu carrera de futbolista.`,
    "Confirmar mi email",
    url,
  )
  await send(to, "Confirma tu cuenta de FutbolRPG", html)
}

export async function sendResetPasswordEmail(to: string, name: string, url: string) {
  const html = wrapper(
    "Restablecer contraseña",
    `Hola ${name}, hemos recibido una solicitud para restablecer tu contraseña. Si no has sido tú, ignora este email — tu cuenta sigue segura.`,
    "Elegir nueva contraseña",
    url,
  )
  await send(to, "Restablece tu contraseña de FutbolRPG", html)
}

export async function sendOfferReceivedEmail(to: string, name: string, offererClub: string, url: string) {
  const html = wrapper(
    "Nueva oferta de fichaje 📩",
    `Hola ${name}, <strong>${offererClub}</strong> ha hecho una oferta por tu jugador. Entra al mercado para aceptarla o rechazarla.`,
    "Ver oferta",
    url,
  )
  await send(to, "Tienes una nueva oferta de fichaje — FutbolRPG", html)
}

export async function sendOfferAcceptedEmail(to: string, name: string, newClub: string, url: string) {
  const html = wrapper(
    "¡Fichaje confirmado! ✅",
    `Hola ${name}, tu oferta ha sido aceptada. El jugador se une a <strong>${newClub}</strong>.`,
    "Ver mi equipo",
    url,
  )
  await send(to, "Tu oferta de fichaje ha sido aceptada — FutbolRPG", html)
}

export async function sendOfferRejectedEmail(to: string, name: string, url: string) {
  const html = wrapper(
    "Oferta rechazada",
    `Hola ${name}, tu oferta de fichaje no ha sido aceptada esta vez. Sigue buscando en el mercado — seguro que encuentras a otro jugador.`,
    "Volver al mercado",
    url,
  )
  await send(to, "Tu oferta de fichaje ha sido rechazada — FutbolRPG", html)
}
