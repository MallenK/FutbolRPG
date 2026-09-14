import { describe, it, expect } from "vitest"
import { createDefaultPlayer, updatePlayerStats } from "./player"

describe("createDefaultPlayer", () => {
  it("crea un jugador con estado inicial consistente", () => {
    const player = createDefaultPlayer()
    expect(player.estado.fatiga).toBe(0)
    expect(player.carrera.temporada).toBe(1)
    expect(player.carrera.estadisticasTemporada.partidosJugados).toBe(0)
  })
})

describe("updatePlayerStats", () => {
  it("aplica el efecto de fatiga sumando al valor actual", () => {
    const player = createDefaultPlayer()
    const updated = updatePlayerStats(player, { fatiga: 20 })
    expect(updated.estado.fatiga).toBe(20)
  })

  it("aplica el efecto de moral sumando al valor actual", () => {
    const player = createDefaultPlayer()
    const updated = updatePlayerStats(player, { moral: -10 })
    expect(updated.estado.moral).toBe(player.estado.moral - 10)
  })

  it("aplica el efecto de confianza del entrenador sumando al valor actual", () => {
    const player = createDefaultPlayer()
    const updated = updatePlayerStats(player, { entrenador: 15 })
    expect(updated.confianza.entrenador).toBe(player.confianza.entrenador + 15)
  })

  it("clampa fatiga entre 0 y 100 (no baja de 0)", () => {
    const player = createDefaultPlayer()
    player.estado.fatiga = 5
    const updated = updatePlayerStats(player, { fatiga: -50 })
    expect(updated.estado.fatiga).toBe(0)
  })

  it("clampa fatiga entre 0 y 100 (no sube de 100)", () => {
    const player = createDefaultPlayer()
    player.estado.fatiga = 95
    const updated = updatePlayerStats(player, { fatiga: 50 })
    expect(updated.estado.fatiga).toBe(100)
  })

  it("clampa moral entre 0 y 100", () => {
    const player = createDefaultPlayer()
    player.estado.moral = 5
    expect(updatePlayerStats(player, { moral: -100 }).estado.moral).toBe(0)
    player.estado.moral = 95
    expect(updatePlayerStats(player, { moral: 100 }).estado.moral).toBe(100)
  })

  it("clampa confianza del entrenador entre 0 y 100", () => {
    const player = createDefaultPlayer()
    player.confianza.entrenador = 5
    expect(updatePlayerStats(player, { entrenador: -100 }).confianza.entrenador).toBe(0)
    player.confianza.entrenador = 95
    expect(updatePlayerStats(player, { entrenador: 100 }).confianza.entrenador).toBe(100)
  })

  it("sin efectos (objeto vacío) no cambia fatiga, moral ni confianza del entrenador", () => {
    const player = createDefaultPlayer()
    const updated = updatePlayerStats(player, {})
    expect(updated.estado.fatiga).toBe(player.estado.fatiga)
    expect(updated.estado.moral).toBe(player.estado.moral)
    expect(updated.confianza.entrenador).toBe(player.confianza.entrenador)
  })

  it("aplica también forma, riesgoLesion, vestuario y reputacion (clamp 0-100)", () => {
    const player = createDefaultPlayer()
    const updated = updatePlayerStats(player, {
      forma: 5,
      riesgoLesion: 5,
      vestuario: 5,
      reputacion: 5,
    })
    expect(updated.estado.forma).toBe(player.estado.forma + 5)
    expect(updated.estado.riesgoLesion).toBe(player.estado.riesgoLesion + 5)
    expect(updated.confianza.vestuario).toBe(player.confianza.vestuario + 5)
    expect(updated.confianza.reputacion).toBe(player.confianza.reputacion + 5)
  })

  it("clampa forma y riesgoLesion entre 0 y 100", () => {
    const player = createDefaultPlayer()
    const arriba = updatePlayerStats(player, { forma: 999, riesgoLesion: 999 })
    expect(arriba.estado.forma).toBe(100)
    expect(arriba.estado.riesgoLesion).toBe(100)
    const abajo = updatePlayerStats(player, { forma: -999, riesgoLesion: -999 })
    expect(abajo.estado.forma).toBe(0)
    expect(abajo.estado.riesgoLesion).toBe(0)
  })

  it("no muta el objeto jugador original", () => {
    const player = createDefaultPlayer()
    const fatigaOriginal = player.estado.fatiga
    updatePlayerStats(player, { fatiga: 30 })
    expect(player.estado.fatiga).toBe(fatigaOriginal)
  })
})
