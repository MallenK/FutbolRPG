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
  // (hasta 90s) y borrado de cuenta — todo contra `next dev`, que además
  // compila cada ruta la primera vez que se pide.
  timeout: 240_000,
  reporter: "list",
  // Default más generoso que los 5s de Playwright: bajo `next dev`, la
  // primera visita a cada ruta dispara su compilación on-demand, que puede
  // tardar varios segundos y hacer fallar por timeout una aserción que no
  // tiene nada mal, solo llegó pronto.
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
    command: `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      BETTER_AUTH_URL: BASE_URL,
      NEXT_PUBLIC_BETTER_AUTH_URL: BASE_URL,
    },
  },
})
