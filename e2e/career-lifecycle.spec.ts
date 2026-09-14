import { test, expect } from "@playwright/test"

// Ciclo de vida completo de una cuenta real: registro → wizard de creación de
// personaje (7 pasos) → iniciar temporada → simularla de un click (modo
// "simulado", para no depender de jugar 16 jornadas interactivas turno a
// turno) → resumen de temporada → gloria visible en el dashboard → borrar la
// cuenta desde Ajustes (limpieza, para no dejar cuentas de prueba en la base
// de datos real contra la que corre este test).
//
// Cubre en un solo test, de extremo a extremo, la mayoría de los sistemas
// centrales del juego: auth, creación de personaje, motor de temporada,
// cierre de temporada (premios/ascenso-descenso/gloria) y borrado de cuenta.
test("registro, crear personaje, simular una temporada y ver el resumen", async ({ page }) => {
  const suffix = String(Date.now()).slice(-8)
  const email = `e2e-${suffix}@example.com`
  const password = "TestPass123!"

  // ── Registro ──────────────────────────────────────────────────────────────
  await page.goto("/register")
  await page.locator('input[type="text"]').fill(`E2E Tester ${suffix}`)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole("button", { name: "Crear cuenta" }).click()
  // Timeout generoso: el registro escribe en Neon (conexión serverless, puede
  // tener arranque en frío) y dispara el envío del email de verificación.
  await expect(page).toHaveURL(/\/create-player/, { timeout: 45_000 })

  // ── Wizard de creación (7 pasos) ─────────────────────────────────────────
  // Paso 1: Identidad — solo hace falta el nombre, el resto de defaults vale.
  await page.getByPlaceholder("Carlos").fill("E2E")
  await page.getByPlaceholder("García").fill(`Test${suffix}`)
  await page.getByRole("button", { name: "Siguiente →" }).click()

  // Pasos 2-6: Origen, Posición, Personalidad, Atributos, División — los
  // defaults del wizard son válidos, no hace falta tocar nada.
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "Siguiente →" }).click()
  }

  // Paso 7: Resumen — modo "Simulado" para poder cerrar la temporada de un
  // click en vez de jugar 16 jornadas turno a turno.
  await page.getByRole("button", { name: /Simulado/ }).click()

  const createPlayerResponse = page.waitForResponse(
    (res) => res.url().includes("/api/player") && res.request().method() === "POST",
  )
  await page.getByRole("button", { name: "Comenzar carrera →" }).click()
  const { playerId } = await (await createPlayerResponse).json()
  expect(playerId).toBeTruthy()

  await expect(page).toHaveURL(/\/dashboard/)

  // ── Temporada ─────────────────────────────────────────────────────────────
  await page.getByRole("button", { name: "Ver temporada →" }).click()
  await expect(page).toHaveURL(/\/season/)
  await page.getByRole("button", { name: "Iniciar temporada →" }).click()

  // Modo "simulado": un único botón resuelve toda la temporada (partidos +
  // eventos) y cierra automáticamente al terminar — puede tardar unos
  // segundos porque encadena hasta ~250 llamadas a /api/season/auto-advance.
  await page.getByRole("button", { name: /Simular temporada completa/ }).click()
  await expect(page.getByText("Resumen · Temporada 1")).toBeVisible({ timeout: 90_000 })

  // ── Gloria: el resumen debe haber calculado el score correctamente ────────
  // Se comprueba vía API (no en la lista del leaderboard, que solo muestra el
  // top 50 y no es fiable para localizar una cuenta de prueba recién creada
  // en una base de datos que también tiene cuentas reales).
  const compare = await page.request.get(`/api/comparar/${playerId}`)
  expect(compare.ok()).toBe(true)
  const compareData = await compare.json()
  expect(compareData.isSelf).toBe(true)
  expect(typeof compareData.me.gloria).toBe("number")
  expect(compareData.me.gloria).toBeGreaterThanOrEqual(0)
  // Tras cerrar la temporada 1, la carrera ya debería estar en la 2.
  expect(compareData.me.temporada).toBeGreaterThanOrEqual(2)

  // El dashboard debe reflejar el mismo número de gloria (badge "🏆 N de gloria").
  await page.goto("/dashboard")
  await expect(page.getByText(`${compareData.me.gloria} de gloria`)).toBeVisible()

  // ── Limpieza: borrar la cuenta de prueba desde Ajustes ───────────────────
  await page.goto("/settings")
  await page.getByPlaceholder("Confirma tu contraseña").fill(password)
  await page.getByLabel("Entiendo que esta acción no se puede deshacer").check()
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click()
  // Navegación dura a "/" (ver comentario en settings/page.tsx), no a /login.
  await expect(page).toHaveURL(/\/$/)

  // La cuenta borrada ya no puede iniciar sesión.
  await page.goto("/login")
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole("button", { name: "Iniciar sesión" }).click()
  await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible()
})
