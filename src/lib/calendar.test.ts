import { describe, it, expect } from "vitest"
import { getProximoPartido, buildCalendarioTemporada, agruparPorMes } from "./calendar"
import { generateCopaState, generateEuropaState, generateSeleccionParon, generateSeleccionTorneo } from "./world"

function makeFixtures(n = 16) {
  return Array.from({ length: n }, (_, i) => ({
    jornada: i + 1,
    rival: `Rival ${i + 1}`,
    esLocal: i % 2 === 0,
    jugado: false,
    resultado: null,
    golesJugador: 0,
    valoracion: null,
  }))
}

function playFixtures(fixtures: ReturnType<typeof makeFixtures>, hastaJornada: number) {
  return fixtures.map((f) => (f.jornada <= hastaJornada ? { ...f, jugado: true, resultado: "1-0" } : f))
}

describe("getProximoPartido", () => {
  it("prioriza el parón de selección sobre todo lo demás, incluso con Copa/Europa pendientes", () => {
    const paron = generateSeleccionParon(1, "España")
    const carrera = {
      fixtures: makeFixtures(),
      copa: generateCopaState(),
      europa: generateEuropaState(5)!,
      seleccion: { convocado: true, capas: 0, golesSeleccion: 0, paron },
    }
    const proximo = getProximoPartido(carrera)
    expect(proximo?.tipo).toBe("seleccion")
  })

  it("con una temporada recién empezada, la Liga (Agosto) va antes que la Copa (Octubre)", () => {
    const carrera = {
      fixtures: makeFixtures(),
      copa: generateCopaState(),
      europa: generateEuropaState(5)!,
    }
    const proximo = getProximoPartido(carrera)
    expect(proximo?.tipo).toBe("liga")
    expect(proximo?.jornadaLiga).toBe(1)
  })

  it("intercala Copa y Liga cronológicamente en vez de exigir terminar la Copa entera antes", () => {
    const fixtures = makeFixtures()
    const copa = generateCopaState() // R32, mes "Octubre"
    // Jornadas 1-6 ya jugadas (Agosto y Septiembre) — la Copa (Octubre)
    // sigue sin haberse tocado, pero la Liga ya alcanzó su propio mes.
    const carreraTemprana = { fixtures: playFixtures(fixtures, 4), copa }
    const proximoTemprano = getProximoPartido(carreraTemprana)
    expect(proximoTemprano?.tipo).toBe("liga")
    expect(proximoTemprano?.jornadaLiga).toBe(5)

    // Jornadas 1-6 jugadas (hasta Octubre incluido): ahora la jornada 7 cae
    // en Noviembre, más tarde que la Copa (Octubre) todavía sin jugar —
    // la Copa pasa a ser el próximo partido.
    const carreraAvanzada = { fixtures: playFixtures(fixtures, 6), copa }
    const proximoAvanzado = getProximoPartido(carreraAvanzada)
    expect(proximoAvanzado?.tipo).toBe("copa")
  })

  it("cae a Europa cuando la Copa ya ha terminado y no queda Liga pendiente", () => {
    const carrera = {
      fixtures: playFixtures(makeFixtures(), 16),
      copa: { ...generateCopaState(), eliminado: true },
      europa: generateEuropaState(5)!,
    }
    const proximo = getProximoPartido(carrera)
    expect(proximo?.tipo).toBe("europa")
  })

  it("cae a Liga cuando no queda nada más pendiente", () => {
    const carrera = { fixtures: makeFixtures() }
    const proximo = getProximoPartido(carrera)
    expect(proximo?.tipo).toBe("liga")
    expect(proximo?.jornadaLiga).toBe(1)
  })

  it("devuelve null cuando no queda ningún partido pendiente", () => {
    const fixtures = makeFixtures().map((f) => ({ ...f, jugado: true }))
    const carrera = { fixtures }
    expect(getProximoPartido(carrera)).toBeNull()
  })

  it("asigna un mes de calendario real a cada tipo de partido", () => {
    const carrera = { fixtures: makeFixtures() }
    const proximo = getProximoPartido(carrera)
    expect(proximo?.mes).toBe("Agosto")
  })

  it("el torneo de selección (verano) solo aparece cuando Liga/Copa/Europa ya han terminado", () => {
    const torneo = generateSeleccionTorneo("mundial", "España")
    const carreraConClubPendiente = {
      fixtures: makeFixtures(),
      seleccion: { convocado: true, capas: 0, golesSeleccion: 0, torneo },
    }
    // Liga todavía sin jugar → el torneo de verano espera, aunque exista.
    expect(getProximoPartido(carreraConClubPendiente)?.tipo).toBe("liga")

    const carreraTemporadaCerrada = {
      fixtures: playFixtures(makeFixtures(), 16),
      seleccion: { convocado: true, capas: 0, golesSeleccion: 0, torneo },
    }
    const proximo = getProximoPartido(carreraTemporadaCerrada)
    expect(proximo?.tipo).toBe("seleccion_torneo")
    expect(proximo?.mes).toBe("Junio")
  })
})

describe("buildCalendarioTemporada / agruparPorMes", () => {
  it("combina liga, copa, europa y selección en una sola línea de tiempo ordenada por mes", () => {
    const paron = generateSeleccionParon(1, "España")
    const carrera = {
      fixtures: makeFixtures(),
      copa: generateCopaState(),
      europa: generateEuropaState(5)!,
      seleccion: { convocado: true, capas: 0, golesSeleccion: 0, paron },
    }
    const entries = buildCalendarioTemporada(carrera)
    // 16 liga + 1 copa pendiente + 6 europa grupos + 2 selección
    expect(entries.length).toBe(16 + 1 + 6 + 2)

    const meses = agruparPorMes(entries)
    // Los meses deben aparecer en orden cronológico de temporada
    const nombres = meses.map((m) => m.mes)
    const sorted = [...nombres].sort((a, b) => {
      const orden = ["Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio"]
      return orden.indexOf(a) - orden.indexOf(b)
    })
    expect(nombres).toEqual(sorted)
  })

  it("incluye el torneo de selección en el calendario unificado cuando existe", () => {
    const torneo = generateSeleccionTorneo("eurocopa", "España")
    const carrera = {
      fixtures: makeFixtures(),
      seleccion: { convocado: true, capas: 0, golesSeleccion: 0, torneo },
    }
    const entries = buildCalendarioTemporada(carrera)
    const torneoEntries = entries.filter((e) => e.tipo === "seleccion_torneo")
    expect(torneoEntries.length).toBe(6) // fase de grupos, 6 partidos
    expect(torneoEntries.every((e) => e.mes === "Junio")).toBe(true)
  })

  it("marca exactamente un partido como 'próximo', el mismo que devuelve getProximoPartido", () => {
    const carrera = {
      fixtures: makeFixtures(),
      copa: generateCopaState(),
    }
    const entries = buildCalendarioTemporada(carrera)
    const proximos = entries.filter((e) => e.esProximo)
    expect(proximos.length).toBe(1)
    const proximo = getProximoPartido(carrera)
    expect(proximos[0].key).toBe(proximo?.key)
    expect(proximos[0].tipo).toBe("liga")
  })
})
