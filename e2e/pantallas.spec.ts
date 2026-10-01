import { test, expect } from "@playwright/test"
import { registrar, crearJugador, borrarCuenta, vigilarErrores } from "./helpers"

// Recorrido de humo por todas las pantallas de la app: cada una debe cargar
// sin errores de JavaScript, sin quedarse colgada en "Cargando" y sin mostrar
// un error. No sustituye a los flujos completos (career-lifecycle, partido),
// pero detecta en segundos una pantalla rota por un cambio en otra parte.

test("pantallas públicas cargan sin errores", async ({ page }) => {
  const errores = vigilarErrores(page)
  for (const ruta of ["/", "/login", "/register", "/forgot-password"]) {
    const res = await page.goto(ruta)
    expect(res?.status(), ruta).toBeLessThan(400)
    await expect(page.locator("body")).not.toContainText("Application error")
  }
  expect(errores).toEqual([])
})

test("pantallas privadas redirigen a login sin sesión", async ({ page }) => {
  for (const ruta of ["/dashboard", "/season", "/mercado", "/settings", "/legado"]) {
    await page.goto(ruta)
    await expect(page, ruta).toHaveURL(/\/login/, { timeout: 15_000 })
  }
})

test("con cuenta y jugador, todas las pantallas del juego cargan sin errores", async ({ page }) => {
  await registrar(page, "pantallas")
  const errores = vigilarErrores(page)
  try {
    const playerId = await crearJugador(page)
    expect((await page.request.post("/api/season/init")).ok()).toBe(true)

    const rutas: [string, RegExp | string][] = [
      ["/dashboard", "Ver temporada"],
      ["/season", /Jornada|Próximo partido/],
      ["/mercado", /Mercado/i],
      ["/leaderboard", "Gloria"],
      ["/settings", "Eliminar mi cuenta"],
      ["/legado", /Legado/i],
      [`/jugador/${playerId}`, "E2E Jugador"],
      [`/comparar/${playerId}`, /E2E Jugador|Comparar/i],
      ["/match?tipo=liga", /Minuto|Min\.|Turno|'/],
    ]

    for (const [ruta, texto] of rutas) {
      const res = await page.goto(ruta)
      expect(res?.status(), ruta).toBeLessThan(400)
      await expect(page.locator("body"), ruta).toContainText(texto, { timeout: 30_000 })
      await expect(page.locator("body"), ruta).not.toContainText("Application error")
      await expect(page.getByText(/^Cargando/).first(), ruta).toBeHidden({ timeout: 30_000 })
    }

    // /transfer y /feed se fusionaron en /mercado y /leaderboard (Ronda 8):
    // deben redirigir, no mostrar una pantalla vacía.
    await page.goto("/transfer")
    await expect(page).toHaveURL(/\/mercado/)
    await page.goto("/feed")
    await expect(page).toHaveURL(/\/leaderboard/)

    expect(errores).toEqual([])
  } finally {
    await borrarCuenta(page)
  }
})
