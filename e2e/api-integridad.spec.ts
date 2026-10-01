import { test, expect, request as pwRequest } from "@playwright/test"
import { registrar, crearJugador, estadoJugador, borrarCuenta } from "./helpers"

// El ranking es público y el motor de partido corre en el navegador, así que
// el servidor es la última línea de defensa. Cada test de este archivo
// intenta una de las trampas que antes funcionaban (ver informe-fallos.md,
// Ronda 9) y comprueba que ahora se rechaza o se recorta.

test("sin sesión: las rutas de juego y la narrativa IA responden 401", async ({ baseURL }) => {
  const anon = await pwRequest.newContext({ baseURL })
  for (const [method, url] of [
    ["post", "/api/ai/narrative"],
    ["post", "/api/match/start"],
    ["post", "/api/match/turn"],
    ["post", "/api/season/end"],
    ["get", "/api/player"],
  ] as const) {
    const res = await anon[method](url, { data: { type: "match" } })
    expect(res.status(), `${method.toUpperCase()} ${url}`).toBe(401)
  }
  await anon.dispose()
})

test("alta de personaje: el servidor recalcula atributos e ignora el estado enviado", async ({ page }) => {
  await registrar(page, "alta")
  try {
    // JSON malformado → 400, no 500.
    const malformado = await page.request.post("/api/player", {
      headers: { "Content-Type": "application/json" },
      data: "{esto no es json",
    })
    expect(malformado.status()).toBe(400)

    // Reparto por encima del presupuesto → 400.
    const pasado = await page.request.post("/api/player", {
      data: { name: "Tramposo", position: "ST", extraPoints: { tiro: 15, regate: 15, pase: 15 } },
    })
    expect(pasado.status()).toBe(400)

    // Atributos y estado inventados → se ignoran.
    await crearJugador(page, {
      extra: {
        attributes: { tecnicos: { tiro: 99, regate: 99 } },
        state: { level: 99, carrera: { historialTemporadas: [{ premios: ["Balón de Oro"] }] } },
      },
    })
    const jugador = await estadoJugador(page)
    expect(jugador.attributes.tecnicos.tiro).toBeLessThan(99)
    expect(jugador.state.level).toBe(1)
    expect(jugador.state.carrera.historialTemporadas).toEqual([])

    // El antiguo PUT que sobrescribía el estado entero ya no existe.
    const put = await page.request.put("/api/player", { data: { state: { level: 99 } } })
    expect(put.status()).toBe(405)
  } finally {
    await borrarCuenta(page)
  }
})

test("partido: el servidor tira el dado, los turnos son idempotentes y no se pueden inventar resultados", async ({ page }) => {
  await registrar(page, "partido")
  try {
    await crearJugador(page)

    // La antigua ruta que aceptaba estadísticas del cliente ya no existe.
    const antigua = await page.request.post("/api/match/save", {
      data: { tipo: "liga", matchStats: { goles: 999, valoracion: 10, marcador: "999-0" } },
    })
    expect(antigua.status()).toBe(404)

    // Sin temporada iniciada no hay partido que empezar.
    expect((await page.request.post("/api/match/start", { data: { tipo: "liga" } })).status()).toBe(409)

    // Cerrar la temporada sin haber jugado la liga → 409.
    expect((await page.request.post("/api/season/init")).ok()).toBe(true)
    expect((await page.request.post("/api/season/end")).status()).toBe(409)

    // Empezar dos veces devuelve el MISMO partido: recargar no sirve para
    // cambiar una situación que no gusta.
    const s1 = await (await page.request.post("/api/match/start", { data: { tipo: "liga" } })).json()
    const s2 = await (await page.request.post("/api/match/start", { data: { tipo: "liga" } })).json()
    expect(s2.matchId).toBe(s1.matchId)
    expect(s2.retomado).toBe(true)
    expect(s2.situacion.id).toBe(s1.situacion.id)

    // Opción inventada → 400. Turno equivocado → 409.
    const inventada = await page.request.post("/api/match/turn", { data: { matchId: s1.matchId, turno: 1, opcionId: "gol_seguro" } })
    expect(inventada.status()).toBe(400)
    const desfasado = await page.request.post("/api/match/turn", { data: { matchId: s1.matchId, turno: 5, opcionId: s1.situacion.opciones[0].id } })
    expect(desfasado.status()).toBe(409)

    // Primer turno, y su reintento: misma tirada, sin volver a tirar.
    const t1 = { matchId: s1.matchId, turno: 1, opcionId: s1.situacion.opciones[0].id }
    const r1 = await (await page.request.post("/api/match/turn", { data: t1 })).json()
    const r1bis = await (await page.request.post("/api/match/turn", { data: t1 })).json()
    expect(r1bis.duplicate).toBe(true)
    expect(r1bis.roll).toBe(r1.roll)
    expect(r1bis.matchState).toEqual(r1.matchState)

    // Terminar el partido y comprobar que lo guardado es lo que dijo el servidor.
    let ultimo = r1
    let matchState = r1.matchState
    let situacion = r1.situacion
    while (!ultimo.finished) {
      ultimo = await (await page.request.post("/api/match/turn", {
        data: { matchId: s1.matchId, turno: matchState.turno, opcionId: situacion.opciones[0].id },
      })).json()
      matchState = ultimo.matchState
      situacion = ultimo.situacion
    }
    expect(ultimo.guardado.success).toBe(true)

    const jugador = await estadoJugador(page)
    const carrera = jugador.state.carrera
    const stats = carrera.estadisticasTemporada as Record<string, number>
    expect(stats.partidosJugados).toBe(1)
    expect(stats.goles).toBe(ultimo.matchState.goles)
    expect(stats.asistencias).toBe(ultimo.matchState.asistencias)
    expect(carrera.jornadaActual).toBe(2)
    expect(carrera.partidoEnCurso).toBeNull()
    expect(jugador.state.gloria).toEqual(expect.any(Number))

    // Un turno más del partido ya terminado no suma nada.
    const tarde = await page.request.post("/api/match/turn", {
      data: { matchId: s1.matchId, turno: ultimo.turno + 1, opcionId: situacion?.opciones?.[0]?.id ?? "x" },
    })
    expect(tarde.status()).toBe(409)
    expect(((await estadoJugador(page)).state.carrera.estadisticasTemporada as Record<string, number>).partidosJugados).toBe(1)
  } finally {
    await borrarCuenta(page)
  }
})

