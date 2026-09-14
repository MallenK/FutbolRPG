import { describe, it, expect } from "vitest"
import { simularResultadoPartido, type Attributes } from "./quick-sim"

const attrs = (v: number): Attributes => ({
  tecnicos: { control: v, tiro: v }, fisicos: { velocidad: v }, tacticos: { vision: v }, mentales: { confianza: v },
})

describe("simularResultadoPartido", () => {
  it("la valoración siempre queda acotada entre 3.0 y 10.0", () => {
    for (let i = 0; i < 200; i++) {
      const r = simularResultadoPartido("ST", attrs(Math.random() * 99), Math.random() * 100, Math.random() * 100)
      expect(r.matchStats.valoracion).toBeGreaterThanOrEqual(3.0)
      expect(r.matchStats.valoracion).toBeLessThanOrEqual(10.0)
    }
  })

  it("un jugador con atributos muy altos anota goles con más frecuencia que uno muy bajo (delantero)", () => {
    let golesAlto = 0, golesBajo = 0
    for (let i = 0; i < 300; i++) {
      golesAlto += simularResultadoPartido("ST", attrs(95), 90, 0).matchStats.goles
      golesBajo += simularResultadoPartido("ST", attrs(20), 30, 80).matchStats.goles
    }
    expect(golesAlto).toBeGreaterThan(golesBajo)
  })

  it("el portero nunca marca goles ni da asistencias", () => {
    for (let i = 0; i < 50; i++) {
      const r = simularResultadoPartido("GK", attrs(90), 80, 0)
      expect(r.matchStats.goles).toBe(0)
      expect(r.matchStats.asistencias).toBe(0)
    }
  })

  it("expulsado es coherente con tarjetasRojas", () => {
    for (let i = 0; i < 50; i++) {
      const r = simularResultadoPartido("CB", attrs(50), 50, 50)
      expect(r.expulsado).toBe(r.matchStats.tarjetasRojas > 0)
    }
  })

  it("el marcador siempre es coherente con ganado/empate/perdido", () => {
    for (let i = 0; i < 100; i++) {
      const r = simularResultadoPartido("CM", attrs(60), 60, 20)
      const [golesEquipo, golesRival] = r.matchStats.marcador.split("-").map(Number)
      expect(r.golesRival).toBe(golesRival)
      if (r.ganado) expect(golesEquipo).toBeGreaterThan(golesRival)
    }
  })
})
