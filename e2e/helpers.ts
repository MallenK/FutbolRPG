import { expect, type Page } from "@playwright/test"

export const PASSWORD = "TestPass123!"

export type TestAccount = { email: string; name: string; playerId?: string }

// Registro por la UI real (así se prueba también el formulario). Termina en
// /create-player, igual que un usuario nuevo.
export async function registrar(page: Page, prefijo: string): Promise<TestAccount> {
  const suffix = `${Date.now()}`.slice(-8) + Math.floor(Math.random() * 100)
  const email = `e2e-${prefijo}-${suffix}@example.com`
  const name = `E2E ${prefijo} ${suffix}`
  await page.goto("/register")
  await page.locator('input[type="text"]').fill(name)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.getByRole("button", { name: "Crear cuenta" }).click()
  await expect(page).toHaveURL(/\/create-player/, { timeout: 45_000 })
  return { email, name }
}

// Alta de personaje directa por API (el asistente de 7 pasos ya lo cubre
// career-lifecycle.spec.ts). Usa el mismo contrato que create-player/page.tsx.
export async function crearJugador(
  page: Page,
  opts: { modoJuego?: "completo" | "decisivos" | "simulado"; extra?: Record<string, unknown> } = {},
): Promise<string> {
  const res = await page.request.post("/api/player", {
    data: {
      name: "E2E Jugador",
      position: "ST",
      nationality: "España",
      divisionInicial: 3,
      extraPoints: { tiro: 10, regate: 10, velocidad: 10 },
      modoJuego: opts.modoJuego ?? "completo",
      rpg: { origen: "academia", piernaDominante: "derecho", traits: ["alto_potencial", "goleador_nato"], age: 20, dorsal: 9 },
      ...opts.extra,
    },
  })
  expect(res.status(), await res.text()).toBe(200)
  const { playerId } = await res.json()
  expect(playerId).toBeTruthy()
  return playerId
}

export async function estadoJugador(page: Page) {
  const res = await page.request.get("/api/player")
  expect(res.ok()).toBe(true)
  const { player } = await res.json()
  return player as {
    id: string
    attributes: Record<string, Record<string, number>>
    state: Record<string, unknown> & { carrera: Record<string, unknown> }
  }
}

// Better Auth rechaza peticiones sin cabecera Origin (protección CSRF); el
// navegador la pone sola, page.request no.
function origen(page: Page): string {
  return page.url().startsWith("http") ? new URL(page.url()).origin : "http://localhost:3100"
}

// Limpieza: borra la cuenta de prueba con el endpoint de Better Auth que usa
// Ajustes. La base de datos es la real, no se deja basura.
export async function borrarCuenta(page: Page) {
  const origin = origen(page)
  const res = await page.request.post("/api/auth/delete-user", {
    data: { password: PASSWORD },
    headers: { Origin: origin },
  })
  // Soft: si la limpieza falla, que no tape el error real del test (se llama
  // desde un finally), pero que el test siga marcándose como fallido.
  expect.soft(res.ok(), `no se pudo borrar la cuenta de prueba: ${await res.text()}`).toBe(true)
}

// Recoge errores de JavaScript no capturados y errores de consola de la página.
export function vigilarErrores(page: Page) {
  const errores: string[] = []
  page.on("pageerror", (e) => errores.push(`pageerror: ${e.message}`))
  page.on("console", (msg) => {
    if (msg.type() !== "error") return
    const text = msg.text()
    // Ruido conocido e inofensivo: recursos 3D/analytics que no existen en local
    // y los 4xx que la propia app provoca a propósito en algunas pantallas.
    if (/Failed to load resource|_vercel\/insights|favicon|Download the React DevTools/i.test(text)) return
    errores.push(`console: ${text}`)
  })
  return errores
}

// Limpieza de una sesión de invitado (plugin `anonymous` de Better Auth).
export async function borrarInvitado(page: Page) {
  const res = await page.request.post("/api/auth/delete-anonymous-user", {
    data: {},
    headers: { Origin: origen(page) },
  })
  expect.soft(res.ok(), `no se pudo borrar el invitado: ${await res.text()}`).toBe(true)
}

// Juega un partido interactivo entero por la API (siempre la primera opción)
// y devuelve la respuesta del último turno.
export async function jugarPartidoPorApi(page: Page, tipo = "liga") {
  const start = await page.request.post("/api/match/start", { data: { tipo } })
  expect(start.status(), await start.text()).toBe(200)
  let { matchId, situacion, matchState } = await start.json()
  for (let i = 0; i < 20; i++) {
    const res = await page.request.post("/api/match/turn", {
      data: { matchId, turno: matchState.turno, opcionId: situacion.opciones[0].id },
    })
    expect(res.status(), await res.text()).toBe(200)
    const data = await res.json()
    if (data.finished) return data
    situacion = data.situacion
    matchState = data.matchState
  }
  throw new Error("el partido no terminó en 20 turnos")
}