test("concurrencia: peticiones simultáneas del mismo jugador no se pisan", async ({ page }) => {
  await registrar(page, "concurrencia")
  try {
    await crearJugador(page)
    expect((await page.request.post("/api/season/init")).ok()).toBe(true)

    // Cuatro simulaciones a la vez. Sin transacción, las cuatro leían el mismo
    // estado y solo sobrevivía una escritura aunque las cuatro respondían 200.
    const respuestas = await Promise.all(
      Array.from({ length: 4 }, () => page.request.post("/api/match/simulate", { data: { tipo: "liga" } })),
    )
    const ok = respuestas.filter((r) => r.status() === 200).length
    expect(ok).toBe(4)

    const carrera = (await estadoJugador(page)).state.carrera
    expect((carrera.estadisticasTemporada as Record<string, number>).partidosJugados).toBe(4)
    expect(carrera.jornadaActual).toBe(5)
    const jugados = (carrera.fixtures as { jugado: boolean }[]).filter((f) => f.jugado).length
    expect(jugados).toBe(4)
  } finally {
    await borrarCuenta(page)
  }
})

test("mercado NPC: una tanda de ofertas por jornada", async ({ page }) => {
  await registrar(page, "mercado")
  try {
    await crearJugador(page)
    expect((await page.request.post("/api/season/init")).ok()).toBe(true)

    // Con la reputación inicial (10) ningún club hace ofertas: pedirlas no
    // debe gastar la tanda de la jornada.
    const vacia = await page.request.post("/api/transfer", { data: { action: "requestTransfer" } })
    expect(vacia.status()).toBe(200)
    expect((await vacia.json()).mercado.ofertasActivas).toEqual([])

    // Simular partidos hasta pasar de reputación 20, el umbral de la primera
    // oferta de club (lib/world.ts, generateTransferOffers). El resultado de
    // cada partido lo decide el servidor, así que se juega hasta llegar.
    for (let i = 0; i < 16; i++) {
      const rep = (await estadoJugador(page)).state.carrera.reputacion as number
      if (rep >= 20) break
      expect((await page.request.post("/api/match/simulate", { data: { tipo: "liga" } })).status()).toBe(200)
    }
    const reputacion = (await estadoJugador(page)).state.carrera.reputacion as number
    test.skip(reputacion < 20, `la reputación no pasó de 20 en una temporada simulada (${reputacion})`)

    const primera = await page.request.post("/api/transfer", { data: { action: "requestTransfer" } })
    expect(primera.status()).toBe(200)
    const { mercado } = await primera.json()
    expect(mercado.ofertasActivas.length).toBeGreaterThan(0)

    const segunda = await page.request.post("/api/transfer", { data: { action: "refreshOffers" } })
    expect(segunda.status()).toBe(429)
    const cuerpo = await segunda.json()
    // Devuelve las ofertas que ya había para que la pantalla no se quede vacía.
    expect(cuerpo.mercado.ofertasActivas).toEqual(mercado.ofertasActivas)

    // La pantalla muestra el aviso en lugar de perder las ofertas.
    await page.goto("/mercado")
    await page.getByRole("button", { name: "Actualizar ofertas →" }).click()
    await expect(page.getByRole("status")).toContainText("Ya has recibido las ofertas de esta jornada")
  } finally {
    await borrarCuenta(page)
  }
})
