import { defineConfig, devices } from "@playwright/test"

// Puerto propio, distinto del 3000 que suele usar `pnpm dev` en local, para
// poder correr los tests sin pisar un dev server que ya esté abierto — y con
// BETTER_AUTH_URL/NEXT_PUBLIC_BETTER_AUTH_URL fijados al mismo puerto: si no
// coinciden, Better Auth falla por CORS (gotcha ya documentado en
// .claude/context.md, Fase A de three.js).
const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // los tests crean/borran cuentas reales contra la misma base de datos
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // Generoso a propósito: el test de ciclo de vida completo encadena registro
  // (escritura real en Neon), 7 pasos de wizard, simular una temporada entera
  // y borrado de cuenta.
  timeout: 240_000,
  reporter: "list",
  // Default más generoso que los 5s de Playwright: cada paso escribe en Neon
  // (serverless, con posible arranque en frío).
  expect: { timeout: 20_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    // Build de producción, no `next dev`: bajo dev la primera visita a cada
    // ruta dispara su compilación on-demand (7s solo /season, la pantalla más
    // grande), y eso hacía fallar por timeout aserciones que no tenían nada
    // mal, solo llegaron antes que el compilador. Con `next build` el tiempo
    // se paga una vez al arrancar y la suite entera va varias veces más
    // rápida. `E2E_SKIP_BUILD=1` reutiliza el build anterior al iterar en local.
    command: process.env.E2E_SKIP_BUILD === "1"
      ? `npx next start -p ${PORT}`
      : `npx next build && npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // El build completo entra aquí: ~2 min la primera vez.
    timeout: 300_000,
    env: {
      BETTER_AUTH_URL: BASE_URL,
      NEXT_PUBLIC_BETTER_AUTH_URL: BASE_URL,
      // Modo test: sin emails reales (src/lib/email.ts) y sin límite de
      // peticiones de Better Auth (src/lib/auth.ts), que si no corta los
      // registros seguidos de la suite.
      E2E_TEST_MODE: "1",
    },
  },
})
