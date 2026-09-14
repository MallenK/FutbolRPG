import { test, expect } from "@playwright/test"

// Smoke test independiente de cualquier cuenta: no crea ni borra nada, así
// que es rápido y no puede quedar "flaky" por depender de aparecer en un
// top 50 compartido con datos reales. Cubre la regresión más probable al
// tocar esta pantalla: que la pestaña activa dejara de reflejar `category`,
// o que cambiar de pestaña rompiera el fetch.
test("el ranking muestra Gloria por defecto y cambia de categoría sin errores", async ({ page }) => {
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
})
