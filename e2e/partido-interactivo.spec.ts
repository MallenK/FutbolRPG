import { test, expect } from "@playwright/test"
import { registrar, crearJugador, estadoJugador, borrarCuenta, vigilarErrores } from "./helpers"

// Modo "completo": un partido de liga jugado turno a turno por la UI real
// (elegir acción → dado → resultado → siguiente turno) hasta la pantalla
// final, y comprobación de que el servidor guardó exactamente un partido con
// las mismas cifras que enseña la pantalla.
test("partido de liga turno a turno: la pantalla final coincide con lo guardado", async ({ page }) => {
  await registrar(page, "match")
  const errores = vigilarErrores(page)
  try {
    await crearJugador(page, { modoJuego: "completo" })
    expect((await page.request.post("/api/season/init")).ok()).toBe(true)

    await page.goto("/match?tipo=liga")
    const volver = page.getByRole("button", { name: "Volver a la temporada" })

    // El motor elige entre 5 y ~10 turnos; el límite solo evita un bucle infinito.
    const opciones = page.getByRole("button").filter({ hasText: "RIESGO" })
    for (let turno = 0; turno < 20; turno++) {
      // Tras el último turno la app pasa por "Guardando partido..." antes de
      // la pantalla final: hay que esperar a una de las dos, no mirar al instante.
      await expect(volver.or(opciones.first())).toBeVisible({ timeout: 30_000 })
      if (await volver.isVisible()) break
      await opciones.first().click()

      // Tras la animación del dado aparece el botón para seguir.
      const seguir = page.getByRole("button", { name: /Siguiente turno →|Ver resultado final →/ })
      await expect(seguir).toBeEnabled({ timeout: 30_000 })
      await seguir.click()

      // Tras el primer turno se recarga la página: el partido vive en el
      // servidor, así que se retoma en el turno 2 en vez de empezar de cero
      // (y no sirve para volver a tirar los dados de una jugada).
      if (turno === 0 && !(await volver.isVisible())) {
        await page.reload()
        await expect(page.getByText(/^2\/\d+$/)).toBeVisible({ timeout: 30_000 })
      }
    }

    await expect(volver).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/VICTORIA|EMPATE|DERROTA/)).toBeVisible()

    // Cifras que muestra la pantalla final (goles y asistencias).
    const cifras = page.locator(".grid-cols-3 p.text-3xl")
    const golesPantalla = Number(await cifras.nth(0).innerText())
    const asistPantalla = Number(await cifras.nth(2).innerText())

    const jugador = await estadoJugador(page)
    const carrera = jugador.state.carrera
    const stats = carrera.estadisticasTemporada as Record<string, number>
    expect(stats.partidosJugados).toBe(1)
    expect(stats.goles).toBe(golesPantalla)
    expect(stats.asistencias).toBe(asistPantalla)
    expect(carrera.jornadaActual).toBe(2)
    // El identificador del partido queda registrado (un reintento no
    // duplicaría) y ya no hay partido en curso.
    expect(typeof carrera.ultimoPartidoId).toBe("string")
    expect(carrera.partidoEnCurso).toBeNull()

    await volver.click()
    await expect(page).toHaveURL(/\/season/)

    expect(errores).toEqual([])
  } finally {
    await borrarCuenta(page)
  }
})
