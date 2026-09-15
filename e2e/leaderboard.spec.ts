import { test, expect } from "@playwright/test"

// Ranking y actividad son las únicas páginas "sociales" de la app: no se
// pueden ver sin sesión, y una sesión de invitado (plugin `anonymous`, ver
// auth.ts) tampoco cuenta como "cuenta creada" -- solo una cuenta real la
// desbloquea. Cubre las dos rutas gateadas, sin crear ninguna cuenta (rápido,
// no puede quedar "flaky" por depender de un top 50 compartido).
test("ranking y actividad exigen cuenta real -- ni sin sesión ni como invitado", async ({ page }) => {
  // Sin sesión.
  await page.goto("/leaderboard")
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  await page.goto("/feed")
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

  // Como invitado tampoco (un único login: el plugin `anonymous` no permite
  // volver a entrar como invitado mientras ya hay una sesión de invitado activa).
  await page.goto("/login")
  await page.getByRole("button", { name: "Continuar como invitado" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  await page.goto("/leaderboard")
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  await page.goto("/feed")
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

  // Las APIs subyacentes también rechazan al invitado, no solo la UI (misma sesión).
  const leaderboardRes = await page.request.get("/api/leaderboard")
  expect(leaderboardRes.status()).toBe(401)
  const feedRes = await page.request.get("/api/feed")
  expect(feedRes.status()).toBe(401)
})

// Smoke test de la UI de pestañas del ranking, ya con una cuenta real (la
// única forma de llegar a verlo tras el cambio de arriba). Cubre la
// regresión más probable al tocar esta pantalla: que la pestaña activa
// dejara de reflejar `category`, o que cambiar de pestaña rompiera el fetch.
test("con cuenta real, el ranking muestra Gloria por defecto y cambia de categoría sin errores", async ({ page }) => {
  const suffix = String(Date.now()).slice(-8)
  const email = `e2e-lb-${suffix}@example.com`
  const password = "TestPass123!"

  await page.goto("/register")
  await page.locator('input[type="text"]').fill(`E2E LB ${suffix}`)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole("button", { name: "Crear cuenta" }).click()
  await expect(page).toHaveURL(/\/create-player/, { timeout: 45_000 })

  await page.goto("/leaderboard")
  const gloriaTab = page.getByRole("button", { name: "Gloria" })
  await expect(gloriaTab).toHaveClass(/bg-green-500/)

  const nivelTab = page.getByRole("button", { name: "Nivel" })
  await nivelTab.click()
  await expect(nivelTab).toHaveClass(/bg-green-500/)
  await expect(gloriaTab).not.toHaveClass(/bg-green-500/)

  // La tabla debe terminar en un estado válido (con entradas o el mensaje de
  // "aún no hay jugadores"), nunca colgada en "Cargando..." ni con un error.
  await expect(page.getByText("Cargando ranking...")).toBeHidden()
  await expect(page.locator("main")).not.toContainText("Error")

  // Limpieza: borrar la cuenta de prueba (no llegó a crear jugador, pero el
  // borrado de cuenta no depende de que exista uno).
  await page.goto("/settings")
  await page.getByPlaceholder("Confirma tu contraseña").fill(password)
  await page.getByLabel("Entiendo que esta acción no se puede deshacer").check()
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
})
