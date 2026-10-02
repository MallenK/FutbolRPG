import { test, expect } from "@playwright/test"
import { PASSWORD, crearJugador, estadoJugador, borrarCuenta, borrarInvitado } from "./helpers"

// Invitados (plugin `anonymous` de Better Auth): pueden jugar su carrera pero
// no entran en lo social (ranking, actividad, mercado entre usuarios). Al
// crear una cuenta real desde la sesión de invitado conservan la carrera:
// antes Better Auth borraba el usuario anónimo y, en cascada, su jugador.
test("un invitado no entra en lo social y conserva su carrera al registrarse", async ({ page }) => {
  await page.goto("/login")
  await page.getByRole("button", { name: "Continuar como invitado" }).click()
  await expect(page).toHaveURL(/\/dashboard|\/create-player/, { timeout: 20_000 })

  let registrado = false
  try {
    const playerId = await crearJugador(page)
    expect((await page.request.post("/api/season/init")).ok()).toBe(true)
    expect((await page.request.post("/api/match/simulate", { data: { tipo: "liga" } })).ok()).toBe(true)

    // Lo social está cerrado para el invitado, en la API y en la pantalla.
    expect((await page.request.get("/api/market")).status()).toBe(401)
    expect((await page.request.post("/api/market/toggle")).status()).toBe(401)
    await page.goto("/mercado")
    await expect(page.getByText("Necesitas una cuenta para fichar con otros jugadores.")).toBeVisible()

    // Crear cuenta desde la misma sesión.
    const suffix = `${Date.now()}`.slice(-8)
    await page.goto("/register")
    await page.locator('input[type="text"]').fill(`E2E Invitado ${suffix}`)
    await page.locator('input[type="email"]').fill(`e2e-invitado-${suffix}@example.com`)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.getByRole("button", { name: "Crear cuenta" }).click()
    registrado = true
    // create-player redirige al dashboard si ya hay jugador: señal de que la
    // carrera sobrevivió al registro.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 })

    const jugador = await estadoJugador(page)
    expect(jugador.id).toBe(playerId)
    expect((jugador.state.carrera.estadisticasTemporada as Record<string, number>).partidosJugados).toBe(1)

    // Con cuenta real, lo social ya se abre.
    expect((await page.request.get("/api/leaderboard")).status()).toBe(200)
    expect((await page.request.get("/api/market")).status()).toBe(200)
  } finally {
    if (registrado) await borrarCuenta(page)
    else await borrarInvitado(page)
  }
})
