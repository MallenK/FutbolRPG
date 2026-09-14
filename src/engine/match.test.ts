import { describe, it, expect } from "vitest"
import { simulateMatch, simulateMatchResultOnly } from "./match"
import { createDefaultPlayer } from "./player"

describe("simulateMatchResultOnly", () => {
  it("siempre devuelve un marcador con formato 'N-N'", () => {
    for (let i = 0; i < 200; i++) {
      const resultado = simulateMatchResultOnly("Media")
      expect(resultado).toMatch(/^\d+-\d+$/)
    }
  })

  it("con dificultad 'Baja' el equipo propio marca en promedio más goles que el rival", () => {
    const N = 300
    let propios = 0
    let rivales = 0
    for (let i = 0; i < N; i++) {
      const [p, r] = simulateMatchResultOnly("Baja").split("-").map(Number)
      propios += p
      rivales += r
    }
    expect(propios / N).toBeGreaterThan(rivales / N)
  })

  it("con dificultad 'Alta' el rival marca en promedio más goles que el equipo propio", () => {
    const N = 300
    let propios = 0
    let rivales = 0
    for (let i = 0; i < N; i++) {
      const [p, r] = simulateMatchResultOnly("Alta").split("-").map(Number)
      propios += p
      rivales += r
    }
    expect(rivales / N).toBeGreaterThan(propios / N)
  })
})

describe("simulateMatch", () => {
  const noopLogger = async () => {}

  it("incrementa partidosJugados exactamente en 1", async () => {
    const player = createDefaultPlayer()
    const before = player.carrera.estadisticasTemporada.partidosJugados
    const after = await simulateMatch(player, noopLogger)
    expect(after.carrera.estadisticasTemporada.partidosJugados).toBe(before + 1)
  })

  it("la valoración media del partido queda siempre entre 1 y 10", async () => {
    for (let i = 0; i < 30; i++) {
      const player = createDefaultPlayer()
      const after = await simulateMatch(player, noopLogger)
      expect(after.carrera.estadisticasTemporada.valoracionMedia).toBeGreaterThanOrEqual(1)
      expect(after.carrera.estadisticasTemporada.valoracionMedia).toBeLessThanOrEqual(10)
    }
  })

  it("goles y asistencias acumulados en temporada nunca son negativos", async () => {
    for (let i = 0; i < 30; i++) {
      const player = createDefaultPlayer()
      const after = await simulateMatch(player, noopLogger)
      expect(after.carrera.estadisticasTemporada.goles).toBeGreaterThanOrEqual(0)
      expect(after.carrera.estadisticasTemporada.asistencias).toBeGreaterThanOrEqual(0)
    }
  })

  it("fatiga, forma y riesgoLesion tras el partido quedan dentro de 0-100", async () => {
    for (let i = 0; i < 30; i++) {
      const player = createDefaultPlayer()
      const after = await simulateMatch(player, noopLogger)
      expect(after.estado.fatiga).toBeGreaterThanOrEqual(0)
      expect(after.estado.fatiga).toBeLessThanOrEqual(100)
      expect(after.estado.forma).toBeGreaterThanOrEqual(0)
      expect(after.estado.forma).toBeLessThanOrEqual(100)
      expect(after.estado.riesgoLesion).toBeGreaterThanOrEqual(0)
      expect(after.estado.riesgoLesion).toBeLessThanOrEqual(100)
    }
  })

  it("un jugador con stat de tiro muy alto anota en promedio más goles por partido que uno muy bajo", async () => {
    const N = 60
    let golesAlto = 0
    let golesBajo = 0
    for (let i = 0; i < N; i++) {
      const fuerte = createDefaultPlayer()
      fuerte.tecnicos.tiro = 95
      fuerte.tecnicos.control = 95
      fuerte.tecnicos.cabeceo = 95
      fuerte.fisicos.fuerza = 95
      const after1 = await simulateMatch(fuerte, noopLogger)
      golesAlto += after1.carrera.estadisticasTemporada.goles

      const debil = createDefaultPlayer()
      debil.tecnicos.tiro = 10
      debil.tecnicos.control = 10
      debil.tecnicos.cabeceo = 10
      debil.fisicos.fuerza = 10
      const after2 = await simulateMatch(debil, noopLogger)
      golesBajo += after2.carrera.estadisticasTemporada.goles
    }
    expect(golesAlto).toBeGreaterThan(golesBajo)
  })

  it("no muta el objeto player original (carrera.estadisticasTemporada se clona antes de incrementar contadores)", async () => {
    const player = createDefaultPlayer()
    const partidosAntes = player.carrera.estadisticasTemporada.partidosJugados
    const result = await simulateMatch(player, noopLogger)
    expect(player.carrera.estadisticasTemporada.partidosJugados).toBe(partidosAntes)
    expect(result.carrera.estadisticasTemporada.partidosJugados).toBe(partidosAntes + 1)
  })
})
